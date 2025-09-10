/**
 * Tests for TranscriptionManager - WhisperCPP WebAssembly integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TranscriptionManager } from '../src/managers/TranscriptionManager.js'

// Mock Web Worker
class MockWorker {
  constructor() {
    this.onmessage = null
    this.onerror = null
    this.messageHandlers = new Map()
  }

  postMessage(data) {
    // Simulate async worker response
    setTimeout(() => {
      this.handleMessage(data)
    }, 10)
  }

  handleMessage(data) {
    const { id, type } = data

    switch (type) {
      case 'init':
        // Simulate model loading with progress
        this.simulateProgress(id, 100)
        setTimeout(() => {
          // Send final progress update
          this.onmessage({
            data: {
              type: 'progress',
              data: { progress: 100 }
            }
          })
          // Then send success
          this.onmessage({
            data: {
              id,
              type: 'success',
              data: {
                success: true,
                modelName: 'whisper-tiny',
                isQuantized: true
              }
            }
          })
        }, 120)
        break

      case 'transcribe':
        // Simulate transcription
        setTimeout(() => {
          const isRealtime = data.options && data.options.isRealtime
          this.onmessage({
            data: {
              id,
              type: 'success',
              data: {
                text: 'Hello, this is a test transcription.',
                confidence: 0.95,
                language: 'en',
                isPartial: isRealtime || false,
                timestamp: Date.now(),
                chunkIndex: data.options ? data.options.chunkIndex : 0
              }
            }
          })
        }, 50)
        break

      case 'status':
        this.onmessage({
          data: {
            id,
            type: 'success',
            data: {
              isInitialized: true,
              loadingProgress: 100,
              modelName: 'whisper-tiny'
            }
          }
        })
        break

      default:
        this.onmessage({
          data: {
            id,
            type: 'error',
            error: `Unknown message type: ${type}`
          }
        })
    }
  }

  simulateProgress(id, targetProgress) {
    let progress = 0
    const interval = setInterval(() => {
      progress += 20
      if (this.onmessage) {
        this.onmessage({
          data: {
            type: 'progress',
            data: { progress: Math.min(progress, targetProgress) }
          }
        })
      }
      if (progress >= targetProgress) {
        clearInterval(interval)
      }
    }, 20)
  }

  terminate() {
    // Mock terminate
  }
}

// Mock Worker constructor
global.Worker = vi.fn().mockImplementation(() => new MockWorker())

describe('TranscriptionManager - WhisperCPP Integration', () => {
  let manager

  beforeEach(async () => {
    manager = new TranscriptionManager()
    await manager.init()
  })

  afterEach(() => {
    if (manager) {
      manager.destroy()
    }
  })

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(manager).toBeDefined()
      expect(manager.worker).toBeDefined()
      expect(manager.isModelLoaded).toBe(false)
    })

    it('should create Web Worker with correct URL', () => {
      expect(global.Worker).toHaveBeenCalled()
    })
  })

  describe('Model Loading', () => {
    it('should load Whisper model successfully', async () => {
      const progressCallback = vi.fn()
      manager.setProgressCallback(progressCallback)

      const result = await manager.loadWhisperModel()

      expect(result).toEqual({
        success: true,
        modelName: 'whisper-tiny',
        isQuantized: true
      })
      expect(manager.isModelLoaded).toBe(true)
      expect(manager.getLoadingProgress()).toBe(100)
      expect(progressCallback).toHaveBeenCalled()
    })

    it('should handle model loading errors', async () => {
      // Mock worker to return error
      manager.worker.handleMessage = (data) => {
        setTimeout(() => {
          manager.worker.onmessage({
            data: {
              id: data.id,
              type: 'error',
              error: 'Model loading failed'
            }
          })
        }, 10)
      }

      await expect(manager.loadWhisperModel()).rejects.toThrow('Model loading failed')
      expect(manager.isModelLoaded).toBe(false)
    })

    it('should track loading progress', async () => {
      const progressUpdates = []
      manager.setProgressCallback((progress) => {
        progressUpdates.push(progress)
      })

      await manager.loadWhisperModel()

      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100)
    })
  })

  describe('Audio Transcription', () => {
    beforeEach(async () => {
      await manager.loadWhisperModel()
    })

    it('should transcribe audio data successfully', async () => {
      const mockAudioData = new ArrayBuffer(1024)
      
      const result = await manager.transcribeAudio(mockAudioData, 'en')

      expect(result).toEqual({
        text: 'Hello, this is a test transcription.',
        confidence: 0.95,
        language: 'en',
        isPartial: false,
        timestamp: expect.any(Number),
        chunkIndex: 0
      })
    })

    it('should handle transcription without language specified', async () => {
      const mockAudioData = new ArrayBuffer(1024)
      
      const result = await manager.transcribeAudio(mockAudioData)

      expect(result.text).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should reject transcription when model not loaded', async () => {
      const unloadedManager = new TranscriptionManager()
      await unloadedManager.init()
      
      const mockAudioData = new ArrayBuffer(1024)

      await expect(
        unloadedManager.transcribeAudio(mockAudioData)
      ).rejects.toThrow('Model not loaded')

      unloadedManager.destroy()
    })
  })

  describe('Realtime Transcription', () => {
    beforeEach(async () => {
      await manager.loadWhisperModel()
    })

    it('should process multiple audio chunks', async () => {
      const audioChunks = [
        new ArrayBuffer(512),
        new ArrayBuffer(512),
        new ArrayBuffer(512)
      ]

      const results = await manager.transcribeRealtime(audioChunks)

      expect(results).toHaveLength(3)
      results.forEach((result, index) => {
        expect(result.text).toBeDefined()
        expect(result.isPartial).toBe(true)
        expect(result.chunkIndex).toBe(index)
      })
    })

    it('should handle empty audio chunks array', async () => {
      const results = await manager.transcribeRealtime([])
      expect(results).toHaveLength(0)
    })
  })

  describe('Language Detection', () => {
    beforeEach(async () => {
      await manager.loadWhisperModel()
    })

    it('should detect language from audio data', async () => {
      const mockAudioData = new ArrayBuffer(1024)
      
      const language = await manager.detectLanguage(mockAudioData)

      expect(language).toBe('en')
    })

    it('should handle language detection errors gracefully', async () => {
      // Mock worker to return error for language detection
      const originalHandler = manager.worker.handleMessage
      manager.worker.handleMessage = (data) => {
        if (data.type === 'transcribe') {
          setTimeout(() => {
            manager.worker.onmessage({
              data: {
                id: data.id,
                type: 'error',
                error: 'Language detection failed'
              }
            })
          }, 10)
        } else {
          originalHandler.call(manager.worker, data)
        }
      }

      const mockAudioData = new ArrayBuffer(1024)
      const language = await manager.detectLanguage(mockAudioData)

      expect(language).toBe('unknown')
    })
  })

  describe('Language Management', () => {
    it('should set and get current language', () => {
      expect(manager.currentLanguage).toBe('auto')
      
      manager.setLanguage('zh')
      expect(manager.currentLanguage).toBe('zh')
      
      manager.setLanguage('en')
      expect(manager.currentLanguage).toBe('en')
    })
  })

  describe('Error Handling', () => {
    it('should handle worker errors', async () => {
      const errorCallback = vi.fn()
      manager.setErrorCallback(errorCallback)

      // Simulate worker error
      manager.worker.onerror({ message: 'Worker crashed' })

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Worker error')
        })
      )
    })

    it('should handle message timeout', async () => {
      // Mock worker that doesn't respond
      manager.worker.postMessage = vi.fn()

      vi.useFakeTimers()
      
      const promise = manager.sendWorkerMessage('test')

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(61000)

      await expect(promise).rejects.toThrow('Worker message timeout')

      vi.useRealTimers()
    }, 10000)
  })

  describe('Resource Management', () => {
    it('should clean up resources on destroy', () => {
      const terminateSpy = vi.spyOn(manager.worker, 'terminate')
      
      manager.destroy()

      expect(terminateSpy).toHaveBeenCalled()
      expect(manager.worker).toBeNull()
      expect(manager.isModelLoaded).toBe(false)
      expect(manager.pendingMessages.size).toBe(0)
    })

    it('should check if manager is ready', async () => {
      expect(manager.isReady()).toBe(false)
      
      await manager.loadWhisperModel()
      
      expect(manager.isReady()).toBe(true)
    }, 10000)
  })
})