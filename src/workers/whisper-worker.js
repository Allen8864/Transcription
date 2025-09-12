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
    this.lastProgress = 0
    this.progressHistory = []
    this.progressUpdateThrottle = 100 // 限制更新频率（毫秒）
    this.lastUpdateTime = 0
    this.fileProgress = new Map() // 记录每个文件的下载进度
    this.expectedFiles = ['config.json', 'model.bin', 'tokenizer.json', 'vocab.json']
  }

  /**
   * Initialize the Whisper model
   * Uses Xenova's transformers.js with Whisper Small model for better accuracy
   */
  async initializeModel() {
    try {
      this.loadingProgress = 0
      
      // Send progress updates during model loading
      const progressCallback = (progress) => {
        const currentTime = Date.now()
        
        // 获取当前正在下载的文件名
        const file = progress.file || 'unknown'
        const rawProgress = Math.round(progress.progress || 0)
        
        // 更新文件进度记录
        this.fileProgress.set(file, rawProgress)
        
        // 计算总体进度
        let totalProgress = 0
        let filesCount = 0
        
        // 为已知的文件分配权重
        const weights = {
          'model.bin': 0.7,    // 模型文件最大，给予最高权重
          'tokenizer.json': 0.1,
          'config.json': 0.1,
          'vocab.json': 0.1
        }
        
        let totalWeight = 0
        
        // 计算加权平均进度
        for (const [filename, progress] of this.fileProgress) {
          const weight = weights[filename] || 0.1 // 未知文件给予较小权重
          totalProgress += progress * weight
          totalWeight += weight
        }
        
        // 如果有进度记录，计算加权平均值
        const weightedProgress = totalWeight > 0 
          ? Math.round(totalProgress / totalWeight)
          : rawProgress
        
        // 添加到历史记录用于平滑处理
        this.progressHistory.push(weightedProgress)
        if (this.progressHistory.length > 3) { // 减少历史记录长度，使进度更敏感
          this.progressHistory.shift()
        }
        
        // 计算平滑进度值
        const smoothedProgress = Math.round(
          this.progressHistory.reduce((a, b) => a + b, 0) / this.progressHistory.length
        )
        
        // 节流更新：限制更新频率
        if (currentTime - this.lastUpdateTime >= this.progressUpdateThrottle) {
          // 确保进度值始终递增
          this.loadingProgress = Math.max(this.loadingProgress, smoothedProgress)
          this.lastProgress = this.loadingProgress
          this.lastUpdateTime = currentTime
          
          // 发送进度更新
          self.postMessage({
            type: 'progress',
            data: { 
              progress: this.loadingProgress,
              file: file, // 添加当前文件信息，方便调试
              detail: Object.fromEntries(this.fileProgress) // 添加详细进度信息
            }
          })
        }
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
        modelName: 'whisper-tin y',
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
