// ============================================================
// Aiuti per i test che usano il Selettore (l'elenco chiuso dell'app)
// ============================================================
//
// Il selettore non è una <select>: è un pulsante `combobox` che apre un `listbox`. Scegliere una
// voce vuol dire aprire e cliccare l'opzione, non cambiare un valore.
// ============================================================

import { fireEvent, screen, within } from '@testing-library/react';

/** Il pulsante del selettore con quell'etichetta. */
export function selettore(nome: string | RegExp, contenitore: HTMLElement = document.body): HTMLElement {
  return within(contenitore).getByRole('combobox', { name: nome });
}

/** Il valore mostrato dal selettore (il nome della voce scelta, o il segnaposto). */
export function valoreSelettore(nome: string | RegExp, contenitore?: HTMLElement): string {
  return selettore(nome, contenitore).querySelector('.selettore__valore')?.textContent ?? '';
}

/** Apre il selettore e sceglie la voce con quel nome (testo esatto o espressione). */
export function scegliVoce(nomeSelettore: string | RegExp, voce: string | RegExp, contenitore?: HTMLElement): void {
  const pulsante = selettore(nomeSelettore, contenitore);
  if (pulsante.getAttribute('aria-expanded') !== 'true') fireEvent.click(pulsante);
  const elenco = screen.getByRole('listbox', { name: nomeSelettore });
  fireEvent.click(within(elenco).getByRole('button', { name: voce }));
}

/** I nomi delle voci offerte dal selettore (lo apre e lo richiude). */
export function vociSelettore(nomeSelettore: string | RegExp, contenitore?: HTMLElement): string[] {
  const pulsante = selettore(nomeSelettore, contenitore);
  fireEvent.click(pulsante);
  const elenco = screen.getByRole('listbox', { name: nomeSelettore });
  const voci = within(elenco).getAllByRole('option').map((o) => o.querySelector('.min-w-0')?.textContent ?? o.textContent ?? '');
  fireEvent.click(pulsante);
  return voci;
}
