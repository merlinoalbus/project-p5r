// ============================================================
// useMappaPartita — mappa con lo stato della partita attiva e le azioni per partita (raccolto, punto della Guida, acquisto) — Fase 13.4
// ============================================================
//
// Condiviso dal visore a schermo intero (MappaPage) e da quello incorporato (MappaIncorporata): dopo ogni azione lo spillo viene
// sostituito nel DTO locale senza ricaricare la mappa (zoom e posizione restano).
// ============================================================

import { useMemo, useState } from 'react';
import { useCarica } from './useCarica';
import { getMappa, impostaAcquisto, impostaSpilloRaccolto, impostaStatoPunto } from '../services/api';
import { notifica } from '../stores/notificationStore';
import { usePartitaStore } from '../stores/partitaStore';
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
  // la fascia della giornata e il giorno corrente della partita decidono quali spilli sono disponibili: al cambio si ricarica
  const momento = usePartitaStore((s) => (s.attiva?.id === partitaId ? `${s.attiva.dataGioco ?? ''}|${s.attiva.fasciaGioco ?? ''}` : ''));
  const { dati, caricamento, errore, ricarica } = useCarica(() => getMappa(chiave, partitaId ?? undefined), [chiave, partitaId, opz.versione, momento]);
  const [aggiornati, setAggiornati] = useState<Map<number, SpilloDto>>(new Map());
  const mappa = useMemo(() => (dati ? { ...dati, spilli: dati.spilli.map((s) => aggiornati.get(s.id) ?? s) } : null), [dati, aggiornati]);
  const errori = (err: unknown) => notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');

  const raccolto = async (s: SpilloDto, valore: boolean) => {
    if (!partitaId) return;
    try {
      const nuovo = await impostaSpilloRaccolto(partitaId, s.id, valore);
      setAggiornati((m) => new Map(m).set(nuovo.id, nuovo));
      notifica('success', valore ? `«${s.nome}» segnato come raccolto.` : `«${s.nome}» riaperto.`);
      opz.onCambiato?.();
    } catch (err) { errori(err); }
  };

  /** Stato del punto della Guida (ottenuto/esaurito/riaperto): lo spillo collegato segue lo stato (raccolto se gestito). */
  const statoPunto = async (s: SpilloDto, stato: StatoPuntoMappa) => {
    if (!partitaId || s.dettaglio?.tipo !== 'punto' || !s.dettaglio.punto) return;
    const punto = s.dettaglio.punto;
    try {
      const aggiornato = await impostaStatoPunto(partitaId, punto.chiave, stato);
      setAggiornati((m) => new Map(m).set(s.id, { ...s, raccolto: aggiornato.stato !== null, dettaglio: { ...s.dettaglio!, punto: { ...punto, stato: aggiornato.stato } } }));
      notifica('success', stato === null ? `«${s.nome}» riaperto.` : `«${s.nome}» segnato come ${stato}.`);
      opz.onCambiato?.();
    } catch (err) { errori(err); }
  };

  /** Acquisto di un articolo del negozio collegato allo spillo. */
  const acquisto = async (s: SpilloDto, articoloChiave: string, fatto: boolean) => {
    if (!partitaId || !s.dettaglio?.negozio) return;
    const negozio = s.dettaglio.negozio;
    try {
      const a = await impostaAcquisto(partitaId, articoloChiave, fatto);
      setAggiornati((m) => new Map(m).set(s.id, { ...s, dettaglio: { ...s.dettaglio!, negozio: { ...negozio, articoli: negozio.articoli.map((x) => (x.chiave === a.chiave ? { ...x, comprato: a.acquistato } : x)) } } }));
      notifica('success', fatto ? `«${a.nomeIt ?? a.nome}» segnato come comprato.` : `«${a.nomeIt ?? a.nome}» riaperto.`);
      opz.onCambiato?.();
    } catch (err) { errori(err); }
  };

  return { mappa, caricamento, errore, ricarica, raccolto, statoPunto, acquisto };
}
