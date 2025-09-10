/**
 * WhisperWorker - Web Worker for running Whisper model in background thread
 * This prevents blocking the main UI thread during transcription
 */

class WhisperWorker {
  constructor() {
    this.model = null
    this.isInitialized = false
  }

  async initializeModel() {
    // Will be implemented in task 5
    throw new Error('Not implemented yet')
  }

  async processAudioChunk(_audioData, _options) {
    // Will be implemented in task 5
    throw new Error('Not implemented yet')
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
      error: error.message
    })
  }
}
