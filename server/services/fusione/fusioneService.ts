// ============================================================
// fusioneService — DTO per le API di fusione (contesto da partita o elenco DLC, nomi italiani)
// ============================================================

import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { t } from '../traduzioniService.js';
import type { EsitoFusioneDto, NodoPianoDto, PersonaFusioneDto, PianiFusioneDto, RicettaFusioneDto, RicetteFusioneDto } from '../../../shared/types.js';
import { pianiFusione, type Disponibilita, type NodoPiano } from './alberoFusione.js';
import { creaContesto, fondi, fusioniCon, personaFusione, ricettePer, type Contesto, type PersonaFusione, type RicettaFusione } from './motoreFusione.js';

export interface OpzioniContesto {
  partitaId?: number;
  dlc?: number[];
  livelloMax?: number;
  limite?: number;
}

function contestoDa(opz: OpzioniContesto): { ctx: Contesto; dlcPosseduti: number[] } {
  let dlc = opz.dlc ?? [];
  if (opz.partitaId !== undefined) {
    const r = prepared('SELECT dlc_posseduti_json FROM partita WHERE id = ?').get(opz.partitaId) as { dlc_posseduti_json: string } | undefined;
    if (!r) throw httpErrors.notFound('partita-non-trovata', `La partita ${opz.partitaId} non esiste.`);
    dlc = JSON.parse(r.dlc_posseduti_json) as number[];
  }
  return { ctx: creaContesto(dlc), dlcPosseduti: dlc };
}

function personaDto(p: PersonaFusione): PersonaFusioneDto {
  return { id: p.id, nome: p.nome, nomeIt: t('persona', p.nome), arcana: p.arcana, arcanaNome: t('arcana', p.arcana), livello: p.livello, speciale: p.speciale, rara: p.rara, dlc: p.dlc };
}

function ricettaDto(r: RicettaFusione): RicettaFusioneDto {
  return { ingredienti: r.ingredienti.map(personaDto), risultato: personaDto(r.risultato), tipo: r.tipo, costo: r.costo };
}

function personaOErrore(id: number): PersonaFusione {
  const p = personaFusione(id);
  if (!p) throw httpErrors.notFound('persona-non-trovata', `La Persona ${id} non esiste.`);
  return p;
}

/** Fusione diretta A+B con la spiegazione del motivo quando non è possibile. */
export function fondiDto(aId: number, bId: number, opz: OpzioniContesto): EsitoFusioneDto {
  const { ctx, dlcPosseduti } = contestoDa(opz);
  const a = personaOErrore(aId);
  const b = personaOErrore(bId);
  const ammesse = new Set(ctx.ammesse.map((p) => p.id));
  if (a.id === b.id) return { a: personaDto(a), b: personaDto(b), ricetta: null, motivo: 'Una Persona non può essere fusa con sé stessa.', dlcPosseduti };
  for (const p of [a, b]) {
    if (!ammesse.has(p.id)) return { a: personaDto(a), b: personaDto(b), ricetta: null, motivo: `${t('persona', p.nome)} è un contenuto scaricabile non segnato come posseduto in questa partita.`, dlcPosseduti };
  }
  const r = fondi(a, b, ctx);
  if (r) return { a: personaDto(a), b: personaDto(b), ricetta: ricettaDto(r), motivo: null, dlcPosseduti };
  let motivo = 'Nessuna Persona corrisponde a questa combinazione.';
  if (a.rara && b.rara) motivo = 'Questi due Demoni del Tesoro non producono alcuna Persona con la fusione normale.';
  else if (a.rara || b.rara) motivo = 'Il Demone del Tesoro non ha una Persona a quella distanza nell\'arcano: la fusione non è possibile.';
  else if (a.arcana === b.arcana) motivo = 'Nessuna Persona dello stesso arcano ha un livello adatto al di sotto del riferimento (esclusi gli ingredienti).';
  else if (!ctx.perArcana.has(a.arcana) || (ctx.perArcana.get(a.arcana) && !ctx.perArcana.get(b.arcana))) motivo = 'Arcano sconosciuto.';
  else if (arcanaSenzaRisultato(a.arcana, b.arcana)) motivo = 'Questi due arcani non possono essere fusi insieme (Giudizio con Giustizia, Forza, Carro o Morte).';
  else motivo = 'Il livello di riferimento supera la Persona più alta dell\'arcano risultante.';
  return { a: personaDto(a), b: personaDto(b), ricetta: null, motivo, dlcPosseduti };
}

function arcanaSenzaRisultato(a: string, b: string): boolean {
  const coppie = new Set(['Judgement|Justice', 'Judgement|Strength', 'Judgement|Chariot', 'Judgement|Death']);
  return coppie.has(`${a}|${b}`) || coppie.has(`${b}|${a}`);
}

/** Ricette che producono la Persona, filtrate per livello massimo e limitate in numero (totale sempre riportato). */
export function ricettePerDto(personaId: number, opz: OpzioniContesto): RicetteFusioneDto {
  const { ctx, dlcPosseduti } = contestoDa(opz);
  const target = personaOErrore(personaId);
  let ricette = ricettePer(target, ctx);
  const totaleSenzaFiltri = ricette.length;
  if (opz.livelloMax !== undefined) ricette = ricette.filter((r) => r.risultato.livello <= opz.livelloMax! && r.ingredienti.every((i) => i.livello <= opz.livelloMax!));
  const totale = ricette.length;
  const limite = opz.limite ?? 500;
  return { persona: personaDto(target), totale, totaleSenzaFiltri, ricette: ricette.slice(0, limite).map(ricettaDto), dlcPosseduti, livelloMax: opz.livelloMax ?? null };
}

/** Scorta (esemplari per Persona) e Registro (Persona registrate) della partita; vuoti senza partita. */
function disponibilitaDi(partitaId?: number): Disponibilita {
  const disp: Disponibilita = { scorta: new Map(), registro: new Set() };
  if (partitaId === undefined) return disp;
  for (const r of prepared('SELECT persona_id FROM persona_posseduta WHERE partita_id = ?').all(partitaId) as Array<{ persona_id: number }>) {
    disp.scorta.set(r.persona_id, (disp.scorta.get(r.persona_id) ?? 0) + 1);
  }
  for (const r of prepared('SELECT persona_id FROM compendio_partita WHERE partita_id = ? AND registrata = 1').all(partitaId) as Array<{ persona_id: number }>) {
    disp.registro.add(r.persona_id);
  }
  return disp;
}

function nodoDto(n: NodoPiano): NodoPianoDto {
  return { persona: personaDto(n.persona), modo: n.modo, costo: n.costo, ...(n.tipo ? { tipo: n.tipo } : {}), figli: n.figli.map(nodoDto) };
}

export interface OpzioniPiani extends OpzioniContesto {
  profondita?: number;
  alternative?: number;
  catture?: boolean;
  /** Se true e c'è una partita, il livello massimo è quello del protagonista. */
  limitaLivello?: boolean;
}

/** Piani di fusione ricorsivi per ottenere la Persona, con scorta e Registro della partita. */
export function pianiDto(personaId: number, opz: OpzioniPiani): PianiFusioneDto {
  const { ctx } = contestoDa(opz);
  const target = personaOErrore(personaId);
  const disp = disponibilitaDi(opz.partitaId);
  let livelloMax: number | null = opz.livelloMax ?? null;
  if (livelloMax === null && opz.limitaLivello && opz.partitaId !== undefined) {
    const r = prepared('SELECT livello_protagonista FROM partita WHERE id = ?').get(opz.partitaId) as { livello_protagonista: number } | undefined;
    livelloMax = r?.livello_protagonista ?? null;
  }
  const opzioni = { profondita: opz.profondita ?? 3, alternative: opz.alternative ?? 3, catture: opz.catture ?? true, livelloMax };
  const piani = pianiFusione(target, ctx, disp, opzioni);
  return {
    persona: personaDto(target),
    piani: piani.map((p) => ({ radice: nodoDto(p.radice), costo: p.costo, profondita: p.profondita, catture: p.catture, evocazioni: p.evocazioni, fusioni: p.fusioni })),
    opzioni,
    disponibilita: { scorta: [...disp.scorta.values()].reduce((a, b) => a + b, 0), registro: disp.registro.size },
  };
}

/** Fusioni in cui la Persona è ingrediente. */
export function fusioniConDto(personaId: number, opz: OpzioniContesto): RicetteFusioneDto {
  const { ctx, dlcPosseduti } = contestoDa(opz);
  const persona = personaOErrore(personaId);
  let ricette = fusioniCon(persona, ctx);
  const totaleSenzaFiltri = ricette.length;
  if (opz.livelloMax !== undefined) ricette = ricette.filter((r) => r.risultato.livello <= opz.livelloMax! && r.ingredienti.every((i) => i.livello <= opz.livelloMax!));
  const totale = ricette.length;
  const limite = opz.limite ?? 500;
  return { persona: personaDto(persona), totale, totaleSenzaFiltri, ricette: ricette.slice(0, limite).map(ricettaDto), dlcPosseduti, livelloMax: opz.livelloMax ?? null };
}
