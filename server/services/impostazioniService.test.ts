// ============================================================
// Test impostazioniService — esportazione e ripristino dell'istanza (Fase 15.29)
// ============================================================
//
// Usa una cartella dati temporanea (il servizio lavora su file reali: database, immagini, caratteri, copie di sicurezza).
// ============================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config } from '../config.js';
import { closeDb, initDb, prepared, resolveDbPath } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from './seed/caricaSeed.js';
import { copiaDatabase, copiaIstanza, ripristinaIstanza, statoIstanza, verificaDatabase } from './impostazioniService.js';
import { leggiZip } from '../utils/zip.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
let dataDir = '';

/** Prepara un'istanza reale su disco: database migrato e con seed, più un'immagine e un carattere finti. */
function apriIstanza(): void {
  const db = initDb();
  runMigrations(db);
  caricaSeed(db, DIR_SEED);
}

beforeAll(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-backup-'));
  (config as { dataDir: string }).dataDir = dataDir;
  fs.mkdirSync(path.join(dataDir, 'immagini', 'mappa'), { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'immagini', 'mappa', 'prova.png'), Buffer.from('finta immagine'));
  fs.mkdirSync(path.join(dataDir, 'font'), { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'font', 'display.woff2'), Buffer.from('finto carattere'));
  apriIstanza();
});

afterAll(() => {
  closeDb();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('impostazioniService — backup e ripristino (15.29)', () => {
  it('lo stato dell’istanza riporta versioni, dimensioni e conteggi reali', () => {
    prepared("INSERT INTO partita (nome, attiva, livello_protagonista, created_at, updated_at) VALUES ('Backup', 1, 1, 'x', 'x')").run();
    const s = statoIstanza();
    expect(s.database).toMatchObject({ nome: 'project-p5r.db', inMemoria: false });
    expect(s.database.byte).toBeGreaterThan(0);
    expect(s.versioneSchema).toBeGreaterThan(0);
    expect(s.immagini).toEqual({ file: 1, byte: 'finta immagine'.length });
    expect(s.caratteri).toEqual({ file: 1, byte: 'finto carattere'.length });
    expect(s.partite).toBe(1);
    expect(s.seed.hash).toMatch(/^\d+:[0-9a-f]{64}$/);
  });

  it('esporta il database come file SQLite valido e l’istanza completa come ZIP con database, immagini, caratteri e manifesto', async () => {
    const copia = await copiaDatabase();
    const contenuto = fs.readFileSync(copia.percorso);
    expect(contenuto.toString('utf-8', 0, 15)).toBe('SQLite format 3');
    expect(copia.nome).toMatch(/^project-p5r-.*\.db$/);
    expect(() => verificaDatabase(contenuto)).not.toThrow();
    fs.rmSync(copia.percorso, { force: true });

    const zip = await copiaIstanza();
    expect(zip.nome).toMatch(/^project-p5r-istanza-.*\.zip$/);
    const voci = leggiZip(zip.contenuto);
    const nomi = voci.map((v) => v.nome);
    expect(nomi).toContain('database/project-p5r.db');
    expect(nomi).toContain('immagini/mappa/prova.png');
    expect(nomi).toContain('font/display.woff2');
    expect(nomi).toContain('manifest.json');
    expect(nomi).toContain('LEGGIMI.txt');
    const manifest = JSON.parse(voci.find((v) => v.nome === 'manifest.json')!.contenuto.toString('utf-8')) as { partite: number; esportatoIl: string };
    expect(manifest.partite).toBe(1);
    expect(manifest.esportatoIl).toMatch(/^\d{4}-/);
  });

  it('rifiuta i file che non sono database dell’app', async () => {
    expect(() => verificaDatabase(Buffer.from('non sono un database'))).toThrowError(/non è un database SQLite/);
    // file SQLite valido ma di un'altra applicazione
    const estraneo = path.join(dataDir, 'estraneo.db');
    const Database = (await import('better-sqlite3')).default;
    const altro = new Database(estraneo);
    altro.exec('CREATE TABLE cose (id INTEGER PRIMARY KEY)');
    altro.pragma('user_version = 3');
    altro.close();
    expect(() => verificaDatabase(fs.readFileSync(estraneo))).toThrowError(/non è un'istanza di project-p5r/);
  });

  it('ripristina da un database esportato: i dati tornano quelli del file e resta una copia di sicurezza', async () => {
    // istantanea con una sola partita, poi si aggiunge una seconda partita che il ripristino deve far sparire
    const copia = await copiaDatabase();
    const istantanea = fs.readFileSync(copia.percorso);
    fs.rmSync(copia.percorso, { force: true });
    prepared("INSERT INTO partita (nome, attiva, livello_protagonista, created_at, updated_at) VALUES ('Dopo la copia', 0, 1, 'x', 'x')").run();
    expect(statoIstanza().partite).toBe(2);

    const esito = await ripristinaIstanza(istantanea);
    expect(esito).toMatchObject({ formato: 'database', database: true, immagini: 0, caratteri: 0 });
    expect(esito.copiaDiSicurezza).toMatch(/^prima-del-ripristino-/);
    expect(fs.existsSync(path.join(dataDir, 'backups', esito.copiaDiSicurezza, 'project-p5r.db'))).toBe(true);
    expect(esito.stato.partite).toBe(1);
    // l'app è di nuovo utilizzabile: la connessione è aperta, migrazioni e seed applicati
    expect((prepared('SELECT COUNT(*) AS n FROM partita').get() as { n: number }).n).toBe(1);
    expect((prepared('SELECT COUNT(*) AS n FROM persona').get() as { n: number }).n).toBeGreaterThan(200);
    expect(fs.existsSync(`${resolveDbPath()}-wal`)).toBe(true); // WAL ricreato dalla nuova connessione
  });

  it('ripristina da uno ZIP dell’istanza: tornano anche immagini e caratteri, e la cartella viene sostituita in blocco', async () => {
    const zip = await copiaIstanza();
    // l'istanza corrente perde l'immagine: il ripristino la rimette
    fs.rmSync(path.join(dataDir, 'immagini', 'mappa', 'prova.png'), { force: true });
    fs.writeFileSync(path.join(dataDir, 'immagini', 'mappa', 'di-troppo.png'), Buffer.from('sostituita dal ripristino'));
    const esito = await ripristinaIstanza(zip.contenuto);
    expect(esito).toMatchObject({ formato: 'istanza', immagini: 1, caratteri: 1 });
    expect(fs.readFileSync(path.join(dataDir, 'immagini', 'mappa', 'prova.png')).toString()).toBe('finta immagine');
    expect(fs.existsSync(path.join(dataDir, 'immagini', 'mappa', 'di-troppo.png'))).toBe(false);
    expect(fs.readFileSync(path.join(dataDir, 'font', 'display.woff2')).toString()).toBe('finto carattere');
  });

  it('le voci dello ZIP che porterebbero fuori dalla cartella dati vengono scartate (anche con separatori Windows)', async () => {
    const { creaZip } = await import('../utils/zip.js');
    const copia = await copiaDatabase();
    const database = fs.readFileSync(copia.percorso);
    fs.rmSync(copia.percorso, { force: true });
    const fuori = path.join(path.dirname(dataDir), 'fuori-dalla-cartella-dati.txt');
    fs.rmSync(fuori, { force: true });
    const zip = creaZip([
      { nome: 'database/project-p5r.db', contenuto: database },
      { nome: 'immagini/../../fuori-dalla-cartella-dati.txt', contenuto: Buffer.from('con le barre normali') },
      { nome: 'immagini/..\\..\\fuori-dalla-cartella-dati.txt', contenuto: Buffer.from('con le barre rovesciate') },
      { nome: 'immagini/mappa/prova.png', contenuto: Buffer.from('finta immagine') },
    ]);
    const esito = await ripristinaIstanza(zip);
    // solo l'immagine legittima è stata scritta
    expect(esito.immagini).toBe(1);
    expect(fs.existsSync(fuori)).toBe(false);
    expect(fs.existsSync(path.join(dataDir, 'immagini', 'mappa', 'prova.png'))).toBe(true);
  });

  it('se il ripristino fallisce a metà, l’istanza torna com’era e il database resta utilizzabile', async () => {
    const partitePrima = statoIstanza().partite;
    // database valido ma con uno schema più avanzato di quello che le migrazioni sanno gestire: la riapertura fallisce
    const copia = await copiaDatabase();
    const rotto = fs.readFileSync(copia.percorso);
    fs.rmSync(copia.percorso, { force: true });
    const Database = (await import('better-sqlite3')).default;
    const percorsoRotto = path.join(dataDir, 'rotto.db');
    fs.writeFileSync(percorsoRotto, rotto);
    const db = new Database(percorsoRotto);
    db.exec('DROP TABLE traduzione'); // il seed non potrà più scrivere: il ripristino deve tornare indietro
    db.close();
    await expect(ripristinaIstanza(fs.readFileSync(percorsoRotto))).rejects.toThrowError(/Ripristino non riuscito/);
    // l'app è viva e i dati sono quelli di prima
    expect(statoIstanza().partite).toBe(partitePrima);
    expect((prepared('SELECT COUNT(*) AS n FROM traduzione').get() as { n: number }).n).toBeGreaterThan(0);
  });

  it('uno ZIP senza database viene rifiutato senza toccare l’istanza', async () => {
    const { creaZip } = await import('../utils/zip.js');
    const zip = creaZip([{ nome: 'immagini/mappa/altra.png', contenuto: Buffer.from('x') }]);
    await expect(ripristinaIstanza(zip)).rejects.toThrowError(/non contiene il database/);
    expect((prepared('SELECT COUNT(*) AS n FROM partita').get() as { n: number }).n).toBe(1);
  });
});
