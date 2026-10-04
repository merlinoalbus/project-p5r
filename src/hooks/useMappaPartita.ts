// ============================================================
// useMappaPartita — mappa con lo stato della partita attiva e le azioni per partita (raccolto, punto della Guida, acquisto) — Fase 13.4
// ============================================================
//
// Condiviso dal visore a schermo intero (MappaPage) e da quello incorporato (MappaIncorporata): dopo ogni azione lo spillo viene
// sostituito subito nel DTO locale, poi la mappa si rilegge in silenzio (zoom e posizione restano): lo stato di un pin può
// decidere la visibilità degli altri (condizione «Pin di una mappa», 2026-10-03), e quella la calcola il server.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCarica } from './useCarica';
import { getMappa, impostaAcquisto, impostaSpilloRaccolto, impostaStatoPunto } from '../services/api';
import { notifica } from '../stores/notificationStore';
import { usePartitaStore } from '../stores/partitaStore';
import { parolaDelloStato, ritornoDelloStato } from '../../shared/spilli';
import type { MappaDto, SpilloDto } from '../types';
import type { StatoPuntoMappa } from '../components/mappe/VisoreMappa';

export interface MappaPartita {
  mappa: MappaDto | null;
  caricamento: boolean;
  errore: string | null;
  ricarica: () => Promise<void>;
  raccolto: (s: SpilloDto, valore: boolean) => Promise<void>;
  statoPunto: (s: SpilloDto, stato: StatoPuntoMappa) => Promise<void>;
  acquisto: (s: SpilloDto, articoloChiave: string, fatto: boolean) => Promise<void>;
}

/** Carica la mappa `chiave` con lo stato della partita; `versione` forza un nuovo caricamento; `onCambiato` avvisa la pagina ospite di ogni azione salvata. */
export function useMappaPartita(chiave: string, partitaId: number | null, opz: { versione?: string | number; onCambiato?: () => void } = {}): MappaPartita {
  // la fascia della giornata, il giorno corrente e il meteo di adesso decidono quali spilli sono disponibili: al cambio si ricarica
  const momento = usePartitaStore((s) => (s.attiva?.id === partitaId ? `${s.attiva.dataGioco ?? ''}|${s.attiva.fasciaGioco ?? ''}|${s.attiva.meteoOra ?? ''}` : ''));
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getMappa(chiave, partitaId ?? undefined), [chiave, partitaId, opz.versione, momento]);
  // Gli spilli aggiornati in locale dopo un'azione valgono **sulla copia della mappa a cui si riferiscono**: arrivata una copia
  // nuova (la rilettura, o un caricamento completo per un cambio di versione, momento o mappa) vale quella del server.
  const [locali, setLocali] = useState<{ di: MappaDto | null; spilli: Map<number, SpilloDto> }>({ di: null, spilli: new Map() });
  const datiAttuali = useRef(dati);
  useEffect(() => { datiAttuali.current = dati; }, [dati]);
  /** Sostituisce in locale lo spillo aggiornato, legandolo alla copia corrente della mappa (le sostituzioni fatte su una copia precedente si scartano). */
  const aggiorna = (s: SpilloDto) => setLocali((l) => {
    const di = datiAttuali.current;
    return { di, spilli: new Map(l.di === di ? l.spilli : undefined).set(s.id, s) };
  });
  const aggiornati = locali.di === dati ? locali.spilli : null;
  const mappa = useMemo(() => (dati ? { ...dati, spilli: dati.spilli.map((s) => aggiornati?.get(s.id) ?? s) } : null), [dati, aggiornati]);
  /** Notifica l'errore di un'azione, col messaggio del server se c'è. */
  const errori = (err: unknown) => notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');

  // La rilettura dopo un'azione: vince l'ultima chiesta. Ogni caricamento completo — cambio di mappa, di partita, di
  // versione, di momento della giornata, o `ricarica` — la rende vecchia: una risposta in sospeso che arriva dopo non
  // sovrascrive niente.
  const ultimaLettura = useRef(0);
  useEffect(() => { ultimaLettura.current++; }, [chiave, partitaId, opz.versione, momento]);
  const ricaricaTutto = useCallback(async () => { ultimaLettura.current++; await ricarica(); }, [ricarica]);
  /** Rilegge la mappa senza passare per lo stato di caricamento e la applica solo se nel frattempo non è partita un'altra lettura; un errore lascia l'aggiornamento locale. */
  const rileggiInSilenzio = async () => {
    const n = ++ultimaLettura.current;
    try {
      const fresca = await getMappa(chiave, partitaId ?? undefined);
      if (n === ultimaLettura.current) imposta(fresca);
    } catch { /* resta l'aggiornamento immediato */ }
  };

  /** Segna lo spillo come raccolto (o lo riapre) nella partita, notifica con la parola adatta al tipo e rilegge la mappa. */
  const raccolto = async (s: SpilloDto, valore: boolean) => {
    if (!partitaId) return;
    try {
      const nuovo = await impostaSpilloRaccolto(partitaId, s.id, valore);
      aggiorna(nuovo);
      // «Scrigno: aperto», «Scrigno: chiuso», «Porta della torre: aperta», «Vecchietto: parlato», «Leva: non più azionato»: la
      // parola concorda col tipo (scelte dell'utente, 2026-10-03)
      notifica('success', `«${s.nome}»: ${valore ? parolaDelloStato(s) : ritornoDelloStato(s).parola}.`);
      opz.onCambiato?.();
      void rileggiInSilenzio();
    } catch (err) { errori(err); }
  };

  /** Stato del punto della Guida (ottenuto/esaurito/riaperto): lo spillo collegato segue lo stato (raccolto se gestito). */
  const statoPunto = async (s: SpilloDto, stato: StatoPuntoMappa) => {
    if (!partitaId || !s.voce) return;
    const punto = s.voce;
    try {
      const aggiornato = await impostaStatoPunto(partitaId, punto.chiave, stato);
      const voce = { ...punto, stato: aggiornato.stato };
      // gli elementi della guida senza mappa portano la voce anche nel dettaglio del riferimento: si aggiornano insieme
      const dettaglio = s.dettaglio?.tipo === 'punto' && s.dettaglio.punto?.chiave === punto.chiave ? { ...s.dettaglio, punto: voce } : s.dettaglio;
      aggiorna({ ...s, raccolto: aggiornato.stato !== null, voce, dettaglio });
      notifica('success', stato === null ? `«${s.nome}» riaperto.` : `«${s.nome}» segnato come ${stato}.`);
      opz.onCambiato?.();
      void rileggiInSilenzio();
    } catch (err) { errori(err); }
  };

  /** Acquisto di un articolo del negozio collegato allo spillo. */
  const acquisto = async (s: SpilloDto, articoloChiave: string, fatto: boolean) => {
    if (!partitaId || !s.dettaglio?.negozio) return;
    const negozio = s.dettaglio.negozio;
    try {
      const a = await impostaAcquisto(partitaId, articoloChiave, fatto);
      aggiorna({ ...s, dettaglio: { ...s.dettaglio!, negozio: { ...negozio, articoli: negozio.articoli.map((x) => (x.chiave === a.chiave ? { ...x, comprato: a.acquistato } : x)) } } });
      notifica('success', fatto ? `«${a.nomeIt ?? a.nome}» segnato come comprato.` : `«${a.nomeIt ?? a.nome}» riaperto.`);
      opz.onCambiato?.();
      // un articolo ottenuto può essere la condizione di un altro pin
      void rileggiInSilenzio();
    } catch (err) { errori(err); }
  };

  return { mappa, caricamento, errore, ricarica: ricaricaTutto, raccolto, statoPunto, acquisto };
}
