import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    headers: {
      // 必需的跨域头，支持 SharedArrayBuffer 和 Web Workers
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  preview: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  // Worker 配置
  worker: {
    format: 'es'
  },
  // 优化依赖，排除可能导致问题的大型库
  optimizeDeps: {
    exclude: ['@xenova/transformers']
  }
})
