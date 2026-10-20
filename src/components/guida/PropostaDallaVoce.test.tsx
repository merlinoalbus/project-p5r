/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test PropostaDallaVoce — la scheda del Palazzo aperta dalla proposta di una voce del diario (L3, §4.4, UX3-1)
// ============================================================

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PropostaDallaVoce } from './PropostaDallaVoce';
import type { AzionePercorsoDto } from '../../types';

const api = vi.hoisted(() => ({ getVocePercorso: vi.fn(), impostaInfiltrazioniVoce: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

const proposta = { infiltrazioni: [{ chiave: 'k-10', nome: 'Vecchio Castello' }, { chiave: 'k-11', nome: 'Tetto del Vecchio Castello' }], motivo: 'la voce descrive più infiltrazioni', certezza: 'multipla' as const };
const voce = (extra: Partial<AzionePercorsoDto> = {}) => ({ uid: 'v-9', giorno: '04-20', azione: 'Infiltrati nel Castello', infiltrazioni: [], propostaInfiltrazioni: proposta, ...extra }) as unknown as AzionePercorsoDto;

beforeEach(() => vi.resetAllMocks());

it('con una proposta non certa dice da dove è aperta, con la data, le infiltrazioni e la certezza', async () => {
  api.getVocePercorso.mockResolvedValue(voce());
  render(<PropostaDallaVoce uid="v-9" partitaId={1} onChiudi={() => {}} onConfermata={() => {}} />);
  expect(await screen.findByText('Aperta dalla proposta della voce del 20 aprile: Vecchio Castello, Tetto del Vecchio Castello (multipla)')).toBeInTheDocument();
  expect(api.getVocePercorso).toHaveBeenCalledWith('v-9', 1);
});

it('«Conferma» scrive l’insieme proposto nell’ordine e avvisa la scheda; «Chiudi» toglie solo la riga', async () => {
  api.getVocePercorso.mockResolvedValue(voce());
  api.impostaInfiltrazioniVoce.mockResolvedValue(voce({ infiltrazioni: proposta.infiltrazioni, propostaInfiltrazioni: null }));
  const onConfermata = vi.fn(); const onChiudi = vi.fn();
  render(<PropostaDallaVoce uid="v-9" partitaId={1} onChiudi={onChiudi} onConfermata={onConfermata} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Chiudi' }));
  expect(onChiudi).toHaveBeenCalled();
  expect(api.impostaInfiltrazioniVoce).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Conferma' }));
  await waitFor(() => expect(api.impostaInfiltrazioniVoce).toHaveBeenCalledWith('v-9', ['k-10', 'k-11'], 1));
  await waitFor(() => expect(onConfermata).toHaveBeenCalled());
});

it('con la proposta certa, senza proposta o con l’insieme già scelto non c’è nessuna riga', async () => {
  for (const v of [voce({ propostaInfiltrazioni: { ...proposta, certezza: 'certa' } }), voce({ propostaInfiltrazioni: null }), voce({ infiltrazioni: [{ chiave: 'k-10', nome: 'Vecchio Castello' }] })]) {
    api.getVocePercorso.mockResolvedValue(v);
    const { container, unmount } = render(<PropostaDallaVoce uid="v-9" partitaId={1} onChiudi={() => {}} onConfermata={() => {}} />);
    await waitFor(() => expect(api.getVocePercorso).toHaveBeenCalled());
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
    unmount();
  }
});
