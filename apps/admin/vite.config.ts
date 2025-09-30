import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 5173),
    allowedHosts: true
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 4173),
    allowedHosts: true
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: /^libs\/(.*)$/, replacement: path.resolve(__dirname, '../../libs') + '/$1/src' },
      { find: 'libs', replacement: path.resolve(__dirname, '../../libs') },
      { find: /^apps\/(.*)$/, replacement: path.resolve(__dirname, '..') + '/$1/src' },
      { find: 'apps', replacement: path.resolve(__dirname, '..') }
    ]
  }
});
