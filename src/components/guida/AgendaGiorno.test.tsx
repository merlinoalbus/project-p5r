// @vitest-environment jsdom
// ============================================================
// Test AgendaGiorno — eventi e cose da fare aggiunti dall'utente a una giornata (16.1)
// ============================================================

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AgendaGiorno } from './AgendaGiorno';
import type { AgendaGiornoDto } from '../../types';

const api = vi.hoisted(() => ({
  getAgenda: vi.fn(), creaEventoAgenda: vi.fn(), creaAzioneAgenda: vi.fn(),
  aggiornaAzioneAgenda: vi.fn(), eliminaEventoAgenda: vi.fn(), eliminaAzioneAgenda: vi.fn(),
  impostaAzioneAgendaFatta: vi.fn(),
}));
vi.mock('../../services/api', () => api);
const { notifica } = vi.hoisted(() => ({ notifica: vi.fn() }));
vi.mock('../../stores/notificationStore', () => ({ notifica }));

const agenda: AgendaGiornoDto = {
  giorno: '06-06',
  eventi: [{ id: 1, giorno: '06-06', tipo: 'scadenza', titolo: 'Consegna del Palazzo', dettaglio: '', riferimento: null, partitaId: 3, ordine: 0 }],
  azioni: [
    { id: 10, giorno: '06-06', fascia: 'giorno', tipo: 'altro', azione: 'Comprare i Bionutrienti', riferimento: null, rangoAtteso: null, note: null, partitaId: 3, ordine: 0, fatta: false },
    { id: 11, giorno: '06-06', fascia: 'sera', tipo: 'altro', azione: 'Leggere in treno', riferimento: null, rangoAtteso: null, note: null, partitaId: null, ordine: 1, fatta: true },
  ],
};

describe('AgendaGiorno', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    notifica.mockReset();
    api.getAgenda.mockResolvedValue(agenda);
  });

  it('mostra eventi e cose da fare divise per fascia, con la spunta della partita', async () => {
    render(<AgendaGiorno giorno="06-06" partitaId={3} />);
    expect(await screen.findByText('Consegna del Palazzo')).toBeInTheDocument();
    expect(screen.getByText('Scadenza')).toBeInTheDocument();
    expect(screen.getByLabelText('Cose da fare: di giorno')).toBeInTheDocument();
    expect(screen.getByLabelText('Cose da fare: di sera')).toBeInTheDocument();
    expect((screen.getByLabelText('Fatto: Comprare i Bionutrienti') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Fatto: Leggere in treno') as HTMLInputElement).checked).toBe(true);
    // le voci senza partita valgono per tutte le partite e lo dichiarano
    expect(screen.getByText('· tutte le partite')).toBeInTheDocument();
  });

  it('aggiunge una cosa da fare della sola partita in corso e ricarica', async () => {
    api.creaAzioneAgenda.mockResolvedValue(agenda.azioni[0]);
    render(<AgendaGiorno giorno="06-06" partitaId={3} />);
    fireEvent.click(await screen.findByRole('button', { name: /Aggiungi cosa da fare/ }));
    fireEvent.change(screen.getByLabelText('Che cosa devi fare'), { target: { value: 'Passare dal Bagno pubblico' } });
    fireEvent.change(screen.getByLabelText('Momento della giornata'), { target: { value: 'sera' } });
    fireEvent.click(screen.getByRole('button', { name: /^Aggiungi$/ }));
    await waitFor(() => expect(api.creaAzioneAgenda).toHaveBeenCalledWith({ data: '06-06', fascia: 'sera', azione: 'Passare dal Bagno pubblico', partitaId: 3 }));
    await waitFor(() => expect(api.getAgenda).toHaveBeenCalledTimes(2));
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('Cosa da fare aggiunta'));
  });

  it('senza partita attiva la voce vale per tutte le partite e non ci sono spunte', async () => {
    api.creaEventoAgenda.mockResolvedValue(agenda.eventi[0]);
    render(<AgendaGiorno giorno="06-06" partitaId={null} />);
    fireEvent.click(await screen.findByRole('button', { name: /Aggiungi evento/ }));
    expect(screen.getByText('Senza una partita attiva la voce vale per tutte le partite.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Fatto: Comprare i Bionutrienti')).toBeNull();
    fireEvent.change(screen.getByLabelText('Che cosa succede questo giorno'), { target: { value: 'Quiz televisivo' } });
    fireEvent.click(screen.getByRole('button', { name: /^Aggiungi$/ }));
    await waitFor(() => expect(api.creaEventoAgenda).toHaveBeenCalledWith({ data: '06-06', tipo: 'promemoria', titolo: 'Quiz televisivo', partitaId: null }));
  });

  it('spunta una cosa da fare e ne sposta un’altra di fascia', async () => {
    api.impostaAzioneAgendaFatta.mockResolvedValue({ ...agenda.azioni[0], fatta: true });
    api.aggiornaAzioneAgenda.mockResolvedValue({ ...agenda.azioni[0], fascia: 'sera' });
    render(<AgendaGiorno giorno="06-06" partitaId={3} />);
    fireEvent.click(await screen.findByLabelText('Fatto: Comprare i Bionutrienti'));
    await waitFor(() => expect(api.impostaAzioneAgendaFatta).toHaveBeenCalledWith(10, 3, true));
    fireEvent.click(screen.getByLabelText('Sposta Comprare i Bionutrienti di sera'));
    await waitFor(() => expect(api.aggiornaAzioneAgenda).toHaveBeenCalledWith(10, { fascia: 'sera' }));
  });

  it('conserva il testo quando il salvataggio fallisce', async () => {
    api.creaEventoAgenda.mockRejectedValue(new Error('Salvataggio fallito'));
    render(<AgendaGiorno giorno="06-06" partitaId={3} />);
    fireEvent.click(await screen.findByRole('button', { name: /Aggiungi evento/ }));
    fireEvent.change(screen.getByLabelText('Che cosa succede questo giorno'), { target: { value: 'Da conservare' } });
    fireEvent.click(screen.getByRole('button', { name: /^Aggiungi$/ }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Salvataggio fallito'));
    expect(screen.getByLabelText('Che cosa succede questo giorno')).toHaveValue('Da conservare');
  });

  it('elimina un evento e riporta l’errore del server senza rompere la pagina', async () => {
    api.eliminaEventoAgenda.mockRejectedValue(new Error('Evento non trovato'));
    render(<AgendaGiorno giorno="06-06" partitaId={3} />);
    fireEvent.click(await screen.findByLabelText('Elimina evento: Consegna del Palazzo'));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Evento non trovato'));
    expect(screen.getByText('Consegna del Palazzo')).toBeInTheDocument();
  });
});
