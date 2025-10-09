import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 5174),
    allowedHosts: true
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 4174),
    allowedHosts: true
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      {
        find: /^shared\/libs\/(.*)$/,
        replacement: path.resolve(__dirname, '../../../shared/libs') + '/$1/src'
      },
      { find: 'shared/libs', replacement: path.resolve(__dirname, '../../../shared/libs') },
      {
        find: /^shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../../../shared') + '/$1'
      },
      { find: 'shared', replacement: path.resolve(__dirname, '../../../shared') }
    ]
  }
});
