import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // This makes the build compatible with GitHub Pages
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});