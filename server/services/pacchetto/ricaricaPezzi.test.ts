// ============================================================
// ricaricaPacchetto e le copie dei pezzi: nessuna copia resta senza il suo ritaglio (nota N2 del validatore, 2026-10-15)
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

/** Un pacchetto con la sola tabella dei pezzi, senza copie. */
function pacchettoConPezzi(): string {
  const file = path.join(cartella, 'p103.db');
  const p = new Database(file);
  p.exec('CREATE TABLE pezzo_mappa (id INTEGER PRIMARY KEY, uid TEXT, mappa_chiave TEXT, nome TEXT, sorgente_x INTEGER, sorgente_y INTEGER, larghezza INTEGER, altezza INTEGER, ordine INTEGER, updated_at TEXT)');
  p.prepare("INSERT INTO pezzo_mappa VALUES (6, ?, 'nativo-rmap-001-1-0', 'Ponte', 1, 2, 30, 10, 0, 'x')").run('b'.repeat(32));
  p.close();
  return file;
}

/** Un pezzo con una copia nel file di gioco, prima della ricarica. */
function pezzoNelFile(db: ReturnType<typeof dbDiProva>): void {
  db.prepare("INSERT INTO pezzo_mappa (id, uid, mappa_chiave, nome, sorgente_x, sorgente_y, larghezza, altezza, updated_at) VALUES (9, ?, 'nativo-rmap-001-1-0', 'Vecchio', 0, 0, 5, 5, 'x')").run('c'.repeat(32));
  db.prepare("INSERT INTO copia_pezzo (uid, pezzo_id, x, y, updated_at) VALUES (?, 9, 7, 7, 'x')").run('d'.repeat(32));
}

it('un pacchetto senza copie: nessuna copia resta senza il suo ritaglio', () => {
  const db = dbDiProva();
  pezzoNelFile(db);
  ricaricaPacchetto(db, pacchettoConPezzi());
  expect(db.prepare('SELECT id FROM pezzo_mappa').pluck().all()).toEqual([6]);
  expect(db.prepare('SELECT COUNT(*) FROM copia_pezzo').pluck().get()).toBe(0);
  expect(db.pragma('foreign_key_check')).toEqual([]);
});
