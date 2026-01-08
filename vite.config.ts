import { defineConfig } from 'vite';
import { resolve } from 'path';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [mkcert()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'forgeframe',
    },
    rollupOptions: {
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
