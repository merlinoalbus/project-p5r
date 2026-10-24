// ============================================================
// 214 — l'attività «Esperimenti clinici» di Takemi senza la copia dei suoi effetti (R11-16/1; decisione del PM del 24/10, fonte unica)
// ============================================================
//
// `esperimenti-clinici-takemi` è collegata al Confidente Takemi (`confidente_chiave`): la Dote di quegli incontri vive nella fonte del Confidente
// (`confidente_dote_incontro`: Coraggio +1 a ogni passaggio di rango da 1 a 8), non in una copia nell'attività. L'attività teneva in più `effetti_json` = Coraggio +1
// (senza condizioni), che la regola «campi autonomi» (`verificaAttivitaConfidente`) rifiutava in anteprima di importazione: neanche l'esportazione dell'istanza si
// poteva reimportare. Nessun lettore usava quell'effetto (il DTO dell'attività con fonte Confidente non porta effetti né Doti, e `noteDelConseguimento` risponde vuoto):
// la Dote mostrata e registrata è già quella della fonte. Si azzera `effetti_json` (NULL) con guardia sul valore atteso e sulla fonte (Takemi deve dare Coraggio +1);
// il valore di prima va in `dati_guida.archivio-correzioni-attivita-l11`. Nota: la fonte dà il +1 ai ranghi 1-8, l'effetto copiato era senza condizioni: la fonte è la più precisa.
// Idempotente. Scrive solo in `main`; le altre colonne di `attivita` e le tabelle vicine non cambiano.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';

const CHIAVE = 'esperimenti-clinici-takemi';
const ARCHIVIO = 'archivio-correzioni-attivita-l11';
const ATTESO = '[{"effetto":{"famiglia":"dote","dote":"coraggio","note":1},"condizioni":[]}]';
const errore = (motivo: string): never => { throw new Error(`214: ${motivo}; nessuna modifica applicata.`); };

export const migration214: Migration = {
  id: 214, name: 'attivita_takemi_senza_effetto_proprio',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'attivita') || !esisteTabella(db, 'dati_guida')) return;
    const r = db.prepare('SELECT confidente_chiave, effetti_json FROM main.attivita WHERE chiave = ?').get(CHIAVE) as { confidente_chiave: string | null; effetti_json: string | null } | undefined;
    if (!r || r.effetti_json === null || r.effetti_json === '' || r.effetti_json === '[]') return;
    if (r.confidente_chiave !== 'takemi' || r.effetti_json !== ATTESO) errore(`l'attività ${CHIAVE} non è come attesa`);
    if (!esisteTabella(db, 'confidente_dote_incontro')) errore('manca la fonte dei Confidenti');
    const fonte = db.prepare("SELECT effetti_json FROM main.confidente_dote_incontro WHERE confidente_chiave = 'takemi'").all() as Array<{ effetti_json: string }>;
    if (!fonte.some((f) => f.effetti_json.includes('"dote":"coraggio"') && f.effetti_json.includes('"note":1'))) errore('la fonte di Takemi non dà Coraggio +1');

    const prima = improntaTabella(db, 'attivita', ['effetti_json']);
    const vicine = new Map(['confidente_dote_incontro', 'confidente', 'voce_giornata'].filter((t) => esisteTabella(db, t)).map((t) => [t, improntaTabella(db, t)]));
    const esistente = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO) as string | undefined;
    const blocco = esistente ? JSON.parse(esistente) as { attivita?: Record<string, unknown> } : {};
    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(ARCHIVIO, JSON.stringify({
      versione: 1, motivo: 'Copie di effetti tolte da attività con fonte Confidente (R11-16/1, migrazione 214): chiave → valore di prima.', attivita: { ...(blocco.attivita ?? {}), [CHIAVE]: { effetti_json: r.effetti_json } } }));
    db.prepare('UPDATE main.attivita SET effetti_json = NULL WHERE chiave = ?').run(CHIAVE);

    if (improntaTabella(db, 'attivita', ['effetti_json']) !== prima) errore('le altre colonne di attivita sono cambiate');
    for (const [t, imp] of vicine) if (improntaTabella(db, t) !== imp) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'R11-16-214', attivita: CHIAVE }, 'attività di Takemi senza effetto proprio');
  },
};
