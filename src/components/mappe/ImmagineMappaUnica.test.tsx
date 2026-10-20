// @vitest-environment jsdom
// ============================================================
// L1 (2026-10-20) — un'immagine per mappa in ogni vista: la caricata vince ovunque, poi l'asset dichiarato; i segni dei posti
// (sagome, stemmi) seguono la regola della grafica predefinita
// ============================================================

import { fireEvent, render, renderHook } from '@testing-library/react';
import { AnteprimaMappa } from './AnteprimaMappa';
import { SagomaQuartiere } from './SagomaQuartiere';
import { useRisolviSegno, useSegno } from './segniMappa';
import { IllustrazioneConSegno } from './IllustrazioneConSegno';
import { useImmagineMappa } from '../../hooks/useImmagineMappa';
import { haPlanimetria } from '../../utils/haPlanimetria';
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
    // in miniatura (variante «miniature»): `src` da 320 px, `srcset` e `sizes` predefinito dell'indice
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/api/immagini/mappa/tokyo/file?v=2&l=320');
    expect(img.getAttribute('srcset')).toContain('/api/immagini/mappa/tokyo/file?v=2&l=640 640w');
    expect(img).toHaveAttribute('sizes', '72px');
  });
  it('un asset statico (non del database) resta com’è, senza srcset né sizes; `sizes` passato arriva all’immagine', () => {
    const statico = render(<AnteprimaMappa mappa={{ chiave: 'x', nome: 'X', immagineUrl: null, asset: 'mappe/tokyo' }} />);
    const img = statico.container.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/asset-tokyo.png');
    expect(img).not.toHaveAttribute('srcset');
    expect(img).not.toHaveAttribute('sizes');
    statico.unmount();
    const griglia = render(<AnteprimaMappa mappa={{ chiave: 'x', nome: 'X', immagineUrl: '/api/immagini/mappe/x/file?v=1', asset: null }} sizes="50vw" />);
    expect(griglia.container.querySelector('img')).toHaveAttribute('sizes', '50vw');
  });
  it('Tokyo senza immagine caricata mostra l’asset dichiarato, come il visore: lo stemma non lo copre (rilievo F2)', () => {
    const { container } = render(<AnteprimaMappa mappa={{ chiave: 'tokyo', nome: 'Tokyo', immagineUrl: null, asset: 'mappe/tokyo' }} />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/asset-tokyo.png');
  });
  it('lo stemma solo se la mappa non ha né caricata né asset: anche per il capofila col prefisso, e con l’asset assente dal manifesto', () => {
    const senzaNiente = render(<AnteprimaMappa mappa={{ chiave: 'tokyo', nome: 'Tokyo', immagineUrl: null, asset: null }} />);
    expect(senzaNiente.container.querySelector('img')).toHaveAttribute('src', '/emblema-citta.png');
    senzaNiente.unmount();
    const assetAssente = render(<AnteprimaMappa mappa={{ chiave: 'tokyo-centro', nome: 'Tokyo', immagineUrl: null, asset: 'mappe/inesistente' }} />);
    expect(assetAssente.container.querySelector('img')).toHaveAttribute('src', '/emblema-citta.png');
  });
  it('con la grafica predefinita spenta né asset né stemma: la caricata se c’è, altrimenti il riquadro col simbolo', () => {
    usePreferenzeStore.setState({ graficaPredefinita: false });
    const senza = render(<AnteprimaMappa mappa={{ chiave: 'tokyo', nome: 'Tokyo', immagineUrl: null, asset: 'mappe/tokyo' }} />);
    expect(senza.container.querySelector('img')).toBeNull();
    senza.unmount();
    const caricata = render(<AnteprimaMappa mappa={{ chiave: 'tokyo', nome: 'Tokyo', immagineUrl: '/caricata.png', asset: 'mappe/tokyo' }} />);
    expect(caricata.container.querySelector('img')).toHaveAttribute('src', '/caricata.png');
  });
  it('una mappa qualunque senza caricata mostra l’asset dichiarato; senza niente il riquadro col simbolo', () => {
    const conAsset = render(<AnteprimaMappa mappa={{ chiave: 'x', nome: 'X', immagineUrl: null, asset: 'mappe/tokyo' }} />);
    expect(conAsset.container.querySelector('img')).toHaveAttribute('src', '/asset-tokyo.png');
    const vuota = render(<AnteprimaMappa mappa={{ chiave: 'y', nome: 'Y', immagineUrl: null, asset: null }} />);
    expect(vuota.container.querySelector('img')).toBeNull();
    expect(vuota.container.querySelector('.anteprima-mappa__vuota')).not.toBeNull();
  });
});

describe('haPlanimetria sul riassunto dell’albero (le mappe sorelle di MappaPage, rilievo F4)', () => {
  it('decide il ruolo: una sorella con l’asset dichiarato ma inesistente («nessuna») e uno stemma non sono planimetrie', () => {
    expect(haPlanimetria({ ruoloImmagine: 'planimetria-nativa', immagineUrl: null, asset: 'mappe/native/x' })).toBe(true);
    expect(haPlanimetria({ ruoloImmagine: 'illustrazione-editoriale', immagineUrl: '/caricata.png', asset: null })).toBe(true);
    expect(haPlanimetria({ ruoloImmagine: 'nessuna', immagineUrl: null, asset: 'mappe/per-convenzione' })).toBe(false);
    expect(haPlanimetria({ ruoloImmagine: 'emblema', immagineUrl: null, asset: 'palazzi/kamoshida' })).toBe(false);
  });
  it('senza ruolo: la caricata sì, un asset senza dimensioni (il riassunto non le porta) no', () => {
    expect(haPlanimetria({ immagineUrl: '/caricata.png', asset: null })).toBe(true);
    expect(haPlanimetria({ immagineUrl: null, asset: 'mappe/x' })).toBe(false);
  });
});

describe('SagomaQuartiere', () => {
  it('la sagoma viene dal manifesto e resta anche con la grafica predefinita spenta (UX-2, decisione del PM del 2026-10-21)', () => {
    const accesa = render(<SagomaQuartiere chiave="shibuya" nome="Shibuya" />);
    expect(accesa.getByAltText('Sagoma di Shibuya sulla mappa di Tokyo')).toHaveAttribute('src', '/sagoma-shibuya.png');
    accesa.unmount();
    usePreferenzeStore.setState({ graficaPredefinita: false });
    const spenta = render(<SagomaQuartiere chiave="shibuya" nome="Shibuya" />);
    expect(spenta.getByAltText('Sagoma di Shibuya sulla mappa di Tokyo')).toHaveAttribute('src', '/sagoma-shibuya.png');
  });
  it('una sagoma che il manifesto non ha non lascia un riquadro vuoto (UX-3), né una che risulta rotta', () => {
    const assente = render(<SagomaQuartiere chiave="kichijoji" nome="Kichijoji" />);
    expect(assente.container.firstChild).toBeNull();
    assente.unmount();
    useAssetStore.setState({ mancanti: { 'mappe/lmap/tokyo/shibuya': true } });
    const rotta = render(<SagomaQuartiere chiave="shibuya" nome="Shibuya" />);
    expect(rotta.container.firstChild).toBeNull();
  });
});

describe('IllustrazioneConSegno — il riquadro con la proporzione dell’immagine (LAY-1, decisione del PM del 2026-10-21)', () => {
  /** Monta l'illustrazione e simula il caricamento di un file `l`×`a`; restituisce il riquadro e l'immagine. */
  const carica = (l: number, a: number) => {
    const { container, unmount } = render(<IllustrazioneConSegno illustrazione={{ immagineUrl: '/api/immagini/mappa/x/file?v=1', asset: null }} alt="Illustrazione di X"
      sizes="128px" segno={<span>segno</span>} senza={<span>senza</span>} className="w-32" />);
    const img = container.querySelector('img')!;
    Object.defineProperty(img, 'naturalWidth', { value: l }); Object.defineProperty(img, 'naturalHeight', { value: a });
    fireEvent.load(img);
    return { unmount, spazio: container.querySelector('.illustrazione-segno') as HTMLElement, riquadro: container.querySelector('.illustrazione-segno__riquadro') as HTMLElement, img };
  };
  it('16:9 e 4:3 hanno il riquadro della loro proporzione, riempito senza tagli; lo spazio resta lo stesso', () => {
    const largo = carica(1672, 941);
    expect(Number(largo.riquadro.style.getPropertyValue('--proporzione'))).toBeCloseTo(16 / 9, 2);
    expect(largo.img.style.objectFit).toBe('cover');
    expect(largo.spazio).toHaveClass('w-32');
    largo.unmount();
    const quattroTerzi = carica(2048, 1536);
    expect(Number(quattroTerzi.riquadro.style.getPropertyValue('--proporzione'))).toBeCloseTo(4 / 3, 2);
    expect(quattroTerzi.img.style.objectFit).toBe('cover');
    expect(quattroTerzi.spazio).toHaveClass('w-32');
  });
  it('fuori dalla forbice: il riquadro si ferma a 16:9 (o 4:3) e l’immagine si mostra intera se riempirlo taglierebbe più del 5%', () => {
    const panoramica = carica(2100, 900);
    expect(Number(panoramica.riquadro.style.getPropertyValue('--proporzione'))).toBeCloseTo(16 / 9, 2);
    expect(panoramica.img.style.objectFit).toBe('contain');
    panoramica.unmount();
    const quasi = carica(1800, 1000);
    expect(quasi.img.style.objectFit).toBe('cover');
  });
});

describe('segni dei posti (useSegno, useRisolviSegno)', () => {
  it('dal manifesto a prescindere dalla preferenza; null se il manifesto non lo ha o se è segnato mancante', () => {
    usePreferenzeStore.setState({ graficaPredefinita: false });
    expect(renderHook(() => useSegno('mappe/lmap/tokyo/shibuya')).result.current).toBe('/sagoma-shibuya.png');
    expect(renderHook(() => useSegno('palazzi/assente')).result.current).toBeNull();
    const risolvi = renderHook(() => useRisolviSegno()).result.current;
    expect(risolvi('mappe/lmap/tokyo/shibuya')).toBe('/sagoma-shibuya.png');
    expect(risolvi(null)).toBeNull();
    useAssetStore.setState({ mancanti: { 'mappe/lmap/tokyo/shibuya': true } });
    expect(renderHook(() => useSegno('mappe/lmap/tokyo/shibuya')).result.current).toBeNull();
  });
});
