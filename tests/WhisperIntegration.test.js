/**
 * Integration tests for WhisperCPP WebAssembly integration
 * Tests the complete flow from model loading to transcription
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { TranscriptionManager } from '../src/managers/TranscriptionManager.js'

// Mock transformers library for testing
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn().mockResolvedValue({
    // Mock transcription function
    __call: vi.fn().mockResolvedValue({
      text: 'This is a mock transcription result.',
      language: 'en'
    })
  }),
  env: {
    allowRemoteModels: true,
    allowLocalModels: false
  }
}))

describe('WhisperCPP Integration Tests', () => {
  let manager
  
  beforeAll(async () => {
    // Set longer timeout for integration tests
    vi.setConfig({ testTimeout: 30000 })
  })

  afterAll(() => {
    if (manager) {
      manager.destroy()
    }
  })

  describe('End-to-End Model Integration', () => {
    it('should complete full initialization and transcription flow', async () => {
      // This test verifies the complete integration works
      // In a real environment, this would load the actual model
      
      manager = new TranscriptionManager()
      
      // Track progress updates
      const progressUpdates = []
      manager.setProgressCallback((progress) => {
        progressUpdates.push(progress)
      })

      // Initialize the manager
      await manager.init()
      expect(manager.worker).toBeDefined()

      // Load the model (mocked)
      const loadResult = await manager.loadWhisperModel()
      expect(loadResult.success).toBe(true)
      expect(manager.isReady()).toBe(true)

      // Create mock audio data
      const sampleRate = 16000
      const duration = 2 // 2 seconds
      const audioBuffer = new ArrayBuffer(sampleRate * duration * 4) // 32-bit float
      const audioArray = new Float32Array(audioBuffer)
      
      // Fill with simple sine wave for testing
      for (let i = 0; i < audioArray.length; i++) {
        audioArray[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1
      }

      // Test transcription
      const result = await manager.transcribeAudio(audioBuffer, 'en')
      
      expect(result).toMatchObject({
        text: expect.any(String),
        confidence: expect.any(Number),
        language: expect.any(String),
        isPartial: expect.any(Boolean),
        timestamp: expect.any(Number)
      })

      expect(result.text.length).toBeGreaterThan(0)
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('should handle model loading errors gracefully', async () => {
      const errorManager = new TranscriptionManager()
      await errorManager.init()

      // Mock worker to simulate loading error
      const originalPostMessage = errorManager.worker.postMessage
      errorManager.worker.postMessage = function(data) {
        setTimeout(() => {
          this.onmessage({
            data: {
              id: data.id,
              type: 'error',
              error: 'Simulated model loading error'
            }
          })
        }, 10)
      }

      await expect(errorManager.loadWhisperModel()).rejects.toThrow('Simulated model loading error')
      expect(errorManager.isReady()).toBe(false)

      errorManager.destroy()
    })

    it('should support different audio formats and languages', async () => {
      if (!manager || !manager.isReady()) {
        manager = new TranscriptionManager()
        await manager.init()
        await manager.loadWhisperModel()
      }

      const testCases = [
        { language: 'en', expectedLang: 'en' },
        { language: 'zh', expectedLang: 'zh' },
        { language: 'auto', expectedLang: expect.any(String) }
      ]

      for (const testCase of testCases) {
        const audioBuffer = new ArrayBuffer(16000 * 2 * 4) // 2 seconds of audio
        
        const result = await manager.transcribeAudio(audioBuffer, testCase.language)
        
        expect(result.text).toBeDefined()
        expect(result.language).toEqual(testCase.expectedLang)
      }
    })
  })

  describe('Performance and Resource Management', () => {
    it('should handle multiple concurrent transcriptions', async () => {
      if (!manager || !manager.isReady()) {
        manager = new TranscriptionManager()
        await manager.init()
        await manager.loadWhisperModel()
      }

      const audioBuffers = Array.from({ length: 3 }, () => new ArrayBuffer(8000 * 4)) // 0.5 seconds each
      
      // Start multiple transcriptions concurrently
      const promises = audioBuffers.map((buffer, index) => 
        manager.transcribeAudio(buffer, 'en').then(result => ({ index, result }))
      )

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      results.forEach(({ index, result }) => {
        expect(result.text).toBeDefined()
        expect(typeof index).toBe('number')
      })
    })

    it('should properly clean up resources', () => {
      const testManager = new TranscriptionManager()
      
      // Verify initial state
      expect(testManager.isReady()).toBe(false)
      expect(testManager.getLoadingProgress()).toBe(0)
      
      // Destroy should not throw even if not initialized
      expect(() => testManager.destroy()).not.toThrow()
      
      // Verify cleanup
      expect(testManager.worker).toBeNull()
      expect(testManager.isModelLoaded).toBe(false)
    })
  })

  describe('Error Recovery', () => {
    it('should recover from worker crashes', async () => {
      const recoveryManager = new TranscriptionManager()
      await recoveryManager.init()
      
      // Simulate worker crash
      recoveryManager.worker.onerror({ message: 'Worker crashed' })
      
      // Should be able to reinitialize
      await recoveryManager.initializeWorker()
      expect(recoveryManager.worker).toBeDefined()
      
      recoveryManager.destroy()
    })

    it('should handle invalid audio data gracefully', async () => {
      if (!manager || !manager.isReady()) {
        manager = new TranscriptionManager()
        await manager.init()
        await manager.loadWhisperModel()
      }

      // Test with invalid audio data
      const invalidData = new ArrayBuffer(0) // Empty buffer
      
      // Should not crash, but may return empty or error result
      const result = await manager.transcribeAudio(invalidData, 'en')
      expect(result).toBeDefined()
      // The exact behavior depends on the model implementation
    })
  })
})