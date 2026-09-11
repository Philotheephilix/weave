import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'renderer'),
  build: {
    outDir: path.resolve(__dirname, 'renderer/out'),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      // ensure browser-safe builds: polyfill or stub Node builtins only as needed
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'viem', 'nostr-tools'],
  },
})
