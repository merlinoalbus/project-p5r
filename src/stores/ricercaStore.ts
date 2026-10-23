// ============================================================
// ricercaStore — la finestra della ricerca globale: aperta o chiusa, e l'ultimo testo cercato (L11, B4)
// ============================================================
//
// L'apertura NON sta nell'indirizzo: «Indietro» da un risultato torna alla pagina di partenza (con la partita già attiva nello store) e non
// riapre la finestra. Il testo si tiene fra una chiusura e l'altra: riaprendo si ritrova l'ultima ricerca, selezionata, pronta da sostituire.
// Chi ha aperto la finestra (l'elemento con il fuoco) si ricorda per restituirgli il fuoco alla chiusura; se la chiusura è dovuta a un
// risultato scelto (la pagina cambia) il fuoco non si restituisce.
// ============================================================

import { create } from 'zustand';

interface RicercaState {
  aperta: boolean;
  q: string;
  /** L'elemento che aveva il fuoco all'apertura (il pulsante «Cerca», o la pagina se si è aperta con la scorciatoia). */
  chiamante: HTMLElement | null;
  /** Se alla chiusura il fuoco torna a `chiamante`: sì per Esc e «Chiudi», no se si è scelto un risultato. */
  restituisciFuoco: boolean;
  apri: () => void;
  chiudi: (restituisciFuoco?: boolean) => void;
  impostaQ: (q: string) => void;
}

export const useRicercaStore = create<RicercaState>((set) => ({
  aperta: false,
  q: '',
  chiamante: null,
  restituisciFuoco: true,
  apri: () => set({ aperta: true, restituisciFuoco: true, chiamante: document.activeElement instanceof HTMLElement ? document.activeElement : null }),
  chiudi: (restituisciFuoco = true) => set({ aperta: false, restituisciFuoco }),
  impostaQ: (q) => set({ q }),
}));
