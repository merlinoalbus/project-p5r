// ============================================================
// suggerimentiStore — i suggerimenti del giorno corrente, condivisi da tutte le pagine per l'alone dorato
// ============================================================
//
// Una sola richiesta per partita, rinfrescata quando cambia il giorno o quando un'azione della guida viene spuntata (`invalida`).
// Le pagine usano `useSuggerimenti()`: restituisce `evidenziato(categoria, chiave)` e il motivo da mostrare come suggerimento.
// ============================================================

import { useEffect } from 'react';
import { create } from 'zustand';
import { getSuggerimenti } from '../services/api';
import { usePartitaStore } from './partitaStore';
import type { SuggerimentiOggiDto } from '../types';

export type CategoriaSuggerita = 'confidenti' | 'dungeon' | 'libri' | 'film' | 'attivita' | 'richieste' | 'negozi' | 'luoghi' | 'quartieri' | 'doti' | 'mappe' | 'spilli';

interface Stato {
  partitaId: number | null;
  dati: SuggerimentiOggiDto | null;
  caricamento: boolean;
  carica: (partitaId: number) => Promise<void>;
  /** Dopo una spunta nella guida (o un cambio di giorno) i suggerimenti cambiano: ricarica in silenzio. */
  invalida: () => void;
}

export const useSuggerimentiStore = create<Stato>((set, get) => ({
  partitaId: null,
  dati: null,
  caricamento: false,
  carica: async (partitaId) => {
    if (get().caricamento && get().partitaId === partitaId) return;
    set({ caricamento: true, partitaId });
    try {
      const dati = await getSuggerimenti(partitaId);
      // se nel frattempo è cambiata la partita, il risultato è obsoleto
      if (get().partitaId === partitaId) set({ dati, caricamento: false });
    } catch {
      // nessun suggerimento: l'interfaccia resta senza aloni, mai un errore bloccante
      if (get().partitaId === partitaId) set({ dati: null, caricamento: false });
    }
  },
  invalida: () => {
    const id = get().partitaId;
    set({ caricamento: false });
    if (id) void get().carica(id);
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
  const attiva = usePartitaStore((s) => s.attiva);
  const dati = useSuggerimentiStore((s) => s.dati);
  const partitaId = useSuggerimentiStore((s) => s.partitaId);
  const carica = useSuggerimentiStore((s) => s.carica);
  useEffect(() => {
    if (attiva && partitaId !== attiva.id) void carica(attiva.id);
  }, [attiva, partitaId, carica]);
  if (!attiva || !dati) return VUOTI;
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
}
