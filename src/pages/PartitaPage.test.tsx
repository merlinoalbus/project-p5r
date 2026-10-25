// @vitest-environment jsdom
// ============================================================
// Test PartitaPage — le scorciatoie della scuola nell'intestazione seguono il giorno guardato nella scheda «Oggi»
// ============================================================
//
// Le schede vere caricano mezza app: qui si sostituiscono con due finti che mostrano solo il cablaggio
// (il giorno che la scheda «Oggi» comunica e quello che riceve `ScuolaOggi`).
// ============================================================

import { useEffect } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PartitaPage } from './PartitaPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { PartitaDto } from '../types';

const richiamo = vi.hoisted(() => ({ onGiorno: null as null | ((g: string | null) => void), montaggiScuola: 0 }));

vi.mock('../components/partita/OggiPartita', () => ({
  OggiPartita: ({ onGiorno }: { onGiorno?: (g: string | null) => void }) => {
    richiamo.onGiorno = onGiorno ?? null;
    return <div>scheda oggi</div>;
  },
}));
vi.mock('../components/partita/ScuolaOggi', () => ({
  ScuolaOggi: function ScuolaFinta({ giorno }: { giorno?: string | null }) {
    // conta i montaggi: scorrere i giorni non deve rimontare le scorciatoie (rileggerebbero gli elenchi completi)
    useEffect(() => { richiamo.montaggiScuola += 1; }, []);
    return <div data-testid="scuola">{giorno ?? 'nessuno'}</div>;
  },
}));
vi.mock('../components/partita/RiepilogoPartita', () => ({ RiepilogoPartita: () => <div>dati della partita</div> }));
vi.mock('../components/partita/StoricoPartita', () => ({ StoricoPartita: () => <div>scheda storico</div> }));

const partita = { id: 1, nome: 'Prova', livelloProtagonista: 1, dataGioco: '04-21', nuovaPartitaPlus: false, allarmeAttivo: false } as PartitaDto;

beforeEach(() => {
  richiamo.onGiorno = null;
  richiamo.montaggiScuola = 0;
  usePartitaStore.setState({ partite: [partita], attiva: partita, caricata: true, caricamento: false, errore: null });
});

describe('PartitaPage', () => {
  it('nella scheda «Oggi» le scorciatoie della scuola seguono il giorno mostrato; altrove la data di gioco', async () => {
    const { unmount } = render(<MemoryRouter initialEntries={['/partita?scheda=oggi']}><PartitaPage /></MemoryRouter>);
    // prima che la scheda comunichi il suo giorno: la data di gioco
    expect(screen.getByTestId('scuola')).toHaveTextContent('04-21');
    act(() => richiamo.onGiorno?.('04-29'));
    expect(screen.getByTestId('scuola')).toHaveTextContent('04-29');
    // un altro giorno: le scorciatoie lo seguono senza rimontarsi
    act(() => richiamo.onGiorno?.('04-30'));
    expect(screen.getByTestId('scuola')).toHaveTextContent('04-30');
    expect(richiamo.montaggiScuola).toBe(1);
    // la scheda torna a nessun giorno (chiusa): di nuovo la data di gioco
    act(() => richiamo.onGiorno?.(null));
    expect(screen.getByTestId('scuola')).toHaveTextContent('04-21');
    act(() => richiamo.onGiorno?.('04-29'));
    // un'altra scheda: anche con un giorno rimasto in memoria vale la data di gioco
    fireEvent.click(screen.getByRole('button', { name: /Storico/ }));
    expect(await screen.findByText('scheda storico')).toBeInTheDocument();
    expect(screen.getByTestId('scuola')).toHaveTextContent('04-21');
    unmount();
  });
});
