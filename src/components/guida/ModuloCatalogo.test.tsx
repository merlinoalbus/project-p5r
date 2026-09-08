// @vitest-environment jsdom
// ============================================================
// Test ModuloCatalogo — aggiunta e correzione di negozi e articoli dall'interfaccia (16.1)
// ============================================================

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ModuloCatalogo } from './ModuloCatalogo';
import type { ElementoCatalogoDto } from '../../types';

const api = vi.hoisted(() => ({
  creaElementoCatalogo: vi.fn(), aggiornaElementoCatalogo: vi.fn(),
  eliminaElementoCatalogo: vi.fn(), nascondiElementoCatalogo: vi.fn(),
}));
vi.mock('./CondizioniEditor',()=>({CondizioniEditor:()=>null}));
vi.mock('../../services/api', () => api);
vi.mock('../../services/api/compendio', () => ({ getQuartieri: vi.fn().mockResolvedValue([{ chiave: 'shibuya', nome: 'Shibuya' }, { chiave: 'shinjuku', nome: 'Shinjuku' }]) }));
const { notifica } = vi.hoisted(() => ({ notifica: vi.fn() }));
vi.mock('../../stores/notificationStore', () => ({ notifica }));
// L'archivio unico da cui si sceglie l'oggetto: un libro e un'arma, di due fonti diverse.
// `vi.hoisted` perche' la fabbrica di `vi.mock` viene issata in cima al file.
const { oggetti } = vi.hoisted(() => ({ oggetti: [
  { chiave: 'magnifico-ladro', fonte: 'libri', categoria: 'libro', nome: 'Il magnifico ladro', nomeIt: 'Il magnifico ladro', effetto: 'Alza Conoscenza', statistiche: 'Conoscenza ♪♪ · 3 sessioni', per: null, prezzo: 1200 },
  { chiave: '7', fonte: 'equipaggiamento', categoria: 'arma', nome: 'Paradise Lost', nomeIt: 'Paradiso perduto', effetto: 'Attacco altissimo', statistiche: null, per: 'Solo Joker', prezzo: null },
] }));
vi.mock('../../services/api/catalogo', () => ({ getTuttiGliOggetti: vi.fn().mockResolvedValue(oggetti) }));

const negozioSeed: ElementoCatalogoDto = {
  tipo: 'negozio', chiave: 'untouchable', nome: 'Untouchable', origine: 'seed', modificata: false, nascosta: false, aggiornata: null,
  dati: { nome: 'Untouchable', tipo: 'armi', luogo: 'Shibuya, retro', gestore: 'Munehisa Iwai', orari: null, sblocco: null, note: null, fonte: null },
};

describe('ModuloCatalogo', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    notifica.mockReset();
  });

  /* **Collega, non copia.** Il difetto che questa prova sorveglia era invisibile: il selettore c'era,
   * l'elenco si apriva, si sceglieva una voce — e non succedeva niente. Riempiva `nome` con lo
   * stesso nome gia' digitato e metteva stringhe vuote in effetto e statistiche, perche' per i libri
   * la sorgente li dava tutti `null`. Sembrava rotto ed era peggio: faceva quel che era stato
   * scritto per fare, cioe' copiare campi vuoti.
   *
   * Ora la riga porta `oggetto_fonte` e `oggetto_chiave`, e i dati dell'oggetto si leggono da li'. */
  it('collega l’articolo a un oggetto di qualunque tipo, e salva il legame invece dei campi copiati', async () => {
    api.creaElementoCatalogo.mockResolvedValue({ ...negozioSeed, tipo: 'articolo', chiave: 'biblioteca/il-magnifico-ladro', nome: 'Il magnifico ladro', origine: 'utente' });
    render(<ModuloCatalogo tipo="articolo" negozioChiave="biblioteca" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    // Si cerca per nome, senza aver scelto prima nessuna categoria: l'archivio e' uno solo.
    fireEvent.change(await screen.findByLabelText('Cerca l’oggetto'), { target: { value: 'magnifico' } });
    fireEvent.click(await screen.findByRole('button', { name: /Il magnifico ladro/ }));

    // I dati dell'oggetto si vedono, e non sono digitabili.
    expect(await screen.findByText('Oggetto collegato')).toBeInTheDocument();
    expect(screen.getByText('Conoscenza ♪♪ · 3 sessioni')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nome dell'articolo/)).toBeNull();

    fireEvent.change(screen.getByLabelText('Prezzo in yen'), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenCalled());
    const [, dati] = api.creaElementoCatalogo.mock.calls[0];
    expect(dati).toMatchObject({ oggetto_fonte: 'libri', oggetto_chiave: 'magnifico-ladro', categoria: 'libro', prezzo: 900 });
  });

  it('crea un articolo agganciato al negozio da cui è stato aperto', async () => {
    api.creaElementoCatalogo.mockResolvedValue({ ...negozioSeed, tipo: 'articolo', chiave: 'untouchable/u-coltello', nome: 'Coltello', origine: 'utente' });
    const onSalvato = vi.fn();
    render(<ModuloCatalogo tipo="articolo" negozioChiave="untouchable" onChiudi={vi.fn()} onSalvato={onSalvato} />);
    expect(screen.getByText('Nuovo articolo')).toBeInTheDocument();
    // Il nome non si digita finche' non si e' detto che l'oggetto non esiste: prima si sceglie.
    expect(screen.queryByLabelText(/Nome dell'articolo/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Non c’è: lo inserisco' }));
    fireEvent.change(screen.getByLabelText(/Nome dell'articolo/), { target: { value: 'Coltello da combattimento' } });
    fireEvent.change(screen.getByLabelText('Prezzo in yen'), { target: { value: '3000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenCalled());
    const [tipo, dati] = api.creaElementoCatalogo.mock.calls[0];
    expect(tipo).toBe('articolo');
    expect(dati).toMatchObject({ nome: 'Coltello da combattimento', prezzo: 3000, negozio_chiave: 'untouchable', categoria: 'altro', oggetto_fonte: null, oggetto_chiave: null });
    expect(onSalvato).toHaveBeenCalled();
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('aggiunto'));
  });

  it('non si salva senza nome', () => {
    render(<ModuloCatalogo tipo="negozio" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Salva' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Nome del negozio'), { target: { value: 'Chiosco' } });
    expect(screen.getByRole('button', { name: 'Salva' })).toBeEnabled();
  });

  it('correggendo una riga della guida spiega che la correzione sopravvive agli aggiornamenti', async () => {
    api.aggiornaElementoCatalogo.mockResolvedValue({ ...negozioSeed, modificata: true });
    render(<ModuloCatalogo tipo="negozio" elemento={negozioSeed} onChiudi={vi.fn()} onSalvato={vi.fn()} />);
    expect(screen.getByText('Negozio: Untouchable')).toBeInTheDocument();
    expect(screen.getByText(/la correzione resterà anche dopo gli aggiornamenti/)).toBeInTheDocument();
    // una riga del seed intatta non si può eliminare: si può solo correggere o nascondere
    expect(screen.queryByRole('button', { name: /Elimina|Ripristina/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('Orari'), { target: { value: 'sempre aperto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaElementoCatalogo).toHaveBeenCalledWith('negozio', 'untouchable', expect.objectContaining({ orari: 'sempre aperto', nome: 'Untouchable' })));
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

it('salva il quartiere scelto, senza dedurlo dalla posizione testuale', async () => {
  api.creaElementoCatalogo.mockResolvedValue({ nome: 'Chiosco' });
  render(<ModuloCatalogo tipo="negozio" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
  await screen.findByRole('option', { name: 'Shibuya' });
  fireEvent.change(screen.getByLabelText('Nome del negozio'), { target: { value: 'Chiosco' } });
  fireEvent.change(screen.getByLabelText('Quartiere'), { target: { value: 'shibuya' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenLastCalledWith('negozio', expect.objectContaining({ luogo_chiave: 'shibuya' })));
});

// ============================================================
// Le Doti di un'attività: il campo che l'app sa usare
// ============================================================
//
// «Premi: Coraggio +3» è una frase e resta una frase. La Dote dichiarata con le sue note (♪) è
// invece quello che il motore converte in punti quando l'azione viene spuntata nella guida giorno
// per giorno. Il modulo non lo mostrava per le attività e i videogiochi: si potevano aggiungere
// senza poter dire che cosa alzano — il rilievo dell'utente («non è pensata per la parte
// funzionale dell'app»).
it('dichiara le Doti di un’attività come elenco strutturato, non come testo dei premi', async () => {
  api.creaElementoCatalogo.mockResolvedValue({ nome: 'Freccette' });
  render(<ModuloCatalogo tipo="attivita" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
  fireEvent.change(screen.getByLabelText(/Nome dell’attività/), { target: { value: 'Freccette' } });
  fireEvent.click(screen.getByRole('button', { name: /Aggiungi una Dote/ }));
  fireEvent.change(screen.getByLabelText('Dote'), { target: { value: 'coraggio' } });
  fireEvent.change(screen.getByLabelText('Note'), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenLastCalledWith('attivita', expect.objectContaining({
    // L'elenco, non la stringa: è l'API a serializzarlo.
    doti_json: [{ dote: 'coraggio', note: 3, condizione: null }],
  })));
});

it('non salva le righe di Dote lasciate vuote', async () => {
  api.creaElementoCatalogo.mockResolvedValue({ nome: 'Pesca' });
  render(<ModuloCatalogo tipo="attivita" onChiudi={vi.fn()} onSalvato={vi.fn()} />);
  fireEvent.change(screen.getByLabelText(/Nome dell’attività/), { target: { value: 'Pesca' } });
  fireEvent.click(screen.getByRole('button', { name: /Aggiungi una Dote/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(api.creaElementoCatalogo).toHaveBeenLastCalledWith('attivita', expect.objectContaining({ doti_json: [] })));
});
