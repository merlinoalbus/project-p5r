/** @vitest-environment jsdom */
// ============================================================
// Test della scheda di uno spillo: lo stato con la parola del tipo (2026-10-03) — intestazione, pulsanti, invito senza partita
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SchedaSpillo } from './VisoreMappa';
import type { SpilloDto } from '../../types';

/** Spillo «Leva» di tipo meccanismo sulla mappa k-01, non collezionabile, con i campi di `extra` che sovrascrivono i predefiniti. */
const pin = (extra: Partial<SpilloDto>): SpilloDto => ({ id: 1, mappaChiave: 'k-01', tipo: 'meccanismo', tipoNome: 'Meccanismo', colore: '#64748b', nome: 'Leva', descrizione: '', x: 20, y: 30, riferimento: null, collezionabile: false, condizioni: [], ordine: 0, origine: 'utente', raccolto: false, immagini: [], updatedAt: '', dettaglio: null, voce: null, ...extra });
/** Disegna la scheda dello spillo `s` per la partita data (null = nessuna partita), con tutte le callback finte. */
const monta = (s: SpilloDto, partitaId: number | null) => render(<MemoryRouter><SchedaSpillo spillo={s} partitaId={partitaId} occupato={false} onNaviga={vi.fn()} onChiudi={vi.fn()} onCentra={vi.fn()} onRaccolto={vi.fn()} onStatoPunto={vi.fn()} /></MemoryRouter>);

it('senza partita l’invito dice che cosa si potrebbe segnare, con la parola del tipo', () => {
  const { unmount } = monta(pin({}), null);
  expect(screen.getByText(/per segnarne lo stato \(azionato\)\./)).toBeInTheDocument();
  expect(screen.queryByText(/punti raccolti/)).toBeNull();
  unmount();
  const forziere = monta(pin({ tipo: 'forziere', tipoNome: 'Forziere', nome: 'Scrigno', collezionabile: true }), null);
  expect(screen.getByText(/per segnarne lo stato \(aperto\)\./)).toBeInTheDocument();
  forziere.unmount();
  const seme = monta(pin({ tipo: 'seme-bramosia', tipoNome: 'Seme della bramosia', nome: 'Seme', collezionabile: true }), null);
  expect(screen.getByText(/per segnarne lo stato \(raccolto\)\./)).toBeInTheDocument();
  seme.unmount();
  const conVoce = monta(pin({ voce: { chiave: 'k-01/1', tipo: 'meccanismo', nome: 'Leva', descrizione: '', esauribile: false, dungeon: 'k', area: 'k-01', stato: null } }), null);
  expect(screen.getByText(/per segnare la sua voce della guida\./)).toBeInTheDocument();
  conVoce.unmount();
  // una nota non ha niente da segnare: nessun invito
  monta(pin({ tipo: 'nota', tipoNome: 'Nota', nome: 'Appunto' }), null);
  expect(screen.queryByText(/Attiva una/)).toBeNull();
});

it('segnato, l’intestazione dice la parola del tipo e il pulsante per toglierlo è «Annulla», per la porta «Richiudi»', () => {
  const { unmount } = monta(pin({ raccolto: true }), 7);
  expect(screen.getByText('Meccanismo · azionato')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Annulla' })).toBeInTheDocument();
  unmount();
  monta(pin({ tipo: 'porta', tipoNome: 'Porta chiusa', nome: 'Porta della torre', raccolto: true }), 7);
  expect(screen.getByText('Porta chiusa · aperta')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Richiudi' })).toBeInTheDocument();
});

it('un pin collegato a una voce della guida dice lo stato della voce, lo stesso dei suoi pulsanti (esaurito, non «azionato»)', () => {
  monta(pin({ raccolto: true, voce: { chiave: 'k-01/1', tipo: 'meccanismo', nome: 'Leva', descrizione: '', esauribile: true, dungeon: 'k', area: 'k-01', stato: 'esaurito' } }), 7);
  expect(screen.getByText('Meccanismo · esaurito')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Riapri' })).toBeInTheDocument();
});
