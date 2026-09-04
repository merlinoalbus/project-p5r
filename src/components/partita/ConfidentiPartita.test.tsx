// @vitest-environment jsdom
// ============================================================
// Test ConfidentiPartita — note della risposta, bonus arcano dalla scorta, soglie, annulla ultimo
// ============================================================

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConfidentiPartita } from './ConfidentiPartita';
import type { ConfidentePartitaDto, ModificaConfidente } from '../../types';

const { getConfidentiPartita, aggiornaConfidente, getImmagini } = vi.hoisted(() => ({
  getConfidentiPartita: vi.fn(),
  aggiornaConfidente: vi.fn(),
  getImmagini: vi.fn(),
}));
vi.mock('../../services/api', () => ({
  getConfidentiPartita,
  aggiornaConfidente,
  getImmagini,
  caricaImmagine: vi.fn(),
  eliminaImmagine: vi.fn(),
  importaImmagineDaUrl: vi.fn(),
  urlImmagine: (ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file`,
}));

function confidente(sovrascrivi: Partial<ConfidentePartitaDto>): ConfidentePartitaDto {
  return {
    chiave: 'ryuji', nome: 'Ryuji Sakamoto', arcana: 'Chariot', arcanaNome: 'Carro', ordine: 7,
    sbloccato: true, rango: 2, punti: 0, puntiNecessari: 20, mancanti: 20, regaliFatti: [], personaArcanoInScorta: false, note: '', semafori: [], bloccato: null, updatedAt: null,
    ...sovrascrivi,
  };
}

beforeEach(() => {
  getConfidentiPartita.mockReset();
  aggiornaConfidente.mockReset();
  getImmagini.mockReset();
  getImmagini.mockResolvedValue([]);
});

describe('ConfidentiPartita', () => {
  it('un Confidente bloccato dai requisiti è spento, mostra i motivi e non permette «+» né lo sblocco', async () => {
    getConfidentiPartita.mockResolvedValue([
      confidente({ chiave: 'makoto', nome: 'Makoto Niijima', arcana: 'Priestess', arcanaNome: 'Papessa', sbloccato: false, rango: 0, bloccato: { rango: 1, motivi: ['Dote sociale Conoscenza a rango 3. (Conoscenza: rango 1 di 3)', '26 luglio (oggi è il 04-09)'] } }),
      confidente({}),
    ]);
    render(<MemoryRouter><ConfidentiPartita partitaId={7} /></MemoryRouter>);
    const carta = await screen.findByRole('listitem', { name: 'Makoto Niijima: bloccato per il rango 1' });
    expect(carta).toHaveClass('poster--bloccato');
    expect(within(carta).getByText('Dote sociale Conoscenza a rango 3. (Conoscenza: rango 1 di 3)')).toBeInTheDocument();
    expect(within(carta).getByRole('button', { name: /Rango di Makoto Niijima più uno/ })).toBeDisabled();
    expect(within(carta).getByRole('button', { name: /Makoto Niijima: bloccato/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rango di Ryuji Sakamoto più uno' })).not.toBeDisabled();
    // due gruppi: il bloccato sta in fondo, in «Non ancora disponibili»
    const attivi = screen.getByRole('region', { name: 'Attivi e sbloccabili' });
    const bloccati = screen.getByRole('region', { name: 'Non ancora disponibili' });
    expect(within(attivi).getByText('Ryuji Sakamoto')).toBeInTheDocument();
    expect(within(bloccati).getByText('Makoto Niijima')).toBeInTheDocument();
    expect(attivi.compareDocumentPosition(bloccati) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // via d'uscita esplicita: forza il rango bloccato
    aggiornaConfidente.mockResolvedValue(confidente({ chiave: 'makoto', nome: 'Makoto Niijima', rango: 1, sbloccato: true, bloccato: null }));
    await act(async () => { fireEvent.click(within(bloccati).getByRole('button', { name: /segna comunque il rango 1/i })); });
    expect(aggiornaConfidente).toHaveBeenCalledWith(7, 'makoto', { rango: 1, forza: true });
  });

  it('propone il bonus arcano dalla scorta e invia note, moltiplicatori e annulla ultimo', async () => {
    getConfidentiPartita.mockResolvedValue([confidente({ regaliFatti: [], personaArcanoInScorta: true })]);
    aggiornaConfidente.mockResolvedValueOnce(confidente({ regaliFatti: [], personaArcanoInScorta: true, punti: 15, mancanti: 5 }));
    render(<MemoryRouter><ConfidentiPartita partitaId={1} /></MemoryRouter>);

    const chip = await screen.findByRole('button', { name: 'Persona Carro ×1,5 · in scorta' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    // anteprime con bonus: 7,5 / 15 / 22,5; regalo 75; uscita 15
    expect(screen.getByLabelText('Ryuji Sakamoto: risposta da 1 nota (7,5 punti)')).toBeInTheDocument();
    expect(screen.getByLabelText('Ryuji Sakamoto: regalo gradito (75 punti)')).toBeInTheDocument();

    await act(async () => { screen.getByLabelText('Ryuji Sakamoto: risposta da 2 note (15 punti)').click(); });
    expect(aggiornaConfidente).toHaveBeenCalledWith(1, 'ryuji', { noteRisposta: 2, bonusArcano: true, esame: undefined, invito: false } satisfies ModificaConfidente);
    expect(await screen.findByText(/mancano/)).toHaveTextContent('mancano 5');
    expect(screen.getByRole('button', { name: /annulla l'ultimo incremento/ })).toHaveTextContent('Annulla ultimo (−15)');

    // esami 1º ×1,5 e invito ×1,2 cumulativi: 5 × 1,5 × 1,5 × 1,2 = 13,5
    await act(async () => { screen.getByRole('button', { name: 'Esami 1º ×1,5' }).click(); });
    await act(async () => { screen.getByRole('button', { name: 'Invito SMS ×1,2' }).click(); });
    expect(screen.getByLabelText('Ryuji Sakamoto: risposta da 1 nota (13,5 punti)')).toBeInTheDocument();

    aggiornaConfidente.mockResolvedValueOnce(confidente({ regaliFatti: [], personaArcanoInScorta: true, punti: 0, mancanti: 20 }));
    await act(async () => { screen.getByRole('button', { name: /annulla l'ultimo incremento/ }).click(); });
    expect(aggiornaConfidente).toHaveBeenLastCalledWith(1, 'ryuji', { deltaPunti: -15 });
  });

  it('senza Persona in scorta il bonus è spento ma forzabile', async () => {
    getConfidentiPartita.mockResolvedValue([confidente({})]);
    render(<MemoryRouter><ConfidentiPartita partitaId={1} /></MemoryRouter>);
    const chip = await screen.findByRole('button', { name: 'Persona Carro ×1,5 · attiva a mano' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Ryuji Sakamoto: risposta da 3 note (15 punti)')).toBeInTheDocument();
    await act(async () => { chip.click(); });
    expect(screen.getByLabelText('Ryuji Sakamoto: risposta da 3 note (22,5 punti)')).toBeInTheDocument();
  });

  it('distingue passaggi non a punti, Confidenti senza soglie e rango massimo', async () => {
    getConfidentiPartita.mockResolvedValue([
      confidente({ rango: 1, puntiNecessari: 0, mancanti: 0 }),
      confidente({ chiave: 'igor', nome: 'Igor', arcana: 'Fool', arcanaNome: 'Matto', rango: 0, sbloccato: false, puntiNecessari: null, mancanti: null }),
      confidente({ chiave: 'morgana', nome: 'Morgana', arcana: 'Magician', arcanaNome: 'Mago', rango: 10, puntiNecessari: null, mancanti: null }),
    ]);
    render(<MemoryRouter><ConfidentiPartita partitaId={1} /></MemoryRouter>);
    expect(await screen.findByText(/Il passaggio al rango 2 non dipende dai punti/)).toBeInTheDocument();
    const cards = screen.getAllByRole('listitem');
    expect(within(cards[1]).queryByText(/Punti verso il rango/)).not.toBeInTheDocument();
    // stati sempre spiegati: non sbloccato, rango massimo
    expect(within(cards[1]).getByText(/Confidente non ancora sbloccato/)).toBeInTheDocument();
    expect(within(cards[2]).getByText('Rango massimo raggiunto.')).toBeInTheDocument();
    expect(within(cards[2]).getByText('MAX')).toBeInTheDocument();
    expect(within(cards[2]).getByLabelText('Rango di Morgana più uno')).toBeDisabled();
    // rango > 0 → l'interruttore «Sbloccato» non è modificabile; a rango 0 lo è
    expect(within(cards[0]).getByRole('button', { name: /: sbloccato$/ })).toBeDisabled();
    expect(within(cards[1]).getByRole('button', { name: /: bloccato$/ })).toBeEnabled();
  });
});
