/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test PercorsoPage — giorno corrente della partita, azioni di giorno e sera con collegamenti, spunta, navigazione
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PercorsoPage } from './PercorsoPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { PartitaDto, PercorsoGiornoDto, PercorsoIndiceDto } from '../types';

const { getPercorsoIndice, getPercorsoGiorno, impostaAzionePercorso, impostaGiornoCorrente } = vi.hoisted(() => ({ getPercorsoIndice: vi.fn(), getPercorsoGiorno: vi.fn(), impostaAzionePercorso: vi.fn(), impostaGiornoCorrente: vi.fn() }));
vi.mock('../services/api', () => ({ getPercorsoIndice, getPercorsoGiorno, impostaAzionePercorso, impostaGiornoCorrente, getImmagini: vi.fn().mockResolvedValue([]), caricaImmagine: vi.fn(), eliminaImmagine: vi.fn(), importaImmagineDaUrl: vi.fn(), urlImmagine: (ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file` }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));

const indice: PercorsoIndiceDto = { giorni: [{ giorno: '04-11', giornoSettimana: 'lun', fase: 'Palazzo di Kamoshida', meteo: null, azioni: 1, fatte: 0, avvisi: 0, coperto: true }, { giorno: '04-12', giornoSettimana: 'mar', fase: 'Palazzo di Kamoshida', meteo: null, azioni: 3, fatte: 0, avvisi: 1, coperto: true }, { giorno: '05-01', giornoSettimana: 'dom', fase: 'Dopo il Palazzo di Kamoshida', meteo: null, azioni: 0, fatte: 0, avvisi: 0, coperto: false }], dataCorrente: '04-12', totaleGiorni: 3, giorniCoperti: 2 };
const giorno: PercorsoGiornoDto = {
  giorno: '04-12', giornoSettimana: 'mar', fase: 'Palazzo di Kamoshida', trama: 'Primo accesso al Palazzo di Kamoshida.', vincoli: [], meteo: null,
  azioni: [
    { indice: 0, fascia: 'giorno', azione: 'Rispondere alla domanda in classe su Nemici', tipo: 'esame', riferimento: null, riferimentoTesto: null, rangoAtteso: null, note: 'Conoscenza +1', fatta: false, effetti: null, stato: null, mappa: null },
    { indice: 1, fascia: 'giorno', azione: 'Palazzo di Kamoshida: esplorazione del secondo livello', tipo: 'palazzo', riferimento: { tipo: 'dungeon', chiave: 'kamoshida' }, riferimentoTesto: 'Palazzo di Kamoshida', rangoAtteso: null, note: null, fatta: false, effetti: null, stato: null, mappa: null },
    { indice: 2, fascia: 'sera', azione: 'Cena con Ryuji', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'ryuji' }, riferimentoTesto: 'Ryuji Sakamoto - Carro', rangoAtteso: 1, note: null, fatta: false, effetti: null, stato: null, mappa: null },
  ],
  avvisi: ['Confidenti sbloccati: Ryuji (Carro) rango 1'], fonte: 'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-1/', coperto: true, precedente: '04-11', successivo: '04-13', dataCorrente: '04-12', fatte: 0,
};

describe('PercorsoPage', () => {
  it('apre il giorno corrente, mostra azioni con collegamenti e avvisi, segna un\'azione fatta, naviga al giorno successivo', async () => {
    usePartitaStore.setState({ attiva: { id: 4, nome: 'Prova' } as PartitaDto });
    getPercorsoIndice.mockResolvedValue(indice);
    getPercorsoGiorno.mockResolvedValue(giorno);
    impostaAzionePercorso.mockResolvedValue({ ...giorno.azioni[0], fatta: true });
    render(<MemoryRouter initialEntries={['/guida/percorso']}><Routes><Route path="/guida/percorso" element={<PercorsoPage />} /><Route path="/guida/percorso/:data" element={<PercorsoPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Primo accesso al Palazzo di Kamoshida.')).toBeInTheDocument();
    expect(getPercorsoGiorno).toHaveBeenCalledWith('04-12', 4);
    expect(screen.getByRole('heading', { name: /^Di giorno/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Di sera/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ryuji Sakamoto - Carro' })).toHaveAttribute('href', '/confidenti/ryuji');
    expect(screen.getByRole('link', { name: 'Palazzo di Kamoshida' })).toHaveAttribute('href', '/guida/dungeon/kamoshida');
    expect(screen.getByText('Confidenti sbloccati: Ryuji (Carro) rango 1')).toBeInTheDocument();
    expect(screen.getByText('Oggi nella partita')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: /Rispondere alla domanda/ })); });
    expect(impostaAzionePercorso).toHaveBeenCalledWith(4, '04-12', 0, true, undefined);
    expect(await screen.findByText('1 azioni fatte su 3.')).toBeInTheDocument();
    getPercorsoGiorno.mockResolvedValue({ ...giorno, giorno: '04-13', giornoSettimana: 'mer', trama: 'Giorno dopo.', precedente: '04-12', successivo: '04-14', azioni: [], fatte: 0, avvisi: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Giorno successivo' }));
    expect(await screen.findByText('Giorno dopo.')).toBeInTheDocument();
    expect(getPercorsoGiorno).toHaveBeenLastCalledWith('04-13', 4);
    expect(screen.getByRole('button', { name: 'Segna come giorno corrente' })).toBeInTheDocument();
  });
});
