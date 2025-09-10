# 开发规范和 Git 工作流程

## Git 分支策略

### 主分支

- `main` - 生产环境分支，始终保持可部署状态
- `develop` - 开发分支，集成所有功能（可选）

### 功能分支

为每个任务创建独立的功能分支：

```bash
# 创建功能分支
git checkout -b feature/task-1-project-setup
git checkout -b feature/task-2-html-css
git checkout -b feature/task-3-audio-manager
```

## 提交规范

### 提交信息格式

```
<类型>(<范围>): <描述>

[可选的正文]

[可选的脚注]
```

### 提交类型

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式、样式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建工具、依赖管理
- `perf`: 性能优化

### 提交示例

```bash
git commit -m "feat(audio): 实现麦克风录音功能"
git commit -m "fix(ui): 修复移动端布局问题"
git commit -m "docs: 更新 API 文档"
git commit -m "test(transcription): 添加转录功能单元测试"
```

## 开发工作流程

### 1. 开始新任务

```bash
# 确保在最新的 main 分支
git checkout main
git pull origin main

# 创建功能分支
git checkout -b feature/task-number-description

# 例如：
git checkout -b feature/task-3-audio-manager
```

### 2. 开发过程中

```bash
# 频繁提交，保持小而专注的提交
git add .
git commit -m "feat(audio): 添加 AudioManager 基础类"

git add .
git commit -m "feat(audio): 实现麦克风权限请求"

git add .
git commit -m "test(audio): 添加 AudioManager 单元测试"
```

### 3. 完成功能

```bash
# 确保所有测试通过
npm test

# 确保代码格式正确
npm run lint
npm run format

# 最终提交
git add .
git commit -m "feat(audio): 完成音频管理器功能实现"
```

### 4. 合并到主分支

```bash
# 切换到主分支
git checkout main

# 拉取最新更改
git pull origin main

# 合并功能分支
git merge feature/task-3-audio-manager

# 推送到远程
git push origin main

# 删除功能分支（可选）
git branch -d feature/task-3-audio-manager
```

## 任务开发建议

### 每个任务的开发步骤

1. **创建功能分支**
2. **实现核心功能** - 先写基础实现
3. **添加测试** - 确保功能正确性
4. **完善错误处理** - 添加边界情况处理
5. **更新文档** - 更新相关文档
6. **代码审查** - 自我审查代码质量
7. **合并到主分支**

### 提交频率建议

- 每完成一个小功能就提交
- 每修复一个 bug 就提交
- 每添加一组测试就提交
- 避免一次性提交大量更改

### 代码质量检查

```bash
# 运行 linter
npm run lint

# 格式化代码
npm run format

# 运行测试
npm test

# 构建检查
npm run build
```

## 版本标签

在重要的里程碑创建版本标签：

```bash
# 创建标签
git tag -a v0.1.0 -m "完成基础项目设置"
git tag -a v0.2.0 -m "完成音频录制功能"
git tag -a v0.3.0 -m "完成实时转录功能"

# 推送标签
git push origin --tags
```

## 远程仓库设置

```bash
# 添加远程仓库（GitHub/GitLab）
git remote add origin https://github.com/username/whisper-web-transcription.git

# 首次推送
git push -u origin main
```

## 协作开发

如果有多人协作：

```bash
# 推送功能分支供他人审查
git push origin feature/task-3-audio-manager

# 创建 Pull Request/Merge Request
# 在 GitHub/GitLab 界面操作
```
