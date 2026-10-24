// ============================================================
// 210 — pianta_quartiere archiviata e tolta dal modello, insieme allo scarico delle illustrazioni (L11 · R11-02/8)
// ============================================================
//
// Decisione dell'utente del 24/10: «Toglila con lo scarico». La tabella `pianta_quartiere` (una riga per quartiere: URL della pagina di
// Fandom, pagina, fonte, licenza, dimensioni, note) serviva a una cosa sola: scaricare nell'istanza l'illustrazione del quartiere al primo
// uso (`POST /api/mappe/piante-citta/:quartiere/scarica`) e mostrarne il credito. Lo scarico esce di scena con la tabella.
//   - Le illustrazioni NON dipendono dalla tabella: si leggono dalla loro immagine nel database (`immagine`, ambito «mappa», chiave
//     `citta-<quartiere>` se l'utente o un vecchio scarico l'ha caricata; altrimenti la grafica predefinita `mappe/citta-<quartiere>`,
//     ambito «mappe», dichiarata da `mappa.asset`). Sulla copia reale di p5s: 24 quartieri su 24 hanno l'asset predefinito e 19 anche
//     l'immagine caricata, che ha la precedenza (regola unica `illustrazioneDellaMappa`).
//   - Si archiviano TUTTE le righe (URL, pagina, fonte, licenza, larghezza, altezza, note): è la provenienza delle illustrazioni e non ha
//     un'altra casa (`immagine.origine_url` è vuoto). Archivio: un blocco `dati_guida.archivio-pianta-quartiere-l11`.
//   - Il blocco `dati_guida.mappe-citta-assenti` (i perché delle piante assenti) resta com'è: non è una struttura e nessuno lo legge più.
// Il registro `FONTI_TOLTE` (server/db/fontiTolte.ts) riceve la voce della tabella, per l'importazione del pacchetto e per il cestino.
// Nessun import da `server/services/`; non si scrive in `utente`. Idempotente: se la tabella non c'è già, non fa nulla. Nessuna modifica
// parziale: ogni anomalia lancia prima di cambiare qualcosa (il runner la esegue in una transazione, con la copia di avvio come via di ritorno).
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const ARCHIVIO = 'archivio-pianta-quartiere-l11';
const TABELLA = 'pianta_quartiere';
/** Le tabelle che questa migrazione non deve cambiare: ogni riga, nell'ordine della chiave, prima e dopo (delle immagini, i metadati: non i byte). */
const SENTINELLE: Record<string, string> = {
  immagine: 'SELECT id, ambito, chiave, nome_file, mime, byte, created_at, origine_url FROM main.immagine ORDER BY id',
  mappa: 'SELECT * FROM main.mappa ORDER BY chiave',
  spillo: 'SELECT * FROM main.spillo ORDER BY id',
  spillo_voce: 'SELECT * FROM main.spillo_voce ORDER BY spillo_id, voce_chiave',
  punto_interesse: 'SELECT * FROM main.punto_interesse ORDER BY chiave',
  dungeon: 'SELECT * FROM main.dungeon ORDER BY 1',
  dungeon_area: 'SELECT * FROM main.dungeon_area ORDER BY chiave',
  area: 'SELECT * FROM main.area ORDER BY chiave',
  infiltrazione_area: 'SELECT * FROM main.infiltrazione_area ORDER BY infiltrazione_chiave, area_chiave',
  quartiere: 'SELECT * FROM main.quartiere ORDER BY chiave',
  quartiere_ingresso: 'SELECT * FROM main.quartiere_ingresso ORDER BY quartiere_chiave',
  luogo: 'SELECT * FROM main.luogo ORDER BY chiave',
  cestino: 'SELECT * FROM main.cestino ORDER BY id',
  voce_giornata: 'SELECT * FROM main.voce_giornata ORDER BY 1, 2',
  dati_guida: `SELECT * FROM main.dati_guida WHERE chiave <> '${ARCHIVIO}' ORDER BY chiave`,
};
const errore = (motivo: string): never => { throw new Error(`210: ${motivo}; nessuna modifica applicata.`); };
const esiste = (db: AppDatabase, tabella: string): boolean => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(tabella);
function firma(db: AppDatabase, sql: string): string {
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare(sql).iterate()) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

export const migration210: Migration = {
  id: 210, name: 'pianta_quartiere_archiviata',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esiste(db, TABELLA)) return;
    if (!esiste(db, 'dati_guida')) errore('manca la tabella dati_guida');
    const sentinelle = Object.keys(SENTINELLE).filter((t) => esiste(db, t));
    const prima = new Map(sentinelle.map((t) => [t, firma(db, SENTINELLE[t]!)]));
    const righe = db.prepare(`SELECT * FROM main.${TABELLA} ORDER BY quartiere_chiave`).all() as Array<Record<string, unknown>>;
    // Quanti quartieri con una riga restano senza alcuna immagine (né caricata né predefinita): solo da dichiarare nel log, mai un blocco
    // (la pianta non è mai stata un'immagine: lo scarico, se riusciva, la produceva).
    const senzaImmagine = esiste(db, 'immagine') && esiste(db, 'mappa')
      ? (db.prepare(`SELECT COUNT(*) FROM main.${TABELLA} p WHERE NOT EXISTS (
            SELECT 1 FROM main.mappa m JOIN main.immagine i
              ON (i.ambito = 'mappa' AND i.chiave = COALESCE(m.immagine_chiave, m.chiave)) OR (i.ambito = 'mappe' AND m.asset = 'mappe/' || i.chiave)
            WHERE m.chiave = 'citta-' || p.quartiere_chiave)`).pluck().get() as number)
      : null;

    const archivio = {
      versione: 1, migrazione: 'L11-R11-02/8', conteggio: righe.length,
      motivo: 'Tolta insieme allo scarico delle illustrazioni dei quartieri (decisione del 24/10); le illustrazioni si leggono dalla loro immagine nel database. Qui restano URL, pagina, fonte, licenza, dimensioni e note di ogni riga.',
      pianta_quartiere: righe,
    };
    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(ARCHIVIO, JSON.stringify(archivio));

    db.exec(`DROP TABLE main.${TABELLA}`);

    // Verifiche dopo: archivio completo e identico, tabella sparita, nient'altro cambiato.
    const scritto = JSON.parse(String(db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO))) as { pianta_quartiere: Array<Record<string, unknown>> };
    if (scritto.pianta_quartiere.length !== righe.length || JSON.stringify(scritto.pianta_quartiere) !== JSON.stringify(righe)) errore('archivio delle piante dei quartieri incompleto');
    if (esiste(db, TABELLA)) errore(`la tabella ${TABELLA} esiste ancora`);
    for (const t of sentinelle) if (firma(db, SENTINELLE[t]!) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-R11-02/8', righeArchiviate: righe.length, quartieriSenzaImmagine: senzaImmagine }, 'pianta_quartiere tolta dal modello');
  },
};
