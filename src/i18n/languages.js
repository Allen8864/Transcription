// Language configuration and translations
export const languages = {
  en: {
    code: 'en',
    name: 'English',
    flag: '🇺🇸',
    translations: {
      // Header
      title: 'Whisper Web Transcription',
      subtitle: 'Pure frontend speech-to-text application based on WhisperCPP',

      // Language selector (for transcription)
      transcriptionLanguageLabel: 'Transcription Language:',
      autoDetect: 'Auto',
      chinese: 'Chinese',
      english: 'English',

      // Tabs
      realTimeRecording: 'Real-time Recording',
      fileUpload: 'File Upload',

      // Recording
      startRecording: 'Start Recording',
      stopRecording: 'Stop Recording',
      recording: 'Recording',

      // Upload
      dragDropText: 'Drop file or click',
      supportedFormats: 'MP3, WAV, M4A, OGG',
      startTranscription: 'Start Transcription',

      // Results
      transcriptionResults: 'Results',
      copyText: 'Copy',
      resultsPlaceholder: 'Transcription results will appear here...',
      processing: 'Processing...',

      // Footer
      privacyNote:
        'This application runs entirely in your browser and does not upload any audio data',

      // Dynamic content
      copied: 'Copied!',
      fileSelected: 'File selected:',
      fileDuration: 'Duration:',
      fileSize: 'Size:',

      // Aria labels
      selectLanguage: 'Select interface language',
      selectAudioFile: 'Select audio file',
      copyTranscriptionText: 'Copy transcription text',
      transcriptionContent: 'Transcription text content',
      functionSelection: 'Function selection'
    }
  },
  zh: {
    code: 'zh',
    name: '中文',
    flag: '🇨🇳',
    translations: {
      // Header
      title: 'Whisper Web Transcription',
      subtitle: '基于 WhisperCPP 的纯前端语音转文字应用',

      // Language selector (for transcription)
      transcriptionLanguageLabel: '转录语言:',
      autoDetect: '自动',
      chinese: '中文',
      english: '英文',

      // Tabs
      realTimeRecording: '实时转录',
      fileUpload: '文件上传',

      // Recording
      startRecording: '开始录音',
      stopRecording: '停止录音',
      recording: '录音中',

      // Upload
      dragDropText: '拖拽文件或点击',
      supportedFormats: 'MP3, WAV, M4A, OGG',
      startTranscription: '开始转录',

      // Results
      transcriptionResults: '结果',
      copyText: '复制',
      resultsPlaceholder: '转录结果将在这里显示...',
      processing: '处理中...',

      // Footer
      privacyNote: '此应用完全在您的浏览器中运行，不会上传任何音频数据',

      // Dynamic content
      copied: '已复制!',
      fileSelected: '已选择文件:',
      fileDuration: '时长:',
      fileSize: '大小:',

      // Aria labels
      selectLanguage: '选择界面语言',
      selectAudioFile: '选择音频文件',
      copyTranscriptionText: '复制转录文本',
      transcriptionContent: '转录文本内容',
      functionSelection: '功能选择'
    }
  }
}

export const defaultLanguage = 'en'
