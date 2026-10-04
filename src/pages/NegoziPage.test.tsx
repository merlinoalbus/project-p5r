// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NegoziPage } from './NegoziPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { ArticoloDto, PartitaDto } from '../types';

const negoziBase = [
  { chiave:'u-vuoto', nome:'Bottega nuova', luogoChiave:'shibuya', quartiereNome:'Shibuya', tipo:'altro', luogo:'Stazione', articoli:0, verificati:0 },
  { chiave:'officina', nome:'Officina', luogoChiave:'kichijoji', quartiereNome:'Kichijoji', tipo:'misto', luogo:'Viale', articoli:2, verificati:2 },
];
const libreriaBloccata = { chiave:'libreria-segreta', nome:'Libreria segreta', luogoChiave:'jinbocho', quartiereNome:'Jinbocho', tipo:'libri', luogo:'Vicolo', articoli:4, verificati:4, disponibilita: { stato: 'bloccato' as const, requisiti: [] } };

const { getNegozi, ricercaArticoli, impostaAcquisto, posizioni } = vi.hoisted(() => ({
  getNegozi: vi.fn(),
  ricercaArticoli: vi.fn().mockResolvedValue({ totale:0, articoli:[] }),
  impostaAcquisto: vi.fn(),
  posizioni: [] as Array<Record<string, unknown>>,
}));
vi.mock('../services/api', (vero) => moduloApi(vero, {
  getNegozi,
  ricercaArticoli,
  impostaAcquisto,
}));
vi.mock('../stores/notificationStore', (vero) => moduloNotifiche(vero));
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

it('mantiene consultabile una voce bloccata con posizione e semaforo', async () => {
  usePartitaStore.setState({ attiva: { id: 5, nome: 'Prova' } as PartitaDto });
  render(<MemoryRouter><NegoziPage /></MemoryRouter>);
  await screen.findByRole('heading', { name:'Shibuya' });
  expect(screen.getByText('Libreria segreta')).toBeInTheDocument();
  expect(screen.getByText('Non ancora')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mostra posizione di Libreria segreta' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione di Libreria segreta' }));
  expect(posizioni.at(-1)).toMatchObject({ tipo: 'negozio', chiave: 'libreria-segreta' });
});

it('mostra nell’intestazione e nella scheda i conteggi canonici restituiti dal backend', async () => {
  usePartitaStore.setState({ attiva: { id: 8, nome: 'Conteggi' } as PartitaDto });
  getNegozi.mockResolvedValueOnce([{ ...negoziBase[1], articoli: 1, verificati: 1, disponibilita: { stato: 'disponibile' as const, requisiti: [] } }]);
  render(<MemoryRouter><NegoziPage /></MemoryRouter>);

  expect(await screen.findByText(/1 negozio o punto di acquisto con 1 articolo:/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Officina/ })).toHaveTextContent('1 articolo');
  expect(screen.queryByText(/da fonte secondaria/)).toBeNull();
});

/* I filtri stanno nell'indirizzo: `/guida/negozi?categorie=arma` (e il vecchio `categoria=`)
 * deve aprire l'elenco già filtrato, con la tessera accesa; toccarne un'altra riscrive l'indirizzo
 * e chiede al server tutte e due le categorie. */
it('apre l’elenco già filtrato quando la categoria è nell’indirizzo, e le tessere lo riscrivono', async () => {
  render(<MemoryRouter initialEntries={['/guida/negozi?categoria=arma']}><NegoziPage /></MemoryRouter>);
  await waitFor(() => expect(ricercaArticoli).toHaveBeenCalledWith(expect.objectContaining({ categorie: ['arma'] }), undefined));
  const categorie = await screen.findByRole('group', { name: 'Categorie' });
  expect(within(categorie).getByRole('button', { name: 'Arma' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(within(categorie).getByRole('button', { name: 'Libro' }));
  await waitFor(() => expect(ricercaArticoli).toHaveBeenLastCalledWith(expect.objectContaining({ categorie: ['arma', 'libro'] }), undefined));
  // senza partita lo stato d'acquisto non si chiede
  expect(screen.queryByRole('radiogroup', { name: "Stato d'acquisto" })).toBeNull();
});

it('con la partita i segmenti di stato e disponibilità arrivano al server', async () => {
  usePartitaStore.setState({ attiva: { id: 5, nome: 'Prova' } as PartitaDto });
  render(<MemoryRouter initialEntries={['/guida/negozi?stato=da-acquistare']}><NegoziPage /></MemoryRouter>);
  await waitFor(() => expect(ricercaArticoli).toHaveBeenCalledWith(expect.objectContaining({ stato: 'da-acquistare' }), 5));
  fireEvent.click(await screen.findByRole('radio', { name: 'Bloccati' }));
  await waitFor(() => expect(ricercaArticoli).toHaveBeenLastCalledWith(expect.objectContaining({ stato: 'da-acquistare', disponibilita: 'bloccati' }), 5));
});

it('due spunte ravvicinate nei risultati: la risposta della prima, arrivata dopo la seconda, non toglie la seconda (B3")', async () => {
  usePartitaStore.setState({ attiva: { id: 5, nome: 'Prova' } as PartitaDto });
  const art = (chiave: string, nome: string): ArticoloDto => ({ chiave, negozioChiave: 'officina', negozioNome: 'Officina', nome, nomeIt: null, categoria: 'arma', per: 'Joker', prezzo: 1000, effetto: 'Effetto', statistiche: null, quantita: null, oggettoFonte: null, oggettoChiave: null, disponibileDal: null, condizione: null, nota: null, verificato: true, acquistato: false });
  const articoli = [art('officina/spada', 'Spada'), art('officina/lancia', 'Lancia')];
  ricercaArticoli.mockResolvedValue({ totale: 2, articoli });
  let rispondiSpada!: (a: ArticoloDto) => void;
  impostaAcquisto.mockImplementation((_id: number, chiave: string) => (chiave === 'officina/spada'
    ? new Promise<ArticoloDto>((ok) => { rispondiSpada = ok; })
    : Promise.resolve({ ...articoli[1], acquistato: true })));
  render(<MemoryRouter initialEntries={['/guida/negozi?categoria=arma']}><NegoziPage /></MemoryRouter>);
  await screen.findByRole('checkbox', { name: 'Spada acquistato' });
  await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: 'Spada acquistato' })); }); // in volo
  await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: 'Lancia acquistato' })); }); // arriva subito
  await act(async () => { rispondiSpada({ ...articoli[0], acquistato: true }); });
  expect(screen.getByRole('checkbox', { name: 'Lancia acquistato' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Spada acquistato' })).toBeChecked();
});
