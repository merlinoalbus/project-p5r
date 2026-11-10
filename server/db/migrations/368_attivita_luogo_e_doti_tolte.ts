// ============================================================
// 368 — via `attivita.luogo` e `attivita.doti_json` (L8-01)
// ============================================================
//
// Il «dove» di un'attività è la sua sede (`sede_chiave`, DECISIONI §11): il testo `luogo` ne era la copia in prosa. Le due attività senza sede
// (`lettura-metropolitana`, `san-valentino`) non perdono nulla: la prima lo dice in `dettagli`, la seconda diceva solo «Tokyo». `doti_json` non era vuota
// solo nel Triple Seven (+2 Fascino, nota di fonte secondaria): la Dote è già in `effetti_json` e con la 370 passa negli esiti.
//
// COSA, in quest'ordine: (a) archivio in `dati_guida.archivio-frasi-l11` di ogni valore non vuoto delle due colonne (righe archiviate = righe tolte); (b) `DROP COLUMN`.
// `server/db/fontiTolte.ts` riceve le due voci. COSA NON CAMBIA: le altre colonne (impronta prima e dopo), il numero delle righe. Idempotente: senza le colonne non fa
// nulla. Verbale: `dati_guida.audit-l8-368-attivita`. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate, registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`368: ${motivo}; nessuna modifica applicata.`); };
const COLONNE = ['luogo', 'doti_json'] as const;
const vuoto = (v: string | null): boolean => v === null || ['', '[]', 'null'].includes(v.trim());

export const migration368: Migration = {
  id: 368,
  name: 'attivita_luogo_e_doti_tolte',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'attivita') || !esisteTabella(db, 'dati_guida')) return;
    const daTogliere = COLONNE.filter((c) => haColonna(db, 'attivita', c));
    if (daTogliere.length === 0) return;

    const impronta = improntaTabella(db, 'attivita', daTogliere);
    const archiviate: Record<string, number> = {};
    const righeConValore: Record<string, string[]> = {};
    for (const c of daTogliere) {
      const righe = (db.prepare(`SELECT chiave, "${c}" AS v FROM main.attivita ORDER BY rowid`).all() as Array<{ chiave: string; v: string | null }>).filter((r) => !vuoto(r.v));
      const valori = Object.fromEntries(righe.map((r) => [r.chiave, r.v as string]));
      righeConValore[c] = righe.map((r) => r.chiave);
      archiviate[c] = archiviaSenzaSovrascrivere(db, 'L8-01 · 368', `attivita.${c}`, valori);
      if (!Object.keys(valori).every((k) => k in righeArchiviate(db, `attivita.${c}`))) errore(`l’archivio di attivita.${c} non ha tutte le righe`);
    }
    for (const c of daTogliere) {
      db.exec(`ALTER TABLE main.attivita DROP COLUMN "${c}"`);
      if (haColonna(db, 'attivita', c)) errore(`la colonna ${c} esiste ancora`);
    }
    if (improntaTabella(db, 'attivita') !== impronta) errore('le altre colonne di attivita sono cambiate');

    registraAudit(db, 'audit-l8-368-attivita', { migrazione: 'L8-01 · 368', colonneTolte: daTogliere, archiviate, righeConValore });
    logger.info({ migrazione: 368, tolte: daTogliere, archiviate }, 'attività: luogo in prosa e Doti storiche tolti');
  },
};
