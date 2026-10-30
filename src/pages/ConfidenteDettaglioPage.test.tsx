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
import { conNote } from '../../test/note';

const { getConfidenteDettaglio, getConfidentiPartita, impostaRegaloFatto, impostaDotiIncontro, getRichieste, togliRequisitoRichiesta } = vi.hoisted(() => ({ getConfidenteDettaglio: vi.fn(), getConfidentiPartita: vi.fn(), impostaRegaloFatto: vi.fn(), impostaDotiIncontro: vi.fn(), getRichieste: vi.fn(), togliRequisitoRichiesta: vi.fn() }));
vi.mock('../services/api', (vero) => moduloApi(vero, { getConfidenteDettaglio, getConfidentiPartita, impostaRegaloFatto, impostaDotiIncontro, getRichieste, togliRequisitoRichiesta }));
vi.mock('../stores/notificationStore', (vero) => moduloNotifiche(vero));
vi.mock('../components/shared/ImmagineEntita', () => ({ ImmagineEntita: () => null }));

const dettaglio: ConfidenteDettaglioDto = {
  chiave: 'takemi', nome: 'Takemi', arcana: 'Death', arcanaNome: 'Morte', ordine: 13,
  abilita: [{ rango: 1, nome: 'Rigenerazione', descrizione: 'Più oggetti curativi.' }, { rango: 3, nome: 'Sterilizzazione', descrizione: '' }],
  dotiIncontro: [
    { rango: 1, doti: [{ dote: 'coraggio', note: 1 }], testo: 'Coraggio ♪' },
    { rango: 2, doti: [{ dote: 'coraggio', note: 1 }], testo: 'Coraggio ♪' },
    { rango: 3, doti: [], testo: '' },
  ],
  dialoghi: [
    // migrazione 309: i punti solo numerici (con `puntiAmore` dove il ramo amore dà altro), la nota senza i requisiti già strutturati
    { id: 1, rango: 1, etichetta: '1', note: 'Data consigliata 18 aprile.', scelte: [{ ordine: 1, testo: 'Hai farmaci speciali?', punti: 2, puntiAmore: null, romantica: false, avviso: null }] },
    { id: 2, rango: 2, etichetta: '2', note: 'Data consigliata 25 aprile.', scelte: [{ ordine: 1, testo: 'Voglio fare un test', punti: 3, puntiAmore: null, romantica: false, avviso: null }, { ordine: 2, testo: 'Vado via', punti: 0, puntiAmore: null, romantica: false, avviso: 'Da evitare' }] },
    { id: 3, rango: 9, etichetta: '9', note: '', scelte: [{ ordine: 1, testo: 'Ti amo', punti: 3, puntiAmore: null, romantica: true, avviso: null }, { ordine: 2, testo: 'Incredibile', punti: 0, puntiAmore: 2, romantica: false, avviso: null }] },
  ],
  regali: [{ ordine: 1, modificato: false, nome: 'Castella', dove: 'Taisho Store', costo: '1.500 ¥', reazione: 2 }, { ordine: 2, modificato: false, nome: 'Mini cactus', dove: null, costo: null, reazione: 3 }],
  regalabile: true,
  // L13 (O6-2): della prosa restano solo le note; senza struttura la scheda dice «Disponibilità non indicata»
  disponibilita: { note: 'Gli eventi di rango si attivano una volta ogni tre giorni.' },
  noteGenerali: '', fonti: ['https://www.allgamestaff.it/persona-5-royal/guida-rango-confidente-di-tae-takemi-morte/'],
};
const stato: ConfidentePartitaDto = { chiave: 'takemi', nome: 'Takemi', arcana: 'Death', arcanaNome: 'Morte', ordine: 13, sbloccato: true, rango: 1, punti: 0, puntiNecessari: 10, mancanti: 10, personaArcanoInScorta: false, bloccato: null, semafori: [], regaliFatti: ['Castella'], regalabile: true, note: '', updatedAt: null };

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
    expect(screen.getByText('Disponibilità non indicata.')).toBeInTheDocument();
    expect(screen.getByText('Gli eventi di rango si attivano una volta ogni tre giorni.')).toBeInTheDocument();
    // dialogo del rango 9: chiuso, si apre al click e mostra la scelta romantica
    fireEvent.click(screen.getByRole('button', { name: /Rango 9/ }));
    expect(screen.getByText('Ti amo')).toBeInTheDocument();
    expect(screen.getByText('romantica')).toBeInTheDocument();
    // la resa unica dei punti: zero è «nessun punto», il ramo amore diverso si legge accanto (`resaPuntiScelta`)
    expect(screen.getByText('nessun punto')).toBeInTheDocument();
    expect(screen.getByText(/nessun punto \(amicizia\) · /)).toBeInTheDocument();
    // regali: Castella già consegnato, Mini cactus da spuntare
    expect(screen.getByRole('checkbox', { name: 'Regalo Castella consegnato' })).toBeChecked();
    const cactus = screen.getByRole('checkbox', { name: 'Regalo Mini cactus consegnato' });
    expect(cactus).not.toBeChecked();
    await act(async () => { fireEvent.click(cactus); });
    expect(impostaRegaloFatto).toHaveBeenCalledWith(7, 'takemi', 'Mini cactus', true);
  });

  it('la Dote al passaggio di rango, rango per rango: il prossimo evidenziato, si modifica e si salva', async () => {
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova' } as PartitaDto });
    getConfidenteDettaglio.mockResolvedValue(dettaglio);
    getConfidentiPartita.mockResolvedValue([stato]);
    impostaDotiIncontro.mockResolvedValue(dettaglio);
    render(<MemoryRouter initialEntries={['/confidenti/takemi']}><Routes><Route path="/confidenti/:chiave" element={<ConfidenteDettaglioPage />} /></Routes></MemoryRouter>);
    const sezione = await screen.findByRole('region', { name: 'Dote al passaggio di rango' });
    // dal 2026-10-17 la Dote si ricorda solo al passaggio di rango, e il riquadro lo dice
    expect(within(sezione).getByText(/Un'uscita che dà solo punti non le ricorda/)).toBeInTheDocument();
    // rango 1 nella partita: il prossimo passaggio è al 2
    expect(within(sezione).getByText('rango 2')).toHaveClass('chip--oro');
    expect(within(sezione).getAllByText(conNote('Coraggio ♪'))).toHaveLength(2);
    expect(within(sezione).queryByText('rango 3')).toBeNull();
    fireEvent.click(within(sezione).getByRole('button', { name: 'Modifica' }));
    const finestra = screen.getByRole('dialog', { name: 'Dote al passaggio di rango: Takemi' });
    expect(within(finestra).getByText('Al passaggio al rango 2')).toBeInTheDocument();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Aggiungi una Dote al rango 3' }));
    fireEvent.click(within(finestra).getByRole('button', { name: 'Togli la Dote 1 del rango 1' }));
    await act(async () => { fireEvent.click(within(finestra).getByRole('button', { name: 'Salva' })); });
    expect(impostaDotiIncontro).toHaveBeenCalledWith('takemi', [
      { rango: 1, doti: [] }, { rango: 2, doti: [{ dote: 'coraggio', note: 1 }] }, { rango: 3, doti: [{ dote: 'fascino', note: 2 }] },
    ]);
  });
});

describe('ConfidenteDettaglioPage — fonti (A8, verifica 2026-10-03)', () => {
  it('una fonte scritta a parole si mostra come testo invece di far cadere la pagina; un indirizzo resta un collegamento col nome del sito', async () => {
    usePartitaStore.setState({ attiva: null });
    getConfidenteDettaglio.mockResolvedValue({ ...dettaglio, fonti: ['guida cartacea', 'https://www.allgamestaff.it/x'] });
    render(<MemoryRouter initialEntries={['/confidenti/takemi']}><Routes><Route path="/confidenti/:chiave" element={<ConfidenteDettaglioPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Takemi' })).toBeInTheDocument();
    expect(screen.getByText(/guida cartacea/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'www.allgamestaff.it' })).toHaveAttribute('href', 'https://www.allgamestaff.it/x');
  });

  it('un requisito rimasto su una Richiesta che non c’è più si corregge dalla scheda: «Correggi» apre la finestra, e dopo si rilegge', async () => {
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova' } as PartitaDto });
    getConfidenteDettaglio.mockResolvedValue(dettaglio);
    const rotto = { indice: 0, tipo: 'richiesta', testo: 'Completare la richiesta «Un fidanzato violento»', stato: 'grigio' as const, dettaglio: 'La Richiesta «Un fidanzato violento» non c’è più: correggi quel che la cita', manuale: false, confermato: false };
    getConfidentiPartita.mockResolvedValue([{ ...stato, semafori: [{ rango: 2, pronto: false, requisiti: [rotto] }] }]);
    getRichieste.mockResolvedValue({ richieste: [], jose: null, dedali: [], completate: 0, totale: 0, collocazioni: [] });
    togliRequisitoRichiesta.mockResolvedValue(undefined);
    render(<MemoryRouter initialEntries={['/confidenti/takemi']}><Routes><Route path="/confidenti/:chiave" element={<ConfidenteDettaglioPage />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Correggi/ }));
    const finestra = await screen.findByRole('dialog', { name: 'Correggi il requisito · Takemi, rango 2' });
    const letture = getConfidentiPartita.mock.calls.length;
    fireEvent.click(within(finestra).getByRole('button', { name: 'Togli il requisito' }));
    await act(async () => { fireEvent.click(within(finestra).getByRole('button', { name: 'Confermo' })); });
    expect(togliRequisitoRichiesta).toHaveBeenCalledWith('takemi', 2, 0);
    expect(getConfidentiPartita.mock.calls.length).toBeGreaterThan(letture);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
