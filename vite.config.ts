import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ExpiryMate is fully offline-first: no external APIs are called at build
// or run time. The service worker (public/sw.js) is registered manually
// in src/main.tsx so this stays dependency-free and easy to audit.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5173
  }
});
