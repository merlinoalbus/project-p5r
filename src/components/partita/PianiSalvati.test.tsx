/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test PianiSalvati — avanzamento, passi eseguibili, albero, filtro per obiettivo, rinomina ed eliminazione
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PianiSalvati } from './PianiSalvati';
import type { NodoPianoDto, PianoSalvatoDto } from '../../types';

const { getPianiSalvati, getPossedute, aggiornaPianoSalvato, eliminaPianoSalvato } = vi.hoisted(() => ({ getPianiSalvati: vi.fn(), getPossedute: vi.fn(), aggiornaPianoSalvato: vi.fn(), eliminaPianoSalvato: vi.fn() }));
vi.mock('../../services/api', () => ({ getPianiSalvati, getPossedute, aggiornaPianoSalvato, eliminaPianoSalvato, getImmagini: vi.fn().mockResolvedValue([]), caricaImmagine: vi.fn(), eliminaImmagine: vi.fn(), importaImmagineDaUrl: vi.fn(), urlImmagine: (ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file`, }));
vi.mock('../../stores/notificationStore', () => ({ notifica: vi.fn() }));

const p = (id: number, nome: string): NodoPianoDto['persona'] => ({ id, nome, nomeIt: nome, arcana: 'Magician', arcanaNome: 'Mago', livello: 10, speciale: false, rara: false, dlc: false });
const foglia = (id: number, nome: string): NodoPianoDto => ({ persona: p(id, nome), modo: 'scorta', costo: 0, figli: [], skillPortate: [], skillDaLivello: [] });
const radice: NodoPianoDto = { persona: p(88, 'Jack Frost'), modo: 'fusione', costo: 0, tipo: 'normale', figli: [foglia(1, 'Arsène'), foglia(2, 'Pixie')], skillPortate: [], skillDaLivello: [] };
const piano: PianoSalvatoDto = {
  id: 5, personaId: 88, nome: 'Jack Frost', nomeIt: 'Jack Frost', arcana: 'Magician', arcanaNome: 'Mago', livello: 11, titolo: 'Il mio piano', note: '', obiettivoId: 3, obiettivoStato: 'aperto',
  opzioni: {}, skill: [], piano: { radice, costo: 1200, profondita: 1, catture: 0, evocazioni: 0, fusioni: 1 }, costo: 1200,
  avanzamento: { completato: false, foglie: 2, foglieInScorta: 2, fusioni: 1, fusioniFatte: 0, passi: [{ risultato: p(88, 'Jack Frost'), ingredienti: [p(1, 'Arsène'), p(2, 'Pixie')], tipo: 'normale', skillPortate: [] }] },
  createdAt: '2026-09-03T10:00:00.000Z', updatedAt: '2026-09-03T10:00:00.000Z',
};

describe('PianiSalvati', () => {
  beforeEach(() => { getPianiSalvati.mockReset(); getPossedute.mockReset(); aggiornaPianoSalvato.mockReset(); eliminaPianoSalvato.mockReset(); });

  it('mostra avanzamento e passo eseguibile con collegamento al calcolatore; albero a richiesta con foglie evidenziate; rinomina ed elimina', async () => {
    getPianiSalvati.mockResolvedValue([piano]);
    getPossedute.mockResolvedValue([{ id: 11, personaId: 1 }, { id: 12, personaId: 2 }]);
    render(<MemoryRouter initialEntries={['/partita?scheda=piani']}><PianiSalvati partitaId={7} /></MemoryRouter>);
    expect((await screen.findAllByRole('link', { name: 'Jack Frost' }))[0]).toHaveAttribute('href', '/compendio/persona/88');
    expect(getPianiSalvati).toHaveBeenCalledWith(7, undefined);
    expect(screen.getByText('2/2')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Passi eseguibili' }).querySelector('a')).toHaveAttribute('href', '/fusione?vista=calcolatore&a=1&b=2');
    expect(await screen.findByRole('button', { name: 'Esegui' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostra albero' }));
    expect(screen.getByRole('link', { name: /Arsène/ })).toHaveClass('chip--attivo');
    // rinomina
    fireEvent.click(screen.getByRole('button', { name: /Il mio piano/ }));
    aggiornaPianoSalvato.mockResolvedValue({ ...piano, titolo: 'Nuovo titolo' });
    await act(async () => { fireEvent.change(screen.getByLabelText('Titolo del piano'), { target: { value: 'Nuovo titolo' } }); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ok' })); });
    expect(aggiornaPianoSalvato).toHaveBeenCalledWith(7, 5, { nome: 'Nuovo titolo' });
    expect(await screen.findByRole('button', { name: /Nuovo titolo/ })).toBeInTheDocument();
    // eliminazione
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    eliminaPianoSalvato.mockResolvedValue(undefined);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Elimina' })); });
    expect(eliminaPianoSalvato).toHaveBeenCalledWith(7, 5);
    expect(await screen.findByText('Nessun piano salvato')).toBeInTheDocument();
  });

  it('filtra per obiettivo dall\'URL e mostra il completamento', async () => {
    getPianiSalvati.mockResolvedValue([{ ...piano, avanzamento: { ...piano.avanzamento, completato: true, passi: [] } }]);
    getPossedute.mockResolvedValue([]);
    render(<MemoryRouter initialEntries={['/partita?scheda=piani&obiettivo=3']}><PianiSalvati partitaId={7} /></MemoryRouter>);
    expect(await screen.findByText(/Completato: Jack Frost è nella scorta/)).toBeInTheDocument();
    expect(getPianiSalvati).toHaveBeenCalledWith(7, 3);
    expect(screen.getByRole('link', { name: 'Tutti i piani' })).toBeInTheDocument();
  });
});
