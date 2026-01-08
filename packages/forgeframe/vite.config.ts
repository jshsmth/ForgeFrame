import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'forgeframe',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {},
        exports: 'named',
      },
    },
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2022',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
