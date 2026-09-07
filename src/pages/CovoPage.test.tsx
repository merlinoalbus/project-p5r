/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test CovoPage — il conto delle Medaglie P, le due colonne, la ricerca unica
// ============================================================
//
// Le prove guardano quel che la pagina promette: contare solo ciò che i dati reggono (mai un
// totale delle medaglie finché una sola sfida non lo dichiara), tenere sfide e premi affiancati,
// e cercare in tutte e due le colonne con un campo solo.
//
// La prima prova è quella che conta: con i dati veri **nessuna** delle 52 sfide dichiara il
// proprio valore, e un bilancio calcolato lo stesso direbbe «mancano 201 medaglie» con l'aria di
// un dato. Qui si fissa che quel totale non compare finché non lo dichiarano tutte.
// ============================================================

import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CovoPage } from './CovoPage';
import type { CompletamentoDto } from '../types';

const { getCompletamento } = vi.hoisted(() => ({ getCompletamento: vi.fn() }));
vi.mock('../services/api', () => ({ getCompletamento }));

/** Come stanno i dati veri: nessuna sfida dichiara il proprio valore, qualche premio non ha prezzo. */
const covo = {
  introduzione: 'Il Covo dei Ladri è l’area bonus di Royal.',
  medaglie: 'La guida indica un totale di 2.420 Medaglie P; il valore della singola sfida non è specificato.',
  sfide: [
    { nome: 'Stomaco di ferro', requisito: 'Finire il Big Bang Burger', medaglie: null as number | null },
    { nome: 'Ladro provetto', requisito: 'Rubare cento volte', medaglie: null as number | null },
  ],
  premi: [
    { nome: 'Concept art', costo: 5, sblocco: 'dal 1° maggio', effetto: null },
    { nome: 'Artwork speciale', costo: 10, sblocco: null, effetto: 'Illustrazioni celebrative' },
    { nome: 'Colonna sonora', costo: null, sblocco: null, effetto: 'Ascolto libero' },
  ],
  fonte: 'https://www.allgamestaff.it/c',
};
const dati = { covo } as unknown as CompletamentoDto;

function apri(sostituto?: Partial<typeof covo>) {
  getCompletamento.mockResolvedValue(sostituto ? ({ covo: { ...covo, ...sostituto } } as unknown as CompletamentoDto) : dati);
  render(<MemoryRouter><CovoPage /></MemoryRouter>);
  return screen.findByRole('heading', { level: 1, name: 'Covo dei Ladri' });
}

describe('CovoPage', () => {
  it('conta quel che i dati reggono e tace il totale finché le sfide non dichiarano il valore', async () => {
    await apri();
    const conto = screen.getByRole('region', { name: 'Come funziona il Covo' });
    expect(within(conto).getByText('Sfide')).toBeInTheDocument();
    expect(within(conto).getByText('valore della singola sfida non dichiarato')).toBeInTheDocument();
    expect(within(conto).getByText('2 con prezzo dichiarato')).toBeInTheDocument();
    // La fascia dei prezzi è un dato onesto: c'è il minimo e c'è il massimo, non una somma.
    expect(within(conto).getByText('5–10')).toBeInTheDocument();
    // Nessun bilancio: né una spesa complessiva né un avanzo, che con questi dati sarebbero finti.
    expect(within(conto).queryByText(/Avanzano|Mancano|Costano/)).toBeNull();
    expect(within(conto).getByText(/non si sommano/)).toBeInTheDocument();
  });

  it('mostra il totale delle medaglie solo quando lo dichiarano tutte le sfide', async () => {
    await apri({ sfide: [{ nome: 'A', requisito: 'r', medaglie: 10 }, { nome: 'B', requisito: 'r', medaglie: 5 }] });
    expect(within(screen.getByRole('region', { name: 'Come funziona il Covo' })).getByText('15 medaglie in tutto')).toBeInTheDocument();
  });

  it('tiene sfide e premi in due elenchi distinti', async () => {
    await apri();
    const sfide = screen.getByRole('region', { name: 'Sfide del Covo' });
    const premi = screen.getByRole('region', { name: 'Premi del Covo' });
    expect(within(sfide).getByText('Stomaco di ferro')).toBeInTheDocument();
    expect(within(premi).getByText('Concept art')).toBeInTheDocument();
    expect(within(premi).getByText('Si sblocca: dal 1° maggio')).toBeInTheDocument();
    expect(within(sfide).queryByText('Concept art')).toBeNull();
  });

  it('cerca in tutte e due le colonne con un campo solo', async () => {
    await apri();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'concept' } });
    expect(screen.getByText('Concept art')).toBeInTheDocument();
    expect(screen.queryByText('Stomaco di ferro')).toBeNull();
    expect(screen.getByText('Nessuna sfida con questo testo.')).toBeInTheDocument();
    // Il titolo dichiara quanto si sta guardando di quanto c'è.
    expect(screen.getByRole('heading', { name: 'Premi · 1 di 3' })).toBeInTheDocument();
    // La ricerca guarda anche il requisito di una sfida, non solo il suo nome.
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'big bang' } });
    expect(screen.getByText('Stomaco di ferro')).toBeInTheDocument();
    expect(screen.getByText('Nessun premio con questo testo.')).toBeInTheDocument();
  });
});
