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

const api = vi.hoisted(() => ({ getQuartieri: vi.fn(), getQuartiere: vi.fn(), getMappa: vi.fn(), scaricaPiantaQuartiere: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaStatoPunto: vi.fn(), impostaAcquisto: vi.fn(), urlImmagine: vi.fn(() => '/api/immagini/mappa/x/file'), getImmagini: vi.fn(() => Promise.resolve([])) }));
vi.mock('../services/api', () => api);

const mappa = (chiave: string, nome: string): MappaDto => ({ chiave, nome, tipo: chiave === 'tokyo' ? 'citta' : 'quartiere', genitore: chiave === 'tokyo' ? null : 'tokyo', ordine: 0, immagineUrl: null, asset: null, entita: null, origine: 'seed', numeroSpilli: 1, numeroFigli: 0, updatedAt: '', larghezza: 1000, altezza: 600, note: '', genitoreNome: chiave === 'tokyo' ? null : 'Tokyo', percorso: chiave === 'tokyo' ? [{ chiave: 'tokyo', nome: 'Tokyo' }] : [{ chiave: 'tokyo', nome: 'Tokyo' }, { chiave, nome }], figli: [],
  spilli: [{ id: 1, mappaChiave: chiave, tipo: 'passaggio', tipoNome: 'Passaggio', colore: '#3b82f6', nome: chiave === 'tokyo' ? 'Shibuya' : 'Untouchable', descrizione: '', x: 30, y: 40, riferimento: null, collezionabile: false, ordine: 0, origine: 'seed', raccolto: false, dettaglio: null, immagini: [], updatedAt: '' }] });

describe('CittaPage', () => {
  it('mostra la mappa di Tokyo incorporata (con «Schermo intero» e «Modifica mappa») e le piastrelle dei quartieri', async () => {
    api.getQuartieri.mockResolvedValue([{ chiave: 'shibuya', nome: 'Shibuya', luoghi: 11, verificati: 11, sblocco: null, descrizione: 'Il centro.' }] as QuartiereRiassuntoDto[]);
    api.getMappa.mockResolvedValue(mappa('tokyo', 'Tokyo'));
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    expect(await screen.findByRole('application', { name: 'Mappa: Tokyo' })).toBeInTheDocument();
    expect(api.getMappa).toHaveBeenCalledWith('tokyo', undefined);
    expect(screen.getByRole('button', { name: 'Passaggio: Shibuya' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Schermo intero' })).toHaveAttribute('href', '/guida/mappe/tokyo');
    expect(screen.getByRole('link', { name: 'Modifica mappa' })).toHaveAttribute('href', '/guida/mappe/tokyo/modifica');
    expect(within(screen.getByRole('list', { name: 'Quartieri' })).getByRole('link', { name: /Shibuya/ })).toHaveAttribute('href', '/guida/citta/shibuya');
  });
});

describe('QuartierePage', () => {
  it('mostra la mappa del quartiere incorporata e i luoghi senza i pulsanti di posizionamento (ora nell’editor)', async () => {
    const q: QuartiereDettaglioDto = { chiave: 'shibuya', nome: 'Shibuya', sblocco: null, descrizione: '', fonte: '', mappa: true, pianta: null, piantaAssente: null,
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
