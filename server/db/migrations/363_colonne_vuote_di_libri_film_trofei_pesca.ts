// ============================================================
// 363 — via le colonne vuote o doppie di libri, film, trofei e regola della pesca (L8-02)
// ============================================================
//
// `libro`: `prezzo`, `dote`, `note`, `disponibile_dal`, `sblocca`, `effetto_json` (svuotate dalla 313: prezzo, Dote e sblocco stanno in articoli, condizioni ed effetti);
// `film.note_successive`, `trofeo.quando`, anch'esse vuote; `regola_pesca.fonti_json`, copia esatta di `dati_json.fonti`.
//
// Una colonna con un valore in qualche riga (sui dati reali nessuna; nel pacchetto iniziale la riga di Zorro ha ancora prezzo, Dote, note e «disponibile dal») esce
// lo stesso: prima ogni valore va nell'archivio `dati_guida.archivio-frasi-l11` (colonna «<tabella>.<colonna>», senza sovrascrivere, riletto), e il verbale dice
// per ogni valore se il suo posto strutturato lo porta già (offerta del catalogo, effetto «dote», condizione di data). Un valore senza posto strutturato
// resta solo nell'archivio: la migrazione non scrive dati nuovi, che la guida dovrebbe confermare. Le fonti della pesca escono solo se ogni
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

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
/** «18 aprile» → «04-18»; null se il testo non è una data così. */
function dataDiGioco(testo: unknown): string | null {
  const m = /^\s*(\d{1,2})\s+([a-zà-ù]+)\s*$/i.exec(String(testo));
  const mese = m ? MESI.indexOf((m[2] ?? '').toLowerCase()) : -1;
  return m && mese >= 0 ? `${String(mese + 1).padStart(2, '0')}-${(m[1] ?? '').padStart(2, '0')}` : null;
}
const elenco = (json: unknown): Array<Record<string, unknown>> => {
  try { const v = JSON.parse(String(json ?? '[]')) as unknown; return Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []; } catch { return []; }
};

/** Dove il valore di una colonna di `libro` sta già in forma strutturata; null se non c'è un posto che lo porti (il valore resta solo in archivio). */
function postoStrutturato(db: AppDatabase, tabella: string, colonna: string, chiave: string, v: unknown): string | null {
  if (tabella !== 'libro') return null;
  const riga = db.prepare('SELECT * FROM main.libro WHERE chiave = ?').get(chiave) as Record<string, unknown> | undefined;
  if (!riga) return null;
  const doti = elenco(riga.effetti_json).map((e) => (e.effetto && typeof e.effetto === 'object' ? e.effetto as Record<string, unknown> : {})).filter((e) => e.famiglia === 'dote');
  if (colonna === 'prezzo' && riga.catalogo_chiave && db.prepare('SELECT 1 FROM main.articolo WHERE catalogo_chiave = ? AND prezzo = ?').get(riga.catalogo_chiave, v)) return `offerta del catalogo «${String(riga.catalogo_chiave)}» allo stesso prezzo`;
  if (colonna === 'dote' && doti.some((d) => d.dote === v)) return 'effetto «dote» del libro (effetti_json)';
  // la colonna `dote` può essere già uscita (viene prima nell'elenco): basta un effetto «dote» con le stesse note
  if (colonna === 'note' && doti.some((d) => Number(d.note) === Number(v))) return 'effetto «dote» del libro con le stesse note (effetti_json)';
  if (colonna === 'disponibile_dal') {
    const data = dataDiGioco(v);
    if (data && elenco(riga.condizioni_json).some((c) => c.tipo === 'data' && c.dal === data)) return `condizione di data dal ${data} (condizioni_json)`;
  }
  return null;
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
    const archiviate: Array<{ colonna: string; righe: Array<{ chiave: string; v: unknown; postoStrutturato: string | null }> }> = [];

    for (const { tabella, colonna } of COLONNE_VUOTE) {
      if (!esisteTabella(db, tabella) || !haColonna(db, tabella, colonna)) continue;
      const conValore = righeConValore(db, tabella, colonna);
      if (conValore.length > 0) {
        // prima l'archivio (mai sovrascritto), riletto: poi la colonna esce come quelle vuote
        const nome = `${tabella}.${colonna}`;
        archiviaSenzaSovrascrivere(db, MIGRAZIONE, nome, Object.fromEntries(conValore.map((r) => [r.chiave, String(r.v)])));
        const inArchivio = righeArchiviate(db, nome);
        // un valore già in archivio e diverso da quello di adesso (archiviaSenzaSovrascrivere non lo riscrive) si perderebbe con la colonna: ci si ferma
        const diversi = conValore.filter((r) => inArchivio[r.chiave] !== String(r.v)).map((r) => `${r.chiave} (in archivio ${JSON.stringify(inArchivio[r.chiave] ?? null)}, nella colonna ${JSON.stringify(String(r.v))})`);
        if (diversi.length > 0) errore(`l’archivio di ${nome} non ha il valore di adesso per ${diversi.join(', ')}`);
        archiviate.push({ colonna: nome, righe: conValore.map((r) => ({ ...r, postoStrutturato: postoStrutturato(db, tabella, colonna, r.chiave, r.v) })) });
      }
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
    registraAudit(db, 'audit-l8-363-colonne-vuote', { migrazione: MIGRAZIONE, colonneTolte: tolte, colonneRimaste: rimaste, valoriArchiviati: archiviate });
    if (rimaste.length > 0) logger.warn({ migrazione: 363, rimaste }, 'colonne non tolte: restano nel database e l’app non le legge più');
    const senzaPosto = archiviate.flatMap((a) => a.righe.filter((r) => r.postoStrutturato === null).map((r) => `${a.colonna}:${r.chiave}`));
    if (senzaPosto.length > 0) logger.warn({ migrazione: 363, senzaPosto }, 'valori senza posto strutturato: restano solo nell’archivio');
    logger.info({ migrazione: 363, tolte, archiviate: archiviate.map((a) => a.colonna), rimaste: rimaste.map((r) => r.colonna) }, 'colonne vuote o doppie di libri, film, trofei e pesca tolte');
  },
};
