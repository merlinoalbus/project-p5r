// @vitest-environment jsdom
// ============================================================
// Test ModuloCatalogo — il guscio e i moduli per tipo: negozio, articolo, attività, film
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { scegliVoce, vociSelettore } from '../../../test/selettore';
import { ModuloCatalogo } from './ModuloCatalogo';
import type { ElementoCatalogoDto } from '../../types';

const api = vi.hoisted(() => ({
  creaElementoCatalogo: vi.fn(), aggiornaElementoCatalogo: vi.fn(),
  eliminaElementoCatalogo: vi.fn(), nascondiElementoCatalogo: vi.fn(),
}));
vi.mock('./CondizioniEditor', () => ({ CondizioniEditor: () => null }));
vi.mock('../../services/api', () => api);
vi.mock('../../services/api/compendio', () => ({
  getQuartieri: vi.fn().mockResolvedValue([{ chiave: 'shibuya', nome: 'Shibuya' }, { chiave: 'shinjuku', nome: 'Shinjuku' }]),
  getLuoghi: vi.fn().mockResolvedValue([{ chiave: 'shibuya/untouchable', nome: 'Untouchable', tipo: 'negozio', quartiere: 'shibuya', quartiereNome: 'Shibuya' }]),
  getAttivita: vi.fn().mockResolvedValue({ attivita: [] }),
  getConfidenti: vi.fn().mockResolvedValue([{ chiave: 'iwai', nome: 'Munehisa Iwai', arcana: 'hanged', arcanaNome: 'Appeso', ordine: 1 }]),
}));
const { notifica } = vi.hoisted(() => ({ notifica: vi.fn() }));
vi.mock('../../stores/notificationStore', () => ({ notifica }));
// L'archivio unico da cui si sceglie l'oggetto: un libro e un'arma, di due fonti diverse.
const { oggetti } = vi.hoisted(() => ({ oggetti: [
  { chiave: 'magnifico-ladro', fonte: 'libri', categoria: 'libro', nome: 'Il magnifico ladro', nomeIt: 'Il magnifico ladro', effetto: 'Alza Conoscenza', statistiche: 'Conoscenza ♪♪ · 3 sessioni', per: null, prezzo: 1200 },
  { chiave: '7', fonte: 'equipaggiamento', categoria: 'arma', nome: 'Paradise Lost', nomeIt: 'Paradiso perduto', effetto: 'Attacco altissimo', statistiche: null, per: 'Solo Joker', prezzo: null },
] }));
vi.mock('../../services/api/catalogo', () => ({ getTuttiGliOggetti: vi.fn().mockResolvedValue(oggetti) }));

const negozioSeed: ElementoCatalogoDto = {
  tipo: 'negozio', chiave: 'untouchable', nome: 'Untouchable', origine: 'seed', modificata: false, nascosta: false, aggiornata: null,
  dati: { nome: 'Untouchable', tipo: 'armi', luogo: 'Shibuya, retro', luogo_chiave: 'shibuya', sede_chiave: 'shibuya/untouchable', gestore: 'Munehisa Iwai', confidente_chiave: 'iwai', orari_json: '{"giorni":[],"fasce":["sera"],"chiusoConPioggia":false,"nota":null}', programma_punti_json: null, note: null },
};

const tessera = (gruppo: string, nome: string | RegExp) => within(screen.getByRole('radiogroup', { name: gruppo })).getByRole('radio', { name: nome });

describe('ModuloCatalogo', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    notifica.mockReset();
  });

  /** L'effetto di un articolo generico si dichiara con la famiglia a tessere e i suoi parametri; la frase la scrive l'app. */
  it('l’effetto di un articolo inserito a mano si dichiara con i parametri, e la frase la scrive l’app', async () => {
    api.creaElementoCatalogo.mockResolvedValue({ ...negozioSeed, tipo: 'articolo', chiave: 'x/y', nome: 'Bibita', origine: 'utente' });
    render(<ModuloCatalogo tipo="articolo" negozioChiave="untouchable" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Non c’è: lo inserisco' }));
    fireEvent.change(screen.getByLabelText(/Nome dell'articolo/), { target: { value: 'Bibita' } });

    fireEvent.click(tessera('Effetto', 'Ripristina HP o SP'));
    scegliVoce('Che cosa ripristina', 'SP');
    fireEvent.change(screen.getByLabelText('Quantità'), { target: { value: '100' } });
    scegliVoce('A chi', 'un alleato');
    // La frase si vede mentre la si costruisce, e sara' quella salvata.
    expect(screen.getByText('Ripristina 100 SP di un alleato')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenCalled());
    const [, dati] = api.creaElementoCatalogo.mock.calls[0];
    expect(dati).toMatchObject({
      effetto: 'Ripristina 100 SP di un alleato',
      effetto_json: { famiglia: 'ripristina', risorsa: 'sp', misura: 'assoluta', valore: 100, bersaglio: 'un-alleato' },
      categoria: 'altro', verificato: false,
    });
    // i valori temporanei del modulo non partono
    expect(Object.keys(dati as object).some((k) => k.startsWith('_'))).toBe(false);
  });

  it('collega l’articolo a un oggetto di qualunque tipo, e salva il legame invece dei campi copiati', async () => {
    api.creaElementoCatalogo.mockResolvedValue({ ...negozioSeed, tipo: 'articolo', chiave: 'biblioteca/il-magnifico-ladro', nome: 'Il magnifico ladro', origine: 'utente' });
    render(<ModuloCatalogo tipo="articolo" negozioChiave="biblioteca" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    // Si cerca per nome nel selettore, senza aver scelto prima nessuna categoria: l'archivio e' uno solo.
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Che cosa vende' })).toBeEnabled());
    scegliVoce('Che cosa vende', /Il magnifico ladro/);

    // I dati dell'oggetto si vedono, e non sono digitabili.
    expect(await screen.findByText('Oggetto collegato')).toBeInTheDocument();
    expect(screen.getByText('Conoscenza ♪♪ · 3 sessioni')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nome dell'articolo/)).toBeNull();

    fireEvent.change(screen.getByLabelText('Prezzo in yen'), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenCalled());
    const [, dati] = api.creaElementoCatalogo.mock.calls[0];
    expect(dati).toMatchObject({ oggetto_fonte: 'libri', oggetto_chiave: 'magnifico-ladro', categoria: 'libro', prezzo: 900, effetto_json: null, statistiche: null });
  });

  it('crea un articolo agganciato al negozio da cui è stato aperto', async () => {
    api.creaElementoCatalogo.mockResolvedValue({ ...negozioSeed, tipo: 'articolo', chiave: 'untouchable/u-coltello', nome: 'Coltello', origine: 'utente' });
    const onSalvato = vi.fn();
    render(<ModuloCatalogo tipo="articolo" negozioChiave="untouchable" onChiudi={vi.fn()} onSalvato={onSalvato} />);
    expect(screen.getByText('Nuovo articolo')).toBeInTheDocument();
    // Il nome non si digita finche' non si e' detto che l'oggetto non esiste: prima si sceglie.
    expect(screen.queryByLabelText(/Nome dell'articolo/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Salva' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Non c’è: lo inserisco' }));
    fireEvent.change(screen.getByLabelText(/Nome dell'articolo/), { target: { value: 'Coltello da combattimento' } });
    fireEvent.click(tessera('Categoria', 'Arma'));
    fireEvent.change(screen.getByLabelText('Prezzo in yen'), { target: { value: '3000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenCalled());
    const [tipo, dati] = api.creaElementoCatalogo.mock.calls[0];
    expect(tipo).toBe('articolo');
    expect(dati).toMatchObject({ nome: 'Coltello da combattimento', prezzo: 3000, negozio_chiave: 'untouchable', categoria: 'arma', oggetto_fonte: null, oggetto_chiave: null, condizioni_json: [] });
    expect(onSalvato).toHaveBeenCalled();
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('aggiunto'));
  });

  it('non si salva senza nome', () => {
    render(<ModuloCatalogo tipo="negozio" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Salva' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Nome del negozio'), { target: { value: 'Chiosco' } });
    expect(screen.getByRole('button', { name: 'Salva' })).toBeEnabled();
  });

  /** Gli orari sono valori: i chip dei giorni e delle fasce, non una frase. Sblocco, condizioni e fonte non ci sono più. */
  it('correggendo un negozio della guida gli orari si toccano come chip e la correzione sopravvive agli aggiornamenti', async () => {
    api.aggiornaElementoCatalogo.mockResolvedValue({ ...negozioSeed, modificata: true });
    render(<ModuloCatalogo tipo="negozio" elemento={negozioSeed} onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    expect(screen.getByText('Negozio: Untouchable')).toBeInTheDocument();
    expect(screen.getByText(/la correzione resterà anche dopo gli aggiornamenti/)).toBeInTheDocument();
    // una riga del seed intatta non si può eliminare: si può solo correggere o nascondere
    expect(screen.queryByRole('button', { name: /Elimina|Ripristina/ })).toBeNull();
    expect(screen.queryByLabelText(/Sblocco|Fonte/)).toBeNull();
    // la fascia salvata è accesa; si aggiunge la domenica e la chiusura con la pioggia
    expect(screen.getByRole('button', { name: 'di sera' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'domenica' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Chiuso nei giorni di pioggia/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaElementoCatalogo).toHaveBeenCalledWith('negozio', 'untouchable', expect.objectContaining({
      nome: 'Untouchable', sede_chiave: 'shibuya/untouchable', luogo_chiave: 'shibuya', confidente_chiave: 'iwai',
      orari_json: { giorni: ['domenica'], fasce: ['sera'], chiusoConPioggia: true, nota: null },
    })));
    const [, , dati] = api.aggiornaElementoCatalogo.mock.calls[0];
    expect(dati).not.toHaveProperty('condizioni_json');
    expect(dati).not.toHaveProperty('sblocco');
  });

  it('dichiara il programma punti di un negozio solo quando c’è', async () => {
    api.creaElementoCatalogo.mockResolvedValue({ nome: 'Vestiti usati' });
    render(<ModuloCatalogo tipo="negozio" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nome del negozio'), { target: { value: 'Vestiti usati' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /programma punti/ }));
    fireEvent.change(screen.getByLabelText('Nome del programma'), { target: { value: 'Tessera' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenLastCalledWith('negozio', expect.objectContaining({ programma_punti_json: { nome: 'Tessera', unita: 'punti', calcolo: 'manuale' } })));
  });

  it('nasconde una riga della guida e ripristina quella corretta', async () => {
    api.nascondiElementoCatalogo.mockResolvedValue(negozioSeed);
    const { unmount } = render(<ModuloCatalogo tipo="negozio" elemento={negozioSeed} onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Nascondi dagli elenchi/ }));
    await waitFor(() => expect(api.nascondiElementoCatalogo).toHaveBeenCalledWith('negozio', 'untouchable', true));
    unmount();

    api.eliminaElementoCatalogo.mockResolvedValue({ esito: 'ripristinata', elemento: negozioSeed });
    render(<ModuloCatalogo tipo="negozio" elemento={{ ...negozioSeed, modificata: true, origine: 'utente' }} onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ripristina dalla guida' }));
    await waitFor(() => expect(api.eliminaElementoCatalogo).toHaveBeenCalledWith('negozio', 'untouchable'));
    expect(notifica).toHaveBeenCalledWith('success', 'Ripristinati i dati della guida.');
  });
});

/** La sede è un luogo della città e porta con sé il quartiere; «solo il quartiere» lascia la sede vuota. */
it('la sede scelta imposta il quartiere; «solo il quartiere» lascia la sede vuota', async () => {
  api.creaElementoCatalogo.mockResolvedValue({ nome: 'Chiosco' });
  render(<ModuloCatalogo tipo="negozio" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
  await waitFor(() => expect(vociSelettore('Sede')).toContain('Shibuya (solo il quartiere)'));
  fireEvent.change(screen.getByLabelText('Nome del negozio'), { target: { value: 'Chiosco' } });
  scegliVoce('Sede', /^Untouchable/);
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenLastCalledWith('negozio', expect.objectContaining({ sede_chiave: 'shibuya/untouchable', luogo_chiave: 'shibuya' })));

  scegliVoce('Sede', 'Shinjuku (solo il quartiere)');
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenLastCalledWith('negozio', expect.objectContaining({ sede_chiave: null, luogo_chiave: 'shinjuku' })));
});

// ============================================================
// Gli effetti di un'attività: il campo che l'app sa usare
// ============================================================
it('dichiara che cosa alza un’attività come elenco di effetti, con la Dote e le note', async () => {
  api.creaElementoCatalogo.mockResolvedValue({ nome: 'Freccette' });
  render(<ModuloCatalogo tipo="attivita" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
  fireEvent.change(screen.getByLabelText(/Nome dell’attività/), { target: { value: 'Freccette' } });
  fireEvent.click(tessera('Tipo', 'Mini-gioco'));
  fireEvent.click(tessera('Quando', 'Di sera'));
  fireEvent.click(screen.getByRole('button', { name: /Aggiungi un effetto/ }));
  scegliVoce('Quale Dote', 'Coraggio');
  scegliVoce('Quante note (♪)', '♪♪♪ (3)');
  expect(screen.getByText(/Effetto 1:/)).toHaveTextContent(/coraggio ♪♪♪/i);
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenLastCalledWith('attivita', expect.objectContaining({
    tipo: 'mini-gioco', fascia: 'sera', tracciamento: 'svolta', paga_yen: null,
    effetti_json: [{ effetto: { famiglia: 'dote', dote: 'coraggio', note: 3 } }],
  })));
});

it('la paga in yen compare solo per un lavoro', () => {
  render(<ModuloCatalogo tipo="attivita" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
  expect(screen.queryByLabelText(/Paga in yen/)).toBeNull();
  fireEvent.click(tessera('Tipo', 'Lavoro part-time'));
  expect(screen.getByLabelText(/Paga in yen/)).toBeInTheDocument();
});

it('un videogioco è un’attività col tipo fissato e i round da contare', async () => {
  api.creaElementoCatalogo.mockResolvedValue({ nome: 'Star Forneus' });
  render(<ModuloCatalogo tipo="videogioco" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
  expect(screen.getByText('Nuovo videogioco')).toBeInTheDocument();
  expect(screen.queryByRole('radiogroup', { name: 'Tipo' })).toBeNull();
  fireEvent.change(screen.getByLabelText(/Nome del videogioco/), { target: { value: 'Star Forneus' } });
  fireEvent.change(screen.getByLabelText(/Round per finirlo/), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenLastCalledWith('attivita', expect.objectContaining({ tipo: 'videogioco', sessioni: 3, tracciamento: 'sessioni' })));
});

/** Al cinema la visione è una e rivedere può valere; in DVD si contano le visioni e «ripetuto» non c'è. */
it('un film al cinema si completa in una visione e offre «vale anche alle volte successive»; un DVD no', async () => {
  api.creaElementoCatalogo.mockResolvedValue({ nome: 'Il ladro' });
  render(<ModuloCatalogo tipo="film" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
  fireEvent.change(screen.getByLabelText(/Titolo del film/), { target: { value: 'Il ladro' } });
  expect(screen.queryByLabelText(/Visioni per completarlo/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Aggiungi un effetto/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Vale anche alle volte successive/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenLastCalledWith('film', expect.objectContaining({
    dove: 'cinema', sessioni: 1, effetti_json: [{ effetto: { famiglia: 'dote', dote: 'conoscenza', note: 1 }, ripetuto: true }],
  })));

  fireEvent.click(tessera('Dove si vede', 'In DVD'));
  expect(screen.getByLabelText(/Visioni per completarlo/)).toHaveValue(2);
  expect(screen.queryByRole('checkbox', { name: /Vale anche alle volte successive/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenLastCalledWith('film', expect.objectContaining({
    dove: 'dvd', sessioni: 2, effetti_json: [{ effetto: { famiglia: 'dote', dote: 'conoscenza', note: 1 } }],
  })));
});
