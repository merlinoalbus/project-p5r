// ============================================================
// ombreService — l'entità Ombra: elenco, scheda e verifica (L8, B4; sola lettura)
// ============================================================
//
// La Persona resta l'identità (compendio); l'Ombra ha chiave stabile, nome italiano, Persona (o nessuna: non reclutabile), personalità e
// luoghi d'incontro. Le debolezze si leggono dalle affinità della Persona (`persona_affinita`, vocabolario di `shared/elementi.ts`); solo le
// 4 Ombre con affinità diverse dalla Persona (G-019) e le 5 non reclutabili ne hanno di proprie, una sola copia, sull'Ombra.
// Dove si incontra: `ombra_luogo` (Battaglia e voci dei Palazzi) più la vista `ombra_luogo_dedalo` (aree dei dedali, da `persona_area_dedalo`),
// uniti per posto: nessuna fonte vince sulle altre.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { mappaAmbito } from './traduzioniService.js';
import { affinitaDi, codiciAffinita } from './compendioService.js';
import { verificaPartita } from './verificaPartita.js';
import { normalizza } from '../../shared/maschere.js';
import { eCodiceAffinita, eChiaveElemento, PERSONALITA_OMBRA, type PersonalitaOmbra } from '../../shared/elementi.js';
import type { OmbraDettaglioDto, OmbraLuogoDto, OmbraSchedaDto, OmbreVerificaDto } from '../../shared/ombre.js';

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

/** La scheda breve di un'Ombra; `persone` è l'indice id → nome, costruito una volta. */
function scheda(r: RigaOmbra, persone: Map<number, { nome: string; nomeIt: string }>): OmbraSchedaDto {
  const p = r.persona_id !== null ? persone.get(r.persona_id) : undefined;
  return {
    chiave: r.chiave, nome: r.nome, nomiAltri: nomiAltriDi(r.nomi_altri_json),
    persona: r.persona_id !== null && p ? { id: r.persona_id, nome: p.nome, nomeIt: p.nomeIt } : null,
    macheraNota: r.maschera_nota, personalita: personalitaValida(r.personalita),
    reclutabile: r.persona_id !== null && r.catturabile === 1, catturabile: r.catturabile === 1,
    negoziabile: r.negoziabile === null ? null : r.negoziabile === 1, livello: r.livello, origine: r.origine, casa: casaOmbra(r.chiave),
  };
}

function indicePersone(): Map<number, { nome: string; nomeIt: string }> {
  const nomiIt = mappaAmbito('persona');
  return new Map((prepared('SELECT id, nome FROM persona').all() as Array<{ id: number; nome: string }>).map((p) => [p.id, { nome: p.nome, nomeIt: nomiIt[p.nome] ?? p.nome }]));
}

export interface FiltroOmbre { q?: string; dungeon?: string; personalita?: string; persona?: number; partita?: number }

/** Le Ombre, per nome. Filtri: testo (nome, nomi alternativi, Persona), Palazzo o Memento d'incontro, personalità, Persona. */
export function elencaOmbre(f: FiltroOmbre = {}): OmbraSchedaDto[] {
  if (f.partita !== undefined) verificaPartita(f.partita);
  const persone = indicePersone();
  const righe = prepared(`SELECT ${COLONNE} FROM ombra ORDER BY nome COLLATE NOCASE, chiave`).all() as RigaOmbra[];
  const inDungeon = f.dungeon
    ? new Set([
      ...(prepared('SELECT DISTINCT ombra_chiave FROM ombra_luogo WHERE dungeon_chiave = ?').pluck().all(f.dungeon) as string[]),
      ...(prepared('SELECT DISTINCT ombra_chiave FROM ombra_luogo_dedalo WHERE dungeon_chiave = ?').pluck().all(f.dungeon) as string[]),
    ])
    : null;
  const testo = f.q ? normalizza(f.q) : '';
  return righe
    .filter((r) => (!inDungeon || inDungeon.has(r.chiave)) && (!f.personalita || r.personalita === f.personalita) && (f.persona === undefined || r.persona_id === f.persona))
    .map((r) => scheda(r, persone))
    .filter((o) => !testo || normalizza([o.nome, ...o.nomiAltri, o.persona?.nome ?? '', o.persona?.nomeIt ?? ''].join(' ')).includes(testo));
}

/** I luoghi d'incontro di un'Ombra, uniti per posto (Palazzo e infiltrazione, Memento e dedalo). */
function luoghiDi(chiave: string): OmbraLuogoDto[] {
  const posti = new Map<string, OmbraLuogoDto>();
  const posto = (dungeon: string, nomeDungeon: string, tipo: string, infiltrazione: { chiave: string; nome: string } | null): OmbraLuogoDto => {
    const k = `${dungeon}|${infiltrazione?.chiave ?? ''}`;
    let l = posti.get(k);
    if (!l) {
      const parametro = tipo === 'mementos' ? 'area' : 'infiltrazione';
      l = { dungeon, dungeonNome: nomeDungeon, tipo, infiltrazione, areeDedalo: [], fonti: [], casa: infiltrazione ? `/guida/dungeon/${dungeon}?${parametro}=${encodeURIComponent(infiltrazione.chiave)}` : `/guida/dungeon/${dungeon}` };
      posti.set(k, l);
    }
    return l;
  };
  for (const r of prepared(`SELECT l.dungeon_chiave, d.nome AS dungeon_nome, d.tipo, l.infiltrazione_chiave, a.nome AS infiltrazione_nome, l.fonte
      FROM ombra_luogo l JOIN dungeon d ON d.chiave = l.dungeon_chiave LEFT JOIN dungeon_area a ON a.chiave = l.infiltrazione_chiave
      WHERE l.ombra_chiave = ? ORDER BY d.ordine, COALESCE(a.ordine, 0), l.id`).all(chiave) as Array<{ dungeon_chiave: string; dungeon_nome: string; tipo: string; infiltrazione_chiave: string | null; infiltrazione_nome: string | null; fonte: 'battaglia' | 'voce' | 'utente' }>) {
    const l = posto(r.dungeon_chiave, r.dungeon_nome, r.tipo, r.infiltrazione_chiave ? { chiave: r.infiltrazione_chiave, nome: r.infiltrazione_nome ?? r.infiltrazione_chiave } : null);
    if (!l.fonti.includes(r.fonte)) l.fonti.push(r.fonte);
  }
  for (const r of prepared(`SELECT v.dungeon_chiave, d.nome AS dungeon_nome, d.tipo, v.dedalo_chiave, da.nome AS dedalo_nome, v.area_dedalo_chiave, ad.nome AS area_nome
      FROM ombra_luogo_dedalo v JOIN dungeon d ON d.chiave = v.dungeon_chiave JOIN dungeon_area da ON da.chiave = v.dedalo_chiave JOIN area_dedalo ad ON ad.chiave = v.area_dedalo_chiave
      WHERE v.ombra_chiave = ? GROUP BY v.dedalo_chiave, v.area_dedalo_chiave ORDER BY d.ordine, da.ordine, ad.ordine, ad.chiave`).all(chiave) as Array<{ dungeon_chiave: string; dungeon_nome: string; tipo: string; dedalo_chiave: string; dedalo_nome: string; area_dedalo_chiave: string; area_nome: string }>) {
    const l = posto(r.dungeon_chiave, r.dungeon_nome, r.tipo, { chiave: r.dedalo_chiave, nome: r.dedalo_nome });
    if (!l.fonti.includes('dedalo')) l.fonti.push('dedalo');
    if (!l.areeDedalo.some((a) => a.chiave === r.area_dedalo_chiave)) l.areeDedalo.push({ chiave: r.area_dedalo_chiave, nome: r.area_nome });
  }
  return [...posti.values()].sort((a, b) => a.dungeonNome.localeCompare(b.dungeonNome, 'it') || (a.infiltrazione?.nome ?? '').localeCompare(b.infiltrazione?.nome ?? '', 'it'));
}

/** La scheda di un'Ombra; con `partita`, se la sua Persona è registrata nel compendio della partita. */
export function dettaglioOmbra(chiave: string, partita?: number): OmbraDettaglioDto {
  if (partita !== undefined) verificaPartita(partita);
  const r = prepared(`SELECT ${COLONNE} FROM ombra WHERE chiave = ?`).get(chiave) as RigaOmbra | undefined;
  if (!r) throw httpErrors.notFound('ombra-non-trovata', `Non c'è un'Ombra con la chiave «${chiave}».`);
  const base = scheda(r, indicePersone());
  const proprie = affinitaProprie(r.affinita_proprie_json);
  // Con la Persona: tutta la griglia del compendio, con le differenze dell'Ombra sopra. Senza: solo ciò che la guida sa dell'Ombra.
  const daCompendio = r.persona_id !== null ? new Map(codiciAffinita(r.persona_id)) : new Map<string, string>();
  for (const [el, cod] of proprie) daCompendio.set(el, cod);
  const griglia = affinitaDi(daCompendio);
  const affinita = (r.persona_id !== null ? griglia : griglia.filter((a) => proprie.has(a.elemento))).map((a) => ({ ...a, proprie: proprie.has(a.elemento) }));
  const voci = prepared(`SELECT p.chiave, p.nome, a.dungeon_chiave AS dungeon, p.area_chiave AS infiltrazione FROM ombra_voce ov JOIN punto_interesse p ON p.chiave = ov.voce_chiave
      JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE ov.ombra_chiave = ? ORDER BY a.dungeon_chiave, a.ordine, p.ordine, p.chiave`).all(chiave) as OmbraDettaglioDto['voci'];
  let registrata: boolean | null = null;
  if (partita !== undefined && r.persona_id !== null) {
    registrata = !!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'compendio_partita'").get()
      && !!prepared('SELECT 1 FROM compendio_partita WHERE partita_id = ? AND persona_id = ? AND registrata = 1').get(partita, r.persona_id);
  }
  return { ...base, affinita, affinitaProprie: proprie.size > 0, luoghi: luoghiDi(chiave), voci, note: r.note, registrata };
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
