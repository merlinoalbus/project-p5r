// @vitest-environment jsdom
// ============================================================
// Test postoDellaCoda — la coda delle notifiche non copre il popup di uno spillo
// ============================================================

import { postoDellaCoda } from './postoCoda';

// uno schermo da tablet: 768 × 1024, la coda al suo posto sta a `bottom-20` (80 px) e `right-5` (20 px)
const schermo = { w: 768, h: 1024 };
const rettangolo = (top: number, bottom: number, left: number, right: number) =>
  ({ top, bottom, left, right, width: right - left, height: bottom - top, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

const popup = (r: DOMRect, fisso = false) => {
  const el = document.createElement('div');
  el.className = 'spillo-popup';
  if (fisso) el.style.position = 'fixed';
  el.getBoundingClientRect = () => r;
  document.body.appendChild(el);
  return el;
};
// la coda: 300 × 70
const coda = () => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'offsetHeight', { value: 70 });
  Object.defineProperty(el, 'offsetWidth', { value: 300 });
  return el;
};

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: schermo.w });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: schermo.h });
});
afterEach(() => { document.body.innerHTML = ''; });

it('senza popup aperti la coda sta al suo posto', () => {
  expect(postoDellaCoda(coda())).toEqual({ bottom: null, aSinistra: false });
});

it('sopra un foglio dal basso, che occupa tutta la larghezza', () => {
  popup(rettangolo(770, 960, 8, 760), true);
  expect(postoDellaCoda(coda())).toEqual({ bottom: 1024 - 770 + 8, aSinistra: false });
  // il foglio si scansa sempre, anche prima che la coda si possa misurare: non dipende dalla sua zona
  expect(postoDellaCoda(null)).toEqual({ bottom: 1024 - 770 + 8, aSinistra: false });
});

it('un popup ancorato a destra che scende nella sua zona: la coda passa a sinistra, dove ci sta', () => {
  // la zona della coda: top 1024-80-70 = 874, bottom 944, da 768-20-300 = 448 a 748
  popup(rettangolo(785, 939, 470, 730));
  expect(postoDellaCoda(coda())).toEqual({ bottom: null, aSinistra: true });
});

it('un popup ancorato che lascia troppo poco spazio a sinistra: la coda gli sta sopra', () => {
  popup(rettangolo(785, 939, 250, 510));
  expect(postoDellaCoda(coda())).toEqual({ bottom: 1024 - 785 + 8, aSinistra: false });
});

it('un popup ancorato fuori dalla sua zona non la sposta', () => {
  popup(rettangolo(300, 454, 470, 730));
  expect(postoDellaCoda(coda())).toEqual({ bottom: null, aSinistra: false });
});
