// ============================================================
// fusioneService — DTO per le API di fusione (contesto da partita o elenco DLC, nomi italiani)
// ============================================================

import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { t } from '../traduzioniService.js';
import type { EreditaFusioneDto, EsitoFusioneDto, NodoPianoDto, PersonaFusioneDto, PianiFusioneDto, RicercaSkillDto, RicettaFusioneDto, RicetteFusioneDto, SkillEreditaDto } from '../../../shared/types.js';
import { analisiEredita, copre, elementoEreditabile, skillAlLivello, skillPerId, skillPosseduta, tipoEredita, type IngredienteEredita, type SkillEredita } from './eredita.js';
import { SBLOCCHI_GEMELLE, moltiplicatoreExpConfidente, prezzoScontato, sblocchiGemelle, scontoRegistro } from '../../../shared/bonusVelluto.js';
import type { VellutoDto } from '../../../shared/types.js';
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

// ---- Stanza di Velluto (Fase 4.2) ----

/** Percentuale di completamento del compendio personale (Persona non DLC registrate) e sconto del Registro. */
function scontoPartita(partitaId: number | undefined): { registrate: number; totale: number; percentuale: number; sconto: number } {
  const totale = (prepared('SELECT COUNT(*) AS n FROM persona WHERE dlc = 0').get() as { n: number }).n;
  if (partitaId === undefined) return { registrate: 0, totale, percentuale: 0, sconto: 0 };
  const registrate = (prepared('SELECT COUNT(*) AS n FROM compendio_partita cp JOIN persona p ON p.id = cp.persona_id WHERE cp.partita_id = ? AND cp.registrata = 1 AND p.dlc = 0').get(partitaId) as { n: number }).n;
  const percentuale = totale > 0 ? Math.floor((registrate / totale) * 100) : 0;
  return { registrate, totale, percentuale, sconto: scontoRegistro(percentuale) };
}

/** Rango del Confidente per arcano nella partita (0 se assente). */
function ranghiPerArcana(partitaId: number | undefined): Map<string, { chiave: string; nome: string; rango: number }> {
  const m = new Map<string, { chiave: string; nome: string; rango: number }>();
  const righe = prepared(`SELECT c.chiave, c.nome, c.arcana, COALESCE(cp.rango, 0) AS rango FROM confidente c
    LEFT JOIN confidente_partita cp ON cp.confidente_chiave = c.chiave AND cp.partita_id = ? ORDER BY c.ordine`).all(partitaId ?? -1) as Array<{ chiave: string; nome: string; arcana: string; rango: number }>;
  for (const r of righe) if (!m.has(r.arcana) || m.get(r.arcana)!.rango < r.rango) m.set(r.arcana, { chiave: r.chiave, nome: r.nome, rango: r.rango });
  return m;
}

/** Stato della Stanza di Velluto per la partita. */
export function vellutoDto(partitaId: number): VellutoDto {
  const partita = prepared('SELECT id, allarme_attivo FROM partita WHERE id = ?').get(partitaId) as { id: number; allarme_attivo: number } | undefined;
  if (!partita) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const c = scontoPartita(partitaId);
  const ranghi = ranghiPerArcana(partitaId);
  const gemelle = ranghi.get('Strength')?.rango ?? 0;
  const sb = sblocchiGemelle(gemelle);
  const arcani = (prepared('SELECT chiave FROM arcana ORDER BY ordine').all() as Array<{ chiave: string }>).map((a) => {
    const r = ranghi.get(a.chiave);
    return { arcana: a.chiave, arcanaNome: t('arcana', a.chiave), confidenteChiave: r?.chiave ?? null, confidenteNome: r?.nome ?? null, rango: r?.rango ?? 0, moltiplicatoreExp: moltiplicatoreExpConfidente(r?.rango ?? 0) };
  });
  return {
    partitaId,
    compendio: { registrate: c.registrate, totale: c.totale, percentuale: c.percentuale },
    sconto: c.sconto,
    allarmeAttivo: partita.allarme_attivo === 1,
    gemelle: {
      rango: gemelle,
      trattamentoSpeciale: gemelle >= 5,
      sblocchi: SBLOCCHI_GEMELLE.map((s) => ({ ...s, ottenuto: s.rango <= gemelle })),
      prossimo: sb.prossimo,
    },
    arcani,
  };
}

function ricettaScontata(r: RicettaFusioneDto, sconto: number): RicettaFusioneDto {
  return sconto > 0 ? { ...r, costo: prezzoScontato(r.costo, sconto) } : r;
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
  if (a.id === b.id) return { a: personaDto(a), b: personaDto(b), ricetta: null, motivo: 'Una Persona non può essere fusa con sé stessa.', dlcPosseduti, sconto: 0, bonusConfidente: null };
  for (const p of [a, b]) {
    if (!ammesse.has(p.id)) return { a: personaDto(a), b: personaDto(b), ricetta: null, motivo: `${t('persona', p.nome)} è un contenuto scaricabile non segnato come posseduto in questa partita.`, dlcPosseduti, sconto: 0, bonusConfidente: null };
  }
  const r = fondi(a, b, ctx);
  if (r) {
    const sconto = scontoPartita(opz.partitaId).sconto;
    const rango = ranghiPerArcana(opz.partitaId).get(r.risultato.arcana);
    const bonusConfidente = opz.partitaId !== undefined
      ? { arcana: r.risultato.arcana, arcanaNome: t('arcana', r.risultato.arcana), confidenteNome: rango?.nome ?? null, rango: rango?.rango ?? 0, moltiplicatoreExp: moltiplicatoreExpConfidente(rango?.rango ?? 0) }
      : null;
    return { a: personaDto(a), b: personaDto(b), ricetta: ricettaScontata(ricettaDto(r), sconto), motivo: null, dlcPosseduti, sconto, bonusConfidente };
  }
  let motivo = 'Nessuna Persona corrisponde a questa combinazione.';
  if (a.rara && b.rara) motivo = 'Questi due Demoni del Tesoro non producono alcuna Persona con la fusione normale.';
  else if (a.rara || b.rara) motivo = 'Il Demone del Tesoro non ha una Persona a quella distanza nell\'arcano: la fusione non è possibile.';
  else if (a.arcana === b.arcana) motivo = 'Nessuna Persona dello stesso arcano ha un livello adatto al di sotto del riferimento (esclusi gli ingredienti).';
  else if (!ctx.perArcana.has(a.arcana) || (ctx.perArcana.get(a.arcana) && !ctx.perArcana.get(b.arcana))) motivo = 'Arcano sconosciuto.';
  else if (arcanaSenzaRisultato(a.arcana, b.arcana)) motivo = 'Questi due arcani non possono essere fusi insieme (Giudizio con Giustizia, Forza, Carro o Morte).';
  else motivo = 'Il livello di riferimento supera la Persona più alta dell\'arcano risultante.';
  return { a: personaDto(a), b: personaDto(b), ricetta: null, motivo, dlcPosseduti, sconto: 0, bonusConfidente: null };
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
  const sconto = scontoPartita(opz.partitaId).sconto;
  return { persona: personaDto(target), totale, totaleSenzaFiltri, ricette: ricette.slice(0, limite).map((r) => ricettaScontata(ricettaDto(r), sconto)), dlcPosseduti, livelloMax: opz.livelloMax ?? null, sconto };
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

function skillBreve(id: number): { id: number; nome: string; nomeIt: string } {
  const s = skillPerId(id);
  return { id, nome: s?.nome ?? String(id), nomeIt: s ? t('skill', s.nome) : String(id) };
}

function nodoDto(n: NodoPiano, sconto = 0): NodoPianoDto {
  return { persona: personaDto(n.persona), modo: n.modo, costo: prezzoScontato(n.costo, sconto), ...(n.tipo ? { tipo: n.tipo } : {}), figli: n.figli.map((f) => nodoDto(f, sconto)), skillPortate: n.skillPortate.map(skillBreve), skillDaLivello: n.skillDaLivello.map(skillBreve) };
}

export interface OpzioniPiani extends OpzioniContesto {
  profondita?: number;
  alternative?: number;
  catture?: boolean;
  /** Se true e c'è una partita, il livello massimo è quello del protagonista. */
  limitaLivello?: boolean;
  /** Skill che il bersaglio deve avere (propagate lungo la catena). */
  skill?: number[];
  slotFortunato?: boolean;
}

/** Piani di fusione ricorsivi per ottenere la Persona, con scorta e Registro della partita. */
export function pianiDto(personaId: number, opz: OpzioniPiani): PianiFusioneDto {
  const { ctx } = contestoDa(opz);
  const target = personaOErrore(personaId);
  const disp = disponibilitaDi(opz.partitaId);
  if (opz.partitaId !== undefined) {
    // Skill effettive degli esemplari in scorta (unione per Persona), per la propagazione.
    const righe = prepared('SELECT pp.persona_id, ps.skill_id FROM persona_posseduta pp JOIN persona_posseduta_skill ps ON ps.posseduta_id = pp.id WHERE pp.partita_id = ?').all(opz.partitaId) as Array<{ persona_id: number; skill_id: number }>;
    disp.skillScorta = new Map();
    for (const r of righe) {
      if (!disp.skillScorta.has(r.persona_id)) disp.skillScorta.set(r.persona_id, new Set());
      disp.skillScorta.get(r.persona_id)!.add(r.skill_id);
    }
  }
  const skillRichieste = (opz.skill ?? []).map((id) => {
    const s = skillPerId(id);
    if (!s) throw httpErrors.notFound('skill-non-trovata', `La skill ${id} non esiste.`);
    if (s.elemento === 'trait') throw httpErrors.badRequest('skill-tratto', `${t('skill', s.nome)} è un tratto: non si propaga come skill (se ne eredita uno a scelta a ogni fusione).`);
    return { id: s.id, nome: s.nome, nomeIt: t('skill', s.nome), elemento: s.elemento, elementoNome: t('elementoSkill', s.elemento) };
  });
  let livelloMax: number | null = opz.livelloMax ?? null;
  if (livelloMax === null && opz.limitaLivello && opz.partitaId !== undefined) {
    const r = prepared('SELECT livello_protagonista FROM partita WHERE id = ?').get(opz.partitaId) as { livello_protagonista: number } | undefined;
    livelloMax = r?.livello_protagonista ?? null;
  }
  const opzioni = { profondita: opz.profondita ?? 3, alternative: opz.alternative ?? 3, catture: opz.catture ?? true, livelloMax, slotFortunato: opz.slotFortunato ?? false };
  const piani = pianiFusione(target, ctx, disp, { ...opzioni, skill: skillRichieste.map((s) => s.id) });
  const sconto = scontoPartita(opz.partitaId).sconto;
  return {
    persona: personaDto(target),
    piani: piani.map((p) => ({ radice: nodoDto(p.radice, sconto), costo: prezzoScontato(p.costo, sconto), profondita: p.profondita, catture: p.catture, evocazioni: p.evocazioni, fusioni: p.fusioni })),
    opzioni,
    skillRichieste,
    sconto,
    disponibilita: { scorta: [...disp.scorta.values()].reduce((a, b) => a + b, 0), registro: disp.registro.size },
  };
}

// ---- Eredità delle skill (Fase 3) ----

function skillDto(s: SkillEredita): { id: number; nome: string; nomeIt: string; elemento: string } {
  return { id: s.id, nome: s.nome, nomeIt: t('skill', s.nome), elemento: s.elemento };
}

/** Ingrediente con le skill della scorta se posseduto nella partita, altrimenti quelle al livello indicato (o base). */
function ingredienteDa(p: PersonaFusione, partitaId: number | undefined, livello: number | undefined): IngredienteEredita & { livello: number; daScorta: boolean } {
  if (partitaId !== undefined) {
    const poss = prepared('SELECT id, livello FROM persona_posseduta WHERE partita_id = ? AND persona_id = ? ORDER BY livello DESC LIMIT 1').get(partitaId, p.id) as { id: number; livello: number } | undefined;
    if (poss) {
      const skill = skillPosseduta(poss.id);
      if (skill.length > 0) return { persona: p, skill, livello: poss.livello, daScorta: true };
    }
  }
  const l = livello ?? p.livello;
  return { persona: p, skill: skillAlLivello(p.id, l), livello: l, daScorta: false };
}

/** Analisi dell'eredità per la fusione A + B (o la ricetta speciale se A + B la compongono). */
export function ereditaDto(aId: number, bId: number, opz: OpzioniContesto & { livelloA?: number; livelloB?: number }): EreditaFusioneDto {
  const { ctx } = contestoDa(opz);
  const a = personaOErrore(aId);
  const b = personaOErrore(bId);
  const r = fondi(a, b, ctx);
  if (!r) throw httpErrors.badRequest('fusione-impossibile', 'Queste due Persona non producono alcun risultato: nessuna eredità da analizzare.');
  const ingredienti = [ingredienteDa(a, opz.partitaId, opz.livelloA), ingredienteDa(b, opz.partitaId, opz.livelloB)];
  const an = analisiEredita(r.risultato, ingredienti);
  const tipo = an.tipo;
  return {
    risultato: personaDto(r.risultato),
    tipo,
    tipoNome: tipo ? t('tipoEredita', tipo) : null,
    ingredienti: ingredienti.map((i) => ({ persona: personaDto(i.persona), livello: i.livello, daScorta: i.daScorta, skill: i.skill.map(skillDto) })),
    totaleSkillGenitori: an.totaleSkillGenitori,
    slot: an.slot,
    slotScelti: an.slotScelti,
    candidate: an.candidate.map((c): SkillEreditaDto => ({ ...skillDto(c), elementoNome: t('elementoSkill', c.elemento), da: c.da, ereditabile: c.ereditabile, giaAppresa: c.giaAppresa, motivo: c.motivo })),
    tratti: an.tratti.map((x) => ({ id: x.skill.id, nome: x.skill.nome, nomeIt: t('skill', x.skill.nome), effettoNome: t('effettoSkill', (prepared('SELECT effetto FROM skill WHERE id = ?').get(x.skill.id) as { effetto: string }).effetto), da: x.da })),
  };
}

/**
 * Ricette (per un risultato dato o per qualunque Persona) che consentono di ereditare tutte le skill desiderate.
 * Il bacino degli ingredienti è quello al loro livello base (o della scorta se posseduti nella partita).
 */
export function cercaPerSkillDto(skillIds: number[], opz: OpzioniContesto & { risultatoId?: number }): RicercaSkillDto {
  const { ctx } = contestoDa(opz);
  const skillInfo = skillIds.map((id) => {
    const r = prepared('SELECT id, nome, elemento FROM skill WHERE id = ?').get(id) as { id: number; nome: string; elemento: string } | undefined;
    if (!r) throw httpErrors.notFound('skill-non-trovata', `La skill ${id} non esiste.`);
    return { id: r.id, nome: r.nome, nomeIt: t('skill', r.nome), elemento: r.elemento, elementoNome: t('elementoSkill', r.elemento) };
  });
  const bersagli = opz.risultatoId !== undefined ? [personaOErrore(opz.risultatoId)] : ctx.ammesse.filter((p) => !p.rara);
  const cacheIng = new Map<number, IngredienteEredita & { livello: number; daScorta: boolean }>();
  const ingr = (p: PersonaFusione) => {
    let i = cacheIng.get(p.id);
    if (!i) { i = ingredienteDa(p, opz.partitaId, undefined); cacheIng.set(p.id, i); }
    return i;
  };
  const trovate: Array<{ ricetta: RicettaFusione; slot: number; slotScelti: number; daEreditare: number[]; giaApprese: number[] }> = [];
  for (const target of bersagli) {
    // Filtro rapido: il tipo del risultato deve ammettere ogni skill desiderata (salvo quelle che apprende da sé).
    const tipo = tipoEredita(target.id);
    const proprie = new Set(skillAlLivello(target.id, 99).map((s) => s.id));
    if (skillInfo.some((s) => !proprie.has(s.id) && !elementoEreditabile(tipo, s.elemento))) continue;
    const ricette = ricettePer(target, ctx).filter((r) => opz.livelloMax === undefined || (r.risultato.livello <= opz.livelloMax && r.ingredienti.every((i) => i.livello <= opz.livelloMax!)));
    for (const r of ricette) {
      // Filtro rapido: ogni skill desiderata non propria deve stare nel bacino di almeno un ingrediente.
      const ingredienti = r.ingredienti.map(ingr);
      const bacino = new Set(ingredienti.flatMap((i) => i.skill.map((s) => s.id)));
      if (skillInfo.some((s) => !proprie.has(s.id) && !bacino.has(s.id))) continue;
      const an = analisiEredita(target, ingredienti);
      const esito = copre(an, skillIds);
      if (esito.ok) trovate.push({ ricetta: r, slot: an.slot, slotScelti: an.slotScelti, daEreditare: esito.daEreditare, giaApprese: esito.giaApprese });
    }
  }
  trovate.sort((x, y) => x.ricetta.costo - y.ricetta.costo || x.ricetta.risultato.livello - y.ricetta.risultato.livello);
  const perRisultatoMap = new Map<number, { persona: PersonaFusione; ricette: number; costoMinimo: number }>();
  for (const tr of trovate) {
    const e = perRisultatoMap.get(tr.ricetta.risultato.id);
    if (e) { e.ricette++; e.costoMinimo = Math.min(e.costoMinimo, tr.ricetta.costo); }
    else perRisultatoMap.set(tr.ricetta.risultato.id, { persona: tr.ricetta.risultato, ricette: 1, costoMinimo: tr.ricetta.costo });
  }
  const limite = opz.limite ?? 200;
  return {
    skill: skillInfo,
    risultato: opz.risultatoId !== undefined ? personaDto(personaOErrore(opz.risultatoId)) : null,
    totale: trovate.length,
    ricette: trovate.slice(0, limite).map((tr) => ({ ricetta: ricettaDto(tr.ricetta), slot: tr.slot, slotScelti: tr.slotScelti, daEreditare: tr.daEreditare, giaApprese: tr.giaApprese })),
    perRisultato: [...perRisultatoMap.values()].sort((x, y) => x.costoMinimo - y.costoMinimo).map((e) => ({ persona: personaDto(e.persona), ricette: e.ricette, costoMinimo: e.costoMinimo })),
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
  const sconto = scontoPartita(opz.partitaId).sconto;
  return { persona: personaDto(persona), totale, totaleSenzaFiltri, ricette: ricette.slice(0, limite).map((r) => ricettaScontata(ricettaDto(r), sconto)), dlcPosseduti, livelloMax: opz.livelloMax ?? null, sconto };
}
