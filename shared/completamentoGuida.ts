// ============================================================
// Il completamento della guida dei Palazzi: una funzione sola (L4 «Avanzamento unico», lotti/L4/modifiche.md §1.5)
// ============================================================
//
// Prima le regole erano quattro e diverse (la percentuale sui pin collezionabili, l'area della guida sulle voci, la planimetria
// sui collezionabili, il Palazzo su collezionabili + Tesoro + boss). Da L4 si contano gli **oggetti permanenti** (le voci permanenti,
// unite in un oggetto se hanno pin in comune, ciascuno contato una volta), e basta: i rigenerabili e i racconti non contano.
// Il server conta e manda i numeri; l'interfaccia usa queste stesse funzioni e non ricalcola a modo suo.
// ============================================================

/** Quanti oggetti permanenti e quanti fatti (null senza partita). */
export interface ConteggioOggetti { oggetti: number; fatti: number | null }

/** Un'infiltrazione è completata quando tutti gli oggetti permanenti delle sue voci sono fatti; senza niente da contare, mai
 *  (regola del 2026-10-04, R4-22). Null senza partita. */
export function infiltrazioneCompletata(c: ConteggioOggetti): boolean | null {
  if (c.fatti === null) return null;
  return c.oggetti > 0 && c.fatti >= c.oggetti;
}

/** Un'Area del Palazzo (L3) o una planimetria è completata quando lo sono i suoi oggetti permanenti; senza niente da contare, sì
 *  (richiesta dell'utente del 2026-10-11 per le planimetrie). Null senza partita. */
export function areaCompletata(c: ConteggioOggetti): boolean | null {
  if (c.fatti === null) return null;
  return c.fatti >= c.oggetti;
}

/**
 * Il completamento di un Palazzo, su due livelli (decisione dell'utente del 2026-10-20, lotti/L4/modifiche.md §8.10):
 * - `concluso` = Tesoro **e** boss finale: è il furto, e governa gli effetti (ingressi, mappa di Tokyo, requisiti e condizioni
 *   «Completare il Palazzo» / «dopo il Palazzo di X»), come nel gioco, dove il Palazzo sparisce dopo il furto (G-026);
 * - `completato` = concluso **e** tutti gli oggetti permanenti fatti (la regola del 2026-10-04, «raccolto tutto»): vale solo per
 *   l'anello, la percentuale e il segno «Completato». Senza oggetti da contare non si completa.
 * Null senza partita.
 */
export interface CompletamentoPalazzo extends ConteggioOggetti { tesoro: boolean | null; boss: boolean | null; concluso: boolean | null; completato: boolean | null }

/** Calcola `concluso` (Tesoro e boss finale) dagli altri campi. */
export function palazzoConcluso(c: Pick<CompletamentoPalazzo, 'tesoro' | 'boss'>): boolean | null {
  if (c.tesoro === null || c.boss === null) return null;
  return c.tesoro && c.boss;
}

/** Calcola `completato` (concluso e tutti gli oggetti permanenti) dagli altri campi. */
export function palazzoCompletato(c: Omit<CompletamentoPalazzo, 'concluso' | 'completato'>): boolean | null {
  const concluso = palazzoConcluso(c);
  if (c.fatti === null || concluso === null) return null;
  return concluso && c.oggetti > 0 && c.fatti >= c.oggetti;
}

/** La percentuale (0–100, intera per difetto: il 100% solo a oggetti tutti fatti), o null senza partita o senza oggetti. */
export function percentualeOggetti(c: ConteggioOggetti): number | null {
  if (c.fatti === null || c.oggetti === 0) return null;
  return Math.floor((Math.min(c.fatti, c.oggetti) / c.oggetti) * 100);
}
