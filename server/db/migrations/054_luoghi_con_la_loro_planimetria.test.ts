// ============================================================
// 054 — il luogo e la planimetria che porta il suo nome
// ============================================================
//
// La regola deve prendere i casi veri e **non allargarsi**: un nome uguale in un altro quartiere
// non è lo stesso posto, e un luogo che ha già il suo spillo non va toccato, perché lo spillo dice
// anche il punto e non solo la mappa.

import Database from 'better-sqlite3';
import { collegaLuoghiAllePlanimetrie } from './054_luoghi_con_la_loro_planimetria.js';

function istanza(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE luogo (chiave TEXT PRIMARY KEY, nome TEXT, quartiere_chiave TEXT);
    CREATE TABLE mappa (chiave TEXT PRIMARY KEY, nome TEXT, genitore_chiave TEXT);
    CREATE TABLE mappa_entita (mappa_chiave TEXT, entita_tipo TEXT, entita_chiave TEXT, fonte_json TEXT);
    CREATE TABLE spillo (id INTEGER PRIMARY KEY, riferimento_tipo TEXT, riferimento_chiave TEXT);
  `);
  const luogo = db.prepare('INSERT INTO luogo VALUES (?, ?, ?)');
  luogo.run('shujin-academy/biblioteca-shujin', 'Biblioteca scolastica', 'shujin-academy');
  luogo.run('shujin-academy/cancello-shujin', 'Cancello della scuola', 'shujin-academy');
  luogo.run('shujin-academy/aula-shujin', 'Aula del protagonista', 'shujin-academy');
  luogo.run('shujin-academy/infermeria-shujin', 'Infermeria', 'shujin-academy');
  luogo.run('shibuya/biblioteca-shibuya', 'Biblioteca', 'shibuya');
  const mappa = db.prepare('INSERT INTO mappa VALUES (?, ?, ?)');
  mappa.run('citta-shujin-academy', 'Shujin Academy', 'tokyo');
  mappa.run('citta-shibuya', 'Shibuya', 'tokyo');
  mappa.run('nativo-002-8', 'Biblioteca', 'citta-shujin-academy');
  mappa.run('nativo-002-1', 'Cancello della scuola', 'citta-shujin-academy');
  mappa.run('nativo-002-6', 'Aula', 'citta-shujin-academy');
  // L'aula ha già il suo spillo, sulla planimetria del piano: quello vince.
  db.prepare("INSERT INTO spillo VALUES (1, 'luogo', 'shujin-academy/aula-shujin')").run();
  return db;
}

describe('collegaLuoghiAllePlanimetrie', () => {
  it('collega il luogo alla planimetria che ne porta il nome, e solo nel suo quartiere', () => {
    const db = istanza();
    expect(collegaLuoghiAllePlanimetrie(db)).toBe(2);
    const righe = db.prepare('SELECT mappa_chiave, entita_tipo, entita_chiave FROM mappa_entita ORDER BY mappa_chiave').all();
    expect(righe).toEqual([
      { mappa_chiave: 'nativo-002-1', entita_tipo: 'luogo', entita_chiave: 'shujin-academy/cancello-shujin' },
      { mappa_chiave: 'nativo-002-8', entita_tipo: 'luogo', entita_chiave: 'shujin-academy/biblioteca-shujin' },
    ]);
    // La Biblioteca di Shibuya non si aggancia a quella della Shujin: altro quartiere, altro posto.
    expect(righe.some((r) => (r as { entita_chiave: string }).entita_chiave.startsWith('shibuya/'))).toBe(false);
  });

  it('non tocca chi ha già uno spillo, e non inventa dove la planimetria non c’è', () => {
    const db = istanza();
    collegaLuoghiAllePlanimetrie(db);
    const chiavi = (db.prepare('SELECT entita_chiave FROM mappa_entita').all() as Array<{ entita_chiave: string }>).map((r) => r.entita_chiave);
    expect(chiavi).not.toContain('shujin-academy/aula-shujin');
    expect(chiavi).not.toContain('shujin-academy/infermeria-shujin');
  });

  it('rifarla non aggiunge doppioni', () => {
    const db = istanza();
    collegaLuoghiAllePlanimetrie(db);
    expect(collegaLuoghiAllePlanimetrie(db)).toBe(0);
    expect(db.prepare('SELECT COUNT(*) n FROM mappa_entita').get()).toEqual({ n: 2 });
  });
});
