import { describe, expect, it } from 'vitest';
import { etichettaMappeSorelle, nomeTipoMappa, titoloMappeSorelle, titoloMappeVicine } from './vocabolarioMappe';

// L0 (2026-10-20): l'intestazione del visore sopra le mappe figlie e il genitore diceva «Luoghi e planimetrie» per tutto, ma
// «luogo» è solo l'attività: le figlie di Tokyo sono quartieri, di un quartiere aree, di un Palazzo planimetrie.
describe('titoloMappeVicine', () => {
  it('dice che cosa sono le mappe sotto e sopra quella aperta', () => {
    expect(titoloMappeVicine('citta')).toBe('Quartieri');
    expect(titoloMappeVicine('quartiere')).toBe('Aree');
    expect(titoloMappeVicine('luogo')).toBe('Aree vicine');
    expect(titoloMappeVicine('palazzo')).toBe('Planimetrie');
    expect(titoloMappeVicine('area')).toBe('Planimetrie');
    expect(titoloMappeVicine('dedalo')).toBe('Dedali');
    expect(titoloMappeVicine('generica')).toBe('Posti collegati');
  });
});

// L0: il selettore del pannello cambia fra le mappe dello stesso genitore — quartieri fra i quartieri, aree fra le aree,
// planimetrie fra le planimetrie di un Palazzo (al primo giro diceva «Aree» anche sotto Shibuya, che è un quartiere)
describe('titoloMappeSorelle', () => {
  it('dice che cosa sono le mappe accanto a quella aperta', () => {
    expect(titoloMappeSorelle('quartiere')).toBe('Quartieri');
    expect(titoloMappeSorelle('luogo')).toBe('Aree');
    expect(titoloMappeSorelle('area')).toBe('Planimetrie');
    expect(titoloMappeSorelle('palazzo')).toBe('Palazzi');
    expect(titoloMappeSorelle('generica')).toBe('Posti');
  });
});
describe('etichettaMappeSorelle', () => {
  it('accorda il nome del gruppo per i lettori di schermo', () => {
    expect(etichettaMappeSorelle('quartiere')).toBe('Altri quartieri');
    expect(etichettaMappeSorelle('luogo')).toBe('Altre aree');
    expect(etichettaMappeSorelle('area')).toBe('Altre planimetrie');
    expect(etichettaMappeSorelle('palazzo')).toBe('Altri Palazzi');
    expect(etichettaMappeSorelle('citta')).toBe('Altri posti');
  });
});

// L2 (2026-10-20): nessuna voce si chiama più «Mappa»/«Mappe» (M18, M18b); nel mondo una mappa in un'Area è una Planimetria (R2-39)
describe('nomeTipoMappa e nessuna «Mappa» nei nomi dei livelli', () => {
  it('una mappa con area è una Planimetria qualunque sia il tipo; senza, il nome del suo tipo', () => {
    expect(nomeTipoMappa({ tipo: 'luogo', area: { nome: 'Central Street' } })).toBe('Planimetria');
    expect(nomeTipoMappa({ tipo: 'area', area: { nome: 'Sottopasso' } })).toBe('Planimetria');
    expect(nomeTipoMappa({ tipo: 'quartiere', area: null })).toBe('Quartiere');
    expect(nomeTipoMappa({ tipo: 'palazzo' })).toBe('Palazzo');
  });
  it('nessun titolo di vicine o sorelle contiene «mappa»', () => {
    const tipi = ['citta', 'quartiere', 'luogo', 'palazzo', 'area', 'dedalo', 'generica'] as const;
    for (const t of tipi) for (const testo of [titoloMappeVicine(t), titoloMappeSorelle(t), etichettaMappeSorelle(t)]) expect(testo.toLowerCase()).not.toContain('mapp');
  });
});
