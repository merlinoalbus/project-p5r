// ============================================================
// Quando un posto di Tokyo è nel mondo, e quando no
// ============================================================
//
// Una funzione sola, in un file suo, perché la usano in due: la **mappa** per decidere se
// disegnare un cartellino, e le **schede** per dire «non ancora aperto». Se rispondessero in modo
// diverso, si passerebbe sopra a una scheda e non si accenderebbe niente lassù — e il
// collegamento fra le due sembrerebbe rotto invece che coerente.
//
// Le condizioni vengono dalla Fase 2: `quartiere.sblocco_data` e `finestre-dungeon.json`, valutate
// con `ordineGioco`, la stessa funzione del resto dell'app. Senza partita non c'è niente da
// decidere e il mondo si vede intero.
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
 * Il ripiego sulla data resta per chi chiama senza partita e per i test che costruiscono un
 * quartiere a mano: non è un doppione della regola, è il caso in cui la regola non c'è. */
export function quartiereAperto(
  q: { sbloccoData?: string | null; disponibile?: boolean },
  dataGioco: string | null | undefined,
): boolean {
  if (q.disponibile === false) return false;
  return !dataGioco || !q.sbloccoData || dentroFinestra(dataGioco, q.sbloccoData, null);
}
