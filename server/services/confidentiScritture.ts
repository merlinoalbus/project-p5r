// ============================================================
// confidentiScritture — gli editor dei Confidenti: ranghi, abilità, Dote a ogni incontro e dialoghi, ciascuno con «Ripristina» (L9 R9-07/1-4)
// ============================================================
//
// Ogni modifica conserva, alla prima volta, com'era la riga nella guida (una fotografia in `dati_guida`, chiave `confidente-seed-v1:<tabella>:<id>`);
// «Ripristina» rimette la fotografia e la toglie. Una riga mai modificata non ha fotografia e «Ripristina» risponde 409. I dati sono di gioco: valgono per
// tutte le partite. Gli editor di regali e inviti (R9-07/5, R9-07c) stanno altrove.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';

import { MODI_RANGO, type AbilitaRangoDto, type DialogoModificatoDto, type ModoRango, type RangoConfidenteDto, type SceltaDialogo } from '../../shared/confidentiScritture.js';
export { MODI_RANGO };

const chiaveFotografia = (tabella: string, id: string): string => `confidente-seed-v1:${tabella}:${id}`;
function fotografa(tabella: string, id: string, valore: unknown): void {
  prepared('INSERT OR IGNORE INTO dati_guida (chiave, json) VALUES (?, ?)').run(chiaveFotografia(tabella, id), JSON.stringify(valore));
}
function leggiFotografia<T>(tabella: string, id: string): T | null {
  const r = prepared('SELECT json FROM dati_guida WHERE chiave = ?').get(chiaveFotografia(tabella, id)) as { json: string } | undefined;
  if (!r) return null;
  try { return JSON.parse(r.json) as T; } catch { throw httpErrors.conflict('confidente-fotografia-illeggibile', 'La fotografia della guida non è leggibile: la riga resta com’è.'); }
}
const togliFotografia = (tabella: string, id: string): void => { prepared('DELETE FROM dati_guida WHERE chiave = ?').run(chiaveFotografia(tabella, id)); };
const haFotografia = (tabella: string, id: string): boolean => !!prepared('SELECT 1 FROM dati_guida WHERE chiave = ?').get(chiaveFotografia(tabella, id));

function esisteConfidente(chiave: string): void {
  if (!prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(chiave)) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${chiave}' non esiste.`);
}

// ---- Ranghi: modo di avanzamento e soglia (R9-07/1) ----

interface RigaRango { rango: number; modo: string; punti_necessari: number; fonte: string | null }

export function ranghiDelConfidente(chiave: string): RangoConfidenteDto[] {
  esisteConfidente(chiave);
  return (prepared('SELECT rango, modo, punti_necessari, fonte FROM confidente_rango WHERE confidente_chiave = ? ORDER BY rango').all(chiave) as RigaRango[])
    .map((r) => ({ rango: r.rango, modo: r.modo as ModoRango, puntiNecessari: r.punti_necessari, fonte: r.fonte, modificato: haFotografia('rango', `${chiave}:${r.rango}`) }));
}

/** Cambia il modo e la soglia di un rango. Un rango «a punti» ha una soglia > 0; gli altri modi non hanno soglia (0), come in G-020. */
export function impostaRango(chiave: string, rango: number, dati: { modo: ModoRango; puntiNecessari: number }): RangoConfidenteDto[] {
  esisteConfidente(chiave);
  const r = prepared('SELECT rango, modo, punti_necessari, fonte FROM confidente_rango WHERE confidente_chiave = ? AND rango = ?').get(chiave, rango) as RigaRango | undefined;
  if (!r) throw httpErrors.notFound('rango-non-trovato', `Il rango ${rango} di '${chiave}' non esiste.`);
  if (!MODI_RANGO.includes(dati.modo)) throw httpErrors.badRequest('modo-non-valido', `Il modo '${dati.modo}' non esiste.`);
  if (!Number.isInteger(dati.puntiNecessari) || dati.puntiNecessari < 0) throw httpErrors.badRequest('soglia-non-valida', 'La soglia è un numero intero di punti, zero o più.');
  if (dati.modo === 'punti' ? dati.puntiNecessari <= 0 : dati.puntiNecessari !== 0) {
    throw httpErrors.badRequest('soglia-incoerente', dati.modo === 'punti' ? 'Un rango a punti ha una soglia maggiore di zero.' : 'Un rango che non sale a punti ha soglia zero.');
  }
  if (dati.modo === r.modo && dati.puntiNecessari === r.punti_necessari) return ranghiDelConfidente(chiave);
  getDb().transaction(() => {
    fotografa('rango', `${chiave}:${rango}`, { modo: r.modo, punti_necessari: r.punti_necessari, fonte: r.fonte });
    prepared("UPDATE confidente_rango SET modo = ?, punti_necessari = ?, fonte = 'utente' WHERE confidente_chiave = ? AND rango = ?").run(dati.modo, dati.puntiNecessari, chiave, rango);
  })();
  invalidaCacheDiGioco();
  return ranghiDelConfidente(chiave);
}

export function ripristinaRango(chiave: string, rango: number): RangoConfidenteDto[] {
  esisteConfidente(chiave);
  const f = leggiFotografia<{ modo: string; punti_necessari: number; fonte: string | null }>('rango', `${chiave}:${rango}`);
  if (!f) throw httpErrors.conflict('rango-della-guida', 'Questo rango non è stato modificato: è già come lo dà la guida.');
  getDb().transaction(() => {
    prepared('UPDATE confidente_rango SET modo = ?, punti_necessari = ?, fonte = ? WHERE confidente_chiave = ? AND rango = ?').run(f.modo, f.punti_necessari, f.fonte, chiave, rango);
    togliFotografia('rango', `${chiave}:${rango}`);
  })();
  invalidaCacheDiGioco();
  return ranghiDelConfidente(chiave);
}

// ---- Abilità per rango (R9-07/2) ----

const abilitaDelRango = (chiave: string, rango: number): Array<{ nome: string; descrizione: string }> =>
  prepared('SELECT nome, descrizione FROM confidente_abilita WHERE confidente_chiave = ? AND rango = ? ORDER BY ordine').all(chiave, rango) as Array<{ nome: string; descrizione: string }>;

export function abilitaDelConfidente(chiave: string): AbilitaRangoDto[] {
  esisteConfidente(chiave);
  const ranghi = new Set([...(prepared('SELECT DISTINCT rango FROM confidente_abilita WHERE confidente_chiave = ?').all(chiave) as Array<{ rango: number }>).map((r) => r.rango),
    ...(prepared("SELECT DISTINCT CAST(substr(chiave, length(?) + 1) AS INTEGER) AS rango FROM dati_guida WHERE chiave LIKE ?").all(`confidente-seed-v1:abilita:${chiave}:`, `confidente-seed-v1:abilita:${chiave}:%`) as Array<{ rango: number }>).map((r) => r.rango)]);
  return [...ranghi].sort((a, b) => a - b).map((rango) => ({ rango, abilita: abilitaDelRango(chiave, rango), modificato: haFotografia('abilita', `${chiave}:${rango}`) }));
}

/** Sostituisce l'elenco delle abilità di un rango (0-20), nell'ordine dato. */
export function impostaAbilita(chiave: string, rango: number, abilita: Array<{ nome: string; descrizione: string }>): AbilitaRangoDto[] {
  esisteConfidente(chiave);
  if (!Number.isInteger(rango) || rango < 1 || rango > 10) throw httpErrors.badRequest('rango-non-valido', 'Il rango va da 1 a 10.');
  const pulite = abilita.map((a) => ({ nome: a.nome.trim(), descrizione: a.descrizione.trim() }));
  if (pulite.length > 20 || pulite.some((a) => a.nome === '')) throw httpErrors.badRequest('abilita-non-valide', 'Fino a 20 abilità, ciascuna con un nome.');
  const prima = abilitaDelRango(chiave, rango);
  if (JSON.stringify(prima) === JSON.stringify(pulite)) return abilitaDelConfidente(chiave);
  getDb().transaction(() => {
    fotografa('abilita', `${chiave}:${rango}`, prima);
    prepared('DELETE FROM confidente_abilita WHERE confidente_chiave = ? AND rango = ?').run(chiave, rango);
    pulite.forEach((a, i) => prepared('INSERT INTO confidente_abilita (confidente_chiave, rango, ordine, nome, descrizione) VALUES (?, ?, ?, ?, ?)').run(chiave, rango, i, a.nome, a.descrizione));
  })();
  invalidaCacheDiGioco();
  return abilitaDelConfidente(chiave);
}

export function ripristinaAbilita(chiave: string, rango: number): AbilitaRangoDto[] {
  esisteConfidente(chiave);
  const f = leggiFotografia<Array<{ nome: string; descrizione: string }>>('abilita', `${chiave}:${rango}`);
  if (!f || !Array.isArray(f)) throw httpErrors.conflict('abilita-della-guida', 'Le abilità di questo rango non sono state modificate: sono già come le dà la guida.');
  getDb().transaction(() => {
    prepared('DELETE FROM confidente_abilita WHERE confidente_chiave = ? AND rango = ?').run(chiave, rango);
    f.forEach((a, i) => prepared('INSERT INTO confidente_abilita (confidente_chiave, rango, ordine, nome, descrizione) VALUES (?, ?, ?, ?, ?)').run(chiave, rango, i, a.nome, a.descrizione));
    togliFotografia('abilita', `${chiave}:${rango}`);
  })();
  invalidaCacheDiGioco();
  return abilitaDelConfidente(chiave);
}

// ---- Dote a ogni incontro: la fotografia alla prima modifica e «Ripristina» (R9-07/3) ----

/** Da chiamare PRIMA di scrivere la Dote di un rango: conserva com'era (una volta sola). Un rango senza riga era «vuoto» (`[]`). */
export function fotografaDoteIncontro(chiave: string, versoRango: number): void {
  const r = prepared('SELECT effetti_json FROM confidente_dote_incontro WHERE confidente_chiave = ? AND verso_rango = ?').get(chiave, versoRango) as { effetti_json: string } | undefined;
  fotografa('dote-incontro', `${chiave}:${versoRango}`, { esisteva: !!r, effetti_json: r?.effetti_json ?? '[]' });
}
export const doteIncontroModificata = (chiave: string, versoRango: number): boolean => haFotografia('dote-incontro', `${chiave}:${versoRango}`);

export function ripristinaDoteIncontro(chiave: string, versoRango: number): void {
  esisteConfidente(chiave);
  const f = leggiFotografia<{ esisteva: boolean; effetti_json: string }>('dote-incontro', `${chiave}:${versoRango}`);
  if (!f) throw httpErrors.conflict('dote-della-guida', 'La Dote di questo passaggio non è stata modificata: è già come la dà la guida.');
  getDb().transaction(() => {
    if (f.esisteva) prepared('UPDATE confidente_dote_incontro SET effetti_json = ? WHERE confidente_chiave = ? AND verso_rango = ?').run(f.effetti_json, chiave, versoRango);
    else prepared('DELETE FROM confidente_dote_incontro WHERE confidente_chiave = ? AND verso_rango = ?').run(chiave, versoRango);
    togliFotografia('dote-incontro', `${chiave}:${versoRango}`);
  })();
  invalidaCacheDiGioco();
}

// ---- Dialoghi: note e scelte con i punti (R9-07/4) ----

interface RigaDialogo { id: number; confidente_chiave: string; note: string; scelte_json: string }

function rigaDialogo(chiave: string, id: number): RigaDialogo {
  const r = prepared('SELECT id, confidente_chiave, note, scelte_json FROM confidente_dialogo WHERE id = ? AND confidente_chiave = ?').get(id, chiave) as RigaDialogo | undefined;
  if (!r) throw httpErrors.notFound('dialogo-non-trovato', `Il dialogo ${id} non è di '${chiave}'.`);
  return r;
}
function comeDto(r: RigaDialogo): DialogoModificatoDto {
  let scelte: SceltaDialogo[] = [];
  try { const v = JSON.parse(r.scelte_json) as unknown; if (Array.isArray(v)) scelte = v as SceltaDialogo[]; } catch { /* scelte illeggibili: nessuna */ }
  return { id: r.id, note: r.note, scelte, modificato: haFotografia('dialogo', String(r.id)) };
}

/** Cambia le note e/o le scelte (testo, punti, romantica, avviso) di un dialogo; le scelte si rinumerano da 1 nell'ordine dato. */
export function impostaDialogo(chiave: string, id: number, dati: { note?: string; scelte?: Array<Omit<SceltaDialogo, 'ordine'>> }): DialogoModificatoDto {
  esisteConfidente(chiave);
  const r = rigaDialogo(chiave, id);
  const scelte = dati.scelte?.map((s, i): SceltaDialogo => ({ ordine: i + 1, testo: s.testo.trim(), punti: s.punti, puntiTesto: s.puntiTesto, romantica: s.romantica, avviso: s.avviso }));
  if (scelte && (scelte.length > 40 || scelte.some((s) => s.testo === '' || (s.punti !== null && (!Number.isFinite(s.punti) || s.punti < 0 || s.punti > 100))))) {
    throw httpErrors.badRequest('scelte-non-valide', 'Fino a 40 scelte, ciascuna con un testo e punti da 0 a 100 (o nessuno).');
  }
  const note = dati.note ?? r.note;
  const scelteJson = scelte ? JSON.stringify(scelte) : r.scelte_json;
  if (note === r.note && scelteJson === r.scelte_json) return comeDto(r);
  getDb().transaction(() => {
    fotografa('dialogo', String(id), { note: r.note, scelte_json: r.scelte_json });
    prepared('UPDATE confidente_dialogo SET note = ?, scelte_json = ? WHERE id = ?').run(note, scelteJson, id);
  })();
  invalidaCacheDiGioco();
  return comeDto(rigaDialogo(chiave, id));
}

export function ripristinaDialogo(chiave: string, id: number): DialogoModificatoDto {
  esisteConfidente(chiave);
  rigaDialogo(chiave, id);
  const f = leggiFotografia<{ note: string; scelte_json: string }>('dialogo', String(id));
  if (!f) throw httpErrors.conflict('dialogo-della-guida', 'Questo dialogo non è stato modificato: è già come lo dà la guida.');
  getDb().transaction(() => {
    prepared('UPDATE confidente_dialogo SET note = ?, scelte_json = ? WHERE id = ?').run(f.note, f.scelte_json, id);
    togliFotografia('dialogo', String(id));
  })();
  invalidaCacheDiGioco();
  return comeDto(rigaDialogo(chiave, id));
}
