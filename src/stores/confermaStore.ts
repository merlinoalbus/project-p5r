// ============================================================
// confermaStore — la domanda di conferma in corso e `conferma()`, che sostituisce `window.confirm` (lotto B, punto 8)
// ============================================================
//
// La finestra nativa del browser era in inglese sui pulsanti («OK» / «Cancel»), fuori dal tema, senza il tono «pericolo» e, su
// telefono, con il pulsante che elimina dove ci si aspetta quello che annulla. `conferma({...})` apre al suo posto il nostro
// `DialogoConferma` (montato una sola volta in `MainLayout` da `HostConferma`) e risponde con una promessa: `true` se si conferma,
// `false` con «Annulla», la X o Esc.
//
// Una sola domanda alla volta: una seconda richiesta mentre la prima è aperta risponde `false` alla prima (non resta mai una promessa
// appesa). Senza la finestra montata (fuori da `MainLayout`) la domanda non si può fare: risponde `false`, cioè non si fa niente
// di irreversibile, e lo scrive in console.
// ============================================================

import { create } from 'zustand';
import type { ChiaveAzione } from '../components/shared/IconaAzione';

/** Il tono del pulsante che conferma: `pericolo` per ciò che non si può annullare (eliminazioni, modifiche che si perdono). */
export type TonoConferma = 'pericolo' | 'normale';

export interface OpzioniConferma {
  /** Il titolo della finestra, una domanda breve («Eliminare il piano?»). */
  titolo: string;
  /** Il testo che spiega che cosa succede. */
  testo: string;
  /** L'etichetta del pulsante che conferma, un verbo («Elimina», «Chiudi senza salvare»). */
  etichetta: string;
  /** Default `pericolo`. */
  tono?: TonoConferma;
  /** L'icona censita del pulsante che conferma; default `elimina` col tono pericolo, `accettata` altrimenti. */
  icona?: ChiaveAzione;
}

export interface RichiestaConferma extends OpzioniConferma {
  /** Cambia a ogni domanda: la finestra si rimonta e il fuoco torna su «Annulla». */
  id: number;
}

interface StatoConferma {
  richiesta: RichiestaConferma | null;
  /** Quante finestre di conferma sono montate (di norma una, quella di `MainLayout`). */
  host: number;
  /** Chiude la domanda in corso con l'esito dato. */
  rispondi: (esito: boolean) => void;
  /** Registra la finestra montata; restituisce la funzione che la toglie. */
  registraHost: () => () => void;
}

/** La risposta in attesa della domanda in corso (fuori dallo stato: una funzione non serve ai componenti). */
let risolviInCorso: ((esito: boolean) => void) | null = null;
let progressivo = 0;

export const useConfermaStore = create<StatoConferma>((set, get) => ({
  richiesta: null,
  host: 0,
  rispondi: (esito) => {
    const risolvi = risolviInCorso;
    risolviInCorso = null;
    if (get().richiesta) set({ richiesta: null });
    risolvi?.(esito);
  },
  registraHost: () => {
    set((s) => ({ host: s.host + 1 }));
    return () => {
      set((s) => ({ host: s.host - 1 }));
      // l'ultima finestra smontata non lascia domande appese
      if (get().host === 0) get().rispondi(false);
    };
  },
}));

/** Chiede conferma con il `DialogoConferma` dell'app; risponde `true` solo se si preme il pulsante che conferma. */
export function conferma(opzioni: OpzioniConferma): Promise<boolean> {
  const stato = useConfermaStore.getState();
  if (stato.host === 0) {
    console.error('[conferma] Nessuna finestra di conferma montata: la domanda «%s» resta senza risposta (annullata).', opzioni.titolo);
    return Promise.resolve(false);
  }
  // una domanda nuova annulla quella ancora aperta
  if (risolviInCorso) stato.rispondi(false);
  return new Promise<boolean>((risolvi) => {
    risolviInCorso = risolvi;
    useConfermaStore.setState({ richiesta: { ...opzioni, id: ++progressivo } });
  });
}

// ---- Le domande ricorrenti, scritte una volta ----

/** Chiudere una finestra con modifiche non salvate. */
export const CHIUDI_SENZA_SALVARE: OpzioniConferma = {
  titolo: 'Chiudere senza salvare?',
  testo: 'Ci sono modifiche non salvate: chiudendo si perdono.',
  etichetta: 'Chiudi senza salvare',
  icona: 'chiudi',
};

/** Riportare un dato com'era nella guida quando la finestra ha anche modifiche non salvate. */
export const RIPRISTINA_CON_MODIFICHE: OpzioniConferma = {
  titolo: 'Ripristinare con modifiche non salvate?',
  testo: 'Ci sono modifiche non salvate: ripristinando perdi anche quelle.',
  etichetta: 'Ripristina comunque',
  icona: 'annulla-ultimo',
};
