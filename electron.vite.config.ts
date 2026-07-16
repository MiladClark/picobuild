import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['sharp']
      }
    }
  },
  preload: {},
  renderer: {
    publicDir: resolve('src/renderer/public'),
    server: {
      port: 3013,
      strictPort: true
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [tailwindcss(), react()],
    optimizeDeps: {
      exclude: ['onnxruntime-web']
    }
  }
})
