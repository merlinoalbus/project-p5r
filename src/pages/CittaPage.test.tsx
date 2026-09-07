/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test CittaPage e QuartierePage — mappa incorporata di Tokyo/quartiere e schede dei luoghi senza posizionamento (Fase 13.4)
// ============================================================

import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CittaPage } from './CittaPage';
import { QuartierePage } from './QuartierePage';
import type { MappaDto, QuartiereDettaglioDto, QuartiereRiassuntoDto } from '../types';

const api = vi.hoisted(() => ({ risolviMappa: vi.fn(async (mappa: string) => ({tipo:'mappa',mappa})), getQuartieri: vi.fn(), getDungeons: vi.fn(async () => []), getQuartiere: vi.fn(), getMappa: vi.fn(), scaricaPiantaQuartiere: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaStatoPunto: vi.fn(), impostaAcquisto: vi.fn(), urlImmagine: vi.fn(() => '/api/immagini/mappa/x/file'), getImmagini: vi.fn(() => Promise.resolve([])) }));
vi.mock('../services/api', () => api);

const mappa = (chiave: string, nome: string): MappaDto => ({ chiave, nome, tipo: chiave === 'tokyo' ? 'citta' : 'quartiere', genitore: chiave === 'tokyo' ? null : 'tokyo', ordine: 0, immagineUrl: `/asset/mappe/${chiave}.png`, asset: null, entita: null, origine: 'seed', numeroSpilli: 1, numeroFigli: 0, updatedAt: '', larghezza: 1000, altezza: 600, note: '', genitoreNome: chiave === 'tokyo' ? null : 'Tokyo', percorso: chiave === 'tokyo' ? [{ chiave: 'tokyo', nome: 'Tokyo' }] : [{ chiave: 'tokyo', nome: 'Tokyo' }, { chiave, nome }], figli: [],
  spilli: [{ id: 1, mappaChiave: chiave, tipo: 'passaggio', tipoNome: 'Passaggio', colore: '#3b82f6', nome: chiave === 'tokyo' ? 'Shibuya' : 'Untouchable', descrizione: '', x: 30, y: 40, riferimento: null, collezionabile: false, ordine: 0, origine: 'seed', raccolto: false, dettaglio: null, condizioni: [], immagini: [], updatedAt: '' }] });

describe('CittaPage', () => {
  it('mostra una sola Tokyo — quella disegnata — e le piastrelle dei quartieri', async () => {
    // La pagina montava anche `MappaIncorporata chiave="tokyo"`: la stessa città due volte, con
    // due interazioni e nessun modo di capire quale fosse quella buona. La prova che conta è
    // che il visore dell'atlante non ci sia più e che di Tokyo ce ne sia **una**.
    api.getQuartieri.mockResolvedValue([{ chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', luoghi: 11, verificati: 11, sblocco: null, descrizione: 'Il centro.' }] as QuartiereRiassuntoDto[]);
    api.getMappa.mockResolvedValue(mappa('tokyo', 'Tokyo'));
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    expect(await screen.findByRole('img', { name: /^Mappa di Tokyo con/ })).toBeInTheDocument();
    expect(screen.queryByTestId('visore-mappa')).not.toBeInTheDocument();
    expect(api.getMappa).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Modifica mappa' })).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Quartieri' })).getByRole('link', { name: /Shibuya/ })).toHaveAttribute('href', '/guida/mondo/quartiere/shibuya');
  });

  it('sulla mappa disegnata il quartiere porta alla sua mappa, non a un secondo visore di Tokyo', async () => {
    api.getQuartieri.mockResolvedValue([{ chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', luoghi: 11, verificati: 11, sblocco: null, descrizione: 'Il centro.' }] as QuartiereRiassuntoDto[]);
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    const tokyo = await screen.findByRole('img', { name: /^Mappa di Tokyo con/ });
    const cartellino = within(tokyo).getByTitle('Shibuya');
    expect(cartellino).toHaveAttribute('href', '/guida/mappe/citta-shibuya');
  });
});

describe('QuartierePage', () => {
  it('mostra la mappa del quartiere incorporata e i luoghi senza i pulsanti di posizionamento (ora nell’editor)', async () => {
    // `mappaChiave` la dà il backend (cittaService), non la costruisce la pagina: il mock deve dirla
    const q: QuartiereDettaglioDto = { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', sblocco: null, descrizione: '', fonte: '', mappa: true, pianta: null, piantaAssente: null,
      luoghi: [{ chiave: 'shibuya/untouchable', ordine: 0, tipo: 'negozio', nome: 'Untouchable', cosaOffre: 'Armi', quando: 'entrambe', giorni: null, sblocco: null, confidenti: [{ chiave: 'iwai', nome: 'Munehisa Iwai' }], attivita: [], negozio: 'untouchable', piatti: null, note: null, fonte: '', verificato: true, marcatore: null } as QuartiereDettaglioDto['luoghi'][number]] };
    api.getQuartiere.mockResolvedValue(q);
    api.getMappa.mockResolvedValue(mappa('citta-shibuya', 'Shibuya'));
    render(<MemoryRouter initialEntries={['/guida/citta/shibuya']}><Routes><Route path="/guida/citta/:chiave" element={<QuartierePage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('application', { name: 'Mappa: Tokyo › Shibuya' })).toBeInTheDocument();
    expect(api.getMappa).toHaveBeenCalledWith('citta-shibuya', undefined);
    const luoghi = within(screen.getByRole('list', { name: 'Luoghi' }));
    expect(luoghi.getByText('Untouchable')).toBeInTheDocument();
    expect(luoghi.queryByRole('button', { name: /Posiziona/ })).not.toBeInTheDocument();
    expect(luoghi.getByRole('link', { name: 'Articoli in vendita' })).toHaveAttribute('href', '/guida/negozi/untouchable');
    expect(api.scaricaPiantaQuartiere).not.toHaveBeenCalled();
  });
});
