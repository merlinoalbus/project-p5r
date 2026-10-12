// ============================================================
// utente 020 — i timbri raccolti in un'area che non ha (più) un totale se ne vanno
// ============================================================
//
// La migrazione di gioco 101 (2026-10-12) svuota il totale dell'Area 1 di ogni dedalo che riorganizza: era il totale del dedalo
// intero, e il totale di ogni area lo imposta l'utente («li conterò io man mano e li setterò»). I timbri che una partita aveva
// segnato in quell'Area 1 erano del dedalo intero: non appartengono a nessuna area, e con il totale vuoto non si vedrebbero più
// né conterebbero, ma resterebbero nel file — e ricomparirebbero, sbagliati, nell'Area 1 appena l'utente le desse un totale.
// Si tolgono con la stessa regola dell'app: un totale svuotato toglie i raccolti dell'area (`allineaTimbriDelleAree` in
// `dungeonService`). Vale per ogni area senza totale; un conteggio di un'area che nel file di gioco non c'è resta com'è (il
// controllo degli orfani del pacchetto lo segnala). Il numero delle righe tolte va nel registro. Sui dati dell'utente, al
// 2026-10-12, erano 0 righe.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

export const utente020: Migration = {
  id: 20,
  name: 'timbri_senza_totale',
  up(db) {
    if (!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'timbri_dedalo_partita'").get()) return;
    if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'area_dedalo'").get()) return;
    const tolte = db.prepare('DELETE FROM utente.timbri_dedalo_partita WHERE area_chiave IN (SELECT chiave FROM main.area_dedalo WHERE timbri_totale IS NULL)').run().changes;
    logger.info({ tolte }, 'migrazione utente 020: timbri raccolti tolti dalle aree dei dedali senza un totale');
  },
};
