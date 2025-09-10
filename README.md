# WhisperCPP 语音转文字网页应用

基于 WhisperCPP 的纯前端语音转文字网页应用，支持实时录音转录和音频文件上传转录。

## 功能特性

- 🎤 **实时录音转录** - 边录音边显示转录结果
- 📁 **文件上传转录** - 支持多种音频格式（mp3, wav, m4a, ogg）
- 🌐 **自动语言识别** - 支持中文、英文自动检测
- 🎨 **美观界面** - 深色主题，响应式设计
- 🔒 **隐私保护** - 所有处理在浏览器本地完成
- ⚡ **高性能** - 基于 WebAssembly 的 Whisper Tiny 模型

## 技术栈

- **前端**: Vanilla JavaScript + Vite
- **音频处理**: Web Audio API + MediaRecorder API
- **AI 模型**: WhisperCPP WebAssembly
- **部署**: Vercel

## 开发规范

### Git 工作流程

1. **功能开发**: 为每个功能创建独立分支
   ```bash
   git checkout -b feature/功能名称
   ```

2. **提交规范**: 使用语义化提交信息
   ```bash
   git commit -m "feat: 添加录音功能"
   git commit -m "fix: 修复音频格式转换问题"
   git commit -m "docs: 更新 README 文档"
   ```

3. **合并流程**: 功能完成后合并到主分支
   ```bash
   git checkout main
   git merge feature/功能名称
   ```

### 提交类型

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建工具、依赖更新

## 项目结构

```
whisper-web-transcription/
├── src/
│   ├── components/          # UI 组件
│   ├── managers/           # 核心管理器
│   ├── workers/            # Web Workers
│   ├── utils/              # 工具函数
│   └── styles/             # 样式文件
├── public/                 # 静态资源
├── tests/                  # 测试文件
└── docs/                   # 文档
```

## 开发指南

### 环境要求

- Node.js 16+
- 现代浏览器（支持 WebAssembly）

### 安装和运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 预览构建结果
npm run preview
```

## 部署

项目配置为自动部署到 Vercel，推送到 main 分支即可触发部署。

## 许可证

MIT License