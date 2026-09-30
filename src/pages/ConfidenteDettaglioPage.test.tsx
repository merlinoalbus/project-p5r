/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test ConfidenteDettaglioPage — prossimo rango evidenziato, dialoghi con scelte migliori e romantiche, regali con spunta
// ============================================================

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConfidenteDettaglioPage } from './ConfidenteDettaglioPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { ConfidenteDettaglioDto, ConfidentePartitaDto, PartitaDto } from '../types';

const { getConfidenteDettaglio, getConfidentiPartita, impostaRegaloFatto, impostaDotiIncontro } = vi.hoisted(() => ({ getConfidenteDettaglio: vi.fn(), getConfidentiPartita: vi.fn(), impostaRegaloFatto: vi.fn(), impostaDotiIncontro: vi.fn() }));
vi.mock('../services/api', () => ({ getConfidenteDettaglio, getConfidentiPartita, impostaRegaloFatto, impostaDotiIncontro }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../components/shared/ImmagineEntita', () => ({ ImmagineEntita: () => null }));

const dettaglio: ConfidenteDettaglioDto = {
  chiave: 'takemi', nome: 'Takemi', arcana: 'Death', arcanaNome: 'Morte', ordine: 13,
  abilita: [{ rango: 1, nome: 'Rigenerazione', descrizione: 'Più oggetti curativi.' }, { rango: 3, nome: 'Sterilizzazione', descrizione: '' }],
  dotiIncontro: [
    { rango: 1, doti: [{ dote: 'coraggio', note: 1 }], testo: 'Coraggio, 1 nota' },
    { rango: 2, doti: [{ dote: 'coraggio', note: 1 }], testo: 'Coraggio, 1 nota' },
    { rango: 3, doti: [], testo: '' },
  ],
  dialoghi: [
    { id: 1, rango: 1, etichetta: '1', note: 'Data consigliata 18 aprile.', scelte: [{ ordine: 1, testo: 'Hai farmaci speciali?', punti: 2, puntiTesto: '+2', romantica: false, avviso: null }] },
    { id: 2, rango: 2, etichetta: '2', note: 'Richiede Coraggio 2.', scelte: [{ ordine: 1, testo: 'Voglio fare un test', punti: 3, puntiTesto: '+3', romantica: false, avviso: null }, { ordine: 2, testo: 'Vado via', punti: 0, puntiTesto: '+0', romantica: false, avviso: 'Da evitare' }] },
    { id: 3, rango: 9, etichetta: '9', note: '', scelte: [{ ordine: 1, testo: 'Ti amo', punti: 3, puntiTesto: '+3', romantica: true, avviso: null }] },
  ],
  regali: [{ nome: 'Castella', dove: 'Taisho Store', costo: '1.500 ¥', effetto: '+2' }, { nome: 'Mini cactus', dove: null, costo: null, effetto: '+3' }],
  regaliSconsigliati: [],
  disponibilita: { giorni: ['Lunedì', 'Martedì'], fasce: ['Giorno'], luogo: 'Clinica Takemi', sbloccoData: '18 aprile', sbloccoRequisiti: '', note: 'Anche con pioggia.' },
  noteGenerali: '', fonti: ['https://www.allgamestaff.it/persona-5-royal/guida-rango-confidente-di-tae-takemi-morte/'],
};
const stato: ConfidentePartitaDto = { chiave: 'takemi', nome: 'Takemi', arcana: 'Death', arcanaNome: 'Morte', ordine: 13, sbloccato: true, rango: 1, punti: 0, puntiNecessari: 10, mancanti: 10, personaArcanoInScorta: false, bloccato: null, semafori: [], regaliFatti: ['Castella'], note: '', updatedAt: null };

describe('ConfidenteDettaglioPage', () => {
  it('mostra prossimo rango, abilità sbloccate, scelte migliori/romantiche e regali con spunta per la partita', async () => {
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova' } as PartitaDto });
    getConfidenteDettaglio.mockResolvedValue(dettaglio);
    getConfidentiPartita.mockResolvedValue([stato]);
    impostaRegaloFatto.mockResolvedValue(stato);
    render(<MemoryRouter initialEntries={['/confidenti/takemi']}><Routes><Route path="/confidenti/:chiave" element={<ConfidenteDettaglioPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Takemi' })).toBeInTheDocument();
    expect(await screen.findByText('Rango 1 nella partita')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Prossimo passo: rango 2' })).toBeInTheDocument();
    expect(screen.getByText('Voglio fare un test')).toBeInTheDocument();
    expect(screen.getByText('Da evitare')).toBeInTheDocument();
    expect(screen.getByText('Clinica Takemi')).toBeInTheDocument();
    // dialogo del rango 9: chiuso, si apre al click e mostra la scelta romantica
    fireEvent.click(screen.getByRole('button', { name: /Rango 9/ }));
    expect(screen.getByText('Ti amo')).toBeInTheDocument();
    expect(screen.getByText('romantica')).toBeInTheDocument();
    // regali: Castella già consegnato, Mini cactus da spuntare
    expect(screen.getByRole('checkbox', { name: 'Regalo Castella consegnato' })).toBeChecked();
    const cactus = screen.getByRole('checkbox', { name: 'Regalo Mini cactus consegnato' });
    expect(cactus).not.toBeChecked();
    await act(async () => { fireEvent.click(cactus); });
    expect(impostaRegaloFatto).toHaveBeenCalledWith(7, 'takemi', 'Mini cactus', true);
  });

  it('la Dote a ogni incontro per rango: il prossimo evidenziato, si modifica e si salva', async () => {
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova' } as PartitaDto });
    getConfidenteDettaglio.mockResolvedValue(dettaglio);
    getConfidentiPartita.mockResolvedValue([stato]);
    impostaDotiIncontro.mockResolvedValue(dettaglio);
    render(<MemoryRouter initialEntries={['/confidenti/takemi']}><Routes><Route path="/confidenti/:chiave" element={<ConfidenteDettaglioPage />} /></Routes></MemoryRouter>);
    const sezione = await screen.findByRole('region', { name: 'Dote a ogni incontro' });
    // rango 1 nella partita: il prossimo incontro vale verso il 2
    expect(within(sezione).getByText('verso 2')).toHaveClass('chip--oro');
    expect(within(sezione).getAllByText('Coraggio, 1 nota')).toHaveLength(2);
    expect(within(sezione).queryByText('verso 3')).toBeNull();
    fireEvent.click(within(sezione).getByRole('button', { name: 'Modifica' }));
    const finestra = screen.getByRole('dialog', { name: 'Dote a ogni incontro: Takemi' });
    fireEvent.click(within(finestra).getByRole('button', { name: 'Aggiungi una Dote al rango 3' }));
    fireEvent.click(within(finestra).getByRole('button', { name: 'Togli la Dote 1 del rango 1' }));
    await act(async () => { fireEvent.click(within(finestra).getByRole('button', { name: 'Salva' })); });
    expect(impostaDotiIncontro).toHaveBeenCalledWith('takemi', [
      { rango: 1, doti: [] }, { rango: 2, doti: [{ dote: 'coraggio', note: 1 }] }, { rango: 3, doti: [{ dote: 'fascino', note: 2 }] },
    ]);
  });
});
