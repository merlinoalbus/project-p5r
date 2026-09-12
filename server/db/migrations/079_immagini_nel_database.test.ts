// Test migrazione 079 — le immagini entrano nel database: dai file delle righe, dalle famiglie del repository, dal pacchetto
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { assorbiImmagini, migration079 } from './079_immagini_nel_database.js';

let radice = '';
beforeEach(() => { radice = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-079-')); });
afterEach(() => { closeDb(); fs.rmSync(radice, { recursive: true, force: true }); });

function scrivi(rel: string, contenuto: string): void {
  const p = path.join(radice, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, contenuto);
}

it('aggiunge la colonna e assorbe i file delle righe, le famiglie del repository e il pacchetto; è idempotente', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 79));
  expect(() => db.prepare('SELECT contenuto FROM immagine').all()).toThrow();
  db.exec(`INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at) VALUES
    ('mappa', 'citta-yongen-jaya', 'uno.png', 'image/png', 1, 'x'),
    ('mappa', 'citta-shibuya', 'due.png', 'image/png', 1, 'x'),
    ('arcana', 'fool', 'tre.png', 'image/png', 1, 'x')`);
  // (1) i file delle righe: uno in DATA_DIR/immagini, uno in pacchetto/immagini, il terzo manca
  scrivi('dati/immagini/mappa/uno.png', 'pianta di yongen');
  scrivi('pacchetto/immagini/mappa/due.png', 'pianta di shibuya');
  // (2) le famiglie: chiave del manifesto, webp vince su png, sottocartelle e nomi con maiuscole in slug
  scrivi('asset/mappe/tokyo.png', 'tokyo png');
  scrivi('asset/mappe/tokyo.webp', 'tokyo webp');
  scrivi('asset/mappe/lmap/tokyo/Akasaka.png', 'sagoma');
  scrivi('asset/sfondi/mementos.webp', 'sfondo');
  scrivi('asset/mappe/README.md', 'ignorato');
  scrivi('asset/ui/nav-home.png', 'resta fuori');
  scrivi('asset/persona/jack-frost.png', 'resta fuori');
  // (3) il pacchetto del repository con le immagini dentro: una nuova e una che l'istanza ha già piena
  const pacchetto = new Database(path.join(radice, 'pacchetto', 'gioco.db'));
  pacchetto.exec("CREATE TABLE immagine (id INTEGER PRIMARY KEY, ambito TEXT, chiave TEXT, nome_file TEXT, mime TEXT, byte INTEGER, created_at TEXT, origine_url TEXT, contenuto BLOB, UNIQUE (ambito, chiave))");
  pacchetto.prepare("INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES ('illustrazioni', 'vuoto', 'vuoto.png', 'image/png', 3, 'p', ?)").run(Buffer.from('dal pacchetto'));
  pacchetto.prepare("INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES ('mappe', 'tokyo', 'tokyo.png', 'image/png', 3, 'p', ?)").run(Buffer.from('tokyo dal pacchetto'));
  pacchetto.close();

  // in memoria la sorgente (3) è ignorata: si prova su un file vero
  db.exec("ALTER TABLE immagine ADD COLUMN contenuto BLOB");
  const suFile = new Database(path.join(radice, 'istanza.db'));
  suFile.exec(db.prepare("SELECT sql FROM sqlite_master WHERE name = 'immagine'").pluck().get() as string);
  for (const r of db.prepare('SELECT ambito, chiave, nome_file, mime, byte, created_at FROM immagine').all() as Array<Record<string, unknown>>) suFile.prepare('INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(r.ambito, r.chiave, r.nome_file, r.mime, r.byte, r.created_at);
  const opzioni = { radici: [path.join(radice, 'dati', 'immagini'), path.join(radice, 'pacchetto', 'immagini')], dirAsset: path.join(radice, 'asset'), pacchetto: path.join(radice, 'pacchetto', 'gioco.db') };
  expect(assorbiImmagini(suFile, opzioni)).toEqual({ daDisco: 2, dalRepository: 3, dalPacchetto: 1, senzaContenuto: 1 });
  const leggi = (ambito: string, chiave: string) => suFile.prepare('SELECT contenuto, mime, byte FROM immagine WHERE ambito = ? AND chiave = ?').get(ambito, chiave) as { contenuto: Buffer | null; mime: string; byte: number };
  expect(leggi('mappa', 'citta-yongen-jaya').contenuto?.toString()).toBe('pianta di yongen');
  expect(leggi('mappa', 'citta-shibuya').contenuto?.toString()).toBe('pianta di shibuya');
  expect(leggi('arcana', 'fool').contenuto).toBeNull();
  expect(leggi('mappe', 'tokyo')).toMatchObject({ mime: 'image/webp', byte: 'tokyo webp'.length });
  expect(leggi('mappe', 'lmap/tokyo/akasaka').contenuto?.toString()).toBe('sagoma');
  expect(leggi('sfondi', 'mementos').mime).toBe('image/webp');
  expect(leggi('illustrazioni', 'vuoto').contenuto?.toString()).toBe('dal pacchetto');
  expect(suFile.prepare("SELECT COUNT(*) AS n FROM immagine WHERE ambito IN ('ui', 'persona')").get()).toEqual({ n: 0 });
  // di nuovo: nulla cambia
  expect(assorbiImmagini(suFile, opzioni)).toEqual({ daDisco: 0, dalRepository: 0, dalPacchetto: 0, senzaContenuto: 1 });
  suFile.close();

  // la migrazione vera sul database in memoria: colonna già aggiunta sopra, resta idempotente e la versione avanza
  runMigrations(db);
  expect(db.pragma('main.user_version', { simple: true })).toBe(migrations[migrations.length - 1].id);
  expect(migration079.id).toBe(79);
  expect(db.prepare('SELECT COUNT(*) AS n FROM immagine').get()).toEqual({ n: 3 });
});
