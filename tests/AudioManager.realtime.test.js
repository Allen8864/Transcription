/**
 * Tests for AudioManager real-time audio chunking functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AudioManager } from '../src/managers/AudioManager.js'

// Mock Web APIs
const mockMediaDevices = {
  getUserMedia: vi.fn()
}

const mockAudioContext = vi.fn().mockImplementation(() => ({
  sampleRate: 16000,
  state: 'running',
  createAnalyser: vi.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    disconnect: vi.fn()
  })),
  createScriptProcessor: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null
  })),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  destination: {},
  resume: vi.fn().mockResolvedValue(),
  close: vi.fn().mockResolvedValue()
}))

const mockAudioBuffer = vi.fn().mockImplementation(() => ({
  getChannelData: vi.fn(() => new Float32Array(4096).fill(0.1)) // Mock audio data
}))

// Setup global mocks
global.navigator = {
  mediaDevices: mockMediaDevices
}

global.window = {
  AudioContext: mockAudioContext,
  webkitAudioContext: mockAudioContext
}

describe('AudioManager Real-time Processing', () => {
  let audioManager
  let mockStream

  beforeEach(() => {
    audioManager = new AudioManager()
    
    // Mock media stream
    mockStream = {
      getTracks: vi.fn(() => [
        { stop: vi.fn() }
      ])
    }

    // Reset mocks
    vi.clearAllMocks()
    mockMediaDevices.getUserMedia.mockResolvedValue(mockStream)
  })

  afterEach(() => {
    try {
      if (audioManager) {
        audioManager.cleanup()
      }
    } catch (error) {
      // Ignore cleanup errors in tests
      console.warn('Cleanup error in test:', error.message)
    }
  })

  describe('Real-time Processing Initialization', () => {
    it('should initialize real-time processing with default parameters', async () => {
      const onChunkReady = vi.fn()
      
      await audioManager.initRealtimeProcessing(onChunkReady)

      expect(audioManager.audioContext).toBeDefined()
      expect(audioManager.analyser).toBeDefined()
      expect(audioManager.processor).toBeDefined()
      expect(audioManager.chunkCallbacks).toContain(onChunkReady)
      expect(audioManager.chunkSize).toBe(2.5)
      expect(audioManager.overlapSize).toBe(0.5)
    })

    it('should request microphone access if stream not available', async () => {
      audioManager.audioStream = null
      
      await audioManager.initRealtimeProcessing()

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      })
    })

    it('should throw error if initialization fails', async () => {
      mockAudioContext.mockImplementationOnce(() => {
        throw new Error('AudioContext not supported')
      })

      await expect(audioManager.initRealtimeProcessing()).rejects.toThrow(
        'Real-time processing initialization failed'
      )
    })
  })

  describe('Real-time Processing Control', () => {
    beforeEach(async () => {
      await audioManager.initRealtimeProcessing()
    })

    it('should start real-time processing', async () => {
      await audioManager.startRealtimeProcessing()

      expect(audioManager.isRealtimeProcessing).toBe(true)
      expect(audioManager.audioBuffer).toEqual([])
      expect(audioManager.chunkCounter).toBe(0)
    })

    it('should resume audio context if suspended', async () => {
      audioManager.audioContext.state = 'suspended'
      
      await audioManager.startRealtimeProcessing()

      expect(audioManager.audioContext.resume).toHaveBeenCalled()
    })

    it('should stop real-time processing', async () => {
      await audioManager.startRealtimeProcessing()
      audioManager.stopRealtimeProcessing()

      expect(audioManager.isRealtimeProcessing).toBe(false)
    })

    it('should throw error if starting without initialization', async () => {
      audioManager.audioContext = null
      
      await expect(audioManager.startRealtimeProcessing()).rejects.toThrow(
        'Real-time processing not initialized'
      )
    })
  })

  describe('Chunk Callback Management', () => {
    beforeEach(async () => {
      await audioManager.initRealtimeProcessing()
    })

    it('should add chunk callbacks', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      audioManager.addChunkCallback(callback1)
      audioManager.addChunkCallback(callback2)

      expect(audioManager.chunkCallbacks).toContain(callback1)
      expect(audioManager.chunkCallbacks).toContain(callback2)
    })

    it('should remove chunk callbacks', () => {
      const callback = vi.fn()
      
      audioManager.addChunkCallback(callback)
      expect(audioManager.chunkCallbacks).toContain(callback)
      
      audioManager.removeChunkCallback(callback)
      expect(audioManager.chunkCallbacks).not.toContain(callback)
    })

    it('should ignore non-function callbacks', () => {
      const initialLength = audioManager.chunkCallbacks.length
      
      audioManager.addChunkCallback('not a function')
      audioManager.addChunkCallback(null)
      audioManager.addChunkCallback(undefined)

      expect(audioManager.chunkCallbacks).toHaveLength(initialLength)
    })
  })

  describe('Audio Data Processing', () => {
    let mockInputBuffer
    let callback

    beforeEach(async () => {
      await audioManager.initRealtimeProcessing()
      await audioManager.startRealtimeProcessing()
      
      callback = vi.fn()
      audioManager.addChunkCallback(callback)

      // Mock audio buffer with enough data for a chunk
      const chunkSamples = Math.floor(2.5 * 16000) // 2.5 seconds at 16kHz
      mockInputBuffer = {
        getChannelData: vi.fn(() => new Float32Array(chunkSamples).fill(0.1))
      }
    })

    it('should process audio data and create chunks', () => {
      audioManager.processAudioData(mockInputBuffer)

      expect(callback).toHaveBeenCalled()
      
      const chunkData = callback.mock.calls[0][0]
      expect(chunkData).toHaveProperty('id')
      expect(chunkData).toHaveProperty('audioData')
      expect(chunkData).toHaveProperty('sampleRate', 16000)
      expect(chunkData).toHaveProperty('duration')
      expect(chunkData).toHaveProperty('timestamp')
      expect(chunkData).toHaveProperty('isRealtime', true)
    })

    it('should maintain overlap between chunks', () => {
      // Create smaller buffer to test overlap properly
      const smallBuffer = {
        getChannelData: vi.fn(() => new Float32Array(8000).fill(0.1)) // 0.5 seconds
      }
      
      // Process multiple small buffers to build up chunks
      audioManager.processAudioData(smallBuffer)
      audioManager.processAudioData(smallBuffer)
      audioManager.processAudioData(smallBuffer)
      audioManager.processAudioData(smallBuffer)
      audioManager.processAudioData(smallBuffer)
      audioManager.processAudioData(smallBuffer) // Total: 3 seconds, should create chunks

      expect(callback).toHaveBeenCalled()
      
      // Buffer should maintain some overlap data after processing
      expect(audioManager.audioBuffer.length).toBeGreaterThan(0)
    })

    it('should handle processing errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error')
      })
      
      audioManager.addChunkCallback(errorCallback)
      
      // Should not throw error
      expect(() => {
        audioManager.processAudioData(mockInputBuffer)
      }).not.toThrow()
      
      // Other callbacks should still be called
      expect(callback).toHaveBeenCalled()
    })
  })

  describe('Buffer Status Monitoring', () => {
    beforeEach(async () => {
      await audioManager.initRealtimeProcessing()
    })

    it('should return correct buffer status', () => {
      const status = audioManager.getBufferStatus()

      expect(status).toHaveProperty('bufferLength')
      expect(status).toHaveProperty('bufferDuration')
      expect(status).toHaveProperty('readyForChunk')
      expect(status).toHaveProperty('chunkCount')
      expect(status).toHaveProperty('isProcessing')
      expect(status).toHaveProperty('nextChunkIn')
    })

    it('should indicate when ready for chunk processing', () => {
      // Add enough data for a chunk
      const chunkSamples = Math.floor(2.5 * 16000)
      audioManager.audioBuffer = new Array(chunkSamples).fill(0.1)

      const status = audioManager.getBufferStatus()
      expect(status.readyForChunk).toBe(true)
      expect(status.nextChunkIn).toBe(0)
    })

    it('should calculate time until next chunk', () => {
      // Add partial data
      const partialSamples = Math.floor(1.0 * 16000) // 1 second
      audioManager.audioBuffer = new Array(partialSamples).fill(0.1)

      const status = audioManager.getBufferStatus()
      expect(status.readyForChunk).toBe(false)
      expect(status.nextChunkIn).toBeCloseTo(1.5, 1) // ~1.5 seconds remaining
    })
  })

  describe('Configuration Management', () => {
    it('should configure processing parameters', () => {
      audioManager.configureRealtimeProcessing({
        chunkSize: 3.0,
        overlapSize: 0.8,
        bufferSize: 8192
      })

      expect(audioManager.chunkSize).toBe(3.0)
      expect(audioManager.overlapSize).toBe(0.8)
      expect(audioManager.bufferSize).toBe(8192)
    })

    it('should enforce parameter limits', () => {
      audioManager.configureRealtimeProcessing({
        chunkSize: 15.0, // Too large
        overlapSize: 5.0, // Too large relative to chunk size
        bufferSize: 3000 // Not power of 2
      })

      expect(audioManager.chunkSize).toBe(10.0) // Max limit
      expect(audioManager.overlapSize).toBeLessThan(audioManager.chunkSize * 0.8)
      expect(audioManager.bufferSize).toBe(4096) // Next valid power of 2
    })

    it('should prevent configuration changes during processing', async () => {
      await audioManager.initRealtimeProcessing()
      await audioManager.startRealtimeProcessing()

      const originalChunkSize = audioManager.chunkSize
      
      audioManager.configureRealtimeProcessing({ chunkSize: 5.0 })
      
      expect(audioManager.chunkSize).toBe(originalChunkSize)
    })
  })

  describe('Audio Analysis', () => {
    beforeEach(async () => {
      await audioManager.initRealtimeProcessing()
    })

    it('should return audio analysis data', () => {
      const analysisData = audioManager.getAudioAnalysisData()
      
      expect(analysisData).toBeInstanceOf(Uint8Array)
      expect(audioManager.analyser.getByteFrequencyData).toHaveBeenCalledWith(analysisData)
    })

    it('should return null if analyser not available', () => {
      audioManager.analyser = null
      
      const analysisData = audioManager.getAudioAnalysisData()
      expect(analysisData).toBeNull()
    })
  })

  describe('Cleanup', () => {
    it('should clean up all real-time processing resources', async () => {
      await audioManager.initRealtimeProcessing()
      await audioManager.startRealtimeProcessing()

      audioManager.cleanup()

      expect(audioManager.processor).toBeNull()
      expect(audioManager.analyser).toBeNull()
      expect(audioManager.audioContext).toBeNull()
      expect(audioManager.audioBuffer).toEqual([])
      expect(audioManager.chunkCallbacks).toEqual([])
      expect(audioManager.isRealtimeProcessing).toBe(false)
    })

    it('should handle cleanup when resources are already null', () => {
      // Should not throw error
      expect(() => {
        audioManager.cleanup()
      }).not.toThrow()
    })
  })
})