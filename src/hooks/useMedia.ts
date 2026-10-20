// ============================================================
// useMedia — vero quando la media query vale (si aggiorna al cambio di larghezza); falso dove `matchMedia` non c'è (test, SSR)
// ============================================================
//
// Serve dove due disposizioni della stessa cosa non possono stare entrambe nel DOM nascoste col CSS: per esempio un elenco con lo stesso
// nome accessibile, o un comando che da una certa larghezza in su sta in un menu (scheda del Palazzo, R3-41). Senza `matchMedia` vale
// la disposizione stretta, quella che i test descrivono.
// ============================================================

import { useEffect, useState } from 'react';

/** Se la media query `q` vale adesso; si ridisegna quando cambia. */
export function useMedia(q: string): boolean {
  const leggi = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
  const [vale, setVale] = useState(leggi);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const m = window.matchMedia(q);
    const cambia = () => setVale(m.matches);
    cambia();
    m.addEventListener?.('change', cambia);
    // anche al ridimensionamento: dove l'evento `change` non arriva (larghezza emulata dagli strumenti del browser) la disposizione si
    // rimetteva solo ricaricando la pagina
    window.addEventListener('resize', cambia);
    return () => { m.removeEventListener?.('change', cambia); window.removeEventListener('resize', cambia); };
  }, [q]);
  return vale;
}
