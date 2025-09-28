import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 5173)
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 4173)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      libs: path.resolve(__dirname, '../../libs'),
      apps: path.resolve(__dirname, '..')
    }
  }
});
