/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test DomandePage — prossimo appuntamento evidenziato nel mese, esami in una rappresentazione sola, ricerca e segmenti, spunta «fatta» con Conoscenza
// ============================================================

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DomandePage } from './DomandePage';
import { dataGiocoTesto } from '../utils/dateGioco';
import { usePartitaStore } from '../stores/partitaStore';
import type { DomandaDto, DomandeDto, PartitaDto } from '../types';

const { getDomande, impostaDomandaFatta } = vi.hoisted(() => ({ getDomande: vi.fn(), impostaDomandaFatta: vi.fn() }));
vi.mock('../services/api', () => ({ getDomande, impostaDomandaFatta }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));

const dom = (id: number, data: string, domanda: string, extra: Partial<DomandaDto> = {}): DomandaDto => ({ id, chiave: data, data, tipo: 'classe', chi: 'Prof. Inui', domanda, risposte: [{ ordine: 1, testo: 'Risposta ' + id }], ricompensa: 'Conoscenza +1 nota', note: '', fonte: '', fatta: false, ...extra });
const esame = dom(3, '05-11', 'Serie di domande su Yoshitsune', { tipo: 'esame-medio', chi: 'Esame di metà semestre 1', ricompensa: 'Conoscenza (classifica)', risposte: [{ ordine: 1, testo: 'Yoshitsune', domanda: 'Chi?' }, { ordine: 2, testo: 'Yoritomo', domanda: 'Il fratello?' }] });
const tv = dom(4, '05-19', 'Quale delle due è una lesione?', { tipo: 'tv', chi: 'Game show in TV', ricompensa: 'Aumento della Dote Conoscenza' });
const dati: DomandeDto = {
  domande: [dom(1, '04-12', 'Prima domanda'), dom(2, '05-07', 'Seconda domanda'), esame, tv],
  esami: [{ chiave: 'esame-1', nome: 'Esame di metà semestre 1', date: ['05-11'], dataRisultati: '05-20', domande: [{ data: '05-11', ordine: 1, domanda: 'Chi?', risposta: 'Yoshitsune' }], note: '' }],
  premi: { fascinoPerPiazzamento: { primi_10: 'Fascino +3' } }, dataGioco: '05-01', prossime: [dom(2, '05-07', 'Seconda domanda')], fatte: 0, totale: 4,
};

describe('DomandePage', () => {
  it('formatta le date di gioco', () => {
    expect(dataGiocoTesto('04-12')).toBe('12 aprile');
    expect(dataGiocoTesto('01-12')).toBe('12 gennaio');
  });

  it('evidenzia il prossimo appuntamento nel suo mese, mostra gli esami con il quesito accanto alla risposta, filtra e segna fatta con Conoscenza', async () => {
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova' } as PartitaDto });
    getDomande.mockResolvedValue(dati);
    impostaDomandaFatta.mockResolvedValue({ ...dati, fatte: 1, prossime: [], domande: dati.domande.map((x) => (x.id === 2 ? { ...x, fatta: true } : x)) });
    render(<MemoryRouter><DomandePage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Maggio' })).toBeInTheDocument();
    expect(getDomande).toHaveBeenCalledWith(7);
    // il prossimo appuntamento è un rimando, non un secondo elenco: la riga sta nel mese, evidenziata, una volta sola
    expect(screen.getByRole('status')).toHaveTextContent('Prossimo appuntamento: 7 maggio · Prof. Inui');
    expect(screen.queryByRole('heading', { name: 'Prossime domande' })).toBeNull();
    expect(screen.getAllByText('Seconda domanda')).toHaveLength(1);
    expect(screen.getByText('Prossima')).toBeInTheDocument();
    // l'esame: quesito → risposta nella riga; la sezione «Esami» dice date e risultati senza ripetere le domande
    expect(screen.getByText('Chi? →')).toBeInTheDocument();
    expect(screen.getAllByText('Yoshitsune')).toHaveLength(1);
    expect(screen.getByText(/risultati il 20 maggio/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aprile' })).toBeInTheDocument();
    expect(screen.getAllByText('→ Risposta 2').length).toBeGreaterThan(0);
    // il quiz in TV ha la risposta visibile
    expect(screen.getByText('Quiz in TV')).toBeInTheDocument();
    expect(screen.getByText('→ Risposta 4')).toBeInTheDocument();
    const casella = screen.getByRole('checkbox', { name: 'Domanda del 7 maggio fatta' });
    await act(async () => { fireEvent.click(casella); });
    expect(impostaDomandaFatta).toHaveBeenCalledWith(7, 2, true, true);
    expect(await screen.findByText(/hai segnato 1 domande su 4/)).toBeInTheDocument();
    // i segmenti: tipo e stato indipendenti
    fireEvent.click(screen.getByRole('radio', { name: 'Esami' }));
    expect(screen.queryByRole('heading', { name: 'Aprile' })).toBeNull();
    expect(screen.getByText('1 domande')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Quiz TV' }));
    expect(screen.getByText('Quale delle due è una lesione?')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Tipo' })).getByRole('radio', { name: 'Tutte' }));
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Stato' })).getByRole('radio', { name: 'Fatte' }));
    expect(screen.getByText('1 domande')).toBeInTheDocument();
    // la ricerca trova per risposta
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Stato' })).getByRole('radio', { name: 'Tutte' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'yoritomo' } });
    expect(screen.getByText('1 domande')).toBeInTheDocument();
    expect(screen.getByText('Serie di domande su Yoshitsune')).toBeInTheDocument();
  });
});
