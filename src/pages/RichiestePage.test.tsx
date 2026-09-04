/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test RichiestePage — elenco con filtri per stato e Dedalo, dettagli, stato per partita, sezione Jose
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RichiestePage } from './RichiestePage';
import { usePartitaStore } from '../stores/partitaStore';
import type { PartitaDto, RichiestaDto, RichiesteDto } from '../types';

const { getRichieste, impostaStatoRichiesta } = vi.hoisted(() => ({ getRichieste: vi.fn(), impostaStatoRichiesta: vi.fn() }));
vi.mock('../services/api', () => ({ getRichieste, impostaStatoRichiesta }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));

const ric = (chiave: string, nome: string, area: string, extra: Partial<RichiestaDto> = {}): RichiestaDto => ({ chiave, nome, committente: 'Mishima', disponibileDal: '7 maggio', scadenza: '', area, areaChiave: 'mementos-01-qimranut', piano: 'Area 1', bersaglio: { nome: 'Nakanohara', livello: null, formaDemoniaca: 'Obariyon', debolezze: ['Tuono'], resistenze: [], vulnerabileConfusione: true }, ricompense: ['485 PE'], confidente: null, note: '', fonte: 'https://www.allgamestaff.it/x', stato: null, ...extra });
const dati: RichiesteDto = { richieste: [ric('a', 'Un ex piuttosto appiccicoso', 'Dedalo di Qimranut'), ric('b', 'Bullismo sui bulli', 'Dedalo di Aiyatsbus', { confidente: { chiave: 'ryuji', nome: 'Ryuji', rango: 2 } })], jose: { introduzione: 'Jose studia gli umani.', fiori: { descrizione: 'Valuta dei Mementos.' }, timbri: null, bossSegreto: null, scambi: [{ nome: 'Fiala', effetto: 'Vertigini', costo: 30, requisito: 'Aiyatsbus' }] }, completate: 0, totale: 2 };

describe('RichiestePage', () => {
  it('mostra le Richieste, filtra per Dedalo, apre i dettagli e segna completata', async () => {
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova' } as PartitaDto });
    getRichieste.mockResolvedValue(dati);
    impostaStatoRichiesta.mockResolvedValue({ ...dati.richieste[0], stato: 'completata' });
    render(<MemoryRouter><RichiestePage /></MemoryRouter>);
    expect(await screen.findByText('Un ex piuttosto appiccicoso')).toBeInTheDocument();
    expect(getRichieste).toHaveBeenCalledWith(7);
    expect(screen.getByText('Ryuji rango 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jose: fiori, timbri e scambi' })).toBeInTheDocument();
    expect(screen.getByText('Fiala')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Dedalo' }), { target: { value: 'Dedalo di Aiyatsbus' } });
    expect(screen.queryByText('Un ex piuttosto appiccicoso')).toBeNull();
    fireEvent.change(screen.getByRole('combobox', { name: 'Dedalo' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Un ex piuttosto appiccicoso/ }));
    expect(screen.getByRole('link', { name: 'Apri il Dedalo' })).toHaveAttribute('href', '/guida/dungeon/mementos?area=mementos-01-qimranut');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Completata' })); });
    expect(impostaStatoRichiesta).toHaveBeenCalledWith(7, 'a', 'completata');
    expect(await screen.findByText(/1 completate/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Da fare' }));
    expect(screen.queryByText('Un ex piuttosto appiccicoso')).toBeNull();
    expect(screen.getByText('Bullismo sui bulli')).toBeInTheDocument();
  });
});
