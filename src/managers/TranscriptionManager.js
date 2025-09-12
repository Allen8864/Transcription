/**
 * TranscriptionManager - Handles Whisper model loading and transcription processing
 */
export class TranscriptionManager {
  constructor() {
    this.worker = null
    this.isModelLoaded = false
    this.currentLanguage = 'auto'
    this.loadingProgress = 0
    this.messageId = 0
    this.pendingMessages = new Map()
    this.onProgressCallback = null
    this.onErrorCallback = null
  }

  async init() {
    console.log('TranscriptionManager initialized')
    await this.initializeWorker()
  }

  /**
   * Initialize the Web Worker for Whisper model
   */
  async initializeWorker() {
    try {
      // Create new worker instance
      // Handle both browser and test environments
      let workerUrl
      if (typeof import.meta !== 'undefined' && import.meta.url) {
        workerUrl = new URL('../workers/whisper-worker.js', import.meta.url)
      } else {
        // Fallback for test environment
        workerUrl = '../workers/whisper-worker.js'
      }
      
      this.worker = new Worker(workerUrl, { type: 'module' })

      // Set up message handling
      this.worker.onmessage = (e) => {
        this.handleWorkerMessage(e.data)
      }

      this.worker.onerror = (error) => {
        console.error('Worker error:', error)
        if (this.onErrorCallback) {
          this.onErrorCallback(new Error(`Worker error: ${error.message}`))
        }
      }

      console.log('Web Worker initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Web Worker:', error)
      throw new Error(`Worker initialization failed: ${error.message}`)
    }
  }

  /**
   * Handle messages from the Web Worker
   */
  handleWorkerMessage(message) {
    const { id, type, data, error } = message

    if (type === 'progress') {
      // Handle different types of progress updates
      if (data.type === 'transcription_update') {
        // Real-time transcription update
        if (this.onTranscriptionUpdateCallback) {
          this.onTranscriptionUpdateCallback(data.result)
        }
        return
      } else if (data.progress !== undefined) {
        // Model loading progress
        this.loadingProgress = data.progress
        if (this.onProgressCallback) {
          this.onProgressCallback(data.progress)
        }
        return
      }
      return
    }

    // Handle response messages
    const pendingMessage = this.pendingMessages.get(id)
    if (!pendingMessage) {
      console.warn('Received message for unknown ID:', id)
      return
    }

    this.pendingMessages.delete(id)

    if (type === 'success') {
      pendingMessage.resolve(data)
    } else if (type === 'error') {
      pendingMessage.reject(new Error(error))
    }
  }

  /**
   * Send message to worker and return promise
   */
  sendWorkerMessage(type, data = null) {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'))
        return
      }

      const id = ++this.messageId
      this.pendingMessages.set(id, { resolve, reject })

      this.worker.postMessage({ id, type, data })

      // Set timeout for worker messages
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id)
          reject(new Error('Worker message timeout'))
        }
      }, 60000) // 60 second timeout
    })
  }

  /**
   * Load the Whisper model
   */
  async loadWhisperModel() {
    try {
      console.log('Loading Whisper model...')
      this.loadingProgress = 0
      
      const result = await this.sendWorkerMessage('init')
      
      this.isModelLoaded = true
      this.loadingProgress = 100
      
      console.log('Whisper model loaded successfully:', result)
      return result
    } catch (error) {
      this.isModelLoaded = false
      console.error('Failed to load Whisper model:', error)
      throw new Error(`Model loading failed: ${error.message}`)
    }
  }

  /**
   * Transcribe preprocessed audio data (Float32Array)
   * @param {Float32Array} audioData - Preprocessed audio data from AudioManager
   * @param {string} language - Language code (null for auto-detection)
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeAudio(audioData, language = null) {
    if (!this.isModelLoaded) {
      throw new Error('Model not loaded. Call loadWhisperModel() first.')
    }

    if (!(audioData instanceof Float32Array)) {
      throw new Error('Audio data must be a Float32Array. Use AudioManager.preprocessAudioForWhisper() first.')
    }

    try {
      // Determine language for transcription
      const transcriptionLanguage = (language === 'auto' || language === null) ? null : language

      console.log('Starting transcription:', {
        audioDataLength: audioData.length,
        duration: audioData.length / 16000, // Assuming 16kHz sample rate
        language: transcriptionLanguage
      })

      const options = {
        language: transcriptionLanguage,
        returnTimestamps: true,
        chunkLength: 30, // 30 seconds chunks as per whisper-web
        strideLength: 5  // 5 seconds stride
      }

      // Convert Float32Array to ArrayBuffer for worker message
      const audioBuffer = audioData.buffer

      const result = await this.sendWorkerMessage('transcribe', {
        audioData: audioBuffer,
        options
      })

      console.log('Transcription completed:', {
        textLength: result.text?.length || 0,
        language: result.language,
        confidence: result.confidence
      })

      return result
    } catch (error) {
      console.error('Transcription failed:', error)
      throw new Error(`Transcription failed: ${error.message}`)
    }
  }



  /**
   * Set the transcription language
   */
  setLanguage(languageCode) {
    this.currentLanguage = languageCode
    console.log('Language set to:', languageCode)
  }

  /**
   * Get model loading progress
   */
  getLoadingProgress() {
    return this.loadingProgress
  }

  /**
   * Check if model is loaded
   */
  isReady() {
    return this.isModelLoaded
  }

  /**
   * Set progress callback for model loading
   */
  setProgressCallback(callback) {
    this.onProgressCallback = callback
  }

  /**
   * Set transcription update callback for real-time updates
   */
  setTranscriptionUpdateCallback(callback) {
    this.onTranscriptionUpdateCallback = callback
  }

  /**
   * Set error callback
   */
  setErrorCallback(callback) {
    this.onErrorCallback = callback
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.pendingMessages.clear()
    this.isModelLoaded = false
    this.loadingProgress = 0
  }

  /**
   * Transcribe audio file (simplified whisper-web approach)
   * @param {File|Blob} audioInput - Audio file or blob
   * @param {AudioManager} audioManager - AudioManager instance
   * @param {string} language - Language code
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeFile(audioInput, audioManager, language = null) {
    try {
      console.log('Starting file transcription')
      
      // Process audio using AudioManager
      const audioData = await audioManager.processAudioForWhisper(audioInput)
      
      // Transcribe processed audio
      return await this.transcribeAudio(audioData, language)
    } catch (error) {
      console.error('File transcription failed:', error)
      throw new Error(`File transcription failed: ${error.message}`)
    }
  }
}
