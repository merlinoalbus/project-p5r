// ============================================================
// percorsoService — guida giorno per giorno: indice dei giorni, scheda del giorno con le voci spuntabili, giorno corrente della partita (Fase 7.5b)
// ============================================================
//
// Le voci della giornata (azioni della guida, cose da fare ed eventi aggiunti dall'utente, tutti canone) stanno in
// `voce_giornata` e le gestisce `giornataService`; qui la scheda del giorno, l'indice dei giorni e il giorno corrente.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { cambiaGiornoPartita } from './giornoPartitaService.js';
import type { GiornoAvanzatoDto, GiornoCorrenteDto, PercorsoGiornoDto, PercorsoIndiceDto } from '../../shared/types.js';
import { confidenti, leggiPartita } from './partiteService.js';
import { conteggiGiornate, righeDelGiorno, spuntePartita, vociDelGiorno } from './giornataService.js';
import { allerteDelGiorno, meteoDelGiorno } from './meteoService.js';
import { giornoDellaSettimana } from '../../shared/date.js';

interface Riga { data: string; ordine: number; giorno_settimana: string; fase: string; trama: string; vincoli_json: string; meteo: string | null; avvisi_json: string; fonte: string; coperto: number }

/** La data di gioco della partita ('MM-GG'); null senza partita, se la partita non esiste o se la data non è impostata. */
function dataCorrente(partitaId: number | undefined): string | null {
  if (partitaId === undefined) return null;
  return (prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined)?.data_gioco ?? null;
}

/** R9-16: il giorno della settimana si calcola dalla data; la guida del percorso lo mostra in sigla («sab»), come prima. */
const sigla = (data: string): string | null => giornoDellaSettimana(data)?.slice(0, 3).toLowerCase() ?? null;

/** Indice di tutti i giorni (leggero) con conteggi delle azioni e delle azioni fatte; giorno corrente della partita.
 *  Le azioni contate sono le voci che si spuntano (eventi, scadenze e promemoria no). */
export function indicePercorso(partitaId?: number): PercorsoIndiceDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const conteggi = conteggiGiornate(partitaId);
  const righe = prepared('SELECT data, ordine, giorno_settimana, fase, meteo, avvisi_json, coperto FROM giorno_percorso ORDER BY ordine').all() as Array<Pick<Riga, 'data' | 'ordine' | 'giorno_settimana' | 'fase' | 'meteo' | 'avvisi_json' | 'coperto'>>;
  const giorni = righe.map((r) => {
    const c = conteggi.get(r.data) ?? { azioni: 0, fatte: 0 };
    return {
      giorno: r.data, giornoSettimana: sigla(r.data) ?? r.giorno_settimana, fase: r.fase, meteo: r.meteo, azioni: c.azioni, fatte: c.fatte,
      avvisi: (JSON.parse(r.avvisi_json) as string[]).length, coperto: r.coperto === 1,
    };
  });
  return { giorni, dataCorrente: dataCorrente(partitaId), totaleGiorni: giorni.length, giorniCoperti: giorni.filter((g) => g.coperto).length };
}

/** Scheda di un giorno con le voci nel loro ordine (fatte nella partita), giorno precedente e successivo. */
export function giornoPercorso(data: string, partitaId?: number): PercorsoGiornoDto {
  const base = prepared('SELECT * FROM giorno_percorso WHERE data = ?').get(data) as Riga | undefined;
  if (!base) throw httpErrors.notFound('giorno-non-trovato', `Nessun giorno del percorso il ${data}.`);
  // R9-15/R9-19: trama e vincoli del giorno sono quelli del giorno unico (modificabile dall'editor); il resto è del percorso
  const unico = prepared('SELECT trama, vincoli_json FROM giorno WHERE data = ?').get(data) as { trama: string; vincoli_json: string } | undefined;
  const r: Riga = unico ? { ...base, trama: unico.trama, vincoli_json: unico.vincoli_json } : base;
  if (partitaId !== undefined) verificaPartita(partitaId);
  const conf = partitaId ? new Map(confidenti(partitaId).map((c) => [c.chiave, c])) : null;
  const azioni = vociDelGiorno(data, partitaId, conf, true);
  const prec = prepared('SELECT data FROM giorno_percorso WHERE ordine < ? ORDER BY ordine DESC LIMIT 1').get(r.ordine) as { data: string } | undefined;
  const succ = prepared('SELECT data FROM giorno_percorso WHERE ordine > ? ORDER BY ordine ASC LIMIT 1').get(r.ordine) as { data: string } | undefined;
  return {
    giorno: r.data, giornoSettimana: sigla(r.data) ?? r.giorno_settimana, fase: r.fase, trama: r.trama, vincoli: JSON.parse(r.vincoli_json) as string[], meteo: r.meteo, azioni, avvisi: JSON.parse(r.avvisi_json) as string[], fonte: r.fonte, coperto: r.coperto === 1,
    precedente: prec?.data ?? null, successivo: succ?.data ?? null, dataCorrente: dataCorrente(partitaId), fatte: azioni.filter((a) => a.fatta).length,
    meteoPartita: partitaId ? meteoDelGiorno(partitaId, data) : null,
    allerte: allerteDelGiorno(data),
  };
}

/**
 * Spuntata l'ultima attività del giorno corrente, la partita passa al giorno dopo, di giorno (richiesta dell'utente,
 * 2026-09-30: «se completo tutte le attività di un giorno deve spostare automaticamente il giorno corrente al giorno
 * successivo modalità giorno»). Le attività sono le voci che si spuntano (eventi, scadenze e promemoria no). Scatta solo se
 * `data` è il giorno corrente della partita e c'è almeno un'attività; togliere una spunta non torna indietro (chi chiama lo
 * invoca solo alla spunta). Restituisce il passaggio, o null.
 */
export function avanzaSeGiornoCompleto(partitaId: number, data: string): GiornoAvanzatoDto | null {
  if (dataCorrente(partitaId) !== data) return null;
  const r = prepared('SELECT ordine FROM giorno_percorso WHERE data = ?').get(data) as { ordine: number } | undefined;
  if (!r) return null;
  const azioni = righeDelGiorno(data).filter((v) => v.genere === 'azione');
  if (azioni.length === 0) return null;
  const fatte = spuntePartita(partitaId, data);
  if (!azioni.every((a) => fatte.has(a.uid))) return null;
  const succ = prepared('SELECT data FROM giorno_percorso WHERE ordine > ? ORDER BY ordine ASC LIMIT 1').get(r.ordine) as { data: string } | undefined;
  if (!succ) return null;
  // la regola unica del cambio giorno (R10-16), con la sua descrizione nello storico
  cambiaGiornoPartita(partitaId, succ.data, { titolo: `Giornata del ${data} completata`, dettaglio: `Tutte le attività del giorno sono fatte: la partita passa al ${succ.data}, di giorno.` });
  return { da: data, a: succ.data, partita: leggiPartita(partitaId) };
}

/** Imposta il giorno corrente della partita (data del calendario di gioco) e restituisce anche la partita aggiornata, così il client allinea lo store senza ricaricare l'elenco. */
export function impostaGiornoCorrente(partitaId: number, data: string): GiornoCorrenteDto {
  // giorno esistente, fascia a «giorno» se il giorno è nuovo (rimarcare lo stesso non la tocca), storico: la regola unica (R10-16)
  cambiaGiornoPartita(partitaId, data);
  return { dataCorrente: data, partita: leggiPartita(partitaId) };
}
