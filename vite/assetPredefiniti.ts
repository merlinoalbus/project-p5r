// ============================================================
// Plugin Vite — manifest automatico degli asset grafici predefiniti (public/asset/)
// ============================================================
//
// Gli asset generati (vedi docs/grafica/prompt-immagini.md) vengono semplicemente copiati in
// `public/asset/<categoria>/<nome-file>`: nessun elenco da mantenere a mano.
//   - in sviluppo il plugin serve `/asset/manifest.json` calcolandolo a ogni richiesta (un file
//     appena copiato compare al prossimo ricaricamento);
//   - in build emette `asset/manifest.json` nella cartella di uscita accanto ai file copiati da public/.
// Il manifest mappa la chiave canonica (percorso relativo senza estensione, in slug) all'URL del file:
//   { "arcani/fool": "/asset/arcani/fool.png", "persona/jack-frost": "/asset/persona/jack-frost.webp", … }
// Se una chiave ha più estensioni vince la prima nell'ordine ESTENSIONI (webp, png, svg, jpg, jpeg, gif).
// Il frontend, se il manifest manca o è vuoto, usa i segnaposto testuali: l'app funziona senza grafica.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { slugPercorso } from '../shared/slug.ts';

/** Estensioni ammesse, in ordine di preferenza a parità di chiave. */
export const ESTENSIONI = ['webp', 'png', 'svg', 'jpg', 'jpeg', 'gif'] as const;

export interface ManifestAsset {
  generato: string;
  totale: number;
  /** chiave canonica → URL pubblico. */
  file: Record<string, string>;
}

function elencaFile(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const voce of fs.readdirSync(dir, { withFileTypes: true })) {
    const pieno = path.join(dir, voce.name);
    if (voce.isDirectory()) out.push(...elencaFile(pieno, base));
    else if (voce.isFile()) out.push(path.relative(base, pieno).replace(/\\/g, '/'));
  }
  return out.sort();
}

/** Scansiona `dirAsset` e costruisce il manifest; `prefissoUrl` è il percorso pubblico della cartella (default `/asset`). */
export function scansionaAsset(dirAsset: string, prefissoUrl = '/asset', adesso: () => string = () => new Date().toISOString()): ManifestAsset {
  const file: Record<string, string> = {};
  const priorita: Record<string, number> = {};
  for (const rel of elencaFile(dirAsset)) {
    const est = path.extname(rel).slice(1).toLowerCase();
    const indice = (ESTENSIONI as readonly string[]).indexOf(est);
    if (indice < 0) continue;
    const chiave = slugPercorso(rel.slice(0, rel.length - est.length - 1));
    if (!chiave) continue;
    if (chiave in file && priorita[chiave] <= indice) continue;
    file[chiave] = `${prefissoUrl}/${rel.split('/').map(encodeURIComponent).join('/')}`;
    priorita[chiave] = indice;
  }
  return { generato: adesso(), totale: Object.keys(file).length, file };
}

/** Plugin: `/asset/manifest.json` dinamico in dev, file emesso in build. */
export function pluginAssetPredefiniti(opzioni: { dirPublic?: string } = {}): Plugin {
  let dirAsset = path.resolve(opzioni.dirPublic ?? 'public', 'asset');
  return {
    name: 'p5r-asset-predefiniti',
    configResolved(config) {
      dirAsset = path.resolve(config.publicDir || opzioni.dirPublic || 'public', 'asset');
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/asset/manifest.json') return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(scansionaAsset(dirAsset)));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'asset/manifest.json', source: JSON.stringify(scansionaAsset(dirAsset), null, 2) });
    },
  };
}
