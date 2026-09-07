// ============================================================
// palazzi — quali Dedali entrano nella sezione «Palazzi» e nell'atlante
// ============================================================
//
// Il seed dei dungeon ne porta dieci: i nove Palazzi (fra cui il **Dedalo di Iweleth**, che è
// registrato `tipo: 'palazzo'` perché si visita per aree come loro) e i Memento, `tipo: 'mementos'`.
//
// I Memento non stanno qui, e non è una dimenticanza: non si visitano per aree — i piani sono
// generati a ogni discesa — e la loro pagina li disegna per intero. Chi ci arrivava dall'indice
// trovava planimetrie di strutture fisse senza contesto. Restano raggiungibili da
// `/guida/dungeon/mementos` e dalle richieste dei Memento; non compaiono nell'elenco dei Palazzi
// né come segno sulla mappa di Tokyo.
//
// Il filtro è uno solo, condiviso da `DungeonPage` e da `CittaPage`: quando stava scritto in due
// posti, la mappa mostrava un cartellino che l'elenco non aveva.
//
// Ed è scritto **per inclusione**, non per esclusione: `tipo === 'palazzo'`, non
// `tipo !== 'mementos'`. Rilievo di Codex, e ha ragione. Le due forme oggi danno lo stesso
// risultato — i tipi sono due — ma dicono cose diverse: «tieni i Palazzi» resta vero se domani il
// seed porta un terzo tipo, «togli i Memento» lo farebbe entrare in silenzio nell'elenco dei
// Palazzi e sulla mappa di Tokyo. Un filtro per esclusione è una lista di ciò che non si vuole, e
// quella lista invecchia da sola.
// ============================================================

import type { DungeonRiassuntoDto } from '../types';

/** I soli Palazzi (Iweleth compreso, che è registrato `palazzo` perché si visita come loro). */
export function soloPalazzi<T extends Pick<DungeonRiassuntoDto, 'tipo'>>(dungeon: T[]): T[] {
  return dungeon.filter((d) => d.tipo === 'palazzo');
}
