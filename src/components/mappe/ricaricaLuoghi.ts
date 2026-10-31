// ============================================================
// ricaricaLuoghi — chi rilegge la gerarchia dei luoghi dopo un cambio fatto da una carta (O9-5)
// ============================================================
//
// La pagina `/guida/mappe` (`IndiceLuoghi`) legge la gerarchia una volta e la passa alle griglie; la finestra della miniatura di una carta
// (Palazzo, Dedalo, area di un Dedalo) dopo «Salva» o «Rimuovi» la fa rileggere, così la carta mostra subito l'URL nuovo. Un contesto invece di
// una prop in ogni griglia e gruppo: senza fornitore la carta non rilegge niente.
// ============================================================

import { createContext } from 'react';

/** La rilettura della gerarchia dei luoghi, o null fuori dalla pagina dei Luoghi. */
export const RicaricaLuoghi = createContext<(() => Promise<void>) | null>(null);
