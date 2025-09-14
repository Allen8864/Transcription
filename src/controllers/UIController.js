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
    
    // 设置实时转录更新回调
    if (this.transcriptionManager) {
      this.transcriptionManager.setTranscriptionUpdateCallback((partialResult) => {
        this.handleRealtimeTranscriptionUpdate(partialResult)
      })
    }
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
        // 清空转录结果
        this.clearTranscriptionResults()
        
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
      // Use improved FileReader for processing (following FileTile pattern)
      if (!this.audioManager) {
        throw new Error('Audio manager not available')
      }

      // Process file using the improved FileReader
      const result = await this.audioManager.processFileWithFileReader(file)
      
      // Store processed data for transcription
      this.currentUploadedFile = file
      this.isVideoFile = result.isVideo
      this.processedAudioData = result.audioData // Store pre-processed audio data
      this.audioBuffer = result.audioBuffer // Store AudioBuffer for playback
      this.fileBlobUrl = result.blobUrl // Store blob URL for playback

      console.log('File processed successfully:', {
        fileName: file.name,
        isVideo: result.isVideo,
        audioDataLength: result.audioData.length,
        duration: result.audioBuffer.duration,
        sampleRate: result.audioBuffer.sampleRate
      })

      // Display file information
      await this.displayFileInfo(file, result.isVideo)
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

      // Show transcription in progress indicator (only the progress bar)
      const resultElement = this.elements.transcriptionResult
      resultElement.classList.add('transcription-in-progress')

      // 获取选择的语言
      const language = this.getSelectedLanguage()
      
      // 开始转录 (simplified whisper-web approach)
      const result = await this.transcriptionManager.transcribeFile(audioBlob, this.audioManager, language)
      
      // 显示转录结果
      this.displayTranscriptionResult(result.text, false)
      this.elements.copyButton.classList.remove('hidden')

      // Remove transcription in progress indicator
      resultElement.classList.remove('transcription-in-progress')

      console.log('Recording transcription completed')
    } catch (error) {
      console.error('Recording transcription error:', error)
      this.showErrorMessage(`转录失败: ${error.message}`)
      // Remove transcription in progress indicator in case of error
      const resultElement = this.elements.transcriptionResult
      resultElement.classList.remove('transcription-in-progress')
    }
  }

  async onTranscribeButtonClick() {
    console.log('Transcribe button clicked')

    if (!this.currentUploadedFile) {
      this.showErrorMessage('No file selected for transcription')
      return
    }

    if (!this.transcriptionManager) {
      this.showErrorMessage('Transcription manager not available')
      return
    }

    // Check if we have pre-processed audio data (from improved FileReader)
    if (!this.processedAudioData) {
      this.showErrorMessage('Audio data not processed. Please try uploading the file again.')
      return
    }

    try {
      // 清空转录结果
      this.clearTranscriptionResults()

      // 禁用按钮，避免重复点击
      this.elements.transcribeButton.disabled = true

      // Update button text for transcription
      this.elements.transcribeButton.textContent = 'Transcribing...'

      // Show transcription in progress indicator (only the progress bar)
      const resultElement = this.elements.transcriptionResult
      resultElement.classList.add('transcription-in-progress')

      // Get selected language
      const language = this.getSelectedLanguage()

      console.log('Starting transcription with pre-processed audio data:', {
        audioDataLength: this.processedAudioData.length,
        duration: this.processedAudioData.length / 16000, // Assuming 16kHz sample rate
        language: language
      })

      // Use pre-processed audio data directly (following FileTile pattern)
      const result = await this.transcriptionManager.transcribeAudioData(
        this.processedAudioData,
        language
      )

      // Display result
      this.displayTranscriptionResult(result.text, false)
      this.elements.copyButton.classList.remove('hidden')

      // Remove transcription in progress indicator
      resultElement.classList.remove('transcription-in-progress')
    } catch (error) {
      console.error('Transcription error:', error)
      this.showErrorMessage(error.message)
      // Remove transcription in progress indicator in case of error
      const resultElement = this.elements.transcriptionResult
      resultElement.classList.remove('transcription-in-progress')
    } finally {
      // 重新启用按钮
      this.elements.transcribeButton.disabled = false

      this.elements.transcribeButton.textContent = this.i18n ? this.i18n.t('startTranscription') : 'Start Transcription'
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
    const recordText = recordButton.closest('.recording-controls').querySelector('.record-text')

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

  displayTranscriptionResult(transcriptionData, isPartial = false) {
    // Import formatAudioTimestamp utility
    import('../utils/AudioUtils.js').then(({ formatAudioTimestamp }) => {
      this._displayTranscriptionResultWithUtils(transcriptionData, isPartial, formatAudioTimestamp)
    }).catch(() => {
      // Fallback without timestamp formatting
      this._displayTranscriptionResultWithUtils(transcriptionData, isPartial, null)
    })
  }

  _displayTranscriptionResultWithUtils(transcriptionData, isPartial, formatAudioTimestamp) {
    // Handle both string and object input for backward compatibility
    let text, chunks
    if (typeof transcriptionData === 'string') {
      text = transcriptionData
      chunks = null
    } else if (transcriptionData && typeof transcriptionData === 'object') {
      text = transcriptionData.text || ''
      chunks = transcriptionData.chunks || null
    } else {
      console.warn('No transcription data provided')
      return
    }

    if (!text && !chunks) {
      console.warn('No text or chunks provided for transcription result')
      return
    }

    const resultElement = this.elements.transcriptionResult
    const placeholderElement = resultElement.querySelector('.placeholder-text')

    // Remove placeholder if it exists
    if (placeholderElement) {
      placeholderElement.remove()
    }

    if (isPartial) {
      // For partial results, show enhanced real-time display
      this.displayPartialTranscription(resultElement, text, chunks, formatAudioTimestamp)
    } else {
      // Clear existing content including partial results
      resultElement.innerHTML = ''
      
      // Remove transcription in progress indicator
      resultElement.classList.remove('transcription-in-progress')
      clearTimeout(this.transcriptionProgressTimeout)

      if (chunks && chunks.length > 0 && formatAudioTimestamp) {
        // Display with timestamps and enhanced styling
        chunks.forEach((chunk, index) => {
          const chunkElement = document.createElement('div')
          chunkElement.className = 'transcript-chunk'
          chunkElement.setAttribute('data-chunk-index', index)

          const timestampElement = document.createElement('div')
          timestampElement.className = 'transcript-timestamp'
          
          if (chunk.timestamp && chunk.timestamp[0] !== undefined) {
            timestampElement.textContent = formatAudioTimestamp(chunk.timestamp[0])
          } else {
            timestampElement.textContent = '--:--'
          }

          const textElement = document.createElement('div')
          textElement.className = 'transcript-text'
          textElement.textContent = chunk.text.trim()

          chunkElement.appendChild(timestampElement)
          chunkElement.appendChild(textElement)
          resultElement.appendChild(chunkElement)
        })

        // Add export buttons
        this.addExportButtons(resultElement, { text, chunks })
      } else {
        // Skip simple text display, only use chunk-based display
        console.warn('No chunks available for transcription display')
      }
    }

    // Scroll to bottom with smooth behavior
    if (resultElement.scrollHeight > resultElement.clientHeight) {
      const diff = Math.abs(
        resultElement.offsetHeight + resultElement.scrollTop - resultElement.scrollHeight
      )
      
      if (diff <= 64) {
        // We're close enough to the bottom, so scroll to the bottom
        resultElement.scrollTop = resultElement.scrollHeight
      }
    }

    // Show copy button for final results
    if (!isPartial) {
      this.elements.copyButton.classList.remove('hidden')
    }

    console.log('Transcription result displayed:', { 
      hasText: !!text, 
      hasChunks: !!(chunks && chunks.length), 
      isPartial 
    })
  }

  addExportButtons(resultElement, transcriptionData) {
    const existingButtons = resultElement.querySelector('.export-buttons')
    if (existingButtons) {
      existingButtons.remove()
    }

    const exportContainer = document.createElement('div')
    exportContainer.className = 'export-buttons'

    // Export TXT button
    const exportTxtButton = document.createElement('button')
    exportTxtButton.className = 'export-button export-txt'
    exportTxtButton.textContent = 'Export TXT'
    exportTxtButton.addEventListener('click', () => this.exportTranscriptAsTXT(transcriptionData))

    // Export JSON button  
    const exportJsonButton = document.createElement('button')
    exportJsonButton.className = 'export-button export-json'
    exportJsonButton.textContent = 'Export JSON'
    exportJsonButton.addEventListener('click', () => this.exportTranscriptAsJSON(transcriptionData))

    exportContainer.appendChild(exportTxtButton)
    exportContainer.appendChild(exportJsonButton)
    resultElement.appendChild(exportContainer)
  }

  exportTranscriptAsTXT(transcriptionData) {
    const text = transcriptionData.text || transcriptionData.chunks?.map(chunk => chunk.text).join('').trim() || ''
    
    if (!text) {
      this.showErrorMessage('No transcript content to export')
      return
    }

    const blob = new Blob([text], { type: 'text/plain' })
    this.downloadBlob(blob, 'transcript.txt')
  }

  exportTranscriptAsJSON(transcriptionData) {
    const chunks = transcriptionData.chunks || []
    
    if (chunks.length === 0) {
      this.showErrorMessage('No transcript chunks to export')
      return
    }

    let jsonData = JSON.stringify(chunks, null, 2)
    
    // Post-process the JSON to make it more readable
    const regex = /(    "timestamp": )\[\s+(\S+)\s+(\S+)\s+\]/gm
    jsonData = jsonData.replace(regex, '$1[$2 $3]')

    const blob = new Blob([jsonData], { type: 'application/json' })
    this.downloadBlob(blob, 'transcript.json')
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Handle real-time transcription updates
   * @param {Object} partialResult - Partial transcription result with text and chunks
   */
  handleRealtimeTranscriptionUpdate(partialResult) {
    if (!partialResult) {
      return
    }

    console.log('Real-time transcription update:', partialResult)

    // Store the latest partial result
    this.latestPartialResult = partialResult

    // Debounce the UI updates to avoid overwhelming the DOM
    clearTimeout(this.realtimeUpdateTimeout)
    this.realtimeUpdateTimeout = setTimeout(() => {
      this.updatePartialTranscriptionUI(this.latestPartialResult)
    }, 50) // Update every 50ms at most

    // Show a visual indicator that transcription is in progress
    this.showTranscriptionInProgress()
  }

  /**
   * Update the UI with the latest partial transcription result
   * @param {Object} partialResult - The partial result to display
   */
  updatePartialTranscriptionUI(partialResult) {
    if (!partialResult) {
      return
    }

    // Update the results display with partial results
    this.displayTranscriptionResult(partialResult, true)
  }

  /**
   * Show visual indicator that transcription is in progress
   */
  showTranscriptionInProgress() {
    const resultElement = this.elements.transcriptionResult
    
    // Add a subtle indicator class
    resultElement.classList.add('transcription-in-progress')
    
    // Remove the indicator after a short delay if no new updates come
    clearTimeout(this.transcriptionProgressTimeout)
    this.transcriptionProgressTimeout = setTimeout(() => {
      resultElement.classList.remove('transcription-in-progress')
    }, 1000)
  }

  /**
   * Clear transcription results
   */
  clearTranscriptionResults() {
    const resultElement = this.elements.transcriptionResult
    
    // Clear all content
    resultElement.innerHTML = ''
    
    // Add placeholder text back
    const placeholderElement = document.createElement('p')
    placeholderElement.className = 'placeholder-text'
    placeholderElement.textContent = this.i18n 
      ? this.i18n.t('resultsPlaceholder') 
      : 'Transcription results will appear here...'
    resultElement.appendChild(placeholderElement)
    
    // Hide copy button
    this.elements.copyButton.classList.add('hidden')
    
    // Remove any progress indicators
    resultElement.classList.remove('transcription-in-progress')
    clearTimeout(this.transcriptionProgressTimeout)
    clearTimeout(this.realtimeUpdateTimeout)
    
    console.log('Transcription results cleared')
  }

  /**
   * Display partial transcription results with real-time updates
   * @param {HTMLElement} resultElement - The result container element
   * @param {string} text - The partial text
   * @param {Array} chunks - The partial chunks array
   * @param {Function} formatAudioTimestamp - Timestamp formatting function
   */
  displayPartialTranscription(resultElement, text, chunks, formatAudioTimestamp) {
    // Find or create the partial results container
    let partialContainer = resultElement.querySelector('.partial-transcription')
    
    if (!partialContainer) {
      partialContainer = document.createElement('div')
      partialContainer.className = 'partial-transcription'
      resultElement.appendChild(partialContainer)
    }

    // Store previous content hash to avoid unnecessary re-renders
    const currentContentHash = this.hashContent(text, chunks)
    if (partialContainer.dataset.contentHash === currentContentHash) {
      return // No change, skip update
    }
    partialContainer.dataset.contentHash = currentContentHash

    // Clear previous partial content
    partialContainer.innerHTML = ''

    if (chunks && chunks.length > 0 && formatAudioTimestamp) {
      // Display chunks with timestamps - simple layout
      chunks.forEach((chunk, index) => {
        const chunkElement = document.createElement('div')
        chunkElement.className = 'partial-chunk'
        chunkElement.setAttribute('data-chunk-index', index)

        const timestampElement = document.createElement('div')
        timestampElement.className = 'partial-timestamp'
        
        if (chunk.timestamp && chunk.timestamp[0] !== undefined) {
          timestampElement.textContent = formatAudioTimestamp(chunk.timestamp[0])
        } else {
          timestampElement.textContent = '--:--'
        }

        const textElement = document.createElement('div')
        textElement.className = 'partial-text'
        textElement.textContent = chunk.text.trim()

        chunkElement.appendChild(timestampElement)
        chunkElement.appendChild(textElement)
        partialContainer.appendChild(chunkElement)
      })
    } else if (text) {
      // Display text as chunks if available, otherwise skip simple display
      console.warn('No chunks available for partial transcription display')
    }


    // Auto-scroll to bottom
    this.smoothScrollToBottom(resultElement)
  }

  /**
   * Create a simple hash of content to detect changes
   * @param {string} text - The text content
   * @param {Array} chunks - The chunks array
   * @returns {string} Content hash
   */
  hashContent(text, chunks) {
    const content = chunks ? JSON.stringify(chunks) : text || ''
    // Handle Unicode characters by encoding them first
    try {
      return btoa(encodeURIComponent(content)).substring(0, 16) // Simple hash
    } catch (error) {
      // Fallback to a simple hash if encoding fails
      return this.simpleHash(content).substring(0, 16)
    }
  }

  simpleHash(str) {
    let hash = 0
    if (str.length === 0) return hash.toString()
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString()
  }


  /**
   * Smooth scroll to bottom of element
   * @param {HTMLElement} element - The element to scroll
   */
  smoothScrollToBottom(element) {
    if (element.scrollHeight > element.clientHeight) {
      const diff = Math.abs(
        element.offsetHeight + element.scrollTop - element.scrollHeight
      )
      
      if (diff <= 100) {
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        })
      }
    }
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


  copyTranscriptionResult() {
    const resultElement = this.elements.transcriptionResult
    const placeholderText = this.i18n
      ? this.i18n.t('resultsPlaceholder')
      : 'Transcription results will appear here...'

    // Extract only text content from partial-text elements, preserving line breaks
    const partialTextChunks = resultElement.querySelectorAll('.partial-text')
    let textToCopy = ''
    
    if (partialTextChunks.length > 0) {
      // Extract text from each partial-text chunk and join with line breaks
      const textArray = Array.from(partialTextChunks).map(chunk => chunk.textContent.trim())
      textToCopy = textArray.join('\n')
    } else {
      // Fallback to full text content if no partial-text chunks found
      const fullText = resultElement.textContent
      if (fullText && fullText !== placeholderText) {
        textToCopy = fullText.trim()
      }
    }

    if (textToCopy) {
      navigator.clipboard
        .writeText(textToCopy)
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

    // Clear processed audio data (from improved FileReader)
    this.processedAudioData = null
    this.audioBuffer = null
    if (this.fileBlobUrl) {
      URL.revokeObjectURL(this.fileBlobUrl)
      this.fileBlobUrl = null
    }

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
    // Try multiple methods to get duration
    try {
      // Method 1: Use our AudioFileReader to get accurate duration
      if (!isVideo && this.audioBuffer) {
        const duration = this.audioBuffer.duration
        if (isFinite(duration) && duration > 0) {
          console.log('Using AudioBuffer duration:', duration)
          return this.formatTime(duration)
        }
      }

      // Method 2: Parse WAV file header directly for more reliable duration
      if (!isVideo && file.name.toLowerCase().endsWith('.wav')) {
        try {
          const wavDuration = await this.getWAVDuration(file)
          if (wavDuration > 0) {
            console.log('Using WAV header duration:', wavDuration)
            return this.formatTime(wavDuration)
          }
        } catch (error) {
          console.warn('WAV header parsing failed:', error)
        }
      }

      // Method 3: Enhanced HTML5 Audio/Video API with better error handling
      return await this.getMediaDurationFromHTML5(file, isVideo)
      
    } catch (error) {
      console.error('All duration methods failed:', error)
      return 'Unknown'
    }
  }

  /**
   * Get duration from WAV file header (more reliable than HTML5 Audio)
   * @param {File} file - WAV file
   * @returns {Promise<number>} Duration in seconds
   */
  async getWAVDuration(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target.result
          const view = new DataView(arrayBuffer)
          
          // Check if it's a valid WAV file
          const riffHeader = String.fromCharCode(
            view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
          )
          const waveHeader = String.fromCharCode(
            view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)
          )
          
          if (riffHeader !== 'RIFF' || waveHeader !== 'WAVE') {
            reject(new Error('Not a valid WAV file'))
            return
          }
          
          // Read WAV format information
          const sampleRate = view.getUint32(24, true)
          const byteRate = view.getUint32(28, true)
          const bitsPerSample = view.getUint16(34, true)
          const numChannels = view.getUint16(22, true)
          
          // Find data chunk
          let dataSize = 0
          let offset = 36
          
          while (offset < arrayBuffer.byteLength - 8) {
            const chunkId = String.fromCharCode(
              view.getUint8(offset), view.getUint8(offset + 1),
              view.getUint8(offset + 2), view.getUint8(offset + 3)
            )
            const chunkSize = view.getUint32(offset + 4, true)
            
            if (chunkId === 'data') {
              dataSize = chunkSize
              break
            }
            
            offset += 8 + chunkSize
          }
          
          if (dataSize === 0) {
            reject(new Error('No data chunk found in WAV file'))
            return
          }
          
          // Calculate duration: dataSize / (sampleRate * numChannels * (bitsPerSample / 8))
          const bytesPerSample = (bitsPerSample / 8) * numChannels
          const totalSamples = dataSize / bytesPerSample
          const duration = totalSamples / sampleRate
          
          console.log('WAV file analysis:', {
            sampleRate,
            numChannels,
            bitsPerSample,
            dataSize,
            duration
          })
          
          if (isFinite(duration) && duration > 0) {
            resolve(duration)
          } else {
            reject(new Error('Invalid duration calculated'))
          }
          
        } catch (error) {
          reject(new Error(`WAV parsing error: ${error.message}`))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read WAV file'))
      }
      
      // Read first 1KB which should contain the header
      const headerSlice = file.slice(0, 1024)
      reader.readAsArrayBuffer(headerSlice)
    })
  }

  /**
   * Enhanced HTML5 Audio/Video duration detection
   * @param {File} file - Media file
   * @param {boolean} isVideo - Whether it's a video file
   * @returns {Promise<string>} Formatted duration
   */
  async getMediaDurationFromHTML5(file, isVideo = false) {
    return new Promise((resolve) => {
      const media = isVideo ? document.createElement('video') : new Audio()
      const url = URL.createObjectURL(file)
      let resolved = false

      const cleanup = () => {
        if (url) URL.revokeObjectURL(url)
      }

      const resolveOnce = (value) => {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve(value)
        }
      }

      // Multiple event listeners for better compatibility
      media.addEventListener('loadedmetadata', () => {
        const duration = media.duration
        console.log('HTML5 loadedmetadata duration:', duration)
        if (isFinite(duration) && duration > 0) {
          resolveOnce(this.formatTime(duration))
        }
      })

      media.addEventListener('durationchange', () => {
        const duration = media.duration
        console.log('HTML5 durationchange duration:', duration)
        if (isFinite(duration) && duration > 0) {
          resolveOnce(this.formatTime(duration))
        }
      })

      media.addEventListener('canplaythrough', () => {
        const duration = media.duration
        console.log('HTML5 canplaythrough duration:', duration)
        if (isFinite(duration) && duration > 0) {
          resolveOnce(this.formatTime(duration))
        }
      })

      media.addEventListener('error', (error) => {
        console.warn('HTML5 media error:', error)
        resolveOnce('Unknown')
      })

      // Extended timeout for difficult files
      setTimeout(() => {
        console.warn('HTML5 duration detection timeout')
        resolveOnce('Unknown')
      }, 15000) // 15 seconds timeout

      // Set up media element
      media.preload = 'metadata'
      media.src = url
      
      if (isVideo) {
        media.muted = true
      }
      
      // Always call load() to ensure metadata loading
      media.load()
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

    // Enhanced duration detection - try multiple sources
    let bestDuration = 0
    
    // Priority 1: Known duration (from recording or calculation)
    const recordingDuration = knownDuration || this.getRecordingDuration()
    if (recordingDuration > 0) {
      bestDuration = recordingDuration
      console.log('Using known/recording duration:', bestDuration)
    }
    
    // Priority 2: Try to estimate from blob size if no known duration
    if (bestDuration === 0) {
      bestDuration = this.estimateAudioDuration(audioBlob)
      console.log('Using estimated duration:', bestDuration)
    }

    // Set initial duration
    if (bestDuration > 0) {
      this.audioDuration = bestDuration
      this.elements.audioTime.textContent = `00:00 / ${this.formatTime(bestDuration)}`
    } else {
      this.audioDuration = 0
      this.elements.audioTime.textContent = '00:00 / Loading...'
    }

    this.elements.progressFill.style.width = '0%'
    this.elements.progressSlider.value = 0

    // Enhanced metadata loading with multiple event listeners
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

    // Enhanced blob-based estimation
    if (!audioBlob || audioBlob.size === 0) {
      return 0
    }

    // Try to determine format and estimate accordingly
    const mimeType = audioBlob.type || ''
    let estimatedDuration = 0

    if (mimeType.includes('webm') || mimeType.includes('ogg')) {
      // WebM/OGG typically uses variable bitrate, estimate conservatively
      const avgBitrate = 64000 // bits per second (conservative estimate)
      const bytesPerSecond = avgBitrate / 8
      estimatedDuration = audioBlob.size / bytesPerSecond
    } else if (mimeType.includes('wav')) {
      // WAV is uncompressed, more predictable
      // Assume 16-bit, mono, 16kHz (common for speech)
      const sampleRate = 16000
      const bitsPerSample = 16
      const channels = 1
      const bytesPerSecond = (sampleRate * bitsPerSample * channels) / 8
      // Account for WAV header (typically 44 bytes)
      const dataSize = Math.max(0, audioBlob.size - 44)
      estimatedDuration = dataSize / bytesPerSecond
    } else {
      // Generic estimation for other formats
      const avgBitrate = 128000 // bits per second
      const bytesPerSecond = avgBitrate / 8
      estimatedDuration = audioBlob.size / bytesPerSecond
    }

    // Sanity check: duration should be reasonable
    if (estimatedDuration > 0 && estimatedDuration < 3600) { // Less than 1 hour
      console.log('Estimated duration from blob analysis:', {
        size: audioBlob.size,
        type: mimeType,
        duration: estimatedDuration
      })
      return estimatedDuration
    }

    console.warn('Could not estimate audio duration reliably')
    return 0
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

    // Try to use AudioBuffer duration if available (more reliable for WAV)
    if (this.audioBuffer && this.audioBuffer.duration > 0) {
      this.uploadAudioDuration = this.audioBuffer.duration
      console.log('Using AudioBuffer duration for upload player:', this.uploadAudioDuration)
      this.updateUploadAudioTime()
    } else {
      // Fallback to HTML5 Audio API with enhanced event handling
      this.uploadAudioDuration = 0
      this.elements.uploadAudioTime.textContent = '00:00 / Loading...'
    }

    // Enhanced duration detection with multiple events
    const updateDurationFromAudio = () => {
      const duration = this.uploadAudio.duration
      console.log('Upload audio duration event - Duration:', duration, 'seconds')

      if (isFinite(duration) && duration > 0) {
        // Only update if we don't already have a better duration from AudioBuffer
        if (!this.uploadAudioDuration || this.uploadAudioDuration === 0) {
          this.uploadAudioDuration = duration
          this.updateUploadAudioTime()
        }
      }
    }

    // Multiple event listeners for better compatibility
    this.uploadAudio.addEventListener('loadedmetadata', updateDurationFromAudio)
    this.uploadAudio.addEventListener('durationchange', updateDurationFromAudio)
    this.uploadAudio.addEventListener('canplay', updateDurationFromAudio)
    this.uploadAudio.addEventListener('canplaythrough', updateDurationFromAudio)

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
