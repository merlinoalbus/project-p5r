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
});
