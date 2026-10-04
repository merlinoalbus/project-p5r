/** @vitest-environment jsdom */
// ============================================================
// Test RaccoltaPlanimetrie — la spunta di ogni collezionabile dice la parola del suo tipo (2026-10-03)
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RaccoltaPlanimetrie } from './RaccoltaPlanimetrie';

vi.mock('../../services/api', (vero) => moduloApi(vero, { impostaSpilloRaccolto: vi.fn() }));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

const spillo = (id: number, tipo: string, nome: string) => ({ id, uid: `u${id}`, tipo, nome, colore: '#eab308', raccolto: false });

it('ogni collezionabile si segna con la parola del suo tipo: boss «Sconfitto», forziere «Aperto», tesoro «Rubato», seme «Raccolto» (scelte dell’utente)', () => {
  render(
    <MemoryRouter>
      <RaccoltaPlanimetrie partitaId={7} onRaccolto={vi.fn()} planimetrie={[{ chiave: 'm-trono', nome: 'Palazzo di Kamoshida › Trono', n: 5, presi: 0, spilli: [spillo(1, 'boss', 'Asmodeus'), spillo(2, 'miniboss', 'Guardia'), spillo(3, 'forziere', 'Forziere'), spillo(4, 'tesoro-palazzo', 'Corona'), spillo(5, 'seme-bramosia', 'Seme')] }]} />
    </MemoryRouter>,
  );
  expect(screen.getByRole('checkbox', { name: 'Asmodeus 1 di Trono sconfitto' }).closest('label')).toHaveTextContent('Sconfitto');
  expect(screen.getByRole('checkbox', { name: 'Guardia 1 di Trono sconfitto' }).closest('label')).toHaveTextContent('Sconfitto');
  expect(screen.getByRole('checkbox', { name: 'Forziere 1 di Trono aperto' }).closest('label')).toHaveTextContent('Aperto');
  expect(screen.getByRole('checkbox', { name: 'Corona 1 di Trono rubato' }).closest('label')).toHaveTextContent('Rubato');
  expect(screen.getByRole('checkbox', { name: 'Seme 1 di Trono raccolto' }).closest('label')).toHaveTextContent('Raccolto');
});
