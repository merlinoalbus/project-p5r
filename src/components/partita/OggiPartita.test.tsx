/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test OggiPartita — guida del giorno corrente con stati (oro/grigio) accanto alla mappa; «Sulla mappa» cambia mappa e centra lo spillo (12.4/13.5)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OggiPartita } from './OggiPartita';
import { usePartitaStore } from '../../stores/partitaStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import type { MappaDto, PartitaDto, PercorsoGiornoDto, PercorsoIndiceDto } from '../../types';

const api = vi.hoisted(() => ({ getPercorsoIndice: vi.fn(), getPercorsoGiorno: vi.fn(), impostaGiornoCorrente: vi.fn(), getSuggerimenti: vi.fn(), impostaAzionePercorso: vi.fn(), getMappa: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaStatoPunto: vi.fn(), impostaAcquisto: vi.fn(), getImmagini: vi.fn().mockResolvedValue([]), urlImmagine: vi.fn(() => '/x'), caricaImmagine: vi.fn(), eliminaImmagine: vi.fn(), importaImmagineDaUrl: vi.fn() }));
vi.mock('../../services/api', () => api);

const indice: PercorsoIndiceDto = { giorni: [{ giorno: '04-12', giornoSettimana: 'mar', azioni: 2, fatte: 0, coperto: true } as PercorsoIndiceDto['giorni'][number]], dataCorrente: '04-12', totaleGiorni: 346, giorniCoperti: 300 };
const giorno: PercorsoGiornoDto = {
  giorno: '04-12', giornoSettimana: 'mar', fase: 'Palazzo di Kamoshida', trama: 'Primo giorno.', vincoli: [], meteo: 'sereno', avvisi: [], fonte: '', coperto: true, precedente: '04-11', successivo: '04-13', dataCorrente: '04-12', fatte: 0,
  azioni: [
    { indice: 0, fascia: 'giorno', azione: 'Parla con Ryuji in cortile', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'ryuji' }, riferimentoTesto: 'Ryuji', rangoAtteso: 2, note: null, fatta: false, effetti: null, stato: { tipo: 'consigliata', motivo: 'requisiti del rango 2 soddisfatti' }, mappa: { chiave: 'citta-shibuya', spilloId: 7 } },
    { indice: 1, fascia: 'sera', azione: 'Vai da Takemi', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, riferimentoTesto: 'Takemi', rangoAtteso: 3, note: null, fatta: false, effetti: null, stato: { tipo: 'bloccata', motivo: 'Coraggio rango 2 (rango 1 di 2)' }, mappa: null },
  ],
};
const mappa = (chiave: string, nome: string): MappaDto => ({ chiave, nome, tipo: chiave === 'tokyo' ? 'citta' : 'quartiere', genitore: chiave === 'tokyo' ? null : 'tokyo', ordine: 0, immagineUrl: null, asset: null, entita: null, origine: 'seed', numeroSpilli: 1, numeroFigli: 0, updatedAt: '', larghezza: 1000, altezza: 600, note: '', genitoreNome: null, percorso: [{ chiave, nome }], figli: [],
  spilli: [{ id: 7, mappaChiave: chiave, tipo: 'confidente', tipoNome: 'Confidente', colore: '#ec4899', nome: 'Cortile della Shujin', descrizione: '', x: 30, y: 40, riferimento: null, collezionabile: false, ordine: 0, origine: 'seed', raccolto: false, dettaglio: null, condizioni: [], immagini: [], updatedAt: '' }] });

describe('OggiPartita', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) if ('mockReset' in f) f.mockReset();
    api.getPercorsoIndice.mockResolvedValue(indice);
    api.getPercorsoGiorno.mockResolvedValue(giorno);
    api.getImmagini.mockResolvedValue([]);
    api.getMappa.mockImplementation((chiave: string) => Promise.resolve(mappa(chiave, chiave === 'tokyo' ? 'Tokyo' : 'Shibuya')));
  });

  it('mostra la guida del giorno corrente con le azioni consigliate (oro) e bloccate (motivo) e la mappa di Tokyo accanto', async () => {
    render(<MemoryRouter><OggiPartita partita={{ id: 4, nome: 'Prova' } as PartitaDto} /></MemoryRouter>);
    expect(await screen.findByText('Parla con Ryuji in cortile')).toBeInTheDocument();
    expect(api.getPercorsoGiorno).toHaveBeenCalledWith('04-12', 4);
    expect(screen.getByText('Oggi nella partita')).toBeInTheDocument();
    expect(screen.getByText('Consigliata · requisiti del rango 2 soddisfatti')).toBeInTheDocument();
    expect(screen.getByText('Bloccata: Coraggio rango 2 (rango 1 di 2)')).toBeInTheDocument();
    expect(screen.getByText('1 consigliate · 1 bloccate')).toBeInTheDocument();
    expect(await screen.findByRole('application', { name: 'Mappa: Tokyo' })).toBeInTheDocument();
    expect(api.getMappa).toHaveBeenCalledWith('tokyo', 4);
    expect(screen.getByRole('link', { name: 'Guida completa' })).toHaveAttribute('href', '/guida/percorso/04-12');
  });

  it('«Sulla mappa» apre la mappa dell’azione centrata sullo spillo collegato; «Torna a Tokyo» ripristina la mappa globale', async () => {
    render(<MemoryRouter><OggiPartita partita={{ id: 4, nome: 'Prova' } as PartitaDto} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Sulla mappa: Parla con Ryuji/ }));
    await waitFor(() => expect(api.getMappa).toHaveBeenCalledWith('citta-shibuya', 4));
    expect(await screen.findByRole('application', { name: 'Mappa: Shibuya' })).toBeInTheDocument();
    // lo spillo collegato è selezionato: popup ancorato aperto
    expect(await screen.findByRole('dialog', { name: 'Cortile della Shujin' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Azioni di giorno' })).getByRole('listitem')).toHaveAttribute('aria-current', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Torna a Tokyo' }));
    expect(await screen.findByRole('application', { name: 'Mappa: Tokyo' })).toBeInTheDocument();
  });

  it('«Segna come giorno corrente» allinea la data di gioco della partita nello store (chip, Riepilogo, ScuolaOggi) e rinfresca i suggerimenti del giorno', async () => {
    const partita = { id: 4, nome: 'Prova', dataGioco: '04-11', updatedAt: '2026-09-04T18:46:48.095Z' } as PartitaDto;
    usePartitaStore.setState({ partite: [partita], attiva: partita });
    useSuggerimentiStore.setState({ partitaId: 4, dati: null, caricamento: false });
    // il server e la sua «data corrente» sono simulati con una variabile: dopo la PUT anche le riletture del giorno la vedono
    let corrente = '04-11';
    api.getPercorsoIndice.mockImplementation(async () => ({ ...indice, dataCorrente: corrente }));
    api.getPercorsoGiorno.mockImplementation(async () => ({ ...giorno, dataCorrente: corrente }));
    const aggiornata = { ...partita, dataGioco: '04-12', updatedAt: '2026-09-05T10:00:00.000Z' };
    api.impostaGiornoCorrente.mockImplementation(async (_id: number, data: string) => { corrente = data; return { dataCorrente: data, partita: aggiornata }; });
    api.getSuggerimenti.mockResolvedValue({ giorno: '04-12', motivi: [] });
    render(<MemoryRouter><OggiPartita partita={partita} /></MemoryRouter>);
    const pulsante = await screen.findByRole('button', { name: 'Segna come giorno corrente' });
    expect(api.getSuggerimenti).not.toHaveBeenCalled();
    fireEvent.click(pulsante);
    await waitFor(() => expect(api.impostaGiornoCorrente).toHaveBeenCalledWith(4, '04-12'));
    expect(await screen.findByText('Oggi nella partita')).toBeInTheDocument();
    // lo store della partita è allineato senza ricaricare l'elenco: attiva e voce in `partite`
    expect(usePartitaStore.getState().attiva).toEqual(aggiornata);
    expect(usePartitaStore.getState().partite[0]).toEqual(aggiornata);
    // i suggerimenti del giorno vengono ricaricati per la stessa partita
    await waitFor(() => expect(api.getSuggerimenti).toHaveBeenCalledWith(4));
  });
});
