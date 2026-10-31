/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test CalendarioPage — oggi nella partita con scadenze e settimana della guida, mesi, giorno espandibile, imposta data di gioco
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CalendarioPage } from './CalendarioPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { CalendarioDto, GiornoCalendarioDto, PartitaDto } from '../types';

const { getCalendario, aggiornaPartita } = vi.hoisted(() => ({ getCalendario: vi.fn(), aggiornaPartita: vi.fn() }));
vi.mock('../services/api', (vero) => moduloApi(vero, { getCalendario, aggiornaPartita }));
vi.mock('../stores/notificationStore', (vero) => moduloNotifiche(vero));

/** Costruisce un giorno del calendario (sereno, senza eventi, settimana 4) con data e giorno della settimana dati. */
const giorno = (data: string, gs: string, extra: Partial<GiornoCalendarioDto> = {}): GiornoCalendarioDto => ({ data, giornoSettimana: gs, meteo: 'Sereno', eventi: [], tempoLibero: null, settimana: 4, allerte: [], ...extra });
const dati: CalendarioDto = {
  giorni: [
    giorno('04-09', 'Sabato', { settimana: 0, eventi: [{ id: 1, tipo: 'storia', titolo: 'Inizio del gioco', dettaglio: 'Prologo', fonte: 'https://www.allgamestaff.it/x', voci: [], modificabile: false, modificato: false }] }),
    giorno('05-01', 'Domenica'),
    giorno('05-11', 'Mercoledì', { eventi: [{ id: 2, tipo: 'esame', titolo: 'Esame di metà semestre', dettaglio: '', fonte: 'https://www.allgamestaff.it/y', voci: [], modificabile: false, modificato: false }] }),
  ],
  settimane: [{ numero: 4, titolo: 'Settimana 4', periodo: '01/05 - 08/05', dal: '05-01', al: '05-08', url: 'https://www.allgamestaff.it/s4', riassunto: 'Consigli della settimana quattro.', incertezze: '' }],
  dataGioco: '05-01',
  oggi: giorno('05-01', 'Domenica'),
  prossimeScadenze: [{ data: '05-11', tipo: 'esame', titolo: 'Esame di metà semestre', dettaglio: '', giorniMancanti: 10 }],
  mesi: ['04', '05'],
};

describe('CalendarioPage', () => {
  it('mostra oggi con settimana della guida e scadenze, il mese della data di gioco, espande un giorno e imposta la data', async () => {
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova', dataGioco: '05-01' } as PartitaDto, aggiornaLocale: vi.fn() });
    getCalendario.mockResolvedValue(dati);
    aggiornaPartita.mockResolvedValue({ id: 7, nome: 'Prova', dataGioco: '05-11' });
    render(<MemoryRouter><CalendarioPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: /Oggi.*1 maggio, Domenica/ })).toBeInTheDocument();
    expect(getCalendario).toHaveBeenCalledWith(7);
    expect(screen.getByText('Consigli della settimana quattro.')).toBeInTheDocument();
    expect(screen.getByText(/fra 10 giorni/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Maggio' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('list', { name: 'Giorni di Maggio' }).querySelectorAll('li')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '11 maggio, Mercoledì' }));
    expect(screen.getByText('Esame di metà semestre', { selector: 'strong' })).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Imposta come data di gioco della partita' })); });
    expect(aggiornaPartita).toHaveBeenCalledWith(7, { dataGioco: '05-11' });
    fireEvent.click(screen.getByRole('tab', { name: 'Aprile' }));
    expect(screen.getByRole('list', { name: 'Giorni di Aprile' }).querySelectorAll('li')).toHaveLength(1);
  });

  it('le allerte meteo del gioco sono tag sui loro giorni e nel riquadro «Oggi» (2026-10-12)', async () => {
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova', dataGioco: '05-01' } as PartitaDto, aggiornaLocale: vi.fn() });
    const polline = { chiave: 'allerta-polline', nome: 'Allerta polline', effetti: ['I nemici possono comparire addormentati.'], fasce: ['giorno' as const, 'sera' as const] };
    getCalendario.mockResolvedValue({ ...dati, oggi: { ...dati.oggi!, allerte: [polline] },
      giorni: dati.giorni.map((g) => (g.data === '05-11' ? { ...g, allerte: [polline] } : g)) });
    render(<MemoryRouter><CalendarioPage /></MemoryRouter>);
    const oggi = await screen.findByRole('heading', { name: /Oggi.*1 maggio, Domenica/ });
    // accanto al titolo, non dentro: il nome del titolo resta «Oggi …» senza l'allerta
    expect(oggi.querySelector('.chip--allerta')).toBeNull();
    expect(oggi).not.toHaveAccessibleName(/Allerta/);
    expect(oggi.parentElement!.querySelector(':scope > .chip--allerta')).toHaveTextContent('Allerta meteo: Allerta polline');
    const giorni = [...screen.getByRole('list', { name: 'Giorni di Maggio' }).querySelectorAll('li')];
    expect(giorni.map((li) => li.querySelectorAll('.chip--allerta').length)).toEqual([0, 1]);
    expect(giorni[1].querySelector('.chip--allerta')).toHaveAttribute('title', 'Allerta polline: I nemici possono comparire addormentati.');
  });
});
