/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test AttivitaPage — attività e lavori; libri e film hanno pagine proprie
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AttivitaPage } from './AttivitaPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { AttivitaDto, AttivitaTutteDto, LibroDto, PartitaDto } from '../types';

const { getAttivita, impostaLettura } = vi.hoisted(() => ({ getAttivita: vi.fn(), impostaLettura: vi.fn() }));
vi.mock('../services/api', () => ({ getAttivita, impostaLettura }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));

const att = (chiave: string, nome: string, tipo: AttivitaDto['tipo'], dote: AttivitaDto['doti'][number]['dote']): AttivitaDto => ({ chiave, nome, tipo, luogo: 'Kichijoji, Penguin Sniper', luogoChiave: 'kichijoji', fascia: 'sera', costo: 800, sblocco: '5 giugno', sessioni: null, doti: [{ dote, note: 1, condizione: 'una nota a sessione' }], altriEffetti: null, regole: 'Regole.', premi: null, paga: null, fonte: 'https://www.allgamestaff.it/x', verificato: true, condizioni: null, disponibilita: null });
const libro = (chiave: string, nome: string, dote: LibroDto['dote']): LibroDto => ({ chiave, nome, nomeIt: nome, dove: 'Libreria Taiheido', prezzo: 700, disponibileDal: '18 aprile', dote, note: 3, sblocca: null, sessioni: 2, dettagli: null, fonte: 'https://www.allgamestaff.it/libri', verificato: true, posizioni: [], totaleSessioni: 2, progresso: 0, fatto: false, condizioni: null, disponibilita: null });
const dati: AttivitaTutteDto = {
  attivita: [att('freccette', 'Freccette', 'mini-gioco', 'perizia'), att('bagno', 'Bagno pubblico', 'altro', 'fascino')],
  lavori: [att('triple-seven', 'Commesso al Triple Seven', 'lavoro', 'fascino')],
  libri: [libro('il-magnifico-ladro', 'Il magnifico ladro', 'conoscenza'), libro('zorro', 'Zorro il vendicatore', 'coraggio')],
  film: [{ chiave: 'cinema-le-sedici-domande', nome: 'Le sedici domande', nomeIt: 'Le sedici domande', dove: 'cinema', periodo: 'dal 24 aprile', dote: 'coraggio', note: 3, prezzo: 1500, dettagli: null, fonte: 'https://www.allgamestaff.it/f', verificato: true, posizioni: [], totaleSessioni: 1, progresso: 0, iniziato: false, fatto: false, condizioni: null, disponibilita: null }],
  libriLetti: 0, filmVisti: 0,
};

describe('AttivitaPage', () => {
  it('mostra le attività, filtra per Dote e tiene soltanto la scheda Lavori', async () => {
    usePartitaStore.setState({ attiva: { id: 5, nome: 'Prova' } as PartitaDto });
    getAttivita.mockResolvedValue(dati);
    impostaLettura.mockResolvedValue({ ...dati.libri[0], fatto: true });
    render(<MemoryRouter><AttivitaPage /></MemoryRouter>);
    expect(await screen.findByText('Freccette')).toBeInTheDocument();
    expect(getAttivita).toHaveBeenCalledWith(5);
    expect(screen.getAllByRole('link', { name: 'Kichijoji, Penguin Sniper' })[0]).toHaveAttribute('href', '/guida/citta/kichijoji');
    fireEvent.change(screen.getByRole('combobox', { name: 'Dote' }), { target: { value: 'fascino' } });
    expect(screen.queryByText('Freccette')).toBeNull();
    expect(screen.getByText('Bagno pubblico')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Dote' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Lavori' }));
    expect(screen.getByText('Commesso al Triple Seven')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Libri' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Film e DVD' })).toBeNull();
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
