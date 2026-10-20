/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test delle finestre delle Aree (L2, 2026-10-20) — i riscontri di UX2-9: il punto scelto detto a parole (a), i comandi delle
// versioni che vanno a capo interi (c), il pin appena segnato passato alla pagina perché lo mostri selezionato (d)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FinestraAggiungiArea } from './FinestraAggiungiArea';
import { FinestraModificaArea } from './FinestraModificaArea';
import { AreeDelQuartiere } from './AreeDelQuartiere';
import { useAssetStore } from '../../stores/assetStore';
import type { AreaDettaglioDto, AreaRiassuntoDto, PlanimetriaAreaDto, QuartiereDettaglioDto } from '../../types';

const api = vi.hoisted(() => ({ creaAreaMondo: vi.fn(), creaSpillo: vi.fn(), riordinaAree: vi.fn(), aggiornaAreaMondo: vi.fn(), aggiornaPlanimetrieArea: vi.fn(), eliminaMappa: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));

const area: AreaRiassuntoDto = {
  chiave: 'citta/kichijoji/galleria', contenitore: { tipo: 'quartiere', chiave: 'kichijoji', nome: 'Kichijoji' }, slug: 'galleria', nome: 'Galleria', nomeRivisto: false, ordine: 0,
  predefinita: 'kichijoji-galleria', illustrazione: { immagineUrl: null, asset: null }, numeroPlanimetrie: 1, numeroSpilli: 0, passaggio: null, ingresso: false,
  origine: 'utente', modificata: false, daVerificare: false, casa: '/guida/citta/kichijoji/galleria',
};
const quartiere = { chiave: 'kichijoji', nome: 'Kichijoji', mappaChiave: 'citta-kichijoji', sblocco: null, fonte: '', descrizione: '', mappa: true,
  illustrazione: { immagineUrl: '/api/immagini/mappa/citta-kichijoji/file?v=1', asset: null }, aree: [area], pianta: null, piantaAssente: null, luoghi: [] } as unknown as QuartiereDettaglioDto;
const planimetria = (chiave: string, ordine: number): PlanimetriaAreaDto => ({ chiave, nome: 'Galleria', etichetta: null, ordine, predefinita: ordine === 0, numeroSpilli: 0, immagineUrl: null, asset: null, ruoloImmagine: 'planimetria-nativa' });

beforeEach(() => {
  vi.resetAllMocks();
  useAssetStore.setState({ manifest: null, caricato: true, mancanti: {} });
});

it('UX2-9 a: «Aggiungi area» dice il punto scelto a parole, senza percentuali né decimali', () => {
  render(<MemoryRouter><FinestraAggiungiArea quartiere={quartiere} aperta onChiudi={() => {}} onCreata={() => {}} /></MemoryRouter>);
  fireEvent.keyDown(screen.getByRole('application', { name: /Illustrazione di Kichijoji/ }), { key: 'ArrowRight' });
  expect(screen.getByText('Punto scelto: il pin dell’area comparirà lì. Tocca un altro punto per spostarlo.')).toBeInTheDocument();
  expect(screen.queryByText(/% da sinistra/)).toBeNull();
});

it('UX2-9 c: nella finestra «Modifica» i comandi di una versione vanno a capo interi («Elimina» non si spezza)', () => {
  const dettaglio = { ...area, numeroPlanimetrie: 2, planimetrie: [planimetria('kichijoji-galleria', 0), planimetria('kichijoji-galleria-2', 1)], elementi: [], vicine: [] } as AreaDettaglioDto;
  render(<MemoryRouter><FinestraModificaArea area={dettaglio} aperta onChiudi={() => {}} onSalvata={() => {}} /></MemoryRouter>);
  const elimina = screen.getByRole('button', { name: 'Elimina Planimetria 2' });
  expect(elimina).toHaveClass('shrink-0', 'whitespace-nowrap');
  expect(elimina.parentElement).toHaveClass('flex-wrap');
});

it('UX2-9 d: «Segna sull’illustrazione» salva il pin e passa il suo id alla pagina, che lo mostra selezionato', async () => {
  api.creaSpillo.mockResolvedValue({ id: 991 });
  const onPinSegnato = vi.fn();
  const onCambiato = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><AreeDelQuartiere quartiere={quartiere} onCambiato={onCambiato} onAggiungi={() => {}} onPinSegnato={onPinSegnato} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /Segna sull’illustrazione/ }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Dove sta Galleria in Kichijoji' }));
  fireEvent.keyDown(finestra.getByRole('application'), { key: 'ArrowDown' });
  fireEvent.click(finestra.getByRole('button', { name: /Salva/ }));
  await waitFor(() => expect(onPinSegnato).toHaveBeenCalledWith(991));
  expect(api.creaSpillo).toHaveBeenCalledWith('citta-kichijoji', expect.objectContaining({ tipo: 'passaggio', nome: 'Galleria', riferimento: { tipo: 'mappa', chiave: 'kichijoji-galleria' } }));
  expect(onCambiato).toHaveBeenCalled();
});
