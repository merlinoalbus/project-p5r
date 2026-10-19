// ============================================================
// immagineMappa — l'immagine di una mappa e il suo ruolo, da un posto solo (L1, 2026-10-20)
// ============================================================
//
// Il risolutore unico del server: quale immagine caricata appartiene a una mappa (`caricataDellaMappa`), con quale URL la si
// chiede (`urlCaricata`, sempre versionato) e quale ruolo ha (`allineaRuoliImmagine`, la regola di `shared/immaginiMappa.ts`).
// Ogni strada che scrive un'immagine di mappa — l'editor, la rotta generica delle immagini, lo scarico della pianta di un
// quartiere, l'importazione, la rimozione — passa da `dopoImmagineMappa`, che allinea chiave, dimensioni e ruolo. Prima la rotta
// generica e lo scarico salvavano l'immagine e basta, e il ruolo dipendeva da chi l'aveva caricata.
//
// Senza dipendenze dagli altri servizi (solo il database e i condivisi): lo usano `immaginiService`, `mappeService`,
// `cittaService` e il pacchetto, e nessuno deve richiamarsi in cerchio.
// ============================================================

import { getDb, nowIso, type AppDatabase } from '../../db/dbService.js';
import { sqlRuoloDaGerarchia } from '../../../shared/immaginiMappa.js';

/** Un'immagine caricata nell'istanza per una mappa: la chiave nella tabella e la data, che versiona l'URL. */
export interface ImmagineCaricata { chiave: string; createdAt: string }

/** Le immagini dell'ambito «mappa» (chiave → data di caricamento), lette una volta per una risposta che descrive molte mappe. */
export function immaginiCaricateDelleMappe(db: AppDatabase = getDb()): Map<string, string> {
  return new Map((db.prepare("SELECT chiave, created_at FROM immagine WHERE ambito = 'mappa'").all() as Array<{ chiave: string; created_at: string }>).map((i) => [i.chiave, i.created_at]));
}

/**
 * L'immagine caricata di una mappa, se c'è: quella registrata (`immagine_chiave`), altrimenti una dell'ambito «mappa» con la
 * chiave della mappa (le piante dei quartieri usano proprio quella). Le chiavi sono già in forma interna: `salvaImmagine` le
 * riconduce all'identità della mappa.
 */
export function caricataDellaMappa(r: { chiave: string; immagine_chiave: string | null }, caricate: Map<string, string>): ImmagineCaricata | null {
  for (const chiave of [r.immagine_chiave, r.chiave]) {
    if (!chiave) continue;
    const createdAt = caricate.get(chiave);
    if (createdAt !== undefined) return { chiave, createdAt };
  }
  return null;
}

/** L'URL dell'immagine caricata, versionato con la data: una sostituzione cambia l'indirizzo, e ogni vista la vede subito. */
export function urlCaricata(c: ImmagineCaricata): string {
  return `/api/immagini/mappa/${encodeURIComponent(c.chiave)}/file?v=${encodeURIComponent(c.createdAt)}`;
}

/** Riallinea il ruolo dell'immagine (di una mappa, o di tutte) alla regola della gerarchia. Restituisce quante righe cambiano. */
export function allineaRuoliImmagine(db: AppDatabase = getDb(), chiave?: string): number {
  const regola = sqlRuoloDaGerarchia('mappa');
  return db.prepare(`UPDATE mappa SET ruolo_immagine = ${regola} WHERE ruolo_immagine IS NOT ${regola}${chiave === undefined ? '' : ' AND chiave = ?'}`)
    .run(...(chiave === undefined ? [] : [chiave])).changes;
}

/** Legge larghezza e altezza dalle intestazioni dei formati più comuni (PNG, GIF, JPEG, WEBP VP8/VP8L/VP8X); null se non riconosciute. */
export function dimensioniImmagine(b: Buffer): { larghezza: number; altezza: number } | null {
  if (b.length >= 24 && b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return { larghezza: b.readUInt32BE(16), altezza: b.readUInt32BE(20) };
  if (b.length >= 10 && b.toString('ascii', 0, 3) === 'GIF') return { larghezza: b.readUInt16LE(6), altezza: b.readUInt16LE(8) };
  if (b.length >= 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const tipo = b.toString('ascii', 12, 16);
    if (tipo === 'VP8X') return { larghezza: 1 + b.readUIntLE(24, 3), altezza: 1 + b.readUIntLE(27, 3) };
    if (tipo === 'VP8L') { const bits = b.readUInt32LE(21); return { larghezza: 1 + (bits & 0x3fff), altezza: 1 + ((bits >> 14) & 0x3fff) }; }
    if (tipo === 'VP8 ') return { larghezza: b.readUInt16LE(26) & 0x3fff, altezza: b.readUInt16LE(28) & 0x3fff };
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = b.readUInt16BE(i + 2);
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return { altezza: b.readUInt16BE(i + 5), larghezza: b.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

/**
 * Dopo che l'immagine di base di una mappa è stata scritta (`contenuto`) o tolta (`null`), da qualunque strada: la mappa con quella
 * chiave (se c'è) la registra con le sue dimensioni, oppure la dimentica, e il suo ruolo segue la regola. Una chiave che non è di
 * una mappa (la pianta di un'area della guida di prima) non tocca niente. Va chiamata nella stessa transazione della scrittura.
 */
export function dopoImmagineMappa(db: AppDatabase, chiave: string, contenuto: Buffer | null): void {
  const mappa = db.prepare('SELECT chiave FROM mappa WHERE chiave = ? OR immagine_chiave = ?').all(chiave, chiave) as Array<{ chiave: string }>;
  for (const m of mappa) {
    if (contenuto) {
      const dim = dimensioniImmagine(contenuto);
      db.prepare('UPDATE mappa SET immagine_chiave = ?, larghezza = ?, altezza = ?, updated_at = ? WHERE chiave = ?')
        .run(chiave, dim?.larghezza ?? null, dim?.altezza ?? null, nowIso(), m.chiave);
    } else {
      // tolta l'immagine registrata, le dimensioni erano le sue: si rileggeranno dall'asset, se c'è
      db.prepare('UPDATE mappa SET immagine_chiave = NULL, larghezza = NULL, altezza = NULL, updated_at = ? WHERE chiave = ? AND immagine_chiave = ?').run(nowIso(), m.chiave, chiave);
    }
    allineaRuoliImmagine(db, m.chiave);
  }
}

/**
 * Dopo una rimozione in blocco (tutte le immagini caricate, o di un ambito): le mappe che puntavano a un'immagine che non c'è più la
 * dimenticano, con le sue dimensioni, e ogni ruolo torna alla regola.
 */
export function dopoRimozioniImmagini(db: AppDatabase): void {
  db.prepare(`UPDATE mappa SET immagine_chiave = NULL, larghezza = NULL, altezza = NULL, updated_at = ?
    WHERE immagine_chiave IS NOT NULL AND NOT EXISTS (SELECT 1 FROM immagine i WHERE i.ambito = 'mappa' AND i.chiave = mappa.immagine_chiave)`).run(nowIso());
  allineaRuoliImmagine(db);
}
