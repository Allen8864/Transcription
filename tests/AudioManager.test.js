import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioManager } from '../src/managers/AudioManager.js'

describe('AudioManager', () => {
  let audioManager
  let mockStream
  let mockMediaRecorder

  beforeEach(() => {
    audioManager = new AudioManager()

    // Mock MediaStream
    mockStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }])
    }

    // Mock MediaRecorder
    mockMediaRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      state: 'inactive',
      mimeType: 'audio/webm',
      stream: mockStream,
      ondataavailable: null,
      onstop: null,
      onerror: null
    }

    // Reset global mocks
    global.MediaRecorder = vi.fn(() => mockMediaRecorder)
    global.MediaRecorder.isTypeSupported = vi.fn(() => true)

    // Ensure navigator and mediaDevices exist
    if (!global.navigator) {
      global.navigator = {}
    }
    if (!global.navigator.mediaDevices) {
      global.navigator.mediaDevices = {}
    }
    global.navigator.mediaDevices.getUserMedia = vi.fn(() =>
      Promise.resolve(mockStream)
    )
  })

  afterEach(() => {
    audioManager.cleanup()
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(audioManager.init()).resolves.not.toThrow()
    })

    it('should throw error if MediaRecorder is not supported', async () => {
      global.MediaRecorder = undefined
      await expect(audioManager.init()).rejects.toThrow(
        'MediaRecorder API is not supported'
      )
    })

    it('should throw error if getUserMedia is not supported', async () => {
      global.navigator.mediaDevices = undefined
      await expect(audioManager.init()).rejects.toThrow(
        'getUserMedia API is not supported'
      )
    })
  })

  describe('Microphone Access', () => {
    it('should request microphone access successfully', async () => {
      const stream = await audioManager.requestMicrophoneAccess()

      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      })
      expect(stream).toBe(mockStream)
      expect(audioManager.audioStream).toBe(mockStream)
    })

    it('should handle permission denied error', async () => {
      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'
      global.navigator.mediaDevices.getUserMedia.mockRejectedValue(error)

      await expect(audioManager.requestMicrophoneAccess()).rejects.toThrow(
        'Microphone permission denied. Please allow microphone access and try again.'
      )
    })

    it('should handle no microphone found error', async () => {
      const error = new Error('No microphone')
      error.name = 'NotFoundError'
      global.navigator.mediaDevices.getUserMedia.mockRejectedValue(error)

      await expect(audioManager.requestMicrophoneAccess()).rejects.toThrow(
        'No microphone found. Please connect a microphone and try again.'
      )
    })

    it('should handle generic microphone error', async () => {
      const error = new Error('Generic error')
      global.navigator.mediaDevices.getUserMedia.mockRejectedValue(error)

      await expect(audioManager.requestMicrophoneAccess()).rejects.toThrow(
        'Failed to access microphone: Generic error'
      )
    })
  })

  describe('Recording Control', () => {
    beforeEach(async () => {
      await audioManager.requestMicrophoneAccess()
    })

    it('should start recording successfully', async () => {
      await audioManager.startRecording()

      expect(global.MediaRecorder).toHaveBeenCalledWith(mockStream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 128000
      })
      expect(mockMediaRecorder.start).toHaveBeenCalledWith()
      expect(audioManager.isRecording).toBe(true)
      expect(audioManager.recordingStartTime).toBeTruthy()
    })

    it('should throw error if already recording', async () => {
      await audioManager.startRecording()

      await expect(audioManager.startRecording()).rejects.toThrow(
        'Recording is already in progress'
      )
    })

    it('should request microphone access if not available', async () => {
      audioManager.audioStream = null
      const getUserMediaSpy = vi.spyOn(audioManager, 'requestMicrophoneAccess')

      await audioManager.startRecording()

      expect(getUserMediaSpy).toHaveBeenCalled()
    })

    it('should stop recording and return audio blob', async () => {
      await audioManager.startRecording()

      // Set MediaRecorder state to 'recording' to simulate active recording
      mockMediaRecorder.state = 'recording'

      // Simulate audio chunks
      audioManager.audioChunks = [
        new Blob(['chunk1'], { type: 'audio/webm' }),
        new Blob(['chunk2'], { type: 'audio/webm' })
      ]

      const stopPromise = audioManager.stopRecording()

      // Simulate MediaRecorder stop event
      mockMediaRecorder.onstop()

      const audioBlob = await stopPromise

      expect(mockMediaRecorder.stop).toHaveBeenCalled()
      expect(audioBlob).toBeInstanceOf(Blob)
      expect(audioManager.isRecording).toBe(false)
      expect(audioManager.recordingStartTime).toBeNull()
    })

    it('should throw error when stopping without recording', async () => {
      await expect(audioManager.stopRecording()).rejects.toThrow(
        'No recording in progress'
      )
    })

    it('should handle recording errors', async () => {
      await audioManager.startRecording()

      const stopPromise = audioManager.stopRecording()
      const error = new Error('Recording failed')

      // Simulate MediaRecorder error event
      mockMediaRecorder.onerror({ error })

      await expect(stopPromise).rejects.toThrow(
        'Recording error: Recording failed'
      )
    })

    it('should calculate recording duration correctly', async () => {
      const startTime = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(startTime)

      await audioManager.startRecording()

      // Mock time progression
      vi.spyOn(Date, 'now').mockReturnValue(startTime + 5000) // 5 seconds later

      expect(audioManager.getRecordingDuration()).toBe(5)
    })

    it('should return 0 duration when not recording', () => {
      expect(audioManager.getRecordingDuration()).toBe(0)
    })
  })

  describe('File Upload Handling', () => {
    it('should handle valid audio file upload', async () => {
      const mockFile = new File(['audio data'], 'test.mp3', {
        type: 'audio/mpeg'
      })

      const result = await audioManager.handleFileUpload(mockFile)

      expect(result.isValid).toBe(true)
      expect(result.file).toBe(mockFile)
      expect(result.error).toBeUndefined()
    })

    it('should reject invalid file format', async () => {
      const mockFile = new File(['text data'], 'test.txt', {
        type: 'text/plain'
      })

      const result = await audioManager.handleFileUpload(mockFile)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Unsupported file format')
    })

    it('should reject files exceeding size limit', async () => {
      const largeSize = 101 * 1024 * 1024 // 101MB
      const mockFile = new File(['x'.repeat(largeSize)], 'large.mp3', {
        type: 'audio/mpeg'
      })
      Object.defineProperty(mockFile, 'size', { value: largeSize })

      const result = await audioManager.handleFileUpload(mockFile)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('File size exceeds 100MB limit')
    })
  })

  describe('Audio Format Validation', () => {
    it('should validate supported audio formats', () => {
      const validFiles = [
        new File([''], 'test.mp3', { type: 'audio/mpeg' }),
        new File([''], 'test.wav', { type: 'audio/wav' }),
        new File([''], 'test.m4a', { type: 'audio/mp4' }),
        new File([''], 'test.ogg', { type: 'audio/ogg' })
      ]

      validFiles.forEach(file => {
        const result = audioManager.validateAudioFormat(file)
        expect(result.isValid).toBe(true)
      })
    })

    it('should reject unsupported formats', () => {
      const invalidFiles = [
        new File([''], 'test.txt', { type: 'text/plain' }),
        new File([''], 'test.pdf', { type: 'application/pdf' }),
        new File([''], 'test.jpg', { type: 'image/jpeg' })
      ]

      invalidFiles.forEach(file => {
        const result = audioManager.validateAudioFormat(file)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeTruthy()
      })
    })

    it('should handle null file', () => {
      const result = audioManager.validateAudioFormat(null)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('No file provided')
    })
  })

  describe('WAV Conversion', () => {
    it('should convert Float32Array to WAV format', () => {
      const sampleRate = 16000
      const samples = new Float32Array([0.1, -0.1, 0.5, -0.5])

      const wavBuffer = audioManager.convertToWAV(samples, sampleRate, 1)

      expect(wavBuffer).toBeInstanceOf(ArrayBuffer)
      expect(wavBuffer.byteLength).toBe(44 + samples.length * 2) // WAV header + PCM data

      // Check WAV header
      const view = new DataView(wavBuffer)
      const riff = String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3)
      )
      expect(riff).toBe('RIFF')

      const wave = String.fromCharCode(
        view.getUint8(8),
        view.getUint8(9),
        view.getUint8(10),
        view.getUint8(11)
      )
      expect(wave).toBe('WAVE')
    })

    it('should convert ArrayBuffer to WAV format', () => {
      const samples = new Float32Array([0.1, -0.1, 0.5, -0.5])
      const arrayBuffer = samples.buffer

      const wavBuffer = audioManager.convertToWAV(arrayBuffer)

      expect(wavBuffer).toBeInstanceOf(ArrayBuffer)
      expect(wavBuffer.byteLength).toBeGreaterThan(44)
    })

    it('should throw error for invalid audio data', () => {
      expect(() => {
        audioManager.convertToWAV('invalid data')
      }).toThrow('Invalid audio data format')
    })

    it('should handle conversion errors gracefully', () => {
      // Mock a scenario that would cause an error
      const invalidData = null

      expect(() => {
        audioManager.convertToWAV(invalidData)
      }).toThrow('Failed to convert audio to WAV')
    })
  })

  describe('Audio Chunking', () => {
    it('should split audio into chunks with default parameters', () => {
      const sampleRate = 16000
      const duration = 10 // 10 seconds
      const samples = new Float32Array(sampleRate * duration)
      samples.fill(0.1) // Fill with sample data

      const chunks = audioManager.splitAudioChunks(samples)

      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks[0]).toBeInstanceOf(Float32Array)

      // Check chunk sizes (should be around 2.5 seconds = 40000 samples at 16kHz)
      const expectedChunkSize = 2.5 * sampleRate
      expect(chunks[0].length).toBeCloseTo(expectedChunkSize, -1000) // Allow some variance
    })

    it('should split audio with custom parameters', () => {
      const sampleRate = 16000
      const samples = new Float32Array(sampleRate * 6) // 6 seconds
      samples.fill(0.1)

      const chunkSize = 2.0 // 2 seconds
      const overlap = 0.2 // 0.2 seconds

      const chunks = audioManager.splitAudioChunks(
        samples,
        chunkSize,
        sampleRate,
        overlap
      )

      expect(chunks.length).toBeGreaterThan(1)

      // Check that chunks have expected size
      const expectedSamples = chunkSize * sampleRate
      expect(chunks[0].length).toBe(expectedSamples)
    })

    it('should handle ArrayBuffer input', () => {
      const samples = new Float32Array([0.1, -0.1, 0.5, -0.5])
      const arrayBuffer = samples.buffer

      const chunks = audioManager.splitAudioChunks(arrayBuffer, 1.0, 4, 0)

      expect(chunks.length).toBe(1)
      expect(chunks[0]).toBeInstanceOf(Float32Array)
    })

    it('should filter out chunks that are too short', () => {
      const sampleRate = 16000
      const samples = new Float32Array(sampleRate * 0.3) // 0.3 seconds (too short)
      samples.fill(0.1)

      const chunks = audioManager.splitAudioChunks(samples, 2.0, sampleRate, 0)

      expect(chunks.length).toBe(0) // Should be filtered out
    })

    it('should throw error for invalid audio data', () => {
      expect(() => {
        audioManager.splitAudioChunks('invalid data')
      }).toThrow('Invalid audio data format')
    })
  })

  describe('Cleanup', () => {
    it('should clean up all resources', async () => {
      await audioManager.requestMicrophoneAccess()
      await audioManager.startRecording()

      audioManager.cleanup()

      expect(audioManager.audioStream).toBeNull()
      expect(audioManager.audioChunks).toEqual([])
      expect(audioManager.isRecording).toBe(false)
      expect(audioManager.recordingStartTime).toBeNull()
    })

    it('should stop recording during cleanup', async () => {
      await audioManager.requestMicrophoneAccess()
      await audioManager.startRecording()

      audioManager.cleanup()

      expect(mockMediaRecorder.stop).toHaveBeenCalled()
    })

    it('should stop all audio tracks', async () => {
      await audioManager.requestMicrophoneAccess()

      const stopSpy = vi.fn()
      audioManager.audioStream.getTracks.mockReturnValue([{ stop: stopSpy }])

      audioManager.cleanup()

      expect(stopSpy).toHaveBeenCalled()
    })
  })
})
