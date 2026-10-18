// ============================================================
// Test dettagliVoce — dai dettagli alle righe dell'editor e ritorno (2026-10-18)
// ============================================================

import { dettagliDaRighe, etichettaDettaglio, righeDaDettagli } from './dettagliVoce';

const dettagli = { maschera: 'Pixie', contenuto: 'Potenziare Ryuji', hp: 120, debolezze: ['Fuoco', 'Vento'], resisteA: [], attacchi_pericolosi: ['Agi'], tabella: [{ ombra: 'Pixie' }] };

it('le etichette si leggono: camelCase e trattini bassi diventano parole', () => {
  expect(etichettaDettaglio('resisteA')).toBe('resiste a');
  expect(etichettaDettaglio('attacchi_pericolosi')).toBe('attacchi pericolosi');
});

it('righe senza la maschera; senza modifiche si torna agli stessi dettagli (gli elenchi vuoti cadono)', () => {
  const righe = righeDaDettagli(dettagli);
  expect(righe.map((r) => [r.etichetta, r.forma, r.testo])).toEqual([
    ['contenuto', 'testo', 'Potenziare Ryuji'], ['hp', 'numero', '120'], ['debolezze', 'elenco', 'Fuoco, Vento'],
    ['resiste a', 'elenco', ''], ['attacchi pericolosi', 'elenco', 'Agi'], ['tabella', 'tabella', ''],
  ]);
  const { maschera: _m, resisteA: _r, ...attesi } = dettagli;
  void _m; void _r;
  expect(dettagliDaRighe(righe)).toEqual(attesi);
});

it('un\'etichetta cambiata diventa la chiave; testo vuoto toglie la riga; un numero non numerico resta testo', () => {
  const righe = righeDaDettagli({ contenuto: 'x', hp: 3, note: 'y' });
  righe[0].etichetta = 'strategia';
  righe[1].testo = 'molti';
  righe[2].testo = '  ';
  expect(dettagliDaRighe([...righe, { chiave: '', etichetta: 'Nuovo', testo: 'valore', forma: 'testo' }])).toEqual({ strategia: 'x', hp: 'molti', Nuovo: 'valore' });
});
