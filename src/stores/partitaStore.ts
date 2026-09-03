// ============================================================
// Partita Store — elenco partite e partita attiva
// ============================================================

import { create } from 'zustand';
import type { PartitaDto } from '../types';
import { attivaPartita, creaPartita, eliminaPartita, getPartite, type DatiPartita } from '../services/api';

interface PartitaState {
  partite: PartitaDto[];
  attiva: PartitaDto | null;
  caricamento: boolean;
  caricata: boolean;
  errore: string | null;
  carica: () => Promise<void>;
  crea: (dati: DatiPartita & { nome: string }) => Promise<PartitaDto>;
  rendiAttiva: (id: number) => Promise<void>;
  elimina: (id: number) => Promise<void>;
  /** Aggiorna una partita già presente nell'elenco (dopo un PUT). */
  aggiornaLocale: (p: PartitaDto) => void;
}

/** Stato delle partite: l'attiva è quella su cui lavorano tutte le pagine di tracking. */
export const usePartitaStore = create<PartitaState>((set, get) => ({
  partite: [],
  attiva: null,
  caricamento: false,
  caricata: false,
  errore: null,
  carica: async () => {
    if (get().caricamento) return;
    set({ caricamento: true, errore: null });
    try {
      const partite = await getPartite();
      set({ partite, attiva: partite.find((p) => p.attiva) ?? null, caricamento: false, caricata: true });
    } catch (err) {
      set({ caricamento: false, caricata: true, errore: err instanceof Error ? err.message : 'Errore di caricamento delle partite' });
    }
  },
  crea: async (dati) => {
    const nuova = await creaPartita({ ...dati, attiva: true });
    await get().carica();
    return nuova;
  },
  rendiAttiva: async (id) => {
    await attivaPartita(id);
    await get().carica();
  },
  elimina: async (id) => {
    await eliminaPartita(id);
    await get().carica();
  },
  aggiornaLocale: (p) =>
    set((s) => ({
      partite: s.partite.map((x) => (x.id === p.id ? p : x)),
      attiva: s.attiva?.id === p.id ? p : s.attiva,
    })),
}));
