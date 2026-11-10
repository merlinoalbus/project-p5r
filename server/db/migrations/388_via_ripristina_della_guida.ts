// ============================================================
// 388 — via i dati che servivano solo a «Ripristina» al valore della guida (decisione dell'utente del 10/11)
// ============================================================
//
// L'utente: «Puoi rimuovere questo ripristina del tutto in tutti i punti». I gesti e le rotte sono tolti dal codice; qui escono i dati che
// li servivano e che, tolti i gesti, nessuna parte dell'app legge più:
//   - `dungeon.seed_json` (112): la fotografia del boss finale e delle date di un Palazzo, letta solo dai due «Ripristina» e dai segni
//     `bossFinaleCorretto`/`dateCorrette` che mostravano i pulsanti;
//   - `giorno.seed_json` (168): la fotografia del giorno di gioco, letta solo da «Ripristina» e dal segno `modificato` del pulsante (l'origine
//     «utente» della riga resta: la legge la ricarica del pacchetto);
//   - `catalogo_oggetto.seed_json` (121): la fotografia di un oggetto del catalogo, letta solo da «Ripristina» e dal segno `modificato` del
//     pulsante (l'origine «utente» resta);
//   - `dati_guida['requisiti-nota-guida-v1']` (359): le note della guida dei requisiti dei Confidenti, lette solo da «Ripristina dalla guida»
//     (la copia `confidente_requisito_guida` resta: dà il segno «Modificato» dell'editor e la legge l'importazione);
//   - `dati_guida['confidente-seed-v1:dote-incontro:*']`: le fotografie della Dote a ogni incontro, lette solo dal suo «Ripristina» (le
//     fotografie di ranghi, abilità e dialoghi restano: danno i segni «Modificato»);
//   - il segno `{"creataDaUtente":true}` in `traduzione.extra_json`, letto solo da «Ripristina» delle Traduzioni (la riga resta, `extra_json` NULL);
//   - le tracce «~…» delle propagazioni dentro le fotografie `seed_json` di quartieri e skill (`~alias`, `~traduzioni`), lette solo dal
//     ritorno ai valori della guida del correttore unico (le fotografie restano: danno il valore della guida delle schede di correzione).
// Ogni valore tolto va prima nell'archivio `dati_guida.archivio-frasi-l11` (chiave della riga → valore, mai sovrascritto): nulla si perde. Le
// colonne tolte sono registrate in `fontiTolte.ts`.
//
// COSA NON CAMBIA (impronte prima e dopo): le altre colonne di `dungeon`, `giorno`, `catalogo_oggetto`, `traduzione`, `quartiere`, `skill` e le
// altre righe di `dati_guida` (tranne l'archivio e il verbale). Nessuna scrittura in `utente`: Diario, partite e Palazzi completati non si
// toccano. Idempotente: con colonne, chiavi, segni e tracce già tolti non fa niente e non scrive il verbale. Nessun import da `server/services/`.
// Verbale: `dati_guida.audit-388-via-ripristina`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { ARCHIVIO_FRASI, esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate, registraAudit } from './archivioL1.js';

const MIGRAZIONE = 'via Ripristina · 388';
const AUDIT = 'audit-388-via-ripristina';
const errore = (motivo: string): never => { throw new Error(`388: ${motivo}; nessuna modifica applicata.`); };

/** Le colonne che escono, con la colonna che fa da chiave della riga nell'archivio. */
export const COLONNE_TOLTE_388 = [
  { tabella: 'dungeon', colonna: 'seed_json', chiave: 'chiave' },
  { tabella: 'giorno', colonna: 'seed_json', chiave: 'data' },
  { tabella: 'catalogo_oggetto', colonna: 'seed_json', chiave: 'chiave' },
] as const;

const CHIAVE_NOTE_REQUISITI = 'requisiti-nota-guida-v1';
const PREFISSO_DOTE_INCONTRO = 'confidente-seed-v1:dote-incontro:';
const MARCA_CREATA = '{"creataDaUtente":true}';
/** Le tabelle del correttore unico le cui fotografie potevano avere tracce «~…» (quartiere: `~alias`; skill: `~traduzioni`). */
const TABELLE_CON_TRACCE = [{ tabella: 'quartiere', chiave: 'chiave' }, { tabella: 'skill', chiave: 'CAST(id AS TEXT)' }] as const;

/** Impronta (conteggio e SHA-256) di `dati_guida` senza le chiavi che la migrazione toglie o scrive (l'archivio e il verbale). */
function improntaDatiGuida(db: AppDatabase): string {
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare('SELECT chiave, json FROM main.dati_guida WHERE chiave NOT IN (?, ?, ?) AND chiave NOT LIKE ? ORDER BY chiave')
    .iterate(CHIAVE_NOTE_REQUISITI, ARCHIVIO_FRASI, AUDIT, `${PREFISSO_DOTE_INCONTRO}%`)) { h.update(`${JSON.stringify(r)}\n`); n++; }
  return `${n}:${h.digest('hex')}`;
}

/** Una fotografia senza le tracce «~…»; null se non si legge o se non ha tracce. */
function senzaTracce(seedJson: string): { pulita: string; tracce: Record<string, unknown> } | null {
  let v: unknown;
  try { v = JSON.parse(seedJson); } catch { return null; }
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return null;
  const voci = Object.entries(v as Record<string, unknown>);
  const tracce = Object.fromEntries(voci.filter(([k]) => k.startsWith('~')));
  if (Object.keys(tracce).length === 0) return null;
  return { pulita: JSON.stringify(Object.fromEntries(voci.filter(([k]) => !k.startsWith('~')))), tracce };
}

export const migration388: Migration = {
  id: 388,
  name: 'via_ripristina_della_guida',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'dati_guida')) return;

    const colonne = COLONNE_TOLTE_388.filter((x) => esisteTabella(db, x.tabella) && haColonna(db, x.tabella, x.colonna));
    const noteRequisiti = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(CHIAVE_NOTE_REQUISITI) as string | undefined;
    const fotoDote = db.prepare('SELECT chiave, json FROM main.dati_guida WHERE chiave LIKE ? ORDER BY chiave').all(`${PREFISSO_DOTE_INCONTRO}%`) as Array<{ chiave: string; json: string }>;
    const marcate = esisteTabella(db, 'traduzione') && haColonna(db, 'traduzione', 'extra_json')
      ? db.prepare('SELECT ambito, chiave FROM main.traduzione WHERE extra_json = ? ORDER BY ambito, chiave').all(MARCA_CREATA) as Array<{ ambito: string; chiave: string }>
      : [];
    const tracce = TABELLE_CON_TRACCE.filter((t) => esisteTabella(db, t.tabella) && haColonna(db, t.tabella, 'seed_json')).flatMap((t) =>
      (db.prepare(`SELECT ${t.chiave} AS k, seed_json FROM main.${t.tabella} WHERE seed_json LIKE '%"~%' ORDER BY rowid`).all() as Array<{ k: string; seed_json: string }>)
        .flatMap((r) => { const s = senzaTracce(r.seed_json); return s ? [{ tabella: t.tabella, colonnaChiave: t.chiave, chiave: r.k, prima: r.seed_json, ...s }] : []; }));
    if (colonne.length === 0 && noteRequisiti === undefined && fotoDote.length === 0 && marcate.length === 0 && tracce.length === 0) return;

    // le impronte di prima: tutto ciò che non è dichiarato deve restare identico
    const senza: Record<string, string[]> = { dungeon: ['seed_json'], giorno: ['seed_json'], catalogo_oggetto: ['seed_json'], traduzione: ['extra_json'], quartiere: ['seed_json'], skill: ['seed_json'] };
    const impronte = Object.fromEntries(Object.entries(senza).filter(([t]) => esisteTabella(db, t)).map(([t, s]) => [t, improntaTabella(db, t, s)]));
    const datiGuidaPrima = improntaDatiGuida(db);

    // 1. l'archivio di ogni valore, prima di toglierlo
    const archiviate: Record<string, number> = {};
    const archivia = (colonna: string, righe: Record<string, unknown>): void => {
      archiviate[colonna] = Object.keys(righe).length;
      if (archiviate[colonna] === 0) return;
      archiviaSenzaSovrascrivere(db, MIGRAZIONE, colonna, righe);
      const presenti = righeArchiviate(db, colonna);
      if (!Object.keys(righe).every((k) => k in presenti)) errore(`l’archivio di ${colonna} non ha tutte le righe`);
    };
    for (const { tabella, colonna, chiave } of colonne) {
      const righe = db.prepare(`SELECT ${chiave} AS k, "${colonna}" AS v FROM main.${tabella} WHERE "${colonna}" IS NOT NULL ORDER BY rowid`).all() as Array<{ k: string; v: unknown }>;
      archivia(`${tabella}.${colonna}`, Object.fromEntries(righe.map((r) => [r.k, r.v])));
    }
    if (noteRequisiti !== undefined) archivia(`dati_guida.${CHIAVE_NOTE_REQUISITI}`, { [CHIAVE_NOTE_REQUISITI]: noteRequisiti });
    archivia('dati_guida.confidente-seed-v1:dote-incontro', Object.fromEntries(fotoDote.map((r) => [r.chiave, r.json])));
    archivia('traduzione.extra_json', Object.fromEntries(marcate.map((r) => [`${r.ambito}/${r.chiave}`, MARCA_CREATA])));
    for (const t of TABELLE_CON_TRACCE) {
      archivia(`${t.tabella}.seed_json~tracce`, Object.fromEntries(tracce.filter((x) => x.tabella === t.tabella).map((x) => [x.chiave, x.tracce])));
    }

    // 2. i dati escono
    if (noteRequisiti !== undefined) db.prepare('DELETE FROM main.dati_guida WHERE chiave = ?').run(CHIAVE_NOTE_REQUISITI);
    if (fotoDote.length) {
      const tolte = db.prepare('DELETE FROM main.dati_guida WHERE chiave LIKE ?').run(`${PREFISSO_DOTE_INCONTRO}%`).changes;
      if (tolte !== fotoDote.length) errore(`le fotografie della Dote tolte (${tolte}) non sono quelle lette (${fotoDote.length})`);
    }
    if (marcate.length) {
      const pulite = db.prepare('UPDATE main.traduzione SET extra_json = NULL WHERE extra_json = ?').run(MARCA_CREATA).changes;
      if (pulite !== marcate.length) errore(`i segni delle traduzioni tolti (${pulite}) non sono quelli letti (${marcate.length})`);
    }
    for (const x of tracce) {
      const cambiate = db.prepare(`UPDATE main.${x.tabella} SET seed_json = ? WHERE ${x.colonnaChiave} = ? AND seed_json = ?`).run(x.pulita, x.chiave, x.prima).changes;
      if (cambiate !== 1) errore(`la fotografia ${x.tabella}/${x.chiave} non si aggiorna`);
    }
    for (const { tabella, colonna } of colonne) {
      db.exec(`ALTER TABLE main.${tabella} DROP COLUMN "${colonna}"`);
      if (haColonna(db, tabella, colonna)) errore(`la colonna ${tabella}.${colonna} esiste ancora`);
    }

    // 3. i controlli: cambia solo ciò che è dichiarato
    for (const [tabella, prima] of Object.entries(impronte)) {
      if (improntaTabella(db, tabella, senza[tabella]) !== prima) errore(`le altre colonne di ${tabella} sono cambiate`);
    }
    if (improntaDatiGuida(db) !== datiGuidaPrima) errore('le altre righe di dati_guida sono cambiate');
    if (db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ? OR chiave LIKE ?').get(CHIAVE_NOTE_REQUISITI, `${PREFISSO_DOTE_INCONTRO}%`)) errore('una chiave tolta è ancora in dati_guida');

    registraAudit(db, AUDIT, {
      migrazione: MIGRAZIONE, decisione: 'utente, 10/11: «Puoi rimuovere questo ripristina del tutto in tutti i punti»',
      colonneTolte: colonne.map((x) => `${x.tabella}.${x.colonna}`), righeArchiviate: archiviate,
      chiaviGuidaTolte: [...(noteRequisiti !== undefined ? [CHIAVE_NOTE_REQUISITI] : []), ...fotoDote.map((r) => r.chiave)],
      segniTraduzioneTolti: marcate.map((r) => `${r.ambito}/${r.chiave}`), tracceTolte: tracce.map((x) => `${x.tabella}/${x.chiave}`),
    });
    logger.info({ migrazione: 388, colonne: colonne.map((x) => `${x.tabella}.${x.colonna}`), archiviate, tracce: tracce.length }, 'Via «Ripristina» al valore della guida: tolti i dati che lo servivano');
  },
};
