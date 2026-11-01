import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { pluginAssetPredefiniti } from './vite/assetPredefiniti.ts'
import { pluginMiniatureAsset } from './vite/miniatureAsset.ts'

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
    plugins: [react(), tailwindcss(), pluginAssetPredefiniti(), pluginMiniatureAsset()],
    build: {
      rolldownOptions: {
        output: {
          // L5-06: le librerie stabili in file propri. Prima stavano dentro il file d'ingresso e dentro i file condivisi dell'app, il cui nome
          // (con l'hash del contenuto) cambia a ogni rilascio: chi aveva già l'app doveva riscaricare anche React e il router. Così il loro
          // hash cambia solo quando cambia la versione di una di loro. Solo le librerie elencate: nessun gruppo «tutto node_modules», che
          // porterebbe nel caricamento iniziale anche quelle usate solo dalle pagine caricate a richiesta. Zod era già nel caricamento iniziale
          // (lo importano moduli condivisi dell'ingresso); i byte iniziali restano di fatto gli stessi (misura di L5): il guadagno è nei
          // rilasci successivi. Il file d'ingresso
          // resta `index-<hash>.js` (`utils/versioneApp.ts` lo riconosce dal nome); i nomi dei gruppi non devono mai chiamarsi `index`.
          codeSplitting: {
            // un gruppo solo: le quattro librerie stanno comunque tutte nel caricamento iniziale, e a freddo con «Slow 4G» quattro file
            // separati ritardavano l'avvio per il numero di richieste (misura di L5)
            groups: [
              { name: 'vendor', test: /[\\/]node_modules[\\/](?:react|react-dom|scheduler|react-router|react-router-dom|cookie|set-cookie-parser|zustand|zod)[\\/]/, priority: 10 },
            ],
          },
        },
      },
    },
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
