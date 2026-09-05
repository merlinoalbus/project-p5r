// @vitest-environment jsdom
// ============================================================
// Test ModuloCatalogo — aggiunta e correzione di negozi e articoli dall'interfaccia (16.1)
// ============================================================

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ModuloCatalogo } from './ModuloCatalogo';
import type { ElementoCatalogoDto } from '../../types';

const api = vi.hoisted(() => ({
  creaElementoCatalogo: vi.fn(), aggiornaElementoCatalogo: vi.fn(),
  eliminaElementoCatalogo: vi.fn(), nascondiElementoCatalogo: vi.fn(),
}));
vi.mock('./CondizioniEditor',()=>({CondizioniEditor:()=>null}));
vi.mock('../../services/api', () => api);
vi.mock('../../services/api/compendio', () => ({ getQuartieri: vi.fn().mockResolvedValue([{ chiave: 'shibuya', nome: 'Shibuya' }, { chiave: 'shinjuku', nome: 'Shinjuku' }]) }));
const { notifica } = vi.hoisted(() => ({ notifica: vi.fn() }));
vi.mock('../../stores/notificationStore', () => ({ notifica }));

const negozioSeed: ElementoCatalogoDto = {
  tipo: 'negozio', chiave: 'untouchable', nome: 'Untouchable', origine: 'seed', modificata: false, nascosta: false, aggiornata: null,
  dati: { nome: 'Untouchable', tipo: 'armi', luogo: 'Shibuya, retro', gestore: 'Munehisa Iwai', orari: null, sblocco: null, note: null, fonte: null },
};

describe('ModuloCatalogo', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    notifica.mockReset();
  });

  it('crea un articolo agganciato al negozio da cui è stato aperto', async () => {
    api.creaElementoCatalogo.mockResolvedValue({ ...negozioSeed, tipo: 'articolo', chiave: 'untouchable/u-coltello', nome: 'Coltello', origine: 'utente' });
    const onSalvato = vi.fn();
    render(<ModuloCatalogo tipo="articolo" negozioChiave="untouchable" onChiudi={vi.fn()} onSalvato={onSalvato} />);
    expect(screen.getByText('Nuovo articolo')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Nome dell'articolo/), { target: { value: 'Coltello da combattimento' } });
    fireEvent.change(screen.getByLabelText('Prezzo in yen'), { target: { value: '3000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenCalled());
    const [tipo, dati] = api.creaElementoCatalogo.mock.calls[0];
    expect(tipo).toBe('articolo');
    expect(dati).toMatchObject({ nome: 'Coltello da combattimento', prezzo: 3000, negozio_chiave: 'untouchable', effetto: null, categoria: 'altro', fonte: '' });
    expect(onSalvato).toHaveBeenCalled();
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('aggiunto'));
  });

  it('non si salva senza nome', () => {
    render(<ModuloCatalogo tipo="negozio" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Salva' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Nome del negozio'), { target: { value: 'Chiosco' } });
    expect(screen.getByRole('button', { name: 'Salva' })).toBeEnabled();
  });

  it('correggendo una riga della guida spiega che la correzione sopravvive agli aggiornamenti', async () => {
    api.aggiornaElementoCatalogo.mockResolvedValue({ ...negozioSeed, modificata: true });
    render(<ModuloCatalogo tipo="negozio" elemento={negozioSeed} onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    expect(screen.getByText('Negozio: Untouchable')).toBeInTheDocument();
    expect(screen.getByText(/la correzione resterà anche dopo gli aggiornamenti/)).toBeInTheDocument();
    // una riga del seed intatta non si può eliminare: si può solo correggere o nascondere
    expect(screen.queryByRole('button', { name: /Elimina|Ripristina/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('Orari'), { target: { value: 'sempre aperto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaElementoCatalogo).toHaveBeenCalledWith('negozio', 'untouchable', expect.objectContaining({ orari: 'sempre aperto', nome: 'Untouchable' })));
  });

  it('nasconde una riga della guida e ripristina quella corretta', async () => {
    api.nascondiElementoCatalogo.mockResolvedValue(negozioSeed);
    const { unmount } = render(<ModuloCatalogo tipo="negozio" elemento={negozioSeed} onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Nascondi dagli elenchi/ }));
    await waitFor(() => expect(api.nascondiElementoCatalogo).toHaveBeenCalledWith('negozio', 'untouchable', true));
    unmount();

    api.eliminaElementoCatalogo.mockResolvedValue({ esito: 'ripristinata', elemento: negozioSeed });
    render(<ModuloCatalogo tipo="negozio" elemento={{ ...negozioSeed, modificata: true, origine: 'utente' }} onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ripristina dalla guida' }));
    await waitFor(() => expect(api.eliminaElementoCatalogo).toHaveBeenCalledWith('negozio', 'untouchable'));
    expect(notifica).toHaveBeenCalledWith('success', 'Ripristinati i dati della guida.');
  });
});

it('salva il quartiere scelto, senza dedurlo dalla posizione testuale', async () => {
  api.creaElementoCatalogo.mockResolvedValue({ nome: 'Chiosco' });
  render(<ModuloCatalogo tipo="negozio" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
  await screen.findByRole('option', { name: 'Shibuya' });
  fireEvent.change(screen.getByLabelText('Nome del negozio'), { target: { value: 'Chiosco' } });
  fireEvent.change(screen.getByLabelText('Quartiere'), { target: { value: 'shibuya' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenLastCalledWith('negozio', expect.objectContaining({ luogo_chiave: 'shibuya' })));
});
