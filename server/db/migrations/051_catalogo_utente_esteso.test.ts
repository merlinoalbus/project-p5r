// ============================================================
// Test 051 — quel che l'utente aggiunge o corregge in libri, film e attività sopravvive al reseed
// ============================================================
//
// La prova serve perché il difetto che previene è invisibile finché non capita: un libro aggiunto
// a mano non sparisce subito, sparisce **al primo aggiornamento dei dati della guida** — cioè
// giorni dopo, quando nessuno collega più le due cose. Prima di questa migrazione il caricatore
// cancellava ogni riga che non trovasse nel file, senza distinguere chi l'avesse messa.
// ============================================================

import path from 'node:path';
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { caricaSeed } from '../../services/seed/caricaSeed.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../../data/seed');

describe('catalogo utente esteso a libri, film e attività', () => {
  afterEach(() => closeDb());

  it('un libro aggiunto a mano non viene cancellato dal reseed', () => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    db.prepare(`INSERT INTO libro (chiave, ordine, nome, nome_it, dove, prezzo, disponibile_dal, dote, note, sblocca, sessioni, dettagli, fonte, verificato, origine)
      VALUES ('u-manuale', 900, 'Manuale di prova', NULL, 'Biblioteca', 0, NULL, 'conoscenza', 2, NULL, 1, NULL, 'https://esempio.it', 0, 'utente')`).run();

    caricaSeed(db, DIR_SEED, true);

    expect(db.prepare("SELECT nome FROM libro WHERE chiave = 'u-manuale'").get()).toEqual({ nome: 'Manuale di prova' });
  });

  it('una correzione a un film della guida non viene sovrascritta dal reseed', () => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    const f = db.prepare("SELECT chiave, nome FROM film WHERE origine = 'seed' ORDER BY chiave LIMIT 1").get() as { chiave: string; nome: string };
    db.prepare("UPDATE film SET nome = ?, origine = 'utente' WHERE chiave = ?").run(`${f.nome} (corretto)`, f.chiave);

    caricaSeed(db, DIR_SEED, true);

    expect((db.prepare('SELECT nome FROM film WHERE chiave = ?').get(f.chiave) as { nome: string }).nome).toBe(`${f.nome} (corretto)`);
  });

  it('le righe della guida continuano a essere aggiornate dal reseed', () => {
    // Il rovescio della medaglia, e vale quanto l'altro: se il predicato fosse scritto male —
    // per esempio dimenticando il confronto — il seed smetterebbe di aggiornare *tutto*, e i dati
    // della guida resterebbero fermi per sempre senza che nessuno se ne accorga.
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    const a = db.prepare("SELECT chiave, nome FROM attivita WHERE origine = 'seed' ORDER BY chiave LIMIT 1").get() as { chiave: string; nome: string };
    db.prepare('UPDATE attivita SET nome = ? WHERE chiave = ?').run('storpiato', a.chiave);

    caricaSeed(db, DIR_SEED, true);

    expect((db.prepare('SELECT nome FROM attivita WHERE chiave = ?').get(a.chiave) as { nome: string }).nome).toBe(a.nome);
  });
});
