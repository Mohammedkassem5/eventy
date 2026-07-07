import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // كل /api يروح للباك إند → same-origin، الكوكيز تشتغل بدون CORS
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  preview: {
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/](@tanstack|axios|zustand)[\\/]/.test(id)) return 'vendor-data';
          if (/[\\/](swiper|aos|react-icons|framer-motion)[\\/]/.test(id)) return 'vendor-ui';
          return 'vendor';
        },
      },
    },
  },
})
