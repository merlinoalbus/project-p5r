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
    })).toBe('Fascino ♪♪♪ · 5 punti · Zorro, il fuorilegge 1 → 2 (Gentilezza +7 punti) · 31 già a 2 · Fioraio Rafflesia: turno 1 (Gentilezza ♪♪ · 3 punti) · Ryuji Sakamoto +10 punti');
  });

  it('l\'incontro con un Confidente: la Dote che ha dato, o «già contato»', () => {
    const incontro = { id: 1, marcato: null, confidente: 'takemi', nome: 'Tae Takemi', verso: 2, passaggio: true, giaContato: false, doti: [{ chiave: 'coraggio', nome: 'Coraggio', delta: 2, note: 1 }] };
    expect(descriviEffetti({ doti: [], confidente: null, incontro })).toBe('Incontro con Tae Takemi: Coraggio ♪ · 2 punti');
    expect(descriviEffetti({ doti: [], confidente: null, incontro: { ...incontro, id: null, giaContato: true, doti: [] } })).toBe('Incontro con Tae Takemi già contato');
  });

  it('senza letture né turni resta com\'era', () => {
    expect(descriviEffetti({ doti: [{ chiave: 'perizia', nome: 'Perizia', delta: 2, note: 1 }], confidente: null })).toBe('Perizia ♪ · 2 punti');
    // senza note conosciute i punti hanno la parola e il segno: mai un «+N» nudo, che si legge come note
    expect(descriviEffetti({ doti: [{ chiave: 'perizia', nome: 'Perizia', delta: 3 }], confidente: null })).toBe('Perizia +3 punti');
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

  // ---- L3 (2026-10-20, §4.4): «Entra» apre l'infiltrazione giusta ----
  const opzioni = [{ chiave: 'k-1', nome: 'Primo giorno', ordine: 0 }, { chiave: 'k-2', nome: 'Secondo giorno', ordine: 1 }];
  it('con le infiltrazioni della voce apre quella che il server indica (la prima non completata), anche se c’è l’atterraggio', () => {
    expect(collegamentoAzione({ ...palazzo({ mappa: 'kamoshida/prigione', spillo: 42 }), infiltrazioni: [{ chiave: 'k-1', nome: 'Primo giorno' }, { chiave: 'k-2', nome: 'Secondo giorno' }], infiltrazioneDaAprire: 'k-2', infiltrazioniDelPalazzo: opzioni }))
      .toEqual({ href: '/guida/dungeon/kamoshida?infiltrazione=k-2', etichetta: 'Palazzo di Kamoshida' });
    // senza indicazione del server (nessuna partita): l'ultima dell'insieme
    expect(collegamentoAzione({ ...palazzo(null), infiltrazioni: [{ chiave: 'k-1', nome: 'Primo giorno' }, { chiave: 'k-2', nome: 'Secondo giorno' }], infiltrazioniDelPalazzo: opzioni })?.href).toBe('/guida/dungeon/kamoshida?infiltrazione=k-2');
  });
  it('una voce di Palazzo senza infiltrazioni né atterraggio apre la prima non completata del Palazzo; i Memento restano com’erano', () => {
    expect(collegamentoAzione({ ...palazzo(null), infiltrazioni: [], infiltrazioniDelPalazzo: opzioni })?.href).toBe('/guida/dungeon/kamoshida?infiltrazione=in-corso');
    expect(collegamentoAzione({ ...palazzo({ mappa: 'kamoshida/sala', spillo: null }), infiltrazioni: [], infiltrazioniDelPalazzo: opzioni })?.href).toBe('/guida/mappe/kamoshida%2Fsala');
    expect(collegamentoAzione({ tipo: 'palazzo', riferimento: { tipo: 'dungeon', chiave: 'mementos' }, riferimentoTesto: 'Memento', atterraggio: null })?.href).toBe('/guida/dungeon/mementos');
  });
  // UX3-1 (decisione del PM del 2026-10-20, §4.4): insieme vuoto con una proposta → la prima della proposta, con `daVoce`
  it('insieme vuoto con una proposta: apre la prima infiltrazione della proposta (o quella del server) con daVoce, qualunque sia la certezza', () => {
    const proposta = { infiltrazioni: [{ chiave: 'k-2', nome: 'Secondo giorno' }, { chiave: 'k-1', nome: 'Primo giorno' }], motivo: 'la voce descrive più infiltrazioni', certezza: 'multipla' as const };
    expect(collegamentoAzione({ ...palazzo(null), uid: 'v-9', infiltrazioni: [], infiltrazioniDelPalazzo: opzioni, propostaInfiltrazioni: proposta })?.href).toBe('/guida/dungeon/kamoshida?infiltrazione=k-2&daVoce=v-9');
    expect(collegamentoAzione({ ...palazzo(null), uid: 'v-9', infiltrazioni: [], infiltrazioniDelPalazzo: opzioni, propostaInfiltrazioni: { ...proposta, certezza: 'certa' }, infiltrazioneDaAprire: 'k-1' })?.href).toBe('/guida/dungeon/kamoshida?infiltrazione=k-1&daVoce=v-9');
    // con una regola d'atterraggio vale l'atterraggio (§4.1), con l'insieme valorizzato l'insieme
    expect(collegamentoAzione({ ...palazzo({ mappa: 'kamoshida/sala', spillo: null }), uid: 'v-9', infiltrazioni: [], infiltrazioniDelPalazzo: opzioni, propostaInfiltrazioni: proposta })?.href).toBe('/guida/mappe/kamoshida%2Fsala');
    expect(collegamentoAzione({ ...palazzo(null), uid: 'v-9', infiltrazioni: [{ chiave: 'k-1', nome: 'Primo giorno' }], infiltrazioniDelPalazzo: opzioni, propostaInfiltrazioni: proposta })?.href).toBe('/guida/dungeon/kamoshida?infiltrazione=k-1');
  });
});
