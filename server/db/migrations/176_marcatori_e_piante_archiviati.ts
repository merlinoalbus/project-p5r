// ============================================================
// 176 — marcatori e piante archiviati e tolti dal modello (L11 · B8, R11-02/5, /6, /7)
// ============================================================
//
// I segnaposto delle voci (`marcatore_mappa`), quelli dei luoghi (`marcatore_luogo`) e le piante delle infiltrazioni (`pianta_area`) escono
// dal modello: nessuno li legge più (il frontend non li ha mai letti). La posizione di una voce è quella della scheda `spillo` che l'ha
// assorbita, quella di un luogo è il suo pin, la pianta di un'infiltrazione non si scarica più.
//   - `marcatore_mappa`: si archiviano SOLO i segnaposto che nessuna scheda `spillo` senza mappa ripete alla stessa posizione (sulla copia reale
//     la prova dà 149 su 149 ripetuti, quindi 0 da archiviare: la posizione resta sulle schede);
//   - `marcatore_luogo`: si archiviano TUTTE le righe (i pin possono essere stati spostati dopo, la posizione di partenza resta documentata);
//   - `pianta_area`: si archiviano TUTTE le righe (URL, pagina, fonte, licenza, copertura, note, alternative: è la provenienza delle piante e
//     non ha un'altra casa).
// `pianta_quartiere` NON si tocca e resta: è la fonte viva dell'URL di scarico dell'illustrazione del quartiere e dei suoi crediti (pagina,
// fonte, licenza), letti da `cittaService` e da `QuartierePage`; `immagine.origine_url` delle illustrazioni dei quartieri è vuoto, quindi
// portarla altrove perderebbe quei dati.
// Il registro `FONTI_TOLTE` (server/db/fontiTolte.ts) riceve una voce per ciascuna tabella tolta, per l'importazione del pacchetto e per il cestino.
// Archivio: un blocco `dati_guida.archivio-marcatori-e-piante-l11`. Nessun import da `server/services/`; non si scrive in `utente`.
// Idempotente: se le tre tabelle non ci sono già, non fa nulla. Nessuna modifica parziale: ogni anomalia lancia prima di cambiare qualcosa
// (il runner la esegue in una transazione, con la copia di avvio come via di ritorno).
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const ARCHIVIO = 'archivio-marcatori-e-piante-l11';
const TABELLE = ['marcatore_mappa', 'marcatore_luogo', 'pianta_area'] as const;
/** Le tabelle che questa migrazione non deve cambiare: ogni riga, nell'ordine della chiave, prima e dopo. */
const SENTINELLE: Record<string, string> = {
  mappa: 'SELECT * FROM main.mappa ORDER BY chiave',
  spillo: 'SELECT * FROM main.spillo ORDER BY id',
  spillo_voce: 'SELECT * FROM main.spillo_voce ORDER BY spillo_id, voce_chiave',
  punto_interesse: 'SELECT * FROM main.punto_interesse ORDER BY chiave',
  dungeon_area: 'SELECT * FROM main.dungeon_area ORDER BY chiave',
  area: 'SELECT * FROM main.area ORDER BY chiave',
  infiltrazione_area: 'SELECT * FROM main.infiltrazione_area ORDER BY infiltrazione_chiave, area_chiave',
  luogo: 'SELECT * FROM main.luogo ORDER BY chiave',
  pianta_quartiere: 'SELECT * FROM main.pianta_quartiere ORDER BY quartiere_chiave',
  cestino: 'SELECT * FROM main.cestino ORDER BY id',
  voce_giornata: 'SELECT * FROM main.voce_giornata ORDER BY 1, 2',
  dati_guida: `SELECT * FROM main.dati_guida WHERE chiave <> '${ARCHIVIO}' ORDER BY chiave`,
};
const errore = (motivo: string): never => { throw new Error(`176: ${motivo}; nessuna modifica applicata.`); };
const esiste = (db: AppDatabase, tabella: string): boolean => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(tabella);
const righe = (db: AppDatabase, sql: string): Array<Record<string, unknown>> => db.prepare(sql).all() as Array<Record<string, unknown>>;
const conta = (db: AppDatabase, tabella: string): number => (db.prepare(`SELECT COUNT(*) AS n FROM main.${tabella}`).get() as { n: number }).n;
function firma(db: AppDatabase, sql: string): string {
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare(sql).iterate()) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

export const migration176: Migration = {
  id: 176, name: 'marcatori_e_piante_archiviati',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const presenti = TABELLE.filter((t) => esiste(db, t));
    if (presenti.length === 0) return;
    if (!esiste(db, 'dati_guida')) errore('manca la tabella dati_guida');
    const sentinelle = Object.keys(SENTINELLE).filter((t) => esiste(db, t));
    const prima = new Map(sentinelle.map((t) => [t, firma(db, SENTINELLE[t]!)]));
    const conti: Record<string, number> = {};
    for (const t of presenti) conti[t] = conta(db, t);

    const archivio: Record<string, unknown> = {
      versione: 1, migrazione: 'L11-B8', conteggi: conti,
      motivo: 'Fonti senza lettori tolte dal modello; qui resta ciò che nessun’altra riga ripete (vedi docs/coordinamento/lotti/L11/ondata1/B8-B9-fonti-mappe.md).',
    };
    let marcatoriPortati = 0;
    if (presenti.includes('marcatore_mappa')) {
      // Senza la tabella delle schede non c'è nulla che ripeta le posizioni: si archivia tutto.
      const condizione = esiste(db, 'spillo')
        ? `WHERE NOT EXISTS (SELECT 1 FROM main.spillo s WHERE s.mappa_chiave IS NULL AND s.riferimento_tipo = 'punto' AND s.riferimento_chiave = m.punto_chiave
             AND ABS(s.x - m.x) < 0.01 AND ABS(s.y - m.y) < 0.01)`
        : '';
      archivio.marcatore_mappa_senza_scheda = righe(db, `SELECT m.* FROM main.marcatore_mappa m ${condizione} ORDER BY m.punto_chiave`);
      marcatoriPortati = conti.marcatore_mappa! - (archivio.marcatore_mappa_senza_scheda as unknown[]).length;
    }
    if (presenti.includes('marcatore_luogo')) archivio.marcatore_luogo = righe(db, 'SELECT * FROM main.marcatore_luogo ORDER BY luogo_chiave');
    if (presenti.includes('pianta_area')) archivio.pianta_area = righe(db, 'SELECT * FROM main.pianta_area ORDER BY area_chiave');
    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(ARCHIVIO, JSON.stringify(archivio));

    for (const t of presenti) db.exec(`DROP TABLE main.${t}`);

    // Verifiche dopo: archivio completo, tabelle sparite, nient'altro cambiato.
    const scritto = JSON.parse(String(db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO))) as Record<string, unknown>;
    if (presenti.includes('marcatore_luogo') && (scritto.marcatore_luogo as unknown[]).length !== conti.marcatore_luogo) errore('archivio dei segnaposto dei luoghi incompleto');
    if (presenti.includes('pianta_area') && (scritto.pianta_area as unknown[]).length !== conti.pianta_area) errore('archivio delle piante incompleto');
    for (const t of TABELLE) if (esiste(db, t)) errore(`la tabella ${t} esiste ancora`);
    for (const t of sentinelle) if (firma(db, SENTINELLE[t]!) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-B8', conti, marcatoriRipetutiDaUnaScheda: marcatoriPortati, marcatoriArchiviati: (scritto.marcatore_mappa_senza_scheda as unknown[] | undefined)?.length ?? 0 }, 'segnaposto e piante tolti dal modello');
  },
};
