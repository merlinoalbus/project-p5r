/** @vitest-environment jsdom */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LibriPage } from './LibriPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { LibriDto, LibroDto, PartitaDto } from '../types';

const { getLibri, impostaProgressoLibro } = vi.hoisted(() => ({ getLibri: vi.fn(), impostaProgressoLibro: vi.fn() }));
vi.mock('../services/api', () => ({ getLibri, impostaProgressoLibro }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../components/mappe/DoveSiTrova', () => ({ DoveSiTrova: ({ tipo, chiave }: { tipo: string; chiave: string }) => <div>Dove: {tipo}/{chiave}</div> }));

const base: LibroDto = {
  chiave: 'prova', nome: 'Libro di prova', nomeIt: null, dove: 'Libreria Taiheido', prezzo: 700,
  disponibileDal: '18 aprile', dote: 'conoscenza', note: 3, sblocca: null, sbloccaLuogo: null, sbloccaLuogoNome: null, sessioni: 2,
  dettagli: null, effetti: [{ effetto: { famiglia: 'dote', dote: 'conoscenza', note: 3 }, testo: 'Conoscenza ♪♪♪' }], effettiTesto: ['Conoscenza ♪♪♪'],
  negozi: [{ articolo: 'libreria-taiheido/prova', negozio: 'libreria-taiheido', negozioNome: 'Libreria Taiheido', prezzo: 700 }],
  fonte: 'https://www.allgamestaff.it/persona-5-royal/libri/', verificato: true,
  posizioni: [{ tipo: 'negozio', chiave: 'libreria-taiheido', etichetta: 'Libreria Taiheido' }],
  totaleSessioni: 2, progresso: 0, fatto: false, condizioni: null, disponibilita: null,
};
const dto = (...libri: LibroDto[]): LibriDto => ({ libri, completati: libri.filter((l) => l.fatto).length, sessioniFatte: libri.reduce((n, l) => n + l.progresso, 0), sessioniTotali: 2 * libri.length, letturaRapida: false });

describe('LibriPage', () => {
  beforeEach(() => { vi.clearAllMocks(); usePartitaStore.setState({ attiva: { id: 7, nome: 'Royal' } as PartitaDto }); });

  it('serializza pressioni rapide e conserva nel refresh lo stato finale più recente', async () => {
    let persistito = 0;
    getLibri.mockImplementation(async () => dto({ ...base, progresso: persistito, fatto: persistito === 2 }));
    let risolviPrima!: (x: LibroDto) => void;
    let risolviSeconda!: (x: LibroDto) => void;
    impostaProgressoLibro
      .mockImplementationOnce((_id: number, _chiave: string, valore: number) => new Promise<LibroDto>((resolve) => { risolviPrima = (x) => { persistito = valore; resolve(x); }; }))
      .mockImplementationOnce((_id: number, _chiave: string, valore: number) => new Promise<LibroDto>((resolve) => { risolviSeconda = (x) => { persistito = valore; resolve(x); }; }));

    const vista = render(<MemoryRouter><LibriPage /></MemoryRouter>);
    expect(await screen.findByText('Libro di prova')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una sessione a Libro di prova' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una sessione a Libro di prova' }));
    expect(impostaProgressoLibro).toHaveBeenCalledTimes(1);

    await act(async () => risolviPrima({ ...base, progresso: 1 }));
    await waitFor(() => expect(impostaProgressoLibro).toHaveBeenCalledTimes(2));
    await act(async () => risolviSeconda({ ...base, progresso: 2, fatto: true }));
    fireEvent.click(await screen.findByRole('button', { name: /Mostra i completati/ }));
    expect(screen.getByText('Completato')).toBeInTheDocument();
    expect(screen.getByText('2 di 2 sessioni')).toBeInTheDocument();

    vista.unmount();
    render(<MemoryRouter><LibriPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Mostra i completati/ }));
    expect(screen.getByText('2 di 2 sessioni')).toBeInTheDocument();
    expect(persistito).toBe(2);
  });

  /** «Dove» sono i negozi collegati (col prezzo) e «Che cosa fa» gli effetti dichiarati; la fonte non c'è più. */
  it('mostra i negozi collegati come collegamenti con il prezzo e gli effetti dichiarati', async () => {
    usePartitaStore.setState({ attiva: null });
    getLibri.mockResolvedValue(dto(base));
    render(<MemoryRouter><LibriPage /></MemoryRouter>);
    expect(await screen.findByText('Libro di prova')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Libreria Taiheido · 700 ¥' })).toHaveAttribute('href', '/guida/negozi/libreria-taiheido');
    expect(screen.getByText('Conoscenza ♪♪♪')).toBeInTheDocument();
    expect(screen.queryByText('fonte')).toBeNull();
    // senza partita non c'è il «+», ma la posizione si guarda
    expect(screen.queryByRole('button', { name: /Aggiungi una sessione/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione' }));
    expect(await screen.findByText('Dove: negozio/libreria-taiheido')).toBeInTheDocument();
    expect(screen.getAllByText(/Dove:/)).toHaveLength(1);
  });

  /** Un libro non ancora disponibile nella partita non si segna: il «+» resta spento e il motivo sta sotto. */
  it('con il libro bloccato il «+» resta spento e dice perché', async () => {
    getLibri.mockResolvedValue(dto({ ...base, disponibilita: { stato: 'bloccato', requisiti: [{ indice: 0, tipo: 'data', stato: 'rosso', testo: 'dal 18 aprile', dettaglio: 'oggi è il 12 aprile', manuale: false, confermato: false }] } }));
    render(<MemoryRouter><LibriPage /></MemoryRouter>);
    expect(await screen.findByText('Libro di prova')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aggiungi una sessione a Libro di prova' })).toBeDisabled();
    expect(screen.getByText(/Non ancora leggibile/)).toHaveTextContent('Non ancora leggibile: oggi è il 12 aprile');
  });

  it('filtra per Dote dagli effetti dichiarati e per stato con i segmenti', async () => {
    getLibri.mockResolvedValue(dto(base, { ...base, chiave: 'altro', nome: 'Altro libro', effetti: [{ effetto: { famiglia: 'dote', dote: 'coraggio', note: 1 }, testo: 'Coraggio ♪' }], effettiTesto: ['Coraggio ♪'], progresso: 1 }));
    render(<MemoryRouter><LibriPage /></MemoryRouter>);
    expect(await screen.findByText('Altro libro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'In corso' }));
    expect(screen.queryByText('Libro di prova')).toBeNull();
    expect(screen.getByText('Altro libro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Tutti' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Dote' }));
    fireEvent.click(screen.getByRole('button', { name: 'Conoscenza' }));
    expect(screen.getByText('Libro di prova')).toBeInTheDocument();
    expect(screen.queryByText('Altro libro')).toBeNull();
  });

  it('gestisce senza invenzioni libri con zero o più provenienze', async () => {
    usePartitaStore.setState({ attiva: null });
    getLibri.mockResolvedValue(dto({ ...base, posizioni: [], negozi: [] }));
    const vista = render(<MemoryRouter><LibriPage /></MemoryRouter>);
    await screen.findByText('Libro di prova');
    // senza negozi né posizioni resta il testo della guida
    expect(screen.getByText('Libreria Taiheido')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione' }));
    expect(screen.getByText('Posizione non disponibile')).toBeInTheDocument();
    vista.unmount();

    getLibri.mockResolvedValue(dto({ ...base, posizioni: [
      { tipo: 'luogo', chiave: 'yongen-jaya/leblanc', etichetta: 'Leblanc' },
      { tipo: 'negozio', chiave: 'libreria-taiheido', etichetta: 'Taiheido' },
    ] }));
    render(<MemoryRouter><LibriPage /></MemoryRouter>);
    await screen.findByText('Libro di prova');
    fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione' }));
    expect(screen.getByRole('button', { name: 'Leblanc' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Taiheido' }));
    expect(screen.getByText('Dove: negozio/libreria-taiheido')).toBeInTheDocument();
  });
});
