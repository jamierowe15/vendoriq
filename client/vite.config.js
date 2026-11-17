import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // In development, send /api calls to Express so you don't fight CORS locally
  build: { chunkSizeWarningLimit: 800 },
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } }
});
