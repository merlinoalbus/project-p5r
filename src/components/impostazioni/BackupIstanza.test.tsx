// @vitest-environment jsdom
// ============================================================
// Test BackupIstanza — esportazione e ripristino dell'istanza dalle Impostazioni (15.29)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BackupIstanza } from './BackupIstanza';
import type { StatoIstanzaDto } from '../../types';

const api = vi.hoisted(() => ({ getStatoIstanza: vi.fn(), scaricaIstanza: vi.fn(), ripristinaIstanza: vi.fn(), getDepositoBackup: vi.fn(), ripristinaIstanzaDaDeposito: vi.fn() }));
vi.mock('../../services/api', () => api);
const { notifica } = vi.hoisted(() => ({ notifica: vi.fn() }));
vi.mock('../../stores/notificationStore', () => ({ notifica }));
const { carica } = vi.hoisted(() => ({ carica: vi.fn() }));
vi.mock('../../stores/partitaStore', () => ({ usePartitaStore: { getState: () => ({ carica }) } }));

const stato: StatoIstanzaDto = {
  versioneSchema: 34, versioneApp: '0.1.0',
  seed: { versione: '1', hash: '1:abc', caricatoIl: '2026-09-05T10:00:00.000Z' },
  database: { nome: 'gioco.db', byte: 3_900_000, inMemoria: false }, databasePartite: { nome: 'partite.db', byte: 120_000 }, versioneSchemaPartite: 1,
  immagini: { file: 12, byte: 2_048_000 }, caratteri: { file: 1, byte: 40_000 }, partite: 2, copieDiSicurezza: 7, vuota: false, completo: true,
};

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

  it('mostra lo stato dell’istanza e scarica l’istanza completa', async () => {
    api.scaricaIstanza.mockResolvedValue({ nome: 'project-p5r-istanza.zip', blob: new Blob(['x']), depositato: 'project-p5r-istanza-2026.zip' });
    render(<BackupIstanza />);
    expect(await screen.findByText(/gioco\.db · 3,7 MB/)).toBeInTheDocument();
    expect(screen.getByText(/partite\.db · /)).toBeInTheDocument();
    expect(screen.getByText('12 · 2 MB')).toBeInTheDocument();
    expect(screen.getByText('versione 34 · app 0.1.0')).toBeInTheDocument();
    expect(screen.getByText('7 in data/backups')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Scarica l'istanza completa/ }));
    await waitFor(() => expect(api.scaricaIstanza).toHaveBeenCalled());
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('Istanza completa'));
    // la copia lasciata nella cartella d'appoggio viene detta: è già pronta per un ripristino
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('project-p5r-istanza-2026.zip'));
  });

  it('non offre più il solo database: quello è il pacchetto di gioco', async () => {
    render(<BackupIstanza />);
    await screen.findByText(/gioco\.db/);
    expect(screen.queryByRole('button', { name: /Scarica solo il database/ })).toBeNull();
    expect(screen.getByText(/card «Pacchetto di gioco»/)).toBeInTheDocument();
  });

  it('il ripristino chiede conferma, invia il file e ricarica le partite', async () => {
    api.ripristinaIstanza.mockResolvedValue({ formato: 'istanza', database: true, immagini: 12, caratteri: 1, copiaDiSicurezza: 'prima-del-ripristino-2026', stato: { ...stato, partite: 1 } });
    render(<BackupIstanza />);
    const file = new File(['x'], 'backup.zip', { type: 'application/zip' });
    const input = screen.getByLabelText('File di backup da ripristinare') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    const finestra = within(await screen.findByRole('dialog'));
    expect(finestra.getByText(/«backup.zip»/)).toBeInTheDocument();
    expect(finestra.getByText(/copia di sicurezza/)).toBeInTheDocument();
    expect(api.ripristinaIstanza).not.toHaveBeenCalled();
    fireEvent.click(finestra.getByRole('button', { name: "Sostituisci l'istanza" }));
    await waitFor(() => expect(api.ripristinaIstanza).toHaveBeenCalledWith(file, expect.any(Function)));
    await waitFor(() => expect(carica).toHaveBeenCalled());
    expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('Istanza ripristinata'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('dalla cartella d’appoggio: elenca i backup, li fa scegliere e il ripristino lo fa il server', async () => {
    api.getDepositoBackup.mockResolvedValue({
      disponibile: true,
      cartella: '/deposito',
      motivo: null,
      file: [
        { nome: 'project-p5r-istanza-2026.zip', byte: 340_000_000, modificatoIl: '2026-09-12T20:00:00.000Z' },
        { nome: 'project-p5r-gioco-2026.db', byte: 326_778_880, modificatoIl: '2026-09-11T10:00:00.000Z' },
      ],
    });
    api.ripristinaIstanzaDaDeposito.mockResolvedValue({ formato: 'istanza', database: true, partite: true, immagini: 0, caratteri: 1, copiaDiSicurezza: 'prima-del-ripristino-2026', stato: { ...stato, partite: 1 } });
    render(<BackupIstanza />);
    await screen.findByText(/gioco\.db/);

    fireEvent.click(screen.getByRole('button', { name: /Cerca i file disponibili/ }));
    await waitFor(() => expect(api.getDepositoBackup).toHaveBeenCalled());
    expect(await screen.findByRole('combobox', { name: /File in \/deposito \(2\)/ })).toHaveTextContent('project-p5r-istanza-2026.zip');

    fireEvent.click(screen.getByRole('button', { name: /Ripristina il file scelto/ }));
    const finestra = within(await screen.findByRole('dialog', { name: "Ripristinare l'istanza dalla cartella d'appoggio?" }));
    expect(finestra.getByText(/«project-p5r-istanza-2026\.zip»/)).toBeInTheDocument();
    expect(api.ripristinaIstanzaDaDeposito).not.toHaveBeenCalled();

    fireEvent.click(finestra.getByRole('button', { name: "Sostituisci l'istanza" }));
    await waitFor(() => expect(api.ripristinaIstanzaDaDeposito).toHaveBeenCalledWith('project-p5r-istanza-2026.zip'));
    // il file non passa dal browser: nessun invio
    expect(api.ripristinaIstanza).not.toHaveBeenCalled();
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

  it('un ripristino rifiutato dal server lascia l’istanza com’è e mostra il motivo', async () => {
    api.ripristinaIstanza.mockRejectedValue(new Error('Il file non è un database SQLite'));
    render(<BackupIstanza />);
    fireEvent.change(screen.getByLabelText('File di backup da ripristinare'), { target: { files: [new File(['x'], 'foto.png')] } });
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: "Sostituisci l'istanza" }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Il file non è un database SQLite'));
    expect(carica).not.toHaveBeenCalled();
  });
});
