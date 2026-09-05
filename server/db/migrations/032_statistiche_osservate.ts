// ============================================================
// Migrazione 032 — statistiche reali osservate nel gioco (Fase 15.26)
// ============================================================
//
// La crescita delle statistiche di una Persona nel gioco segue una ripartizione propria di ogni Persona che il dataset non conosce:
// l'app la stima (+3 punti per livello in proporzione alla base). L'utente può ora registrare i VALORI REALI letti nella scheda della
// Persona a un dato livello (`osservate_livello` + cinque statistiche): da quel livello in su la stima riparte da lì, e i bonus
// (Potenziamento, Addestramento, Isolamento, Forca) ripartono da zero perché i valori reali li comprendono già.
// Le stesse colonne sull'istantanea del compendio personale: l'evocazione dal Registro ripristina anche i valori reali.
// NULL = mai registrati (comportamento precedente).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { CHIAVI_STATISTICHE } from '../../../shared/statistiche.js';

export const migration032: Migration = {
  id: 32,
  name: 'statistiche_osservate',
  up: (db) => {
    for (const tabella of ['persona_posseduta', 'compendio_partita']) {
      db.exec(`ALTER TABLE ${tabella} ADD COLUMN osservate_livello INTEGER`);
      for (const k of CHIAVI_STATISTICHE) db.exec(`ALTER TABLE ${tabella} ADD COLUMN osservate_${k} INTEGER`);
    }
  },
};
