// ============================================================
// Test utente 022 — le divergenze fra pin e voci conservate «da verificare» (L4 «Avanzamento unico», lotti/L4/modifiche.md §2.2,
// piano dei test §6.1 punti 6 e 9)
// ============================================================

import { closeDb, getDb, prepared } from '../dbService.js';
import { utente022 } from './022_divergenze_da_verificare.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('conserva, senza scrivere stati, i pin fatti con una voce che conta non fatta; non le permanenti fatte dal loro oggetto, i racconti, le rigenerabili segnate, il caso inverso', () => {
  dbDiProva();
  prepared("INSERT INTO partita (id, nome, attiva, livello_protagonista, created_at, updated_at) VALUES (7, 'Prova', 1, 1, 'x', 'x')").run();
  const area = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine LIMIT 1").pluck().get() as string;
  const altra = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine LIMIT 1 OFFSET 1").pluck().get() as string;
  // sei pin di una planimetria di Kamoshida, senza voci
  const pin = prepared(`SELECT s.id, s.uid FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave WHERE m.genitore_chiave = 'dungeon-kamoshida' AND s.uid IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM spillo_voce sv WHERE sv.spillo_id = s.id) AND s.riferimento_tipo IS NULL ORDER BY s.id LIMIT 6`).all() as Array<{ id: number; uid: string }>;
  expect(pin).toHaveLength(6);
  const voce = (chiave: string, tipo: string, a = area) => prepared("INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome) VALUES (?, ?, 900, ?, ?)").run(chiave, a, tipo, chiave);
  const lega = (p: number, v: string) => prepared('INSERT INTO spillo_voce (spillo_id, voce_chiave) VALUES (?, ?)').run(pin[p].id, v);
  const raccolto = (p: number, r: 0 | 1) => prepared("INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (7, ?, ?, 'x')").run(pin[p].uid, r);
  const segna = (v: string) => prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (7, ?, 'ottenuto', 'x')").run(v);
  // (0) forziere non segnato, pin fatto: divergenza
  voce('prova/forziere', 'forziere'); lega(0, 'prova/forziere'); raccolto(0, 1);
  // (1) porta non segnata, ma sul pin 2 con una porta dell'altra infiltrazione segnata: stesso oggetto permanente → fatta, niente divergenza
  voce('prova/porta-a', 'porta'); voce('prova/porta-b', 'porta', altra); lega(1, 'prova/porta-a'); lega(2, 'prova/porta-a'); lega(2, 'prova/porta-b'); segna('prova/porta-b'); raccolto(1, 1);
  // (3) solo una storia non segnata: racconto, il pin ha il suo stato
  voce('prova/storia', 'storia'); lega(3, 'prova/storia'); raccolto(3, 1);
  // (4) un oggetto (si ripropone) segnato e un'Ombra sciagura non segnata: divergenza per l'Ombra
  voce('prova/oggetto', 'oggetto'); voce('prova/ombra', 'ombra-sciagura'); lega(4, 'prova/oggetto'); lega(4, 'prova/ombra'); segna('prova/oggetto'); raccolto(4, 1);
  // (5) il caso inverso: voce segnata, pin a 0 → niente
  voce('prova/leva', 'meccanismo'); lega(5, 'prova/leva'); segna('prova/leva'); raccolto(5, 0);
  const stati = () => JSON.stringify([prepared('SELECT * FROM punto_partita ORDER BY 1, 2').all(), prepared('SELECT * FROM spillo_partita ORDER BY 1, 2').all()]);
  const prima = stati();
  getDb().exec('DELETE FROM divergenza_partita');
  utente022.up(getDb());
  expect(prepared('SELECT partita_id, spillo_uid, voce_chiave FROM divergenza_partita ORDER BY spillo_uid, voce_chiave').all()).toEqual(
    [{ partita_id: 7, spillo_uid: pin[0].uid, voce_chiave: 'prova/forziere' }, { partita_id: 7, spillo_uid: pin[4].uid, voce_chiave: 'prova/ombra' }]
      .sort((a, b) => a.spillo_uid.localeCompare(b.spillo_uid)));
  expect(stati()).toBe(prima);
  // ripetuta: le righe non si raddoppiano, la data resta
  const righe = JSON.stringify(prepared('SELECT * FROM divergenza_partita ORDER BY 1, 2, 3').all());
  utente022.up(getDb());
  expect(JSON.stringify(prepared('SELECT * FROM divergenza_partita ORDER BY 1, 2, 3').all())).toBe(righe);
});

it('con una voce permanente scelta «Racconto» dall’utente (carattere 111) la voce non conta: niente divergenza', () => {
  dbDiProva();
  prepared("INSERT INTO partita (id, nome, attiva, livello_protagonista, created_at, updated_at) VALUES (7, 'Prova', 1, 1, 'x', 'x')").run();
  const area = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine LIMIT 1").pluck().get() as string;
  const p = prepared(`SELECT s.id, s.uid FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave WHERE m.genitore_chiave = 'dungeon-kamoshida' AND s.uid IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM spillo_voce sv WHERE sv.spillo_id = s.id) ORDER BY s.id LIMIT 1`).get() as { id: number; uid: string };
  prepared("INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome, carattere) VALUES ('prova/forziere', ?, 900, 'forziere', 'F', 'descrittiva')").run(area);
  prepared("INSERT INTO spillo_voce (spillo_id, voce_chiave) VALUES (?, 'prova/forziere')").run(p.id);
  prepared("INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (7, ?, 1, 'x')").run(p.uid);
  getDb().exec('DELETE FROM divergenza_partita');
  utente022.up(getDb());
  expect(prepared('SELECT COUNT(*) FROM divergenza_partita').pluck().get()).toBe(0);
});
