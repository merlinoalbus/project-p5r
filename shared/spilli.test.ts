// ============================================================
// Test registro dei tipi di spillo — conteggio, completezza delle definizioni, colori distinti, gruppi della palette, tipi «dialogo» e della città
// ============================================================

import { CATEGORIE_SPILLO, DEFINIZIONI_SPILLO, RIFERIMENTI_PER_CATEGORIA, TIPI_SPILLO, categoriaSpillo, eStrutturale, parolaDelloStato, ritornoDelloStato, spilloPerPunto, statoCitabile, statoDelPin, statoDelTipo, tipiDellaCategoria } from './spilli.js';

describe('registro dei tipi di spillo', () => {
  it('conta 41 tipi distinti (il «Tesoro» generico è stato tolto), ognuno con nome, colore esadecimale e riserva nel registro', () => {
    expect(TIPI_SPILLO).toHaveLength(41);
    expect(new Set(TIPI_SPILLO).size).toBe(41);
    for (const t of TIPI_SPILLO) expect(DEFINIZIONI_SPILLO[t]).toMatchObject({ nome: expect.any(String), colore: expect.stringMatching(/^#[0-9a-f]{6}$/) });
    expect(new Set(TIPI_SPILLO.map((t) => DEFINIZIONI_SPILLO[t].colore)).size).toBe(41);
    expect(new Set(TIPI_SPILLO.map((t) => DEFINIZIONI_SPILLO[t].nome)).size).toBe(41);
  });

  it('le quattro categorie coprono ogni tipo una sola volta, e i riferimenti tipici stanno nella categoria', () => {
    const perCategoria = CATEGORIE_SPILLO.flatMap((c) => tipiDellaCategoria(c));
    expect([...perCategoria].sort()).toEqual([...TIPI_SPILLO].sort());
    expect(tipiDellaCategoria('spostamento')).toEqual(['passaggio', 'scala', 'uscita', 'treno', 'rampino', 'scorciatoia', 'velluto', 'mementos', 'ingresso-palazzo', 'infiltrazione']);
    expect(tipiDellaCategoria('consumabile')).toEqual(['dialogo', 'forziere', 'forziere-raro', 'tesoro-palazzo', 'seme-bramosia', 'oggetto', 'oggetto-chiave', 'timbro', 'boss', 'miniboss']);
    // i nemici si rigenerano: informativi, non consumabili (2026-09-30)
    expect(categoriaSpillo('nemico')).toBe('informativo');
    expect(DEFINIZIONI_SPILLO.nemico.collezionabile).toBe(false);
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

  it('«Oggetto» è un consumabile accanto a «Oggetto chiave»; «Punto di infiltrazione» è uno spostamento con destinazione; entrambi sempre visibili', () => {
    expect(DEFINIZIONI_SPILLO.oggetto).toMatchObject({ nome: 'Oggetto', collezionabile: true, riferimento: 'punto' });
    expect(categoriaSpillo('oggetto')).toBe('consumabile');
    expect(DEFINIZIONI_SPILLO.infiltrazione).toMatchObject({ nome: 'Punto di infiltrazione', collezionabile: false, riferimento: 'mappa' });
    expect(categoriaSpillo('infiltrazione')).toBe('spostamento');
    expect(eStrutturale('oggetto')).toBe(true);
    expect(eStrutturale('infiltrazione')).toBe(true);
    // gli oggetti a terra della guida restano come sono (decisione dell'utente: solo il tipo nuovo)
    expect(spilloPerPunto('oggetto')).toBe('oggetto-chiave');
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

describe('lo stato di un pin nella partita (2026-10-03)', () => {
  it('la tabella completa delle parole (scelta dell’utente, 2026-10-03); gli altri tipi non hanno stato', () => {
    const attese: Record<string, string> = {
      dialogo: 'parlato', confidente: 'incontrato', forziere: 'aperto', 'forziere-raro': 'aperto', 'tesoro-palazzo': 'rubato', timbro: 'timbrato',
      'seme-bramosia': 'raccolto', oggetto: 'raccolto', 'oggetto-chiave': 'raccolto', boss: 'sconfitto', miniboss: 'sconfitto',
      meccanismo: 'azionato', 'punto-sensibile': 'gestito', nemico: 'affrontato', porta: 'aperta',
    };
    for (const [t, parola] of Object.entries(attese)) expect(statoDelTipo(t), t).toBe(parola);
    // ogni consumabile ha uno stato
    for (const t of tipiDellaCategoria('consumabile')) expect(statoDelTipo(t), t).not.toBeNull();
    // boss e miniboss restano collezionabili: contano nel completamento come prima; il Confidente resta un pin di città
    expect(DEFINIZIONI_SPILLO.boss.collezionabile).toBe(true);
    expect(categoriaSpillo('confidente')).toBe('citta');
    for (const t of ['nota', 'sicura', 'passaggio', 'rampino', 'negozio', 'tipo-inesistente']) expect(statoDelTipo(t), t).toBeNull();
  });
  it('per un consumabile conta anche il suo «collezionabile» (un elemento della guida senza mappa lo decide da sé); la parola mostrata ha sempre un valore', () => {
    expect(statoDelPin({ tipo: 'forziere', collezionabile: true })).toBe('aperto');
    expect(statoDelPin({ tipo: 'forziere', collezionabile: false })).toBeNull();
    expect(statoDelPin({ tipo: 'meccanismo', collezionabile: false })).toBe('azionato');
    expect(statoDelPin({ tipo: 'confidente', collezionabile: false })).toBe('incontrato');
    expect(statoDelPin({ tipo: 'sicura', collezionabile: false })).toBeNull();
    // una stanza sicura segnata tramite la sua voce della guida resta «raccolto», come prima
    expect(parolaDelloStato({ tipo: 'sicura', collezionabile: false })).toBe('raccolto');
    expect(parolaDelloStato({ tipo: 'porta', collezionabile: false })).toBe('aperta');
  });
  it('togliere il segno: porta e forzieri si richiudono e tornano «chiusa» / «chiuso», gli altri si annullano e tornano «non più …» (scelta dell’utente, 2026-10-03)', () => {
    expect(ritornoDelloStato({ tipo: 'porta', collezionabile: false })).toEqual({ pulsante: 'Richiudi', parola: 'chiusa' });
    expect(ritornoDelloStato({ tipo: 'forziere', collezionabile: true })).toEqual({ pulsante: 'Richiudi', parola: 'chiuso' });
    expect(ritornoDelloStato({ tipo: 'forziere-raro', collezionabile: true })).toEqual({ pulsante: 'Richiudi', parola: 'chiuso' });
    expect(ritornoDelloStato({ tipo: 'meccanismo', collezionabile: false })).toEqual({ pulsante: 'Annulla', parola: 'non più azionato' });
    expect(ritornoDelloStato({ tipo: 'boss', collezionabile: true })).toEqual({ pulsante: 'Annulla', parola: 'non più sconfitto' });
    expect(ritornoDelloStato({ tipo: 'dialogo', collezionabile: true })).toEqual({ pulsante: 'Annulla', parola: 'non più parlato' });
    expect(ritornoDelloStato({ tipo: 'confidente', collezionabile: false })).toEqual({ pulsante: 'Annulla', parola: 'non più incontrato' });
  });
  it('si cita in una condizione un pin con uno stato: il suo tipo o, per un pin senza stato proprio, una voce della guida non descrittiva («ottenuto»)', () => {
    expect(statoCitabile('confidente', null)).toBe('incontrato');
    expect(statoCitabile('dialogo', null)).toBe('parlato');
    expect(statoCitabile('sicura', 'sicura')).toBe('ottenuto');
    expect(statoCitabile('sicura', 'altro')).toBeNull();
    expect(statoCitabile('nota', null)).toBeNull();
  });
});
