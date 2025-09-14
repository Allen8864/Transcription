/**
 * AudioFileReader Component - Improved file reading implementation
 * Based on the FileTile pattern but adapted for the transcription app
 * 
 * This component provides a more direct approach to file reading,
 * similar to the React FileTile component but integrated with our existing architecture
 * 
 * Note: Renamed from FileReader to avoid conflicts with browser's FileReader API
 */

export class AudioFileReader {
  constructor(options = {}) {
    this.options = {
      accept: 'audio/*,video/*',
      sampleRate: 16000, // Default sample rate for Whisper
      ...options
    }
    
    // Supported file types (following whisper-web pattern)
    this.supportedAudioTypes = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm']
    this.supportedVideoTypes = ['.mp4', '.avi', '.mov', '.mkv', '.wmv']
    this.supportedTypes = [...this.supportedAudioTypes, ...this.supportedVideoTypes]
    
    // Callbacks
    this.onFileUpdate = options.onFileUpdate || null
    this.onError = options.onError || null
    this.onProgress = options.onProgress || null
  }

  /**
   * Create and trigger file input (similar to FileTile approach)
   * This method creates a hidden input element and triggers file selection
   */
  selectFile() {
    // Create hidden input element (following FileTile pattern)
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = this.options.accept
    fileInput.style.display = 'none'
    
    // Set up file selection handler
    fileInput.addEventListener('change', async (event) => {
      const files = event.target.files
      if (!files || files.length === 0) {
        return
      }
      
      const file = files[0]
      await this.processFile(file)
      
      // Clean up
      document.body.removeChild(fileInput)
    })
    
    // Add to DOM and trigger click
    document.body.appendChild(fileInput)
    fileInput.click()
  }

  /**
   * Process a file (either from file input or drag & drop)
   * @param {File} file - The file to process
   */
  async processFile(file) {
    try {
      // Validate file first
      const validation = this.validateFile(file)
      if (!validation.isValid) {
        if (this.onError) {
          this.onError(new Error(validation.error))
        }
        return
      }

      // Report progress
      if (this.onProgress) {
        this.onProgress({ stage: 'reading', progress: 0 })
      }

      // Read file as ArrayBuffer (following FileTile pattern)
      const arrayBuffer = await this.readFileAsArrayBuffer(file)
      
      if (this.onProgress) {
        this.onProgress({ stage: 'decoding', progress: 50 })
      }

      // Decode audio data using Web Audio API
      const audioBuffer = await this.decodeAudioData(arrayBuffer)
      
      if (this.onProgress) {
        this.onProgress({ stage: 'processing', progress: 75 })
      }

      // Create blob URL for playback (similar to FileTile)
      const blobUrl = URL.createObjectURL(file)
      const mimeType = file.type

      if (this.onProgress) {
        this.onProgress({ stage: 'complete', progress: 100 })
      }

      // Call the update callback with processed data
      if (this.onFileUpdate) {
        this.onFileUpdate({
          audioBuffer,
          blobUrl,
          mimeType,
          file,
          isVideo: validation.isVideo
        })
      }

    } catch (error) {
      console.error('File processing error:', error)
      if (this.onError) {
        this.onError(error)
      }
    }
  }

  /**
   * Read file as ArrayBuffer using FileReader (following FileTile pattern)
   * @param {File} file - The file to read
   * @returns {Promise<ArrayBuffer>} The file data as ArrayBuffer
   */
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      // Use window.FileReader to avoid naming conflict with our class
      const reader = new window.FileReader()
      
      reader.addEventListener('load', (event) => {
        const arrayBuffer = event.target?.result
        if (!arrayBuffer) {
          reject(new Error('Failed to read file data - no result'))
          return
        }
        
        console.log('File read successfully:', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          arrayBufferSize: arrayBuffer.byteLength
        })
        
        resolve(arrayBuffer)
      })
      
      reader.addEventListener('error', (event) => {
        const error = event.target?.error
        console.error('FileReader error:', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          error: error
        })
        reject(new Error(`Failed to read file: ${error?.message || 'Unknown error'}`))
      })
      
      reader.addEventListener('abort', () => {
        reject(new Error('File reading was aborted'))
      })
      
      // Read as ArrayBuffer (same as FileTile)
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Decode audio data using Web Audio API (following FileTile pattern)
   * @param {ArrayBuffer} arrayBuffer - The audio file data
   * @returns {Promise<AudioBuffer>} The decoded audio buffer
   */
  async decodeAudioData(arrayBuffer) {
    // Create AudioContext with default sample rate for decoding
    // Don't specify sampleRate here - let it use the file's native sample rate
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    try {
      // Decode audio data (same approach as FileTile)
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Close context to free resources
      await audioContext.close()
      
      console.log('Audio decoded successfully:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      })
      
      return audioBuffer
      
    } catch (error) {
      // Close context even if decoding fails
      await audioContext.close().catch(() => {})
      console.error('Audio decoding error details:', {
        error: error.message,
        arrayBufferSize: arrayBuffer.byteLength,
        errorName: error.name,
        errorCode: error.code
      })
      throw new Error(`Audio decoding failed: ${error.message}`)
    }
  }

  /**
   * Validate file type and size
   * @param {File} file - The file to validate
   * @returns {{isValid: boolean, error?: string, isVideo?: boolean}}
   */
  validateFile(file) {
    if (!file) {
      return {
        isValid: false,
        error: 'No file provided'
      }
    }

    // Check file extension
    const fileName = file.name.toLowerCase()
    const hasValidExtension = this.supportedTypes.some(ext =>
      fileName.endsWith(ext)
    )

    if (!hasValidExtension) {
      return {
        isValid: false,
        error: `Unsupported file format. Supported formats: ${this.supportedTypes.join(', ')}`
      }
    }

    // Determine if it's a video file
    const isVideo = this.supportedVideoTypes.some(ext => fileName.endsWith(ext))

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

    // File size check (max 500MB for video files, 100MB for audio)
    const maxSize = isVideo ? 500 * 1024 * 1024 : 100 * 1024 * 1024
    if (file.size > maxSize) {
      const limit = isVideo ? '500MB' : '100MB'
      return {
        isValid: false,
        error: `File size exceeds ${limit} limit`
      }
    }

    return {
      isValid: true,
      isVideo: isVideo
    }
  }

  /**
   * Extract Float32Array from AudioBuffer for Whisper processing
   * @param {AudioBuffer} audioBuffer - The decoded audio buffer
   * @returns {Float32Array} Audio data ready for Whisper
   */
  static extractAudioData(audioBuffer) {
    if (!audioBuffer) {
      throw new Error('No audio buffer provided')
    }

    // Get mono audio data (first channel) - Whisper expects mono
    let audioData = audioBuffer.getChannelData(0)
    
    // Resample to 16kHz if needed (Whisper's expected sample rate)
    if (audioBuffer.sampleRate !== 16000) {
      audioData = AudioFileReader.resampleAudio(audioData, audioBuffer.sampleRate, 16000)
    }

    return audioData
  }

  /**
   * Simple linear interpolation resampling
   * @param {Float32Array} audioData - Input audio data
   * @param {number} sourceSampleRate - Source sample rate
   * @param {number} targetSampleRate - Target sample rate (16000)
   * @returns {Float32Array} Resampled audio data
   */
  static resampleAudio(audioData, sourceSampleRate, targetSampleRate) {
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
        // Linear interpolation
        resampled[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction
      } else {
        resampled[i] = audioData[index] || 0
      }
    }

    return resampled
  }

  /**
   * Create a tile-like interface for file selection
   * This creates a clickable element similar to the FileTile component
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Tile options
   */
  createFileTile(container, options = {}) {
    const {
      icon = '📁',
      text = 'Select Audio File',
      className = 'file-tile'
    } = options

    // Create tile element
    const tile = document.createElement('div')
    tile.className = className
    tile.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      border: 2px dashed #ccc;
      border-radius: 8px;
      cursor: pointer;
      transition: border-color 0.3s ease;
      min-height: 120px;
    `

    // Add icon
    const iconElement = document.createElement('div')
    iconElement.style.cssText = `
      font-size: 2em;
      margin-bottom: 10px;
    `
    iconElement.textContent = icon

    // Add text
    const textElement = document.createElement('div')
    textElement.style.cssText = `
      font-size: 1em;
      color: #666;
      text-align: center;
    `
    textElement.textContent = text

    // Assemble tile
    tile.appendChild(iconElement)
    tile.appendChild(textElement)

    // Add click handler
    tile.addEventListener('click', () => {
      this.selectFile()
    })

    // Add hover effect
    tile.addEventListener('mouseenter', () => {
      tile.style.borderColor = '#007bff'
    })

    tile.addEventListener('mouseleave', () => {
      tile.style.borderColor = '#ccc'
    })

    // Add to container
    container.appendChild(tile)

    return tile
  }
}
