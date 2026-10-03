// ============================================================
// useCarica — caricamento asincrono con stato uniforme (dati, caricamento, errore, ricarica)
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';

interface Stato<T> {
  dati: T | null;
  caricamento: boolean;
  errore: string | null;
  /** Rilegge i dati; la promessa si risolve quando la rilettura è arrivata (riuscita o fallita), non prima. */
  ricarica: () => Promise<void>;
  /** Sostituisce i dati in locale (dopo una scrittura riuscita). Con una funzione si parte dai dati **correnti**, non da quelli
   *  catturati al render: due aggiornamenti ravvicinati (due spunte prima che la prima risposta arrivi) si sommano invece di
   *  annullarsi. Senza dati la funzione non viene chiamata. */
  imposta: (d: T | ((attuali: NonNullable<T>) => T)) => void;
}

interface Esito<T> {
  /** Dipendenze (serializzate) e generazione a cui si riferisce l'esito. */
  chiave: string;
  tick: number;
  dati: T | null;
  errore: string | null;
}

/**
 * Esegue `carica` al montaggio e a ogni cambio delle dipendenze (confrontate
 * per valore) o a ogni `ricarica()`. Lo stato "caricamento" è derivato: è
 * vero finché l'ultimo esito non corrisponde a dipendenze e generazione correnti.
 */
export function useCarica<T>(carica: () => Promise<T>, dipendenze: unknown[]): Stato<T> {
  const chiave = JSON.stringify(dipendenze);
  const [tick, setTick] = useState(0);
  const [esito, setEsito] = useState<Esito<T> | null>(null);
  const caricaRef = useRef(carica);
  // l'ultima generazione chiesta e chi aspetta una rilettura: si risolvono quando arriva l'esito di una generazione ≥ la loro
  const tickRef = useRef(0);
  const attese = useRef<Array<{ tick: number; risolvi: () => void }>>([]);

  useEffect(() => {
    caricaRef.current = carica;
  });

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
    const concludi = (e: Esito<T>): void => {
      if (!attivo) return;
      setEsito(e);
      const pronte = attese.current.filter((a) => a.tick <= tick);
      attese.current = attese.current.filter((a) => a.tick > tick);
      for (const a of pronte) a.risolvi();
    };
    caricaRef
      .current()
      .then((d) => concludi({ chiave, tick, dati: d, errore: null }))
      .catch((err: unknown) => concludi({ chiave, tick, dati: null, errore: err instanceof Error ? err.message : 'Errore di caricamento' }));
    return () => {
      attivo = false;
    };
  }, [chiave, tick]);

  const ricarica = useCallback(() => {
    if (smontato.current) return Promise.resolve();
    const t = ++tickRef.current;
    setTick(t);
    return new Promise<void>((risolvi) => { attese.current.push({ tick: t, risolvi }); });
  }, []);
  const imposta = useCallback((d: T | ((attuali: NonNullable<T>) => T)) => setEsito((e) => {
    if (typeof d === 'function') {
      if (!e || e.dati === null || e.dati === undefined) return e;
      return { ...e, dati: (d as (attuali: NonNullable<T>) => T)(e.dati as NonNullable<T>) };
    }
    return e ? { ...e, dati: d } : { chiave, tick, dati: d, errore: null };
  }), [chiave, tick]);

  const aggiornato = esito !== null && esito.chiave === chiave && esito.tick === tick;
  // Durante una ricarica sulle stesse dipendenze si mantengono i dati precedenti visibili.
  const dati = esito && esito.chiave === chiave ? esito.dati : null;
  return { dati, caricamento: !aggiornato, errore: aggiornato ? esito.errore : null, ricarica, imposta };
}
