// ============================================================
// alberoMappe — il sottoalbero di una mappa e il Palazzo a cui appartiene: una regola, una query
// ============================================================
//
// Prima la stessa domanda aveva nove risposte scritte a mano: tre CTE ricorsive (raccolta e planimetrie del Palazzo, ingresso),
// tre visite in JavaScript (Memento da togliere dall'albero, esportazione di un luogo, spostamento di una planimetria con le sue
// discendenti), due risalite verso la radice (riordino, Palazzo di una planimetria) e la mappa → Palazzo dei Palazzi completati. E
// «il Palazzo di una mappa» aveva due regole: la radice `dungeon-<k>` senza genitore, oppure la mappa che dichiara
// `entita_tipo = 'dungeon'` (rilievi R3 e B13 della verifica completa, 2026-10-03). Sui dati coincidono (10 Palazzi su 10, in
// `gioco.db` e nel pacchetto): resta la prima, che è quella con cui il Palazzo si crea e si cerca dappertutto.
//
// La CTE usa `UNION` (non `UNION ALL`): un ciclo nei genitori, che l'editor rifiuta ma un dato rovinato potrebbe avere, non la fa
// girare all'infinito.
// ============================================================

import { prepared } from '../../db/dbService.js';

/** La mappa radice di un Palazzo (o dei Memento): `dungeon-<chiave>`, senza genitore. */
export function radiceDelPalazzo(dungeon: string): string {
  return `dungeon-${dungeon}`;
}

/** Condizione SQL (sulla tabella `mappa`, senza alias) che riconosce la radice di un Palazzo. */
export const SQL_RADICE_PALAZZO = "chiave LIKE 'dungeon-%' AND genitore_chiave IS NULL";

/** CTE `albero(chiave)`: la mappa del parametro (`?`) e tutte le sue discendenti. Va seguita dalla SELECT che la usa. */
export const SQL_SOTTOALBERO = `WITH RECURSIVE albero(chiave) AS (
    SELECT chiave FROM mappa WHERE chiave = ?
    UNION
    SELECT m.chiave FROM mappa m JOIN albero a ON m.genitore_chiave = a.chiave
  )`;

/** Le radici date (quelle che esistono) e tutte le loro discendenti. */
export function sottoalberoMappe(radici: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const radice of radici) {
    for (const r of prepared(`${SQL_SOTTOALBERO} SELECT chiave FROM albero`).all(radice) as Array<{ chiave: string }>) out.add(r.chiave);
  }
  return out;
}

/** Il Palazzo (la chiave del dungeon) a cui appartiene la mappa, risalendo i genitori fino alla radice; null se la radice non è un Palazzo. */
export function palazzoDellaMappa(chiave: string | null): string | null {
  if (!chiave) return null;
  const radice = prepared(`WITH RECURSIVE su(chiave, genitore) AS (
      SELECT chiave, genitore_chiave FROM mappa WHERE chiave = ?
      UNION
      SELECT m.chiave, m.genitore_chiave FROM mappa m JOIN su s ON m.chiave = s.genitore
    ) SELECT chiave FROM su WHERE genitore IS NULL AND chiave LIKE 'dungeon-%' LIMIT 1`).get(chiave) as { chiave: string } | undefined;
  return radice ? radice.chiave.slice('dungeon-'.length) : null;
}
