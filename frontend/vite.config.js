import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), basicSsl()],
  server: {
    proxy: {
      '/api': process.env.BACKEND_API_URL || 'http://localhost:3001'
    },
    https: true,
  }
})
