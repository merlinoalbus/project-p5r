// @vitest-environment jsdom
// ============================================================
// Test CompendioPage — piastrelle di default, vista elenco ricordata per dispositivo, filtri
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompendioPage } from './CompendioPage';
import { usePreferenzeStore } from '../stores/preferenzeStore';
import type { PersonaRiassuntoDto } from '../types';

const { getPersone, getImmagini } = vi.hoisted(() => ({ getPersone: vi.fn(), getImmagini: vi.fn() }));
vi.mock('../services/api', () => ({
  getPersone,
  getImmagini,
  caricaImmagine: vi.fn(),
  eliminaImmagine: vi.fn(),
  importaImmagineDaUrl: vi.fn(),
  urlImmagine: (ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file`,
}));

const persona = (id: number, nome: string, livello: number, extra: Partial<PersonaRiassuntoDto> = {}): PersonaRiassuntoDto => ({
  id, nome, nomeIt: nome, arcana: 'Fool', arcanaNome: 'Matto', livello, eredita: null, ereditaNome: null, speciale: false, rara: false, dlc: false, richiedeConfidenteMax: false, tratto: '',
  statistiche: { forza: 2, magia: 2, resistenza: 2, agilita: 3, fortuna: 1 }, affinita: [], ...extra,
});

beforeEach(() => {
  getPersone.mockReset();
  getImmagini.mockReset();
  getImmagini.mockResolvedValue([]);
  usePreferenzeStore.setState({ graficaPredefinita: true, vistaPersona: 'piastrelle' });
});

describe('CompendioPage', () => {
  it('mostra le Persona a piastrelle con livello e badge; il passaggio all\'elenco viene ricordato', async () => {
    getPersone.mockResolvedValue([persona(1, 'Arsène', 1), persona(2, 'Pixie', 2, { dlc: true }), persona(3, 'Regent', 10, { rara: true })]);
    render(<MemoryRouter><CompendioPage /></MemoryRouter>);
    const arsene = await screen.findByRole('link', { name: 'Arsène, Matto, livello 1' });
    expect(arsene).toHaveAttribute('href', '/compendio/persona/1');
    expect(screen.getByRole('button', { name: 'Piastrelle' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('DLC')).toHaveLength(2); // filtro + badge testuale (asset assente)
    expect(screen.getByText('Tesoro')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Elenco' }));
    expect(usePreferenzeStore.getState().vistaPersona).toBe('elenco');
    expect(screen.getByRole('button', { name: 'Elenco' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: /Regent/ })).toHaveAttribute('href', '/compendio/persona/3');
    expect(screen.queryByRole('link', { name: 'Arsène, Matto, livello 1' })).not.toBeInTheDocument();
  });

  it('filtra per testo e per livello massimo', async () => {
    getPersone.mockResolvedValue([persona(1, 'Arsène', 1), persona(2, 'Pixie', 2), persona(3, 'Regent', 10)]);
    render(<MemoryRouter><CompendioPage /></MemoryRouter>);
    await screen.findByRole('link', { name: 'Arsène, Matto, livello 1' });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pix' } });
    expect(screen.getByRole('link', { name: 'Pixie, Matto, livello 2' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Arsène, Matto, livello 1' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Livello massimo'), { target: { value: '5' } });
    expect(screen.queryByRole('link', { name: 'Regent, Matto, livello 10' })).not.toBeInTheDocument();
    expect(screen.getByText('2 di 3 Persona')).toBeInTheDocument();
  });
});
