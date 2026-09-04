// @vitest-environment jsdom
// ============================================================
// Test StellaCinque — geometria del poligono, etichette ai vertici, interazione
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { StellaCinque } from './StellaCinque';
import { poligonoStella, puntoStella } from './stellaGeometria';
import { useAssetStore } from '../../stores/assetStore';
import { usePreferenzeStore } from '../../stores/preferenzeStore';

const ASSI = [
  { chiave: 'conoscenza', etichetta: 'Conoscenza', valore: 1, testo: 'Rango 5' },
  { chiave: 'fascino', etichetta: 'Fascino', valore: 0.5, testo: 'Rango 3' },
  { chiave: 'coraggio', etichetta: 'Coraggio', valore: 0.25 },
  { chiave: 'gentilezza', etichetta: 'Gentilezza', valore: 0 },
  { chiave: 'perizia', etichetta: 'Perizia', valore: 2 },
];

beforeEach(() => {
  useAssetStore.setState({ manifest: null, caricato: false, mancanti: {} });
  usePreferenzeStore.setState({ graficaPredefinita: true });
});

describe('StellaCinque', () => {
  it('calcola i vertici: il primo asse punta in alto e il poligono pieno coincide con l\'anello esterno', () => {
    const [x, y] = puntoStella(0, 5, 34);
    expect(x).toBeCloseTo(50, 5);
    expect(y).toBeCloseTo(16, 5);
    expect(poligonoStella([34, 34, 34, 34, 34]).split(' ')).toHaveLength(5);
    expect(poligonoStella([34, 34, 34, 34, 34]).startsWith('50,16 ')).toBe(true);
  });

  it('senza animazione disegna subito i valori (limitati fra 0 e 1) e le etichette con il testo', () => {
    render(<StellaCinque assi={ASSI} etichettaAria="Doti sociali" animato={false} dimensione={200} />);
    const poligono = screen.getByTestId('stella-valori');
    const punti = poligono.getAttribute('points')!.split(' ');
    expect(punti).toHaveLength(5);
    expect(punti[0]).toBe('50,16'); // valore 1 → anello esterno
    expect(punti[3]).toBe('50,50'); // valore 0 → centro
    expect(punti[4]).toBe(poligonoStella([34, 34, 34, 34, 34]).split(' ')[4]); // valore 2 → limitato a 1
    expect(screen.getByRole('img', { name: /Doti sociali: Conoscenza: 100%, Fascino: 50%/ })).toBeInTheDocument();
    expect(screen.getByText('Rango 5')).toBeInTheDocument();
    expect(screen.getByText('Perizia')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('con onScegli i vertici sono pulsanti e riportano la selezione', () => {
    const scelto = vi.fn();
    render(<StellaCinque assi={ASSI} etichettaAria="Doti" animato={false} onScegli={scelto} selezionato="fascino" />);
    const bottoni = screen.getAllByRole('button');
    expect(bottoni).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Fascino' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Coraggio' }));
    expect(scelto).toHaveBeenCalledWith('coraggio');
  });

  it('usa il badge dall\'asset quando esiste nel manifest, altrimenti il testo', () => {
    useAssetStore.setState({ manifest: { generato: 'T', totale: 1, file: { 'doti/coraggio-senza-testo': '/asset/doti/coraggio-senza-testo.png' } }, caricato: true });
    render(<StellaCinque assi={ASSI.map((a) => ({ ...a, badge: `doti/${a.chiave}-senza-testo` }))} etichettaAria="Doti" animato={false} />);
    expect(document.querySelector('img[src="/asset/doti/coraggio-senza-testo.png"]')).not.toBeNull();
    expect(screen.queryByText('Coraggio')).not.toBeInTheDocument();
    expect(screen.getByText('Fascino')).toBeInTheDocument();
  });
});
