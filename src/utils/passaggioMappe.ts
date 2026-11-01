// ============================================================
// passaggioMappe — il passaggio appena attraversato fra due mappe, per offrire il ritorno (L4-07)
// ============================================================
//
// Toccando un pin di spostamento (porta, scala, uscita…) il visore della mappa A porta alla mappa B con la navigazione del suo ospite
// (pagina della mappa, scheda del Palazzo che cambia planimetria in sé, pagina dell'Area…). Il visore che mostra B non sa da dove si è
// arrivati: qui A annota il passaggio (mappa, nome e pin attraversato) e il visore di B, quando la mostra, lo prende e offre il ritorno con
// il nome di A, verso quel pin, con la stessa navigazione del suo ospite.
//
// Il passaggio vale una volta sola: il primo visore che mostra una mappa dopo l'annotazione lo consuma (se è la mappa d'arrivo lo tiene per
// sé, se è un'altra lo scarta). Così entrando in B più tardi da un'altra strada (menu, ricerca, indirizzo) il ritorno non compare.
// ============================================================

/** Un passaggio attraversato: da quale mappa (chiave e nome), da quale pin (id e nome: le planimetrie di un'Area hanno spesso lo stesso nome,
 *  e il pin dice da dove si torna), verso quale mappa. */
export interface PassaggioMappe {
  da: string;
  daNome: string;
  spillo: number;
  spilloNome: string;
  verso: string;
}

let ultimo: PassaggioMappe | null = null;

/** Annota il passaggio che si sta attraversando (prima di navigare). */
export function annotaPassaggio(p: PassaggioMappe): void {
  ultimo = p;
}

/** Il passaggio appena attraversato verso `mappa`, se c'è (lettura pura: non lo consuma). */
export function passaggioVerso(mappa: string): PassaggioMappe | null {
  return ultimo && ultimo.verso === mappa ? ultimo : null;
}

/** Un visore ha mostrato `mappa`: il passaggio annotato è servito (o non riguarda questa mappa) e non vale più. */
export function consumaPassaggio(): void {
  ultimo = null;
}
