// ============================================================
// Test percorso — descriviEffetti: la riga degli effetti di un'azione (Doti, letture, turni, Confidente, incontri); collegamentoAzione
// ============================================================

import { describe, expect, it } from 'vitest';
import { collegamentoAzione, descriviEffetti } from './percorso';

describe('descriviEffetti', () => {
  it('descrive Doti, letture portate avanti, turni e punti del Confidente', () => {
    expect(descriviEffetti({
      doti: [{ chiave: 'fascino', nome: 'Fascino', delta: 5, note: 3, cinema: false }],
      confidente: { chiave: 'ryuji', nome: 'Ryuji Sakamoto', noteRisposta: 2, punti: 10, bonusArcano: false },
      letture: [
        { categoria: 'libro', chiave: 'zorro-il-fuorilegge', nome: 'Zorro, il fuorilegge', prima: 1, dopo: 2, doti: [{ chiave: 'gentilezza', nome: 'Gentilezza', delta: 7 }] },
        { categoria: 'film', chiave: 'dvd-31', nome: '31', prima: 2, dopo: 2 },
      ],
      turni: [{ attivita: 'lavoro-rafflesia', nome: 'Fioraio Rafflesia', ordine: 1, doti: [{ chiave: 'gentilezza', nome: 'Gentilezza', delta: 3, note: 2 }] }],
    })).toBe('Fascino +5 (♪♪♪) · Zorro, il fuorilegge 1 → 2 (Gentilezza +7) · 31 già a 2 · Fioraio Rafflesia: turno 1 (Gentilezza +3) · Ryuji Sakamoto +10 punti');
  });

  it('l\'incontro con un Confidente: la Dote che ha dato, o «già contato»', () => {
    const incontro = { id: 1, marcato: null, confidente: 'takemi', nome: 'Tae Takemi', verso: 2, passaggio: true, giaContato: false, doti: [{ chiave: 'coraggio', nome: 'Coraggio', delta: 2, note: 1 }] };
    expect(descriviEffetti({ doti: [], confidente: null, incontro })).toBe('Incontro con Tae Takemi: Coraggio +2');
    expect(descriviEffetti({ doti: [], confidente: null, incontro: { ...incontro, id: null, giaContato: true, doti: [] } })).toBe('Incontro con Tae Takemi già contato');
  });

  it('senza letture né turni resta com\'era', () => {
    expect(descriviEffetti({ doti: [{ chiave: 'perizia', nome: 'Perizia', delta: 2, note: 1 }], confidente: null })).toBe('Perizia +2 (♪)');
  });
});

describe('collegamentoAzione — il Palazzo con le regole d’atterraggio (2026-10-04)', () => {
  /** Una voce collegata al Palazzo di Kamoshida, con l'atterraggio dato. */
  const palazzo = (atterraggio?: { mappa: string; spillo: number | null } | null) => ({ tipo: 'palazzo' as const, riferimento: { tipo: 'dungeon' as const, chiave: 'kamoshida' }, riferimentoTesto: 'Palazzo di Kamoshida', atterraggio });

  it('con una regola per il giorno della voce porta alla planimetria, centrata sul pin d’arrivo se c’è', () => {
    expect(collegamentoAzione(palazzo({ mappa: 'kamoshida/prigione', spillo: 42 }))).toEqual({ href: '/guida/mappe/kamoshida%2Fprigione?spillo=42', etichetta: 'Palazzo di Kamoshida', atterraggio: { chiave: 'kamoshida/prigione', spilloId: 42 } });
    expect(collegamentoAzione(palazzo({ mappa: 'kamoshida/sala', spillo: null }))).toEqual({ href: '/guida/mappe/kamoshida%2Fsala', etichetta: 'Palazzo di Kamoshida', atterraggio: { chiave: 'kamoshida/sala', spilloId: null } });
  });

  it('senza regola, o senza il campo, resta la scheda del Palazzo', () => {
    expect(collegamentoAzione(palazzo(null))).toEqual({ href: '/guida/dungeon/kamoshida', etichetta: 'Palazzo di Kamoshida' });
    expect(collegamentoAzione(palazzo())).toEqual({ href: '/guida/dungeon/kamoshida', etichetta: 'Palazzo di Kamoshida' });
  });
});
