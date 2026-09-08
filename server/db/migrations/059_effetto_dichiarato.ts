// ============================================================
// 059 — l'effetto di un articolo si dichiara, invece di descriverlo
// ============================================================
//
// `articolo.effetto` è testo libero, e i dati dicono com'è finita: fra i consumabili della guida e
// gli articoli dei negozi ci sono **523 frasi, 405 diverse fra loro**, per dire un numero di cose
// molto minore. «Ripristina 100 SP di un alleato», «Ripristina interamente gli SP di un alleato» e
// «Ridona tutti gli SP a un alleato» sono tre stringhe estranee l'una all'altra e una cosa sola.
//
// Dentro lo stesso campo convivevano poi **sei tipi di dato che non si assomigliano**: effetti d'uso,
// bonus da equipaggiamento («Agilità +2»), affinità elementali («Fiamme debole»), regali con la
// lista di chi li gradisce, Doti alzate, luoghi sbloccati. E venti voci che sono **prezzi**: «Set A
// 1680 yen oppure Set B a 5980 yen», scritto sotto «effetto».
//
// `effetto_json` tiene la dichiarazione strutturata (`shared/effettiOggetto.ts`), che l'app può
// leggere e confrontare. **`effetto` resta, e non è un doppione**: continua a contenere la frase,
// generata da `descriviEffetto`, perché la ricerca per testo degli articoli ci passa sopra e perché
// chi apre il database senza l'app deve poter capire lo stesso che cosa fa un oggetto. La frase
// diventa un derivato, non più la fonte.
//
// Nullable e append-only: le 575 righe di adesso restano valide com'erano, con la loro frase e
// senza dichiarazione. Riscriverle qui vorrebbe dire indovinare, e indovinare su 405 forme diverse
// è esattamente il modo di introdurre errori che nessuno poi ritrova.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';

function aggiungiColonna(db: Database.Database, tabella: string, colonna: string, tipo: string): void {
  const gia = (db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).some((c) => c.name === colonna);
  if (!gia) db.exec(`ALTER TABLE ${tabella} ADD COLUMN ${colonna} ${tipo}`);
}

export const migration059: Migration = {
  id: 59,
  name: 'effetto_dichiarato',
  up(db) {
    aggiungiColonna(db, 'articolo', 'effetto_json', 'TEXT');
  },
};
