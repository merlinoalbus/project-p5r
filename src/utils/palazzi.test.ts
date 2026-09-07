// ============================================================
// Test palazzi — i due filtri delle radici: l'elenco dei Palazzi e la mappa di Tokyo
// ============================================================
//
// Le due domande («cosa entra nell'elenco» e «cosa si vede sulla mappa») hanno risposte diverse, e
// averle confuse in una aveva tolto i Memento dalla mappa dove l'utente li aveva chiesti per nome.
// Qui la differenza è fissata: un filtro tiene fuori i Memento, l'altro li tiene dentro, e nessuno
// dei due lascia entrare un tipo che non conosce.
// ============================================================

import { radiciMetaverso, soloPalazzi } from './palazzi';

/** Un tipo che il seed oggi non produce: serve a provare che i filtri includono, non escludono. */
const ignoto = { tipo: 'ignoto' } as unknown as { tipo: 'palazzo' };
const palazzo = { tipo: 'palazzo' } as const;
const memento = { tipo: 'mementos' } as const;

describe('soloPalazzi — l’elenco dei Palazzi', () => {
  it('tiene i Palazzi, lascia fuori i Memento e ogni tipo sconosciuto', () => {
    expect(soloPalazzi([palazzo, memento, ignoto])).toEqual([palazzo]);
  });
});

describe('radiciMetaverso — quel che la mappa di Tokyo può mostrare', () => {
  it('tiene i Palazzi e i Memento, e lascia fuori ogni tipo sconosciuto', () => {
    expect(radiciMetaverso([palazzo, memento, ignoto])).toEqual([palazzo, memento]);
  });

  it('non è lo stesso filtro dell’elenco: è la differenza che aveva fatto sparire i Memento', () => {
    const tutte = [palazzo, memento];
    expect(radiciMetaverso(tutte)).not.toEqual(soloPalazzi(tutte));
    expect(radiciMetaverso(tutte)).toHaveLength(soloPalazzi(tutte).length + 1);
  });
});
