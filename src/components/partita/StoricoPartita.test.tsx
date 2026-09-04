/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test StoricoPartita — elenco, filtri per gruppo, «Carica altri», eliminazione, modalità compatta
// ============================================================

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StoricoPartita } from './StoricoPartita';
import type { EventoPartitaDto, StoricoDto } from '../../types';

const { getStorico, eliminaEvento, eliminaEventi } = vi.hoisted(() => ({ getStorico: vi.fn(), eliminaEvento: vi.fn(), eliminaEventi: vi.fn()}));
vi.mock('../../services/api', () => ({ getStorico, eliminaEvento, eliminaEventi}));
vi.mock('../../stores/notificationStore', () => ({ notifica: vi.fn() }));

function ev(id: number, tipo: string, titolo: string, extra: Partial<EventoPartitaDto> = {}): EventoPartitaDto {
  return { id, tipo, tipoNome: tipo, gruppo: 'persona', titolo, dettaglio: '', dati: {}, personaId: null, personaNome: null, personaNomeIt: null, createdAt: '2026-09-03T10:00:00.000Z', ...extra };
}

describe('StoricoPartita', () => {
  beforeEach(() => { getStorico.mockReset(); eliminaEvento.mockReset(); });

  it('elenca gli eventi, filtra per gruppo, carica la pagina successiva ed elimina una voce', async () => {
    const pagina1: StoricoDto = { eventi: [ev(10, 'persona-aggiunta', 'Pixie aggiunta', { personaId: 2, personaNomeIt: 'Pixie', dettaglio: 'Livello 2.' }), ev(9, 'allarme', 'Allarme attivo')], prossimo: 9, totale: 3 };
    const pagina2: StoricoDto = { eventi: [ev(1, 'partita-creata', 'Partita creata')], prossimo: null, totale: 3 };
    getStorico.mockResolvedValueOnce(pagina1).mockResolvedValueOnce(pagina2);
    render(<MemoryRouter><StoricoPartita partitaId={7} perPagina={2} /></MemoryRouter>);
    expect(await screen.findByText('Pixie aggiunta')).toBeInTheDocument();
    expect(getStorico).toHaveBeenCalledWith(7, { limite: 2, prima: undefined, tipi: undefined });
    expect(screen.getByText('3 eventi')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pixie' })).toHaveAttribute('href', '/compendio/persona/2');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Carica altri' })); });
    expect(getStorico).toHaveBeenLastCalledWith(7, { limite: 2, prima: 9, tipi: undefined });
    expect(await screen.findByText('Partita creata')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Eventi della partita' }).querySelectorAll('li')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Carica altri' })).toBeNull();
    // filtro per gruppo → nuova richiesta con i tipi del gruppo
    getStorico.mockResolvedValueOnce({ eventi: [ev(9, 'allarme', 'Allarme attivo')], prossimo: null, totale: 1 });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Stanza di Velluto' })); });
    await waitFor(() => expect(getStorico).toHaveBeenLastCalledWith(7, { limite: 2, prima: undefined, tipi: expect.arrayContaining(['allarme', 'fusione-eseguita', 'forca', 'isolamento']) }));
    expect(await screen.findByText('1 evento')).toBeInTheDocument();
    // eliminazione con conferma
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    eliminaEvento.mockResolvedValue(undefined);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Elimina la voce Allarme attivo' })); });
    expect(eliminaEvento).toHaveBeenCalledWith(7, 9);
    expect(screen.queryByText('Allarme attivo')).toBeNull();
  });

  it('in modalità compatta mostra solo le voci, senza filtri né eliminazione', async () => {
    getStorico.mockResolvedValue({ eventi: [ev(3, 'persona-livello', 'Arsène al livello 5')], prossimo: 3, totale: 12 });
    render(<MemoryRouter><StoricoPartita partitaId={7} perPagina={5} compatto /></MemoryRouter>);
    expect(await screen.findByText('Arsène al livello 5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tutti' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Elimina/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Carica altri' })).toBeNull();
  });

  it('senza eventi mostra lo stato vuoto', async () => {
    getStorico.mockResolvedValue({ eventi: [], prossimo: null, totale: 0 });
    render(<MemoryRouter><StoricoPartita partitaId={7} /></MemoryRouter>);
    expect(await screen.findByText('Nessun evento')).toBeInTheDocument();
  });

  it('seleziona più voci e le elimina insieme', async () => {
    const evento = (id: number, titolo: string) => ({ id, tipo: 'partita-livello', tipoNome: 'Livello', gruppo: 'partita' as const, titolo, dettaglio: '', dati: {}, personaId: null, personaNome: null, personaNomeIt: null, createdAt: '2026-09-04T10:00:00.000Z' });
    getStorico.mockResolvedValue({ eventi: [evento(1, 'Livello 2'), evento(2, 'Livello 3'), evento(3, 'Livello 4')], totale: 3, prossimo: null });
    eliminaEventi.mockResolvedValue({ eliminati: 2 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<MemoryRouter><StoricoPartita partitaId={7} perPagina={10} /></MemoryRouter>);
    await screen.findByText('Livello 2');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleziona la voce Livello 2' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleziona la voce Livello 4' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Elimina selezionate (2)' })); });
    expect(eliminaEventi).toHaveBeenCalledWith(7, [1, 3]);
    expect(screen.queryByText('Livello 2')).not.toBeInTheDocument();
    expect(screen.getByText('Livello 3')).toBeInTheDocument();
    expect(screen.getByText('1 evento')).toBeInTheDocument();
  });
});
