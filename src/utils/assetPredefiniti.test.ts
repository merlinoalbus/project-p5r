// ============================================================
// Test chiaviAssetPredefinito — mappatura ambito/chiave → chiavi del manifest
// ============================================================

import { chiaviAssetPredefinito } from './assetPredefiniti';

describe('chiaviAssetPredefinito', () => {
  it('Persona e Confidenti usano lo slug del nome/chiave', () => {
    expect(chiaviAssetPredefinito('persona', 'Jack Frost', 'quadrata', 120)).toEqual(['persona/jack-frost', null]);
    expect(chiaviAssetPredefinito('persona', 'Arsène', 'quadrata', 120)).toEqual(['persona/arsene', null]);
    expect(chiaviAssetPredefinito('confidente', 'ryuji', 'tonda', 72)).toEqual(['confidenti/ryuji', null]);
  });
  it('Arcani: carta intera per forma carta o riquadri grandi, icona per i piccoli, con riserva incrociata', () => {
    expect(chiaviAssetPredefinito('arcana', 'Fool', 'carta', 40)).toEqual(['arcani/fool', 'arcani/icona/fool']);
    expect(chiaviAssetPredefinito('arcana', 'Fool', 'quadrata', 120)).toEqual(['arcani/fool', 'arcani/icona/fool']);
    expect(chiaviAssetPredefinito('arcana', 'Hanged', 'quadrata', 40)).toEqual(['arcani/icona/hanged', 'arcani/hanged']);
  });
  it('skill e altro non hanno asset predefiniti', () => {
    expect(chiaviAssetPredefinito('skill', 'Agi', 'quadrata', 64)).toEqual([null, null]);
    expect(chiaviAssetPredefinito('altro', 'x', 'quadrata', 64)).toEqual([null, null]);
  });
});
