// ============================================================
// motoreFusione — fusione diretta (A+B) e inversa (ricette per una Persona), regole Persona 5 Royal
// ============================================================
//
// Regole (riferimento: chinhodado/persona5_calculator, FusionCalculator.ts, Apache-2.0):
//   - speciale: se A+B è una ricetta speciale a due ingredienti → il risultato speciale;
//   - Demone del Tesoro + Persona normale: risultato = Persona dello stesso arcano della normale,
//     spostata di `modificatore` posizioni nell'elenco dell'arcano ordinato per livello (saltando speciali e rari);
//   - arcani diversi: livello = 1 + ⌊(La + Lb)/2⌋, risultato = prima Persona dell'arcano risultante con livello ≥,
//     escluse speciali e rare; stesso arcano: la Persona più alta con livello ≤, esclusi gli ingredienti, speciali e rare;
//   - due Demoni del Tesoro fra loro seguono la fusione normale; Giudizio + (Giustizia/Forza/Carro/Morte) non ha risultato;
//   - costo stimato = Σ ingredienti (27·L² + 126·L + 2147);
//   - le Persona DLC non possedute sono escluse dagli elenchi (cambiano anche gli indici dei Demoni del Tesoro).
// Le Persona speciali si ottengono solo con la loro ricetta; i Demoni del Tesoro non si possono fondere come risultato.
// ============================================================

import { prepared } from '../../db/dbService.js';

export interface PersonaFusione {
  id: number;
  nome: string;
  arcana: string;
  livello: number;
  speciale: boolean;
  rara: boolean;
  dlc: boolean;
  /** Set DLC di appartenenza (null se non DLC). */
  dlcSet: number | null;
}

export type TipoFusione = 'normale' | 'stesso-arcano' | 'tesoro' | 'speciale';

export interface RicettaFusione {
  ingredienti: PersonaFusione[];
  risultato: PersonaFusione;
  tipo: TipoFusione;
  costo: number;
}

interface Snapshot {
  persone: PersonaFusione[];
  perId: Map<number, PersonaFusione>;
  /** arcana A → arcana B → arcana risultato (simmetrica). */
  tabella: Map<string, Map<string, string>>;
  /** risultato id → ingredienti (ordinati). */
  speciali: Map<number, number[]>;
  /** Demoni del Tesoro in ordine canonico. */
  tesori: PersonaFusione[];
  /** arcana → modificatori per tesoro (stesso ordine di `tesori`). */
  modificatori: Map<string, number[]>;
  arcani: string[];
}

let snapshot: Snapshot | null = null;
const contesti = new Map<string, Contesto>();

/** Da chiamare dopo un reseed. */
export function invalidaMotoreFusione(): void {
  snapshot = null;
  contesti.clear();
}

function caricaSnapshot(): Snapshot {
  if (snapshot) return snapshot;
  const righe = prepared(`SELECT p.id, p.nome, p.arcana, p.livello, p.speciale, p.rara, p.dlc, d.set_id
    FROM persona p LEFT JOIN dlc_set_persona d ON d.persona_id = p.id ORDER BY p.livello, p.nome`).all() as Array<{ id: number; nome: string; arcana: string; livello: number; speciale: number; rara: number; dlc: number; set_id: number | null }>;
  const persone: PersonaFusione[] = righe.map((r) => ({ id: r.id, nome: r.nome, arcana: r.arcana, livello: r.livello, speciale: r.speciale === 1, rara: r.rara === 1, dlc: r.dlc === 1, dlcSet: r.set_id }));
  const perId = new Map(persone.map((p) => [p.id, p]));
  const tabella = new Map<string, Map<string, string>>();
  for (const t of prepared('SELECT a, b, risultato FROM fusione_arcana').all() as Array<{ a: string; b: string; risultato: string }>) {
    if (!tabella.has(t.a)) tabella.set(t.a, new Map());
    if (!tabella.has(t.b)) tabella.set(t.b, new Map());
    tabella.get(t.a)!.set(t.b, t.risultato);
    tabella.get(t.b)!.set(t.a, t.risultato);
  }
  const speciali = new Map<number, number[]>();
  for (const r of prepared('SELECT risultato_id, ingrediente_id FROM fusione_speciale_ingrediente ORDER BY risultato_id, ordine').all() as Array<{ risultato_id: number; ingrediente_id: number }>) {
    speciali.set(r.risultato_id, [...(speciali.get(r.risultato_id) ?? []), r.ingrediente_id]);
  }
  const tesori = (prepared('SELECT persona_id FROM tesoro ORDER BY ordine').all() as Array<{ persona_id: number }>).map((t) => perId.get(t.persona_id)!);
  const arcani = (prepared('SELECT chiave FROM arcana ORDER BY ordine').all() as Array<{ chiave: string }>).map((a) => a.chiave);
  const modificatori = new Map<string, number[]>();
  const righeMod = prepared('SELECT arcana, tesoro_id, modificatore FROM tesoro_modificatore').all() as Array<{ arcana: string; tesoro_id: number; modificatore: number }>;
  for (const a of arcani) modificatori.set(a, tesori.map((te) => righeMod.find((m) => m.arcana === a && m.tesoro_id === te.id)?.modificatore ?? 0));
  snapshot = { persone, perId, tabella, speciali, tesori, modificatori, arcani };
  return snapshot;
}

/** Contesto di calcolo: elenchi per arcano filtrati sui DLC posseduti. */
export interface Contesto {
  dlcPosseduti: Set<number>;
  ammesse: PersonaFusione[];
  perArcana: Map<string, PersonaFusione[]>;
  /** ricette speciali a due ingredienti: "idMin-idMax" → risultato. */
  specialiDue: Map<string, PersonaFusione>;
}

/** Crea (o riusa) il contesto per l'insieme di DLC posseduti. */
export function creaContesto(dlcPosseduti: readonly number[] = []): Contesto {
  const chiave = [...new Set(dlcPosseduti)].sort((a, b) => a - b).join(',');
  const esistente = contesti.get(chiave);
  if (esistente) return esistente;
  const s = caricaSnapshot();
  const set = new Set(dlcPosseduti);
  const ammesse = s.persone.filter((p) => !p.dlc || (p.dlcSet !== null && set.has(p.dlcSet)));
  const perArcana = new Map<string, PersonaFusione[]>();
  for (const a of s.arcani) perArcana.set(a, []);
  for (const p of ammesse) perArcana.get(p.arcana)!.push(p); // già ordinate per livello, poi nome
  const ammesseId = new Set(ammesse.map((p) => p.id));
  const specialiDue = new Map<string, PersonaFusione>();
  for (const [risultatoId, ingredienti] of s.speciali) {
    if (ingredienti.length !== 2) continue;
    if (!ingredienti.every((i) => ammesseId.has(i)) || !ammesseId.has(risultatoId)) continue;
    specialiDue.set(chiaveCoppia(ingredienti[0], ingredienti[1]), s.perId.get(risultatoId)!);
  }
  const ctx: Contesto = { dlcPosseduti: set, ammesse, perArcana, specialiDue };
  contesti.set(chiave, ctx);
  return ctx;
}

function chiaveCoppia(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function personaFusione(id: number): PersonaFusione | undefined {
  return caricaSnapshot().perId.get(id);
}

/** Arcano risultante di due arcani, o null se la combinazione non esiste. */
export function arcanaRisultato(a: string, b: string): string | null {
  return caricaSnapshot().tabella.get(a)?.get(b) ?? null;
}

/** Costo stimato in yen di una fusione: somma sugli ingredienti di 27·L² + 126·L + 2147. */
export function costoFusione(ingredienti: readonly PersonaFusione[]): number {
  return ingredienti.reduce((tot, p) => tot + 27 * p.livello * p.livello + 126 * p.livello + 2147, 0);
}

/** Livello di riferimento della fusione a due. */
export function livelloFusione(a: PersonaFusione, b: PersonaFusione): number {
  return 1 + Math.floor((a.livello + b.livello) / 2);
}

function fusioneNormale(a: PersonaFusione, b: PersonaFusione, ctx: Contesto): { risultato: PersonaFusione; tipo: TipoFusione } | null {
  if (a.rara !== b.rara) return null;
  if (ctx.specialiDue.has(chiaveCoppia(a.id, b.id))) return null;
  const arcana = arcanaRisultato(a.arcana, b.arcana);
  if (!arcana) return null;
  const livello = livelloFusione(a, b);
  const lista = ctx.perArcana.get(arcana) ?? [];
  if (a.arcana === b.arcana) {
    for (let i = lista.length - 1; i >= 0; i--) {
      const p = lista[i];
      if (p.livello <= livello && !p.speciale && !p.rara && p.id !== a.id && p.id !== b.id) return { risultato: p, tipo: 'stesso-arcano' };
    }
    return null;
  }
  for (const p of lista) {
    if (p.livello >= livello && !p.speciale && !p.rara) return { risultato: p, tipo: 'normale' };
  }
  return null;
}

function fusioneTesoro(tesoro: PersonaFusione, normale: PersonaFusione, ctx: Contesto): PersonaFusione | null {
  const s = caricaSnapshot();
  const indiceTesoro = s.tesori.findIndex((t) => t.id === tesoro.id);
  if (indiceTesoro < 0) return null;
  let mod = s.modificatori.get(normale.arcana)?.[indiceTesoro] ?? 0;
  if (mod === 0) return null;
  const lista = ctx.perArcana.get(normale.arcana) ?? [];
  const indice = lista.findIndex((p) => p.id === normale.id);
  if (indice < 0) return null;
  let candidato = lista[indice + mod];
  while (candidato && (candidato.speciale || candidato.rara)) {
    mod += mod > 0 ? 1 : -1;
    candidato = lista[indice + mod];
  }
  return candidato ?? null;
}

/** Fusione diretta di due Persona; null se impossibile. */
export function fondi(a: PersonaFusione, b: PersonaFusione, ctx: Contesto): RicettaFusione | null {
  if (a.id === b.id) return null;
  const speciale = ctx.specialiDue.get(chiaveCoppia(a.id, b.id));
  if (speciale) return { ingredienti: [a, b], risultato: speciale, tipo: 'speciale', costo: costoFusione([a, b]) };
  if (a.rara !== b.rara) {
    const tesoro = a.rara ? a : b;
    const normale = a.rara ? b : a;
    const risultato = fusioneTesoro(tesoro, normale, ctx);
    return risultato ? { ingredienti: [a, b], risultato, tipo: 'tesoro', costo: costoFusione([a, b]) } : null;
  }
  const esito = fusioneNormale(a, b, ctx);
  return esito ? { ingredienti: [a, b], risultato: esito.risultato, tipo: esito.tipo, costo: costoFusione([a, b]) } : null;
}

/** Ricetta speciale completa (2+ ingredienti) di una Persona speciale, se ammessa nel contesto. */
export function ricettaSpeciale(target: PersonaFusione, ctx: Contesto): RicettaFusione | null {
  const s = caricaSnapshot();
  const ingredienti = s.speciali.get(target.id);
  if (!ingredienti) return null;
  const persone = ingredienti.map((id) => s.perId.get(id)!);
  const ammesseId = new Set(ctx.ammesse.map((p) => p.id));
  if (!persone.every((p) => ammesseId.has(p.id))) return null;
  return { ingredienti: persone, risultato: target, tipo: 'speciale', costo: costoFusione(persone) };
}

/**
 * Tutte le ricette che producono `target` nel contesto dato (fusione inversa), ordinate per costo.
 * Persona rara → nessuna (non fondibile); speciale → la sua ricetta.
 */
export function ricettePer(target: PersonaFusione, ctx: Contesto): RicettaFusione[] {
  if (target.rara) return [];
  if (target.speciale) {
    const r = ricettaSpeciale(target, ctx);
    return r ? [r] : [];
  }
  const s = caricaSnapshot();
  const ricette: RicettaFusione[] = [];
  const viste = new Set<string>();
  const aggiungi = (r: RicettaFusione | null) => {
    if (!r || r.risultato.id !== target.id) return;
    if (r.ingredienti.some((i) => i.id === target.id)) return;
    const k = chiaveCoppia(r.ingredienti[0].id, r.ingredienti[1].id);
    if (viste.has(k)) return;
    viste.add(k);
    ricette.push({ ...r, ingredienti: [...r.ingredienti].sort((x, y) => y.livello - x.livello || x.nome.localeCompare(y.nome)) });
  };
  // Coppie di arcani che producono l'arcano del target (compreso lo stesso arcano).
  for (const a of s.arcani) {
    for (const b of s.arcani) {
      if (a > b) continue;
      if (arcanaRisultato(a, b) !== target.arcana) continue;
      const la = ctx.perArcana.get(a) ?? [];
      const lb = ctx.perArcana.get(b) ?? [];
      for (let i = 0; i < la.length; i++) {
        for (let j = a === b ? i + 1 : 0; j < lb.length; j++) {
          const p1 = la[i];
          const p2 = lb[j];
          if (p1.rara !== p2.rara) continue; // le fusioni con un Demone del Tesoro sono trattate sotto
          aggiungi(fondi(p1, p2, ctx));
        }
      }
    }
  }
  // Demone del Tesoro + Persona normale dello stesso arcano del target.
  for (const tesoro of s.tesori) {
    if (!ctx.ammesse.includes(tesoro)) continue;
    for (const normale of ctx.perArcana.get(target.arcana) ?? []) {
      if (normale.rara) continue;
      aggiungi(fondi(tesoro, normale, ctx));
    }
  }
  return ricette.sort((x, y) => x.costo - y.costo || x.ingredienti[0].nome.localeCompare(y.ingredienti[0].nome));
}

/** Tutte le fusioni a due in cui `persona` è ingrediente (con ogni altra Persona ammessa), ordinate per livello del risultato. */
export function fusioniCon(persona: PersonaFusione, ctx: Contesto): RicettaFusione[] {
  const out: RicettaFusione[] = [];
  for (const altra of ctx.ammesse) {
    if (altra.id === persona.id) continue;
    const r = fondi(persona, altra, ctx);
    if (r) out.push(r);
  }
  return out.sort((x, y) => x.risultato.livello - y.risultato.livello || x.risultato.nome.localeCompare(y.risultato.nome) || x.ingredienti[1].livello - y.ingredienti[1].livello);
}
