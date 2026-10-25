// ============================================================
// useCapacita — che cosa permette l'istanza in cui gira l'app (L12, passo 1)
// ============================================================
//
// Le capacità vengono dalla build (`VITE_MODALITA`, `src/utils/modalita.ts`), non dalla rete: sono note prima del primo render e non
// cambiano mai durante la vita della pagina. All'avvio `main.tsx` ha già verificato che il backend dichiari la stessa modalità,
// quindi qui non serve rileggere `/api/config`. Il risultato è un oggetto stabile (stesso riferimento a ogni render): si può mettere
// nelle dipendenze di `useMemo`/`useEffect` senza innescare ricalcoli.
//
// Uso tipico:   const { puo } = useCapacita();   if (!puo('editorMappe')) return null;
// Per nascondere un blocco di JSX senza codice: `<SoloPreparazione>` (`components/shared/SoloPreparazione.tsx`).
// Attenzione: nascondere è solo presentazione; la protezione dei dati è del backend (elenco delle rotte ammesse) e del database.
// ============================================================

import { CAPACITA_BUILD, MODALITA_BUILD } from '../utils/modalita';
import type { Capacita, Modalita } from '../../shared/capacita';

/** Ciò che restituisce `useCapacita`. */
export interface RisultatoCapacita {
  /** La modalità dell'istanza. */
  modalita: Modalita;
  /** Vero nell'istanza di preparazione (tutte le funzioni di modifica). */
  inPreparazione: boolean;
  /** Vero nell'istanza pubblica di rilascio (sola lettura). */
  inRilascio: boolean;
  /** Tutti i flag. */
  capacita: Readonly<Capacita>;
  /** Vero se la funzione è disponibile in questa istanza. */
  puo: (funzione: keyof Capacita) => boolean;
}

/** L'oggetto è costruito una volta sola: le capacità sono costanti di build. */
const RISULTATO: RisultatoCapacita = {
  modalita: MODALITA_BUILD,
  inPreparazione: MODALITA_BUILD === 'preparazione',
  inRilascio: MODALITA_BUILD === 'rilascio',
  capacita: CAPACITA_BUILD,
  puo: (funzione) => CAPACITA_BUILD[funzione],
};

/** Modalità e capacità dell'istanza corrente (costanti di build, riferimento stabile). */
export function useCapacita(): RisultatoCapacita {
  return RISULTATO;
}
