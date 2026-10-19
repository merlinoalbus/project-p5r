import { describe, expect, it } from 'vitest';
import { nomeTipoAccessoMondo, titoloSchedaAccessoMondo } from './accessoMondo';

// L0 (2026-10-20): ogni cosa si chiama col suo nome, e i Memento restano Memento e dedali (rilievo del validatore: la mappa dei
// Memento diceva «Scheda del Palazzo»).
describe('nomi delle schede e dei tipi cercati', () => {
  it('un Palazzo e i Memento hanno ciascuno la loro scheda', () => {
    expect(titoloSchedaAccessoMondo('dungeon', 'madarame')).toBe('Scheda del Palazzo');
    expect(titoloSchedaAccessoMondo('dungeon', 'mementos')).toBe('Scheda dei Memento');
  });
  it('un’infiltrazione di un Palazzo e un dedalo dei Memento si distinguono dalla chiave', () => {
    expect(titoloSchedaAccessoMondo('area', 'madarame-scopri-dove-il-tesoro')).toBe('Scheda dell’infiltrazione');
    expect(titoloSchedaAccessoMondo('area', 'mementos-01-qimranut')).toBe('Scheda del dedalo');
    expect(nomeTipoAccessoMondo('area', 'madarame-scopri-dove-il-tesoro')).toBe('Infiltrazione');
    expect(nomeTipoAccessoMondo('area', 'mementos-01-qimranut')).toBe('Dedalo');
  });
  it('il tipo cercato: Palazzo o Memento, quartiere, luogo; un tipo ignoto è una voce', () => {
    expect(nomeTipoAccessoMondo('dungeon', 'kamoshida')).toBe('Palazzo');
    expect(nomeTipoAccessoMondo('dungeon', 'mementos')).toBe('Memento');
    expect(nomeTipoAccessoMondo('quartiere', 'shibuya')).toBe('Quartiere');
    expect(nomeTipoAccessoMondo('luogo', 'shibuya/untouchable')).toBe('Luogo');
    expect(nomeTipoAccessoMondo('mappa', 'x')).toBe('Mappa');
    expect(nomeTipoAccessoMondo('boh', 'x')).toBe('Voce');
  });
  it('le altre schede col loro nome', () => {
    expect(titoloSchedaAccessoMondo('quartiere', 'shibuya')).toBe('Scheda del quartiere');
    expect(titoloSchedaAccessoMondo('luogo', 'shibuya/untouchable')).toBe('Scheda del luogo');
    expect(titoloSchedaAccessoMondo('mappa', 'x')).toBe('Scheda');
  });
});
