import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { pluginAssetPredefiniti } from './vite/assetPredefiniti.ts'

// Tailwind 4 tramite plugin Vite ufficiale: raccoglie l'`@import "tailwindcss"`
// in src/tailwind.css e genera le utility a richiesta (config CSS-first).
//
// Porte scelte per NON collidere con project-jira (5173/3001):
//   FE 5273 → proxy /api → BE 3101.
export default defineConfig({
  plugins: [react(), tailwindcss(), pluginAssetPredefiniti()],
  server: {
    port: 5273,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3101',
        changeOrigin: true,
      },
    },
  },
})
