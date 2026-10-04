// @vitest-environment jsdom
// ============================================================
// Test TraduzioniEditor — due gesti ravvicinati (B3", validazione voce 2): la risposta di una voce arrivata dopo quella di un'altra
// non riporta indietro la seconda
// ============================================================

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { TraduzioniEditor } from './TraduzioniEditor';
import type { TraduzioneDto } from '../../types';

const api = vi.hoisted(() => ({ getAmbitiTraduzioni: vi.fn(), getTraduzioni: vi.fn(), aggiornaTraduzione: vi.fn(), ripristinaTraduzione: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));
vi.mock('../../stores/glossarioStore', () => ({ useGlossarioStore: (sel: (s: { ricarica: () => Promise<void> }) => unknown) => sel({ ricarica: async () => {} }) }));

const voce = (chiave: string, testo: string, fonte: TraduzioneDto['fonte']): TraduzioneDto => ({ ambito: 'arcana', chiave, testo, extra: null, fonte, updatedAt: '' });
const riga = (chiave: string) => screen.getAllByRole('listitem').find((li) => li.textContent?.startsWith(chiave))!;

beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  api.getAmbitiTraduzioni.mockResolvedValue([{ ambito: 'arcana', voci: 2, modificate: 2 }]);
  api.getTraduzioni.mockResolvedValue([voce('Fool', 'Il Mio Matto', 'utente'), voce('Magician', 'Il Mio Mago', 'utente')]);
});

describe('TraduzioniEditor', () => {
  it('ripristino: la risposta di «Fool» arrivata dopo quella di «Magician» non rimette la modifica di Magician', async () => {
    let risolviFool!: (t: TraduzioneDto) => void;
    api.ripristinaTraduzione.mockImplementation((_a: string, chiave: string) => (chiave === 'Fool'
      ? new Promise<TraduzioneDto>((ok) => { risolviFool = ok; })
      : Promise.resolve(voce('Magician', 'Mago', 'seed'))));
    render(<TraduzioniEditor />);
    await screen.findByText('Il Mio Mago');
    await act(async () => { fireEvent.click(within(riga('Fool')).getByRole('button', { name: /Ripristina/ })); }); // in volo
    await act(async () => { fireEvent.click(within(riga('Magician')).getByRole('button', { name: /Ripristina/ })); }); // arriva subito
    expect(within(riga('Magician')).getByText('Mago')).toBeInTheDocument();
    await act(async () => { risolviFool(voce('Fool', 'Matto', 'seed')); });
    expect(within(riga('Fool')).getByText('Matto')).toBeInTheDocument();
    expect(within(riga('Magician')).getByText('Mago')).toBeInTheDocument();
    expect(screen.queryByText('Il Mio Mago')).toBeNull();
  });

  it('salvataggio: il testo salvato si vede nella sua riga', async () => {
    api.aggiornaTraduzione.mockResolvedValue(voce('Fool', 'Il Folle', 'utente'));
    render(<TraduzioniEditor />);
    await screen.findByText('Il Mio Matto');
    fireEvent.click(within(riga('Fool')).getByRole('button', { name: /Modifica/ }));
    fireEvent.change(within(riga('Fool')).getByRole('textbox'), { target: { value: 'Il Folle' } });
    await act(async () => { fireEvent.click(within(riga('Fool')).getByRole('button', { name: 'Salva' })); });
    expect(api.aggiornaTraduzione).toHaveBeenCalledWith('arcana', 'Fool', 'Il Folle');
    expect(within(riga('Fool')).getByText('Il Folle')).toBeInTheDocument();
  });
});
