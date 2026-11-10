// ============================================================
// 354 — via le strutture del listino condiviso (L2-10, lotto «Macchine e fine del listino condiviso»)
// ============================================================
//
// Una macchina è un punto vendita con le sue offerte (AD1, AD5): nessun servizio legge più `negozio.listino_condiviso`, `articolo.articolo_condiviso`,
// `negozio_luogo_extra`, `negozio_sede_spillo` e `negozio_sede_foto`. La migrazione, in quest'ordine:
//  (1) toglie gli indici delle due colonne, che altrimenti impedirebbero il `DROP COLUMN`;
//  (2) archivia in `dati_guida.archivio-frasi-l11` ogni valore non vuoto delle colonne e tutte le righe delle tabelle (la 121 può scrivere le due colonne su un
//      backup vecchio: si conta, non si presume zero), e controlla che le righe archiviate siano le righe tolte;
//  (3) toglie le colonne con `ALTER TABLE … DROP COLUMN` (SQLite lo accetta: nessun indice, vista o trigger le cita più, e i vincoli stanno sulla colonna stessa);
//  (4) toglie le tabelle, figlie prima: `negozio_sede_spillo` cita `negozio_luogo_extra`.
// Idempotente: ogni parte si salta se la sua struttura non c'è più. Impronte di `negozio`, `articolo` (senza la colonna tolta), `luogo`, `spillo` e `cestino` prima
// e dopo. `server/db/fontiTolte.ts` riceve le cinque voci: un pin vecchio del Cestino salta la riga di una tabella tolta dicendo il motivo.
// Verbale: `dati_guida.audit-l2-10-listino-condiviso`. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella, righeConValore, type RigheArchiviate } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, registraAudit, righeArchiviate } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`354: ${motivo}; nessuna modifica applicata.`); };

const MIGRAZIONE = 'L2-10 · 354';
const INDICI = ['idx_articolo_condiviso', 'idx_negozio_listino_condiviso'] as const;
const COLONNE = [{ tabella: 'negozio', colonna: 'listino_condiviso' }, { tabella: 'articolo', colonna: 'articolo_condiviso' }] as const;
type Riga = Record<string, unknown>;
/** In ordine di rimozione: la prima cita la seconda. */
const TABELLE: ReadonlyArray<{ nome: string; chiave: (r: Riga) => string }> = [
  { nome: 'negozio_sede_spillo', chiave: (r) => String(r.spillo_uid) },
  { nome: 'negozio_luogo_extra', chiave: (r) => `${String(r.negozio_chiave)}|${String(r.luogo_chiave)}` },
  { nome: 'negozio_sede_foto', chiave: (r) => String(r.negozio_chiave) },
];
const IMPRONTE: ReadonlyArray<{ tabella: string; senza: readonly string[] }> = [
  { tabella: 'negozio', senza: ['listino_condiviso'] }, { tabella: 'articolo', senza: ['articolo_condiviso'] },
  { tabella: 'luogo', senza: [] }, { tabella: 'spillo', senza: [] }, { tabella: 'cestino', senza: [] },
];

export const migration354: Migration = {
  id: 354,
  name: 'listino_condiviso_tolto',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!['negozio', 'articolo', 'dati_guida'].every((t) => esisteTabella(db, t))) return;
    const indici = INDICI.filter((i) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'index' AND name = ?").get(i));
    const colonne = COLONNE.filter((c) => haColonna(db, c.tabella, c.colonna));
    const tabelle = TABELLE.filter((t) => esisteTabella(db, t.nome));
    if (indici.length === 0 && colonne.length === 0 && tabelle.length === 0) return;

    const presenti = IMPRONTE.filter((i) => esisteTabella(db, i.tabella));
    const prima = new Map(presenti.map((i) => [i.tabella, improntaTabella(db, i.tabella, i.senza)]));

    // (1) gli indici, prima delle colonne
    for (const i of indici) db.exec(`DROP INDEX main.${i}`);

    // (2) l'archivio: righe archiviate = righe tolte
    const conteggi: Record<string, { righe: number; archiviate: number }> = {};
    const archivia = (voce: string, righe: RigheArchiviate): void => {
      const nuove = archiviaSenzaSovrascrivere(db, MIGRAZIONE, voce, righe);
      const salvate = righeArchiviate(db, voce);
      if (!Object.keys(righe).every((k) => k in salvate)) errore(`l’archivio di ${voce} non ha tutte le righe`);
      conteggi[voce] = { righe: Object.keys(righe).length, archiviate: nuove };
    };
    for (const c of colonne) archivia(`${c.tabella}.${c.colonna}`, righeConValore(db, c.tabella, c.colonna));
    for (const t of tabelle) {
      const righe = db.prepare(`SELECT * FROM main.${t.nome} ORDER BY rowid`).all() as Riga[];
      const perChiave = Object.fromEntries(righe.map((r) => [t.chiave(r), r]));
      if (Object.keys(perChiave).length !== righe.length) errore(`${t.nome} ha due righe con la stessa chiave d’archivio`);
      archivia(t.nome, perChiave);
    }

    // (3) le colonne, (4) le tabelle
    for (const c of colonne) {
      db.exec(`ALTER TABLE main.${c.tabella} DROP COLUMN "${c.colonna}"`);
      if (haColonna(db, c.tabella, c.colonna)) errore(`la colonna ${c.tabella}.${c.colonna} esiste ancora`);
    }
    for (const t of tabelle) {
      db.exec(`DROP TABLE main.${t.nome}`);
      if (esisteTabella(db, t.nome)) errore(`la tabella ${t.nome} esiste ancora`);
    }

    for (const i of presenti) if (improntaTabella(db, i.tabella, i.senza) !== prima.get(i.tabella)) errore(`la tabella ${i.tabella} è cambiata`);
    // un pin verso un punto vendita sta nell'Area della sua sede (I2): atteso nessuno fuori posto
    const pinFuoriArea = db.prepare(`SELECT s.id FROM main.spillo s JOIN main.mappa m ON m.chiave = s.mappa_chiave JOIN main.negozio n ON n.chiave = s.riferimento_chiave JOIN main.luogo l ON l.chiave = n.sede_chiave
      WHERE s.riferimento_tipo = 'negozio' AND m.area_chiave IS NOT l.area_chiave ORDER BY s.id`).pluck().all() as number[];
    if (pinFuoriArea.length > 0) logger.warn({ migrazione: 'L2-10-354', pinFuoriArea }, 'pin verso un negozio la cui planimetria ha un’Area diversa da quella della sede');
    const dettagli = { indiciTolti: indici, colonneTolte: colonne.map((c) => `${c.tabella}.${c.colonna}`), tabelleTolte: tabelle.map((t) => t.nome), conteggi, pinFuoriArea: { conteggio: pinFuoriArea.length, id: pinFuoriArea } };
    registraAudit(db, 'audit-l2-10-listino-condiviso', { migrazione: MIGRAZIONE, ...dettagli });
    logger.info({ migrazione: 'L2-10-354', ...dettagli }, 'strutture del listino condiviso tolte');
  },
};
