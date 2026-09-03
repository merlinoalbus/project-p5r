// ============================================================
// pianiSalvatiService — piani di fusione salvati con avanzamento ricalcolato sulla scorta (Fase 5.3)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { t } from './traduzioniService.js';
import { skillDto } from './compendioService.js';
import { registraEvento } from './storicoService.js';
import type { AvanzamentoPianoDto, NodoPianoDto, PassoPianoDto, PianoFusioneDto, PianoSalvatoDto, SkillRiassuntoDto } from '../../shared/types.js';

interface RigaPiano {
  id: number; partita_id: number; persona_id: number; obiettivo_id: number | null; nome: string; note: string; opzioni_json: string; skill_json: string; piano_json: string; costo: number;
  created_at: string; updated_at: string; persona_nome: string; arcana: string; livello: number; obiettivo_stato: string | null;
}

const SQL_PIANO = `SELECT s.*, p.nome AS persona_nome, p.arcana, p.livello, o.stato AS obiettivo_stato
  FROM piano_salvato s JOIN persona p ON p.id = s.persona_id LEFT JOIN obiettivo_partita o ON o.id = s.obiettivo_id`;

/** Dati di salvataggio. */
export interface DatiPianoSalvato {
  personaId: number;
  piano: PianoFusioneDto;
  opzioni: PianoSalvatoDto['opzioni'];
  skillIds?: number[];
  obiettivoId?: number | null;
  nome?: string;
  note?: string;
}

/** Dati modificabili. */
export interface ModificaPianoSalvato {
  nome?: string;
  note?: string;
  obiettivoId?: number | null;
}

function scortaDi(partitaId: number): Set<number> {
  return new Set((prepared('SELECT persona_id FROM persona_posseduta WHERE partita_id = ?').all(partitaId) as Array<{ persona_id: number }>).map((r) => r.persona_id));
}

/**
 * Avanzamento di un piano rispetto alla scorta: foglie possedute, fusioni già fatte (risultato in scorta),
 * passi eseguibili adesso (fusioni i cui ingredienti sono tutti in scorta) e completamento (bersaglio in scorta).
 */
export function avanzamentoPiano(radice: NodoPianoDto, scorta: Set<number>): AvanzamentoPianoDto {
  let foglie = 0;
  let foglieInScorta = 0;
  let fusioni = 0;
  let fusioniFatte = 0;
  const passi: PassoPianoDto[] = [];
  const visita = (n: NodoPianoDto): boolean => {
    // Restituisce true se la Persona del nodo è disponibile adesso (in scorta).
    const inScorta = scorta.has(n.persona.id);
    if (n.modo !== 'fusione') {
      foglie += 1;
      if (inScorta) foglieInScorta += 1;
      return inScorta;
    }
    fusioni += 1;
    if (inScorta) {
      fusioniFatte += 1;
      // Sottoalbero non più necessario: non contiamo le sue foglie come mancanti.
      return true;
    }
    const figliPronti = n.figli.map(visita);
    if (figliPronti.every(Boolean)) {
      passi.push({ risultato: n.persona, ingredienti: n.figli.map((f) => f.persona), tipo: n.tipo ?? 'normale', skillPortate: n.skillPortate });
    }
    return false;
  };
  const completato = visita(radice);
  return { completato, foglie, foglieInScorta, fusioni, fusioniFatte, passi };
}

function pianoDto(r: RigaPiano, scorta: Set<number>): PianoSalvatoDto {
  const piano = JSON.parse(r.piano_json) as PianoFusioneDto;
  const skillIds = JSON.parse(r.skill_json) as number[];
  return {
    id: r.id, personaId: r.persona_id, nome: r.persona_nome, nomeIt: t('persona', r.persona_nome), arcana: r.arcana, arcanaNome: t('arcana', r.arcana), livello: r.livello,
    titolo: r.nome, note: r.note, obiettivoId: r.obiettivo_id, obiettivoStato: (r.obiettivo_stato as PianoSalvatoDto['obiettivoStato']) ?? null,
    opzioni: JSON.parse(r.opzioni_json) as PianoSalvatoDto['opzioni'], skill: skillIds.map((id) => skillDto(id)).filter((s): s is SkillRiassuntoDto => s !== null),
    piano, costo: r.costo, avanzamento: avanzamentoPiano(piano.radice, scorta), createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function verificaPartita(partitaId: number): void {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
}

function verificaObiettivo(partitaId: number, obiettivoId: number | null | undefined, personaId: number): void {
  if (obiettivoId === null || obiettivoId === undefined) return;
  const o = prepared('SELECT persona_id FROM obiettivo_partita WHERE id = ? AND partita_id = ?').get(obiettivoId, partitaId) as { persona_id: number } | undefined;
  if (!o) throw httpErrors.notFound('obiettivo-non-trovato', `L'obiettivo ${obiettivoId} non esiste in questa partita.`);
  if (o.persona_id !== personaId) throw httpErrors.badRequest('obiettivo-incoerente', 'L\'obiettivo indicato riguarda un\'altra Persona.');
}

/** Controllo strutturale dell'albero salvato (arriva dal client): nodi con Persona, modo ammesso, figli coerenti. */
function verificaAlbero(n: NodoPianoDto, profondita = 0): void {
  if (profondita > 8) throw httpErrors.badRequest('piano-non-valido', 'Il piano è troppo profondo.');
  if (!n || typeof n !== 'object' || !n.persona || !Number.isInteger(n.persona.id)) throw httpErrors.badRequest('piano-non-valido', 'Nodo del piano senza Persona.');
  if (!['scorta', 'registro', 'cattura', 'fusione'].includes(n.modo)) throw httpErrors.badRequest('piano-non-valido', `Modo «${String(n.modo)}» non ammesso.`);
  if (!Array.isArray(n.figli)) throw httpErrors.badRequest('piano-non-valido', 'Figli del nodo non validi.');
  if (n.modo === 'fusione' && n.figli.length < 2) throw httpErrors.badRequest('piano-non-valido', 'Una fusione richiede almeno due ingredienti.');
  if (n.modo !== 'fusione' && n.figli.length > 0) throw httpErrors.badRequest('piano-non-valido', 'Una foglia non può avere ingredienti.');
  if (!prepared('SELECT 1 FROM persona WHERE id = ?').get(n.persona.id)) throw httpErrors.notFound('persona-non-trovata', `La Persona ${n.persona.id} non esiste.`);
  for (const f of n.figli) verificaAlbero(f, profondita + 1);
}

export function pianiSalvati(partitaId: number, obiettivoId?: number): PianoSalvatoDto[] {
  verificaPartita(partitaId);
  const scorta = scortaDi(partitaId);
  const righe = (obiettivoId !== undefined
    ? prepared(`${SQL_PIANO} WHERE s.partita_id = ? AND s.obiettivo_id = ? ORDER BY s.id DESC`).all(partitaId, obiettivoId)
    : prepared(`${SQL_PIANO} WHERE s.partita_id = ? ORDER BY s.id DESC`).all(partitaId)) as RigaPiano[];
  return righe.map((r) => pianoDto(r, scorta));
}

export function salvaPiano(partitaId: number, dati: DatiPianoSalvato): PianoSalvatoDto {
  verificaPartita(partitaId);
  const persona = prepared('SELECT nome FROM persona WHERE id = ?').get(dati.personaId) as { nome: string } | undefined;
  if (!persona) throw httpErrors.notFound('persona-non-trovata', `La Persona ${dati.personaId} non esiste.`);
  if (!dati.piano || !dati.piano.radice) throw httpErrors.badRequest('piano-non-valido', 'Piano mancante.');
  if (dati.piano.radice.persona.id !== dati.personaId) throw httpErrors.badRequest('piano-non-valido', 'La radice del piano non corrisponde alla Persona indicata.');
  verificaAlbero(dati.piano.radice);
  verificaObiettivo(partitaId, dati.obiettivoId, dati.personaId);
  const skillIds = dati.skillIds ?? [];
  for (const id of skillIds) if (!prepared('SELECT 1 FROM skill WHERE id = ?').get(id)) throw httpErrors.notFound('skill-non-trovata', `La skill ${id} non esiste.`);
  const adesso = nowIso();
  const nomeIt = t('persona', persona.nome);
  return getDb().transaction(() => {
    const info = prepared('INSERT INTO piano_salvato (partita_id, persona_id, obiettivo_id, nome, note, opzioni_json, skill_json, piano_json, costo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(partitaId, dati.personaId, dati.obiettivoId ?? null, dati.nome ?? '', dati.note ?? '', JSON.stringify(dati.opzioni ?? {}), JSON.stringify(skillIds), JSON.stringify(dati.piano), Math.max(0, Math.round(dati.piano.costo ?? 0)), adesso, adesso);
    const id = Number(info.lastInsertRowid);
    registraEvento(partitaId, 'piano-salvato', `Piano di fusione salvato: ${nomeIt}`, `${dati.piano.fusioni} ${dati.piano.fusioni === 1 ? 'fusione' : 'fusioni'}, costo ${Math.round(dati.piano.costo ?? 0)} ¥${dati.obiettivoId ? ' · legato a un obiettivo' : ''}.`, { pianoId: id, obiettivoId: dati.obiettivoId ?? null, skillIds }, dati.personaId);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    return pianoDto(prepared(`${SQL_PIANO} WHERE s.id = ?`).get(id) as RigaPiano, scortaDi(partitaId));
  })();
}

export function aggiornaPianoSalvato(partitaId: number, id: number, dati: ModificaPianoSalvato): PianoSalvatoDto {
  verificaPartita(partitaId);
  const r = prepared(`${SQL_PIANO} WHERE s.id = ? AND s.partita_id = ?`).get(id, partitaId) as RigaPiano | undefined;
  if (!r) throw httpErrors.notFound('piano-non-trovato', `Il piano ${id} non esiste in questa partita.`);
  if (dati.obiettivoId !== undefined) verificaObiettivo(partitaId, dati.obiettivoId, r.persona_id);
  const adesso = nowIso();
  prepared('UPDATE piano_salvato SET nome = ?, note = ?, obiettivo_id = ?, updated_at = ? WHERE id = ?').run(dati.nome ?? r.nome, dati.note ?? r.note, dati.obiettivoId === undefined ? r.obiettivo_id : dati.obiettivoId, adesso, id);
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  return pianoDto(prepared(`${SQL_PIANO} WHERE s.id = ?`).get(id) as RigaPiano, scortaDi(partitaId));
}

export function eliminaPianoSalvato(partitaId: number, id: number): void {
  verificaPartita(partitaId);
  const info = prepared('DELETE FROM piano_salvato WHERE id = ? AND partita_id = ?').run(id, partitaId);
  if (info.changes === 0) throw httpErrors.notFound('piano-non-trovato', `Il piano ${id} non esiste in questa partita.`);
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
}
