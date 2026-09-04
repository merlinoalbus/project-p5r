// @vitest-environment jsdom
// ============================================================
// Test DataP5 — cartiglio della data con nome accessibile completo
// ============================================================

import { render, screen } from '@testing-library/react';
import { DataP5 } from './DataP5';

describe('DataP5', () => {
  it('mostra il giorno grande, il mese e il giorno della settimana con nome accessibile completo', () => {
    render(<DataP5 data="04-09" giornoSettimana="Sabato" />);
    const img = screen.getByRole('img', { name: '9 aprile, Sabato' });
    expect(img.querySelector('.data-p5__giorno')).toHaveTextContent('9');
    expect(img.querySelector('.data-p5__mese')).toHaveTextContent('aprile');
    expect(img.querySelector('.data-p5__settimana')).toHaveTextContent('Sabato');
  });

  it('senza giorno della settimana e con evidenza applica solo le classi previste', () => {
    render(<DataP5 data="12-24" compatta evidenzia />);
    const img = screen.getByRole('img', { name: '24 dicembre' });
    expect(img.className).toContain('data-p5--compatta');
    expect(img.className).toContain('data-p5--evidenza');
    expect(img.querySelector('.data-p5__settimana')).toBeNull();
  });
});
