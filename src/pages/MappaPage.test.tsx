/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test MappaPage — indice dell'albero e visore con stato «raccolto» della partita attiva (Fase 13.2)
// ============================================================

import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MappaPage } from './MappaPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { MappaDto, MappaRiassuntoDto, PartitaDto, SpilloDto } from '../types';

const { getAlberoMappe, getMappa, impostaSpilloRaccolto, impostaStatoPunto, impostaAcquisto } = vi.hoisted(() => ({ getAlberoMappe: vi.fn(), getMappa: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaStatoPunto: vi.fn(), impostaAcquisto: vi.fn() }));
vi.mock('../services/api', () => ({ getAlberoMappe, getMappa, impostaSpilloRaccolto, impostaStatoPunto, impostaAcquisto }));

const riassunto = (extra: Partial<MappaRiassuntoDto> & { chiave: string; nome: string; tipo: MappaRiassuntoDto['tipo'] }): MappaRiassuntoDto => ({ genitore: null, ordine: 0, immagineUrl: null, asset: null, entita: null, origine: 'seed', numeroSpilli: 0, numeroFigli: 0, updatedAt: '', ...extra });
const albero: MappaRiassuntoDto[] = [
  riassunto({ chiave: 'tokyo', nome: 'Tokyo', tipo: 'citta', numeroFigli: 1, asset: 'mappe/tokyo' }),
  riassunto({ chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo', numeroSpilli: 2 }),
  riassunto({ chiave: 'dungeon-kamoshida', nome: 'Palazzo di Kamoshida', tipo: 'palazzo', numeroFigli: 1 }),
  riassunto({ chiave: 'kamoshida-01', nome: 'Ingresso', tipo: 'area', genitore: 'dungeon-kamoshida', numeroSpilli: 5 }),
];
const forziere: SpilloDto = { id: 4, mappaChiave: 'citta-shibuya', tipo: 'forziere', tipoNome: 'Forziere', colore: '#eab308', nome: 'Scrigno', descrizione: '', x: 30, y: 40, riferimento: null, collezionabile: true, ordine: 0, origine: 'seed', raccolto: false, dettaglio: null, immagini: [], updatedAt: '' };
const dettaglio: MappaDto = { ...riassunto({ chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo', numeroSpilli: 2 }), larghezza: 800, altezza: 600, note: '', genitoreNome: 'Tokyo', percorso: [{ chiave: 'tokyo', nome: 'Tokyo' }, { chiave: 'citta-shibuya', nome: 'Shibuya' }], figli: [], spilli: [forziere, { ...forziere, id: 5, nome: 'Passaggio', tipo: 'passaggio', tipoNome: 'Passaggio', collezionabile: false, x: 60, y: 60 }, { ...forziere, id: 6, nome: 'Tesoro del Palazzo', tipo: 'tesoro', tipoNome: 'Tesoro', x: 70, y: 20, riferimento: { tipo: 'punto', chiave: 'kamoshida-01/2' }, dettaglio: { tipo: 'punto', punto: { chiave: 'kamoshida-01/2', tipo: 'tesoro', nome: 'Tesoro del Palazzo', descrizione: '', esauribile: false, dungeon: 'kamoshida', area: 'kamoshida-01', stato: null } } }] };

function monta(percorso: string) {
  render(
    <MemoryRouter initialEntries={[percorso]}>
      <Routes>
        <Route path="/guida/mappe" element={<MappaPage />} />
        <Route path="/guida/mappe/:chiave" element={<MappaPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MappaPage', () => {
  beforeEach(() => {
    getAlberoMappe.mockReset(); getMappa.mockReset(); impostaSpilloRaccolto.mockReset(); impostaStatoPunto.mockReset(); impostaAcquisto.mockReset();
    getAlberoMappe.mockResolvedValue(albero);
    getMappa.mockResolvedValue(dettaglio);
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova' } as PartitaDto });
  });

  it('l’indice elenca le radici con le mappe figlie e i collegamenti al visore', async () => {
    monta('/guida/mappe');
    expect(await screen.findByRole('link', { name: 'Tokyo' })).toHaveAttribute('href', '/guida/mappe/tokyo');
    const tokyo = within(screen.getByRole('list', { name: 'Mappe di Tokyo' }));
    expect(tokyo.getByRole('link', { name: /Shibuya/ })).toHaveAttribute('href', '/guida/mappe/citta-shibuya');
    expect(within(screen.getByRole('list', { name: 'Mappe di Palazzo di Kamoshida' })).getByRole('link', { name: /Ingresso/ })).toBeInTheDocument();
  });

  it('il visore carica la mappa con la partita attiva e segna un collezionabile raccolto tramite l’API', async () => {
    impostaSpilloRaccolto.mockResolvedValue({ ...forziere, raccolto: true });
    monta('/guida/mappe/citta-shibuya');
    const spillo = await screen.findByRole('button', { name: 'Forziere: Scrigno' });
    expect(getMappa).toHaveBeenCalledWith('citta-shibuya', 7);
    fireEvent.click(spillo);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Scrigno' })).getByRole('button', { name: 'Raccolto' }));
    expect(impostaSpilloRaccolto).toHaveBeenCalledWith(7, 4, true);
    // lo spillo raccolto sparisce dalla mappa e il progresso passa a 1 su 2
    expect(await screen.findByText('1 di 2 raccolti · 50%')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Forziere: Scrigno' })).not.toBeInTheDocument();
  });

  it('un punto della Guida segnato «Ottenuto» dalla mappa aggiorna lo stato del punto e conta come raccolto', async () => {
    impostaStatoPunto.mockResolvedValue({ chiave: 'kamoshida-01/2', stato: 'ottenuto' });
    monta('/guida/mappe/citta-shibuya');
    fireEvent.click(await screen.findByRole('button', { name: 'Tesoro: Tesoro del Palazzo' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Tesoro del Palazzo' })).getByRole('button', { name: 'Ottenuto' }));
    expect(impostaStatoPunto).toHaveBeenCalledWith(7, 'kamoshida-01/2', 'ottenuto');
    expect(await screen.findByText('1 di 2 raccolti · 50%')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tesoro: Tesoro del Palazzo' })).not.toBeInTheDocument();
  });
});
