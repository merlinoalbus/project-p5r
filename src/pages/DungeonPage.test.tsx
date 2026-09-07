// @vitest-environment jsdom
// ============================================================
// Test DungeonPage — schede dei Palazzi con emblema di riserva, anello di avanzamento, date e livello in breve
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DungeonPage } from './DungeonPage';
import { soloPalazzi } from '../utils/palazzi';
import { useAssetStore } from '../stores/assetStore';
import type { DungeonRiassuntoDto } from '../types';

const { getDungeons } = vi.hoisted(() => ({ getDungeons: vi.fn() }));
vi.mock('../services/api', () => ({ getDungeons }));
vi.mock('../stores/partitaStore', () => ({ usePartitaStore: (sel: (s: { attiva: { id: number } | null }) => unknown) => sel({ attiva: { id: 1 } }) }));

const dungeon = (extra: Partial<DungeonRiassuntoDto>): DungeonRiassuntoDto => ({
  chiave: 'kamoshida', tipo: 'palazzo', ordine: 1, nome: 'Palazzo di Kamoshida', sovrano: 'Suguru Kamoshida', arcanaSovrano: '', arcanaSovranoNome: '',
  date: { sblocco: '12 Aprile (Martedì) — prima infiltrazione esplorativa nel Palazzo', scadenza: '2 maggio (ultimo giorno utile)', furtoConsigliato: '22 Aprile' },
  finestra: { dal: '04-12', al: '05-02' },
  livelloConsigliato: 'Non esplicitato testualmente da allgamestaff. Il boss finale è di Livello 11.', aree: 18, punti: 58, esauribili: 41, gestiti: 29, collezionabili: 34, collezionabiliGestiti: 17, ...extra,
});

beforeEach(() => {
  getDungeons.mockReset();
  useAssetStore.setState({ manifest: null, caricato: false, mancanti: {} });
});

describe('DungeonPage', () => {
  it('mostra le schede con emblema di riserva, avanzamento e date in breve', async () => {
    getDungeons.mockResolvedValue([dungeon({}), dungeon({ chiave: 'madarame', ordine: 2, nome: 'Palazzo di Madarame (Museo)', sovrano: 'Ichiryusai Madarame', arcanaSovrano: 'Emperor', arcanaSovranoNome: 'Imperatore', gestiti: null, collezionabiliGestiti: null, date: { sblocco: '16 maggio (Lunedì)', scadenza: '5 giugno', furtoConsigliato: '' } })]);
    render(<MemoryRouter><DungeonPage /></MemoryRouter>);
    const kamoshida = await screen.findByRole('link', { name: 'Palazzo di Kamoshida, Suguru Kamoshida' });
    // La carta apre la **scheda** del Palazzo: cliccarla è quello, e il collegamento «Scheda del
    // Palazzo» che stava sotto — l'unico modo di arrivarci — diceva due volte la stessa cosa e
    // usciva dal riquadro. La mappa si apre dalla scheda, insieme alle aree e ai punti.
    expect(kamoshida).toHaveAttribute('href', '/guida/dungeon/kamoshida');
    expect(screen.queryByRole('link', { name: /Scheda del Palazzo/ })).toBeNull();
    expect(getDungeons).toHaveBeenCalledWith(1);
    // anello di avanzamento: 17 collezionabili su 34 = 50% (le sicure e i boss non contano)
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

  it('è l’elenco dei Palazzi: Iweleth sì, i Memento no', async () => {
    // La prova sta qui e non nel backend perché il filtro è una scelta di questa sezione: l’API
    // continua a servire i Memento a chi li chiede (la loro pagina, l’editor delle condizioni).
    // Iweleth invece resta, ed è il punto: è un Dedalo, ma si visita per aree come un Palazzo.
    getDungeons.mockResolvedValue([
      dungeon({}),
      dungeon({ chiave: 'iweleth', ordine: 8, nome: 'Dedalo di Iweleth', sovrano: 'Yaldabaoth', gestiti: null }),
      dungeon({ chiave: 'mementos', tipo: 'mementos', ordine: 10, nome: 'Memento', sovrano: 'Il pubblico', gestiti: null }),
    ]);
    render(<MemoryRouter><DungeonPage /></MemoryRouter>);
    expect(await screen.findByRole('link', { name: /Dedalo di Iweleth/ })).toHaveAttribute('href', '/guida/dungeon/iweleth');
    expect(screen.queryByRole('link', { name: /^Memento/ })).toBeNull();
    expect(screen.queryByText('Memento')).toBeNull();
    // Il filtro è **per inclusione**: passa `tipo === 'palazzo'`, non «tutto tranne i Memento».
    // Un tipo nuovo e sconosciuto non deve entrare nell'elenco per il solo fatto di non essere
    // Memento — è il rilievo di Codex, e la prova va scritta così o non prova niente.
    expect(soloPalazzi([{ tipo: 'palazzo' }, { tipo: 'mementos' }, { tipo: 'ignoto' } as unknown as { tipo: 'palazzo' }]))
      .toEqual([{ tipo: 'palazzo' }]);
    expect(screen.getByRole('list', { name: 'Palazzi' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Palazzi' })).toBeInTheDocument();
  });
});
