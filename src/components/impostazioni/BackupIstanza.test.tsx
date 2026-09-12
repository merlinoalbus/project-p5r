// @vitest-environment jsdom
// ============================================================
// Test BackupIstanza — scaricamento (con copia depositata) e ripristino dalla cartella d'appoggio
// ============================================================
//
// Dal browser non parte più nessun file: un backup da centinaia di MB non attraversa il proxy di
// un'istanza pubblicata. Si scarica — e una copia resta sul server — e si ripristina scegliendo fra
// gli ZIP depositati, che legge il backend.
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BackupIstanza } from './BackupIstanza';
import type { StatoIstanzaDto } from '../../types';

const api = vi.hoisted(() => ({ getStatoIstanza: vi.fn(), scaricaIstanza: vi.fn(), getDepositoBackup: vi.fn(), ripristinaIstanzaDaDeposito: vi.fn() }));
vi.mock('../../services/api', () => api);
const { notifica } = vi.hoisted(() => ({ notifica: vi.fn() }));
vi.mock('../../stores/notificationStore', () => ({ notifica }));
const { carica } = vi.hoisted(() => ({ carica: vi.fn() }));
vi.mock('../../stores/partitaStore', () => ({ usePartitaStore: { getState: () => ({ carica }) } }));

const stato: StatoIstanzaDto = {
  versioneSchema: 81, versioneApp: '0.1.0', versioneSchemaPartite: 4,
  seed: { versione: '1', hash: '1:abc', caricatoIl: '2026-09-05T10:00:00.000Z' },
  database: { nome: 'gioco.db', byte: 3_900_000, inMemoria: false }, databasePartite: { nome: 'partite.db', byte: 120_000 },
  immagini: { file: 12, byte: 2_048_000 }, caratteri: { file: 1, byte: 40_000 }, partite: 2, copieDiSicurezza: 7, vuota: false, completo: true,
};

/** Nella cartella d'appoggio per il ripristino ci sono solo ZIP: i database sono affare dell'altra card. */
const DEPOSITO = {
  disponibile: true,
  cartella: '/deposito',
  motivo: null,
  file: [
    { nome: 'project-p5r-istanza-2026-09-12.zip', byte: 340_000_000, modificatoIl: '2026-09-12T20:00:00.000Z' },
    { nome: 'project-p5r-istanza-2026-09-01.zip', byte: 320_000_000, modificatoIl: '2026-09-01T10:00:00.000Z' },
  ],
};

/** Porta l'interfaccia fino alla finestra di conferma sul primo file del deposito. */
async function finoAllaConferma() {
  api.getDepositoBackup.mockResolvedValue(DEPOSITO);
  render(<BackupIstanza />);
  await screen.findByText(/gioco\.db/);
  fireEvent.click(screen.getByRole('button', { name: /Cerca i file disponibili/ }));
  await screen.findByRole('combobox', { name: /File in \/deposito/ });
  fireEvent.click(screen.getByRole('button', { name: /Ripristina il file scelto/ }));
  return within(await screen.findByRole('dialog', { name: "Ripristinare l'istanza dalla cartella d'appoggio?" }));
}

describe('BackupIstanza', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    notifica.mockReset(); carica.mockReset();
    api.getStatoIstanza.mockResolvedValue(stato);
    // jsdom non implementa gli URL degli oggetti né il click che scarica
    URL.createObjectURL = vi.fn(() => 'blob:finto');
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('mostra lo stato dell’istanza, scarica e dice dove è finita la copia', async () => {
    api.scaricaIstanza.mockResolvedValue({ nome: 'project-p5r-istanza.zip', blob: new Blob(['x']), depositato: 'project-p5r-istanza-2026-09-12.zip' });
    render(<BackupIstanza />);
    expect(await screen.findByText(/gioco\.db · 3,7 MB/)).toBeInTheDocument();
    expect(screen.getByText(/partite\.db · /)).toBeInTheDocument();
    expect(screen.getByText('12 · 2 MB')).toBeInTheDocument();
    expect(screen.getByText('7 in data/backups')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Scarica l'istanza completa/ }));
    await waitFor(() => expect(api.scaricaIstanza).toHaveBeenCalled());
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('Istanza completa'));
    // la copia lasciata nella cartella d'appoggio viene detta: è già pronta per un ripristino
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('project-p5r-istanza-2026-09-12.zip'));
  });

  it('senza cartella d’appoggio lo scaricamento non promette una copia che non c’è', async () => {
    api.scaricaIstanza.mockResolvedValue({ nome: 'project-p5r-istanza.zip', blob: new Blob(['x']), depositato: null });
    render(<BackupIstanza />);
    await screen.findByText(/gioco\.db/);
    fireEvent.click(screen.getByRole('button', { name: /Scarica l'istanza completa/ }));
    await waitFor(() => expect(api.scaricaIstanza).toHaveBeenCalled());
    expect(notifica).toHaveBeenCalledWith('success', expect.not.stringContaining('depositata'));
  });

  it('non si carica più niente dal browser: nessun pulsante di caricamento', async () => {
    render(<BackupIstanza />);
    await screen.findByText(/gioco\.db/);
    expect(screen.queryByRole('button', { name: /Ripristina da file/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Scarica solo il database/ })).toBeNull();
    expect(screen.queryByLabelText('File di backup da ripristinare')).toBeNull();
  });

  it('dalla cartella d’appoggio: elenca gli ZIP, li fa scegliere e il ripristino lo fa il server', async () => {
    api.ripristinaIstanzaDaDeposito.mockResolvedValue({ formato: 'istanza', database: true, partite: true, immagini: 0, caratteri: 1, copiaDiSicurezza: 'prima-del-ripristino-2026', stato: { ...stato, partite: 1 } });
    const finestra = await finoAllaConferma();
    expect(screen.getByRole('combobox', { name: /File in \/deposito \(2\)/ })).toHaveTextContent('project-p5r-istanza-2026-09-12.zip');
    expect(finestra.getByText(/«project-p5r-istanza-2026-09-12\.zip»/)).toBeInTheDocument();
    expect(api.ripristinaIstanzaDaDeposito).not.toHaveBeenCalled();

    fireEvent.click(finestra.getByRole('button', { name: "Sostituisci l'istanza" }));
    await waitFor(() => expect(api.ripristinaIstanzaDaDeposito).toHaveBeenCalledWith('project-p5r-istanza-2026-09-12.zip'));
    await waitFor(() => expect(carica).toHaveBeenCalled());
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('Istanza ripristinata'));
  });

  it('se la cartella d’appoggio non è montata lo dice, senza far credere che sia vuota', async () => {
    api.getDepositoBackup.mockResolvedValue({ disponibile: false, cartella: '/deposito', motivo: 'La cartella d’appoggio non è leggibile: ENOENT', file: [] });
    render(<BackupIstanza />);
    await screen.findByText(/gioco\.db/);
    fireEvent.click(screen.getByRole('button', { name: /Cerca i file disponibili/ }));
    expect(await screen.findByText(/non è leggibile/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ripristina il file scelto/ })).toBeNull();
  });

  it('una cartella d’appoggio vuota lo dice e non offre il ripristino', async () => {
    api.getDepositoBackup.mockResolvedValue({ disponibile: true, cartella: '/deposito', motivo: null, file: [] });
    render(<BackupIstanza />);
    await screen.findByText(/gioco\.db/);
    fireEvent.click(screen.getByRole('button', { name: /Cerca i file disponibili/ }));
    expect(await screen.findByText(/Nessun backup in/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ripristina il file scelto/ })).toBeNull();
  });

  it('un ripristino rifiutato dal server lascia l’istanza com’è e mostra il motivo', async () => {
    api.ripristinaIstanzaDaDeposito.mockRejectedValue(new Error('Il file non è un database SQLite'));
    const finestra = await finoAllaConferma();
    fireEvent.click(finestra.getByRole('button', { name: "Sostituisci l'istanza" }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Il file non è un database SQLite'));
    expect(carica).not.toHaveBeenCalled();
  });
});
