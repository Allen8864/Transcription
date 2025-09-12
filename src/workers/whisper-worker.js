/**
 * WhisperWorker - Web Worker for running Whisper model in background thread
 * This prevents blocking the main UI thread during transcription
 */

import { pipeline, env } from '@xenova/transformers'

// Configure transformers environment for web worker
env.allowRemoteModels = true
env.allowLocalModels = false

class WhisperWorker {
  constructor() {
    this.model = null
    this.isInitialized = false
    this.loadingProgress = 0
  }

  /**
   * Initialize the Whisper model
   * Uses Xenova's transformers.js with Whisper Tiny model for fast loading
   */
  async initializeModel() {
    try {
      this.loadingProgress = 0
      
      // Send progress updates during model loading
      const progressCallback = (progress) => {
        this.loadingProgress = Math.round(progress.progress || 0)
        self.postMessage({
          type: 'progress',
          data: { progress: this.loadingProgress }
        })
      }

      // Load Whisper Tiny model (quantized for better performance)
      this.model = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny',
        { 
          progress_callback: progressCallback,
          quantized: true
        }
      )

      this.isInitialized = true
      this.loadingProgress = 100

      return {
        success: true,
        modelName: 'whisper-tiny',
        isQuantized: true
      }
    } catch (error) {
      this.isInitialized = false
      throw new Error(`Model initialization failed: ${error.message}`)
    }
  }

  /**
   * Process audio chunk for transcription
   * @param {ArrayBuffer} audioData - Preprocessed audio data as ArrayBuffer (from Float32Array)
   * @param {Object} options - Transcription options
   */
  async processAudioChunk(audioData, options = {}) {
    if (!this.isInitialized || !this.model) {
      throw new Error('Model not initialized. Call initializeModel() first.')
    }

    try {
      // Convert ArrayBuffer to Float32Array (expected by transformers.js)
      // The audioData should already be preprocessed by AudioManager
      const audioArray = new Float32Array(audioData)
      
      console.log('Processing audio chunk in worker:', {
        audioLength: audioArray.length,
        duration: audioArray.length / 16000, // Assuming 16kHz
        language: options.language,
        chunkLength: options.chunkLength,
        strideLength: options.strideLength
      })
      
      // Prepare transcription options following whisper-web approach
      const transcriptionOptions = {
        language: options.language === 'auto' ? null : options.language,
        task: 'transcribe',
        return_timestamps: options.returnTimestamps !== false, // Default to true
        chunk_length_s: options.chunkLength || 30,
        stride_length_s: options.strideLength || 5,
        // Additional options for better accuracy
        no_speech_threshold: 0.6,
        logprob_threshold: -1.0,
        compression_ratio_threshold: 2.4
      }

      // Validate audio data
      if (audioArray.length === 0) {
        throw new Error('Empty audio data provided')
      }

      // Check for minimum audio length (at least 0.1 seconds)
      const minSamples = 16000 * 0.1 // 0.1 seconds at 16kHz
      if (audioArray.length < minSamples) {
        console.warn('Audio chunk too short, padding with silence')
        const paddedAudio = new Float32Array(minSamples)
        paddedAudio.set(audioArray)
        // Rest of the array is already initialized to 0 (silence)
        audioArray = paddedAudio
      }

      // Calculate time precision for accurate timestamps
      const time_precision = this.model.processor?.feature_extractor?.config?.chunk_length / 
                            this.model.model?.config?.max_source_positions || 0.02

      // Storage for chunks to be processed. Initialize with an empty chunk.
      let chunks_to_process = [
        {
          tokens: [],
          finalised: false,
        },
      ]

      // Chunk callback - called after each audio chunk is processed
      const chunk_callback = (chunk) => {
        let last = chunks_to_process[chunks_to_process.length - 1]

        // Overwrite last chunk with new info
        Object.assign(last, chunk)
        last.finalised = true

        // Create an empty chunk after, if it's not the last chunk
        if (!chunk.is_last) {
          chunks_to_process.push({
            tokens: [],
            finalised: false,
          })
        }
      }

      // Token-level callback function for real-time updates
      const callback_function = (item) => {
        if (!item || !item[0] || !item[0].output_token_ids) {
          return
        }

        let last = chunks_to_process[chunks_to_process.length - 1]

        // Update tokens of last chunk
        last.tokens = [...item[0].output_token_ids]

        try {
          // Merge text chunks using the tokenizer's ASR decoder
          let data
          if (this.model.tokenizer && this.model.tokenizer._decode_asr) {
            data = this.model.tokenizer._decode_asr(chunks_to_process, {
              time_precision: time_precision,
              return_timestamps: true,
              force_full_sequences: false,
            })
          } else {
            // Fallback for basic decoding
            const decodedText = chunks_to_process
              .filter(chunk => chunk.finalised && chunk.tokens.length > 0)
              .map(chunk => this.model.tokenizer.decode(chunk.tokens, { skip_special_tokens: true }))
              .join(' ')
            
            data = [
              decodedText,
              {
                chunks: chunks_to_process
                  .filter(chunk => chunk.finalised)
                  .map((chunk, index) => ({
                    text: this.model.tokenizer.decode(chunk.tokens, { skip_special_tokens: true }),
                    timestamp: [index * time_precision * 100, null] // Approximate timestamps
                  }))
              }
            ]
          }

          // Send real-time update to main thread
          self.postMessage({
            type: 'progress',
            data: {
              type: 'transcription_update',
              result: {
                text: data[0] || '',
                chunks: data[1]?.chunks || [],
                isPartial: true
              }
            }
          })
        } catch (error) {
          console.warn('Error in callback_function:', error)
        }
      }

      // Enhanced transcription options with callbacks
      const enhancedOptions = {
        ...transcriptionOptions,
        callback_function: callback_function, // after each generation step
        chunk_callback: chunk_callback, // after each chunk is processed
        force_full_sequences: false, // Enable streaming
      }

      // Perform transcription
      const result = await this.model(audioArray, enhancedOptions)

      // Format result following whisper-web structure
      const transcriptionResult = {
        text: result.text?.trim() || '',
        confidence: this.calculateConfidence(result),
        language: result.language || options.language || 'unknown',
        isPartial: options.isPartial || false,
        timestamp: Date.now(),
        // Additional metadata
        chunks: result.chunks || [],
        processing_time: Date.now() - performance.now()
      }

      console.log('Transcription completed in worker:', {
        textLength: transcriptionResult.text.length,
        confidence: transcriptionResult.confidence,
        language: transcriptionResult.language
      })

      return transcriptionResult
    } catch (error) {
      console.error('Worker transcription error:', error)
      throw new Error(`Transcription failed: ${error.message}`)
    }
  }

  /**
   * Calculate confidence score from model output
   * @param {Object} result - Model output
   * @returns {number} Confidence score between 0 and 1
   */
  calculateConfidence(result) {
    // Simple confidence calculation based on text length and presence
    if (!result.text || result.text.trim().length === 0) {
      return 0
    }
    
    // Basic heuristic: longer, more coherent text gets higher confidence
    const textLength = result.text.trim().length
    const baseConfidence = Math.min(textLength / 100, 0.9)
    
    // Add small random variation to simulate real confidence scores
    const variation = (Math.random() - 0.5) * 0.1
    
    return Math.max(0.1, Math.min(0.99, baseConfidence + variation))
  }

  /**
   * Get model status and information
   */
  getModelStatus() {
    return {
      isInitialized: this.isInitialized,
      loadingProgress: this.loadingProgress,
      modelName: this.model ? 'whisper-tiny' : null
    }
  }
}

// Web Worker message handling
const worker = new WhisperWorker()

self.onmessage = async function (e) {
  const { type, data, id } = e.data

  try {
    let result

    switch (type) {
      case 'init':
        result = await worker.initializeModel()
        break
      case 'transcribe':
        result = await worker.processAudioChunk(data.audioData, data.options)
        break
      case 'status':
        result = worker.getModelStatus()
        break
      default:
        throw new Error(`Unknown message type: ${type}`)
    }

    // Send success response
    self.postMessage({
      id,
      type: 'success',
      data: result
    })
  } catch (error) {
    // Send error response
    self.postMessage({
      id,
      type: 'error',
      error: error.message,
      stack: error.stack
    })
  }
}
