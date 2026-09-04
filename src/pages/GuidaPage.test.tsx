// @vitest-environment jsdom
// ============================================================
// Test GuidaPage — indice a piastrelle: tutte le sezioni con il loro collegamento e la riserva vettoriale
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GuidaPage } from './GuidaPage';
import { SEZIONI_GUIDA } from '../components/guida/sezioniGuida';
import { useAssetStore } from '../stores/assetStore';

beforeEach(() => {
  useAssetStore.setState({ manifest: null, caricato: false, mancanti: {} });
});

describe('GuidaPage', () => {
  it('elenca tutte le sezioni della guida come piastrelle cliccabili', () => {
    render(<MemoryRouter><GuidaPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Guida' })).toBeInTheDocument();
    const voci = screen.getAllByRole('listitem');
    expect(voci).toHaveLength(SEZIONI_GUIDA.length);
    expect(screen.getByRole('link', { name: /Palazzi e Dedali/ })).toHaveAttribute('href', '/guida/dungeon');
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
});
