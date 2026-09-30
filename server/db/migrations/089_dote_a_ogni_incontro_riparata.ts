// ============================================================
// 089 — ripara i file dove la prima versione della 088 aveva scritto la Dote degli incontri in `confidente_rango`
// ============================================================
//
// La prima versione della 088 (mai rilasciata, girata solo sull'istanza di sviluppo) scriveva la Dote a ogni incontro in
// una colonna `confidente_rango.effetti_json`: quella tabella ha i ranghi 1–9, e l'incontro di Yoshida verso il rango 10
// perdeva la sua Dote (tolta dall'azione, non scritta per il Confidente). La 088 attuale usa `confidente_dote_incontro`
// (ranghi 1–10). Qui, dove serve: si copiano i valori dalla colonna, si ricava dalla nota dell'azione la Dote di un
// passaggio che non ce l'ha né sull'azione né per il Confidente, e la colonna si toglie. Su un file che ha girato la 088
// attuale non c'è niente da fare.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { dotiDalTesto } from '../conversioneEffettiAzione.js';

interface Azione { tipo?: string; riferimento?: { tipo: string; chiave: string } | null; rangoAtteso?: number | null; note?: string | null; produce?: Array<{ tipo: string }> }

export const migration089: Migration = {
  id: 89,
  name: 'dote_a_ogni_incontro_riparata',
  up(db) {
    const colonne = (db.prepare('PRAGMA table_info(confidente_rango)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('effetti_json')) return;
    // dove è girata la prima 088 la tabella non c'è: la stessa della 088 attuale
    db.exec(`CREATE TABLE IF NOT EXISTS confidente_dote_incontro (
      confidente_chiave TEXT NOT NULL REFERENCES confidente(chiave) ON DELETE CASCADE,
      verso_rango       INTEGER NOT NULL CHECK (verso_rango BETWEEN 1 AND 10),
      effetti_json      TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (confidente_chiave, verso_rango)
    )`);
    const copia = db.prepare("INSERT OR IGNORE INTO confidente_dote_incontro (confidente_chiave, verso_rango, effetti_json) SELECT confidente_chiave, rango, effetti_json FROM confidente_rango WHERE effetti_json IS NOT NULL AND effetti_json NOT IN ('', '[]')").run().changes;
    // i passaggi rimasti senza Dote: né sull'azione né per il Confidente, ma scritta nella nota della guida
    const esiste = db.prepare('SELECT 1 FROM confidente_dote_incontro WHERE confidente_chiave = ? AND verso_rango = ?');
    const scrivi = db.prepare('INSERT INTO confidente_dote_incontro (confidente_chiave, verso_rango, effetti_json) VALUES (?, ?, ?)');
    const confidente = db.prepare('SELECT 1 FROM confidente WHERE chiave = ?');
    let ricavate = 0;
    for (const g of db.prepare('SELECT azioni_json FROM giorno_percorso').all() as Array<{ azioni_json: string }>) {
      for (const a of JSON.parse(g.azioni_json) as Azione[]) {
        if (a.tipo !== 'confidente' || a.riferimento?.tipo !== 'confidente' || !a.rangoAtteso || a.rangoAtteso > 10) continue;
        if ((a.produce ?? []).some((e) => e.tipo === 'dote') || esiste.get(a.riferimento.chiave, a.rangoAtteso) || !confidente.get(a.riferimento.chiave)) continue;
        const doti = dotiDalTesto(a.note);
        if (doti.length === 0) continue;
        scrivi.run(a.riferimento.chiave, a.rangoAtteso, JSON.stringify(doti.map((d) => ({ effetto: { famiglia: 'dote', dote: d.dote, note: d.note } }))));
        ricavate++;
      }
    }
    db.exec('ALTER TABLE confidente_rango DROP COLUMN effetti_json');
    logger.info({ copiate: copia, ricavate }, 'migrazione 089: Dote a ogni incontro spostata in confidente_dote_incontro');
  },
};
