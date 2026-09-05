/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test NegozioPage — scheda, filtri per categoria e destinatario, spunta «acquistato» per partita
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NegozioPage } from './NegozioPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { ArticoloDto, NegozioDettaglioDto, PartitaDto } from '../types';

const { getNegozio, impostaAcquisto } = vi.hoisted(() => ({ getNegozio: vi.fn(), impostaAcquisto: vi.fn() }));
vi.mock('../services/api', () => ({ getNegozio, impostaAcquisto }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));

const art = (chiave: string, nome: string, categoria: ArticoloDto['categoria'], per: string | null, prezzo: number | null): ArticoloDto => ({ chiave, negozioChiave: 'untouchable', negozioNome: 'Untouchable', nome, nomeIt: null, categoria, per, prezzo, effetto: 'Effetto', statistiche: 'Attacco 50', disponibileDal: 'dal 6 giugno', condizione: null, nota: null, fonte: 'https://www.allgamestaff.it/x', verificato: true, acquistato: false });
const negozio: NegozioDettaglioDto = { chiave: 'untouchable', nome: 'Untouchable', luogo: 'Shibuya, Central Street', luogoChiave: 'shibuya', quartiereNome: 'Shibuya', tipo: 'misto', gestore: 'Munehisa Iwai', confidente: { chiave: 'iwai', nome: 'Munehisa Iwai' }, orari: 'Sera', sblocco: 'Da subito', note: null, fonte: 'https://www.allgamestaff.it/n', articoli: 3, verificati: 3, articoliElenco: [art('untouchable/kogatana-nera', 'Kogatana nera', 'arma', 'Joker', 1000), art('untouchable/frusta', 'Frusta', 'arma', 'Ann', 1200), art('untouchable/giubbotto', 'Giubbotto', 'protezione', 'tutti', 3000)], acquistati: 0 };

describe('NegozioPage', () => {
  it('mostra la scheda, filtra per categoria e destinatario e segna un articolo acquistato', async () => {
    usePartitaStore.setState({ attiva: { id: 9, nome: 'Prova' } as PartitaDto });
    getNegozio.mockResolvedValue(negozio);
    impostaAcquisto.mockResolvedValue({ ...negozio.articoliElenco[0], acquistato: true });
    render(<MemoryRouter initialEntries={['/guida/negozi/untouchable']}><Routes><Route path="/guida/negozi/:chiave" element={<NegozioPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Untouchable' })).toBeInTheDocument();
    expect(getNegozio).toHaveBeenCalledWith('untouchable', 9);
    expect(screen.getByRole('link', { name: 'Munehisa Iwai' })).toHaveAttribute('href', '/confidenti/iwai');
    expect(screen.getByText('Kogatana nera')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Categoria' }), { target: { value: 'protezione' } });
    expect(screen.queryByText('Kogatana nera')).toBeNull();
    expect(screen.getByText('Giubbotto')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Categoria' }), { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Per chi' }), { target: { value: 'Ann' } });
    expect(screen.queryByText('Kogatana nera')).toBeNull();
    expect(screen.getByText('Frusta')).toBeInTheDocument();
    expect(screen.getByText('Giubbotto')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Per chi' }), { target: { value: '' } });
    await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: 'Kogatana nera acquistato' })); });
    expect(impostaAcquisto).toHaveBeenCalledWith(9, 'untouchable/kogatana-nera', true);
    expect(await screen.findByText(/1 acquistati/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nascondi acquistati' }));
    expect(screen.queryByText('Kogatana nera')).toBeNull();
  });

  it('con la partita «Solo disponibili ora» nasconde gli articoli non ancora disponibili (riapribili), il chip spiega il motivo', async () => {
    usePartitaStore.setState({ attiva: { id: 9, nome: 'Prova' } as PartitaDto });
    const bloccato = { ...art('untouchable/kukri', 'Kukri', 'arma', 'Joker', 3800), disponibileDal: "a partire dall'arco del Palazzo di Madarame", disponibilita: { stato: 'bloccato' as const, requisiti: [{ indice: 0, tipo: 'palazzo' as const, stato: 'rosso' as const, testo: "a partire dall'arco del Palazzo di Madarame", dettaglio: 'Palazzo di Kamoshida: segna il boss come sconfitto nella Guida', manuale: false, confermato: false }] } };
    const dubbio = { ...art('untouchable/veste', 'Veste', 'protezione', 'tutti', 500), condizione: 'grado Nero (spendere oltre 10.000 yen)', disponibilita: { stato: 'ignoto' as const, requisiti: [{ indice: 0, tipo: 'manuale' as const, stato: 'grigio' as const, testo: 'grado Nero (spendere oltre 10.000 yen)', dettaglio: 'Condizione non verificabile dai dati della partita', manuale: true, confermato: false }] } };
    getNegozio.mockResolvedValue({ ...negozio, disponibilita: { stato: 'disponibile', requisiti: [] }, articoliElenco: [{ ...negozio.articoliElenco[0], disponibilita: { stato: 'disponibile', requisiti: [] } }, bloccato, dubbio] });
    render(<MemoryRouter initialEntries={['/guida/negozi/untouchable']}><Routes><Route path="/guida/negozi/:chiave" element={<NegozioPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Untouchable' })).toBeInTheDocument();
    // predefinito acceso: il bloccato è nascosto, il dubbio resta con il chip «Da verificare»
    const interruttore = screen.getByRole('checkbox', { name: /Solo disponibili ora/ });
    expect(interruttore).toBeChecked();
    expect(screen.getByText(/1 non ancora/)).toBeInTheDocument();
    expect(screen.queryByText('Kukri')).toBeNull();
    expect(screen.getByText('Veste')).toBeInTheDocument();
    expect(screen.getByText('Da verificare')).toHaveAttribute('title', 'grado Nero (spendere oltre 10.000 yen) — Condizione non verificabile dai dati della partita');
    fireEvent.click(interruttore);
    expect(screen.getByText('Kukri')).toBeInTheDocument();
    expect(screen.getByText('Non ancora')).toHaveAttribute('title', "a partire dall'arco del Palazzo di Madarame — Palazzo di Kamoshida: segna il boss come sconfitto nella Guida");
  });

  it('senza partita non c\'è interruttore e tutti gli articoli sono elencati', async () => {
    usePartitaStore.setState({ attiva: null });
    getNegozio.mockResolvedValue(negozio);
    render(<MemoryRouter initialEntries={['/guida/negozi/untouchable']}><Routes><Route path="/guida/negozi/:chiave" element={<NegozioPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Untouchable' })).toBeInTheDocument();
    expect(getNegozio).toHaveBeenCalledWith('untouchable', undefined);
    expect(screen.queryByRole('checkbox', { name: /Solo disponibili ora/ })).toBeNull();
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });
});
