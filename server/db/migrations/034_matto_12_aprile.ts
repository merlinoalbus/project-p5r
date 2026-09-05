// ============================================================
// Migrazione 034 — il Confidente Il Matto si avvia la sera del 12 aprile, non dell'11 (Fase 15.28)
// ============================================================
//
// La soluzione allgamestaff (settimana 1) mette il sogno nella Stanza di Velluto con «Rango Confidente +1: Signore della Prigione,
// arcano Matto» la sera del 12 aprile, dopo la cena con Ryuji. Il seed lo aveva la sera dell'11 aprile (indice 1 di quel giorno): l'azione
// è spostata in coda al 12 aprile (indice 3). Qui la spunta eventualmente data sull'11 aprile viene spostata sulla nuova posizione,
// se non esiste già, così che nessuna partita perda ciò che aveva segnato.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';

/** Sposta le spunte da 04-11/1 a 04-12/3 (o le toglie se il 12 aprile ha già quella spunta). Esportata per i test. */
export function spostaSpuntaMatto(db: AppDatabase): { spostate: number; tolte: number } {
  const righe = db.prepare("SELECT partita_id, effetti_json, updated_at FROM azione_partita WHERE data = '04-11' AND indice = 1").all() as Array<{ partita_id: number; effetti_json: string | null; updated_at: string }>;
  let spostate = 0; let tolte = 0;
  for (const r of righe) {
    const occupata = db.prepare("SELECT 1 FROM azione_partita WHERE partita_id = ? AND data = '04-12' AND indice = 3").get(r.partita_id);
    if (occupata) tolte += 1;
    else { db.prepare("INSERT INTO azione_partita (partita_id, data, indice, effetti_json, updated_at) VALUES (?, '04-12', 3, ?, ?)").run(r.partita_id, r.effetti_json, r.updated_at); spostate += 1; }
    db.prepare("DELETE FROM azione_partita WHERE partita_id = ? AND data = '04-11' AND indice = 1").run(r.partita_id);
  }
  return { spostate, tolte };
}

export const migration034: Migration = {
  id: 34,
  name: 'matto_12_aprile',
  up: (db) => {
    const tabelle = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name));
    if (tabelle.has('azione_partita') && tabelle.has('giorno_percorso') && db.prepare("SELECT 1 FROM giorno_percorso WHERE data = '04-12'").get()) spostaSpuntaMatto(db);
  },
};
