// @vitest-environment jsdom
// ============================================================
// Test AssetImg + assetStore — manifest, preferenza, fallback su errore
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { AssetImg } from './AssetImg';
import { useAssetStore } from '../../stores/assetStore';
import { usePreferenzeStore } from '../../stores/preferenzeStore';

beforeEach(() => {
  useAssetStore.setState({ manifest: null, caricato: false, mancanti: {} });
  usePreferenzeStore.setState({ graficaPredefinita: true });
});

describe('AssetImg', () => {
  it('senza manifest mostra il fallback', () => {
    render(<AssetImg nome="arcani/fool" alt="Matto" fallback={<span>MATTO</span>} />);
    expect(screen.getByText('MATTO')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('con l\'asset nel manifest mostra l\'immagine; se la preferenza è spenta torna al fallback', () => {
    useAssetStore.setState({ manifest: { generato: 'T', totale: 1, file: { 'arcani/fool': '/asset/arcani/fool.png' } }, caricato: true });
    render(<AssetImg nome="arcani/fool" alt="Matto" fallback={<span>MATTO</span>} />);
    expect(screen.getByRole('img', { name: 'Matto' })).toHaveAttribute('src', '/asset/arcani/fool.png');
    act(() => { usePreferenzeStore.getState().impostaGraficaPredefinita(false); });
    expect(screen.getByText('MATTO')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('su errore di caricamento passa al fallback e segna l\'asset mancante per tutta la sessione', () => {
    useAssetStore.setState({ manifest: { generato: 'T', totale: 1, file: { 'ui/rango-3': '/asset/ui/rango-3.png' } }, caricato: true });
    render(<AssetImg nome="ui/rango-3" alt="Rango 3" fallback={<strong>3</strong>} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(useAssetStore.getState().mancanti['ui/rango-3']).toBe(true);
    // un secondo montaggio non ritenta
    render(<AssetImg nome="ui/rango-3" alt="Rango 3" fallback={<strong>ancora 3</strong>} />);
    expect(screen.getByText('ancora 3')).toBeInTheDocument();
  });

  it('la preferenza sopravvive al ricaricamento tramite localStorage e regge uno storage rotto', () => {
    usePreferenzeStore.getState().impostaGraficaPredefinita(false);
    expect(JSON.parse(localStorage.getItem('p5r-preferenze')!)).toEqual({ graficaPredefinita: false });
    localStorage.setItem('p5r-preferenze', '{non-json');
    // lo store legge al primo import: qui verifichiamo solo che la scrittura non esploda con storage pieno/rotto
    const originale = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('quota'); };
    try {
      expect(() => usePreferenzeStore.getState().impostaGraficaPredefinita(true)).not.toThrow();
      expect(usePreferenzeStore.getState().graficaPredefinita).toBe(true);
    } finally {
      Storage.prototype.setItem = originale;
    }
  });
});

describe('assetStore.carica', () => {
  it('manifest assente o non valido → vuoto, senza errori', async () => {
    const fetchOriginale = globalThis.fetch;
    globalThis.fetch = (async () => new Response('non json', { status: 200 })) as typeof fetch;
    try {
      await useAssetStore.getState().carica();
      expect(useAssetStore.getState().manifest).toEqual({ generato: '', totale: 0, file: {} });
      expect(useAssetStore.getState().caricato).toBe(true);
      globalThis.fetch = (async () => new Response('', { status: 404 })) as typeof fetch;
      await useAssetStore.getState().carica();
      expect(useAssetStore.getState().manifest?.totale).toBe(0);
      globalThis.fetch = (async () => new Response(JSON.stringify({ generato: 'T', totale: 1, file: { 'doti/coraggio': '/asset/doti/coraggio.png' } }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
      await useAssetStore.getState().carica();
      expect(useAssetStore.getState().manifest?.file['doti/coraggio']).toBe('/asset/doti/coraggio.png');
    } finally {
      globalThis.fetch = fetchOriginale;
    }
  });
});
