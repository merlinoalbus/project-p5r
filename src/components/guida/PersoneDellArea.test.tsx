/** @vitest-environment jsdom */
// ============================================================
// Test PersoneDellArea — le Persona di un'area di un dedalo con l'immagine; il tocco segna «catturata» (2026-10-11)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PersoneDellArea } from './PersoneDellArea';
import type { PuntoInteresseDto } from '../../types';

const api = vi.hoisted(() => ({ getPersone: vi.fn(), creaPunto: vi.fn(), aggiornaPunto: vi.fn(), eliminaPunto: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

/** Una voce Persona dell'area «Banchina». */
const voce = (chiave: string, nome: string, persona: PuntoInteresseDto['persona'], extra: Partial<PuntoInteresseDto> = {}): PuntoInteresseDto => ({
  chiave, ordine: 0, tipo: 'persona', nome, descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: null, marcatore: null, pin: [], contenitore: null, areaDedalo: 'q-1', persona, ...extra,
});
const pixie = voce('q/4', 'Ragazza seducente', { id: 7, nome: 'Pixie', nomeIt: 'Pixie' }, { dettagli: { maschera: 'Pixie', deboleA: 'Ghiaccio, Vento' } });
const bicorno = voce('q/5', 'Bestia bicorne', { id: 9, nome: 'Bicorn', nomeIt: 'Bicorno' }, { stato: 'ottenuto', dettagli: { maschera: 'Bicorno', deboleA: '-' } });
const senzaScheda = voce('q/6', 'Ombra aggiunta', null);

/** Monta le Persona dell'area con la partita data (null = nessuna) e restituisce i richiami. */
function monta(persone: PuntoInteresseDto[], partitaId: number | null = 4) {
  const cambiaStato = vi.fn().mockResolvedValue(true);
  const onRicarica = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><PersoneDellArea persone={persone} dedalo="mementos-01-qimranut" areaDedalo={{ chiave: 'q-1', nome: 'Banchina', altre: [] }} partitaId={partitaId} cambiaStato={cambiaStato} onRicarica={onRicarica} /></MemoryRouter>);
  return { cambiaStato, onRicarica };
}

beforeEach(() => { vi.clearAllMocks(); api.getPersone.mockResolvedValue([]); });

it('ogni Persona è una piastrella con l\'immagine, il nome della Persona e dell\'Ombra e le debolezze; il conto dice le catturate e che non contano', () => {
  monta([pixie, bicorno, senzaScheda]);
  const sezione = screen.getByRole('region', { name: 'Persona di Banchina' });
  expect(within(sezione).getByText('Persona · 3')).toBeInTheDocument();
  expect(within(sezione).getByText('1 catturate · non contano nel completamento')).toBeInTheDocument();
  const tessera = within(sezione).getByRole('button', { name: 'Pixie (Ragazza seducente): da catturare' });
  expect(within(tessera).getByText('Pixie')).toBeInTheDocument();
  expect(within(tessera).getByText('Ragazza seducente')).toBeInTheDocument();
  expect(within(tessera).getByText('debole: Ghiaccio, Vento')).toBeInTheDocument();
  // «-» della guida non è una debolezza
  expect(within(within(sezione).getByRole('button', { name: 'Bicorno (Bestia bicorne): catturata' })).queryByText(/debole/)).toBeNull();
  // la scheda del compendio da un collegamento piccolo; senza Persona del compendio non c'è
  expect(within(sezione).getByRole('link', { name: 'Scheda di Pixie' })).toHaveAttribute('href', '/compendio/persona/7');
  expect(within(sezione).queryByRole('link', { name: 'Scheda di Ombra aggiunta' })).toBeNull();
  expect(within(sezione).getByRole('button', { name: 'Ombra aggiunta: da catturare' })).toBeInTheDocument();
});

it('il tocco segna catturata (Ottenuto) o la toglie', async () => {
  const { cambiaStato } = monta([pixie, bicorno]);
  const da = screen.getByRole('button', { name: 'Pixie (Ragazza seducente): da catturare' });
  expect(da).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(da);
  await waitFor(() => expect(cambiaStato).toHaveBeenCalledWith(pixie, 'ottenuto'));
  const presa = screen.getByRole('button', { name: 'Bicorno (Bestia bicorne): catturata' });
  expect(presa).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(presa);
  await waitFor(() => expect(cambiaStato).toHaveBeenCalledWith(bicorno, null));
});

it('senza partita le piastrelle non si toccano e il conto non dice le catturate', () => {
  const { cambiaStato } = monta([pixie], null);
  const tessera = screen.getByRole('button', { name: 'Pixie (Ragazza seducente): da catturare' });
  expect(tessera).toBeDisabled();
  expect(tessera).toHaveAttribute('title', 'Attiva una partita per segnare le catture');
  fireEvent.click(tessera);
  expect(cambiaStato).not.toHaveBeenCalled();
  expect(screen.getByText('non contano nel completamento')).toBeInTheDocument();
});

it('«Modifica» e «Aggiungi una Persona» aprono il modulo', async () => {
  monta([pixie]);
  fireEvent.click(screen.getByRole('button', { name: 'Modifica: Pixie' }));
  expect(await screen.findByRole('dialog', { name: 'Modifica: Pixie' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Annulla/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una Persona in Banchina' }));
  expect(await screen.findByRole('dialog', { name: 'Aggiungi una Persona in Banchina' })).toBeInTheDocument();
});

it('un\'area senza Persona lo dice e offre di aggiungerne', () => {
  monta([]);
  expect(screen.getByText('Nessuna Persona in quest’area.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Aggiungi una Persona in Banchina' })).toBeInTheDocument();
});
