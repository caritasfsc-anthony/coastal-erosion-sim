import { defineConfig } from 'vite';

// GitHub Pages serves this project at https://caritasfsc-anthony.github.io/coastal-erosion-sim/
// so production builds need that sub-path as the base. The dev server keeps '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/coastal-erosion-sim/' : '/',
  server: { host: '0.0.0.0', port: 5173, strictPort: false },
  preview: { host: '0.0.0.0', port: 4173 },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
}));
