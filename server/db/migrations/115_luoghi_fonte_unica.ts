// ============================================================
// 115 — M5 di L5 «Luoghi, negozi, orari»: il luogo diventa la fonte (lotti/L5/modifiche.md §1)
// ============================================================
//
// Il luogo è la fonte; le copie si smettono di leggere, non si cancellano (L11). Nessun pin cambia posizione, planimetria, condizioni,
// nome o descrizione; nessun pin dell'utente cambia riferimento; nessun luogo nuovo; acquisti, punti, diario e Palazzi non toccati.
// Passi, in una transazione (il runner), con le regole scritte qui (una migrazione non segue il codice che cambia):
//   1. schema: `luogo.area_chiave` (Area di L2), `luogo.orari_json` (NULL = regola dell'app «giorno e sera», R5-12c), `negozio.eccezione_orari_json`
//      (l'orario del solo negozio quando la guida lo distingue), `luogo.solo_eventi_confidente` (R5-20f); il cestino accetta `luogo` e `negozio`
//      (la tabella si ricrea con le stesse righe, gli stessi id e il contatore, come nella 109);
//   2. luogo → Area: l'Area della planimetria su cui sta il pin del luogo (riferimento `luogo`) o della planimetria legata dalla regola 054
//      (`mappa_entita` tipo `luogo`), solo se è una sola (sui dati di riferimento 42); gli altri restano «da collocare»;
//   3. orari sul luogo: dal luogo (`quando`, `giorni_json`); dove il luogo è vuoto, dai negozi della sede con orari concordi; dove è ancora
//      vuoto, le conferme della guida di G-029; i luoghi i cui orari sono di un Confidente, di un lavoro o di un articolo (G-033, Untouchable,
//      Chiesa di Kanda) passano alla regola dell'app (o all'orario scolastico «giorno»), e le colonne di oggi restano per L9 (fino a L11);
//   4. eccezioni d'orario del negozio (G-011/012/013/015): Chiesa di Kanda la domenica, Super Muramasa e Mran Mran di giorno, Fioraio Sukebe
//      di sera; il Leblanc no (caffè e curry la sera sono un'attività, L9);
//   5. sede di `prossimo-asso` (il luogo esiste e lo cita);
//   6. gli 11 pin seed omonimi sulle illustrazioni dei quartieri senza Aree prendono il riferimento al luogo dello stesso nome e quartiere;
//   7. Sakura Residence: solo durante gli eventi di Futaba (G-031).
// Ogni passo scrive solo dove il valore manca (o, per il passo 6, dove il pin non ha riferimento): la seconda esecuzione non cambia niente.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

type Giorno = 'lunedi' | 'martedi' | 'mercoledi' | 'giovedi' | 'venerdi' | 'sabato' | 'domenica';
interface Orari { giorni: Giorno[]; fasce: Array<'giorno' | 'sera'>; chiusoConPioggia: boolean; nota: string | null }

const GIORNI: readonly Giorno[] = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];

/**
 * Passo 3, G-033 e requisiti riletti: i luoghi i cui orari di oggi sono di un Confidente, di un lavoro o di un articolo. `null` = regola
 * dell'app (giorno e sera); un orario = quello del luogo (scolastico «giorno»). Le colonne `quando`/`giorni`/`giorni_json` restano (L9, L11).
 */
export const ORARI_NON_DEL_LUOGO: Readonly<Record<string, Orari | null>> = {
  'kanda-jinbocho/chiesa-kanda': null, // giorni di Hifumi (G-013)
  'shibuya/untouchable': null, // giorni e sera di Iwai (G-031, G-032)
  'shinjuku/chihaya-stand': null, // Chihaya
  'shibuya/stazione-piazza-shibuya': null, // Yoshida
  'akihabara/sala-giochi-akihabara': null, // Shinya
  'shibuya/ore-no-beko': null, // il lavoro part-time
  'kichijoji/hagoromo': null, // «domenica sera» è del Katsu a pezzettoni (L7)
  'shujin-academy/cancello-shujin': { giorni: [], fasce: ['giorno'], chiusoConPioggia: false, nota: null }, // orario scolastico (Makoto a L9)
  'shujin-academy/corridoio-2-piano-shujin': { giorni: [], fasce: ['giorno'], chiusoConPioggia: false, nota: null }, // orario scolastico (Kawakami a L9)
};

/** Passo 3, conferme della guida di G-029 (dati.md §10.2): orari da scrivere sul luogo, da unire a quelli già trovati. */
export const ORARI_G029: Readonly<Record<string, Partial<Orari>>> = {
  'yongen-jaya/batting-cage-yongen': { fasce: ['sera'] },
  'shujin-academy/infermeria-shujin': { fasce: ['giorno'], giorni: ['lunedi', 'martedi', 'mercoledi', 'venerdi'] },
  'shujin-academy/negozio-scolastico': { fasce: ['giorno'] },
};

/** Passo 4: i negozi con un orario proprio, diverso da quello del luogo, dichiarato dalla guida. */
export const ECCEZIONI_NEGOZIO: readonly string[] = ['chiesa-kanda', 'super-muramasa', 'mran-mran', 'fioraio-sukebe'];

/** Passo 5: le sedi dedotte (il luogo esiste e cita il negozio). */
export const SEDI_DEDOTTE: Readonly<Record<string, string>> = { 'prossimo-asso': 'shibuya/prossimo-asso' };

/** Passo 6: i pin seed omonimi (id → luogo), sulle illustrazioni dei quartieri senza Aree (dati.md §4). */
export const PIN_OMONIMI: Readonly<Record<number, string>> = {
  221: 'harajuku/harajuku-hangout', 222: 'ueno/museo-ueno', 223: 'inokashira-park/inokashira-hangout', 224: 'odaiba/odaiba-seaside-park',
  225: 'shinagawa/shinagawa-acquario', 227: 'yokohama-chinatown/chinatown-hangout', 228: 'maihama/destinyland', 229: 'roppongi/okumura-foods-hq',
  231: 'meiji-shrine/meiji-shrine-hangout', 233: 'suidobashi/dome-town', 234: 'asakusa/asakusa-hangout',
};

/** Passo 7: i luoghi visitabili solo negli eventi di un Confidente (R5-20f, G-031). */
export const SOLO_EVENTI: Readonly<Record<string, string>> = { 'yongen-jaya/sakura-residence': 'futaba' };

function colonne(db: AppDatabase, tabella: string): string[] {
  return (db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name);
}

function leggiOrari(json: string | null): Orari | null {
  if (!json) return null;
  try {
    const o = JSON.parse(json) as Partial<Orari>;
    const giorni = (Array.isArray(o.giorni) ? o.giorni : []).filter((g): g is Giorno => GIORNI.includes(g as Giorno));
    const fasce = (Array.isArray(o.fasce) ? o.fasce : []).filter((f): f is 'giorno' | 'sera' => f === 'giorno' || f === 'sera');
    return { giorni: giorni.length === 7 ? [] : giorni, fasce: fasce.length === 2 ? [] : fasce, chiusoConPioggia: o.chiusoConPioggia === true, nota: typeof o.nota === 'string' && o.nota.trim() ? o.nota.trim() : null };
  } catch {
    return null;
  }
}

/** Vero se gli orari dicono qualcosa di valutabile (giorni, una sola fascia, pioggia): una nota da sola non è un orario. */
function conValori(o: Orari | null): o is Orari {
  return !!o && (o.giorni.length > 0 || o.fasce.length === 1 || o.chiusoConPioggia);
}

/** La frase dei giorni dice più dei valori? Tolti i nomi dei giorni e i separatori resta del testo (es. «(regolare) e festività»). */
function fraseConQualcosaInPiu(frase: string | null): boolean {
  if (!frase) return false;
  const resto = frase.toLowerCase()
    .replace(/luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica|tutti i giorni/g, '')
    .replace(/[\s,;.()\-–]|\be\b/g, '');
  return resto.length > 0;
}

/** Gli orari del luogo dalle sue colonne di oggi (`quando`, `giorni_json`, la frase `giorni` come nota se dice di più); null se vuote. */
function orariDalLuogo(r: { quando: string | null; giorni: string | null; giorni_json: string | null }): Orari | null {
  let giorni: Giorno[] = [];
  try { giorni = ((JSON.parse(r.giorni_json || '[]') as unknown[]).filter((g) => GIORNI.includes(g as Giorno)) as Giorno[]); } catch { giorni = []; }
  if (!r.quando && giorni.length === 0) return null;
  const fasce: Orari['fasce'] = r.quando === 'giorno' ? ['giorno'] : r.quando === 'sera' ? ['sera'] : [];
  return { giorni: giorni.length === 7 ? [] : GIORNI.filter((g) => giorni.includes(g)), fasce, chiusoConPioggia: false, nota: fraseConQualcosaInPiu(r.giorni) ? r.giorni!.trim() : null };
}

/** Unisce le conferme di G-029 agli orari trovati: le liste date sostituiscono quelle vuote, mai il contrario. */
function unisci(o: Orari | null, g: Partial<Orari>): Orari {
  const base: Orari = o ?? { giorni: [], fasce: [], chiusoConPioggia: false, nota: null };
  return { giorni: g.giorni?.length ? [...g.giorni] : base.giorni, fasce: g.fasce?.length ? [...g.fasce] : base.fasce, chiusoConPioggia: base.chiusoConPioggia || g.chiusoConPioggia === true, nota: base.nota ?? g.nota ?? null };
}

/** Il cestino accetta `luogo` e `negozio` (come la 109 per `area-fisica`): stesse righe, stessi id, contatore conservato. */
function cestinoConLuoghi(db: AppDatabase): number {
  const sql = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'cestino'").get() as { sql: string } | undefined)?.sql;
  if (!sql || sql.includes("'luogo'")) return 0;
  const sequenza = (db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'cestino'").get() as { seq: number } | undefined)?.seq ?? 0;
  db.exec(`CREATE TABLE cestino_nuovo (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    uid             TEXT NOT NULL UNIQUE,
    tipo            TEXT NOT NULL CHECK (tipo IN ('area', 'voce', 'mappa', 'area-dedalo', 'area-fisica', 'luogo', 'negozio')),
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

export const migration115: Migration = {
  id: 115,
  name: 'luoghi_fonte_unica',
  up(db) {
    const tabella = (n: string) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(n);
    if (!tabella('luogo') || !tabella('negozio')) return;
    // 1. schema
    const cl = colonne(db, 'luogo');
    if (!cl.includes('area_chiave')) db.exec(`ALTER TABLE luogo ADD COLUMN area_chiave TEXT${tabella('area') ? ' REFERENCES area(chiave) ON DELETE SET NULL' : ''}`);
    if (!cl.includes('orari_json')) db.exec('ALTER TABLE luogo ADD COLUMN orari_json TEXT');
    if (!cl.includes('solo_eventi_confidente')) db.exec(`ALTER TABLE luogo ADD COLUMN solo_eventi_confidente TEXT${tabella('confidente') ? ' REFERENCES confidente(chiave) ON DELETE SET NULL' : ''}`);
    if (!colonne(db, 'negozio').includes('eccezione_orari_json')) db.exec('ALTER TABLE negozio ADD COLUMN eccezione_orari_json TEXT');
    db.exec('CREATE INDEX IF NOT EXISTS luogo_area ON luogo (area_chiave)');
    const cestino = tabella('cestino') ? cestinoConLuoghi(db) : 0;

    // 2. luogo → Area, dove manca e l'Area è una sola
    let conArea = 0;
    if (tabella('area') && colonne(db, 'mappa').includes('area_chiave')) {
      const legami = db.prepare(`SELECT l.chiave, m.area_chiave AS area FROM luogo l JOIN spillo s ON s.riferimento_tipo = 'luogo' AND s.riferimento_chiave = l.chiave
          JOIN mappa m ON m.chiave = s.mappa_chiave WHERE m.area_chiave IS NOT NULL
        ${tabella('mappa_entita') ? `UNION SELECT l.chiave, m.area_chiave FROM luogo l JOIN mappa_entita me ON me.entita_tipo = 'luogo' AND me.entita_chiave = l.chiave
          JOIN mappa m ON m.chiave = me.mappa_chiave WHERE m.area_chiave IS NOT NULL` : ''}`).all() as Array<{ chiave: string; area: string }>;
      const aree = new Map<string, Set<string>>();
      for (const r of legami) (aree.get(r.chiave) ?? aree.set(r.chiave, new Set()).get(r.chiave)!).add(r.area);
      const scrivi = db.prepare('UPDATE luogo SET area_chiave = ? WHERE chiave = ? AND area_chiave IS NULL');
      for (const [luogo, insieme] of aree) if (insieme.size === 1) conArea += scrivi.run([...insieme][0], luogo).changes;
    }

    // 3. orari sul luogo, solo dove `orari_json` manca
    let orari = 0;
    const scriviOrari = db.prepare('UPDATE luogo SET orari_json = ? WHERE chiave = ? AND orari_json IS NULL');
    const luoghi = db.prepare('SELECT chiave, quando, giorni, giorni_json, orari_json FROM luogo ORDER BY chiave').all() as Array<{ chiave: string; quando: string | null; giorni: string | null; giorni_json: string | null; orari_json: string | null }>;
    const negoziDellaSede = db.prepare('SELECT orari_json FROM negozio WHERE sede_chiave = ?');
    for (const l of luoghi) {
      if (l.orari_json !== null) continue;
      let o: Orari | null;
      if (l.chiave in ORARI_NON_DEL_LUOGO) {
        o = ORARI_NON_DEL_LUOGO[l.chiave];
      } else {
        o = orariDalLuogo(l);
        if (!o) {
          // dai negozi della sede, se tutti dicono la stessa cosa
          const tutti = (negoziDellaSede.all(l.chiave) as Array<{ orari_json: string | null }>).map((n) => leggiOrari(n.orari_json));
          const valori = tutti.filter(conValori);
          if (valori.length > 0 && valori.length === tutti.length && valori.every((x) => JSON.stringify(x) === JSON.stringify(valori[0]))) o = valori[0];
        }
        if (l.chiave in ORARI_G029) o = unisci(o, ORARI_G029[l.chiave]);
      }
      if (o) orari += scriviOrari.run(JSON.stringify(o), l.chiave).changes;
    }

    // 4. eccezioni d'orario del negozio, dal suo `orari_json` (il dato della guida)
    let eccezioni = 0;
    const scriviEccezione = db.prepare('UPDATE negozio SET eccezione_orari_json = ? WHERE chiave = ? AND eccezione_orari_json IS NULL');
    for (const k of ECCEZIONI_NEGOZIO) {
      const o = leggiOrari((db.prepare('SELECT orari_json FROM negozio WHERE chiave = ?').get(k) as { orari_json: string | null } | undefined)?.orari_json ?? null);
      if (conValori(o)) eccezioni += scriviEccezione.run(JSON.stringify(o), k).changes;
    }

    // 5. sedi dedotte
    let sedi = 0;
    for (const [negozio, sede] of Object.entries(SEDI_DEDOTTE)) {
      if (db.prepare('SELECT 1 FROM luogo WHERE chiave = ?').get(sede)) sedi += db.prepare('UPDATE negozio SET sede_chiave = ? WHERE chiave = ? AND sede_chiave IS NULL').run(sede, negozio).changes;
    }

    // 6. pin seed omonimi → luogo (solo pin seed senza riferimento, sul quartiere del luogo, con lo stesso nome)
    let pin = 0;
    for (const [id, luogo] of Object.entries(PIN_OMONIMI)) {
      const s = db.prepare('SELECT mappa_chiave, nome, riferimento_tipo, origine FROM spillo WHERE id = ?').get(Number(id)) as { mappa_chiave: string | null; nome: string; riferimento_tipo: string | null; origine: string } | undefined;
      const l = db.prepare('SELECT quartiere_chiave, nome FROM luogo WHERE chiave = ?').get(luogo) as { quartiere_chiave: string; nome: string } | undefined;
      if (!s || !l || s.riferimento_tipo !== null || s.origine !== 'seed' || s.nome !== l.nome || s.mappa_chiave !== `citta-${l.quartiere_chiave}`) continue;
      pin += db.prepare("UPDATE spillo SET riferimento_tipo = 'luogo', riferimento_chiave = ? WHERE id = ? AND riferimento_tipo IS NULL").run(luogo, Number(id)).changes;
    }

    // 7. luoghi solo per gli eventi di un Confidente
    let soloEventi = 0;
    for (const [luogo, confidente] of Object.entries(SOLO_EVENTI)) {
      if (tabella('confidente') && !db.prepare('SELECT 1 FROM confidente WHERE chiave = ?').get(confidente)) continue;
      soloEventi += db.prepare('UPDATE luogo SET solo_eventi_confidente = ? WHERE chiave = ? AND solo_eventi_confidente IS NULL').run(confidente, luogo).changes;
    }

    const conta = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
    logger.info({
      cestino, conArea, orari, eccezioni, sedi, pin, soloEventi,
      luoghi: conta('SELECT COUNT(*) AS n FROM luogo'), luoghiConArea: conta('SELECT COUNT(*) AS n FROM luogo WHERE area_chiave IS NOT NULL'),
      luoghiConOrari: conta('SELECT COUNT(*) AS n FROM luogo WHERE orari_json IS NOT NULL'), negoziConSede: conta('SELECT COUNT(*) AS n FROM negozio WHERE sede_chiave IS NOT NULL'),
      pinDiLuogo: conta("SELECT COUNT(*) AS n FROM spillo WHERE riferimento_tipo = 'luogo'"),
    }, 'migrazione 115: il luogo diventa la fonte (L5)');
  },
};
