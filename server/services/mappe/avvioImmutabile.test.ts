// ============================================================
// Il secondo avvio non tocca niente
// ============================================================
//
// Il database si forma una volta e poi resta com'è: è la disposizione dell'utente, e non è un
// dettaglio di prestazioni. Su una partita vera le mappe portano le posizioni che l'utente ha
// spostato, gli spilli che ha aggiunto, i suoi segni in `spillo_partita`; qualunque
// riconciliazione che riparta a ogni avvio è un'occasione di riscrivergli addosso qualcosa.
//
// All'avvio, con l'hash del seed invariato, il caricamento chiama comunque `sincronizzaMappe`,
// `collegaPalazziAiLuoghi` e `applicaPresenzaAiLuoghi`. Sono dichiarate idempotenti. «Dichiarate»
// non basta: qui si prende l'impronta di tutto il livello mappe — righe intere, non conteggi,
// `updated_at` compreso — si riavvia, e si pretende la stessa impronta. Un conteggio uguale con
// una data di modifica riscritta passerebbe per idempotente e non lo è: vuol dire che a ogni
// avvio qualcuno riscrive le righe, e il giorno in cui una di quelle scritture cambia anche un
// valore, nessuno se ne accorge.
//
// La riga d'utente nel test non è decorativa: `spillo_partita` è il posto dove finiscono i segni
// del giocatore, ed è quello che deve sopravvivere per primo.
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import { closeDb, initDb, getDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { caricaSeed } from '../seed/caricaSeed.js';

const DIR_SEED = path.join('data', 'seed');

/** Le tabelle del livello mappe più il posto dove il giocatore lascia i suoi segni. */
const TABELLE = [
  'mappa', 'spillo', 'spillo_immagine', 'spillo_destinazione', 'spillo_partita',
  'mappa_alias', 'mappa_percorso', 'mappa_presentazione', 'mappa_entita', 'guida_mappa',
];

/** Tutte le righe di una tabella, ciascuna serializzata per intero, in ordine stabile. */
function righeDi(tabella: string): string[] {
  const db = getDb();
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(tabella)) return [];
  const colonne = (db.prepare(`SELECT name FROM pragma_table_info('${tabella}')`)
    .all() as Array<{ name: string }>).map((c) => c.name);
  const ordine = colonne.map((c) => `"${c}"`).join(', ');
  return (db.prepare(`SELECT * FROM "${tabella}" ORDER BY ${ordine}`).all() as Array<Record<string, unknown>>)
    .map((r) => colonne.map((c) => `${c}=${String(r[c])}`).join(' | '));
}

function impronta(): Record<string, string[]> {
  return Object.fromEntries(TABELLE.map((t) => [t, righeDi(t)]));
}

/** Che cosa e' cambiato, riga per riga e su tutte le tabelle insieme: sapere che la prima e'
 *  cambiata non dice se sono cambiate anche le altre nove, e «666 righe contro 667» non dice
 *  quale sia la riga in piu' — che e' l'unica informazione con cui si ripara il difetto. */
function cambiate(prima: Record<string, string[]>, dopo: Record<string, string[]>): string[] {
  const fuori: string[] = [];
  for (const t of TABELLE) {
    const era = new Set(prima[t]);
    const ora = new Set(dopo[t]);
    const aggiunte = dopo[t].filter((r) => !era.has(r));
    const tolte = prima[t].filter((r) => !ora.has(r));
    for (const r of aggiunte.slice(0, 5)) fuori.push(`${t} +  ${r}`);
    for (const r of tolte.slice(0, 5)) fuori.push(`${t} -  ${r}`);
    if (aggiunte.length > 5) fuori.push(`${t}: e altre ${aggiunte.length - 5} righe aggiunte`);
    if (tolte.length > 5) fuori.push(`${t}: e altre ${tolte.length - 5} righe tolte`);
  }
  return fuori;
}

describe('l’avvio ordinario su un database già formato', () => {
  let prima: Record<string, string[]>;

  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    // Un segno del giocatore, come ce ne sono su una partita vera: se il secondo avvio lo tocca,
    // il test deve dirlo prima che lo faccia su un database dell'utente.
    const partita = db.prepare(`INSERT INTO partita (nome, data_gioco, created_at, updated_at)
      VALUES ('prova', '04-11', datetime('now'), datetime('now'))`).run();
    const spillo = db.prepare('SELECT id FROM spillo ORDER BY id LIMIT 1').get() as { id: number };
    db.prepare(`INSERT INTO spillo_partita (partita_id, spillo_id, raccolto, updated_at)
      VALUES (?, ?, 1, datetime('now'))`).run(Number(partita.lastInsertRowid), spillo.id);
    prima = impronta();
  });
  afterAll(() => closeDb());

  it('non cambia una sola riga del livello mappe, né i segni della partita', () => {
    // stesso hash del seed: è esattamente il ramo che percorre ogni riavvio del backend
    const esito = caricaSeed(getDb(), DIR_SEED);
    expect(esito.caricato).toBe(false);
    expect(cambiate(prima, impronta())).toEqual([]);
  });

  it('e nemmeno al terzo', () => {
    caricaSeed(getDb(), DIR_SEED);
    caricaSeed(getDb(), DIR_SEED);
    expect(cambiate(prima, impronta())).toEqual([]);
  });
});
