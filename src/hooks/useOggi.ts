// ============================================================
// useOggi — stato condiviso della scheda «Oggi»: giorno della guida, azioni con spunta e mappa collegata (Fase 12.4 / 13.5)
// ============================================================
//
// Un solo caricamento per (partita, giorno) condiviso dalla guida e dalla mappa, che nella Home stanno in due colonne diverse.
// ============================================================

import { useState } from 'react';
import { getPercorsoGiorno, getPercorsoIndice, impostaGiornoCorrente } from '../services/api';
import { useCarica } from './useCarica';
import { notifica } from '../stores/notificationStore';
import { usePartitaStore } from '../stores/partitaStore';
import { useSuggerimentiStore } from '../stores/suggerimentiStore';
import { dataGiocoTesto } from '../utils/dateGioco';
import type { AzionePercorsoDto, PercorsoGiornoDto, PercorsoIndiceDto } from '../types';

export interface StatoMappaOggi {
  chiave: string;
  spilloId: number | null;
  /** Indice dell'azione che ha scelto questa mappa (evidenziata nell'elenco); null = mappa globale. */
  azione: number | null;
}

export interface Oggi {
  indice: PercorsoIndiceDto | null;
  giorno: PercorsoGiornoDto | null;
  caricamento: boolean;
  errore: string | null;
  ricarica: () => Promise<void>;
  partitaId: number;
  vaiAlGiorno: (data: string | null) => void;
  aggiornaAzione: (a: AzionePercorsoDto) => void;
  segnaCorrente: () => Promise<void>;
  occupato: boolean;
  mappa: StatoMappaOggi;
  sullaMappa: (a: AzionePercorsoDto) => void;
  tornaAllaMappaGlobale: () => void;
}

/** Carica il giorno corrente della partita (o quello scelto) con le sue azioni e tiene lo stato della mappa collegata. */
export function useOggi(partitaId: number): Oggi {
  const indice = useCarica(() => getPercorsoIndice(partitaId), [partitaId]);
  const [dataScelta, setDataScelta] = useState<string | null>(null);
  const data = dataScelta ?? indice.dati?.dataCorrente ?? indice.dati?.giorni[0]?.giorno ?? null;
  const giorno = useCarica(() => (data ? getPercorsoGiorno(data, partitaId) : Promise.resolve(null)), [data, partitaId]);
  const [mappa, setMappa] = useState<StatoMappaOggi>({ chiave: 'tokyo', spilloId: null, azione: null });
  const [occupato, setOccupato] = useState(false);
  const g = giorno.dati;

  return {
    indice: indice.dati,
    giorno: g,
    caricamento: (indice.caricamento && !indice.dati) || (giorno.caricamento && !g),
    errore: indice.errore ?? giorno.errore,
    ricarica: async () => { await indice.ricarica(); await giorno.ricarica(); },
    partitaId,
    vaiAlGiorno: (d) => { if (d) setDataScelta(d); },
    aggiornaAzione: (a) => {
      if (!g) return;
      const azioni = g.azioni.map((x) => (x.indice === a.indice ? a : x));
      giorno.imposta({ ...g, azioni, fatte: azioni.filter((x) => x.fatta).length });
    },
    segnaCorrente: async () => {
      if (!g) return;
      setOccupato(true);
      try {
        const esito = await impostaGiornoCorrente(partitaId, g.giorno);
        giorno.imposta({ ...g, dataCorrente: g.giorno });
        if (indice.dati) indice.imposta({ ...indice.dati, dataCorrente: g.giorno });
        // la data di gioco vive in `partitaStore.attiva` (chip dell'intestazione, Riepilogo, ScuolaOggi, Calendario): si allinea alla partita restituita dal server
        usePartitaStore.getState().aggiornaLocale(esito.partita);
        // cambiando giorno cambiano le azioni suggerite: l'alone dorato si aggiorna da solo
        useSuggerimentiStore.getState().invalida();
        notifica('success', `Giorno corrente: ${dataGiocoTesto(g.giorno)}.`);
      } catch (err) {
        notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
      } finally {
        setOccupato(false);
      }
    },
    occupato,
    mappa,
    sullaMappa: (a) => { if (a.mappa) setMappa({ chiave: a.mappa.chiave, spilloId: a.mappa.spilloId, azione: a.indice }); },
    tornaAllaMappaGlobale: () => setMappa({ chiave: 'tokyo', spilloId: null, azione: null }),
  };
}
