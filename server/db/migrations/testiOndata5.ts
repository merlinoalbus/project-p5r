// ============================================================
// Testi degli effetti dell'Ondata 5 (Lotto F ridotto; decisione 21 dell'utente) — strumenti comuni delle migrazioni 270-277
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

/**
 * L'audit di una migrazione del lotto, con le esecuzioni accodate (una migrazione rieseguita su un'altra copia ne aggiunge una). Una
 * esecuzione che non ha cambiato niente (`cambiate` = 0) si scrive solo se l'audit non c'è ancora: rieseguita sugli stessi dati, la
 * migrazione non tocca nemmeno `dati_guida` (idempotenza piena, rilievo 6 della revisione del lotto F).
 */
export function scriviAuditTesti(db: AppDatabase, chiave: string, migrazione: number, esecuzione: Record<string, unknown>, cambiate: number): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  if (vecchio !== undefined && cambiate === 0) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) {
    try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; }
  }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(chiave, JSON.stringify({ migrazione, lotto: 'ondata-5-F', decisione: 'L13-21', esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}

/**
 * Il testo di un effetto ridotto alla sola sostanza, per confrontare la copia di un'offerta con l'oggetto del catalogo: minuscole,
 * apostrofi uniformi, «percento» come «%», punteggiatura e spazi ignorati. Due testi uguali così dicono la stessa cosa con la stessa
 * forma; ogni altra differenza va decisa voce per voce (migrazione 270).
 */
export function sostanzaTesto(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[’']/g, "'").replace(/\bper ?cento\b/g, '%').replace(/\s*%/g, '%')
    .replace(/[.,;:()/]/g, ' ').replace(/\s+/g, ' ').trim();
}

export interface NotaStoricaTesti { chiave: string; testo: string; fonte: string; catalogo: readonly string[]; articoli: readonly string[] }

/**
 * Una nota storica sulla fonte (come le 246 e 252): si crea se non c'è (mai riscritta: una nota corretta dall'utente resta) e si lega alle
 * schede e alle offerte che ci sono. Restituisce l'esito e i legami nuovi (0 se c'era già tutto).
 */
export function notaStoricaTesti(db: AppDatabase, n: NotaStoricaTesti): { esito: string; cambiate: number } {
  if (!esisteTabella(db, 'nota_storica') || !esisteTabella(db, 'nota_storica_legame')) return { esito: 'tabelle delle note storiche assenti', cambiate: 0 };
  const creata = db.prepare('INSERT OR IGNORE INTO main.nota_storica (chiave, testo, fonte, versione, seed_json, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
    .run(n.chiave, n.testo, n.fonte, JSON.stringify({ versione: 1, testo: n.testo, fonte: n.fonte }), new Date().toISOString()).changes;
  const lega = db.prepare('INSERT OR IGNORE INTO main.nota_storica_legame (nota_chiave, tipo, chiave) VALUES (?, ?, ?)');
  let legami = 0;
  for (const c of n.catalogo) if (db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(c)) legami += lega.run(n.chiave, 'catalogo', c).changes;
  for (const a of n.articoli) if (db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ?').get(a)) legami += lega.run(n.chiave, 'articolo', a).changes;
  return { esito: `${creata ? 'nota creata' : 'nota già presente'}, legami nuovi ${legami}`, cambiate: creata + legami };
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
