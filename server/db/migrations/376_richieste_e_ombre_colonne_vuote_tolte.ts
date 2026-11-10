// ============================================================
// 376 — via tre colonne vuote di Richieste e Ombre (L10-01)
// ============================================================
//
// Tre colonne non portano più niente nei dati di oggi:
//   - `ombra.nome_negoziazione` (166): vuota in 131 Ombre su 131, nessun file la legge (rapporto E §1.2);
//   - `richiesta.ricompense_json` (014): `[]` in 33 Richieste su 33; le ricompense sono gli oggetti del catalogo (`ricompensa_oggetto`, 310),
//     gli yen e i PE (`yen`, `esperienza`);
//   - `richiesta.confidente_rango` (014): vuota in 33 su 33; un rango che serve è una condizione di sblocco (235, 310: «Lo zio ingordo»).
// `richiesta.ombra_chiave` resta: è il bersaglio come Ombra del compendio.
//
// Un backup vecchio può avere ancora un valore. Ogni valore non vuoto va in `dati_guida.archivio-frasi-l11` prima del drop, nulla si perde.
// Il rango, in più, il servizio lo leggeva come condizione di sblocco sul Confidente collegato quando le condizioni non ne avevano già una su
// quel Confidente (`richiesteService.condizioniDaValutare`, fino a questa versione): perché la Richiesta resti bloccata come prima, quel rango
// entra nelle sue condizioni (`{ tipo: 'confidente', confidente, rango }`, il vocabolario unico), come la 310 ha fatto per «Lo zio ingordo».
//
// COSA NON CAMBIA (impronte prima e dopo): le altre colonne di `ombra` e di `richiesta` (le condizioni solo dove è entrato un rango, dichiarate
// nel verbale), la vista `ombra_luogo_dedalo` (827 righe nei dati di oggi), il numero delle righe. Idempotente: si salta se le colonne non ci
// sono più. Verbale: `dati_guida.audit-l10-01-colonne-vuote`. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate, registraAudit } from './archivioL1.js';

const MIGRAZIONE = 'L10-01 · 376';
const errore = (motivo: string): never => { throw new Error(`376: ${motivo}; nessuna modifica applicata.`); };

/** Le tre colonne che escono. */
export const COLONNE_TOLTE_376 = [
  { tabella: 'ombra', colonna: 'nome_negoziazione' }, { tabella: 'richiesta', colonna: 'ricompense_json' }, { tabella: 'richiesta', colonna: 'confidente_rango' },
] as const;

/** Impronta (conteggio e SHA-256) delle righe della vista `ombra_luogo_dedalo`, in un ordine fisso («assente» se la vista non c'è). */
export function improntaVistaOmbre(db: AppDatabase): string {
  if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'view' AND name = 'ombra_luogo_dedalo'").get()) return 'assente';
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare('SELECT ombra_chiave, dungeon_chiave, dedalo_chiave, area_dedalo_chiave, voce_chiave FROM main.ombra_luogo_dedalo ORDER BY ombra_chiave, dedalo_chiave, area_dedalo_chiave, voce_chiave').iterate()) {
    h.update(`${JSON.stringify(r)}\n`); n++;
  }
  return `${n}:${h.digest('hex')}`;
}

const vuoto = (v: unknown): boolean => v === null || v === undefined || (typeof v === 'string' && ['', '[]', 'null'].includes(v.trim()));

/** Le condizioni salvate come elenco (null se il JSON non si legge: allora non si tocca niente). */
function elencoCondizioni(json: string | null): Array<Record<string, unknown>> | null {
  if (json === null || json.trim() === '') return [];
  try { const v = JSON.parse(json) as unknown; return Array.isArray(v) ? v as Array<Record<string, unknown>> : null; } catch { return null; }
}

export const migration376: Migration = {
  id: 376,
  name: 'richieste_e_ombre_colonne_vuote_tolte',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const daTogliere = COLONNE_TOLTE_376.filter((x) => esisteTabella(db, x.tabella) && haColonna(db, x.tabella, x.colonna));
    if (daTogliere.length === 0) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');
    const toglie = (tabella: string, colonna: string): boolean => daTogliere.some((x) => x.tabella === tabella && x.colonna === colonna);

    // le impronte di prima: tutte le colonne tranne quelle che escono (e, per `richiesta`, le condizioni, che cambiano solo dove entra un rango)
    const senzaOmbra = toglie('ombra', 'nome_negoziazione') ? ['nome_negoziazione'] : [];
    const senzaRichiesta = [...(toglie('richiesta', 'ricompense_json') ? ['ricompense_json'] : []), ...(toglie('richiesta', 'confidente_rango') ? ['confidente_rango'] : []), 'condizioni_json'];
    const prima = {
      ombra: esisteTabella(db, 'ombra') ? improntaTabella(db, 'ombra', senzaOmbra) : null,
      richiesta: esisteTabella(db, 'richiesta') ? improntaTabella(db, 'richiesta', senzaRichiesta) : null,
      vista: improntaVistaOmbre(db),
    };
    const condizioniPrima = esisteTabella(db, 'richiesta')
      ? new Map((db.prepare('SELECT chiave, condizioni_json FROM main.richiesta').all() as Array<{ chiave: string; condizioni_json: string | null }>).map((r) => [r.chiave, r.condizioni_json]))
      : new Map<string, string | null>();

    // il rango che il servizio leggeva come condizione entra nelle condizioni (solo se non ce n'è già una sullo stesso Confidente)
    const ranghiInCondizione: Array<{ chiave: string; confidente: string; rango: number }> = [];
    const ranghiSoloArchivio: Array<{ chiave: string; motivo: string }> = [];
    if (toglie('richiesta', 'confidente_rango')) {
      const scrivi = db.prepare('UPDATE main.richiesta SET condizioni_json = ? WHERE chiave = ? AND condizioni_json IS ?');
      for (const r of db.prepare('SELECT chiave, confidente_chiave, confidente_rango, condizioni_json FROM main.richiesta WHERE confidente_rango IS NOT NULL ORDER BY rowid').all() as
        Array<{ chiave: string; confidente_chiave: string | null; confidente_rango: number; condizioni_json: string | null }>) {
        if (!r.confidente_chiave) { ranghiSoloArchivio.push({ chiave: r.chiave, motivo: 'nessun Confidente collegato: il rango non valeva' }); continue; }
        const condizioni = elencoCondizioni(r.condizioni_json);
        if (condizioni === null) { ranghiSoloArchivio.push({ chiave: r.chiave, motivo: 'condizioni illeggibili: non toccate' }); continue; }
        if (condizioni.some((c) => c.tipo === 'confidente' && c.confidente === r.confidente_chiave)) { ranghiSoloArchivio.push({ chiave: r.chiave, motivo: 'le condizioni hanno già il Confidente' }); continue; }
        const nuove = [...condizioni, { tipo: 'confidente', confidente: r.confidente_chiave, rango: r.confidente_rango }];
        if (scrivi.run(JSON.stringify(nuove), r.chiave, r.condizioni_json).changes !== 1) errore(`le condizioni di ${r.chiave} non si aggiornano`);
        ranghiInCondizione.push({ chiave: r.chiave, confidente: r.confidente_chiave, rango: r.confidente_rango });
      }
    }

    // l'archivio di ogni valore non vuoto, poi le colonne
    const archiviate: Record<string, number> = {};
    for (const { tabella, colonna } of daTogliere) {
      const righe = (db.prepare(`SELECT chiave, "${colonna}" AS v FROM main.${tabella} ORDER BY rowid`).all() as Array<{ chiave: string; v: unknown }>).filter((r) => !vuoto(r.v));
      archiviate[`${tabella}.${colonna}`] = righe.length;
      if (righe.length === 0) continue;
      archiviaSenzaSovrascrivere(db, MIGRAZIONE, `${tabella}.${colonna}`, Object.fromEntries(righe.map((r) => [r.chiave, r.v])));
      const presenti = righeArchiviate(db, `${tabella}.${colonna}`);
      if (!righe.every((r) => r.chiave in presenti)) errore(`l’archivio di ${tabella}.${colonna} non ha tutte le righe`);
    }
    for (const { tabella, colonna } of daTogliere) {
      db.exec(`ALTER TABLE main.${tabella} DROP COLUMN "${colonna}"`);
      if (haColonna(db, tabella, colonna)) errore(`la colonna ${tabella}.${colonna} esiste ancora`);
    }

    // i controlli: cambia solo ciò che è dichiarato
    if (prima.ombra !== null && improntaTabella(db, 'ombra') !== prima.ombra) errore('le altre colonne di ombra sono cambiate');
    if (prima.richiesta !== null && improntaTabella(db, 'richiesta', ['condizioni_json']) !== prima.richiesta) errore('le altre colonne di richiesta sono cambiate');
    if (improntaVistaOmbre(db) !== prima.vista) errore('la vista ombra_luogo_dedalo è cambiata');
    const conRango = new Set(ranghiInCondizione.map((r) => r.chiave));
    for (const r of db.prepare('SELECT chiave, condizioni_json FROM main.richiesta').all() as Array<{ chiave: string; condizioni_json: string | null }>) {
      if (!condizioniPrima.has(r.chiave)) errore(`la Richiesta ${r.chiave} è nuova`);
      if ((condizioniPrima.get(r.chiave) !== r.condizioni_json) !== conRango.has(r.chiave)) errore(`le condizioni di ${r.chiave} sono cambiate in modo non dichiarato`);
    }

    registraAudit(db, 'audit-l10-01-colonne-vuote', {
      migrazione: MIGRAZIONE, colonneTolte: daTogliere.map((x) => `${x.tabella}.${x.colonna}`), righeArchiviate: archiviate,
      ranghiInCondizione, ranghiSoloArchivio, vistaOmbre: prima.vista,
    });
    logger.info({ migrazione: 'L10-01-376', tolte: daTogliere.map((x) => `${x.tabella}.${x.colonna}`), archiviate, ranghiInCondizione: ranghiInCondizione.length }, 'Richieste e Ombre: tolte le colonne vuote');
  },
};
