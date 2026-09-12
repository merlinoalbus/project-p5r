// @vitest-environment jsdom
// ============================================================
// Test PacchettoGioco — esportazione, anteprima obbligatoria e importazione del pacchetto di gioco (voce 10)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PacchettoGioco } from './PacchettoGioco';
import type { AnteprimaPacchettoDto, EsitoImportazionePacchettoDto, StatoIstanzaDto } from '../../types';

const api = vi.hoisted(() => ({ getStatoIstanza: vi.fn(), scaricaPacchettoGioco: vi.fn(), anteprimaPacchettoGioco: vi.fn(), importaPacchettoGioco: vi.fn(), statoImportazionePacchetto: vi.fn(), getDepositoPacchetti: vi.fn(), anteprimaPacchettoDaDeposito: vi.fn(), importaPacchettoDaDeposito: vi.fn() }));
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

function scegliFile(): void {
  const file = new File(['x'], 'project-p5r-gioco.db', { type: 'application/octet-stream' });
  fireEvent.change(screen.getByLabelText('Pacchetto di gioco da importare'), { target: { files: [file] } });
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

  it('mostra lo stato dei dati di gioco e scarica il pacchetto (il file gioco.db)', async () => {
    api.scaricaPacchettoGioco.mockResolvedValue({ nome: 'project-p5r-gioco.db', blob: new Blob(['x']) });
    render(<PacchettoGioco />);
    expect(await screen.findByText(/gioco\.db · 305,2 MB · schema 79/)).toBeInTheDocument();
    expect(screen.getByText('640 · 286,1 MB')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Scarica il pacchetto di gioco/ }));
    await waitFor(() => expect(api.scaricaPacchettoGioco).toHaveBeenCalled());
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('Pacchetto di gioco scaricato'));
  });

  it('l’importazione passa dall’anteprima: schema, tabelle che cambiano, immagini, orfani; poi conferma ed esito', async () => {
    api.anteprimaPacchettoGioco.mockResolvedValue(anteprima);
    api.importaPacchettoGioco.mockResolvedValue(esito);
    render(<PacchettoGioco />);
    await screen.findByText(/schema 79/);
    scegliFile();
    const finestra = await screen.findByRole('dialog', { name: 'Importare il pacchetto di gioco?' });
    expect(api.anteprimaPacchettoGioco).toHaveBeenCalledTimes(1);
    expect(api.importaPacchettoGioco).not.toHaveBeenCalled();
    expect(within(finestra).getByText(/Il pacchetto «project-p5r-gioco\.db» \(5,8 MB\)/)).toBeInTheDocument();
    expect(within(finestra).getByText(/pacchetto 78 · istanza 79 · app 79 \(1 migrazione da applicare\)/)).toBeInTheDocument();
    expect(within(finestra).getByText(/13 nel pacchetto · 640 nell'istanza ora/)).toBeInTheDocument();
    const tabella = within(finestra).getByRole('table', { name: 'Tabelle che cambiano' });
    expect(within(tabella).getByText('articolo')).toBeInTheDocument();
    expect(within(tabella).getByText('581')).toBeInTheDocument();
    expect(within(tabella).getByText('580')).toBeInTheDocument();
    expect(within(finestra).getByText(/Non nel pacchetto.*tabella_nuova/)).toBeInTheDocument();
    const orfani = within(finestra).getByRole('list', { name: 'Riferimenti orfani' });
    expect(within(orfani).getByText('3 righe in 1 partita')).toBeInTheDocument();
    expect(within(orfani).getByText(/untouchable\/u-prova/)).toBeInTheDocument();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Sostituisci i dati di gioco' }));
    await waitFor(() => expect(api.importaPacchettoGioco).toHaveBeenCalledTimes(1));
    expect(api.importaPacchettoGioco).toHaveBeenCalledWith(expect.any(File), expect.any(Function));
    const esitoFinestra = await screen.findByRole('dialog', { name: 'Pacchetto importato' });
    expect(within(esitoFinestra).getByText(/schema 79 \(1 migrazione applicata dal 78\), 640 immagini/)).toBeInTheDocument();
    expect(within(esitoFinestra).getByText(/Le partite sono 2, intatte/)).toBeInTheDocument();
    expect(within(esitoFinestra).getByText('3 righe in 1 partita')).toBeInTheDocument();
    expect(within(esitoFinestra).getByRole('button', { name: "Ricarica l'app" })).toBeInTheDocument();
    expect(carica).toHaveBeenCalled();
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('Dati di gioco sostituiti'));
    // lo stato della card segue l'esito
    expect(screen.getByText('640 · 977 kB')).toBeInTheDocument();
  });

  it('un pacchetto più nuovo del codice non si può confermare', async () => {
    api.anteprimaPacchettoGioco.mockResolvedValue({ ...anteprima, versioneSchema: 99, importabile: false, motivo: 'Il pacchetto ha lo schema 99, più nuovo di quello che questa versione dell\'app sa leggere (79): aggiorna l\'app prima di importarlo.', differenze: [], tabelleAssenti: [], orfani: [] });
    render(<PacchettoGioco />);
    await screen.findByText(/schema 79/);
    scegliFile();
    const finestra = await screen.findByRole('dialog', { name: 'Importare il pacchetto di gioco?' });
    expect(within(finestra).getByRole('alert')).toHaveTextContent(/più nuovo/);
    expect(within(finestra).getByRole('button', { name: 'Sostituisci i dati di gioco' })).toBeDisabled();
    expect(within(finestra).getByText('Stessi conteggi dell\'istanza in ogni tabella.')).toBeInTheDocument();
    expect(within(finestra).getByText('Nessun riferimento delle partite resterebbe orfano.')).toBeInTheDocument();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Annulla' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.importaPacchettoGioco).not.toHaveBeenCalled();
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

  /** Porta l'interfaccia fino alla finestra di conferma con un file scelto. */
  async function finoAllaConferma() {
    api.anteprimaPacchettoGioco.mockResolvedValue(anteprima);
    render(<PacchettoGioco />);
    await screen.findByText(/schema 79/);
    scegliFile();
    return screen.findByRole('dialog', { name: 'Importare il pacchetto di gioco?' });
  }

  it('se la richiesta cade ma il server sta ancora lavorando, si aspetta e si mostra l’esito vero', async () => {
    api.importaPacchettoGioco.mockRejectedValue(new Error('Failed to fetch'));
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
    // il proxy rifiuta il corpo: la richiesta non tocca il server, che ha ancora l'esito di un'altra importazione
    api.importaPacchettoGioco.mockRejectedValue(new Error('Errore di rete: Failed to fetch'));
    api.statoImportazionePacchetto.mockResolvedValue({ inCorso: false, operazione: null, fase: null, iniziataIl: null, ultima: { operazione: 'di-prima', riuscita: true, conclusaIl: 'ieri', messaggio: 'riuscita ieri', esito } });
    const finestra = await finoAllaConferma();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Sostituisci i dati di gioco' }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', expect.stringContaining('Failed to fetch')));
    expect(screen.queryByRole('dialog', { name: 'Pacchetto importato' })).toBeNull();
    expect(notifica).not.toHaveBeenCalledWith('success', expect.anything());
  });

  it('se non si riesce nemmeno a leggere lo stato di partenza, l’errore resta un errore', async () => {
    api.importaPacchettoGioco.mockRejectedValue(new Error('Failed to fetch'));
    api.statoImportazionePacchetto.mockRejectedValue(new Error('server irraggiungibile'));
    const finestra = await finoAllaConferma();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Sostituisci i dati di gioco' }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', expect.stringContaining('Failed to fetch')));
    expect(screen.queryByRole('dialog', { name: 'Pacchetto importato' })).toBeNull();
  });

  it('dalla cartella d’appoggio: cerca i file, li fa scegliere e l’import lo fa il server', async () => {
    api.getDepositoPacchetti.mockResolvedValue({
      disponibile: true,
      cartella: '/deposito',
      motivo: null,
      file: [
        { nome: 'gioco.db', byte: 326_778_880, modificatoIl: '2026-09-12T18:00:00.000Z' },
        { nome: 'gioco-vecchio.db', byte: 300_000_000, modificatoIl: '2026-09-01T10:00:00.000Z' },
      ],
    });
    api.anteprimaPacchettoDaDeposito.mockResolvedValue(anteprima);
    api.importaPacchettoDaDeposito.mockResolvedValue(esito);
    render(<PacchettoGioco />);
    await screen.findByText(/schema 79/);

    fireEvent.click(screen.getByRole('button', { name: /Cerca i file disponibili/ }));
    await waitFor(() => expect(api.getDepositoPacchetti).toHaveBeenCalled());
    // il primo file (il più recente) è già scelto, e l'elenco dice dove sta
    expect(await screen.findByRole('combobox', { name: /File in \/deposito \(2\)/ })).toHaveTextContent('gioco.db');

    fireEvent.click(screen.getByRole('button', { name: /Importa il file scelto/ }));
    const finestra = await screen.findByRole('dialog', { name: 'Importare il pacchetto di gioco?' });
    expect(api.anteprimaPacchettoDaDeposito).toHaveBeenCalledWith('gioco.db');
    expect(within(finestra).getByText(/Il pacchetto «gioco\.db»/)).toBeInTheDocument();
    // il file non passa dal browser: nessun invio con avanzamento
    expect(api.anteprimaPacchettoGioco).not.toHaveBeenCalled();

    fireEvent.click(within(finestra).getByRole('button', { name: 'Sostituisci i dati di gioco' }));
    await waitFor(() => expect(api.importaPacchettoDaDeposito).toHaveBeenCalledWith('gioco.db'));
    expect(api.importaPacchettoGioco).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog', { name: 'Pacchetto importato' })).toBeInTheDocument();
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
    api.anteprimaPacchettoGioco.mockRejectedValue(new Error('Il file non è un pacchetto di gioco: carica il file gioco.db scaricato da «Scarica il pacchetto di gioco».'));
    render(<PacchettoGioco />);
    await screen.findByText(/schema 79/);
    scegliFile();
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', expect.stringContaining('non è un pacchetto di gioco')));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
