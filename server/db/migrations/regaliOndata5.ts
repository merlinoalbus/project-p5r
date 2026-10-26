// ============================================================
// regaliOndata5 — i dati comuni delle migrazioni 255-258 (ondata 5, lotto D: regali ai Confidenti)
// ============================================================
//
// Decisione 21 dell'utente (26/10/2026), punto (c): «reazione dei regali strutturata con i punti attuali finché non verificati in gioco;
// regalo ripetibile con consumo di copie e oggetti dei set posseduti; […] sconsigliati riconvertiti a +1; righe senza fonte italiana tenute
// con la fonte dichiarata». Decisioni 12 e 13: il prezzo vive solo negli articoli, i destinatari si leggono da `confidente_regalo`.
// Fonte dei dati: la guida italiana «Guida regali Confidenti» (https://www.allgamestaff.it/persona-5-royal/guida-regali-confidenti/) e il
// censimento ECC dei regali (RG-01…RG-18), fatto sulle copie dei dati.
//
// Qui solo costanti ed elenchi scritti (nessun servizio vivo: le migrazioni non importano `server/services/`).
// ============================================================

import type { AppDatabase } from '../dbService.js';

/** La guida dei regali, fonte di ogni riga di questo lotto. */
export const GUIDA_REGALI = 'https://www.allgamestaff.it/persona-5-royal/guida-regali-confidenti/';

/**
 * I 17 Confidenti a cui si può regalare. La guida: «Non si può regalare a Yoshida, Mishima, Morgana, Igor, alle Gemelle custodi o a Sae»;
 * gli altri 17 sono proprio quelli che hanno un elenco di regali (censimento, «Stato attuale»).
 */
export const CONFIDENTI_REGALABILI: readonly string[] = [
  'akechi', 'ann', 'chihaya', 'futaba', 'haru', 'hifumi', 'iwai', 'kasumi', 'kawakami', 'makoto', 'maruki', 'ohya', 'ryuji', 'shinya', 'sojiro', 'takemi', 'yusuke',
];
/** I 6 che non ricevono regali (guida italiana). */
export const CONFIDENTI_NON_REGALABILI: readonly string[] = ['igor', 'morgana', 'gemelle', 'mishima', 'yoshida', 'sae'];

/** Aggiunge un'esecuzione all'audit della migrazione in `dati_guida` (una riga per migrazione, un'esecuzione per giro). */
export function scriviAuditRegali(db: AppDatabase, chiave: string, migrazione: number, esecuzione: Record<string, unknown>): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  let esecuzioni: unknown[] = [];
  if (vecchio) {
    try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; }
  }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(chiave, JSON.stringify({ migrazione, lotto: 'ondata-5-D', decisione: 'L13-21', esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}

/** Vero se la colonna c'è nella tabella dello schema `main`. */
export function haColonna(db: AppDatabase, tabella: string, colonna: string): boolean {
  return (db.prepare(`PRAGMA main.table_info(${tabella})`).all() as Array<{ name: string }>).some((c) => c.name === colonna);
}
