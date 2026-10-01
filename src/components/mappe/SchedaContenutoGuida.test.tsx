/** @vitest-environment jsdom */
// ============================================================
// Test SchedaContenutoGuida — un elemento della guida senza mappa collegato a una voce descrittiva non offre stato (2026-10-01)
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SchedaContenutoGuida } from './SchedaContenutoGuida';
import type { SchedaContenutoGuidaDto } from '../../../shared/organizzazioneMappe';

vi.mock('../../services/api', () => ({ aggiornaSpillo: vi.fn(), aggiungiImmagineSpillo: vi.fn(), aggiornaImmagineSpillo: vi.fn(), eliminaImmagineSpillo: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaStatoPunto: vi.fn(), impostaAcquisto: vi.fn() }));

const elemento = (tipoPunto: string): SchedaContenutoGuidaDto => ({
  id: 48, uid: 'u48', tipo: 'nota', tipoNome: 'Nota', nome: 'Tesoro avvistato', colore: '#ececf1', descrizione: 'Visibile da lontano.', riferimento: { tipo: 'punto', chiave: 'futaba-02/0' },
  collezionabile: false, ordine: 0, origine: 'seed', raccolto: false, condizioni: [], immagini: [], updatedAt: '', areaGuida: 'futaba-02',
  dettaglio: { tipo: 'punto', punto: { chiave: 'futaba-02/0', tipo: tipoPunto, nome: 'Tesoro avvistato', descrizione: '', esauribile: false, dungeon: 'futaba', area: 'futaba-02', stato: null } },
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
