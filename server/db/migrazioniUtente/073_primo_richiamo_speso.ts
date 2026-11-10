// ============================================================
// Utente 073 — il primo richiamo gratuito di una Persona DLC, speso, ha una riga sua (rilievo della revisione automatica sulla PR 113)
// ============================================================
//
// La guida: la prima evocazione di una Persona DLC è gratuita, le successive costano yen. Fino a qui il richiamo risultava speso se la Persona
// era nella scorta o se lo storico aveva il suo evento «persona-aggiunta»: tolta la Persona (fusa, rimossa) e cancellata quella voce dello
// storico (`storicoService.eliminaEvento`, `eliminaEventi`: una correzione dell'utente), il richiamo tornava gratuito e cambiavano i prezzi delle
// ricette e la graduatoria dei piani di fusione. Da qui lo dice `primo_richiamo_speso`, una riga per partita e Persona DLC, scritta quando la
// Persona entra nella scorta la prima volta (`partiteService.aggiungiPosseduta`, l'unica strada di un esemplare nuovo: `rimettiInScorta` e il
// Cestino rimettono un esemplare di prima, con la sua data, e la riga c'è già) e tolta solo quando la
// spunta del Diario che l'aveva aggiunta si annulla e porta via proprio quell'esemplare (`effettiDiStatoService`, modo «scorta-tolta»): un
// annullo riporta lo stato di prima, una voce dello storico cancellata no.
//
// `posseduta_id` e `speso_il` sono l'esemplare con cui la Persona è entrata (id e `created_at`): l'annullo toglie la riga solo se coincidono
// tutti e due, perché un id di `persona_posseduta` (senza AUTOINCREMENT) può tornare a un esemplare nuovo. Nessuna chiave esterna verso
// l'esemplare: se ne va, la riga resta.
//
// Le righe di oggi, ricostruite dallo stato della partita (main.persona.dlc = 1):
//   1. ogni Persona DLC nella scorta: con il suo esemplare, se lo storico non ha un'aggiunta della stessa Persona più vecchia dell'esemplare
//      (allora era entrata prima: l'esemplare non si sa, `posseduta_id` NULL, `speso_il` la prima aggiunta);
//   2. ogni Persona DLC con un evento «persona-aggiunta» e non nella scorta: senza esemplare, con la data della prima aggiunta.
// Le voci dello storico già cancellate non si possono ricostruire: quel richiamo resta gratuito come lo mostrava l'app.
// Append-only e idempotente (IF NOT EXISTS, INSERT OR IGNORE), dentro la transazione della migrazione; non legge colonne tolte da altre migrazioni.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const errore = (motivo: string): never => { throw new Error(`utente 073: ${motivo}; nessuna modifica applicata.`); };

export const utente073: Migration = {
  id: 73,
  name: 'primo_richiamo_speso',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    db.exec(`CREATE TABLE IF NOT EXISTS utente.primo_richiamo_speso (
      partita_id   INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      persona_id   INTEGER NOT NULL,
      posseduta_id INTEGER,
      speso_il     TEXT NOT NULL,
      PRIMARY KEY (partita_id, persona_id)
    )`);
    const conGioco = !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'persona'").get()
      && (db.prepare('PRAGMA main.table_info(persona)').all() as Array<{ name: string }>).some((c) => c.name === 'dlc');
    const daRicostruire = (db.prepare(`SELECT (SELECT COUNT(*) FROM utente.persona_posseduta)
      + (SELECT COUNT(*) FROM utente.evento_partita WHERE tipo = 'persona-aggiunta' AND persona_id IS NOT NULL)`).pluck().get() as number);
    if (!conGioco) {
      // senza il file di gioco non si sa quali Persona sono DLC: con delle righe da ricostruire non si va avanti alla cieca
      if (daRicostruire > 0) errore('manca main.persona.dlc, e la scorta o lo storico hanno Persona da esaminare');
      return;
    }
    const prima = db.prepare('SELECT COUNT(*) FROM utente.primo_richiamo_speso').pluck().get() as number;
    // 1. nella scorta: l'esemplare è quello d'ingresso se nessuna aggiunta della stessa Persona è più vecchia
    db.prepare(`INSERT OR IGNORE INTO utente.primo_richiamo_speso (partita_id, persona_id, posseduta_id, speso_il)
      SELECT pp.partita_id, pp.persona_id,
        CASE WHEN x.prima IS NULL THEN pp.id ELSE NULL END,
        CASE WHEN x.prima IS NULL THEN pp.created_at ELSE x.prima END
      FROM utente.persona_posseduta pp
      JOIN main.persona p ON p.id = pp.persona_id AND p.dlc = 1
      LEFT JOIN (SELECT e.partita_id, e.persona_id, MIN(e.created_at) AS prima FROM utente.evento_partita e WHERE e.tipo = 'persona-aggiunta' GROUP BY e.partita_id, e.persona_id) x
        ON x.partita_id = pp.partita_id AND x.persona_id = pp.persona_id AND x.prima < pp.created_at
      ORDER BY pp.partita_id, pp.persona_id, pp.id`).run();
    // 2. solo nello storico: la prima aggiunta, senza esemplare
    db.prepare(`INSERT OR IGNORE INTO utente.primo_richiamo_speso (partita_id, persona_id, posseduta_id, speso_il)
      SELECT e.partita_id, e.persona_id, NULL, MIN(e.created_at)
      FROM utente.evento_partita e JOIN main.persona p ON p.id = e.persona_id AND p.dlc = 1
      WHERE e.tipo = 'persona-aggiunta'
      GROUP BY e.partita_id, e.persona_id
      ORDER BY e.partita_id, e.persona_id`).run();
    const dopo = db.prepare('SELECT COUNT(*) FROM utente.primo_richiamo_speso').pluck().get() as number;
    // ogni Persona DLC che oggi risulta con il richiamo speso (in scorta o con l'aggiunta nello storico) ha la sua riga
    const mancanti = db.prepare(`SELECT COUNT(*) FROM (
        SELECT pp.partita_id, pp.persona_id FROM utente.persona_posseduta pp JOIN main.persona p ON p.id = pp.persona_id AND p.dlc = 1
        UNION SELECT e.partita_id, e.persona_id FROM utente.evento_partita e JOIN main.persona p ON p.id = e.persona_id AND p.dlc = 1 WHERE e.tipo = 'persona-aggiunta'
      ) s WHERE NOT EXISTS (SELECT 1 FROM utente.primo_richiamo_speso r WHERE r.partita_id = s.partita_id AND r.persona_id = s.persona_id)`).pluck().get() as number;
    if (mancanti > 0) errore(`${mancanti} Persona DLC con il richiamo speso non hanno la loro riga`);
    logger.info({ migrazione: 'utente-073', righe: dopo - prima }, 'primo richiamo DLC speso: righe ricostruite dalla scorta e dallo storico');
  },
};
