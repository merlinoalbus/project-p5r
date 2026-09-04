// @vitest-environment jsdom
// ============================================================
// Test TestoRipiegabile — sintesi alla fine di frase o parola, espansione a richiesta
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { TestoRipiegabile } from './TestoRipiegabile';
import { sintesi } from '../../utils/testoBreve';

describe('sintesi', () => {
  it('lascia intatti i testi brevi e taglia i lunghi alla fine di una frase', () => {
    expect(sintesi('Sblocco 12 aprile.')).toBe('Sblocco 12 aprile.');
    const lungo = 'Livello non indicato esplicitamente dalla guida. Il boss finale è di livello 11 e conviene arrivare almeno al livello 10 prima dello scontro finale.';
    expect(sintesi(lungo, 80)).toBe('Livello non indicato esplicitamente dalla guida.');
  });

  it('senza fine di frase taglia all\'ultima parola intera e aggiunge i puntini', () => {
    const s = sintesi('una due tre quattro cinque sei sette otto nove dieci undici dodici tredici', 40);
    expect(s.endsWith('…')).toBe(true);
    expect(s.length).toBeLessThanOrEqual(41);
    expect(s).not.toMatch(/\s…$/);
  });
});

describe('TestoRipiegabile', () => {
  it('mostra la versione breve con «altro» e si espande al tocco', () => {
    const testo = 'Prima frase abbastanza lunga da superare il limite. Seconda frase con il resto del dettaglio che compare solo a richiesta.';
    render(<TestoRipiegabile testo={testo} massimo={60} />);
    expect(screen.getByText(/Prima frase abbastanza lunga/)).not.toHaveTextContent('Seconda frase');
    fireEvent.click(screen.getByRole('button', { name: 'altro' }));
    expect(screen.getByText(/Seconda frase con il resto/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'meno' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('senza bisogno di ripiegare non mostra il pulsante', () => {
    render(<TestoRipiegabile testo="Breve." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
