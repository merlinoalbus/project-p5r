/** @vitest-environment jsdom */
// ============================================================
// Test TimbriDelDedalo — un tocco per timbro (progetto approvato del 2026-10-12) e il totale del dedalo in «Modifica la guida» (L10-02:
// prima per area, `TimbriDellArea`)
// ============================================================

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TimbriDelDedalo } from './TimbriDelDedalo';
import { timbriDopoIlTocco } from '../../utils/dedali';
import type { DedaloDto } from '../../types';

const api = vi.hoisted(() => ({ impostaTimbri: vi.fn(), aggiornaArea: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

/** Disegna i timbri di un dedalo (null = la guida non dà un numero) e restituisce i richiami. */
function monta(timbri: DedaloDto['timbri'], partitaId: number | null = 4, modifica = false, fonte: string | null = 'guida, Dedalo di Aiyatsbus, riga 202') {
  const onTimbri = vi.fn();
  const onRicarica = vi.fn().mockResolvedValue(undefined);
  render(<TimbriDelDedalo dedalo={{ chiave: 'mementos-02-aiyatsbus', nome: 'Dedalo di Aiyatsbus', timbri, timbriFonte: fonte }} partitaId={partitaId} modifica={modifica} onTimbri={onTimbri} onRicarica={onRicarica} />);
  return { onTimbri, onRicarica };
}

beforeEach(() => { vi.clearAllMocks(); });

it('il tocco sul timbro k porta a k; sull\'ultimo preso torna indietro di uno', () => {
  expect(timbriDopoIlTocco(3, 0)).toBe(3);
  expect(timbriDopoIlTocco(3, 5)).toBe(3);
  expect(timbriDopoIlTocco(5, 5)).toBe(4);
  expect(timbriDopoIlTocco(1, 1)).toBe(0);
});

it('una fila di timbri del dedalo, presi e da prendere; un tocco li segna dalla risposta del server', async () => {
  const { onTimbri } = monta({ totale: 4, raccolti: 2 });
  expect(screen.getByRole('heading', { name: 'Timbri · 2/4' })).toBeInTheDocument();
  expect(screen.getByText('un tocco per timbro')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^Timbro/ }).map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'false', 'false']);
  api.impostaTimbri.mockResolvedValue({ dedalo: 'mementos-02-aiyatsbus', raccolti: 1, totale: 4, completato: false });
  fireEvent.click(screen.getByRole('button', { name: 'Timbro 2 di 4: preso' }));
  await waitFor(() => expect(onTimbri).toHaveBeenCalledWith('mementos-02-aiyatsbus', 1));
  expect(api.impostaTimbri).toHaveBeenCalledWith(4, 'mementos-02-aiyatsbus', 1);
});

it('senza numero della guida: dice il motivo e non invita a inventarlo; in «Modifica la guida» il totale si imposta', async () => {
  monta(null, 4, false, null);
  expect(screen.getByText('La guida non dice quanti timbri ha questo dedalo: qui non si contano.')).toBeInTheDocument();
  expect(screen.queryByText(/Modifica la guida/)).toBeNull();
  expect(screen.queryByRole('button', { name: /^Timbro/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /Imposta il totale/ })).toBeNull();
  document.body.innerHTML = '';
  const { onRicarica } = monta(null, 4, true, null);
  fireEvent.click(screen.getByRole('button', { name: 'Imposta il totale dei timbri di Dedalo di Aiyatsbus' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Timbri del dedalo (vuoto = la guida non dà un numero)' }), { target: { value: '6' } });
  api.aggiornaArea.mockResolvedValue({});
  fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
  await waitFor(() => expect(api.aggiornaArea).toHaveBeenCalledWith('mementos-02-aiyatsbus', { timbriTotale: 6 }));
  await waitFor(() => expect(onRicarica).toHaveBeenCalled());
});

it('un totale di zero: nessun timbro da toccare; senza partita i timbri non si toccano', () => {
  monta({ totale: 0, raccolti: 0 });
  expect(screen.getByText('nessun timbro')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Timbro/ })).toBeNull();
  document.body.innerHTML = '';
  monta({ totale: 2, raccolti: null }, null);
  expect(screen.getByRole('heading', { name: 'Timbri · 2' })).toBeInTheDocument();
  for (const b of screen.getAllByRole('button', { name: /^Timbro/ })) expect(b).toBeDisabled();
});
