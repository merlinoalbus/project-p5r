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
const oggi = (apriMappa: Oggi['apriMappa']) => ({ partitaId: 7, mappa: { chiave: 'tokyo', spilloId: null, azione: null }, apriMappa, tornaAllaMappaGlobale: vi.fn() }) as unknown as Oggi;

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
