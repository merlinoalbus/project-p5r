// ============================================================
// fontService — font dell'utente per i tre ruoli tipografici (display, menu, decor)
// ============================================================
//
// I file dei font NON entrano mai nel repository né nell'immagine Docker: vivono nella cartella dati
// dell'istanza (`DATA_DIR/font/<ruolo>.<formato>`) e vengono serviti al frontend, che genera le regole
// `@font-face` all'avvio. Senza file caricati l'app usa i font predefiniti liberi inclusi in `public/font/`.
// Nessuna tabella: il filesystem è l'unica fonte di verità (un file per ruolo).
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { httpErrors } from '../utils/httpError.js';
import type { FontDto, FormatoFont, RuoloFont } from '../../shared/types.js';

export const RUOLI_FONT = ['display', 'menu', 'decor'] as const;
export const FORMATI_FONT = ['ttf', 'otf', 'woff', 'woff2'] as const;
export const MAX_BYTE_FONT = 4 * 1024 * 1024;

const MIME_PER_FORMATO: Record<FormatoFont, string> = { ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' };

function dirFont(): string {
  return path.join(config.dataDir, 'font');
}

/** Riconosce il formato dal contenuto (firma dei primi 4 byte), indipendentemente dal Content-Type dichiarato. */
export function rilevaFormatoFont(contenuto: Buffer): FormatoFont | null {
  if (contenuto.length < 4) return null;
  const firma = contenuto.subarray(0, 4);
  if (firma.equals(Buffer.from([0, 1, 0, 0]))) return 'ttf';
  const testo = firma.toString('latin1');
  if (testo === 'true') return 'ttf';
  if (testo === 'OTTO') return 'otf';
  if (testo === 'wOFF') return 'woff';
  if (testo === 'wOF2') return 'woff2';
  return null;
}

function trovaFile(ruolo: RuoloFont): { percorso: string; formato: FormatoFont; byte: number; aggiornato: string } | null {
  const dir = dirFont();
  if (!fs.existsSync(dir)) return null;
  for (const formato of FORMATI_FONT) {
    const percorso = path.join(dir, `${ruolo}.${formato}`);
    if (fs.existsSync(percorso)) {
      const st = fs.statSync(percorso);
      return { percorso, formato, byte: st.size, aggiornato: st.mtime.toISOString() };
    }
  }
  return null;
}

function dto(ruolo: RuoloFont): FontDto {
  const f = trovaFile(ruolo);
  return f
    ? { ruolo, presente: true, formato: f.formato, byte: f.byte, aggiornato: f.aggiornato, url: `/api/font/${ruolo}/file` }
    : { ruolo, presente: false, formato: null, byte: 0, aggiornato: null, url: null };
}

/** Stato dei tre ruoli (presente o assente, formato, dimensione, URL del file). */
export function elencaFont(): FontDto[] {
  return RUOLI_FONT.map(dto);
}

/** Percorso e mime del file di un ruolo (per l'invio). */
export function fileFont(ruolo: RuoloFont): { percorso: string; mime: string } {
  const f = trovaFile(ruolo);
  if (!f) throw httpErrors.notFound('font-non-caricato', `Nessun font caricato per il ruolo '${ruolo}'.`);
  return { percorso: f.percorso, mime: MIME_PER_FORMATO[f.formato] };
}

/** Salva (o sostituisce) il font di un ruolo: il formato è dedotto dal contenuto; il file precedente viene rimosso. */
export function salvaFont(ruolo: RuoloFont, contenuto: Buffer): FontDto {
  if (contenuto.length === 0) throw httpErrors.badRequest('font-vuoto', 'Il file del font è vuoto.');
  if (contenuto.length > MAX_BYTE_FONT) throw httpErrors.badRequest('font-troppo-grande', `Il font supera ${MAX_BYTE_FONT / 1024 / 1024} MB.`);
  const formato = rilevaFormatoFont(contenuto);
  if (!formato) throw httpErrors.badRequest('formato-font-non-ammesso', 'Il file non è un font riconosciuto: usa TTF, OTF, WOFF o WOFF2.');
  const dir = dirFont();
  fs.mkdirSync(dir, { recursive: true });
  const definitivo = path.join(dir, `${ruolo}.${formato}`);
  const temporaneo = `${definitivo}.tmp`;
  fs.writeFileSync(temporaneo, contenuto);
  fs.renameSync(temporaneo, definitivo);
  for (const altro of FORMATI_FONT) {
    if (altro !== formato) fs.rmSync(path.join(dir, `${ruolo}.${altro}`), { force: true });
  }
  return dto(ruolo);
}

/** Rimuove il font di un ruolo (l'app torna al predefinito). */
export function eliminaFont(ruolo: RuoloFont): void {
  const f = trovaFile(ruolo);
  if (!f) throw httpErrors.notFound('font-non-caricato', `Nessun font caricato per il ruolo '${ruolo}'.`);
  fs.rmSync(f.percorso, { force: true });
}
