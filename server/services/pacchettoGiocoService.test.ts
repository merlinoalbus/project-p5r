// ============================================================
// Test pacchettoGiocoService — esportazione, anteprima e importazione del pacchetto di gioco (voce 10)
// ============================================================
//
// Istanza reale in una cartella temporanea (il servizio lavora su file: gioco.db, partite.db, copie di
// sicurezza). Le partite devono restare intatte attraverso l'importazione: è il contratto.
// ============================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { closeDb, getDb, initDb, prepared, resolvePartitePath } from '../db/dbService.js';
import { migrations } from '../db/migrations/index.js';
import { caricaPacchetto } from './pacchetto/pacchettoGioco.js';
import { creaPartita } from './partiteService.js';
import { copiaIstanza } from './impostazioniService.js';
import { anteprimaPacchetto, esportaPacchetto, importaPacchetto, orfaniPartite, versioneSchemaCodice } from './pacchettoGiocoService.js';

let dataDir = '';
let partitaId = 0;

const NEGOZIO = 'untouchable';
const ARTICOLO_NUOVO = `${NEGOZIO}/u-prova-pacchetto`;
const VIDEOGIOCO_INESISTENTE = 'videogioco-che-non-esiste';
/** Gli orfani attesi dopo le righe di prova: l'articolo aggiunto dopo l'esportazione e il videogioco inesistente (nell'ordine di RIFERIMENTI_PARTITE). */
const ORFANI_ATTESI = [
  { tabella: 'acquisto_partita', colonna: 'articolo_chiave', entita: 'articolo', righe: 1, partite: 1, esempi: [ARTICOLO_NUOVO], nota: null },
  { tabella: 'progresso_videogioco_partita', colonna: 'videogioco_chiave', entita: 'videogioco', righe: 1, partite: 1, esempi: [VIDEOGIOCO_INESISTENTE], nota: null },
];

function unArticolo(): string {
  return (prepared('SELECT chiave FROM articolo WHERE negozio_chiave = ? ORDER BY chiave LIMIT 1').get(NEGOZIO) as { chiave: string }).chiave;
}

/** Il pacchetto esportato, letto in memoria e ripulito del file temporaneo. */
async function pacchettoEsportato(): Promise<Buffer> {
  const { percorso, nome } = await esportaPacchetto();
  expect(nome).toMatch(/^project-p5r-gioco-.*\.db$/);
  const contenuto = fs.readFileSync(percorso);
  fs.rmSync(percorso, { force: true });
  return contenuto;
}

/** Una copia del pacchetto modificata a parte (versione, tabelle…). */
function pacchettoModificato(contenuto: Buffer, modifica: (db: Database.Database) => void): Buffer {
  const prova = path.join(dataDir, `modificato-${Date.now()}.db`);
  fs.writeFileSync(prova, contenuto);
  const db = new Database(prova);
  db.pragma('journal_mode = DELETE');
  modifica(db);
  db.close();
  const esito = fs.readFileSync(prova);
  fs.rmSync(prova, { force: true });
  return esito;
}

beforeAll(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-pacchetto-'));
  (config as { dataDir: string }).dataDir = dataDir;
  const db = initDb();
  caricaPacchetto(db);
  prepared("INSERT OR REPLACE INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES ('mappe', 'tokyo', 'tokyo.png', 'image/png', 5, 'x', ?)").run(Buffer.from('tokyo'));
  partitaId = creaPartita({ nome: 'Pacchetto', livelloProtagonista: 1 }).id;
  prepared('INSERT INTO acquisto_partita (partita_id, articolo_chiave, updated_at) VALUES (?, ?, ?)').run(partitaId, unArticolo(), 'x');
});

afterAll(() => {
  closeDb();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('pacchettoGiocoService — pacchetto di gioco (voce 10)', () => {
  it('la versione dello schema che il codice sa leggere è l’ultima migrazione', () => {
    expect(versioneSchemaCodice()).toBe(migrations[migrations.length - 1].id);
  });

  it('esporta il solo gioco.db, con le immagini dentro e senza partite', async () => {
    const gioco = await pacchettoEsportato();
    expect(gioco.toString('utf-8', 0, 15)).toBe('SQLite format 3');
    const prova = path.join(dataDir, 'esportato.db');
    fs.writeFileSync(prova, gioco);
    const db = new Database(prova, { readonly: true });
    expect(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'partita'").get()).toEqual({ n: 0 });
    expect((db.prepare("SELECT contenuto FROM immagine WHERE ambito = 'mappe' AND chiave = 'tokyo'").get() as { contenuto: Buffer }).contenuto.toString()).toBe('tokyo');
    expect(db.pragma('user_version', { simple: true })).toBe(getDb().pragma('main.user_version', { simple: true }));
    db.close();
    fs.rmSync(prova, { force: true });
  });

  it('l’anteprima confronta tabelle e immagini con l’istanza e trova gli orfani delle partite, senza toccare nulla', async () => {
    const contenuto = await pacchettoEsportato();
    // dopo l'esportazione l'istanza cambia: un articolo in più, acquistato in partita → nel pacchetto non c'è; un'immagine in più
    prepared("INSERT INTO articolo (chiave, negozio_chiave, ordine, nome, prezzo, categoria, origine, nascosto, updated_at) VALUES (?, ?, 999, 'Prova pacchetto', 100, 'altro', 'utente', 0, 'x')").run(ARTICOLO_NUOVO, NEGOZIO);
    prepared('INSERT INTO acquisto_partita (partita_id, articolo_chiave, updated_at) VALUES (?, ?, ?)').run(partitaId, ARTICOLO_NUOVO, 'x');
    // i videogiochi sono attività: uno vero non è orfano, uno inesistente sì; le Doti stanno in `dote_sociale`
    const videogioco = (prepared("SELECT chiave FROM attivita WHERE tipo = 'videogioco' ORDER BY chiave LIMIT 1").get() as { chiave: string }).chiave;
    prepared('INSERT INTO progresso_videogioco_partita (partita_id, videogioco_chiave, avanzamento, updated_at) VALUES (?, ?, 1, ?)').run(partitaId, videogioco, 'x');
    prepared('INSERT INTO progresso_videogioco_partita (partita_id, videogioco_chiave, avanzamento, updated_at) VALUES (?, ?, 1, ?)').run(partitaId, VIDEOGIOCO_INESISTENTE, 'x');
    prepared('INSERT OR REPLACE INTO dote_sociale_partita (partita_id, dote_chiave, punti, updated_at) VALUES (?, ?, 3, ?)').run(partitaId, 'coraggio', 'x');
    prepared("INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES ('sfondi', 'prova-anteprima', 'm.webp', 'image/webp', 1, 'x', ?)").run(Buffer.from('m'));
    const articoliOra = (prepared('SELECT COUNT(*) AS n FROM articolo').get() as { n: number }).n;
    const immaginiOra = (prepared('SELECT COUNT(*) AS n FROM immagine').get() as { n: number }).n;
    const a = anteprimaPacchetto(contenuto);
    expect(a.importabile).toBe(true);
    expect(a.motivo).toBeNull();
    expect(a.versioneSchema).toBe(a.versioneSchemaIstanza);
    expect(a.versioneSchemaCodice).toBe(versioneSchemaCodice());
    expect(a.databaseByte).toBe(contenuto.length);
    expect(a.differenze).toEqual([{ tabella: 'articolo', istanza: articoliOra, pacchetto: articoliOra - 1 }, { tabella: 'immagine', istanza: immaginiOra, pacchetto: immaginiOra - 1 }]);
    expect(a.tabelleAssenti).toEqual([]);
    expect(a.immagini).toEqual({ istanza: 2, pacchetto: 1 });
    expect(a.orfani).toEqual(ORFANI_ATTESI);
    // nulla è cambiato
    expect((prepared('SELECT COUNT(*) AS n FROM articolo').get() as { n: number }).n).toBe(articoliOra);
    expect(prepared("SELECT 1 FROM immagine WHERE ambito = 'sfondi' AND chiave = 'prova-anteprima'").get()).toBeTruthy();
  });

  it('un pacchetto più nuovo del codice non è importabile; una tabella di gioco assente rende orfane le righe che la referenziano', async () => {
    const contenuto = await pacchettoEsportato();
    const nuovo = pacchettoModificato(contenuto, (db) => { db.pragma('user_version = 9999'); });
    const a = anteprimaPacchetto(nuovo);
    expect(a.importabile).toBe(false);
    expect(a.motivo).toMatch(/schema 9999, più nuovo/);
    expect(a.versioneSchema).toBe(9999);
    await expect(importaPacchetto(nuovo)).rejects.toMatchObject({ code: 'pacchetto-troppo-nuovo' });
    const senzaArticoli = pacchettoModificato(contenuto, (db) => { db.exec('PRAGMA foreign_keys = OFF; DROP TABLE articolo;'); });
    const b = anteprimaPacchetto(senzaArticoli);
    expect(b.tabelleAssenti).toContain('articolo');
    expect(b.orfani.find((o) => o.tabella === 'acquisto_partita')).toMatchObject({ righe: 2, partite: 1, nota: 'la tabella «articolo» non c\'è nel pacchetto' });
  });

  it('rifiuta ciò che non è un pacchetto di gioco: non SQLite, backup ZIP dell’istanza, database con le partite', async () => {
    expect(() => anteprimaPacchetto(Buffer.from('non sono un database'))).toThrowError(expect.objectContaining({ code: 'pacchetto-non-valido' }));
    const backup = await copiaIstanza();
    expect(() => anteprimaPacchetto(backup.contenuto)).toThrowError(expect.objectContaining({ code: 'pacchetto-non-valido' }));
    const contenuto = await pacchettoEsportato();
    const conPartite = pacchettoModificato(contenuto, (db) => { db.exec('CREATE TABLE partita (id INTEGER PRIMARY KEY)'); });
    expect(() => anteprimaPacchetto(conPartite)).toThrowError(expect.objectContaining({ code: 'pacchetto-con-partite' }));
    const soloPartite = pacchettoModificato(contenuto, (db) => { db.exec('PRAGMA foreign_keys = OFF; DROP TABLE persona; CREATE TABLE partita (id INTEGER PRIMARY KEY)'); });
    expect(() => anteprimaPacchetto(soloPartite)).toThrowError(expect.objectContaining({ code: 'pacchetto-con-partite' }));
  });

  it('importa: i dati di gioco tornano quelli del pacchetto (immagini comprese), le partite restano e gli orfani sono elencati', async () => {
    // il pacchetto senza l'articolo nuovo e senza lo sfondo aggiunto dopo
    const contenuto = pacchettoModificato(await pacchettoEsportato(), (db) => { db.prepare('DELETE FROM articolo WHERE chiave = ?').run(ARTICOLO_NUOVO); db.exec("DELETE FROM immagine WHERE ambito = 'sfondi' AND chiave = 'prova-anteprima'"); });
    const partitePrima = fs.statSync(resolvePartitePath()).size;
    const e = await importaPacchetto(contenuto);
    expect(e.versioneSchema).toBe(versioneSchemaCodice());
    expect(e.versioneSchemaPacchetto).toBe(versioneSchemaCodice());
    expect(e.migrazioniApplicate).toBe(0);
    expect(e.immagini).toBe(1);
    expect(e.copiaDiSicurezza).toMatch(/^prima-del-ripristino-/);
    expect(fs.existsSync(path.join(dataDir, 'backups', e.copiaDiSicurezza, 'gioco.db'))).toBe(true);
    expect(e.orfani).toEqual(ORFANI_ATTESI);
    expect(e.stato.partite).toBe(1);
    expect(e.stato.immagini).toEqual({ file: 1, byte: 5 });
    // dati di gioco: l'articolo nuovo e lo sfondo non ci sono più; l'immagine del pacchetto sì; partite: gli acquisti ci sono ancora (anche quello orfano)
    expect(prepared('SELECT 1 FROM articolo WHERE chiave = ?').get(ARTICOLO_NUOVO)).toBeUndefined();
    expect(prepared("SELECT 1 FROM immagine WHERE ambito = 'sfondi' AND chiave = 'prova-anteprima'").get()).toBeUndefined();
    expect((prepared("SELECT contenuto FROM immagine WHERE ambito = 'mappe' AND chiave = 'tokyo'").get() as { contenuto: Buffer }).contenuto.toString()).toBe('tokyo');
    expect((prepared('SELECT COUNT(*) AS n FROM acquisto_partita WHERE partita_id = ?').get(partitaId) as { n: number }).n).toBe(2);
    expect(prepared('SELECT nome FROM partita WHERE id = ?').get(partitaId)).toEqual({ nome: 'Pacchetto' });
    expect(fs.statSync(resolvePartitePath()).size).toBeGreaterThanOrEqual(partitePrima);
    // la connessione riaperta legge entrambi i file
    expect(orfaniPartite(getDb())).toEqual(e.orfani);
  });

  it('se l’importazione fallisce a connessione chiusa, l’istanza torna com’era', async () => {
    const contenuto = await pacchettoEsportato();
    // uno schema fermo alla 66 senza la tabella spillo: la 067 non può applicarsi, l'importazione deve tornare indietro
    const rotto = pacchettoModificato(contenuto, (db) => { db.exec('PRAGMA foreign_keys = OFF; DROP TABLE spillo_immagine; DROP TABLE spillo_destinazione; DROP TABLE spillo'); db.pragma('user_version = 66'); });
    const articoliPrima = (prepared('SELECT COUNT(*) AS n FROM articolo').get() as { n: number }).n;
    await expect(importaPacchetto(rotto)).rejects.toMatchObject({ code: 'importazione-fallita' });
    expect((prepared('SELECT COUNT(*) AS n FROM articolo').get() as { n: number }).n).toBe(articoliPrima);
    expect(prepared('SELECT nome FROM partita WHERE id = ?').get(partitaId)).toEqual({ nome: 'Pacchetto' });
    expect(getDb().pragma('main.user_version', { simple: true })).toBe(versioneSchemaCodice());
  });
});
