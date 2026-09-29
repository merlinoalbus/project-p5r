// ============================================================
// correzioniGuidaService — correzioni dell'utente alle azioni della guida giorno per giorno
// ============================================================
//
// La guida (`giorno_percorso.azioni_json`, file di gioco) resta com'è: il pacchetto la sostituisce per
// intero e le spunte delle partite sono agganciate alla posizione (data, indice) dell'azione. La
// correzione vive nel file delle partite (`correzione_azione_guida`), vale per tutte le partite
// (decisione dell'utente, 2026-09-29) e si applica alla lettura: testo, note e fascia corretti,
// oppure l'azione rimossa (nascosta, non cancellata: la posizione delle altre non cambia e la si può
// ripristinare).
//
// `originale_json` è l'azione com'era quando l'utente l'ha toccata. Se la guida attuale ha a quel
// posto un'azione con un altro testo (un pacchetto nuovo ha aggiunto, tolto o riscritto azioni), la
// correzione è «superata»: non si applica all'azione sbagliata, si mostra perché l'utente la
// riapplichi all'azione attuale o la scarti.
// ============================================================

import { nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import type { AzioneGuidaRimossaDto, AzionePercorsoDto, CorrezioneAzioneGuida, CorrezioneSuperataDto } from '../../shared/types.js';

/** L'azione come la scrive la guida (senza i campi calcolati per la partita). */
export type AzioneSeed = Omit<AzionePercorsoDto, 'indice' | 'fatta' | 'effetti' | 'stato' | 'mappa' | 'correzione'>;

/** Azione della guida con la correzione dell'utente già applicata. */
export type AzioneGuida = AzioneSeed & { indice: number; correzione: AzionePercorsoDto['correzione'] };

interface RigaCorrezione { data: string; indice: number; originale_json: string; modifiche_json: string; nascosta: number }

export interface GuidaDelGiorno {
  /** Le azioni visibili, corrette, nell'ordine della guida (ogni azione tiene il suo indice originale). */
  azioni: AzioneGuida[];
  rimosse: AzioneGuidaRimossaDto[];
  superate: CorrezioneSuperataDto[];
}

function leggiRighe(data: string): Map<number, RigaCorrezione> {
  const righe = prepared('SELECT * FROM correzione_azione_guida WHERE data = ?').all(data) as RigaCorrezione[];
  return new Map(righe.map((r) => [r.indice, r]));
}

/** Tutte le correzioni, per data: un'unica lettura per l'indice dei giorni. */
function tutteLeRighe(): Map<string, Map<number, RigaCorrezione>> {
  const out = new Map<string, Map<number, RigaCorrezione>>();
  for (const r of prepared('SELECT * FROM correzione_azione_guida').all() as RigaCorrezione[]) {
    const m = out.get(r.data) ?? new Map<number, RigaCorrezione>();
    m.set(r.indice, r);
    out.set(r.data, m);
  }
  return out;
}

/** Applica una correzione a un'azione della guida (solo i campi che l'utente ha cambiato). */
function applica(a: AzioneSeed, modifiche: CorrezioneAzioneGuida): AzioneSeed {
  return {
    ...a,
    azione: modifiche.azione ?? a.azione,
    note: modifiche.note === undefined ? a.note : modifiche.note,
    fascia: modifiche.fascia ?? a.fascia,
  };
}

function combina(seed: AzioneSeed[], righe: Map<number, RigaCorrezione>): GuidaDelGiorno {
  const azioni: AzioneGuida[] = [];
  const rimosse: AzioneGuidaRimossaDto[] = [];
  const superate: CorrezioneSuperataDto[] = [];
  seed.forEach((a, indice) => {
    const r = righe.get(indice);
    const originale = r ? (JSON.parse(r.originale_json) as AzioneSeed) : null;
    if (!r || !originale || originale.azione !== a.azione) {
      azioni.push({ ...a, indice, correzione: null });
      return;
    }
    const corretta = conCorrezione(a, indice, JSON.parse(r.modifiche_json) as CorrezioneAzioneGuida);
    if (r.nascosta === 1) rimosse.push({ indice, fascia: corretta.fascia, azione: corretta.azione });
    else azioni.push(corretta);
  });
  // le correzioni che non combaciano più con la guida attuale (testo diverso o posizione sparita)
  for (const r of righe.values()) {
    const originale = JSON.parse(r.originale_json) as AzioneSeed;
    const attuale = seed[r.indice];
    if (attuale && attuale.azione === originale.azione) continue;
    const modifiche = JSON.parse(r.modifiche_json) as CorrezioneAzioneGuida;
    superate.push({ indice: r.indice, azioneAllora: originale.azione, azioneAttuale: attuale?.azione ?? null, azioneCorretta: modifiche.azione ?? null, nascosta: r.nascosta === 1 });
  }
  superate.sort((x, y) => x.indice - y.indice);
  return { azioni, rimosse, superate };
}

/** Le azioni della guida di un giorno con le correzioni dell'utente applicate. */
export function guidaDelGiorno(data: string, seed: AzioneSeed[]): GuidaDelGiorno {
  return combina(seed, leggiRighe(data));
}

/** Per l'indice dei giorni: una funzione che applica le correzioni di ogni data (una sola lettura della tabella). */
export function correttoreGuida(): (data: string, seed: AzioneSeed[]) => GuidaDelGiorno {
  const tutte = tutteLeRighe();
  return (data, seed) => combina(seed, tutte.get(data) ?? new Map());
}

/** L'azione della guida a (data, indice), come la scrive la guida. */
function azioneSeed(data: string, indice: number): AzioneSeed {
  const r = prepared('SELECT azioni_json FROM giorno_percorso WHERE data = ?').get(data) as { azioni_json: string } | undefined;
  if (!r) throw httpErrors.notFound('giorno-non-trovato', `Nessun giorno del percorso il ${data}.`);
  const a = (JSON.parse(r.azioni_json) as AzioneSeed[])[indice];
  if (!a) throw httpErrors.notFound('azione-non-trovata', `Il giorno ${data} non ha un'azione con indice ${indice}.`);
  return a;
}

/** L'azione a (data, indice) con la correzione applicata, e se l'utente l'ha rimossa dalla giornata. */
export function azioneGuida(data: string, indice: number): { azione: AzioneGuida; rimossa: boolean } {
  const a = azioneSeed(data, indice);
  const { modifiche, nascosta } = rigaValida(data, indice, a);
  return { azione: conCorrezione(a, indice, modifiche), rimossa: nascosta };
}

/** L'azione corretta, con i campi originali quando la correzione cambia qualcosa. */
function conCorrezione(a: AzioneSeed, indice: number, modifiche: CorrezioneAzioneGuida): AzioneGuida {
  const corretta = applica(a, modifiche);
  const cambiata = corretta.azione !== a.azione || corretta.note !== a.note || corretta.fascia !== a.fascia;
  return { ...corretta, indice, correzione: cambiata ? { azione: a.azione, note: a.note, fascia: a.fascia } : null };
}

/** Riga esistente valida per l'azione attuale (se superata, si riparte dall'azione di oggi). */
function rigaValida(data: string, indice: number, a: AzioneSeed): { modifiche: CorrezioneAzioneGuida; nascosta: boolean } {
  const r = leggiRighe(data).get(indice);
  if (!r || (JSON.parse(r.originale_json) as AzioneSeed).azione !== a.azione) return { modifiche: {}, nascosta: false };
  return { modifiche: JSON.parse(r.modifiche_json) as CorrezioneAzioneGuida, nascosta: r.nascosta === 1 };
}

/** Come `rigaValida`, per chi scrive: una correzione superata a quel posto non si sovrascrive in silenzio (andrebbe persa
 *  senza che l'utente l'abbia rivista), la si riapplica o la si scarta prima. */
function rigaDaModificare(data: string, indice: number, a: AzioneSeed): { modifiche: CorrezioneAzioneGuida; nascosta: boolean } {
  const r = leggiRighe(data).get(indice);
  if (r && (JSON.parse(r.originale_json) as AzioneSeed).azione !== a.azione) {
    throw httpErrors.conflict('correzione-superata', 'A questa azione è legata una tua correzione che la guida nuova ha superato: riapplicala o scartala in «Correzioni da rivedere» prima di cambiarla.');
  }
  return rigaValida(data, indice, a);
}

/** Salva (o toglie, se non resta nulla da correggere) la riga della correzione. */
function scrivi(data: string, indice: number, a: AzioneSeed, modifiche: CorrezioneAzioneGuida, nascosta: boolean): void {
  // si tengono solo i campi davvero diversi dalla guida: una modifica riportata al testo originale non è una correzione
  const pulite: CorrezioneAzioneGuida = {};
  if (modifiche.azione !== undefined && modifiche.azione !== a.azione) pulite.azione = modifiche.azione;
  if (modifiche.note !== undefined && (modifiche.note ?? null) !== (a.note ?? null)) pulite.note = modifiche.note;
  if (modifiche.fascia !== undefined && modifiche.fascia !== a.fascia) pulite.fascia = modifiche.fascia;
  if (!nascosta && Object.keys(pulite).length === 0) {
    prepared('DELETE FROM correzione_azione_guida WHERE data = ? AND indice = ?').run(data, indice);
    return;
  }
  const adesso = nowIso();
  prepared(`INSERT INTO correzione_azione_guida (data, indice, originale_json, modifiche_json, nascosta, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(data, indice) DO UPDATE SET originale_json = excluded.originale_json, modifiche_json = excluded.modifiche_json, nascosta = excluded.nascosta, updated_at = excluded.updated_at`)
    .run(data, indice, JSON.stringify(a), JSON.stringify(pulite), nascosta ? 1 : 0, adesso, adesso);
}

/** Corregge testo, note o fascia di un'azione della guida (per tutte le partite). */
export function correggiAzioneGuida(data: string, indice: number, modifiche: CorrezioneAzioneGuida): AzioneGuida {
  const a = azioneSeed(data, indice);
  const attuale = rigaDaModificare(data, indice, a);
  const unite: CorrezioneAzioneGuida = { ...attuale.modifiche };
  if (modifiche.azione !== undefined) unite.azione = modifiche.azione.trim();
  if (modifiche.note !== undefined) unite.note = modifiche.note === null || modifiche.note.trim() === '' ? null : modifiche.note.trim();
  if (modifiche.fascia !== undefined) unite.fascia = modifiche.fascia;
  if (unite.azione !== undefined && unite.azione === '') throw httpErrors.badRequest('azione-vuota', 'Il testo dell\'azione non può essere vuoto.');
  scrivi(data, indice, a, unite, attuale.nascosta);
  return azioneGuida(data, indice).azione;
}

/** Rimuove dalla giornata (o rimette) un'azione della guida, per tutte le partite. */
export function rimuoviAzioneGuida(data: string, indice: number, rimossa: boolean): AzioneGuida {
  const a = azioneSeed(data, indice);
  const attuale = rigaDaModificare(data, indice, a);
  scrivi(data, indice, a, attuale.modifiche, rimossa);
  return azioneGuida(data, indice).azione;
}

/** Riporta l'azione com'è nella guida: toglie la correzione (e la rimozione), anche se superata. */
export function ripristinaAzioneGuida(data: string, indice: number): void {
  if (!prepared('SELECT 1 FROM giorno_percorso WHERE data = ?').get(data)) throw httpErrors.notFound('giorno-non-trovato', `Nessun giorno del percorso il ${data}.`);
  if (prepared('DELETE FROM correzione_azione_guida WHERE data = ? AND indice = ?').run(data, indice).changes === 0) {
    throw httpErrors.notFound('correzione-non-trovata', `L'azione ${indice} del ${data} non ha correzioni.`);
  }
}

/** Correzione superata: la si riapplica all'azione che oggi sta a quel posto. */
export function riapplicaCorrezioneGuida(data: string, indice: number): AzioneGuida {
  const r = leggiRighe(data).get(indice);
  if (!r) throw httpErrors.notFound('correzione-non-trovata', `L'azione ${indice} del ${data} non ha correzioni.`);
  const a = azioneSeed(data, indice);
  scrivi(data, indice, a, JSON.parse(r.modifiche_json) as CorrezioneAzioneGuida, r.nascosta === 1);
  return azioneGuida(data, indice).azione;
}
