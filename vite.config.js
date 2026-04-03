import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    proxy: {
      // Use /api prefix so document requests (e.g. GET /agents for the page) are not proxied
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // Critical for SSE: disable Vite proxy response buffering so each
        // event-stream chunk is forwarded to the browser immediately.
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const ct = proxyRes.headers['content-type'] || '';
            if (ct.includes('text/event-stream')) {
              proxyRes.socket.setNoDelay(true);
            }
          });
        },
      },
    },
  },
});
