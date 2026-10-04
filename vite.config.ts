import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { pluginAssetPredefiniti } from './vite/assetPredefiniti.ts'

// Tailwind 4 tramite plugin Vite ufficiale: raccoglie l'`@import "tailwindcss"`
// in src/tailwind.css e genera le utility a richiesta (config CSS-first).
//
// Porte scelte per NON collidere con project-jira (5173/3001):
//   FE 5273 → proxy /api → BE 3101.
// Vengono da .env come per il server e gli script (`FE_PORT`; `BE_PORT`, poi `PORT`): prima erano scritte qui a mano
// (rilievo S5 della verifica completa).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const portaFe = Number(env.FE_PORT || 5273)
  const portaBe = Number(env.BE_PORT || env.PORT || 3101)
  return {
    plugins: [react(), tailwindcss(), pluginAssetPredefiniti()],
    server: {
      port: portaFe,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://localhost:${portaBe}`,
          changeOrigin: true,
        },
      },
    },
  }
})
