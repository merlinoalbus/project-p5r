// @vitest-environment jsdom
// ============================================================
// Test ModuloLuogo — i giorni si scelgono a chip (giorni_json, migrazione 080), non si scrivono
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { ModuloLuogo } from './ModuloLuogo';

vi.mock('../../../services/api/compendio', () => ({ getQuartieri: vi.fn(async () => [{ chiave: 'shibuya', nome: 'Shibuya' }]) }));

it('mostra i sette giorni come chip e aggiorna giorni_json al tocco', async () => {
  const imposta = vi.fn();
  render(<ModuloLuogo dati={{ nome: 'Untouchable', tipo: 'negozio', quartiere_chiave: 'shibuya', giorni_json: ['giovedi'] }} imposta={imposta} elemento={null} nuovo={false} disabilitato={false} />);
  await screen.findByText('Shibuya');
  const gruppo = screen.getByRole('group', { name: 'Giorni (nessuno = tutti)' });
  const chip = gruppo.querySelectorAll('button');
  expect(chip).toHaveLength(7);
  expect(screen.queryByLabelText('Giorni')).toBeNull(); // nessun campo di testo per i giorni
  const giovedi = [...chip].find((b) => b.textContent === 'giovedì')!;
  expect(giovedi).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click([...chip].find((b) => b.textContent === 'sabato')!);
  expect(imposta).toHaveBeenCalledWith({ giorni_json: ['giovedi', 'sabato'] });
  fireEvent.click(giovedi);
  expect(imposta).toHaveBeenCalledWith({ giorni_json: [] });
});
