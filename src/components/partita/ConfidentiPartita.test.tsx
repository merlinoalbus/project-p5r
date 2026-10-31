// @vitest-environment jsdom
// ============================================================
// Test ConfidentiPartita — note della risposta, bonus arcano dalla scorta, soglie, annulla ultimo
// ============================================================

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConfidentiPartita } from './ConfidentiPartita';
import type { ConfidentePartitaDto, ModificaConfidente } from '../../types';

const { getConfidentiPartita, aggiornaConfidente, getImmagini, confermaRequisitoConfidente, getRichieste, correggiRequisitoRichiesta } = vi.hoisted(() => ({
  getRichieste: vi.fn(),
  correggiRequisitoRichiesta: vi.fn(),
  confermaRequisitoConfidente: vi.fn(),
  getConfidentiPartita: vi.fn(),
  aggiornaConfidente: vi.fn(),
  getImmagini: vi.fn(),
}));
vi.mock('../../services/api', (vero) => moduloApi(vero, {
  getConfidentiPartita,
  confermaRequisitoConfidente,
  aggiornaConfidente,
  getImmagini,
  caricaImmagine: vi.fn(),
  eliminaImmagine: vi.fn(),
  importaImmagineDaUrl: vi.fn(),
  getRichieste,
  correggiRequisitoRichiesta,
  
}));

/** Confidente di prova (Ryuji, Carro, sbloccato al rango 2 senza punti né semafori), con i campi di `sovrascrivi` che sostituiscono i predefiniti. */
function confidente(sovrascrivi: Partial<ConfidentePartitaDto>): ConfidentePartitaDto {
  return {
    chiave: 'ryuji', nome: 'Ryuji Sakamoto', arcana: 'Chariot', arcanaNome: 'Carro', ordine: 7,
    sbloccato: true, rango: 2, punti: 0, puntiNecessari: 20, mancanti: 20, regaliFatti: [], regalabile: true, romanzabile: false, relazioneRomantica: false, personaArcanoInScorta: false, note: '', semafori: [], bloccato: null, updatedAt: null,
    ...sovrascrivi,
  };
}

beforeEach(() => {
  getConfidentiPartita.mockReset();
  aggiornaConfidente.mockReset();
  getImmagini.mockReset();
  getImmagini.mockResolvedValue([]);
});

describe('ConfidentiPartita', () => {
  it('un Confidente bloccato dai requisiti è spento, mostra i motivi e non permette «+» né lo sblocco', async () => {
    getConfidentiPartita.mockResolvedValue([
      confidente({ chiave: 'makoto', nome: 'Makoto Niijima', arcana: 'Priestess', arcanaNome: 'Papessa', sbloccato: false, rango: 0, bloccato: { rango: 1, motivi: ['Dote sociale Conoscenza a rango 3. (Conoscenza: rango 1 di 3)', '26 luglio (oggi è il 04-09)'] } }),
      confidente({}),
    ]);
    render(<MemoryRouter><ConfidentiPartita partitaId={7} /></MemoryRouter>);
    const carta = await screen.findByRole('listitem', { name: 'Makoto Niijima: bloccato per il rango 1' });
    expect(carta).toHaveClass('poster--bloccato');
    expect(within(carta).getByText('Dote sociale Conoscenza a rango 3. (Conoscenza: rango 1 di 3)')).toBeInTheDocument();
    expect(within(carta).getByRole('button', { name: /Rango di Makoto Niijima più uno/ })).toBeDisabled();
    expect(within(carta).getByRole('button', { name: /Makoto Niijima: bloccato/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rango di Ryuji Sakamoto più uno' })).not.toBeDisabled();
    // due gruppi: il bloccato sta in fondo, in «Non ancora disponibili»
    const attivi = screen.getByRole('region', { name: 'Attivi e sbloccabili' });
    const bloccati = screen.getByRole('region', { name: 'Non ancora disponibili' });
    expect(within(attivi).getByText('Ryuji Sakamoto')).toBeInTheDocument();
    expect(within(bloccati).getByText('Makoto Niijima')).toBeInTheDocument();
    expect(attivi.compareDocumentPosition(bloccati) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // via d'uscita esplicita: forza il rango bloccato
    aggiornaConfidente.mockResolvedValue(confidente({ chiave: 'makoto', nome: 'Makoto Niijima', rango: 1, sbloccato: true, bloccato: null }));
    await act(async () => { fireEvent.click(within(bloccati).getByRole('button', { name: /segna comunque il rango 1/i })); });
    expect(aggiornaConfidente).toHaveBeenCalledWith(7, 'makoto', { rango: 1, forza: true });
  });

  it('propone il bonus arcano dalla scorta e invia note, moltiplicatori e annulla ultimo', async () => {
    getConfidentiPartita.mockResolvedValue([confidente({ regaliFatti: [], personaArcanoInScorta: true })]);
    aggiornaConfidente.mockResolvedValueOnce(confidente({ regaliFatti: [], personaArcanoInScorta: true, punti: 15, mancanti: 5 }));
    render(<MemoryRouter><ConfidentiPartita partitaId={1} /></MemoryRouter>);

    const chip = await screen.findByRole('button', { name: 'Persona Carro ×1,5 · in scorta' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    // anteprime con bonus: 7,5 / 15 / 22,5; regalo 75; uscita 15
    expect(screen.getByLabelText('Ryuji Sakamoto: risposta da 1 nota (7,5 punti)')).toBeInTheDocument();
    // ondata 5: il pulsante di ripiego non c'è più; «Regala» apre la finestra dell'oggetto (Ryuji riceve regali)
    expect(screen.getByLabelText('Ryuji Sakamoto: regala un oggetto (75 punti)')).toBeInTheDocument();

    await act(async () => { screen.getByLabelText('Ryuji Sakamoto: risposta da 2 note (15 punti)').click(); });
    expect(aggiornaConfidente).toHaveBeenCalledWith(1, 'ryuji', { noteRisposta: 2, bonusArcano: true, invito: false } satisfies ModificaConfidente);
    expect(await screen.findByText(/mancano/)).toHaveTextContent('mancano 5');
    expect(screen.getByRole('button', { name: /annulla l'ultimo incremento/ })).toHaveTextContent('Annulla ultimo (−15)');

    // esami 1º ×1,5 e invito ×1,2 cumulativi: 5 × 1,5 × 1,5 × 1,2 = 13,5
    await act(async () => { screen.getByRole('button', { name: 'Esami 1º ×1,5' }).click(); });
    await act(async () => { screen.getByRole('button', { name: 'Invito SMS ×1,2' }).click(); });
    expect(screen.getByLabelText('Ryuji Sakamoto: risposta da 1 nota (13,5 punti)')).toBeInTheDocument();

    aggiornaConfidente.mockResolvedValueOnce(confidente({ regaliFatti: [], personaArcanoInScorta: true, punti: 0, mancanti: 20 }));
    await act(async () => { screen.getByRole('button', { name: /annulla l'ultimo incremento/ }).click(); });
    expect(aggiornaConfidente).toHaveBeenLastCalledWith(1, 'ryuji', { deltaPunti: -15 });
  });

  it('senza Persona in scorta il bonus è spento ma forzabile', async () => {
    getConfidentiPartita.mockResolvedValue([confidente({})]);
    render(<MemoryRouter><ConfidentiPartita partitaId={1} /></MemoryRouter>);
    const chip = await screen.findByRole('button', { name: 'Persona Carro ×1,5 · attiva a mano' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Ryuji Sakamoto: risposta da 3 note (15 punti)')).toBeInTheDocument();
    await act(async () => { chip.click(); });
    expect(screen.getByLabelText('Ryuji Sakamoto: risposta da 3 note (22,5 punti)')).toBeInTheDocument();
  });

  it('L13 (O10-3): «Relazione romantica» solo per un Confidente romanzabile dal rango 9 (o con la relazione già segnata), con il solo campo', async () => {
    getConfidentiPartita.mockResolvedValue([
      confidente({ chiave: 'takemi', nome: 'Tae Takemi', arcana: 'Death', arcanaNome: 'Morte', rango: 9, romanzabile: true }),
      confidente({ chiave: 'ann', nome: 'Ann Takamaki', arcana: 'Lovers', arcanaNome: 'Amanti', rango: 8, romanzabile: true }),
      confidente({ rango: 9 }),
    ]);
    aggiornaConfidente.mockResolvedValue(confidente({ chiave: 'takemi', nome: 'Tae Takemi', arcana: 'Death', arcanaNome: 'Morte', rango: 9, romanzabile: true, relazioneRomantica: true }));
    render(<MemoryRouter><ConfidentiPartita partitaId={1} /></MemoryRouter>);
    const interruttore = await screen.findByRole('button', { name: 'Tae Takemi: relazione romantica non iniziata (tocca per segnarla)' });
    expect(interruttore).toHaveAttribute('aria-pressed', 'false');
    // prima del rango 9 e per chi non è romanzabile nessun interruttore
    expect(screen.queryByRole('button', { name: /Ann Takamaki: relazione romantica/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Ryuji Sakamoto: relazione romantica/ })).toBeNull();
    await act(async () => { interruttore.click(); });
    expect(aggiornaConfidente).toHaveBeenCalledWith(1, 'takemi', { relazioneRomantica: true } satisfies ModificaConfidente);
    expect(await screen.findByRole('button', { name: 'Tae Takemi: relazione romantica iniziata (tocca per toglierla)' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('distingue passaggi non a punti, Confidenti senza soglie e rango massimo', async () => {
    getConfidentiPartita.mockResolvedValue([
      confidente({ rango: 1, puntiNecessari: 0, mancanti: 0 }),
      confidente({ chiave: 'igor', nome: 'Igor', arcana: 'Fool', arcanaNome: 'Matto', rango: 0, sbloccato: false, puntiNecessari: null, mancanti: null }),
      confidente({ chiave: 'morgana', nome: 'Morgana', arcana: 'Magician', arcanaNome: 'Mago', rango: 10, puntiNecessari: null, mancanti: null }),
    ]);
    render(<MemoryRouter><ConfidentiPartita partitaId={1} /></MemoryRouter>);
    expect(await screen.findByText(/Il passaggio al rango 2 non dipende dai punti/)).toBeInTheDocument();
    const cards = screen.getAllByRole('listitem');
    expect(within(cards[1]).queryByText(/Punti verso il rango/)).not.toBeInTheDocument();
    // stati sempre spiegati: non sbloccato, rango massimo
    expect(within(cards[1]).getByText(/Confidente non ancora sbloccato/)).toBeInTheDocument();
    expect(within(cards[2]).getByText('Rango massimo raggiunto.')).toBeInTheDocument();
    expect(within(cards[2]).getByText('MAX')).toBeInTheDocument();
    expect(within(cards[2]).getByLabelText('Rango di Morgana più uno')).toBeDisabled();
    // rango > 0 → l'interruttore «Sbloccato» non è modificabile; a rango 0 senza requisiti mancanti resta «Da sbloccare»
    expect(within(cards[0]).getByRole('button', { name: /: sbloccato$/ })).toBeDisabled();
    expect(within(cards[1]).getByRole('button', { name: /: da sbloccare quando lo incontri$/ })).toBeEnabled();
  });
});

describe('ConfidentiPartita — due gesti ravvicinati (B3", validazione voce 2)', () => {
  /** Il Confidente Ann Takamaki (Amanti) al rango dato. */
  const ann = (rango: number) => confidente({ chiave: 'ann', nome: 'Ann Takamaki', arcana: 'Lovers', arcanaNome: 'Amanti', ordine: 6, rango });
  /** Il testo del rango («Rango N» o «Rango MAX») mostrato nella voce d'elenco del Confidente con il nome dato. */
  const rangoDi = (nome: string) => within(screen.getAllByRole('listitem').find((li) => within(li).queryByText(nome))!).getByText(/^Rango \d|^Rango MAX/).textContent;

  it('il rango di un Confidente arrivato dopo quello di un altro non riporta indietro il secondo (salva)', async () => {
    getConfidentiPartita.mockResolvedValue([confidente({}), ann(1)]);
    let rispondiRyuji!: (c: ConfidentePartitaDto) => void;
    aggiornaConfidente.mockImplementation((_id: number, chiave: string) => (chiave === 'ryuji'
      ? new Promise<ConfidentePartitaDto>((ok) => { rispondiRyuji = ok; })
      : Promise.resolve(ann(2))));
    render(<MemoryRouter><ConfidentiPartita partitaId={7} /></MemoryRouter>);
    await screen.findByText('Ryuji Sakamoto');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Rango di Ryuji Sakamoto più uno' })); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Rango di Ann Takamaki più uno' })); });
    expect(rangoDi('Ann Takamaki')).toBe('Rango 2');
    await act(async () => { rispondiRyuji(confidente({ rango: 3 })); });
    expect(rangoDi('Ryuji Sakamoto')).toBe('Rango 3');
    expect(rangoDi('Ann Takamaki')).toBe('Rango 2');
  });

  it('la conferma di un requisito arrivata dopo il rango di un altro Confidente non lo riporta indietro (conferma)', async () => {
    const requisito = { indice: 0, tipo: 'evento', testo: 'Evento della storia', stato: 'grigio' as const, dettaglio: '', manuale: true, confermato: false };
    /** Ryuji con il semaforo del rango 3 legato al requisito manuale, pronto e confermato secondo `confermato`. */
    const conSemaforo = (confermato: boolean) => confidente({ semafori: [{ rango: 3, pronto: confermato, requisiti: [{ ...requisito, confermato }] }] });
    getConfidentiPartita.mockResolvedValue([conSemaforo(false), ann(1)]);
    let rispondiConferma!: (c: ConfidentePartitaDto) => void;
    confermaRequisitoConfidente.mockImplementation(() => new Promise<ConfidentePartitaDto>((ok) => { rispondiConferma = ok; }));
    aggiornaConfidente.mockResolvedValue(ann(2));
    render(<MemoryRouter><ConfidentiPartita partitaId={7} /></MemoryRouter>);
    await screen.findByText('Ryuji Sakamoto');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Condizione soddisfatta/ })); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Rango di Ann Takamaki più uno' })); });
    expect(rangoDi('Ann Takamaki')).toBe('Rango 2');
    await act(async () => { rispondiConferma(conSemaforo(true)); });
    expect(screen.getByRole('button', { name: /Confermato/ })).toBeInTheDocument();
    expect(rangoDi('Ann Takamaki')).toBe('Rango 2');
  });
});

describe('ConfidentiPartita — requisito da correggere (2026-10-11)', () => {
  it('«Correggi» su un requisito rimasto su una Richiesta che non c’è più apre la finestra; corretto, l’elenco si rilegge', async () => {
    const rotto = { indice: 0, tipo: 'richiesta', testo: 'Completare la richiesta «Un fidanzato violento»', stato: 'grigio' as const, dettaglio: 'La Richiesta «Un fidanzato violento» non c’è più: correggi quel che la cita', manuale: false, confermato: false };
    getConfidentiPartita.mockReset().mockResolvedValue([confidente({ semafori: [{ rango: 3, pronto: false, requisiti: [rotto] }] })]);
    getRichieste.mockResolvedValue({ richieste: [{ chiave: 'lo-zio-ingordo', nome: 'Lo zio ingordo', areaNome: null }], jose: null, dedali: [], completate: 0, totale: 1, collocazioni: [] });
    correggiRequisitoRichiesta.mockResolvedValue(undefined);
    render(<MemoryRouter><ConfidentiPartita partitaId={7} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Correggi/ }));
    const finestra = await screen.findByRole('dialog', { name: /^Correggi il requisito · .+, rango 3$/ });
    fireEvent.click(within(finestra).getByRole('combobox', { name: 'Richiesta da citare al suo posto' }));
    fireEvent.click(within(screen.getByRole('listbox', { name: 'Richiesta da citare al suo posto' })).getByRole('option', { name: /^Lo zio ingordo/ }));
    const letture = getConfidentiPartita.mock.calls.length;
    await act(async () => { fireEvent.click(within(finestra).getByRole('button', { name: /^Salva/ })); });
    expect(correggiRequisitoRichiesta).toHaveBeenCalledWith(expect.any(String), 3, 0, 'lo-zio-ingordo');
    expect(getConfidentiPartita.mock.calls.length).toBeGreaterThan(letture);
  });
});
