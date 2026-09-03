/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test PannelloVelluto e ForcaIsolamento — riassunto/dettagli, interruttore Allarme, calcolatori sulla scorta
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PannelloVelluto } from './PannelloVelluto';
import { ForcaIsolamento } from './ForcaIsolamento';
import type { PersonaPossedutaDto, PersonaRiassuntoDto, VellutoDto } from '../../types';

const { getPossedute, getSuggerimentoIsolamento, eseguiIsolamento } = vi.hoisted(() => ({ getPossedute: vi.fn(), getSuggerimentoIsolamento: vi.fn(), eseguiIsolamento: vi.fn() }));
vi.mock('../../services/api', () => ({ getPossedute, getSuggerimentoIsolamento, eseguiIsolamento }));
vi.mock('../../stores/notificationStore', () => ({ notifica: vi.fn() }));

const velluto: VellutoDto = {
  partitaId: 1,
  compendio: { registrate: 60, totale: 232, percentuale: 25 },
  sconto: 10,
  allarmeAttivo: false,
  gemelle: {
    rango: 4, trattamentoSpeciale: false,
    sblocchi: [
      { rango: 1, nome: 'Ghigliottina di gruppo', effetto: 'fusione a tre o più', ottenuto: true },
      { rango: 3, nome: 'Isolamento', effetto: 'addestramento', ottenuto: true },
      { rango: 5, nome: 'Trattamento speciale', effetto: 'fusione sopra livello', ottenuto: false },
    ],
    prossimo: { rango: 5, nome: 'Trattamento speciale', effetto: 'fusione sopra livello' },
  },
  arcani: [
    { arcana: 'Fool', arcanaNome: 'Matto', confidenteChiave: 'igor', confidenteNome: 'Igor', rango: 10, moltiplicatoreExp: 3 },
    { arcana: 'Magician', arcanaNome: 'Mago', confidenteChiave: 'morgana', confidenteNome: 'Morgana', rango: 5, moltiplicatoreExp: 2 },
    { arcana: 'Lovers', arcanaNome: 'Amanti', confidenteChiave: 'ann', confidenteNome: 'Ann', rango: 0, moltiplicatoreExp: 1 },
  ],
};

function posseduta(id: number, personaId: number, nome: string, arcana: string, arcanaNome: string, livello: number): PersonaPossedutaDto {
  return { id, personaId, nome, nomeIt: nome, arcana, arcanaNome, livello } as unknown as PersonaPossedutaDto;
}
const persone = [
  { id: 1, nome: 'Arsène', arcana: 'Fool', rara: false }, { id: 2, nome: 'Pixie', arcana: 'Lovers', rara: false }, { id: 3, nome: 'Regent', arcana: 'Emperor', rara: true },
] as unknown as PersonaRiassuntoDto[];

describe('PannelloVelluto', () => {
  it('mostra sconto, Allarme e Gemelle; i dettagli elencano sblocchi e moltiplicatori; il pulsante Allarme chiama la callback', () => {
    const onCambia = vi.fn();
    render(<MemoryRouter><PannelloVelluto velluto={velluto} onCambiaAllarme={onCambia} /></MemoryRouter>);
    expect(screen.getByText('Registro 25% · sconto 10%')).toBeInTheDocument();
    expect(screen.getByText('Gemelle rango 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Allarme spento' }));
    expect(onCambia).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Dettagli' }));
    expect(screen.getAllByText(/Trattamento speciale/).length).toBeGreaterThan(0);
    expect(screen.getByText('Matto ×3')).toBeInTheDocument();
    expect(screen.getByText('Mago ×2')).toBeInTheDocument();
    expect(screen.queryByText(/Amanti ×/)).toBeNull();
    expect(screen.getByText(/Senza «Trattamento speciale»/)).toBeInTheDocument();
  });
  it('senza partita spiega che i prezzi sono pieni', () => {
    render(<MemoryRouter><PannelloVelluto velluto={null} /></MemoryRouter>);
    expect(screen.getByText(/Nessuna partita attiva/)).toBeInTheDocument();
  });
});

describe('ForcaIsolamento', () => {
  it('Forca: sacrifici ordinati per moltiplicatore con rango, Tesoro, stesso arcano e penalità; Isolamento: giorni, incenso e tier', async () => {
    getSuggerimentoIsolamento.mockResolvedValue({ elemento: 'fire', elementoNome: 'Fuoco', tier: 'Evade', skill: { id: 5, nome: 'Evade Fire', nomeIt: 'Schiva fuoco' } });
    getPossedute.mockResolvedValue([
      posseduta(11, 1, 'Arsène', 'Fool', 'Matto', 20),
      posseduta(12, 2, 'Pixie', 'Lovers', 'Amanti', 30),
      posseduta(13, 3, 'Regent', 'Emperor', 'Imperatore', 10),
    ]);
    render(<MemoryRouter><ForcaIsolamento persone={persone} partitaId={1} velluto={velluto} /></MemoryRouter>);
    const ricevente = await screen.findByLabelText('Persona ricevente');
    await act(async () => { fireEvent.change(ricevente, { target: { value: '11' } }); });
    // ricevente Arsène (Matto, rango 10 → Igor al massimo ×4,0): Regent è un Tesoro (×3) → 12; Pixie livello 30 > 20 → ×0,5 → 2
    const righe = screen.getByRole('list', { name: 'Sacrifici possibili' }).querySelectorAll('li');
    expect(righe).toHaveLength(2);
    expect(righe[0].textContent).toMatch(/Regent/);
    expect(righe[0].textContent).toMatch(/EXP ×12/);
    expect(righe[1].textContent).toMatch(/Pixie/);
    expect(righe[1].textContent).toMatch(/EXP ×2Esegui/);
    expect(righe[1].textContent).toMatch(/livello superiore/);
    // Isolamento: Gemelle rango 4 → 3 giorni; incenso base 4 giorni → 2 applicazioni +2; Pixie livello 30 → Evade
    expect(screen.getByText(/Durata dell'addestramento/).textContent).toMatch(/3 giorni/);
    expect(screen.getByText(/applicazioni →/).textContent).toMatch(/2 applicazioni → \+2 per statistica/);
    await act(async () => { fireEvent.change(screen.getByLabelText('Persona da isolare'), { target: { value: '12' } }); });
    expect(screen.getByText(/resistenza ottenuta di tier/).textContent).toMatch(/Evade/);
    expect(screen.getByText(/resistenza ottenuta di tier/).textContent).toMatch(/sotto il livello 34/);
  });
});
