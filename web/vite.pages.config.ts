import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs allow the same build to work from any GitHub Pages
  // project subpath as well as a local preview server.
  base: './',
  css: { postcss: { plugins: [tailwindcss()] } },
  define: { __THENGA_STATIC_DEMO__: JSON.stringify(true) },
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  build: {
    outDir: 'dist-pages',
    emptyOutDir: true,
  },
});
