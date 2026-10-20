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

// LAY3-8: l'elenco aperto resta sempre dentro la finestra. A 1366×657 (Shido, 6 versioni) andava da 325 a 667: ora, se sotto non c'è
// spazio, si apre dalla parte dove ce n'è di più, alto al massimo quello spazio, e scorre (area scorrevole, overscroll contenuto)
describe('l’elenco aperto resta nella finestra (LAY3-8)', () => {
  const rettangolo = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 300, width: 300, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  let altezzaFinestra: number;
  beforeEach(() => {
    altezzaFinestra = window.innerHeight;
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.getAttribute('role') === 'listbox' ? 342 : 0; });
  });
  afterEach(() => { vi.restoreAllMocks(); Object.defineProperty(window, 'innerHeight', { configurable: true, value: altezzaFinestra }); });

  it('sotto non basta e c’è più spazio sotto che sopra: si apre sotto, alto quanto lo spazio, e scorre', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 657 });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) { return this.getAttribute('aria-haspopup') === 'listbox' ? rettangolo(281, 325) : rettangolo(0, 0); });
    render(<SelettoreVersioni nome="Prigione sotterranea" planimetrie={versioni} scelta="m-0" onScegli={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^Versioni di Prigione sotterranea/ }));
    const elenco = screen.getByRole('listbox');
    // 657 - 325 - 4 (lo stacco) - 8 (il margine dal bordo) = 320
    expect(elenco.style.maxHeight).toBe('320px');
    expect(elenco.style.bottom).toBe('');
    expect(elenco.className).toContain('area-scorrevole');
  });

  it('sopra c’è più spazio che sotto: si apre verso l’alto', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 657 });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) { return this.getAttribute('aria-haspopup') === 'listbox' ? rettangolo(500, 544) : rettangolo(0, 0); });
    render(<SelettoreVersioni nome="Prigione sotterranea" planimetrie={versioni} scelta="m-0" onScegli={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^Versioni di Prigione sotterranea/ }));
    const elenco = screen.getByRole('listbox');
    // sopra: 500 - 4 - 8 = 488, più dell'elenco (342) e del tetto (60% di 657 = 394): vale il tetto
    expect(elenco.style.bottom).toBe('calc(100% + 4px)');
    expect(elenco.style.maxHeight).toBe('394px');
  });

  it('sotto c’è spazio: si apre sotto come prima, senza cambiare niente', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) { return this.getAttribute('aria-haspopup') === 'listbox' ? rettangolo(281, 325) : rettangolo(0, 0); });
    render(<SelettoreVersioni nome="Prigione sotterranea" planimetrie={versioni} scelta="m-0" onScegli={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^Versioni di Prigione sotterranea/ }));
    const elenco = screen.getByRole('listbox');
    expect(elenco.style.bottom).toBe('');
    // il tetto di prima (60% della finestra, al massimo 420): l'elenco di 342 ci sta tutto
    expect(elenco.style.maxHeight).toBe('420px');
  });
});
