/**
 * UIController - Handles all user interface interactions and updates
 */
export class UIController {
  constructor(i18nController = null) {
    this.elements = {}
    this.currentTab = 'record'
    this.i18n = i18nController
  }

  init() {
    this.initializeElements()
    this.setupEventListeners()
    console.log('UIController initialized')
  }

  initializeElements() {
    // Cache DOM elements for better performance
    this.elements = {
      // Tab system
      tabButtons: document.querySelectorAll('.tab-button'),
      tabContents: document.querySelectorAll('.tab-content'),

      // Language selector
      languageSelect: document.getElementById('language-select'),

      // Recording controls
      recordButton: document.getElementById('record-button'),
      recordingStatus: document.getElementById('recording-status'),
      recordingDuration: document.getElementById('recording-duration'),

      // File upload
      uploadArea: document.getElementById('upload-area'),
      fileInput: document.getElementById('file-input'),
      fileInfo: document.getElementById('file-info'),
      fileName: document.getElementById('file-name'),
      fileDetails: document.getElementById('file-details'),
      transcribeButton: document.getElementById('transcribe-button'),

      // Transcription results
      transcriptionResult: document.getElementById('transcription-result'),
      copyButton: document.getElementById('copy-button'),
      loadingIndicator: document.getElementById('loading-indicator'),
      loadingText: document.getElementById('loading-text')
    }
  }

  setupEventListeners() {
    // Tab switching
    this.elements.tabButtons.forEach(button => {
      button.addEventListener('click', e => {
        this.switchTab(e.target.dataset.tab)
      })
    })

    // Language selection - 注意：现在语言选择器由main.js中的App类管理
    // 这里不再需要直接监听change事件，因为使用了自定义下拉框组件

    // Recording controls
    this.elements.recordButton.addEventListener('click', () => {
      this.onRecordButtonClick()
    })

    // File upload
    this.elements.uploadArea.addEventListener('click', () => {
      this.elements.fileInput.click()
    })

    this.elements.uploadArea.addEventListener('dragover', e => {
      e.preventDefault()
      this.elements.uploadArea.classList.add('dragover')
    })

    this.elements.uploadArea.addEventListener('dragleave', () => {
      this.elements.uploadArea.classList.remove('dragover')
    })

    this.elements.uploadArea.addEventListener('drop', e => {
      e.preventDefault()
      this.elements.uploadArea.classList.remove('dragover')
      this.onFileUpload(e.dataTransfer.files[0])
    })

    this.elements.fileInput.addEventListener('change', e => {
      this.onFileUpload(e.target.files[0])
    })

    this.elements.transcribeButton.addEventListener('click', () => {
      this.onTranscribeButtonClick()
    })

    // Copy button
    this.elements.copyButton.addEventListener('click', () => {
      this.copyTranscriptionResult()
    })
  }

  switchTab(tabName) {
    // Update tab buttons
    this.elements.tabButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.tab === tabName)
    })

    // Update tab contents
    this.elements.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`)
    })

    this.currentTab = tabName
  }

  // Placeholder methods - will be implemented in task 9
  onLanguageChange(language) {
    console.log('Language changed to:', language)
    // Will be implemented in later tasks
  }

  onRecordButtonClick() {
    console.log('Record button clicked')
    // Will be implemented in later tasks
  }

  onFileUpload(file) {
    console.log('File uploaded:', file?.name)
    // Will be implemented in later tasks
  }

  onTranscribeButtonClick() {
    console.log('Transcribe button clicked')
    // Will be implemented in later tasks
  }

  updateRecordingStatus(isRecording, duration) {
    // Will be implemented in task 9
    console.log('Recording status:', isRecording, duration)
  }

  showRecordingIndicator() {
    // Will be implemented in task 9
    console.log('Show recording indicator')
  }

  displayTranscriptionResult(text, isPartial) {
    // Will be implemented in task 9
    console.log('Display transcription result:', text, isPartial)
  }

  updateRealtimeText(newText) {
    // Will be implemented in task 9
    console.log('Update realtime text:', newText)
  }

  showLoadingState() {
    this.elements.loadingIndicator.classList.remove('hidden')
  }

  hideLoadingState() {
    this.elements.loadingIndicator.classList.add('hidden')
  }

  showErrorMessage(error) {
    console.error('Error:', error)
    // Will be implemented in task 10
  }

  copyTranscriptionResult() {
    const text = this.elements.transcriptionResult.textContent
    const placeholderText = this.i18n ? this.i18n.t('resultsPlaceholder') : 'Transcription results will appear here...'

    if (text && text !== placeholderText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          // Show success feedback
          const originalText = this.elements.copyButton.textContent
          const copiedText = this.i18n ? this.i18n.t('copied') : 'Copied!'

          this.elements.copyButton.textContent = copiedText
          setTimeout(() => {
            this.elements.copyButton.textContent = originalText
          }, 2000)
        })
        .catch(err => {
          console.error('Failed to copy text:', err)
        })
    }
  }
}
