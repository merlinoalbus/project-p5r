// @vitest-environment jsdom
// ============================================================
// Test AtterraggioTokyo — quando il Palazzo compare sulla mappa di Tokyo e dove si atterra toccandolo (2026-10-04)
// ============================================================

import { fireEvent, render, screen, within } from '@testing-library/react';
import { AtterraggioTokyo } from './AtterraggioTokyo';
import { scegliVoce, valoreSelettore, vociSelettore } from '../../../test/selettore';
import type { DungeonDettaglioDto } from '../../types';

const { impostaFinestraDungeon, impostaAtterraggiDungeon, getMappa, notifica } = vi.hoisted(() => ({
  impostaFinestraDungeon: vi.fn(), impostaAtterraggiDungeon: vi.fn(), getMappa: vi.fn(), notifica: vi.fn(),
}));
vi.mock('../../services/api', (vero) => moduloApi(vero, { impostaFinestraDungeon, impostaAtterraggiDungeon, getMappa }));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero, { notifica }));

/** Una planimetria del Palazzo come la dà la scheda. */
const planimetria = (chiave: string, nome: string, ordine: number) => ({ chiave, nome: `Palazzo di Kamoshida › ${nome}`, ordine, aree: [], n: 0, presi: null, spilli: [] });
/** La scheda di Kamoshida: finestra 11 aprile – 2 maggio, due regole (l'11 aprile in prigione sulla cella, poi sempre all'ingresso). */
const scheda = (cambi: Partial<DungeonDettaglioDto> = {}) => ({
  chiave: 'kamoshida', nome: 'Palazzo di Kamoshida', finestra: { dal: '04-11', al: '05-02' },
  planimetrie: [planimetria('k/prigione', 'Prigione', 1), planimetria('k/sala', 'Sala Centrale', 2), planimetria('k/ingresso', 'Ingresso', 3)],
  atterraggi: [
    { dal: '04-11', al: '04-11', mappa: 'k/prigione', mappaNome: 'Palazzo di Kamoshida › Prigione', spillo: 42, spilloNome: 'Cella' },
    { dal: null, al: null, mappa: 'k/ingresso', mappaNome: 'Palazzo di Kamoshida › Ingresso', spillo: null, spilloNome: null },
  ],
  atterraggio: { mappa: 'k/prigione', spillo: 42 },
  ...cambi,
}) as DungeonDettaglioDto;

/** I pin di una planimetria come li dà `getMappa`. */
const mappaConPin = (chiave: string) => ({ chiave, spilli: chiave === 'k/prigione' ? [{ id: 42, nome: 'Cella', tipoNome: 'Nota', x: 10, y: 10 }, { id: 43, nome: 'Armeria', tipoNome: 'Nota', x: 20, y: 20 }] : chiave === 'k/sala' ? [{ id: 7, nome: 'Sala Centrale', tipoNome: 'Passaggio', x: 50, y: 50 }] : [] });

beforeEach(() => {
  impostaFinestraDungeon.mockReset().mockResolvedValue({ dal: '04-11', al: null });
  impostaAtterraggiDungeon.mockReset().mockResolvedValue([]);
  getMappa.mockReset().mockImplementation((k: string) => Promise.resolve(mappaConPin(k)));
  notifica.mockReset();
});

/** Apre la finestra dal pulsante dell'intestazione e la restituisce. */
function apri(d = scheda(), onSalvato = vi.fn().mockResolvedValue(undefined)) {
  render(<AtterraggioTokyo dungeon={d} onSalvato={onSalvato} />);
  fireEvent.click(screen.getByRole('button', { name: /Sulla mappa di Tokyo/ }));
  return { finestra: screen.getByRole('dialog', { name: 'Sulla mappa di Tokyo — Palazzo di Kamoshida' }), onSalvato };
}
/** La regola n (da 1) nell'elenco. */
const regola = (n: number) => screen.getByRole('listitem', { name: `Regola ${n}` });

describe('AtterraggioTokyo', () => {
  it('il pulsante dice la finestra; la finestra mostra le regole salvate, i loro pin e dove si atterra oggi', async () => {
    render(<AtterraggioTokyo dungeon={scheda()} onSalvato={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Sulla mappa di Tokyo/ })).toHaveTextContent('dall’11 aprile al 2 maggio');
    fireEvent.click(screen.getByRole('button', { name: /Sulla mappa di Tokyo/ }));
    expect(screen.getByText(/Oggi si atterra su:/)).toHaveTextContent('Oggi si atterra su: Prigione, sul pin «Cella».');
    expect(valoreSelettore('Quando', regola(1))).toBe('Un giorno');
    expect(valoreSelettore('Planimetria', regola(1))).toBe('Prigione');
    expect(await within(regola(1)).findByRole('combobox', { name: 'Pin d’arrivo' })).toHaveTextContent('Cella');
    expect(valoreSelettore('Quando', regola(2))).toBe('Sempre');
    expect(valoreSelettore('Pin d’arrivo', regola(2))).toBe('— nessuno: la planimetria intera');
    // i pin offerti sono quelli della planimetria della regola, letti una volta per planimetria
    await vi.waitFor(() => expect(vociSelettore('Pin d’arrivo', regola(1))).toEqual(['— nessuno: la planimetria intera', 'Armeria', 'Cella']));
    expect(getMappa.mock.calls.map((c) => c[0]).sort()).toEqual(['k/ingresso', 'k/prigione']);
  });

  it('«Quando compare»: si salva la finestra, anche senza fine, e la pagina si rilegge', async () => {
    const { finestra, onSalvato } = apri();
    const salva = within(finestra).getByRole('button', { name: /Salva quando compare/ });
    expect(salva).toBeDisabled();
    fireEvent.click(within(finestra).getByRole('checkbox', { name: 'Senza fine' }));
    expect(within(finestra).queryByRole('group', { name: 'Compare fino al' })).toBeNull();
    fireEvent.click(salva);
    await vi.waitFor(() => expect(onSalvato).toHaveBeenCalled());
    expect(impostaFinestraDungeon).toHaveBeenCalledWith('kamoshida', '04-11', null);
    expect(notifica).toHaveBeenCalledWith('success', 'Quando compare: salvato.');
  });

  it('una finestra con la fine prima dell’inizio non si salva e lo dice', () => {
    const { finestra } = apri();
    scegliVoce('Compare fino al: mese', 'aprile', within(finestra).getByRole('group', { name: 'Compare fino al' }));
    scegliVoce('Compare fino al: giorno', '10', within(finestra).getByRole('group', { name: 'Compare fino al' }));
    expect(within(finestra).getByRole('alert')).toHaveTextContent('La fine viene prima dell’inizio.');
    expect(within(finestra).getByRole('button', { name: /Salva quando compare/ })).toBeDisabled();
  });

  it('le regole: si aggiunge, si cambia il «quando», la planimetria e il pin, si sposta, si toglie; si salva nell’ordine', async () => {
    const { finestra, onSalvato } = apri();
    const salva = within(finestra).getByRole('button', { name: /Salva le regole/ });
    expect(salva).toBeDisabled();
    fireEvent.click(within(finestra).getByRole('button', { name: /Aggiungi una regola/ }));
    // la nuova regola: sempre, sulla prima planimetria, senza pin
    expect(valoreSelettore('Quando', regola(3))).toBe('Sempre');
    expect(valoreSelettore('Planimetria', regola(3))).toBe('Prigione');
    scegliVoce('Quando', 'Un giorno', regola(3));
    scegliVoce('Regola 3, il giorno: giorno', '12', regola(3));
    scegliVoce('Planimetria', 'Sala Centrale', regola(3));
    await vi.waitFor(() => expect(vociSelettore('Pin d’arrivo', regola(3))).toContain('Sala Centrale'));
    scegliVoce('Pin d’arrivo', /^Sala Centrale/, regola(3));
    // in cima alle regole del giorno, prima della regola «sempre»
    fireEvent.click(within(regola(3)).getByRole('button', { name: 'Sposta su la regola 3' }));
    expect(valoreSelettore('Planimetria', regola(2))).toBe('Sala Centrale');
    // una regola «dal… al…» in fondo, poi tolta
    fireEvent.click(within(finestra).getByRole('button', { name: /Aggiungi una regola/ }));
    scegliVoce('Quando', 'Dal… al…', regola(4));
    expect(within(regola(4)).getByRole('group', { name: 'Regola 4, al' })).toBeInTheDocument();
    fireEvent.click(within(regola(4)).getByRole('button', { name: 'Togli la regola 4' }));
    expect(screen.queryByRole('listitem', { name: 'Regola 4' })).toBeNull();
    fireEvent.click(salva);
    await vi.waitFor(() => expect(onSalvato).toHaveBeenCalled());
    expect(impostaAtterraggiDungeon).toHaveBeenCalledWith('kamoshida', [
      { dal: '04-11', al: '04-11', mappa: 'k/prigione', spillo: 42 },
      { dal: '04-12', al: '04-12', mappa: 'k/sala', spillo: 7 },
      { dal: null, al: null, mappa: 'k/ingresso', spillo: null },
    ]);
    expect(notifica).toHaveBeenCalledWith('success', 'Atterraggio dalla mappa di Tokyo: salvato.');
  });

  it('«da un giorno in poi» si salva senza fine; un intervallo rovesciato blocca il salvataggio; cambiando planimetria il pin si azzera', () => {
    const { finestra } = apri();
    scegliVoce('Quando', 'Da un giorno in poi', regola(2));
    scegliVoce('Planimetria', 'Sala Centrale', regola(1));
    expect(valoreSelettore('Pin d’arrivo', regola(1))).toBe('— nessuno: la planimetria intera');
    scegliVoce('Quando', 'Dal… al…', regola(1));
    scegliVoce('Regola 1, al: giorno', '5', regola(1));
    expect(within(finestra).getByRole('alert')).toHaveTextContent('Nella regola 1 la fine viene prima dell’inizio.');
    expect(within(finestra).getByRole('button', { name: /Salva le regole/ })).toBeDisabled();
    scegliVoce('Regola 1, al: giorno', '20', regola(1));
    expect(within(finestra).queryByRole('alert')).toBeNull();
    fireEvent.click(within(finestra).getByRole('button', { name: /Salva le regole/ }));
    expect(impostaAtterraggiDungeon).toHaveBeenCalledWith('kamoshida', [
      { dal: '04-11', al: '04-20', mappa: 'k/sala', spillo: null },
      { dal: '04-11', al: null, mappa: 'k/ingresso', spillo: null },
    ]);
  });

  it('un errore del server resta notificato e la pagina non si rilegge', async () => {
    impostaAtterraggiDungeon.mockRejectedValue(new Error('regola 1: il pin d\'arrivo non sta su quella planimetria.'));
    const { finestra, onSalvato } = apri();
    fireEvent.click(within(regola(2)).getByRole('button', { name: 'Togli la regola 2' }));
    fireEvent.click(within(finestra).getByRole('button', { name: /Salva le regole/ }));
    await vi.waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'regola 1: il pin d\'arrivo non sta su quella planimetria.'));
    expect(onSalvato).not.toHaveBeenCalled();
  });

  it('la finestra si dice con le preposizioni apostrofate davanti a 8 e 11: «dall’8 aprile all’11 maggio», «dall’11 aprile»', () => {
    const { rerender } = render(<AtterraggioTokyo dungeon={scheda({ finestra: { dal: '04-08', al: '05-11' } })} onSalvato={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Sulla mappa di Tokyo/ })).toHaveTextContent('dall’8 aprile all’11 maggio');
    rerender(<AtterraggioTokyo dungeon={scheda({ finestra: { dal: '04-11', al: null } })} onSalvato={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Sulla mappa di Tokyo/ })).toHaveTextContent(/dall’11 aprile$/);
    rerender(<AtterraggioTokyo dungeon={scheda({ finestra: { dal: '05-09', al: null } })} onSalvato={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Sulla mappa di Tokyo/ })).toHaveTextContent(/dal 9 maggio$/);
  });

  it('senza regole e senza finestra: si atterra sulla scheda, e i Memento (senza planimetrie) non hanno regole', () => {
    apri(scheda({ finestra: null, atterraggi: [], atterraggio: null }));
    expect(screen.getByText('Oggi nessuna regola vale: si apre la scheda del Palazzo.')).toBeInTheDocument();
    expect(screen.getByText('Nessuna regola: toccando il Palazzo si apre la sua scheda.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Senza fine' })).toBeChecked();
    // senza finestra il salvataggio la crea: è già «cambiata»
    expect(screen.getByRole('button', { name: /Salva quando compare/ })).toBeEnabled();
  });

  it('i Memento non hanno planimetrie: niente regole da aggiungere', () => {
    render(<AtterraggioTokyo dungeon={scheda({ chiave: 'mementos', nome: 'Memento', planimetrie: [], atterraggi: [], atterraggio: null })} onSalvato={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Sulla mappa di Tokyo/ }));
    expect(screen.getByText('Questo dungeon non ha planimetrie: toccandolo si apre la sua scheda.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aggiungi una regola/ })).toBeNull();
  });
});
