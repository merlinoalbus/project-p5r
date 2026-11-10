// ============================================================
// 389 — le offerte che non sono della guida non hanno la copia della guida
// ============================================================
//
// Collegare un oggetto del catalogo a un'offerta (`catalogoOggettiLegami.applicaArticolo`, e il suo gemello della migrazione 144) scriveva
// `seed_json = COALESCE(seed_json, <riga attuale>)` senza guardare l'origine, e così alcune migrazioni registrate (142, 144, 150, 252, 121)
// su righe già dell'utente: un'offerta non della guida (creata dall'utente, chiave `<negozio>/u-<nome>` di `catalogoService.chiaveLibera`,
// o creata da una migrazione con origine 'utente') prendeva una «copia della guida» che non esiste, e da lì contava come «Riga della guida
// corretta da te» (`modificata` = origine 'utente' con `seed_json`): non si eliminava più (`eliminaElemento` risponde 400
// `riga-della-guida`), si poteva solo nascondere. Il servizio ora scrive la copia solo su una riga della guida, come
// `aggiornaElementoNellaTransazione`; qui si toglie la copia dalle offerte già colpite.
//
// Quali righe: `articolo` con origine 'utente' e una copia che è la fotografia di una riga con origine 'utente' (`seed_json.origine`). È
// l'impronta del difetto, qualunque sia la forma della chiave: chi ha scritto quelle copie salvava la riga intera, origine compresa, e una
// riga della guida ha origine 'seed'. Le copie a campi di `catalogoService` (senza `origine`) nascono solo su righe della guida (condizione
// `origine === 'seed'` da quando esiste il servizio) e non si toccano. Misura su una copia dei dati portata alla 388: 65 offerte con copia,
// 29 con `origine` 'seed', 35 a campi, 1 colpita (`gachapon-akihabara/scambio-mothman-muschiato`, copia data dalla 150 a una riga creata
// da una migrazione); nessuna chiave `/u-` con origine 'seed'. Ogni copia tolta va prima nell'archivio `dati_guida.archivio-frasi-l11`
// (colonna `articolo.seed_json~offerte-utente`, mai sovrascritto, con il valore controllato).
//
// COSA NON CAMBIA (impronta prima e dopo): ogni altra colonna di `articolo` e ogni altra riga; le altre righe di `dati_guida`. Nessuna
// scrittura in `utente`: acquisti, Diario e partite non si toccano. Idempotente: senza righe da correggere non fa niente e non scrive il
// verbale. Nessun import da `server/services/`. Verbale: `dati_guida.audit-389-offerte-utente`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { ARCHIVIO_FRASI, esisteTabella, haColonna } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate, registraAudit } from './archivioL1.js';

const MIGRAZIONE = 'offerte dell’utente senza copia della guida · 389';
const AUDIT = 'audit-389-offerte-utente';
const COLONNA_ARCHIVIO = 'articolo.seed_json~offerte-utente';
const DOVE = "origine = 'utente' AND seed_json IS NOT NULL AND (CASE WHEN json_valid(seed_json) THEN json_extract(seed_json, '$.origine') END) = 'utente'";
const errore = (motivo: string): never => { throw new Error(`389: ${motivo}; nessuna modifica applicata.`); };

/** Impronta di `articolo`: ogni colonna di ogni riga, con `seed_json` solo per le righe che la migrazione non tocca. */
function improntaArticolo(db: AppDatabase, toccate: ReadonlySet<string>): string {
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare('SELECT * FROM main.articolo ORDER BY chiave').iterate() as Iterable<Record<string, unknown>>) {
    const riga = toccate.has(String(r.chiave)) ? { ...r, seed_json: undefined } : r;
    h.update(`${JSON.stringify(riga)}\n`); n++;
  }
  return `${n}:${h.digest('hex')}`;
}

function improntaDatiGuida(db: AppDatabase): string {
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare('SELECT chiave, json FROM main.dati_guida WHERE chiave NOT IN (?, ?) ORDER BY chiave').iterate(ARCHIVIO_FRASI, AUDIT)) {
    h.update(`${JSON.stringify(r)}\n`); n++;
  }
  return `${n}:${h.digest('hex')}`;
}

export const migration389: Migration = {
  id: 389,
  name: 'offerte_utente_senza_copia_della_guida',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'dati_guida') || !esisteTabella(db, 'articolo') || !haColonna(db, 'articolo', 'seed_json')) return;

    const righe = db.prepare(`SELECT chiave, seed_json FROM main.articolo WHERE ${DOVE} ORDER BY chiave`).all() as Array<{ chiave: string; seed_json: string }>;
    if (righe.length === 0) return;
    const toccate = new Set(righe.map((r) => r.chiave));
    const articoloPrima = improntaArticolo(db, toccate);
    const datiGuidaPrima = improntaDatiGuida(db);

    // 1. l'archivio di ogni copia, prima di toglierla
    archiviaSenzaSovrascrivere(db, MIGRAZIONE, COLONNA_ARCHIVIO, Object.fromEntries(righe.map((r) => [r.chiave, r.seed_json])));
    const presenti = righeArchiviate(db, COLONNA_ARCHIVIO);
    if (!righe.every((r) => presenti[r.chiave] === r.seed_json)) errore('l’archivio non ha tutte le copie, o ne ha una diversa');

    // 2. le copie escono, riga per riga e solo se la riga è quella letta
    const togli = db.prepare(`UPDATE main.articolo SET seed_json = NULL WHERE chiave = ? AND seed_json = ? AND ${DOVE}`);
    for (const r of righe) if (togli.run(r.chiave, r.seed_json).changes !== 1) errore(`la copia dell’offerta ${r.chiave} non si toglie`);

    // 3. i controlli: cambia solo ciò che è dichiarato
    if (db.prepare(`SELECT 1 FROM main.articolo WHERE ${DOVE}`).get()) errore('resta un’offerta dell’utente con la copia della guida');
    if (improntaArticolo(db, toccate) !== articoloPrima) errore('altre colonne o righe di articolo sono cambiate');
    if (improntaDatiGuida(db) !== datiGuidaPrima) errore('le altre righe di dati_guida sono cambiate');

    registraAudit(db, AUDIT, {
      migrazione: MIGRAZIONE,
      motivo: 'un’offerta non della guida prendeva una copia della guida (fotografia di una riga con origine utente) e non si eliminava più',
      offerte: righe.map((r) => r.chiave), archivio: COLONNA_ARCHIVIO,
    });
    logger.info({ migrazione: 389, offerte: righe.length }, 'Offerte dell’utente: tolta la copia della guida scritta per errore');
  },
};
