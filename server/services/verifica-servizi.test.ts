// ============================================================
// Test della verifica completa del codice (2026-10-03), lotto servizi e DB: C1 lucchetto comune, C2 schema più nuovo,
// C3 scrittura atomica, C4 chiavi esterne nella transazione della migrazione, C5 riapertura fallita, C6 transazioni,
// B3' livello di Joker, B4' giornali della verifica, B5' giornali delle copie di avvio, B6' copie contate una volta.
// ============================================================
//
// Usa una cartella dati temporanea, come `impostazioniService.test.ts`: il servizio lavora su file reali.
// ============================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { closeDb, getDb, initDb, prepared } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { pulisciGiornaliOrfani } from '../db/backupService.js';
import { caricaPacchetto } from './pacchetto/pacchettoGioco.js';
import { copiaDatabase, ripristinaIstanza, scriviDatabase, statoIstanza, tornaAllaCopiaDiSicurezza, verificaDatabase } from './impostazioniService.js';
import { importaPacchetto } from './pacchettoGiocoService.js';
import { creaPartita, aggiornaPartita } from './partiteService.js';
import { impostaMembro, squadraPartita } from './squadraService.js';
import { impostaMeteo } from './meteoService.js';
import { creaObiettivo, eliminaObiettivo, obiettivi } from './obiettiviService.js';

let dataDir = '';

beforeAll(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-verifica-servizi-'));
  (config as { dataDir: string }).dataDir = dataDir;
  caricaPacchetto(initDb());
});

afterAll(() => {
  closeDb();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

/** Una copia del file delle partite con `user_version` cambiato. */
async function partiteConVersione(versione: number): Promise<Buffer> {
  const copia = await copiaDatabase('partite');
  const db = new Database(copia.percorso);
  db.pragma(`user_version = ${versione}`);
  db.close();
  const contenuto = fs.readFileSync(copia.percorso);
  for (const coda of ['', '-wal', '-shm']) fs.rmSync(`${copia.percorso}${coda}`, { force: true });
  return contenuto;
}

describe('verifica servizi e DB', () => {
  it('C1: un ripristino in corso respinge un secondo ripristino e un\'importazione del pacchetto (409)', async () => {
    const istantanea = await partiteConVersione(getDb().pragma('utente.user_version', { simple: true }) as number);
    const primo = ripristinaIstanza(istantanea);
    await expect(ripristinaIstanza(istantanea)).rejects.toMatchObject({ code: 'importazione-in-corso', status: 409 });
    await expect(importaPacchetto(Buffer.from('qualunque cosa'))).rejects.toMatchObject({ code: 'importazione-in-corso', status: 409 });
    await primo;
    // finito il primo, il lucchetto è libero
    const secondo = await ripristinaIstanza(istantanea);
    expect(secondo.partite).toBe(true);
  });

  it('C2: un file delle partite con uno schema più nuovo del codice non si ripristina', async () => {
    const nuovo = await partiteConVersione(9999);
    await expect(ripristinaIstanza(nuovo)).rejects.toMatchObject({ code: 'database-troppo-nuovo' });
    expect(prepared('SELECT COUNT(*) AS n FROM persona').get()).toBeDefined(); // l'istanza è rimasta aperta
  });

  it('C3: se la scrittura si interrompe, il database vivo resta intatto e non restano file a metà', () => {
    const bersaglio = path.join(dataDir, 'atomico.db');
    fs.writeFileSync(bersaglio, 'contenuto originale');
    const scrivi = vi.spyOn(fs, 'writeSync').mockImplementation(() => { throw new Error('ENOSPC: disco pieno'); });
    try {
      expect(() => scriviDatabase(Buffer.from('contenuto nuovo che non arriverà'), bersaglio)).toThrow('ENOSPC');
    } finally {
      scrivi.mockRestore();
    }
    expect(fs.readFileSync(bersaglio, 'utf-8')).toBe('contenuto originale');
    expect(fs.readdirSync(dataDir).filter((f) => f.startsWith('atomico.db.nuovo'))).toEqual([]);
    scriviDatabase(Buffer.from('contenuto nuovo'), bersaglio);
    expect(fs.readFileSync(bersaglio, 'utf-8')).toBe('contenuto nuovo');
  });

  it('C4: una migrazione che viola una chiave esterna è annullata e resta da applicare', () => {
    const versione = getDb().pragma('main.user_version', { simple: true }) as number;
    const rotta = { id: versione + 1, name: 'prova_violazione', up: (db: Database.Database) => { db.prepare("INSERT INTO articolo (chiave, negozio_chiave, ordine, nome, categoria) VALUES ('art-orfano-c4', 'negozio-inesistente-c4', 0, 'Orfano', 'altro')").run(); } };
    expect(() => runMigrations(getDb(), [rotta as never], [])).toThrow(/violazioni di integrità referenziale/);
    expect(getDb().pragma('main.user_version', { simple: true })).toBe(versione);
    expect(prepared("SELECT COUNT(*) AS n FROM articolo WHERE chiave = 'art-orfano-c4'").get()).toEqual({ n: 0 });
    // e al giro dopo la si ritrova da applicare, non già «applicata»
    expect(() => runMigrations(getDb(), [rotta as never], [])).toThrow(/violazioni di integrità referenziale/);
  });

  it('C5: se dopo un errore anche la riapertura fallisce, l\'errore lo dice e indica la copia di sicurezza', () => {
    const vera = config.dataDir;
    const rotta = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-riapertura-'));
    fs.mkdirSync(path.join(rotta, config.dbFileName)); // al posto del file c'è una cartella: SQLite non la apre
    (config as { dataDir: string }).dataDir = rotta;
    let errore: unknown;
    try {
      tornaAllaCopiaDiSicurezza(path.join(rotta, 'copia-inesistente'), new Error('scrittura fallita'), 'ripristino-fallito', 'Ripristino');
    } catch (err) {
      errore = err;
    } finally {
      (config as { dataDir: string }).dataDir = vera;
      fs.rmSync(rotta, { recursive: true, force: true });
      initDb();
    }
    expect(errore).toMatchObject({ code: 'internal-error', status: 500 });
    expect((errore as Error).message).toMatch(/riavvia il server/);
    expect((errore as Error).message).toMatch(/copia-inesistente/);
  });

  it('C6: meteo ed eliminazione di un obiettivo cambiano insieme alla data della partita, o per niente', () => {
    const id = creaPartita({ nome: 'Transazioni C6' }).id;
    const ob = creaObiettivo(id, prepared('SELECT id FROM persona LIMIT 1').pluck().get() as number, {});
    getDb().exec("CREATE TEMP TRIGGER blocca_c6 BEFORE UPDATE OF updated_at ON utente.partita BEGIN SELECT RAISE(ABORT, 'bloccato dal test'); END;");
    try {
      expect(() => impostaMeteo(id, '04-12', { giorno: 'pioggia' })).toThrow();
      expect(() => eliminaObiettivo(id, ob.id)).toThrow();
    } finally {
      getDb().exec('DROP TRIGGER temp.blocca_c6');
    }
    expect(prepared('SELECT COUNT(*) AS n FROM meteo_partita WHERE partita_id = ?').get(id)).toEqual({ n: 0 });
    expect(obiettivi(id).map((o) => o.id)).toContain(ob.id);
  });

  it('B3\': il livello di Joker è uno solo, da qualunque scheda lo si cambi', () => {
    const id = creaPartita({ nome: 'Joker' }).id;
    impostaMembro(id, 'joker', { livello: 12 });
    expect(squadraPartita(id).membri.find((m) => m.chiave === 'joker')!.livello).toBe(12);
    aggiornaPartita(id, { livelloProtagonista: 30 });
    expect(squadraPartita(id).membri.find((m) => m.chiave === 'joker')!.livello).toBe(30);
    expect(prepared("SELECT livello FROM membro_squadra_partita WHERE partita_id = ? AND personaggio_chiave = 'joker'").get(id)).toEqual({ livello: 30 });
    impostaMembro(id, 'joker', { deltaLivello: 1 });
    expect(prepared('SELECT livello_protagonista FROM partita WHERE id = ?').get(id)).toEqual({ livello_protagonista: 31 });
  });

  it('B4\': la verifica di un file non lascia giornali in data/tmp', async () => {
    const copia = await copiaDatabase('gioco');
    const contenuto = fs.readFileSync(copia.percorso);
    for (const coda of ['', '-wal', '-shm']) fs.rmSync(`${copia.percorso}${coda}`, { force: true });
    expect(verificaDatabase(contenuto)).toBe('gioco');
    expect(fs.readdirSync(path.join(dataDir, 'tmp')).filter((f) => f.startsWith('verifica-'))).toEqual([]);
  });

  it('B5\': i giornali delle copie di avvio rimasti senza il loro database si tolgono; quelli di una copia presente restano', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-giornali-'));
    for (const f of ['project-p5r-A.db-wal', 'project-p5r-A.db-shm', 'project-p5r-B.db', 'project-p5r-B.db-wal', 'project-p5r-B.partite.db-shm', 'altro.db-wal']) fs.writeFileSync(path.join(dir, f), 'x');
    pulisciGiornaliOrfani(dir);
    expect(fs.readdirSync(dir).sort()).toEqual(['altro.db-wal', 'project-p5r-B.db', 'project-p5r-B.db-wal']);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('B6\': una copia di avvio (gioco + partite) si conta una volta', () => {
    const backups = path.join(dataDir, 'backups');
    fs.mkdirSync(backups, { recursive: true });
    const prima = statoIstanza().copieDiSicurezza;
    fs.writeFileSync(path.join(backups, 'project-p5r-2026-10-03T00-00-00-000Z.db'), 'x');
    fs.writeFileSync(path.join(backups, 'project-p5r-2026-10-03T00-00-00-000Z.partite.db'), 'x');
    expect(statoIstanza().copieDiSicurezza).toBe(prima + 1);
  });
});
