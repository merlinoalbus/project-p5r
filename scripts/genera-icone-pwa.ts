// ============================================================
// genera-icone-pwa — le icone PNG del manifesto web, ricavate dal logo del sito (public/favicon.svg)
// ============================================================
//
//   npx tsx scripts/genera-icone-pwa.ts
//
// Non fa parte della build: si lancia a mano quando cambia il logo e i PNG risultanti (public/pwa/) stanno nel repository, così la build e
// l'immagine Docker non hanno bisogno di `sharp` per produrli. Usa `sharp`, già dipendenza del progetto (miniature delle immagini): nessuna
// dipendenza nuova. Il logo non ha altra fonte grafica in `public/` (le immagini predefinite `identita/*` non ci sono), quindi si parte
// dalle due forme del favicon e se ne ridisegna lo sfondo per ogni uso:
//   - «any» (192 e 512): il favicon com'è, con gli angoli arrotondati su fondo trasparente;
//   - «maskable» (512): fondo pieno a tutto quadro e logo ridotto al 62 % al centro, dentro la zona sicura (cerchio di raggio 40 %) che
//     Android può ritagliare in qualsiasi forma;
//   - apple-touch-icon (180): fondo pieno a tutto quadro (iOS ritaglia da sé gli angoli e riempie di nero la trasparenza), logo al 78 %.
// Il colore di fondo è quello del tema (`--color-bg` di src/tailwind.css, anche nel favicon): se cambia là, cambia qui e nel manifesto.
// ============================================================

import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/** Sfondo del tema scuro (`--color-bg`). */
const SFONDO = '#0b0b0e';

const radice = path.resolve(import.meta.dirname, '..');
const cartellaUscita = path.join(radice, 'public', 'pwa');

/** Le sole forme del logo: tutto ciò che nel favicon segue il rettangolo di fondo. */
function formeDelLogo(): string {
  const svg = readFileSync(path.join(radice, 'public', 'favicon.svg'), 'utf8');
  const forme = svg.replace(/<svg[^>]*>/, '').replace('</svg>', '').replace(/<rect[^>]*\/>/, '').trim();
  if (!forme.includes('<path')) throw new Error('public/favicon.svg: forme del logo non trovate');
  return forme;
}

/** Logo di lato 32 (come il favicon) ridotto di `scala` e centrato, su un fondo pieno o trasparente. */
function svgIcona(forme: string, scala: number, fondo: 'pieno' | 'arrotondato'): string {
  const spostamento = (32 - 32 * scala) / 2;
  const sfondo = fondo === 'pieno'
    ? `<rect width="32" height="32" fill="${SFONDO}"/>`
    : `<rect width="32" height="32" rx="6" fill="${SFONDO}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${sfondo}<g transform="translate(${spostamento} ${spostamento}) scale(${scala})">${forme}</g></svg>`;
}

/** Scrive un PNG quadrato di lato `lato` a partire dall'SVG. */
async function scrivi(nomeFile: string, svg: string, lato: number): Promise<void> {
  // densità alta: l'SVG è di 32 unità e si rasterizza a `lato` pixel senza sfocature
  await sharp(Buffer.from(svg), { density: Math.ceil((72 * lato) / 32) * 2 })
    .resize(lato, lato)
    .png({ compressionLevel: 9 })
    .toFile(path.join(cartellaUscita, nomeFile));
  console.log(`public/pwa/${nomeFile} (${lato}x${lato})`);
}

async function main(): Promise<void> {
  mkdirSync(cartellaUscita, { recursive: true });
  const forme = formeDelLogo();
  await scrivi('icona-192.png', svgIcona(forme, 1, 'arrotondato'), 192);
  await scrivi('icona-512.png', svgIcona(forme, 1, 'arrotondato'), 512);
  await scrivi('icona-maschera-512.png', svgIcona(forme, 0.62, 'pieno'), 512);
  await scrivi('apple-touch-icon.png', svgIcona(forme, 0.78, 'pieno'), 180);
}

main().catch((errore: unknown) => {
  console.error(errore);
  process.exitCode = 1;
});
