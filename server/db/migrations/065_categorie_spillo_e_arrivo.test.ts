// ============================================================
// Test migrazione 065 — la destinazione diventa «mappa + spillo» e la categoria decide il resto
// ============================================================

import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';

afterEach(() => closeDb());

it('risolve il punto d’arrivo nello spillo più vicino, toglie destinazioni e condizioni fuori categoria, forza collezionabile e lascia i riferimenti ammessi', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 65));
  const t = '2026-09-12T00:00:00Z';
  db.prepare("INSERT INTO mappa (chiave, nome, tipo, ordine, origine, note, updated_at) VALUES ('partenza','Partenza','luogo',0,'utente','',?), ('arrivo','Arrivo','luogo',0,'utente','',?)").run(t, t);
  const ins = db.prepare("INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at, condizioni_json) VALUES (?,?,?,?,?,?,?,?,?,?,'utente',?,?)");
  const ingresso = Number(ins.run('arrivo', 'porta', 'Ingresso', '', 50, 90, null, null, 0, 0, t, null).lastInsertRowid);
  const vicino = Number(ins.run('partenza', 'passaggio', 'Vicino', '', 10, 10, 'mappa', 'arrivo', 1, 0, t, null).lastInsertRowid);
  const lontano = Number(ins.run('partenza', 'passaggio', 'Lontano', '', 20, 10, 'mappa', 'arrivo', 0, 0, t, null).lastInsertRowid);
  const negozio = Number(ins.run('partenza', 'negozio', 'Bottega', '', 30, 10, 'mappa', 'arrivo', 1, 0, t, JSON.stringify([{ tipo: 'piove' }])).lastInsertRowid);
  const forziere = Number(ins.run('partenza', 'forziere', 'Scrigno', '', 40, 10, 'punto', 'p1', 0, 0, t, null).lastInsertRowid);
  const scorciatoia = Number(ins.run('partenza', 'scorciatoia', 'Taglio', '', 60, 10, 'punto', 'p2', 0, 0, t, null).lastInsertRowid);
  const dest = db.prepare('INSERT INTO spillo_destinazione (spillo_id, mappa_chiave, x, y, zoom) VALUES (?,?,?,?,?)');
  dest.run(vicino, 'arrivo', 52, 88, 2);
  dest.run(lontano, 'arrivo', 5, 5, 2);
  dest.run(negozio, 'arrivo', 50, 90, 2);

  runMigrations(db);

  const arrivo = (id: number) => db.prepare('SELECT mappa_chiave, spillo_arrivo_id FROM spillo_destinazione WHERE spillo_id = ?').get(id) as { mappa_chiave: string; spillo_arrivo_id: number | null } | undefined;
  expect(arrivo(vicino)).toEqual({ mappa_chiave: 'arrivo', spillo_arrivo_id: ingresso });
  expect(arrivo(lontano)).toEqual({ mappa_chiave: 'arrivo', spillo_arrivo_id: null });
  // uno spillo di città non ha destinazione, condizioni né un riferimento a una mappa
  expect(arrivo(negozio)).toBeUndefined();
  expect(db.prepare('SELECT condizioni_json, riferimento_tipo, collezionabile FROM spillo WHERE id = ?').get(negozio)).toEqual({ condizioni_json: '[]', riferimento_tipo: null, collezionabile: 0 });
  // consumabile ⇒ collezionabile; spostamento ⇒ no
  expect(db.prepare('SELECT collezionabile FROM spillo WHERE id = ?').get(forziere)).toEqual({ collezionabile: 1 });
  expect(db.prepare('SELECT collezionabile FROM spillo WHERE id = ?').get(vicino)).toEqual({ collezionabile: 0 });
  // la scorciatoia (spostamento) tiene il suo riferimento al punto: è l'identità con cui il seed la riconosce
  expect(db.prepare('SELECT riferimento_tipo, riferimento_chiave FROM spillo WHERE id = ?').get(scorciatoia)).toEqual({ riferimento_tipo: 'punto', riferimento_chiave: 'p2' });
  expect(db.pragma('user_version', { simple: true })).toBeGreaterThanOrEqual(65);
});
