// @vitest-environment jsdom
// ============================================================
// Test DungeonPage — schede dei Palazzi con emblema di riserva, anello di avanzamento, date e livello in breve
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DungeonPage } from './DungeonPage';
import { useAssetStore } from '../stores/assetStore';
import type { DungeonRiassuntoDto } from '../types';

const { getDungeons } = vi.hoisted(() => ({ getDungeons: vi.fn() }));
vi.mock('../services/api', () => ({ getDungeons }));
vi.mock('../stores/partitaStore', () => ({ usePartitaStore: (sel: (s: { attiva: { id: number } | null }) => unknown) => sel({ attiva: { id: 1 } }) }));

const dungeon = (extra: Partial<DungeonRiassuntoDto>): DungeonRiassuntoDto => ({
  chiave: 'kamoshida', tipo: 'palazzo', ordine: 1, nome: 'Palazzo di Kamoshida', sovrano: 'Suguru Kamoshida', arcanaSovrano: '', arcanaSovranoNome: '',
  date: { sblocco: '12 Aprile (Martedì) — prima infiltrazione esplorativa nel Palazzo', scadenza: '2 maggio (ultimo giorno utile)', furtoConsigliato: '22 Aprile' },
  livelloConsigliato: 'Non esplicitato testualmente da allgamestaff. Il boss finale è di Livello 11.', aree: 18, punti: 58, esauribili: 41, gestiti: 29, ...extra,
});

beforeEach(() => {
  getDungeons.mockReset();
  useAssetStore.setState({ manifest: null, caricato: false, mancanti: {} });
});

describe('DungeonPage', () => {
  it('mostra le schede con emblema di riserva, avanzamento e date in breve', async () => {
    getDungeons.mockResolvedValue([dungeon({}), dungeon({ chiave: 'madarame', ordine: 2, nome: 'Palazzo di Madarame (Museo)', sovrano: 'Ichiryusai Madarame', arcanaSovrano: 'Emperor', arcanaSovranoNome: 'Imperatore', gestiti: null, date: { sblocco: '16 maggio (Lunedì)', scadenza: '5 giugno', furtoConsigliato: '' } })]);
    render(<MemoryRouter><DungeonPage /></MemoryRouter>);
    const kamoshida = await screen.findByRole('link', { name: 'Palazzo di Kamoshida, Suguru Kamoshida' });
    expect(kamoshida).toHaveAttribute('href', '/guida/dungeon/kamoshida');
    expect(getDungeons).toHaveBeenCalledWith(1);
    // anello di avanzamento: 29 su 58 = 50%
    expect(screen.getByRole('progressbar', { name: /Avanzamento in Palazzo di Kamoshida/ })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('50%')).toBeInTheDocument();
    // date e livello in breve, dettaglio nel title
    expect(screen.getByText('Sblocco 12 Aprile')).toHaveAttribute('title', expect.stringContaining('prima infiltrazione'));
    expect(screen.getByText('Scadenza 2 maggio')).toBeInTheDocument();
    expect(screen.getAllByText(/^Livello: /)[0]).toHaveAttribute('title', expect.stringContaining('boss finale'));
    // emblema di riserva: iniziale «K» per Kamoshida (nessun arcano), icona dell'arcano assente → iniziale «M» per Madarame
    expect(screen.getAllByText('K')).toHaveLength(1);
    expect(screen.getAllByText('M')).toHaveLength(1);
    // senza partita gestita nel secondo palazzo non c'è anello
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });
});
