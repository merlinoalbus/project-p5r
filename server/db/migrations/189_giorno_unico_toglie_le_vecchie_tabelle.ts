// ============================================================
// 189 — la seconda tabella giornaliera esce: `giorno_calendario` e `giorno_percorso` tolte (L11 · B15, R11-02/11 e R11-02/12)
// ============================================================
//
// Dalla 168 il giorno di gioco è `giorno` (346 righe, una per data) e tutti i lettori vivi sono passati lì (commit ea72c468 e d625bde5): non c'è più
// nessun codice che legga `giorno_calendario` o `giorno_percorso` (restano solo gli aiuti delle migrazioni vecchie, che girano prima di questa).
//   - le date delle tre tabelle devono coincidere: se manca una sola data in `giorno` la migrazione si FERMA (meglio un avvio che lo dice che un
//     calendario monco);
//   - i campi che `giorno` ha ereditato (ordine, fase, trama, vincoli, avvisi, fonte, copertura dal percorso; meteo in due fasce, tempo libero e
//     settimana dal calendario) si confrontano giorno per giorno per i giorni NON modificati dall'utente (`seed_json` vuoto): un giorno che
//     diverge non ferma la migrazione (le due tabelle vecchie sono ferme da tempo e `giorno` è la fonte), ma i suoi valori vecchi si ARCHIVIANO in
//     `dati_guida.archivio-giorni-divergenze-l11`;
//   - `giorno_percorso.azioni_json` (copia storica delle azioni del percorso: le azioni di oggi sono le voci `voce_giornata`, 092) si archivia per
//     intero in `dati_guida.archivio-giorno-percorso-azioni-l11` (l'utente 015, se girasse su un partite.db antico, le legge da lì).
//   - `evento_calendario` ha una chiave esterna verso `giorno_calendario(data)`: si ricostruisce con la chiave verso `giorno(data)`, con gli STESSI id
//     (sono il riferimento dei collegamenti di `evento_calendario_voce`), le stesse righe e gli stessi indici; poi le due tabelle si tolgono.
// `evento_calendario` NON è un doppione e resta (R11-02/12, «tenuta con motivo»): i fatti di storia, le feste, le vacanze e gli esami non hanno altra
// fonte; il collegamento alle voci è in `evento_calendario_voce`.
// Il registro `FONTI_TOLTE` (server/db/fontiTolte.ts) riceve una voce per ciascuna tabella tolta. Idempotente (se le due tabelle non ci sono più non fa
// niente) e senza modifiche parziali: ogni anomalia lancia prima di cambiare qualcosa, e il runner la esegue in una transazione con le chiavi esterne
// spente (la copia di avvio è la via di ritorno). Dopo la ricostruzione controlla impronte e conteggi di eventi, collegamenti e giorni.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { giornoDellaSettimanaPiatto } from '../../../shared/date.js';
import { meteoInDueFasce } from './168_giorno_unico.js';
import { colonneDi, conta, esisteTabella, improntaTabella } from './pulizieL11.js';

const ARCHIVIO_AZIONI = 'archivio-giorno-percorso-azioni-l11';
const ARCHIVIO_DIVERGENZE = 'archivio-giorni-divergenze-l11';
const VECCHIE = ['giorno_calendario', 'giorno_percorso'] as const;
/** Le tabelle che questa migrazione non deve cambiare (oltre agli eventi e ai collegamenti, controllati a parte). */
const INTATTE = ['giorno', 'settimana_guida', 'allerta_meteo', 'voce_giornata', 'spillo', 'cestino', 'luogo', 'quartiere', 'confidente_invito'] as const;
const errore = (motivo: string): never => { throw new Error(`189: ${motivo}; nessuna modifica applicata.`); };
const date = (db: AppDatabase, t: string): string => (db.prepare(`SELECT data FROM main.${t} ORDER BY data`).pluck().all() as string[]).join(',');
const piatto = (v: unknown): string => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Le righe di `giorno` non modificate dall'utente confrontate con le due tabelle vecchie; ritorna i giorni che divergono, coi valori vecchi. */
function divergenze(db: AppDatabase): { confrontati: number; diversi: Record<string, unknown> } {
  const giorni = db.prepare('SELECT * FROM main.giorno WHERE seed_json IS NULL ORDER BY ordine').all() as Array<Record<string, unknown>>;
  const calendario = esisteTabella(db, 'giorno_calendario')
    ? new Map((db.prepare('SELECT * FROM main.giorno_calendario').all() as Array<Record<string, unknown>>).map((r) => [String(r.data), r])) : null;
  const percorso = esisteTabella(db, 'giorno_percorso')
    ? new Map((db.prepare('SELECT data, ordine, giorno_settimana, fase, trama, vincoli_json, meteo, avvisi_json, fonte, coperto FROM main.giorno_percorso').all() as Array<Record<string, unknown>>).map((r) => [String(r.data), r])) : null;
  const diversi: Record<string, unknown> = {};
  for (const g of giorni) {
    const data = String(g.data);
    const campi: string[] = [];
    const c = calendario?.get(data);
    if (c) {
      const m = meteoInDueFasce((c.meteo as string | null) ?? null);
      const maggio24 = data === '05-24';
      if (c.ordine !== g.ordine) campi.push('calendario.ordine');
      if ((c.tempo_libero_json ?? null) !== (g.tempo_libero_json ?? null)) campi.push('calendario.tempo_libero_json');
      if ((c.settimana ?? null) !== (g.settimana ?? null)) campi.push('calendario.settimana');
      if ((m.giorno ?? null) !== (g.meteo_giorno ?? null) || (m.sera ?? null) !== (g.meteo_sera ?? null)) campi.push('calendario.meteo');
      if (!maggio24 && (m.nota ?? null) !== (g.nota_meteo ?? null)) campi.push('calendario.meteo.nota');
      if (c.giorno_settimana !== undefined && piatto(c.giorno_settimana) !== (giornoDellaSettimanaPiatto(data) ?? '')) campi.push('calendario.giorno_settimana');
    }
    const p = percorso?.get(data);
    if (p) {
      for (const k of ['ordine', 'fase', 'trama', 'vincoli_json', 'avvisi_json', 'fonte', 'coperto'] as const) if (p[k] !== g[k]) campi.push(`percorso.${k}`);
    }
    if (campi.length > 0) diversi[data] = { campi, calendario: c ?? null, percorso: p ?? null };
  }
  return { confrontati: giorni.length, diversi };
}

export const migration189: Migration = {
  id: 189, name: 'giorno_unico_toglie_le_vecchie_tabelle',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const presenti = VECCHIE.filter((t) => esisteTabella(db, t));
    if (presenti.length === 0) return;
    if (!esisteTabella(db, 'giorno')) errore('manca la tabella giorno (migrazione 168)');
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    // 1. le date: le tre tabelle hanno le stesse
    const dateGiorno = date(db, 'giorno');
    for (const t of presenti) if (date(db, t) !== dateGiorno) errore(`${t} e giorno non hanno le stesse date`);
    const nGiorni = conta(db, 'SELECT COUNT(*) FROM main.giorno');

    // 2. impronte prima
    const eventiPrima = esisteTabella(db, 'evento_calendario') ? improntaTabella(db, 'evento_calendario') : null;
    const collegamentiPrima = esisteTabella(db, 'evento_calendario_voce') ? improntaTabella(db, 'evento_calendario_voce') : null;
    const prima = new Map<string, string>();
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const nEventi = eventiPrima === null ? 0 : conta(db, 'SELECT COUNT(*) FROM main.evento_calendario');
    const nCollegamenti = collegamentiPrima === null ? 0 : conta(db, 'SELECT COUNT(*) FROM main.evento_calendario_voce');

    // 3. confronto dei campi e archivi (prima di toccare niente)
    const { confrontati, diversi } = divergenze(db);
    const azioni: Record<string, unknown> = {};
    if (esisteTabella(db, 'giorno_percorso')) {
      for (const r of db.prepare("SELECT data, azioni_json FROM main.giorno_percorso WHERE azioni_json IS NOT NULL AND azioni_json NOT IN ('', '[]') ORDER BY ordine").all() as Array<{ data: string; azioni_json: string }>) azioni[r.data] = JSON.parse(r.azioni_json);
    }
    const scrivi = db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)');
    if (Object.keys(azioni).length > 0) {
      scrivi.run(ARCHIVIO_AZIONI, JSON.stringify({ versione: 1, migrazione: 'L11-B15 · 189', motivo: 'copia storica delle azioni del percorso (le azioni di oggi sono le voci del Diario, voce_giornata, migrazione 092)', giorni: azioni }));
    }
    if (Object.keys(diversi).length > 0) {
      scrivi.run(ARCHIVIO_DIVERGENZE, JSON.stringify({ versione: 1, migrazione: 'L11-B15 · 189', motivo: 'giorni non modificati dall’utente in cui giorno diverge dalle due tabelle vecchie: i valori vecchi', giorni: diversi }));
    }

    // 4. evento_calendario: chiave esterna verso giorno(data), stessi id, stesse righe, stessi indici
    if (esisteTabella(db, 'evento_calendario')) {
      const fk = (db.prepare('PRAGMA main.foreign_key_list(evento_calendario)').all() as Array<{ table: string }>).map((f) => f.table);
      if (fk.some((t) => (VECCHIE as readonly string[]).includes(t))) {
        const colonneInfo = db.prepare('PRAGMA main.table_info(evento_calendario)').all() as Array<{ name: string; type: string; notnull: number; dflt_value: string | null; pk: number }>;
        const definizioni = colonneInfo.map((c) => `"${c.name}" ${c.type}${c.pk ? ' PRIMARY KEY' : ''}${c.notnull && !c.pk ? ' NOT NULL' : ''}${c.dflt_value !== null ? ` DEFAULT ${c.dflt_value}` : ''}${c.name === 'data' ? ' REFERENCES giorno(data) ON DELETE CASCADE' : ''}`);
        if (!colonneInfo.some((c) => c.name === 'data') || !colonneInfo.some((c) => c.name === 'id' && c.pk)) errore('evento_calendario non ha le colonne attese (id, data)');
        const indici = (db.prepare("SELECT sql FROM main.sqlite_master WHERE type = 'index' AND tbl_name = 'evento_calendario' AND sql IS NOT NULL").all() as Array<{ sql: string }>).map((i) => i.sql);
        const elenco = colonneInfo.map((c) => `"${c.name}"`).join(', ');
        db.exec(`CREATE TABLE main.evento_calendario_nuova (${definizioni.join(', ')})`);
        db.exec(`INSERT INTO main.evento_calendario_nuova (${elenco}) SELECT ${elenco} FROM main.evento_calendario ORDER BY id`);
        db.exec('DROP TABLE main.evento_calendario');
        db.exec('ALTER TABLE main.evento_calendario_nuova RENAME TO evento_calendario');
        for (const sql of indici) db.exec(sql);
      }
    }

    // 5. le due tabelle escono
    for (const t of presenti) db.exec(`DROP TABLE main.${t}`);

    // 6. verifiche dopo
    for (const t of VECCHIE) if (esisteTabella(db, t)) errore(`la tabella ${t} esiste ancora`);
    if (eventiPrima !== null && improntaTabella(db, 'evento_calendario') !== eventiPrima) errore('gli eventi del calendario sono cambiati (id, righe o colonne)');
    if (collegamentiPrima !== null && improntaTabella(db, 'evento_calendario_voce') !== collegamentiPrima) errore('i collegamenti evento-voce sono cambiati');
    if (eventiPrima !== null && !(db.prepare('PRAGMA main.foreign_key_list(evento_calendario)').all() as Array<{ table: string }>).some((f) => f.table === 'giorno')) errore('evento_calendario non punta a giorno');
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    // nessuna chiave esterna di nessuna tabella deve puntare alle tabelle tolte (un commento che le nomina non conta)
    const residui = (db.prepare("SELECT name FROM main.sqlite_master WHERE type = 'table'").pluck().all() as string[])
      .filter((t) => (db.prepare(`PRAGMA main.foreign_key_list("${t}")`).all() as Array<{ table: string }>).some((f) => (VECCHIE as readonly string[]).includes(f.table)));
    if (residui.length > 0) errore(`restano chiavi esterne verso le tabelle tolte in: ${residui.join(', ')}`);
    if (conta(db, 'SELECT COUNT(*) FROM main.giorno') !== nGiorni) errore('i giorni sono cambiati');
    if (eventiPrima !== null && !colonneDi(db, 'evento_calendario').includes('id')) errore('evento_calendario senza id');
    logger.info({ migrazione: 'L11-B15-189', tolte: presenti, giorni: nGiorni, giorniConfrontati: confrontati, giorniDivergenti: Object.keys(diversi).length, giorniConAzioniArchiviate: Object.keys(azioni).length, eventi: nEventi, collegamenti: nCollegamenti }, 'giorno unico: le vecchie tabelle giornaliere sono tolte');
  },
};
