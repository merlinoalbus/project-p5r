/** @vitest-environment jsdom */
// ============================================================
// Test PersoneDellArea — le Persona di un'area di un dedalo con l'immagine; catturata = registrata nel compendio della partita;
// debolezze e scheda dal segno «i»; correggere e aggiungere solo in «Modifica la guida» (progetto del 2026-10-12)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PersoneDellArea } from './PersoneDellArea';
import type { PuntoInteresseDto } from '../../types';

const api = vi.hoisted(() => ({ getPersone: vi.fn(), creaPunto: vi.fn(), aggiornaPunto: vi.fn(), eliminaPunto: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

/** Una voce Persona del dedalo che si incontra nell'area «Banchina». */
const voce = (chiave: string, nome: string, persona: PuntoInteresseDto['persona'], extra: Partial<PuntoInteresseDto> = {}): PuntoInteresseDto => ({
  chiave, ordine: 0, tipo: 'persona', nome, descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: null, pin: [], contenitore: null, areaDedalo: null, persona, areeDedalo: ['q-1'], ...extra,
});
const pixie = voce('q/4', 'Ragazza seducente', { id: 7, nome: 'Pixie', nomeIt: 'Pixie' }, { dettagli: { maschera: 'Pixie', deboleA: 'Ghiaccio, Vento' }, descrizione: 'Ombra presente nel Dedalo.' });
const bicorno = voce('q/5', 'Bestia bicorne', { id: 9, nome: 'Bicorn', nomeIt: 'Bicorno' }, { dettagli: { maschera: 'Bicorno', deboleA: '-' } });
const senzaScheda = voce('q/6', 'Ombra aggiunta', null);

/** Monta le Persona dell'area con la partita data (null = nessuna), Bicorno nel compendio e «Modifica la guida» come detto. */
function monta(persone: PuntoInteresseDto[], partitaId: number | null = 4, modifica = false) {
  const onCattura = vi.fn().mockResolvedValue(undefined);
  const onRicarica = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><PersoneDellArea persone={persone} dedalo="mementos-01-qimranut" areaDedalo={{ chiave: 'q-1', nome: 'Banchina' }} aree={[{ chiave: 'q-1', nome: 'Banchina' }, { chiave: 'q-2', nome: 'Treno' }]}
    partitaId={partitaId} catturate={partitaId ? new Set([9]) : null} modifica={modifica} onCattura={onCattura} onRicarica={onRicarica} /></MemoryRouter>);
  return { onCattura, onRicarica };
}

beforeEach(() => { vi.clearAllMocks(); api.getPersone.mockResolvedValue([]); });

it('ogni Persona è una piastrella con l\'immagine e il nome; catturata è quella del compendio; il conto dice le catturate', () => {
  monta([pixie, bicorno, senzaScheda]);
  const sezione = screen.getByRole('region', { name: 'Persona dell’area' });
  expect(within(sezione).getByRole('heading', { name: 'Persona · 1/3 catturate' })).toBeInTheDocument();
  expect(within(sezione).getByText('non contano nel completamento')).toBeInTheDocument();
  const tessera = within(sezione).getByRole('button', { name: 'Pixie (Ragazza seducente): da catturare' });
  expect(within(tessera).getByText('Pixie')).toBeInTheDocument();
  const bic = within(sezione).getByRole('button', { name: 'Bicorno (Bestia bicorne): catturata' });
  expect(bic).toHaveAttribute('aria-pressed', 'true');
  // senza Persona del compendio non si cattura
  const senza = within(sezione).getByRole('button', { name: 'Ombra aggiunta: da catturare' });
  expect(senza).toBeDisabled();
  expect(senza).toHaveAttribute('title', 'Scegli la Persona del compendio («Modifica la guida») per segnarla');
});

it('il segno «i» apre il riquadro con l\'Ombra, le debolezze, la descrizione e la scheda del compendio', () => {
  monta([pixie, bicorno]);
  fireEvent.click(screen.getByRole('button', { name: 'Dettagli di Pixie' }));
  const riquadro = screen.getByRole('region', { name: 'Dettagli di Pixie' });
  expect(riquadro).toHaveTextContent('Ombra: Ragazza seducente');
  expect(riquadro).toHaveTextContent('non ancora catturata');
  expect(riquadro).toHaveTextContent('Debole a: Ghiaccio, Vento');
  expect(riquadro).toHaveTextContent('Ombra presente nel Dedalo.');
  expect(within(riquadro).getByRole('link', { name: 'Scheda del compendio' })).toHaveAttribute('href', '/compendio/persona/7');
  // in «Gioca» niente «Modifica»
  expect(within(riquadro).queryByRole('button', { name: /^Modifica/ })).toBeNull();
  // «-» della guida non è una debolezza; un altro «i» cambia riquadro, lo stesso lo chiude
  fireEvent.click(screen.getByRole('button', { name: 'Dettagli di Bicorno' }));
  expect(screen.getByRole('region', { name: 'Dettagli di Bicorno' })).toHaveTextContent('Debole a: la guida non lo dice');
  expect(screen.queryByRole('region', { name: 'Dettagli di Pixie' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Dettagli di Bicorno' }));
  expect(screen.queryByRole('region', { name: /^Dettagli di/ })).toBeNull();
});

it('il tocco registra la Persona nel compendio; toglierla chiede conferma, perché ne cancella livello, bonus e abilità', async () => {
  const { onCattura } = monta([pixie, bicorno]);
  fireEvent.click(screen.getByRole('button', { name: 'Pixie (Ragazza seducente): da catturare' }));
  await waitFor(() => expect(onCattura).toHaveBeenCalledWith(7, true));
  fireEvent.click(screen.getByRole('button', { name: 'Bicorno (Bestia bicorne): catturata' }));
  const conferma = screen.getByRole('region', { name: 'Conferma: togliere la Persona dal compendio' });
  expect(conferma).toHaveTextContent('Bicorno esce dal compendio della partita, in tutte le aree e in tutti i dedali, con il livello, i bonus e le abilità che vi aveva registrati.');
  expect(onCattura).toHaveBeenCalledTimes(1);
  fireEvent.click(within(conferma).getByRole('button', { name: /^No/ }));
  expect(screen.queryByRole('region', { name: 'Conferma: togliere la Persona dal compendio' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Bicorno (Bestia bicorne): catturata' }));
  fireEvent.click(screen.getByRole('button', { name: /^Togli dal compendio/ }));
  await waitFor(() => expect(onCattura).toHaveBeenCalledWith(9, false));
  await waitFor(() => expect(screen.queryByRole('region', { name: 'Conferma: togliere la Persona dal compendio' })).toBeNull());
});

it('senza partita le piastrelle non si toccano e il conto non dice le catturate', () => {
  const { onCattura } = monta([pixie], null);
  const tessera = screen.getByRole('button', { name: 'Pixie (Ragazza seducente): da catturare' });
  expect(tessera).toBeDisabled();
  expect(tessera).toHaveAttribute('title', 'Attiva una partita per segnare le catture');
  fireEvent.click(tessera);
  expect(onCattura).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: 'Persona · 1' })).toBeInTheDocument();
});

it('in «Modifica la guida» «Aggiungi» e «Modifica» (dal riquadro «i») aprono il modulo; in «Gioca» non ci sono', async () => {
  const gioca = monta([pixie]);
  expect(screen.queryByRole('button', { name: 'Aggiungi una Persona in Banchina' })).toBeNull();
  expect(gioca.onRicarica).not.toHaveBeenCalled();
  document.body.innerHTML = '';
  monta([pixie], 4, true);
  fireEvent.click(screen.getByRole('button', { name: 'Dettagli di Pixie' }));
  fireEvent.click(screen.getByRole('button', { name: 'Modifica: Pixie' }));
  expect(await screen.findByRole('dialog', { name: 'Modifica: Pixie' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Annulla/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una Persona in Banchina' }));
  expect(await screen.findByRole('dialog', { name: 'Aggiungi una Persona in Banchina' })).toBeInTheDocument();
});

it('un\'area senza Persona lo dice', () => {
  monta([], 4, true);
  expect(screen.getByText('Nessuna Persona in quest’area.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Aggiungi una Persona in Banchina' })).toBeInTheDocument();
});
