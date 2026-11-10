// ============================================================
// 371 — le 21 serate con la cantante del Jazz Club nel Calendario (L8-04)
// ============================================================
//
// Fonte: https://www.allgamestaff.it/persona-5-royal/jazz-club/ (paragrafo «Le serate con cantante»): ogni data della tabella col suo giorno della settimana, che coincide
// con quello del calendario di gioco (lunedì 6, martedì 4, mercoledì 4, giovedì 5, venerdì 2, come dice la tabella riassuntiva della stessa pagina). Tutte dopo il 26 giugno
// (ordine 78): nessuna tocca il periodo validato. Evento `consiglio`, dopo quelli già presenti in quel giorno; `fonte_chiave` = `cantante-jazz:<data>` (nessuna fonte da risolvere:
// l'evento resta alla data della sua riga). Idempotente per (data, titolo). Non si creano legami con le voci del Diario: `evento_calendario_voce` resta identica (impronta).
// Verbale: `dati_guida.audit-l8-371-serate-cantante`. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`371: ${motivo}; nessuna modifica applicata.`); };
const FONTE = 'https://www.allgamestaff.it/persona-5-royal/jazz-club/';
const TITOLO = 'Serata con la cantante al Jazz Club';
const DETTAGLIO = 'Gli effetti dei cocktail sono raddoppiati. Una serata con la cantante sblocca la versione vocale di «No More What Ifs» per il Covo dei Ladri.';

const DATE = ['07-04', '07-12', '07-28', '07-29', '08-01', '08-09', '08-17', '08-25', '09-05', '09-21', '09-22', '09-30', '10-03', '11-07', '11-08', '11-16', '12-05', '12-13', '12-22', '01-18', '01-26'] as const;

export const migration371: Migration = {
  id: 371,
  name: 'serate_cantante_jazz',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'evento_calendario') || !esisteTabella(db, 'giorno') || !esisteTabella(db, 'dati_guida') || !haColonna(db, 'evento_calendario', 'fonte_chiave')) return;
    const legami = esisteTabella(db, 'evento_calendario_voce') ? improntaTabella(db, 'evento_calendario_voce') : null;
    const scritte: string[] = [];
    const saltate: Array<{ data: string; motivo: string }> = [];
    const inserisci = db.prepare(`INSERT INTO main.evento_calendario (data, ordine, tipo, titolo, dettaglio, fonte, origine, fonte_chiave)
      VALUES (?, ?, 'consiglio', ?, ?, ?, 'seed', ?)`);
    for (const data of DATE) {
      if (db.prepare('SELECT 1 FROM main.evento_calendario WHERE data = ? AND titolo = ?').get(data, TITOLO)) continue;
      if (!db.prepare('SELECT 1 FROM main.giorno WHERE data = ?').get(data)) { saltate.push({ data, motivo: 'giorno assente dal calendario' }); continue; }
      const ordine = (db.prepare('SELECT COALESCE(MAX(ordine) + 1, 0) FROM main.evento_calendario WHERE data = ?').pluck().get(data) as number);
      inserisci.run(data, ordine, TITOLO, DETTAGLIO, FONTE, `cantante-jazz:${data}`);
      scritte.push(data);
    }
    if (legami !== null && improntaTabella(db, 'evento_calendario_voce') !== legami) errore('i legami con le voci del Diario sono cambiati');
    if (scritte.length === 0 && saltate.length === 0) return;
    registraAudit(db, 'audit-l8-371-serate-cantante', { migrazione: 'L8-04 · 371', fonte: FONTE, scritte, saltate });
    logger.info({ migrazione: 371, scritte: scritte.length, saltate }, 'serate con la cantante del Jazz Club nel Calendario');
  },
};
