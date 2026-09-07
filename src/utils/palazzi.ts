// ============================================================
// palazzi — quali Dedali entrano nella sezione «Palazzi» e nell'atlante
// ============================================================
//
// Il seed dei dungeon ne porta dieci: i nove Palazzi (fra cui il **Dedalo di Iweleth**, che è
// registrato `tipo: 'palazzo'` perché si visita per aree come loro) e i Memento, `tipo: 'mementos'`.
//
// **Le domande sono due e per un po' le ho confuse in una.** «Che cosa entra nell'elenco dei
// Palazzi» e «che cosa si vede sulla mappa di Tokyo» non hanno la stessa risposta, e trattarle
// come se l'avessero ha tolto i Memento dalla mappa dove l'utente li aveva chiesti:
//
// > nella mappa di tokyo aggiungi i PNG posizionati a dovere dei palazzi quando attivi e del covo
// > fantasma e delle altre mappe root quando attive
// >
// > Il Covo dei Ladri e i mementos possono essere posizionati in aree libere
//
// **Nell'elenco dei Palazzi i Memento non ci stanno**, e non è una dimenticanza: non si visitano
// per aree — i piani sono generati a ogni discesa — e chi ci arrivava dall'indice trovava
// planimetrie di strutture fisse senza contesto. La loro pagina li disegna per intero.
//
// **Sulla mappa di Tokyo invece ci stanno**, perché la mappa risponde a un'altra domanda: dove
// posso andare oggi. I Memento sono una radice del Metaverso con una finestra propria (dal 9
// maggio, e non si chiude mai), esattamente come i cinque Palazzi del Meta-Nav che la mappa già
// mostra sul bordo di nord-est — nessuno dei quali ha un ingresso su una fermata. Il motivo che
// avevo scritto per escluderli («non hanno un ingresso sulla mappa di viaggio») vale identico per
// quei cinque e per il Covo, che sono lì: era una regola che si smentiva da sola.
//
// Perciò **due filtri, non uno**, ciascuno per inclusione. Restano condivisi — `DungeonPage` usa
// il primo, `CittaPage` il secondo — perché quando la regola stava scritta in due posti la mappa
// mostrava un cartellino che l'elenco non aveva.
//
// Per inclusione e non per esclusione: `tipo === 'palazzo'`, non `tipo !== 'mementos'`. Rilievo di
// Codex, e ha ragione. Le due forme oggi danno lo stesso risultato — i tipi sono due — ma dicono
// cose diverse: «tieni i Palazzi» resta vero se domani il seed porta un terzo tipo, «togli i
// Memento» lo farebbe entrare in silenzio dove non deve. Un filtro per esclusione è una lista di
// ciò che non si vuole, e quella lista invecchia da sola.
// ============================================================

import type { DungeonRiassuntoDto } from '../types';

/** I soli Palazzi (Iweleth compreso, che è registrato `palazzo` perché si visita come loro).
 *
 * È l'elenco della sezione «Palazzi», dove conta poter aprire le aree una per una. */
export function soloPalazzi<T extends Pick<DungeonRiassuntoDto, 'tipo'>>(dungeon: T[]): T[] {
  return dungeon.filter((d) => d.tipo === 'palazzo');
}

/** Le radici del Metaverso che la mappa di Tokyo mostra: i Palazzi **e** i Memento.
 *
 * È l'elenco di «dove posso andare», non di «cosa posso visitare per aree». La mappa poi tiene
 * solo quelle che hanno una collocazione dichiarata in `collocazioneTokyo.ts` e sono dentro la
 * loro finestra: qui si decide *chi può* comparire, lì *dove* e *quando*. */
export function radiciMetaverso<T extends Pick<DungeonRiassuntoDto, 'tipo'>>(dungeon: T[]): T[] {
  return dungeon.filter((d) => d.tipo === 'palazzo' || d.tipo === 'mementos');
}
