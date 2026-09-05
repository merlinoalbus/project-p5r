// ============================================================
// Test registro dei tipi di spillo — conteggio, completezza delle definizioni, colori distinti, gruppi della palette, tipi «dialogo» e della città
// ============================================================

import { DEFINIZIONI_SPILLO, GRUPPI_SPILLO, TIPI_SPILLO, spilloPerLuogo, spilloPerPunto } from './spilli.js';

describe('registro dei tipi di spillo', () => {
  it('conta 34 tipi distinti, ognuno con nome, colore esadecimale e riserva nel registro', () => {
    expect(TIPI_SPILLO).toHaveLength(34);
    expect(new Set(TIPI_SPILLO).size).toBe(34);
    for (const t of TIPI_SPILLO) expect(DEFINIZIONI_SPILLO[t]).toMatchObject({ nome: expect.any(String), colore: expect.stringMatching(/^#[0-9a-f]{6}$/) });
    expect(new Set(TIPI_SPILLO.map((t) => DEFINIZIONI_SPILLO[t].colore)).size).toBe(34);
    expect(new Set(TIPI_SPILLO.map((t) => DEFINIZIONI_SPILLO[t].nome)).size).toBe(34);
  });

  it('i gruppi della palette coprono ogni tipo una sola volta, nello stesso ordine del registro', () => {
    const inGruppi = GRUPPI_SPILLO.flatMap((g) => g.tipi);
    expect(inGruppi).toEqual([...TIPI_SPILLO]);
    expect(GRUPPI_SPILLO.map((g) => g.nome)).toEqual(['Spostamenti', 'Città', 'Persone', 'Palazzi e Mementos', 'Altro']);
  });

  it('«dialogo» è collezionabile, senza riferimento tipico e non nasce da alcuna corrispondenza automatica', () => {
    expect(DEFINIZIONI_SPILLO.dialogo).toEqual({ nome: 'Dialogo', colore: '#6366f1', collezionabile: true, riferimento: null });
    expect(spilloPerPunto('persona')).toBe('nota');
    expect(spilloPerLuogo('altro')).toBe('nota');
  });

  it('i punti di interesse della città usano le etichette della mappa del gioco («Bevande», «Sigarette», «Cercalavoro») e restano luoghi', () => {
    expect(DEFINIZIONI_SPILLO.distributore.nome).toBe('Bevande');
    expect(spilloPerLuogo('distributore')).toBe('distributore');
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
