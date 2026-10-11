// ============================================================
// Test utente 018 — i timbri raccolti di un dedalo passano alla sua Area 1 (099)
// ============================================================

import { closeDb, getDb, prepared } from '../dbService.js';
import { utente018 } from './018_timbri_nelle_aree_dei_dedali.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('porta i timbri dal dedalo alla sua Area 1, lascia quelli che non hanno dove andare; ripetuta non cambia niente', () => {
  dbDiProva();
  prepared("INSERT INTO partita (id, nome, attiva, livello_protagonista, created_at, updated_at) VALUES (7, 'Prova', 1, 1, 'x', 'x'), (8, 'Altra', 0, 1, 'x', 'x')").run();
  const segna = prepared("INSERT INTO timbri_dedalo_partita (partita_id, area_chiave, raccolti, updated_at) VALUES (?, ?, ?, 'x')");
  // com'erano prima della 099: per dedalo. Un dedalo che il file di gioco non ha (nessuna Area 1): il conteggio resta dov'è
  segna.run(7, 'mementos-02-aiyatsbus', 3);
  segna.run(8, 'mementos-02-aiyatsbus', 8);
  segna.run(7, 'mementos-04-kaitul', 20);
  segna.run(7, 'mementos-99-sparito', 2);
  /** Le righe dei timbri, ordinate. */
  const righe = () => prepared('SELECT partita_id, area_chiave, raccolti FROM timbri_dedalo_partita ORDER BY partita_id, area_chiave').all();
  utente018.up(getDb());
  const attese = [
    { partita_id: 7, area_chiave: 'mementos-02-aiyatsbus-area-1', raccolti: 3 },
    { partita_id: 7, area_chiave: 'mementos-04-kaitul-area-1', raccolti: 20 },
    { partita_id: 7, area_chiave: 'mementos-99-sparito', raccolti: 2 },
    { partita_id: 8, area_chiave: 'mementos-02-aiyatsbus-area-1', raccolti: 8 },
  ];
  expect(righe()).toEqual(attese);
  utente018.up(getDb());
  expect(righe()).toEqual(attese);
});

it('senza le aree dei dedali nel file di gioco non tocca niente', () => {
  const db = dbDiProva();
  prepared("INSERT INTO partita (id, nome, attiva, livello_protagonista, created_at, updated_at) VALUES (7, 'Prova', 1, 1, 'x', 'x')").run();
  prepared("INSERT INTO timbri_dedalo_partita (partita_id, area_chiave, raccolti, updated_at) VALUES (7, 'mementos-02-aiyatsbus', 3, 'x')").run();
  db.pragma('foreign_keys = OFF');
  prepared('DROP TABLE area_dedalo').run();
  utente018.up(getDb());
  expect(prepared('SELECT area_chiave FROM timbri_dedalo_partita').pluck().all()).toEqual(['mementos-02-aiyatsbus']);
});
