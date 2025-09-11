import './style.css'
import { AudioManager } from './managers/AudioManager.js'
import { TranscriptionManager } from './managers/TranscriptionManager.js'
import { UIController } from './controllers/UIController.js'
import { I18nController } from './controllers/I18nController.js'
import { CustomSelect } from './components/CustomSelect.js'

// Application initialization
class App {
  constructor() {
    this.i18nController = new I18nController()
    this.audioManager = new AudioManager()
    this.transcriptionManager = new TranscriptionManager()
    this.uiController = new UIController(this.i18nController)

    // 自定义下拉框实例
    this.uiLanguageSelect = null
    this.transcriptionLanguageSelect = null

    // 连接组件
    this.connectComponents()

    this.init()
  }

  async init() {
    console.log('Initializing Whisper Web Transcription App...')

    // Initialize internationalization first
    this.initializeI18n()

    // Initialize UI event listeners
    this.uiController.init()

    // Initialize managers
    await this.audioManager.init()
    await this.transcriptionManager.init()

    // Start automatic model loading
    await this.startModelLoading()

    console.log('App initialized successfully')
  }

  initializeI18n() {
    // Initialize UI with current language
    this.i18nController.initializeUI()

    // Set up language selectors with a small delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeLanguageSelectors()
    }, 100)

    // Subscribe to language changes to update dynamic content
    this.i18nController.subscribe(_newLanguage => {
      // Update any dynamic content that might need refreshing
      this.updateDynamicContent()
      // 更新转录语言选择器的选项文本
      this.updateTranscriptionLanguageItems()
    })
  }

  initializeLanguageSelectors() {
    // 初始化界面语言选择器
    const uiLanguageContainer = document.getElementById('ui-language-select')
    if (uiLanguageContainer) {
      this.uiLanguageSelect = new CustomSelect(uiLanguageContainer, {
        items: [
          { value: 'en', text: 'English' },
          { value: 'zh', text: '中文' }
        ],
        value: this.i18nController.getCurrentLanguage(),
        placeholder: 'Select Language'
      })

      // 监听语言变化
      this.uiLanguageSelect.onChange(value => {
        this.i18nController.changeLanguage(value)
      })
    }

    // 初始化转录语言选择器
    const transcriptionLanguageContainer =
      document.getElementById('language-select')
    if (transcriptionLanguageContainer) {
      this.transcriptionLanguageSelect = new CustomSelect(
        transcriptionLanguageContainer,
        {
          items: this.getTranscriptionLanguageItems(),
          value: 'auto',
          placeholder: 'Select Language'
        }
      )

      // 可以在这里添加转录语言变化的处理逻辑
      this.transcriptionLanguageSelect.onChange(value => {
        console.log('Transcription language changed to:', value)
        // 这里可以添加转录语言变化的处理逻辑
      })
    }
  }

  // 获取转录语言选项（支持国际化）
  getTranscriptionLanguageItems() {
    return [
      { value: 'auto', text: this.i18nController.t('autoDetect') },
      { value: 'zh', text: this.i18nController.t('chinese') },
      { value: 'en', text: this.i18nController.t('english') }
    ]
  }

  // 更新转录语言选择器的选项文本
  updateTranscriptionLanguageItems() {
    if (this.transcriptionLanguageSelect) {
      const currentValue = this.transcriptionLanguageSelect.getValue()
      this.transcriptionLanguageSelect.setItems(
        this.getTranscriptionLanguageItems()
      )
      this.transcriptionLanguageSelect.setValue(currentValue)
    }
  }

  updateDynamicContent() {
    // This method can be used to update any dynamic content
    // that might not be covered by the standard UI update
    // For example, updating recording status text, file info, etc.
  }

  // 获取当前选择的转录语言
  getSelectedTranscriptionLanguage() {
    return this.transcriptionLanguageSelect
      ? this.transcriptionLanguageSelect.getValue()
      : 'auto'
  }

  // 设置转录语言
  setTranscriptionLanguage(language) {
    if (this.transcriptionLanguageSelect) {
      this.transcriptionLanguageSelect.setValue(language)
    }
  }

  // 连接各个组件
  connectComponents() {
    // 将AudioManager连接到UIController
    this.uiController.setAudioManager(this.audioManager)
    this.uiController.setTranscriptionManager(this.transcriptionManager)
  }

  // 开始模型加载流程
  async startModelLoading() {
    console.log('Starting automatic model loading...')
    
    // 显示模型加载界面，隐藏主要控制面板
    this.showModelLoadingUI()
    
    try {
      // 设置进度回调
      this.transcriptionManager.setProgressCallback((progress) => {
        this.updateModelLoadingProgress(progress)
      })

      // 加载Whisper模型
      await this.transcriptionManager.loadWhisperModel()
      
      // 模型加载完成，显示主界面
      this.hideModelLoadingUI()
      this.showMainControls()
      
      console.log('Model loading completed successfully')
    } catch (error) {
      console.error('Model loading failed:', error)
      this.handleModelLoadingError(error)
    }
  }

  // 显示模型加载界面
  showModelLoadingUI() {
    const modelLoadingTab = document.getElementById('model-loading-tab')
    const recordTab = document.getElementById('record-tab')
    const uploadTab = document.getElementById('upload-tab')
    
    // 显示模型加载tab，隐藏其他tabs
    if (modelLoadingTab) {
      modelLoadingTab.classList.add('active')
    }
    if (recordTab) {
      recordTab.classList.remove('active')
    }
    if (uploadTab) {
      uploadTab.classList.remove('active')
    }
    
    // 禁用tab按钮
    this.disableTabButtons()
  }

  // 隐藏模型加载界面
  hideModelLoadingUI() {
    const modelLoadingTab = document.getElementById('model-loading-tab')
    
    if (modelLoadingTab) {
      modelLoadingTab.classList.remove('active')
    }
  }

  // 显示主要控制面板
  showMainControls() {
    const recordTab = document.getElementById('record-tab')
    
    // 显示录音tab作为默认
    if (recordTab) {
      recordTab.classList.add('active')
    }
    
    // 启用tab按钮
    this.enableTabButtons()
  }

  // 禁用tab按钮
  disableTabButtons() {
    const tabButtons = document.querySelectorAll('.tab-button')
    tabButtons.forEach(button => {
      button.disabled = true
      button.style.opacity = '0.5'
      button.style.cursor = 'not-allowed'
    })
  }

  // 启用tab按钮
  enableTabButtons() {
    const tabButtons = document.querySelectorAll('.tab-button')
    tabButtons.forEach(button => {
      button.disabled = false
      button.style.opacity = ''
      button.style.cursor = ''
    })
  }

  // 更新模型加载进度
  updateModelLoadingProgress(progress) {
    const percentageElement = document.getElementById('model-loading-percentage')
    const progressFillElement = document.getElementById('model-progress-fill')
    
    if (percentageElement) {
      percentageElement.textContent = `${progress}%`
    }
    
    if (progressFillElement) {
      progressFillElement.style.width = `${progress}%`
    }
    
    console.log(`Model loading progress: ${progress}%`)
  }

  // 处理模型加载错误
  handleModelLoadingError(error) {
    console.error('Failed to load Whisper model:', error)
    
    // 更新UI显示错误信息
    const loadingText = document.querySelector('.model-loading-text')
    if (loadingText) {
      loadingText.textContent = 'Failed to load model. Please refresh the page.'
      loadingText.style.color = 'var(--error)'
    }
    
    // 可以选择显示重试按钮或其他错误处理UI
    // 这里暂时保持加载界面显示，让用户知道出现了问题
  }

  // 清理资源
  cleanup() {
    if (this.audioManager) {
      this.audioManager.cleanup()
    }
    console.log('App resources cleaned up')
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new App()

  // Make app instance available globally for UIController
  window.app = app

  // 页面卸载时清理资源
  window.addEventListener('beforeunload', () => {
    app.cleanup()
  })

  // 页面隐藏时也清理资源（移动端）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      app.cleanup()
    }
  })
})
