// ============================================================
// useCodaProgresso — i «+»/«−» rapidi sul progresso di un elemento (libri, film, videogiochi), per partita
// ============================================================
//
// Le pressioni rapide non si perdono e non partono in parallelo: il numero mostrato è quello chiesto
// (`valore`), e una sola richiesta per volta per elemento lo insegue finché non lo raggiunge. Se una
// richiesta fallisce, il numero torna all'ultimo confermato dal server.
//
// **Tutto è per partita.** Le code hanno come chiave `partita:elemento`, e la partita corrente si legge da
// un ref aggiornato a ogni render: un ciclo partito nella partita A si ferma appena la partita attiva
// cambia, invece di scrivere in B il valore di A + 1. Prima le tre pagine copiavano la stessa logica, e
// Videogiochi l'aveva divergente: chiave senza partita e un controllo `partitaId !== id` che confrontava
// la closure con sé stessa, quindi non scattava mai (rilievo A1 della verifica completa, 2026-10-03).
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';

export interface OpzioniCodaProgresso<T extends { chiave: string; progresso: number }> {
  /** Scrive sul server il progresso dell'elemento nella partita e restituisce l'elemento aggiornato. */
  invia: (partitaId: number, chiave: string, progresso: number) => Promise<T>;
  /** Una risposta arrivata mentre la partita è ancora quella della richiesta: la pagina sostituisce l'elemento. */
  applica: (aggiornato: T) => void;
  /** Ogni risposta riuscita, anche se nel frattempo la partita è cambiata (es. l'avviso delle Doti da segnare). */
  dopoOgniInvio?: (aggiornato: T) => void;
  /** Il messaggio quando l'errore non ne porta uno. */
  messaggioErrore: string;
  /** Mostra l'errore (di norma `notifica('error', …)`): solo se la partita è ancora quella della richiesta. */
  segnalaErrore: (messaggio: string) => void;
}

export interface CodaProgresso<T extends { chiave: string; progresso: number }> {
  /** Il progresso da mostrare: quello chiesto, se ce n'è uno in coda, altrimenti quello dell'elemento. */
  valore: (elemento: T) => number;
  /** Vero mentre una richiesta per l'elemento è in volo. */
  occupato: (elemento: T) => boolean;
  /** Chiede un nuovo progresso (assoluto, già limitato dal chiamante) e avvia la coda se è ferma. */
  accoda: (elemento: T, progresso: number) => void;
}

/** Chiave di una coda: partita ed elemento insieme, così le code di partite diverse non si mescolano. */
const chiaveCoda =(partitaId: number, chiave: string): string => `${partitaId}:${chiave}`;

/** La coda dei progressi di una pagina, per la partita `partitaId` (null = nessuna partita: niente da scrivere). */
export function useCodaProgresso<T extends { chiave: string; progresso: number }>(partitaId: number | null, opz: OpzioniCodaProgresso<T>): CodaProgresso<T> {
  const partitaRef = useRef(partitaId);
  const opzRef = useRef(opz);
  useEffect(() => {
    partitaRef.current = partitaId;
    opzRef.current = opz;
  });
  const desideratiRef = useRef(new Map<string, number>());
  const confermatiRef = useRef(new Map<string, number>());
  const inVoloRef = useRef(new Set<string>());
  const [desiderati, setDesiderati] = useState<Record<string, number>>({});
  const [occupati, setOccupati] = useState<Record<string, boolean>>({});

  /** Una richiesta per volta insegue l'ultimo valore chiesto, finché la partita resta quella di partenza. */
  const esegui = useCallback(async (elemento: T, partita: number) => {
    const coda = chiaveCoda(partita, elemento.chiave);
    if (inVoloRef.current.has(coda)) return;
    inVoloRef.current.add(coda);
    // il confermato riparte dall'elemento, cioè dall'ultimo dato del server applicato alla pagina (anche dopo una rilettura)
    confermatiRef.current.set(coda, elemento.progresso);
    setOccupati((x) => ({ ...x, [coda]: true }));
    try {
      for (;;) {
        const confermato = confermatiRef.current.get(coda) ?? elemento.progresso;
        const desiderato = desideratiRef.current.get(coda) ?? confermato;
        if (desiderato === confermato || partitaRef.current !== partita) break;
        const aggiornato = await opzRef.current.invia(partita, elemento.chiave, desiderato);
        confermatiRef.current.set(coda, aggiornato.progresso);
        opzRef.current.dopoOgniInvio?.(aggiornato);
        if (partitaRef.current === partita) opzRef.current.applica(aggiornato);
      }
    } catch (err) {
      const confermato = confermatiRef.current.get(coda) ?? elemento.progresso;
      desideratiRef.current.set(coda, confermato);
      setDesiderati((x) => ({ ...x, [coda]: confermato }));
      if (partitaRef.current === partita) opzRef.current.segnalaErrore(err instanceof Error ? err.message : opzRef.current.messaggioErrore);
    } finally {
      inVoloRef.current.delete(coda);
      setOccupati((x) => ({ ...x, [coda]: false }));
      // Ferma la coda (valore raggiunto, partita cambiata, errore), il valore chiesto non serve più: il numero mostrato torna a
      // essere quello dell'elemento. Restando, tornando alla partita si sarebbe visto un valore mai salvato, e una rilettura dei
      // dati (una correzione da un'altra pagina) non si sarebbe vista.
      desideratiRef.current.delete(coda);
      setDesiderati((x) => { const { [coda]: _tolto, ...resto } = x; void _tolto; return resto; });
    }
  }, []);

  const accoda = useCallback((elemento: T, progresso: number) => {
    const partita = partitaRef.current;
    if (partita === null) return;
    const coda = chiaveCoda(partita, elemento.chiave);
    desideratiRef.current.set(coda, progresso);
    setDesiderati((x) => ({ ...x, [coda]: progresso }));
    void esegui(elemento, partita);
  }, [esegui]);

  // stabili finché non cambiano partita o valori: si possono mettere nelle dipendenze di un `useMemo`
  const valore = useCallback((elemento: T) => (partitaId === null ? elemento.progresso : desiderati[chiaveCoda(partitaId, elemento.chiave)] ?? elemento.progresso), [partitaId, desiderati]);
  const occupato = useCallback((elemento: T) => partitaId !== null && !!occupati[chiaveCoda(partitaId, elemento.chiave)], [partitaId, occupati]);
  return { valore, occupato, accoda };
}
