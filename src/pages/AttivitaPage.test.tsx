/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test AttivitaPage — attività e lavori con i valori (sede, paga, effetti); libri e film hanno pagine proprie
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { scegliVoce } from '../../test/selettore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AttivitaPage } from './AttivitaPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { AttivitaDto, AttivitaTutteDto, PartitaDto } from '../types';

const { getAttivita } = vi.hoisted(() => ({ getAttivita: vi.fn() }));
vi.mock('../services/api', () => ({ getAttivita }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../components/mappe/DoveSiTrova', () => ({ DoveSiTrova: ({ chiave }: { chiave: string }) => <div>Dove: {chiave}</div> }));

const att = (chiave: string, nome: string, tipo: AttivitaDto['tipo'], dote: 'conoscenza' | 'fascino' | 'coraggio' | 'gentilezza' | 'perizia', extra: Partial<AttivitaDto> = {}): AttivitaDto => ({
  chiave, nome, tipo, luogo: 'Kichijoji, Penguin Sniper', luogoChiave: 'kichijoji', fascia: 'sera', costo: 800, sblocco: '5 giugno', sessioni: null, doti: [], altriEffetti: null, regole: 'Regole.', premi: null,
  pagaYen: null, pagaMassima: null, dettagli: 'Come funziona: tre freccette a turno.', effetti: [{ effetto: { famiglia: 'dote', dote, note: 1 }, testo: `${dote[0].toUpperCase()}${dote.slice(1)} ♪` }], effettiTesto: [`${dote[0].toUpperCase()}${dote.slice(1)} ♪`],
  tracciamento: 'nessuno', sedeChiave: 'kichijoji/penguin-sniper', sedeNome: 'Penguin Sniper', paga: null, verificato: true, condizioni: null, disponibilita: null, ...extra,
});
const dati: AttivitaTutteDto = {
  attivita: [att('freccette', 'Freccette', 'mini-gioco', 'perizia'), att('bagno', 'Bagno pubblico', 'altro', 'fascino', { sedeChiave: null, sedeNome: null })],
  lavori: [att('triple-seven', 'Commesso al Triple Seven', 'lavoro', 'fascino', { pagaYen: 3500, pagaMassima: 7400, fascia: 'giorno' })],
  libri: [], film: [], libriLetti: 0, filmVisti: 0,
};

describe('AttivitaPage', () => {
  it('mostra le attività con sede, tipo e fascia dal catalogo, filtra per Dote dagli effetti e tiene la scheda Lavori con la paga in yen', async () => {
    usePartitaStore.setState({ attiva: { id: 5, nome: 'Prova' } as PartitaDto });
    getAttivita.mockResolvedValue(dati);
    render(<MemoryRouter><AttivitaPage /></MemoryRouter>);
    expect(await screen.findByText('Freccette')).toBeInTheDocument();
    expect(getAttivita).toHaveBeenCalledWith(5);
    // la sede apre la pagina del quartiere con il luogo evidenziato; senza sede resta il quartiere
    expect(screen.getByRole('link', { name: 'Penguin Sniper' })).toHaveAttribute('href', '/guida/citta/kichijoji#luogo-kichijoji-penguin-sniper');
    expect(screen.getByRole('link', { name: 'Kichijoji, Penguin Sniper' })).toHaveAttribute('href', '/guida/citta/kichijoji');
    expect(screen.getAllByText('Mini-gioco')).toHaveLength(1);
    expect(screen.getAllByText('Di sera').length).toBeGreaterThan(0);
    expect(screen.getByText('Perizia ♪')).toBeInTheDocument();
    expect(screen.queryByText('fonte')).toBeNull();
    expect(screen.queryByText(/Sblocco:/)).toBeNull();
    scegliVoce('Dote', 'Fascino');
    expect(screen.queryByText('Freccette')).toBeNull();
    expect(screen.getByText('Bagno pubblico')).toBeInTheDocument();
    scegliVoce('Dote', 'Tutte le Doti');
    fireEvent.click(screen.getByRole('tab', { name: 'Lavori' }));
    expect(screen.getByText('Commesso al Triple Seven')).toBeInTheDocument();
    expect(screen.getByText(/3500 ¥ a turno \(fino a 7400 ¥\)/)).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Libri' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Film e DVD' })).toBeNull();
  });

  it('aprendo una scheda mostra i dettagli come testo unico', async () => {
    getAttivita.mockResolvedValue(dati);
    render(<MemoryRouter><AttivitaPage /></MemoryRouter>);
    const apri = await screen.findAllByRole('button', { expanded: false });
    fireEvent.click(apri[0]);
    expect(screen.getByText('Come funziona: tre freccette a turno.')).toBeInTheDocument();
    expect(screen.queryByText(/Regole\./)).toBeNull();
  });

  it('reindirizza il vecchio indirizzo della scheda Libri alla pagina autonoma', async () => {
    getAttivita.mockResolvedValue(dati);
    render(<MemoryRouter initialEntries={['/guida/attivita?scheda=libri']}><Routes>
      <Route path="/guida/attivita" element={<AttivitaPage />} />
      <Route path="/guida/libri" element={<div>Pagina Libri autonoma</div>} />
    </Routes></MemoryRouter>);
    expect(await screen.findByText('Pagina Libri autonoma')).toBeInTheDocument();
  });

  it('reindirizza il vecchio indirizzo Film e DVD alla pagina autonoma', async () => {
    getAttivita.mockResolvedValue(dati);
    render(<MemoryRouter initialEntries={['/guida/attivita?scheda=film']}><Routes>
      <Route path="/guida/attivita" element={<AttivitaPage />} />
      <Route path="/guida/film" element={<div>Pagina Film autonoma</div>} />
    </Routes></MemoryRouter>);
    expect(await screen.findByText('Pagina Film autonoma')).toBeInTheDocument();
  });
});

/* La mappa dell'attività: una sola aperta in tutta la pagina. */
it('mostra la posizione di una attività per volta', async () => {
  getAttivita.mockResolvedValue(dati);
  render(<MemoryRouter><AttivitaPage /></MemoryRouter>);
  const apri = await screen.findAllByRole('button', { expanded: false });
  fireEvent.click(apri[0]);
  fireEvent.click(apri[1]);
  const posizioni = screen.getAllByRole('button', { name: /^Mostra posizione di / });
  expect(posizioni.length).toBeGreaterThan(1);
  fireEvent.click(posizioni[0]);
  expect(screen.getAllByText(/^Dove: /)).toHaveLength(1);
  fireEvent.click(screen.getAllByRole('button', { name: /^Mostra posizione di / })[0]);
  expect(screen.getAllByText(/^Dove: /)).toHaveLength(1);
});
