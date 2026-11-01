// ============================================================
// Migrazione 336 — i gradini della capienza della scorta come dato, non più letti dal testo delle abilità di Igor (L8-05)
// ============================================================
//
// Voce di piano L8-05: la capienza della riserva di Personae si ricavava a ogni lettura con un'espressione regolare dalla descrizione delle
// abilità di Igor («La capacità della riserva di Personae sale a 8»): riscrivendo la descrizione, la capienza cambiava senza avviso. Il dato
// passa nel blocco che ha già il valore di partenza (`dati_guida.capienza-scorta`, migrazione 230): `gradini` = `[{ rango, posti }]`, il rango
// di Igor da cui la riserva sale a quei posti. Le descrizioni delle abilità restano testo e non decidono più niente.
//
// COSA (conservativa, idempotente): i gradini si ricavano UNA volta, qui, dalle abilità di Igor di questo file di gioco, con la stessa regola
// che il servizio usava fino a oggi: la capienza mostrata non cambia. Sulla copia del 1° novembre sono rango 3 → 8, 5 → 10, 8 → 12 (guida
// italiana: «Riserva extra», «Riserva super», «Riserva ultra»). Un blocco che ha già `gradini` (scritto prima, o corretto) non si tocca. Senza
// abilità di Igor che parlino della riserva non si scrive niente (il servizio, senza gradini, mostra solo il valore di partenza). Senza il
// blocco della 230 lo si crea con i soli gradini. Scrive solo `main.dati_guida`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';

const CHIAVE = 'capienza-scorta';
const IGOR = 'igor';
const errore = (motivo: string): never => { throw new Error(`336: ${motivo}; nessuna modifica applicata.`); };

/** La regola che il servizio usava sulla descrizione di un'abilità (copiata qui per l'ultima volta: il servizio non la usa più). */
function postiDallaDescrizione(descrizione: string): number | null {
  if (!/riserva di Personae/i.test(descrizione)) return null;
  const m = /\bsale a (\d+)/i.exec(descrizione);
  return m ? Number(m[1]) : null;
}

export const migration336: Migration = {
  id: 336,
  name: 'gradini_capienza_scorta',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'dati_guida') || !esisteTabella(db, 'confidente_abilita')) return;
    const riga = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(CHIAVE) as string | undefined;
    let blocco: Record<string, unknown> = {};
    if (riga !== undefined) {
      try { blocco = JSON.parse(riga) as Record<string, unknown>; } catch { errore('il blocco capienza-scorta non è JSON'); }
      if (blocco === null || typeof blocco !== 'object' || Array.isArray(blocco)) errore('il blocco capienza-scorta non è un oggetto');
      if ('gradini' in blocco) { logger.info({ migrazione: 336 }, 'gradini della capienza già presenti: niente da fare'); return; }
    }
    const abilita = db.prepare('SELECT rango, descrizione FROM main.confidente_abilita WHERE confidente_chiave = ? ORDER BY rango, ordine').all(IGOR) as Array<{ rango: number; descrizione: string }>;
    const gradini: Array<{ rango: number; posti: number }> = [];
    for (const a of abilita) {
      const posti = postiDallaDescrizione(a.descrizione);
      if (posti === null) continue;
      if (!Number.isInteger(posti) || posti <= 0) errore(`posti non validi al rango ${a.rango}`);
      if (gradini.some((g) => g.rango === a.rango)) errore(`due gradini al rango ${a.rango}`);
      gradini.push({ rango: a.rango, posti });
    }
    if (gradini.length === 0) { logger.info({ migrazione: 336 }, 'nessuna abilità di Igor sulla riserva: niente da fare'); return; }
    const nuovo = { ...blocco, gradini };
    db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json').run(CHIAVE, JSON.stringify(nuovo));
    logger.info({ migrazione: 336, gradini }, 'capienza della scorta: gradini nei dati di gioco');
  },
};
