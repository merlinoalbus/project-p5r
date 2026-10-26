// ============================================================
// appuntiDiarioStore — il solo contrassegno visivo del taglio delle voci del Diario (2026-10-26)
// ============================================================
//
// Dopo Ctrl+X le voci tagliate si vedono attenuate finché non si incollano, si preme Esc o si copia altro. È SOLO un segno sulle righe:
// non è mai la fonte dell'incolla, che legge sempre gli appunti di sistema (richiesta dell'utente: «però deve usare la clipboard del
// sistema non dentro l'app»). Resta passando da un giorno all'altro (si taglia in un giorno e si incolla in un altro), e se ne va quando
// si sa che negli appunti non c'è più: una copia d'altro nella pagina (non un Ctrl+C a vuoto), un incolla d'altro, o il ritorno alla
// finestra con gli appunti rileggibili senza chiedere e senza il taglio. Se non si possono rileggere resta (`useAppuntiDiario`): il segno
// non deve né promettere un taglio che non c'è più né sparire mentre Ctrl+V sposterebbe ancora le voci (rilievi dei revisori, 2026-10-26).
//
// `scrittoInSessione`: in questa sessione l'app ha scritto voci negli appunti. Serve solo a Ctrl+V nei browser che non mandano l'evento
// `paste` fuori dai campi: senza una scrittura nostra non si chiede al browser di leggere gli appunti (niente richiesta di permesso a
// ogni Ctrl+V); un blocco vecchio ripescato con Win+V arriva comunque con l'evento `paste`, o con «Incolla qui».
// ============================================================

import { create } from 'zustand';

interface StatoTaglio {
  /** L'identità del taglio scritto negli appunti, le voci tagliate e il loro giorno. */
  taglio: { id: string; uid: readonly string[]; giorno: string } | null;
  scrittoInSessione: boolean;
  imposta: (t: { id: string; uid: readonly string[]; giorno: string }) => void;
  svuota: () => void;
  segnaScritto: () => void;
}

export const useAppuntiDiarioStore = create<StatoTaglio>((set) => ({
  taglio: null,
  scrittoInSessione: false,
  imposta: (t) => set({ taglio: t }),
  svuota: () => set({ taglio: null }),
  segnaScritto: () => set({ scrittoInSessione: true }),
}));
