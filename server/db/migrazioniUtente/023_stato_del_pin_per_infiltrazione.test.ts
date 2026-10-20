// ============================================================
// Test utente 023 — lo stato per infiltrazione dei pin condivisi dai rigenerabili (L4, NR4-1, lotti/L4/modifiche.md §8.11 punto 1)
// ============================================================

import { closeDb, prepared } from '../dbService.js';
import { utente023 } from './023_stato_del_pin_per_infiltrazione.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('una riga per pin condiviso e infiltrazione dove il pin è raccolto e la voce rigenerabile di lì è segnata; nessun’altra riga, nessuna riga esistente toccata; idempotente', () => {
  const db = dbDiProva();
  prepared("INSERT INTO partita (id, nome, attiva, livello_protagonista, created_at, updated_at) VALUES (7, 'Prova', 1, 1, 'x', 'x')").run();
  const [i2, i4] = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine LIMIT 2 OFFSET 1").pluck().all() as string[];
  // quattro pin di una planimetria di Kamoshida, senza voci
  const pin = prepared(`SELECT s.id, s.uid FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave WHERE m.genitore_chiave = 'dungeon-kamoshida' AND s.uid IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM spillo_voce sv WHERE sv.spillo_id = s.id) AND s.riferimento_tipo IS NULL ORDER BY s.id LIMIT 4`).all() as Array<{ id: number; uid: string }>;
  expect(pin).toHaveLength(4);
  const voce = (chiave: string, tipo: string, a: string) => prepared("INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome) VALUES (?, ?, 900, ?, ?)").run(chiave, a, tipo, chiave);
  const lega = (p: number, v: string) => prepared('INSERT INTO spillo_voce (spillo_id, voce_chiave) VALUES (?, ?)').run(pin[p].id, v);
  const raccolto = (p: number) => prepared("INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (7, ?, 1, 'x')").run(pin[p].uid);
  const segna = (v: string) => prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (7, ?, 'ottenuto', 'x')").run(v);
  // (0) condiviso dalla 2 e dalla 4, raccolto, segnata solo la voce della 2: una riga, per la 2
  voce('o/2a', 'oggetto', i2); voce('o/4a', 'oggetto', i4); lega(0, 'o/2a'); lega(0, 'o/4a'); raccolto(0); segna('o/2a');
  // (1) condiviso, raccolto, segnate tutte e due: due righe
  voce('o/2b', 'oggetto', i2); voce('o/4b', 'oggetto', i4); lega(1, 'o/2b'); lega(1, 'o/4b'); raccolto(1); segna('o/2b'); segna('o/4b');
  // (2) condiviso, non raccolto, voce della 2 segnata: incoerente, nessuna riga
  voce('o/2c', 'oggetto', i2); voce('o/4c', 'oggetto', i4); lega(2, 'o/2c'); lega(2, 'o/4c'); segna('o/2c');
  // (3) rigenerabili di una sola infiltrazione: non condiviso, nessuna riga
  voce('o/2d', 'oggetto', i2); voce('o/2e', 'oggetto', i2); lega(3, 'o/2d'); lega(3, 'o/2e'); raccolto(3); segna('o/2d');
  const prima = { pp: prepared('SELECT * FROM punto_partita ORDER BY punto_chiave').all(), sp: prepared('SELECT * FROM spillo_partita ORDER BY spillo_uid').all() };
  db.prepare('DROP TABLE IF EXISTS utente.spillo_partita_infiltrazione').run();
  utente023.up(db);
  const righe = () => prepared('SELECT spillo_uid, infiltrazione_chiave, raccolto FROM spillo_partita_infiltrazione WHERE partita_id = 7 ORDER BY spillo_uid, infiltrazione_chiave').all();
  const attese = [
    { spillo_uid: pin[0].uid, infiltrazione_chiave: i2, raccolto: 1 },
    { spillo_uid: pin[1].uid, infiltrazione_chiave: i2, raccolto: 1 },
    { spillo_uid: pin[1].uid, infiltrazione_chiave: i4, raccolto: 1 },
  ].sort((a, b) => a.spillo_uid.localeCompare(b.spillo_uid) || a.infiltrazione_chiave.localeCompare(b.infiltrazione_chiave));
  expect(righe()).toEqual(attese);
  // nessuna riga di prima cambia
  expect({ pp: prepared('SELECT * FROM punto_partita ORDER BY punto_chiave').all(), sp: prepared('SELECT * FROM spillo_partita ORDER BY spillo_uid').all() }).toEqual(prima);
  // idempotente
  utente023.up(db);
  expect(righe()).toEqual(attese);
});
