// ============================================================
// urlHttp — un indirizzo web è tale solo se è http o https, condiviso da frontend e backend
// ============================================================
//
// L9-05: i collegamenti alle fonti (`href` dei dati di gioco) e l'indirizzo di «Scarica da URL» passano tutti da qui. Un campo di testo
// con `javascript:`, `data:`, `file:` o uno schema qualunque non diventa un collegamento né una richiesta: la regola sta in un punto solo.
// ============================================================

/** L'indirizzo normalizzato (`URL.href`) se `valore` è un URL assoluto http o https; altrimenti null (vuoto, relativo, altro schema). */
export function urlHttp(valore: string | null | undefined): string | null {
  if (!valore) return null;
  let u: URL;
  try {
    u = new URL(valore.trim());
  } catch {
    return null;
  }
  return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
}
