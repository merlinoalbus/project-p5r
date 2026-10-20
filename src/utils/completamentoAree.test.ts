// ============================================================
// Test completamentoAree — un'area è completata quando tutte le sue voci da segnare sono Ottenute o Esaurite
// ============================================================

import { areeCompletate, completamentoArea, tutteCompletate } from './completamentoAree';
import type { PuntoInteresseDto } from '../types';

/** Una voce della guida del tipo e con lo stato dati (il resto dei campi non conta per la regola). */
const voce = (tipo: PuntoInteresseDto['tipo'], stato: PuntoInteresseDto['stato'], chiave = `${tipo}-${String(stato)}`): PuntoInteresseDto => ({
  chiave, ordine: 0, tipo, nome: chiave, descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato, marcatore: null, pin: [], contenitore: null, areaDedalo: null, persona: null, areeDedalo: [],
});

describe('completamentoArea', () => {
  it('senza voci da segnare un\'area non è completata: un\'area vuota, o fatta solo di note descrittive', () => {
    expect(completamentoArea({ punti: [] })).toEqual({ daSegnare: 0, segnate: 0, completata: false });
    expect(completamentoArea({ punti: [voce('altro', null)] })).toEqual({ daSegnare: 0, segnate: 0, completata: false });
  });

  it('con una voce ancora da fare non è completata', () => {
    expect(completamentoArea({ punti: [voce('forziere', 'ottenuto', 'a'), voce('sicura', null, 'b')] })).toEqual({ daSegnare: 2, segnate: 1, completata: false });
  });

  it('è completata quando ogni voce da segnare è Ottenuta o Esaurita; le descrittive non contano', () => {
    const punti = [voce('forziere', 'ottenuto', 'a'), voce('volonta', 'esaurito', 'b'), voce('altro', null, 'c')];
    expect(completamentoArea({ punti })).toEqual({ daSegnare: 2, segnate: 2, completata: true });
  });

  it('un Enigma conta con il suo stato, che il server allinea ai passi: Enigma aperto con passi fatti è ancora da fare', () => {
    const enigma = voce('puzzle', null, 'enigma');
    const passo = { ...voce('meccanismo', 'ottenuto', 'passo'), contenitore: 'enigma' };
    expect(completamentoArea({ punti: [enigma, passo] }).completata).toBe(false);
    expect(completamentoArea({ punti: [{ ...enigma, stato: 'ottenuto' }, passo] }).completata).toBe(true);
  });

  it('senza partita le voci non hanno stato: nessuna area è completata', () => {
    expect(completamentoArea({ punti: [voce('forziere', null, 'a'), voce('boss', null, 'b')] }).completata).toBe(false);
  });

  // L4 (§1.5, segnalazione D): con i numeri del server (oggetti permanenti) non si ricalcola a modo proprio
  it('L4: con `completamento` del server vale il suo «completata», anche se le voci direbbero altro', () => {
    // un rigenerabile non segnato non toglie il completamento (non conta); un permanente fatto dal suo oggetto in un'altra infiltrazione sì
    const punti = [voce('forziere', 'ottenuto', 'a'), voce('oggetto', null, 'b')];
    expect(completamentoArea({ punti, completamento: { oggetti: 1, fatti: 1, completata: true } }).completata).toBe(true);
    expect(completamentoArea({ punti: [voce('forziere', 'ottenuto', 'a')], completamento: { oggetti: 2, fatti: 1, completata: false } }).completata).toBe(false);
    // senza partita il server dice null: non completata
    expect(completamentoArea({ punti, completamento: { oggetti: 1, fatti: null, completata: null } }).completata).toBe(false);
    expect(areeCompletate([{ chiave: 'k', punti, completamento: { oggetti: 1, fatti: 1, completata: true } }])).toEqual(new Set(['k']));
  });
});

describe('areeCompletate e tutteCompletate', () => {
  const aree = [
    { chiave: 'piena', punti: [voce('forziere', 'ottenuto')] },
    { chiave: 'aperta', punti: [voce('forziere', null)] },
    { chiave: 'vuota', punti: [] },
  ];

  it('raccoglie le chiavi delle sole aree completate', () => {
    expect([...areeCompletate(aree)]).toEqual(['piena']);
  });

  it('una stanza è completa se ha aree e sono tutte completate', () => {
    const fatte = areeCompletate(aree);
    expect(tutteCompletate(['piena'], fatte)).toBe(true);
    expect(tutteCompletate(['piena', 'aperta'], fatte)).toBe(false);
    expect(tutteCompletate([], fatte)).toBe(false);
  });
});
