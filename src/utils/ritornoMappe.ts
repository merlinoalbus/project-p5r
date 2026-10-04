// ============================================================
// ritornoMappe — da quale pagina si è entrati nelle mappe, perché «Chiudi» ci riporti lì
// ============================================================
//
// Richiesta dell'utente (2026-09-30): «se si chiude una mappa vorrei tornare alla pagina visualizzata prima di aprire la
// mappa». Prima «Chiudi» del visore portava sempre all'elenco delle mappe e quello dell'editor sempre al visore.
//
// A ogni cambio di pagina (`annotaNavigazione`, chiamata da `MainLayout`): entrando in una mappa da una pagina che non è
// una mappa si annota quella pagina (percorso e parametri); fra mappe, livelli, visore ed editor l'annotazione resta;
// uscendo dalle mappe si cancella. Sta in sessionStorage — regge al ricaricamento della scheda, non passa ad altre schede —
// con una riserva in memoria se lo storage non c'è. Aperta direttamente (nessuna pagina prima), non c'è ritorno e
// «Chiudi» fa quel che faceva.
// ============================================================

const CHIAVE = 'p5r-ritorno-mappe';
let inMemoria: string | null = null;

/** Una pagina di mappa: il visore (`/guida/mappe/<chiave>`) o il suo editor (`…/modifica`); l'elenco delle mappe no. */
export function ePaginaDiMappa(percorso: string): boolean {
  return /^\/guida\/mappe\/[^/?#]+/.test(percorso);
}

/** Salva (o, con null, cancella) la pagina di ritorno in memoria e, se si può, in sessionStorage. */
function scrivi(valore: string | null): void {
  inMemoria = valore;
  try {
    if (valore) globalThis.sessionStorage?.setItem(CHIAVE, valore);
    else globalThis.sessionStorage?.removeItem(CHIAVE);
  } catch {
    // storage non disponibile: vale la copia in memoria
  }
}

/** La pagina a cui «Chiudi» di una mappa deve tornare, o null. */
export function ritornoMappe(): string | null {
  try {
    const salvato = globalThis.sessionStorage?.getItem(CHIAVE);
    if (salvato !== undefined && salvato !== null) return salvato;
  } catch {
    // come sopra
  }
  return inMemoria;
}

/** Da chiamare a ogni cambio di pagina: `da` è la pagina lasciata (percorso + parametri, null al primo caricamento), `a` il percorso nuovo. */
export function annotaNavigazione(da: string | null, a: string): void {
  if (!ePaginaDiMappa(a)) { scrivi(null); return; }
  if (da !== null && !ePaginaDiMappa(da)) scrivi(da);
}
