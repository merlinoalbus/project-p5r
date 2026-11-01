// ============================================================
// palazzi — quali Dedali entrano nella sezione «Palazzi» e nell'atlante
// ============================================================
//
// La tabella dei dungeon ne porta dieci: otto Palazzi, la riga tecnica del **Dedalo di Iweleth** (registrata `tipo: 'palazzo'`, ma
// con `regolaBoss = 'memento'`: dal lotto L8 Iweleth è un dedalo dei Memento, vedi `eDedaloDeiMemento`) e i Memento, `tipo: 'mementos'`.
//
// **Le domande sono due.** «Che cosa entra nell'elenco dei Palazzi» e «che cosa si vede sulla mappa
// di Tokyo» non hanno la stessa risposta. Richiesta dell'utente per la mappa:
//
// > nella mappa di tokyo aggiungi i PNG posizionati a dovere dei palazzi quando attivi e del covo
// > fantasma e delle altre mappe root quando attive
// >
// > Il Covo dei Ladri e i mementos possono essere posizionati in aree libere
//
// **Nell'elenco dei Palazzi i Memento non ci stanno**: non si visitano per aree — i piani sono
// generati a ogni discesa — e dall'indice si troverebbero planimetrie di strutture fisse senza
// contesto. La loro pagina li disegna per intero.
//
// **Sulla mappa di Tokyo invece ci stanno**, perché la mappa risponde a un'altra domanda: dove
// si può andare oggi. I Memento sono una radice del Metaverso con una finestra propria (dal 7
// maggio, migrazione 318, e non si chiude mai), esattamente come i quattro Palazzi del Meta-Nav che la mappa
// mostra sul bordo di nord-est — nessuno dei quali ha un ingresso su una fermata. Non avere un
// ingresso sulla mappa di viaggio non è quindi un motivo per escluderli: vale anche per quei
// quattro e per il Covo, che sono sulla mappa.
//
// Perciò **due filtri, non uno**, ciascuno per inclusione. Restano condivisi — `DungeonPage` usa
// il primo, `CittaPage` e `OggiMappa` il secondo — così la mappa non mostra un cartellino che
// l'elenco non ha.
//
// Per inclusione e non per esclusione: `tipo === 'palazzo'`, non `tipo !== 'mementos'`. Le due forme
// oggi danno lo stesso risultato — i tipi sono due — ma dicono cose diverse: «tieni i Palazzi»
// resta vero se domani il seed porta un terzo tipo, «togli i Memento» lo farebbe entrare in
// silenzio dove non deve. Un filtro per esclusione è una lista di ciò che non si vuole, e quella
// lista invecchia da sola.
// ============================================================

import type { DungeonRiassuntoDto } from '../types';

/** Vero per un Palazzo che esiste solo come dedalo dei Memento (`regola_boss = 'memento'`: Iweleth, L8 R8-16): la riga tecnica resta per le
 *  planimetrie e i legami, ma non è un Palazzo da visitare né una radice a sé sulla mappa. */
export function eDedaloDeiMemento<T extends Pick<DungeonRiassuntoDto, 'tipo' | 'regolaBoss'>>(d: T): boolean {
  return d.tipo === 'palazzo' && d.regolaBoss === 'memento';
}

/** I soli Palazzi. Iweleth non c'è più: dal lotto L8 vive nel dedalo dei Memento (`regolaBoss = 'memento'`), dove si trovano le sue aree.
 *
 * È l'elenco della sezione «Palazzi», dove conta poter aprire le aree una per una. */
export function soloPalazzi<T extends Pick<DungeonRiassuntoDto, 'tipo' | 'regolaBoss'>>(dungeon: T[]): T[] {
  return dungeon.filter((d) => d.tipo === 'palazzo' && !eDedaloDeiMemento(d));
}

/** Le radici del Metaverso che la mappa di Tokyo mostra: i Palazzi **e** i Memento (Iweleth è un dedalo dei Memento, non una radice).
 *
 * È l'elenco di «dove si può andare», non di «che cosa si visita per aree». La mappa poi tiene
 * solo quelle che hanno una collocazione dichiarata in `collocazioneTokyo.ts` e sono dentro la
 * loro finestra: qui si decide *chi può* comparire, lì *dove* e *quando*. */
export function radiciMetaverso<T extends Pick<DungeonRiassuntoDto, 'tipo' | 'regolaBoss'>>(dungeon: T[]): T[] {
  return dungeon.filter((d) => (d.tipo === 'palazzo' && !eDedaloDeiMemento(d)) || d.tipo === 'mementos');
}

/** L8-04 (D5): il livello consigliato di un Palazzo in parole, dal minimo e dal massimo di Royal: «15–16», «75», «45 o più», «fino a 30»;
 *  null se la fonte non dà nessun numero (la scheda allora non lo scrive: il confronto delle fonti sta nella nota storica). */
export function testoLivelloConsigliato(l: DungeonRiassuntoDto['livelloConsigliato']): string | null {
  const { min, max } = l;
  if (min !== null && max !== null) return min === max ? String(min) : `${min}–${max}`;
  if (min !== null) return `${min} o più`;
  if (max !== null) return `fino a ${max}`;
  return null;
}
