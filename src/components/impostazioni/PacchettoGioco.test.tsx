// @vitest-environment jsdom
// ============================================================
// Test PacchettoGioco — scaricamento (con copia depositata) e importazione dalla cartella d'appoggio
// ============================================================
//
// Dal browser non parte nessun file: il pacchetto si sceglie fra quelli depositati sul server, che li
// legge dal mount. Restano l'anteprima obbligatoria, il lucchetto e l'esito legato al proprio tentativo.
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PacchettoGioco } from './PacchettoGioco';
import type { AnteprimaPacchettoDto, EsitoImportazionePacchettoDto, StatoIstanzaDto } from '../../types';

const api = vi.hoisted(() => ({ getStatoIstanza: vi.fn(), scaricaPacchettoGioco: vi.fn(), statoImportazionePacchetto: vi.fn(), getDepositoPacchetti: vi.fn(), anteprimaPacchettoDaDeposito: vi.fn(), importaPacchettoDaDeposito: vi.fn() }));
vi.mock('../../services/api', () => api);
const { notifica } = vi.hoisted(() => ({ notifica: vi.fn() }));
vi.mock('../../stores/notificationStore', () => ({ notifica }));
const { carica } = vi.hoisted(() => ({ carica: vi.fn() }));
vi.mock('../../stores/partitaStore', () => ({ usePartitaStore: { getState: () => ({ carica }) } }));

const stato: StatoIstanzaDto = {
  versioneSchema: 79, versioneApp: '0.1.0', versioneSchemaPartite: 4,
  seed: { versione: null, hash: null, caricatoIl: null },
  database: { nome: 'gioco.db', byte: 320_000_000, inMemoria: false }, databasePartite: { nome: 'partite.db', byte: 120_000 },
  immagini: { file: 640, byte: 300_000_000 }, caratteri: { file: 0, byte: 0 }, partite: 2, copieDiSicurezza: 1, vuota: false, completo: true,
};

const anteprima: AnteprimaPacchettoDto = {
  versioneSchema: 78, versioneSchemaCodice: 79, versioneSchemaIstanza: 79, databaseByte: 6_100_000, importabile: true, motivo: null,
  differenze: [{ tabella: 'articolo', istanza: 581, pacchetto: 580 }, { tabella: 'luogo', istanza: 86, pacchetto: 90 }],
  tabelleAssenti: ['tabella_nuova'],
  immagini: { istanza: 640, pacchetto: 13 },
  orfani: [{ tabella: 'acquisto_partita', colonna: 'articolo_chiave', entita: 'articolo', righe: 3, partite: 1, esempi: ['untouchable/u-prova'], nota: null }],
};

const esito: EsitoImportazionePacchettoDto = {
  copiaDiSicurezza: 'prima-del-ripristino-2026', versioneSchemaPacchetto: 78, versioneSchema: 79, migrazioniApplicate: 1, immagini: 640,
  orfani: anteprima.orfani, stato: { ...stato, immagini: { file: 640, byte: 1_000_000 } },
};

/** Nella cartella d'appoggio per il pacchetto ci sono solo database: gli ZIP sono affare dell'altra card. */
const DEPOSITO = {
  disponibile: true,
  cartella: '/deposito',
  motivo: null,
  file: [
    { nome: 'project-p5r-gioco-2026-09-12.db', byte: 326_778_880, modificatoIl: '2026-09-12T18:00:00.000Z' },
    { nome: 'project-p5r-gioco-2026-09-01.db', byte: 300_000_000, modificatoIl: '2026-09-01T10:00:00.000Z' },
  ],
};

/** Cerca nel deposito e porta fino alla finestra di conferma sul primo file. */
async function finoAllaConferma() {
  api.getDepositoPacchetti.mockResolvedValue(DEPOSITO);
  api.anteprimaPacchettoDaDeposito.mockResolvedValue(anteprima);
  render(<PacchettoGioco />);
  await screen.findByText(/schema 79/);
  fireEvent.click(screen.getByRole('button', { name: /Cerca i file disponibili/ }));
  await screen.findByRole('combobox', { name: /File in \/deposito/ });
  fireEvent.click(screen.getByRole('button', { name: /Importa il file scelto/ }));
  return screen.findByRole('dialog', { name: 'Importare il pacchetto di gioco?' });
}

describe('PacchettoGioco', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    notifica.mockReset(); carica.mockReset();
    api.getStatoIstanza.mockResolvedValue(stato);
    api.statoImportazionePacchetto.mockResolvedValue({ inCorso: false, operazione: null, fase: null, iniziataIl: null, ultima: null });
    URL.createObjectURL = vi.fn(() => 'blob:finto');
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('mostra lo stato dei dati di gioco, scarica e dice dove è finita la copia', async () => {
    api.scaricaPacchettoGioco.mockResolvedValue({ nome: 'project-p5r-gioco.db', blob: new Blob(['x']), depositato: 'project-p5r-gioco-2026-09-12.db' });
    render(<PacchettoGioco />);
    expect(await screen.findByText(/gioco\.db · 305,2 MB · schema 79/)).toBeInTheDocument();
    expect(screen.getByText('640 · 286,1 MB')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Scarica il pacchetto di gioco/ }));
    await waitFor(() => expect(api.scaricaPacchettoGioco).toHaveBeenCalled());
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('project-p5r-gioco-2026-09-12.db'));
  });

  it('non si carica più niente dal browser: nessun pulsante di caricamento né campo per un indirizzo', async () => {
    render(<PacchettoGioco />);
    await screen.findByText(/schema 79/);
    expect(screen.queryByRole('button', { name: /Importa un pacchetto/ })).toBeNull();
    expect(screen.queryByLabelText('Pacchetto di gioco da importare')).toBeNull();
    expect(screen.queryByRole('button', { name: /Importa da indirizzo/ })).toBeNull();
  });

  it('dalla cartella d’appoggio: elenca i database, li fa scegliere e l’import lo fa il server', async () => {
    api.importaPacchettoDaDeposito.mockResolvedValue(esito);
    const finestra = await finoAllaConferma();
    expect(screen.getByRole('combobox', { name: /File in \/deposito \(2\)/ })).toHaveTextContent('project-p5r-gioco-2026-09-12.db');
    expect(api.anteprimaPacchettoDaDeposito).toHaveBeenCalledWith('project-p5r-gioco-2026-09-12.db');
    expect(api.importaPacchettoDaDeposito).not.toHaveBeenCalled();

    expect(within(finestra).getByText(/Il pacchetto «project-p5r-gioco-2026-09-12\.db» \(5,8 MB\)/)).toBeInTheDocument();
    expect(within(finestra).getByText(/pacchetto 78 · istanza 79 · app 79 \(1 migrazione da applicare\)/)).toBeInTheDocument();
    expect(within(finestra).getByText(/13 nel pacchetto · 640 nell'istanza ora/)).toBeInTheDocument();
    const tabella = within(finestra).getByRole('table', { name: 'Tabelle che cambiano' });
    expect(within(tabella).getByText('articolo')).toBeInTheDocument();
    expect(within(tabella).getByText('581')).toBeInTheDocument();
    expect(within(tabella).getByText('580')).toBeInTheDocument();
    expect(within(finestra).getByText(/Non nel pacchetto.*tabella_nuova/)).toBeInTheDocument();
    const orfani = within(finestra).getByRole('list', { name: 'Riferimenti orfani' });
    expect(within(orfani).getByText('3 righe in 1 partita')).toBeInTheDocument();

    fireEvent.click(within(finestra).getByRole('button', { name: 'Sostituisci i dati di gioco' }));
    await waitFor(() => expect(api.importaPacchettoDaDeposito).toHaveBeenCalledWith('project-p5r-gioco-2026-09-12.db'));
    const esitoFinestra = await screen.findByRole('dialog', { name: 'Pacchetto importato' });
    expect(within(esitoFinestra).getByText(/schema 79 \(1 migrazione applicata dal 78\), 640 immagini/)).toBeInTheDocument();
    expect(within(esitoFinestra).getByText(/Le partite sono 2, intatte/)).toBeInTheDocument();
    expect(within(esitoFinestra).getByRole('button', { name: "Ricarica l'app" })).toBeInTheDocument();
    expect(carica).toHaveBeenCalled();
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('Dati di gioco sostituiti'));
    // lo stato della card segue l'esito
    expect(screen.getByText('640 · 977 kB')).toBeInTheDocument();
  });

  it('un pacchetto più nuovo del codice non si può confermare', async () => {
    api.getDepositoPacchetti.mockResolvedValue(DEPOSITO);
    api.anteprimaPacchettoDaDeposito.mockResolvedValue({ ...anteprima, versioneSchema: 99, importabile: false, motivo: 'Il pacchetto ha lo schema 99, più nuovo di quello che questa versione dell\'app sa leggere (79): aggiorna l\'app prima di importarlo.', differenze: [], tabelleAssenti: [], orfani: [] });
    render(<PacchettoGioco />);
    await screen.findByText(/schema 79/);
    fireEvent.click(screen.getByRole('button', { name: /Cerca i file disponibili/ }));
    await screen.findByRole('combobox', { name: /File in \/deposito/ });
    fireEvent.click(screen.getByRole('button', { name: /Importa il file scelto/ }));
    const finestra = await screen.findByRole('dialog', { name: 'Importare il pacchetto di gioco?' });
    expect(within(finestra).getByRole('alert')).toHaveTextContent(/più nuovo/);
    expect(within(finestra).getByRole('button', { name: 'Sostituisci i dati di gioco' })).toBeDisabled();
    expect(within(finestra).getByText('Stessi conteggi dell\'istanza in ogni tabella.')).toBeInTheDocument();
    expect(within(finestra).getByText('Nessun riferimento delle partite resterebbe orfano.')).toBeInTheDocument();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Annulla' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.importaPacchettoDaDeposito).not.toHaveBeenCalled();
  });

  it('un’istanza nata senza pacchetto lo dice; una con i soli dati iniziali invita a importare il completo', async () => {
    api.getStatoIstanza.mockResolvedValue({ ...stato, vuota: true, completo: false, immagini: { file: 0, byte: 0 } });
    const { unmount } = render(<PacchettoGioco />);
    expect(await screen.findByRole('status')).toHaveTextContent(/non ha dati di gioco/);
    unmount();
    api.getStatoIstanza.mockResolvedValue({ ...stato, vuota: false, completo: false, immagini: { file: 0, byte: 0 } });
    render(<PacchettoGioco />);
    expect(await screen.findByRole('status')).toHaveTextContent(/solo i dati iniziali/);
  });

  it('se la richiesta cade ma il server sta ancora lavorando, si aspetta e si mostra l’esito vero', async () => {
    api.importaPacchettoDaDeposito.mockRejectedValue(new Error('Failed to fetch'));
    // prima del tentativo il server ha un esito vecchio; poi lavora; poi conclude con un'operazione NUOVA
    api.statoImportazionePacchetto
      .mockResolvedValueOnce({ inCorso: false, operazione: null, fase: null, iniziataIl: null, ultima: { operazione: 'vecchia', riuscita: true, conclusaIl: 'ieri', messaggio: 'fatto ieri', esito } })
      .mockResolvedValueOnce({ inCorso: true, operazione: 'nuova', fase: 'sostituzione', iniziataIl: 'ora', ultima: null })
      .mockResolvedValue({ inCorso: false, operazione: null, fase: null, iniziataIl: null, ultima: { operazione: 'nuova', riuscita: true, conclusaIl: 'ora', messaggio: 'fatto', esito } });
    const finestra = await finoAllaConferma();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Sostituisci i dati di gioco' }));
    expect(await screen.findByText(/Il server sta sostituendo i dati di gioco/)).toBeInTheDocument();
    expect(await screen.findByRole('dialog', { name: 'Pacchetto importato' }, { timeout: 10_000 })).toBeInTheDocument();
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('Dati di gioco sostituiti'));
  }, 20_000);

  it('un’importazione respinta prima di arrivare al server non eredita l’esito riuscito di prima', async () => {
    api.importaPacchettoDaDeposito.mockRejectedValue(new Error('Errore di rete: Failed to fetch'));
    api.statoImportazionePacchetto.mockResolvedValue({ inCorso: false, operazione: null, fase: null, iniziataIl: null, ultima: { operazione: 'di-prima', riuscita: true, conclusaIl: 'ieri', messaggio: 'riuscita ieri', esito } });
    const finestra = await finoAllaConferma();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Sostituisci i dati di gioco' }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', expect.stringContaining('Failed to fetch')));
    expect(screen.queryByRole('dialog', { name: 'Pacchetto importato' })).toBeNull();
    expect(notifica).not.toHaveBeenCalledWith('success', expect.anything());
  });

  it('se non si riesce nemmeno a leggere lo stato di partenza, l’errore resta un errore', async () => {
    api.importaPacchettoDaDeposito.mockRejectedValue(new Error('Failed to fetch'));
    const finestra = await finoAllaConferma();
    api.statoImportazionePacchetto.mockRejectedValue(new Error('server irraggiungibile'));
    fireEvent.click(within(finestra).getByRole('button', { name: 'Sostituisci i dati di gioco' }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', expect.stringContaining('Failed to fetch')));
    expect(screen.queryByRole('dialog', { name: 'Pacchetto importato' })).toBeNull();
  });

  it('se la cartella d’appoggio non è montata lo dice, senza far credere che sia vuota', async () => {
    api.getDepositoPacchetti.mockResolvedValue({ disponibile: false, cartella: '/deposito', motivo: 'La cartella d’appoggio non è leggibile: ENOENT', file: [] });
    render(<PacchettoGioco />);
    await screen.findByText(/schema 79/);
    fireEvent.click(screen.getByRole('button', { name: /Cerca i file disponibili/ }));
    expect(await screen.findByText(/non è leggibile/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Importa il file scelto/ })).toBeNull();
  });

  it('una cartella d’appoggio vuota lo dice e non offre l’importazione', async () => {
    api.getDepositoPacchetti.mockResolvedValue({ disponibile: true, cartella: '/deposito', motivo: null, file: [] });
    render(<PacchettoGioco />);
    await screen.findByText(/schema 79/);
    fireEvent.click(screen.getByRole('button', { name: /Cerca i file disponibili/ }));
    expect(await screen.findByText(/Nessun pacchetto in/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Importa il file scelto/ })).toBeNull();
  });

  it('un file che non è un pacchetto viene segnalato senza aprire l’anteprima', async () => {
    api.getDepositoPacchetti.mockResolvedValue(DEPOSITO);
    api.anteprimaPacchettoDaDeposito.mockRejectedValue(new Error('Il file non è un pacchetto di gioco: carica il file gioco.db scaricato da «Scarica il pacchetto di gioco».'));
    render(<PacchettoGioco />);
    await screen.findByText(/schema 79/);
    fireEvent.click(screen.getByRole('button', { name: /Cerca i file disponibili/ }));
    await screen.findByRole('combobox', { name: /File in \/deposito/ });
    fireEvent.click(screen.getByRole('button', { name: /Importa il file scelto/ }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', expect.stringContaining('non è un pacchetto di gioco')));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
