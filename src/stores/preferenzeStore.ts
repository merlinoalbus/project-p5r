// ============================================================
// Preferenze Store — impostazioni locali del dispositivo (localStorage, con fallback in memoria)
// ============================================================
//
// `graficaPredefinita` (attiva di default): usa gli asset grafici inclusi nell'app (public/asset/) quando
// esistono. Le immagini caricate dall'utente hanno sempre la precedenza; senza asset l'app mostra i
// segnaposto testuali. `vistaPersona`: elenco del compendio a piastrelle (default) o compatto.
// `menuRidotto`: il menu laterale ridotto alle sole icone (si riapre col pulsante, o al passaggio del mouse).
// `mappaHomeChiusa`: la mappa della Home chiusa in una linguetta sul bordo destro.
// La lettura/scrittura del localStorage è protetta: se non disponibile (modalità privata, quota, sandbox)
// si usano i valori predefiniti senza errori.
// ============================================================

import { create } from 'zustand';

const CHIAVE_STORAGE = 'p5r-preferenze';

export type VistaPersona = 'piastrelle' | 'elenco';

export interface Preferenze {
  graficaPredefinita: boolean;
  vistaPersona: VistaPersona;
  menuRidotto: boolean;
  mappaHomeChiusa: boolean;
}

const PREDEFINITE: Preferenze = { graficaPredefinita: true, vistaPersona: 'piastrelle', menuRidotto: false, mappaHomeChiusa: false };

function leggi(): Preferenze {
  try {
    const grezzo = globalThis.localStorage?.getItem(CHIAVE_STORAGE);
    if (!grezzo) return PREDEFINITE;
    const dati = JSON.parse(grezzo) as Partial<Preferenze>;
    return {
      ...PREDEFINITE,
      ...(typeof dati.graficaPredefinita === 'boolean' ? { graficaPredefinita: dati.graficaPredefinita } : {}),
      ...(dati.vistaPersona === 'elenco' || dati.vistaPersona === 'piastrelle' ? { vistaPersona: dati.vistaPersona } : {}),
      ...(typeof dati.menuRidotto === 'boolean' ? { menuRidotto: dati.menuRidotto } : {}),
      ...(typeof dati.mappaHomeChiusa === 'boolean' ? { mappaHomeChiusa: dati.mappaHomeChiusa } : {}),
    };
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
  impostaVistaPersona: (valore: VistaPersona) => void;
  impostaMenuRidotto: (valore: boolean) => void;
  impostaMappaHomeChiusa: (valore: boolean) => void;
}

/** Preferenze del dispositivo (persistite in localStorage quando possibile). */
export const usePreferenzeStore = create<PreferenzeState>((set, get) => {
  const salva = (modifica: Partial<Preferenze>) => {
    set(modifica);
    const s = get();
    scrivi({ graficaPredefinita: s.graficaPredefinita, vistaPersona: s.vistaPersona, menuRidotto: s.menuRidotto, mappaHomeChiusa: s.mappaHomeChiusa });
  };
  return {
    ...leggi(),
    impostaGraficaPredefinita: (valore) => salva({ graficaPredefinita: valore }),
    impostaVistaPersona: (valore) => salva({ vistaPersona: valore }),
    impostaMenuRidotto: (valore) => salva({ menuRidotto: valore }),
    impostaMappaHomeChiusa: (valore) => salva({ mappaHomeChiusa: valore }),
  };
});
