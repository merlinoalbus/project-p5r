// ============================================================
// 055 — anche le domande in classe e il cruciverba si correggono
// ============================================================
//
// «Tutto quello che io vado a modificare deve diventare il catalogo di partenza dell'app.» Finora
// valeva per negozi, articoli, libri, film e attività. Restavano fuori proprio le due cose che si
// consultano **mentre** il gioco chiede una risposta: le 78 domande in classe e agli esami, e le
// 38 righe del cruciverba. Sono anche quelle in cui un errore si scopre nel modo più brutto — hai
// risposto come diceva l'app e il gioco ti ha dato torto — e finora non c'era modo di correggerlo.
//
// Il meccanismo è quello del catalogo (`catalogoService`): la riga dell'utente vive nella stessa
// tabella del seed, `origine` dice da dove viene, `seed_json` conserva l'originale perché
// «Ripristina» sia una promessa mantenibile, `nascosto` toglie dalla vista una riga della guida
// senza cancellarla (cancellarla non basterebbe: il reseed la riporterebbe).
//
// **L'identità.** Il caricatore del seed teneva le domande per posizione nel file (`ordine`) e il
// cruciverba per `(data, ordine)`. La posizione non è un'identità: basta aggiungere una domanda a
// maggio e tutte quelle dopo scalano di uno — le correzioni finirebbero sulla domanda sbagliata.
// Qui la chiave si ricava dal **giorno**, che è quello che identifica una domanda nel gioco:
// `04-12`, e con un progressivo dove un giorno ne ha due (succede cinque volte su settantotto).
// Per il cruciverba `data-ordine`, che è già la sua identità.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';

const COLONNE = [
  ['chiave', 'TEXT'],
  ['origine', "TEXT NOT NULL DEFAULT 'seed'"],
  ['nascosto', 'INTEGER NOT NULL DEFAULT 0'],
  ['seed_json', 'TEXT'],
  ['updated_at', 'TEXT'],
] as const;

/** La chiave di una domanda: il giorno, con un progressivo se quel giorno ne ha più d'una. */
export function chiaveDomanda(data: string, indiceNelGiorno: number): string {
  return indiceNelGiorno > 0 ? `${data}-${indiceNelGiorno + 1}` : data;
}

/** La chiave di una riga del cruciverba: giorno e posizione, che è la sua identità già oggi. */
export function chiaveCruciverba(data: string, ordine: number): string {
  return `${data}-${ordine}`;
}

function aggiungiColonne(db: Database.Database, tabella: string): void {
  const presenti = new Set((db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name));
  for (const [nome, tipo] of COLONNE) if (!presenti.has(nome)) db.exec(`ALTER TABLE ${tabella} ADD COLUMN ${nome} ${tipo}`);
}

/** Riempie le chiavi mancanti; è idempotente e non tocca quelle già assegnate. */
export function assegnaChiavi(db: Database.Database): void {
  const perGiorno = new Map<string, number>();
  for (const d of db.prepare('SELECT rowid AS r, data, chiave FROM domanda ORDER BY ordine').all() as Array<{ r: number; data: string; chiave: string | null }>) {
    const i = perGiorno.get(d.data) ?? 0;
    perGiorno.set(d.data, i + 1);
    if (!d.chiave) db.prepare('UPDATE domanda SET chiave = ? WHERE rowid = ?').run(chiaveDomanda(d.data, i), d.r);
  }
  for (const c of db.prepare('SELECT rowid AS r, data, ordine, chiave FROM cruciverba').all() as Array<{ r: number; data: string; ordine: number; chiave: string | null }>) {
    if (!c.chiave) db.prepare('UPDATE cruciverba SET chiave = ? WHERE rowid = ?').run(chiaveCruciverba(c.data, c.ordine), c.r);
  }
}

export const migration055: Migration = {
  id: 55,
  name: 'catalogo_domande_cruciverba',
  up(db) {
    aggiungiColonne(db, 'domanda');
    aggiungiColonne(db, 'cruciverba');
    assegnaChiavi(db);
    // L'indice è unico ma parziale: una riga senza chiave non esiste più dopo `assegnaChiavi`,
    // e il vincolo protegge da due righe che finiscono sulla stessa identità.
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_domanda_chiave ON domanda(chiave) WHERE chiave IS NOT NULL');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_cruciverba_chiave ON cruciverba(chiave) WHERE chiave IS NOT NULL');
  },
};
