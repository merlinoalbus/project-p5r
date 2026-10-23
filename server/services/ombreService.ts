// ============================================================
// ombreService — l'entità Ombra: elenco, scheda e verifica (L8, B4 e B8; sola lettura)
// ============================================================
//
// La Persona resta l'identità (compendio); l'Ombra ha chiave stabile, nome italiano, Persona (o nessuna: non reclutabile), personalità e
// luoghi d'incontro. Le debolezze si leggono dalle affinità della Persona (`persona_affinita`, vocabolario di `shared/elementi.ts`); solo le
// 4 Ombre con affinità diverse dalla Persona (G-019) e le 5 non reclutabili ne hanno di proprie, una sola copia, sull'Ombra.
// Dove si incontra: `ombra_luogo` (Battaglia e voci dei Palazzi) più la vista `ombra_luogo_dedalo` (aree dei dedali, da `persona_area_dedalo`),
// uniti per posto: nessuna fonte vince sulle altre.
// B8: l'elenco porta già debolezze, resistenze, luoghi e (con la partita) se la Persona è registrata: la Battaglia, la scheda Persona e la
// pagina Ombra leggono tutte da qui, nessuna ha una copia propria. R8-15b: con la partita ogni incontro dice se è ancora raggiungibile.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { mappaAmbito } from './traduzioniService.js';
import { affinitaDi, codiciAffinita } from './compendioService.js';
import { verificaPartita } from './verificaPartita.js';
import { personeRegistrate } from './catturePersona.js';
import { statoPalazzi } from './palazziService.js';
import { normalizza } from '../../shared/maschere.js';
import { eCodiceAffinita, eChiaveElemento, ELEMENTI, PERSONALITA_OMBRA, type PersonalitaOmbra } from '../../shared/elementi.js';
import type { OmbraDettaglioDto, OmbraLuogoDto, OmbraRaggiungibilitaDto, OmbraResistenzaDto, OmbraSchedaDto, OmbreVerificaDto } from '../../shared/ombre.js';

interface RigaOmbra {
  chiave: string; nome: string; nomi_altri_json: string; persona_id: number | null; maschera_nota: string | null; personalita: string;
  catturabile: number; negoziabile: number | null; affinita_proprie_json: string | null; livello: number | null; note: string; origine: 'seed' | 'utente';
}

const COLONNE = 'chiave, nome, nomi_altri_json, persona_id, maschera_nota, personalita, catturabile, negoziabile, affinita_proprie_json, livello, note, origine';

const casaOmbra = (chiave: string): string => `/guida/ombra/${chiave}`;
const personalitaValida = (v: string): PersonalitaOmbra => ((PERSONALITA_OMBRA as readonly string[]).includes(v) ? v : 'sconosciuta') as PersonalitaOmbra;
const nomiAltriDi = (json: string): string[] => { try { const v = JSON.parse(json) as unknown; return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; } };

/** Le affinità proprie dell'Ombra (elemento → codice), scartando ciò che non è un elemento o un codice valido. */
function affinitaProprie(json: string | null): Map<string, string> {
  const out = new Map<string, string>();
  if (!json) return out;
  try {
    for (const [el, cod] of Object.entries(JSON.parse(json) as Record<string, unknown>)) if (eChiaveElemento(el) && eCodiceAffinita(cod)) out.set(el, cod);
  } catch { /* affinità illeggibili: nessuna */ }
  return out;
}

/** L'affinità di un'Ombra per elemento: la griglia della sua Persona con sopra le differenze proprie (R8-08, R8-08b). */
function affinitaDellOmbra(r: RigaOmbra, perPersona: ReadonlyMap<number, ReadonlyMap<string, string>>): Map<string, string> {
  const m = new Map<string, string>(r.persona_id !== null ? perPersona.get(r.persona_id) ?? [] : []);
  for (const [el, cod] of affinitaProprie(r.affinita_proprie_json)) m.set(el, cod);
  return m;
}

/** Debolezze e altre affinità non normali, nell'ordine degli elementi di gioco. */
function debolezzeEResistenze(m: ReadonlyMap<string, string>): { debolezze: string[]; resistenze: OmbraResistenzaDto[] } {
  const debolezze: string[] = [];
  const resistenze: OmbraResistenzaDto[] = [];
  for (const { chiave } of ELEMENTI) {
    const cod = m.get(chiave);
    if (cod === 'wk') debolezze.push(chiave);
    else if (cod === 'rs' || cod === 'nu' || cod === 'rp' || cod === 'ab') resistenze.push({ elemento: chiave, codice: cod });
  }
  return { debolezze, resistenze };
}

/** Le affinità delle Persona date (id → elemento → codice), con una query sola. */
function affinitaDellePersone(ids: readonly number[]): Map<number, Map<string, string>> {
  const out = new Map<number, Map<string, string>>();
  if (ids.length === 0) return out;
  for (const r of prepared('SELECT persona_id, elemento, codice FROM persona_affinita WHERE persona_id IN (SELECT value FROM json_each(?))').all(JSON.stringify(ids)) as Array<{ persona_id: number; elemento: string; codice: string }>) {
    const m = out.get(r.persona_id);
    if (m) m.set(r.elemento, r.codice); else out.set(r.persona_id, new Map([[r.elemento, r.codice]]));
  }
  return out;
}

/** I Palazzi conclusi nella partita (chiave → perché), esclusi quelli senza effetti di Palazzo (Iweleth, R8-19b). Vuoto senza partita. */
function palazziConclusi(partita: number | undefined): Map<string, string> {
  if (partita === undefined) return new Map();
  return new Map([...statoPalazzi(partita)].flatMap(([k, s]) => (s.concluso && !s.senzaEffetti ? [[k, s.concluso] as [string, string]] : [])));
}

/** La scheda breve di un'Ombra; `persone` è l'indice id → nome, costruito una volta. */
function scheda(r: RigaOmbra, persone: Map<number, { nome: string; nomeIt: string }>, extra: { affinita: Map<string, string>; luoghi: OmbraLuogoDto[]; registrata: boolean | null }): OmbraSchedaDto {
  const p = r.persona_id !== null ? persone.get(r.persona_id) : undefined;
  return {
    chiave: r.chiave, nome: r.nome, nomiAltri: nomiAltriDi(r.nomi_altri_json),
    persona: r.persona_id !== null && p ? { id: r.persona_id, nome: p.nome, nomeIt: p.nomeIt } : null,
    macheraNota: r.maschera_nota, personalita: personalitaValida(r.personalita),
    reclutabile: r.persona_id !== null && r.catturabile === 1, catturabile: r.catturabile === 1,
    negoziabile: r.negoziabile === null ? null : r.negoziabile === 1, livello: r.livello, origine: r.origine, casa: casaOmbra(r.chiave),
    ...debolezzeEResistenze(extra.affinita), luoghi: extra.luoghi, registrata: extra.registrata,
  };
}

function indicePersone(): Map<number, { nome: string; nomeIt: string }> {
  const nomiIt = mappaAmbito('persona');
  return new Map((prepared('SELECT id, nome FROM persona').all() as Array<{ id: number; nome: string }>).map((p) => [p.id, { nome: p.nome, nomeIt: nomiIt[p.nome] ?? p.nome }]));
}

export interface FiltroOmbre { q?: string; dungeon?: string; personalita?: string; persona?: number; partita?: number }

/**
 * I luoghi d'incontro di tutte le Ombre (o di una), uniti per posto (Palazzo e infiltrazione, Memento e dedalo). Con `conclusi` ogni posto
 * dice se è ancora raggiungibile: solo un Palazzo concluso non lo è più (L4 R4-22, G-026); i Memento e i dedali sì, sempre.
 */
function luoghiDelleOmbre(conclusi: Map<string, string> | null, chiave?: string): Map<string, OmbraLuogoDto[]> {
  const perOmbra = new Map<string, Map<string, OmbraLuogoDto>>();
  const posto = (ombra: string, dungeon: string, nomeDungeon: string, tipo: string, infiltrazione: { chiave: string; nome: string } | null): OmbraLuogoDto => {
    const posti = perOmbra.get(ombra) ?? perOmbra.set(ombra, new Map()).get(ombra)!;
    const k = `${dungeon}|${infiltrazione?.chiave ?? ''}`;
    let l = posti.get(k);
    if (!l) {
      const parametro = tipo === 'mementos' ? 'area' : 'infiltrazione';
      const motivo = tipo === 'palazzo' ? conclusi?.get(dungeon) : undefined;
      l = { dungeon, dungeonNome: nomeDungeon, tipo, infiltrazione, areeDedalo: [], fonti: [], casa: infiltrazione ? `/guida/dungeon/${dungeon}?${parametro}=${encodeURIComponent(infiltrazione.chiave)}` : `/guida/dungeon/${dungeon}`,
        raggiungibile: conclusi ? motivo === undefined : null, ...(motivo !== undefined ? { motivoNonRaggiungibile: motivo } : {}) };
      posti.set(k, l);
    }
    return l;
  };
  for (const r of prepared(`SELECT l.ombra_chiave, l.dungeon_chiave, d.nome AS dungeon_nome, d.tipo, l.infiltrazione_chiave, a.nome AS infiltrazione_nome, l.fonte
      FROM ombra_luogo l JOIN dungeon d ON d.chiave = l.dungeon_chiave LEFT JOIN dungeon_area a ON a.chiave = l.infiltrazione_chiave
      ${chiave ? 'WHERE l.ombra_chiave = ?' : ''} ORDER BY d.ordine, COALESCE(a.ordine, 0), l.id`).all(...(chiave ? [chiave] : [])) as Array<{ ombra_chiave: string; dungeon_chiave: string; dungeon_nome: string; tipo: string; infiltrazione_chiave: string | null; infiltrazione_nome: string | null; fonte: 'battaglia' | 'voce' | 'utente' }>) {
    const l = posto(r.ombra_chiave, r.dungeon_chiave, r.dungeon_nome, r.tipo, r.infiltrazione_chiave ? { chiave: r.infiltrazione_chiave, nome: r.infiltrazione_nome ?? r.infiltrazione_chiave } : null);
    if (!l.fonti.includes(r.fonte)) l.fonti.push(r.fonte);
  }
  for (const r of prepared(`SELECT v.ombra_chiave, v.dungeon_chiave, d.nome AS dungeon_nome, d.tipo, v.dedalo_chiave, da.nome AS dedalo_nome, v.area_dedalo_chiave, ad.nome AS area_nome
      FROM ombra_luogo_dedalo v JOIN dungeon d ON d.chiave = v.dungeon_chiave JOIN dungeon_area da ON da.chiave = v.dedalo_chiave JOIN area_dedalo ad ON ad.chiave = v.area_dedalo_chiave
      ${chiave ? 'WHERE v.ombra_chiave = ?' : ''} GROUP BY v.ombra_chiave, v.dedalo_chiave, v.area_dedalo_chiave ORDER BY d.ordine, da.ordine, ad.ordine, ad.chiave`).all(...(chiave ? [chiave] : [])) as Array<{ ombra_chiave: string; dungeon_chiave: string; dungeon_nome: string; tipo: string; dedalo_chiave: string; dedalo_nome: string; area_dedalo_chiave: string; area_nome: string }>) {
    const l = posto(r.ombra_chiave, r.dungeon_chiave, r.dungeon_nome, r.tipo, { chiave: r.dedalo_chiave, nome: r.dedalo_nome });
    if (!l.fonti.includes('dedalo')) l.fonti.push('dedalo');
    if (!l.areeDedalo.some((a) => a.chiave === r.area_dedalo_chiave)) l.areeDedalo.push({ chiave: r.area_dedalo_chiave, nome: r.area_nome });
  }
  const out = new Map<string, OmbraLuogoDto[]>();
  for (const [ombra, posti] of perOmbra) {
    out.set(ombra, [...posti.values()].sort((a, b) => a.dungeonNome.localeCompare(b.dungeonNome, 'it') || (a.infiltrazione?.nome ?? '').localeCompare(b.infiltrazione?.nome ?? '', 'it')));
  }
  return out;
}

/** Le Ombre, per nome. Filtri: testo (nome, nomi alternativi, Persona), Palazzo o Memento d'incontro, personalità, Persona. */
export function elencaOmbre(f: FiltroOmbre = {}): OmbraSchedaDto[] {
  if (f.partita !== undefined) verificaPartita(f.partita);
  const persone = indicePersone();
  const righe = prepared(`SELECT ${COLONNE} FROM ombra ORDER BY nome COLLATE NOCASE, chiave`).all() as RigaOmbra[];
  const luoghi = luoghiDelleOmbre(f.partita === undefined ? null : palazziConclusi(f.partita));
  const perPersona = affinitaDellePersone([...new Set(righe.flatMap((r) => (r.persona_id !== null ? [r.persona_id] : [])))]);
  const registrate = f.partita === undefined ? null : personeRegistrate(f.partita);
  const testo = f.q ? normalizza(f.q) : '';
  return righe
    .filter((r) => (!f.dungeon || (luoghi.get(r.chiave) ?? []).some((l) => l.dungeon === f.dungeon)) && (!f.personalita || r.personalita === f.personalita) && (f.persona === undefined || r.persona_id === f.persona))
    .map((r) => scheda(r, persone, { affinita: affinitaDellOmbra(r, perPersona), luoghi: luoghi.get(r.chiave) ?? [], registrata: registrate && r.persona_id !== null ? registrate.has(r.persona_id) : null }))
    .filter((o) => !testo || normalizza([o.nome, ...o.nomiAltri, o.persona?.nome ?? '', o.persona?.nomeIt ?? ''].join(' ')).includes(testo));
}

/**
 * Se e dove un'Ombra si cattura ancora in una partita (R8-15b, G-026): con almeno un incontro raggiungibile «si»; con tutti gli incontri
 * in Palazzi conclusi, «solo per fusione» se la Persona è fondibile, altrimenti «no»; senza incontri noti «ignoto» (la guida non dice dove:
 * non si promette una cattura). Un'Ombra non catturabile (Babau/Bugs, le non reclutabili) non espone la cattura dall'incontro.
 */
function raggiungibilita(r: RigaOmbra, luoghi: OmbraLuogoDto[], fondibile: boolean): OmbraRaggiungibilitaDto {
  if (r.persona_id === null) return { stato: 'non-catturabile', testo: 'Quest’Ombra non è reclutabile: non ha una Persona da catturare.' };
  if (r.catturabile !== 1) return { stato: 'non-catturabile', testo: 'L’incontro non espone la cattura: la Persona si registra dal compendio o per fusione.' };
  const raggiungibili = luoghi.filter((l) => l.raggiungibile !== false);
  if (raggiungibili.length > 0) return { stato: 'si', testo: `Si cattura ancora: ${raggiungibili.map((l) => l.infiltrazione ? `${l.dungeonNome} › ${l.infiltrazione.nome}` : l.dungeonNome).join('; ')}.` };
  if (luoghi.length > 0) {
    const sparito = luoghi.map((l) => l.dungeonNome).join(', ');
    return fondibile
      ? { stato: 'solo-fusione', testo: `${sparito}: il Palazzo è sparito dopo il furto. Resta solo la fusione (o il compendio).` }
      : { stato: 'no', testo: `${sparito}: il Palazzo è sparito dopo il furto e la Persona non si ottiene altrove.` };
  }
  return { stato: 'ignoto', testo: fondibile ? 'La guida non dice dove si incontra; la Persona si ottiene anche per fusione.' : 'La guida non dice dove si incontra.' };
}

/** La scheda di un'Ombra; con `partita`, se la sua Persona è registrata nel compendio della partita e dove si cattura ancora. */
export function dettaglioOmbra(chiave: string, partita?: number): OmbraDettaglioDto {
  if (partita !== undefined) verificaPartita(partita);
  const r = prepared(`SELECT ${COLONNE} FROM ombra WHERE chiave = ?`).get(chiave) as RigaOmbra | undefined;
  if (!r) throw httpErrors.notFound('ombra-non-trovata', `Non c'è un'Ombra con la chiave «${chiave}».`);
  const proprie = affinitaProprie(r.affinita_proprie_json);
  // Con la Persona: tutta la griglia del compendio, con le differenze dell'Ombra sopra. Senza: solo ciò che la guida sa dell'Ombra.
  const daCompendio = r.persona_id !== null ? new Map(codiciAffinita(r.persona_id)) : new Map<string, string>();
  for (const [el, cod] of proprie) daCompendio.set(el, cod);
  const griglia = affinitaDi(daCompendio);
  const affinita = (r.persona_id !== null ? griglia : griglia.filter((a) => proprie.has(a.elemento))).map((a) => ({ ...a, proprie: proprie.has(a.elemento) }));
  const voci = prepared(`SELECT p.chiave, p.nome, a.dungeon_chiave AS dungeon, p.area_chiave AS infiltrazione FROM ombra_voce ov JOIN punto_interesse p ON p.chiave = ov.voce_chiave
      JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE ov.ombra_chiave = ? ORDER BY a.dungeon_chiave, a.ordine, p.ordine, p.chiave`).all(chiave) as OmbraDettaglioDto['voci'];
  const luoghi = luoghiDelleOmbre(partita === undefined ? null : palazziConclusi(partita), chiave).get(chiave) ?? [];
  const registrata = partita !== undefined && r.persona_id !== null ? personeRegistrate(partita).has(r.persona_id) : null;
  const base = scheda(r, indicePersone(), { affinita: daCompendio, luoghi, registrata });
  const fondibile = r.persona_id !== null && (prepared('SELECT del_party FROM persona WHERE id = ?').pluck().get(r.persona_id) as number | undefined) === 0;
  return { ...base, affinita, affinitaProprie: proprie.size > 0, raggiungibilita: partita === undefined ? null : raggiungibilita(r, luoghi, fondibile), voci, note: r.note };
}

/** I conteggi misurati ora e il rapporto della migrazione che ha creato le Ombre (le decisioni ancora da prendere). */
export function verificaOmbre(): OmbreVerificaDto {
  const uno = (sql: string): number => prepared(sql).pluck().get() as number;
  const personalita = Object.fromEntries(PERSONALITA_OMBRA.map((p) => [p, 0])) as Record<PersonalitaOmbra, number>;
  for (const r of prepared('SELECT personalita, COUNT(*) AS n FROM ombra GROUP BY personalita').all() as Array<{ personalita: string; n: number }>) personalita[personalitaValida(r.personalita)] += r.n;
  const rapporto = (prepared("SELECT json FROM dati_guida WHERE chiave LIKE 'ombre-l8-%' ORDER BY chiave DESC LIMIT 1").get() as { json: string } | undefined)?.json;
  return {
    conteggi: {
      ombre: uno('SELECT COUNT(*) FROM ombra'), conPersona: uno('SELECT COUNT(*) FROM ombra WHERE persona_id IS NOT NULL'), senzaPersona: uno('SELECT COUNT(*) FROM ombra WHERE persona_id IS NULL'),
      nonCatturabili: uno('SELECT COUNT(*) FROM ombra WHERE catturabile = 0'), luoghi: uno('SELECT COUNT(*) FROM ombra_luogo'), voci: uno('SELECT COUNT(*) FROM ombra_voce'),
      areeDedalo: uno('SELECT COUNT(*) FROM ombra_luogo_dedalo'), personalita,
    },
    rapporto: rapporto ? (JSON.parse(rapporto) as Record<string, unknown>) : null,
  };
}
