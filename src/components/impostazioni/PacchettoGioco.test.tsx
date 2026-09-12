// @vitest-environment jsdom
// ============================================================
// Test PacchettoGioco — esportazione, anteprima obbligatoria e importazione del pacchetto di gioco (voce 10)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PacchettoGioco } from './PacchettoGioco';
import type { AnteprimaPacchettoDto, EsitoImportazionePacchettoDto, StatoIstanzaDto } from '../../types';

const api = vi.hoisted(() => ({ getStatoIstanza: vi.fn(), scaricaPacchettoGioco: vi.fn(), anteprimaPacchettoGioco: vi.fn(), importaPacchettoGioco: vi.fn() }));
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

  it('un file che non è un pacchetto viene segnalato senza aprire l’anteprima', async () => {
    api.anteprimaPacchettoGioco.mockRejectedValue(new Error('Il file non è un pacchetto di gioco: carica il file gioco.db scaricato da «Scarica il pacchetto di gioco».'));
    render(<PacchettoGioco />);
    await screen.findByText(/schema 79/);
    scegliFile();
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', expect.stringContaining('non è un pacchetto di gioco')));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
