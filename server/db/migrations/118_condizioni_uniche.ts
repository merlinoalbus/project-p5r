// ============================================================
// 118 — M6 di L6 «Condizioni uniche»: una forma per ogni sblocco (lotti/L6/modifiche.md §5, §4.1–§4.4)
// ============================================================
//
// Un vocabolario, un valutatore: le condizioni JSON di oggi sono già per chiave e restano identiche; qui si aggiungono le forme che
// mancano e si correggono i dati con una fonte. Passi, in una transazione (il runner), con le regole scritte qui (una migrazione non
// segue il codice che cambia):
//   1. schema: `quartiere.condizioni_json` e `quartiere.fonte_condizioni_json` (la sola fonte dello sblocco del quartiere; la frase
//      `sblocco` resta nota), `luogo.fonte_condizioni_json`, `dungeon.finestra_dal`/`finestra_al`/`lettera_entro`, la tabella
//      `confidente_invito` (gli inviti dei Confidenti, dati del Confidente) e il cestino che accetta `richiesta` (ricreato con le stesse
//      righe, gli stessi id e il contatore, come nella 115). La tabella delle partite `invito_partita` è della migrazione utente 025;
//   2. quartieri: le condizioni della tabella del §4.1 (G-018 e decisioni dell'utente), solo dove la colonna è vuota; i ritrovi
//      Jazz Jin (Akechi 4) e Jinbocho (Nagiuri: Hifumi 4 o il libro);
//   3. le regole `dati_guida.sblocco-luoghi` copiate nei luoghi senza condizione (sono già strutturate: esito identico);
//   4. luoghi: le condizioni di G-029/G-031 dove il luogo non ne ha; le 7 vie «data» che erano inviti o vendite di libri riscritte, solo se
//      la condizione è ancora quella di prima (Odaiba: Ann 10 al posto della data; gli altri 6: l'invito diventa una riga di
//      `confidente_invito` e la data si toglie);
//   5. gli inviti (G-023, G-028): 6 righe, con le condizioni del gioco;
//   6. requisiti dei Confidenti: le 11 Richieste dal nome alla chiave e le 10 `persona-abilita` per id (abbinamenti esatti e unici);
//      Clinica (sede e 11 articoli dal 16/4, Tae dal 18/4), Ohya dal 5/7 (G-017, decisione del PM);
//   7. finestre dei Palazzi da `dati_guida.finestre-dungeon` alle colonne (Madarame: lettera entro il 2/6).
// Non si scrive: le condizioni dei pin (nessun pin d'ingresso seed copia la finestra sui dati di riferimento, e `arco` non equivale a
// una finestra che finisce: le copie, se ci sono, restano); nessuna frase si cancella; nessuna riga dell'utente cambia. Ogni modifica
// a una riga esistente va nel registro con prima e dopo. La seconda esecuzione non cambia niente.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

type C = Record<string, unknown>;
interface Fonte { registro: string; certezza: 'alta' | 'media' | 'bassa'; nota?: string }

const lettura = (chiave: string): C => ({ tipo: 'lettura', categoria: 'libro', chiave });
const confidente = (c: string, rango: number): C => ({ tipo: 'confidente', confidente: c, rango });
const data = (dal: string): C => ({ tipo: 'data', dal });
const luogo = (l: string): C => ({ tipo: 'luogo', luogo: l });
const palazzo = (dungeon: string): C => ({ tipo: 'palazzo', dungeon });
const almenoUna = (...condizioni: C[]): C => ({ tipo: 'gruppo', modo: 'almeno-una', condizioni });

const G018: Fonte = { registro: 'G-018', certezza: 'alta' };
const UTENTE = (nota: string): Fonte => ({ registro: 'decisione dell’utente', certezza: 'alta', nota });

/** Passo 2, §4.1: la condizione di sblocco di ogni quartiere (Memento senza, finché l'Esperto non dà la data della prima discesa). */
export const QUARTIERI: Readonly<Record<string, { condizioni: C[]; fonte: Fonte }>> = {
  'yongen-jaya': { condizioni: [{ tipo: 'da-subito' }], fonte: G018 },
  shibuya: { condizioni: [{ tipo: 'da-subito' }], fonte: G018 },
  'shujin-academy': { condizioni: [{ tipo: 'da-subito' }], fonte: G018 },
  ogikubo: { condizioni: [confidente('ryuji', 4)], fonte: G018 },
  'inokashira-park': { condizioni: [confidente('ann', 3)], fonte: G018 },
  ueno: { condizioni: [confidente('yusuke', 3)], fonte: G018 },
  tsukishima: { condizioni: [confidente('ryuji', 7)], fonte: G018 },
  harajuku: { condizioni: [luogo('harajuku/takenoko-street')], fonte: { ...G018, nota: 'il ritrovo Takenoko Street, aperto dal libro «Vague»' } },
  kichijoji: { condizioni: [almenoUna(data('06-05'), luogo('kichijoji/jazz-jin'))], fonte: G018 },
  suidobashi: { condizioni: [data('06-09')], fonte: { ...G018, nota: 'corretto dal 10 giugno' } },
  shinjuku: { condizioni: [data('06-18')], fonte: G018 },
  akihabara: { condizioni: [data('08-31')], fonte: G018 },
  odaiba: { condizioni: [luogo('odaiba/odaiba-seaside-park')], fonte: UTENTE('il Seaside Park: libro «Luoghi della movida» oppure Ann al rango 10; il 1° giugno era la vendita del libro') },
  'kanda-jinbocho': { condizioni: [almenoUna(data('06-28'), confidente('hifumi', 4), lettura('pagine-ammuffite'))], fonte: { ...G018, nota: 'Kanda dal 28 giugno (corretto da «Yusuke rango 5»); Jinbocho con Hifumi 4 o il libro' } },
  asakusa: { condizioni: [almenoUna(confidente('ann', 7), luogo('asakusa/tokyo-skytree'))], fonte: UTENTE('Ann al rango 7, oppure lo Skytree col libro «Shitamachi rinato»') },
  shinagawa: { condizioni: [lettura('un-acquario-al-giorno')], fonte: G018 },
  ichigaya: { condizioni: [lettura('vedetta-lacustre')], fonte: G018 },
  'meiji-shrine': { condizioni: [lettura('santuari-di-tokyo')], fonte: G018 },
  nakano: { condizioni: [lettura('esplorando-nakano')], fonte: G018 },
  'yokohama-chinatown': { condizioni: [lettura('dolci-cinesi')], fonte: G018 },
  ikebukuro: { condizioni: [luogo('ikebukuro/planetario-ikebukuro')], fonte: { ...G018, nota: 'il Planetario; il 1° settembre era la vendita del libro' } },
  roppongi: { condizioni: [data('09-15')], fonte: { registro: 'G-031', certezza: 'alta' } },
  maihama: { condizioni: [luogo('maihama/destinyland')], fonte: { ...G018, certezza: 'media', nota: 'da verificare: la data dell’11 ottobre del parco è a certezza media' } },
};

const G029: Fonte = { registro: 'G-029', certezza: 'alta' };
/** Passi 2 e 4: le condizioni dei luoghi che oggi non ne hanno (G-029, G-031; Asakusa per decisione dell'utente). */
export const LUOGHI: Readonly<Record<string, { condizioni: C[]; fonte: Fonte }>> = {
  'asakusa/asakusa-hangout': { condizioni: [confidente('ann', 7)], fonte: UTENTE('Ann al rango 7') },
  'inokashira-park/inokashira-hangout': { condizioni: [confidente('ann', 3)], fonte: G029 },
  'ogikubo/ogikubo-ramen': { condizioni: [confidente('ryuji', 4)], fonte: G029 },
  'tsukishima/tsukishima-monjayaki': { condizioni: [confidente('ryuji', 7)], fonte: G029 },
  'ueno/museo-ueno': { condizioni: [confidente('yusuke', 3)], fonte: G029 },
  'kichijoji/jazz-jin': { condizioni: [confidente('akechi', 4)], fonte: G029 },
  'suidobashi/dome-town': { condizioni: [data('06-09')], fonte: G029 },
  'yongen-jaya/clinica-takemi': { condizioni: [data('04-16')], fonte: UTENTE('il negozio di farmaci dal 16 aprile; Tae come Confidente dal 18') },
  'kanda-jinbocho/chiesa-kanda': { condizioni: [data('06-28')], fonte: G029 },
  'kichijoji/mantra-ganda': { condizioni: [confidente('gemelle', 3)], fonte: G029 },
  'shibuya/protein-lovers': { condizioni: [almenoUna(confidente('ryuji', 5), confidente('ann', 8))], fonte: G029 },
  'yongen-jaya/venditore-patate-dolci': { condizioni: [data('10-09')], fonte: G029 },
  'mementos/negozio-jose': { condizioni: [{ tipo: 'richiesta', richiesta: 'un-ex-piuttosto-appiccicoso' }], fonte: { registro: 'G-029', certezza: 'media', nota: 'da verificare' } },
  'shibuya/untouchable': { condizioni: [data('04-17')], fonte: { ...G029, nota: 'la visita con Ryuji; Iwai va sul Confidente' } },
  'yongen-jaya/batting-cage-yongen': { condizioni: [lettura('esplorando-yoncha-4')], fonte: G029 },
  'yongen-jaya/bagno-pubblico': { condizioni: [lettura('esplorando-yoncha-4')], fonte: G029 },
  'shujin-academy/infermeria-shujin': { condizioni: [data('05-13')], fonte: G029 },
  'kichijoji/mercante-sakai': {
    condizioni: [almenoUna(...([['06-12', '06-17'], ['06-26', '07-02'], ['07-11', '07-12'], ['07-26', '07-30'], ['08-07', '08-13'], ['08-22', '08-27'],
      ['09-04', '09-06'], ['09-19', '09-24'], ['10-02', '10-08'], ['10-16', '10-22'], ['10-30', '11-05'], ['11-13', '11-17'], ['11-27', '12-03'],
      ['12-11', '12-17'], ['01-13', '01-14'], ['01-22', '02-02']] as const).map(([dal, al]) => ({ tipo: 'intervallo', dal, al })))],
    fonte: { registro: 'G-031', certezza: 'alta', nota: 'le 16 finestre del mercante' },
  },
  'kanda-jinbocho/nagiuri': { condizioni: [almenoUna(confidente('hifumi', 4), lettura('pagine-ammuffite'))], fonte: { registro: 'G-031', certezza: 'alta', nota: 'il ritrovo di Jinbocho' } },
};

/** Passo 4, §4.1: le 7 vie «data» riscritte. `prima` è la condizione di oggi: si riscrive solo se la riga è ancora quella. */
export const RISCRITTE: Readonly<Record<string, { prima: C[]; dopo: C[]; fonte: Fonte }>> = {
  'odaiba/odaiba-seaside-park': { prima: [almenoUna(lettura('luoghi-della-movida'), data('06-01'))], dopo: [almenoUna(lettura('luoghi-della-movida'), confidente('ann', 10))], fonte: UTENTE('il libro oppure Ann al rango 10; il 1° giugno era la vendita del libro') },
  'harajuku/harajuku-hangout': { prima: [almenoUna(lettura('vague'), data('08-03'))], dopo: [lettura('vague')], fonte: { registro: 'G-023', certezza: 'alta', nota: 'oppure l’invito di Ryuji del 29 maggio' } },
  'ikebukuro/planetario-ikebukuro': { prima: [almenoUna(lettura('cieli-notturni'), data('09-01'))], dopo: [lettura('cieli-notturni')], fonte: { registro: 'G-023', certezza: 'alta', nota: 'oppure l’invito di Makoto del 30 luglio' } },
  'meiji-shrine/meiji-shrine-hangout': { prima: [almenoUna(lettura('santuari-di-tokyo'), data('08-05'))], dopo: [lettura('santuari-di-tokyo')], fonte: { registro: 'G-023', certezza: 'alta', nota: 'oppure l’invito di Ann del 6 agosto' } },
  'shinagawa/shinagawa-acquario': { prima: [almenoUna(lettura('un-acquario-al-giorno'), data('07-28'))], dopo: [lettura('un-acquario-al-giorno')], fonte: { registro: 'G-023', certezza: 'alta', nota: 'oppure l’invito di Akechi del 29 luglio' } },
  'nakano/nakano-broadway': { prima: [almenoUna(lettura('esplorando-nakano'), data('10-09'))], dopo: [lettura('esplorando-nakano')], fonte: { registro: 'G-023', certezza: 'alta', nota: 'oppure l’invito di Futaba del 9 ottobre' } },
  'ichigaya/laghetto-ichigaya': { prima: [almenoUna(lettura('vedetta-lacustre'), data('07-06'))], dopo: [lettura('vedetta-lacustre')], fonte: { registro: 'G-023', certezza: 'alta', nota: 'oppure l’invito di Ryuji del 3 luglio' } },
};

/** Passo 5: gli inviti dei Confidenti (G-023), con le condizioni con cui possono arrivare nel gioco (G-028). Mai `mishima/…`. */
export const INVITI: ReadonlyArray<{ confidente: string; data: string; apre: string; condizioni: C[]; nota: string }> = [
  { confidente: 'ryuji', data: '05-29', apre: 'harajuku/harajuku-hangout', condizioni: [palazzo('madarame')], nota: '' },
  { confidente: 'ryuji', data: '07-03', apre: 'ichigaya/laghetto-ichigaya', condizioni: [palazzo('kaneshiro'), confidente('kawakami', 1)], nota: '' },
  { confidente: 'akechi', data: '07-29', apre: 'shinagawa/shinagawa-acquario', condizioni: [confidente('ohya', 1)], nota: 'il messaggio arriva la sera del 28 luglio' },
  { confidente: 'makoto', data: '07-30', apre: 'ikebukuro/planetario-ikebukuro', condizioni: [palazzo('futaba'), confidente('yusuke', 1)], nota: 'da rivedere: nel diario la piramide si conclude il 3 agosto (G-028)' },
  { confidente: 'ann', data: '08-06', apre: 'meiji-shrine/meiji-shrine-hangout', condizioni: [palazzo('futaba'), confidente('takemi', 1)], nota: '' },
  { confidente: 'futaba', data: '10-09', apre: 'nakano/nakano-broadway', condizioni: [confidente('iwai', 1)], nota: 'il messaggio arriva la sera dell’8 ottobre' },
];

/** Le colonne di una tabella. */
function colonne(db: AppDatabase, tabella: string): string[] {
  return (db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name);
}

/** Il cestino accetta `richiesta` (come la 115 per luogo e negozio): stesse righe, stessi id, contatore conservato. */
function cestinoConRichieste(db: AppDatabase): number {
  const sql = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'cestino'").get() as { sql: string } | undefined)?.sql;
  if (!sql || sql.includes("'richiesta'")) return 0;
  const sequenza = (db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'cestino'").get() as { seq: number } | undefined)?.seq ?? 0;
  db.exec(`CREATE TABLE cestino_nuovo (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    uid             TEXT NOT NULL UNIQUE,
    tipo            TEXT NOT NULL CHECK (tipo IN ('area', 'voce', 'mappa', 'area-dedalo', 'area-fisica', 'luogo', 'negozio', 'richiesta')),
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
  const contatore = Math.max(sequenza, massimo);
  if (contatore > 0) {
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'cestino'").run();
    db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES ('cestino', ?)").run(contatore);
  }
  return copiate;
}

/** Vuota: NULL, stringa vuota o un elenco senza condizioni. */
function vuota(json: string | null | undefined): boolean {
  if (!json || !json.trim()) return true;
  try { const v: unknown = JSON.parse(json); return Array.isArray(v) && v.length === 0; } catch { return false; }
}

export const migration118: Migration = {
  id: 118,
  name: 'condizioni_uniche',
  up(db) {
    const tabella = (n: string) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(n);
    if (!tabella('quartiere') || !tabella('luogo') || !tabella('confidente')) return;
    const t = new Date().toISOString();
    /** Il registro delle righe esistenti cambiate, con prima e dopo (R6-20, R6-21). */
    const cambi: string[] = [];

    // 1. schema
    const cq = colonne(db, 'quartiere');
    if (!cq.includes('condizioni_json')) db.exec('ALTER TABLE quartiere ADD COLUMN condizioni_json TEXT');
    if (!cq.includes('fonte_condizioni_json')) db.exec('ALTER TABLE quartiere ADD COLUMN fonte_condizioni_json TEXT');
    if (!colonne(db, 'luogo').includes('fonte_condizioni_json')) db.exec('ALTER TABLE luogo ADD COLUMN fonte_condizioni_json TEXT');
    if (tabella('dungeon')) {
      const cd = colonne(db, 'dungeon');
      for (const c of ['finestra_dal', 'finestra_al', 'lettera_entro']) if (!cd.includes(c)) db.exec(`ALTER TABLE dungeon ADD COLUMN ${c} TEXT`);
    }
    db.exec(`CREATE TABLE IF NOT EXISTS confidente_invito (
      chiave            TEXT PRIMARY KEY,
      confidente_chiave TEXT NOT NULL REFERENCES confidente(chiave) ON DELETE CASCADE,
      data              TEXT,
      apre_tipo         TEXT NOT NULL CHECK (apre_tipo IN ('quartiere', 'luogo', 'area')),
      apre_chiave       TEXT NOT NULL,
      condizioni_json   TEXT,
      nota              TEXT NOT NULL DEFAULT '',
      fonte             TEXT NOT NULL,
      origine           TEXT NOT NULL DEFAULT 'seed',
      seed_json         TEXT,
      updated_at        TEXT NOT NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS confidente_invito_confidente ON confidente_invito (confidente_chiave)');
    db.exec('CREATE INDEX IF NOT EXISTS confidente_invito_apre ON confidente_invito (apre_tipo, apre_chiave)');
    const cestino = tabella('cestino') ? cestinoConRichieste(db) : 0;

    // 2. quartieri (solo dove la condizione manca)
    const scriviQuartiere = db.prepare('UPDATE quartiere SET condizioni_json = ?, fonte_condizioni_json = ? WHERE chiave = ? AND condizioni_json IS NULL');
    let quartieri = 0;
    for (const [chiave, q] of Object.entries(QUARTIERI)) quartieri += scriviQuartiere.run(JSON.stringify(q.condizioni), JSON.stringify(q.fonte), chiave).changes;

    // 3. `sblocco-luoghi` nei luoghi senza condizione (copia identica: l'esito non cambia)
    const leggiLuogo = db.prepare('SELECT condizioni_json FROM luogo WHERE chiave = ?');
    const scriviLuogo = db.prepare('UPDATE luogo SET condizioni_json = ?, updated_at = ? WHERE chiave = ?');
    let copiate = 0;
    if (tabella('dati_guida')) {
      const riga = db.prepare("SELECT json FROM dati_guida WHERE chiave = 'sblocco-luoghi'").get() as { json: string } | undefined;
      let regole: Array<{ chiave: string; condizioni: unknown[] }>;
      try { regole = riga ? ((JSON.parse(riga.json) as { luoghi?: Array<{ chiave: string; condizioni: unknown[] }> }).luoghi ?? []) : []; } catch { regole = []; }
      for (const r of regole) {
        const l = leggiLuogo.get(r.chiave) as { condizioni_json: string | null } | undefined;
        if (!l || !vuota(l.condizioni_json) || !Array.isArray(r.condizioni) || r.condizioni.length === 0) continue;
        scriviLuogo.run(JSON.stringify(r.condizioni), t, r.chiave);
        cambi.push(`luogo ${r.chiave}: ${l.condizioni_json ?? 'NULL'} → ${JSON.stringify(r.condizioni)} (sblocco-luoghi)`);
        copiate++;
      }
    }

    // 4. luoghi: condizioni nuove dove mancano, e le 7 riscritte se ancora com'erano
    const scriviFonte = db.prepare('UPDATE luogo SET fonte_condizioni_json = ? WHERE chiave = ? AND fonte_condizioni_json IS NULL');
    let luoghi = 0;
    for (const [chiave, l] of Object.entries(LUOGHI)) {
      const r = leggiLuogo.get(chiave) as { condizioni_json: string | null } | undefined;
      if (!r || !vuota(r.condizioni_json)) continue;
      scriviLuogo.run(JSON.stringify(l.condizioni), t, chiave);
      scriviFonte.run(JSON.stringify(l.fonte), chiave);
      cambi.push(`luogo ${chiave}: ${r.condizioni_json ?? 'NULL'} → ${JSON.stringify(l.condizioni)}`);
      luoghi++;
    }
    let riscritte = 0;
    for (const [chiave, l] of Object.entries(RISCRITTE)) {
      const r = leggiLuogo.get(chiave) as { condizioni_json: string | null } | undefined;
      if (!r || r.condizioni_json !== JSON.stringify(l.prima)) continue;
      scriviLuogo.run(JSON.stringify(l.dopo), t, chiave);
      scriviFonte.run(JSON.stringify(l.fonte), chiave);
      cambi.push(`luogo ${chiave}: ${r.condizioni_json} → ${JSON.stringify(l.dopo)}`);
      riscritte++;
    }

    // 5. inviti (solo se il Confidente e il posto ci sono)
    const insInvito = db.prepare(`INSERT OR IGNORE INTO confidente_invito (chiave, confidente_chiave, data, apre_tipo, apre_chiave, condizioni_json, nota, fonte, origine, seed_json, updated_at)
      VALUES (?, ?, ?, 'luogo', ?, ?, ?, 'G-023, G-028', 'seed', ?, ?)`);
    const confidenteEsiste = db.prepare('SELECT 1 FROM confidente WHERE chiave = ?');
    let inviti = 0;
    for (const i of INVITI) {
      if (!confidenteEsiste.get(i.confidente) || !leggiLuogo.get(i.apre)) continue;
      const chiave = `${i.confidente}/${i.data}`;
      const riga = { chiave, confidente: i.confidente, data: i.data, apre_tipo: 'luogo', apre_chiave: i.apre, condizioni: i.condizioni, nota: i.nota };
      inviti += insInvito.run(chiave, i.confidente, i.data, i.apre, JSON.stringify(i.condizioni), i.nota, JSON.stringify(riga), t).changes;
    }

    // 6. requisiti dei Confidenti e Clinica
    let requisiti = 0;
    if (tabella('confidente_requisito')) {
      const aggiorna = db.prepare('UPDATE confidente_requisito SET dati_json = ? WHERE confidente_chiave = ? AND rango = ? AND indice = ? AND dati_json = ?');
      const righe = db.prepare("SELECT confidente_chiave AS c, rango, indice, tipo, dati_json FROM confidente_requisito WHERE tipo IN ('richiesta', 'persona-abilita', 'data')")
        .all() as Array<{ c: string; rango: number; indice: number; tipo: string; dati_json: string }>;
      const unica = <T>(sql: string, valore: string): T | null => { const r = db.prepare(sql).all(valore) as T[]; return r.length === 1 ? r[0] : null; };
      for (const r of righe) {
        let dati: Record<string, unknown>;
        try { dati = JSON.parse(r.dati_json) as Record<string, unknown>; } catch { continue; }
        let nuovo: Record<string, unknown> | null = null;
        if (r.tipo === 'richiesta' && typeof dati.richiesta === 'string' && tabella('richiesta')
          && !db.prepare('SELECT 1 FROM richiesta WHERE chiave = ?').get(dati.richiesta)) {
          const k = unica<{ chiave: string }>('SELECT chiave FROM richiesta WHERE nome = ?', dati.richiesta);
          if (k) nuovo = { ...dati, richiesta: k.chiave };
        } else if (r.tipo === 'persona-abilita' && typeof dati.persona === 'string' && typeof dati.abilita === 'string'
          && tabella('persona') && tabella('skill') && !/^\d+$/.test(dati.persona)) {
          const p = unica<{ id: number }>('SELECT id FROM persona WHERE nome = ?', dati.persona);
          const s = unica<{ id: number }>('SELECT id FROM skill WHERE nome = ?', dati.abilita);
          if (p && s) nuovo = { ...dati, persona: String(p.id), abilita: String(s.id) };
        } else if (r.tipo === 'data' && r.rango === 1 && r.c === 'takemi' && dati.dal === '04-15') {
          nuovo = { ...dati, dal: '04-18' };
        } else if (r.tipo === 'data' && r.rango === 1 && r.c === 'ohya' && dati.dal === '06-18') {
          nuovo = { ...dati, dal: '07-05' };
        }
        if (!nuovo) continue;
        const json = JSON.stringify(nuovo);
        requisiti += aggiorna.run(json, r.c, r.rango, r.indice, r.dati_json).changes;
        cambi.push(`requisito ${r.c} R${r.rango}#${r.indice}: ${r.dati_json} → ${json}`);
      }
    }
    let articoli = 0;
    if (tabella('articolo')) {
      const prima = JSON.stringify(data('04-15'));
      const righe = db.prepare("SELECT chiave, condizioni_json FROM articolo WHERE negozio_chiave = 'clinica-takemi' AND condizioni_json IS NOT NULL").all() as Array<{ chiave: string; condizioni_json: string }>;
      const scrivi = db.prepare('UPDATE articolo SET condizioni_json = ?, updated_at = ? WHERE chiave = ? AND condizioni_json = ?');
      for (const a of righe) {
        let c: unknown[];
        try { c = JSON.parse(a.condizioni_json) as unknown[]; } catch { continue; }
        if (!Array.isArray(c) || !c.some((x) => JSON.stringify(x) === prima)) continue;
        const dopo = JSON.stringify(c.map((x) => (JSON.stringify(x) === prima ? data('04-16') : x)));
        articoli += scrivi.run(dopo, t, a.chiave, a.condizioni_json).changes;
        cambi.push(`articolo ${a.chiave}: ${a.condizioni_json} → ${dopo}`);
      }
    }

    // 7. finestre dei Palazzi nelle colonne (solo dove mancano)
    let finestre = 0;
    if (tabella('dungeon') && tabella('dati_guida')) {
      const riga = db.prepare("SELECT json FROM dati_guida WHERE chiave = 'finestre-dungeon'").get() as { json: string } | undefined;
      let elenco: Array<{ dungeon: string; dal?: string | null; al?: string | null }> = [];
      try { elenco = riga ? ((JSON.parse(riga.json) as { finestre?: typeof elenco }).finestre ?? []) : []; } catch { elenco = []; }
      const scrivi = db.prepare('UPDATE dungeon SET finestra_dal = ?, finestra_al = ? WHERE chiave = ? AND finestra_dal IS NULL');
      for (const f of elenco) if (f.dal) finestre += scrivi.run(f.dal, f.al ?? null, f.dungeon).changes;
      db.prepare("UPDATE dungeon SET lettera_entro = '06-02' WHERE chiave = 'madarame' AND lettera_entro IS NULL").run();
    }

    logger.info({ quartieri, copiate, luoghi, riscritte, inviti, requisiti, articoli, finestre, cestino }, '[migration118] condizioni uniche');
    for (const c of cambi) logger.info(`[migration118] ${c}`);
  },
};
