// @vitest-environment jsdom
// ============================================================
// Test CompendioPage — piastrelle di default, vista elenco ricordata, filtri nell'URL (livello min/max, verso, affinità, immagine), ritorno alla Persona vista
// ============================================================

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompendioPage } from './CompendioPage';
import { usePreferenzeStore } from '../stores/preferenzeStore';
import { ricordaUltimaPersona } from '../utils/ultimaPersona';
import { azzeraCacheImmagini } from '../components/shared/immaginiCache';
import type { AffinitaDto, PersonaRiassuntoDto } from '../types';

const { getPersone, getImmagini } = vi.hoisted(() => ({ getPersone: vi.fn(), getImmagini: vi.fn() }));
vi.mock('../services/api', () => ({
  getPersone,
  getImmagini,
  caricaImmagine: vi.fn(),
  eliminaImmagine: vi.fn(),
  importaImmagineDaUrl: vi.fn(),
  urlImmagine: (ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file`,
}));

const aff = (elemento: string, codice: string): AffinitaDto => ({ elemento, elementoNome: elemento, elementoSigla: elemento.slice(0, 3), codice, codiceNome: codice, codiceSigla: codice });
const persona = (id: number, nome: string, livello: number, extra: Partial<PersonaRiassuntoDto> = {}): PersonaRiassuntoDto => ({
  id, nome, nomeIt: nome, arcana: 'Fool', arcanaNome: 'Matto', livello, eredita: null, ereditaNome: null, speciale: false, rara: false, dlc: false, richiedeConfidenteMax: false, tratto: '',
  statistiche: { forza: 2, magia: 2, resistenza: 2, agilita: 3, fortuna: 1 }, affinita: [], ...extra,
});
const nomiTessere = () => screen.getAllByRole('listitem').filter((li) => li.id.startsWith('persona-')).map((li) => li.querySelector('a')?.getAttribute('aria-label')?.split(',')[0] ?? '');

beforeEach(() => {
  getPersone.mockReset();
  getImmagini.mockReset();
  getImmagini.mockResolvedValue([]);
  azzeraCacheImmagini();
  usePreferenzeStore.setState({ graficaPredefinita: true, vistaPersona: 'piastrelle' });
  sessionStorage.clear();
});

describe('CompendioPage', () => {
  it('mostra le Persona a piastrelle con livello e badge; il passaggio all\'elenco viene ricordato', async () => {
    getPersone.mockResolvedValue([persona(1, 'Arsène', 1), persona(2, 'Pixie', 2, { dlc: true }), persona(3, 'Regent', 10, { rara: true })]);
    render(<MemoryRouter><CompendioPage /></MemoryRouter>);
    const arsene = await screen.findByRole('link', { name: 'Arsène, Matto, livello 1' });
    expect(arsene).toHaveAttribute('href', '/compendio/persona/1');
    expect(screen.getByRole('button', { name: 'Piastrelle' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('DLC')).toHaveLength(1); // badge testuale (asset assente); il filtro DLC sta nel pannello chiuso
    expect(screen.getByText('Tesoro')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Elenco' }));
    expect(usePreferenzeStore.getState().vistaPersona).toBe('elenco');
    expect(screen.getByRole('button', { name: 'Elenco' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: /Regent/ })).toHaveAttribute('href', '/compendio/persona/3');
    expect(screen.queryByRole('link', { name: 'Arsène, Matto, livello 1' })).not.toBeInTheDocument();
  });

  it('filtra per testo, livello minimo e massimo e inverte il verso dell\'ordinamento', async () => {
    getPersone.mockResolvedValue([persona(1, 'Arsène', 1), persona(2, 'Pixie', 2), persona(3, 'Regent', 10)]);
    render(<MemoryRouter><CompendioPage /></MemoryRouter>);
    await screen.findByRole('link', { name: 'Arsène, Matto, livello 1' });
    expect(nomiTessere()).toEqual(['Arsène', 'Pixie', 'Regent']);
    fireEvent.click(screen.getByRole('button', { name: /Ordine crescente/ }));
    expect(nomiTessere()).toEqual(['Regent', 'Pixie', 'Arsène']);
    fireEvent.click(screen.getByRole('button', { name: /Ordine decrescente/ }));

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pix' } });
    expect(screen.getByRole('link', { name: 'Pixie, Matto, livello 2' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Arsène, Matto, livello 1' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filtri' }));
    fireEvent.change(screen.getByLabelText('Livello massimo'), { target: { value: '5' } });
    expect(screen.queryByRole('link', { name: 'Regent, Matto, livello 10' })).not.toBeInTheDocument();
    expect(screen.getByText('2 di 3 Persona')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Livello minimo'), { target: { value: '2' } });
    expect(nomiTessere()).toEqual(['Pixie']);
    expect(screen.getByRole('button', { name: 'Filtri (1)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Togli il filtro Livello 2–5' }));
    expect(nomiTessere()).toEqual(['Arsène', 'Pixie', 'Regent']);
  });

  it('filtra per affinità (elemento e tipo) e per immagine personalizzata presente o assente', async () => {
    getPersone.mockResolvedValue([
      persona(1, 'Arsène', 1, { affinita: [aff('fire', 'wk'), aff('curse', 'nu')] }),
      persona(2, 'Pixie', 2, { affinita: [aff('fire', 'rs')] }),
      persona(3, 'Regent', 10),
    ]);
    getImmagini.mockResolvedValue([{ id: 1, ambito: 'persona', chiave: 'Pixie', mime: 'image/png', byte: 10, url: '/api/immagini/persona/Pixie/file' }]);
    render(<MemoryRouter><CompendioPage /></MemoryRouter>);
    await screen.findByRole('link', { name: 'Arsène, Matto, livello 1' });
    fireEvent.click(screen.getByRole('button', { name: 'Filtri' }));
    fireEvent.change(screen.getByLabelText("Elemento dell'affinità"), { target: { value: 'fire' } });
    expect(nomiTessere()).toEqual(['Arsène', 'Pixie']);
    fireEvent.change(screen.getByLabelText('Tipo di affinità'), { target: { value: 'wk' } });
    expect(nomiTessere()).toEqual(['Arsène']);
    fireEvent.change(screen.getByLabelText("Elemento dell'affinità"), { target: { value: '' } });

    fireEvent.change(screen.getByLabelText('Immagine personalizzata'), { target: { value: 'con' } });
    await waitFor(() => expect(nomiTessere()).toEqual(['Pixie']));
    fireEvent.change(screen.getByLabelText('Immagine personalizzata'), { target: { value: 'senza' } });
    expect(nomiTessere()).toEqual(['Arsène', 'Regent']);
    fireEvent.click(screen.getByRole('button', { name: 'Azzera' }));
    expect(nomiTessere()).toEqual(['Arsène', 'Pixie', 'Regent']);
    expect(screen.queryByRole('list', { name: 'Filtri attivi' })).not.toBeInTheDocument();
  });

  it('al ritorno dalla scheda evidenzia la Persona vista', async () => {
    getPersone.mockResolvedValue([persona(1, 'Arsène', 1), persona(2, 'Pixie', 2)]);
    ricordaUltimaPersona(2);
    render(<MemoryRouter><CompendioPage /></MemoryRouter>);
    await screen.findByRole('link', { name: 'Pixie, Matto, livello 2' });
    await waitFor(() => expect(document.getElementById('persona-2')?.querySelector('a')?.className).toContain('card--evidenza'));
    expect(sessionStorage.getItem('p5r-compendio-ultima')).toBeNull();
  });
});
