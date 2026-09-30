// ============================================================
// agendaService — eventi e cose da fare aggiunti dall'utente a una giornata (Fase 16.1)
// ============================================================
//
// Vivono in tabelle proprie (`evento_utente`, `azione_utente`, `azione_utente_partita`) e non dentro il percorso della
// guida, che il seed riscrive per intero a ogni aggiornamento dei dati. `partita_id` nullo significa «vale per tutte le
// partite» (una conoscenza, come le mappe dell'utente); valorizzato significa «solo in questa partita» (un promemoria).
// La data viene validata contro i giorni del gioco, ma senza chiave esterna: la riga sopravvive a un cambio del seed.
// Eventi e cose da fare hanno una fascia e si mostrano dentro «Di giorno» / «Di sera» accanto alle azioni della guida
// (la scheda del giorno li porta in `PercorsoGiornoDto.agenda`, l'indice dei giorni li conta).
//
// Dal 2026-09-30 una cosa da fare è un'azione come quelle della guida (richiesta dell'utente: «devo poter modificare al
// 100% gli eventi della guida»): tipo, collegamento verificato, rango atteso ed effetti della spunta (`produce_json`,
// migrazione utente 008). La spunta applica gli effetti con lo stesso motore della guida (`effettiAzioneService`, con le
// note del Confidente se è un incontro), li scrive in `azione_utente_partita.effetti_json` e li annulla togliendola.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { confidenti } from './partiteService.js';
import { registraEvento } from './storicoService.js';
import { applicaEffettiAzione, annullaEffettiAzione, descriviEffettiApplicati, type OpzioniSpunta } from './effettiAzioneService.js';
import { mappaAzione, nomeRiferimento, nomiEffetti, statoAzione, testoEffetti, verificaEffetti } from './azioniStrutturateService.js';
import { httpErrors } from '../utils/httpError.js';
import { normalizzaEffettiAzione, TIPI_AZIONE, TIPI_RIFERIMENTO_AZIONE, type EffettoAzione, type NomiEffettiAzione } from '../../shared/effettiAzione.js';
import type { AgendaGiornoDto, AzionePercorsoDto, AzioneUtenteDto, ConfidentePartitaDto, EffettiAzioneDto, EventoUtenteDto, FasciaGioco, RiferimentoAzioneDto } from '../../shared/types.js';

interface RigaEvento {
  id: number; partita_id: number | null; data: string; tipo: string; fascia: string; titolo: string; dettaglio: string;
  riferimento_tipo: string | null; riferimento_chiave: string | null; ordine: number;
}
interface RigaAzione {
  id: number; partita_id: number | null; data: string; fascia: string; tipo: string; azione: string;
  riferimento_tipo: string | null; riferimento_chiave: string | null; rango_atteso: number | null; note: string | null; produce_json: string | null; ordine: number;
}

const TIPI = new Set<string>(TIPI_AZIONE.map((t) => t.chiave));
const TIPI_RIF = new Set<string>(TIPI_RIFERIMENTO_AZIONE.map((t) => t.chiave));

function eventoDto(r: RigaEvento): EventoUtenteDto {
  return {
    id: r.id, partitaId: r.partita_id, giorno: r.data, tipo: r.tipo as EventoUtenteDto['tipo'], fascia: (r.fascia === 'sera' ? 'sera' : 'giorno') as FasciaGioco, titolo: r.titolo, dettaglio: r.dettaglio,
    riferimento: r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_chiave } : null, ordine: r.ordine,
  };
}

/** Il collegamento di una riga, se è di un tipo che la giornata conosce (uno scritto a mano prima del 2026-09-30 può non esserlo). */
function riferimentoDi(r: RigaAzione): RiferimentoAzioneDto | null {
  return r.riferimento_tipo && r.riferimento_chiave && TIPI_RIF.has(r.riferimento_tipo) ? { tipo: r.riferimento_tipo as RiferimentoAzioneDto['tipo'], chiave: r.riferimento_chiave } : null;
}
function tipoDi(r: RigaAzione): AzionePercorsoDto['tipo'] {
  return (TIPI.has(r.tipo) ? r.tipo : 'altro') as AzionePercorsoDto['tipo'];
}
function produceDi(r: RigaAzione): EffettoAzione[] {
  try { return normalizzaEffettiAzione(r.produce_json ? JSON.parse(r.produce_json) : []); } catch { return []; }
}
function nomeOppureNull(rif: RiferimentoAzioneDto | null): string | null {
  if (!rif) return null;
  try { return nomeRiferimento(rif); } catch { return null; }
}

interface ContestoAzioni {
  fatte: Map<number, EffettiAzioneDto | null>;
  conf: Map<string, ConfidentePartitaDto> | null;
  nomi: NomiEffettiAzione;
}

function azioneDto(r: RigaAzione, ctx: ContestoAzioni): AzioneUtenteDto {
  const riferimento = riferimentoDi(r);
  const produce = produceDi(r);
  const classificata = { tipo: tipoDi(r), riferimento, rangoAtteso: r.rango_atteso };
  return {
    id: r.id, partitaId: r.partita_id, giorno: r.data, fascia: (r.fascia === 'sera' ? 'sera' : 'giorno') as FasciaGioco, tipo: classificata.tipo, azione: r.azione,
    riferimento, riferimentoTesto: nomeOppureNull(riferimento), rangoAtteso: r.rango_atteso, note: r.note, produce, produceTesto: testoEffetti(produce, ctx.nomi),
    ordine: r.ordine, fatta: ctx.fatte.has(r.id), effetti: ctx.fatte.get(r.id) ?? null,
    stato: ctx.conf ? statoAzione(classificata, ctx.conf) : null, mappa: mappaAzione(classificata),
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

/** Le cose da fare spuntate nella partita, con gli effetti che la spunta ha applicato. */
function spuntate(partitaId?: number): Map<number, EffettiAzioneDto | null> {
  if (partitaId === undefined) return new Map();
  return new Map((prepared('SELECT azione_utente_id, effetti_json FROM azione_utente_partita WHERE partita_id = ?').all(partitaId) as Array<{ azione_utente_id: number; effetti_json: string | null }>)
    .map((r) => [r.azione_utente_id, r.effetti_json ? (JSON.parse(r.effetti_json) as EffettiAzioneDto) : null]));
}

function contesto(partitaId?: number, conf?: Map<string, ConfidentePartitaDto> | null): ContestoAzioni {
  return { fatte: spuntate(partitaId), conf: conf ?? (partitaId !== undefined ? new Map(confidenti(partitaId).map((c) => [c.chiave, c])) : null), nomi: nomiEffetti() };
}

/** Eventi e cose da fare di un giorno: quelle di tutte le partite più quelle della partita indicata. `conf`: i Confidenti della
 *  partita, se chi chiama li ha già (la scheda del giorno), per non ricalcolarne i semafori. */
export function agendaDelGiorno(data: string, partitaId?: number, conf?: Map<string, ConfidentePartitaDto> | null): AgendaGiornoDto {
  verificaPartita(partitaId ?? null);
  const filtro = partitaId === undefined ? 'partita_id IS NULL' : '(partita_id IS NULL OR partita_id = ?)';
  const par = partitaId === undefined ? [data] : [data, partitaId];
  const eventi = prepared(`SELECT * FROM evento_utente WHERE data = ? AND ${filtro} ORDER BY ordine, id`).all(...par) as RigaEvento[];
  const azioni = prepared(`SELECT * FROM azione_utente WHERE data = ? AND ${filtro} ORDER BY fascia DESC, ordine, id`).all(...par) as RigaAzione[];
  const ctx = azioni.length ? contesto(partitaId, conf) : null;
  return { giorno: data, eventi: eventi.map(eventoDto), azioni: ctx ? azioni.map((r) => azioneDto(r, ctx)) : [] };
}

/** Giorni che hanno qualcosa in agenda (per accendere un segno nel calendario). */
export function giorniConAgenda(partitaId?: number): string[] {
  verificaPartita(partitaId);
  const filtro = partitaId === undefined ? 'partita_id IS NULL' : '(partita_id IS NULL OR partita_id = ?)';
  const par = partitaId === undefined ? [] : [partitaId];
  const righe = prepared(`SELECT data FROM evento_utente WHERE ${filtro} UNION SELECT data FROM azione_utente WHERE ${filtro} ORDER BY data`).all(...par, ...par) as Array<{ data: string }>;
  return righe.map((r) => r.data);
}

/** Per l'indice dei giorni: quante cose da fare ha ogni data e quante sono fatte nella partita (gli eventi non si spuntano e non contano). */
export function conteggiAgenda(partitaId?: number): Map<string, { azioni: number; fatte: number }> {
  const filtro = partitaId === undefined ? 'a.partita_id IS NULL' : '(a.partita_id IS NULL OR a.partita_id = ?)';
  const par = partitaId === undefined ? [] : [partitaId, partitaId];
  const righe = prepared(`SELECT a.data AS data, COUNT(*) AS azioni, COUNT(p.azione_utente_id) AS fatte FROM azione_utente a
    LEFT JOIN azione_utente_partita p ON p.azione_utente_id = a.id AND p.partita_id = ${partitaId === undefined ? 'NULL' : '?'}
    WHERE ${filtro} GROUP BY a.data`).all(...par) as Array<{ data: string; azioni: number; fatte: number }>;
  return new Map(righe.map((r) => [r.data, { azioni: r.azioni, fatte: r.fatte }]));
}

export interface DatiEvento {
  data: string; tipo?: EventoUtenteDto['tipo']; fascia?: FasciaGioco; titolo: string; dettaglio?: string;
  riferimento?: { tipo: string; chiave: string } | null; partitaId?: number | null; ordine?: number;
}
export interface DatiAzione {
  data: string; fascia?: FasciaGioco; tipo?: AzionePercorsoDto['tipo']; azione: string;
  riferimento?: { tipo: string; chiave: string } | null; rangoAtteso?: number | null; note?: string | null; produce?: unknown[]; partitaId?: number | null; ordine?: number;
}

function prossimoOrdine(tabella: 'evento_utente' | 'azione_utente', data: string): number {
  return ((prepared(`SELECT MAX(ordine) AS m FROM ${tabella} WHERE data = ?`).get(data) as { m: number | null }).m ?? 0) + 1;
}

export function creaEvento(d: DatiEvento): EventoUtenteDto {
  verificaData(d.data);
  const partita = verificaPartita(d.partitaId);
  const adesso = nowIso();
  const info = prepared(`INSERT INTO evento_utente (partita_id, data, tipo, fascia, titolo, dettaglio, riferimento_tipo, riferimento_chiave, ordine, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(partita, d.data, d.tipo ?? 'evento', d.fascia ?? 'giorno', d.titolo.trim(), d.dettaglio ?? '', d.riferimento?.tipo ?? null, d.riferimento?.chiave ?? null,
    d.ordine ?? prossimoOrdine('evento_utente', d.data), adesso, adesso);
  return eventoDto(prepared('SELECT * FROM evento_utente WHERE id = ?').get(Number(info.lastInsertRowid)) as RigaEvento);
}

export function aggiornaEvento(id: number, d: Partial<DatiEvento>): EventoUtenteDto {
  const r = prepared('SELECT * FROM evento_utente WHERE id = ?').get(id) as RigaEvento | undefined;
  if (!r) throw httpErrors.notFound('evento-non-trovato', `L'evento ${id} non esiste.`);
  if (d.data) verificaData(d.data);
  if (d.partitaId !== undefined) verificaPartita(d.partitaId);
  prepared(`UPDATE evento_utente SET data = ?, tipo = ?, fascia = ?, titolo = ?, dettaglio = ?, riferimento_tipo = ?, riferimento_chiave = ?, partita_id = ?, ordine = ?, updated_at = ? WHERE id = ?`).run(
    d.data ?? r.data, d.tipo ?? r.tipo, d.fascia ?? r.fascia, (d.titolo ?? r.titolo).trim(), d.dettaglio ?? r.dettaglio,
    d.riferimento === undefined ? r.riferimento_tipo : d.riferimento?.tipo ?? null,
    d.riferimento === undefined ? r.riferimento_chiave : d.riferimento?.chiave ?? null,
    d.partitaId === undefined ? r.partita_id : d.partitaId, d.ordine ?? r.ordine, nowIso(), id);
  return eventoDto(prepared('SELECT * FROM evento_utente WHERE id = ?').get(id) as RigaEvento);
}

export function eliminaEvento(id: number): void {
  if (prepared('DELETE FROM evento_utente WHERE id = ?').run(id).changes === 0) throw httpErrors.notFound('evento-non-trovato', `L'evento ${id} non esiste.`);
}

/** Collegamento ed effetti da salvare: quelli nuovi si verificano (devono puntare a elementi che esistono), quelli che l'azione
 *  ha già passano come sono (correggere una nota non fallisce se il catalogo ha nascosto il libro collegato). */
function strutturaDaSalvare(d: Partial<DatiAzione>, r?: RigaAzione): { riferimento: { tipo: string; chiave: string } | null | undefined; produce: EffettoAzione[] | undefined } {
  let riferimento: { tipo: string; chiave: string } | null | undefined;
  if (d.riferimento !== undefined) {
    riferimento = d.riferimento === null ? null : { tipo: d.riferimento.tipo, chiave: d.riferimento.chiave };
    const stesso = r && riferimento && r.riferimento_tipo === riferimento.tipo && r.riferimento_chiave === riferimento.chiave;
    if (riferimento && !stesso) nomeRiferimento(riferimento);
  }
  let produce: EffettoAzione[] | undefined;
  if (d.produce !== undefined) {
    const normalizzati = normalizzaEffettiAzione(d.produce);
    const stessi = r && normalizzati.length === d.produce.length && JSON.stringify(normalizzati) === JSON.stringify(produceDi(r));
    produce = stessi ? normalizzati : verificaEffetti(d.produce);
  }
  return { riferimento, produce };
}

export function creaAzione(d: DatiAzione, partitaVista?: number): AzioneUtenteDto {
  verificaData(d.data);
  const partita = verificaPartita(d.partitaId);
  const { riferimento, produce } = strutturaDaSalvare(d);
  const adesso = nowIso();
  const info = prepared(`INSERT INTO azione_utente (partita_id, data, fascia, tipo, azione, riferimento_tipo, riferimento_chiave, rango_atteso, note, produce_json, ordine, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(partita, d.data, d.fascia ?? 'giorno', d.tipo ?? 'altro', d.azione.trim(), riferimento?.tipo ?? null, riferimento?.chiave ?? null,
    d.rangoAtteso ?? null, d.note ?? null, JSON.stringify(produce ?? []), d.ordine ?? prossimoOrdine('azione_utente', d.data), adesso, adesso);
  return azioneDto(prepared('SELECT * FROM azione_utente WHERE id = ?').get(Number(info.lastInsertRowid)) as RigaAzione, contesto(partitaVista));
}

export function aggiornaAzione(id: number, d: Partial<DatiAzione>, partitaId?: number): AzioneUtenteDto {
  const r = prepared('SELECT * FROM azione_utente WHERE id = ?').get(id) as RigaAzione | undefined;
  if (!r) throw httpErrors.notFound('azione-non-trovata', `La cosa da fare ${id} non esiste.`);
  if (d.data) verificaData(d.data);
  if (d.partitaId !== undefined) verificaPartita(d.partitaId);
  if (d.partitaId !== undefined && d.partitaId !== r.partita_id && prepared('SELECT 1 FROM azione_utente_partita WHERE azione_utente_id = ? AND effetti_json IS NOT NULL').get(id)) throw httpErrors.badRequest('azione-con-effetti', 'Riapri prima questa azione nella partita originale per annullarne gli effetti.');
  const { riferimento, produce } = strutturaDaSalvare(d, r);
  prepared(`UPDATE azione_utente SET data = ?, fascia = ?, tipo = ?, azione = ?, riferimento_tipo = ?, riferimento_chiave = ?, rango_atteso = ?, note = ?, produce_json = ?, partita_id = ?, ordine = ?, updated_at = ? WHERE id = ?`).run(
    d.data ?? r.data, d.fascia ?? r.fascia, d.tipo ?? r.tipo, (d.azione ?? r.azione).trim(),
    riferimento === undefined ? r.riferimento_tipo : riferimento?.tipo ?? null,
    riferimento === undefined ? r.riferimento_chiave : riferimento?.chiave ?? null,
    d.rangoAtteso === undefined ? r.rango_atteso : d.rangoAtteso, d.note === undefined ? r.note : d.note,
    produce === undefined ? r.produce_json ?? '[]' : JSON.stringify(produce),
    d.partitaId === undefined ? r.partita_id : d.partitaId, d.ordine ?? r.ordine, nowIso(), id);
  return azioneDto(prepared('SELECT * FROM azione_utente WHERE id = ?').get(id) as RigaAzione, contesto(partitaId));
}

export function eliminaAzione(id: number): void {
  const conEffetti = prepared('SELECT p.nome FROM azione_utente_partita ap JOIN partita p ON p.id = ap.partita_id WHERE ap.azione_utente_id = ? AND ap.effetti_json IS NOT NULL ORDER BY p.nome').all(id) as Array<{ nome: string }>;
  if (conEffetti.length) {
    throw httpErrors.badRequest('azione-con-effetti', `Questa cosa da fare è spuntata con effetti in ${conEffetti.length === 1 ? 'una partita' : `${conEffetti.length} partite`} (${conEffetti.map((p) => `«${p.nome}»`).join(', ')}): riaprila prima in ciascuna per annullarne gli effetti, poi eliminala.`);
  }
  if (prepared('DELETE FROM azione_utente WHERE id = ?').run(id).changes === 0) throw httpErrors.notFound('azione-non-trovata', `La cosa da fare ${id} non esiste.`);
}

/** Spunta (o riapre) una cosa da fare nella partita. Alla spunta applica ciò che l'azione produce (e le note del Confidente, se è
 *  un incontro e `noteRisposta` è indicato) e lo registra; togliendo la spunta lo annulla (le letture restano). */
export function impostaAzioneFatta(partitaId: number, id: number, fatta: boolean, opz: OpzioniSpunta = {}): AzioneUtenteDto {
  verificaPartita(partitaId);
  const r = prepared('SELECT * FROM azione_utente WHERE id = ?').get(id) as RigaAzione | undefined;
  if (!r) throw httpErrors.notFound('azione-non-trovata', `La cosa da fare ${id} non esiste.`);
  if (r.partita_id !== null && r.partita_id !== partitaId) throw httpErrors.badRequest('azione-di-altra-partita', 'Questa cosa da fare appartiene a un\'altra partita.');
  const adesso = nowIso();
  getDb().transaction(() => {
    const precedente = prepared('SELECT effetti_json FROM azione_utente_partita WHERE partita_id = ? AND azione_utente_id = ?').get(partitaId, id) as { effetti_json: string | null } | undefined;
    if (fatta) {
      if (precedente) return; // già spuntata: niente punti una seconda volta
      const effetti = applicaEffettiAzione(partitaId, { tipo: tipoDi(r), riferimento: riferimentoDi(r), produce: produceDi(r), rangoAtteso: r.rango_atteso, momento: { data: r.data, fascia: r.fascia, origine: 'mia' } }, opz);
      prepared('INSERT INTO azione_utente_partita (partita_id, azione_utente_id, fatta_at, effetti_json) VALUES (?, ?, ?, ?)').run(partitaId, id, adesso, effetti ? JSON.stringify(effetti) : null);
      const dett = [`${r.fascia === 'sera' ? 'Sera' : 'Giorno'} · ${tipoDi(r)} · la mia`];
      if (effetti) dett.push(descriviEffettiApplicati(effetti));
      registraEvento(partitaId, 'percorso', `Percorso ${r.data}: ${r.azione.slice(0, 80)}${r.azione.length > 80 ? '…' : ''}`, `${dett.join(' · ')}.`, { data: r.data, azioneUtente: id, tipo: tipoDi(r), riferimento: riferimentoDi(r), effetti });
    } else {
      if (precedente?.effetti_json) annullaEffettiAzione(partitaId, JSON.parse(precedente.effetti_json) as EffettiAzioneDto);
      prepared('DELETE FROM azione_utente_partita WHERE partita_id = ? AND azione_utente_id = ?').run(partitaId, id);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return azioneDto(r, contesto(partitaId));
}
