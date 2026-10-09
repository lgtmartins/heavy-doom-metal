import { defineConfig } from 'vite';

// base './' deixa o build estático funcionar em qualquer pasta (ex.: GitHub Pages, itch.io).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
