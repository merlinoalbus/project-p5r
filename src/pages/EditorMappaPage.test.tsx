/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test EditorMappaPage — aggiunta di uno spillo con un tocco sulla mappa, proprietà e riferimento cercato, copia/incolla, mappa (Fase 13.3, 15.18)
// ============================================================

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { scegliVoce, valoreSelettore, vociSelettore } from '../../test/selettore';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { EditorMappaPage } from './EditorMappaPage';
import type { MappaDto, MappaRiassuntoDto, PartitaDto, SpilloDto } from '../types';
import { usePartitaStore } from '../stores/partitaStore';
import { useNotificationStore } from '../stores/notificationStore';
import { ApiError } from '../services/api/_helpers';

const api = vi.hoisted(() => ({
  risolviMappa: vi.fn(), getMappa: vi.fn(), getAlberoMappe: vi.fn(), creaSpillo: vi.fn(), aggiornaSpillo: vi.fn(), eliminaSpillo: vi.fn(), cercaRiferimenti: vi.fn(),
  aggiornaMappa: vi.fn(), creaMappa: vi.fn(), creaPassaggio: vi.fn(), eliminaMappa: vi.fn(), caricaImmagineMappa: vi.fn(), esportaMappe: vi.fn(), importaMappe: vi.fn(), scaricaPiantaQuartiere: vi.fn(),
aggiungiImmagineSpillo: vi.fn(), aggiornaImmagineSpillo: vi.fn(), eliminaImmagineSpillo: vi.fn(),
  getConfidenti: vi.fn(), getQuartieri: vi.fn(), getRichieste: vi.fn(), getDungeons: vi.fn(),
  // le voci della guida di un pin (098): quelle collegabili e il collegamento (lo stesso della guida)
  getVociCollegabili: vi.fn(), collegaPinAlPunto: vi.fn(),
  // i pezzi della planimetria (102) e le loro copie (103)
  creaPezzoMappa: vi.fn(), eliminaPezzoMappa: vi.fn(), creaCopiaPezzoMappa: vi.fn(), aggiornaCopiaPezzoMappa: vi.fn(), eliminaCopiaPezzoMappa: vi.fn(),
}));
vi.mock('../services/api', (vero) => moduloApi(vero, {
  ...api,
  getElenchiRegole: vi.fn().mockResolvedValue({ articoli: [], letture: [], arcani: [], persone: [], abilita: [], squadra: [], attivita: [], negozi: [], eventi: [], contatori: [] }),
  // i pin con uno stato di tutte le mappe, per la condizione «Pin di una mappa» (2026-10-03)
  getPinConStato: vi.fn().mockResolvedValue([
    { chiave: 'a'.repeat(32), nome: 'Leva del ponte', tipo: 'meccanismo', gruppo: 'Palazzo di Kamoshida › Torre', parola: 'azionato' },
    { chiave: 'b'.repeat(32), nome: 'Chiave della cella', tipo: 'oggetto-chiave', gruppo: 'Palazzo di Kamoshida › Prigione', parola: 'raccolto' },
    // un Confidente (stato suo) e una stanza sicura con la sua voce della guida (2026-10-03)
    { chiave: 'c'.repeat(32), nome: 'Sala giochi', tipo: 'confidente', gruppo: 'Tokyo › Akihabara', parola: 'incontrato' },
    { chiave: 'd'.repeat(32), nome: 'Stanza sicura del cortile', tipo: 'sicura', gruppo: 'Palazzo di Kamoshida › Cortile', parola: 'ottenuto' },
  ]),
  // le voci della guida dei Palazzi e dei Memento, per la condizione «Voce della guida» (2026-10-11)
  getVociCitabili: vi.fn().mockResolvedValue([
    { chiave: 'kamoshida-04/2', nome: 'Si apre la cucina', tipo: 'storia', gruppo: 'Palazzo di Kamoshida › 4. Sala da pranzo' },
    { chiave: 'kamoshida-06/1', nome: 'Leve delle sbarre', tipo: 'meccanismo', gruppo: 'Palazzo di Kamoshida › 6. Corridoio delle Sbarre' },
  ]),
}));

/** Il riassunto di una mappa senza genitore, spilli né figli, con chiave, nome e tipo (e il resto) presi da `extra`. */
const riassunto = (extra: Partial<MappaRiassuntoDto> & { chiave: string; nome: string; tipo: MappaRiassuntoDto['tipo'] }): MappaRiassuntoDto => ({ genitore: null, nomeRivisto: false, ordine: 0, immagineUrl: null, asset: null, radiceDi: null, versione: null, origine: 'seed', numeroSpilli: 0, numeroFigli: 0, updatedAt: '', area: null, casa: `/guida/mappe/${encodeURIComponent(extra.chiave)}`, ...extra });
const albero: MappaRiassuntoDto[] = [riassunto({ chiave: 'tokyo', nome: 'Tokyo', tipo: 'citta' }), riassunto({ chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo' })];
const nota: SpilloDto = { id: 9, mappaChiave: 'citta-shibuya', tipo: 'nota', tipoNome: 'Nota', colore: '#eee', nome: 'Nota', descrizione: '', x: 50, y: 50, riferimento: null, collezionabile: false, ordine: 0, origine: 'utente', raccolto: false, dettaglio: null, voci: [], condizioni: [], immagini: [], updatedAt: '' };
const base: MappaDto = { ...riassunto({ chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo', radiceDi: { tipo: 'quartiere', chiave: 'shibuya' } }), larghezza: 1000, altezza: 500, note: '', genitoreNome: 'Tokyo', percorso: [{ chiave: 'tokyo', nome: 'Tokyo' }, { chiave: 'citta-shibuya', nome: 'Shibuya' }], figli: [], spilli: [], arrivi: [], pezzi: [] };
/** Monta l'editor sulla mappa di Shibuya (`/guida/mappe/citta-shibuya/modifica`), o all'indirizzo dato. */
function monta(indirizzo = '/guida/mappe/citta-shibuya/modifica') {
  render(
    <MemoryRouter initialEntries={[indirizzo]}>
      <Routes><Route path="/guida/mappe/:chiave/modifica" element={<EditorMappaPage />} /></Routes>
    </MemoryRouter>,
  );
}

describe('EditorMappaPage', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    sessionStorage.clear();
    api.risolviMappa.mockImplementation(async (mappa: string) => ({ tipo: 'mappa', mappa }));
    api.getAlberoMappe.mockResolvedValue(albero);
    api.getMappa.mockResolvedValue(base);
    // elenchi della Guida per le condizioni di visibilità
    api.getConfidenti.mockResolvedValue([{ chiave: 'sojiro', nome: 'Sojiro Sakura' }, { chiave: 'ann', nome: 'Ann Takamaki' }]);
    api.getQuartieri.mockResolvedValue([{ chiave: 'akihabara', sbloccoData:'08-31', nome: 'Akihabara', sblocco: '31 agosto (evento di trama)' }, { chiave: 'ueno', nome: 'Ueno', sblocco: 'Confidente Emperor (Yusuke) Rango 3' }]);
    api.getRichieste.mockResolvedValue({ richieste: [{ chiave: 'zio-ingordo', nome: 'Lo zio ingordo' }], jose: null, completate: 0, totale: 1 });
    api.getDungeons.mockResolvedValue([{ chiave: 'kamoshida', nome: 'Palazzo di Kamoshida', tipo: 'palazzo', ordine: 1 }, { chiave: 'madarame', nome: 'Palazzo di Madarame', tipo: 'palazzo', ordine: 2 }]);
    // gli elenchi chiusi di negozi, attività, luoghi e Confidenti per gli spilli di città
    api.cercaRiferimenti.mockResolvedValue([]);
    // di serie nessuna voce collegabile: un pin fuori dai Palazzi non mostra le «Voci della guida»
    api.getVociCollegabili.mockResolvedValue([]);
  });

  it('con lo strumento «Aggiungi» un tocco sulla mappa crea lo spillo del tipo scelto (coordinate in percentuale) e lo seleziona', async () => {
    api.creaSpillo.mockResolvedValue(nota);
    api.getMappa.mockResolvedValueOnce(base).mockResolvedValue({ ...base, spilli: [nota] });
    monta();
    expect(await screen.findByText('Modifica')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi/ }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Tipo del nuovo spillo' })).getByRole('button', { name: 'Forziere' }));
    const tela = screen.getByRole('application');
    fireEvent.pointerDown(tela, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(tela, { pointerId: 1, clientX: 0, clientY: 0 });
    await waitFor(() => expect(api.creaSpillo).toHaveBeenCalledWith('citta-shibuya', { tipo: 'forziere', nome: 'Forziere', x: 50, y: 50 }));
    // ricaricata la mappa, lo spillo creato è selezionato e le sue proprietà sono nel pannello
    expect(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' })).toBeInTheDocument();
  });

  it('uno spillo di città si collega a un negozio scelto da un elenco con ricerca, senza condizioni; «Elimina» rimuove lo spillo', async () => {
    api.getMappa.mockResolvedValue({ ...base, spilli: [nota] });
    api.cercaRiferimenti.mockResolvedValue([{ tipo: 'negozio', chiave: 'untouchable', nome: 'Untouchable', dettaglio: 'armi' }, { tipo: 'negozio', chiave: 'leblanc', nome: 'Leblanc', dettaglio: 'cibo' }]);
    api.aggiornaSpillo.mockResolvedValue({ ...nota, nome: 'Armeria', tipo: 'negozio' });
    api.eliminaSpillo.mockResolvedValue(undefined);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    fireEvent.change(form.getByLabelText('Nome'), { target: { value: 'Armeria' } });
    scegliVoce('Tipo', 'Negozio');
    // categoria «città»: si sceglie che cosa collegare e la voce da un elenco chiuso con ricerca; niente condizioni
    expect(form.getByRole('button', { name: 'Negozio', pressed: true })).toBeInTheDocument();
    await waitFor(() => expect(api.cercaRiferimenti).toHaveBeenCalledWith('negozio', '', 100));
    expect(form.queryByRole('button', { name: /^Condizioni/ })).toBeNull();
    fireEvent.click(await form.findByRole('combobox', { name: 'Elenco: Negozio' }));
    fireEvent.change(form.getByLabelText('Cerca Elenco: Negozio'), { target: { value: 'untou' } });
    expect(within(form.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Untouchablearmi']);
    fireEvent.click(form.getByRole('option', { name: /Untouchable/ }));
    fireEvent.click(form.getByRole('button', { name: 'Salva spillo' }));
    await waitFor(() => expect(api.aggiornaSpillo).toHaveBeenCalledWith(9, { nome: 'Armeria', tipo: 'negozio', descrizione: '', riferimento: { tipo: 'negozio', chiave: 'untouchable' }, condizioni: [], destinazione: null }));
    const elimina = await screen.findByRole('button', { name: 'Elimina' });
    await waitFor(() => expect(elimina).not.toBeDisabled());
    fireEvent.click(elimina);
    await waitFor(() => expect(api.eliminaSpillo).toHaveBeenCalledWith(9));
  });

  it('la descrizione del tipo dice se il pin ha uno stato nella partita (2026-10-03): la nota è un segno e basta, il meccanismo si aziona, il boss si sconfigge', async () => {
    api.getMappa.mockResolvedValue({ ...base, spilli: [nota] });
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    expect(form.getByText('Un segno sulla mappa con nome e descrizione, e basta.')).toBeInTheDocument();
    scegliVoce('Tipo', 'Meccanismo');
    expect(form.getByText('Un segno sulla mappa con uno stato da segnare nella partita («azionato»); non conta nel completamento della mappa.')).toBeInTheDocument();
    expect(form.queryByText('Un segno sulla mappa con nome e descrizione, e basta.')).toBeNull();
    scegliVoce('Tipo', 'Boss');
    expect(form.getByText('Si segna nella partita («sconfitto»); non porta da nessuna parte.')).toBeInTheDocument();
    // un pin di città con uno stato suo: il Confidente si «incontra»; un negozio no
    scegliVoce('Tipo', 'Confidente');
    expect(form.getByText('Ha uno stato da segnare nella partita («incontrato»); non conta nel completamento della mappa.')).toBeInTheDocument();
    scegliVoce('Tipo', 'Negozio');
    expect(form.queryByText(/Ha uno stato da segnare nella partita/)).toBeNull();
  });

  it('«Copia» sullo spillo selezionato mette negli appunti tutti i campi tranne la posizione; con «Incolla» un tocco sulla mappa crea lo spillo identico nel nuovo punto', async () => {
    const negozio: SpilloDto = { ...nota, soloPosizione: true, id: 12, tipo: 'negozio', tipoNome: 'Negozio', nome: 'Untouchable', descrizione: 'Armi e munizioni', riferimento: { tipo: 'negozio', chiave: 'untouchable' } };
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
    expect(JSON.parse(sessionStorage.getItem('p5r.editor.appunti-spillo') ?? 'null')).toEqual({ tipo: 'negozio', nome: 'Untouchable', descrizione: 'Armi e munizioni', riferimento: { tipo: 'negozio', chiave: 'untouchable' }, condizioni: [], destinazione: null });
    const tela = screen.getByRole('application');
    fireEvent.pointerDown(tela, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(tela, { pointerId: 1, clientX: 0, clientY: 0 });
    await waitFor(() => expect(api.creaSpillo).toHaveBeenCalledWith('citta-shibuya', { tipo: 'negozio', nome: 'Untouchable', descrizione: 'Armi e munizioni', riferimento: { tipo: 'negozio', chiave: 'untouchable' }, condizioni: [], destinazione: null, x: 50, y: 50 }));
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

  it('il pin del Confidente, unico fra quelli di città, ha le condizioni (2026-10-04); tornando a un negozio se ne vanno', async () => {
    api.getMappa.mockResolvedValue({ ...base, spilli: [nota] });
    api.cercaRiferimenti.mockResolvedValue([{ tipo: 'confidente', chiave: 'yusuke', nome: 'Yusuke Kitagawa', dettaglio: 'Imperatore' }]);
    api.aggiornaSpillo.mockResolvedValue(nota);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    scegliVoce('Tipo', 'Confidente');
    // città, ma con le condizioni: se ne aggiunge una (la riga nasce «dal 18 aprile»)
    fireEvent.click(form.getByRole('button', { name: /^Condizioni/ }));
    fireEvent.click(await form.findByRole('button', { name: 'condizione' }));
    expect(form.getByRole('group', { name: 'Condizione: dal 18 aprile' })).toBeInTheDocument();
    fireEvent.click(form.getByRole('button', { name: 'Salva spillo' }));
    await waitFor(() => expect(api.aggiornaSpillo).toHaveBeenCalledWith(9, expect.objectContaining({ tipo: 'confidente', condizioni: [expect.objectContaining({ tipo: 'data' })] })));
    // un negozio resta senza: la sezione sparisce (che non si salvino lo dice il test qui sotto)
    scegliVoce('Tipo', 'Negozio');
    expect(form.queryByRole('button', { name: /^Condizioni/ })).toBeNull();
  });

  it('da Confidente con una condizione a Negozio: la condizione non si salva', async () => {
    api.getMappa.mockResolvedValue({ ...base, spilli: [nota] });
    api.cercaRiferimenti.mockResolvedValue([]);
    api.aggiornaSpillo.mockResolvedValue(nota);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    scegliVoce('Tipo', 'Confidente');
    fireEvent.click(form.getByRole('button', { name: /^Condizioni/ }));
    fireEvent.click(await form.findByRole('button', { name: 'condizione' }));
    expect(form.getByRole('group', { name: 'Condizione: dal 18 aprile' })).toBeInTheDocument();
    scegliVoce('Tipo', 'Negozio');
    fireEvent.click(form.getByRole('button', { name: 'Salva spillo' }));
    await waitFor(() => expect(api.aggiornaSpillo).toHaveBeenCalledWith(9, expect.objectContaining({ tipo: 'negozio', condizioni: [] })));
  });

  it('le condizioni sono stati: una riga nasce già valida, si cambia sul posto con elenchi chiusi, si toglie e si salva con lo spillo', async () => {
    api.getMappa.mockResolvedValue({ ...base, spilli: [nota] });
    api.aggiornaSpillo.mockResolvedValue(nota);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    expect(await form.findByText('nessuna: sempre disponibile')).toBeInTheDocument();
    fireEvent.click(form.getByRole('button', { name: /^Condizioni/ }));
    fireEvent.click(await form.findByRole('button', { name: 'condizione' }));
    // la riga nuova è «Data di gioco dal 18 aprile»: valida da subito
    expect(form.getByRole('group', { name: 'Condizione: dal 18 aprile' })).toBeInTheDocument();
    // lo stato si sceglie da un elenco con ricerca: scrivere filtra, il valore è sempre una voce
    fireEvent.click(form.getByRole('combobox', { name: 'Stato' }));
    fireEvent.change(form.getByLabelText('Cerca Stato'), { target: { value: 'palaz' } });
    fireEvent.click(form.getByRole('option', { name: 'Palazzo' }));
    expect(form.getByRole('group', { name: 'Condizione: dopo il Palazzo di Kamoshida' })).toBeInTheDocument();
    // il Palazzo viene dall'elenco della Guida
    fireEvent.click(form.getByRole('combobox', { name: 'Palazzo' }));
    fireEvent.click(form.getByRole('option', { name: 'Palazzo di Madarame' }));
    expect(form.getByRole('group', { name: 'Condizione: dopo il Palazzo di Madarame' })).toBeInTheDocument();
    // NON nega la riga; un gruppo ALMENO UNA si annida con una riga già dentro
    fireEvent.click(form.getByRole('button', { name: 'NON' }));
    expect(form.getByRole('group', { name: 'Condizione: non dopo il Palazzo di Madarame' })).toBeInTheDocument();
    fireEvent.click(form.getByRole('button', { name: 'gruppo ALMENO UNA' }));
    const gruppo = within(form.getByRole('group', { name: 'Gruppo ALMENO UNA' }));
    expect(gruppo.getByRole('group', { name: 'Condizione: dal 18 aprile' })).toBeInTheDocument();
    // i quartieri offerti sono solo quelli con una data di sblocco nella Guida (Ueno dipende da un Confidente)
    fireEvent.click(gruppo.getByRole('combobox', { name: 'Stato' }));
    fireEvent.click(gruppo.getByRole('option', { name: 'Quartiere' }));
    fireEvent.click(gruppo.getByRole('combobox', { name: 'Quartiere' }));
    expect(gruppo.getAllByRole('option').map((o) => o.textContent)).toEqual(['Akihabaradal 31 agosto']);
    fireEvent.click(gruppo.getByRole('option', { name: /Akihabara/ }));
    fireEvent.click(form.getByRole('button', { name: 'Togli il gruppo' }));
    expect(form.queryByRole('group', { name: 'Gruppo ALMENO UNA' })).toBeNull();
    fireEvent.click(form.getByRole('button', { name: 'Salva spillo' }));
    await waitFor(() => expect(api.aggiornaSpillo).toHaveBeenCalledWith(9, { nome: 'Nota', tipo: 'nota', descrizione: '', riferimento: null, condizioni: [{ tipo: 'non', condizione: { tipo: 'palazzo', dungeon: 'madarame' } }], destinazione: null }));
  });

  it('la condizione «Pin di una mappa» (2026-10-03): si cerca il pin fra quelli con uno stato, «segnato» o «non segnato», è di presenza e si salva con l’uid', async () => {
    api.getMappa.mockResolvedValue({ ...base, spilli: [nota] });
    api.aggiornaSpillo.mockResolvedValue(nota);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    fireEvent.click(await form.findByRole('button', { name: /^Condizioni/ }));
    fireEvent.click(await form.findByRole('button', { name: 'condizione' }));
    fireEvent.click(form.getByRole('combobox', { name: 'Stato' }));
    fireEvent.click(form.getByRole('option', { name: 'Pin di una mappa' }));
    // il primo pin dell'elenco, «segnato»; la parola è quella del suo tipo
    expect(form.getByRole('group', { name: 'Condizione: Leva del ponte (Palazzo di Kamoshida › Torre): azionato' })).toBeInTheDocument();
    // si cerca fra i pin di tutte le mappe
    fireEvent.click(form.getByRole('combobox', { name: 'Pin' }));
    fireEvent.change(form.getByLabelText('Cerca Pin'), { target: { value: 'cella' } });
    fireEvent.click(form.getByRole('option', { name: /Chiave della cella/ }));
    expect(form.getByRole('group', { name: 'Condizione: Chiave della cella (Palazzo di Kamoshida › Prigione): raccolto' })).toBeInTheDocument();
    fireEvent.click(form.getByRole('combobox', { name: (n) => n === 'Operatore' || n.startsWith('Operatore: ') }));
    fireEvent.click(form.getByRole('option', { name: 'non segnato' }));
    const riga = form.getByRole('group', { name: 'Condizione: Chiave della cella (Palazzo di Kamoshida › Prigione): non raccolto' });
    // fa sparire il pin quando non vale
    expect(within(riga).getByLabelText(/Condizione di presenza/)).toBeInTheDocument();
    fireEvent.click(form.getByRole('button', { name: 'Salva spillo' }));
    await waitFor(() => expect(api.aggiornaSpillo).toHaveBeenCalledWith(9, expect.objectContaining({ condizioni: [{ tipo: 'spillo', spillo: 'b'.repeat(32), segnato: false }] })));
  });

  it('la condizione «Voce della guida» (2026-10-11): si cerca la voce fra quelle dei Palazzi e dei Memento, «segnata» o «non segnata», è di presenza e si salva con la chiave', async () => {
    api.getMappa.mockResolvedValue({ ...base, spilli: [nota] });
    api.aggiornaSpillo.mockResolvedValue(nota);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    fireEvent.click(await form.findByRole('button', { name: /^Condizioni/ }));
    fireEvent.click(await form.findByRole('button', { name: 'condizione' }));
    fireEvent.click(form.getByRole('combobox', { name: 'Stato' }));
    fireEvent.click(form.getByRole('option', { name: 'Voce della guida' }));
    // la prima voce dell'elenco, «segnata», col suo posto
    expect(form.getByRole('group', { name: 'Condizione: Voce «Si apre la cucina» (Palazzo di Kamoshida › 4. Sala da pranzo): segnata' })).toBeInTheDocument();
    // si cerca fra le voci dei Palazzi e dei Memento, col tipo della voce accanto
    fireEvent.click(form.getByRole('combobox', { name: 'Voce' }));
    fireEvent.change(form.getByLabelText('Cerca Voce'), { target: { value: 'sbarre' } });
    expect(form.getByRole('option', { name: /Leve delle sbarre.*Meccanismo/ })).toBeInTheDocument();
    fireEvent.click(form.getByRole('option', { name: /Leve delle sbarre/ }));
    fireEvent.click(form.getByRole('combobox', { name: (n) => n === 'Operatore' || n.startsWith('Operatore: ') }));
    fireEvent.click(form.getByRole('option', { name: 'non segnata' }));
    const riga = form.getByRole('group', { name: 'Condizione: Voce «Leve delle sbarre» (Palazzo di Kamoshida › 6. Corridoio delle Sbarre): non segnata' });
    // fa sparire il pin quando non vale
    expect(within(riga).getByLabelText(/Condizione di presenza/)).toBeInTheDocument();
    fireEvent.click(form.getByRole('button', { name: 'Salva spillo' }));
    await waitFor(() => expect(api.aggiornaSpillo).toHaveBeenCalledWith(9, expect.objectContaining({ condizioni: [{ tipo: 'voce-guida', voce: 'kamoshida-06/1', segnata: false }] })));
  });

  it('fra i pin citabili non c’è quello che si sta modificando: un pin non dipende da se stesso', async () => {
    // la nota aperta è proprio la «Leva del ponte» dell'elenco (stesso uid)
    api.getMappa.mockResolvedValue({ ...base, spilli: [{ ...nota, uid: 'a'.repeat(32) }] });
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    fireEvent.click(await form.findByRole('button', { name: /^Condizioni/ }));
    fireEvent.click(await form.findByRole('button', { name: 'condizione' }));
    fireEvent.click(form.getByRole('combobox', { name: 'Stato' }));
    fireEvent.click(form.getByRole('option', { name: 'Pin di una mappa' }));
    // il primo pin offerto è l'altro
    expect(form.getByRole('group', { name: /^Condizione: Chiave della cella/ })).toBeInTheDocument();
    fireEvent.click(form.getByRole('combobox', { name: 'Pin' }));
    expect(form.queryByRole('option', { name: /Leva del ponte/ })).toBeNull();
    expect(form.getByRole('option', { name: /Chiave della cella/ })).toBeInTheDocument();
    // tutti i pin con uno stato, ciascuno con la sua parola: il Confidente «incontrato», la stanza sicura con la sua voce «ottenuto»
    expect(form.getByRole('option', { name: /Sala giochi/ })).toHaveTextContent('Confidente · incontrato');
    expect(form.getByRole('option', { name: /Stanza sicura del cortile/ })).toHaveTextContent('Stanza sicura · ottenuto');
  });

  it('un periodo resta sempre valido: la fine segue l’inizio, e i giorni offerti sono quelli del mese', async () => {
    api.getMappa.mockResolvedValue({ ...base, spilli: [{ ...nota, condizioni: [{ tipo: 'intervallo', dal: '04-18', al: '04-18', testo: 'solo il 18 aprile' }] }] });
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    expect(await form.findByRole('group', { name: 'Condizione: solo il 18 aprile' })).toBeInTheDocument();
    scegliVoce('Operatore', 'tra');
    scegliVoce('Dal: mese', 'agosto');
    // la fine (18 aprile) precederebbe l'inizio (18 agosto): si allinea, e un periodo di un giorno si legge «solo il»
    expect(form.getByRole('group', { name: 'Condizione: solo il 18 agosto' })).toBeInTheDocument();
    expect(valoreSelettore('Al: mese')).toBe('agosto');
    scegliVoce('Al: mese', 'aprile');
    expect(form.getByRole('group', { name: 'Condizione: solo il 18 aprile' })).toBeInTheDocument();
    // aprile ha 30 giorni: il selettore non offre il 31
    expect(vociSelettore('Al: giorno')).toHaveLength(30);
  });

  it('«Voci della guida» (098): «Aggiungi voce» collega una voce del Palazzo, «Scollega» la toglie; ogni gesto si salva e rilegge la mappa', async () => {
    /** Una voce «Storia» di Kamoshida non segnata, con chiave e nome dati. */
    const voce = (chiave: string, nome: string) => ({ chiave, tipo: 'storia', nome, descrizione: '', esauribile: false, dungeon: 'kamoshida', area: 'kamoshida-04', areaDedalo: null, stato: null });
    const pin: SpilloDto = { ...nota, id: 22, tipo: 'infiltrazione', tipoNome: 'Infiltrazione', nome: 'Punto di infiltrazione', voci: [voce('kamoshida-01/0', 'Infiltrati nel castello')] };
    api.getMappa.mockResolvedValue({ ...base, spilli: [pin] });
    api.getVociCollegabili.mockResolvedValue([{ chiave: 'kamoshida-04/2', nome: 'Ritorno nel castello', tipo: 'storia', area: 'kamoshida-04', areaNome: 'Sala da pranzo', enigma: null }]);
    api.collegaPinAlPunto.mockResolvedValue({});
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Infiltrazione: Punto di infiltrazione' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Punto di infiltrazione' }));
    expect(await form.findByRole('group', { name: 'Voci della guida (1)' })).toBeInTheDocument();
    expect(api.getVociCollegabili).toHaveBeenCalledWith(22);
    // una voce in più, scelta fra quelle collegabili (raggruppate per area)
    await waitFor(() => expect(vociSelettore('Aggiungi voce')).toContain('Ritorno nel castello'));
    scegliVoce('Aggiungi voce', 'Ritorno nel castello');
    await waitFor(() => expect(api.collegaPinAlPunto).toHaveBeenCalledWith('kamoshida-04/2', 22, true));
    await waitFor(() => expect(api.getMappa).toHaveBeenCalledTimes(2));
    // la mappa riletta porta le due voci; il messaggio dice che si segnano da sole
    api.getMappa.mockResolvedValue({ ...base, spilli: [{ ...pin, voci: [...pin.voci, voce('kamoshida-04/2', 'Ritorno nel castello')] }] });
    fireEvent.click(form.getByRole('button', { name: 'Scollega la voce Infiltrati nel castello' }));
    await waitFor(() => expect(api.collegaPinAlPunto).toHaveBeenCalledWith('kamoshida-01/0', 22, false));
    expect(await form.findByRole('group', { name: 'Voci della guida (2)' })).toBeInTheDocument();
    expect(form.getByText(/Ogni voce si segna da sola/)).toBeInTheDocument();
  });

  it('un pin senza voci e senza voci collegabili (fuori dai Palazzi) non mostra le «Voci della guida»', async () => {
    api.getMappa.mockResolvedValue({ ...base, spilli: [nota] });
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota: Nota' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' }));
    await waitFor(() => expect(api.getVociCollegabili).toHaveBeenCalledWith(nota.id));
    expect(form.queryByRole('group', { name: /Voci della guida/ })).toBeNull();
  });

  it('uno spostamento che è di una voce della Guida la mostra: la scheda non risulta modificata e il salvataggio non tocca la voce, che sta nel campo suo (094)', async () => {
    const scorciatoia: SpilloDto = { ...nota, id: 21, tipo: 'scorciatoia', tipoNome: 'Scorciatoia', nome: 'Condotto', voci: [{ chiave: 'kamoshida-04/5', tipo: 'scorciatoia', nome: 'Condotto', descrizione: '', esauribile: false, dungeon: 'kamoshida', area: 'kamoshida-04', areaDedalo: null, stato: null }] };
    api.getMappa.mockResolvedValue({ ...base, spilli: [scorciatoia] });
    api.aggiornaSpillo.mockResolvedValue(scorciatoia);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Scorciatoia: Condotto' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà dello spillo: Condotto' }));
    // le voci della guida del pin (098), con «Scollega»
    expect(within(form.getByRole('list', { name: 'Voci della guida del pin' })).getByText('Condotto')).toBeInTheDocument();
    expect(form.getByRole('button', { name: 'Scollega la voce Condotto' })).toBeInTheDocument();
    expect(form.getByRole('button', { name: 'Salva spillo' })).toBeDisabled();
    fireEvent.change(form.getByLabelText('Descrizione'), { target: { value: 'Passa dietro le cucine' } });
    fireEvent.click(form.getByRole('button', { name: 'Salva spillo' }));
    await waitFor(() => expect(api.aggiornaSpillo).toHaveBeenCalledWith(21, { nome: 'Condotto', tipo: 'scorciatoia', descrizione: 'Passa dietro le cucine', riferimento: null, condizioni: [], destinazione: null }));
  });

  it('con ?sezione=mappa l’editor si apre sulla sezione Mappa (dove si carica l’immagine); senza, sugli spilli', async () => {
    monta('/guida/mappe/citta-shibuya/modifica?sezione=mappa');
    expect(await screen.findByRole('button', { name: 'Mappa' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('region', { name: 'Proprietà della mappa' })).toBeInTheDocument();
    cleanup();
    monta('/guida/mappe/citta-shibuya/modifica?sezione=inventata');
    expect(await screen.findByRole('button', { name: 'Spilli' })).toHaveAttribute('aria-pressed', 'true');
  });

  // FUN2-8 (L2): nel mondo una planimetria sta in un'Area; spostarne una sciolta sotto un quartiere il server lo rifiuta (409
  // `usa-aggiungi-area`) col messaggio pronto: l'editor lo lascia scritto sopra le proprietà, con la strada per farlo bene
  it('FUN2-8: spostare una mappa sciolta sotto un quartiere mostra il messaggio del server con «Aggiungi area» e «Da collocare»', async () => {
    const magazzino: MappaDto = { ...base, ...riassunto({ chiave: 'magazzino', nome: 'Magazzino', tipo: 'luogo', origine: 'utente' }), genitoreNome: null, percorso: [{ chiave: 'magazzino', nome: 'Magazzino' }] };
    api.getAlberoMappe.mockResolvedValue([...albero.map((m) => m.chiave === 'citta-shibuya' ? { ...m, casa: '/guida/citta/shibuya' } : m), riassunto({ chiave: 'magazzino', nome: 'Magazzino', tipo: 'luogo', origine: 'utente' })]);
    api.getMappa.mockResolvedValue(magazzino);
    const testo = 'Nel mondo una planimetria sta in un’area: aggiungila con «Aggiungi area» nel quartiere (o «Aggiungi planimetria» in un’area), o collocala dall’elenco «Da collocare».';
    api.aggiornaMappa.mockRejectedValue(new ApiError(409, 'usa-aggiungi-area', testo));
    useNotificationStore.setState({ notifications: [] });
    monta('/guida/mappe/magazzino/modifica');
    fireEvent.click(await screen.findByRole('button', { name: 'Mappa' }));
    const form = within(await screen.findByRole('region', { name: 'Proprietà della mappa' }));
    scegliVoce('Mappa genitore', /^Shibuya/);
    fireEvent.click(form.getByRole('button', { name: 'Salva mappa' }));
    await waitFor(() => expect(api.aggiornaMappa).toHaveBeenCalledWith('magazzino', expect.objectContaining({ genitore: 'citta-shibuya' })));
    const avviso = within(await screen.findByRole('alert', { name: 'La mappa non si sposta lì' }));
    expect(avviso.getByText(testo)).toBeInTheDocument();
    expect(avviso.getByRole('link', { name: 'Aggiungi area / planimetria dalla pagina del quartiere' })).toHaveAttribute('href', '/guida/citta/shibuya');
    expect(avviso.getByRole('link', { name: 'Planimetrie da collocare' })).toHaveAttribute('href', '/guida/citta');
    // niente «Mappa salvata.» né un secondo avviso che sparisce
    expect(useNotificationStore.getState().notifications.map((n) => n.message)).not.toContain('Mappa salvata.');
    expect(useNotificationStore.getState().notifications.map((n) => n.message)).not.toContain(testo);
    // «Chiudi» lo toglie
    fireEvent.click(avviso.getByRole('button', { name: 'Chiudi l’avviso' }));
    expect(screen.queryByRole('alert', { name: 'La mappa non si sposta lì' })).toBeNull();
  });

  it('le proprietà della mappa si salvano (nome, genitore, asset); il genitore proposto esclude la mappa stessa', async () => {
    api.aggiornaMappa.mockResolvedValue(base);
    monta();
    fireEvent.click(await screen.findByRole('button', {name:'Mappa'}));
    const form = within(await screen.findByRole('region', { name: 'Proprietà della mappa' }));
    expect(vociSelettore('Mappa genitore')).toEqual(['— nessuna (radice) —', 'Tokyo']);
    fireEvent.change(form.getByLabelText('Nome'), { target: { value: 'Shibuya centro' } });
    fireEvent.click(form.getByRole('button', { name: 'Salva mappa' }));
    await waitFor(() => expect(api.aggiornaMappa).toHaveBeenCalledWith('citta-shibuya', { nome: 'Shibuya centro', tipo: 'quartiere', genitore: 'tokyo', ordine: 0, note: '' }));
    // L11 (R11-02/8, migrazione 210): «Scarica dalla guida» non c'è più nemmeno sul quartiere (scarico tolto su decisione dell'utente);
    // la sezione File esporta e importa il JSON delle mappe
    expect(screen.queryByRole('button', { name: 'Scarica dalla guida' })).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'File'}));
    expect(screen.getByRole('button', { name: /^Esporta/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Esporta questo luogo/ })).toBeNull();
  });

  it('«Elimina mappa» chiede conferma dicendo che la mappa finisce nel cestino (2026-10-16), poi la elimina', async () => {
    api.eliminaMappa.mockResolvedValue(undefined);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Mappa' }));
    fireEvent.click(await screen.findByRole('button', { name: /Elimina mappa/ }));
    const conferma = within(await screen.findByRole('dialog', { name: /^Eliminare la mappa/ }));
    expect(conferma.getByText(/le mappe figlie \(\d+\) restano senza genitore\. Finisce nel cestino \(Impostazioni → Cestino\): da lì la rimetti com’era\./)).toBeInTheDocument();
    expect(conferma.queryByText(/L.immagine di base resta/)).toBeNull();
    fireEvent.click(conferma.getByRole('button', { name: 'Elimina' }));
    await waitFor(() => expect(api.eliminaMappa).toHaveBeenCalledWith('citta-shibuya'));
  });

  // Superato dal lotto L11 (R11-02/8, migrazione 210): il pulsante e lo scarico della pianta del quartiere sono tolti su decisione dell'utente.
  it.skip('O9: su una planimetria d\'area «Scarica dalla guida» non c\'è (la rotta delle piante d\'area non esiste più); su un quartiere scarica la sua pianta', async () => {
    api.getMappa.mockResolvedValue({ ...base, chiave: 'kamoshida-02', nome: 'Sala centrale', tipo: 'area', genitore: null, radiceDi: null });
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Mappa' }));
    await screen.findByRole('region', { name: 'Proprietà della mappa' });
    expect(screen.queryByRole('button', { name: 'Scarica dalla guida' })).toBeNull();
    cleanup();
    api.getMappa.mockResolvedValue(base);
    api.scaricaPiantaQuartiere.mockResolvedValue({ quartiere: 'shibuya', mime: 'image/png', byte: 1, fonte: 'x', url: 'x' });
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Mappa' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Scarica dalla guida' }));
    await waitFor(() => expect(api.scaricaPiantaQuartiere).toHaveBeenCalledWith('shibuya'));
  });

  it('albero (15.24): le figlie senza spillo che le raggiunge e il genitore senza ritorno hanno «Crea passaggio», che chiama l’API e seleziona lo spillo creato', async () => {
    const figliaRaggiunta = riassunto({ chiave: 'luogo-a', nome: 'Luogo A', tipo: 'luogo', genitore: 'citta-shibuya' });
    const figliaOrfana = riassunto({ chiave: 'luogo-b', nome: 'Luogo B', tipo: 'luogo', genitore: 'citta-shibuya' });
    const versoA: SpilloDto = { ...nota, id: 21, tipo: 'passaggio', tipoNome: 'Passaggio', nome: 'Luogo A', riferimento: { tipo: 'mappa', chiave: 'luogo-a' }, dettaglio: {tipo:'mappa',mappa:{chiave:'luogo-a',nome:'Luogo A',tipo:'luogo',area:null,casa:'/guida/mappe/luogo-a'},immagine:{url:null,asset:null}} };
    api.getMappa.mockResolvedValue({ ...base, figli: [figliaRaggiunta, figliaOrfana], spilli: [versoA] });
    const creato: SpilloDto = { ...versoA, id: 22, nome: 'Luogo B', riferimento: { tipo: 'mappa', chiave: 'luogo-b' }, dettaglio: {tipo:'mappa',mappa:{chiave:'luogo-b',nome:'Luogo B',tipo:'luogo',area:null,casa:'/guida/mappe/luogo-b'},immagine:{url:null,asset:null}} };
    api.creaPassaggio.mockResolvedValue(creato);
    monta();
    fireEvent.click(await screen.findByRole('button',{name:'Collegamenti'}));
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
    fireEvent.click(screen.getByRole('button',{name:'Collegamenti'}));
    fireEvent.click(screen.getByRole('button', { name: 'Crea passaggio di ritorno' }));
    await waitFor(() => expect(api.creaPassaggio).toHaveBeenLastCalledWith('citta-shibuya', 'tokyo'));
  });

  it.each(['esplicita','invalidata','legacy'] as const)('albero rispetta destinazione %s e precedenza sul riferimento',async(caso)=>{
    const figli=['a','b'].map(k=>riassunto({chiave:`luogo-${k}`,nome:`Luogo ${k.toUpperCase()}`,tipo:'luogo',genitore:base.chiave}));
    const spillo:SpilloDto={...nota,tipo:'passaggio',tipoNome:'Passaggio',riferimento:{tipo:'mappa',chiave:'luogo-a'},dettaglio:{tipo:'mappa',mappa:{chiave:'luogo-a',nome:'Luogo A',tipo:'luogo',area:null,casa:'/guida/mappe/luogo-a'},immagine:{url:null,asset:null}},
      destinazione:caso==='esplicita'?{mappa:'luogo-b',spillo:null}:null,destinazioneNonDisponibile:caso==='invalidata'};
    api.getMappa.mockResolvedValue({...base,figli,spilli:[spillo]});monta();
    fireEvent.click(await screen.findByRole('button',{name:'Collegamenti'}));
    const regione=within(await screen.findByRole('region',{name:'Albero delle mappe'}));
    expect(Boolean(regione.queryByRole('button',{name:'Crea passaggio verso Luogo A'}))).toBe(caso!=='legacy');
    expect(Boolean(regione.queryByRole('button',{name:'Crea passaggio verso Luogo B'}))).toBe(caso!=='esplicita');
  });

  // Saltato (L11 R11-14): «Nuova mappa» generica non esiste più, decisione dell'utente (verifica finale di L2/L3); non va eseguito né cancellato.
  it.skip('«Nuova mappa» (15.24): chiede il passaggio sul genitore (preselezionato) e il ritorno (a scelta) e li passa all’API', async () => {
    api.creaMappa.mockResolvedValue({ ...base, chiave: 'bar-nuovo', nome: 'Bar nuovo', genitore: 'citta-shibuya' });
    monta();
    fireEvent.click(await screen.findByRole('button',{name:'Collegamenti'}));
    fireEvent.click(await screen.findByRole('button', { name: /Nuova mappa/ }));
    const finestra = within(await screen.findByRole('dialog'));
    fireEvent.change(finestra.getByLabelText('Nome'), { target: { value: 'Bar nuovo' } });
    const passaggio = finestra.getByRole('checkbox', { name: /Crea il passaggio su «Shibuya»/ }) as HTMLInputElement;
    const ritorno = finestra.getByRole('checkbox', { name: /passaggio di ritorno verso «Shibuya»/ }) as HTMLInputElement;
    expect(passaggio.checked).toBe(true);
    expect(ritorno.checked).toBe(false);
    expect(finestra.queryByLabelText(/Chiave/)).toBeNull();
    expect(finestra.queryByLabelText('Asset del repository')).toBeNull();
    fireEvent.click(ritorno);
    fireEvent.click(finestra.getByRole('button', { name: 'Crea' }));
    await waitFor(() => expect(api.creaMappa).toHaveBeenCalledWith({ nome: 'Bar nuovo', tipo: 'luogo', genitore: 'citta-shibuya', ordine: 0, passaggio: true, ritorno: true }));
    // riaperta, la finestra parte pulita (nome, chiave, asset e caselle ai valori iniziali)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // la pagina passa alla mappa appena creata dopo aver riletto l'albero (`ricarica()` si risolve a rilettura avvenuta):
    // si attende la lettura della mappa nuova, poi il pannello
    await waitFor(() => expect(api.getMappa.mock.calls.some((c: unknown[]) => c[0] === 'bar-nuovo')).toBe(true));
    fireEvent.click(await screen.findByRole('button',{name:'Collegamenti'}));
    fireEvent.click(await screen.findByRole('button', { name: /Nuova mappa/ }));
    const riaperta = within(await screen.findByRole('dialog'));
    // il campo compare quando la finestra ha finito di montarsi: senza attenderlo il test falliva
    // una volta su alcune decine, ed è il tipo di verde che non vale niente
    await waitFor(() => expect(riaperta.getByLabelText('Nome')).toBeInTheDocument());
    expect((riaperta.getByLabelText('Nome') as HTMLInputElement).value).toBe('');
    expect(riaperta.queryByLabelText('Asset del repository')).toBeNull();
    expect((riaperta.getByRole('checkbox', { name: /passaggio di ritorno/ }) as HTMLInputElement).checked).toBe(false);
  });

  // Saltato (L11 R11-14): «Nuova mappa» generica non esiste più, decisione dell'utente (verifica finale di L2/L3); non va eseguito né cancellato.
  it.skip('nomi uguali nella stessa mappa impediscono la creazione, senza una chiave da inserire',async()=>{
    api.getAlberoMappe.mockResolvedValue([riassunto({chiave:'citta-shibuya-vicolo',nome:'Vicolo',tipo:'luogo',genitore:'citta-shibuya'})]);
    monta();fireEvent.click(await screen.findByRole('button',{name:'Collegamenti'}));fireEvent.click(await screen.findByRole('button',{name:/Nuova mappa/}));
    const f=within(await screen.findByRole('dialog'));fireEvent.change(f.getByLabelText('Nome'),{target:{value:'Vicolo'}});
    expect(f.getByRole('button',{name:'Crea'})).toBeDisabled();
  });

  it('la palette di «Aggiungi» è divisa nelle quattro categorie (Spostamento, Città, Consumabile, Informativo) con tutti i tipi, «Ingresso al Palazzo» compreso', async () => {
    monta();
    expect(await screen.findByText('Modifica')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi/ }));
    const palette = within(screen.getByRole('group', { name: 'Tipo del nuovo spillo' }));
    for (const g of ['Spostamento', 'Città', 'Consumabile', 'Informativo']) expect(palette.getByText(g)).toBeInTheDocument();
    expect(palette.getAllByRole('button')).toHaveLength(41);
    for (const nome of ['Bevande', 'Sigarette', 'Cercalavoro', 'Lavoro part-time', 'Bagno pubblico', 'Timbro dei Mementos', 'Punto del rampino', 'Porta chiusa', 'Ingresso al Palazzo', 'Oggetto', 'Punto di infiltrazione']) expect(palette.getByRole('button', { name: nome })).toBeInTheDocument();
    expect(palette.queryByRole('button', { name: 'Distributore' })).toBeNull();
  });

  // ---- I pezzi della planimetria (102, 2026-10-14) ----
  // In jsdom la tela misura 0×0 e lo zoom è 1: il punto (cx, cy) dello schermo è il pixel (cx + 500, cy + 250) della mappa 1000×500.
  const conImmagine: MappaDto = { ...base, immagineUrl: '/pianta.png' };
  type Copia = MappaDto['pezzi'][number]['copie'][number];
  /** Una copia del pezzo 31; `extra` sovrascrive. */
  const copia = (extra: Partial<Copia> = {}): Copia => ({ id: 41, uid: '4'.repeat(32), pezzoId: 31, etichetta: '', posizione: { x: 300, y: 200 }, rotazione: 0, specchio: { orizzontale: false, verticale: false }, condizioni: [], ordine: 0, updatedAt: 'u1', ...extra });
  const pezzo: MappaDto['pezzi'][number] = { id: 31, uid: '3'.repeat(32), nome: 'Muro mobile', sorgente: { x: 100, y: 450, larghezza: 120, altezza: 40 }, ordine: 0, updatedAt: 'u1', copie: [copia()] };
  /** Lo stesso pezzo con due copie (103): la seconda ha un'etichetta, una rotazione e una condizione. */
  const conDueCopie: MappaDto['pezzi'][number] = { ...pezzo, copie: [copia(), copia({ id: 42, uid: '5'.repeat(32), etichetta: 'Ala est', posizione: { x: 700, y: 100 }, rotazione: 90, ordine: 1, condizioni: [{ tipo: 'fascia', fascia: 'sera', testo: 'solo di sera' }] })] };
  /** Apre la sezione «Pezzi» dell'editor. */
  const apriPezzi = async () => fireEvent.click(await screen.findByRole('button', { name: 'Pezzi' }));

  it('«Ritaglia pezzo»: il rettangolo trascinato sulla mappa diventa un pezzo (pixel dell\'immagine), selezionato; un tocco senza rettangolo non ritaglia', async () => {
    api.getMappa.mockResolvedValueOnce(conImmagine).mockResolvedValue({ ...conImmagine, pezzi: [pezzo] });
    api.creaPezzoMappa.mockResolvedValue(pezzo);
    monta();
    await apriPezzi();
    const ritaglia = screen.getByRole('button', { name: /Ritaglia pezzo/ });
    fireEvent.click(ritaglia);
    expect(ritaglia).toHaveAttribute('aria-pressed', 'true');
    const tela = screen.getByRole('application');
    // un tocco: niente
    fireEvent.pointerDown(tela, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(tela, { pointerId: 1, clientX: 1, clientY: 0 });
    expect(api.creaPezzoMappa).not.toHaveBeenCalled();
    // un rettangolo trascinato, anche al contrario: l'angolo in alto a sinistra e le misure
    fireEvent.pointerDown(tela, { pointerId: 1, clientX: 100, clientY: 40 });
    fireEvent.pointerMove(tela, { pointerId: 1, clientX: 50, clientY: 20 });
    expect(document.querySelector('[data-ritaglio]')).not.toBeNull();
    fireEvent.pointerUp(tela, { pointerId: 1, clientX: 0, clientY: 0 });
    await waitFor(() => expect(api.creaPezzoMappa).toHaveBeenCalledWith('citta-shibuya', { sorgente: { x: 500, y: 250, larghezza: 100, altezza: 40 } }));
    expect(document.querySelector('[data-ritaglio]')).toBeNull();
    // ricaricata la mappa, la prima copia del pezzo è selezionata con le sue proprietà e lo strumento torna «Seleziona»
    expect(await screen.findByRole('region', { name: 'Proprietà della copia: Muro mobile · copia 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ritaglia pezzo/ })).toHaveAttribute('aria-pressed', 'false');
    // la zona ritagliata si vede tratteggiata nell'editor
    expect(document.querySelector(`[data-zona-pezzo="${pezzo.uid}"]`)).not.toBeNull();
  });

  it('senza immagine di base non si ritaglia', async () => {
    monta();
    await apriPezzi();
    expect(screen.getByRole('button', { name: /Ritaglia pezzo/ })).toBeDisabled();
    expect(screen.getByText('Serve un’immagine di base da cui ritagliare.')).toBeInTheDocument();
  });

  it('il modulo della copia: nome del pezzo, etichetta, posizione al pixel (campi e frecce), rotazione, specchio e condizioni si salvano insieme; l\'ultima copia «Elimina» chiede conferma e dice che se ne va il pezzo', async () => {
    api.getMappa.mockResolvedValue({ ...conImmagine, pezzi: [pezzo] });
    api.aggiornaCopiaPezzoMappa.mockResolvedValue(copia());
    api.eliminaCopiaPezzoMappa.mockResolvedValue({ pezzoEliminato: true });
    monta();
    await apriPezzi();
    // l'elenco: il pezzo con la sua copia
    const elenco = within(screen.getByRole('list', { name: 'Pezzi di questa mappa' }));
    expect(elenco.getByText('120×40 px · 1 copia')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('list', { name: 'Copie di Muro mobile' })).getByRole('button', { name: /Muro mobile · copia 1/ }));
    const form = within(screen.getByRole('region', { name: 'Proprietà della copia: Muro mobile · copia 1' }));
    expect(form.getByText(/Copia 1 di 1 · zona d’origine 100, 450 · 120×40 px/)).toBeInTheDocument();
    expect(form.getByRole('button', { name: 'Salva copia' })).toBeDisabled();
    // con una copia sola non c'è «Elimina pezzo»: «Elimina» è già l'ultima copia
    expect(form.queryByRole('button', { name: /Elimina pezzo/ })).toBeNull();
    expect(form.getByRole('textbox', { name: 'Etichetta della copia' })).toHaveAttribute('placeholder', 'Muro mobile · copia 1');
    fireEvent.change(form.getByRole('textbox', { name: 'Nome del pezzo' }), { target: { value: 'Muro del ponte' } });
    // il segnaposto dell'etichetta segue il nome
    expect(form.getByRole('textbox', { name: 'Etichetta della copia' })).toHaveAttribute('placeholder', 'Muro del ponte · copia 1');
    fireEvent.change(form.getByRole('textbox', { name: 'Etichetta della copia' }), { target: { value: ' Ingresso ' } });
    fireEvent.change(form.getByRole('spinbutton', { name: 'X' }), { target: { value: '310' } });
    fireEvent.click(form.getByRole('button', { name: 'Sposta di 1 px a destra' }));
    fireEvent.click(form.getByRole('button', { name: 'Sposta di 1 px a su' }));
    fireEvent.click(form.getByRole('radio', { name: '90°' }));
    expect(form.getByRole('radio', { name: '90°' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(form.getByRole('checkbox', { name: 'Specchia in orizzontale' }));
    // con modifiche in sospeso non si aggiunge una copia (partirebbe da quella salvata)
    expect(form.getByRole('button', { name: /Aggiungi copia/ })).toBeDisabled();
    fireEvent.click(form.getByRole('button', { name: 'Salva copia' }));
    await waitFor(() => expect(api.aggiornaCopiaPezzoMappa).toHaveBeenCalledWith(41, { etichetta: 'Ingresso', posizione: { x: 311, y: 199 }, rotazione: 90, specchio: { orizzontale: true, verticale: false }, condizioni: [], nomePezzo: 'Muro del ponte' }));
    // a 90° l'ingombro è 40 × 120: la X non va oltre 1000 − 40, la Y oltre 500 − 120
    fireEvent.change(form.getByRole('spinbutton', { name: 'X' }), { target: { value: '5000' } });
    expect(form.getByRole('spinbutton', { name: 'X' })).toHaveAttribute('max', '960');
    expect(form.getByRole('spinbutton', { name: 'Y' })).toHaveAttribute('max', '380');
    await waitFor(() => expect(form.getByRole('button', { name: 'Elimina' })).toBeEnabled());
    fireEvent.click(form.getByRole('button', { name: 'Elimina' }));
    const conferma = within(screen.getByRole('dialog', { name: 'Eliminare il pezzo «Muro mobile»?' }));
    expect(conferma.getByText(/È l’ultima copia: con lei se ne va il pezzo, e la sua zona d’origine torna visibile/)).toBeInTheDocument();
    expect(api.eliminaCopiaPezzoMappa).not.toHaveBeenCalled();
    fireEvent.click(conferma.getByRole('button', { name: /Elimina/ }));
    await waitFor(() => expect(api.eliminaCopiaPezzoMappa).toHaveBeenCalledWith(41));
    expect(api.eliminaPezzoMappa).not.toHaveBeenCalled();
    await waitFor(() => expect(useNotificationStore.getState().notifications.map((n) => n.message)).toContain('Era l’ultima copia: il pezzo è stato eliminato e la sua zona torna visibile nella mappa.'));
  });

  it('le copie (103): l\'elenco le raggruppa sotto il pezzo; «Aggiungi copia» ne posa una accanto, con rotazione, specchio e condizioni; si eliminano una copia o il pezzo intero, con conferma', async () => {
    api.getMappa.mockResolvedValue({ ...conImmagine, pezzi: [conDueCopie] });
    api.creaCopiaPezzoMappa.mockResolvedValue(copia({ id: 43, uid: '6'.repeat(32), posizione: { x: 724, y: 124 }, rotazione: 90, ordine: 2 }));
    api.eliminaCopiaPezzoMappa.mockResolvedValue({ pezzoEliminato: false });
    api.eliminaPezzoMappa.mockResolvedValue(undefined);
    monta();
    await apriPezzi();
    expect(within(screen.getByRole('list', { name: 'Pezzi di questa mappa' })).getByText('120×40 px · 2 copie')).toBeInTheDocument();
    const copie = within(screen.getByRole('list', { name: 'Copie di Muro mobile' }));
    // vuota l'etichetta, il nome è «Nome · copia N»; con l'etichetta, l'etichetta; accanto posizione, rotazione e condizioni
    expect(copie.getByRole('button', { name: /Muro mobile · copia 1.*300, 200/ })).toBeInTheDocument();
    expect(copie.getByRole('button', { name: /Ala est.*700, 100 · 90° · 1 condizione/ })).toBeInTheDocument();
    // sulla mappa due copie dello stesso pezzo, una zona tratteggiata
    expect(document.querySelectorAll(`[data-pezzo="${pezzo.uid}"]`)).toHaveLength(2);
    expect(document.querySelectorAll(`[data-zona-pezzo="${pezzo.uid}"]`)).toHaveLength(1);
    fireEvent.click(copie.getByRole('button', { name: /Ala est/ }));
    expect(copie.getByRole('button', { name: /Ala est/ })).toHaveAttribute('aria-pressed', 'true');
    const form = within(screen.getByRole('region', { name: 'Proprietà della copia: Ala est' }));
    expect(form.getByText(/Copia 2 di 2/)).toBeInTheDocument();
    // la zona del pezzo della copia selezionata si evidenzia sulla mappa
    expect(document.querySelector(`[data-zona-pezzo="${pezzo.uid}"]`)).toHaveClass('visore-mappa__zona-pezzo--selezionata');
    // «Aggiungi copia»: accanto (24 px in basso a destra, dentro 1000 × 500 anche ruotata: 40 × 120), stessa posa e condizioni senza testo
    // la mappa riletta dopo l'aggiunta ne ha tre
    api.getMappa.mockResolvedValue({ ...conImmagine, pezzi: [{ ...conDueCopie, copie: [...conDueCopie.copie, copia({ id: 43, uid: '6'.repeat(32), posizione: { x: 724, y: 124 }, rotazione: 90, ordine: 2 })] }] });
    fireEvent.click(form.getByRole('button', { name: /Aggiungi copia/ }));
    await waitFor(() => expect(api.creaCopiaPezzoMappa).toHaveBeenCalledWith(31, { posizione: { x: 724, y: 124 }, rotazione: 90, specchio: { orizzontale: false, verticale: false }, condizioni: [{ tipo: 'fascia', fascia: 'sera' }] }));
    // la copia nuova è selezionata
    expect(await screen.findByRole('region', { name: 'Proprietà della copia: Muro mobile · copia 3' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Pezzi di questa mappa' })).getByText('120×40 px · 3 copie')).toBeInTheDocument();
    // «Elimina copia»: le altre restano
    fireEvent.click(within(screen.getByRole('list', { name: 'Copie di Muro mobile' })).getByRole('button', { name: /Muro mobile · copia 1/ }));
    const prima = within(screen.getByRole('region', { name: 'Proprietà della copia: Muro mobile · copia 1' }));
    await waitFor(() => expect(prima.getByRole('button', { name: 'Elimina copia' })).toBeEnabled());
    fireEvent.click(prima.getByRole('button', { name: 'Elimina copia' }));
    const unaCopia = within(screen.getByRole('dialog', { name: 'Eliminare la copia «Muro mobile · copia 1»?' }));
    expect(unaCopia.getByText(/restano sulla mappa; la zona d’origine resta cancellata/)).toBeInTheDocument();
    fireEvent.click(unaCopia.getByRole('button', { name: /Elimina/ }));
    await waitFor(() => expect(api.eliminaCopiaPezzoMappa).toHaveBeenCalledWith(41));
    await waitFor(() => expect(useNotificationStore.getState().notifications.map((n) => n.message)).toContain('Copia eliminata: le altre restano sulla mappa.'));
    // «Elimina pezzo»: tutte le copie, con conferma
    fireEvent.click(within(screen.getByRole('list', { name: 'Copie di Muro mobile' })).getByRole('button', { name: /Ala est/ }));
    const seconda = within(screen.getByRole('region', { name: 'Proprietà della copia: Ala est' }));
    await waitFor(() => expect(seconda.getByRole('button', { name: /Elimina pezzo/ })).toBeEnabled());
    fireEvent.click(seconda.getByRole('button', { name: /Elimina pezzo/ }));
    const tutto = within(screen.getByRole('dialog', { name: 'Eliminare il pezzo «Muro mobile» con tutte le copie?' }));
    expect(tutto.getByText(/Se ne vanno tutte le 3 copie e la zona d’origine torna visibile/)).toBeInTheDocument();
    expect(api.eliminaPezzoMappa).not.toHaveBeenCalled();
    fireEvent.click(tutto.getByRole('button', { name: /Elimina/ }));
    await waitFor(() => expect(api.eliminaPezzoMappa).toHaveBeenCalledWith(31));
  });

  it('la notifica dell\'importazione conta pezzi e copie (scritti, scartati, tolti), con singolari e plurali', async () => {
    api.getMappa.mockResolvedValue(conImmagine);
    const esito = { mappe: 1, spilli: 0, pezzi: 1, copie: 3, pezziScartati: 0, copieScartate: 1, pezziEliminati: 2, copieEliminate: 5, immagini: 0, saltate: [], condizioniScartate: 0, vociScartate: 0 };
    api.importaMappe.mockResolvedValueOnce(esito).mockResolvedValueOnce({ ...esito, pezzi: 2, copie: 1, pezziScartati: 1, copieScartate: 2, pezziEliminati: 1, copieEliminate: 1 });
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'File' }));
    const file = () => new File([JSON.stringify({ versione: 1, mappe: [] })], 'mappe.json', { type: 'application/json' });
    const messaggi = () => useNotificationStore.getState().notifications.map((n) => n.message);
    fireEvent.change(screen.getByLabelText('File del pacchetto da importare'), { target: { files: [file()] } });
    await waitFor(() => expect(messaggi()).toContain('Importate 1 mappe, 0 spilli, 1 pezzo (3 copie), 0 immagini; 1 copia scartata perché esce dall’immagine della loro mappa; 2 pezzi (5 copie) tolti perché ritagliati da un’immagine poi sostituita.'));
    await waitFor(() => expect(screen.getByLabelText('File del pacchetto da importare')).toBeEnabled());
    fireEvent.change(screen.getByLabelText('File del pacchetto da importare'), { target: { files: [file()] } });
    await waitFor(() => expect(messaggi()).toContain('Importate 1 mappe, 0 spilli, 2 pezzi (1 copia), 0 immagini; 2 copie scartate perché escono dall’immagine della loro mappa (con loro 1 pezzo rimasto senza copie o con la zona fuori); 1 pezzo (1 copia) tolto perché ritagliato da un’immagine poi sostituita.'));
  });

  it('trascinata sulla mappa (strumento «Seleziona»), la copia si sposta e si salva al rilascio; selezionarla deseleziona lo spillo', async () => {
    api.getMappa.mockResolvedValue({ ...conImmagine, spilli: [nota], pezzi: [conDueCopie] });
    api.aggiornaCopiaPezzoMappa.mockResolvedValue(copia());
    monta();
    fireEvent.click(await screen.findByRole('button', { name: /Nota: Nota/ }));
    expect(await screen.findByRole('region', { name: 'Proprietà dello spillo: Nota' })).toBeInTheDocument();
    const sullaMappa = document.querySelector<HTMLElement>(`[data-copia="${'4'.repeat(32)}"]`)!;
    expect(sullaMappa).toHaveClass('visore-mappa__pezzo--modificabile');
    const tela = screen.getByRole('application');
    fireEvent.pointerDown(sullaMappa, { pointerId: 1, clientX: 10, clientY: 10 });
    // selezionata: il pannello passa ai pezzi e lo spillo si chiude
    expect(await screen.findByRole('region', { name: 'Proprietà della copia: Muro mobile · copia 1' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Proprietà dello spillo: Nota' })).toBeNull();
    fireEvent.pointerMove(tela, { pointerId: 1, clientX: 30, clientY: 5 });
    expect(sullaMappa.style.left).toBe('320px');
    // l'altra copia resta dov'era
    expect(document.querySelector<HTMLElement>(`[data-copia="${'5'.repeat(32)}"]`)!.style.left).toBe('700px');
    fireEvent.pointerUp(tela, { pointerId: 1, clientX: 30, clientY: 5 });
    await waitFor(() => expect(api.aggiornaCopiaPezzoMappa).toHaveBeenCalledWith(41, { posizione: { x: 320, y: 195 } }));
  });

  it('sostituire l\'immagine di una mappa con dei pezzi chiede conferma (409): confermando si ricarica con «eliminaPezzi»', async () => {
    api.getMappa.mockResolvedValue({ ...conImmagine, pezzi: [pezzo] });
    api.caricaImmagineMappa.mockRejectedValueOnce(new ApiError(409, 'mappa-con-pezzi', 'La mappa ha 1 pezzo ritagliato dall’immagine di prima: sostituendola verrà eliminato.', { pezzi: 1 })).mockResolvedValue(conImmagine);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Mappa' }));
    const file = new File(['x'], 'nuova.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('File dell\'immagine di base'), { target: { files: [file] } });
    const finestra = within(await screen.findByRole('dialog', { name: 'Sostituire l’immagine di base?' }));
    expect(finestra.getByText(/1 pezzo ritagliato dall’immagine di prima/)).toBeInTheDocument();
    expect(api.caricaImmagineMappa).toHaveBeenCalledTimes(1);
    expect(api.caricaImmagineMappa).toHaveBeenLastCalledWith('citta-shibuya', file);
    // mentre l'editor rilegge la mappa (dopo il 409) i comandi sono fermi: si aspetta che tornino attivi
    await waitFor(() => expect(finestra.getByRole('button', { name: /Sostituisci ed elimina i pezzi/ })).toBeEnabled());
    fireEvent.click(finestra.getByRole('button', { name: /Sostituisci ed elimina i pezzi/ }));
    await waitFor(() => expect(api.caricaImmagineMappa).toHaveBeenLastCalledWith('citta-shibuya', file, { eliminaPezzi: true }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sostituire l’immagine di base?' })).toBeNull());
  });

  // Superato dal lotto L11 (R11-02/8, migrazione 210): il pulsante e lo scarico della pianta del quartiere sono tolti su decisione dell'utente.
  it.skip('«Scarica dalla guida» su un quartiere con dei pezzi chiede la stessa conferma (L1, F5: 409): confermando scarica con «eliminaPezzi»', async () => {
    useNotificationStore.setState({ notifications: [] });
    api.getMappa.mockResolvedValue({ ...conImmagine, pezzi: [pezzo] });
    api.scaricaPiantaQuartiere.mockRejectedValueOnce(new ApiError(409, 'mappa-con-pezzi', 'La mappa ha 1 pezzo ritagliato dall’immagine di prima: sostituendola verrà eliminato.', { pezzi: 1 }))
      .mockResolvedValue({ quartiere: 'shibuya', mime: 'image/png', byte: 1, fonte: 'x', url: 'x' });
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Mappa' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Scarica dalla guida' }));
    const finestra = within(await screen.findByRole('dialog', { name: 'Sostituire l’immagine di base?' }));
    expect(finestra.getByText(/1 pezzo ritagliato dall’immagine di prima/)).toBeInTheDocument();
    expect(api.scaricaPiantaQuartiere).toHaveBeenLastCalledWith('shibuya');
    // il 409 non è un errore: nessun avviso rosso, solo la domanda
    expect(useNotificationStore.getState().notifications.filter((n) => n.type === 'error')).toEqual([]);
    await waitFor(() => expect(finestra.getByRole('button', { name: /Sostituisci ed elimina i pezzi/ })).toBeEnabled());
    fireEvent.click(finestra.getByRole('button', { name: /Sostituisci ed elimina i pezzi/ }));
    await waitFor(() => expect(api.scaricaPiantaQuartiere).toHaveBeenLastCalledWith('shibuya', { eliminaPezzi: true }));
    await waitFor(() => expect(useNotificationStore.getState().notifications.map((n) => n.message)).toContain('Pianta scaricata dalla guida; i pezzi ritagliati dall’immagine di prima sono stati eliminati.'));
  });

  // ---- Le mappe del mondo (L2, 2026-10-20; `modifiche.md` §4.6, R2-20, R2-27) ----
  // Nel mondo non nasce una mappa sciolta: al posto di «Nuova mappa» e di «Crea mappa collegata» c'è il collegamento alla pagina
  // da cui si aggiungono aree e planimetrie; «Chiudi» porta alla casa; una planimetria di un'Area non cambia tipo né genitore.
  const areaSottopasso = { chiave: 'citta/shibuya/sottopasso', contenitore: { tipo: 'quartiere' as const, chiave: 'shibuya', nome: 'Shibuya' }, slug: 'sottopasso', nome: 'Sottopasso', versioneEtichetta: 'planimetria completa', versioneOrdine: 1, predefinita: false, casa: '/guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale' };
  const planimetria: MappaDto = { ...base, chiave: 'shibuya-sottopasso-speciale', nome: 'Sottopasso Speciale', tipo: 'luogo', genitore: 'citta-shibuya', radiceDi: null, area: areaSottopasso, casa: areaSottopasso.casa };
  /** Monta l'editor su una mappa con una rotta di arrivo per ogni altro indirizzo, che scrive dove si è finiti. */
  function montaConArrivo(indirizzo: string) {
    function Arrivo() { const l = useLocation(); return <p>Arrivo: {l.pathname}{l.search}</p>; }
    render(
      <MemoryRouter initialEntries={[indirizzo]}>
        <Routes><Route path="/guida/mappe/:chiave/modifica" element={<EditorMappaPage />} /><Route path="*" element={<Arrivo />} /></Routes>
      </MemoryRouter>,
    );
  }

  it('una planimetria di un’Area: niente «Nuova mappa» ma il collegamento al quartiere, e «Chiudi» torna alla versione nella pagina dell’Area', async () => {
    api.getMappa.mockResolvedValue(planimetria);
    montaConArrivo('/guida/mappe/shibuya-sottopasso-speciale/modifica');
    fireEvent.click(await screen.findByRole('button', { name: 'Collegamenti' }));
    expect(screen.queryByRole('button', { name: /Nuova mappa/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Aggiungi area / planimetria dalla pagina del quartiere' })).toHaveAttribute('href', '/guida/citta/shibuya');
    fireEvent.click(screen.getByRole('button', { name: /^Chiudi/ }));
    expect(await screen.findByText('Arrivo: /guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale')).toBeInTheDocument();
  });

  it('una planimetria di un’Area: il form non offre tipo né genitore e non li manda all’API', async () => {
    api.getMappa.mockResolvedValue(planimetria);
    api.aggiornaMappa.mockResolvedValue(planimetria);
    montaConArrivo('/guida/mappe/shibuya-sottopasso-speciale/modifica');
    fireEvent.click(await screen.findByRole('button', { name: 'Mappa' }));
    const form = within(screen.getByRole('region', { name: 'Proprietà della mappa' }));
    expect(form.queryByText('Tipo di mappa')).toBeNull();
    expect(form.queryByText('Mappa genitore')).toBeNull();
    expect(form.getByRole('link', { name: 'pagina dell’area' })).toHaveAttribute('href', areaSottopasso.casa);
    fireEvent.change(form.getByLabelText('Nome'), { target: { value: 'Sottopasso intero' } });
    fireEvent.click(form.getByRole('button', { name: /Salva mappa/ }));
    await waitFor(() => expect(api.aggiornaMappa).toHaveBeenCalled());
    const [, dati] = api.aggiornaMappa.mock.calls[0];
    expect(dati).toMatchObject({ nome: 'Sottopasso intero' });
    expect(dati).not.toHaveProperty('tipo');
    expect(dati).not.toHaveProperty('genitore');
  });

  it('un quartiere del mondo: il passaggio senza arrivo non offre «Crea mappa collegata» ma la pagina del quartiere', async () => {
    const uscita: SpilloDto = { ...nota, id: 12, tipo: 'passaggio', tipoNome: 'Passaggio', nome: 'Uscita' };
    api.getMappa.mockResolvedValue({ ...base, casa: '/guida/citta/shibuya', spilli: [uscita] });
    montaConArrivo('/guida/mappe/citta-shibuya/modifica');
    fireEvent.click(await screen.findByRole('button', { name: /Passaggio: Uscita/ }));
    const scheda = within(screen.getByRole('region', { name: 'Proprietà dello spillo: Uscita' }));
    expect(scheda.queryByRole('button', { name: /Crea mappa collegata/ })).toBeNull();
    expect(scheda.getByRole('link', { name: 'Aggiungi area / planimetria dalla pagina del quartiere' })).toHaveAttribute('href', '/guida/citta/shibuya');
  });

  // SUPERATO da L11/B5 (R11-14/1, D1): in un Palazzo «Nuova mappa» è tolta (il server la rifiutava sempre, 409 `usa-aggiungi-area`) e al suo posto
  // c'è il collegamento «Aggiungi area / planimetria dalla scheda del Palazzo»; resta solo per la radice dei Memento. Non eseguito (zero test).
  it.skip('fuori dal mondo (un Palazzo) «Nuova mappa» e il form completo restano', async () => {
    api.getMappa.mockResolvedValue({ ...base, chiave: 'palazzo-di-kamoshida', nome: 'Palazzo di Kamoshida', tipo: 'palazzo', genitore: null, radiceDi: { tipo: 'dungeon', chiave: 'kamoshida' }, casa: '/guida/dungeon/kamoshida' });
    montaConArrivo('/guida/mappe/palazzo-di-kamoshida/modifica');
    fireEvent.click(await screen.findByRole('button', { name: 'Collegamenti' }));
    expect(screen.getByRole('button', { name: /Nuova mappa/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Aggiungi area/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mappa' }));
    expect(within(screen.getByRole('region', { name: 'Proprietà della mappa' })).getByText('Tipo di mappa')).toBeInTheDocument();
  });

  it('una planimetria di un Palazzo aperta dalla scheda: «Chiudi» e «Apri il visore» vanno dritti alla sua casa con l’infiltrazione aperta (L3, AP3-4)', async () => {
    const museo: MappaDto = { ...base, chiave: 'palazzo-di-madarame-museo-1p', nome: 'Museo 1P', tipo: 'luogo', genitore: 'palazzo-di-madarame', radiceDi: null, casa: '/guida/dungeon/madarame/area/museo-1p' };
    api.getMappa.mockResolvedValue(museo);
    // la pagina da cui si è entrati nell'editor: la scheda di Madarame sull'infiltrazione k-04
    sessionStorage.setItem('p5r-ritorno-mappe', '/guida/dungeon/madarame/area/entrata?infiltrazione=k-04');
    montaConArrivo('/guida/mappe/palazzo-di-madarame-museo-1p/modifica');
    fireEvent.click(await screen.findByRole('button', { name: /^Chiudi/ }));
    expect(await screen.findByText('Arrivo: /guida/dungeon/madarame/area/museo-1p?infiltrazione=k-04&planimetria=palazzo-di-madarame-museo-1p')).toBeInTheDocument();
    cleanup();
    montaConArrivo('/guida/mappe/palazzo-di-madarame-museo-1p/modifica');
    fireEvent.click(await screen.findByRole('button', { name: /Apri il visore/ }));
    expect(await screen.findByText('Arrivo: /guida/dungeon/madarame/area/museo-1p?infiltrazione=k-04&planimetria=palazzo-di-madarame-museo-1p')).toBeInTheDocument();
  });
});

it('conserva i campi non salvati cambiando sezione e riapre Spilli quando si seleziona un pin',async()=>{
 api.getMappa.mockResolvedValue({...base,spilli:[nota]});monta();
 fireEvent.click(await screen.findByRole('button',{name:'Nota: Nota'}));
 const form=within(screen.getByRole('region',{name:'Proprietà dello spillo: Nota'}));
 fireEvent.change(form.getByLabelText('Nome'),{target:{value:'Bozza conservata'}});
 fireEvent.click(screen.getByRole('button',{name:'File'}));
 expect(screen.queryByRole('region',{name:'Proprietà dello spillo: Nota'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Spilli'}));
 expect(form.getByLabelText('Nome')).toHaveValue('Bozza conservata');
});

// ---- Visitare l'arrivo senza uscire dalla modifica (2026-09-13) ----
//
// Nell'editor il clic su uno spillo seleziona per modificare, quindi la via d'uscita va data a
// parte: doppio tocco sul pin, elenco dei passaggi, pulsante in cima al pannello.
const passaggio: SpilloDto = { ...nota, id: 11, tipo: 'passaggio', tipoNome: 'Passaggio', nome: 'Banchina Metro', destinazione: { mappa: 'shibuya-banchina', spillo: null }, destinazioneNomi: { mappa: 'Banchina della metropolitana', spillo: null } };

it('il doppio tocco su uno spillo di spostamento apre la mappa d’arrivo, restando in modifica', async () => {
  api.getMappa.mockResolvedValue({ ...base, spilli: [passaggio] });
  monta();
  const pin = await screen.findByRole('button', { name: /Passaggio: Banchina Metro/ });
  expect(pin).toHaveAccessibleName(/doppio tocco per aprire l’arrivo/);
  fireEvent.doubleClick(pin);
  await waitFor(() => expect(api.getMappa).toHaveBeenCalledWith('shibuya-banchina', undefined));
});

/** Monta l'editor di Shibuya con un passaggio in uscita e un arrivo dalla banchina di Yongen-Jaya, apre la scheda
 *  «Collegamenti» e restituisce le query limitate alla regione dei passaggi. */
async function apriCollegamenti() {
  api.getMappa.mockResolvedValue({ ...base, spilli: [passaggio], arrivi: [{ spilloId: 21, tipo: 'treno', nome: 'Shibuya', mappa: 'yongen-banchina', mappaNome: 'Banchina di Yongen-Jaya' }] });
  monta();
  fireEvent.click(await screen.findByRole('button', { name: 'Collegamenti' }));
  return within(screen.getByRole('region', { name: 'Passaggi da e verso questa mappa' }));
}

it('la scheda Collegamenti porta alla mappa dove va un passaggio in uscita', async () => {
  const passaggi = await apriCollegamenti();
  fireEvent.click(passaggi.getByRole('button', { name: /Apri Banchina della metropolitana, dove porta/ }));
  await waitFor(() => expect(api.getMappa).toHaveBeenCalledWith('shibuya-banchina', undefined));
});

it('la scheda Collegamenti porta anche alla mappa da cui si arriva qui', async () => {
  const passaggi = await apriCollegamenti();
  fireEvent.click(passaggi.getByRole('button', { name: /Apri Banchina di Yongen-Jaya, da cui porta/ }));
  await waitFor(() => expect(api.getMappa).toHaveBeenCalledWith('yongen-banchina', undefined));
});

it('«Apri l’arrivo» sta in cima al pannello dello spillo, prima dei campi', async () => {
  api.getMappa.mockResolvedValue({ ...base, spilli: [passaggio] });
  monta();
  fireEvent.click(await screen.findByRole('button', { name: /Passaggio: Banchina Metro/ }));
  const scheda = screen.getByRole('region', { name: 'Proprietà dello spillo: Banchina Metro' });
  const apri = within(scheda).getByRole('button', { name: /Apri l’arrivo/ });
  const nome = within(scheda).getByLabelText('Nome');
  expect(apri.compareDocumentPosition(nome) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(apri);
  await waitFor(() => expect(api.getMappa).toHaveBeenCalledWith('shibuya-banchina', undefined));
});

// ---- Confermare il nome di una mappa mai rivista (2026-09-13) ----
//
// Chi il nome l'aveva già corretto prima della 082 non aveva più niente da cambiare: il testo era
// già giusto, «Salva» restava spento e in alto continuava a leggersi il nome dell'estrazione.
const nonRivista: MappaDto = { ...base, nome: 'Sottopasso', nomeRivisto: false, area: { chiave: 'citta/shibuya/sottopasso', contenitore: { tipo: 'quartiere' as const, chiave: 'shibuya', nome: 'Shibuya' }, slug: 'sottopasso', nome: 'Sottopasso', versioneEtichetta: 'planimetria completa', versioneOrdine: 1, predefinita: false, casa: '/guida/citta/shibuya/sottopasso' }, versione: { etichetta: 'planimetria completa', ordine: 1 } };

it('una mappa mai rivista dice quale nome si legge in alto e lascia «Salva» attivo per confermarlo', async () => {
  api.getMappa.mockResolvedValue(nonRivista);
  api.aggiornaMappa.mockResolvedValue({ ...nonRivista, nomeRivisto: true });
  monta();
  fireEvent.click(await screen.findByRole('button', { name: 'Mappa' }));
  const scheda = within(screen.getByRole('region', { name: 'Proprietà della mappa' }));
  expect(scheda.getByRole('status')).toHaveTextContent('In alto si legge «Sottopasso — planimetria completa»');
  const salva = scheda.getByRole('button', { name: /Salva mappa/ });
  expect(salva).toBeEnabled();
  fireEvent.click(salva);
  await waitFor(() => expect(api.aggiornaMappa).toHaveBeenCalledWith('citta-shibuya', expect.objectContaining({ nome: 'Sottopasso' })));
});

it('una mappa già rivista non mostra l’avviso e torna a «Salva» solo dopo una modifica', async () => {
  api.getMappa.mockResolvedValue({ ...nonRivista, nomeRivisto: true });
  monta();
  fireEvent.click(await screen.findByRole('button', { name: 'Mappa' }));
  const scheda = within(screen.getByRole('region', { name: 'Proprietà della mappa' }));
  expect(scheda.queryByRole('status')).toBeNull();
  expect(scheda.getByRole('button', { name: /Salva mappa/ })).toBeDisabled();
});

// ---- La vista del giorno corrente (interruttore acceso/spento) ----

it('l’interruttore del giorno corrente è spento e senza partita non si può accendere', async () => {
  usePartitaStore.setState({ attiva: null });
  api.getMappa.mockResolvedValue(base);
  monta();
  const interruttore = await screen.findByRole('button', { name: /Giorno corrente/ });
  expect(interruttore).toBeDisabled();
  expect(interruttore).toHaveAttribute('aria-pressed', 'false');
  await waitFor(() => expect(api.getMappa).toHaveBeenCalledWith('citta-shibuya', undefined));
});

it('acceso, la mappa si rilegge con la partita attiva: è così che si nasconde quel che oggi non c’è', async () => {
  usePartitaStore.setState({ attiva: { id: 7, nome: 'Royal' } as PartitaDto });
  api.getMappa.mockResolvedValue(base);
  monta();
  const interruttore = await screen.findByRole('button', { name: /Giorno corrente/ });
  expect(interruttore).not.toBeDisabled();
  fireEvent.click(interruttore);
  await waitFor(() => expect(api.getMappa).toHaveBeenCalledWith('citta-shibuya', 7));
  expect(screen.getByRole('button', { name: /Giorno corrente/ })).toHaveAttribute('aria-pressed', 'true');
});
