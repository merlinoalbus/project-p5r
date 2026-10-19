// @vitest-environment jsdom
// ============================================================
// L1 (2026-10-20) — un'immagine per mappa in ogni vista: la caricata vince ovunque, poi l'asset dichiarato; i segni dei posti
// (sagome, stemmi) seguono la regola della grafica predefinita
// ============================================================

import { render, renderHook } from '@testing-library/react';
import { AnteprimaMappa } from './AnteprimaMappa';
import { SagomaQuartiere } from './SagomaQuartiere';
import { useImmagineMappa } from '../../hooks/useImmagineMappa';
import { useAssetStore } from '../../stores/assetStore';
import { usePreferenzeStore } from '../../stores/preferenzeStore';

beforeEach(() => {
  usePreferenzeStore.setState({ graficaPredefinita: true });
  useAssetStore.setState({ manifest: { generato: 'T', totale: 3, file: { 'guida/citta': '/emblema-citta.png', 'mappe/tokyo': '/asset-tokyo.png', 'mappe/lmap/tokyo/shibuya': '/sagoma-shibuya.png' } }, caricato: true, mancanti: {} });
});

describe('useImmagineMappa', () => {
  it('la caricata vince sull’asset; senza caricata l’asset dichiarato; senza nessuna delle due niente', () => {
    expect(renderHook(() => useImmagineMappa({ immagineUrl: '/api/immagini/mappa/tokyo/file?v=1', asset: 'mappe/tokyo' })).result.current).toBe('/api/immagini/mappa/tokyo/file?v=1');
    expect(renderHook(() => useImmagineMappa({ immagineUrl: null, asset: 'mappe/tokyo' })).result.current).toBe('/asset-tokyo.png');
    expect(renderHook(() => useImmagineMappa({ immagineUrl: null, asset: 'mappe/inesistente' })).result.current).toBeNull();
    expect(renderHook(() => useImmagineMappa(null)).result.current).toBeNull();
  });
  it('con la grafica predefinita spenta resta solo la caricata', () => {
    usePreferenzeStore.setState({ graficaPredefinita: false });
    expect(renderHook(() => useImmagineMappa({ immagineUrl: null, asset: 'mappe/tokyo' })).result.current).toBeNull();
    expect(renderHook(() => useImmagineMappa({ immagineUrl: '/caricata.png', asset: 'mappe/tokyo' })).result.current).toBe('/caricata.png');
  });
});

describe('AnteprimaMappa', () => {
  it('Tokyo con l’immagine caricata mostra quella, non lo stemma (prima lo stemma la copriva nell’indice)', () => {
    const { container } = render(<AnteprimaMappa mappa={{ chiave: 'tokyo', nome: 'Tokyo', immagineUrl: '/api/immagini/mappa/tokyo/file?v=2', asset: 'mappe/tokyo' }} />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/api/immagini/mappa/tokyo/file?v=2');
  });
  it('Tokyo senza immagine caricata: lo stemma, che vince sull’asset (la pianta a 100 px è una macchia)', () => {
    const { container } = render(<AnteprimaMappa mappa={{ chiave: 'tokyo', nome: 'Tokyo', immagineUrl: null, asset: 'mappe/tokyo' }} />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/emblema-citta.png');
  });
  it('una mappa qualunque senza caricata mostra l’asset dichiarato; senza niente il riquadro col simbolo', () => {
    const conAsset = render(<AnteprimaMappa mappa={{ chiave: 'x', nome: 'X', immagineUrl: null, asset: 'mappe/tokyo' }} />);
    expect(conAsset.container.querySelector('img')).toHaveAttribute('src', '/asset-tokyo.png');
    const vuota = render(<AnteprimaMappa mappa={{ chiave: 'y', nome: 'Y', immagineUrl: null, asset: null }} />);
    expect(vuota.container.querySelector('img')).toBeNull();
    expect(vuota.container.querySelector('.anteprima-mappa__vuota')).not.toBeNull();
  });
});

describe('SagomaQuartiere', () => {
  it('la sagoma viene dal manifesto; con la grafica predefinita spenta non c’è (resta il riquadro, nessuna figura estranea)', () => {
    const accesa = render(<SagomaQuartiere chiave="shibuya" nome="Shibuya" />);
    expect(accesa.getByAltText('Sagoma di Shibuya sulla mappa di Tokyo')).toHaveAttribute('src', '/sagoma-shibuya.png');
    accesa.unmount();
    usePreferenzeStore.setState({ graficaPredefinita: false });
    const spenta = render(<SagomaQuartiere chiave="shibuya" nome="Shibuya" />);
    expect(spenta.container.querySelector('img')).toBeNull();
  });
});
