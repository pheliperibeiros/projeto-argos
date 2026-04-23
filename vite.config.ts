import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api-receita': {
        target: 'https://receitaws.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-receita/, '')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'vis-network': path.resolve(__dirname, 'node_modules/vis-network/standalone/umd/vis-network.min.js'),
    },
  },
})
