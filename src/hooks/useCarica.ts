// ============================================================
// useCarica — caricamento asincrono con stato uniforme (dati, caricamento, errore, ricarica)
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { notifica } from '../stores/notificationStore';

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
export function useCarica<T>(carica: () => Promise<T>, dipendenze: unknown[]): Stato<T> {
  const chiave = JSON.stringify(dipendenze);
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
    caricaRef
      .current()
      .then((d) => concludi({ chiave, tick, dati: d, errore: null, erroreRilettura: null }))
      .catch((err: unknown) => {
        const messaggio = err instanceof Error ? err.message : 'Errore di caricamento';
        const prima = esitoRef.current;
        // rilettura fallita con dati già mostrati per le stesse dipendenze: restano al loro posto, l'errore si dichiara a parte
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
      if (!e || e.dati === null || e.dati === undefined) return;
      scrivi({ ...e, dati: (d as (attuali: NonNullable<T>) => T)(e.dati as NonNullable<T>) });
      return;
    }
    scrivi(e ? { ...e, dati: d } : { chiave, tick, dati: d, errore: null, erroreRilettura: null });
  }, [chiave, tick, scrivi]);

  const aggiornato = esito !== null && esito.chiave === chiave && esito.tick === tick;
  // Durante una ricarica sulle stesse dipendenze si mantengono i dati precedenti visibili.
  const dati = esito && esito.chiave === chiave ? esito.dati : null;
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
