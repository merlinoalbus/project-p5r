// ============================================================
// SoloPreparazione — mostra i figli solo se l'istanza ha la funzione richiesta (L12, passo 1)
// ============================================================
//
// Nell'istanza di rilascio (sola lettura) gli strumenti di modifica non esistono: questo componente li toglie dal render. Senza `funzione`
// vale `modificaContenuti`, il caso più comune (il pulsante «Modifica», il menu di modifica di una scheda, un modulo di correzione).
// Per le altre famiglie si passa il flag (`<SoloPreparazione funzione="editorMappe">`); `alternativa` è ciò che si mostra al posto dei
// figli quando la funzione manca (di norma niente).
//
// Con la modalità fissata nella build, nel rilascio la condizione è una costante e il bundler elimina i figli quando sono importati solo
// qui; per un'esclusione garantita di un'intera pagina si usa comunque l'import dinamico condizionato da `CAPACITA_BUILD` (passo 8).
// È solo presentazione: la sola lettura vera la garantiscono il backend e il database.
// ============================================================

import type { ReactNode } from 'react';
import { useCapacita } from '../../hooks/useCapacita';
import type { Capacita } from '../../../shared/capacita';

interface Props {
  /** La funzione richiesta; predefinita `modificaContenuti`. */
  funzione?: keyof Capacita;
  /** Ciò che si vede quando la funzione manca; predefinito niente. */
  alternativa?: ReactNode;
  children: ReactNode;
}

/** I figli solo se la funzione è disponibile in questa istanza, altrimenti l'alternativa (o niente). */
export function SoloPreparazione({ funzione = 'modificaContenuti', alternativa = null, children }: Props) {
  const { puo } = useCapacita();
  return <>{puo(funzione) ? children : alternativa}</>;
}
