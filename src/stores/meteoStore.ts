// ============================================================
// meteoStore — la richiesta del meteo al cambio di giorno e il segnale «il meteo è cambiato»
// ============================================================
//
// Richiesta dell'utente (2026-09-30): «fammi impostare il meteo quando faccio il cambio giorno». `MeteoAlCambioGiorno`
// (montato in `MainLayout`) apre la scelta quando la data della partita attiva cambia — da «Segna come giorno corrente»,
// dal Calendario, dal Riepilogo o perché l'ultima attività del giorno è stata spuntata. `versione` cresce a ogni meteo
// segnato da lì, perché la scheda «Oggi» rilegga la sua giornata.
// ============================================================

import { create } from 'zustand';

interface MeteoState {
  /** Il giorno di cui chiedere il meteo, o null. */
  richiesta: { partitaId: number; data: string } | null;
  versione: number;
  chiedi: (partitaId: number, data: string) => void;
  chiudi: () => void;
  cambiato: () => void;
}

export const useMeteoStore = create<MeteoState>((set) => ({
  richiesta: null,
  versione: 0,
  chiedi: (partitaId, data) => set({ richiesta: { partitaId, data } }),
  chiudi: () => set({ richiesta: null }),
  cambiato: () => set((s) => ({ versione: s.versione + 1 })),
}));
