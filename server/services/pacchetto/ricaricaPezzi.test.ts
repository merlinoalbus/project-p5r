// ============================================================
// ricaricaPacchetto e le copie dei pezzi (103): un pacchetto della 102 porta la posa accanto al ritaglio, e nessuna copia resta
// senza il suo ritaglio (nota N2 del validatore, 2026-10-15)
// ============================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { closeDb } from '../../db/dbService.js';
import { dbDiProva } from '../../../test/dbDiProva.js';
import { ricaricaPacchetto } from './pacchettoGioco.js';

let cartella: string;
beforeEach(() => { cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-ricarica-pezzi-')); });
afterEach(() => { closeDb(); fs.rmSync(cartella, { recursive: true, force: true }); });

/** Un pacchetto con la sola tabella dei pezzi, nella forma della 102 (`conPosa`) o della 103. */
function pacchettoConPezzi(conPosa: boolean): string {
  const file = path.join(cartella, conPosa ? 'p102.db' : 'p103.db');
  const p = new Database(file);
  p.exec(`CREATE TABLE pezzo_mappa (id INTEGER PRIMARY KEY, uid TEXT, mappa_chiave TEXT, nome TEXT, sorgente_x INTEGER, sorgente_y INTEGER, larghezza INTEGER, altezza INTEGER,
    ${conPosa ? 'x INTEGER, y INTEGER, rotazione INTEGER, specchio_orizzontale INTEGER, specchio_verticale INTEGER, condizioni_json TEXT,' : ''} ordine INTEGER, updated_at TEXT)`);
  if (conPosa) p.prepare("INSERT INTO pezzo_mappa VALUES (5, ?, 'nativo-rmap-001-1-0', 'Muro', 1, 2, 30, 10, 400, 500, 90, 1, 0, '[{\"tipo\":\"fascia\",\"fascia\":\"sera\"}]', 0, 'x')").run('a'.repeat(32));
  else p.prepare("INSERT INTO pezzo_mappa VALUES (6, ?, 'nativo-rmap-001-1-0', 'Ponte', 1, 2, 30, 10, 0, 'x')").run('b'.repeat(32));
  p.close();
  return file;
}

/** Un pezzo con una copia nel file di gioco, prima della ricarica. */
function pezzoNelFile(db: ReturnType<typeof dbDiProva>): void {
  db.prepare("INSERT INTO pezzo_mappa (id, uid, mappa_chiave, nome, sorgente_x, sorgente_y, larghezza, altezza, updated_at) VALUES (9, ?, 'nativo-rmap-001-1-0', 'Vecchio', 0, 0, 5, 5, 'x')").run('c'.repeat(32));
  db.prepare("INSERT INTO copia_pezzo (uid, pezzo_id, x, y, updated_at) VALUES (?, 9, 7, 7, 'x')").run('d'.repeat(32));
}

it('un pacchetto della 102: i ritagli arrivano senza la posa e la posa diventa la prima copia; le copie di prima se ne vanno', () => {
  const db = dbDiProva();
  pezzoNelFile(db);
  ricaricaPacchetto(db, pacchettoConPezzi(true));
  expect(db.prepare('SELECT id, nome, sorgente_x, larghezza FROM pezzo_mappa').all()).toEqual([{ id: 5, nome: 'Muro', sorgente_x: 1, larghezza: 30 }]);
  expect(db.prepare('SELECT pezzo_id, x, y, rotazione, specchio_orizzontale, condizioni_json FROM copia_pezzo').all())
    .toEqual([{ pezzo_id: 5, x: 400, y: 500, rotazione: 90, specchio_orizzontale: 1, condizioni_json: '[{"tipo":"fascia","fascia":"sera"}]' }]);
  expect(db.pragma('foreign_key_check')).toEqual([]);
});

it('un pacchetto della 103 senza copie: nessuna copia resta senza il suo ritaglio', () => {
  const db = dbDiProva();
  pezzoNelFile(db);
  ricaricaPacchetto(db, pacchettoConPezzi(false));
  expect(db.prepare('SELECT id FROM pezzo_mappa').pluck().all()).toEqual([6]);
  expect(db.prepare('SELECT COUNT(*) FROM copia_pezzo').pluck().get()).toBe(0);
  expect(db.pragma('foreign_key_check')).toEqual([]);
});
