/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test NegozioPage — scheda, filtri per categoria e destinatario, spunta «acquistato» per partita
// ============================================================

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { scegliVoce } from '../../test/selettore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NegozioPage } from './NegozioPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { ArticoloDto, NegozioDettaglioDto, PartitaDto } from '../types';

const { getNegozio, impostaAcquisto, getCatalogo, nascondiElementoCatalogo, getElementoCatalogo, posizioni } = vi.hoisted(() => ({
  getNegozio: vi.fn(),
  impostaAcquisto: vi.fn(),
  // Il blocco «Rimossi» del negozio interroga il catalogo: qui non ce n'e' nessuno.
  getCatalogo: vi.fn().mockResolvedValue([]),
  nascondiElementoCatalogo: vi.fn(),
  getElementoCatalogo: vi.fn(),
  posizioni: [] as Array<Record<string, unknown>>,
}));
// `getCatalogo` serve al blocco degli articoli nascosti; senza partita e senza nascosti torna vuoto.
vi.mock('../services/api', () => ({ getNegozio, impostaAcquisto, getCatalogo, nascondiElementoCatalogo, getElementoCatalogo, getNegozi: vi.fn().mockResolvedValue([]) }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../components/mappe/DoveSiTrova', () => ({
  DoveSiTrova: (props: Record<string, unknown>) => {
    posizioni.push(props);
    return <section aria-label="Dove si trova" />;
  },
}));

const art = (chiave: string, nome: string, categoria: ArticoloDto['categoria'], per: string | null, prezzo: number | null): ArticoloDto => ({ chiave, negozioChiave: 'untouchable', negozioNome: 'Untouchable', nome, nomeIt: null, categoria, per, prezzo, effetto: 'Effetto', statistiche: 'Attacco 50', quantita: null, oggettoFonte: null, oggettoChiave: null, disponibileDal: 'dal 6 giugno', condizione: null, nota: null, verificato: true, acquistato: false });
const negozio: NegozioDettaglioDto = { chiave: 'untouchable', nome: 'Untouchable', luogo: 'Shibuya, Central Street', luogoChiave: 'shibuya', quartiereNome: 'Shibuya', tipo: 'misto', gestore: 'Munehisa Iwai', confidente: { chiave: 'iwai', nome: 'Munehisa Iwai' }, orariStrutturati: { giorni: [], fasce: ['sera'], chiusoConPioggia: false, nota: null }, orariTesto: 'Solo di sera', sedeChiave: 'shibuya/untouchable', sedeNome: 'Untouchable', programmaPunti: null, note: null, articoli: 3, verificati: 3, articoliElenco: [art('untouchable/kogatana-nera', 'Kogatana nera', 'arma', 'Joker', 1000), art('untouchable/frusta', 'Frusta', 'arma', 'Ann', 1200), art('untouchable/giubbotto', 'Giubbotto', 'protezione', 'tutti', 3000)], acquistati: 0 };

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
    // Le categorie sono tessere con il conteggio, a scelta multipla: un secondo tocco le spegne.
    const categorie = screen.getByRole('group', { name: 'Categorie' });
    fireEvent.click(within(categorie).getByRole('button', { name: 'Protezione 1' }));
    expect(screen.queryByText('Kogatana nera')).toBeNull();
    expect(screen.getByText('Giubbotto')).toBeInTheDocument();
    fireEvent.click(within(categorie).getByRole('button', { name: 'Protezione 1' }));
    scegliVoce('Per chi', 'Ann');
    expect(screen.queryByText('Kogatana nera')).toBeNull();
    expect(screen.getByText('Frusta')).toBeInTheDocument();
    expect(screen.getByText('Giubbotto')).toBeInTheDocument();
    scegliVoce('Per chi', 'Per chiunque');
    await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: 'Kogatana nera acquistato' })); });
    expect(impostaAcquisto).toHaveBeenCalledWith(9, 'untouchable/kogatana-nera', true);
    expect(await screen.findByText(/1 acquistati/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Da acquistare' }));
    expect(screen.queryByText('Kogatana nera')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Acquistati' }));
    expect(screen.getByText('Kogatana nera')).toBeInTheDocument();
    expect(screen.queryByText('Giubbotto')).toBeNull();
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
    // senza partita niente segmenti di stato e disponibilità
    expect(screen.queryByRole('radiogroup', { name: "Stato d'acquisto" })).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    // la scheda dice la sede, gli orari e non la fonte
    // la sede apre la pagina del quartiere con il luogo evidenziato
    expect(screen.getByRole('link', { name: /^Untouchable$/ })).toHaveAttribute('href', '/guida/citta/shibuya#luogo-shibuya-untouchable');
    expect(screen.getByText('Solo di sera')).toBeInTheDocument();
    expect(screen.queryByText('fonte')).toBeNull();
    expect(screen.queryByText(/Sblocco:/)).toBeNull();
  });
});

/** **La porta a senso unico.** «Nascondi dagli elenchi» toglieva la riga da ogni elenco e il
 *  comando per rimetterla stava nel modulo di modifica *di quella riga*: per aprirlo bisognava
 *  cliccarla, e la riga non c'era piu'. Qui il blocco «Rimossi» del negozio chiede al server le
 *  sole righe nascoste di questo negozio e le rimette in un tocco. */
it('un articolo nascosto compare nel blocco «Rimossi» del negozio e si rimette negli elenchi', async () => {
  getNegozio.mockResolvedValue(negozio);
  getCatalogo.mockImplementation((_tipo: string, f?: { negozio?: string }) => Promise.resolve([
    { tipo: 'articolo', chiave: 'untouchable/u-tolto', nome: 'Kogatana nera', origine: 'seed', modificata: false, nascosta: true, dati: { negozio_chiave: 'untouchable' } },
    { tipo: 'articolo', chiave: 'leblanc/altro', nome: 'Caffe', origine: 'seed', modificata: false, nascosta: true, dati: { negozio_chiave: 'leblanc' } },
  ].filter((e) => e.dati.negozio_chiave === f?.negozio)));
  nascondiElementoCatalogo.mockResolvedValue({});
  render(<MemoryRouter initialEntries={['/guida/negozi/untouchable']}><Routes><Route path="/guida/negozi/:chiave" element={<NegozioPage />} /></Routes></MemoryRouter>);
  const blocco = await screen.findByRole('region', { name: 'Articoli dei negozi rimossi' });
  expect(getCatalogo).toHaveBeenCalledWith('articolo', { nascosti: true, negozio: 'untouchable' });
  expect(within(blocco).getByText('Kogatana nera')).toBeInTheDocument();
  expect(screen.queryByText('Caffe')).toBeNull();
  fireEvent.click(within(blocco).getByRole('button', { name: /Rimetti negli elenchi/ }));
  await waitFor(() => expect(nascondiElementoCatalogo).toHaveBeenCalledWith('articolo', 'untouchable/u-tolto', false));
  // dopo il ripristino la scheda si ricarica
  await waitFor(() => expect(getNegozio.mock.calls.length).toBeGreaterThan(1));
});

/** Un negozio senza sede né quartiere (online, TV, dentro un Palazzo) dice comunque dove si compra. */
it('senza sede né quartiere mostra l’indicazione testuale di dove si compra', async () => {
  usePartitaStore.setState({ attiva: null });
  getNegozio.mockResolvedValue({ ...negozio, chiave: 'tanaka', nome: 'Tanaka', luogoChiave: null, quartiereNome: null, sedeChiave: null, sedeNome: null, luogo: 'Online, dal laptop di Leblanc', articoliElenco: [] });
  render(<MemoryRouter initialEntries={['/guida/negozi/tanaka']}><Routes><Route path="/guida/negozi/:chiave" element={<NegozioPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Tanaka' })).toBeInTheDocument();
  expect(screen.getByText(/Online, dal laptop di Leblanc/)).toBeInTheDocument();
});
