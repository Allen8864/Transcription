import './style.css'
import { AudioManager } from './managers/AudioManager.js'
import { TranscriptionManager } from './managers/TranscriptionManager.js'
import { UIController } from './controllers/UIController.js'

// Application initialization
class App {
  constructor() {
    this.audioManager = new AudioManager()
    this.transcriptionManager = new TranscriptionManager()
    this.uiController = new UIController()

    this.init()
  }

  async init() {
    console.log('Initializing Whisper Web Transcription App...')

    // Initialize UI event listeners
    this.uiController.init()

    // Initialize managers
    await this.audioManager.init()
    await this.transcriptionManager.init()

    console.log('App initialized successfully')
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
  new App()
})
