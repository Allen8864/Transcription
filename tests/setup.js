// Test setup file for Vitest
import { vi } from 'vitest'

// Mock Web APIs that might not be available in test environment
global.MediaRecorder = vi.fn(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  state: 'inactive',
  mimeType: 'audio/webm',
  stream: null
}))

// Ensure navigator exists and has the required structure
if (!global.navigator) {
  global.navigator = {}
}

global.navigator.mediaDevices = {
  getUserMedia: vi.fn()
}

// Mock URL constructor and static methods
global.URL = class URL {
  constructor(url, base) {
    this.href = url
    this.origin = 'http://localhost'
    this.protocol = 'http:'
    this.host = 'localhost'
    this.pathname = url
  }
  
  static createObjectURL = vi.fn(() => 'blob:mock-url')
  static revokeObjectURL = vi.fn()
}

global.AudioContext = vi.fn(() => ({
  createAnalyser: vi.fn(),
  createScriptProcessor: vi.fn(),
  createMediaStreamSource: vi.fn(),
  close: vi.fn(),
  resume: vi.fn(),
  suspend: vi.fn(),
  state: 'running',
  sampleRate: 44100
}))

global.webkitAudioContext = global.AudioContext

// Mock File constructor for tests
global.File = class File {
  constructor(chunks, filename, options = {}) {
    this.name = filename
    this.type = options.type || ''
    this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    this.lastModified = Date.now()
  }
}

// Mock Blob constructor
global.Blob = class Blob {
  constructor(chunks = [], options = {}) {
    this.type = options.type || ''
    this.size = chunks.reduce(
      (acc, chunk) => acc + (chunk.length || chunk.size || 0),
      0
    )
  }
}

// Mock Worker constructor
global.Worker = vi.fn()

// Mock import.meta for ES modules
if (!global.import) {
  global.import = {}
}
if (!global.import.meta) {
  global.import.meta = {
    url: 'file:///test/mock.js'
  }
}
