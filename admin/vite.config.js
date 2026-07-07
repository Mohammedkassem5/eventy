import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// لوحة الأدمن — بورت 5174 (مسموح في CORS بالباك إند)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
