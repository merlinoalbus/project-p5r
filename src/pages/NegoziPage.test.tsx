// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NegoziPage } from './NegoziPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { PartitaDto } from '../types';

const negoziBase = [
  { chiave:'u-vuoto', nome:'Bottega nuova', luogoChiave:'shibuya', quartiereNome:'Shibuya', tipo:'altro', luogo:'Stazione', articoli:0, verificati:0 },
  { chiave:'officina', nome:'Officina', luogoChiave:'kichijoji', quartiereNome:'Kichijoji', tipo:'misto', luogo:'Viale', articoli:2, verificati:2 },
];
const libreriaBloccata = { chiave:'libreria-segreta', nome:'Libreria segreta', luogoChiave:'jinbocho', quartiereNome:'Jinbocho', tipo:'libri', luogo:'Vicolo', articoli:4, verificati:4, disponibilita: { stato: 'bloccato' as const, requisiti: [] } };

const { getNegozi, ricercaArticoli, posizioni } = vi.hoisted(() => ({
  getNegozi: vi.fn(),
  ricercaArticoli: vi.fn().mockResolvedValue({ totale:0, articoli:[] }),
  posizioni: [] as Array<Record<string, unknown>>,
}));
vi.mock('../services/api', () => ({
  getNegozi,
  ricercaArticoli,
}));
vi.mock('../stores/suggerimentiStore', () => ({ useSuggerimenti: () => ({ evidenziato: () => false, motivo: () => null }) }));
vi.mock('../components/mappe/DoveSiTrova', () => ({
  DoveSiTrova: (props: Record<string, unknown>) => {
    posizioni.push(props);
    return <section aria-label={String(props.titolo)} />;
  },
}));

beforeEach(() => {
  posizioni.length = 0;
  usePartitaStore.setState({ attiva: null });
  getNegozi.mockReset().mockResolvedValue([...negoziBase, libreriaBloccata]);
  ricercaArticoli.mockReset().mockResolvedValue({ totale:0, articoli:[] });
});

it('trova un negozio senza articoli cercando il nome o il quartiere', async () => {
  render(<MemoryRouter><NegoziPage /></MemoryRouter>);
  await screen.findByRole('heading', { name:'Shibuya' });
  fireEvent.change(screen.getByRole('searchbox'), {target:{value:'Bottega'}});
  expect(await screen.findByRole('region', {name:'Negozi trovati'})).toHaveTextContent('Bottega nuova');
  expect(await screen.findByText('0 articoli trovati.')).toBeInTheDocument();
});

it('apre la scheda come destinazione primaria e mostra una sola posizione contestuale', async () => {
  render(<MemoryRouter><NegoziPage /></MemoryRouter>);
  const scheda = await screen.findByRole('link', { name: /Bottega nuova/ });
  expect(scheda).toHaveAttribute('href', '/guida/negozi/u-vuoto');
  expect(screen.queryByRole('region', { name: /Dove si trova/ })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione di Bottega nuova' }));
  expect(screen.getAllByRole('region', { name: 'Dove si trova Bottega nuova' })).toHaveLength(1);
  expect(posizioni.at(-1)).toMatchObject({ tipo: 'negozio', chiave: 'u-vuoto', altezza: 300 });

  fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione di Officina' }));
  expect(screen.queryByRole('region', { name: 'Dove si trova Bottega nuova' })).toBeNull();
  expect(screen.getAllByRole('region', { name: 'Dove si trova Officina' })).toHaveLength(1);
  expect(posizioni.at(-1)).toMatchObject({ tipo: 'negozio', chiave: 'officina', altezza: 300 });

  fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione di Officina' }));
  expect(screen.queryByRole('region', { name: 'Dove si trova Officina' })).toBeNull();
});

it('nasconde la posizione precedente quando non appartiene piu ai risultati correnti', async () => {
  render(<MemoryRouter><NegoziPage /></MemoryRouter>);
  await screen.findByRole('heading', { name:'Shibuya' });
  fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione di Bottega nuova' }));
  expect(screen.getByRole('region', { name: 'Dove si trova Bottega nuova' })).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Officina' } });
  expect(screen.queryByRole('region', { name: 'Dove si trova Bottega nuova' })).toBeNull();
});

it('nasconde una voce bloccata e la rende disponibile soltanto dopo lo sblocco', async () => {
  usePartitaStore.setState({ attiva: { id: 5, nome: 'Prova' } as PartitaDto });
  const prima = render(<MemoryRouter><NegoziPage /></MemoryRouter>);
  await screen.findByRole('heading', { name:'Shibuya' });
  expect(screen.queryByText('Libreria segreta')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Mostra posizione di Libreria segreta' })).toBeNull();
  prima.unmount();

  getNegozi.mockResolvedValueOnce([...negoziBase, { ...libreriaBloccata, disponibilita: { stato: 'disponibile' as const, requisiti: [] } }]);
  render(<MemoryRouter><NegoziPage /></MemoryRouter>);
  expect(await screen.findByText('Libreria segreta')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mostra posizione di Libreria segreta' })).toBeInTheDocument();
});
