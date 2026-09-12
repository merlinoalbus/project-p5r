/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test NegozioPage — scheda, filtri per categoria e destinatario, spunta «acquistato» per partita
// ============================================================

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { scegliVoce } from '../../test/selettore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NegozioPage } from './NegozioPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { ArticoloDto, NegozioDettaglioDto, PartitaDto } from '../types';

const { getNegozio, impostaAcquisto, getCatalogo, nascondiElementoCatalogo, getElementoCatalogo, posizioni } = vi.hoisted(() => ({
  getNegozio: vi.fn(),
  impostaAcquisto: vi.fn(),
  // Il blocco degli articoli nascosti interroga il catalogo: qui non ce n'e' nessuno.
  getCatalogo: vi.fn().mockResolvedValue([]),
  nascondiElementoCatalogo: vi.fn(),
  getElementoCatalogo: vi.fn(),
  posizioni: [] as Array<Record<string, unknown>>,
}));
// `getCatalogo` serve al blocco degli articoli nascosti; senza partita e senza nascosti torna vuoto.
vi.mock('../services/api', () => ({ getNegozio, impostaAcquisto, getCatalogo, nascondiElementoCatalogo, getElementoCatalogo }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../components/mappe/DoveSiTrova', () => ({
  DoveSiTrova: (props: Record<string, unknown>) => {
    posizioni.push(props);
    return <section aria-label="Dove si trova" />;
  },
}));

const art = (chiave: string, nome: string, categoria: ArticoloDto['categoria'], per: string | null, prezzo: number | null): ArticoloDto => ({ chiave, negozioChiave: 'untouchable', negozioNome: 'Untouchable', nome, nomeIt: null, categoria, per, prezzo, effetto: 'Effetto', statistiche: 'Attacco 50', quantita: null, oggettoFonte: null, oggettoChiave: null, disponibileDal: 'dal 6 giugno', condizione: null, nota: null, fonte: 'https://www.allgamestaff.it/x', verificato: true, acquistato: false });
const negozio: NegozioDettaglioDto = { chiave: 'untouchable', nome: 'Untouchable', luogo: 'Shibuya, Central Street', luogoChiave: 'shibuya', quartiereNome: 'Shibuya', tipo: 'misto', gestore: 'Munehisa Iwai', confidente: { chiave: 'iwai', nome: 'Munehisa Iwai' }, orari: 'Sera', orariStrutturati: { giorni: [], fasce: ['sera'], chiusoConPioggia: false, nota: null }, orariTesto: 'Solo di sera', sblocco: 'Da subito', sedeChiave: 'shibuya/untouchable', sedeNome: 'Untouchable', programmaPunti: null, note: null, fonte: 'https://www.allgamestaff.it/n', articoli: 3, verificati: 3, articoliElenco: [art('untouchable/kogatana-nera', 'Kogatana nera', 'arma', 'Joker', 1000), art('untouchable/frusta', 'Frusta', 'arma', 'Ann', 1200), art('untouchable/giubbotto', 'Giubbotto', 'protezione', 'tutti', 3000)], acquistati: 0 };

describe('NegozioPage', () => {
  beforeEach(() => {
    posizioni.length = 0;
  });

  it('mostra la scheda, filtra per categoria e destinatario e segna un articolo acquistato', async () => {
    usePartitaStore.setState({ attiva: { id: 9, nome: 'Prova' } as PartitaDto });
    getNegozio.mockResolvedValue(negozio);
    impostaAcquisto.mockResolvedValue({ ...negozio.articoliElenco[0], acquistato: true });
    render(<MemoryRouter initialEntries={['/guida/negozi/untouchable']}><Routes><Route path="/guida/negozi/:chiave" element={<NegozioPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Untouchable' })).toBeInTheDocument();
    expect(getNegozio).toHaveBeenCalledWith('untouchable', 9);
    expect(screen.getByRole('link', { name: 'Munehisa Iwai' })).toHaveAttribute('href', '/confidenti/iwai');
    expect(screen.getAllByRole('region', { name: 'Dove si trova' })).toHaveLength(1);
    // L'altezza non e' piu' un numero: su desktop la mappa deve arrivare in fondo come l'elenco
    // accanto, e quanto sia «in fondo» dipende da quanto e' alta l'intestazione — che cambia col
    // nome del negozio e con la larghezza. Un numero scritto qui sbordava di 84 px.
    expect(posizioni).toEqual([{ tipo: 'negozio', chiave: 'untouchable', altezza: 'var(--altezza-tela-negozio)' }]);
    expect(screen.getByText('Kogatana nera')).toBeInTheDocument();
    scegliVoce('Categoria', 'Protezione');
    expect(screen.queryByText('Kogatana nera')).toBeNull();
    expect(screen.getByText('Giubbotto')).toBeInTheDocument();
    scegliVoce('Categoria', 'Tutte le categorie');
    scegliVoce('Per chi', 'Ann');
    expect(screen.queryByText('Kogatana nera')).toBeNull();
    expect(screen.getByText('Frusta')).toBeInTheDocument();
    expect(screen.getByText('Giubbotto')).toBeInTheDocument();
    scegliVoce('Per chi', 'Per chiunque');
    await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: 'Kogatana nera acquistato' })); });
    expect(impostaAcquisto).toHaveBeenCalledWith(9, 'untouchable/kogatana-nera', true);
    expect(await screen.findByText(/1 acquistati/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nascondi acquistati' }));
    expect(screen.queryByText('Kogatana nera')).toBeNull();
  });

  it('con la partita gli articoli bloccati restano consultabili ma non acquistabili', async () => {
    usePartitaStore.setState({ attiva: { id: 9, nome: 'Prova' } as PartitaDto });
    const bloccato = { ...art('untouchable/kukri', 'Kukri', 'arma', 'Joker', 3800), disponibileDal: "a partire dall'arco del Palazzo di Madarame", disponibilita: { stato: 'bloccato' as const, requisiti: [{ indice: 0, tipo: 'palazzo' as const, stato: 'rosso' as const, testo: "a partire dall'arco del Palazzo di Madarame", dettaglio: 'Palazzo di Kamoshida: segna il boss come sconfitto nella Guida', manuale: false, confermato: false }] } };
    const dubbio = { ...art('untouchable/veste', 'Veste', 'protezione', 'tutti', 500), condizione: 'grado Nero (spendere oltre 10.000 yen)', disponibilita: { stato: 'ignoto' as const, requisiti: [{ indice: 0, tipo: 'manuale' as const, stato: 'grigio' as const, testo: 'grado Nero (spendere oltre 10.000 yen)', dettaglio: 'Condizione non verificabile dai dati della partita', manuale: true, confermato: false }] } };
    getNegozio.mockResolvedValue({ ...negozio, disponibilita: { stato: 'disponibile', requisiti: [] }, articoliElenco: [{ ...negozio.articoliElenco[0], disponibilita: { stato: 'disponibile', requisiti: [] } }, bloccato, dubbio] });
    render(<MemoryRouter initialEntries={['/guida/negozi/untouchable']}><Routes><Route path="/guida/negozi/:chiave" element={<NegozioPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Untouchable' })).toBeInTheDocument();
    expect(screen.getByText('Kukri')).toBeInTheDocument();
    expect(screen.getByText('Non ancora')).toBeInTheDocument();
    // Il perché lo dice la pastiglia «Non ancora»: la spunta è disabilitata e lo ripete nel suo
    // titolo, invece di scrivere la stessa frase due volte sulla stessa riga.
    const spunta = screen.getByRole('checkbox', { name: 'Kukri acquistato' });
    expect(spunta).toBeDisabled();
    expect(spunta.closest('label')).toHaveAttribute('title', 'Non ancora acquistabile: mancano dei requisiti');
    expect(screen.getByText('Veste')).toBeInTheDocument();
    expect(screen.getByText('Da verificare')).toHaveAttribute('title', 'grado Nero (spendere oltre 10.000 yen) — Condizione non verificabile dai dati della partita');
  });

  it('senza partita non c\'è interruttore e tutti gli articoli sono elencati', async () => {
    usePartitaStore.setState({ attiva: null });
    getNegozio.mockResolvedValue(negozio);
    render(<MemoryRouter initialEntries={['/guida/negozi/untouchable']}><Routes><Route path="/guida/negozi/:chiave" element={<NegozioPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Untouchable' })).toBeInTheDocument();
    expect(getNegozio).toHaveBeenCalledWith('untouchable', undefined);
    expect(screen.queryByRole('checkbox', { name: /Solo disponibili ora/ })).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});

/** **La porta a senso unico.** «Nascondi dagli elenchi» toglieva la riga da ogni elenco e il
 *  comando per rimetterla stava nel modulo di modifica *di quella riga*: per aprirlo bisognava
 *  cliccarla, e la riga non c'era piu'. Qui si sorveglia che il blocco compaia e che il ripristino
 *  chieda davvero la cosa giusta. */
it('un articolo nascosto compare in un blocco a parte e si rimette negli elenchi', async () => {
  getNegozio.mockResolvedValue(negozio);
  getCatalogo.mockResolvedValue([
    { tipo: 'articolo', chiave: 'untouchable/u-tolto', nome: 'Kogatana nera', origine: 'seed', modificata: false, nascosta: true, dati: { negozio_chiave: 'untouchable' } },
    // di un altro negozio: non deve comparire qui
    { tipo: 'articolo', chiave: 'leblanc/altro', nome: 'Caffe', origine: 'seed', modificata: false, nascosta: true, dati: { negozio_chiave: 'leblanc' } },
  ]);
  nascondiElementoCatalogo.mockResolvedValue({});
  render(<MemoryRouter initialEntries={['/guida/negozi/untouchable']}><Routes><Route path="/guida/negozi/:chiave" element={<NegozioPage />} /></Routes></MemoryRouter>);
  const blocco = await screen.findByText(/1 articolo nascosto/);
  expect(blocco).toBeInTheDocument();
  expect(screen.queryByText('Caffe')).toBeNull();
  fireEvent.click(blocco);
  fireEvent.click(await screen.findByRole('button', { name: /Rimetti negli elenchi/ }));
  await waitFor(() => expect(nascondiElementoCatalogo).toHaveBeenCalledWith('articolo', 'untouchable/u-tolto', false));
});
