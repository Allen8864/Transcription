/**
 * AudioManager - Handles audio recording, file upload, and audio processing
 *
 * This class manages:
 * - Microphone access and recording control
 * - Audio file upload and validation
 * - Audio format conversion to WAV
 * - Audio chunking for real-time processing
 */
export class AudioManager {
  constructor() {
    this.mediaRecorder = null
    this.audioStream = null
    this.audioChunks = []
    this.isRecording = false
    this.recordingStartTime = null
    this.supportedFormats = ['audio/webm', 'audio/mp4', 'audio/wav']
    this.supportedFileTypes = [
      '.mp3',
      '.wav',
      '.m4a',
      '.ogg',
      '.webm',
      '.mp4',
      '.avi',
      '.mov',
      '.mkv',
      '.flv',
      '.wmv'
    ]

    // Real-time audio processing properties
    this.audioContext = null
    this.analyser = null
    this.processor = null
    this.audioBuffer = []
    this.chunkCallbacks = []
    this.isRealtimeProcessing = false
    this.chunkSize = 2.5 // seconds
    this.overlapSize = 0.5 // seconds
    this.sampleRate = 16000
    this.bufferSize = 4096
    this.chunkCounter = 0
  }

  async init() {
    console.log('AudioManager initialized')
    // Check for MediaRecorder support
    if (!window.MediaRecorder) {
      throw new Error('MediaRecorder API is not supported in this browser')
    }

    // Check for getUserMedia support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia API is not supported in this browser')
    }
  }

  /**
   * Request microphone access from the user
   * @returns {Promise<MediaStream>} The audio stream
   * @throws {Error} If permission is denied or not available
   */
  async requestMicrophoneAccess() {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Optimal for Whisper
          channelCount: 1 // Mono audio
        }
      }

      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('Microphone access granted')
      return this.audioStream
    } catch (error) {
      console.error('Microphone access denied:', error)
      if (error.name === 'NotAllowedError') {
        throw new Error(
          'Microphone permission denied. Please allow microphone access and try again.'
        )
      } else if (error.name === 'NotFoundError') {
        throw new Error(
          'No microphone found. Please connect a microphone and try again.'
        )
      } else {
        throw new Error(`Failed to access microphone: ${error.message}`)
      }
    }
  }

  /**
   * Start recording audio from the microphone
   * @returns {Promise<void>}
   * @throws {Error} If recording cannot be started
   */
  async startRecording() {
    if (this.isRecording) {
      throw new Error('Recording is already in progress')
    }

    // Clean up any existing MediaRecorder
    if (this.mediaRecorder) {
      this.mediaRecorder = null
    }

    if (!this.audioStream) {
      await this.requestMicrophoneAccess()
    }

    try {
      // Find the best supported format
      const mimeType =
        this.supportedFormats.find(format =>
          MediaRecorder.isTypeSupported(format)
        ) || 'audio/webm'

      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType,
        audioBitsPerSecond: 128000
      })

      this.audioChunks = []
      this.recordingStartTime = Date.now()

      // Set up event handlers
      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        console.log('Recording stopped')
      }

      this.mediaRecorder.onerror = event => {
        console.error('MediaRecorder error:', event.error)
        this.isRecording = false
      }

      // Start recording (don't specify timeslice to get better audio metadata)
      this.mediaRecorder.start()
      this.isRecording = true

      console.log('Recording started')
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw new Error(`Failed to start recording: ${error.message}`)
    }
  }

  /**
   * Stop recording and return the recorded audio
   * @returns {Promise<Blob>} The recorded audio as a Blob
   */
  async stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('No recording in progress')
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = () => {
        try {
          console.log(
            'MediaRecorder stopped, chunks count:',
            this.audioChunks.length
          )
          console.log('MediaRecorder mimeType:', this.mediaRecorder.mimeType)

          const audioBlob = new Blob(this.audioChunks, {
            type: this.mediaRecorder.mimeType
          })

          this.isRecording = false
          this.recordingStartTime = null

          console.log('Recording completed:', {
            blobSize: audioBlob.size,
            blobType: audioBlob.type,
            chunksCount: this.audioChunks.length
          })

          // Note: We don't clean up the stream here to allow for immediate re-recording
          // The stream will be cleaned up when cleanup() is called

          resolve(audioBlob)
        } catch (error) {
          console.error('Error creating audio blob:', error)
          reject(new Error(`Failed to create audio blob: ${error.message}`))
        }
      }

      this.mediaRecorder.onerror = event => {
        reject(new Error(`Recording error: ${event.error.message}`))
      }

      // Ensure MediaRecorder is in the right state before stopping
      if (this.mediaRecorder.state === 'recording') {
        console.log(
          'Stopping MediaRecorder, current state:',
          this.mediaRecorder.state
        )
        this.mediaRecorder.stop()
      } else {
        console.warn(
          'MediaRecorder is not in recording state:',
          this.mediaRecorder.state
        )
        // If not recording, resolve immediately with empty blob
        setTimeout(() => {
          resolve(new Blob([], { type: 'audio/webm' }))
        }, 0)
      }
    })
  }

  /**
   * Get the current recording duration in seconds
   * @returns {number} Duration in seconds
   */
  getRecordingDuration() {
    if (!this.isRecording || !this.recordingStartTime) {
      return 0
    }
    return Math.floor((Date.now() - this.recordingStartTime) / 1000)
  }

  /**
   * Handle file upload and validate the audio/video file
   * @param {File} file - The uploaded file
   * @returns {Promise<{file: File, isValid: boolean, error?: string, isVideo?: boolean}>}
   */
  async handleFileUpload(file) {
    try {
      const validation = this.validateAudioFormat(file)

      if (!validation.isValid) {
        return {
          file,
          isValid: false,
          error: validation.error
        }
      }

      // Additional file size check (max 500MB for video files, 100MB for audio)
      const maxSize = validation.isVideo ? 500 * 1024 * 1024 : 100 * 1024 * 1024
      if (file.size > maxSize) {
        const limit = validation.isVideo ? '500MB' : '100MB'
        return {
          file,
          isValid: false,
          error: `File size exceeds ${limit} limit`
        }
      }

      console.log('File upload validated:', {
        name: file.name,
        size: file.size,
        type: file.type,
        isVideo: validation.isVideo
      })

      return {
        file,
        isValid: true,
        isVideo: validation.isVideo
      }
    } catch (error) {
      return {
        file,
        isValid: false,
        error: `File processing error: ${error.message}`
      }
    }
  }

  /**
   * Extract audio from video file using HTML5 video element
   * @param {File} videoFile - The video file
   * @returns {Promise<Blob>} Audio blob extracted from video
   */
  async extractAudioFromVideo(videoFile) {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement('video')
        // Canvas might be needed for future video processing
        // const canvas = document.createElement('canvas')
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)()

        video.crossOrigin = 'anonymous'
        video.muted = true // Prevent audio playback during processing

        const url = URL.createObjectURL(videoFile)

        video.addEventListener('loadedmetadata', async () => {
          try {
            console.log('Video metadata loaded:', {
              duration: video.duration,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight
            })

            // Create MediaElementSource to capture audio
            const source = audioContext.createMediaElementSource(video)
            const destination = audioContext.createMediaStreamDestination()
            source.connect(destination)

            // Set up MediaRecorder to capture the audio stream
            const mediaRecorder = new MediaRecorder(destination.stream, {
              mimeType: 'audio/webm;codecs=opus'
            })

            const audioChunks = []

            mediaRecorder.ondataavailable = event => {
              if (event.data.size > 0) {
                audioChunks.push(event.data)
              }
            }

            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
              URL.revokeObjectURL(url)

              console.log('Audio extraction completed:', {
                originalSize: videoFile.size,
                extractedSize: audioBlob.size,
                duration: video.duration
              })

              resolve(audioBlob)
            }

            mediaRecorder.onerror = error => {
              console.error(
                'MediaRecorder error during audio extraction:',
                error
              )
              URL.revokeObjectURL(url)
              reject(new Error(`Audio extraction failed: ${error.message}`))
            }

            // Start recording and play video
            mediaRecorder.start()

            // Play video to extract audio (muted)
            video.currentTime = 0
            await video.play()

            // Stop recording when video ends
            video.addEventListener('ended', () => {
              mediaRecorder.stop()
            })
          } catch (error) {
            console.error('Error during audio extraction setup:', error)
            URL.revokeObjectURL(url)
            reject(new Error(`Failed to extract audio: ${error.message}`))
          }
        })

        video.addEventListener('error', error => {
          console.error('Video loading error:', error)
          URL.revokeObjectURL(url)
          reject(new Error('Failed to load video file'))
        })

        // Set timeout to prevent hanging
        setTimeout(() => {
          URL.revokeObjectURL(url)
          reject(new Error('Audio extraction timeout'))
        }, 60000) // 60 second timeout

        video.src = url
        video.load()
      } catch (error) {
        console.error('Audio extraction error:', error)
        reject(new Error(`Audio extraction failed: ${error.message}`))
      }
    })
  }

  /**
   * Validate if the file is a supported audio or video format
   * @param {File} file - The file to validate
   * @returns {{isValid: boolean, error?: string, isVideo?: boolean}}
   */
  validateAudioFormat(file) {
    if (!file) {
      return {
        isValid: false,
        error: 'No file provided'
      }
    }

    // Check file extension
    const fileName = file.name.toLowerCase()
    const hasValidExtension = this.supportedFileTypes.some(ext =>
      fileName.endsWith(ext)
    )

    if (!hasValidExtension) {
      return {
        isValid: false,
        error: `Unsupported file format. Supported formats: ${this.supportedFileTypes.join(', ')}`
      }
    }

    // Determine if it's a video file
    const videoExtensions = [
      '.mp4',
      '.avi',
      '.mov',
      '.mkv',
      '.flv',
      '.wmv',
      '.webm'
    ]
    const isVideo = videoExtensions.some(ext => fileName.endsWith(ext))

    // Check MIME type if available
    if (file.type) {
      const isAudioMime = file.type.startsWith('audio/')
      const isVideoMime = file.type.startsWith('video/')

      if (!isAudioMime && !isVideoMime) {
        return {
          isValid: false,
          error: 'File is not an audio or video file'
        }
      }
    }

    return {
      isValid: true,
      isVideo: isVideo
    }
  }

  /**
   * Convert audio data to WAV format
   * @param {ArrayBuffer} audioData - The audio data to convert
   * @param {number} sampleRate - Sample rate (default: 16000)
   * @param {number} channels - Number of channels (default: 1)
   * @returns {ArrayBuffer} WAV formatted audio data
   */
  convertToWAV(audioData, sampleRate = 16000, channels = 1) {
    try {
      // If audioData is already a Float32Array, use it directly
      let samples
      if (audioData instanceof Float32Array) {
        samples = audioData
      } else if (audioData instanceof ArrayBuffer) {
        samples = new Float32Array(audioData)
      } else {
        throw new Error('Invalid audio data format')
      }

      const length = samples.length
      const buffer = new ArrayBuffer(44 + length * 2)
      const view = new DataView(buffer)

      // WAV header
      const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i))
        }
      }

      // RIFF chunk descriptor
      writeString(0, 'RIFF')
      view.setUint32(4, 36 + length * 2, true) // File size - 8
      writeString(8, 'WAVE')

      // FMT sub-chunk
      writeString(12, 'fmt ')
      view.setUint32(16, 16, true) // Sub-chunk size
      view.setUint16(20, 1, true) // Audio format (PCM)
      view.setUint16(22, channels, true) // Number of channels
      view.setUint32(24, sampleRate, true) // Sample rate
      view.setUint32(28, sampleRate * channels * 2, true) // Byte rate
      view.setUint16(32, channels * 2, true) // Block align
      view.setUint16(34, 16, true) // Bits per sample

      // Data sub-chunk
      writeString(36, 'data')
      view.setUint32(40, length * 2, true) // Sub-chunk size

      // Convert float samples to 16-bit PCM
      let offset = 44
      for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, samples[i]))
        view.setInt16(offset, sample * 0x7fff, true)
        offset += 2
      }

      console.log('Audio converted to WAV format:', {
        sampleRate,
        channels,
        duration: length / sampleRate,
        size: buffer.byteLength
      })

      return buffer
    } catch (error) {
      console.error('WAV conversion error:', error)
      throw new Error(`Failed to convert audio to WAV: ${error.message}`)
    }
  }

  /**
   * Split audio data into chunks for real-time processing
   * @param {ArrayBuffer|Float32Array} audioData - The audio data to split
   * @param {number} chunkSize - Chunk size in seconds (default: 2.5)
   * @param {number} sampleRate - Sample rate (default: 16000)
   * @param {number} overlap - Overlap between chunks in seconds (default: 0.5)
   * @returns {Array<Float32Array>} Array of audio chunks
   */
  splitAudioChunks(
    audioData,
    chunkSize = 2.5,
    sampleRate = 16000,
    overlap = 0.5
  ) {
    try {
      let samples
      if (audioData instanceof Float32Array) {
        samples = audioData
      } else if (audioData instanceof ArrayBuffer) {
        samples = new Float32Array(audioData)
      } else {
        throw new Error('Invalid audio data format')
      }

      const chunkSamples = Math.floor(chunkSize * sampleRate)
      const overlapSamples = Math.floor(overlap * sampleRate)
      const stepSize = chunkSamples - overlapSamples

      const chunks = []

      for (let i = 0; i < samples.length; i += stepSize) {
        const end = Math.min(i + chunkSamples, samples.length)
        const chunk = samples.slice(i, end)

        // Only add chunks that have meaningful audio data
        if (chunk.length >= sampleRate * 0.5) {
          // At least 0.5 seconds
          chunks.push(chunk)
        }

        // Break if we've reached the end
        if (end >= samples.length) {
          break
        }
      }

      console.log('Audio split into chunks:', {
        totalSamples: samples.length,
        chunkCount: chunks.length,
        chunkSize: chunkSize,
        overlap: overlap,
        avgChunkLength:
          chunks.length > 0
            ? chunks.reduce((sum, chunk) => sum + chunk.length, 0) /
              chunks.length
            : 0
      })

      return chunks
    } catch (error) {
      console.error('Audio chunking error:', error)
      throw new Error(`Failed to split audio into chunks: ${error.message}`)
    }
  }

  /**
   * Initialize real-time audio processing pipeline
   * @param {Function} onChunkReady - Callback function called when a chunk is ready for processing
   * @returns {Promise<void>}
   */
  async initRealtimeProcessing(onChunkReady) {
    try {
      if (!this.audioStream) {
        await this.requestMicrophoneAccess()
      }

      // Create audio context for real-time processing
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate
      })

      // Create analyser for audio visualization (optional)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 2048

      // Create script processor for real-time audio data
      this.processor = this.audioContext.createScriptProcessor(
        this.bufferSize,
        1, // mono input
        1  // mono output
      )

      // Connect audio stream to processor
      const source = this.audioContext.createMediaStreamSource(this.audioStream)
      source.connect(this.analyser)
      source.connect(this.processor)
      this.processor.connect(this.audioContext.destination)

      // Initialize audio buffer and callbacks
      this.audioBuffer = []
      this.chunkCallbacks = []
      this.chunkCounter = 0

      if (onChunkReady && typeof onChunkReady === 'function') {
        this.chunkCallbacks.push(onChunkReady)
      }

      // Set up real-time audio processing
      this.processor.onaudioprocess = (event) => {
        if (this.isRealtimeProcessing) {
          this.processAudioData(event.inputBuffer)
        }
      }

      console.log('Real-time audio processing initialized:', {
        sampleRate: this.audioContext.sampleRate,
        bufferSize: this.bufferSize,
        chunkSize: this.chunkSize,
        overlapSize: this.overlapSize
      })

    } catch (error) {
      console.error('Failed to initialize real-time processing:', error)
      throw new Error(`Real-time processing initialization failed: ${error.message}`)
    }
  }

  /**
   * Start real-time audio processing
   * @returns {Promise<void>}
   */
  async startRealtimeProcessing() {
    if (!this.audioContext || !this.processor) {
      throw new Error('Real-time processing not initialized. Call initRealtimeProcessing() first.')
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    this.isRealtimeProcessing = true
    this.audioBuffer = []
    this.chunkCounter = 0

    console.log('Real-time audio processing started')
  }

  /**
   * Stop real-time audio processing
   */
  stopRealtimeProcessing() {
    this.isRealtimeProcessing = false
    
    // Process any remaining audio in buffer
    if (this.audioBuffer.length > 0) {
      this.processRemainingBuffer()
    }

    console.log('Real-time audio processing stopped')
  }

  /**
   * Add a callback function to be called when audio chunks are ready
   * @param {Function} callback - Function to call with audio chunk data
   */
  addChunkCallback(callback) {
    if (typeof callback === 'function') {
      this.chunkCallbacks.push(callback)
    }
  }

  /**
   * Remove a callback function
   * @param {Function} callback - Function to remove
   */
  removeChunkCallback(callback) {
    const index = this.chunkCallbacks.indexOf(callback)
    if (index > -1) {
      this.chunkCallbacks.splice(index, 1)
    }
  }

  /**
   * Process incoming audio data and create chunks
   * @param {AudioBuffer} inputBuffer - Audio buffer from the processor
   */
  processAudioData(inputBuffer) {
    try {
      // Get audio data from the first channel (mono)
      const audioData = inputBuffer.getChannelData(0)
      
      // Add new audio data to buffer
      this.audioBuffer.push(...audioData)

      // Calculate chunk size in samples
      const chunkSamples = Math.floor(this.chunkSize * this.sampleRate)
      const overlapSamples = Math.floor(this.overlapSize * this.sampleRate)
      const stepSize = chunkSamples - overlapSamples

      // Process chunks when we have enough data
      while (this.audioBuffer.length >= chunkSamples) {
        // Extract chunk with overlap
        const chunk = new Float32Array(this.audioBuffer.slice(0, chunkSamples))
        
        // Create chunk metadata
        const chunkData = {
          id: this.chunkCounter++,
          audioData: chunk,
          sampleRate: this.sampleRate,
          duration: chunk.length / this.sampleRate,
          timestamp: Date.now(),
          isRealtime: true
        }

        // Call all registered callbacks
        this.chunkCallbacks.forEach(callback => {
          try {
            callback(chunkData)
          } catch (error) {
            console.error('Error in chunk callback:', error)
          }
        })

        // Remove processed samples (with step size to maintain overlap)
        this.audioBuffer.splice(0, stepSize)
      }

    } catch (error) {
      console.error('Error processing audio data:', error)
    }
  }

  /**
   * Process any remaining audio data in the buffer
   */
  processRemainingBuffer() {
    if (this.audioBuffer.length === 0) return

    try {
      // Process remaining buffer as final chunk
      const chunk = new Float32Array(this.audioBuffer)
      
      const chunkData = {
        id: this.chunkCounter++,
        audioData: chunk,
        sampleRate: this.sampleRate,
        duration: chunk.length / this.sampleRate,
        timestamp: Date.now(),
        isRealtime: true,
        isFinal: true
      }

      // Call all registered callbacks
      this.chunkCallbacks.forEach(callback => {
        try {
          callback(chunkData)
        } catch (error) {
          console.error('Error in final chunk callback:', error)
        }
      })

      // Clear buffer
      this.audioBuffer = []

      console.log('Processed remaining buffer as final chunk')

    } catch (error) {
      console.error('Error processing remaining buffer:', error)
    }
  }

  /**
   * Get current audio buffer status for monitoring
   * @returns {Object} Buffer status information
   */
  getBufferStatus() {
    const bufferDuration = this.audioBuffer.length / this.sampleRate
    const chunkSamples = Math.floor(this.chunkSize * this.sampleRate)
    const readyForChunk = this.audioBuffer.length >= chunkSamples

    return {
      bufferLength: this.audioBuffer.length,
      bufferDuration: bufferDuration,
      readyForChunk: readyForChunk,
      chunkCount: this.chunkCounter,
      isProcessing: this.isRealtimeProcessing,
      nextChunkIn: readyForChunk ? 0 : (chunkSamples - this.audioBuffer.length) / this.sampleRate
    }
  }

  /**
   * Configure real-time processing parameters
   * @param {Object} config - Configuration object
   * @param {number} config.chunkSize - Chunk size in seconds
   * @param {number} config.overlapSize - Overlap size in seconds
   * @param {number} config.bufferSize - Audio buffer size
   */
  configureRealtimeProcessing(config = {}) {
    if (this.isRealtimeProcessing) {
      console.warn('Cannot change configuration while processing is active')
      return
    }

    if (config.chunkSize !== undefined) {
      this.chunkSize = Math.max(0.5, Math.min(10, config.chunkSize)) // 0.5-10 seconds
    }

    if (config.overlapSize !== undefined) {
      this.overlapSize = Math.max(0, Math.min(this.chunkSize * 0.8, config.overlapSize))
    }

    if (config.bufferSize !== undefined) {
      // Buffer size must be power of 2
      const validSizes = [256, 512, 1024, 2048, 4096, 8192, 16384]
      this.bufferSize = validSizes.find(size => size >= config.bufferSize) || 4096
    }

    console.log('Real-time processing configured:', {
      chunkSize: this.chunkSize,
      overlapSize: this.overlapSize,
      bufferSize: this.bufferSize
    })
  }

  /**
   * Get audio analysis data for visualization
   * @returns {Uint8Array|null} Frequency data for visualization
   */
  getAudioAnalysisData() {
    if (!this.analyser) return null

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(dataArray)
    return dataArray
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Stop real-time processing
    this.stopRealtimeProcessing()

    // Clean up audio context and processors
    if (this.processor) {
      try {
        this.processor.disconnect()
      } catch (error) {
        console.warn('Error disconnecting processor:', error)
      }
      this.processor = null
    }

    if (this.analyser) {
      try {
        this.analyser.disconnect()
      } catch (error) {
        console.warn('Error disconnecting analyser:', error)
      }
      this.analyser = null
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }

    // Clean up existing recording resources
    if (this.isRecording && this.mediaRecorder) {
      this.mediaRecorder.stop()
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop())
      this.audioStream = null
    }

    // Clear MediaRecorder reference
    this.mediaRecorder = null
    this.audioChunks = []
    this.isRecording = false
    this.recordingStartTime = null

    // Clear real-time processing data
    this.audioBuffer = []
    this.chunkCallbacks = []
    this.chunkCounter = 0
    this.isRealtimeProcessing = false

    console.log('AudioManager cleaned up')
  }
}
