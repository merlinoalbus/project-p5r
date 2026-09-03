// ============================================================
// eredita — eredità delle skill nelle fusioni (Fase 3), regole Persona 5 Royal
// ============================================================
//
// Fonti: Megami Tensei Wiki «Skill Inheritance» (sezione Persona 5 / Royal, con riferimento ai wiki giapponesi
// wikiwiki.jp/persona5 e /persona5r), guida allgamestaff «Stanza di Velluto», matrice di eredità del dataset chinhodado.
//   - Slot ereditabili in base al totale delle skill dei genitori: 3–5 → 1, 6–8 → 2, 9–12 → 3, 13–23 → 4, 24–31 → 5,
//     32–41 → 6, 42 → 8. Le skill duplicate o incompatibili riducono il bacino, non gli slot. Una skill è sempre scelta a caso
//     dal gioco: quelle scelte a mano sono slot − 1.
//   - Tipo di eredità del risultato × elemento della skill (matrice `eredita_matrice`); supporto, passive e quasi-divine
//     sono sempre ereditabili; le skill «arma da fuoco» seguono le fisiche (colonna `gun` della matrice).
//   - Tratti (Royal): il risultato può ereditare UN tratto fra quelli degli ingredienti, oppure tenere il proprio.
//   - Skill uniche (`skill.unica`) non si ereditano. Il bacino di un ingrediente è l'insieme delle sue skill al livello dato
//     (innate + apprese fino a quel livello); per una Persona della scorta si usano le skill effettivamente possedute.
// ============================================================

import { prepared } from '../../db/dbService.js';
import type { PersonaFusione } from './motoreFusione.js';

export interface SkillEredita {
  id: number;
  nome: string;
  elemento: string;
  /** Skill esclusiva (mai ereditabile). */
  unica: boolean;
}

interface SnapshotEredita {
  skill: Map<number, SkillEredita>;
  /** persona id → skill apprese con livello (0 = innata). */
  apprese: Map<number, Array<{ skill: SkillEredita; livello: number }>>;
  /** persona id → tratto (skill di tipo trait). */
  tratto: Map<number, SkillEredita | null>;
  /** persona id → tipo di eredità (null per i Demoni del Tesoro). */
  tipo: Map<number, string | null>;
  /** tipo → elemento → ammesso. */
  matrice: Map<string, Map<string, boolean>>;
}

let snapshot: SnapshotEredita | null = null;

export function invalidaEredita(): void {
  snapshot = null;
}

function carica(): SnapshotEredita {
  if (snapshot) return snapshot;
  const skill = new Map<number, SkillEredita>();
  for (const r of prepared('SELECT id, nome, elemento, unica FROM skill').all() as Array<{ id: number; nome: string; elemento: string; unica: string | null }>) {
    skill.set(r.id, { id: r.id, nome: r.nome, elemento: r.elemento, unica: r.unica !== null });
  }
  const apprese = new Map<number, Array<{ skill: SkillEredita; livello: number }>>();
  for (const r of prepared('SELECT persona_id, skill_id, livello FROM persona_skill ORDER BY persona_id, livello, skill_id').all() as Array<{ persona_id: number; skill_id: number; livello: number }>) {
    const s = skill.get(r.skill_id);
    if (!s) continue;
    apprese.set(r.persona_id, [...(apprese.get(r.persona_id) ?? []), { skill: s, livello: r.livello }]);
  }
  const tratto = new Map<number, SkillEredita | null>();
  const tipo = new Map<number, string | null>();
  for (const r of prepared('SELECT p.id, p.eredita, s.id AS tratto_id FROM persona p LEFT JOIN skill s ON s.nome = p.tratto AND s.elemento = \'trait\'').all() as Array<{ id: number; eredita: string | null; tratto_id: number | null }>) {
    tipo.set(r.id, r.eredita);
    tratto.set(r.id, r.tratto_id !== null ? skill.get(r.tratto_id) ?? null : null);
  }
  const matrice = new Map<string, Map<string, boolean>>();
  for (const r of prepared('SELECT tipo, elemento, ammesso FROM eredita_matrice').all() as Array<{ tipo: string; elemento: string; ammesso: number }>) {
    if (!matrice.has(r.tipo)) matrice.set(r.tipo, new Map());
    matrice.get(r.tipo)!.set(r.elemento, r.ammesso === 1);
  }
  snapshot = { skill, apprese, tratto, tipo, matrice };
  return snapshot;
}

/** Slot ereditabili dal totale delle skill dei genitori (tabella P5/P5R). */
export function slotEreditabili(totaleSkillGenitori: number): number {
  if (totaleSkillGenitori >= 42) return 8;
  if (totaleSkillGenitori >= 32) return 6;
  if (totaleSkillGenitori >= 24) return 5;
  if (totaleSkillGenitori >= 13) return 4;
  if (totaleSkillGenitori >= 9) return 3;
  if (totaleSkillGenitori >= 6) return 2;
  if (totaleSkillGenitori >= 3) return 1;
  return 0;
}

/** Elementi sempre ereditabili, indipendentemente dal tipo. */
const SEMPRE = new Set(['support', 'passive', 'almighty']);

/** true se una Persona con tipo di eredità `tipo` può ereditare una skill dell'elemento dato. */
export function elementoEreditabile(tipo: string | null, elemento: string): boolean {
  if (elemento === 'trait') return false; // i tratti seguono la regola dedicata
  if (SEMPRE.has(elemento)) return true;
  if (tipo === null) return false; // Demoni del Tesoro: non risultato di fusione
  const riga = carica().matrice.get(tipo);
  if (!riga) return false;
  return riga.get(elemento) ?? false;
}

/** Skill possedute da una Persona al livello dato: innate (livello 0) più quelle apprese fino a `livello`. */
export function skillAlLivello(personaId: number, livello: number): SkillEredita[] {
  return (carica().apprese.get(personaId) ?? []).filter((a) => a.livello === 0 || a.livello <= livello).map((a) => a.skill);
}

/** Skill di una Persona posseduta nella scorta (quelle registrate), oppure quelle al suo livello se non registrate. */
export function skillPosseduta(possedutaId: number): SkillEredita[] {
  const righe = prepared('SELECT skill_id FROM persona_posseduta_skill WHERE posseduta_id = ? ORDER BY slot').all(possedutaId) as Array<{ skill_id: number }>;
  const s = carica();
  return righe.map((r) => s.skill.get(r.skill_id)).filter((x): x is SkillEredita => !!x);
}

export function trattoDi(personaId: number): SkillEredita | null {
  return carica().tratto.get(personaId) ?? null;
}

export function tipoEredita(personaId: number): string | null {
  return carica().tipo.get(personaId) ?? null;
}

export interface IngredienteEredita {
  persona: PersonaFusione;
  /** Skill dell'ingrediente considerate (scorta o livello). */
  skill: SkillEredita[];
}

export interface SkillCandidata extends SkillEredita {
  /** Ingredienti che la portano. */
  da: number[];
  /** Ereditabile dal risultato (tipo compatibile, non unica, non già appresa). */
  ereditabile: boolean;
  /** Il risultato la apprende comunque da sé (a un certo livello). */
  giaAppresa: boolean;
  motivo: string | null;
}

export interface AnalisiEredita {
  risultato: PersonaFusione;
  tipo: string | null;
  totaleSkillGenitori: number;
  slot: number;
  /** Skill scelte a mano: slot − 1 (una è casuale), minimo 0. */
  slotScelti: number;
  candidate: SkillCandidata[];
  /** Tratti selezionabili: quelli degli ingredienti più quello del risultato. */
  tratti: Array<{ skill: SkillEredita; da: number | null }>;
}

/** Analisi completa dell'eredità di una fusione: bacino, compatibilità, slot, tratti. */
export function analisiEredita(risultato: PersonaFusione, ingredienti: IngredienteEredita[]): AnalisiEredita {
  const tipo = tipoEredita(risultato.id);
  const totale = ingredienti.reduce((t, i) => t + i.skill.length, 0);
  const slot = slotEreditabili(totale);
  const appreseDalRisultato = new Set(skillAlLivello(risultato.id, 99).map((s) => s.id));
  const perSkill = new Map<number, SkillCandidata>();
  for (const ing of ingredienti) {
    for (const s of ing.skill) {
      if (s.elemento === 'trait') continue;
      const c = perSkill.get(s.id);
      if (c) {
        if (!c.da.includes(ing.persona.id)) c.da.push(ing.persona.id);
        continue;
      }
      let motivo: string | null = null;
      if (s.unica) motivo = 'skill esclusiva: non si eredita';
      else if (!elementoEreditabile(tipo, s.elemento)) motivo = 'incompatibile con il tipo di eredità del risultato';
      const giaAppresa = appreseDalRisultato.has(s.id);
      if (!motivo && giaAppresa) motivo = 'il risultato la apprende comunque da sé';
      perSkill.set(s.id, { ...s, da: [ing.persona.id], ereditabile: motivo === null || (giaAppresa && !s.unica && elementoEreditabile(tipo, s.elemento)), giaAppresa, motivo });
    }
  }
  const candidate = [...perSkill.values()].sort((a, b) => Number(b.ereditabile) - Number(a.ereditabile) || a.nome.localeCompare(b.nome));
  const tratti: AnalisiEredita['tratti'] = [];
  const proprio = trattoDi(risultato.id);
  if (proprio) tratti.push({ skill: proprio, da: null });
  for (const ing of ingredienti) {
    const t = trattoDi(ing.persona.id);
    if (t && !tratti.some((x) => x.skill.id === t.id)) tratti.push({ skill: t, da: ing.persona.id });
  }
  return { risultato, tipo, totaleSkillGenitori: totale, slot, slotScelti: Math.max(0, slot - 1), candidate, tratti };
}

/**
 * Verifica se una ricetta consente di ereditare TUTTE le skill desiderate: ereditabili dal tipo del risultato, presenti
 * nel bacino degli ingredienti (o già apprese dal risultato, che le avrà comunque) e in numero ≤ slot scelti a mano.
 */
export function copre(analisi: AnalisiEredita, skillDesiderate: readonly number[]): { ok: boolean; mancanti: number[]; daEreditare: number[]; giaApprese: number[] } {
  const mancanti: number[] = [];
  const daEreditare: number[] = [];
  const giaApprese: number[] = [];
  for (const id of skillDesiderate) {
    const c = analisi.candidate.find((x) => x.id === id);
    if (c?.giaAppresa) giaApprese.push(id);
    else if (c && c.ereditabile) daEreditare.push(id);
    else if (skillAlLivello(analisi.risultato.id, 99).some((s) => s.id === id)) giaApprese.push(id);
    else mancanti.push(id);
  }
  return { ok: mancanti.length === 0 && daEreditare.length <= analisi.slotScelti, mancanti, daEreditare, giaApprese };
}
