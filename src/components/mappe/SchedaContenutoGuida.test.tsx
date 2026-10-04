/** @vitest-environment jsdom */
// ============================================================
// Test SchedaContenutoGuida — un elemento della guida senza mappa collegato a una voce descrittiva non offre stato (2026-10-01)
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SchedaContenutoGuida } from './SchedaContenutoGuida';
import type { SchedaContenutoGuidaDto } from '../../../shared/organizzazioneMappe';

vi.mock('../../services/api', (vero) => moduloApi(vero, { aggiornaSpillo: vi.fn(), aggiungiImmagineSpillo: vi.fn(), aggiornaImmagineSpillo: vi.fn(), eliminaImmagineSpillo: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaStatoPunto: vi.fn(), impostaAcquisto: vi.fn() }));
vi.mock('../guida/CondizioniEditor', () => ({ CondizioniEditor: () => null }));

const voce = (tipo: string) => ({ chiave: 'futaba-02/0', tipo, nome: 'Tesoro avvistato', descrizione: '', esauribile: false, dungeon: 'futaba', area: 'futaba-02', stato: null });
const elemento = (tipoPunto: string): SchedaContenutoGuidaDto => ({
  id: 48, uid: 'u48', tipo: 'nota', tipoNome: 'Nota', nome: 'Tesoro avvistato', colore: '#ececf1', descrizione: 'Visibile da lontano.', riferimento: { tipo: 'punto', chiave: 'futaba-02/0' },
  collezionabile: false, ordine: 0, origine: 'seed', raccolto: false, condizioni: [], immagini: [], updatedAt: '', areaGuida: 'futaba-02',
  // il server dà la voce sia nel dettaglio del riferimento (strato di prima) sia nel campo `voce` (094): la scheda legge `voce`
  dettaglio: { tipo: 'punto', punto: voce(tipoPunto) }, voce: voce(tipoPunto),
} as unknown as SchedaContenutoGuidaDto);

it('collegato a una voce «altro»: la dicitura, nessun Ottenuto', () => {
  render(<MemoryRouter><SchedaContenutoGuida spillo={elemento('altro')} partitaId={4} onChiudi={vi.fn()} onCambiato={vi.fn().mockResolvedValue(undefined)} /></MemoryRouter>);
  expect(screen.getByText('Voce descrittiva della guida: si legge, non si segna.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ottenuto' })).toBeNull();
});

it('collegato a una voce che si segna (una sicura): Ottenuto c’è', () => {
  render(<MemoryRouter><SchedaContenutoGuida spillo={elemento('sicura')} partitaId={4} onChiudi={vi.fn()} onCambiato={vi.fn().mockResolvedValue(undefined)} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Ottenuto' })).toBeInTheDocument();
});

// Le tre righe `// …` scritte dentro il JSX del modulo erano testo, non commenti: React le mostrava nel modulo di modifica
// (trovato con la voce 4 della verifica completa, 2026-10-04). Nel modulo non deve comparire nessuna riga che cominci con «//».
it('il modulo di modifica non mostra testo di commento', () => {
  render(<MemoryRouter><SchedaContenutoGuida spillo={elemento('sicura')} partitaId={4} onChiudi={vi.fn()} onCambiato={vi.fn().mockResolvedValue(undefined)} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Modifica contenuto' }));
  const modulo = screen.getByRole('form', { name: 'Modifica contenuto della guida' });
  expect(modulo.textContent).not.toMatch(/\/\/|I comandi di questo modulo/);
});
