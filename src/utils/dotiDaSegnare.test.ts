// ============================================================
// Test dotiDaSegnare — il promemoria delle Doti che il gioco dà, sommato per Dote
// ============================================================

import { dotiDaSegnareDaEffetti, promemoriaDoti, testoDotiDaSegnare } from './dotiDaSegnare';
import { avvisoSpunta } from './percorso';
import type { EffettiAzioneDto } from '../types';

const effetti: EffettiAzioneDto = {
  doti: [{ chiave: 'coraggio', nome: 'Coraggio', delta: 2, note: 1 }],
  confidente: { chiave: 'takemi', nome: 'Tae Takemi', noteRisposta: 2, punti: 10, bonusArcano: false },
  letture: [{ categoria: 'libro', chiave: 'zorro', nome: 'Zorro', prima: 1, dopo: 2, doti: [{ chiave: 'gentilezza', nome: 'Gentilezza', delta: 7 }] }],
  turni: [{ attivita: 'rafflesia', nome: 'Fioraio', ordine: 1, doti: [{ chiave: 'gentilezza', nome: 'Gentilezza', delta: 3, note: 2 }] }],
  incontro: { confidente: 'takemi', nome: 'Tae Takemi', verso: 2, passaggio: true, id: 1, marcato: null, giaContato: false, doti: [{ chiave: 'coraggio', nome: 'Coraggio', delta: 2, note: 1 }] },
};

it('somma le Doti dell’azione, delle letture, dei turni e dell’incontro', () => {
  expect(dotiDaSegnareDaEffetti(effetti)).toEqual([{ chiave: 'coraggio', nome: 'Coraggio', delta: 4 }, { chiave: 'gentilezza', nome: 'Gentilezza', delta: 10 }]);
  // un incontro già contato non dà niente di nuovo
  expect(dotiDaSegnareDaEffetti({ ...effetti, doti: [], letture: [], turni: [], incontro: { ...effetti.incontro!, giaContato: true } })).toEqual([]);
  expect(dotiDaSegnareDaEffetti(null)).toEqual([]);
});

it('il testo e il promemoria, anche in negativo', () => {
  expect(testoDotiDaSegnare([{ chiave: 'fascino', nome: 'Fascino', delta: 3 }, { chiave: 'perizia', nome: 'Perizia', delta: -5 }])).toBe('Fascino +3, Perizia −5');
  expect(promemoriaDoti([{ chiave: 'fascino', nome: 'Fascino', delta: 3 }])).toBe('Da segnare nelle Doti: Fascino +3');
  expect(promemoriaDoti([])).toBeNull();
  expect(promemoriaDoti(undefined)).toBeNull();
});

it('l’avviso della spunta: che cosa è successo, poi le Doti da segnare', () => {
  expect(avvisoSpunta(effetti)).toBe('Zorro 1 → 2 · Fioraio: turno 1 · Incontro con Tae Takemi · Tae Takemi +10 punti · Da segnare nelle Doti: Coraggio +4, Gentilezza +10');
  expect(avvisoSpunta({ doti: [], confidente: null })).toBe('Segnata come fatta.');
});
