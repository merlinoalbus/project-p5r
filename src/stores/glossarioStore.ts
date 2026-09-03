// ============================================================
// Glossario Store — rese italiane e liste di riferimento (caricate una volta)
// ============================================================

import { create } from 'zustand';
import type { GlossarioDto } from '../types';
import { getGlossario } from '../services/api';

interface GlossarioState {
  glossario: GlossarioDto | null;
  caricamento: boolean;
  errore: string | null;
  carica: () => Promise<void>;
  /** Forza il ricaricamento (dopo una modifica delle traduzioni). */
  ricarica: () => Promise<void>;
}

/** Glossario condiviso da tutte le pagine (arcani, elementi, affinità, statistiche…). */
export const useGlossarioStore = create<GlossarioState>((set, get) => ({
  glossario: null,
  caricamento: false,
  errore: null,
  carica: async () => {
    if (get().glossario || get().caricamento) return;
    await get().ricarica();
  },
  ricarica: async () => {
    set({ caricamento: true, errore: null });
    try {
      const glossario = await getGlossario();
      set({ glossario, caricamento: false });
    } catch (err) {
      set({ caricamento: false, errore: err instanceof Error ? err.message : 'Errore di caricamento del glossario' });
    }
  },
}));
