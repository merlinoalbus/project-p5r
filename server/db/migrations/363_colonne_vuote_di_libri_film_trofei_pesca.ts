// ============================================================
// 363 — via le colonne vuote o doppie di libri, film, trofei e regola della pesca (L8-02)
// ============================================================
//
// `libro`: `prezzo`, `dote`, `note`, `disponibile_dal`, `sblocca`, `effetto_json` (svuotate dalla 313: prezzo, Dote e sblocco stanno in articoli, condizioni ed effetti);
// `film.note_successive`, `trofeo.quando`, anch'esse vuote; `regola_pesca.fonti_json`, copia esatta di `dati_json.fonti`.
//
// Guardie: una colonna esce solo se è vuota in TUTTE le righe (una riga di un'istanza con un valore la fa restare, e il verbale lo dice); le fonti della pesca solo se ogni
// riga le ha uguali a `dati_json.fonti` (altrimenti la colonna resta, con il motivo: i lettori guardano già solo `dati_json`). La fotografia `seed_json` della regola
// perde la copia, se la ripeteva. `film.dove` e `film.periodo` restano intatte (impronta di tutte le altre colonne). SQLite accetta il `DROP COLUMN` anche con il CHECK
// proprio della colonna; nessun indice, vista o trigger le cita. `server/db/fontiTolte.ts` riceve le voci. Idempotente: una colonna già tolta si salta.
// Verbale: `dati_guida.audit-l8-363-colonne-vuote`. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate, registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`363: ${motivo}; nessuna modifica applicata.`); };
const MIGRAZIONE = 'L8-02 · 363';

const COLONNE_VUOTE = [
  ...(['prezzo', 'dote', 'note', 'disponibile_dal', 'sblocca', 'effetto_json'] as const).map((colonna) => ({ tabella: 'libro', colonna })),
  { tabella: 'film', colonna: 'note_successive' },
  { tabella: 'trofeo', colonna: 'quando' },
] as const;

/** Le righe con un valore nella colonna: NULL, vuoto, `[]` o `null` valgono vuoto; un valore numerico conta sempre come valore. */
function righeConValore(db: AppDatabase, tabella: string, colonna: string): Array<{ chiave: string; v: unknown }> {
  return (db.prepare(`SELECT chiave, "${colonna}" AS v FROM main.${tabella} WHERE "${colonna}" IS NOT NULL AND TRIM(CAST("${colonna}" AS TEXT)) NOT IN ('', '[]', 'null') ORDER BY rowid`).all() as Array<{ chiave: string; v: unknown }>);
}

function togli(db: AppDatabase, tabella: string, colonna: string): void {
  db.exec(`ALTER TABLE main.${tabella} DROP COLUMN "${colonna}"`);
  if (haColonna(db, tabella, colonna)) errore(`la colonna ${tabella}.${colonna} esiste ancora`);
}

/** Le fonti dentro `dati_json`, o null se la riga non si legge. */
function fontiDei(json: unknown): unknown[] | null {
  if (typeof json !== 'string') return null;
  try { const d = JSON.parse(json) as { fonti?: unknown }; return Array.isArray(d.fonti) ? d.fonti : null; } catch { return null; }
}

export const migration363: Migration = {
  id: 363,
  name: 'colonne_vuote_di_libri_film_trofei_pesca',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'dati_guida')) return;
    const tolte: string[] = [];
    const rimaste: Array<{ colonna: string; righe: unknown }> = [];

    for (const { tabella, colonna } of COLONNE_VUOTE) {
      if (!esisteTabella(db, tabella) || !haColonna(db, tabella, colonna)) continue;
      const conValore = righeConValore(db, tabella, colonna);
      if (conValore.length > 0) { rimaste.push({ colonna: `${tabella}.${colonna}`, righe: conValore }); continue; }
      const impronta = improntaTabella(db, tabella, [colonna]);
      togli(db, tabella, colonna);
      if (improntaTabella(db, tabella) !== impronta) errore(`le altre colonne di ${tabella} sono cambiate`);
      tolte.push(`${tabella}.${colonna}`);
    }

    if (esisteTabella(db, 'regola_pesca') && haColonna(db, 'regola_pesca', 'fonti_json')) {
      const righe = db.prepare('SELECT chiave, dati_json, fonti_json, seed_json FROM main.regola_pesca ORDER BY rowid').all() as Array<{ chiave: string; dati_json: string; fonti_json: string; seed_json: string | null }>;
      // un JSON illeggibile non ferma l'avvio: la riga conta come diversa e la colonna resta, detta nel verbale
      const leggi = (testo: string): unknown => { try { return JSON.parse(testo) as unknown; } catch { return undefined; } };
      const diverse = righe.filter((r) => { const f = fontiDei(r.dati_json); const c = leggi(r.fonti_json); return f === null || c === undefined || JSON.stringify(f) !== JSON.stringify(c); });
      if (diverse.length > 0) rimaste.push({ colonna: 'regola_pesca.fonti_json', righe: diverse.map((r) => ({ chiave: r.chiave, motivo: 'diversa da dati_json.fonti', fonti_json: r.fonti_json })) });
      else {
        const valori = Object.fromEntries(righe.map((r) => [r.chiave, r.fonti_json]));
        archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'regola_pesca.fonti_json', valori);
        if (!Object.keys(valori).every((k) => k in righeArchiviate(db, 'regola_pesca.fonti_json'))) errore('l’archivio delle fonti della pesca non ha tutte le righe');
        // la fotografia della regola salvata dall'utente: resta leggibile, senza la copia che ripeteva `dati_json.fonti`
        for (const r of righe) {
          if (r.seed_json === null) continue;
          const foto = leggi(r.seed_json) as Record<string, unknown> | null | undefined;
          if (!foto || typeof foto !== 'object' || Array.isArray(foto) || !('fonti_json' in foto)) continue;
          const { fonti_json: _copia, ...resto } = foto;
          db.prepare('UPDATE main.regola_pesca SET seed_json = ? WHERE chiave = ? AND seed_json = ?').run(JSON.stringify(resto), r.chiave, r.seed_json);
        }
        const impronta = improntaTabella(db, 'regola_pesca', ['fonti_json', 'seed_json']);
        togli(db, 'regola_pesca', 'fonti_json');
        if (improntaTabella(db, 'regola_pesca', ['seed_json']) !== impronta) errore('le altre colonne di regola_pesca sono cambiate');
        tolte.push('regola_pesca.fonti_json');
      }
    }

    if (tolte.length === 0 && rimaste.length === 0) return;
    registraAudit(db, 'audit-l8-363-colonne-vuote', { migrazione: MIGRAZIONE, colonneTolte: tolte, colonneRimaste: rimaste });
    if (rimaste.length > 0) logger.warn({ migrazione: 363, rimaste }, 'colonne con un valore non tolte: restano nel database e l’app non le legge più');
    logger.info({ migrazione: 363, tolte, rimaste: rimaste.map((r) => r.colonna) }, 'colonne vuote o doppie di libri, film, trofei e pesca tolte');
  },
};
