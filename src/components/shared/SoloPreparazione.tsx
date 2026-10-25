// ============================================================
// SoloPreparazione — mostra i figli solo se l'istanza ha la funzione richiesta (L12, passo 1)
// ============================================================
//
// Nell'istanza di rilascio (sola lettura) gli strumenti di modifica non esistono: questo componente li toglie dal render. Senza `funzione`
// vale `modificaContenuti`, il caso più comune (il pulsante «Modifica», il menu di modifica di una scheda, un modulo di correzione).
// Per le altre famiglie si passa il flag (`<SoloPreparazione funzione="editorMappe">`); `alternativa` è ciò che si mostra al posto dei
// figli quando la funzione manca (di norma niente).
//
// ATTENZIONE: questo componente decide a runtime (`useCapacita`), quindi i suoi figli RESTANO nel bundle di rilascio (sono già creati
// quando il componente decide) e con loro il codice di modifica e le chiamate all'API. Serve per la presentazione di blocchi leggeri.
// Per escludere davvero codice dal bundle (passo 8) si usa la condizione costante di build dichiarata nel modulo (`utils/modalita.ts`):
// `NienteInRilascio` sotto, oppure `IN_RILASCIO && …` / `IN_RILASCIO ? … : …` nel punto d'uso.
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

/**
 * Il componente che prende il posto di uno strumento di modifica nell'istanza di rilascio (L12, passo 8): non disegna niente.
 * Si usa SOLO con la condizione costante di build DICHIARATA NELLO STESSO MODULO che definisce lo strumento (vedi `utils/modalita.ts`):
 *
 *     const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';
 *     export const ModificaGuida: StrumentoDiModifica<typeof ModificaGuidaReale> = IN_RILASCIO ? NienteInRilascio : ModificaGuidaReale;
 *
 * Nel rilascio il bundler vede `true ? NienteInRilascio : …` e scarta `ModificaGuidaReale` con tutto ciò che importa solo lui (finestre,
 * moduli, chiamate all'API di scrittura): le pagine che lo usano restano identiche, ma montano un componente vuoto. Nella preparazione la
 * condizione è falsa e l'esportazione è il componente reale, senza alcun cambiamento. Accetta (e ignora) qualunque prop.
 */
export function NienteInRilascio(): null {
  return null;
}

/**
 * Il tipo di uno strumento di modifica esportato con `IN_RILASCIO ? NienteInRilascio : Reale`: stesse prop del componente reale, ma può
 * non disegnare niente (`ReactNode`). Con `typeof Reale` il compilatore rifiuterebbe il ramo `null`.
 */
export type StrumentoDiModifica<F extends (props: never) => ReactNode> = (...args: Parameters<F>) => ReactNode;
