/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test FinestraLegamiInfiltrazione — «Modifica aree» di un'infiltrazione (L3, R3-23; 2026-10-20)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FinestraLegamiInfiltrazione } from './FinestraLegamiInfiltrazione';
import type { AreaDungeonDto, AreaRiassuntoDto } from '../../types';

const api = vi.hoisted(() => ({ impostaAreeInfiltrazione: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

/** Un'Area del Palazzo di prova: conta solo slug e nome. */
const areaPalazzo = (slug: string, nome: string): AreaRiassuntoDto => ({
  chiave: `dungeon/kamoshida/${slug}`, contenitore: { tipo: 'dungeon', chiave: 'kamoshida', nome: 'Palazzo di Kamoshida' }, slug, nome, nomeRivisto: false, ordine: 0, predefinita: `m-${slug}`,
  illustrazione: { immagineUrl: null, asset: null }, numeroPlanimetrie: 1, numeroSpilli: 0, passaggio: null, ingresso: false, origine: 'seed', modificata: false, daVerificare: false,
  casa: `/guida/dungeon/kamoshida/area/${slug}`, infiltrazioni: [],
});
const AREE = [areaPalazzo('cancello', 'Cancello'), areaPalazzo('torre-alta', 'Torre alta'), areaPalazzo('cortile', 'Cortile')];
/** L'infiltrazione «Cortile», legata a Cortile (che apre una versione scelta) e poi a Cancello (senza versione scelta). */
const INFILTRAZIONE: AreaDungeonDto = {
  chiave: 'k-03', ordine: 2, nome: 'Cortile', descrizione: '', mappe: [], punti: [], dedalo: null,
  areePalazzo: [
    { chiave: 'dungeon/kamoshida/cortile', slug: 'cortile', nome: 'Cortile', planimetriaIniziale: 'm-cortile-notte' },
    { chiave: 'dungeon/kamoshida/cancello', slug: 'cancello', nome: 'Cancello', planimetriaIniziale: null },
  ],
};

beforeEach(() => vi.resetAllMocks());

/** Le aree toccate, nell'ordine mostrato. */
const toccate = () => within(screen.getByRole('region', { name: 'Aree toccate, in ordine' })).getAllByRole('listitem').map((li) => li.querySelector('span')!.textContent);

it('mostra le aree toccate in ordine e quelle da aggiungere; ↑/↓ e «Togli» cambiano l’elenco', () => {
  render(<FinestraLegamiInfiltrazione infiltrazione={INFILTRAZIONE} aree={AREE} partitaId={4} onChiudi={() => {}} onSalvata={() => {}} />);
  expect(screen.getByRole('dialog', { name: 'Aree toccate da «Cortile»' })).toBeInTheDocument();
  expect(toccate()).toEqual(['1. Cortile', '2. Cancello']);
  // la prima non sale, l'ultima non scende
  expect(screen.getByRole('button', { name: 'Sposta su Cortile' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Sposta giù Cancello' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Sposta su Cancello' }));
  expect(toccate()).toEqual(['1. Cancello', '2. Cortile']);
  const daAggiungere = within(screen.getByRole('region', { name: 'Aree da aggiungere' }));
  expect(daAggiungere.getAllByRole('button').map((b) => b.textContent)).toEqual(['+ Torre alta']);
  fireEvent.click(screen.getByRole('button', { name: 'Togli Cortile' }));
  expect(toccate()).toEqual(['1. Cancello']);
  // tolta, torna fra quelle da aggiungere, nell'ordine del Palazzo
  expect(within(screen.getByRole('region', { name: 'Aree da aggiungere' })).getAllByRole('button').map((b) => b.textContent)).toEqual(['+ Torre alta', '+ Cortile']);
});

it('salva l’ordine nuovo con la versione che si apriva per le aree che restano legate, poi rilegge e si chiude', async () => {
  api.impostaAreeInfiltrazione.mockResolvedValue({});
  const onSalvata = vi.fn();
  const onChiudi = vi.fn();
  render(<FinestraLegamiInfiltrazione infiltrazione={INFILTRAZIONE} aree={AREE} partitaId={4} onChiudi={onChiudi} onSalvata={onSalvata} />);
  fireEvent.click(screen.getByRole('button', { name: '+ Torre alta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sposta su Torre alta' }));
  expect(toccate()).toEqual(['1. Cortile', '2. Torre alta', '3. Cancello']);
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  // Cortile conserva la sua versione; Cancello non ne aveva una; Torre alta (nuova) apre la predefinita
  await waitFor(() => expect(api.impostaAreeInfiltrazione).toHaveBeenCalledWith('k-03', ['cortile', 'torre-alta', 'cancello'], { cortile: 'm-cortile-notte' }, 4));
  await waitFor(() => expect(onChiudi).toHaveBeenCalled());
  expect(onSalvata).toHaveBeenCalled();
});

it('togliendo tutte le aree salva l’insieme vuoto, senza versioni', async () => {
  api.impostaAreeInfiltrazione.mockResolvedValue({});
  render(<FinestraLegamiInfiltrazione infiltrazione={INFILTRAZIONE} aree={AREE} partitaId={null} onChiudi={() => {}} onSalvata={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Togli Cortile' }));
  fireEvent.click(screen.getByRole('button', { name: 'Togli Cancello' }));
  expect(screen.getByText('Nessuna: l’infiltrazione non tocca aree.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(api.impostaAreeInfiltrazione).toHaveBeenCalledWith('k-03', [], undefined, undefined));
});

it('se il salvataggio non va la finestra resta aperta con le scelte fatte', async () => {
  api.impostaAreeInfiltrazione.mockRejectedValue(new Error('Rete assente'));
  const onChiudi = vi.fn();
  render(<FinestraLegamiInfiltrazione infiltrazione={INFILTRAZIONE} aree={AREE} partitaId={4} onChiudi={onChiudi} onSalvata={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Togli Cancello' }));
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Salva' })).toBeEnabled());
  expect(onChiudi).not.toHaveBeenCalled();
  expect(toccate()).toEqual(['1. Cortile']);
});
