// @vitest-environment jsdom
// ============================================================
// Test IntestazionePagina — titolo a tasselli con nome accessibile intero, sottotitolo, azioni, indietro, illustrazione
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntestazionePagina } from './IntestazionePagina';
import { useAssetStore } from '../../stores/assetStore';
import { usePreferenzeStore } from '../../stores/preferenzeStore';

beforeEach(() => {
  useAssetStore.setState({ manifest: null, caricato: false, mancanti: {} });
  usePreferenzeStore.setState({ graficaPredefinita: true });
});

describe('IntestazionePagina', () => {
  it('compone il titolo in un tassello per parola mantenendo il nome accessibile completo', () => {
    render(<MemoryRouter><IntestazionePagina titolo="Palazzi e Dedali" sottotitolo="Aree e punti di interesse" /></MemoryRouter>);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Palazzi e Dedali' });
    expect(h1.querySelectorAll('.tassello')).toHaveLength(3);
    expect(screen.getByText('Aree e punti di interesse')).toBeInTheDocument();
  });

  it('un titolo già composto resta un solo tassello; azioni e riga aggiuntiva vengono rese', () => {
    render(<MemoryRouter><IntestazionePagina titolo={<>Arsène <em>Picaro</em></>} azioni={<button type="button">Aggiungi</button>}><span>filtri</span></IntestazionePagina></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 }).querySelectorAll('.tassello')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Aggiungi' })).toBeInTheDocument();
    expect(screen.getByText('filtri')).toBeInTheDocument();
  });

  it('mostra il collegamento «indietro» e l\'illustrazione solo se l\'asset esiste', () => {
    const { rerender } = render(<MemoryRouter><IntestazionePagina titolo="Guida" indietro={{ to: '/home', etichetta: 'Home' }} illustrazione="illustrazioni/vuoto-partita-senza-testo" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Home/ })).toHaveAttribute('href', '/home');
    expect(document.querySelector('img')).toBeNull();
    useAssetStore.setState({ manifest: { generato: 'T', totale: 1, file: { 'illustrazioni/vuoto-partita-senza-testo': '/asset/illustrazioni/vuoto-partita-senza-testo.png' } }, caricato: true });
    rerender(<MemoryRouter><IntestazionePagina titolo="Guida" indietro={{ to: '/home', etichetta: 'Home' }} illustrazione="illustrazioni/vuoto-partita-senza-testo" /></MemoryRouter>);
    expect(document.querySelector('img.intestazione__illustrazione')).toHaveAttribute('src', '/asset/illustrazioni/vuoto-partita-senza-testo.png');
  });
});
