/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test SelettoreVersioni — le versioni di un'Area nel selettore compatto della scheda del Palazzo (L3, R3-41; LAY3-7)
// ============================================================

import { fireEvent, render, screen, within } from '@testing-library/react';
import { SelettoreVersioni } from './SelettoreVersioni';
import type { PlanimetriaAreaDto } from '../../types';

// la miniatura non serve qui: si prova il testo
vi.mock('./AnteprimaMappa', () => ({ AnteprimaMappa: () => null }));

/** Una versione dell'Area con etichetta, ordine, predefinita e pin dati. */
const versione = (chiave: string, etichetta: string, ordine: number, numeroSpilli: number, predefinita = false): PlanimetriaAreaDto => ({
  chiave, nome: 'Prigione sotterranea', etichetta, ordine, predefinita, numeroSpilli, immagineUrl: null, asset: null, ruoloImmagine: 'planimetria-nativa',
});
const versioni = [
  versione('m-0', 'Pianta completa della prigione sotterranea con le celle', 0, 18, true),
  versione('m-1', 'Porzione ovest, dalle celle al ponte levatoio', 1, 0),
];

// LAY3-7 (decisione del PM, strada (b)): da 1024 px il selettore resta su una riga (R3-41 ha la precedenza) e il valore chiuso può accorciarsi;
// il nome intero della versione sta nel nome accessibile del pulsante e, con un tocco, nell'elenco aperto, dove nessun nome è accorciato
it('il nome intero della versione scelta è nel nome del pulsante; l’elenco aperto non accorcia nessun nome (LAY3-7)', () => {
  render(<SelettoreVersioni nome="Prigione sotterranea" planimetrie={versioni} scelta="m-0" onScegli={() => {}} />);
  const pulsante = screen.getByRole('button', { name: 'Versioni di Prigione sotterranea: Pianta completa della prigione sotterranea con le celle, 1 di 2' });
  fireEvent.click(pulsante);
  const elenco = screen.getByRole('listbox', { name: 'Versioni di Prigione sotterranea' });
  const voci = within(elenco).getAllByRole('option');
  expect(voci.map((v) => v.textContent)).toEqual([
    'Pianta completa della prigione sotterranea con le celle18 pin · si apre per prima',
    'Porzione ovest, dalle celle al ponte levatoionessun pin',
  ]);
  for (const el of elenco.querySelectorAll('*')) expect(el.className.toString()).not.toMatch(/truncate|line-clamp|text-ellipsis/);
  expect(within(elenco).getByRole('option', { selected: true })).toHaveTextContent('Pianta completa della prigione sotterranea con le celle');
});
