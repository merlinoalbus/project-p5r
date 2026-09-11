/** @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { NavigazioneSpillo } from './NavigazioneSpillo';
import { urlMappa } from '../../utils/navigazioneMappa';
import type { SpilloDto } from '../../types';

const base: SpilloDto = { id: 1, mappaChiave: 'origine', tipo: 'passaggio', tipoNome: 'Passaggio', nome: 'Collegamento', colore: '#fff', descrizione: '', x: 10, y: 20, riferimento: { tipo: 'mappa', chiave: 'vecchia' }, collezionabile: false, condizioni: [], ordine: 0, origine: 'utente', raccolto: false, immagini: [], updatedAt: '2026-09-06', dettaglio: { tipo: 'mappa', mappa: { chiave: 'vecchia', nome: 'Vecchia', tipo: 'luogo' } }, destinazione: { mappa: 'nuova', spillo: 42 }, destinazioneNomi: { mappa: 'Nuova', spillo: 'Ingresso' } };

it.each(['passaggio', 'treno', 'scala', 'uscita', 'rampino', 'scorciatoia', 'velluto', 'mementos', 'ingresso-palazzo'] as const)('%s porta alla mappa di arrivo con lo spillo indicato già selezionato', (tipo) => {
  const onNaviga = vi.fn(); render(<NavigazioneSpillo spillo={{ ...base, tipo }} partitaId={null} onNaviga={onNaviga} nomeMappa="Nuova" nomeSpillo="Ingresso" />);
  fireEvent.click(screen.getByRole('button', { name: /Vai: Nuova/ }));
  expect(onNaviga).toHaveBeenCalledWith('nuova', { spillo: 42 });
  expect(screen.getByRole('button')).toHaveTextContent('allo spillo «Ingresso»');
});
it('senza spillo di arrivo porta alla sola mappa, adattata alla finestra', () => {
  const onNaviga = vi.fn(); render(<NavigazioneSpillo spillo={{ ...base, destinazione: { mappa: 'nuova', spillo: null } }} partitaId={null} onNaviga={onNaviga} nomeMappa="Nuova" />);
  fireEvent.click(screen.getByRole('button', { name: 'Vai: Nuova' }));
  expect(onNaviga).toHaveBeenCalledWith('nuova', undefined);
});
it('blocca lo spostamento nella partita corrente, anche con una destinazione precisa', () => {
  const onNaviga = vi.fn();
  render(<NavigazioneSpillo spillo={{ ...base, disponibilita: { stato: 'bloccato', requisiti: [] } }} partitaId={7} onNaviga={onNaviga} />);
  const button = screen.getByRole('button'); expect(button).toBeDisabled(); fireEvent.click(button); expect(onNaviga).not.toHaveBeenCalled();
});
it('destinazione eliminata non ripiega sul riferimento precedente', () => {
  const onNaviga = vi.fn(); render(<NavigazioneSpillo spillo={{ ...base, destinazione: null, destinazioneNonDisponibile: true }} partitaId={null} onNaviga={onNaviga} />);
  expect(screen.getByRole('status')).toHaveTextContent('non è più disponibile'); expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('conserva i vecchi collegamenti alla mappa senza spillo di arrivo', () => {
  const onNaviga = vi.fn(); render(<NavigazioneSpillo spillo={{ ...base, destinazione: null, destinazioneNomi: undefined }} partitaId={null} onNaviga={onNaviga} />);
  fireEvent.click(screen.getByRole('button', { name: 'Vai: Vecchia' })); expect(onNaviga).toHaveBeenCalledWith('vecchia', undefined);
});
it.each(['negozio', 'dialogo', 'nota', 'porta', 'attivita'] as const)('uno spillo %s non è uno spostamento: nessun pulsante, anche se ha un arrivo scritto', (tipo) => {
  const onNaviga = vi.fn(); render(<NavigazioneSpillo spillo={{ ...base, tipo }} partitaId={null} onNaviga={onNaviga} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('codifica mappa e arrivo: spillo da selezionare, oppure punto e zoom per gli ingressi dei quartieri', () => {
  expect(urlMappa('stessa mappa', { spillo: 42 })).toBe('/guida/mappe/stessa%20mappa?spillo=42');
  expect(urlMappa('stessa mappa', { x: 0, y: 100, zoom: 6 })).toBe('/guida/mappe/stessa%20mappa?x=0&y=100&zoom=6');
  expect(urlMappa('stessa mappa')).toBe('/guida/mappe/stessa%20mappa');
});
