// ============================================================
// Test registro dei tipi di spillo — conteggio, completezza delle definizioni, colori distinti, gruppi della palette, tipi «dialogo» e della città
// ============================================================

import { CATEGORIE_SPILLO, DEFINIZIONI_SPILLO, RIFERIMENTI_PER_CATEGORIA, TIPI_SPILLO, categoriaSpillo, spilloPerPunto, tipiDellaCategoria } from './spilli.js';

describe('registro dei tipi di spillo', () => {
  it('conta 40 tipi distinti, ognuno con nome, colore esadecimale e riserva nel registro', () => {
    expect(TIPI_SPILLO).toHaveLength(40);
    expect(new Set(TIPI_SPILLO).size).toBe(40);
    for (const t of TIPI_SPILLO) expect(DEFINIZIONI_SPILLO[t]).toMatchObject({ nome: expect.any(String), colore: expect.stringMatching(/^#[0-9a-f]{6}$/) });
    expect(new Set(TIPI_SPILLO.map((t) => DEFINIZIONI_SPILLO[t].colore)).size).toBe(40);
    expect(new Set(TIPI_SPILLO.map((t) => DEFINIZIONI_SPILLO[t].nome)).size).toBe(40);
  });

  it('le quattro categorie coprono ogni tipo una sola volta, e i riferimenti tipici stanno nella categoria', () => {
    const perCategoria = CATEGORIE_SPILLO.flatMap((c) => tipiDellaCategoria(c));
    expect([...perCategoria].sort()).toEqual([...TIPI_SPILLO].sort());
    expect(tipiDellaCategoria('spostamento')).toEqual(['passaggio', 'scala', 'uscita', 'treno', 'rampino', 'scorciatoia', 'velluto', 'mementos', 'ingresso-palazzo']);
    expect(tipiDellaCategoria('consumabile')).toEqual(['dialogo', 'forziere', 'forziere-raro', 'tesoro', 'tesoro-palazzo', 'seme-bramosia', 'oggetto-chiave', 'timbro', 'boss', 'miniboss', 'nemico']);
    for (const t of TIPI_SPILLO) {
      const rif = DEFINIZIONI_SPILLO[t].riferimento;
      if (rif) expect(RIFERIMENTI_PER_CATEGORIA[categoriaSpillo(t)], t).toContain(rif);
      expect(DEFINIZIONI_SPILLO[t].collezionabile, t).toBe(categoriaSpillo(t) === 'consumabile');
    }
  });

  it('«dialogo» è collezionabile, senza riferimento tipico e non nasce da alcuna corrispondenza automatica', () => {
    expect(DEFINIZIONI_SPILLO.dialogo).toEqual({ nome: 'Dialogo', colore: '#6366f1', collezionabile: true, riferimento: null });
    expect(spilloPerPunto('persona')).toBe('nota');
  });

  it('i punti di interesse della città usano le etichette della mappa del gioco («Bevande», «Sigarette», «Cercalavoro») e restano luoghi', () => {
    expect(DEFINIZIONI_SPILLO.distributore.nome).toBe('Bevande');
    for (const t of ['sigarette', 'cercalavoro', 'terme', 'lavanderia', 'cinema', 'biblioteca', 'culto', 'sala-giochi', 'casa'] as const) {
      expect(DEFINIZIONI_SPILLO[t]).toMatchObject({ collezionabile: false, riferimento: 'luogo' });
    }
    expect(DEFINIZIONI_SPILLO.lavoro).toMatchObject({ nome: 'Lavoro part-time', collezionabile: false, riferimento: 'attivita' });
  });

  it('i nuovi tipi dei Palazzi e dei Mementos: il timbro si raccoglie, meccanismo/porta puntano a un punto, il rampino non ha riferimento tipico', () => {
    expect(DEFINIZIONI_SPILLO.timbro).toMatchObject({ collezionabile: true, riferimento: null });
    expect(DEFINIZIONI_SPILLO.meccanismo).toMatchObject({ collezionabile: false, riferimento: 'punto' });
    expect(DEFINIZIONI_SPILLO.porta).toMatchObject({ collezionabile: false, riferimento: 'punto' });
    expect(DEFINIZIONI_SPILLO.rampino).toMatchObject({ collezionabile: false, riferimento: null });
    // le corrispondenze automatiche dalla guida non cambiano: i punti «puzzle» restano punti sensibili
    expect(spilloPerPunto('puzzle')).toBe('punto-sensibile');
  });
});
