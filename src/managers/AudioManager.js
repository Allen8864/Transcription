import { webmFixDuration } from '../utils/BlobFix.js'

/**
 * AudioManager - Simplified audio processing following whisper-web approach
 * 
 * This class manages:
 * - Microphone recording
 * - Audio file upload
 * - Audio preprocessing for Whisper (16kHz, mono, Float32Array)
 */
export class AudioManager {
  constructor() {
    this.mediaRecorder = null
    this.audioStream = null
    this.audioChunks = []
    this.isRecording = false
    this.recordingStartTime = null
    
    // Supported formats (following whisper-web - supports video too)
    this.supportedFormats = ['audio/webm', 'audio/mp4', 'audio/wav']
    this.supportedFileTypes = [
      '.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac',
      '.mp4', '.avi', '.mov', '.mkv', '.wmv'  // Video formats
    ]
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
      this.mediaRecorder.onstop = async () => {
        try {
          console.log(
            'MediaRecorder stopped, chunks count:',
            this.audioChunks.length
          )
          console.log('MediaRecorder mimeType:', this.mediaRecorder.mimeType)

          let audioBlob = new Blob(this.audioChunks, {
            type: this.mediaRecorder.mimeType
          })

          this.isRecording = false
          
          // Fix WEBM duration metadata if needed
          const recordingDuration = this.getRecordingDuration()
          if (recordingDuration > 0 && audioBlob.type.includes('webm')) {
            try {
              console.log('Fixing WEBM duration metadata...', recordingDuration)
              audioBlob = await webmFixDuration(audioBlob, recordingDuration * 1000) // Convert to milliseconds
              console.log('WEBM duration fixed successfully')
            } catch (error) {
              console.warn('Failed to fix WEBM duration, using original blob:', error)
              // Continue with original blob
            }
          }
          
          this.recordingStartTime = null

          console.log('Recording completed:', {
            blobSize: audioBlob.size,
            blobType: audioBlob.type,
            chunksCount: this.audioChunks.length,
            duration: recordingDuration
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
   * Validate if the file is a supported audio/video format (following whisper-web)
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

    // Determine if it's a video file (whisper-web supports video)
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.webm']
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
   * Extract audio from video file (whisper-web style)
   * @param {File} videoFile - The video file
   * @returns {Promise<Blob>} Audio blob extracted from video
   */
  async extractAudioFromVideo(videoFile) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.preload = 'metadata'

      const cleanup = () => {
        if (video.src) URL.revokeObjectURL(video.src)
        if (audioContext.state !== 'closed') audioContext.close().catch(() => {})
      }

      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Video audio extraction timeout'))
      }, 60000)

      video.addEventListener('loadedmetadata', async () => {
        try {
          console.log('Extracting audio from video:', {
            duration: video.duration,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight
          })

          const source = audioContext.createMediaElementSource(video)
          const destination = audioContext.createMediaStreamDestination()
          source.connect(destination)

          const mediaRecorder = new MediaRecorder(destination.stream, {
            mimeType: 'audio/webm;codecs=opus'
          })

          const audioChunks = []

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data)
          }

          mediaRecorder.onstop = () => {
            clearTimeout(timeout)
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
            cleanup()
            resolve(audioBlob)
          }

          mediaRecorder.onerror = (event) => {
            clearTimeout(timeout)
            cleanup()
            reject(new Error(`Audio extraction failed: ${event.error?.message}`))
          }

          mediaRecorder.start()
          await video.play()

          video.addEventListener('ended', () => {
            if (mediaRecorder.state === 'recording') mediaRecorder.stop()
          })

        } catch (error) {
          clearTimeout(timeout)
          cleanup()
          reject(new Error(`Video processing failed: ${error.message}`))
        }
      })

      video.addEventListener('error', () => {
        clearTimeout(timeout)
        cleanup()
        reject(new Error('Failed to load video file'))
      })

      video.src = URL.createObjectURL(videoFile)
      video.load()
    })
  }

  /**
   * Process audio for Whisper (following whisper-web approach)
   * @param {Blob|File} audioInput - Audio blob or file
   * @returns {Promise<Float32Array>} Preprocessed audio data for Whisper
   */
  async processAudioForWhisper(audioInput) {
    try {
      console.log('Processing audio for Whisper:', {
        size: audioInput.size,
        type: audioInput.type
      })

      // For video files, extract audio first
      let processedInput = audioInput
      if (audioInput instanceof File) {
        const validation = this.validateAudioFormat(audioInput)
        if (validation.isVideo) {
          console.log('Extracting audio from video file...')
          processedInput = await this.extractAudioFromVideo(audioInput)
        }
      }

      // Decode audio using Web Audio API
      const arrayBuffer = await processedInput.arrayBuffer()
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000 // Whisper expects 16kHz
      })
      
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Get mono audio data (first channel)
      let audioData = audioBuffer.getChannelData(0)
      
      // Resample to 16kHz if needed
      if (audioBuffer.sampleRate !== 16000) {
        audioData = this._resample(audioData, audioBuffer.sampleRate, 16000)
      }

      // Close context to free resources
      await audioContext.close()

      console.log('Audio processing completed:', {
        duration: audioData.length / 16000,
        samples: audioData.length
      })

      return audioData
    } catch (error) {
      console.error('Audio processing failed:', error)
      throw new Error(`Failed to process audio: ${error.message}`)
    }
  }

  /**
   * Simple linear interpolation resampling (whisper-web style)
   * @param {Float32Array} audioData - Input audio data
   * @param {number} sourceSampleRate - Source sample rate
   * @param {number} targetSampleRate - Target sample rate (16000)
   * @returns {Float32Array} Resampled audio data
   */
  _resample(audioData, sourceSampleRate, targetSampleRate) {
    if (sourceSampleRate === targetSampleRate) {
      return audioData
    }

    const ratio = sourceSampleRate / targetSampleRate
    const newLength = Math.round(audioData.length / ratio)
    const resampled = new Float32Array(newLength)

    for (let i = 0; i < newLength; i++) {
      const sourceIndex = i * ratio
      const index = Math.floor(sourceIndex)
      const fraction = sourceIndex - index

      if (index + 1 < audioData.length) {
        resampled[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction
      } else {
        resampled[i] = audioData[index] || 0
      }
    }

    return resampled
  }


  /**
   * Clean up resources
   */
  cleanup() {
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

    console.log('AudioManager cleaned up')
  }
}
