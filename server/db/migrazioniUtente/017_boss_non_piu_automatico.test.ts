// ============================================================
// Test utente 017 — il boss della Guida non si segna più da solo: i segni automatici rimasti se ne vanno
// ============================================================

import { closeDb, getDb, prepared } from '../dbService.js';
import { utente017 } from './017_boss_non_piu_automatico.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('toglie i segni automatici e lascia quelli dell’utente; l’Enigma di cui il boss era un passo lo segue; ripetuta non cambia niente', () => {
  dbDiProva();
  prepared("INSERT INTO partita (id, nome, attiva, livello_protagonista, created_at, updated_at) VALUES (7, 'Prova', 1, 1, 'x', 'x')").run();
  // tre voci di un'area: un Enigma, il boss (passo dell'Enigma, segnato dal Tesoro) e una voce segnata dall'utente
  const [enigma, boss, mia] = prepared("SELECT chiave FROM punto_interesse WHERE tipo <> 'altro' ORDER BY chiave LIMIT 3").pluck().all() as string[];
  prepared("UPDATE punto_interesse SET tipo = 'puzzle' WHERE chiave = ?").run(enigma);
  prepared('UPDATE punto_interesse SET contenitore_chiave = ? WHERE chiave = ?').run(enigma, boss);
  const segna = prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at, automatico) VALUES (7, ?, 'ottenuto', 'x', ?)");
  segna.run(boss, 1); // il segno messo dal Tesoro raccolto (utente 006)
  segna.run(enigma, 0); // l'Enigma risolto dal suo unico passo
  segna.run(mia, 0); // segnata dall'utente
  /** Le voci segnate nella partita, ordinate. */
  const segnate = () => prepared('SELECT punto_chiave FROM punto_partita WHERE partita_id = 7 ORDER BY punto_chiave').pluck().all();
  utente017.up(getDb());
  // il boss non è più segnato, e l'Enigma, che aveva solo quel passo, torna da risolvere; la voce dell'utente resta
  expect(segnate()).toEqual([mia]);
  utente017.up(getDb());
  expect(segnate()).toEqual([mia]);
  expect(prepared('SELECT COUNT(*) FROM punto_partita WHERE automatico = 1').pluck().get()).toBe(0);
});

it('senza segni automatici non tocca niente', () => {
  dbDiProva();
  prepared("INSERT INTO partita (id, nome, attiva, livello_protagonista, created_at, updated_at) VALUES (7, 'Prova', 1, 1, 'x', 'x')").run();
  const voce = prepared("SELECT chiave FROM punto_interesse WHERE tipo <> 'altro' LIMIT 1").pluck().get() as string;
  prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at, automatico) VALUES (7, ?, 'esaurito', 'x', 0)").run(voce);
  utente017.up(getDb());
  expect(prepared('SELECT punto_chiave, stato FROM punto_partita').all()).toEqual([{ punto_chiave: voce, stato: 'esaurito' }]);
});
