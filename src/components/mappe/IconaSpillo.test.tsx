// @vitest-environment jsdom
// ============================================================
// Test SpilloGrafico / PuntoSpillo — lo spillo lo costruisce l'app: goccia del colore del tipo con
// dentro la figura consegnata, o il disegno di riserva quando l'asset manca
// ============================================================

import { render } from '@testing-library/react';
import { PuntoSpillo, SpilloGrafico } from './IconaSpillo';

const { useAsset } = vi.hoisted(() => ({ useAsset: vi.fn() }));
vi.mock('../../stores/assetStore', () => ({ useAsset, useAssetMulti: vi.fn(() => []), useAssetStore: vi.fn() }));
vi.mock('../shared/AssetImg', () => ({ AssetImg: ({ fallback }: { fallback: React.ReactNode }) => <>{fallback}</> }));

describe('SpilloGrafico', () => {
  it('la goccia porta il colore del tipo e dentro ci sta la figura', () => {
    // Gli asset `ui/spillo-<tipo>` non sono più uno spillo finito: sono solo la figura, su alfa
    // vera. Colore, misura, bordo e punta li mette il codice, perché cambiano con lo stato della
    // partita e con lo zoom e dentro un PNG non potrebbero cambiare.
    useAsset.mockReturnValue('/asset/ui/spillo-nemico.png');
    const { container } = render(<SpilloGrafico tipo="nemico" colore="#b0b0c0" altezza={40} />);
    const goccia = container.querySelector('.spillo-mappa__goccia') as HTMLElement;
    expect(goccia).not.toBeNull();
    expect(goccia.style.getPropertyValue('--colore-spillo')).toBe('#b0b0c0');
    expect(goccia.style.width).toBe('40px');
    const img = container.querySelector('img.spillo-mappa__disegno') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/asset/ui/spillo-nemico.png');
    // la figura sta dentro alla goccia, non al posto suo
    expect(goccia.contains(img)).toBe(true);
    // e ci sta dentro: più piccola del corpo che la contiene
    expect(parseInt(img.style.width, 10)).toBeLessThan(40);
    expect(useAsset).toHaveBeenCalledWith('ui/spillo-nemico');
  });

  it('senza asset la goccia resta, col disegno di riserva', () => {
    useAsset.mockReturnValue(null);
    const { container } = render(<SpilloGrafico tipo="forziere" colore="#eab308" />);
    const goccia = container.querySelector('.spillo-mappa__goccia') as HTMLElement;
    expect(goccia.style.getPropertyValue('--colore-spillo')).toBe('#eab308');
    expect(goccia.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('PuntoSpillo', () => {
  it('in legenda il colore c’è anche con la figura: senza, il pallino non direbbe qual è', () => {
    useAsset.mockReturnValue('/asset/ui/spillo-seme-bramosia.png');
    const con = render(<PuntoSpillo tipo="seme-bramosia" colore="#c85cff" grande />);
    const cerchio = con.container.querySelector('.spillo-mappa__punto--grande') as HTMLElement;
    expect(cerchio.style.background).toBe('rgb(200, 92, 255)');
    expect(cerchio.querySelector('img.spillo-mappa__disegno')).not.toBeNull();
    useAsset.mockReturnValue(null);
    const senza = render(<PuntoSpillo tipo="seme-bramosia" colore="#c85cff" />);
    const piccolo = senza.container.querySelector('.spillo-mappa__punto') as HTMLElement;
    expect(piccolo.style.background).toBe('rgb(200, 92, 255)');
    expect(piccolo.querySelector('svg')).not.toBeNull();
  });
});
