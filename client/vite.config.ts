import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'client',
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  build: {
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          socketio: ['socket.io-client'],
        },
      },
    },
  },
});

