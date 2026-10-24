// ============================================================
// 209 — le Ombre si correggono e si ripristinano (L11 · R11-15/4)
// ============================================================
//
// `ombra` ha dalla 166 le colonne `origine`, `seed_json` e `updated_at`, ma `seed_json` conteneva la fotografia di nascita di ogni riga in una forma
// propria (`personaId`, `affinitaProprie` come oggetto, `catturabile` e `negoziabile` numerici). Il servizio unico di correzione (`ripristinoService`,
// registro `righeOmbra.ts`) legge `seed_json` come «il valore della guida preso alla prima correzione», e `NULL` quando l'Ombra non è corretta: la
// stessa convenzione di quartieri, trofei ed esami. Qui la fotografia di nascita passa alla forma del registro:
//   - riga uguale alla sua fotografia (tutte, finora: nessuno poteva correggere un'Ombra) → `seed_json = NULL`, `origine = 'seed'`;
//   - riga diversa dalla sua fotografia (se mai ce ne fosse una) → `seed_json` = la fotografia nella forma nuova, `origine = 'utente'`: è una correzione
//     vera e «Ripristina» la rimette com'era. Niente si perde.
// Le colonne dell'Ombra (nome, personalità, livello, affinità…) non cambiano mai: la migrazione controlla che l'impronta di ogni colonna diversa da
// `origine`, `seed_json` e `updated_at` sia identica prima e dopo, e che le tabelle collegate (`ombra_luogo`, `ombra_voce`) non cambino.
// Idempotente: una fotografia già nella forma nuova (o assente) non si tocca. Scrive solo in `main`; ogni anomalia lancia prima di cambiare qualcosa.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';

const errore = (motivo: string): never => { throw new Error(`209: ${motivo}; nessuna modifica applicata.`); };

/** I dieci elementi con un'affinità e i sei esiti, come nel registro (copia: una migrazione non cambia con il codice). */
const ELEMENTI = ['phys', 'gun', 'fire', 'ice', 'electric', 'wind', 'psy', 'nuclear', 'bless', 'curse'] as const;
const CODICI = ['wk', 'rs', 'nu', 'rp', 'ab', '-'] as const;

interface RigaOmbra {
  chiave: string; nome: string; nomi_altri_json: string; maschera_nota: string | null; personalita: string; catturabile: number; negoziabile: number | null;
  affinita_proprie_json: string | null; livello: number | null; note: string; origine: string; seed_json: string | null;
}
type Forma = Record<string, unknown>;

const proprie = (v: unknown): Record<string, string> => {
  const fuori: Record<string, string> = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k, c] of Object.entries(v as Record<string, unknown>)) if ((ELEMENTI as readonly string[]).includes(k) && (CODICI as readonly unknown[]).includes(c)) fuori[k] = c as string;
  return fuori;
};
const json = (t: string | null): unknown => { try { return t === null ? null : JSON.parse(t); } catch { return null; } };

/** I valori di una riga nella forma del registro (`leggi` di righeOmbra). */
function formaDaRiga(r: RigaOmbra): Forma {
  const nomi = json(r.nomi_altri_json);
  const p = proprie(json(r.affinita_proprie_json));
  const f: Forma = {
    nome: r.nome, nomiAltri: Array.isArray(nomi) ? nomi.filter((x) => typeof x === 'string') : [], macheraNota: r.maschera_nota, personalita: r.personalita,
    catturabile: r.catturabile === 1, negoziabile: r.negoziabile === null ? '' : String(r.negoziabile), livello: r.livello, note: r.note === '' ? null : r.note,
  };
  for (const el of ELEMENTI) f[`affinita/${el}`] = p[el] ?? '';
  return f;
}

/** La fotografia di nascita (forma della 166/173) nella forma del registro; un valore che la fotografia non ha è quello della riga (non inventa differenze). */
function formaDaFotografia(s: Forma, riga: Forma): Forma {
  const f: Forma = { ...riga };
  if (typeof s.nome === 'string') f.nome = s.nome;
  if (Array.isArray(s.nomiAltri)) f.nomiAltri = s.nomiAltri.filter((x) => typeof x === 'string');
  if ('macheraNota' in s) f.macheraNota = typeof s.macheraNota === 'string' ? s.macheraNota : null;
  if (typeof s.personalita === 'string') f.personalita = s.personalita;
  if ('catturabile' in s) f.catturabile = s.catturabile === 1 || s.catturabile === true;
  if ('negoziabile' in s) f.negoziabile = s.negoziabile === null || s.negoziabile === undefined ? '' : (s.negoziabile === true || s.negoziabile === 1 ? '1' : '0');
  if ('livello' in s) f.livello = typeof s.livello === 'number' ? s.livello : null;
  if ('note' in s) f.note = typeof s.note === 'string' && s.note !== '' ? s.note : null;
  if ('affinitaProprie' in s) {
    const p = proprie(s.affinitaProprie);
    for (const el of ELEMENTI) f[`affinita/${el}`] = p[el] ?? '';
  }
  return f;
}

const uguali = (a: Forma, b: Forma): boolean => JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k]])) === JSON.stringify(Object.keys(b).sort().map((k) => [k, b[k]]));
const eVecchia = (s: unknown): s is Forma => !!s && typeof s === 'object' && !Array.isArray(s) && ('personaId' in s || 'affinitaProprie' in s);

export const migration209: Migration = {
  id: 209, name: 'ombra_correggibile',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'ombra')) return;
    for (const c of ['origine', 'seed_json', 'updated_at']) if (!haColonna(db, 'ombra', c)) errore(`manca la colonna ombra.${c}`);

    const righe = db.prepare('SELECT chiave, nome, nomi_altri_json, maschera_nota, personalita, catturabile, negoziabile, affinita_proprie_json, livello, note, origine, seed_json FROM main.ombra').all() as RigaOmbra[];
    const vecchie = righe.filter((r) => r.seed_json !== null && eVecchia(json(r.seed_json)));
    if (vecchie.length === 0) return;

    const impronta = improntaTabella(db, 'ombra', ['origine', 'seed_json', 'updated_at']);
    const collegate = new Map<string, string>();
    for (const t of ['ombra_luogo', 'ombra_voce']) if (esisteTabella(db, t)) collegate.set(t, improntaTabella(db, t));

    const azzera = db.prepare("UPDATE main.ombra SET origine = 'seed', seed_json = NULL WHERE chiave = ?");
    const correggi = db.prepare("UPDATE main.ombra SET origine = 'utente', seed_json = ? WHERE chiave = ?");
    let uguale = 0;
    let diverse = 0;
    for (const r of vecchie) {
      const adesso = formaDaRiga(r);
      const guida = formaDaFotografia(json(r.seed_json) as Forma, adesso);
      if (uguali(adesso, guida)) { azzera.run(r.chiave); uguale++; } else { correggi.run(JSON.stringify(guida), r.chiave); diverse++; }
    }

    if (improntaTabella(db, 'ombra', ['origine', 'seed_json', 'updated_at']) !== impronta) errore('le colonne dell\'Ombra sono cambiate');
    for (const [t, i] of collegate) if (improntaTabella(db, t) !== i) errore(`la tabella ${t} è cambiata`);
    const restano = (db.prepare('SELECT chiave, seed_json FROM main.ombra WHERE seed_json IS NOT NULL').all() as Array<{ chiave: string; seed_json: string }>).filter((r) => eVecchia(json(r.seed_json))).length;
    if (restano !== 0) errore(`${restano} fotografie sono rimaste nella forma di prima`);
    logger.info({ migrazione: 'L11-R11-15-4-209', ombre: righe.length, fotografieAzzerate: uguale, correzioniConservate: diverse }, 'ombra: fotografia di nascita portata alla forma del registro');
  },
};
