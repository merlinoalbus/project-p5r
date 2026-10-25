/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test InfiltrazioniVoce — il campo «Infiltrazioni» delle voci di Palazzo del diario e «Da rivedere» (L3, §4.4, §1.4; 2026-10-20)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { DaRivedereVoce, InfiltrazioniVoce } from './InfiltrazioniVoce';
import { scegliVoce } from '../../../test/selettore';
import type { AzionePercorsoDto } from '../../types';

const api = vi.hoisted(() => ({ impostaInfiltrazioniVoce: vi.fn(), rivediVoceGiornata: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));

const OPZIONI = [{ chiave: 'k-10', nome: 'Vecchio Castello', ordine: 0 }, { chiave: 'k-11', nome: 'Tetto del Vecchio Castello', ordine: 1 }, { chiave: 'k-12', nome: 'Torre', ordine: 2 }];
const voce = (extra: Partial<AzionePercorsoDto> = {}) => ({ uid: 'v-1', azione: 'Infiltrati nel Castello', note: null, infiltrazioniDelPalazzo: OPZIONI, infiltrazioni: [], propostaInfiltrazioni: null, ...extra }) as unknown as AzionePercorsoDto;

beforeEach(() => vi.resetAllMocks());

it('senza Palazzo (campo assente) non mostra niente', () => {
  const { container } = render(<InfiltrazioniVoce a={{ ...voce(), infiltrazioniDelPalazzo: undefined }} partitaId={1} onCambiata={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});

it('insieme vuoto con proposta: la dice con il motivo e la certezza; «Conferma» scrive l’insieme proposto nell’ordine', async () => {
  const proposta = { infiltrazioni: [{ chiave: 'k-10', nome: 'Vecchio Castello' }, { chiave: 'k-11', nome: 'Tetto del Vecchio Castello' }, { chiave: 'k-12', nome: 'Torre' }], motivo: 'la voce descrive più infiltrazioni', certezza: 'multipla' as const };
  const aggiornata = voce({ infiltrazioni: proposta.infiltrazioni, propostaInfiltrazioni: null });
  api.impostaInfiltrazioniVoce.mockResolvedValue(aggiornata);
  const onCambiata = vi.fn();
  render(<InfiltrazioniVoce a={voce({ propostaInfiltrazioni: proposta })} partitaId={7} onCambiata={onCambiata} />);
  // 2026-10-25: niente «Infiltrazioni: nessuna»; con l'insieme vuoto la riga è il pulsante che dice che cosa manca (nome con la voce)
  expect(screen.getByRole('button', { name: 'Scegli le infiltrazioni: Infiltrati nel Castello' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Proposta: Vecchio Castello, Tetto del Vecchio Castello, Torre — la voce descrive più infiltrazioni (più infiltrazioni)');
  fireEvent.click(screen.getByRole('button', { name: 'Conferma' }));
  await waitFor(() => expect(api.impostaInfiltrazioniVoce).toHaveBeenCalledWith('v-1', ['k-10', 'k-11', 'k-12'], 7));
  expect(onCambiata).toHaveBeenCalledWith(aggiornata);
});

it('con l’insieme valorizzato la proposta non c’è; la ripetuta si dice «(di nuovo)»', () => {
  render(<InfiltrazioniVoce a={voce({ infiltrazioni: [{ chiave: 'k-10', nome: 'Vecchio Castello' }, { chiave: 'k-11', nome: 'Tetto' }, { chiave: 'k-10', nome: 'Vecchio Castello' }], propostaInfiltrazioni: { infiltrazioni: [], motivo: 'x', certezza: 'certa' } })} partitaId={7} onCambiata={() => {}} />);
  const elenco = within(screen.getByRole('list', { name: 'Infiltrazioni della voce, in ordine' }));
  expect(elenco.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['1. Vecchio Castello', '2. Tetto', '3. Vecchio Castello (di nuovo)']);
  expect(screen.queryByText(/Proposta:/)).toBeNull();
});

// UX3-2: sulla voce il collegamento si chiama come il Palazzo, non «Entra»: la finestra lo nomina così
it('la finestra nomina il collegamento della voce col suo nome («Palazzo di Madarame»), non «Entra»', async () => {
  render(<InfiltrazioniVoce a={voce({ tipo: 'palazzo', riferimento: { tipo: 'dungeon', chiave: 'madarame' }, riferimentoTesto: 'Palazzo di Madarame', infiltrazioni: [] } as Partial<AzionePercorsoDto>)} partitaId={7} onCambiata={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Scegli le infiltrazioni: Infiltrati nel Castello' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Infiltrazioni della voce' }));
  expect(finestra.getByText(/^In ordine, come le percorri: il collegamento «Palazzo di Madarame» apre la prima non completata\./)).toBeInTheDocument();
  expect(finestra.getByText('Nessuna: il collegamento «Palazzo di Madarame» apre la prima infiltrazione non completata del Palazzo.')).toBeInTheDocument();
  expect(finestra.queryByText(/«Entra»/)).toBeNull();
});

// UX3-9: una voce senza collegamento (né il Palazzo né «Sulla mappa») non parla di un collegamento che non c'è
it('senza collegamento la finestra dice a cosa servono le infiltrazioni per la voce, senza nominare un collegamento (UX3-9)', async () => {
  const proposta = { infiltrazioni: [{ chiave: 'k-10', nome: 'Vecchio Castello' }], motivo: 'la voce descrive il primo accesso', certezza: 'certa' as const };
  render(<InfiltrazioniVoce a={voce({ tipo: 'trama', riferimento: null, infiltrazioni: [], propostaInfiltrazioni: proposta } as Partial<AzionePercorsoDto>)} partitaId={7} onCambiata={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Scegli le infiltrazioni: Infiltrati nel Castello' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Infiltrazioni della voce' }));
  expect(finestra.queryByText(/collegamento/)).toBeNull();
  expect(finestra.getByText(/^In ordine, come le percorri: dicono in quali infiltrazioni avviene la voce, che non apre il Palazzo\./)).toBeInTheDocument();
  expect(finestra.getByText('Nessuna: la voce non dice ancora in quale infiltrazione avviene.')).toBeInTheDocument();
});

it('con una proposta la finestra dice che il collegamento apre la prima della proposta (UX3-1)', async () => {
  const proposta = { infiltrazioni: [{ chiave: 'k-11', nome: 'Tetto del Vecchio Castello' }, { chiave: 'k-12', nome: 'Torre' }], motivo: 'la voce descrive più infiltrazioni', certezza: 'multipla' as const };
  render(<InfiltrazioniVoce a={voce({ tipo: 'palazzo', riferimento: { tipo: 'dungeon', chiave: 'kamoshida' }, riferimentoTesto: 'Palazzo di Kamoshida', infiltrazioni: [], propostaInfiltrazioni: proposta } as Partial<AzionePercorsoDto>)} partitaId={7} onCambiata={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Scegli le infiltrazioni: Infiltrati nel Castello' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Infiltrazioni della voce' }));
  expect(finestra.getByText('Nessuna: il collegamento «Palazzo di Kamoshida» apre «Tetto del Vecchio Castello», la prima della proposta.')).toBeInTheDocument();
});

// FUN3-3 (strada (a) del PM): con un atterraggio il collegamento porta alla planimetria d'atterraggio (§4.1), non alla proposta: la finestra
// descrive l'atterraggio; senza atterraggio il testo resta quello della proposta (test qui sopra)
it('con un atterraggio la finestra dice che il collegamento apre la planimetria d’arrivo del giorno, non la proposta (FUN3-3)', async () => {
  const proposta = { infiltrazioni: [{ chiave: 'k-11', nome: 'Tutorial Palazzo 12/04' }], motivo: 'la voce descrive il primo accesso', certezza: 'certa' as const };
  render(<InfiltrazioniVoce a={voce({ tipo: 'palazzo', riferimento: { tipo: 'dungeon', chiave: 'kamoshida' }, riferimentoTesto: 'Palazzo di Kamoshida', infiltrazioni: [], propostaInfiltrazioni: proposta,
    atterraggio: { mappa: 'palazzo-di-kamoshida-sala-centrale', spillo: null } } as Partial<AzionePercorsoDto>)} partitaId={7} onCambiata={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Scegli le infiltrazioni: Infiltrati nel Castello' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Infiltrazioni della voce' }));
  expect(finestra.getByText('Nessuna: il collegamento «Palazzo di Kamoshida» apre la planimetria d’arrivo del giorno, quella dell’atterraggio del Palazzo. Confermata la proposta, aprirà la prima non completata fra quelle scelte.')).toBeInTheDocument();
  expect(finestra.queryByText(/la prima della proposta/)).toBeNull();
});

it('con un atterraggio e senza proposta la finestra descrive solo l’atterraggio (FUN3-3)', async () => {
  render(<InfiltrazioniVoce a={voce({ tipo: 'palazzo', riferimento: { tipo: 'dungeon', chiave: 'kamoshida' }, riferimentoTesto: 'Palazzo di Kamoshida', infiltrazioni: [],
    atterraggio: { mappa: 'palazzo-di-kamoshida-sala-centrale', spillo: 4 } } as Partial<AzionePercorsoDto>)} partitaId={7} onCambiata={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Scegli le infiltrazioni: Infiltrati nel Castello' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Infiltrazioni della voce' }));
  expect(finestra.getByText('Nessuna: il collegamento «Palazzo di Kamoshida» apre la planimetria d’arrivo del giorno, quella dell’atterraggio del Palazzo.')).toBeInTheDocument();
});

it('nella finestra: sposta, togli e aggiungi salvano subito l’insieme intero; l’ultima non si propone di seguito', async () => {
  api.impostaInfiltrazioniVoce.mockImplementation(async (_uid: string, chiavi: string[]) => voce({ infiltrazioni: chiavi.map((k) => ({ chiave: k, nome: OPZIONI.find((o) => o.chiave === k)!.nome })) }));
  render(<InfiltrazioniVoce a={voce({ infiltrazioni: [{ chiave: 'k-10', nome: 'Vecchio Castello' }, { chiave: 'k-11', nome: 'Tetto del Vecchio Castello' }] })} partitaId={7} onCambiata={() => {}} />);
  // con l'insieme già scelto la matita è sola: il nome lo dice l'etichetta accessibile, con il testo della voce (2026-10-25)
  fireEvent.click(screen.getByRole('button', { name: 'Modifica le infiltrazioni: Infiltrati nel Castello' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Infiltrazioni della voce' }));
  fireEvent.click(finestra.getByRole('button', { name: 'Sposta giù Vecchio Castello' }));
  await waitFor(() => expect(api.impostaInfiltrazioniVoce).toHaveBeenLastCalledWith('v-1', ['k-11', 'k-10'], 7));
  fireEvent.click(finestra.getByRole('button', { name: 'Togli Tetto del Vecchio Castello' }));
  await waitFor(() => expect(api.impostaInfiltrazioniVoce).toHaveBeenLastCalledWith('v-1', ['k-10'], 7));
  // «Aggiungi»: l'ultima dell'insieme (Tetto) non c'è fra le scelte, le altre sì (Vecchio Castello «di nuovo»)
  scegliVoce('Aggiungi infiltrazione', '3. Torre');
  await waitFor(() => expect(api.impostaInfiltrazioniVoce).toHaveBeenLastCalledWith('v-1', ['k-10', 'k-11', 'k-12'], 7));
});

it('«Da rivedere» con il testo di prima: lo mostra e «Rimetti il precedente» lo chiede al server', async () => {
  const a = voce({ daRivedere: true, aggiuntaDa: null, motivoRevisione: 'La data giusta è il 26 giugno.', testoPrecedente: { azione: 'Lettera di sfida', note: null, riferimento: null, riferimentoTesto: 'Palazzo di Kaneshiro' } });
  api.rivediVoceGiornata.mockResolvedValue({ ...a, daRivedere: false });
  const onCambiata = vi.fn();
  render(<DaRivedereVoce a={a} partitaId={7} onCambiata={onCambiata} />);
  fireEvent.click(screen.getByRole('button', { name: 'Da rivedere' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Corretta dal team' }));
  expect(finestra.getByText('La data giusta è il 26 giugno.')).toBeInTheDocument();
  expect(finestra.getByText(/Lettera di sfida \(Palazzo di Kaneshiro\)/)).toBeInTheDocument();
  fireEvent.click(finestra.getByRole('button', { name: 'Rimetti il precedente' }));
  await waitFor(() => expect(api.rivediVoceGiornata).toHaveBeenCalledWith('v-1', 'rimetti', 7));
  expect(onCambiata).toHaveBeenCalled();
});

it('«Da rivedere» solo segnalata: «Fatto»; una voce non da rivedere non ha il chip', async () => {
  api.rivediVoceGiornata.mockResolvedValue(voce());
  const { unmount } = render(<DaRivedereVoce a={voce({ daRivedere: true, motivoRevisione: 'Da controllare col gioco.' })} partitaId={null} onCambiata={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Da rivedere' }));
  fireEvent.click(within(await screen.findByRole('dialog', { name: 'Segnalata dal team' })).getByRole('button', { name: 'Fatto' }));
  await waitFor(() => expect(api.rivediVoceGiornata).toHaveBeenCalledWith('v-1', 'fatto', undefined));
  unmount();
  render(<DaRivedereVoce a={voce()} partitaId={null} onCambiata={() => {}} />);
  expect(screen.queryByRole('button', { name: 'Da rivedere' })).toBeNull();
});
