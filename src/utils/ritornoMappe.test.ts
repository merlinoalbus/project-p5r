// @vitest-environment jsdom
// ============================================================
// Test ritornoMappe — la pagina da cui si entra nelle mappe resta fra mappe, livelli, visore ed editor; uscendo si cancella
// ============================================================

import { annotaNavigazione, ePaginaDiMappa, ritornoMappe } from './ritornoMappe';

beforeEach(() => { sessionStorage.clear(); annotaNavigazione(null, '/home'); });

it('riconosce visore ed editor di una mappa, non l’elenco delle mappe', () => {
  expect(ePaginaDiMappa('/guida/mappe/citta-shibuya')).toBe(true);
  expect(ePaginaDiMappa('/guida/mappe/citta-shibuya/modifica')).toBe(true);
  expect(ePaginaDiMappa('/guida/mappe/lmap%2Ftokyo?spillo=3')).toBe(true);
  expect(ePaginaDiMappa('/guida/mappe')).toBe(false);
  expect(ePaginaDiMappa('/home')).toBe(false);
});

it('entrando da una pagina la annota con i parametri; fra mappe, livelli ed editor resta; uscendo si cancella', () => {
  annotaNavigazione('/partita?scheda=oggi', '/guida/mappe/citta-shibuya');
  expect(ritornoMappe()).toBe('/partita?scheda=oggi');
  expect(sessionStorage.getItem('p5r-ritorno-mappe')).toBe('/partita?scheda=oggi');
  annotaNavigazione('/guida/mappe/citta-shibuya', '/guida/mappe/lmap-shibuya-centro');
  annotaNavigazione('/guida/mappe/lmap-shibuya-centro', '/guida/mappe/lmap-shibuya-centro/modifica');
  expect(ritornoMappe()).toBe('/partita?scheda=oggi');
  annotaNavigazione('/guida/mappe/lmap-shibuya-centro/modifica', '/partita');
  expect(ritornoMappe()).toBeNull();
});

it('aperta direttamente (nessuna pagina prima) non c’è ritorno; dall’elenco delle mappe si torna all’elenco', () => {
  annotaNavigazione(null, '/guida/mappe/citta-shibuya');
  expect(ritornoMappe()).toBeNull();
  annotaNavigazione('/guida/mappe/citta-shibuya', '/guida/mappe');
  annotaNavigazione('/guida/mappe', '/guida/mappe/tokyo');
  expect(ritornoMappe()).toBe('/guida/mappe');
});

it('regge a un ricaricamento sulla mappa: il ritorno annotato resta', () => {
  annotaNavigazione('/home', '/guida/mappe/tokyo');
  // al ricaricamento `MainLayout` riparte senza pagina precedente
  annotaNavigazione(null, '/guida/mappe/tokyo');
  expect(ritornoMappe()).toBe('/home');
});
