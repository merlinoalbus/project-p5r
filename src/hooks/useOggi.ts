// ============================================================
// useOggi — stato condiviso della scheda «Oggi»: giorno della guida, azioni con spunta e mappa collegata (Fase 12.4 / 13.5)
// ============================================================
//
// Un solo caricamento per (partita, giorno) condiviso dalla guida e dalla mappa, che nella Home stanno in due colonne diverse.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useMeteoStore } from '../stores/meteoStore';
import { getPercorsoGiorno, getPercorsoIndice, impostaFasciaGioco, impostaGiornoCorrente, impostaMeteoGiorno } from '../services/api';
import type { MeteoPartita } from '../../shared/meteoPartita';
import { useCarica } from './useCarica';
import { notifica } from '../stores/notificationStore';
import { usePartitaStore } from '../stores/partitaStore';
import { useSuggerimentiStore } from '../stores/suggerimentiStore';
import { dataGiocoTesto } from '../utils/dateGioco';
import type { AzionePercorsoDto, FasciaGioco, PercorsoGiornoDto, PercorsoIndiceDto } from '../types';

export interface StatoMappaOggi {
  chiave: string;
  spilloId: number | null;
  /** Identità della voce che ha scelto questa mappa (evidenziata nell'elenco); null = mappa globale. */
  azione: string | null;
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
  /** Momento della giornata nella partita («giorno» o «sera»): decide quali spilli, articoli e negozi sono disponibili ora. */
  fascia: FasciaGioco;
  impostaFascia: (fascia: FasciaGioco) => Promise<void>;
  /** Segna il meteo di una fascia del giorno mostrato (`null` = torna a quello della guida). */
  impostaMeteo: (fascia: FasciaGioco, valore: MeteoPartita | null) => Promise<void>;
  occupato: boolean;
  mappa: StatoMappaOggi;
  /** «Sulla mappa» di una voce della giornata: la sua mappa e l'identità della voce da evidenziare. */
  sullaMappa: (mappa: { chiave: string; spilloId: number | null }, voce: string | null) => void;
  tornaAllaMappaGlobale: () => void;
  /** Scende a una mappa dell'atlante restando nella scheda «Oggi»: il clic su un quartiere della
   *  mappa di Tokyo non deve portare via dal giorno che si sta guardando. */
  apriMappa: (chiave: string) => void;
}

/** Carica il giorno corrente della partita (o quello scelto) con le sue azioni e tiene lo stato della mappa collegata. */
export function useOggi(partitaId: number): Oggi {
  const indice = useCarica(() => getPercorsoIndice(partitaId), [partitaId]);
  const [dataScelta, setDataScelta] = useState<string | null>(null);
  const data = dataScelta ?? indice.dati?.dataCorrente ?? indice.dati?.giorni[0]?.giorno ?? null;
  // il meteo segnato dalla finestra del cambio di giorno (`MeteoAlCambioGiorno`) cambia la giornata mostrata: si rilegge
  const versioneMeteo = useMeteoStore((s) => s.versione);
  const giorno = useCarica(() => (data ? getPercorsoGiorno(data, partitaId) : Promise.resolve(null)), [data, partitaId, versioneMeteo]);
  // Il giorno della partita è cambiato fuori da qui (l'ultima attività spuntata l'ha fatto avanzare, il Calendario, il
  // Riepilogo): «Oggi» va al giorno nuovo e l'indice (giorno corrente, conteggi) si rilegge.
  const dataPartita = usePartitaStore((s) => (s.attiva?.id === partitaId ? s.attiva.dataGioco ?? null : null));
  const ultimaDataPartita = useRef(dataPartita);
  const ricaricaIndice = indice.ricarica;
  useEffect(() => {
    if (ultimaDataPartita.current === dataPartita) return;
    ultimaDataPartita.current = dataPartita;
    setDataScelta(null);
    void ricaricaIndice();
  }, [dataPartita, ricaricaIndice]);
  const [mappa, setMappa] = useState<StatoMappaOggi>({ chiave: 'tokyo', spilloId: null, azione: null });
  const [occupato, setOccupato] = useState(false);
  // la fascia vive nella partita dello store: cambiandola si ricaricano da sole mappa incorporata, negozi e articoli
  const fascia = usePartitaStore((s) => (s.attiva?.id === partitaId ? s.attiva.fasciaGioco ?? 'giorno' : 'giorno'));
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
      const azioni = g.azioni.map((x) => (x.uid === a.uid ? a : x));
      giorno.imposta({ ...g, azioni, fatte: azioni.filter((x) => x.fatta).length });
      // i conteggi «fatte/azioni» dei giorni vengono dall'indice: si riallineano come dopo ogni altra modifica della giornata
      void indice.ricarica();
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
    fascia,
    impostaFascia: async (nuova) => {
      if (nuova === fascia) return;
      setOccupato(true);
      try {
        const partita = await impostaFasciaGioco(partitaId, nuova);
        usePartitaStore.getState().aggiornaLocale(partita);
        useSuggerimentiStore.getState().invalida();
        // di sera può piovere e di giorno no («Sereno/Pioggia»): gli stati delle azioni del giorno si rileggono
        void giorno.ricarica();
        notifica('success', nuova === 'sera' ? 'Ora è sera nella partita.' : 'Ora è giorno nella partita.');
      } catch (err) {
        notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
      } finally {
        setOccupato(false);
      }
    },
    impostaMeteo: async (quale, valore) => {
      if (!g) return;
      setOccupato(true);
      try {
        const esito = await impostaMeteoGiorno(partitaId, g.giorno, { [quale]: valore });
        giorno.imposta({ ...g, meteoPartita: esito.meteo });
        // il meteo cambia che cosa è disponibile ora: `meteoOra` della partita fa ricaricare mappa, negozi e articoli,
        // e le azioni del giorno (semafori «non deve piovere») si rileggono
        usePartitaStore.getState().aggiornaLocale(esito.partita);
        useSuggerimentiStore.getState().invalida();
        await giorno.ricarica();
      } catch (err) {
        notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
      } finally {
        setOccupato(false);
      }
    },
    occupato,
    mappa,
    sullaMappa: (m, voce) => setMappa({ chiave: m.chiave, spilloId: m.spilloId, azione: voce }),
    tornaAllaMappaGlobale: () => setMappa({ chiave: 'tokyo', spilloId: null, azione: null }),
    apriMappa: (chiave) => setMappa({ chiave, spilloId: null, azione: null }),
  };
}
