/** @vitest-environment jsdom */
// ============================================================
// Test ModuloPersona — aggiungere, correggere ed eliminare una Persona di un'area di un dedalo (2026-10-11)
// ============================================================

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { scegliVoce, valoreSelettore } from '../../../test/selettore';
import { ModuloPersona } from './ModuloPersona';
import { notifica } from '../../stores/notificationStore';
import type { PersonaRiassuntoDto, PuntoInteresseDto } from '../../types';

const api = vi.hoisted(() => ({ getPersone: vi.fn(), creaPunto: vi.fn(), aggiornaPunto: vi.fn(), eliminaPunto: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

/** Una Persona del compendio, quanto basta al modulo. */
const persona = (id: number, nome: string, nomeIt: string): PersonaRiassuntoDto => ({ id, nome, nomeIt, arcanaNome: 'Magia', livello: id } as PersonaRiassuntoDto);
const compendio = [persona(7, 'Pixie', 'Pixie'), persona(9, 'Bicorn', 'Bicorno'), persona(12, 'Jack Frost', 'Jack Frost')];
/** La voce «Ragazza seducente» (Pixie) dell'area «Banchina», con i dettagli dell'Ombra. */
const voce: PuntoInteresseDto = {
  chiave: 'q/4', ordine: 4, tipo: 'persona', nome: 'Ragazza seducente', descrizione: 'Ombra del dedalo', esauribile: false, dettagli: { maschera: 'Pixie', deboleA: 'Ghiaccio' }, fonte: '',
  stato: null, marcatore: null, pin: [], contenitore: null, areaDedalo: null, persona: { id: 7, nome: 'Pixie', nomeIt: 'Pixie' }, areeDedalo: ['q-1'],
};
const aree = [{ chiave: 'q-1', nome: 'Banchina' }, { chiave: 'q-2', nome: 'Treno' }, { chiave: 'q-3', nome: 'Binari' }];

/** Monta il modulo per la voce data (null = nuova) e restituisce i richiami. */
function monta(v: PuntoInteresseDto | null) {
  const onChiudi = vi.fn();
  const onCambiata = vi.fn().mockResolvedValue(undefined);
  render(<ModuloPersona voce={v} dedalo="mementos-01-qimranut" areaIniziale="q-1" aree={aree} onChiudi={onChiudi} onCambiata={onCambiata} />);
  return { onChiudi, onCambiata };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getPersone.mockResolvedValue(compendio);
});

it('aggiunge una Persona scelta dal compendio nell\'area; senza nome dell\'Ombra prende quello della Persona', async () => {
  const { onChiudi, onCambiata } = monta(null);
  expect(await screen.findByRole('dialog', { name: 'Aggiungi una Persona in Banchina' })).toBeInTheDocument();
  // senza Persona non si aggiunge
  expect(screen.getByRole('button', { name: /^Aggiungi/ })).toBeDisabled();
  // in linea: in cima a una finestra breve la tendina sovrapposta restava tagliata dal corpo scorrevole (263 su 363 px)
  expect(screen.getByRole('combobox', { name: 'Persona del compendio' }).closest('.selettore')).toHaveClass('selettore--in-linea');
  scegliVoce('Persona del compendio', /^Bicorno/);
  api.creaPunto.mockResolvedValue({ ...voce, chiave: 'nuova' });
  fireEvent.click(screen.getByRole('button', { name: /^Aggiungi/ }));
  await waitFor(() => expect(api.creaPunto).toHaveBeenCalledWith('mementos-01-qimranut', { nome: 'Bicorno', tipo: 'persona', descrizione: '', areeDedalo: ['q-1'], persona: 9 }));
  await waitFor(() => expect(onChiudi).toHaveBeenCalled());
  expect(onCambiata).toHaveBeenCalled();
  expect(notifica).toHaveBeenCalledWith('success', 'Persona «Bicorno» aggiunta.');
});

it('corregge una Persona: nome, area e la stessa Persona (il server lascia i dettagli dell\'Ombra), senza avvisi', async () => {
  const { onChiudi } = monta(voce);
  expect(await screen.findByRole('dialog', { name: 'Modifica: Pixie' })).toBeInTheDocument();
  expect(valoreSelettore('Persona del compendio')).toBe('Pixie');
  expect(screen.queryByText(/se ne vanno/)).toBeNull();
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome dell’Ombra (vuoto = quello della Persona)' }), { target: { value: 'Fatina' } });
  // si incontra anche nei Binari: le aree si scelgono tutte, nell'ordine del dedalo
  expect(screen.getByRole('checkbox', { name: 'Banchina' })).toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Binari' }));
  expect(screen.getByRole('group', { name: 'Aree in cui si incontra · 2 di 3' })).toBeInTheDocument();
  api.aggiornaPunto.mockResolvedValue(voce);
  fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
  await waitFor(() => expect(api.aggiornaPunto).toHaveBeenCalledWith('q/4', { nome: 'Fatina', descrizione: 'Ombra del dedalo', persona: 7, areeDedalo: ['q-1', 'q-3'] }));
  await waitFor(() => expect(onChiudi).toHaveBeenCalled());
});

it('senza aree non si salva; se le aree non cambiano non si mandano', async () => {
  monta(voce);
  await screen.findByRole('dialog', { name: 'Modifica: Pixie' });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Banchina' }));
  expect(screen.getByRole('button', { name: /^Salva/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Banchina' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome dell’Ombra (vuoto = quello della Persona)' }), { target: { value: 'Fatina' } });
  api.aggiornaPunto.mockResolvedValue(voce);
  fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
  await waitFor(() => expect(api.aggiornaPunto).toHaveBeenCalledWith('q/4', { nome: 'Fatina', descrizione: 'Ombra del dedalo', persona: 7 }));
});

it('con un\'altra Persona dice che resistenze, debolezze e personalità dell\'Ombra se ne vanno', async () => {
  monta(voce);
  await screen.findByRole('dialog', { name: 'Modifica: Pixie' });
  scegliVoce('Persona del compendio', /^Jack Frost/);
  expect(screen.getByRole('status')).toHaveTextContent('Con un’altra Persona le resistenze, le debolezze e la personalità dell’Ombra di prima se ne vanno');
  scegliVoce('Persona del compendio', /^Pixie/);
  expect(screen.queryByText(/se ne vanno/)).toBeNull();
});

it('«Elimina» chiede conferma; «No» torna indietro, «Confermo» elimina la voce', async () => {
  const { onChiudi, onCambiata } = monta(voce);
  await screen.findByRole('dialog', { name: 'Modifica: Pixie' });
  fireEvent.click(screen.getByRole('button', { name: /^Elimina/ }));
  expect(screen.getByRole('region', { name: 'Conferma: eliminare la Persona' })).toHaveTextContent('Se ne va dalla guida, da tutte le aree del dedalo e per tutte le partite. Il compendio delle partite non cambia. Finisce nel cestino (Impostazioni → Cestino): da lì la rimetti com’era.');
  fireEvent.click(screen.getByRole('button', { name: /^No/ }));
  expect(screen.queryByRole('region', { name: 'Conferma: eliminare la Persona' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /^Elimina/ }));
  api.eliminaPunto.mockResolvedValue(undefined);
  fireEvent.click(screen.getByRole('button', { name: /^Confermo/ }));
  await waitFor(() => expect(api.eliminaPunto).toHaveBeenCalledWith('q/4'));
  await waitFor(() => expect(onChiudi).toHaveBeenCalled());
  expect(onCambiata).toHaveBeenCalled();
});
