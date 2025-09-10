# 设计文档

## 概述

本设计文档描述了基于 WhisperCPP 的纯前端语音转文字网页应用的技术架构和实现方案。应用采用 WebAssembly 技术在浏览器中运行 Whisper 模型，通过 Web Audio API 处理音频输入，实现完全本地化的语音转录功能。

## 架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   录音控制   │  │  文件上传   │  │  转录结果   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                        应用逻辑层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  音频管理器  │  │  转录管理器  │  │  状态管理器  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                        Web API 层                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Web Audio   │  │MediaRecorder│  │ Web Workers │        │
│  │     API     │  │     API     │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      WhisperCPP 层                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ WASM 模块   │  │  Tiny 模型  │  │  音频预处理  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈选择

- **前端框架**: Vanilla JavaScript + 现代 ES6+ 语法（无框架，性能优先）
- **构建工具**: Vite（快速开发，模块打包，适合 Vercel 部署）
- **WebAssembly**: whisper.cpp 编译版本
- **音频处理**: Web Audio API + MediaRecorder API
- **并发处理**: Web Workers
- **样式**: 现代 CSS + CSS Grid/Flexbox + CSS 自定义属性
- **部署**: Vercel 静态部署

#### 不使用前端框架的原因
1. **性能考虑**: 减少 JavaScript 包体积，加快首屏加载（模型文件已经较大）
2. **简单够用**: UI 复杂度不高，状态管理相对简单
3. **精确控制**: 音频处理和 WebAssembly 集成需要更直接的控制
4. **部署优化**: 更小的构建产物，更适合 Vercel 的静态部署

## 组件和接口

### 核心组件

#### 1. AudioManager（音频管理器）
```javascript
class AudioManager {
  // 麦克风录音管理
  async requestMicrophoneAccess()
  startRecording()
  stopRecording()
  
  // 文件处理
  handleFileUpload(file)
  validateAudioFormat(file)
  
  // 音频预处理
  convertToWAV(audioData)
  splitAudioChunks(audioData, chunkSize)
}
```

#### 2. TranscriptionManager（转录管理器）
```javascript
class TranscriptionManager {
  // 模型管理
  async loadWhisperModel()
  
  // 转录处理
  async transcribeAudio(audioData, language)
  async transcribeRealtime(audioChunks)
  
  // 语言处理
  detectLanguage(audioData)
  setLanguage(languageCode)
}
```

#### 3. UIController（界面控制器）
```javascript
class UIController {
  // 录音界面
  updateRecordingStatus(isRecording, duration)
  showRecordingIndicator()
  
  // 转录结果
  displayTranscriptionResult(text, isPartial)
  updateRealtimeText(newText)
  
  // 状态管理
  showLoadingState()
  showErrorMessage(error)
  showLanguageSelector()
}
```

#### 4. WhisperWorker（Web Worker）
```javascript
// whisper-worker.js
class WhisperWorker {
  // 在后台线程运行
  async initializeModel()
  async processAudioChunk(audioData, options)
  postMessage(result) // 发送结果回主线程
}
```

### 接口定义

#### 音频数据接口
```typescript
interface AudioData {
  buffer: ArrayBuffer;
  sampleRate: number;
  channels: number;
  duration: number;
}

interface TranscriptionOptions {
  language?: string; // 'auto', 'zh', 'en'
  isRealtime?: boolean;
  chunkIndex?: number;
}

interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  isPartial: boolean;
  timestamp?: number;
}
```

## 数据模型

### 应用状态模型
```javascript
const AppState = {
  // 录音状态
  recording: {
    isActive: false,
    duration: 0,
    chunks: []
  },
  
  // 转录状态
  transcription: {
    isProcessing: false,
    currentText: '',
    partialResults: [],
    language: 'auto'
  },
  
  // 模型状态
  model: {
    isLoaded: false,
    loadingProgress: 0,
    error: null
  },
  
  // UI 状态
  ui: {
    activeTab: 'record', // 'record' | 'upload'
    showLanguageSelector: false,
    theme: 'dark'
  }
};
```

### 音频处理流程
```javascript
const AudioProcessingPipeline = {
  // 1. 音频获取
  input: 'microphone | file',
  
  // 2. 格式转换
  conversion: {
    targetFormat: 'WAV',
    sampleRate: 16000,
    channels: 1
  },
  
  // 3. 分块处理（实时转录）
  chunking: {
    chunkSize: '2-3 seconds',
    overlap: '0.5 seconds',
    bufferSize: 4096
  },
  
  // 4. 模型处理
  processing: {
    model: 'whisper-tiny-q4',
    language: 'auto | zh | en',
    output: 'text + confidence'
  }
};
```

## 错误处理

### 错误类型和处理策略

#### 1. 权限错误
```javascript
class PermissionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PermissionError';
  }
}

// 处理策略：显示友好提示，提供重试选项
```

#### 2. 模型加载错误
```javascript
class ModelLoadError extends Error {
  constructor(message, retryable = true) {
    super(message);
    this.name = 'ModelLoadError';
    this.retryable = retryable;
  }
}

// 处理策略：显示加载进度，提供重试机制
```

#### 3. 音频处理错误
```javascript
class AudioProcessingError extends Error {
  constructor(message, audioData = null) {
    super(message);
    this.name = 'AudioProcessingError';
    this.audioData = audioData;
  }
}

// 处理策略：降级处理，提供格式转换建议
```

### 错误恢复机制
- **自动重试**: 网络相关错误自动重试 3 次
- **降级处理**: 实时转录失败时切换到批量处理
- **用户引导**: 提供清晰的错误信息和解决建议
- **状态恢复**: 错误后恢复到上一个稳定状态

## 测试策略

### 单元测试
- **AudioManager**: 测试音频录制、文件处理、格式转换
- **TranscriptionManager**: 测试模型加载、转录功能、语言检测
- **UIController**: 测试界面更新、状态显示、用户交互

### 集成测试
- **端到端录音流程**: 从录音开始到转录结果显示
- **文件上传流程**: 从文件选择到转录完成
- **实时转录流程**: 测试分块处理和实时更新
- **错误处理流程**: 测试各种错误场景的处理

### 性能测试
- **模型加载时间**: 测试不同网络条件下的加载性能
- **转录速度**: 测试不同长度音频的处理时间
- **内存使用**: 测试长时间录音的内存占用
- **移动设备兼容性**: 测试在不同移动设备上的性能

### 浏览器兼容性测试
- **Chrome/Edge**: 主要支持浏览器
- **Firefox**: 测试 WebAssembly 兼容性
- **Safari**: 测试 iOS 设备兼容性
- **移动浏览器**: 测试触摸交互和响应式布局

## 部署和优化

### Vercel 部署配置
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### 性能优化策略
- **模型预加载**: 在用户交互前开始加载模型
- **Web Workers**: 避免阻塞主线程
- **音频压缩**: 优化音频数据传输
- **缓存策略**: 缓存模型文件和转录结果
- **懒加载**: 按需加载非核心功能

### 资源优化
- **WASM 文件压缩**: 使用 gzip 压缩 WebAssembly 文件
- **代码分割**: 分离核心功能和辅助功能
- **CDN 加速**: 利用 Vercel CDN 加速资源加载
- **预连接**: 预连接到模型文件 CDN