// ============================================================
// Test 090 e utente 012 — i requisiti «manuali» dei Confidenti diventano eventi della partita o avvertenze
// ============================================================

import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { REQUISITI_EVENTO } from './090_requisiti_come_eventi.js';
import { EVENTI_STORIA } from '../../../shared/condizioniSpillo.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

/** Tipo e `dati_json` del requisito `indice` del rango `rango` del confidente `c`. */
const requisito = (db: ReturnType<typeof initDb>, c: string, rango: number, indice: number) =>
  db.prepare('SELECT tipo, dati_json FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ? AND indice = ?').get(c, rango, indice) as { tipo: string; dati_json: string };

it('090: i cinque fatti diventano requisiti «evento» di EVENTI_STORIA, la scuola aperta di Futaba un «avviso»; una riga già cambiata resta com’è', () => {
  const db = dbDiProva();
  // come in un pacchetto di prima: le sei righe ancora «manuale», e una già toccata a mano
  for (const r of REQUISITI_EVENTO) db.prepare("UPDATE confidente_requisito SET tipo = 'manuale', dati_json = '{}' WHERE confidente_chiave = ? AND rango = ? AND indice = ?").run(r.confidente, r.rango, r.indice);
  db.exec("UPDATE confidente_requisito SET tipo = 'manuale', dati_json = '{}' WHERE confidente_chiave = 'futaba' AND rango = 4 AND indice = 0");
  db.exec("UPDATE confidente_requisito SET tipo = 'data', dati_json = '{\"dal\":\"05-01\"}' WHERE confidente_chiave = 'yoshida' AND rango = 1 AND indice = 1");
  db.pragma('main.user_version = 89');
  runMigrations(db);
  for (const r of REQUISITI_EVENTO.filter((x) => x.confidente !== 'yoshida')) {
    expect(requisito(db, r.confidente, r.rango, r.indice)).toEqual({ tipo: 'evento', dati_json: JSON.stringify({ evento: r.evento }) });
    expect(EVENTI_STORIA.some((e) => e.chiave === r.evento), r.evento).toBe(true);
  }
  expect(requisito(db, 'yoshida', 1, 1)).toEqual({ tipo: 'data', dati_json: '{"dal":"05-01"}' });
  expect(requisito(db, 'futaba', 4, 0)).toEqual({ tipo: 'avviso', dati_json: '{}' });
  expect((db.prepare("SELECT COUNT(*) AS n FROM confidente_requisito WHERE tipo = 'manuale'").get() as { n: number }).n).toBe(0);
});

it('utente 012: le conferme già date diventano eventi avvenuti; le altre conferme restano', () => {
  const db = dbDiProva();
  db.prepare("INSERT INTO partita (id, nome, attiva, livello_protagonista, created_at, updated_at) VALUES (3, 'Prova', 1, 1, 'x', 'x')").run();
  const conferma = db.prepare('INSERT INTO requisito_partita (partita_id, confidente_chiave, rango, indice, confermato, updated_at) VALUES (3, ?, ?, ?, ?, ?)');
  conferma.run('sojiro', 3, 0, 1, '2026-09-20T10:00:00.000Z');
  conferma.run('akechi', 8, 0, 0, '2026-09-20T10:00:00.000Z'); // revocata: non diventa un evento
  conferma.run('futaba', 4, 0, 1, '2026-09-20T10:00:00.000Z'); // non è un evento: resta dov'è
  db.pragma('utente.user_version = 11');
  runMigrations(db);
  expect(db.prepare('SELECT evento_chiave, avvenuto, updated_at FROM evento_storia_partita WHERE partita_id = 3').all())
    .toEqual([{ evento_chiave: 'caffe-leblanc', avvenuto: 1, updated_at: '2026-09-20T10:00:00.000Z' }]);
  expect(db.prepare('SELECT confidente_chiave FROM requisito_partita WHERE partita_id = 3').all()).toEqual([{ confidente_chiave: 'futaba' }]);
});
