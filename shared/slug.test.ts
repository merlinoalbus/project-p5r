// ============================================================
// Test slug — regola dei nomi file degli asset
// ============================================================

import { slug, slugPercorso } from './slug.js';

describe('slug', () => {
  it('applica la regola documentata (minuscolo, senza accenti né apostrofi, trattini compressi)', () => {
    expect(slug('Jack Frost')).toBe('jack-frost');
    expect(slug('Arsène')).toBe('arsene');
    expect(slug("Jack-o'-Lantern")).toBe('jack-o-lantern');
    expect(slug('Izanagi-no-Okami Picaro')).toBe('izanagi-no-okami-picaro');
    expect(slug('Kikuri-Hime')).toBe('kikuri-hime');
    expect(slug("Queen's Necklace")).toBe('queens-necklace');
    expect(slug('Fool')).toBe('fool');
    expect(slug('  Ame no Uzume  ')).toBe('ame-no-uzume');
    expect(slug('Mot')).toBe('mot');
  });
  it('slugPercorso conserva le cartelle e normalizza i separatori', () => {
    expect(slugPercorso('arcani/Fool')).toBe('arcani/fool');
    expect(slugPercorso('arcani\\icona\\Fool')).toBe('arcani/icona/fool');
    expect(slugPercorso('persona/Jack Frost')).toBe('persona/jack-frost');
    expect(slugPercorso('/ui//rango-max/')).toBe('ui/rango-max');
  });
});
