// @vitest-environment jsdom
// ============================================================
// Test GuidaPage — indice a piastrelle: tutte le sezioni con il loro collegamento e la riserva vettoriale
// ============================================================

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GuidaPage } from './GuidaPage';
import { SEZIONI_GUIDA } from '../components/guida/sezioniGuida';
import { useAssetStore } from '../stores/assetStore';
import { usePartitaStore } from '../stores/partitaStore';
import { COVO_AREA } from '../utils/covo';
import type { PartitaDto } from '../types';

const { getAreeDelQuartiere } = vi.hoisted(() => ({ getAreeDelQuartiere: vi.fn() }));
vi.mock('../services/api', (vero) => moduloApi(vero, { getAreeDelQuartiere }));

beforeEach(() => {
  useAssetStore.setState({ manifest: null, caricato: false, mancanti: {} });
  usePartitaStore.setState({ attiva: null });
  getAreeDelQuartiere.mockResolvedValue([{ chiave: COVO_AREA.chiave, disponibile: true }]);
});

describe('GuidaPage', () => {
  it('elenca tutte le sezioni della guida come piastrelle cliccabili', () => {
    render(<MemoryRouter><GuidaPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Guida' })).toBeInTheDocument();
    const voci = screen.getAllByRole('listitem');
    expect(voci).toHaveLength(SEZIONI_GUIDA.length);
    // «Palazzi», non più «Palazzi e Dedali»: l'unico Dedalo che ci resta è Iweleth, e i Memento
    // hanno la loro pagina. Si cerca il titolo della piastrella e non il nome accessibile, che
    // incolla titolo e descrizione senza spazio e renderebbe la prova un indovinello.
    expect(screen.getByText('Palazzi', { selector: 'span' }).closest('a')).toHaveAttribute('href', '/guida/dungeon');
    expect(screen.queryByRole('link', { name: /Palazzi e Dedali/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Guida giorno per giorno/ })).toHaveAttribute('href', '/guida/percorso');
    expect(screen.getByText('Confidenti', { selector: 'span' }).closest('a')).toHaveAttribute('href', '/partita?scheda=confidenti');
    // senza asset: riserva vettoriale, nessuna immagine
    expect(document.querySelectorAll('img')).toHaveLength(0);
    expect(document.querySelectorAll('.piastrella-guida__riserva')).toHaveLength(SEZIONI_GUIDA.length);
  });

  it('usa l\'illustrazione della sezione quando l\'asset esiste', () => {
    useAssetStore.setState({ manifest: { generato: 'T', totale: 1, file: { 'guida/dungeon': '/asset/guida/dungeon.png' } }, caricato: true });
    render(<MemoryRouter><GuidaPage /></MemoryRouter>);
    expect(document.querySelector('img[src="/asset/guida/dungeon.png"]')).not.toBeNull();
    expect(document.querySelectorAll('.piastrella-guida__riserva')).toHaveLength(SEZIONI_GUIDA.length - 1);
  });

  // 2026-10-29 («il covo dei ladri si sblocca il 5 maggio»): con una partita prima di quella data la piastrella del Covo non c'è
  it('nasconde il Covo dei Ladri solo quando nella partita non è ancora aperto', async () => {
    usePartitaStore.setState({ attiva: { id: 3, nome: 'Prova' } as PartitaDto });
    getAreeDelQuartiere.mockResolvedValue([{ chiave: COVO_AREA.chiave, disponibile: false, bloccoMotivo: 'dal 5 maggio' }]);
    render(<MemoryRouter><GuidaPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(SEZIONI_GUIDA.length - 1));
    expect(screen.queryByText('Covo dei Ladri', { selector: 'span' })).toBeNull();
  });

  it('mostra il Covo dei Ladri quando nella partita è aperto', async () => {
    usePartitaStore.setState({ attiva: { id: 3, nome: 'Prova' } as PartitaDto });
    render(<MemoryRouter><GuidaPage /></MemoryRouter>);
    await waitFor(() => expect(getAreeDelQuartiere).toHaveBeenCalled());
    expect(screen.getByText('Covo dei Ladri', { selector: 'span' }).closest('a')).toHaveAttribute('href', '/guida/covo');
  });
});
