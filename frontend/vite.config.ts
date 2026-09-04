import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 0.0.0.0 para que el contenedor exponga el dev server al navegador del host.
    host: true,
  },
  preview: {
    port: 5173,
    host: true,
  },
});
