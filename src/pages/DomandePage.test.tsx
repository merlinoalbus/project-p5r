/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test DomandePage — prossime domande, elenco per mese con risposte, filtri, spunta «fatta» con Conoscenza
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DomandePage } from './DomandePage';
import { dataGiocoTesto } from '../utils/dateGioco';
import { usePartitaStore } from '../stores/partitaStore';
import type { DomandaDto, DomandeDto, PartitaDto } from '../types';

const { getDomande, impostaDomandaFatta } = vi.hoisted(() => ({ getDomande: vi.fn(), impostaDomandaFatta: vi.fn() }));
vi.mock('../services/api', () => ({ getDomande, impostaDomandaFatta }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));

const dom = (id: number, data: string, domanda: string, extra: Partial<DomandaDto> = {}): DomandaDto => ({ id, data, tipo: 'classe', chi: 'Prof. Inui', domanda, risposte: [{ ordine: 1, testo: 'Risposta ' + id }], ricompensa: 'Conoscenza +1 nota', note: '', fonte: '', fatta: false, ...extra });
const dati: DomandeDto = {
  domande: [dom(1, '04-12', 'Prima domanda'), dom(2, '05-07', 'Seconda domanda'), dom(3, '05-11', 'Esame', { tipo: 'esame-medio', chi: 'Esame', ricompensa: 'Conoscenza (classifica)' })],
  esami: [{ chiave: 'esame-1', nome: 'Esame di metà semestre 1', date: ['05-11'], dataRisultati: '05-20', domande: [{ data: '05-11', ordine: 1, domanda: 'Chi?', risposta: 'Yoshitsune' }], note: '' }],
  premi: { fascinoPerPiazzamento: { primi_10: 'Fascino +3' } }, dataGioco: '05-01', prossime: [dom(2, '05-07', 'Seconda domanda'), dom(3, '05-11', 'Esame', { tipo: 'esame-medio', chi: 'Esame', ricompensa: 'Conoscenza (classifica)' })], fatte: 0, totale: 3,
};

describe('DomandePage', () => {
  it('formatta le date di gioco', () => {
    expect(dataGiocoTesto('04-12')).toBe('12 aprile');
    expect(dataGiocoTesto('01-12')).toBe('12 gennaio');
  });

  it('mostra prossime, esami e mesi; la spunta chiama l\'API con Conoscenza quando la ricompensa la prevede', async () => {
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova' } as PartitaDto });
    getDomande.mockResolvedValue(dati);
    impostaDomandaFatta.mockResolvedValue({ ...dati, fatte: 1, prossime: [dati.prossime[1]], domande: dati.domande.map((x) => (x.id === 2 ? { ...x, fatta: true } : x)) });
    render(<MemoryRouter><DomandePage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Prossime domande' })).toBeInTheDocument();
    expect(getDomande).toHaveBeenCalledWith(7);
    expect(screen.getByText('Yoshitsune')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aprile' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Maggio' })).toBeInTheDocument();
    expect(screen.getAllByText('→ Risposta 2').length).toBeGreaterThan(0);
    const caselle = screen.getAllByRole('checkbox', { name: 'Domanda del 7 maggio fatta' });
    await act(async () => { fireEvent.click(caselle[0]); });
    expect(impostaDomandaFatta).toHaveBeenCalledWith(7, 2, true, true);
    expect(await screen.findByText(/hai segnato 1 domande su 3/)).toBeInTheDocument();
    // filtro «Solo esami»
    fireEvent.click(screen.getByRole('button', { name: 'Solo esami' }));
    expect(screen.queryByRole('heading', { name: 'Aprile' })).toBeNull();
    expect(screen.getByText('1 domande')).toBeInTheDocument();
  });
});
