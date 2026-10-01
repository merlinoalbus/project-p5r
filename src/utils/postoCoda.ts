// ============================================================
// Dove sta la coda delle notifiche quando un popup di spillo è aperto (2026-10-01)
// ============================================================

/** Lo stacco fra la coda e quel che scansa (un foglio, un popup), e dai bordi dello schermo (`right-5` / `left-5`). */
const STACCO = 8;
export const MARGINE = 20;

/** Dove sta la coda: il suo `bottom` (null = quello delle classi) e il lato. */
export interface PostoCoda { bottom: number | null; aSinistra: boolean }

/**
 * Dove mettere la coda perché non copra il popup di uno spillo aperto su una mappa (2026-10-01).
 * - Un **foglio dal basso** (il popup in `position: fixed`: sul telefono sempre, a schermo largo quando non sta né sopra né sotto lo
 *   spillo) occupa tutta la larghezza: la coda gli sta sopra.
 * - Un popup **ancorato** che scende nella zona della coda (in basso a destra) non si scavalca dall'alto — si coprirebbe lo spillo,
 *   che gli sta subito sopra o sotto —: la coda passa sul lato opposto se lì c'è spazio, altrimenti gli sta sopra.
 * `coda` è la coda così com'è (per la sua altezza e larghezza); senza popup aperti il posto è quello delle classi.
 */
export function postoDellaCoda(coda: HTMLElement | null): PostoCoda {
  const popup = [...document.querySelectorAll<HTMLElement>('.spillo-popup')];
  const alto = window.innerHeight; const largo = window.innerWidth;
  const fogli = popup.filter((f) => getComputedStyle(f).position === 'fixed');
  if (fogli.length > 0) {
    const cima = Math.min(...fogli.map((f) => f.getBoundingClientRect().top));
    return { bottom: Math.max(STACCO, alto - cima + STACCO), aSinistra: false };
  }
  if (!coda) return { bottom: null, aSinistra: false };
  // la zona della coda al suo posto normale: in basso (`bottom-20`, da 1024 `lg:bottom-5`), a destra, larga quanto lei
  const basso = largo >= 1024 ? 20 : 80;
  const { offsetHeight: h, offsetWidth: w } = coda;
  const zona = { top: alto - basso - h, bottom: alto - basso, left: largo - MARGINE - w, right: largo - MARGINE };
  for (const p of popup) {
    const r = p.getBoundingClientRect();
    if (r.width === 0 || r.bottom <= zona.top || r.top >= zona.bottom || r.right <= zona.left || r.left >= zona.right) continue;
    // sul lato sinistro c'è posto se la coda ci sta tutta prima del popup
    if (MARGINE + w + STACCO <= r.left) return { bottom: null, aSinistra: true };
    return { bottom: Math.max(STACCO, alto - r.top + STACCO), aSinistra: false };
  }
  return { bottom: null, aSinistra: false };
}
