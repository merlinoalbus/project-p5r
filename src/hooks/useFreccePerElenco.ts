// ============================================================
// useFreccePerElenco — le frecce nell'elenco dei risultati di un campo di ricerca (SelettorePersona, SelettoreSkill)
// ============================================================
// L'elenco è una lista di pulsanti veri (Tab li attraversa e il tocco li sceglie): le frecce sono una scorciatoia in più, come in un
// menu. ↓ dal campo di ricerca va alla prima voce; ↑/↓ fra le voci si spostano; ↑ dalla prima torna al campo; Home e Fine vanno agli
// estremi. Le voci si riconoscono dall'attributo `data-voce-elenco` e il campo dal `type="search"` dentro il contenitore.

import { useCallback, useRef, type KeyboardEvent } from 'react';

/** Da attaccare al contenitore (campo + elenco): `rif` come `ref`, `suTasto` come `onKeyDown`. */
export function useFreccePerElenco() {
  const rif = useRef<HTMLDivElement>(null);

  const suTasto = useCallback((e: KeyboardEvent<HTMLElement>) => {
    const contenitore = rif.current;
    if (!contenitore || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const voci = [...contenitore.querySelectorAll<HTMLElement>('[data-voce-elenco]')];
    if (voci.length === 0) return;
    const campo = contenitore.querySelector<HTMLInputElement>('input[type="search"]');
    const bersaglio = e.target instanceof HTMLElement ? e.target : null;
    if (!bersaglio) return;
    const indice = voci.indexOf(bersaglio);

    if (indice === -1) {
      // dal campo di ricerca: ↓ entra nell'elenco
      if (bersaglio === campo && e.key === 'ArrowDown') {
        e.preventDefault();
        voci[0].focus();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      voci[Math.min(indice + 1, voci.length - 1)].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (indice === 0) campo?.focus();
      else voci[indice - 1].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      voci[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      voci[voci.length - 1].focus();
    }
  }, []);

  return { rif, suTasto };
}
