// ============================================================
// 360 — le Doti degli incontri mancanti e il Riverbero di Yusuke (L7-03)
// ============================================================
//
// La 088 aveva copiato in `confidente_dote_incontro` solo le voci che portavano la Dote: restavano fuori incontri che la guida dice, una riga per rango, nelle pagine dei
// Confidenti (rapporto L §2.7). Elenco chiuso, ogni valore letto nella pagina del Confidente:
//   Ohya (fascino): 7 +3, 8 +3 · Shinya (gentilezza): 1 +3, 3 +2, 6 +2, 8 +3, 9 +3, 10 +1 · Hifumi (conoscenza): 2, 3, 7, 8 +1 · Sojiro (gentilezza): 6 +3, 7 +3.
// Si scrive solo una riga mancante o con `[]`; un valore già diverso resta e va nel verbale, e così una riga con la fotografia di una modifica dell'utente. Il Fascino +1 del
// rango 3 di Sojiro viene dal caffè, un'azione: non è una Dote dell'incontro. Le Doti restano a mano: questo dato alimenta il promemoria, non applica niente.
// Yusuke, rango 3: «Riverbero» (guida, pagina di Yusuke, tabella «Abilità»; descrizione uguale a quella delle altre abilità con lo stesso nome). Al rango 3 non ci sono
// abilità: `ordine` 0 non collide con niente (la chiave è confidente, rango, ordine, e la lettura è ORDER BY rango, ordine) e non serve rinumerare.
// Verbale: `dati_guida.audit-l7-360-doti-e-riverbero`. Nessun import da `server/services/`; non si scrive in `utente`. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`360: ${motivo}; nessuna modifica applicata.`); };

const DOTI: ReadonlyArray<{ confidente: string; dote: string; righe: ReadonlyArray<readonly [number, number]> }> = [
  { confidente: 'ohya', dote: 'fascino', righe: [[7, 3], [8, 3]] },
  { confidente: 'shinya', dote: 'gentilezza', righe: [[1, 3], [3, 2], [6, 2], [8, 3], [9, 3], [10, 1]] },
  { confidente: 'hifumi', dote: 'conoscenza', righe: [[2, 1], [3, 1], [7, 1], [8, 1]] },
  { confidente: 'sojiro', dote: 'gentilezza', righe: [[6, 3], [7, 3]] },
];
const RIVERBERO = { confidente: 'yusuke', rango: 3, ordine: 0, nome: 'Riverbero', descrizione: 'Chance di proseguire l\'attacco se il colpo di Joker non abbatte il nemico.' } as const;

export const migration360: Migration = {
  id: 360,
  name: 'doti_incontri_e_riverbero',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'confidente_dote_incontro') || !esisteTabella(db, 'confidente_abilita') || !esisteTabella(db, 'dati_guida')) return;

    const esiti: Array<{ riga: string; esito: string; valore?: string }> = [];
    let scritte = 0;
    for (const { confidente, dote, righe } of DOTI) {
      for (const [rango, note] of righe) {
        const riga = `${confidente}|${rango}`;
        const valore = JSON.stringify([{ effetto: { famiglia: 'dote', dote, note } }]);
        const r = db.prepare('SELECT effetti_json FROM main.confidente_dote_incontro WHERE confidente_chiave = ? AND verso_rango = ?').get(confidente, rango) as { effetti_json: string } | undefined;
        if (r?.effetti_json === valore) continue;
        if (r && r.effetti_json !== '[]') { esiti.push({ riga, esito: 'già diverso: resta', valore: r.effetti_json }); continue; }
        if (db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(`confidente-seed-v1:dote-incontro:${confidente}:${rango}`)) { esiti.push({ riga, esito: 'modificato dall’utente (c’è la fotografia): resta' }); continue; }
        if (!db.prepare('SELECT 1 FROM main.confidente WHERE chiave = ?').get(confidente)) { esiti.push({ riga, esito: 'Confidente assente: niente da fare' }); continue; }
        db.prepare('INSERT INTO main.confidente_dote_incontro (confidente_chiave, verso_rango, effetti_json) VALUES (?, ?, ?) ON CONFLICT(confidente_chiave, verso_rango) DO UPDATE SET effetti_json = excluded.effetti_json').run(confidente, rango, valore);
        scritte++;
        esiti.push({ riga, esito: r ? 'scritta (era [])' : 'aggiunta', valore });
      }
    }

    const improntaPrima = improntaTabella(db, 'confidente_abilita');
    const conNome = db.prepare('SELECT rango, ordine, descrizione FROM main.confidente_abilita WHERE confidente_chiave = ? AND nome = ?').get(RIVERBERO.confidente, RIVERBERO.nome) as { rango: number; ordine: number; descrizione: string } | undefined;
    const alRango = db.prepare('SELECT COUNT(*) FROM main.confidente_abilita WHERE confidente_chiave = ? AND rango = ?').pluck().get(RIVERBERO.confidente, RIVERBERO.rango) as number;
    let abilita = 'già presente';
    if (!conNome) {
      if (alRango > 0) abilita = `al rango 3 c’è già un’altra abilità (${alRango}): resta, Riverbero non aggiunta`;
      else if (db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave LIKE ?').get(`confidente-seed-v1:abilita:${RIVERBERO.confidente}:${RIVERBERO.rango}`)) abilita = 'abilità del rango 3 modificate dall’utente: Riverbero non aggiunta';
      else if (!db.prepare('SELECT 1 FROM main.confidente WHERE chiave = ?').get(RIVERBERO.confidente)) abilita = 'Confidente assente';
      else {
        db.prepare('INSERT INTO main.confidente_abilita (confidente_chiave, rango, ordine, nome, descrizione) VALUES (?, ?, ?, ?, ?)').run(RIVERBERO.confidente, RIVERBERO.rango, RIVERBERO.ordine, RIVERBERO.nome, RIVERBERO.descrizione);
        abilita = 'aggiunta';
        scritte++;
      }
    } else if (conNome.rango !== RIVERBERO.rango) abilita = `già presente al rango ${conNome.rango}: resta`;
    if (abilita !== 'aggiunta' && improntaTabella(db, 'confidente_abilita') !== improntaPrima) errore('le abilità sono cambiate senza motivo');

    if (scritte > 0 || esiti.length > 0) registraAudit(db, 'audit-l7-360-doti-e-riverbero', { migrazione: 'L7-03 · 360', scritte, esiti, riverbero: abilita });
    logger.info({ migrazione: 360, scritte, riverbero: abilita }, 'Doti degli incontri e Riverbero di Yusuke');
  },
};
