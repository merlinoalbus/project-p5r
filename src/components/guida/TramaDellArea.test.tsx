/** @vitest-environment jsdom */
// ============================================================
// Test TramaDellArea — una casella per voce in «Gioca», la guida dell'area in «Modifica la guida» (progetto del 2026-10-12)
// ============================================================

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TramaDellArea } from './TramaDellArea';
import type { AreaDungeonDto, PuntoInteresseDto } from '../../types';

vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

/** Una voce di Trama dell'area «Banchina». */
const voce = (chiave: string, nome: string, stato: PuntoInteresseDto['stato'], descrizione = ''): PuntoInteresseDto => ({
  chiave, ordine: 0, tipo: 'trama', nome, descrizione, esauribile: false, dettagli: {}, fonte: '', stato, marcatore: null, pin: [], contenitore: null, areaDedalo: 'q-1', persona: null, areeDedalo: [],
});
/** Il dedalo con le voci date. */
const dedalo = (punti: PuntoInteresseDto[]): AreaDungeonDto => ({ chiave: 'mementos-01-qimranut', ordine: 0, nome: 'Dedalo di Qimranut', descrizione: '', mappa: false, mappe: [], punti, dedalo: null });

/** Disegna la Trama e restituisce `cambiaStato`. */
function monta(punti: PuntoInteresseDto[], partitaId: number | null = 4, modifica = false) {
  const cambiaStato = vi.fn().mockResolvedValue(true);
  render(<MemoryRouter><TramaDellArea dedalo={dedalo(punti)} areaDedalo={{ chiave: 'q-1', nome: 'Banchina', altre: [] }} partitaId={partitaId} modifica={modifica}
    cambiaStato={cambiaStato} onPuntoAggiornato={vi.fn()} onRicarica={vi.fn().mockResolvedValue(undefined)} /></MemoryRouter>);
  return cambiaStato;
}

it('la casella segna «Ottenuta»; una voce Ottenuta o Esaurita è spuntata e la casella la riapre', async () => {
  const cambiaStato = monta([voce('v1', 'Jose alla banchina', null, 'Jose aspetta sulla banchina.'), voce('v2', 'Sala d’attesa', 'esaurito')]);
  expect(screen.getByText('Jose aspetta sulla banchina.')).toHaveAttribute('title', 'Jose aspetta sulla banchina.');
  const sala = screen.getByRole('checkbox', { name: /Sala d’attesa/ });
  expect(sala).toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: /Jose alla banchina/ }));
  await waitFor(() => expect(cambiaStato).toHaveBeenCalledWith(expect.objectContaining({ chiave: 'v1' }), 'ottenuto'));
  fireEvent.click(sala);
  await waitFor(() => expect(cambiaStato).toHaveBeenCalledWith(expect.objectContaining({ chiave: 'v2' }), null));
});

it('senza partita le caselle non si toccano; un\'area senza Trama lo dice; in «Modifica la guida» c\'è la guida dell\'area', () => {
  monta([voce('v1', 'Jose alla banchina', null)], null);
  expect(screen.getByRole('checkbox', { name: /Jose alla banchina/ })).toBeDisabled();
  document.body.innerHTML = '';
  monta([]);
  expect(screen.getByText('Nessuna voce di Trama in quest’area.')).toBeInTheDocument();
  document.body.innerHTML = '';
  monta([voce('v1', 'Jose alla banchina', null)], 4, true);
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.getByRole('button', { name: 'Aggiungi una voce di Trama in Banchina' })).toBeInTheDocument();
});
