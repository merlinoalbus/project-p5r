/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test EditorMappaPage — aggiunta di uno spillo con un tocco sulla mappa, proprietà e riferimento cercato, copia/incolla, mappa (Fase 13.3, 15.18)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EditorMappaPage } from './EditorMappaPage';
import type { MappaDto, MappaRiassuntoDto, SpilloDto } from '../types';

const api = vi.hoisted(() => ({
  getMappa: vi.fn(), getAlberoMappe: vi.fn(), creaSpillo: vi.fn(), aggiornaSpillo: vi.fn(), eliminaSpillo: vi.fn(), cercaRiferimenti: vi.fn(),
  aggiornaMappa: vi.fn(), creaMappa: vi.fn(), creaPassaggio: vi.fn(), eliminaMappa: vi.fn(), caricaImmagineMappa: vi.fn(), esportaMappe: vi.fn(), importaMappe: vi.fn(), scaricaPianta: vi.fn(), scaricaPiantaQuartiere: vi.fn(),
  esportaPacchettoRepository: vi.fn(), aggiungiImmagineSpillo: vi.fn(), aggiornaImmagineSpillo: vi.fn(), eliminaImmagineSpillo: vi.fn(),
  getConfidenti: vi.fn(), getQuartieri: vi.fn(), getRichieste: vi.fn(), getDungeons: vi.fn(),
}));
vi.mock('../services/api', () => api);

const riassunto = (extra: Partial<MappaRiassuntoDto> & { chiave: string; nome: string; tipo: MappaRiassuntoDto['tipo'] }): MappaRiassuntoDto => ({ genitore: null, ordine: 0, immagineUrl: null, asset: null, entita: null, origine: 'seed', numeroSpilli: 0, numeroFigli: 0, updatedAt: '', ...extra });
const albero: MappaRiassuntoDto[] = [riassunto({ chiave: 'tokyo', nome: 'Tokyo', tipo: 'citta' }), riassunto({ chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo' })];
const nota: SpilloDto = { id: 9, mappaChiave: 'citta-shibuya', tipo: 'nota', tipoNome: 'Nota', colore: '#eee', nome: 'Nota', descrizione: '', x: 50, y: 50, riferimento: null, collezionabile: false, ordine: 0, origine: 'utente', raccolto: false, dettaglio: null, condizioni: [], immagini: [], updatedAt: '' };
const base: MappaDto = { ...riassunto({ chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo', entita: { tipo: 'quartiere', chiave: 'shibuya' } }), larghezza: 1000, altezza: 500, note: '', genitoreNome: 'Tokyo', percorso: [{ chiave: 'tokyo', nome: 'Tokyo' }, { chiave: 'citta-shibuya', nome: 'Shibuya' }], figli: [], spilli: [] };

function monta() {
  render(
    <MemoryRouter initialEntries={['/guida/mappe/citta-shibuya/modifica']}>
      <Routes><Route path="/guida/mappe/:chiave/modifica" element={<EditorMappaPage />} /></Routes>
    </MemoryRouter>,
  );
}

describe('EditorMappaPage', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    sessionStorage.clear();
    api.getAlberoMappe.mockResolvedValue(albero);
    api.getMappa.mockResolvedValue(base);
    // elenchi della Guida per le condizioni di visibilità
    api.getConfidenti.mockResolvedValue([{ chiave: 'sojiro', nome: 'Sojiro Sakura' }, { chiave: 'ann', nome: 'Ann Takamaki' }]);
    api.getQuartieri.mockResolvedValue([{ chiave: 'akihabara', nome: 'Akihabara', sblocco: '31 agosto (evento di trama)' }, { chiave: 'ueno', nome: 'Ueno', sblocco: 'Confidente Emperor (Yusuke) Rango 3' }]);
    api.getRichieste.mockResolvedValue({ richieste: [{ chiave: 'zio-ingordo', nome: 'Lo zio ingordo' }], jose: null, completate: 0, totale: 1 });
    api.getDungeons.mockResolvedValue([{ chiave: 'kamoshida', nome: 'Palazzo di Kamoshida', tipo: 'palazzo', ordine: 1 }, { chiave: 'madarame', nome: 'Palazzo di Madarame', tipo: 'palazzo', ordine: 2 }]);
  });

  it('con lo strumento «Aggiungi» un tocco sulla mappa crea lo spillo del tipo scelto (coordinate in percentuale) e lo seleziona', async () => {
    api.creaSpillo.mockResolvedValue(nota);
    api.getMappa.mockResolvedValueOnce(base).mockResolvedValue({ ...base, spilli: [nota] });
    monta();
    expect(await screen.findByText('Modifica')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi/ }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Tipo del nuovo spillo' })).getByRole('button', { name: /Forziere/ }));
    const tela = screen.getByRole('application');
    fireEvent.pointerDown(tela, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(tela, { pointerId: 1, clientX: 0, clientY: 0 });
    await waitFor(() => expect(api.creaSpillo).toHaveBeenCalledWith('citta-shibuya', { tipo: 'forziere', nome: 'Forziere', x: 50, y: 50 }));
    // ricaricata la mappa, lo spillo creato è selezionato e le sue proprietà sono nel pannello
    expect(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' })).toBeInTheDocument();
  });

  it('le proprietà dello spillo si salvano con il riferimento scelto dalla ricerca; «Elimina» rimuove lo spillo', async () => {
    api.getMappa.mockResolvedValue({ ...base, spilli: [nota] });
    api.cercaRiferimenti.mockResolvedValue([{ tipo: 'negozio', chiave: 'untouchable', nome: 'Untouchable', dettaglio: 'armi' }]);
    api.aggiornaSpillo.mockResolvedValue({ ...nota, nome: 'Armeria', tipo: 'negozio' });
    api.eliminaSpillo.mockResolvedValue(undefined);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    fireEvent.change(form.getByLabelText('Nome'), { target: { value: 'Armeria' } });
    fireEvent.change(form.getByLabelText('Tipo'), { target: { value: 'negozio' } });
    fireEvent.change(form.getByLabelText('Tipo di entità da cercare'), { target: { value: 'negozio' } });
    fireEvent.change(form.getByLabelText('Testo da cercare'), { target: { value: 'untou' } });
    fireEvent.click(form.getByRole('button', { name: 'Cerca' }));
    await waitFor(() => expect(api.cercaRiferimenti).toHaveBeenCalledWith('negozio', 'untou'));
    fireEvent.click(await form.findByRole('button', { name: /Untouchable/ }));
    fireEvent.click(form.getByRole('button', { name: 'Salva spillo' }));
    await waitFor(() => expect(api.aggiornaSpillo).toHaveBeenCalledWith(9, { nome: 'Armeria', tipo: 'negozio', descrizione: '', collezionabile: false, riferimento: { tipo: 'negozio', chiave: 'untouchable' }, condizioni: [] }));
    const elimina = await screen.findByRole('button', { name: 'Elimina' });
    await waitFor(() => expect(elimina).not.toBeDisabled());
    fireEvent.click(elimina);
    await waitFor(() => expect(api.eliminaSpillo).toHaveBeenCalledWith(9));
  });

  it('«Copia» sullo spillo selezionato mette negli appunti tutti i campi tranne la posizione; con «Incolla» un tocco sulla mappa crea lo spillo identico nel nuovo punto', async () => {
    const negozio: SpilloDto = { ...nota, id: 12, tipo: 'negozio', tipoNome: 'Negozio', nome: 'Untouchable', descrizione: 'Armi e munizioni', riferimento: { tipo: 'negozio', chiave: 'untouchable' } };
    api.getMappa.mockResolvedValue({ ...base, spilli: [negozio] });
    api.creaSpillo.mockResolvedValue({ ...negozio, id: 13, x: 50, y: 50 });
    monta();
    // senza appunti «Incolla» è spento
    expect(await screen.findByRole('button', { name: /Incolla/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Negozio: Untouchable' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Untouchable' }));
    fireEvent.click(form.getByRole('button', { name: /Copia/ }));
    // la copia attiva subito lo strumento «Incolla» e gli appunti sopravvivono in sessione
    const incolla = screen.getByRole('button', { name: /Incolla/ });
    expect(incolla).not.toBeDisabled();
    expect(incolla).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(sessionStorage.getItem('p5r.editor.appunti-spillo') ?? 'null')).toEqual({ tipo: 'negozio', nome: 'Untouchable', descrizione: 'Armi e munizioni', collezionabile: false, riferimento: { tipo: 'negozio', chiave: 'untouchable' }, condizioni: [] });
    const tela = screen.getByRole('application');
    fireEvent.pointerDown(tela, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(tela, { pointerId: 1, clientX: 0, clientY: 0 });
    await waitFor(() => expect(api.creaSpillo).toHaveBeenCalledWith('citta-shibuya', { tipo: 'negozio', nome: 'Untouchable', descrizione: 'Armi e munizioni', collezionabile: false, riferimento: { tipo: 'negozio', chiave: 'untouchable' }, condizioni: [], x: 50, y: 50 }));
    // dopo l'incolla si torna a «Seleziona», gli appunti restano per altre copie
    await waitFor(() => expect(screen.getByRole('button', { name: /Seleziona/ })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByRole('button', { name: /Incolla/ })).not.toBeDisabled();
  });

  it('gli appunti salvati in sessione riattivano «Incolla» all\'apertura dell\'editor (copia da un\'altra mappa)', async () => {
    sessionStorage.setItem('p5r.editor.appunti-spillo', JSON.stringify({ tipo: 'forziere', nome: 'Scrigno', descrizione: '', collezionabile: true, riferimento: null }));
    monta();
    const incolla = await screen.findByRole('button', { name: /Incolla/ });
    expect(incolla).not.toBeDisabled();
    expect(incolla).toHaveTextContent('«Scrigno»');
  });

  it('le condizioni di visibilità si aggiungono da selettori (solo tipi calcolabili), si tolgono e si salvano con lo spillo', async () => {
    api.getMappa.mockResolvedValue({ ...base, spilli: [nota] });
    api.aggiornaSpillo.mockResolvedValue(nota);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    expect(form.getByText('Nessuna condizione: lo spillo è sempre visibile.')).toBeInTheDocument();
    const scelta = form.getByLabelText('Nuova condizione') as HTMLSelectElement;
    expect([...scelta.options].map((o) => o.value)).toEqual(['data', 'intervallo', 'palazzo', 'dote', 'confidente', 'richiesta', 'piove', 'non-piove', 'fascia-giorno', 'fascia-sera', 'giorno-settimana', 'stagione', 'quartiere']);
    // Palazzo scelto dall'elenco della Guida
    fireEvent.change(scelta, { target: { value: 'palazzo' } });
    fireEvent.change(await form.findByLabelText('Palazzo'), { target: { value: 'madarame' } });
    fireEvent.click(form.getByRole('button', { name: /Aggiungi condizione/ }));
    const elenco = () => within(form.getByRole('list', { name: 'Condizioni dello spillo' }));
    expect(elenco().getByText('dopo il Palazzo di Madarame')).toBeInTheDocument();
    // Confidente con rango, nomi dall'elenco
    fireEvent.change(scelta, { target: { value: 'confidente' } });
    fireEvent.change(form.getByLabelText('Confidente'), { target: { value: 'sojiro' } });
    fireEvent.change(form.getByLabelText('Rango del Confidente'), { target: { value: '4' } });
    fireEvent.click(form.getByRole('button', { name: /Aggiungi condizione/ }));
    expect(elenco().getByText('Rango Confidente Sojiro Sakura 4')).toBeInTheDocument();
    // quartieri: solo quelli con una data di sblocco nella Guida (Ueno dipende da un Confidente: non calcolabile, non offerto)
    fireEvent.change(scelta, { target: { value: 'quartiere' } });
    expect([...(await form.findByLabelText('Quartiere') as HTMLSelectElement).options].map((o) => o.value)).toEqual(['akihabara']);
    fireEvent.change(scelta, { target: { value: 'confidente' } });
    // la stessa condizione non si aggiunge due volte
    expect(form.getByText('Condizione già presente.')).toBeInTheDocument();
    expect(form.getByRole('button', { name: /Aggiungi condizione/ })).toBeDisabled();
    fireEvent.click(form.getByRole('button', { name: 'Togli la condizione: dopo il Palazzo di Madarame' }));
    expect(elenco().queryByText('dopo il Palazzo di Madarame')).toBeNull();
    fireEvent.click(form.getByRole('button', { name: 'Salva spillo' }));
    await waitFor(() => expect(api.aggiornaSpillo).toHaveBeenCalledWith(9, { nome: 'Nota', tipo: 'nota', descrizione: '', collezionabile: false, riferimento: null, condizioni: [{ tipo: 'confidente', confidente: 'sojiro', rango: 4 }] }));
  });

  it('il costruttore rifiuta un periodo con la fine prima dell’inizio e offre solo i giorni del mese scelto', async () => {
    api.getMappa.mockResolvedValue({ ...base, spilli: [nota] });
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    fireEvent.change(form.getByLabelText('Nuova condizione'), { target: { value: 'intervallo' } });
    fireEvent.change(await form.findByLabelText('Dal: mese'), { target: { value: '08' } });
    fireEvent.change(form.getByLabelText('Al: mese'), { target: { value: '06' } });
    expect(form.getByText(/La data di fine precede quella di inizio/)).toBeInTheDocument();
    expect(form.getByRole('button', { name: /Aggiungi condizione/ })).toBeDisabled();
    // aprile ha 30 giorni: il selettore non offre il 31
    fireEvent.change(form.getByLabelText('Al: mese'), { target: { value: '04' } });
    expect([...(form.getByLabelText('Al: giorno') as HTMLSelectElement).options]).toHaveLength(30);
    fireEvent.change(form.getByLabelText('Dal: mese'), { target: { value: '04' } });
    expect(form.queryByText(/La data di fine precede quella di inizio/)).toBeNull();
    expect(form.getByRole('button', { name: /Aggiungi condizione/ })).not.toBeDisabled();
  });

  it('le proprietà della mappa si salvano (nome, genitore, asset); il genitore proposto esclude la mappa stessa', async () => {
    api.aggiornaMappa.mockResolvedValue(base);
    monta();
    const form = within(await screen.findByRole('region', { name: 'Proprietà della mappa' }));
    const genitore = form.getByLabelText('Mappa genitore') as HTMLSelectElement;
    expect([...genitore.options].map((o) => o.value)).toEqual(['', 'tokyo']);
    fireEvent.change(form.getByLabelText('Nome'), { target: { value: 'Shibuya centro' } });
    fireEvent.change(form.getByLabelText(/Asset del repository/), { target: { value: 'mappe/citta-shibuya' } });
    fireEvent.click(form.getByRole('button', { name: 'Salva mappa' }));
    await waitFor(() => expect(api.aggiornaMappa).toHaveBeenCalledWith('citta-shibuya', { nome: 'Shibuya centro', tipo: 'quartiere', genitore: 'tokyo', ordine: 0, asset: 'mappe/citta-shibuya', note: '' }));
    // quartiere collegato alla guida: è offerto «Scarica dalla guida»; l'esportazione del luogo produce lo ZIP per il repository
    expect(await screen.findByRole('button', { name: 'Scarica dalla guida' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Esporta questo luogo/ })).toBeInTheDocument();
  });

  it('albero (15.24): le figlie senza spillo che le raggiunge e il genitore senza ritorno hanno «Crea passaggio», che chiama l’API e seleziona lo spillo creato', async () => {
    const figliaRaggiunta = riassunto({ chiave: 'luogo-a', nome: 'Luogo A', tipo: 'luogo', genitore: 'citta-shibuya' });
    const figliaOrfana = riassunto({ chiave: 'luogo-b', nome: 'Luogo B', tipo: 'luogo', genitore: 'citta-shibuya' });
    const versoA: SpilloDto = { ...nota, id: 21, tipo: 'passaggio', tipoNome: 'Passaggio', nome: 'Luogo A', riferimento: { tipo: 'mappa', chiave: 'luogo-a' } };
    api.getMappa.mockResolvedValue({ ...base, figli: [figliaRaggiunta, figliaOrfana], spilli: [versoA] });
    const creato: SpilloDto = { ...versoA, id: 22, nome: 'Luogo B', riferimento: { tipo: 'mappa', chiave: 'luogo-b' } };
    api.creaPassaggio.mockResolvedValue(creato);
    monta();
    const albero = within(await screen.findByRole('region', { name: 'Albero delle mappe' }));
    // «Luogo A» è raggiunto da uno spillo: nessuna riga di avviso; «Luogo B» no
    expect(albero.getAllByText('Senza passaggio da questa mappa.')).toHaveLength(1);
    expect(albero.queryByRole('button', { name: 'Crea passaggio verso Luogo A' })).toBeNull();
    // nessuno spillo punta al genitore Tokyo: c'è il ritorno da creare
    expect(albero.getByText(/Nessun passaggio di ritorno verso «Tokyo»/)).toBeInTheDocument();
    api.getMappa.mockResolvedValue({ ...base, figli: [figliaRaggiunta, figliaOrfana], spilli: [versoA, creato] });
    fireEvent.click(albero.getByRole('button', { name: 'Crea passaggio verso Luogo B' }));
    await waitFor(() => expect(api.creaPassaggio).toHaveBeenCalledWith('citta-shibuya', 'luogo-b'));
    // lo spillo creato è selezionato nel pannello e la riga di avviso di «Luogo B» sparisce
    expect(await screen.findByRole('region', { name: 'Proprietà dello spillo: Luogo B' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Senza passaggio da questa mappa.')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Crea passaggio di ritorno' }));
    await waitFor(() => expect(api.creaPassaggio).toHaveBeenLastCalledWith('citta-shibuya', 'tokyo'));
  });

  it('«Nuova mappa» (15.24): chiede il passaggio sul genitore (preselezionato) e il ritorno (a scelta) e li passa all’API', async () => {
    api.creaMappa.mockResolvedValue({ ...base, chiave: 'bar-nuovo', nome: 'Bar nuovo', genitore: 'citta-shibuya' });
    monta();
    fireEvent.click(await screen.findByRole('button', { name: /Nuova mappa/ }));
    const finestra = within(await screen.findByRole('dialog'));
    fireEvent.change(finestra.getByLabelText('Nome'), { target: { value: 'Bar nuovo' } });
    const passaggio = finestra.getByRole('checkbox', { name: /Crea il passaggio su «Shibuya»/ }) as HTMLInputElement;
    const ritorno = finestra.getByRole('checkbox', { name: /passaggio di ritorno verso «Shibuya»/ }) as HTMLInputElement;
    expect(passaggio.checked).toBe(true);
    expect(ritorno.checked).toBe(false);
    fireEvent.click(ritorno);
    fireEvent.click(finestra.getByRole('button', { name: 'Crea' }));
    await waitFor(() => expect(api.creaMappa).toHaveBeenCalledWith({ chiave: 'bar-nuovo', nome: 'Bar nuovo', tipo: 'luogo', genitore: 'citta-shibuya', ordine: 0, passaggio: true, ritorno: true }));
  });

  it('la palette di «Aggiungi» è a gruppi (Spostamenti, Città, Persone, Palazzi e Mementos, Altro) con i nuovi tipi e «Bevande» al posto di «Distributore»', async () => {
    monta();
    expect(await screen.findByText('Modifica')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi/ }));
    const palette = within(screen.getByRole('group', { name: 'Tipo del nuovo spillo' }));
    for (const g of ['Spostamenti', 'Città', 'Persone', 'Palazzi e Mementos', 'Altro']) expect(palette.getByText(g)).toBeInTheDocument();
    expect(palette.getAllByRole('button')).toHaveLength(34);
    for (const nome of ['Bevande', 'Sigarette', 'Cercalavoro', 'Lavoro part-time', 'Bagno pubblico', 'Timbro dei Mementos', 'Punto del rampino', 'Porta chiusa']) expect(palette.getByRole('button', { name: nome })).toBeInTheDocument();
    expect(palette.queryByRole('button', { name: 'Distributore' })).toBeNull();
  });
});
