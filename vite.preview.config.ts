import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// Standalone renderer preview (no Electron) for visual UI work.
export default defineConfig({
  root: resolve('src/renderer'),
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared')
    }
  },
  server: { port: 3014, strictPort: true }
})
