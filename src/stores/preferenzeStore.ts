// ============================================================
// Preferenze Store — impostazioni locali del dispositivo (localStorage, con fallback in memoria)
// ============================================================
//
// `graficaPredefinita` (attiva di default): usa gli asset grafici inclusi nell'app (public/asset/) quando
// esistono. Le immagini caricate dall'utente hanno sempre la precedenza; senza asset l'app mostra i
// segnaposto testuali. La lettura/scrittura del localStorage è protetta: se non disponibile
// (modalità privata, quota, sandbox) si usano i valori predefiniti senza errori.
// ============================================================

import { create } from 'zustand';

const CHIAVE_STORAGE = 'p5r-preferenze';

export interface Preferenze {
  graficaPredefinita: boolean;
}

const PREDEFINITE: Preferenze = { graficaPredefinita: true };

function leggi(): Preferenze {
  try {
    const grezzo = globalThis.localStorage?.getItem(CHIAVE_STORAGE);
    if (!grezzo) return PREDEFINITE;
    const dati = JSON.parse(grezzo) as Partial<Preferenze>;
    return { ...PREDEFINITE, ...(typeof dati.graficaPredefinita === 'boolean' ? { graficaPredefinita: dati.graficaPredefinita } : {}) };
  } catch {
    return PREDEFINITE;
  }
}

function scrivi(p: Preferenze): void {
  try {
    globalThis.localStorage?.setItem(CHIAVE_STORAGE, JSON.stringify(p));
  } catch {
    // Storage non disponibile: la preferenza vale solo per la sessione corrente.
  }
}

interface PreferenzeState extends Preferenze {
  impostaGraficaPredefinita: (valore: boolean) => void;
}

/** Preferenze del dispositivo (persistite in localStorage quando possibile). */
export const usePreferenzeStore = create<PreferenzeState>((set, get) => ({
  ...leggi(),
  impostaGraficaPredefinita: (valore) => {
    set({ graficaPredefinita: valore });
    scrivi({ graficaPredefinita: get().graficaPredefinita });
  },
}));
