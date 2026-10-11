// ============================================================
// Test 100 — nei Memento le voci che non sono Persona diventano Trama; i Palazzi non cambiano
// ============================================================

import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { migration100 } from './100_trama_dei_memento.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('un Enigma dei Memento diventa Trama e i suoi passi tornano voci dell\'area, in fondo; una voce con pin resta collegata; la Persona «-» è Trama, quella senza maschera resta Persona', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 100));
  db.exec(`INSERT INTO dungeon (chiave, tipo, ordine, nome) VALUES ('mementos', 'mementos', 9, 'Memento'), ('kamoshida', 'palazzo', 1, 'Kamoshida');
    INSERT INTO dungeon_area (chiave, dungeon_chiave, ordine, nome) VALUES ('m-1', 'mementos', 0, 'Uno'), ('k-1', 'kamoshida', 0, 'Ingresso');
    INSERT INTO area_dedalo (chiave, dedalo_chiave, ordine, nome) VALUES ('m-1-area-1', 'm-1', 0, 'Area 1'), ('m-1-area-2', 'm-1', 1, 'Area 2');
    INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome, dettagli_json, area_dedalo_chiave, contenitore_chiave) VALUES
      ('m-1/0', 'm-1', 0, 'puzzle', 'Piattaforme', '{}', 'm-1-area-1', NULL),
      ('m-1/1', 'm-1', 1, 'altro', 'Dopo l''Enigma', '{}', 'm-1-area-1', NULL),
      ('m-1/2', 'm-1', 0, 'meccanismo', 'Primo passo', '{}', 'm-1-area-1', 'm-1/0'),
      ('m-1/3', 'm-1', 1, 'meccanismo', 'Secondo passo', '{}', 'm-1-area-1', 'm-1/0'),
      ('m-1/4', 'm-1', 0, 'sicura', 'Sala con pin', '{}', 'm-1-area-2', NULL),
      ('m-1/5', 'm-1', 1, 'persona', 'Straziato re dei desideri', '{"maschera":"-","personalita":"Non reclutabile"}', 'm-1-area-2', NULL),
      ('m-1/6', 'm-1', 2, 'persona', 'Ombra senza maschera', '{}', 'm-1-area-2', NULL),
      ('k-1/0', 'k-1', 0, 'puzzle', 'Enigma del Palazzo', '{}', NULL, NULL),
      ('k-1/1', 'k-1', 0, 'meccanismo', 'Passo del Palazzo', '{}', NULL, 'k-1/0');
    INSERT INTO mappa (chiave, nome, tipo, updated_at) VALUES ('m-pianta', 'Pianta', 'area', 'x');
    INSERT INTO spillo (id, mappa_chiave, tipo, nome, x, y, updated_at) VALUES (1, 'm-pianta', 'sicura', 'Sala', 10, 10, 'x');
    INSERT INTO spillo_voce (spillo_id, voce_chiave) VALUES (1, 'm-1/4');`);
  runMigrations(db);
  expect(db.prepare('SELECT chiave, tipo, ordine, contenitore_chiave, area_dedalo_chiave FROM punto_interesse ORDER BY chiave').all()).toEqual([
    { chiave: 'k-1/0', tipo: 'puzzle', ordine: 0, contenitore_chiave: null, area_dedalo_chiave: null },
    { chiave: 'k-1/1', tipo: 'meccanismo', ordine: 0, contenitore_chiave: 'k-1/0', area_dedalo_chiave: null },
    { chiave: 'm-1/0', tipo: 'trama', ordine: 0, contenitore_chiave: null, area_dedalo_chiave: 'm-1-area-1' },
    { chiave: 'm-1/1', tipo: 'trama', ordine: 1, contenitore_chiave: null, area_dedalo_chiave: 'm-1-area-1' },
    // i passi in fondo alle voci della loro area, nel loro ordine
    { chiave: 'm-1/2', tipo: 'trama', ordine: 2, contenitore_chiave: null, area_dedalo_chiave: 'm-1-area-1' },
    { chiave: 'm-1/3', tipo: 'trama', ordine: 3, contenitore_chiave: null, area_dedalo_chiave: 'm-1-area-1' },
    { chiave: 'm-1/4', tipo: 'trama', ordine: 0, contenitore_chiave: null, area_dedalo_chiave: 'm-1-area-2' },
    { chiave: 'm-1/5', tipo: 'trama', ordine: 1, contenitore_chiave: null, area_dedalo_chiave: 'm-1-area-2' },
    { chiave: 'm-1/6', tipo: 'persona', ordine: 2, contenitore_chiave: null, area_dedalo_chiave: 'm-1-area-2' },
  ]);
  // il pin resta collegato alla sua voce, i dettagli dell'Ombra restano
  expect(db.prepare('SELECT spillo_id, voce_chiave FROM spillo_voce').all()).toEqual([{ spillo_id: 1, voce_chiave: 'm-1/4' }]);
  expect(db.prepare("SELECT dettagli_json FROM punto_interesse WHERE chiave = 'm-1/5'").pluck().get()).toBe('{"maschera":"-","personalita":"Non reclutabile"}');
});

it('le voci dei dedali che non sono Persona diventano Trama col resto invariato; Persona e Palazzi restano; ripetuta non cambia niente', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 100));
  db.exec(`INSERT INTO dungeon (chiave, tipo, ordine, nome) VALUES ('mementos', 'mementos', 9, 'Memento'), ('kamoshida', 'palazzo', 1, 'Kamoshida');
    INSERT INTO dungeon_area (chiave, dungeon_chiave, ordine, nome) VALUES ('m-1', 'mementos', 0, 'Uno'), ('k-1', 'kamoshida', 0, 'Ingresso');
    INSERT INTO area_dedalo (chiave, dedalo_chiave, ordine, nome) VALUES ('m-1-area-1', 'm-1', 0, 'Area 1');
    INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome, descrizione, dettagli_json, area_dedalo_chiave) VALUES
      ('m-1/0', 'm-1', 0, 'altro', 'Nota', 'testo', '{"a":1}', 'm-1-area-1'), ('m-1/1', 'm-1', 1, 'persona', 'Ombra', '', '{"maschera":"Pixie"}', 'm-1-area-1'),
      ('m-1/2', 'm-1', 2, 'boss', 'Boss', '', '{}', 'm-1-area-1'), ('m-1/3', 'm-1', 3, 'sicura', 'Sala', '', '{}', 'm-1-area-1'),
      ('k-1/0', 'k-1', 0, 'sicura', 'Sicura', '', '{}', NULL), ('k-1/1', 'k-1', 1, 'altro', 'Altro', '', '{}', NULL);`);
  runMigrations(db);
  const voci = () => db.prepare('SELECT chiave, tipo, nome, descrizione, dettagli_json, area_dedalo_chiave FROM punto_interesse ORDER BY chiave').all();
  expect(voci()).toEqual([
    { chiave: 'k-1/0', tipo: 'sicura', nome: 'Sicura', descrizione: '', dettagli_json: '{}', area_dedalo_chiave: null },
    { chiave: 'k-1/1', tipo: 'altro', nome: 'Altro', descrizione: '', dettagli_json: '{}', area_dedalo_chiave: null },
    { chiave: 'm-1/0', tipo: 'trama', nome: 'Nota', descrizione: 'testo', dettagli_json: '{"a":1}', area_dedalo_chiave: 'm-1-area-1' },
    { chiave: 'm-1/1', tipo: 'persona', nome: 'Ombra', descrizione: '', dettagli_json: '{"maschera":"Pixie"}', area_dedalo_chiave: 'm-1-area-1' },
    { chiave: 'm-1/2', tipo: 'trama', nome: 'Boss', descrizione: '', dettagli_json: '{}', area_dedalo_chiave: 'm-1-area-1' },
    { chiave: 'm-1/3', tipo: 'trama', nome: 'Sala', descrizione: '', dettagli_json: '{}', area_dedalo_chiave: 'm-1-area-1' },
  ]);
  const prima = voci();
  migration100.up(db);
  expect(voci()).toEqual(prima);
});

it('nel pacchetto, dopo le migrazioni, le voci dei Memento sono solo Persona e Trama, e Trama solo nei Memento', () => {
  const db = dbDiProva();
  expect(db.prepare("SELECT DISTINCT p.tipo FROM punto_interesse p JOIN dungeon_area d ON d.chiave = p.area_chiave WHERE d.dungeon_chiave = 'mementos' ORDER BY p.tipo").pluck().all()).toEqual(['persona', 'trama']);
  expect(db.prepare("SELECT COUNT(*) FROM punto_interesse p JOIN dungeon_area d ON d.chiave = p.area_chiave WHERE d.dungeon_chiave = 'mementos' AND p.tipo = 'persona' AND json_extract(p.dettagli_json, '$.maschera') = '-'").pluck().get()).toBe(0);
  // quella dei Memento (nel Palazzo di Kamoshida c'è il suo omonimo miniboss, che resta com'è)
  expect(db.prepare("SELECT tipo FROM punto_interesse WHERE nome = 'Straziato re dei desideri' AND area_chiave LIKE 'mementos-%'").pluck().get()).toBe('trama');
  expect(db.prepare("SELECT tipo FROM punto_interesse WHERE nome = 'Straziato re dei desideri' AND area_chiave LIKE 'kamoshida-%'").pluck().get()).toBe('miniboss');
  expect(db.prepare("SELECT COUNT(*) FROM punto_interesse p JOIN dungeon_area d ON d.chiave = p.area_chiave WHERE d.dungeon_chiave <> 'mementos' AND p.tipo = 'trama'").pluck().get()).toBe(0);
});
