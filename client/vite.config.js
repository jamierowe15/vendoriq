import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Forward /api calls to Express so the browser doesn't hit CORS errors in development
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:4000' } }
});

