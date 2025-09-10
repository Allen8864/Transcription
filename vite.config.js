import { defineConfig } from 'vite'

export default defineConfig({
  // Base configuration for Vercel deployment
  base: './',

  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate WebAssembly and worker files
          'whisper-worker': ['./src/workers/whisper-worker.js']
        }
      }
    }
  },

  // Development server configuration
  server: {
    port: 3000,
    open: true,
    cors: true,
    headers: {
      // Required headers for WebAssembly and SharedArrayBuffer
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },

  // Preview server configuration (for production build testing)
  preview: {
    port: 4173,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },

  // Optimize dependencies
  optimizeDeps: {
    exclude: ['*.wasm']
  },

  // Asset handling
  assetsInclude: ['**/*.wasm']
})
