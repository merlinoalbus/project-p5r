// ============================================================
// Plugin Vite — varianti WebP in miniatura degli asset del compendio (R12-03, gruppo «immagini-compendio»)
// ============================================================
//
// Le Persona e le carte/icone degli arcani (`public/asset/persona/`, `public/asset/arcani/`) sono PNG da centinaia di KB mostrati in
// riquadri da 16 a 150 px (vedi `shared/miniature.ts`, che spiega la convenzione sui nomi). Qui si generano le varianti larghe 160, 320 e
// 640 px, in WebP:
//   - in build: ogni variante diventa un file emesso in `asset/mini/<larghezza>/<famiglia>/<nome>.webp` accanto agli originali copiati da
//     `public/`; le immagini si decodificano una volta sola e si ridimensionano alle tre misure;
//   - in sviluppo: la stessa variante si genera alla prima richiesta di `/asset/mini/…` e si tiene in memoria;
//   - in entrambi i casi un file già convertito si riusa da `node_modules/.cache/p5r-miniature-asset` finché la sorgente (dimensione e
//     data) e la generazione dell'algoritmo non cambiano: la seconda build non converte niente.
// sharp è già una dipendenza del progetto (le miniature del database). Se non si carica la build FALLISCE: pubblicare un frontend che
// chiede varianti inesistenti darebbe riquadri senza immagine (il frontend ha comunque la riserva sull'originale, ma qui non si conta su quella).
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { FAMIGLIE_ASSET_CON_MINIATURE, LARGHEZZE_MINIATURA_ASSET, QUALITA_MINIATURA_ASSET, type LarghezzaMiniaturaAsset } from '../shared/miniature.ts';
import { ESTENSIONI } from './assetPredefiniti.ts';

/** Cambia quando cambia il modo di calcolare le varianti: le righe della cache di disco di prima non valgono più. */
const GENERAZIONE = 'a1';

/** Le estensioni da cui si ricava una variante (gli SVG e le GIF non si riducono), nell'ordine di preferenza del manifesto. */
const ESTENSIONI_RASTER = ESTENSIONI.filter((e) => e === 'webp' || e === 'png' || e === 'jpg' || e === 'jpeg');

/** Una sorgente: il percorso pubblico senza estensione (`persona/Jack Frost`, con le barre `/`) e il file su disco. */
export interface SorgenteMiniatura { percorso: string; file: string }

/** I file raster sotto `dir` (ricorsivo) come percorsi relativi a `base`, con le barre `/`, in ordine; vuoto se la cartella non esiste. */
function elencaRaster(dir: string, base: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const fuori: string[] = [];
  for (const voce of fs.readdirSync(dir, { withFileTypes: true })) {
    const pieno = path.join(dir, voce.name);
    if (voce.isDirectory()) fuori.push(...elencaRaster(pieno, base));
    else if (voce.isFile() && (ESTENSIONI_RASTER as readonly string[]).includes(path.extname(voce.name).slice(1).toLowerCase())) fuori.push(path.relative(base, pieno).replace(/\\/g, '/'));
  }
  return fuori.sort();
}

/**
 * Le sorgenti delle varianti: i raster delle famiglie con miniature. A parità di percorso senza estensione vince l'estensione preferita
 * del manifesto (`persona/x.webp` prima di `persona/x.png`), la stessa il cui URL il frontend deriva.
 */
export function elencaSorgentiMiniature(dirAsset: string): SorgenteMiniatura[] {
  const scelte = new Map<string, { file: string; priorita: number }>();
  for (const famiglia of FAMIGLIE_ASSET_CON_MINIATURE) {
    for (const rel of elencaRaster(path.join(dirAsset, famiglia), dirAsset)) {
      const est = path.extname(rel);
      const percorso = rel.slice(0, rel.length - est.length);
      const priorita = ESTENSIONI_RASTER.indexOf(est.slice(1).toLowerCase() as (typeof ESTENSIONI_RASTER)[number]);
      const attuale = scelte.get(percorso);
      if (!attuale || priorita < attuale.priorita) scelte.set(percorso, { file: path.join(dirAsset, rel), priorita });
    }
  }
  return [...scelte].map(([percorso, v]) => ({ percorso, file: v.file }));
}

/** La funzione `sharp(file)` del pacchetto. */
type Sharp = (typeof import('sharp'))['default'];

/** sharp caricato una volta; senza, la build non può produrre le varianti che il frontend chiede. */
let caricamento: Promise<Sharp> | null = null;
function caricaSharp(): Promise<Sharp> {
  caricamento ??= import('sharp').then((m) => {
    const sharp = m.default;
    sharp.cache(false);
    return sharp;
  });
  return caricamento;
}

/** La cartella di cache su disco (dentro `node_modules`, fuori da git e dal repository). */
function cartellaCache(): string {
  return path.resolve('node_modules', '.cache', 'p5r-miniature-asset');
}

/** La firma della sorgente per la cache: dimensione, data di modifica e generazione dell'algoritmo. */
function firma(file: string): string {
  const s = fs.statSync(file);
  return `${GENERAZIONE}|${s.size}|${Math.round(s.mtimeMs)}|${QUALITA_MINIATURA_ASSET}`;
}

/** La variante in cache su disco, se c'è e la firma coincide. */
function dallaCache(percorso: string, l: number, chiave: string): Buffer | null {
  const base = path.join(cartellaCache(), String(l), percorso);
  try {
    if (fs.readFileSync(`${base}.chiave`, 'utf8') !== chiave) return null;
    return fs.readFileSync(`${base}.webp`);
  } catch {
    return null;
  }
}

/** Scrive la variante nella cache su disco; un errore di scrittura non ferma niente (la cache è solo una scorciatoia). */
function inCache(percorso: string, l: number, chiave: string, dati: Buffer): void {
  const base = path.join(cartellaCache(), String(l), percorso);
  try {
    fs.mkdirSync(path.dirname(base), { recursive: true });
    fs.writeFileSync(`${base}.webp`, dati);
    fs.writeFileSync(`${base}.chiave`, chiave);
  } catch {
    /* cache non scrivibile: la prossima build converte di nuovo */
  }
}

/**
 * Le varianti di una sorgente alle larghezze date: dalla cache di disco quando la firma coincide, altrimenti convertite (la sorgente si
 * decodifica una volta sola). Mai ingrandite: un'icona larga 256 px ha la variante «320» larga 256, e il `srcset` resta corretto perché
 * il browser conta la larghezza dichiarata, non quella vera.
 */
export async function generaVarianti(s: SorgenteMiniatura, larghezze: readonly LarghezzaMiniaturaAsset[] = LARGHEZZE_MINIATURA_ASSET): Promise<Map<LarghezzaMiniaturaAsset, Buffer>> {
  const chiave = firma(s.file);
  const fuori = new Map<LarghezzaMiniaturaAsset, Buffer>();
  const mancanti: LarghezzaMiniaturaAsset[] = [];
  for (const l of larghezze) {
    const cache = dallaCache(s.percorso, l, chiave);
    if (cache) fuori.set(l, cache);
    else mancanti.push(l);
  }
  if (mancanti.length === 0) return fuori;
  const sharp = await caricaSharp();
  const originale = sharp(s.file);
  for (const l of mancanti) {
    const dati = await originale.clone().resize({ width: l, withoutEnlargement: true }).webp({ quality: QUALITA_MINIATURA_ASSET, effort: 4 }).toBuffer();
    inCache(s.percorso, l, chiave, dati);
    fuori.set(l, dati);
  }
  return fuori;
}

/** `/asset/mini/<larghezza>/<percorso>.webp` (il percorso resta codificato come negli URL del manifesto). */
const RE_RICHIESTA = /^\/asset\/mini\/(\d+)\/(.+)\.webp$/;

/** Plugin: le varianti in miniatura degli asset del compendio, emesse in build e generate a richiesta in sviluppo. */
export function pluginMiniatureAsset(opzioni: { dirPublic?: string } = {}): Plugin {
  let dirAsset = path.resolve(opzioni.dirPublic ?? 'public', 'asset');
  /** Sviluppo: le sorgenti per percorso, rilette quando una richiesta non ne trova. */
  let indice: Map<string, SorgenteMiniatura> | null = null;
  const rileggi = () => { indice = new Map(elencaSorgentiMiniature(dirAsset).map((s) => [s.percorso, s])); };
  /** Sviluppo: le varianti già generate (chiave: larghezza e percorso, più la firma della sorgente). */
  const inMemoria = new Map<string, Promise<Map<LarghezzaMiniaturaAsset, Buffer>>>();
  return {
    name: 'p5r-miniature-asset',
    configResolved(config) {
      dirAsset = path.resolve(config.publicDir || opzioni.dirPublic || 'public', 'asset');
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = RE_RICHIESTA.exec(req.url?.split('?')[0] ?? '');
        if (!m) return next();
        const l = Number(m[1]) as LarghezzaMiniaturaAsset;
        let percorso: string;
        try { percorso = decodeURIComponent(m[2]); } catch { res.statusCode = 400; res.end(); return; }
        // solo le larghezze ammesse e i percorsi delle famiglie con varianti, senza uscire dalla cartella
        const segmenti = percorso.split('/');
        if (!(LARGHEZZE_MINIATURA_ASSET as readonly number[]).includes(l) || segmenti.includes('..') || segmenti.includes('.') || percorso.includes('\\') || !(FAMIGLIE_ASSET_CON_MINIATURE as readonly string[]).includes(segmenti[0])) {
          res.statusCode = 404; res.end(); return;
        }
        if (!indice?.has(percorso)) rileggi();
        const s = indice!.get(percorso);
        if (!s) { res.statusCode = 404; res.end(); return; }
        const chiaveMem = `${percorso}|${firma(s.file)}`;
        let lavoro = inMemoria.get(chiaveMem);
        if (!lavoro) { lavoro = generaVarianti(s); inMemoria.set(chiaveMem, lavoro); }
        lavoro.then((varianti) => {
          res.setHeader('Content-Type', 'image/webp');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(varianti.get(l));
        }, () => { inMemoria.delete(chiaveMem); res.statusCode = 500; res.end(); });
      });
    },
    async generateBundle() {
      const sorgenti = elencaSorgentiMiniature(dirAsset);
      if (sorgenti.length === 0) return;
      // una conversione alla volta per sorgente, quattro sorgenti insieme: sharp ha già i suoi thread, qui basta tenerlo occupato
      let prossima = 0;
      const lavora = async () => {
        for (let i = prossima++; i < sorgenti.length; i = prossima++) {
          const s = sorgenti[i];
          let varianti: Map<LarghezzaMiniaturaAsset, Buffer>;
          try {
            varianti = await generaVarianti(s);
          } catch (e) {
            this.error(`miniature degli asset: ${s.percorso} non si converte (${e instanceof Error ? e.message : String(e)})`);
          }
          for (const [l, dati] of varianti) this.emitFile({ type: 'asset', fileName: `asset/mini/${l}/${s.percorso}.webp`, source: dati });
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, sorgenti.length) }, lavora));
    },
  };
}
