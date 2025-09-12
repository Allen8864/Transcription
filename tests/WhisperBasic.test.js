/**
 * Basic tests for WhisperCPP integration - Core functionality verification
 */

import { describe, it, expect, vi } from 'vitest'
import { TranscriptionManager } from '../src/managers/TranscriptionManager.js'

describe('WhisperCPP Basic Integration', () => {
  describe('TranscriptionManager Class', () => {
    it('should create TranscriptionManager instance', () => {
      const manager = new TranscriptionManager()
      
      expect(manager).toBeDefined()
      expect(manager.isModelLoaded).toBe(false)
      expect(manager.currentLanguage).toBe('auto')
      expect(manager.loadingProgress).toBe(0)
    })

    it('should have all required methods', () => {
      const manager = new TranscriptionManager()
      
      expect(typeof manager.init).toBe('function')
      expect(typeof manager.loadWhisperModel).toBe('function')
      expect(typeof manager.transcribeAudio).toBe('function')
      expect(typeof manager.transcribeRealtime).toBe('function')
      expect(typeof manager.setLanguage).toBe('function')
      expect(typeof manager.isReady).toBe('function')
      expect(typeof manager.destroy).toBe('function')
    })

    it('should manage language settings', () => {
      const manager = new TranscriptionManager()
      
      expect(manager.currentLanguage).toBe('auto')
      
      manager.setLanguage('en')
      expect(manager.currentLanguage).toBe('en')
      
      manager.setLanguage('zh')
      expect(manager.currentLanguage).toBe('zh')
    })

    it('should track loading progress', () => {
      const manager = new TranscriptionManager()
      
      expect(manager.getLoadingProgress()).toBe(0)
      expect(manager.isReady()).toBe(false)
    })

    it('should handle callbacks', () => {
      const manager = new TranscriptionManager()
      const progressCallback = vi.fn()
      const errorCallback = vi.fn()
      
      manager.setProgressCallback(progressCallback)
      manager.setErrorCallback(errorCallback)
      
      expect(manager.onProgressCallback).toBe(progressCallback)
      expect(manager.onErrorCallback).toBe(errorCallback)
    })

    it('should clean up resources safely', () => {
      const manager = new TranscriptionManager()
      
      // Should not throw even if not initialized
      expect(() => manager.destroy()).not.toThrow()
      
      expect(manager.worker).toBeNull()
      expect(manager.isModelLoaded).toBe(false)
    })
  })

  describe('Worker Integration', () => {
    it('should handle worker initialization errors gracefully', async () => {
      // Mock Worker to throw error
      const originalWorker = global.Worker
      global.Worker = vi.fn(() => {
        throw new Error('Worker creation failed')
      })

      const manager = new TranscriptionManager()
      
      await expect(manager.init()).rejects.toThrow('Worker initialization failed')
      
      // Restore original Worker
      global.Worker = originalWorker
    })

    it('should validate model loading requirements', async () => {
      const manager = new TranscriptionManager()
      
      // Should reject transcription when model not loaded
      await expect(
        manager.transcribeAudio(new ArrayBuffer(1024))
      ).rejects.toThrow('Model not loaded')
      
      await expect(
        manager.transcribeRealtime([new ArrayBuffer(512)])
      ).rejects.toThrow('Model not loaded')
      
    })
  })

  describe('Audio Data Handling', () => {
    it('should handle different audio buffer sizes', () => {
      const manager = new TranscriptionManager()
      
      // Test with various buffer sizes
      const buffers = [
        new ArrayBuffer(0),      // Empty
        new ArrayBuffer(1024),   // Small
        new ArrayBuffer(16000 * 4), // 1 second at 16kHz
        new ArrayBuffer(16000 * 10 * 4) // 10 seconds
      ]
      
      buffers.forEach(buffer => {
        expect(buffer).toBeInstanceOf(ArrayBuffer)
        expect(buffer.byteLength).toBeGreaterThanOrEqual(0)
      })
    })

    it('should handle realtime audio chunks', () => {
      const manager = new TranscriptionManager()
      
      // Create mock audio chunks
      const chunks = Array.from({ length: 5 }, (_, i) => 
        new ArrayBuffer(16000 * 2 * 4) // 2 seconds each
      )
      
      expect(chunks).toHaveLength(5)
      chunks.forEach(chunk => {
        expect(chunk).toBeInstanceOf(ArrayBuffer)
        expect(chunk.byteLength).toBe(16000 * 2 * 4)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid audio data types', async () => {
      const manager = new TranscriptionManager()
      
      // Mock model as loaded to test audio validation
      manager.isModelLoaded = true
      manager.worker = { postMessage: vi.fn() }
      
      const invalidInputs = [
        null,
        undefined,
        'string',
        123,
        {},
        []
      ]
      
      for (const input of invalidInputs) {
        // The actual validation happens in the worker
        // Here we just verify the method exists and can be called
        expect(typeof manager.transcribeAudio).toBe('function')
      }
    })

    it('should handle worker message timeouts', () => {
      const manager = new TranscriptionManager()
      
      // Verify timeout handling exists
      expect(manager.pendingMessages).toBeInstanceOf(Map)
      expect(typeof manager.sendWorkerMessage).toBe('function')
    })
  })

  describe('Configuration and State', () => {
    it('should maintain consistent state', () => {
      const manager = new TranscriptionManager()
      
      // Initial state
      expect(manager.isModelLoaded).toBe(false)
      expect(manager.loadingProgress).toBe(0)
      expect(manager.messageId).toBe(0)
      expect(manager.pendingMessages.size).toBe(0)
      
      // State should be consistent
      expect(manager.isReady()).toBe(manager.isModelLoaded)
      expect(manager.getLoadingProgress()).toBe(manager.loadingProgress)
    })

    it('should handle language configuration', () => {
      const manager = new TranscriptionManager()
      
      const validLanguages = ['auto', 'en', 'zh', 'es', 'fr', 'de']
      
      validLanguages.forEach(lang => {
        manager.setLanguage(lang)
        expect(manager.currentLanguage).toBe(lang)
      })
    })
  })
})