// ============================================================
// 216 — le condizioni strutturate che le frasi di sblocco dicevano e la struttura no (L11 · R11-02/9, passo 1)
// ============================================================
//
// Analisi dati (`lotti/L11/sblocchi-luoghi-attivita-2026-10-24.md` §2.3 e §3), approvata dal PM il 24/10. Prima di archiviare `luogo.sblocco` e `attivita.sblocco`
// (migrazione successiva) si portano nella struttura le informazioni che solo la frase aveva. Ogni modifica ha la guardia sul valore attuale (`condizioni_json` uguale
// a quello atteso): una riga già cambiata si salta senza errore, e l'esito si legge nel log.
//   Luoghi: Sala giochi di Akihabara (richiesta «I vincenti non imbrogliano» + dal 4/9); Piazza della Stazione di Shibuya (lavoro all'Ore no Beko, 2 volte);
//     Ingresso dei Memento (data 7/5 + Palazzo di Kamoshida); Okumura Foods (finestra del Palazzo di Okumura al posto della data 15/9).
//   Attività: Gun About (aggiunta la richiesta); Biblioteca della scuola (dal 9/4 al 20/5, solo AGS); Crossroads (Perizia 4 e Coraggio 3 oltre a Ohya e Gentilezza 3,
//     Samurai Gamers); Ore no Beko (dal 5/6 e Perizia 2, Samurai Gamers; la frase «nessun requisito» lo contraddiceva).
//   Harajuku resta aperta dalla lettura di «Vague» e dall'invito di Ryuji del 29/5 (decisione dell'utente «Ryuji 29/5 (ACE)»): si aggiunge alla nota del luogo la discordanza con
//   Samurai Gamers (invito di Mishima del 3/8).
// NON si tocca Big Bang Burger (le fonti non dicono se le tre doti valgono tutte o una sola: resta la frase in archivio) né i luoghi «N» (racconto del Confidente).
// Scrive solo in `main`; le impronte delle altre colonne e delle tabelle vicine si controllano dopo.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';

const errore = (motivo: string): never => { throw new Error(`216: ${motivo}; nessuna modifica applicata.`); };
const j = (v: unknown): string => JSON.stringify(v);

interface Modifica { tabella: 'luogo' | 'attivita'; chiave: string; da: string; a: string }
const MODIFICHE: readonly Modifica[] = [
  { tabella: 'luogo', chiave: 'akihabara/sala-giochi-akihabara', da: '[]', a: j([{ tipo: 'richiesta', richiesta: 'i-vincenti-non-imbrogliano' }, { tipo: 'data', dal: '09-04' }]) },
  { tabella: 'luogo', chiave: 'shibuya/stazione-piazza-shibuya', da: '[]', a: j([{ tipo: 'attivita', attivita: 'lavoro-ore-no-beko', volte: 2 }]) },
  { tabella: 'luogo', chiave: 'mementos/ingresso-mementos', da: j([{ tipo: 'data', dal: '05-07' }]), a: j([{ tipo: 'data', dal: '05-07' }, { tipo: 'palazzo', dungeon: 'kamoshida' }]) },
  { tabella: 'luogo', chiave: 'roppongi/okumura-foods-hq', da: j([{ tipo: 'data', dal: '09-15' }]), a: j([{ tipo: 'finestra-palazzo', dungeon: 'okumura' }]) },
  { tabella: 'attivita', chiave: 'sala-giochi-gun-about-akihabara', da: j([{ tipo: 'confidente', confidente: 'shinya', rango: 1 }, { tipo: 'data', dal: '09-04' }]),
    a: j([{ tipo: 'confidente', confidente: 'shinya', rango: 1 }, { tipo: 'data', dal: '09-04' }, { tipo: 'richiesta', richiesta: 'i-vincenti-non-imbrogliano' }]) },
  { tabella: 'attivita', chiave: 'studio-biblioteca-scuola', da: j([{ tipo: 'data', dal: '04-09' }]), a: j([{ tipo: 'intervallo', dal: '04-09', al: '05-20' }]) },
  { tabella: 'attivita', chiave: 'lavoro-crossroads', da: j([{ tipo: 'confidente', confidente: 'ohya', rango: 1 }, { tipo: 'dote', dote: 'gentilezza', rango: 3 }, { tipo: 'dote', dote: 'perizia', rango: 3 }]),
    a: j([{ tipo: 'confidente', confidente: 'ohya', rango: 1 }, { tipo: 'dote', dote: 'gentilezza', rango: 3 }, { tipo: 'dote', dote: 'perizia', rango: 4 }, { tipo: 'dote', dote: 'coraggio', rango: 3 }]) },
  { tabella: 'attivita', chiave: 'lavoro-ore-no-beko', da: '[]', a: j([{ tipo: 'data', dal: '06-05' }, { tipo: 'dote', dote: 'perizia', rango: 2 }]) },
];
const NOTA_HARAJUKU = 'Discordanza fra le fonti Royal: Samurai Gamers apre il luogo con il libro «Vague» o con l\'invito di Mishima del 3/8; i dati di gioco (ACE) con l\'invito di Ryuji del 29/5 (Palazzo del museo completato). Vale l\'invito di Ryuji, per decisione dell\'utente.';

export const migration216: Migration = {
  id: 216, name: 'condizioni_sblocco_mancanti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'luogo') || !esisteTabella(db, 'attivita')) return;
    const prima = new Map<string, string>();
    for (const t of ['luogo', 'attivita'] as const) prima.set(t, improntaTabella(db, t, ['condizioni_json', 'note']));
    for (const t of ['articolo', 'negozio', 'quartiere', 'confidente_invito']) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));

    const fatte: string[] = []; const saltate: string[] = [];
    for (const m of MODIFICHE) {
      const r = db.prepare(`SELECT condizioni_json FROM main.${m.tabella} WHERE chiave = ?`).get(m.chiave) as { condizioni_json: string | null } | undefined;
      if (!r) { saltate.push(`${m.chiave} (assente)`); continue; }
      if ((r.condizioni_json ?? '[]') === m.a) continue;
      if ((r.condizioni_json ?? '[]') !== m.da) { saltate.push(`${m.chiave} (cambiata)`); continue; }
      db.prepare(`UPDATE main.${m.tabella} SET condizioni_json = ? WHERE chiave = ?`).run(m.a, m.chiave);
      fatte.push(m.chiave);
    }
    const harajuku = db.prepare("SELECT note FROM main.luogo WHERE chiave = 'harajuku/harajuku-hangout'").get() as { note: string | null } | undefined;
    if (harajuku && !(harajuku.note ?? '').includes('Samurai Gamers')) {
      db.prepare("UPDATE main.luogo SET note = ? WHERE chiave = 'harajuku/harajuku-hangout'").run(harajuku.note ? `${harajuku.note}\n${NOTA_HARAJUKU}` : NOTA_HARAJUKU);
      fatte.push('harajuku/harajuku-hangout (nota)');
    }
    if (fatte.length === 0) return;
    for (const t of ['luogo', 'attivita'] as const) if (improntaTabella(db, t, ['condizioni_json', 'note']) !== prima.get(t)) errore(`le altre colonne di ${t} sono cambiate`);
    for (const [t, imp] of prima) if (t !== 'luogo' && t !== 'attivita' && improntaTabella(db, t) !== imp) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-R11-02-216', fatte, saltate }, 'condizioni di sblocco mancanti portate nella struttura');
  },
};
