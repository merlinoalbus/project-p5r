/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test EditorMappaPage — aggiunta di uno spillo con un tocco sulla mappa, proprietà e riferimento cercato, spostamento, mappa (Fase 13.3)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EditorMappaPage } from './EditorMappaPage';
import type { MappaDto, MappaRiassuntoDto, SpilloDto } from '../types';

const api = vi.hoisted(() => ({
  getMappa: vi.fn(), getAlberoMappe: vi.fn(), creaSpillo: vi.fn(), aggiornaSpillo: vi.fn(), eliminaSpillo: vi.fn(), cercaRiferimenti: vi.fn(),
  aggiornaMappa: vi.fn(), creaMappa: vi.fn(), eliminaMappa: vi.fn(), caricaImmagineMappa: vi.fn(), esportaMappe: vi.fn(), importaMappe: vi.fn(), scaricaPianta: vi.fn(), scaricaPiantaQuartiere: vi.fn(),
  esportaPacchettoRepository: vi.fn(), aggiungiImmagineSpillo: vi.fn(), aggiornaImmagineSpillo: vi.fn(), eliminaImmagineSpillo: vi.fn(),
}));
vi.mock('../services/api', () => api);

const riassunto = (extra: Partial<MappaRiassuntoDto> & { chiave: string; nome: string; tipo: MappaRiassuntoDto['tipo'] }): MappaRiassuntoDto => ({ genitore: null, ordine: 0, immagineUrl: null, asset: null, entita: null, origine: 'seed', numeroSpilli: 0, numeroFigli: 0, updatedAt: '', ...extra });
const albero: MappaRiassuntoDto[] = [riassunto({ chiave: 'tokyo', nome: 'Tokyo', tipo: 'citta' }), riassunto({ chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo' })];
const nota: SpilloDto = { id: 9, mappaChiave: 'citta-shibuya', tipo: 'nota', tipoNome: 'Nota', colore: '#eee', nome: 'Nota', descrizione: '', x: 50, y: 50, riferimento: null, collezionabile: false, ordine: 0, origine: 'utente', raccolto: false, dettaglio: null, immagini: [], updatedAt: '' };
const base: MappaDto = { ...riassunto({ chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo', entita: { tipo: 'quartiere', chiave: 'shibuya' } }), larghezza: 1000, altezza: 500, note: '', genitoreNome: 'Tokyo', percorso: [{ chiave: 'tokyo', nome: 'Tokyo' }, { chiave: 'citta-shibuya', nome: 'Shibuya' }], figli: [], spilli: [] };

function monta() {
  render(
    <MemoryRouter initialEntries={['/guida/mappe/citta-shibuya/modifica']}>
      <Routes><Route path="/guida/mappe/:chiave/modifica" element={<EditorMappaPage />} /></Routes>
    </MemoryRouter>,
  );
}

describe('EditorMappaPage', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    api.getAlberoMappe.mockResolvedValue(albero);
    api.getMappa.mockResolvedValue(base);
  });

  it('con lo strumento «Aggiungi» un tocco sulla mappa crea lo spillo del tipo scelto (coordinate in percentuale) e lo seleziona', async () => {
    api.creaSpillo.mockResolvedValue(nota);
    api.getMappa.mockResolvedValueOnce(base).mockResolvedValue({ ...base, spilli: [nota] });
    monta();
    expect(await screen.findByText('Modifica')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi/ }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Tipo del nuovo spillo' })).getByRole('button', { name: /Forziere/ }));
    const tela = screen.getByRole('application');
    fireEvent.pointerDown(tela, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(tela, { pointerId: 1, clientX: 0, clientY: 0 });
    await waitFor(() => expect(api.creaSpillo).toHaveBeenCalledWith('citta-shibuya', { tipo: 'forziere', nome: 'Forziere', x: 50, y: 50 }));
    // ricaricata la mappa, lo spillo creato è selezionato e le sue proprietà sono nel pannello
    expect(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' })).toBeInTheDocument();
  });

  it('le proprietà dello spillo si salvano con il riferimento scelto dalla ricerca; «Elimina» rimuove lo spillo', async () => {
    api.getMappa.mockResolvedValue({ ...base, spilli: [nota] });
    api.cercaRiferimenti.mockResolvedValue([{ tipo: 'negozio', chiave: 'untouchable', nome: 'Untouchable', dettaglio: 'armi' }]);
    api.aggiornaSpillo.mockResolvedValue({ ...nota, nome: 'Armeria', tipo: 'negozio' });
    api.eliminaSpillo.mockResolvedValue(undefined);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    fireEvent.change(form.getByLabelText('Nome'), { target: { value: 'Armeria' } });
    fireEvent.change(form.getByLabelText('Tipo'), { target: { value: 'negozio' } });
    fireEvent.change(form.getByLabelText('Tipo di entità da cercare'), { target: { value: 'negozio' } });
    fireEvent.change(form.getByLabelText('Testo da cercare'), { target: { value: 'untou' } });
    fireEvent.click(form.getByRole('button', { name: 'Cerca' }));
    await waitFor(() => expect(api.cercaRiferimenti).toHaveBeenCalledWith('negozio', 'untou'));
    fireEvent.click(await form.findByRole('button', { name: /Untouchable/ }));
    fireEvent.click(form.getByRole('button', { name: 'Salva spillo' }));
    await waitFor(() => expect(api.aggiornaSpillo).toHaveBeenCalledWith(9, { nome: 'Armeria', tipo: 'negozio', descrizione: '', collezionabile: false, riferimento: { tipo: 'negozio', chiave: 'untouchable' } }));
    const elimina = await screen.findByRole('button', { name: 'Elimina' });
    await waitFor(() => expect(elimina).not.toBeDisabled());
    fireEvent.click(elimina);
    await waitFor(() => expect(api.eliminaSpillo).toHaveBeenCalledWith(9));
  });

  it('le proprietà della mappa si salvano (nome, genitore, asset); il genitore proposto esclude la mappa stessa', async () => {
    api.aggiornaMappa.mockResolvedValue(base);
    monta();
    const form = within(await screen.findByRole('region', { name: 'Proprietà della mappa' }));
    const genitore = form.getByLabelText('Mappa genitore') as HTMLSelectElement;
    expect([...genitore.options].map((o) => o.value)).toEqual(['', 'tokyo']);
    fireEvent.change(form.getByLabelText('Nome'), { target: { value: 'Shibuya centro' } });
    fireEvent.change(form.getByLabelText(/Asset del repository/), { target: { value: 'mappe/citta-shibuya' } });
    fireEvent.click(form.getByRole('button', { name: 'Salva mappa' }));
    await waitFor(() => expect(api.aggiornaMappa).toHaveBeenCalledWith('citta-shibuya', { nome: 'Shibuya centro', tipo: 'quartiere', genitore: 'tokyo', ordine: 0, asset: 'mappe/citta-shibuya', note: '' }));
    // quartiere collegato alla guida: è offerto «Scarica dalla guida»; l'esportazione del luogo produce lo ZIP per il repository
    expect(await screen.findByRole('button', { name: 'Scarica dalla guida' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Esporta questo luogo/ })).toBeInTheDocument();
  });
});
