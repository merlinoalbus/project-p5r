// ============================================================
// obiettiviService — obiettivi della partita: Persona da ottenere con skill desiderate e livello minimo (Fase 5.2)
// ============================================================
//
// Non importa partiteService (che a sua volta chiama `verificaObiettivi` dopo ogni modifica della scorta):
// usa solo il DB, le traduzioni e lo storico.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { t } from './traduzioniService.js';
import { skillDto } from './compendioService.js';
import { registraEvento } from './storicoService.js';
import type { ObiettivoDto, SkillRiassuntoDto, StatoObiettivo } from '../../shared/types.js';

interface RigaObiettivo {
  id: number; partita_id: number; persona_id: number; skill_json: string; livello_min: number | null; priorita: number; stato: StatoObiettivo; note: string;
  raggiunto_at: string | null; created_at: string; updated_at: string; nome: string; arcana: string; livello: number; speciale: number; rara: number; dlc: number;
}

const SQL_OBIETTIVO = `SELECT o.*, p.nome, p.arcana, p.livello, p.speciale, p.rara, p.dlc FROM obiettivo_partita o JOIN persona p ON p.id = o.persona_id`;

/** Dati di creazione/aggiornamento. */
export interface DatiObiettivo {
  skillIds?: number[];
  livelloMin?: number | null;
  priorita?: number;
  stato?: StatoObiettivo;
  note?: string;
}

interface Posseduta { id: number; livello: number; skill: number[] }

function possedutaDi(partitaId: number, personaId: number): Posseduta | null {
  const r = prepared('SELECT id, livello FROM persona_posseduta WHERE partita_id = ? AND persona_id = ?').get(partitaId, personaId) as { id: number; livello: number } | undefined;
  if (!r) return null;
  const skill = (prepared('SELECT skill_id FROM persona_posseduta_skill WHERE posseduta_id = ?').all(r.id) as Array<{ skill_id: number }>).map((x) => x.skill_id);
  return { id: r.id, livello: r.livello, skill };
}

/** Avanzamento rispetto alla scorta: Persona posseduta, livello e skill mancanti. */
function avanzamento(partitaId: number, personaId: number, skillIds: number[], livelloMin: number | null) {
  const p = possedutaDi(partitaId, personaId);
  if (!p) return { possedutaId: null, livelloAttuale: null, skillMancanti: skillIds, livelloRaggiunto: false, soddisfatto: false };
  const skillMancanti = skillIds.filter((id) => !p.skill.includes(id));
  const livelloRaggiunto = livelloMin === null || p.livello >= livelloMin;
  return { possedutaId: p.id, livelloAttuale: p.livello, skillMancanti, livelloRaggiunto, soddisfatto: skillMancanti.length === 0 && livelloRaggiunto };
}

function obiettivoDto(r: RigaObiettivo): ObiettivoDto {
  const skillIds = JSON.parse(r.skill_json) as number[];
  const skill = skillIds.map((id) => skillDto(id)).filter((s): s is SkillRiassuntoDto => s !== null);
  const av = avanzamento(r.partita_id, r.persona_id, skillIds, r.livello_min);
  return {
    id: r.id, personaId: r.persona_id, nome: r.nome, nomeIt: t('persona', r.nome), arcana: r.arcana, arcanaNome: t('arcana', r.arcana), livelloBase: r.livello,
    speciale: r.speciale === 1, rara: r.rara === 1, dlc: r.dlc === 1,
    skill, livelloMin: r.livello_min, priorita: r.priorita, stato: r.stato, note: r.note,
    possedutaId: av.possedutaId, livelloAttuale: av.livelloAttuale, skillMancanti: skill.filter((s) => av.skillMancanti.includes(s.id)), livelloRaggiunto: av.livelloRaggiunto, soddisfatto: av.soddisfatto,
    raggiuntoAt: r.raggiunto_at, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function rigaObiettivo(partitaId: number, id: number): RigaObiettivo {
  const r = prepared(`${SQL_OBIETTIVO} WHERE o.id = ? AND o.partita_id = ?`).get(id, partitaId) as RigaObiettivo | undefined;
  if (!r) throw httpErrors.notFound('obiettivo-non-trovato', `L'obiettivo ${id} non esiste in questa partita.`);
  return r;
}

function verificaPartita(partitaId: number): void {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
}

function verificaSkill(skillIds: number[] | undefined): void {
  if (!skillIds) return;
  if (skillIds.length > 8) throw httpErrors.badRequest('troppe-skill', 'Un obiettivo può indicare al massimo 8 skill.');
  if (new Set(skillIds).size !== skillIds.length) throw httpErrors.badRequest('skill-duplicata', 'La stessa skill compare più volte.');
  for (const id of skillIds) {
    const s = prepared('SELECT elemento FROM skill WHERE id = ?').get(id) as { elemento: string } | undefined;
    if (!s) throw httpErrors.notFound('skill-non-trovata', `La skill ${id} non esiste.`);
    if (s.elemento === 'trait') throw httpErrors.badRequest('skill-tratto', 'I tratti non si ereditano: non possono essere skill desiderate.');
  }
}

/** Obiettivi della partita: aperti per priorità, poi raggiunti e annullati per data. */
export function obiettivi(partitaId: number, stato?: StatoObiettivo): ObiettivoDto[] {
  verificaPartita(partitaId);
  const righe = (stato
    ? prepared(`${SQL_OBIETTIVO} WHERE o.partita_id = ? AND o.stato = ? ORDER BY o.priorita DESC, o.id`).all(partitaId, stato)
    : prepared(`${SQL_OBIETTIVO} WHERE o.partita_id = ? ORDER BY CASE o.stato WHEN 'aperto' THEN 0 WHEN 'raggiunto' THEN 1 ELSE 2 END, o.priorita DESC, o.updated_at DESC, o.id`).all(partitaId)) as RigaObiettivo[];
  return righe.map(obiettivoDto);
}

export function creaObiettivo(partitaId: number, personaId: number, dati: DatiObiettivo): ObiettivoDto {
  verificaPartita(partitaId);
  const persona = prepared('SELECT nome FROM persona WHERE id = ?').get(personaId) as { nome: string } | undefined;
  if (!persona) throw httpErrors.notFound('persona-non-trovata', `La Persona ${personaId} non esiste.`);
  if (prepared("SELECT 1 FROM obiettivo_partita WHERE partita_id = ? AND persona_id = ? AND stato = 'aperto'").get(partitaId, personaId)) {
    throw httpErrors.conflict('obiettivo-gia-aperto', 'C\'è già un obiettivo aperto per questa Persona: modificalo invece di crearne un altro.');
  }
  verificaSkill(dati.skillIds);
  const adesso = nowIso();
  const skillIds = dati.skillIds ?? [];
  return getDb().transaction(() => {
    const info = prepared('INSERT INTO obiettivo_partita (partita_id, persona_id, skill_json, livello_min, priorita, stato, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, \'aperto\', ?, ?, ?)')
      .run(partitaId, personaId, JSON.stringify(skillIds), dati.livelloMin ?? null, dati.priorita ?? 1, dati.note ?? '', adesso, adesso);
    const id = Number(info.lastInsertRowid);
    const nomiSkill = skillIds.map((s) => skillDto(s)?.nomeIt ?? String(s));
    registraEvento(partitaId, 'obiettivo-creato', `Obiettivo: ${t('persona', persona.nome)}`, [nomiSkill.length ? `Skill: ${nomiSkill.join(', ')}` : '', dati.livelloMin ? `almeno livello ${dati.livelloMin}` : ''].filter(Boolean).join(' · '), { obiettivoId: id, skillIds, livelloMin: dati.livelloMin ?? null }, personaId);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    // Se la Persona è già in scorta e soddisfa le condizioni, l'obiettivo nasce raggiunto.
    verificaObiettivi(partitaId, personaId);
    return obiettivoDto(rigaObiettivo(partitaId, id));
  })();
}

export function aggiornaObiettivo(partitaId: number, id: number, dati: DatiObiettivo): ObiettivoDto {
  verificaPartita(partitaId);
  const r = rigaObiettivo(partitaId, id);
  verificaSkill(dati.skillIds);
  const stato = dati.stato ?? r.stato;
  if (stato === 'aperto' && r.stato !== 'aperto' && prepared("SELECT 1 FROM obiettivo_partita WHERE partita_id = ? AND persona_id = ? AND stato = 'aperto' AND id <> ?").get(partitaId, r.persona_id, id)) {
    throw httpErrors.conflict('obiettivo-gia-aperto', 'C\'è già un altro obiettivo aperto per questa Persona.');
  }
  const adesso = nowIso();
  return getDb().transaction(() => {
    prepared('UPDATE obiettivo_partita SET skill_json = ?, livello_min = ?, priorita = ?, stato = ?, note = ?, raggiunto_at = ?, updated_at = ? WHERE id = ?').run(
      dati.skillIds ? JSON.stringify(dati.skillIds) : r.skill_json,
      dati.livelloMin === undefined ? r.livello_min : dati.livelloMin,
      dati.priorita ?? r.priorita, stato, dati.note ?? r.note,
      stato === 'raggiunto' ? (r.raggiunto_at ?? adesso) : null, adesso, id,
    );
    if (stato === 'raggiunto' && r.stato !== 'raggiunto') {
      registraEvento(partitaId, 'obiettivo-raggiunto', `Obiettivo raggiunto: ${t('persona', r.nome)}`, 'Segnato a mano.', { obiettivoId: id }, r.persona_id);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    if (stato === 'aperto') verificaObiettivi(partitaId, r.persona_id);
    return obiettivoDto(rigaObiettivo(partitaId, id));
  })();
}

export function eliminaObiettivo(partitaId: number, id: number): void {
  verificaPartita(partitaId);
  const info = prepared('DELETE FROM obiettivo_partita WHERE id = ? AND partita_id = ?').run(id, partitaId);
  if (info.changes === 0) throw httpErrors.notFound('obiettivo-non-trovato', `L'obiettivo ${id} non esiste in questa partita.`);
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
}

/**
 * Chiude come «raggiunto» l'obiettivo aperto della Persona se la copia posseduta soddisfa skill e livello.
 * Chiamata da partiteService dopo aggiunta/aggiornamento in scorta (dentro la sua transazione) e da questo servizio.
 * Restituisce l'id dell'obiettivo chiuso, o null.
 */
export function verificaObiettivi(partitaId: number, personaId: number): number | null {
  const r = prepared(`${SQL_OBIETTIVO} WHERE o.partita_id = ? AND o.persona_id = ? AND o.stato = 'aperto'`).get(partitaId, personaId) as RigaObiettivo | undefined;
  if (!r) return null;
  const skillIds = JSON.parse(r.skill_json) as number[];
  const av = avanzamento(partitaId, personaId, skillIds, r.livello_min);
  if (!av.soddisfatto) return null;
  const adesso = nowIso();
  prepared("UPDATE obiettivo_partita SET stato = 'raggiunto', raggiunto_at = ?, updated_at = ? WHERE id = ?").run(adesso, adesso, r.id);
  registraEvento(partitaId, 'obiettivo-raggiunto', `Obiettivo raggiunto: ${t('persona', r.nome)}`, `In scorta al livello ${av.livelloAttuale}${skillIds.length ? ' con tutte le skill desiderate' : ''}.`, { obiettivoId: r.id, possedutaId: av.possedutaId }, personaId);
  return r.id;
}
