// ============================================================
// 177 — legami e presentazione delle mappe tolti dal modello (L11 · B9, R11-02/1, /2, /3, /4)
// ============================================================
//
// Escono dal modello `mappa.entita_tipo` / `mappa.entita_chiave`, la tabella `mappa_entita`, la colonna `mappa_presentazione.gruppo_immagini_json`
// e la tabella `guida_mappa` (più `organizzazione_mappa_esito`, scritta solo dalla vecchia `riconciliaAreeGuida`). Il dato nuovo c'è già:
//   - la radice di un quartiere o di un Palazzo si riconosce da chiave e tipo (`citta-<q>` di tipo quartiere, `dungeon-<d>` di tipo palazzo o
//     dedalo, senza genitore): convenzione biiettiva su 24 quartieri su 24 e 10 dungeon su 10;
//   - le infiltrazioni di una planimetria sono i legami `infiltrazione_area` dell'Area della planimetria (`mappa.area_chiave`);
//   - un luogo con Area sta nella planimetria predefinita della sua Area (`luogo.area_chiave`, `area.planimetria_predefinita`);
//   - la stanza è l'Area (nome `area.nome`) e la versione dentro la stanza è `mappa.versione_etichetta` / `versione_ordine`;
//   - il nome della sezione di guida di un'infiltrazione è `dungeon_area.nome`; `guida_alias` resta (è viva).
// Prima di togliere si controlla che il dato nuovo copra il vecchio e si ARCHIVIA in `dati_guida.archivio-legami-e-presentazione-mappe-l11`
// ogni riga che non è coperta: la migrazione non si ferma per dati inattesi (l'avvio deve partire), ma non perde niente. In particolare:
//   - le righe `mappa.entita_*` e `mappa_entita` di tipo area che `infiltrazione_area` non conferma (vale il dato nuovo: sono le due
//     planimetrie di Iweleth i cui Corridoi III e IV la 175 ha scambiato);
//   - le radici irregolari, i legami di luogo e di quartiere non coperti dalle convenzioni;
//   - i gruppi d'immagini che l'Area e la versione non riproducono (i 9 di ordine e i 5 di nome modificati dopo dall'utente, e gli 8 fogli
//     dei Memento, che non hanno Area) — l'id e il nome del gruppo;
//   - le schede `guida_mappa` che dicono altro da `dungeon_area` e le righe di `organizzazione_mappa_esito` (se ce ne sono).
// Gli 8 fogli senza Area che avevano un gruppo (Memento) portano etichetta e ordine del gruppo sulle colonne `versione_*`: la regola «ha una
// stanza se ha un'etichetta di versione» (collezioni di omonime) resta identica.
// Il registro `FONTI_TOLTE` (server/db/fontiTolte.ts) riceve una voce per ogni tabella e colonna tolta. Nessun import da `server/services/`; non
// si scrive in `utente`. Idempotente (se la colonna `mappa.entita_tipo` non c'è già, non fa niente) e senza modifiche parziali: ogni anomalia
// lancia prima di cambiare qualcosa, e il runner la esegue in una transazione (la copia di avvio è la via di ritorno). Dopo il DROP
// controlla che nient'altro sia cambiato (impronta di ogni riga delle tabelle che non deve toccare).
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const ARCHIVIO = 'archivio-legami-e-presentazione-mappe-l11';
/** Le tabelle che questa migrazione non deve cambiare: ogni riga, nell'ordine della chiave, prima e dopo. */
const SENTINELLE: Record<string, string> = {
  spillo: 'SELECT * FROM main.spillo ORDER BY id',
  spillo_voce: 'SELECT * FROM main.spillo_voce ORDER BY spillo_id, voce_chiave',
  spillo_destinazione: 'SELECT * FROM main.spillo_destinazione ORDER BY spillo_id',
  punto_interesse: 'SELECT * FROM main.punto_interesse ORDER BY chiave',
  dungeon: 'SELECT * FROM main.dungeon ORDER BY chiave',
  dungeon_area: 'SELECT * FROM main.dungeon_area ORDER BY chiave',
  infiltrazione_area: 'SELECT * FROM main.infiltrazione_area ORDER BY infiltrazione_chiave, area_chiave',
  area: 'SELECT * FROM main.area ORDER BY chiave',
  luogo: 'SELECT * FROM main.luogo ORDER BY chiave',
  quartiere: 'SELECT * FROM main.quartiere ORDER BY chiave',
  quartiere_ingresso: 'SELECT * FROM main.quartiere_ingresso ORDER BY quartiere_chiave',
  guida_alias: 'SELECT * FROM main.guida_alias ORDER BY chiave',
  mappa_percorso: 'SELECT * FROM main.mappa_percorso ORDER BY mappa_chiave',
  mappa_alias: 'SELECT * FROM main.mappa_alias ORDER BY chiave',
  pianta_quartiere: 'SELECT * FROM main.pianta_quartiere ORDER BY quartiere_chiave',
  cestino: 'SELECT * FROM main.cestino ORDER BY id',
  voce_giornata: 'SELECT * FROM main.voce_giornata ORDER BY 1, 2',
  dati_guida: `SELECT * FROM main.dati_guida WHERE chiave <> '${ARCHIVIO}' ORDER BY chiave`,
};
const CONTESTI = 'SELECT mappa_chiave, contesti_json FROM main.mappa_presentazione ORDER BY mappa_chiave';
/** Le colonne di `mappa` che escono (le due `entita_*`) e quelle che solo per gli 8 fogli dei Memento possono cambiare (`versione_*`). */
const COLONNE_CHE_ESCONO = ['entita_tipo', 'entita_chiave'];
const COLONNE_VERSIONE = ['versione_etichetta', 'versione_ordine'];

const errore = (motivo: string): never => { throw new Error(`177: ${motivo}; nessuna modifica applicata.`); };
const esiste = (db: AppDatabase, t: string): boolean => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
const colonne = (db: AppDatabase, t: string): string[] => (db.prepare(`PRAGMA main.table_info(${t})`).all() as Array<{ name: string }>).map((x) => x.name);
const haColonna = (db: AppDatabase, t: string, c: string): boolean => colonne(db, t).includes(c);
const righe = (db: AppDatabase, sql: string): Array<Record<string, unknown>> => db.prepare(sql).all() as Array<Record<string, unknown>>;
const quante = (db: AppDatabase, sql: string): number => (db.prepare(sql).get() as { n: number }).n;
function firma(db: AppDatabase, sql: string): string {
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare(sql).iterate()) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}
/** `mappa` senza le colonne che escono e senza `versione_*`, una riga per ogni chiave: ciò che deve restare identico. */
const mappaResidua = (db: AppDatabase): string => `SELECT ${colonne(db, 'mappa').filter((c) => !COLONNE_CHE_ESCONO.includes(c) && !COLONNE_VERSIONE.includes(c)).join(', ')} FROM main.mappa ORDER BY chiave`;

export const migration177: Migration = {
  id: 177, name: 'legami_e_presentazione_delle_mappe',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!haColonna(db, 'mappa', 'entita_tipo')) return;                           // già applicata
    for (const t of ['mappa', 'mappa_presentazione', 'area', 'infiltrazione_area', 'quartiere', 'dungeon', 'dungeon_area', 'luogo', 'dati_guida']) if (!esiste(db, t)) errore(`manca la tabella ${t}`);
    for (const c of ['area_chiave', 'versione_etichetta', 'versione_ordine']) if (!haColonna(db, 'mappa', c)) errore(`manca la colonna mappa.${c}`);
    const conEntita = esiste(db, 'mappa_entita'), conGuida = esiste(db, 'guida_mappa'), conEsito = esiste(db, 'organizzazione_mappa_esito');
    const conGruppo = haColonna(db, 'mappa_presentazione', 'gruppo_immagini_json');
    const sentinelle = Object.keys(SENTINELLE).filter((t) => esiste(db, t));
    const prima = new Map(sentinelle.map((t) => [t, firma(db, SENTINELLE[t]!)]));
    const residuaSql = mappaResidua(db);
    const mappaPrima = firma(db, residuaSql), contestiPrima = firma(db, CONTESTI);
    const conti = {
      mappa: quante(db, 'SELECT COUNT(*) AS n FROM main.mappa'), presentazione: quante(db, 'SELECT COUNT(*) AS n FROM main.mappa_presentazione'),
      mappaConEntita: quante(db, 'SELECT COUNT(*) AS n FROM main.mappa WHERE entita_tipo IS NOT NULL'),
      mappaEntita: conEntita ? quante(db, 'SELECT COUNT(*) AS n FROM main.mappa_entita') : 0,
      guidaMappa: conGuida ? quante(db, 'SELECT COUNT(*) AS n FROM main.guida_mappa') : 0,
      esiti: conEsito ? quante(db, 'SELECT COUNT(*) AS n FROM main.organizzazione_mappa_esito') : 0,
      gruppi: conGruppo ? quante(db, 'SELECT COUNT(*) AS n FROM main.mappa_presentazione WHERE gruppo_immagini_json IS NOT NULL') : 0,
    };

    // ---- guardie: ciò che il dato nuovo non copre si archivia ----
    const archivio: Record<string, unknown> = {
      versione: 1, migrazione: 'L11-B9', conteggi: conti,
      motivo: 'Fonti tolte dal modello; qui resta ciò che il dato nuovo non ripete (vedi docs/coordinamento/lotti/L11/ondata1/B8-B9-fonti-mappe.md).',
    };
    archivio.radici_irregolari = righe(db, `SELECT chiave, tipo, entita_tipo, entita_chiave FROM main.mappa WHERE
      (entita_tipo = 'quartiere' AND (tipo <> 'quartiere' OR chiave <> 'citta-' || entita_chiave))
      OR (entita_tipo = 'dungeon' AND (tipo NOT IN ('palazzo', 'dedalo') OR chiave <> 'dungeon-' || entita_chiave))`);
    archivio.mappe_area_non_coperte = righe(db, `SELECT chiave, area_chiave, entita_chiave FROM main.mappa m WHERE entita_tipo = 'area' AND NOT EXISTS
      (SELECT 1 FROM main.infiltrazione_area ia WHERE ia.infiltrazione_chiave = m.entita_chiave AND ia.area_chiave = m.area_chiave) ORDER BY chiave`);
    if (conEntita) {
      archivio.legami_area_non_coperti = righe(db, `SELECT e.* FROM main.mappa_entita e WHERE e.entita_tipo = 'area' AND NOT EXISTS (SELECT 1 FROM main.mappa m JOIN main.infiltrazione_area ia
        ON ia.area_chiave = m.area_chiave AND ia.infiltrazione_chiave = e.entita_chiave WHERE m.chiave = e.mappa_chiave) ORDER BY e.mappa_chiave, e.entita_chiave`);
      archivio.legami_luogo_non_coperti = righe(db, `SELECT e.* FROM main.mappa_entita e WHERE e.entita_tipo = 'luogo' AND NOT EXISTS (SELECT 1 FROM main.luogo l JOIN main.mappa m ON m.chiave = e.mappa_chiave
        WHERE l.chiave = e.entita_chiave AND l.area_chiave IS NOT NULL AND l.area_chiave = m.area_chiave) ORDER BY e.mappa_chiave, e.entita_chiave`);
      archivio.legami_quartiere_non_coperti = righe(db, `SELECT e.* FROM main.mappa_entita e WHERE e.entita_tipo = 'quartiere' AND NOT EXISTS
        (SELECT 1 FROM main.mappa m WHERE m.chiave = e.mappa_chiave AND m.chiave = 'citta-' || e.entita_chiave) ORDER BY e.mappa_chiave, e.entita_chiave`);
      archivio.altri_legami = righe(db, `SELECT * FROM main.mappa_entita WHERE entita_tipo NOT IN ('area', 'luogo', 'quartiere') ORDER BY mappa_chiave, entita_tipo, entita_chiave`);
    }
    if (conGruppo) {
      archivio.gruppi_immagini = righe(db, `SELECT p.mappa_chiave, p.gruppo_immagini_json FROM main.mappa_presentazione p JOIN main.mappa m ON m.chiave = p.mappa_chiave
        LEFT JOIN main.area a ON a.chiave = m.area_chiave
        WHERE p.gruppo_immagini_json IS NOT NULL AND (m.area_chiave IS NULL
          OR COALESCE(json_extract(p.gruppo_immagini_json, '$.etichetta'), '') <> COALESCE(m.versione_etichetta, '')
          OR json_extract(p.gruppo_immagini_json, '$.ordine') IS NOT m.versione_ordine OR json_extract(p.gruppo_immagini_json, '$.nome') IS NOT a.nome)
        ORDER BY p.mappa_chiave`);
    }
    if (conGuida) {
      archivio.guida_mappa = righe(db, `SELECT g.* FROM main.guida_mappa g LEFT JOIN main.dungeon_area a ON a.chiave = g.area_chiave
        WHERE a.chiave IS NULL OR g.nome <> a.nome OR g.note <> '' OR g.metadata_json NOT IN ('', '{}') ORDER BY g.area_chiave`);
    }
    if (conEsito && conti.esiti > 0) archivio.organizzazione_mappa_esito = righe(db, 'SELECT * FROM main.organizzazione_mappa_esito ORDER BY chiave');
    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(ARCHIVIO, JSON.stringify(archivio));

    // ---- etichetta e ordine dei fogli senza Area che avevano un gruppo (Memento) → colonne della versione ----
    const portati = conGruppo ? db.prepare(`UPDATE main.mappa SET
        versione_etichetta = (SELECT json_extract(p.gruppo_immagini_json, '$.etichetta') FROM main.mappa_presentazione p WHERE p.mappa_chiave = mappa.chiave),
        versione_ordine = (SELECT json_extract(p.gruppo_immagini_json, '$.ordine') FROM main.mappa_presentazione p WHERE p.mappa_chiave = mappa.chiave)
      WHERE area_chiave IS NULL AND versione_etichetta IS NULL AND versione_ordine IS NULL
        AND EXISTS (SELECT 1 FROM main.mappa_presentazione p WHERE p.mappa_chiave = mappa.chiave AND p.gruppo_immagini_json IS NOT NULL)`).run().changes : 0;

    // ---- tolgono ----
    db.exec('ALTER TABLE main.mappa DROP COLUMN entita_tipo');
    db.exec('ALTER TABLE main.mappa DROP COLUMN entita_chiave');
    if (conGruppo) db.exec('ALTER TABLE main.mappa_presentazione DROP COLUMN gruppo_immagini_json');
    for (const t of ['mappa_entita', 'guida_mappa', 'organizzazione_mappa_esito']) if (esiste(db, t)) db.exec(`DROP TABLE main.${t}`);

    // ---- verifiche dopo: archivio scritto, strutture sparite, nient'altro cambiato ----
    const scritto = JSON.parse(String(db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO))) as Record<string, unknown>;
    if (conti.esiti > 0 && (scritto.organizzazione_mappa_esito as unknown[] | undefined)?.length !== conti.esiti) errore('archivio degli esiti incompleto');
    for (const t of sentinelle) if (firma(db, SENTINELLE[t]!) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    if (firma(db, residuaSql) !== mappaPrima) errore('le righe di mappa sono cambiate');
    if (firma(db, CONTESTI) !== contestiPrima) errore('i contesti delle presentazioni sono cambiati');
    if (quante(db, 'SELECT COUNT(*) AS n FROM main.mappa') !== conti.mappa || quante(db, 'SELECT COUNT(*) AS n FROM main.mappa_presentazione') !== conti.presentazione) errore('conteggi cambiati');
    if (haColonna(db, 'mappa', 'entita_tipo') || haColonna(db, 'mappa', 'entita_chiave') || haColonna(db, 'mappa_presentazione', 'gruppo_immagini_json')) errore('una colonna esiste ancora');
    for (const t of ['mappa_entita', 'guida_mappa', 'organizzazione_mappa_esito']) if (esiste(db, t)) errore(`la tabella ${t} esiste ancora`);
    logger.info({
      migrazione: 'L11-B9', conti, versioniPortate: portati,
      archiviate: Object.fromEntries(Object.entries(archivio).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, (v as unknown[]).length])),
    }, 'legami e presentazione delle mappe tolti dal modello');
  },
};
