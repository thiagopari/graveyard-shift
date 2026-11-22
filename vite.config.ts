import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/** One dist/ for GitHub Pages: landing page plus both apps. Relative base so it works under /<repo>/. */
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        landing: resolve(__dirname, 'index.html'),
        'mussel-memory': resolve(__dirname, 'mussel-memory/index.html'),
        'bridge-troll': resolve(__dirname, 'bridge-troll/index.html'),
      },
    },
  },
});
