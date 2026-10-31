// ============================================================
// useOggi — stato condiviso della scheda «Oggi»: giorno della guida, azioni con spunta e mappa collegata (Fase 12.4 / 13.5)
// ============================================================
//
// Un solo caricamento per (partita, giorno) condiviso dalla guida e dalla mappa, che nella Home stanno in due colonne diverse.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMeteoStore } from '../stores/meteoStore';
import { getPercorsoGiorno, getPercorsoIndice, impostaFasciaGioco, impostaGiornoCorrente, impostaMeteoGiorno } from '../services/api';
import type { MeteoPartita } from '../../shared/meteoPartita';
import { useCarica, type CausaErrore } from './useCarica';
import { notifica } from '../stores/notificationStore';
import { usePartitaStore } from '../stores/partitaStore';
import { useSuggerimentiStore } from '../stores/suggerimentiStore';
import { dataGiocoTesto } from '../utils/dateGioco';
import type { AzionePercorsoDto, FasciaGioco, PercorsoGiornoDto, PercorsoIndiceDto } from '../types';

export interface StatoMappaOggi {
  chiave: string;
  spilloId: number | null;
  /** Il punto su cui centrare la mappa aperta dalla metro (l'ingresso di un quartiere, L2); null altrimenti. */
  centro?: { x: number; y: number; zoom: number } | null;
  /** Identità della voce che ha scelto questa mappa (evidenziata nell'elenco); null = mappa globale. */
  azione: string | null;
  /** Quante volte una voce della giornata ha chiesto la mappa («Sulla mappa», il cartellino di un Palazzo): quando cambia, la
   *  colonna della mappa si porta in vista se è fuori dallo schermo (sul telefono sta in fondo; scelta dell'utente, 2026-10-04). */
  richiesta: number;
}

export interface Oggi {
  indice: PercorsoIndiceDto | null;
  giorno: PercorsoGiornoDto | null;
  caricamento: boolean;
  errore: string | null;
  /** Il genere dell'errore a schermo (offline, rete, timeout, server), per il titolo della schermata. */
  causaErrore: CausaErrore;
  /** Se la guida mostrata è l'ultima lettura buona perché la rete o il server non rispondono: l'ora (ms) in cui fu letta; altrimenti `null`. */
  lettaAlle: number | null;
  /** Perché la guida mostrata è vecchia (vale solo con `lettaAlle`): offline, rete, timeout o server. */
  causaLettura: CausaErrore;
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
   *  mappa di Tokyo non deve portare via dal giorno che si sta guardando. Con lo spillo (l'atterraggio di un Palazzo,
   *  2026-10-04) la mappa si apre centrata su quello; col centro (l'ingresso di un quartiere, L2) su quel punto e con quello zoom. */
  apriMappa: (chiave: string, spilloId?: number | null, centro?: { x: number; y: number; zoom: number } | null) => void;
}

/** Un'ultima lettura buona, con l'ora in cui è arrivata. */
interface Lettura<T> { dati: T; alle: number }

/** Quanti giorni di guida si tengono in memoria (i più recenti): la guida di un giorno è grande, e serve solo a non restare a mani vuote senza rete. */
const MAX_GIORNI_IN_MEMORIA = 12;
/**
 * L'ultima lettura buona dell'indice e dei giorni della guida, SOLO in memoria della scheda (un modulo, non la cache persistente: i dati di
 * partita non vi vanno mai, vedi `cacheGioco.ts`). Se la lettura fallisce per la rete o per il server, la Home mostra questa col suo orario invece
 * di perdere la guida; con la rete di nuovo, la rilettura la sostituisce.
 */
const ultimiIndici = new Map<number, Lettura<PercorsoIndiceDto>>();
const ultimiGiorni = new Map<string, Lettura<PercorsoGiornoDto>>();

const chiaveGiorno = (partitaId: number, data: string): string => `${partitaId}|${data}`;

function ricorda<K, T>(mappa: Map<K, Lettura<T>>, chiave: K, dati: T): void {
  mappa.delete(chiave); // rimessa in coda: la più vecchia è la prima a uscire
  mappa.set(chiave, { dati, alle: Date.now() });
  if (mappa.size > MAX_GIORNI_IN_MEMORIA) mappa.delete(mappa.keys().next().value as K);
}

/** Carica il giorno corrente della partita (o quello scelto) con le sue azioni e tiene lo stato della mappa collegata. */
export function useOggi(partitaId: number): Oggi {
  const indice = useCarica(() => getPercorsoIndice(partitaId), [partitaId]);
  const [dataScelta, setDataScelta] = useState<string | null>(null);
  // lettura fallita per la rete o per il server: si mostra l'ultima buona di questa partita (se c'è), col suo orario
  const indiceVecchio = indice.dati === null && indice.errore !== null && indice.causaErrore !== null ? ultimiIndici.get(partitaId) ?? null : null;
  const datiIndice = indice.dati ?? indiceVecchio?.dati ?? null;
  const data = dataScelta ?? datiIndice?.dataCorrente ?? datiIndice?.giorni[0]?.giorno ?? null;
  // il meteo segnato dalla finestra del cambio di giorno (`MeteoAlCambioGiorno`) cambia la giornata mostrata: si rilegge
  const versioneMeteo = useMeteoStore((s) => s.versione);
  // `versioneMeteo` NON è fra le dipendenze: cambiandole il giorno si azzererebbe (spinner al posto della giornata) a ogni meteo
  // segnato. Si rilegge con `ricarica()`, che tiene a schermo la giornata mentre arriva quella nuova (effetto qui sotto).
  const giorno = useCarica(() => (data ? getPercorsoGiorno(data, partitaId) : Promise.resolve(null)), [data, partitaId]);
  const rileggiGiornoMeteo = giorno.ricarica;
  const ultimaVersioneMeteo = useRef(versioneMeteo);
  useEffect(() => {
    if (ultimaVersioneMeteo.current === versioneMeteo) return;
    ultimaVersioneMeteo.current = versioneMeteo;
    void rileggiGiornoMeteo();
  }, [versioneMeteo, rileggiGiornoMeteo]);
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
  const [mappa, setMappa] = useState<StatoMappaOggi>({ chiave: 'tokyo', spilloId: null, azione: null, richiesta: 0 });
  const [occupato, setOccupato] = useState(false);
  // la fascia vive nella partita dello store: cambiandola si ricaricano da sole mappa incorporata, negozi e articoli
  const fascia = usePartitaStore((s) => (s.attiva?.id === partitaId ? s.attiva.fasciaGioco ?? 'giorno' : 'giorno'));
  const giornoVecchio = giorno.dati === null && giorno.errore !== null && giorno.causaErrore !== null && data ? ultimiGiorni.get(chiaveGiorno(partitaId, data)) ?? null : null;
  const g = giorno.dati ?? giornoVecchio?.dati ?? null;
  // una lettura buona si ricorda per la prossima volta che la rete manca
  const letturaIndice = indice.dati;
  const letturaGiorno = giorno.dati;
  useEffect(() => { if (letturaIndice) ricorda(ultimiIndici, partitaId, letturaIndice); }, [letturaIndice, partitaId]);
  useEffect(() => { if (letturaGiorno) ricorda(ultimiGiorni, chiaveGiorno(partitaId, letturaGiorno.giorno), letturaGiorno); }, [letturaGiorno, partitaId]);
  // l'errore resta solo se non c'è niente da mostrare al suo posto
  const erroreIndice = indiceVecchio ? null : indice.errore;
  const erroreGiorno = giornoVecchio ? null : giorno.errore;
  const causaErrore = erroreIndice !== null ? indice.causaErrore : erroreGiorno !== null ? giorno.causaErrore : null;
  const causaLettura = indiceVecchio ? indice.causaErrore : giornoVecchio ? giorno.causaErrore : null;
  const vecchie = [indiceVecchio?.alle, giornoVecchio?.alle].filter((x): x is number => x !== undefined);
  const lettaAlle = vecchie.length > 0 ? Math.min(...vecchie) : null;
  const { caricamento: caricaIndice, ricarica: rileggiIndice, imposta: impostaIndice } = indice;
  const { caricamento: caricaGiorno, ricarica: rileggiGiorno, imposta: impostaGiorno } = giorno;

  // lo stesso oggetto finché non cambia uno dei suoi ingressi (P5"): prima, funzioni comprese, era nuovo a ogni disegno
  return useMemo<Oggi>(() => ({
    indice: datiIndice,
    giorno: g,
    caricamento: (caricaIndice && !datiIndice) || (caricaGiorno && !g),
    errore: erroreIndice ?? erroreGiorno,
    causaErrore,
    lettaAlle,
    causaLettura,
    ricarica: async () => { await rileggiIndice(); await rileggiGiorno(); },
    partitaId,
    vaiAlGiorno: (d) => { if (d) setDataScelta(d); },
    aggiornaAzione: (a) => {
      if (!g) return;
      // dai dati correnti, non dalla `g` di questo render: arriva dopo un `await`, e una seconda spunta nel frattempo si perderebbe
      impostaGiorno((attuale) => {
        const azioni = attuale.azioni.map((x) => (x.uid === a.uid ? a : x));
        return { ...attuale, azioni, fatte: azioni.filter((x) => x.fatta).length };
      });
      // i conteggi «fatte/azioni» dei giorni vengono dall'indice: si riallineano come dopo ogni altra modifica della giornata
      void rileggiIndice();
    },
    segnaCorrente: async () => {
      if (!g) return;
      setOccupato(true);
      try {
        const esito = await impostaGiornoCorrente(partitaId, g.giorno);
        impostaGiorno((attuale) => ({ ...attuale, dataCorrente: g.giorno }));
        impostaIndice((attuale) => ({ ...attuale, dataCorrente: g.giorno }));
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
        void rileggiGiorno();
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
        impostaGiorno((attuale) => ({ ...attuale, meteoPartita: esito.meteo }));
        // il meteo cambia che cosa è disponibile ora: `meteoOra` della partita fa ricaricare mappa, negozi e articoli,
        // e le azioni del giorno (semafori «non deve piovere») si rileggono
        usePartitaStore.getState().aggiornaLocale(esito.partita);
        useSuggerimentiStore.getState().invalida();
        await rileggiGiorno();
      } catch (err) {
        notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
      } finally {
        setOccupato(false);
      }
    },
    occupato,
    mappa,
    sullaMappa: (m, voce) => setMappa((p) => ({ chiave: m.chiave, spilloId: m.spilloId, azione: voce, richiesta: p.richiesta + 1 })),
    tornaAllaMappaGlobale: () => setMappa((p) => ({ chiave: 'tokyo', spilloId: null, azione: null, richiesta: p.richiesta })),
    apriMappa: (chiave, spilloId = null, centro = null) => setMappa((p) => ({ chiave, spilloId, centro, azione: null, richiesta: p.richiesta })),
  }), [datiIndice, caricaIndice, erroreIndice, causaErrore, lettaAlle, causaLettura, rileggiIndice, impostaIndice, g, caricaGiorno, erroreGiorno, rileggiGiorno, impostaGiorno, partitaId, fascia, occupato, mappa]);
}
