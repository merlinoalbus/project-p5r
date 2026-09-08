// ============================================================
// 060 — «in squadra» diventa una cosa che si dice, invece di un effetto collaterale
// ============================================================
//
// La condizione «Ladro Fantasma in squadra» leggeva la **presenza della riga** in
// `membro_squadra_partita`, e quella riga nasce quando segni un livello. Il risultato, provato
// dall'utente: per rendere vera la condizione bisognava andare a toccare il livello — un gesto
// diverso da quello che si intende — e per renderla di nuovo falsa non c'era **niente**, perché
// l'interfaccia non offre modo di cancellare una riga. Un interruttore che si accende per sbaglio
// e non si spegne non è un interruttore.
//
// La colonna lo rende esplicito. Un Ladro è in squadra perché l'hai detto, non perché gli hai
// segnato un livello; e si può togliere senza perdere livello ed esperienza, che restano lì per
// quando rientra — in Royal Akechi esce e torna, e cancellargli i dati a ogni uscita vorrebbe dire
// farli riscrivere.
//
// **`DEFAULT 1`, e non 0.** Le righe che esistono oggi sono state create segnando un livello, cioè
// da qualcuno che quel Ladro ce l'aveva: metterle a 0 direbbe il falso su ogni partita in corso, e
// farebbe sparire di colpo le condizioni che oggi risultano soddisfatte. Il valore predefinito
// conserva quello che i dati già affermano.
//
// Chi non ha riga resta «non segnato», che è ancora una terza cosa e va tenuta distinta: non è
// «non è in squadra», è «non me lo hai ancora detto». La differenza si vede nel semaforo, che per
// quel caso resta grigio invece che rosso.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';

function aggiungiColonna(db: Database.Database, tabella: string, colonna: string, tipo: string): void {
  const gia = (db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).some((c) => c.name === colonna);
  if (!gia) db.exec(`ALTER TABLE ${tabella} ADD COLUMN ${colonna} ${tipo}`);
}

export const migration060: Migration = {
  id: 60,
  name: 'ladro_in_squadra',
  up(db) {
    aggiungiColonna(db, 'membro_squadra_partita', 'in_squadra', 'INTEGER NOT NULL DEFAULT 1 CHECK (in_squadra IN (0,1))');
  },
};
