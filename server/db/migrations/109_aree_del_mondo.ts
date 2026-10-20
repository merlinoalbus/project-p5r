// ============================================================
// 109 — le Aree del mondo: ogni planimetria di un quartiere appartiene a un'Area (L2, 2026-10-20)
// ============================================================
//
// Lotto L2 del piano di razionalizzazione, gerarchia voluta dall'utente (2026-10-19): **Città → Quartiere → Area → Planimetrie →
// Luoghi**. Fino a qui le «zone» di un quartiere erano mappe sciolte sotto la mappa del quartiere, e le versioni della stessa zona
// (il Sottopasso e il «Sottopasso Speciale», le cinque inquadrature del Covo) stavano insieme solo per un gruppo d'immagini nella
// presentazione. Questa migrazione **aggiunge i legami, non riscrive i contenuti** (lotti/L2/modifiche.md §2):
//   1. la tabella `area` (una per il mondo e, da L3, per i Palazzi: il contenitore è un quartiere, la città **o** un Palazzo), le colonne
//      `mappa.area_chiave`, `mappa.versione_etichetta`, `mappa.versione_ordine` e `quartiere_ingresso.area_chiave`;
//   2. il cestino accetta il tipo `area-fisica` (SQLite non cambia un CHECK: la tabella si ricrea con le stesse righe e gli stessi id);
//   3. il Covo dei Ladri (decisione D2) passa sotto Yongen-Jaya: è l'**unica colonna esistente** che cambia valore (`genitore_chiave`
//      delle sue cinque planimetrie, oggi radici), e i loro percorsi pubblici si fissano a quelli di oggi (`mappa.percorso_fisso`);
//   4. un'Area per ogni gruppo d'immagini del mondo e una per ogni planimetria sciolta di un quartiere, con le versioni del gruppo;
//   5. gli ingressi dei quartieri ricevono l'Area della loro planimetria.
// Nessuna chiave di mappa cambia, nessun pin cambia mappa, posizione, nome o riferimento; alias e percorsi pubblici restano quelli
// di oggi (`sincronizzaPercorsiMappe` non si chiama: gli indirizzi vecchi del Covo restano validi). Le planimetrie dello staff
// (figlie di Tokyo, nessun quartiere: nessuna fonte le colloca) diventano un'Area della città **da verificare** (decisione dell'utente,
// 2026-10-20: poi la tiene o la rimuove), con genitore e chiavi invariati. Si può rieseguire: la seconda volta non tocca niente.
// La regola è scritta qui (come la 107: una migrazione non segue il codice che cambia); il servizio delle Aree ne ha una copia per
// i pacchetti di prima, con un test di equivalenza.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/** Le cinque planimetrie del Covo dei Ladri e il quartiere che le accoglie (D2). */
const COVO = ['nativo-rmap-022-1-0', 'nativo-rmap-022-1-1', 'nativo-rmap-022-1-2', 'nativo-rmap-022-1-3', 'nativo-rmap-022-1-4'];
const COVO_GENITORE = 'citta-yongen-jaya';

/** Gli slug che non possono essere di un'Area: sono segmenti delle rotte delle Aree. */
const SLUG_RISERVATI = new Set(['ordine', 'da-collocare', 'nuova']);

/** La regola di `shared/slug.ts`, copiata: minuscolo, senza accenti né apostrofi, ogni altro carattere un trattino. */
function slug(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’`´]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
}

function colonne(db: AppDatabase, tabella: string): Set<string> {
  return new Set((db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name));
}

/** Lo schema: tabella `area`, indici, colonne nuove (solo se mancano). */
function creaSchema(db: AppDatabase): void {
  db.exec(`CREATE TABLE IF NOT EXISTS area (
    chiave                  TEXT PRIMARY KEY,
    quartiere_chiave        TEXT REFERENCES quartiere(chiave) ON DELETE CASCADE,
    dungeon_chiave          TEXT REFERENCES dungeon(chiave) ON DELETE CASCADE,
    slug                    TEXT NOT NULL,
    nome                    TEXT NOT NULL,
    nome_rivisto            INTEGER NOT NULL DEFAULT 0 CHECK (nome_rivisto IN (0, 1)),
    ordine                  INTEGER NOT NULL,
    planimetria_predefinita TEXT REFERENCES mappa(chiave) ON DELETE SET NULL,
    origine                 TEXT NOT NULL DEFAULT 'utente' CHECK (origine IN ('seed', 'utente')),
    seed_json               TEXT,
    updated_at              TEXT NOT NULL,
    citta_chiave            TEXT CHECK (citta_chiave IN ('tokyo')),
    da_verificare           INTEGER NOT NULL DEFAULT 0 CHECK (da_verificare IN (0, 1)),
    CHECK ((quartiere_chiave IS NOT NULL) + (dungeon_chiave IS NOT NULL) + (citta_chiave IS NOT NULL) = 1)
  )`);
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS area_slug_quartiere ON area (quartiere_chiave, slug) WHERE quartiere_chiave IS NOT NULL');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS area_slug_dungeon ON area (dungeon_chiave, slug) WHERE dungeon_chiave IS NOT NULL');
  // lo slug è unico in ogni contenitore, anche nella città (le Aree a livello di Tokyo, come lo staff)
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS area_slug_citta ON area (citta_chiave, slug) WHERE citta_chiave IS NOT NULL');
  const m = colonne(db, 'mappa');
  if (!m.has('area_chiave')) db.exec('ALTER TABLE mappa ADD COLUMN area_chiave TEXT REFERENCES area(chiave) ON DELETE SET NULL');
  if (!m.has('versione_etichetta')) db.exec('ALTER TABLE mappa ADD COLUMN versione_etichetta TEXT');
  if (!m.has('versione_ordine')) db.exec('ALTER TABLE mappa ADD COLUMN versione_ordine INTEGER');
  // il percorso pubblico che resta qualunque sia la catena dei genitori (il Covo spostato sotto Yongen-Jaya, FUN2-2)
  if (!m.has('percorso_fisso')) db.exec('ALTER TABLE mappa ADD COLUMN percorso_fisso TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS mappa_area ON mappa (area_chiave)');
  if (!colonne(db, 'quartiere_ingresso').has('area_chiave')) db.exec('ALTER TABLE quartiere_ingresso ADD COLUMN area_chiave TEXT REFERENCES area(chiave) ON DELETE SET NULL');
}

/**
 * Il cestino accetta `area-fisica`: la tabella si ricrea con lo stesso DDL della 104 più il tipo, le stesse righe con gli stessi id,
 * l'indice, e il contatore `sqlite_sequence` che non torna indietro (un id già usato da un elemento svuotato non si riusa). Le chiavi
 * esterne le spegne il runner attorno alla transazione. Restituisce quante righe ha ricopiato (0 se il tipo c'era già).
 */
function cestinoConAree(db: AppDatabase): number {
  const sql = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'cestino'").get() as { sql: string } | undefined)?.sql;
  if (!sql || sql.includes("'area-fisica'")) return 0;
  const sequenza = (db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'cestino'").get() as { seq: number } | undefined)?.seq ?? 0;
  db.exec(`CREATE TABLE cestino_nuovo (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    uid             TEXT NOT NULL UNIQUE,
    tipo            TEXT NOT NULL CHECK (tipo IN ('area', 'voce', 'mappa', 'area-dedalo', 'area-fisica')),
    chiave          TEXT NOT NULL,
    nome            TEXT NOT NULL,
    contesto        TEXT NOT NULL DEFAULT '',
    riepilogo_json  TEXT NOT NULL DEFAULT '{}',
    registro_json   TEXT NOT NULL,
    con_partite     INTEGER NOT NULL DEFAULT 0 CHECK (con_partite IN (0, 1)),
    vicini_json     TEXT,
    eliminato_il    TEXT NOT NULL
  )`);
  const copiate = db.prepare(`INSERT INTO cestino_nuovo (id, uid, tipo, chiave, nome, contesto, riepilogo_json, registro_json, con_partite, vicini_json, eliminato_il)
    SELECT id, uid, tipo, chiave, nome, contesto, riepilogo_json, registro_json, con_partite, vicini_json, eliminato_il FROM cestino ORDER BY id`).run().changes;
  db.exec('DROP TABLE cestino');
  db.exec('ALTER TABLE cestino_nuovo RENAME TO cestino');
  db.exec('CREATE INDEX IF NOT EXISTS idx_cestino_eliminato ON cestino(eliminato_il)');
  const massimo = (db.prepare('SELECT COALESCE(MAX(id), 0) AS n FROM cestino').get() as { n: number }).n;
  db.prepare("DELETE FROM sqlite_sequence WHERE name = 'cestino'").run();
  if (Math.max(sequenza, massimo) > 0) db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES ('cestino', ?)").run(Math.max(sequenza, massimo));
  return copiate;
}

/**
 * Il Covo dei Ladri sotto Yongen-Jaya (D2): solo le planimetrie ancora radici, e solo se il quartiere c'è. Restituisce le spostate.
 * I loro percorsi pubblici restano quelli di oggi (`covo-dei-ladri`, …, §2.1.3): la sincronizzazione dei percorsi li calcolerebbe dalla
 * catena dei genitori (`yongen-jaya-covo-dei-ladri`), e per questo si fissano prima dello spostamento (`mappa.percorso_fisso`, letto da
 * `sincronizzaPercorsiMappe`; una rinomina o uno spostamento dall'editor lo tolgono). Difetto FUN2-2 dei test funzionali.
 */
function covoSottoYongenJaya(db: AppDatabase): number {
  if (!db.prepare('SELECT 1 FROM mappa WHERE chiave = ?').get(COVO_GENITORE)) return 0;
  const segnaposti = COVO.map(() => '?').join(', ');
  if (db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'mappa_percorso'").get()) {
    db.prepare(`UPDATE mappa SET percorso_fisso = (SELECT p.chiave FROM mappa_percorso p WHERE p.mappa_chiave = mappa.chiave)
      WHERE chiave IN (${segnaposti}) AND genitore_chiave IS NULL AND percorso_fisso IS NULL`).run(...COVO);
  }
  return db.prepare(`UPDATE mappa SET genitore_chiave = ? WHERE chiave IN (${segnaposti}) AND genitore_chiave IS NULL`)
    .run(COVO_GENITORE, ...COVO).changes;
}

interface Gruppo { id: string; nome: string; ordine: number; etichetta?: string; nomeRivisto?: boolean }
/** Il contenitore di un'Area del mondo: un quartiere, o la città (Tokyo) per le planimetrie che non stanno in nessun quartiere. */
type TipoContenitore = 'quartiere' | 'citta';
interface RigaZona { chiave: string; nome: string; ordine: number; origine: string; nome_rivisto: number; tipo: TipoContenitore; contenitore: string; gruppo_json: string | null }

/** Il gruppo d'immagini dichiarato nella presentazione, se è leggibile e ha un id. */
function gruppoDi(json: string | null): Gruppo | null {
  if (!json) return null;
  try {
    const g = JSON.parse(json) as Partial<Gruppo>;
    return typeof g.id === 'string' && g.id.length > 0 ? { id: g.id, nome: typeof g.nome === 'string' ? g.nome : '', ordine: Number.isInteger(g.ordine) ? g.ordine! : 0, etichetta: typeof g.etichetta === 'string' ? g.etichetta : undefined, nomeRivisto: g.nomeRivisto === true } : null;
  } catch {
    return null;
  }
}

/** Esito della regola delle Aree: per il log e per i test. */
export interface EsitoAreeMondo { aree: number; planimetrie: number; etichette: number; ingressi: number }

/**
 * La regola delle Aree del mondo (passi 4, 5 e 6): le planimetrie (`luogo` o `area`) ancora senza Area, figlie di una mappa di quartiere
 * (escluso l'ingresso dei Memento) o di Tokyo, si raggruppano per gruppo d'immagini, o una per Area se sciolte. Le Aree di un quartiere
 * stanno nel quartiere; quelle figlie di Tokyo (oggi lo staff, che nessuna fonte colloca: decisione dell'utente del 2026-10-20) stanno
 * nella città e nascono **da verificare** (l'utente poi le tiene o le rimuove). Un'Area esistente non si ricrea; le nuove vanno in
 * fondo al loro contenitore, nell'ordine delle loro planimetrie. `spostate` sono le mappe appena portate sotto un quartiere (il Covo):
 * vanno dopo le altre, che stavano già lì.
 */
export function assegnaAreeDelMondo109(db: AppDatabase, adesso: string, spostate: ReadonlySet<string> = new Set()): EsitoAreeMondo {
  const zone = [
    ...db.prepare(`SELECT m.chiave, m.nome, m.ordine, m.origine, COALESCE(m.nome_rivisto, 0) AS nome_rivisto, 'quartiere' AS tipo,
        q.entita_chiave AS contenitore, p.gruppo_immagini_json AS gruppo_json
      FROM mappa m
      JOIN mappa q ON q.chiave = m.genitore_chiave AND q.tipo = 'quartiere' AND q.entita_tipo = 'quartiere' AND q.entita_chiave <> 'mementos'
      JOIN quartiere qq ON qq.chiave = q.entita_chiave
      LEFT JOIN mappa_presentazione p ON p.mappa_chiave = m.chiave
      WHERE m.tipo IN ('luogo', 'area') AND m.area_chiave IS NULL`).all() as RigaZona[],
    // la città: solo Tokyo (il CHECK di `area.citta_chiave`)
    ...db.prepare(`SELECT m.chiave, m.nome, m.ordine, m.origine, COALESCE(m.nome_rivisto, 0) AS nome_rivisto, 'citta' AS tipo,
        'tokyo' AS contenitore, p.gruppo_immagini_json AS gruppo_json
      FROM mappa m
      JOIN mappa c ON c.chiave = m.genitore_chiave AND c.chiave = 'tokyo' AND c.tipo = 'citta'
      LEFT JOIN mappa_presentazione p ON p.mappa_chiave = m.chiave
      WHERE m.tipo IN ('luogo', 'area') AND m.area_chiave IS NULL`).all() as RigaZona[],
  ];
  // i gruppi (contenitore e gruppo → planimetrie); le sciolte sono gruppi di una
  const gruppi = new Map<string, { tipo: TipoContenitore; contenitore: string; gruppo: Gruppo | null; righe: RigaZona[] }>();
  for (const z of zone) {
    const g = gruppoDi(z.gruppo_json);
    const id = `${z.tipo}:${z.contenitore}|${g ? `g:${g.id}` : `m:${z.chiave}`}`;
    const voce = gruppi.get(id) ?? { tipo: z.tipo, contenitore: z.contenitore, gruppo: g, righe: [] };
    voce.righe.push(z);
    gruppi.set(id, voce);
  }
  const esito: EsitoAreeMondo = { aree: 0, planimetrie: 0, etichette: 0, ingressi: 0 };
  const perContenitore = new Map<string, { tipo: TipoContenitore; contenitore: string; aree: Array<{ gruppo: Gruppo | null; righe: RigaZona[] }> }>();
  for (const v of gruppi.values()) {
    // le versioni nell'ordine del gruppo (a parità, della mappa e della chiave); una sciolta è la versione 0
    v.righe.sort((a, b) => (gruppoDi(a.gruppo_json)?.ordine ?? 0) - (gruppoDi(b.gruppo_json)?.ordine ?? 0) || a.ordine - b.ordine || a.chiave.localeCompare(b.chiave));
    const id = `${v.tipo}:${v.contenitore}`;
    const elenco = perContenitore.get(id) ?? { tipo: v.tipo, contenitore: v.contenitore, aree: [] };
    elenco.aree.push({ gruppo: v.gruppo, righe: v.righe });
    perContenitore.set(id, elenco);
  }
  const inserisci = db.prepare(`INSERT INTO area (chiave, quartiere_chiave, dungeon_chiave, citta_chiave, slug, nome, nome_rivisto, ordine, planimetria_predefinita, origine, seed_json, da_verificare, updated_at)
    VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`);
  const lega = db.prepare('UPDATE mappa SET area_chiave = ?, versione_ordine = ?, versione_etichetta = ? WHERE chiave = ? AND area_chiave IS NULL');
  for (const { tipo, contenitore, aree } of [...perContenitore.values()].sort((a, b) => `${a.tipo}:${a.contenitore}`.localeCompare(`${b.tipo}:${b.contenitore}`))) {
    const colonna = tipo === 'quartiere' ? 'quartiere_chiave' : 'citta_chiave';
    // dove comincia la numerazione: dopo le Aree che il contenitore ha già (una seconda esecuzione, un'Area creata dall'app)
    const giaUsati = new Set((db.prepare(`SELECT slug FROM area WHERE ${colonna} = ?`).all(contenitore) as Array<{ slug: string }>).map((r) => r.slug));
    const base = (db.prepare(`SELECT COALESCE(MAX(ordine) + 100, 0) AS n FROM area WHERE ${colonna} = ?`).get(contenitore) as { n: number }).n;
    const chiaveOrdine = (a: { righe: RigaZona[] }) => ({ spostata: a.righe.some((r) => spostate.has(r.chiave)) ? 1 : 0, ordine: Math.min(...a.righe.map((r) => r.ordine)), chiave: [...a.righe].map((r) => r.chiave).sort()[0] });
    aree.sort((a, b) => { const x = chiaveOrdine(a); const y = chiaveOrdine(b); return x.spostata - y.spostata || x.ordine - y.ordine || x.chiave.localeCompare(y.chiave); });
    aree.forEach((a, i) => {
      const predefinita = a.righe[0];
      const nome = (a.gruppo?.nome?.trim() || predefinita.nome).trim();
      let s = slug(nome) || 'area';
      if (SLUG_RISERVATI.has(s)) s = `${s}-area`;
      let candidato = s; let n = 2;
      while (giaUsati.has(candidato)) candidato = `${s}-${n++}`;
      giaUsati.add(candidato);
      // `citta/<quartiere>/<slug>`, e per la città `citta/tokyo/<slug>`
      const chiave = `citta/${contenitore}/${candidato}`;
      const utente = a.righe.some((r) => r.origine === 'utente' || r.nome_rivisto === 1);
      const rivisto = a.righe.some((r) => r.nome_rivisto === 1) || a.gruppo?.nomeRivisto === true;
      inserisci.run(chiave, tipo === 'quartiere' ? contenitore : null, tipo === 'citta' ? contenitore : null, candidato, nome, rivisto ? 1 : 0, base + 100 * i,
        predefinita.chiave, utente ? 'utente' : 'seed', tipo === 'citta' ? 1 : 0, adesso);
      esito.aree++;
      const conVersioni = a.righe.length > 1;
      a.righe.forEach((r, v) => {
        const etichetta = conVersioni ? (gruppoDi(r.gruppo_json)?.etichetta?.trim() || null) : null;
        esito.planimetrie += lega.run(chiave, v, etichetta, r.chiave).changes;
        if (etichetta) esito.etichette++;
      });
    });
  }
  // gli ingressi: l'Area della loro planimetria (planimetria, punto e zoom invariati)
  esito.ingressi = db.prepare(`UPDATE quartiere_ingresso SET area_chiave = (SELECT area_chiave FROM mappa WHERE chiave = quartiere_ingresso.mappa_chiave)
    WHERE area_chiave IS NULL AND (SELECT area_chiave FROM mappa WHERE chiave = quartiere_ingresso.mappa_chiave) IS NOT NULL`).run().changes;
  return esito;
}

export const migration109: Migration = {
  id: 109,
  name: 'aree_del_mondo',
  up(db) {
    const adesso = new Date().toISOString();
    creaSchema(db);
    const cestino = cestinoConAree(db);
    const covo = covoSottoYongenJaya(db);
    const spostate = new Set(covo > 0 ? COVO : []);
    const esito = assegnaAreeDelMondo109(db, adesso, spostate);
    // nel mondo, dopo, non resta nessuna planimetria senza Area (figlia di Tokyo o di un quartiere)
    const senzaArea = (db.prepare(`SELECT COUNT(*) AS n FROM mappa m JOIN mappa t ON t.chiave = m.genitore_chiave AND t.tipo IN ('citta', 'quartiere')
      AND COALESCE(t.entita_chiave, '') <> 'mementos' WHERE m.tipo IN ('luogo', 'area') AND m.area_chiave IS NULL`).get() as { n: number }).n;
    const daVerificare = (db.prepare('SELECT COUNT(*) AS n FROM area WHERE da_verificare = 1').get() as { n: number }).n;
    logger.info({ ...esito, daVerificare, senzaArea, covoSpostato: covo, cestinoRicopiato: cestino }, 'migrazione 109: Aree del mondo');
  },
};
