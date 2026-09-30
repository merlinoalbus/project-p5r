// ============================================================
// utente 007 — il registro dei turni; le note corrette dall'utente tengono i loro punti
// ============================================================
//
// `turno_partita`: ogni turno che la spunta di un'azione (o il contatore) registra in un'attività contata
// per volte, con il suo `ordine`. Togliere la spunta toglie quel turno solo se c'è ancora: se il contatore
// lo ha già tolto, `volte` non scende una seconda volta (rilievo della revisione, 2026-09-30).
//
// Correzioni: fino alla migrazione 086 la spunta leggeva i punti dal testo delle note, e l'utente poteva
// cambiarli correggendo le note di un'azione della guida. Ora i punti vengono da `produce`: una correzione
// che cambiava note (o testo) riceve gli effetti che quel testo corretto dava, con la stessa conversione
// della 086, se diversi da quelli della guida. Così nessuna correzione già fatta perde il suo effetto.
// Su un file nato dopo questa migrazione la tabella esiste già (`schemaUtente.ts`).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { contestoConversione, effettiDellAzione, type AzioneDaConvertire } from '../conversioneEffettiAzione.js';

export const utente007: Migration = {
  id: 7,
  name: 'effetti_delle_azioni',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.turno_partita (
      partita_id       INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      attivita_chiave  TEXT NOT NULL,
      ordine           INTEGER NOT NULL CHECK (ordine >= 1),
      created_at       TEXT NOT NULL,
      PRIMARY KEY (partita_id, attivita_chiave, ordine)
    )`);

    // la conversione legge libri, film, lavori e guida dal file di gioco: senza, non c'è niente da convertire
    const serve = ['giorno_percorso', 'libro', 'film', 'attivita'].every((t) => db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t));
    if (!serve) return;
    const righe = db.prepare('SELECT data, indice, originale_json, modifiche_json FROM utente.correzione_azione_guida').all() as Array<{ data: string; indice: number; originale_json: string; modifiche_json: string }>;
    if (righe.length === 0) return;
    const ctx = contestoConversione(db);
    const scrivi = db.prepare('UPDATE utente.correzione_azione_guida SET modifiche_json = ? WHERE data = ? AND indice = ?');
    let convertite = 0;
    for (const r of righe) {
      const modifiche = JSON.parse(r.modifiche_json) as { azione?: string; note?: string | null; produce?: unknown };
      if (modifiche.produce !== undefined || (modifiche.note === undefined && modifiche.azione === undefined)) continue;
      const originale = JSON.parse(r.originale_json) as AzioneDaConvertire;
      const posizione = { data: r.data, indice: r.indice };
      const corretta: AzioneDaConvertire = { ...originale, azione: modifiche.azione ?? originale.azione, note: modifiche.note === undefined ? originale.note : modifiche.note };
      const nuovi = effettiDellAzione(corretta, posizione, ctx);
      if (JSON.stringify(nuovi) === JSON.stringify(effettiDellAzione(originale, posizione, ctx))) continue;
      scrivi.run(JSON.stringify({ ...modifiche, produce: nuovi }), r.data, r.indice);
      convertite++;
    }
    logger.info({ correzioni: righe.length, convertite }, 'migrazione utente 007: effetti delle note corrette');
  },
};
