// ============================================================
// Test sincronizzaMappe — gli spilli di seed già esistenti seguono il registro quando cambia la corrispondenza dei tipi
// ============================================================

import path from 'node:path';
import { closeDb, initDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { caricaSeed } from '../seed/caricaSeed.js';
import { sincronizzaMappe } from './sincronizzaMappe.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../../data/seed');

describe('sincronizzaMappe: riclassificazione degli spilli di seed', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
  });
  afterAll(() => closeDb());

  it('riporta al tipo del registro uno spillo di seed rimasto a un tipo vecchio, senza toccare quelli dell’utente', () => {
    const db = initDb(':memory:');
    const enigma = db.prepare(`SELECT s.id, s.tipo, s.collezionabile, s.riferimento_chiave FROM spillo s JOIN punto_interesse p ON p.chiave = s.riferimento_chiave
      WHERE s.riferimento_tipo = 'punto' AND s.origine = 'seed' AND p.tipo = 'puzzle' LIMIT 1`).get() as { id: number; tipo: string; collezionabile: number; riferimento_chiave: string };
    expect(enigma.tipo).toBe('punto-sensibile');
    // simulo il dato lasciato da una versione precedente del registro
    db.prepare("UPDATE spillo SET tipo = 'nota', collezionabile = 1 WHERE id = ?").run(enigma.id);
    // uno spillo dell'utente sullo stesso punto non deve essere riclassificato
    const mappa = (db.prepare('SELECT mappa_chiave FROM spillo WHERE id = ?').get(enigma.id) as { mappa_chiave: string }).mappa_chiave;
    const utente = db.prepare(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at)
      VALUES (?, 'nota', 'Mio appunto', '', 10, 10, 'punto', ?, 0, 99, 'utente', '2026-01-01T00:00:00.000Z')`).run(mappa, enigma.riferimento_chiave);

    const esito = sincronizzaMappe(db);
    expect(esito.riclassificati).toBeGreaterThanOrEqual(1);
    const dopo = db.prepare('SELECT tipo, collezionabile FROM spillo WHERE id = ?').get(enigma.id) as { tipo: string; collezionabile: number };
    expect(dopo.tipo).toBe('punto-sensibile');
    expect(dopo.collezionabile).toBe(enigma.collezionabile);
    const mio = db.prepare('SELECT tipo FROM spillo WHERE id = ?').get(Number(utente.lastInsertRowid)) as { tipo: string };
    expect(mio.tipo).toBe('nota');
    // una seconda sincronizzazione non cambia più nulla
    expect(sincronizzaMappe(db).riclassificati).toBe(0);
  });

  it('nel database sincronizzato esistono i cinque tipi nuovi dove i punti lo prevedono', () => {
    const db = initDb(':memory:');
    const tipi = new Set((db.prepare('SELECT DISTINCT tipo FROM spillo').all() as Array<{ tipo: string }>).map((r) => r.tipo));
    expect(tipi.has('punto-sensibile')).toBe(true);
    expect(tipi.has('seme-bramosia')).toBe(true);
    expect(tipi.has('oggetto-chiave')).toBe(true);
    expect(tipi.has('nemico')).toBe(true);
    // nessun enigma resta «nota»
    expect((db.prepare(`SELECT COUNT(*) AS n FROM spillo s JOIN punto_interesse p ON p.chiave = s.riferimento_chiave WHERE s.riferimento_tipo = 'punto' AND p.tipo = 'puzzle' AND s.tipo = 'nota' AND s.origine = 'seed'`).get() as { n: number }).n).toBe(0);
  });
});
