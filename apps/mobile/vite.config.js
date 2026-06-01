import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
  },
  preview: {
    host: '127.0.0.1',
  },
  appType: 'spa',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          'vendor-lucide': ['lucide-react'],
          'vendor-qr': ['html5-qrcode'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
