// ============================================================
// Test utente 019 — le Persona dei Memento segnate col modo di prima entrano nel compendio della partita
// ============================================================

import { closeDb, getDb, prepared } from '../dbService.js';
import { utente019 } from './019_catture_nel_compendio.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('registra nel compendio la Persona di una voce Persona segnata, senza toccare una registrazione esistente; lo stato della voce se ne va; le altre voci restano', () => {
  dbDiProva();
  prepared("INSERT INTO partita (id, nome, attiva, livello_protagonista, created_at, updated_at) VALUES (7, 'Prova', 1, 1, 'x', 'x')").run();
  const voce = (maschera: string) => prepared("SELECT p.chiave FROM punto_interesse p WHERE p.tipo = 'persona' AND p.area_chiave LIKE 'mementos-%' AND json_extract(p.dettagli_json, '$.maschera') = ? LIMIT 1").pluck().get(maschera) as string;
  const id = (nome: string) => prepared('SELECT id FROM persona WHERE nome = ?').pluck().get(nome) as number;
  const trama = prepared("SELECT chiave FROM punto_interesse WHERE tipo = 'trama' AND area_chiave LIKE 'mementos-%' LIMIT 1").pluck().get() as string;
  const segna = prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (7, ?, 'ottenuto', 'x')");
  // Pixie e Bicorno (scritto in italiano) segnati col modo di prima; Pixie era già registrata al livello 12; una Trama segnata
  segna.run(voce('Pixie'));
  segna.run(voce('Bicorno'));
  segna.run(trama);
  prepared("INSERT INTO compendio_partita (partita_id, persona_id, registrata, livello_registrato, updated_at) VALUES (7, ?, 1, 12, 'x')").run(id('Pixie'));
  utente019.up(getDb());
  expect(prepared('SELECT persona_id, registrata, livello_registrato FROM compendio_partita WHERE partita_id = 7 ORDER BY persona_id').all()).toEqual(
    [{ persona_id: id('Pixie'), registrata: 1, livello_registrato: 12 }, { persona_id: id('Bicorn'), registrata: 1, livello_registrato: null }].sort((a, b) => a.persona_id - b.persona_id));
  // gli stati delle voci Persona se ne vanno, quello della Trama resta
  expect(prepared('SELECT punto_chiave FROM punto_partita WHERE partita_id = 7').pluck().all()).toEqual([trama]);
  // ripetuta: niente di nuovo
  const prima = JSON.stringify(prepared('SELECT * FROM compendio_partita ORDER BY persona_id').all());
  utente019.up(getDb());
  expect(JSON.stringify(prepared('SELECT * FROM compendio_partita ORDER BY persona_id').all())).toBe(prima);
});
