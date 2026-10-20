/** @vitest-environment jsdom */
// ============================================================
// Test MappaIncorporata — le classi del riquadro valgono per il visore, non per la scheda senza planimetria
// ============================================================
//
// La scheda del Palazzo dà al visore un'altezza che cambia con lo schermo (`classeVisore`, 2026-09-30). Una mappa
// senza planimetria non ha visore ma una scheda con i collegamenti, che deve restare alta quanto il suo contenuto:
// con l'altezza fissa del visore, un elenco lungo di figli sarebbe uscito dalla scheda (rilievo della revisione).
// ============================================================

import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MappaIncorporata } from './MappaIncorporata';

// `gesti`: raccolto e stato della voce del gancio della partita, e le funzioni che il visore riceve (per provare §8.6)
const { risolviMappa, haPlanimetria, figli, gesti } = vi.hoisted(() => ({ risolviMappa: vi.fn(), haPlanimetria: vi.fn(), figli: { elenco: [{ chiave: 'm-figlia', nome: 'Stanza figlia' }] as Array<{ chiave: string; nome: string }> },
  gesti: { raccolto: vi.fn(), statoPunto: vi.fn(), opz: null as null | { infiltrazione?: string | null },
    visore: null as null | { onRaccolto?: (s: unknown, v: boolean) => Promise<void>; onStatoPunto?: (s: unknown, voce: string, stato: string | null) => Promise<void>; onContesto?: (k: string) => void } } }));
vi.mock('../../services/api', (vero) => moduloApi(vero, { risolviMappa }));
vi.mock('../../utils/haPlanimetria', () => ({ haPlanimetria }));
vi.mock('../../hooks/useMappaPartita', () => ({
  useMappaPartita: (_c: string, _p: number | null, opz: { infiltrazione?: string | null }) => {
    gesti.opz = opz;
    return { mappa: { chiave: 'm-sala', nome: 'Sala', figli: figli.elenco, spilli: [] }, caricamento: false, errore: null, ricarica: vi.fn(), raccolto: gesti.raccolto, statoPunto: gesti.statoPunto, acquisto: vi.fn() };
  },
}));
vi.mock('../../utils/presentazioneMappa', () => ({ presentaMappa: (m: unknown) => m }));
vi.mock('./VisoreMappa', () => ({ VisoreMappa: (p: NonNullable<typeof gesti.visore>) => { gesti.visore = p; return <div data-testid="visore">Visore</div>; } }));

/** Disegna la mappa incorporata m-sala con le classi di riquadro «h-[300px] xl:flex-1» da passare al visore. */
const monta = () => render(<MemoryRouter><MappaIncorporata chiave="m-sala" classeVisore="h-[300px] xl:flex-1" /></MemoryRouter>);

beforeEach(() => { vi.clearAllMocks(); figli.elenco = [{ chiave: 'm-figlia', nome: 'Stanza figlia' }]; risolviMappa.mockResolvedValue({ tipo: 'mappa', mappa: 'm-sala' }); });

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

it('una planimetria senza immagine e senza stanze porta dritti a caricarne l’immagine; una con stanze no (2026-10-18)', async () => {
  haPlanimetria.mockReturnValue(false);
  figli.elenco = [];
  monta();
  expect(await screen.findByRole('link', { name: /Carica l’immagine/ })).toHaveAttribute('href', '/guida/mappe/m-sala/modifica?sezione=mappa');
  cleanup();
  figli.elenco = [{ chiave: 'm-figlia', nome: 'Stanza figlia' }];
  monta();
  expect(await screen.findByRole('link', { name: 'Stanza figlia' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Carica l’immagine/ })).toBeNull();
});

it('una versione nuova (stati cambiati dalla pagina) non rifà la risoluzione e non smonta il visore: zoom e posizione restano', async () => {
  haPlanimetria.mockReturnValue(true);
  const { rerender } = render(<MemoryRouter><MappaIncorporata chiave="m-sala" versione={1} /></MemoryRouter>);
  const visore = await screen.findByTestId('visore');
  rerender(<MemoryRouter><MappaIncorporata chiave="m-sala" versione={2} /></MemoryRouter>);
  expect(screen.getByTestId('visore')).toBe(visore);
  expect(risolviMappa).toHaveBeenCalledTimes(1);
});

// L4 §8.6: dal popup del pin, togliere il segno al pin o riaprire una sua voce può riaprire un Enigma risolto; la pagina chiede conferma prima
// (`primaDiRiaprire`): con «Annulla» non parte niente; segnare non chiede
it('§8.6: prima di togliere il segno dal popup si chiede alla pagina; «Annulla» non tocca niente, segnare non chiede', async () => {
  haPlanimetria.mockReturnValue(true);
  const primaDiRiaprire = vi.fn().mockResolvedValue(false);
  render(<MemoryRouter><MappaIncorporata chiave="m-sala" primaDiRiaprire={primaDiRiaprire} /></MemoryRouter>);
  await screen.findByTestId('visore');
  const pin = { id: 1 };
  await gesti.visore!.onRaccolto!(pin, false);
  await gesti.visore!.onStatoPunto!(pin, 'e1-a', null);
  expect(primaDiRiaprire).toHaveBeenNthCalledWith(1, pin, null);
  expect(primaDiRiaprire).toHaveBeenNthCalledWith(2, pin, 'e1-a');
  expect(gesti.raccolto).not.toHaveBeenCalled();
  expect(gesti.statoPunto).not.toHaveBeenCalled();
  await gesti.visore!.onRaccolto!(pin, true);
  await gesti.visore!.onStatoPunto!(pin, 'e1-a', 'ottenuto');
  expect(gesti.raccolto).toHaveBeenCalledWith(pin, true);
  expect(gesti.statoPunto).toHaveBeenCalledWith(pin, 'e1-a', 'ottenuto');
  expect(primaDiRiaprire).toHaveBeenCalledTimes(2);
  primaDiRiaprire.mockResolvedValue(true);
  await gesti.visore!.onRaccolto!(pin, false);
  expect(gesti.raccolto).toHaveBeenCalledWith(pin, false);
});

// L4 §1.4, §4.2: la mappa si legge nell'infiltrazione guardata dalla pagina; il popup ne sceglie un'altra (per i pin di più infiltrazioni), e
// cambiando l'infiltrazione guardata vale di nuovo quella della pagina
it('§4.2: il contesto è l’infiltrazione della pagina; il popup ne sceglie un’altra; la pagina che cambia infiltrazione lo riporta alla sua', async () => {
  haPlanimetria.mockReturnValue(true);
  // con una partita: senza, lo stato non c'è e il popup non sceglie l'infiltrazione
  const { rerender } = render(<MemoryRouter><MappaIncorporata chiave="m-sala" partitaId={4} infiltrazione="k-01" /></MemoryRouter>);
  await screen.findByTestId('visore');
  expect(gesti.opz?.infiltrazione).toBe('k-01');
  await act(async () => { gesti.visore!.onContesto!('k-04'); });
  expect(gesti.opz?.infiltrazione).toBe('k-04');
  rerender(<MemoryRouter><MappaIncorporata chiave="m-sala" partitaId={4} infiltrazione="k-05" /></MemoryRouter>);
  expect(gesti.opz?.infiltrazione).toBe('k-05');
});
