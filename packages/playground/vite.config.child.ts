import { defineConfig } from 'vite';
import { resolve } from 'path';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig(({ command }) => ({
  plugins: command === 'serve' ? [mkcert()] : [],
  root: resolve(__dirname, 'child'),
  server: {
    port: 5174,
  },
  build: {
    outDir: resolve(__dirname, 'dist/child'),
    emptyOutDir: true,
  },
}));
