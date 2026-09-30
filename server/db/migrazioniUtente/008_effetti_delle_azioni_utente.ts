// ============================================================
// utente 008 — le azioni dell'utente dichiarano i loro effetti, come quelle della guida
// ============================================================
//
// Richiesta dell'utente (2026-09-30): le azioni aggiunte alla giornata devono potersi classificare e
// collegare come quelle della guida, e la spunta deve dare i punti che dichiarano (prima non ne dava
// nessuno: `azione_utente_partita.effetti_json` restava sempre vuoto). `produce_json` porta gli effetti
// (`shared/effettiAzione.ts`); per le azioni già scritte si ricavano una volta dalle note e dal
// collegamento con la stessa conversione della guida (migrazione 086), senza posto nella guida (nessuna
// «azione più avanti» da guardare). Le spunte già messe restano senza effetti: nessun punto retroattivo.
// Su un file nato dopo questa migrazione la colonna esiste già (`schemaUtente.ts`).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { contestoConversione, effettiDellAzione } from '../conversioneEffettiAzione.js';

export const utente008: Migration = {
  id: 8,
  name: 'effetti_delle_azioni_utente',
  up(db) {
    const colonne = (db.prepare('PRAGMA utente.table_info(azione_utente)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('produce_json')) db.exec("ALTER TABLE utente.azione_utente ADD COLUMN produce_json TEXT NOT NULL DEFAULT '[]'");

    const serve = ['giorno_percorso', 'libro', 'film', 'attivita'].every((t) => db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t));
    if (!serve) return;
    const righe = db.prepare("SELECT id, tipo, azione, riferimento_tipo, riferimento_chiave, note FROM utente.azione_utente WHERE produce_json = '[]'").all() as Array<{ id: number; tipo: string; azione: string; riferimento_tipo: string | null; riferimento_chiave: string | null; note: string | null }>;
    if (righe.length === 0) return;
    const ctx = contestoConversione(db);
    const scrivi = db.prepare('UPDATE utente.azione_utente SET produce_json = ? WHERE id = ?');
    let convertite = 0;
    for (const r of righe) {
      const riferimento = r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_chiave } : null;
      const produce = effettiDellAzione({ azione: r.azione, tipo: r.tipo, riferimento, note: r.note }, null, ctx);
      if (produce.length === 0) continue;
      scrivi.run(JSON.stringify(produce), r.id);
      convertite++;
    }
    logger.info({ azioni: righe.length, convertite }, 'migrazione utente 008: effetti delle azioni dell\'utente');
  },
};
