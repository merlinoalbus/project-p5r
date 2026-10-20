// ============================================================
// Test delle miniature condivise (L1, variante «miniature»): quali URL ne hanno e come si scrivono `l` e `srcset`
// ============================================================

import { LARGHEZZE_MINIATURA, larghezzaMiniaturaAmmessa, srcsetMiniature, urlMiniatura } from './miniature.js';

describe('miniature delle immagini del database', () => {
  it('le misure ammesse sono un insieme chiuso', () => {
    expect([...LARGHEZZE_MINIATURA]).toEqual([160, 320, 640, 1024]);
    expect(larghezzaMiniaturaAmmessa(320)).toBe(true);
    for (const l of [0, 300, 2048, Number.NaN]) expect(larghezzaMiniaturaAmmessa(l)).toBe(false);
  });

  it('urlMiniatura: `&l=` dopo la versione, `?l=` senza query; un `l` già presente si sostituisce; il frammento resta in fondo', () => {
    expect(urlMiniatura('/api/immagini/mappa/citta-shibuya/file?v=2026-10-20T10%3A00%3A00.000Z', 320)).toBe('/api/immagini/mappa/citta-shibuya/file?v=2026-10-20T10%3A00%3A00.000Z&l=320');
    expect(urlMiniatura('/api/immagini/mappe/lmap%2Ftokyo%2Fshibuya/file', 160)).toBe('/api/immagini/mappe/lmap%2Ftokyo%2Fshibuya/file?l=160');
    expect(urlMiniatura('/api/immagini/mappa/x/file?v=1&l=160', 640)).toBe('/api/immagini/mappa/x/file?v=1&l=640');
    expect(urlMiniatura('http://localhost:3201/api/immagini/mappa/x/file?v=1#a', 1024)).toBe('http://localhost:3201/api/immagini/mappa/x/file?v=1&l=1024#a');
  });

  it('urlMiniatura lascia invariati asset statici, blob:, data:, esterni e le altre rotte delle immagini', () => {
    for (const u of ['/asset/mappe/tokyo.png', 'blob:http://localhost:5373/1234', 'data:image/png;base64,AAAA', 'https://static.wikia.nocookie.net/x.png', '/api/immagini/manifest', '/api/immagini/mappa/x']) {
      expect(urlMiniatura(u, 320)).toBe(u);
      expect(srcsetMiniature(u)).toBe('');
    }
  });

  it('srcsetMiniature: tutte le misure in ordine, o quelle chieste', () => {
    const u = '/api/immagini/mappa/citta-shibuya/file?v=1';
    expect(srcsetMiniature(u)).toBe(`${u}&l=160 160w, ${u}&l=320 320w, ${u}&l=640 640w, ${u}&l=1024 1024w`);
    expect(srcsetMiniature(u, [320, 640])).toBe(`${u}&l=320 320w, ${u}&l=640 640w`);
  });
});
