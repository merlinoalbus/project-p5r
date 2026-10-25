/** @vitest-environment jsdom */
// ============================================================
// Test ElencoRichieste — il comando a tre stati (— / Accettata / Fatta) e, in «Modifica la guida», correzione e area
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ElencoRichieste } from './ElencoRichieste';
import { selettore } from '../../../test/selettore';
import type { RichiestaDelDedaloDto } from '../../types';

const api = vi.hoisted(() => ({ impostaStatoRichiesta: vi.fn(), collocaRichiesta: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

const richieste: RichiestaDelDedaloDto[] = [{ chiave: 'r1', nome: 'Un ex appiccicoso', stato: 'accettata' }, { chiave: 'r2', nome: 'Il treno fantasma', stato: 'completata' }];

/** Disegna l'elenco e restituisce i richiami. */
function monta(partitaId: number | null = 4, modifica = false) {
  const r = { onRichiesta: vi.fn(), onModifica: vi.fn(), onRicarica: vi.fn().mockResolvedValue(undefined) };
  render(<MemoryRouter><ElencoRichieste richieste={richieste} dedalo="mementos-01-qimranut" area="q-1" aree={[{ chiave: 'q-1', nome: 'Banchina' }]} partitaId={partitaId} modifica={modifica} {...r} /></MemoryRouter>);
  return r;
}

beforeEach(() => { vi.clearAllMocks(); });

it('ogni Richiesta ha lo stato scelto fra tre; scegliere «—» toglie lo stato; la fatta è barrata', async () => {
  const { onRichiesta } = monta();
  const prima = screen.getByRole('radiogroup', { name: 'Stato di «Un ex appiccicoso»' });
  expect(within(prima).getAllByRole('radio').map((r) => `${r.textContent}:${r.getAttribute('aria-checked')}`)).toEqual(['—:false', 'Accettata:true', 'Fatta:false']);
  expect(screen.getByRole('link', { name: 'Il treno fantasma' })).toHaveClass('line-through');
  // lo stato già scelto non riparte
  fireEvent.click(within(prima).getByRole('radio', { name: 'Accettata' }));
  expect(api.impostaStatoRichiesta).not.toHaveBeenCalled();
  api.impostaStatoRichiesta.mockResolvedValue({ chiave: 'r1', stato: null });
  fireEvent.click(within(prima).getByRole('radio', { name: '—' }));
  await waitFor(() => expect(onRichiesta).toHaveBeenCalledWith('r1', null));
  expect(api.impostaStatoRichiesta).toHaveBeenCalledWith(4, 'r1', null);
  // il nome porta alla pagina delle Richieste del dedalo
  expect(screen.getByRole('link', { name: 'Un ex appiccicoso' })).toHaveAttribute('href', '/guida/richieste?dedalo=mementos-01-qimranut');
});

it('da tastiera: Tab entra sullo stato scelto, le frecce scelgono il seguente o il precedente (in giro)', async () => {
  const { onRichiesta } = monta();
  const gruppo = screen.getByRole('radiogroup', { name: 'Stato di «Un ex appiccicoso»' });
  expect(within(gruppo).getAllByRole('radio').map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
  api.impostaStatoRichiesta.mockResolvedValue({ chiave: 'r1', stato: 'completata' });
  fireEvent.keyDown(within(gruppo).getByRole('radio', { name: 'Accettata' }), { key: 'ArrowRight' });
  await waitFor(() => expect(onRichiesta).toHaveBeenCalledWith('r1', 'completata'));
  expect(api.impostaStatoRichiesta).toHaveBeenLastCalledWith(4, 'r1', 'completata');
  expect(document.activeElement).toBe(within(gruppo).getByRole('radio', { name: 'Fatta' }));
  // dalla seconda Richiesta (Fatta) la freccia avanti torna a «—»
  api.impostaStatoRichiesta.mockResolvedValue({ chiave: 'r2', stato: null });
  const seconda = screen.getByRole('radiogroup', { name: 'Stato di «Il treno fantasma»' });
  fireEvent.keyDown(within(seconda).getByRole('radio', { name: 'Fatta' }), { key: 'ArrowRight' });
  await waitFor(() => expect(api.impostaStatoRichiesta).toHaveBeenLastCalledWith(4, 'r2', null));
  fireEvent.keyDown(within(seconda).getByRole('radio', { name: 'Fatta' }), { key: 'Tab' });
  expect(api.impostaStatoRichiesta).toHaveBeenCalledTimes(2);
});

it('senza partita niente stati; in «Modifica la guida» «Modifica» e l\'area', () => {
  monta(null);
  expect(screen.queryByRole('radiogroup')).toBeNull();
  expect(screen.queryByRole('button', { name: /^Modifica la Richiesta/ })).toBeNull();
  document.body.innerHTML = '';
  const { onModifica } = monta(4, true);
  fireEvent.click(screen.getByRole('button', { name: 'Modifica la Richiesta «Il treno fantasma»' }));
  expect(onModifica).toHaveBeenCalledWith('r2');
  expect(selettore('Area di Un ex appiccicoso')).toBeInTheDocument();
});
