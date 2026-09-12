/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test RichiestePage — ricerca, segmenti di accettazione e completamento, dedalo nell'indirizzo, stato per partita, foglio Jose
// ============================================================

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { scegliVoce } from '../../test/selettore';
import { MemoryRouter } from 'react-router-dom';
import { RichiestePage } from './RichiestePage';
import { usePartitaStore } from '../stores/partitaStore';
import type { PartitaDto, RichiestaDto, RichiesteDto } from '../types';

const { getRichieste, impostaStatoRichiesta } = vi.hoisted(() => ({ getRichieste: vi.fn(), impostaStatoRichiesta: vi.fn() }));
vi.mock('../services/api', () => ({ getRichieste, impostaStatoRichiesta }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));

const ric = (chiave: string, nome: string, areaChiave: string, areaNome: string, extra: Partial<RichiestaDto> = {}): RichiestaDto => ({ chiave, nome, committente: 'Mishima', disponibileDal: '7 maggio', scadenza: '', area: areaNome, areaChiave, piano: 'Area 1', bersaglio: { nome: 'Nakanohara', livello: null, formaDemoniaca: 'Obariyon', debolezze: ['Tuono'], resistenze: [], vulnerabileConfusione: true }, areaNome, areaOrdine: 1, ricompense: ['485 PE'], confidente: null, note: '', fonte: 'https://www.allgamestaff.it/x', stato: null, ...extra });
const dati: RichiesteDto = {
  dedali: [{ chiave: 'mementos-01-qimranut', nome: 'Dedalo di Qimranut', ordine: 0, totale: 1, completate: 0 }, { chiave: 'mementos-02-aiyatsbus', nome: 'Dedalo di Aiyatsbus', ordine: 1, totale: 1, completate: 0 }],
  richieste: [ric('a', 'Un ex piuttosto appiccicoso', 'mementos-01-qimranut', 'Dedalo di Qimranut'), ric('b', 'Bullismo sui bulli', 'mementos-02-aiyatsbus', 'Dedalo di Aiyatsbus', { confidente: { chiave: 'ryuji', nome: 'Ryuji', rango: 2 }, bersaglio: { nome: 'Kazuo', livello: 10, formaDemoniaca: 'Ippon-Datara', debolezze: ['Fuoco'], resistenze: [], vulnerabileConfusione: false } })],
  jose: { introduzione: 'Jose studia gli umani.', fiori: { descrizione: 'Valuta dei Mementos.' }, timbri: null, bossSegreto: null, scambi: [{ nome: 'Fiala', effetto: 'Vertigini', costo: 30, requisito: 'Aiyatsbus' }] }, completate: 0, totale: 2,
};

describe('RichiestePage', () => {
  it('mostra le Richieste, filtra per dedalo (nell’indirizzo), per testo e per stato, apre Jose e segna completata', async () => {
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova' } as PartitaDto });
    getRichieste.mockResolvedValue(dati);
    impostaStatoRichiesta.mockResolvedValue({ ...dati.richieste[0], stato: 'completata' });
    render(<MemoryRouter><RichiestePage /></MemoryRouter>);
    expect(await screen.findByText('Un ex piuttosto appiccicoso')).toBeInTheDocument();
    expect(getRichieste).toHaveBeenCalledWith(7);
    expect(screen.getByText(/rango 2/)).toBeInTheDocument();
    expect(screen.queryByText('fonte')).toBeNull();
    // Jose sta in un foglio suo
    expect(screen.queryByRole('heading', { name: 'Jose: fiori, timbri e scambi' })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Jose: fiori e scambi' }));
    expect(screen.getByRole('heading', { name: 'Jose: fiori, timbri e scambi' })).toBeInTheDocument();
    expect(screen.getByText('Fiala')).toBeInTheDocument();
    expect(screen.queryByText('Un ex piuttosto appiccicoso')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Le Richieste' }));
    expect(screen.getByText('Un ex piuttosto appiccicoso')).toBeInTheDocument();
    // il dedalo: i dedali nell'ordine di percorrenza, con i conteggi
    scegliVoce('Dedalo', /Dedalo di Aiyatsbus/);
    expect(screen.queryByText('Un ex piuttosto appiccicoso')).toBeNull();
    expect(screen.getByText('Bullismo sui bulli')).toBeInTheDocument();
    scegliVoce('Dedalo', 'Tutti i Dedali');
    // la ricerca trova per bersaglio e per forma demoniaca
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ippon' } });
    expect(screen.queryByText('Un ex piuttosto appiccicoso')).toBeNull();
    expect(screen.getByText('Bullismo sui bulli')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Azzera i filtri' }));
    // i comandi e il collegamento al Dedalo stanno sulla carta
    const carta = within(screen.getByText('Un ex piuttosto appiccicoso').closest('li')!);
    expect(carta.getByRole('link', { name: 'Apri il Dedalo' })).toHaveAttribute('href', '/guida/dungeon/mementos?area=mementos-01-qimranut');
    await act(async () => { fireEvent.click(carta.getByRole('button', { name: 'Completata' })); });
    expect(impostaStatoRichiesta).toHaveBeenCalledWith(7, 'a', 'completata');
    expect(await within(screen.getByText('Un ex piuttosto appiccicoso').closest('li')!).findByText('completata')).toBeInTheDocument();
    // il dettaglio del dedalo nel selettore segue la spunta
    fireEvent.click(screen.getByRole('combobox', { name: 'Dedalo' }));
    expect(screen.getByRole('button', { name: /Dedalo di Qimranut.*1 completate su 1/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('combobox', { name: 'Dedalo' }));
    // i due segmenti sono indipendenti
    fireEvent.click(screen.getByRole('radio', { name: 'Da completare' }));
    expect(screen.queryByText('Un ex piuttosto appiccicoso')).toBeNull();
    expect(screen.getByText('Bullismo sui bulli')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Non accettate' }));
    expect(screen.getByText('Bullismo sui bulli')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Accettate' }));
    expect(screen.getByText('Nessuna Richiesta con questi filtri.')).toBeInTheDocument();
  });

  it('con «?dedalo=» nell’indirizzo l’elenco è già filtrato', async () => {
    usePartitaStore.setState({ attiva: null });
    getRichieste.mockResolvedValue(dati);
    render(<MemoryRouter initialEntries={['/guida/richieste?dedalo=mementos-02-aiyatsbus']}><RichiestePage /></MemoryRouter>);
    expect(await screen.findByText('Bullismo sui bulli')).toBeInTheDocument();
    expect(screen.queryByText('Un ex piuttosto appiccicoso')).toBeNull();
    expect(screen.getByText(/1 richiesta in Dedalo di Aiyatsbus/)).toBeInTheDocument();
    // senza partita i segmenti di stato non ci sono
    expect(screen.queryByRole('radiogroup', { name: 'Accettazione' })).toBeNull();
  });
});
