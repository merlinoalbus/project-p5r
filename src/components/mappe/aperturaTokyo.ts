// ============================================================
// Quando un posto di Tokyo è nel mondo, e quando no
// ============================================================
//
// Una funzione sola, in un file suo, perché la usano in due: la **mappa** per decidere se
// disegnare un cartellino, e le **schede** per dire «non ancora aperto». Se rispondessero in modo
// diverso, si passerebbe sopra a una scheda e non si accenderebbe niente lassù — e il
// collegamento fra le due sembrerebbe rotto invece che coerente.
//
// Lo stato visualizzato viene dal server. Il confronto di date esportato resta un'utilità del calendario,
// non è usato per rivalutare la disponibilità della metro o delle schede.
// ============================================================

import { ordineGioco } from '../../../shared/condizioniSpillo';

/** `oggi` è dentro la finestra `dal`–`al` (in MM-GG)? `al` assente: la finestra non si chiude. */
export function dentroFinestra(oggi: string, dal: string, al: string | null): boolean {
  const g = ordineGioco(oggi);
  return g >= ordineGioco(dal) && (!al || g <= ordineGioco(al));
}

/** Il quartiere è nel mondo, al punto in cui è la partita?
 *
 * `disponibile` viene dall'API e vale **più** della data, perché la data non è tutta la verità:
 * solo sette quartieri su ventitré ne hanno una, e gli altri si aprono col rango di un Confidente,
 * con un libro letto o durante un Palazzo. Prima si guardava solo `sbloccoData`, e sedici
 * quartieri risultavano aperti dal primo giorno perché la loro condizione non era una data.
 *
 * La data è mantenuta nella firma per compatibilità: l'esito arriva interamente dal server. */
export const quartiereAperto: (
  q: { sbloccoData?: string | null; disponibile?: boolean },
  dataGioco: string | null | undefined,
) => boolean = (q) => q.disponibile !== false;
