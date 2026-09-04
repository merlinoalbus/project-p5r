// @vitest-environment jsdom
// ============================================================
// Test SpilloGrafico / PuntoSpillo — con l'asset consegnato lo spillo è l'immagine intera, senza asset resta la goccia col disegno
// ============================================================

import { render } from '@testing-library/react';
import { PuntoSpillo, SpilloGrafico } from './IconaSpillo';

const { useAsset } = vi.hoisted(() => ({ useAsset: vi.fn() }));
vi.mock('../../stores/assetStore', () => ({ useAsset, useAssetMulti: vi.fn(() => []), useAssetStore: vi.fn() }));
vi.mock('../shared/AssetImg', () => ({ AssetImg: ({ fallback }: { fallback: React.ReactNode }) => <>{fallback}</> }));

describe('SpilloGrafico', () => {
  it('con l’asset mostra l’immagine intera dello spillo, non la goccia', () => {
    useAsset.mockReturnValue('/asset/ui/spillo-nemico.png');
    const { container } = render(<SpilloGrafico tipo="nemico" colore="#b0b0c0" altezza={40} />);
    const img = container.querySelector('img.spillo-mappa__figura') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('/asset/ui/spillo-nemico.png');
    expect(img.style.height).toBe('40px');
    expect(container.querySelector('.spillo-mappa__goccia')).toBeNull();
    expect(useAsset).toHaveBeenCalledWith('ui/spillo-nemico');
  });

  it('senza asset resta la goccia colorata col disegno di riserva', () => {
    useAsset.mockReturnValue(null);
    const { container } = render(<SpilloGrafico tipo="forziere" colore="#eab308" />);
    const goccia = container.querySelector('.spillo-mappa__goccia') as HTMLElement;
    expect(goccia).not.toBeNull();
    expect(goccia.style.getPropertyValue('--colore-spillo')).toBe('#eab308');
    expect(goccia.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('PuntoSpillo', () => {
  it('in legenda usa la stessa immagine in piccolo quando c’è, altrimenti il cerchio colorato', () => {
    useAsset.mockReturnValue('/asset/ui/spillo-seme-bramosia.png');
    const con = render(<PuntoSpillo tipo="seme-bramosia" colore="#c85cff" grande />);
    expect(con.container.querySelector('img.spillo-mappa__punto-figura--grande')).not.toBeNull();
    useAsset.mockReturnValue(null);
    const senza = render(<PuntoSpillo tipo="seme-bramosia" colore="#c85cff" />);
    const cerchio = senza.container.querySelector('.spillo-mappa__punto') as HTMLElement;
    expect(cerchio.style.background).toBe('rgb(200, 92, 255)');
    expect(cerchio.querySelector('svg')).not.toBeNull();
  });
});
