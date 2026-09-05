// ============================================================
// Migrazione 033 — rimozione dell'azione «Rispondere alla domanda in classe» dell'11 aprile (Fase 15.27)
// ============================================================
//
// Il seed del percorso aveva per l'11 aprile un'azione «esame» che la guida allgamestaff (soluzione settimana 1) non riporta:
// il primo giorno di scuola non ci sono domande in classe (segnalazione dell'utente). L'azione viene tolta da `data/seed/percorso.json`
// e il seed si ricarica da solo (hash cambiato); ma le spunte dell'utente sono salvate per (data, indice) in `azione_partita`:
// senza questo riallineamento la spunta del Palazzo (indice 1) finirebbe sulla Stanza di Velluto (indice 2 → 1).
// Qui si elimina la spunta dell'azione rimossa (indice 0) e si scalano di uno le successive, in ogni partita.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';

export const DATA_11_APRILE = '04-11';

/** Toglie le spunte dell'indice 0 del giorno e scala di uno quelle successive (idempotente rispetto al seed nuovo: va eseguita una sola volta). Esportata per i test. */
export function rimappaAzioniUndiciAprile(db: AppDatabase): { tolte: number; scalate: number } {
  const tolte = db.prepare('DELETE FROM azione_partita WHERE data = ? AND indice = 0').run(DATA_11_APRILE).changes;
  // ordine crescente: l'indice 1 diventa 0 prima che il 2 diventi 1, senza collisioni sulla chiave primaria
  const righe = db.prepare('SELECT partita_id, indice FROM azione_partita WHERE data = ? AND indice > 0 ORDER BY indice').all(DATA_11_APRILE) as Array<{ partita_id: number; indice: number }>;
  const upd = db.prepare('UPDATE azione_partita SET indice = indice - 1 WHERE partita_id = ? AND data = ? AND indice = ?');
  for (const r of righe) upd.run(r.partita_id, DATA_11_APRILE, r.indice);
  return { tolte, scalate: righe.length };
}

export const migration033: Migration = {
  id: 33,
  name: 'percorso_11_aprile',
  up: (db) => {
    const tabelle = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name));
    if (tabelle.has('azione_partita')) rimappaAzioniUndiciAprile(db);
  },
};
