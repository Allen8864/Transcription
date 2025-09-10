/**
 * Real-time Audio Chunking Demo
 * 
 * This example demonstrates how to use the AudioManager's real-time
 * audio chunking functionality for processing audio in 2-3 second chunks
 * with overlap support.
 */

import { AudioManager } from '../src/managers/AudioManager.js'

class RealtimeChunkingDemo {
  constructor() {
    this.audioManager = new AudioManager()
    this.chunkCount = 0
    this.isProcessing = false
  }

  async init() {
    try {
      // Initialize the AudioManager
      await this.audioManager.init()
      
      // Set up real-time processing with chunk callback
      await this.audioManager.initRealtimeProcessing(this.onChunkReady.bind(this))
      
      // Configure processing parameters (optional)
      this.audioManager.configureRealtimeProcessing({
        chunkSize: 2.5,    // 2.5 seconds per chunk
        overlapSize: 0.5,  // 0.5 seconds overlap
        bufferSize: 4096   // Audio buffer size
      })

      console.log('Real-time chunking demo initialized')
      this.logStatus()
      
    } catch (error) {
      console.error('Failed to initialize demo:', error)
      throw error
    }
  }

  /**
   * Callback function called when an audio chunk is ready for processing
   * @param {Object} chunkData - The audio chunk data
   */
  onChunkReady(chunkData) {
    this.chunkCount++
    
    console.log(`📦 Chunk ${chunkData.id} ready:`, {
      duration: `${chunkData.duration.toFixed(2)}s`,
      samples: chunkData.audioData.length,
      sampleRate: chunkData.sampleRate,
      isRealtime: chunkData.isRealtime,
      isFinal: chunkData.isFinal || false,
      timestamp: new Date(chunkData.timestamp).toLocaleTimeString()
    })

    // Simulate processing the chunk (e.g., send to Whisper model)
    this.simulateChunkProcessing(chunkData)
  }

  /**
   * Simulate processing an audio chunk (placeholder for Whisper integration)
   * @param {Object} chunkData - The audio chunk data
   */
  simulateChunkProcessing(chunkData) {
    // In a real implementation, this would send the chunk to WhisperCPP
    // For demo purposes, we'll just simulate processing time
    
    setTimeout(() => {
      const mockTranscription = `Transcription result for chunk ${chunkData.id}`
      console.log(`✅ Processed chunk ${chunkData.id}: "${mockTranscription}"`)
      
      if (chunkData.isFinal) {
        console.log('🏁 Final chunk processed')
      }
    }, Math.random() * 500 + 100) // Simulate 100-600ms processing time
  }

  /**
   * Start real-time recording and processing
   */
  async startRecording() {
    try {
      if (this.isProcessing) {
        console.log('⚠️ Already processing')
        return
      }

      console.log('🎤 Starting real-time recording and chunking...')
      
      // Start real-time processing
      await this.audioManager.startRealtimeProcessing()
      
      // Start recording (this will trigger chunk processing)
      await this.audioManager.startRecording()
      
      this.isProcessing = true
      this.chunkCount = 0
      
      console.log('✅ Recording started - speak into your microphone!')
      
      // Start status monitoring
      this.startStatusMonitoring()
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }

  /**
   * Stop recording and processing
   */
  async stopRecording() {
    try {
      if (!this.isProcessing) {
        console.log('⚠️ Not currently processing')
        return
      }

      console.log('🛑 Stopping recording...')
      
      // Stop recording
      const audioBlob = await this.audioManager.stopRecording()
      
      // Stop real-time processing (this will process any remaining buffer)
      this.audioManager.stopRealtimeProcessing()
      
      this.isProcessing = false
      
      console.log('✅ Recording stopped:', {
        totalChunks: this.chunkCount,
        audioSize: `${(audioBlob.size / 1024).toFixed(1)} KB`,
        duration: `${this.audioManager.getRecordingDuration()}s`
      })
      
      this.stopStatusMonitoring()
      
    } catch (error) {
      console.error('Failed to stop recording:', error)
      throw error
    }
  }

  /**
   * Start monitoring buffer status
   */
  startStatusMonitoring() {
    this.statusInterval = setInterval(() => {
      const status = this.audioManager.getBufferStatus()
      
      if (status.isProcessing) {
        console.log(`📊 Buffer status:`, {
          bufferDuration: `${status.bufferDuration.toFixed(2)}s`,
          readyForChunk: status.readyForChunk,
          nextChunkIn: status.readyForChunk ? '0s' : `${status.nextChunkIn.toFixed(1)}s`,
          totalChunks: status.chunkCount
        })
      }
    }, 2000) // Update every 2 seconds
  }

  /**
   * Stop monitoring buffer status
   */
  stopStatusMonitoring() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval)
      this.statusInterval = null
    }
  }

  /**
   * Log current configuration and status
   */
  logStatus() {
    console.log('📋 Configuration:', {
      chunkSize: `${this.audioManager.chunkSize}s`,
      overlapSize: `${this.audioManager.overlapSize}s`,
      bufferSize: this.audioManager.bufferSize,
      sampleRate: `${this.audioManager.sampleRate}Hz`
    })
  }

  /**
   * Add additional chunk callback for custom processing
   * @param {Function} callback - Custom callback function
   */
  addCustomChunkCallback(callback) {
    this.audioManager.addChunkCallback(callback)
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stopStatusMonitoring()
    
    if (this.isProcessing) {
      this.audioManager.stopRealtimeProcessing()
    }
    
    this.audioManager.cleanup()
    console.log('🧹 Demo cleaned up')
  }
}

// Example usage
async function runDemo() {
  const demo = new RealtimeChunkingDemo()
  
  try {
    // Initialize the demo
    await demo.init()
    
    // Add a custom chunk callback for additional processing
    demo.addCustomChunkCallback((chunkData) => {
      console.log(`🔧 Custom processing for chunk ${chunkData.id}`)
    })
    
    console.log('\n🚀 Demo ready! Use the following commands:')
    console.log('- demo.startRecording() - Start recording and chunking')
    console.log('- demo.stopRecording() - Stop recording')
    console.log('- demo.cleanup() - Clean up resources')
    
    // Make demo available globally for interactive use
    if (typeof window !== 'undefined') {
      window.demo = demo
    } else if (typeof global !== 'undefined') {
      global.demo = demo
    }
    
  } catch (error) {
    console.error('Demo failed:', error)
  }
}

// Auto-run demo if this file is executed directly
if (typeof window !== 'undefined' && window.location) {
  // Browser environment - wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDemo)
  } else {
    runDemo()
  }
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment - export for testing
  module.exports = { RealtimeChunkingDemo, runDemo }
}

export { RealtimeChunkingDemo, runDemo }