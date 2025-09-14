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
  }
})
