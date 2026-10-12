// ============================================================
// Test utente 020 — i timbri raccolti in un'area senza totale se ne vanno (rilievo F3 del validatore)
// ============================================================

import { closeDb, getDb, prepared } from '../dbService.js';
import { utente020 } from './020_timbri_senza_totale.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('toglie i raccolti delle aree senza totale (come l\'app quando lo si svuota); quelli delle aree con un totale e di aree che non ci sono restano', () => {
  dbDiProva();
  prepared("INSERT INTO partita (id, nome, attiva, livello_protagonista, created_at, updated_at) VALUES (7, 'Prova', 1, 1, 'x', 'x')").run();
  // dopo la 101 l'Area 1 di Aiyatsbus non ha più un totale; se ne dà uno all'Area 2
  prepared("UPDATE area_dedalo SET timbri_totale = 4 WHERE chiave = 'mementos-02-aiyatsbus-area-2'").run();
  expect(prepared("SELECT timbri_totale FROM area_dedalo WHERE chiave = 'mementos-02-aiyatsbus-area-1'").pluck().get()).toBeNull();
  const segna = prepared("INSERT INTO timbri_dedalo_partita (partita_id, area_chiave, raccolti, updated_at) VALUES (7, ?, ?, 'x')");
  segna.run('mementos-02-aiyatsbus-area-1', 8); // del dedalo intero, di prima della 101
  segna.run('mementos-02-aiyatsbus-area-2', 3);
  segna.run('area-che-non-esiste', 2);
  utente020.up(getDb());
  expect(prepared('SELECT area_chiave, raccolti FROM timbri_dedalo_partita WHERE partita_id = 7 ORDER BY area_chiave').all()).toEqual([
    { area_chiave: 'area-che-non-esiste', raccolti: 2 }, { area_chiave: 'mementos-02-aiyatsbus-area-2', raccolti: 3 }]);
  // ripetuta: niente di nuovo
  utente020.up(getDb());
  expect(prepared('SELECT COUNT(*) FROM timbri_dedalo_partita WHERE partita_id = 7').pluck().get()).toBe(2);
});
