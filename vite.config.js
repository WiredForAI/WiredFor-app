import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist'
  },
  // Dev-only: the /api/* serverless functions don't run under plain `vite`,
  // and `vercel dev` crashes on Windows + Node 24 (libuv UV_HANDLE_CLOSING).
  // Proxy API calls to the live production functions instead so the locally
  // served frontend has a working backend. No effect on the production build.
  server: {
    proxy: {
      '/api': {
        target: 'https://wiredfor.ai',
        changeOrigin: true,
        secure: true,
        // The production API's CORS allow-list only accepts the apex/www origin,
        // so a POST carrying Origin: http://localhost:3000 is rejected ("Origin
        // not allowed"). Rewrite the Origin to the apex so writes work locally.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'https://wiredfor.ai');
          });
        },
      },
    },
  },
})