// ============================================================
// suggerimentiStore — i suggerimenti del giorno corrente, condivisi da tutte le pagine per l'alone dorato
// ============================================================
//
// Una sola richiesta per partita, rinfrescata quando cambia il giorno o quando un'azione della guida viene spuntata (`invalida`).
// Le pagine usano `useSuggerimenti()`: restituisce `evidenziato(categoria, chiave)` e il motivo da mostrare come suggerimento.
// ============================================================

import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { getSuggerimenti } from '../services/api';
import { usePartitaStore } from './partitaStore';
import type { SuggerimentiOggiDto } from '../types';

export type CategoriaSuggerita = 'confidenti' | 'personaggi' | 'dungeon' | 'aree' | 'libri' | 'film' | 'articoli' | 'attivita' | 'richieste' | 'negozi' | 'luoghi' | 'quartieri' | 'doti' | 'mappe' | 'spilli';

interface Stato {
  partitaId: number | null;
  dati: SuggerimentiOggiDto | null;
  caricamento: boolean;
  /** Carica i suggerimenti della partita; `forza` ne chiede di nuovi anche se una richiesta è già in corso (la più recente vince). */
  carica: (partitaId: number, forza?: boolean) => Promise<void>;
  /** Dopo una spunta nella guida (o un cambio di giorno) i suggerimenti cambiano: ricarica in silenzio. */
  invalida: () => void;
}

/** Ogni richiesta ha una generazione: vale solo la risposta dell'ultima. Confrontare la sola partita non bastava, perché una
 *  richiesta vecchia (partita prima di una spunta) poteva arrivare dopo quella nuova e rimettere l'alone superato. */
let generazione = 0;

export const useSuggerimentiStore = create<Stato>((set, get) => ({
  partitaId: null,
  dati: null,
  caricamento: false,
  carica: async (partitaId, forza = false) => {
    if (!forza && get().caricamento && get().partitaId === partitaId) return;
    const questa = ++generazione;
    // cambiando partita i suggerimenti della precedente spariscono subito: meglio nessun alone che quello di un'altra partita
    set(get().partitaId === partitaId ? { caricamento: true } : { caricamento: true, partitaId, dati: null });
    try {
      const dati = await getSuggerimenti(partitaId);
      if (questa === generazione) set({ dati, caricamento: false });
    } catch {
      // nessun suggerimento: l'interfaccia resta senza aloni, mai un errore bloccante
      if (questa === generazione) set({ dati: null, caricamento: false });
    }
  },
  invalida: () => {
    const id = get().partitaId;
    if (id) void get().carica(id, true);
  },
}));

export interface Suggerimenti {
  /** True se l'entità è coinvolta in un'azione ancora da fare del giorno corrente. */
  evidenziato: (categoria: CategoriaSuggerita, chiave: string | number | null | undefined) => boolean;
  /** Testo dell'azione suggerita (per il titolo dell'elemento evidenziato). */
  motivo: (categoria: CategoriaSuggerita, chiave: string | number | null | undefined) => string | null;
  /** Giorno di riferimento ('MM-GG'), null senza partita o senza giorno corrente. */
  giorno: string | null;
}

const VUOTI: Suggerimenti = { evidenziato: () => false, motivo: () => null, giorno: null };

/** Suggerimenti del giorno per la partita attiva: carica una volta e resta condiviso fra le pagine. */
export function useSuggerimenti(): Suggerimenti {
  // solo l'id della partita attiva (P4"): l'oggetto intero cambia a ogni aggiornamento della partita, e i dodici componenti che
  // usano i suggerimenti si ridisegnavano tutti; il risultato resta lo stesso oggetto finché non cambiano dati o partita
  const attivaId = usePartitaStore((s) => s.attiva?.id ?? null);
  const dati = useSuggerimentiStore((s) => s.dati);
  const partitaId = useSuggerimentiStore((s) => s.partitaId);
  const carica = useSuggerimentiStore((s) => s.carica);
  useEffect(() => {
    if (attivaId !== null && partitaId !== attivaId) void carica(attivaId);
  }, [attivaId, partitaId, carica]);
  return useMemo<Suggerimenti>(() => {
    if (attivaId === null || !dati) return VUOTI;
    return {
      giorno: dati.giorno,
      evidenziato: (categoria, chiave) => {
        if (chiave === null || chiave === undefined) return false;
        const elenco = dati[categoria] as Array<string | number> | undefined;
        return Array.isArray(elenco) && elenco.some((x) => x === chiave);
      },
      motivo: (categoria, chiave) => {
        if (chiave === null || chiave === undefined) return null;
        const m = dati.motivi.find((x) => x.categoria === categoria && x.chiave === String(chiave));
        return m ? `Suggerito oggi (${m.fascia}): ${m.azione}` : null;
      },
    };
  }, [attivaId, dati]);
}
