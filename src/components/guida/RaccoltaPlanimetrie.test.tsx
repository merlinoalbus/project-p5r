/** @vitest-environment jsdom */
// ============================================================
// Test RaccoltaPlanimetrie — la spunta di ogni collezionabile dice la parola del suo tipo (2026-10-03)
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RaccoltaPlanimetrie } from './RaccoltaPlanimetrie';

vi.mock('../../services/api/mappe', () => ({ impostaSpilloRaccolto: vi.fn() }));
vi.mock('../../stores/notificationStore', () => ({ notifica: vi.fn() }));

const spillo = (id: number, tipo: string, nome: string) => ({ id, uid: `u${id}`, tipo, nome, colore: '#eab308', raccolto: false });

it('un boss si segna «Sconfitto», un forziere «Raccolto» (scelta dell’utente: boss e miniboss sconfitti)', () => {
  render(
    <MemoryRouter>
      <RaccoltaPlanimetrie partitaId={7} onRaccolto={vi.fn()} planimetrie={[{ chiave: 'm-trono', nome: 'Palazzo di Kamoshida › Trono', n: 3, presi: 0, spilli: [spillo(1, 'boss', 'Asmodeus'), spillo(2, 'miniboss', 'Guardia'), spillo(3, 'forziere', 'Forziere')] }]} />
    </MemoryRouter>,
  );
  expect(screen.getByRole('checkbox', { name: 'Asmodeus 1 di Trono sconfitto' }).closest('label')).toHaveTextContent('Sconfitto');
  expect(screen.getByRole('checkbox', { name: 'Guardia 1 di Trono sconfitto' }).closest('label')).toHaveTextContent('Sconfitto');
  expect(screen.getByRole('checkbox', { name: 'Forziere 1 di Trono raccolto' }).closest('label')).toHaveTextContent('Raccolto');
});
