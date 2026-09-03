// ============================================================
// partiteService — partite multiple e tracking (Doti, Confidenti, compendio, Persona possedute)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { t } from './traduzioniService.js';
import { costoDto } from './compendioService.js';
import type {
  CompendioPartitaDto, ConfidentePartitaDto, Difficolta, DoteSocialePartitaDto, ModificaConfidente, ModificaDote, PartitaDto, PersonaPossedutaDto, RangoDoteDto, SkillRiassuntoDto,
} from '../../shared/types.js';

interface RigaPartita {
  id: number; nome: string; note: string; attiva: number; livello_protagonista: number; data_gioco: string | null; difficolta: Difficolta;
  nuova_partita_plus: number; dlc_posseduti_json: string; allarme_attivo: number; created_at: string; updated_at: string;
}

function partitaDto(r: RigaPartita): PartitaDto {
  return {
    id: r.id, nome: r.nome, note: r.note, attiva: r.attiva === 1, livelloProtagonista: r.livello_protagonista, dataGioco: r.data_gioco,
    difficolta: r.difficolta, nuovaPartitaPlus: r.nuova_partita_plus === 1, dlcPosseduti: JSON.parse(r.dlc_posseduti_json) as number[],
    allarmeAttivo: r.allarme_attivo === 1, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function rigaPartita(id: number): RigaPartita {
  const r = prepared('SELECT * FROM partita WHERE id = ?').get(id) as RigaPartita | undefined;
  if (!r) throw httpErrors.notFound('partita-non-trovata', `La partita ${id} non esiste.`);
  return r;
}

// ---- Partite ----

export function elencaPartite(): PartitaDto[] {
  return (prepared('SELECT * FROM partita ORDER BY attiva DESC, updated_at DESC').all() as RigaPartita[]).map(partitaDto);
}

export function partitaAttiva(): PartitaDto | null {
  const r = prepared('SELECT * FROM partita WHERE attiva = 1').get() as RigaPartita | undefined;
  return r ? partitaDto(r) : null;
}

export function leggiPartita(id: number): PartitaDto {
  return partitaDto(rigaPartita(id));
}

/** Campi modificabili di una partita. */
export interface DatiPartita {
  nome?: string;
  note?: string;
  livelloProtagonista?: number;
  dataGioco?: string | null;
  difficolta?: Difficolta;
  nuovaPartitaPlus?: boolean;
  dlcPosseduti?: number[];
  allarmeAttivo?: boolean;
}

/** Crea una partita; se è la prima (o `attiva` è richiesto) diventa attiva. */
export function creaPartita(dati: DatiPartita & { nome: string; attiva?: boolean }): PartitaDto {
  const db = getDb();
  return db.transaction(() => {
    const adesso = nowIso();
    const nessuna = (prepared('SELECT COUNT(*) AS n FROM partita').get() as { n: number }).n === 0;
    const attiva = dati.attiva || nessuna;
    if (attiva) prepared('UPDATE partita SET attiva = 0 WHERE attiva = 1').run();
    const info = prepared(`INSERT INTO partita (nome, note, attiva, livello_protagonista, data_gioco, difficolta, nuova_partita_plus, dlc_posseduti_json, allarme_attivo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      dati.nome, dati.note ?? '', attiva ? 1 : 0, dati.livelloProtagonista ?? 1, dati.dataGioco ?? null, dati.difficolta ?? 'normale',
      dati.nuovaPartitaPlus ? 1 : 0, JSON.stringify(dati.dlcPosseduti ?? []), dati.allarmeAttivo ? 1 : 0, adesso, adesso,
    );
    const id = Number(info.lastInsertRowid);
    // Doti sociali a zero e Confidenti non sbloccati: righe esplicite così il tracking parte completo.
    for (const d of prepared('SELECT chiave FROM dote_sociale').all() as Array<{ chiave: string }>) {
      prepared('INSERT INTO dote_sociale_partita (partita_id, dote_chiave, punti, updated_at) VALUES (?, ?, 0, ?)').run(id, d.chiave, adesso);
    }
    for (const c of prepared('SELECT chiave FROM confidente').all() as Array<{ chiave: string }>) {
      prepared('INSERT INTO confidente_partita (partita_id, confidente_chiave, sbloccato, rango, note, updated_at) VALUES (?, ?, 0, 0, \'\', ?)').run(id, c.chiave, adesso);
    }
    return partitaDto(rigaPartita(id));
  })();
}

export function aggiornaPartita(id: number, dati: DatiPartita): PartitaDto {
  const r = rigaPartita(id);
  prepared(`UPDATE partita SET nome = ?, note = ?, livello_protagonista = ?, data_gioco = ?, difficolta = ?, nuova_partita_plus = ?, dlc_posseduti_json = ?, allarme_attivo = ?, updated_at = ? WHERE id = ?`).run(
    dati.nome ?? r.nome, dati.note ?? r.note, dati.livelloProtagonista ?? r.livello_protagonista,
    dati.dataGioco === undefined ? r.data_gioco : dati.dataGioco, dati.difficolta ?? r.difficolta,
    dati.nuovaPartitaPlus === undefined ? r.nuova_partita_plus : dati.nuovaPartitaPlus ? 1 : 0,
    dati.dlcPosseduti ? JSON.stringify(dati.dlcPosseduti) : r.dlc_posseduti_json,
    dati.allarmeAttivo === undefined ? r.allarme_attivo : dati.allarmeAttivo ? 1 : 0, nowIso(), id,
  );
  return partitaDto(rigaPartita(id));
}

export function attivaPartita(id: number): PartitaDto {
  rigaPartita(id);
  getDb().transaction(() => {
    prepared('UPDATE partita SET attiva = 0 WHERE attiva = 1').run();
    prepared('UPDATE partita SET attiva = 1, updated_at = ? WHERE id = ?').run(nowIso(), id);
  })();
  return partitaDto(rigaPartita(id));
}

export function eliminaPartita(id: number): void {
  const r = rigaPartita(id);
  getDb().transaction(() => {
    prepared('DELETE FROM partita WHERE id = ?').run(id);
    if (r.attiva === 1) {
      // Promuove la partita più recente, se ne resta una.
      const altra = prepared('SELECT id FROM partita ORDER BY updated_at DESC LIMIT 1').get() as { id: number } | undefined;
      if (altra) prepared('UPDATE partita SET attiva = 1 WHERE id = ?').run(altra.id);
    }
  })();
}

// ---- Doti sociali ----

/** Punti per numero di note (stadio normale); 3 note da libro = 7; ×1,5 arrotondato per difetto. */
export function puntiDaNote(note: 1 | 2 | 3, libro = false, fortuna = false): number {
  const base = note === 1 ? 2 : note === 2 ? 3 : libro ? 7 : 5;
  return fortuna ? Math.floor(base * 1.5) : base;
}

function ranghiDote(chiave: string): RangoDoteDto[] {
  return (prepared('SELECT rango, nome, soglia FROM dote_sociale_rango WHERE dote_chiave = ? ORDER BY rango').all(chiave) as Array<{ rango: number; nome: string; soglia: number }>)
    .map((r) => ({ rango: r.rango, nome: t('rangoDote', `${chiave}/${r.rango}`), soglia: r.soglia }));
}

/** Rango raggiunto con `punti` e distanza dal successivo. */
export function progressoDote(punti: number, ranghi: RangoDoteDto[]): { rango: number; nomeRango: string; sogliaProssima: number | null; mancanti: number | null } {
  let attuale = ranghi[0] ?? { rango: 1, nome: '', soglia: 0 };
  for (const r of ranghi) if (punti >= r.soglia) attuale = r;
  const prossimo = ranghi.find((r) => r.rango === attuale.rango + 1) ?? null;
  return { rango: attuale.rango, nomeRango: attuale.nome, sogliaProssima: prossimo?.soglia ?? null, mancanti: prossimo ? prossimo.soglia - punti : null };
}

export function dotiSociali(partitaId: number): DoteSocialePartitaDto[] {
  rigaPartita(partitaId);
  return (prepared(`SELECT d.chiave, d.nome, d.ordine, COALESCE(dp.punti, 0) AS punti, dp.updated_at
    FROM dote_sociale d LEFT JOIN dote_sociale_partita dp ON dp.dote_chiave = d.chiave AND dp.partita_id = ? ORDER BY d.ordine`).all(partitaId) as Array<{ chiave: string; nome: string; ordine: number; punti: number; updated_at: string | null }>)
    .map((d) => {
      const ranghi = ranghiDote(d.chiave);
      return { chiave: d.chiave, nome: t('doteSociale', d.chiave), ordine: d.ordine, punti: d.punti, ...progressoDote(d.punti, ranghi), ranghi, updatedAt: d.updated_at };
    });
}

/** Imposta (`punti`), incrementa (`delta`) o aggiunge le `note` visualizzate in gioco; mai sotto zero. */
export function aggiornaDote(partitaId: number, chiave: string, mod: ModificaDote): DoteSocialePartitaDto {
  rigaPartita(partitaId);
  const dote = prepared('SELECT chiave FROM dote_sociale WHERE chiave = ?').get(chiave);
  if (!dote) throw httpErrors.notFound('dote-non-trovata', `La dote sociale '${chiave}' non esiste.`);
  const attuale = (prepared('SELECT punti FROM dote_sociale_partita WHERE partita_id = ? AND dote_chiave = ?').get(partitaId, chiave) as { punti: number } | undefined)?.punti ?? 0;
  const incremento = mod.note !== undefined ? puntiDaNote(mod.note, mod.libro, mod.fortuna) : (mod.delta ?? 0);
  const nuovo = Math.max(0, mod.punti !== undefined ? mod.punti : attuale + incremento);
  prepared('INSERT INTO dote_sociale_partita (partita_id, dote_chiave, punti, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, dote_chiave) DO UPDATE SET punti = excluded.punti, updated_at = excluded.updated_at').run(partitaId, chiave, nuovo, nowIso());
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  return dotiSociali(partitaId).find((d) => d.chiave === chiave)!;
}

// ---- Confidenti ----

/** Arrotonda ai centesimi (5 × 1,5 × 1,2 = 9; 7,5 resta 7,5): evita residui binari. */
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Punti Confidente come nel gioco: ogni risposta vale 5/10/15 punti base (1–3 note), un regalo gradito 50,
 * un'uscita senza salto di rango 10; moltiplicatori cumulativi: Persona dello stesso arcano ×1,5,
 * esami (primo ×1,5, top 10 ×1,2), invito accettato subito via SMS ×1,2.
 */
export function puntiConfidente(mod: ModificaConfidente): number {
  const base = mod.regalo ? 50 : mod.uscita ? 10 : mod.noteRisposta !== undefined ? mod.noteRisposta * 5 : 0;
  const molt = (mod.bonusArcano ? 1.5 : 1) * (mod.esame === 'primo' ? 1.5 : mod.esame === 'top10' ? 1.2 : 1) * (mod.invito ? 1.2 : 1);
  return round2(base * molt);
}

export function confidenti(partitaId: number): ConfidentePartitaDto[] {
  rigaPartita(partitaId);
  return (prepared(`SELECT c.chiave, c.nome, c.arcana, c.ordine, COALESCE(cp.sbloccato, 0) AS sbloccato, COALESCE(cp.rango, 0) AS rango, COALESCE(cp.punti, 0) AS punti,
      COALESCE(cp.note, '') AS note, cp.updated_at, cr.punti_necessari,
      EXISTS (SELECT 1 FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id WHERE pp.partita_id = ? AND p.arcana = c.arcana) AS in_scorta
    FROM confidente c
    LEFT JOIN confidente_partita cp ON cp.confidente_chiave = c.chiave AND cp.partita_id = ?
    LEFT JOIN confidente_rango cr ON cr.confidente_chiave = c.chiave AND cr.rango = COALESCE(cp.rango, 0)
    ORDER BY c.ordine`).all(partitaId, partitaId) as Array<{ chiave: string; nome: string; arcana: string; ordine: number; sbloccato: number; rango: number; punti: number; note: string; updated_at: string | null; punti_necessari: number | null; in_scorta: number }>)
    .map((c) => ({
      chiave: c.chiave, nome: c.nome, arcana: c.arcana, arcanaNome: t('arcana', c.arcana), ordine: c.ordine, sbloccato: c.sbloccato === 1, rango: c.rango,
      punti: c.punti, puntiNecessari: c.rango >= 10 ? null : c.punti_necessari,
      mancanti: c.rango >= 10 || c.punti_necessari === null ? null : round2(Math.max(0, c.punti_necessari - c.punti)),
      personaArcanoInScorta: c.in_scorta === 1,
      note: c.note, updatedAt: c.updated_at,
    }));
}

export function aggiornaConfidente(partitaId: number, chiave: string, dati: ModificaConfidente): ConfidentePartitaDto {
  rigaPartita(partitaId);
  if (!prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(chiave)) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${chiave}' non esiste.`);
  const attuale = confidenti(partitaId).find((c) => c.chiave === chiave)!;
  const rango = dati.rango ?? attuale.rango;
  // Invariante: un rango > 0 implica lo sblocco (anche se il client manda sbloccato=false).
  const sbloccato = rango > 0 ? true : (dati.sbloccato ?? attuale.sbloccato);
  // Punti verso il rango successivo: al cambio di rango ripartono da zero (nessun riporto, come nel gioco), salvo valore esplicito.
  const incremento = (dati.deltaPunti ?? 0) + puntiConfidente(dati);
  let punti = dati.punti !== undefined ? dati.punti : rango !== attuale.rango ? 0 : attuale.punti + incremento;
  punti = round2(Math.max(0, punti));
  prepared(`INSERT INTO confidente_partita (partita_id, confidente_chiave, sbloccato, rango, punti, note, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(partita_id, confidente_chiave) DO UPDATE SET sbloccato = excluded.sbloccato, rango = excluded.rango, punti = excluded.punti, note = excluded.note, updated_at = excluded.updated_at`)
    .run(partitaId, chiave, sbloccato ? 1 : 0, rango, punti, dati.note ?? attuale.note, nowIso());
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  return confidenti(partitaId).find((c) => c.chiave === chiave)!;
}

// ---- Compendio personale ----

export function compendioPartita(partitaId: number): CompendioPartitaDto[] {
  rigaPartita(partitaId);
  return (prepared(`SELECT cp.persona_id, p.nome, p.arcana, p.livello, cp.registrata, cp.livello_registrato, cp.updated_at
    FROM compendio_partita cp JOIN persona p ON p.id = cp.persona_id WHERE cp.partita_id = ? ORDER BY p.livello, p.nome`).all(partitaId) as Array<{ persona_id: number; nome: string; arcana: string; livello: number; registrata: number; livello_registrato: number | null; updated_at: string }>)
    .map((r) => ({ personaId: r.persona_id, nome: r.nome, arcana: r.arcana, arcanaNome: t('arcana', r.arcana), livello: r.livello, registrata: r.registrata === 1, livelloRegistrato: r.livello_registrato, updatedAt: r.updated_at }));
}

export function aggiornaCompendio(partitaId: number, personaId: number, dati: { registrata: boolean; livelloRegistrato?: number | null }): CompendioPartitaDto[] {
  rigaPartita(partitaId);
  if (!prepared('SELECT 1 FROM persona WHERE id = ?').get(personaId)) throw httpErrors.notFound('persona-non-trovata', `La Persona ${personaId} non esiste.`);
  if (!dati.registrata) {
    prepared('DELETE FROM compendio_partita WHERE partita_id = ? AND persona_id = ?').run(partitaId, personaId);
  } else {
    prepared(`INSERT INTO compendio_partita (partita_id, persona_id, registrata, livello_registrato, updated_at) VALUES (?, ?, 1, ?, ?)
      ON CONFLICT(partita_id, persona_id) DO UPDATE SET registrata = 1, livello_registrato = excluded.livello_registrato, updated_at = excluded.updated_at`).run(partitaId, personaId, dati.livelloRegistrato ?? null, nowIso());
  }
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  return compendioPartita(partitaId);
}

// ---- Persona possedute ----

interface RigaPosseduta {
  id: number; partita_id: number; persona_id: number; livello: number; forza: number | null; magia: number | null; resistenza: number | null;
  agilita: number | null; fortuna: number | null; tratto_skill_id: number | null; in_squadra: number; note: string; created_at: string; updated_at: string;
  nome: string; arcana: string; livello_base: number; b_forza: number; b_magia: number; b_resistenza: number; b_agilita: number; b_fortuna: number; tratto_nome: string;
}

const SQL_POSSEDUTA = `SELECT pp.*, p.nome, p.arcana, p.livello AS livello_base, p.forza AS b_forza, p.magia AS b_magia, p.resistenza AS b_resistenza,
  p.agilita AS b_agilita, p.fortuna AS b_fortuna, p.tratto AS tratto_nome FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id`;

function skillDto(id: number): SkillRiassuntoDto | null {
  const s = prepared('SELECT * FROM skill WHERE id = ?').get(id) as { id: number; nome: string; elemento: string; costo_tipo: 'sp' | 'hp' | 'nessuno'; costo_valore: number; effetto: string } | undefined;
  if (!s) return null;
  return { id: s.id, nome: s.nome, elemento: s.elemento, elementoNome: t('elementoSkill', s.elemento), costo: costoDto(s.costo_tipo, s.costo_valore), effetto: s.effetto, effettoNome: t('effettoSkill', s.effetto) };
}

function possedutaDto(r: RigaPosseduta): PersonaPossedutaDto {
  const trattoId = r.tratto_skill_id ?? (prepared('SELECT id FROM skill WHERE nome = ?').get(r.tratto_nome) as { id: number } | undefined)?.id ?? null;
  const skill = (prepared('SELECT slot, skill_id FROM persona_posseduta_skill WHERE posseduta_id = ? ORDER BY slot').all(r.id) as Array<{ slot: number; skill_id: number }>)
    .map((s) => ({ slot: s.slot, ...skillDto(s.skill_id)! }));
  const statisticheBase = r.forza === null && r.magia === null && r.resistenza === null && r.agilita === null && r.fortuna === null;
  return {
    id: r.id, personaId: r.persona_id, nome: r.nome, arcana: r.arcana, arcanaNome: t('arcana', r.arcana), livelloBase: r.livello_base, livello: r.livello,
    statistiche: { forza: r.forza ?? r.b_forza, magia: r.magia ?? r.b_magia, resistenza: r.resistenza ?? r.b_resistenza, agilita: r.agilita ?? r.b_agilita, fortuna: r.fortuna ?? r.b_fortuna },
    statisticheBase, tratto: trattoId ? skillDto(trattoId) : null, inSquadra: r.in_squadra === 1, note: r.note, skill, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export function personePossedute(partitaId: number): PersonaPossedutaDto[] {
  rigaPartita(partitaId);
  return (prepared(`${SQL_POSSEDUTA} WHERE pp.partita_id = ? ORDER BY pp.in_squadra DESC, pp.livello DESC, p.nome`).all(partitaId) as RigaPosseduta[]).map(possedutaDto);
}

/** Dati di una Persona posseduta (creazione/aggiornamento). */
export interface DatiPosseduta {
  livello?: number;
  statistiche?: { forza: number; magia: number; resistenza: number; agilita: number; fortuna: number } | null;
  trattoSkillId?: number | null;
  inSquadra?: boolean;
  note?: string;
  /** Skill conosciute, in ordine di slot (max 8). */
  skillIds?: number[];
}

function verificaSkill(skillIds: number[] | undefined): void {
  if (!skillIds) return;
  if (skillIds.length > 8) throw httpErrors.badRequest('troppe-skill', 'Una Persona può conoscere al massimo 8 skill.');
  if (new Set(skillIds).size !== skillIds.length) throw httpErrors.badRequest('skill-duplicata', 'La stessa skill compare più volte.');
  for (const id of skillIds) if (!prepared('SELECT 1 FROM skill WHERE id = ?').get(id)) throw httpErrors.notFound('skill-non-trovata', `La skill ${id} non esiste.`);
}

export function aggiungiPosseduta(partitaId: number, personaId: number, dati: DatiPosseduta): PersonaPossedutaDto {
  rigaPartita(partitaId);
  const p = prepared('SELECT id, livello FROM persona WHERE id = ?').get(personaId) as { id: number; livello: number } | undefined;
  if (!p) throw httpErrors.notFound('persona-non-trovata', `La Persona ${personaId} non esiste.`);
  if (prepared('SELECT 1 FROM persona_posseduta WHERE partita_id = ? AND persona_id = ?').get(partitaId, personaId)) {
    throw httpErrors.conflict('persona-gia-posseduta', 'Questa Persona è già nella scorta della partita.');
  }
  verificaSkill(dati.skillIds);
  if (dati.trattoSkillId && !prepared("SELECT 1 FROM skill WHERE id = ? AND elemento = 'trait'").get(dati.trattoSkillId)) throw httpErrors.badRequest('tratto-non-valido', 'Il tratto indicato non è una skill di tipo tratto.');
  const adesso = nowIso();
  return getDb().transaction(() => {
    const s = dati.statistiche ?? null;
    const info = prepared(`INSERT INTO persona_posseduta (partita_id, persona_id, livello, forza, magia, resistenza, agilita, fortuna, tratto_skill_id, in_squadra, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(partitaId, personaId, dati.livello ?? p.livello, s?.forza ?? null, s?.magia ?? null, s?.resistenza ?? null, s?.agilita ?? null, s?.fortuna ?? null,
      dati.trattoSkillId ?? null, dati.inSquadra === false ? 0 : 1, dati.note ?? '', adesso, adesso);
    const id = Number(info.lastInsertRowid);
    const skillIds = dati.skillIds ?? skillInnateFinoAlLivello(personaId, dati.livello ?? p.livello);
    skillIds.forEach((sid, i) => prepared('INSERT INTO persona_posseduta_skill (posseduta_id, slot, skill_id) VALUES (?, ?, ?)').run(id, i + 1, sid));
    // Aggiunta alla scorta = registrata nel compendio.
    prepared(`INSERT INTO compendio_partita (partita_id, persona_id, registrata, livello_registrato, updated_at) VALUES (?, ?, 1, ?, ?)
      ON CONFLICT(partita_id, persona_id) DO UPDATE SET registrata = 1, livello_registrato = MAX(COALESCE(compendio_partita.livello_registrato, 0), excluded.livello_registrato), updated_at = excluded.updated_at`).run(partitaId, personaId, dati.livello ?? p.livello, adesso);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    return possedutaDto(prepared(`${SQL_POSSEDUTA} WHERE pp.id = ?`).get(id) as RigaPosseduta);
  })();
}

/** Le ultime 8 skill che la Persona ha appreso fino al livello dato (innate comprese). */
export function skillInnateFinoAlLivello(personaId: number, livello: number): number[] {
  const righe = prepared('SELECT skill_id FROM persona_skill WHERE persona_id = ? AND livello <= ? ORDER BY livello, skill_id').all(personaId, livello) as Array<{ skill_id: number }>;
  return righe.slice(-8).map((r) => r.skill_id);
}

export function aggiornaPosseduta(partitaId: number, possedutaId: number, dati: DatiPosseduta): PersonaPossedutaDto {
  rigaPartita(partitaId);
  const r = prepared(`${SQL_POSSEDUTA} WHERE pp.id = ? AND pp.partita_id = ?`).get(possedutaId, partitaId) as RigaPosseduta | undefined;
  if (!r) throw httpErrors.notFound('posseduta-non-trovata', `La Persona posseduta ${possedutaId} non esiste in questa partita.`);
  verificaSkill(dati.skillIds);
  if (dati.trattoSkillId && !prepared("SELECT 1 FROM skill WHERE id = ? AND elemento = 'trait'").get(dati.trattoSkillId)) throw httpErrors.badRequest('tratto-non-valido', 'Il tratto indicato non è una skill di tipo tratto.');
  const adesso = nowIso();
  return getDb().transaction(() => {
    const s = dati.statistiche === undefined ? undefined : dati.statistiche;
    prepared(`UPDATE persona_posseduta SET livello = ?, forza = ?, magia = ?, resistenza = ?, agilita = ?, fortuna = ?, tratto_skill_id = ?, in_squadra = ?, note = ?, updated_at = ? WHERE id = ?`).run(
      dati.livello ?? r.livello,
      s === undefined ? r.forza : s?.forza ?? null, s === undefined ? r.magia : s?.magia ?? null, s === undefined ? r.resistenza : s?.resistenza ?? null,
      s === undefined ? r.agilita : s?.agilita ?? null, s === undefined ? r.fortuna : s?.fortuna ?? null,
      dati.trattoSkillId === undefined ? r.tratto_skill_id : dati.trattoSkillId, dati.inSquadra === undefined ? r.in_squadra : dati.inSquadra ? 1 : 0,
      dati.note ?? r.note, adesso, possedutaId,
    );
    if (dati.skillIds) {
      prepared('DELETE FROM persona_posseduta_skill WHERE posseduta_id = ?').run(possedutaId);
      dati.skillIds.forEach((sid, i) => prepared('INSERT INTO persona_posseduta_skill (posseduta_id, slot, skill_id) VALUES (?, ?, ?)').run(possedutaId, i + 1, sid));
    }
    if (dati.livello !== undefined) {
      prepared(`INSERT INTO compendio_partita (partita_id, persona_id, registrata, livello_registrato, updated_at) VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(partita_id, persona_id) DO UPDATE SET livello_registrato = MAX(COALESCE(compendio_partita.livello_registrato, 0), excluded.livello_registrato), updated_at = excluded.updated_at`).run(partitaId, r.persona_id, dati.livello, adesso);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    return possedutaDto(prepared(`${SQL_POSSEDUTA} WHERE pp.id = ?`).get(possedutaId) as RigaPosseduta);
  })();
}

export function rimuoviPosseduta(partitaId: number, possedutaId: number): void {
  rigaPartita(partitaId);
  const info = prepared('DELETE FROM persona_posseduta WHERE id = ? AND partita_id = ?').run(possedutaId, partitaId);
  if (info.changes === 0) throw httpErrors.notFound('posseduta-non-trovata', `La Persona posseduta ${possedutaId} non esiste in questa partita.`);
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
}
