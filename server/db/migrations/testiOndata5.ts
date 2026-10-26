// ============================================================
// Testi degli effetti dell'Ondata 5 (Lotto F ridotto; decisione 21 dell'utente) — strumenti comuni delle migrazioni 270-274
// ============================================================
//
// Decisione 21 (a): «Gli effetti degli oggetti ai fini di questa app non è necessario gestirli se non come informazione testuale»: nessuna
// struttura per famiglie; un solo punto per il testo dell'effetto, `catalogo_oggetto.effetto` (le statistiche in `statistiche_json`); si tolgono
// le copie (offerte, traduzioni, prosa) e si correggono i testi sbagliati secondo la guida italiana (prevale il dato Royal).
// Qui: l'audit comune del lotto, le fonti della guida e la correzione guardata di un testo del catalogo (solo righe della guida mai corrette
// dall'utente, solo se il testo è quello atteso).
// ============================================================

import type { AppDatabase } from '../dbService.js';
import { esisteTabella } from './pulizieL11.js';
export { improntaDiario } from './rifornimentoOndata5.js';

export const FONTE_OGGETTI = 'https://www.allgamestaff.it/persona-5-royal/oggetti/';
export const FONTE_ACCESSORI = 'https://www.allgamestaff.it/persona-5-royal/accessori/';
export const FONTE_CHIAVE = 'https://www.allgamestaff.it/persona-5-royal/oggetti-chiave-essenziali/';
export const FONTE_REGALI = 'https://www.allgamestaff.it/persona-5-royal/guida-regali-confidenti/';

/** L'audit di una migrazione del lotto, con le esecuzioni accodate (una migrazione rieseguita su un'altra copia ne aggiunge una). */
export function scriviAuditTesti(db: AppDatabase, chiave: string, migrazione: number, esecuzione: Record<string, unknown>): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  let esecuzioni: unknown[] = [];
  if (vecchio) {
    try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; }
  }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(chiave, JSON.stringify({ migrazione, lotto: 'ondata-5-F', decisione: 'L13-21', esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}

export type CampoTesto = 'effetto' | 'descrizione';
export interface EsitoTesto { chiave: string; campo: CampoTesto; esito: string; prima?: string; dopo?: string }

/**
 * Riscrive un testo di una scheda del catalogo da `prima` a `dopo`: solo se la scheda è della guida e mai corretta dall'utente
 * (`origine = 'seed'`, `seed_json` vuoto) e se il testo è ancora `prima`. `prima` può essere un elenco di testi attesi. Altrimenti resta com'è
 * e l'esito lo dice (un dato salvato non si cambia in silenzio). Idempotente: con il testo già `dopo` non scrive.
 */
export function correggiTestoCatalogo(db: AppDatabase, chiave: string, campo: CampoTesto, prima: string | readonly string[], dopo: string): EsitoTesto {
  const r = db.prepare(`SELECT ${campo} AS testo, origine, seed_json FROM main.catalogo_oggetto WHERE chiave = ?`).get(chiave) as { testo: string; origine: string; seed_json: string | null } | undefined;
  if (!r) return { chiave, campo, esito: 'scheda assente: non toccata' };
  if (r.testo === dopo) return { chiave, campo, esito: 'già conforme alla guida' };
  if (r.origine !== 'seed' || r.seed_json !== null) return { chiave, campo, esito: 'scheda corretta dall’utente: non toccata', prima: r.testo };
  const attesi = typeof prima === 'string' ? [prima] : prima;
  if (!attesi.includes(r.testo)) return { chiave, campo, esito: 'testo diverso da quello atteso: non toccato', prima: r.testo };
  const n = db.prepare(`UPDATE main.catalogo_oggetto SET ${campo} = ?, updated_at = ? WHERE chiave = ? AND ${campo} = ? AND origine = 'seed' AND seed_json IS NULL`)
    .run(dopo, new Date().toISOString(), chiave, r.testo).changes;
  if (n !== 1) throw new Error(`testi ondata 5: ${campo} della scheda ${chiave} non si aggiorna; nessuna modifica applicata.`);
  return { chiave, campo, esito: 'corretto', prima: r.testo, dopo };
}
