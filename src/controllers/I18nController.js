import { languages, defaultLanguage } from '../i18n/languages.js'

export class I18nController {
  constructor() {
    this.currentLanguage = this.getStoredLanguage() || defaultLanguage
    this.translations = languages[this.currentLanguage].translations
    this.observers = []
  }

  // Get stored language from localStorage
  getStoredLanguage() {
    const stored = localStorage.getItem('app-language')
    return stored && languages[stored] ? stored : null
  }

  // Store language preference
  storeLanguage(languageCode) {
    localStorage.setItem('app-language', languageCode)
  }

  // Get current language
  getCurrentLanguage() {
    return this.currentLanguage
  }

  // Get translation for a key
  t(key) {
    return this.translations[key] || key
  }

  // Change language
  changeLanguage(languageCode) {
    if (!languages[languageCode]) {
      console.warn(`Language ${languageCode} not found`)
      return
    }

    this.currentLanguage = languageCode
    this.translations = languages[languageCode].translations
    this.storeLanguage(languageCode)

    // Update HTML lang attribute
    document.documentElement.lang = languageCode === 'zh' ? 'zh-CN' : 'en'

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.content = this.t('subtitle')
    }

    // Update UI immediately
    this.updateUI()

    // Notify observers
    this.notifyObservers()
  }

  // Subscribe to language changes
  subscribe(callback) {
    this.observers.push(callback)
  }

  // Unsubscribe from language changes
  unsubscribe(callback) {
    this.observers = this.observers.filter(obs => obs !== callback)
  }

  // Notify all observers
  notifyObservers() {
    this.observers.forEach(callback => callback(this.currentLanguage))
  }

  // Initialize the UI with current language
  initializeUI() {
    // Set HTML lang attribute
    document.documentElement.lang =
      this.currentLanguage === 'zh' ? 'zh-CN' : 'en'

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.content = this.t('subtitle')
    }

    // Update all translatable elements
    this.updateUI()
  }

  // Update all UI elements with current translations
  updateUI() {
    // Update title
    document.title = this.t('title')

    // Update header
    const headerTitle = document.querySelector('.title-section h1')
    if (headerTitle) {
      headerTitle.textContent = this.t('title')
    }

    const headerSubtitle = document.querySelector('.subtitle')
    if (headerSubtitle) {
      headerSubtitle.textContent = this.t('subtitle')
    }

    // Update transcription language selector
    const transcriptionLangLabel = document.querySelector(
      '.language-selector label'
    )
    if (transcriptionLangLabel) {
      transcriptionLangLabel.textContent = this.t('transcriptionLanguageLabel')
    }

    // 注意：转录语言选择器现在使用自定义下拉框组件，选项文本由组件管理
    // 如果需要更新选项文本，应该通过App类的方法来更新

    // Update tabs
    const recordTab = document.querySelector('[data-tab="record"] .tab-label')
    if (recordTab) {
      recordTab.textContent = this.t('realTimeRecording')
    }

    const uploadTab = document.querySelector('[data-tab="upload"] .tab-label')
    if (uploadTab) {
      uploadTab.textContent = this.t('fileUpload')
    }

    // Update recording controls
    const recordButton = document.getElementById('record-button')
    if (recordButton) {
      recordButton.setAttribute('aria-label', this.t('startRecording'))
    }

    const recordText = document.querySelector('.record-text')
    if (recordText) {
      recordText.textContent = this.t('startRecording')
    }

    // Update upload area
    const uploadText = document.querySelector('.upload-text')
    if (uploadText) {
      uploadText.textContent = this.t('dragDropText')
    }

    const uploadHint = document.querySelector('.upload-hint')
    if (uploadHint) {
      uploadHint.textContent = this.t('supportedFormats')
    }

    const transcribeButton = document.getElementById('transcribe-button')
    if (transcribeButton) {
      transcribeButton.textContent = this.t('startTranscription')
    }

    const fileInput = document.getElementById('file-input')
    if (fileInput) {
      fileInput.setAttribute('aria-label', this.t('selectAudioFile'))
    }

    const uploadArea = document.getElementById('upload-area')
    if (uploadArea) {
      uploadArea.setAttribute('aria-label', this.t('selectAudioFile'))
    }

    // Update results section
    const resultsTitle = document.querySelector('.results-header h3')
    if (resultsTitle) {
      resultsTitle.textContent = this.t('transcriptionResults')
    }

    const copyButton = document.getElementById('copy-button')
    if (copyButton) {
      copyButton.textContent = this.t('copyText')
      copyButton.setAttribute('aria-label', this.t('copyTranscriptionText'))
    }

    const placeholder = document.querySelector('.placeholder-text')
    if (placeholder) {
      placeholder.textContent = this.t('resultsPlaceholder')
    }

    const loadingText = document.getElementById('loading-text')
    if (loadingText) {
      loadingText.textContent = this.t('processing')
    }

    const transcriptionResult = document.getElementById('transcription-result')
    if (transcriptionResult) {
      transcriptionResult.setAttribute(
        'aria-label',
        this.t('transcriptionContent')
      )
    }

    // Update footer
    const footerText = document.querySelector('.app-footer p')
    if (footerText) {
      footerText.textContent = this.t('privacyNote')
    }

    // Update aria labels
    const tabContainer = document.querySelector('.tab-container')
    if (tabContainer) {
      tabContainer.setAttribute('aria-label', this.t('functionSelection'))
    }
  }

  // Get available languages for the selector
  getAvailableLanguages() {
    return Object.values(languages)
  }
}
