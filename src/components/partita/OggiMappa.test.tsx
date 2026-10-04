// @vitest-environment jsdom
// ============================================================
// Test OggiMappa — toccando un Palazzo sulla mappa di Tokyo della Home si scende nella planimetria d'atterraggio, sul suo pin
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OggiMappa } from './OggiMappa';
import { usePartitaStore } from '../../stores/partitaStore';
import type { Oggi } from '../../hooks/useOggi';
import type { DungeonRiassuntoDto, PartitaDto } from '../../types';

const { getDungeons, getQuartieri } = vi.hoisted(() => ({ getDungeons: vi.fn(), getQuartieri: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, { getDungeons, getQuartieri }));

/** Kamoshida con l'atterraggio dato, nella sua finestra. */
const kamoshida = (atterraggio: DungeonRiassuntoDto['atterraggio']) => ({ chiave: 'kamoshida', tipo: 'palazzo', nome: 'Palazzo di Kamoshida', finestra: { dal: '04-11', al: '05-02' }, completato: null, atterraggio }) as DungeonRiassuntoDto;
/** Lo stato condiviso della scheda «Oggi», con la mappa di Tokyo aperta e `apriMappa` spiato. */
const oggi = (apriMappa: Oggi['apriMappa']) => ({ partitaId: 7, mappa: { chiave: 'tokyo', spilloId: null, azione: null, richiesta: 0 }, apriMappa, tornaAllaMappaGlobale: vi.fn() }) as unknown as Oggi;

beforeEach(() => {
  getDungeons.mockReset();
  getQuartieri.mockResolvedValue([]);
  usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova', dataGioco: '04-11' } as PartitaDto });
});
afterEach(() => usePartitaStore.setState({ attiva: null }));

describe('OggiMappa — il Palazzo sulla mappa di Tokyo', () => {
  it('con una regola d’atterraggio scende nella planimetria, centrata sul pin d’arrivo, senza cambiare pagina', async () => {
    getDungeons.mockResolvedValue([kamoshida({ mappa: 'kamoshida/prigione', spillo: 42 })]);
    const apriMappa = vi.fn();
    render(<MemoryRouter><OggiMappa oggi={oggi(apriMappa)} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('link', { name: /Palazzo di Kamoshida/ }));
    expect(apriMappa).toHaveBeenCalledWith('kamoshida/prigione', 42);
  });

  it('senza pin d’arrivo la planimetria si apre intera; senza regola resta il collegamento alla scheda del Palazzo', async () => {
    getDungeons.mockResolvedValue([kamoshida({ mappa: 'kamoshida/ingresso', spillo: null })]);
    const apriMappa = vi.fn();
    const { unmount } = render(<MemoryRouter><OggiMappa oggi={oggi(apriMappa)} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('link', { name: /Palazzo di Kamoshida/ }));
    expect(apriMappa).toHaveBeenCalledWith('kamoshida/ingresso', null);
    unmount();
    getDungeons.mockResolvedValue([kamoshida(null)]);
    const nessuna = vi.fn();
    render(<MemoryRouter><OggiMappa oggi={oggi(nessuna)} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('link', { name: /Palazzo di Kamoshida/ }));
    expect(nessuna).not.toHaveBeenCalled();
  });

  it('cambiato il giorno della partita, i Palazzi si rileggono: l’atterraggio dipende dal giorno', async () => {
    getDungeons.mockResolvedValue([kamoshida({ mappa: 'kamoshida/prigione', spillo: 42 })]);
    render(<MemoryRouter><OggiMappa oggi={oggi(vi.fn())} /></MemoryRouter>);
    await screen.findByRole('link', { name: /Palazzo di Kamoshida/ });
    expect(getDungeons).toHaveBeenCalledTimes(1);
    getDungeons.mockResolvedValue([kamoshida({ mappa: 'kamoshida/sala', spillo: 7 })]);
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova', dataGioco: '04-12' } as PartitaDto });
    await vi.waitFor(() => expect(screen.getByRole('link', { name: /Palazzo di Kamoshida/ })).toHaveAttribute('href', '/guida/mappe/kamoshida%2Fsala?spillo=7'));
    expect(getDungeons).toHaveBeenCalledTimes(2);
  });
});

describe('OggiMappa — una voce chiede la mappa: se è fuori dallo schermo la pagina ci scorre (2026-10-04)', () => {
  /** Lo stato «Oggi» con la mappa e il contatore delle richieste dati. */
  const conMappa = (chiave: string, richiesta: number) => ({ partitaId: 7, mappa: { chiave, spilloId: null, azione: 'v1', richiesta }, apriMappa: vi.fn(), tornaAllaMappaGlobale: vi.fn() }) as unknown as Oggi;
  /** Mette la colonna della mappa alla posizione verticale data e restituisce lo spia di `scrollIntoView`. */
  const posizione = (top: number) => {
    const scorri = vi.fn();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top, bottom: top + 400, left: 0, right: 400, width: 400, height: 400, x: 0, y: top, toJSON: () => ({}) });
    HTMLElement.prototype.scrollIntoView = scorri;
    return scorri;
  };
  afterEach(() => vi.restoreAllMocks());

  it('richiesta nuova con la mappa sotto lo schermo (telefono): scorre; il primo disegno no', () => {
    getDungeons.mockResolvedValue([]);
    const scorri = posizione(window.innerHeight + 300);
    const { rerender } = render(<MemoryRouter><OggiMappa oggi={conMappa('tokyo', 0)} /></MemoryRouter>);
    expect(scorri).not.toHaveBeenCalled();
    rerender(<MemoryRouter><OggiMappa oggi={conMappa('palazzo-sala', 1)} /></MemoryRouter>);
    expect(scorri).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('con la mappa già in vista non si muove niente; senza richiesta nuova nemmeno', () => {
    getDungeons.mockResolvedValue([]);
    const scorri = posizione(100);
    const { rerender } = render(<MemoryRouter><OggiMappa oggi={conMappa('tokyo', 0)} /></MemoryRouter>);
    rerender(<MemoryRouter><OggiMappa oggi={conMappa('palazzo-sala', 1)} /></MemoryRouter>);
    expect(scorri).not.toHaveBeenCalled();
    // fuori schermo, ma è la stessa richiesta (per esempio «Torna a Tokyo» o un passaggio dentro la mappa): niente
    const altrove = posizione(window.innerHeight + 300);
    rerender(<MemoryRouter><OggiMappa oggi={conMappa('tokyo', 1)} /></MemoryRouter>);
    expect(altrove).not.toHaveBeenCalled();
  });
});
