// @vitest-environment jsdom
// ============================================================
// Test SelettoreIcone — tessere a scelta singola (radiogroup) e multipla (interruttori)
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { SelettoreIcone } from './SelettoreIcone';

const opzioni = [{ chiave: 'arma', nome: 'Arma', conteggio: 3 }, { chiave: 'libro', nome: 'Libro' }, { chiave: 'cibo', nome: 'Cibo', icona: <span>🍜</span> }];

it('a scelta singola è un radiogroup: una tessera accesa, il clic sceglie', () => {
  const onCambia = vi.fn();
  render(<SelettoreIcone etichetta="Categoria" valore="arma" opzioni={opzioni} onCambia={onCambia} />);
  const gruppo = screen.getByRole('radiogroup', { name: 'Categoria' });
  expect(gruppo).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Arma 3' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('radio', { name: 'Libro' })).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(screen.getByRole('radio', { name: 'Libro' }));
  expect(onCambia).toHaveBeenCalledWith('libro');
  // la figura propria si mostra al posto dell'illustrazione di categoria
  expect(screen.getByRole('radio', { name: 'Cibo' })).toHaveTextContent('🍜');
});

it('a scelta multipla è un gruppo di interruttori: il clic accende e spegne', () => {
  const onCambia = vi.fn();
  render(<SelettoreIcone multiplo etichetta="Categorie" valore={['arma']} opzioni={opzioni} onCambia={onCambia} />);
  expect(screen.getByRole('group', { name: 'Categorie' })).toBeInTheDocument();
  expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.getByRole('button', { name: 'Arma 3' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Libro' }));
  expect(onCambia).toHaveBeenLastCalledWith(['arma', 'libro']);
  fireEvent.click(screen.getByRole('button', { name: 'Arma 3' }));
  expect(onCambia).toHaveBeenLastCalledWith([]);
});

it('disabilitato non risponde', () => {
  const onCambia = vi.fn();
  render(<SelettoreIcone etichetta="Categoria" valore="arma" opzioni={opzioni} onCambia={onCambia} disabilitato />);
  expect(screen.getByRole('radio', { name: 'Libro' })).toBeDisabled();
  fireEvent.click(screen.getByRole('radio', { name: 'Libro' }));
  expect(onCambia).not.toHaveBeenCalled();
});
