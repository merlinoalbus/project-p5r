// ============================================================
// useCarica — caricamento asincrono con stato uniforme (dati, caricamento, errore, ricarica)
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';

interface Stato<T> {
  dati: T | null;
  caricamento: boolean;
  errore: string | null;
  ricarica: () => Promise<void>;
  /** Sostituisce i dati in locale (dopo una scrittura riuscita). */
  imposta: (d: T) => void;
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

  useEffect(() => {
    caricaRef.current = carica;
  });

  useEffect(() => {
    let attivo = true;
    caricaRef
      .current()
      .then((d) => {
        if (attivo) setEsito({ chiave, tick, dati: d, errore: null });
      })
      .catch((err: unknown) => {
        if (attivo) setEsito({ chiave, tick, dati: null, errore: err instanceof Error ? err.message : 'Errore di caricamento' });
      });
    return () => {
      attivo = false;
    };
  }, [chiave, tick]);

  const ricarica = useCallback(async () => {
    setTick((t) => t + 1);
  }, []);
  const imposta = useCallback((d: T) => setEsito((e) => (e ? { ...e, dati: d } : { chiave, tick, dati: d, errore: null })), [chiave, tick]);

  const aggiornato = esito !== null && esito.chiave === chiave && esito.tick === tick;
  // Durante una ricarica sulle stesse dipendenze si mantengono i dati precedenti visibili.
  const dati = esito && esito.chiave === chiave ? esito.dati : null;
  return { dati, caricamento: !aggiornato, errore: aggiornato ? esito.errore : null, ricarica, imposta };
}
