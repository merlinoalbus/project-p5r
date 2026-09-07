/** @vitest-environment jsdom */

// ============================================================
// IconaCategoria — l'illustrazione vince sul cartiglio, e le chiavi dei dati la trovano
// ============================================================
//
// Il secondo caso è quello che è costato: le illustrazioni si chiamano al plurale
// (`categoria-armi`), i dati parlano al singolare (`arma`), e per un po' le 143 armi del catalogo
// hanno mostrato il cartiglio di riserva pur avendo la figura già consegnata.

import { render, screen } from '@testing-library/react';
import { IconaCategoria } from './IconaCategoria';
import { chiaveCategoria } from '../../utils/categorie';
import { useAssetStore } from '../../stores/assetStore';
import { usePreferenzeStore } from '../../stores/preferenzeStore';

const manifest = (chiavi: string[]) => ({
  generato: 'T', totale: chiavi.length,
  file: Object.fromEntries(chiavi.map((k) => [`ui/categoria-${k}`, `/asset/ui/categoria-${k}.png`])),
});

beforeEach(() => {
  usePreferenzeStore.setState({ graficaPredefinita: true });
  useAssetStore.setState({ manifest: null, caricato: true, mancanti: {} });
});

describe('IconaCategoria', () => {
  it('senza asset resta il cartiglio col tratto, con l’asset mostra l’illustrazione', () => {
    const { container, rerender } = render(<IconaCategoria categoria="armi" etichetta="Armi" />);
    expect(container.querySelector('.icona-categoria')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();

    useAssetStore.setState({ manifest: manifest(['armi']), caricato: true, mancanti: {} });
    rerender(<IconaCategoria categoria="armi" etichetta="Armi" />);
    expect(container.querySelector('.icona-categoria')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/asset/ui/categoria-armi.png');
    expect(screen.getByRole('img', { name: 'Armi' })).toBeInTheDocument();
  });

  it('le chiavi dei dati trovano l’illustrazione della loro famiglia', () => {
    expect(chiaveCategoria('arma')).toBe('armi');
    expect(chiaveCategoria('protezione')).toBe('protezioni');
    expect(chiaveCategoria('accessorio')).toBe('accessori');
    expect(chiaveCategoria('regalo')).toBe('regali');
    expect(chiaveCategoria('materiale')).toBe('materiali');
    expect(chiaveCategoria('abito')).toBe('abiti');
    expect(chiaveCategoria('libro')).toBe('libri');
    expect(chiaveCategoria('lettura')).toBe('libri');
    expect(chiaveCategoria('lavoro')).toBe('lavori');
    expect(chiaveCategoria('mini-gioco')).toBe('minigiochi');
    expect(chiaveCategoria('videogioco')).toBe('minigiochi');
    // e una chiave che è già quella giusta non viene toccata
    expect(chiaveCategoria('esplorazione')).toBe('esplorazione');
  });

  it('la categoria di un articolo al singolare mostra l’illustrazione al plurale', () => {
    useAssetStore.setState({ manifest: manifest(['armi', 'protezioni']), caricato: true, mancanti: {} });
    const { container } = render(<IconaCategoria categoria="arma" etichetta="Arma" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/asset/ui/categoria-armi.png');
  });
});
