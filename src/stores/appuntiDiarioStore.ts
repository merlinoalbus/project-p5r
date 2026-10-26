// ============================================================
// appuntiDiarioStore — il solo contrassegno visivo del taglio delle voci del Diario (2026-10-26)
// ============================================================
//
// Dopo Ctrl+X le voci tagliate si vedono attenuate finché non si incollano, si preme Esc o si copia altro. È SOLO un segno sulle righe:
// non è mai la fonte dell'incolla, che legge sempre gli appunti di sistema (richiesta dell'utente: «però deve usare la clipboard del
// sistema non dentro l'app»). Resta passando da un giorno all'altro (si taglia in un giorno e si incolla in un altro).
// ============================================================

import { create } from 'zustand';

interface StatoTaglio {
  /** L'identità del taglio scritto negli appunti, le voci tagliate e il loro giorno. */
  taglio: { id: string; uid: readonly string[]; giorno: string } | null;
  imposta: (t: { id: string; uid: readonly string[]; giorno: string }) => void;
  svuota: () => void;
}

export const useAppuntiDiarioStore = create<StatoTaglio>((set) => ({
  taglio: null,
  imposta: (t) => set({ taglio: t }),
  svuota: () => set({ taglio: null }),
}));
