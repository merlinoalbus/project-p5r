import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { pluginAssetPredefiniti } from './vite/assetPredefiniti.ts';
export default defineConfig({
  plugins: [react(), tailwindcss(), pluginAssetPredefiniti()],
  server: { port: 5290, strictPort: true, proxy: { '/api': { target: 'http://localhost:3101', changeOrigin: true } } },
});
