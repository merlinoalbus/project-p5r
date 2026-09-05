// ============================================================
// agendaService — eventi e cose da fare aggiunti dall'utente a una giornata (Fase 16.1)
// ============================================================
//
// Vivono in tabelle proprie (`evento_utente`, `azione_utente`, `azione_utente_partita`) e non dentro il percorso della
// guida, che il seed riscrive per intero a ogni aggiornamento dei dati. `partita_id` nullo significa «vale per tutte le
// partite» (una conoscenza, come le mappe dell'utente); valorizzato significa «solo in questa partita» (un promemoria).
// La data viene validata contro i giorni del gioco, ma senza chiave esterna: la riga sopravvive a un cambio del seed.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { annullaEffetti } from './percorsoService.js';
import type { EffettiAzioneDto } from '../../shared/types.js';
import { httpErrors } from '../utils/httpError.js';
import type { AgendaGiornoDto, AzioneUtenteDto, EventoUtenteDto, FasciaGioco } from '../../shared/types.js';

interface RigaEvento {
  id: number; partita_id: number | null; data: string; tipo: string; titolo: string; dettaglio: string;
  riferimento_tipo: string | null; riferimento_chiave: string | null; ordine: number;
}
interface RigaAzione {
  id: number; partita_id: number | null; data: string; fascia: string; tipo: string; azione: string;
  riferimento_tipo: string | null; riferimento_chiave: string | null; rango_atteso: number | null; note: string | null; ordine: number;
}

function eventoDto(r: RigaEvento): EventoUtenteDto {
  return {
    id: r.id, partitaId: r.partita_id, giorno: r.data, tipo: r.tipo as EventoUtenteDto['tipo'], titolo: r.titolo, dettaglio: r.dettaglio,
    riferimento: r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_chiave } : null, ordine: r.ordine,
  };
}
function azioneDto(r: RigaAzione, fatte: Set<number>): AzioneUtenteDto {
  return {
    id: r.id, partitaId: r.partita_id, giorno: r.data, fascia: (r.fascia === 'sera' ? 'sera' : 'giorno') as FasciaGioco, tipo: r.tipo, azione: r.azione,
    riferimento: r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_chiave } : null,
    rangoAtteso: r.rango_atteso, note: r.note, ordine: r.ordine, fatta: fatte.has(r.id),
  };
}

/** La data deve essere un giorno del calendario di gioco: un promemoria al 31 febbraio non lo vedrebbe nessuno. */
function verificaData(data: string): void {
  const nel = prepared('SELECT 1 FROM giorno_percorso WHERE data = ?').get(data) ?? prepared('SELECT 1 FROM giorno_calendario WHERE data = ?').get(data);
  if (!nel) throw httpErrors.badRequest('data-sconosciuta', `Il giorno '${data}' non esiste nel calendario del gioco.`);
}

function verificaPartita(partitaId: number | null | undefined): number | null {
  if (partitaId === null || partitaId === undefined) return null;
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  return partitaId;
}

function spuntate(partitaId?: number): Set<number> {
  if (partitaId === undefined) return new Set();
  return new Set((prepared('SELECT azione_utente_id FROM azione_utente_partita WHERE partita_id = ?').all(partitaId) as Array<{ azione_utente_id: number }>).map((r) => r.azione_utente_id));
}

/** Eventi e cose da fare di un giorno: quelle di tutte le partite più quelle della partita indicata. */
export function agendaDelGiorno(data: string, partitaId?: number): AgendaGiornoDto {
  verificaPartita(partitaId ?? null);
  const filtro = partitaId === undefined ? 'partita_id IS NULL' : '(partita_id IS NULL OR partita_id = ?)';
  const par = partitaId === undefined ? [data] : [data, partitaId];
  const eventi = prepared(`SELECT * FROM evento_utente WHERE data = ? AND ${filtro} ORDER BY ordine, id`).all(...par) as RigaEvento[];
  const azioni = prepared(`SELECT * FROM azione_utente WHERE data = ? AND ${filtro} ORDER BY fascia DESC, ordine, id`).all(...par) as RigaAzione[];
  const fatte = spuntate(partitaId);
  return { giorno: data, eventi: eventi.map(eventoDto), azioni: azioni.map((r) => azioneDto(r, fatte)) };
}

/** Giorni che hanno qualcosa in agenda (per accendere un segno nel calendario). */
export function giorniConAgenda(partitaId?: number): string[] {
  verificaPartita(partitaId);
  const filtro = partitaId === undefined ? 'partita_id IS NULL' : '(partita_id IS NULL OR partita_id = ?)';
  const par = partitaId === undefined ? [] : [partitaId];
  const righe = prepared(`SELECT data FROM evento_utente WHERE ${filtro} UNION SELECT data FROM azione_utente WHERE ${filtro} ORDER BY data`).all(...par, ...par) as Array<{ data: string }>;
  return righe.map((r) => r.data);
}

export interface DatiEvento {
  data: string; tipo?: EventoUtenteDto['tipo']; titolo: string; dettaglio?: string;
  riferimento?: { tipo: string; chiave: string } | null; partitaId?: number | null; ordine?: number;
}
export interface DatiAzione {
  data: string; fascia?: FasciaGioco; tipo?: string; azione: string;
  riferimento?: { tipo: string; chiave: string } | null; rangoAtteso?: number | null; note?: string | null; partitaId?: number | null; ordine?: number;
}

function prossimoOrdine(tabella: 'evento_utente' | 'azione_utente', data: string): number {
  return ((prepared(`SELECT MAX(ordine) AS m FROM ${tabella} WHERE data = ?`).get(data) as { m: number | null }).m ?? 0) + 1;
}

export function creaEvento(d: DatiEvento): EventoUtenteDto {
  verificaData(d.data);
  const partita = verificaPartita(d.partitaId);
  const adesso = nowIso();
  const info = prepared(`INSERT INTO evento_utente (partita_id, data, tipo, titolo, dettaglio, riferimento_tipo, riferimento_chiave, ordine, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(partita, d.data, d.tipo ?? 'evento', d.titolo.trim(), d.dettaglio ?? '', d.riferimento?.tipo ?? null, d.riferimento?.chiave ?? null,
    d.ordine ?? prossimoOrdine('evento_utente', d.data), adesso, adesso);
  return eventoDto(prepared('SELECT * FROM evento_utente WHERE id = ?').get(Number(info.lastInsertRowid)) as RigaEvento);
}

export function aggiornaEvento(id: number, d: Partial<DatiEvento>): EventoUtenteDto {
  const r = prepared('SELECT * FROM evento_utente WHERE id = ?').get(id) as RigaEvento | undefined;
  if (!r) throw httpErrors.notFound('evento-non-trovato', `L'evento ${id} non esiste.`);
  if (d.data) verificaData(d.data);
  if (d.partitaId !== undefined) verificaPartita(d.partitaId);
  prepared(`UPDATE evento_utente SET data = ?, tipo = ?, titolo = ?, dettaglio = ?, riferimento_tipo = ?, riferimento_chiave = ?, partita_id = ?, ordine = ?, updated_at = ? WHERE id = ?`).run(
    d.data ?? r.data, d.tipo ?? r.tipo, (d.titolo ?? r.titolo).trim(), d.dettaglio ?? r.dettaglio,
    d.riferimento === undefined ? r.riferimento_tipo : d.riferimento?.tipo ?? null,
    d.riferimento === undefined ? r.riferimento_chiave : d.riferimento?.chiave ?? null,
    d.partitaId === undefined ? r.partita_id : d.partitaId, d.ordine ?? r.ordine, nowIso(), id);
  return eventoDto(prepared('SELECT * FROM evento_utente WHERE id = ?').get(id) as RigaEvento);
}

export function eliminaEvento(id: number): void {
  if (prepared('DELETE FROM evento_utente WHERE id = ?').run(id).changes === 0) throw httpErrors.notFound('evento-non-trovato', `L'evento ${id} non esiste.`);
}

export function creaAzione(d: DatiAzione): AzioneUtenteDto {
  verificaData(d.data);
  const partita = verificaPartita(d.partitaId);
  const adesso = nowIso();
  const info = prepared(`INSERT INTO azione_utente (partita_id, data, fascia, tipo, azione, riferimento_tipo, riferimento_chiave, rango_atteso, note, ordine, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(partita, d.data, d.fascia ?? 'giorno', d.tipo ?? 'altro', d.azione.trim(), d.riferimento?.tipo ?? null, d.riferimento?.chiave ?? null,
    d.rangoAtteso ?? null, d.note ?? null, d.ordine ?? prossimoOrdine('azione_utente', d.data), adesso, adesso);
  return azioneDto(prepared('SELECT * FROM azione_utente WHERE id = ?').get(Number(info.lastInsertRowid)) as RigaAzione, new Set());
}

export function aggiornaAzione(id: number, d: Partial<DatiAzione>, partitaId?: number): AzioneUtenteDto {
  const r = prepared('SELECT * FROM azione_utente WHERE id = ?').get(id) as RigaAzione | undefined;
  if (!r) throw httpErrors.notFound('azione-non-trovata', `La cosa da fare ${id} non esiste.`);
  if (d.data) verificaData(d.data);
  if (d.partitaId !== undefined) verificaPartita(d.partitaId);
  if (d.partitaId !== undefined && d.partitaId !== r.partita_id && prepared('SELECT 1 FROM azione_utente_partita WHERE azione_utente_id = ? AND effetti_json IS NOT NULL').get(id)) throw httpErrors.badRequest('azione-con-effetti', 'Riapri prima questa azione nella partita originale per annullarne gli effetti.');
  prepared(`UPDATE azione_utente SET data = ?, fascia = ?, tipo = ?, azione = ?, riferimento_tipo = ?, riferimento_chiave = ?, rango_atteso = ?, note = ?, partita_id = ?, ordine = ?, updated_at = ? WHERE id = ?`).run(
    d.data ?? r.data, d.fascia ?? r.fascia, d.tipo ?? r.tipo, (d.azione ?? r.azione).trim(),
    d.riferimento === undefined ? r.riferimento_tipo : d.riferimento?.tipo ?? null,
    d.riferimento === undefined ? r.riferimento_chiave : d.riferimento?.chiave ?? null,
    d.rangoAtteso === undefined ? r.rango_atteso : d.rangoAtteso, d.note === undefined ? r.note : d.note,
    d.partitaId === undefined ? r.partita_id : d.partitaId, d.ordine ?? r.ordine, nowIso(), id);
  return azioneDto(prepared('SELECT * FROM azione_utente WHERE id = ?').get(id) as RigaAzione, spuntate(partitaId));
}

export function eliminaAzione(id: number): void {
  if (prepared('SELECT 1 FROM azione_utente_partita WHERE azione_utente_id = ? AND effetti_json IS NOT NULL').get(id)) throw httpErrors.badRequest('azione-con-effetti', 'Riapri prima questa azione per annullarne gli effetti sulla partita.');
  if (prepared('DELETE FROM azione_utente WHERE id = ?').run(id).changes === 0) throw httpErrors.notFound('azione-non-trovata', `La cosa da fare ${id} non esiste.`);
}

/** Spunta (o riapre) una cosa da fare nella partita. */
export function impostaAzioneFatta(partitaId: number, id: number, fatta: boolean): AzioneUtenteDto {
  verificaPartita(partitaId);
  const r = prepared('SELECT * FROM azione_utente WHERE id = ?').get(id) as RigaAzione | undefined;
  if (!r) throw httpErrors.notFound('azione-non-trovata', `La cosa da fare ${id} non esiste.`);
  if (r.partita_id !== null && r.partita_id !== partitaId) throw httpErrors.badRequest('azione-di-altra-partita', 'Questa cosa da fare appartiene a un\'altra partita.');
  getDb().transaction(() => {
    if (fatta) prepared('INSERT INTO azione_utente_partita (partita_id, azione_utente_id, fatta_at) VALUES (?, ?, ?) ON CONFLICT(partita_id, azione_utente_id) DO UPDATE SET fatta_at = excluded.fatta_at').run(partitaId, id, nowIso());
    else {
      const precedente = prepared('SELECT effetti_json FROM azione_utente_partita WHERE partita_id = ? AND azione_utente_id = ?').get(partitaId, id) as { effetti_json: string | null } | undefined;
      if (precedente?.effetti_json) annullaEffetti(partitaId, JSON.parse(precedente.effetti_json) as EffettiAzioneDto);
      prepared('DELETE FROM azione_utente_partita WHERE partita_id = ? AND azione_utente_id = ?').run(partitaId, id);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  })();
  return azioneDto(r, spuntate(partitaId));
}
