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
      // Handle progress updates
      this.loadingProgress = data.progress
      if (this.onProgressCallback) {
        this.onProgressCallback(data.progress)
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
   * Transcribe audio data
   */
  async transcribeAudio(audioData, language = null) {
    if (!this.isModelLoaded) {
      throw new Error('Model not loaded. Call loadWhisperModel() first.')
    }

    try {
      const options = {
        language: language || this.currentLanguage,
        returnTimestamps: true
      }

      const result = await this.sendWorkerMessage('transcribe', {
        audioData,
        options
      })

      return result
    } catch (error) {
      console.error('Transcription failed:', error)
      throw new Error(`Transcription failed: ${error.message}`)
    }
  }

  // Removed transcribeRealtime method

  /**
   * Detect language from audio data
   */
  async detectLanguage(audioData) {
    if (!this.isModelLoaded) {
      throw new Error('Model not loaded. Call loadWhisperModel() first.')
    }

    try {
      // Use a small sample for language detection
      const sampleSize = Math.min(audioData.byteLength, 16000 * 5) // 5 seconds max
      const sampleData = audioData.slice(0, sampleSize)

      const options = {
        language: null, // Auto-detect
        returnTimestamps: false
      }

      const result = await this.sendWorkerMessage('transcribe', {
        audioData: sampleData,
        options
      })

      return result.language || 'unknown'
    } catch (error) {
      console.error('Language detection failed:', error)
      return 'unknown'
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

  // Temporary implementation for file transcription (Task 8)
  // This will be replaced with actual Whisper implementation in Task 5-6
  async transcribeFile(file, language = 'auto') {
    console.log('Starting file transcription:', {
      fileName: file.name,
      fileSize: file.size,
      language: language
    })

    // Simulate processing time based on file size
    const processingTime = Math.min(
      Math.max((file.size / 1000000) * 2000, 1000),
      10000
    )

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // Mock transcription result
          const mockResult = {
            text: `[Mock Transcription]\n\nThis is a simulated transcription result for the file "${file.name}".\n\nThe actual transcription will be implemented when the WhisperCPP model is integrated in tasks 5-6.\n\nFile details:\n- Size: ${this.formatFileSize(file.size)}\n- Language: ${language}\n- Processing completed successfully.`,
            confidence: 0.95,
            language: language === 'auto' ? 'en' : language,
            isPartial: false,
            timestamp: Date.now()
          }

          console.log('File transcription completed (mock):', mockResult)
          resolve(mockResult)
        } catch (error) {
          console.error('Mock transcription error:', error)
          reject(new Error(`Transcription failed: ${error.message}`))
        }
      }, processingTime)
    })
  }

  // Helper method for file size formatting
  formatFileSize(bytes) {
    if (bytes === 0) {
      return '0 Bytes'
    }

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
