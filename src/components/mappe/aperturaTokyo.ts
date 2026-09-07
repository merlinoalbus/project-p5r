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

/** Il quartiere è nel mondo, al giorno della partita? */
export function quartiereAperto(sbloccoData: string | null | undefined, dataGioco: string | null | undefined): boolean {
  return !dataGioco || !sbloccoData || dentroFinestra(dataGioco, sbloccoData, null);
}
