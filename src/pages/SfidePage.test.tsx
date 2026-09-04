/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test SfidePage — schede Battaglie Sfida, boss, Magnate, tratti con ricerca
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SfidePage } from './SfidePage';
import type { SfideDto } from '../types';

const { getSfide } = vi.hoisted(() => ({ getSfide: vi.fn() }));
vi.mock('../services/api', () => ({ getSfide }));

const dati: SfideDto = {
  battaglieSfida: { introduzione: 'Sfide del Covo.', sblocco: 'Dopo il finale.', regoleGenerali: 'Punteggio.', fonte: 'https://www.allgamestaff.it/b', elenco: [{ chiave: 'trial', nome: 'Trial', nomeIt: null, regole: 'Cinque livelli.', nemici: ['Piromane delle cripte'], punteggi: null, ricompense: ['Medaglie'], strategia: 'Colpire le debolezze.', livelloConsigliato: null, fonte: 'https://www.allgamestaff.it/t', verificato: true }] },
  bossSegreti: [{ chiave: 'jose', nome: 'Jose', dove: 'Mementos', quando: 'Con 123 timbri', requisiti: ['123 timbri'], livelloConsigliato: null, mosse: ['Deriva'], resistenze: [], debolezze: [], strategia: ['Cura sempre'], ricompense: ['Trofeo'], statistiche: { hp: 9999, sp: 999 }, nota: null, fonte: 'https://www.allgamestaff.it/j', verificato: true }],
  magnate: { fonte: 'https://www.allgamestaff.it/m', verificato: true, dove: 'Covo dei Ladri', regole: 'Gioco di carte a eliminazione.' },
  tratti: { introduzione: 'Ogni Persona ha un tratto.', fonte: 'https://www.allgamestaff.it/tr', verificato: true, elenco: [{ nome: 'Stirpe ardente', nomeEn: 'Heated Bloodline', effetto: 'Dimezza il costo in SP delle abilità di Fuoco', categoria: 'Riduzione SP', personaggio: null }, { nome: 'Cuore di ghiaccio', nomeEn: null, effetto: 'Dimezza il costo in SP delle abilità di Ghiaccio', categoria: 'Riduzione SP', personaggio: 'Zorro / Mercurio' }] },
  quizTv: { introduzione: 'Ogni giovedì.', numeroDomandeTotali: 11, fonte: 'https://www.allgamestaff.it/q', verificato: true },
};

describe('SfidePage', () => {
  it('mostra le Battaglie Sfida, i boss, Magnate e i tratti con ricerca', async () => {
    getSfide.mockResolvedValue(dati);
    render(<MemoryRouter><SfidePage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Trial' })).toBeInTheDocument();
    expect(screen.getByText('Piromane delle cripte')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Boss segreti' }));
    expect(screen.getByRole('heading', { name: 'Jose' })).toBeInTheDocument();
    expect(screen.getByText('Cura sempre')).toBeInTheDocument();
    expect(screen.getByText(/HP 9999/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Magnate' }));
    expect(screen.getByText('Gioco di carte a eliminazione.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Tratti' }));
    expect(screen.getByText('Stirpe ardente')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ghiaccio' } });
    expect(screen.queryByText('Stirpe ardente')).toBeNull();
    expect(screen.getByText('Cuore di ghiaccio')).toBeInTheDocument();
    expect(screen.getByText('1 tratti su 2.')).toBeInTheDocument();
  });
});
