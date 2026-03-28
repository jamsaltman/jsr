import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const demoDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ralphthon/self-heal-runtime': path.resolve(demoDir, '../../packages/self-heal-runtime/src/index.ts')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api/self-heal/patch': 'http://localhost:5050'
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
});
