// ============================================================
// Test — il completamento con la funzione unica (L4 «Avanzamento unico», lotti/L4/modifiche.md §1.5)
// ============================================================

import { areaCompletata, infiltrazioneCompletata, palazzoCompletato, palazzoConcluso, percentualeOggetti } from './completamentoGuida.js';

describe('completamento della guida dei Palazzi', () => {
  it('un’infiltrazione: completata con tutti gli oggetti permanenti fatti; senza niente da contare mai (R4-22); senza partita null', () => {
    expect(infiltrazioneCompletata({ oggetti: 3, fatti: 3 })).toBe(true);
    expect(infiltrazioneCompletata({ oggetti: 3, fatti: 2 })).toBe(false);
    expect(infiltrazioneCompletata({ oggetti: 0, fatti: 0 })).toBe(false);
    expect(infiltrazioneCompletata({ oggetti: 3, fatti: null })).toBeNull();
  });

  it('un’Area del Palazzo o una planimetria: senza niente da contare è completata (2026-10-11)', () => {
    expect(areaCompletata({ oggetti: 0, fatti: 0 })).toBe(true);
    expect(areaCompletata({ oggetti: 2, fatti: 1 })).toBe(false);
    expect(areaCompletata({ oggetti: 2, fatti: 2 })).toBe(true);
    expect(areaCompletata({ oggetti: 2, fatti: null })).toBeNull();
  });

  it('un Palazzo: oggetti, Tesoro e boss insieme; senza oggetti non si completa; senza partita null', () => {
    expect(palazzoCompletato({ oggetti: 5, fatti: 5, tesoro: true, boss: true })).toBe(true);
    expect(palazzoCompletato({ oggetti: 5, fatti: 5, tesoro: false, boss: true })).toBe(false);
    expect(palazzoCompletato({ oggetti: 5, fatti: 5, tesoro: true, boss: false })).toBe(false);
    expect(palazzoCompletato({ oggetti: 5, fatti: 4, tesoro: true, boss: true })).toBe(false);
    expect(palazzoCompletato({ oggetti: 0, fatti: 0, tesoro: true, boss: true })).toBe(false);
    expect(palazzoCompletato({ oggetti: 5, fatti: null, tesoro: null, boss: null })).toBeNull();
  });

  it('un Palazzo concluso (§8.10): Tesoro e boss finale, senza guardare gli oggetti; il Tesoro senza boss non conclude', () => {
    expect(palazzoConcluso({ tesoro: true, boss: true })).toBe(true);
    expect(palazzoConcluso({ tesoro: true, boss: false })).toBe(false);
    expect(palazzoConcluso({ tesoro: false, boss: true })).toBe(false);
    expect(palazzoConcluso({ tesoro: null, boss: null })).toBeNull();
    // Kamoshida p1: concluso, non completato (56/71)
    expect(palazzoConcluso({ tesoro: true, boss: true }) && !palazzoCompletato({ oggetti: 71, fatti: 56, tesoro: true, boss: true })).toBe(true);
  });

  it('la percentuale: intera per difetto, il 100% solo a oggetti tutti fatti; null senza partita o senza oggetti', () => {
    expect(percentualeOggetti({ oggetti: 71, fatti: 56 })).toBe(78);
    expect(percentualeOggetti({ oggetti: 3, fatti: 2 })).toBe(66);
    expect(percentualeOggetti({ oggetti: 200, fatti: 199 })).toBe(99);
    expect(percentualeOggetti({ oggetti: 80, fatti: 80 })).toBe(100);
    expect(percentualeOggetti({ oggetti: 0, fatti: 0 })).toBeNull();
    expect(percentualeOggetti({ oggetti: 3, fatti: null })).toBeNull();
  });
});
