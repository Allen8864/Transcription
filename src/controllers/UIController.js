/**
 * UIController - Handles all user interface interactions and updates
 */
export class UIController {
  constructor(i18nController = null) {
    this.elements = {}
    this.currentTab = 'record'
    this.i18n = i18nController
    this.audioManager = null
    this.transcriptionManager = null
    this.isRecording = false
    this.recordingTimer = null

    // Audio player state
    this.currentAudio = null
    this.isPlaying = false
    this.currentAudioBlob = null
    this.audioDuration = 0
    this.isMuted = false
    this.previousVolume = 1
    this.recordingStartTime = null
    this.recordingEndTime = null

    // File upload state
    this.currentUploadedFile = null
    this.isVideoFile = false

    // Upload audio player state
    this.uploadAudio = null
    this.isUploadPlaying = false
    this.uploadAudioDuration = 0
    this.isUploadMuted = false
    this.uploadPreviousVolume = 1
  }

  // 设置AudioManager引用
  setAudioManager(audioManager) {
    this.audioManager = audioManager
  }

  // 设置TranscriptionManager引用
  setTranscriptionManager(transcriptionManager) {
    this.transcriptionManager = transcriptionManager
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

      // Audio player controls
      audioPlayer: document.getElementById('audio-player'),
      playButton: document.getElementById('play-button'),
      progressFill: document.getElementById('progress-fill'),
      progressSlider: document.getElementById('progress-slider'),
      audioTime: document.getElementById('audio-time'),
      downloadButton: document.getElementById('download-button'),
      closePlayerButton: document.getElementById('close-player-button'),
      volumeButton: document.getElementById('volume-button'),
      volumeSlider: document.getElementById('volume-slider'),

      // File upload
      uploadArea: document.getElementById('upload-area'),
      fileInput: document.getElementById('file-input'),
      fileInfo: document.getElementById('file-info'),
      fileName: document.getElementById('file-name'),
      fileDetails: document.getElementById('file-details'),
      transcribeButton: document.getElementById('transcribe-button'),
      cancelFileButton: document.getElementById('cancel-file-button'),

      // Upload audio player controls
      uploadAudioPlayer: document.getElementById('upload-audio-player'),
      uploadPlayButton: document.getElementById('upload-play-button'),
      uploadProgressFill: document.getElementById('upload-progress-fill'),
      uploadProgressSlider: document.getElementById('upload-progress-slider'),
      uploadAudioTime: document.getElementById('upload-audio-time'),
      uploadVolumeButton: document.getElementById('upload-volume-button'),
      uploadVolumeSlider: document.getElementById('upload-volume-slider'),

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
        // 点击后失焦
        e.target.blur()
      })
    })

    // Language selection - 注意：现在语言选择器由main.js中的App类管理
    // 这里不再需要直接监听change事件，因为使用了自定义下拉框组件

    // Recording controls
    this.elements.recordButton.addEventListener('click', e => {
      // 立即失焦，避免按钮保持焦点状态
      e.target.blur()
      this.onRecordButtonClick(e.target)
    })

    // Audio player controls
    this.elements.playButton.addEventListener('click', e => {
      // 立即失焦，避免按钮保持焦点状态
      e.target.blur()
      this.onPlayButtonClick()
    })

    this.elements.progressSlider.addEventListener('input', e => {
      this.onProgressChange(e.target.value)
    })

    // 进度滑块失焦处理
    this.elements.progressSlider.addEventListener('change', e => {
      e.target.blur()
    })

    this.elements.progressSlider.addEventListener('mouseup', e => {
      e.target.blur()
    })

    // Keyboard shortcuts for audio player
    document.addEventListener('keydown', e => {
      if (
        this.currentAudio &&
        !this.elements.audioPlayer.classList.contains('hidden')
      ) {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
          e.preventDefault()
          this.onPlayButtonClick()
        }
      }
    })

    this.elements.downloadButton.addEventListener('click', e => {
      e.target.blur()
      this.onDownloadButtonClick()
    })

    this.elements.closePlayerButton.addEventListener('click', e => {
      e.target.blur()
      this.onClosePlayerButtonClick()
    })

    this.elements.volumeSlider.addEventListener('input', e => {
      this.onVolumeChange(e.target.value)
    })

    // 音量滑块失焦处理
    this.elements.volumeSlider.addEventListener('change', e => {
      e.target.blur()
    })

    this.elements.volumeSlider.addEventListener('mouseup', e => {
      e.target.blur()
    })

    this.elements.volumeButton.addEventListener('click', e => {
      e.target.blur()
      this.onVolumeButtonClick()
    })

    // File upload
    this.elements.uploadArea.addEventListener('click', e => {
      e.target.blur()
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

    this.elements.transcribeButton.addEventListener('click', e => {
      e.target.blur()
      this.onTranscribeButtonClick()
    })

    // Cancel file button (the X button in file info header)
    this.elements.cancelFileButton.addEventListener('click', e => {
      e.target.blur()
      this.clearFileInfo()
    })

    // Copy button
    this.elements.copyButton.addEventListener('click', e => {
      e.target.blur()
      this.copyTranscriptionResult()
    })

    // Upload audio player controls
    this.elements.uploadPlayButton.addEventListener('click', e => {
      e.target.blur()
      this.onUploadPlayButtonClick()
    })

    this.elements.uploadProgressSlider.addEventListener('input', e => {
      this.onUploadProgressChange(e.target.value)
    })

    this.elements.uploadProgressSlider.addEventListener('change', e => {
      e.target.blur()
    })

    this.elements.uploadProgressSlider.addEventListener('mouseup', e => {
      e.target.blur()
    })

    this.elements.uploadVolumeSlider.addEventListener('input', e => {
      this.onUploadVolumeChange(e.target.value)
    })

    this.elements.uploadVolumeSlider.addEventListener('change', e => {
      e.target.blur()
    })

    this.elements.uploadVolumeSlider.addEventListener('mouseup', e => {
      e.target.blur()
    })

    this.elements.uploadVolumeButton.addEventListener('click', e => {
      e.target.blur()
      this.onUploadVolumeButtonClick()
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

    // Clean up when switching away from upload tab
    if (this.currentTab === 'upload' && tabName !== 'upload') {
      this.clearFileInfo()
    }

    // Hide audio player when switching to upload tab
    if (
      tabName === 'upload' &&
      !this.elements.audioPlayer.classList.contains('hidden')
    ) {
      this.hideAudioPlayer()
    }

    this.currentTab = tabName
  }

  // Placeholder methods - will be implemented in task 9
  onLanguageChange(language) {
    console.log('Language changed to:', language)
    // Will be implemented in later tasks
  }

  async onRecordButtonClick(_buttonElement) {
    if (!this.audioManager) {
      console.error('AudioManager not available')
      this.showErrorMessage('Audio manager not initialized')

      return
    }

    try {
      if (!this.isRecording) {
        // 隐藏音频播放器（如果存在）
        this.hideAudioPlayer()

        // 开始录音
        console.log('Starting recording...')
        this.recordingStartTime = Date.now()
        await this.audioManager.startRecording()
        this.isRecording = true
        this.updateRecordingUI(true)
        this.startRecordingTimer()
      } else {
        // 停止录音
        console.log('Stopping recording...')
        // Get the actual recording duration from AudioManager before stopping
        const actualDuration = this.audioManager.getRecordingDuration()
        this.recordingEndTime = Date.now()

        const audioBlob = await this.audioManager.stopRecording()
        this.isRecording = false
        this.updateRecordingUI(false)
        this.stopRecordingTimer()

        console.log('Recording completed:', {
          blobSize: audioBlob.size,
          actualDuration: actualDuration,
          calculatedDuration: this.getRecordingDuration()
        })

        // 显示音频播放器，传递实际录音时长
        this.showAudioPlayer(audioBlob, actualDuration)

        // 自动开始转录录音
        await this.transcribeRecording(audioBlob)
      }
    } catch (error) {
      console.error('Recording error:', error)
      this.showErrorMessage(error.message)
      this.isRecording = false
      this.updateRecordingUI(false)
      this.stopRecordingTimer()
    }
  }

  async onFileUpload(file) {
    if (!file) {
      console.warn('No file provided')
      return
    }

    console.log('File uploaded:', file.name)

    try {
      // Validate the file using AudioManager
      if (!this.audioManager) {
        throw new Error('Audio manager not available')
      }

      const validation = await this.audioManager.handleFileUpload(file)

      if (!validation.isValid) {
        this.showErrorMessage(validation.error)
        this.clearFileInfo()
        return
      }

      // Store whether this is a video file
      this.isVideoFile = validation.isVideo

      // Display file information
      await this.displayFileInfo(file, validation.isVideo)
    } catch (error) {
      console.error('File upload error:', error)
      this.showErrorMessage(error.message)
      this.clearFileInfo()
    }
  }

  /**
   * 转录录音音频
   * @param {Blob} audioBlob - 录音音频数据
   */
  async transcribeRecording(audioBlob) {
    if (!this.transcriptionManager) {
      console.error('TranscriptionManager not available')
      this.showErrorMessage('Transcription service not available')
      return
    }

    try {
      console.log('Starting recording transcription...')
      
      // 显示转录状态
      this.showTranscriptionStatus('正在转录录音...')
      
      // 获取选择的语言
      const language = this.getSelectedLanguage()
      
      // 开始转录
      const result = await this.transcriptionManager.transcribeFile(audioBlob, language)
      
      // 显示转录结果
      this.displayTranscriptionResult(result.text, false)
      this.elements.copyButton.classList.remove('hidden')
      
      // 隐藏转录状态
      this.hideTranscriptionStatus()
      
      console.log('Recording transcription completed')
    } catch (error) {
      console.error('Recording transcription error:', error)
      this.showErrorMessage(`转录失败: ${error.message}`)
      this.hideTranscriptionStatus()
    }
  }

  async onTranscribeButtonClick() {
    console.log('Transcribe button clicked')

    if (!this.currentUploadedFile) {
      this.showErrorMessage('No file selected for transcription')
      return
    }

    if (!this.transcriptionManager || !this.audioManager) {
      this.showErrorMessage('Required managers not available')
      return
    }

    try {
      // Show loading state
      this.showLoadingState()
      this.elements.transcribeButton.disabled = true

      let fileToTranscribe = this.currentUploadedFile

      // If it's a video file, extract audio first
      if (this.isVideoFile) {
        this.elements.transcribeButton.textContent = 'Extracting Audio...'
        this.elements.loadingText.textContent = 'Extracting audio from video...'

        console.log('Extracting audio from video file...')
        fileToTranscribe = await this.audioManager.extractAudioFromVideo(
          this.currentUploadedFile
        )
        console.log(
          'Audio extraction completed, blob size:',
          fileToTranscribe.size
        )
      }

      // Update loading text for transcription
      this.elements.transcribeButton.textContent = 'Transcribing...'
      this.elements.loadingText.textContent = 'Processing transcription...'

      // Get selected language
      const language = this.getSelectedLanguage()

      // Start transcription
      const result = await this.transcriptionManager.transcribeFile(
        fileToTranscribe,
        language
      )

      // Display result
      this.displayTranscriptionResult(result.text, false)
      this.elements.copyButton.classList.remove('hidden')
    } catch (error) {
      console.error('Transcription error:', error)
      this.showErrorMessage(error.message)
    } finally {
      // Hide loading state
      this.hideLoadingState()
      this.elements.transcribeButton.disabled = false

      this.elements.transcribeButton.textContent = this.i18n ? this.i18n.t('startTranscription') : 'Start Transcription'

      // Reset loading text
      this.elements.loadingText.textContent = 'Processing...'
    }
  }

  updateRecordingStatus(isRecording, duration) {
    if (isRecording) {
      this.elements.recordingStatus.classList.remove('hidden')
      if (duration !== undefined) {
        this.updateRecordingDuration(duration)
      }
    } else {
      this.elements.recordingStatus.classList.add('hidden')
    }
  }

  updateRecordingDuration(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    this.elements.recordingDuration.textContent = formattedTime
  }

  updateRecordingUI(isRecording) {
    const recordButton = this.elements.recordButton
    const recordText = recordButton.parentElement.querySelector('.record-text')

    if (isRecording) {
      recordButton.classList.add('recording')
      recordButton.setAttribute('aria-label', 'Stop Recording')
      // 录音时隐藏文字，只显示计时器
      if (recordText) {
        recordText.style.display = 'none'
      }
      this.updateRecordingStatus(true)
    } else {
      recordButton.classList.remove('recording')
      recordButton.setAttribute('aria-label', 'Start Recording')
      // 停止录音时显示文字
      if (recordText) {
        recordText.style.display = 'block'
        recordText.textContent = this.i18n
          ? this.i18n.t('startRecording')
          : 'Start Recording'
      }
      this.updateRecordingStatus(false)
    }
  }

  startRecordingTimer() {
    let seconds = 0
    this.recordingTimer = setInterval(() => {
      seconds++
      this.updateRecordingDuration(seconds)
    }, 1000)
  }

  stopRecordingTimer() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer)
      this.recordingTimer = null
    }
  }

  showRecordingIndicator() {
    this.elements.recordingStatus.classList.remove('hidden')
  }

  displayTranscriptionResult(text, isPartial = false) {
    if (!text) {
      console.warn('No text provided for transcription result')
      return
    }

    const resultElement = this.elements.transcriptionResult
    const placeholderElement = resultElement.querySelector('.placeholder-text')

    // Remove placeholder if it exists
    if (placeholderElement) {
      placeholderElement.remove()
    }

    if (isPartial) {
      // For partial results, append or update the last line
      const existingText = resultElement.textContent || ''
      const lines = existingText.split('\n')

      if (lines.length > 0 && lines[lines.length - 1].startsWith('[Partial]')) {
        // Update the last partial line
        lines[lines.length - 1] = `[Partial] ${text}`
      } else {
        // Add new partial line
        lines.push(`[Partial] ${text}`)
      }

      resultElement.textContent = lines.join('\n')
    } else {
      // For final results, replace any partial text with final text
      const existingText = resultElement.textContent || ''
      const lines = existingText
        .split('\n')
        .filter(line => !line.startsWith('[Partial]'))

      if (lines.length > 0 && lines[0] !== '') {
        lines.push('') // Add empty line separator
      }
      lines.push(text)

      resultElement.textContent = lines.join('\n')
    }

    // Scroll to bottom
    resultElement.scrollTop = resultElement.scrollHeight

    // Show copy button for final results
    if (!isPartial) {
      this.elements.copyButton.classList.remove('hidden')
    }

    console.log('Transcription result displayed:', { text, isPartial })
  }

  // Removed updateRealtimeText method (no longer needed without real-time transcription)

  showLoadingState() {
    this.elements.loadingIndicator.classList.remove('hidden')
  }

  hideLoadingState() {
    this.elements.loadingIndicator.classList.add('hidden')
  }

  showErrorMessage(error) {
    console.error('Error:', error)

    // 简单的错误提示实现
    const errorMessage =
      typeof error === 'string' ? error : error.message || 'An error occurred'

    // 创建临时错误提示
    const errorDiv = document.createElement('div')
    errorDiv.className = 'error-message'
    errorDiv.textContent = errorMessage
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      z-index: 1000;
      max-width: 300px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `

    document.body.appendChild(errorDiv)

    // 3秒后自动移除
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv)
      }
    }, 3000)
  }

  /**
   * 显示转录状态
   * @param {string} message - 状态消息
   */
  showTranscriptionStatus(message) {
    // 移除现有的状态提示
    this.hideTranscriptionStatus()
    
    // 创建状态提示
    const statusDiv = document.createElement('div')
    statusDiv.className = 'transcription-status'
    statusDiv.textContent = message
    statusDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #007bff;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      font-size: 14px;
    `
    
    document.body.appendChild(statusDiv)
  }

  /**
   * 隐藏转录状态
   */
  hideTranscriptionStatus() {
    const existingStatus = document.querySelector('.transcription-status')
    if (existingStatus && existingStatus.parentNode) {
      existingStatus.parentNode.removeChild(existingStatus)
    }
  }

  copyTranscriptionResult() {
    const text = this.elements.transcriptionResult.textContent
    const placeholderText = this.i18n
      ? this.i18n.t('resultsPlaceholder')
      : 'Transcription results will appear here...'

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

  // File upload helper methods
  async displayFileInfo(file, isVideo = false) {
    try {
      this.currentUploadedFile = file

      // Hide upload area and show file info section
      this.elements.uploadArea.classList.add('hidden')
      this.elements.fileInfo.classList.remove('hidden')

      // Display file name without type indicator
      this.elements.fileName.textContent = file.name

      // Format file size
      const fileSize = this.formatFileSize(file.size)

      // Get duration if possible
      let duration = 'Unknown'
      try {
        duration = await this.getMediaDuration(file, isVideo)
      } catch (error) {
        console.warn('Could not get media duration:', error)
      }

      // Display file details
      const mediaType = isVideo ? 'Video' : 'Audio'
      this.elements.fileDetails.textContent = `${mediaType} | Size: ${fileSize} | Duration: ${duration}`

      // Update transcribe button text for video files
      if (isVideo) {
        this.elements.transcribeButton.textContent = this.i18n ? this.i18n.t('startTranscription') : 'Start Transcription'
      } else {
        this.elements.transcribeButton.textContent = this.i18n ? this.i18n.t('startTranscription') : 'Start Transcription'
      }

      console.log('File info displayed:', {
        name: file.name,
        size: fileSize,
        duration: duration,
        isVideo: isVideo
      })

      // Show upload audio player for audio/video files
      this.showUploadAudioPlayer(file)
    } catch (error) {
      console.error('Error displaying file info:', error)
      this.showErrorMessage('Failed to display file information')
    }
  }

  clearFileInfo() {
    // Hide file info and show upload area
    this.elements.fileInfo.classList.add('hidden')
    this.elements.uploadArea.classList.remove('hidden')

    this.elements.fileName.textContent = ''
    this.elements.fileDetails.textContent = ''
    this.currentUploadedFile = null
    this.isVideoFile = false

    // Reset transcribe button text
    this.elements.transcribeButton.textContent = this.i18n ? this.i18n.t('startTranscription') : 'Start Transcription'

    // Reset file input
    this.elements.fileInput.value = ''

    // Hide upload audio player
    this.hideUploadAudioPlayer()
  }

  formatFileSize(bytes) {
    if (bytes === 0) {
      return '0 Bytes'
    }

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  async getMediaDuration(file, isVideo = false) {
    return new Promise((resolve, reject) => {
      const media = isVideo ? document.createElement('video') : new Audio()
      const url = URL.createObjectURL(file)

      media.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url)
        const duration = media.duration
        if (isFinite(duration)) {
          resolve(this.formatTime(duration))
        } else {
          resolve('Unknown')
        }
      })

      media.addEventListener('error', error => {
        URL.revokeObjectURL(url)
        reject(error)
      })

      // Set timeout to avoid hanging
      setTimeout(() => {
        URL.revokeObjectURL(url)
        resolve('Unknown')
      }, 10000) // Longer timeout for video files

      media.src = url
      if (isVideo) {
        media.muted = true // Mute video to avoid audio playback
        media.load()
      }
    })
  }

  getSelectedLanguage() {
    // Try to get language from the app instance if available
    if (
      window.app &&
      typeof window.app.getSelectedTranscriptionLanguage === 'function'
    ) {
      return window.app.getSelectedTranscriptionLanguage()
    }

    // Fallback to 'auto' as default
    return 'auto'
  }

  // Audio Player Methods
  showAudioPlayer(audioBlob, knownDuration = null) {
    this.currentAudioBlob = audioBlob

    // Create audio URL
    const audioUrl = URL.createObjectURL(audioBlob)

    // Create audio element if it doesn't exist
    if (this.currentAudio) {
      this.currentAudio.pause()
      URL.revokeObjectURL(this.currentAudio.src)
    }

    this.currentAudio = new Audio(audioUrl)

    // Use provided duration or calculate from recording time
    const duration = knownDuration || this.getRecordingDuration()
    if (duration > 0) {
      this.audioDuration = duration
      console.log('Using known recording duration:', duration)
      this.elements.audioTime.textContent = `00:00 / ${this.formatTime(duration)}`
    } else {
      // Fallback to loading state
      this.audioDuration = 0
      this.elements.audioTime.textContent = '00:00 / --:--'
    }

    this.elements.progressFill.style.width = '0%'
    this.elements.progressSlider.value = 0

    // Still load metadata for accuracy, but don't wait for it
    this.currentAudio.preload = 'metadata'
    this.currentAudio.load()

    // Set up audio event listeners
    this.currentAudio.addEventListener('loadedmetadata', () => {
      const metadataDuration = this.currentAudio.duration
      console.log(
        'Audio metadata loaded - Duration:',
        metadataDuration,
        'seconds'
      )

      // Only update if metadata duration is valid and we don't already have a good duration
      if (isFinite(metadataDuration) && metadataDuration > 0) {
        // If our known duration is very different from metadata, prefer metadata
        const knownDuration = this.getRecordingDuration()
        if (Math.abs(metadataDuration - knownDuration) > 0.5) {
          console.log('Using metadata duration instead of known duration')
          this.audioDuration = metadataDuration
          this.updateAudioTime()
        }
      }
    })

    this.currentAudio.addEventListener('durationchange', () => {
      const newDuration = this.currentAudio.duration
      if (isFinite(newDuration) && newDuration > 0) {
        console.log('Duration changed to:', newDuration)
        this.audioDuration = newDuration
        this.updateAudioTime()
      }
    })

    this.currentAudio.addEventListener('timeupdate', () => {
      this.updateProgress()
    })

    this.currentAudio.addEventListener('ended', () => {
      this.isPlaying = false
      this.updatePlayButton()
    })

    this.currentAudio.addEventListener('error', e => {
      console.error('Audio loading error:', e)
      console.error('Audio error details:', {
        error: e.error,
        code: e.target?.error?.code,
        message: e.target?.error?.message
      })
      this.elements.audioTime.textContent = '00:00 / Error'
    })

    // Show the audio player
    this.elements.audioPlayer.classList.remove('hidden')

    // Hide recording controls
    const recordingControls = document.querySelector('.recording-controls')
    if (recordingControls) {
      recordingControls.style.display = 'none'
    }
  }

  onPlayButtonClick() {
    if (!this.currentAudio) {
      return
    }

    if (this.isPlaying) {
      this.currentAudio.pause()
      this.isPlaying = false
    } else {
      this.currentAudio.play()
      this.isPlaying = true
    }

    this.updatePlayButton()
  }

  updatePlayButton() {
    const playIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>`

    const pauseIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>`

    this.elements.playButton.innerHTML = this.isPlaying ? pauseIcon : playIcon
    this.elements.playButton.classList.toggle('playing', this.isPlaying)

    const label = this.isPlaying ? 'Pause audio' : 'Play audio'
    this.elements.playButton.setAttribute('aria-label', label)
  }

  onProgressChange(value) {
    if (
      !this.currentAudio ||
      !isFinite(this.audioDuration) ||
      this.audioDuration <= 0
    ) {
      return
    }

    const time = (value / 100) * this.audioDuration
    // Ensure time is within valid range
    this.currentAudio.currentTime = Math.min(
      this.audioDuration,
      Math.max(0, time)
    )
  }

  updateProgress() {
    if (!this.currentAudio) {
      return
    }

    // Check if duration is valid
    if (!isFinite(this.audioDuration) || this.audioDuration <= 0) {
      this.elements.progressFill.style.width = '0%'
      this.elements.progressSlider.value = 0
      this.updateAudioTime()
      return
    }

    const progress = (this.currentAudio.currentTime / this.audioDuration) * 100
    this.elements.progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`
    this.elements.progressSlider.value = Math.min(100, Math.max(0, progress))

    this.updateAudioTime()
  }

  updateAudioTime() {
    if (!this.currentAudio) {
      return
    }

    const currentTime = this.currentAudio.currentTime || 0
    const duration = this.audioDuration || 0

    // Check if duration is valid
    if (!isFinite(duration) || duration <= 0) {
      this.elements.audioTime.textContent = `${this.formatTime(currentTime)} / --:--`
      return
    }

    const current = this.formatTime(currentTime)
    const total = this.formatTime(duration)

    this.elements.audioTime.textContent = `${current} / ${total}`
  }

  formatTime(seconds) {
    // Handle invalid values
    if (!isFinite(seconds) || seconds < 0) {
      return '--:--'
    }

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  onDownloadButtonClick() {
    if (!this.currentAudioBlob) {
      return
    }

    const url = URL.createObjectURL(this.currentAudioBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  hideAudioPlayer() {
    this.elements.audioPlayer.classList.add('hidden')

    // Show recording controls again
    const recordingControls = document.querySelector('.recording-controls')
    if (recordingControls) {
      recordingControls.style.display = 'flex'
    }

    // Clean up audio player
    if (this.currentAudio) {
      this.currentAudio.pause()
      URL.revokeObjectURL(this.currentAudio.src)
      this.currentAudio = null
    }

    // Clean up AudioManager resources
    if (this.audioManager) {
      this.audioManager.cleanup()
    }

    this.currentAudioBlob = null
    this.isPlaying = false
    this.audioDuration = 0
    this.isMuted = false
    this.previousVolume = 1
    this.recordingStartTime = null
    this.recordingEndTime = null
  }

  onClosePlayerButtonClick() {
    this.hideAudioPlayer()
  }

  // Get the actual recording duration
  getRecordingDuration() {
    if (this.recordingStartTime && this.recordingEndTime) {
      const duration = (this.recordingEndTime - this.recordingStartTime) / 1000
      return Math.max(0, duration) // Ensure non-negative
    }
    return 0
  }

  // Estimate audio duration based on recording time (fallback)
  estimateAudioDuration(audioBlob) {
    // First try the known recording duration
    const knownDuration = this.getRecordingDuration()
    if (knownDuration > 0) {
      console.log('Using known recording duration:', knownDuration)
      return knownDuration
    }

    // Fallback: rough estimate based on blob size and bitrate
    // This is very approximate and may not be accurate
    const bitrate = 128000 // bits per second (from MediaRecorder config)
    const bytesPerSecond = bitrate / 8
    const estimatedDuration = audioBlob.size / bytesPerSecond
    console.log('Estimated duration from blob size:', estimatedDuration)
    return estimatedDuration
  }

  onVolumeChange(value) {
    if (!this.currentAudio) {
      return
    }

    const volume = value / 100
    this.currentAudio.volume = volume

    if (volume === 0) {
      this.isMuted = true
    } else {
      this.isMuted = false
      this.previousVolume = volume
    }

    this.updateVolumeButton()
  }

  onVolumeButtonClick() {
    if (!this.currentAudio) {
      return
    }

    if (this.isMuted) {
      this.currentAudio.volume = this.previousVolume
      this.elements.volumeSlider.value = this.previousVolume * 100
      this.isMuted = false
    } else {
      this.previousVolume = this.currentAudio.volume
      this.currentAudio.volume = 0
      this.elements.volumeSlider.value = 0
      this.isMuted = true
    }

    this.updateVolumeButton()
  }

  updateVolumeButton() {
    const volumeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    </svg>`

    const muteIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
    </svg>`

    this.elements.volumeButton.innerHTML = this.isMuted ? muteIcon : volumeIcon
  }

  // Upload Audio Player Methods
  showUploadAudioPlayer(file) {
    // Create audio URL
    const audioUrl = URL.createObjectURL(file)

    // Clean up existing audio
    if (this.uploadAudio) {
      this.uploadAudio.pause()
      URL.revokeObjectURL(this.uploadAudio.src)
    }

    this.uploadAudio = new Audio(audioUrl)
    this.uploadAudio.preload = 'metadata'
    this.uploadAudio.load()

    // Set up audio event listeners
    this.uploadAudio.addEventListener('loadedmetadata', () => {
      const duration = this.uploadAudio.duration
      console.log('Upload audio metadata loaded - Duration:', duration, 'seconds')

      if (isFinite(duration) && duration > 0) {
        this.uploadAudioDuration = duration
        this.updateUploadAudioTime()
      }
    })

    this.uploadAudio.addEventListener('timeupdate', () => {
      this.updateUploadProgress()
    })

    this.uploadAudio.addEventListener('ended', () => {
      this.isUploadPlaying = false
      this.updateUploadPlayButton()
    })

    this.uploadAudio.addEventListener('error', e => {
      console.error('Upload audio loading error:', e)
      this.elements.uploadAudioTime.textContent = '00:00 / Error'
    })

    // Initialize UI
    this.elements.uploadProgressFill.style.width = '0%'
    this.elements.uploadProgressSlider.value = 0
    this.elements.uploadAudioTime.textContent = '00:00 / --:--'
    this.isUploadPlaying = false
    this.updateUploadPlayButton()

    // Show the upload audio player
    this.elements.uploadAudioPlayer.classList.remove('hidden')
  }

  hideUploadAudioPlayer() {
    this.elements.uploadAudioPlayer.classList.add('hidden')

    // Clean up audio
    if (this.uploadAudio) {
      this.uploadAudio.pause()
      URL.revokeObjectURL(this.uploadAudio.src)
      this.uploadAudio = null
    }

    this.isUploadPlaying = false
    this.uploadAudioDuration = 0
    this.isUploadMuted = false
    this.uploadPreviousVolume = 1
  }

  onUploadPlayButtonClick() {
    if (!this.uploadAudio) {
      return
    }

    if (this.isUploadPlaying) {
      this.uploadAudio.pause()
      this.isUploadPlaying = false
    } else {
      this.uploadAudio.play()
      this.isUploadPlaying = true
    }

    this.updateUploadPlayButton()
  }

  updateUploadPlayButton() {
    const playIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>`

    const pauseIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>`

    this.elements.uploadPlayButton.innerHTML = this.isUploadPlaying ? pauseIcon : playIcon
    this.elements.uploadPlayButton.classList.toggle('playing', this.isUploadPlaying)

    const label = this.isUploadPlaying ? 'Pause uploaded audio' : 'Play uploaded audio'
    this.elements.uploadPlayButton.setAttribute('aria-label', label)
  }

  onUploadProgressChange(value) {
    if (
      !this.uploadAudio ||
      !isFinite(this.uploadAudioDuration) ||
      this.uploadAudioDuration <= 0
    ) {
      return
    }

    const time = (value / 100) * this.uploadAudioDuration
    this.uploadAudio.currentTime = Math.min(
      this.uploadAudioDuration,
      Math.max(0, time)
    )
  }

  updateUploadProgress() {
    if (!this.uploadAudio) {
      return
    }

    if (!isFinite(this.uploadAudioDuration) || this.uploadAudioDuration <= 0) {
      this.elements.uploadProgressFill.style.width = '0%'
      this.elements.uploadProgressSlider.value = 0
      this.updateUploadAudioTime()
      return
    }

    const progress = (this.uploadAudio.currentTime / this.uploadAudioDuration) * 100
    this.elements.uploadProgressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`
    this.elements.uploadProgressSlider.value = Math.min(100, Math.max(0, progress))

    this.updateUploadAudioTime()
  }

  updateUploadAudioTime() {
    if (!this.uploadAudio) {
      return
    }

    const currentTime = this.uploadAudio.currentTime || 0
    const duration = this.uploadAudioDuration || 0

    if (!isFinite(duration) || duration <= 0) {
      this.elements.uploadAudioTime.textContent = `${this.formatTime(currentTime)} / --:--`
      return
    }

    const current = this.formatTime(currentTime)
    const total = this.formatTime(duration)

    this.elements.uploadAudioTime.textContent = `${current} / ${total}`
  }

  onUploadVolumeChange(value) {
    if (!this.uploadAudio) {
      return
    }

    const volume = value / 100
    this.uploadAudio.volume = volume

    if (volume === 0) {
      this.isUploadMuted = true
    } else {
      this.isUploadMuted = false
      this.uploadPreviousVolume = volume
    }

    this.updateUploadVolumeButton()
  }

  onUploadVolumeButtonClick() {
    if (!this.uploadAudio) {
      return
    }

    if (this.isUploadMuted) {
      this.uploadAudio.volume = this.uploadPreviousVolume
      this.elements.uploadVolumeSlider.value = this.uploadPreviousVolume * 100
      this.isUploadMuted = false
    } else {
      this.uploadPreviousVolume = this.uploadAudio.volume
      this.uploadAudio.volume = 0
      this.elements.uploadVolumeSlider.value = 0
      this.isUploadMuted = true
    }

    this.updateUploadVolumeButton()
  }

  updateUploadVolumeButton() {
    const volumeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    </svg>`

    const muteIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
    </svg>`

    this.elements.uploadVolumeButton.innerHTML = this.isUploadMuted ? muteIcon : volumeIcon
  }


}
