/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    // The Auth0 callback URL is registered for http://localhost:3000 —
    // strictPort makes a taken port a loud failure instead of a silent
    // bind to 3001 that breaks login.
    port: 3000,
    strictPort: true,
    proxy: {
      // Same-origin API in dev (no CORS anywhere): nginx does the same in prod.
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
