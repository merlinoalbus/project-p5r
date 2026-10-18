// ============================================================
// Test dettagliVoce — dai dettagli alle righe dell'editor e ritorno (2026-10-18)
// ============================================================

import { dettagliDaRighe, etichettaDettaglio, etichetteRipetute, righeDaDettagli } from './dettagliVoce';

const dettagli = { maschera: 'Pixie', contenuto: 'Potenziare Ryuji', hp: 120, debolezze: ['Fuoco', 'Vento'], resisteA: [], attacchi_pericolosi: ['Agi'], tabella: [{ ombra: 'Pixie' }] };

it('le etichette si leggono: camelCase e trattini bassi diventano parole', () => {
  expect(etichettaDettaglio('resisteA')).toBe('resiste a');
  expect(etichettaDettaglio('attacchi_pericolosi')).toBe('attacchi pericolosi');
});

it('righe senza la maschera; senza modifiche si torna agli stessi dettagli, elenchi vuoti compresi', () => {
  const righe = righeDaDettagli(dettagli);
  expect(righe.map((r) => [r.etichetta, r.forma, r.testo])).toEqual([
    ['contenuto', 'testo', 'Potenziare Ryuji'], ['hp', 'numero', '120'], ['debolezze', 'elenco', 'Fuoco, Vento'],
    ['resiste a', 'elenco', ''], ['attacchi pericolosi', 'elenco', 'Agi'], ['tabella', 'tabella', ''],
  ]);
  const { maschera: _m, ...attesi } = dettagli;
  void _m;
  expect(dettagliDaRighe(righe)).toEqual(attesi);
});

it('le righe non toccate tornano identiche: elenco di numeri, elemento con la virgola, valore d\'altra forma', () => {
  const d = { livelli: [3, 5], frasi: ['Fuoco, se serve', 'Vento'], strano: { a: 1 }, vuoto: null };
  const righe = righeDaDettagli(d);
  expect(righe.map((r) => r.forma)).toEqual(['elenco', 'elenco', 'altro', 'altro']);
  expect(dettagliDaRighe(righe)).toEqual(d);
  // corretto, un elenco di numeri resta di numeri
  righe[0].testo = '3, 7';
  expect(dettagliDaRighe(righe).livelli).toEqual([3, 7]);
});

it('le etichette ripetute si riconoscono, senza badare alle maiuscole', () => {
  expect(etichetteRipetute([{ chiave: 'a', etichetta: 'Note', testo: 'x', forma: 'testo' }, { chiave: '', etichetta: 'note ', testo: 'y', forma: 'testo' }])).toEqual(['note']);
});

it('un\'etichetta cambiata diventa la chiave; testo vuoto toglie la riga; un numero non numerico resta testo', () => {
  const righe = righeDaDettagli({ contenuto: 'x', hp: 3, note: 'y' });
  righe[0].etichetta = 'strategia';
  righe[1].testo = 'molti';
  righe[2].testo = '  ';
  expect(dettagliDaRighe([...righe, { chiave: '', etichetta: 'Nuovo', testo: 'valore', forma: 'testo' }])).toEqual({ strategia: 'x', hp: 'molti', Nuovo: 'valore' });
});
