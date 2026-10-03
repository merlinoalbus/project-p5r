// ============================================================
// Test F19/P3' (verifica completa 2026-10-03): i file grossi passano dalla cartella d'appoggio a flusso, mai interi in memoria
// ============================================================
//
// Istanza reale in una cartella temporanea e un deposito finto (un'altra cartella temporanea). Si verifica che:
// - la copia verso il deposito sia asincrona, ruoti solo le copie dell'app e non lasci file a metà se non riesce;
// - importazione e ripristino dal deposito copino il file una volta in una cartella di lavoro locale, la tolgano alla fine e
//   non tocchino il file depositato (niente giornali accanto al pacchetto sul NAS).
// ============================================================

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { config } from '../config.js';
import { closeDb, initDb, prepared } from '../db/dbService.js';
import { caricaPacchetto } from './pacchetto/pacchettoGioco.js';
import { copiaDatabase, copiaIstanza, ripristinaIstanzaDaDeposito } from './impostazioniService.js';
import { anteprimaPacchettoDaDeposito, importaPacchettoDaDeposito } from './pacchettoGiocoService.js';
import { depositaCopia } from './depositoService.js';

let dataDir = '';
let deposito = '';
const depositoOriginale = config.depositoDir;

/** Le cartelle di lavoro rimaste in data/tmp. */
const lavoriRimasti = (): string[] => (fs.existsSync(path.join(dataDir, 'tmp')) ? fs.readdirSync(path.join(dataDir, 'tmp')).filter((f) => /^(importazione|ripristino)-/.test(f)) : []);

beforeAll(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-flussi-dati-'));
  deposito = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-flussi-deposito-'));
  (config as { dataDir: string }).dataDir = dataDir;
  (config as { depositoDir: string }).depositoDir = deposito;
  caricaPacchetto(initDb());
});

afterAll(() => {
  closeDb();
  (config as { depositoDir: string }).depositoDir = depositoOriginale;
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.rmSync(deposito, { recursive: true, force: true });
});

describe('cartella d\'appoggio — copie e letture a flusso', () => {
  it('depositaCopia copia il file, ruota solo le copie dell\'app (5) e lascia stare i file dell\'utente', async () => {
    const sorgente = path.join(dataDir, 'sorgente.db');
    fs.writeFileSync(sorgente, 'contenuto della copia');
    fs.writeFileSync(path.join(deposito, 'mio-backup.zip'), 'file dell\'utente');
    for (let i = 0; i < 7; i++) {
      const nome = `project-p5r-istanza-2026-10-0${i}T00-00-00-000Z.zip`;
      expect(await depositaCopia(sorgente, nome)).toBe(nome);
    }
    const nostre = fs.readdirSync(deposito).filter((f) => f.startsWith('project-p5r-istanza-')).sort();
    expect(nostre).toHaveLength(5);
    expect(nostre[0]).toBe('project-p5r-istanza-2026-10-02T00-00-00-000Z.zip');
    expect(fs.readFileSync(path.join(deposito, nostre[4]), 'utf-8')).toBe('contenuto della copia');
    expect(fs.existsSync(path.join(deposito, 'mio-backup.zip'))).toBe(true);
    for (const f of nostre) fs.rmSync(path.join(deposito, f));
    fs.rmSync(path.join(deposito, 'mio-backup.zip'));
  });

  it('se la copia nel deposito fallisce, lo scaricamento non si ferma (null) e non resta un file a metà', async () => {
    const sorgente = path.join(dataDir, 'sorgente.db');
    fs.writeFileSync(sorgente, 'x');
    const copia = vi.spyOn(fsp, 'copyFile').mockImplementation(async (_da, a) => {
      fs.writeFileSync(String(a), 'mezzo file');
      throw new Error('EIO: il NAS non risponde');
    });
    try {
      expect(await depositaCopia(sorgente, 'project-p5r-gioco-prova.db')).toBeNull();
    } finally {
      copia.mockRestore();
    }
    expect(fs.existsSync(path.join(deposito, 'project-p5r-gioco-prova.db'))).toBe(false);
  });

  it('importa un pacchetto depositato: il file sul NAS resta com\'era, senza giornali, e la cartella di lavoro si toglie', async () => {
    const { percorso } = await copiaDatabase('gioco');
    const depositato = path.join(deposito, 'gioco.db');
    fs.renameSync(percorso, depositato);
    const primaByte = fs.readFileSync(depositato);
    const anteprima = anteprimaPacchettoDaDeposito('gioco.db');
    expect(anteprima.importabile).toBe(true);
    expect(fs.readdirSync(deposito).filter((f) => f.startsWith('gioco.db-'))).toEqual([]);
    prepared("INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES ('sfondi', 'dopo-il-pacchetto', 'x.webp', 'image/webp', 1, 'x', ?)").run(Buffer.from('x'));
    const esito = await importaPacchettoDaDeposito('gioco.db');
    expect(esito.versioneSchema).toBe(anteprima.versioneSchemaCodice);
    // i dati sono quelli del pacchetto: l'immagine aggiunta dopo non c'è più
    expect(prepared("SELECT 1 FROM immagine WHERE ambito = 'sfondi' AND chiave = 'dopo-il-pacchetto'").get()).toBeUndefined();
    expect(Buffer.compare(fs.readFileSync(depositato), primaByte)).toBe(0);
    expect(fs.readdirSync(deposito).filter((f) => f.startsWith('gioco.db-'))).toEqual([]);
    expect(lavoriRimasti()).toEqual([]);
    fs.rmSync(depositato);
  });

  it('ripristina l\'istanza da uno ZIP depositato, con lo stesso file che resta intatto sul NAS', async () => {
    prepared("INSERT INTO partita (nome, attiva, livello_protagonista, created_at, updated_at) VALUES ('Prima del backup', 0, 1, 'x', 'x')").run();
    const zip = await copiaIstanza();
    const depositato = path.join(deposito, 'istanza.zip');
    fs.renameSync(zip.percorso, depositato);
    const dimensione = fs.statSync(depositato).size;
    prepared("INSERT INTO partita (nome, attiva, livello_protagonista, created_at, updated_at) VALUES ('Dopo il backup', 0, 1, 'x', 'x')").run();
    const esito = await ripristinaIstanzaDaDeposito('istanza.zip');
    expect(esito).toMatchObject({ formato: 'istanza', database: true, partite: true });
    expect((prepared("SELECT COUNT(*) AS n FROM partita WHERE nome = 'Dopo il backup'").get() as { n: number }).n).toBe(0);
    expect((prepared("SELECT COUNT(*) AS n FROM partita WHERE nome = 'Prima del backup'").get() as { n: number }).n).toBe(1);
    expect(fs.statSync(depositato).size).toBe(dimensione);
    expect(lavoriRimasti()).toEqual([]);
  });

  it('un nome che non c\'è nel deposito è un 404, e il lucchetto torna libero', async () => {
    await expect(ripristinaIstanzaDaDeposito('mai-visto.zip')).rejects.toMatchObject({ code: 'file-non-trovato', status: 404 });
    await expect(importaPacchettoDaDeposito('mai-visto.db')).rejects.toMatchObject({ code: 'file-non-trovato', status: 404 });
    // se il lucchetto fosse rimasto preso, qui arriverebbe il 409
    await expect(ripristinaIstanzaDaDeposito('mai-visto.zip')).rejects.toMatchObject({ code: 'file-non-trovato' });
    expect(lavoriRimasti()).toEqual([]);
  });
});
