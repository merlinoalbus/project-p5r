/** @vitest-environment jsdom */
// ============================================================
// Test TimbriDellArea — un tocco per timbro (progetto approvato del 2026-10-12) e il totale dell'area in «Modifica la guida»
// ============================================================

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TimbriDellArea } from './TimbriDellArea';
import { timbriDopoIlTocco } from '../../utils/dedali';
import type { AreaDedaloDto } from '../../types';

const api = vi.hoisted(() => ({ impostaTimbri: vi.fn(), aggiornaAreaDedalo: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

/** Un'area con i timbri dati (null = totale da impostare). */
const area = (timbri: AreaDedaloDto['timbri']): AreaDedaloDto => ({ chiave: 'aiy-2', ordine: 1, nome: 'Area 2', descrizione: '', timbri, richieste: [], elementi: { totale: 0, fatti: 0 }, completata: false });

/** Disegna la sezione e restituisce i richiami. */
function monta(timbri: AreaDedaloDto['timbri'], partitaId: number | null = 4, modifica = false) {
  const onTimbri = vi.fn();
  const onRicarica = vi.fn().mockResolvedValue(undefined);
  render(<TimbriDellArea area={area(timbri)} partitaId={partitaId} modifica={modifica} onTimbri={onTimbri} onRicarica={onRicarica} />);
  return { onTimbri, onRicarica };
}

beforeEach(() => { vi.clearAllMocks(); });

it('il tocco sul timbro k porta a k; sull\'ultimo preso torna indietro di uno', () => {
  expect(timbriDopoIlTocco(3, 0)).toBe(3);
  expect(timbriDopoIlTocco(3, 5)).toBe(3);
  expect(timbriDopoIlTocco(5, 5)).toBe(4);
  expect(timbriDopoIlTocco(1, 1)).toBe(0);
});

it('una fila di timbri, presi e da prendere; un tocco li segna dalla risposta del server', async () => {
  const { onTimbri } = monta({ totale: 4, raccolti: 2 });
  expect(screen.getByRole('heading', { name: 'Timbri · 2/4' })).toBeInTheDocument();
  expect(screen.getByText('un tocco per timbro')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^Timbro/ }).map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'false', 'false']);
  api.impostaTimbri.mockResolvedValue({ area: 'aiy-2', raccolti: 1, totale: 4, completato: false });
  fireEvent.click(screen.getByRole('button', { name: 'Timbro 2 di 4: preso' }));
  await waitFor(() => expect(onTimbri).toHaveBeenCalledWith('aiy-2', 1));
  expect(api.impostaTimbri).toHaveBeenCalledWith(4, 'aiy-2', 1);
});

it('senza totale: in «Gioca» dice che manca e che i timbri non contano; in «Modifica la guida» lo si imposta', async () => {
  monta(null);
  expect(screen.getByText('totale da impostare')).toBeInTheDocument();
  expect(screen.getByText(/si imposta in «Modifica la guida»\. Finché manca, i timbri non contano\./)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Timbro/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /Imposta il totale/ })).toBeNull();
  document.body.innerHTML = '';
  const { onRicarica } = monta(null, 4, true);
  fireEvent.click(screen.getByRole('button', { name: 'Imposta il totale dei timbri di Area 2' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Timbri dell’area (vuoto = nessuno)' }), { target: { value: '6' } });
  api.aggiornaAreaDedalo.mockResolvedValue({});
  fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
  await waitFor(() => expect(api.aggiornaAreaDedalo).toHaveBeenCalledWith('aiy-2', { timbriTotale: 6 }));
  await waitFor(() => expect(onRicarica).toHaveBeenCalled());
});

it('un totale di zero: nessun timbro da toccare; senza partita i timbri non si toccano', () => {
  monta({ totale: 0, raccolti: 0 });
  expect(screen.getByText('nessun timbro')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Timbro/ })).toBeNull();
  document.body.innerHTML = '';
  monta({ totale: 2, raccolti: null }, null);
  expect(screen.getByRole('heading', { name: 'Timbri · 2' })).toBeInTheDocument();
  expect(screen.getByText('attiva una partita per segnarli')).toBeInTheDocument();
  for (const b of screen.getAllByRole('button', { name: /^Timbro/ })) expect(b).toBeDisabled();
});
