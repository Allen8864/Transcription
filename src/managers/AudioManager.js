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
    this.supportedFileTypes = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.mp4']
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
          channelCount: 1     // Mono audio
        }
      }

      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('Microphone access granted')
      return this.audioStream
    } catch (error) {
      console.error('Microphone access denied:', error)
      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone permission denied. Please allow microphone access and try again.')
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.')
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
      const mimeType = this.supportedFormats.find(format => 
        MediaRecorder.isTypeSupported(format)
      ) || 'audio/webm'

      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType,
        audioBitsPerSecond: 128000
      })

      this.audioChunks = []
      this.recordingStartTime = Date.now()

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        console.log('Recording stopped')
      }

      this.mediaRecorder.onerror = (event) => {
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
          console.log('MediaRecorder stopped, chunks count:', this.audioChunks.length)
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

      this.mediaRecorder.onerror = (event) => {
        reject(new Error(`Recording error: ${event.error.message}`))
      }

      // Ensure MediaRecorder is in the right state before stopping
      if (this.mediaRecorder.state === 'recording') {
        console.log('Stopping MediaRecorder, current state:', this.mediaRecorder.state)
        this.mediaRecorder.stop()
      } else {
        console.warn('MediaRecorder is not in recording state:', this.mediaRecorder.state)
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
   * Handle file upload and validate the audio file
   * @param {File} file - The uploaded file
   * @returns {Promise<{file: File, isValid: boolean, error?: string}>}
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

      // Additional file size check (max 100MB)
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        return {
          file,
          isValid: false,
          error: 'File size exceeds 100MB limit'
        }
      }

      console.log('File upload validated:', {
        name: file.name,
        size: file.size,
        type: file.type
      })

      return {
        file,
        isValid: true
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
   * Validate if the file is a supported audio format
   * @param {File} file - The file to validate
   * @returns {{isValid: boolean, error?: string}}
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

    // Check MIME type if available
    if (file.type && !file.type.startsWith('audio/')) {
      return {
        isValid: false,
        error: 'File is not an audio file'
      }
    }

    return { isValid: true }
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
      view.setUint16(20, 1, true)  // Audio format (PCM)
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
        view.setInt16(offset, sample * 0x7FFF, true)
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
  splitAudioChunks(audioData, chunkSize = 2.5, sampleRate = 16000, overlap = 0.5) {
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
        if (chunk.length >= sampleRate * 0.5) { // At least 0.5 seconds
          chunks.push(chunk)
        }
        
        // Break if we've reached the end
        if (end >= samples.length) break
      }

      console.log('Audio split into chunks:', {
        totalSamples: samples.length,
        chunkCount: chunks.length,
        chunkSize: chunkSize,
        overlap: overlap,
        avgChunkLength: chunks.length > 0 ? chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length : 0
      })

      return chunks
    } catch (error) {
      console.error('Audio chunking error:', error)
      throw new Error(`Failed to split audio into chunks: ${error.message}`)
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
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
    
    console.log('AudioManager cleaned up')
  }
}
