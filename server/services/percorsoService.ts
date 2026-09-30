// ============================================================
// percorsoService — guida giorno per giorno: indice dei giorni, scheda del giorno con azioni spuntabili, giorno corrente della partita (Fase 7.5b)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraEvento } from './storicoService.js';
import type { AzionePercorsoDto, EffettiAzioneDto, GiornoCorrenteDto, PercorsoGiornoDto, PercorsoIndiceDto } from '../../shared/types.js';
import { confidenti, leggiPartita } from './partiteService.js';
import { applicaEffettiAzione, annullaEffettiAzione, descriviEffettiApplicati, type OpzioniSpunta } from './effettiAzioneService.js';
import { azioneGuida, correttoreGuida, guidaDelGiorno, type AzioneGuida, type AzioneSeed } from './correzioniGuidaService.js';
import { mappaAzione, nomiEffetti, statoAzione, testoEffetti } from './azioniStrutturateService.js';
import type { NomiEffettiAzione } from '../../shared/effettiAzione.js';
import { agendaDelGiorno, conteggiAgenda } from './agendaService.js';

interface Riga { data: string; ordine: number; giorno_settimana: string; fase: string; trama: string; vincoli_json: string; meteo: string | null; azioni_json: string; avvisi_json: string; fonte: string; coperto: number }


function partitaEsiste(partitaId: number): void {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
}

function fattePartita(partitaId: number | undefined, data?: string): Set<string> {
  if (partitaId === undefined) return new Set();
  partitaEsiste(partitaId);
  const righe = (data === undefined
    ? prepared('SELECT data, indice FROM azione_partita WHERE partita_id = ?').all(partitaId)
    : prepared('SELECT data, indice FROM azione_partita WHERE partita_id = ? AND data = ?').all(partitaId, data)) as Array<{ data: string; indice: number }>;
  return new Set(righe.map((r) => `${r.data}/${r.indice}`));
}

/** Effetti registrati alla spunta per le azioni di un giorno (chiave `data/indice`). */
function effettiPartita(partitaId: number | undefined, data: string): Map<string, EffettiAzioneDto> {
  if (partitaId === undefined) return new Map();
  const righe = prepared('SELECT indice, effetti_json FROM azione_partita WHERE partita_id = ? AND data = ? AND effetti_json IS NOT NULL').all(partitaId, data) as Array<{ indice: number; effetti_json: string }>;
  return new Map(righe.map((r) => [`${data}/${r.indice}`, JSON.parse(r.effetti_json) as EffettiAzioneDto]));
}

function dataCorrente(partitaId: number | undefined): string | null {
  if (partitaId === undefined) return null;
  return (prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined)?.data_gioco ?? null;
}

/** Indice di tutti i giorni (leggero) con conteggi delle azioni e delle azioni fatte; giorno corrente della partita.
 *  Le azioni contate sono quelle della giornata come la vede l'utente: guida corretta (le rimosse no) più le sue cose da fare. */
export function indicePercorso(partitaId?: number): PercorsoIndiceDto {
  const fatte = fattePartita(partitaId);
  const correggi = correttoreGuida();
  const agenda = conteggiAgenda(partitaId);
  const righe = prepared('SELECT data, ordine, giorno_settimana, fase, meteo, azioni_json, avvisi_json, coperto FROM giorno_percorso ORDER BY ordine').all() as Array<Pick<Riga, 'data' | 'ordine' | 'giorno_settimana' | 'fase' | 'meteo' | 'azioni_json' | 'avvisi_json' | 'coperto'>>;
  const giorni = righe.map((r) => {
    const { azioni } = correggi(r.data, JSON.parse(r.azioni_json) as AzioneSeed[]);
    const mie = agenda.get(r.data) ?? { azioni: 0, fatte: 0 };
    return {
      giorno: r.data, giornoSettimana: r.giorno_settimana, fase: r.fase, meteo: r.meteo,
      azioni: azioni.length + mie.azioni, fatte: azioni.filter((a) => fatte.has(`${r.data}/${a.indice}`)).length + mie.fatte,
      avvisi: (JSON.parse(r.avvisi_json) as string[]).length, coperto: r.coperto === 1,
    };
  });
  return { giorni, dataCorrente: dataCorrente(partitaId), totaleGiorni: giorni.length, giorniCoperti: giorni.filter((g) => g.coperto).length };
}

/** Scheda di un giorno con le azioni (fatte nella partita), giorno precedente e successivo. */
export function giornoPercorso(data: string, partitaId?: number): PercorsoGiornoDto {
  const r = prepared('SELECT * FROM giorno_percorso WHERE data = ?').get(data) as Riga | undefined;
  if (!r) throw httpErrors.notFound('giorno-non-trovato', `Nessun giorno del percorso il ${data}.`);
  const fatte = fattePartita(partitaId, data);
  const effetti = effettiPartita(partitaId, data);
  const conf = partitaId ? new Map(confidenti(partitaId).map((c) => [c.chiave, c])) : null;
  const guida = guidaDelGiorno(data, JSON.parse(r.azioni_json) as AzioneSeed[]);
  const nomi = nomiEffetti();
  const azioni = guida.azioni.map((a) => ({ ...conTesti(a, nomi), fatta: fatte.has(`${data}/${a.indice}`), effetti: effetti.get(`${data}/${a.indice}`) ?? null, stato: conf ? statoAzione(a, conf) : null, mappa: mappaAzione(a) }));
  const prec = prepared('SELECT data FROM giorno_percorso WHERE ordine < ? ORDER BY ordine DESC LIMIT 1').get(r.ordine) as { data: string } | undefined;
  const succ = prepared('SELECT data FROM giorno_percorso WHERE ordine > ? ORDER BY ordine ASC LIMIT 1').get(r.ordine) as { data: string } | undefined;
  return {
    giorno: r.data, giornoSettimana: r.giorno_settimana, fase: r.fase, trama: r.trama, vincoli: JSON.parse(r.vincoli_json) as string[], meteo: r.meteo, azioni, avvisi: JSON.parse(r.avvisi_json) as string[], fonte: r.fonte, coperto: r.coperto === 1,
    precedente: prec?.data ?? null, successivo: succ?.data ?? null, dataCorrente: dataCorrente(partitaId), fatte: azioni.filter((a) => a.fatta).length,
    rimosse: guida.rimosse, correzioniSuperate: guida.superate, agenda: agendaDelGiorno(data, partitaId, conf),
  };
}

// Stato e mappa di un'azione valgono per la guida e per le azioni dell'utente: stanno in `azioniStrutturateService`.
export { mappaAzione, statoAzione };

function effettiDi(partitaId: number, data: string, indice: number): EffettiAzioneDto | null {
  const r = prepared('SELECT effetti_json FROM azione_partita WHERE partita_id = ? AND data = ? AND indice = ?').get(partitaId, data, indice) as { effetti_json: string | null } | undefined;
  return r?.effetti_json ? (JSON.parse(r.effetti_json) as EffettiAzioneDto) : null;
}

/**
 * Spunta o toglie un'azione della guida. Alla spunta applica ciò che l'azione produce (`produce`: Doti, letture, turni; note del
 * Confidente se `noteRisposta` è indicato, col bonus dell'arcano se una Persona dello stesso arcano è in scorta) e lo registra;
 * togliendo la spunta lo annulla esattamente (le letture restano: si disfano dalla loro pagina).
 */
export function impostaAzione(partitaId: number, data: string, indice: number, fatta: boolean, opz: OpzioniSpunta = {}): AzionePercorsoDto {
  partitaEsiste(partitaId);
  // l'azione come la vede l'utente (testo, note, fascia ed effetti corretti);
  // un'azione rimossa non si spunta, ma si può ancora togliere la spunta per annullarne i punti
  const { azione: a, rimossa } = azioneGuida(data, indice);
  if (fatta && rimossa) throw httpErrors.badRequest('azione-rimossa', 'Questa azione è stata rimossa dalla giornata: ripristinala per spuntarla.');
  const adesso = nowIso();
  let effetti: EffettiAzioneDto | null = null;
  getDb().transaction(() => {
    const era = !!prepared('SELECT 1 FROM azione_partita WHERE partita_id = ? AND data = ? AND indice = ?').get(partitaId, data, indice);
    if (fatta) {
      if (era) {
        effetti = effettiDi(partitaId, data, indice);
      } else {
        effetti = applicaEffettiAzione(partitaId, { ...a, momento: { data, fascia: a.fascia, origine: 'azione' } }, opz);
      }
      prepared('INSERT INTO azione_partita (partita_id, data, indice, updated_at, effetti_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(partita_id, data, indice) DO UPDATE SET updated_at = excluded.updated_at, effetti_json = COALESCE(azione_partita.effetti_json, excluded.effetti_json)')
        .run(partitaId, data, indice, adesso, effetti ? JSON.stringify(effetti) : null);
    } else {
      const precedenti = era ? effettiDi(partitaId, data, indice) : null;
      if (precedenti) annullaEffettiAzione(partitaId, precedenti);
      prepared('DELETE FROM azione_partita WHERE partita_id = ? AND data = ? AND indice = ?').run(partitaId, data, indice);
    }
    if (fatta && !era) {
      const dett = [`${a.fascia === 'sera' ? 'Sera' : 'Giorno'} · ${a.tipo}${a.riferimentoTesto ? ` · ${a.riferimentoTesto}` : ''}`];
      if (effetti) dett.push(descriviEffettiApplicati(effetti));
      registraEvento(partitaId, 'percorso', `Percorso ${data}: ${a.azione.slice(0, 80)}${a.azione.length > 80 ? '…' : ''}`, `${dett.join(' · ')}.`, { data, indice, tipo: a.tipo, riferimento: a.riferimento, effetti });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  // stato e mappa come nella scheda del giorno: chi sostituisce la riga nell'elenco non perde «Sulla mappa» né il semaforo
  const conf = new Map(confidenti(partitaId).map((c) => [c.chiave, c]));
  return { ...conTesti(a, nomiEffetti()), indice, fatta, effetti, stato: statoAzione(a, conf), mappa: mappaAzione(a) };
}

/** L'azione con gli effetti in parole, anche quelli com'erano nella guida quando una correzione li cambia. */
export function conTesti(a: AzioneGuida, nomi: NomiEffettiAzione): Omit<AzionePercorsoDto, 'fatta' | 'effetti' | 'stato' | 'mappa'> {
  return {
    ...a,
    produceTesto: testoEffetti(a.produce, nomi),
    correzione: a.correzione ? { ...a.correzione, produceTesto: testoEffetti(a.correzione.produce, nomi) } : null,
  };
}

/** Imposta il giorno corrente della partita (data del calendario di gioco) e restituisce anche la partita aggiornata, così il client allinea lo store senza ricaricare l'elenco. */
export function impostaGiornoCorrente(partitaId: number, data: string): GiornoCorrenteDto {
  partitaEsiste(partitaId);
  if (!prepared('SELECT 1 FROM giorno_percorso WHERE data = ?').get(data)) throw httpErrors.notFound('giorno-non-trovato', `Nessun giorno del percorso il ${data}.`);
  // un giorno nuovo comincia di mattina: la fascia torna a «giorno»; rimarcare lo stesso giorno non la tocca
  prepared("UPDATE partita SET data_gioco = ?, fascia_gioco = CASE WHEN data_gioco IS ? THEN fascia_gioco ELSE 'giorno' END, updated_at = ? WHERE id = ?").run(data, data, nowIso(), partitaId);
  return { dataCorrente: data, partita: leggiPartita(partitaId) };
}
