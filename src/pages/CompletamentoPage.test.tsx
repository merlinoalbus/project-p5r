/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test CompletamentoPage — trofei con filtro e spunta per partita, scheda finali, rimando al Covo
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { scegliVoce } from '../../test/selettore';
import { MemoryRouter } from 'react-router-dom';
import { CompletamentoPage } from './CompletamentoPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { CompletamentoDto, PartitaDto, TrofeoDto } from '../types';

const { getCompletamento, impostaTrofeo } = vi.hoisted(() => ({ getCompletamento: vi.fn(), impostaTrofeo: vi.fn() }));
vi.mock('../services/api', () => ({ getCompletamento, impostaTrofeo }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));

const trofeo = (chiave: string, nome: string, tipo: TrofeoDto['tipo']): TrofeoDto => ({ chiave, nome, nomeEn: null, tipo, descrizione: 'Descrizione', come: 'Come si ottiene', mancabile: null, quando: null, fonte: 'https://www.allgamestaff.it/t', verificato: true, ottenuto: false });
const dati: CompletamentoDto = {
  trofei: [trofeo('assedio', 'Assedio al castello della lussuria', 'bronzo'), trofeo('platino', 'Il ladro fantasma definitivo', 'platino')], ottenuti: 0,
  finali: [{ chiave: 'vero', nome: 'Finale perfetto (Royal)', condizioni: ['Maruki rango 9 entro il 17 novembre'], date: ['17 novembre'], descrizione: 'Terzo semestre.', fonte: 'https://www.allgamestaff.it/f' }],
  covo: { introduzione: 'Il Covo.', medaglie: 'Si guadagnano con le sfide.', sfide: [{ nome: 'Stomaco di ferro', requisito: 'Big Bang Burger', medaglie: null }], premi: [{ nome: 'Concept art', costo: 5, sblocco: null, effetto: null }], fonte: 'https://www.allgamestaff.it/c' },
  dlc: [{ nome: 'Battle Bundle', contenuto: 'Set di supporto', note: null, fonte: 'https://www.allgamestaff.it/d' }],
  meteo: [{ condizione: 'Pioggia', effetti: ['Più Ombre sciagura'], fonte: 'https://www.allgamestaff.it/m' }],
  nuovaPartitaPlus: { trasferito: ['Denaro'], nonTrasferito: ['Livello'], note: '', fonte: 'https://www.allgamestaff.it/n' },
  differenzeRoyal: ['Kasumi'],
  tempo: { fasce: ['Mattina'], regole: ['Regola'], fonte: 'https://www.allgamestaff.it/t' },
};

describe('CompletamentoPage', () => {
  it('mostra i trofei, filtra per tipo, segna un trofeo ottenuto e cambia scheda', async () => {
    usePartitaStore.setState({ attiva: { id: 2, nome: 'Prova' } as PartitaDto });
    getCompletamento.mockResolvedValue(dati);
    impostaTrofeo.mockResolvedValue({ ...dati.trofei[0], ottenuto: true });
    render(<MemoryRouter><CompletamentoPage /></MemoryRouter>);
    expect(await screen.findByText('Assedio al castello della lussuria')).toBeInTheDocument();
    expect(getCompletamento).toHaveBeenCalledWith(2);
    scegliVoce('Tipo di trofeo', 'Platino');
    expect(screen.queryByText('Assedio al castello della lussuria')).toBeNull();
    expect(screen.getByText('Il ladro fantasma definitivo')).toBeInTheDocument();
    scegliVoce('Tipo di trofeo', 'Tutti i tipi');
    await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: 'Trofeo Assedio al castello della lussuria ottenuto' })); });
    expect(impostaTrofeo).toHaveBeenCalledWith(2, 'assedio', true);
    expect(await screen.findByText(/1 trofei ottenuti/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Finali' }));
    expect(screen.getByText('Maruki rango 9 entro il 17 novembre')).toBeInTheDocument();
    // Il Covo non è più una linguetta di questa pagina: ha la sua, `/guida/covo`. Qui resta solo
    // il rimando, e la prova serve a garantire che chi lo cercava dov'era non trovi il vuoto.
    expect(screen.queryByRole('tab', { name: 'Covo dei Ladri' })).toBeNull();
    expect(screen.queryByText('Stomaco di ferro')).toBeNull();
    expect(screen.getByRole('link', { name: /Covo dei Ladri/ })).toHaveAttribute('href', '/guida/covo');
  });
});
