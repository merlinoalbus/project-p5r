/** @vitest-environment jsdom */
// ============================================================
// Test MappaIncorporata — le classi del riquadro valgono per il visore, non per la scheda senza planimetria
// ============================================================
//
// La scheda del Palazzo dà al visore un'altezza che cambia con lo schermo (`classeVisore`, 2026-09-30). Una mappa
// senza planimetria non ha visore ma una scheda con i collegamenti, che deve restare alta quanto il suo contenuto:
// con l'altezza fissa del visore, un elenco lungo di figli sarebbe uscito dalla scheda (rilievo della revisione).
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MappaIncorporata } from './MappaIncorporata';

const { risolviMappa, haPlanimetria } = vi.hoisted(() => ({ risolviMappa: vi.fn(), haPlanimetria: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, { risolviMappa }));
vi.mock('../../utils/haPlanimetria', () => ({ haPlanimetria }));
vi.mock('../../hooks/useMappaPartita', () => ({
  useMappaPartita: () => ({ mappa: { chiave: 'm-sala', nome: 'Sala', figli: [{ chiave: 'm-figlia', nome: 'Stanza figlia' }], spilli: [] }, caricamento: false, errore: null, ricarica: vi.fn(), raccolto: vi.fn(), statoPunto: vi.fn(), acquisto: vi.fn() }),
}));
vi.mock('../../utils/presentazioneMappa', () => ({ presentaMappa: (m: unknown) => m }));
vi.mock('./VisoreMappa', () => ({ VisoreMappa: () => <div data-testid="visore">Visore</div> }));

/** Disegna la mappa incorporata m-sala con le classi di riquadro «h-[300px] xl:flex-1» da passare al visore. */
const monta = () => render(<MemoryRouter><MappaIncorporata chiave="m-sala" classeVisore="h-[300px] xl:flex-1" /></MemoryRouter>);

beforeEach(() => { vi.clearAllMocks(); risolviMappa.mockResolvedValue({ tipo: 'mappa', mappa: 'm-sala' }); });

it('con la planimetria, le classi del riquadro vanno al contenitore del visore e non c’è altezza in linea', async () => {
  haPlanimetria.mockReturnValue(true);
  monta();
  const riquadro = (await screen.findByTestId('visore')).parentElement!;
  expect(riquadro).toHaveClass('h-[300px]', 'xl:flex-1');
  expect(riquadro.style.height).toBe('');
});

it('senza planimetria la scheda dei collegamenti non riceve l’altezza del visore', async () => {
  haPlanimetria.mockReturnValue(false);
  monta();
  const scheda = (await screen.findByRole('link', { name: 'Stanza figlia' })).closest('section')!;
  expect(scheda).not.toHaveClass('h-[300px]');
  expect(scheda).not.toHaveClass('xl:flex-1');
  expect(scheda.style.height).toBe('');
});
