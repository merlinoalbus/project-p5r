// ============================================================
// useCarica — caricamento asincrono con stato uniforme (dati, caricamento, errore, ricarica)
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notifica } from '../stores/notificationStore';
import { leggiCacheGioco } from '../services/api/cacheGioco';

/** Nel rilascio i contenuti sono fissi (condizione costante nello stesso modulo, come negli altri file: vedi progetto delle due istanze §7). */
const CONTENUTI_FISSI = import.meta.env.VITE_MODALITA === 'rilascio';

/** Opzioni di `useCarica`. */
export interface OpzioniCarica {
  /** L'indirizzo (come in `apiGetGioco`) di cui `carica` restituisce ESATTAMENTE il contenuto, per i soli dati di gioco senza partita:
   *  l'ultima lettura in cache si mostra subito e poi si rilegge in silenzio. Non si passa se `carica` trasforma o unisce risposte. */
  cacheUrl?: string | null;
}

interface Stato<T> {
  dati: T | null;
  caricamento: boolean;
  /** Vero solo finché non c'è ancora nessun dato da mostrare (primo caricamento o dipendenze cambiate). Una rilettura sulle
   *  stesse dipendenze NON lo accende: è il valore da dare a `PageState.isLoading`, così un «Salva» che rilegge la pagina non la
   *  sostituisce con lo spinner (e non smonta gli editor aperti nei figli). `caricamento` resta per disabilitare i comandi. */
  inPrimoCaricamento: boolean;
  /** Errore del caricamento **senza dati da mostrare**: è quello che `PageState` trasforma nella schermata «Riprova». */
  errore: string | null;
  /** Errore di una **rilettura** fallita mentre i dati già mostrati restano: la pagina non sparisce, il messaggio è anche
   *  notificato (resta finché non lo si chiude). Si azzera alla rilettura riuscita. */
  erroreRilettura: string | null;
  /** Rilegge i dati; la promessa si risolve quando la rilettura è arrivata (riuscita o fallita), non prima. */
  ricarica: () => Promise<void>;
  /** Sostituisce i dati in locale (dopo una scrittura riuscita). Con una funzione si parte dai dati **correnti**, non da quelli
   *  catturati al render: due aggiornamenti ravvicinati (due spunte prima che la prima risposta arrivi) si sommano invece di
   *  annullarsi. Senza dati la funzione non viene chiamata. Una lettura già in volo, partita prima di questo aggiornamento,
   *  non lo sovrascrive: viene scartata e rifatta. */
  imposta: (d: T | ((attuali: NonNullable<T>) => T)) => void;
}

interface Esito<T> {
  /** Dipendenze (serializzate) e generazione a cui si riferisce l'esito. */
  chiave: string;
  tick: number;
  dati: T | null;
  errore: string | null;
  erroreRilettura: string | null;
}

/** Quante volte di fila una lettura in volo può essere scartata perché nel frattempo è arrivato un `imposta`: oltre, la risposta
 *  si accetta comunque (un chiamante che imposta a ogni esito non deve innescare un ciclo di richieste). */
const MAX_RIAVVII = 2;

/**
 * Esegue `carica` al montaggio e a ogni cambio delle dipendenze (confrontate
 * per valore) o a ogni `ricarica()`. Lo stato "caricamento" è derivato: è
 * vero finché l'ultimo esito non corrisponde a dipendenze e generazione correnti.
 *
 * Una rilettura fallita (stesse dipendenze, dati già presenti) **non cancella i dati**: restano a schermo e l'errore va in
 * `erroreRilettura` e in una notifica. Solo un caricamento senza dati precedenti produce `errore` (la schermata «Riprova»).
 */
export function useCarica<T>(carica: () => Promise<T>, dipendenze: unknown[], opzioni?: OpzioniCarica): Stato<T> {
  const chiave = JSON.stringify(dipendenze);
  const cacheUrl = opzioni?.cacheUrl ?? null;
  // L'ultima lettura in cache di quell'indirizzo (una copia), presa una volta per indirizzo: è il dato mostrato subito, prima che
  // arrivi la rilettura. Resta `undefined` per ogni lettura senza `cacheUrl` e per quelle mai fatte o svuotate da una scrittura.
  const daCache = useMemo(() => leggiCacheGioco<T>(cacheUrl), [cacheUrl]);
  const daCacheRef = useRef(daCache);
  const [tick, setTick] = useState(0);
  const [esito, setEsito] = useState<Esito<T> | null>(null);
  const caricaRef = useRef(carica);
  // l'ultimo esito scritto, letto in modo sincrono: serve a `imposta` (due chiamate di fila si sommano) e a decidere, a fine
  // lettura, se ci sono dati precedenti da conservare
  const esitoRef = useRef<Esito<T> | null>(null);
  // l'ultima generazione chiesta e chi aspetta una rilettura: si risolvono quando arriva l'esito di una generazione ≥ la loro
  const tickRef = useRef(0);
  const attese = useRef<Array<{ tick: number; risolvi: () => void }>>([]);
  // conta gli `imposta`: una lettura partita prima dell'ultimo non può più essere applicata così com'è
  const versioneRef = useRef(0);
  const riaviRef = useRef(0);

  useEffect(() => {
    caricaRef.current = carica;
    daCacheRef.current = daCache;
  });

  /** Scrive l'esito nello stato e nel riferimento sincrono. */
  const scrivi = useCallback((e: Esito<T> | null) => {
    esitoRef.current = e;
    setEsito(e);
  }, []);

  // smontato il componente nessun esito arriverà più: chi aspetta non resta appeso, e una `ricarica()` chiesta dopo (per esempio
  // da un gesto che ha appena navigato altrove) si risolve subito
  const smontato = useRef(false);
  useEffect(() => {
    smontato.current = false;
    return () => {
      smontato.current = true;
      for (const a of attese.current) a.risolvi();
      attese.current = [];
    };
  }, []);

  useEffect(() => {
    let attivo = true;
    const versioneAllAvvio = versioneRef.current;
    /** Registra l'esito del caricamento (se l'effetto è ancora attivo) e risolve le `ricarica()` in attesa di questa generazione o di una precedente. */
    const concludi = (e: Esito<T>): void => {
      if (!attivo) return;
      // un `imposta` è arrivato mentre la lettura era in volo: la risposta può non contenerlo e riporterebbe indietro la
      // schermata. Si scarta e si rifà (le `ricarica()` in attesa restano appese alla lettura nuova)
      if (versioneRef.current !== versioneAllAvvio && riaviRef.current < MAX_RIAVVII) {
        riaviRef.current += 1;
        setTick(++tickRef.current);
        return;
      }
      riaviRef.current = 0;
      scrivi(e);
      const pronte = attese.current.filter((a) => a.tick <= tick);
      attese.current = attese.current.filter((a) => a.tick > tick);
      for (const a of pronte) a.risolvi();
    };
    // Nel rilascio i contenuti sono fissi: la prima lettura di una chiave già in cache non rifà la rete (l'edizione nuova cambia
    // la versione dell'app e ricarica la pagina). Nella preparazione la cache si mostra subito e si rilegge in silenzio.
    // Una `ricarica()` esplicita ha già un esito per questa chiave e va sempre in rete.
    const dallaCache = daCacheRef.current;
    const salvaRete = CONTENUTI_FISSI && dallaCache !== undefined && esitoRef.current?.chiave !== chiave;
    (salvaRete ? Promise.resolve(dallaCache as T) : caricaRef.current())
      .then((d) => concludi({ chiave, tick, dati: d, errore: null, erroreRilettura: null }))
      .catch((err: unknown) => {
        const messaggio = err instanceof Error ? err.message : 'Errore di caricamento';
        const prima = esitoRef.current;
        // rilettura fallita con dati già mostrati per le stesse dipendenze: restano al loro posto, l'errore si dichiara a parte
        // (anche se i dati mostrati sono quelli della cache: la pagina non sparisce per una rilettura silenziosa andata male)
        if ((!prima || prima.chiave !== chiave) && dallaCache !== undefined) {
          if (attivo) notifica('error', messaggio);
          concludi({ chiave, tick, dati: dallaCache, errore: null, erroreRilettura: messaggio });
          return;
        }
        if (prima && prima.chiave === chiave && prima.dati !== null && prima.dati !== undefined) {
          // lo stesso messaggio che il client HTTP ha già notificato (se non era una lettura silenziosa) non si duplica: la coda
          // scarta le notifiche identiche ancora a schermo
          if (attivo) notifica('error', messaggio);
          concludi({ chiave, tick, dati: prima.dati, errore: null, erroreRilettura: messaggio });
          return;
        }
        concludi({ chiave, tick, dati: null, errore: messaggio, erroreRilettura: null });
      });
    return () => {
      attivo = false;
    };
  }, [chiave, tick, scrivi]);

  const ricarica = useCallback(() => {
    if (smontato.current) return Promise.resolve();
    const t = ++tickRef.current;
    setTick(t);
    return new Promise<void>((risolvi) => { attese.current.push({ tick: t, risolvi }); });
  }, []);
  const imposta = useCallback((d: T | ((attuali: NonNullable<T>) => T)) => {
    versioneRef.current += 1;
    const e = esitoRef.current;
    if (typeof d === 'function') {
      // prima che arrivi un esito, i dati mostrati possono essere quelli della cache: l'aggiornamento parte da quelli
      const attuali = e?.dati ?? daCacheRef.current;
      if (attuali === null || attuali === undefined) return;
      const nuovi = (d as (attuali: NonNullable<T>) => T)(attuali as NonNullable<T>);
      scrivi(e ? { ...e, dati: nuovi } : { chiave, tick, dati: nuovi, errore: null, erroreRilettura: null });
      return;
    }
    scrivi(e ? { ...e, dati: d } : { chiave, tick, dati: d, errore: null, erroreRilettura: null });
  }, [chiave, tick, scrivi]);

  const aggiornato = esito !== null && esito.chiave === chiave && esito.tick === tick;
  // Durante una ricarica sulle stesse dipendenze si mantengono i dati precedenti visibili.
  // Se per questa chiave non c'è ancora un esito si mostra la lettura in cache (se c'è): niente spinner, la rilettura arriva dopo.
  const dati = esito && esito.chiave === chiave ? esito.dati : (daCache ?? null);
  return {
    dati,
    caricamento: !aggiornato,
    inPrimoCaricamento: !aggiornato && (dati === null || dati === undefined),
    errore: aggiornato ? esito.errore : null,
    erroreRilettura: aggiornato ? esito.erroreRilettura : null,
    ricarica,
    imposta,
  };
}
