// ============================================================
// titoloPaginaStore — il titolo della pagina aperta, per le briciole della Topbar (lotto C, punto 10)
// ============================================================
//
// Lo scrive `useDocumentTitle` insieme al titolo della scheda del browser («Calendario di gioco», «Takemi», il nome del Palazzo);
// la Topbar lo legge per la seconda briciola («GUIDA / CALENDARIO DI GIOCO»). Allo smontaggio la pagina lo toglie solo se è ancora il
// suo: la pagina nuova lo ha già scritto e non va cancellato.
// ============================================================

import { create } from 'zustand';

interface TitoloPaginaState {
  /** Il titolo della pagina aperta (senza il nome dell'app), o null fra una pagina e l'altra. */
  titolo: string | null;
  imposta: (titolo: string) => void;
  /** Toglie il titolo se è ancora `titolo` (la pagina che si smonta non cancella quello della pagina nuova). */
  togli: (titolo: string) => void;
}

export const useTitoloPaginaStore = create<TitoloPaginaState>((set) => ({
  titolo: null,
  imposta: (titolo) => set({ titolo }),
  togli: (titolo) => set((s) => (s.titolo === titolo ? { titolo: null } : s)),
}));
