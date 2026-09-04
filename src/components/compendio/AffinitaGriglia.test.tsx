// @vitest-environment jsdom
// ============================================================
// Test AffinitaGriglia — rese italiane e stili per codice di affinità
// ============================================================

import { render, screen } from '@testing-library/react';
import { AffinitaGriglia } from './AffinitaGriglia';
import type { AffinitaDto } from '../../types';

const affinita: AffinitaDto[] = [
  { elemento: 'fire', elementoNome: 'Fuoco', elementoSigla: 'Fuo', codice: 'wk', codiceNome: 'Debole', codiceSigla: 'Deb' },
  { elemento: 'ice', elementoNome: 'Ghiaccio', elementoSigla: 'Ghi', codice: 'ab', codiceNome: 'Assorbe', codiceSigla: 'Ass' },
  { elemento: 'wind', elementoNome: 'Vento', elementoSigla: 'Ven', codice: '-', codiceNome: 'Normale', codiceSigla: '—' },
];

describe('AffinitaGriglia', () => {
  it('mostra nome dell\'elemento e resa del codice in italiano', () => {
    render(<AffinitaGriglia affinita={affinita} />);
    expect(screen.getByText('Fuoco')).toBeInTheDocument();
    expect(screen.getByText('Debole')).toBeInTheDocument();
    expect(screen.getByText('Assorbe')).toBeInTheDocument();
    expect(screen.getByTitle('Vento: Normale')).toBeInTheDocument();
  });

  it('in versione compatta usa le sigle e il trattino per Normale', () => {
    render(<AffinitaGriglia affinita={affinita} compatta />);
    expect(screen.getByText('Fuo')).toBeInTheDocument();
    expect(screen.getByText('Deb')).toBeInTheDocument();
    expect(screen.getByTitle('Vento: Normale')).toHaveTextContent('—');
  });
});
