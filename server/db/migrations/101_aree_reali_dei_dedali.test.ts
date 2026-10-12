// ============================================================
// Test 101 — le aree reali dei dedali dalla guida; Richieste e Trama nella loro area; Persona collegate alle aree dei loro piani
// ============================================================

import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { AREE_DEI_DEDALI, areaDellaTrama, chiaveAreaDedalo, migration101, numeroArea, pianiDelTesto } from './101_aree_reali_dei_dedali.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

const AIY = 'mementos-02-aiyatsbus';
const QIM = 'mementos-01-qimranut';

it('legge il numero d\'area di un testo per il suo dedalo, e i piani del compendio', () => {
  expect(numeroArea('Area 5', 'Aiyatsbus')).toBe(5);
  expect(numeroArea('Piano 3', "Da'at")).toBe(3);
  expect(numeroArea("Area 7 (Aiyatsbus) / Area 1 (Da'at)", 'Aiyatsbus')).toBe(7);
  expect(numeroArea("Area 7 (Aiyatsbus) / Area 1 (Da'at)", "Da'at")).toBe(1);
  expect(numeroArea('Area 14 (Sheriruth)', 'Kaitul')).toBeNull();
  expect(numeroArea('Non specificato dalla guida', 'Adyeshach')).toBeNull();
  expect(numeroArea("Sala d'attesa - Area 4", 'Aiyatsbus')).toBe(4);
  expect(pianiDelTesto('piano 1-3, 5 e 6')).toEqual([1, 2, 3, 5, 6]);
  expect(pianiDelTesto('piano 5, 7-9 (prima del Palazzo 7)')).toEqual([5, 7, 8, 9]);
  expect(pianiDelTesto('piano 1 e 2')).toEqual([1, 2]);
  expect(pianiDelTesto('qualsiasi piano')).toBeNull();
  expect(pianiDelTesto('sconosciuto')).toBeNull();
  expect(AREE_DEI_DEDALI[AIY]).toHaveLength(7);
  expect(chiaveAreaDedalo(AIY, 1)).toBe(`${AIY}-area-1`);
  expect(chiaveAreaDedalo(AIY, 4)).toBe(`${AIY}-area-4`);
});

it('colloca una voce di Trama dal nome, poi dalla descrizione solo se univoca (rilievo F2)', () => {
  const IWE = AREE_DEI_DEDALI['mementos-08-iweleth'];
  const DAAT = AREE_DEI_DEDALI['mementos-09-daat'];
  const SHE = AREE_DEI_DEDALI['mementos-07-sheriruth'];
  // dal nome: il nome di un'area (a parola intera), poi il numero
  expect(areaDellaTrama('Sala di controllo cognitivo (oltre Piano 15)', '', DAAT, "Da'at")).toEqual({ indice: 15, da: 'nome' });
  expect(areaDellaTrama('Corridoio della prigione II: la porta', '', IWE, 'Iweleth')).toEqual({ indice: 2, da: 'nome' });
  expect(areaDellaTrama("Sala d'attesa - Area 4", 'Viaggio veloce; l\'Area 6 è un\'altra', AREE_DEI_DEDALI['mementos-02-aiyatsbus'], 'Aiyatsbus')).toEqual({ indice: 3, da: 'nome' });
  // dalla descrizione: un'area per nome («Parte I» = «I»), o per numero
  expect(areaDellaTrama('Jose, studente di umanità', 'Compare nella Sala di controllo cognitivo SOLO se…', DAAT, "Da'at")).toEqual({ indice: 15, da: 'descrizione' });
  expect(areaDellaTrama('Primo sacerdote x2', "Mini-boss forzato nel 'Corridoio della prigione - Parte I'.", IWE, 'Iweleth')).toEqual({ indice: 1, da: 'descrizione' });
  expect(areaDellaTrama('Accesso a Iweleth bloccato', "Dopo l'Area 14 (richiesta 'Il capoccia') l'area successiva resta interdetta", SHE, 'Sheriruth')).toEqual({ indice: 13, da: 'descrizione' });
  // non univoca, fuori dalle aree, o senza indizi: nessuna
  expect(areaDellaTrama('Due posti', 'Fra il Santuario e la Piazza stazione Shibuya', IWE, 'Iweleth')).toBeNull();
  expect(areaDellaTrama('Lontano', "Oltre l'Area 30", SHE, 'Sheriruth')).toBeNull();
  expect(areaDellaTrama('Santo Graal (rivincita)', 'Livello 75, 10.000 HP, 999 SP.', IWE, 'Iweleth')).toBeNull();
  // «???» (vuoto una volta normalizzato) non riconosce niente
  expect(areaDellaTrama('??? misterioso', '???', IWE, 'Iweleth')).toBeNull();
});

it('crea le aree della guida, colloca Richieste, Trama e Persona; svuota il totale dei timbri; non tocca un dedalo già organizzato; ripetuta non cambia niente', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 101));
  db.exec("INSERT INTO arcana (chiave, ordine) VALUES ('magician', 1)");
  const persona = db.prepare("INSERT INTO persona (id, nome, arcana, livello, oggetto, oggetto_allarme, tratto, forza, magia, resistenza, agilita, fortuna, aree_mementos_json, piani_mementos) VALUES (?, ?, 'magician', 2, '', '', '', 1, 1, 1, 1, 1, ?, ?)");
  persona.run(1, 'Pixie', '["Qimranut","Aiyatsbus"]', 'qualsiasi piano / piano 1 e 3');
  persona.run(2, 'Silky', '["Aiyatsbus"]', 'piano 2, 3, 5 e 6');
  db.exec(`INSERT INTO dungeon (chiave, tipo, ordine, nome) VALUES ('mementos', 'mementos', 9, 'Memento');
    INSERT INTO dungeon_area (chiave, dungeon_chiave, ordine, nome) VALUES ('${QIM}', 'mementos', 0, 'Qimranut'), ('${AIY}', 'mementos', 1, 'Aiyatsbus');
    INSERT INTO area_dedalo (chiave, dedalo_chiave, ordine, nome, timbri_totale) VALUES
      ('${AIY}-area-1', '${AIY}', 0, 'Area 1', 8),
      ('${QIM}-area-1', '${QIM}', 0, 'Area 1', NULL), ('${QIM}-banchina', '${QIM}', 1, 'Banchina', 3);
    INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome, dettagli_json, area_dedalo_chiave) VALUES
      ('a/1', '${AIY}', 0, 'persona', 'Ragazza seducente', '{"maschera":"Pixie"}', '${AIY}-area-1'),
      ('a/2', '${AIY}', 1, 'persona', 'Domestica', '{"maschera":"Silky"}', '${AIY}-area-1'),
      ('a/3', '${AIY}', 2, 'persona', 'Ombra ignota', '{"maschera":"Sconosciuta"}', '${AIY}-area-1'),
      ('a/4', '${AIY}', 3, 'trama', 'Sala d''attesa - Area 4', '{}', '${AIY}-area-1'),
      ('a/5', '${AIY}', 4, 'trama', 'Nuovi scambi', '{}', '${AIY}-area-1'),
      ('q/1', '${QIM}', 0, 'persona', 'Ragazza seducente', '{"maschera":"Pixie"}', '${QIM}-banchina');
    INSERT INTO richiesta (chiave, ordine, nome, area, area_chiave, piano, bersaglio_json, area_dedalo_chiave) VALUES
      ('r1', 0, 'Bullismo sui bulli', '', '${AIY}', 'Area 5', '{}', '${AIY}-area-1'),
      ('r2', 1, 'Il sadismo', '', '${AIY}', 'Area 7 (Aiyatsbus) / Area 1 (Da''at)', '{}', '${AIY}-area-1'),
      ('r3', 2, 'Senza piano', '', '${AIY}', 'Non specificato', '{}', '${AIY}-area-1'),
      ('r4', 3, 'Di Qimranut', '', '${QIM}', 'Area 2', '{}', '${QIM}-banchina');
    INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome, descrizione, dettagli_json, area_dedalo_chiave) VALUES
      ('a/6', '${AIY}', 5, 'trama', 'Uscita', 'Si raggiunge dopo l''Area 6.', '{}', '${AIY}-area-1');`);
  runMigrations(db);
  // Aiyatsbus: le 7 aree della guida, l'Area 1 conserva la chiave; il totale dei timbri si svuota
  expect(db.prepare('SELECT chiave, ordine, nome, timbri_totale FROM area_dedalo WHERE dedalo_chiave = ? ORDER BY ordine').all(AIY)).toEqual(
    Array.from({ length: 7 }, (_, i) => ({ chiave: chiaveAreaDedalo(AIY, i + 1), ordine: i, nome: `Area ${i + 1}`, timbri_totale: null })));
  const areaDi = (tabella: string, chiave: string) => db.prepare(`SELECT area_dedalo_chiave FROM ${tabella} WHERE chiave = ?`).pluck().get(chiave);
  expect(areaDi('richiesta', 'r1')).toBe(`${AIY}-area-5`);
  expect(areaDi('richiesta', 'r2')).toBe(`${AIY}-area-7`);
  expect(areaDi('richiesta', 'r3')).toBeNull();
  expect(areaDi('punto_interesse', 'a/4')).toBe(`${AIY}-area-4`);
  expect(areaDi('punto_interesse', 'a/5')).toBe(`${AIY}-area-1`);
  // senza un'area nel nome, quella della descrizione (rilievo F2)
  expect(areaDi('punto_interesse', 'a/6')).toBe(`${AIY}-area-6`);
  // le Persona stanno nel dedalo, collegate alle aree dei loro piani; senza piani precisi a tutte
  const aree = (voce: string) => db.prepare('SELECT x.area_dedalo_chiave FROM persona_area_dedalo x JOIN area_dedalo ad ON ad.chiave = x.area_dedalo_chiave WHERE x.voce_chiave = ? ORDER BY ad.ordine').pluck().all(voce);
  expect(aree('a/1')).toEqual([`${AIY}-area-1`, `${AIY}-area-3`]);
  expect(aree('a/2')).toEqual([2, 3, 5, 6].map((n) => `${AIY}-area-${n}`));
  expect(aree('a/3')).toEqual(Array.from({ length: 7 }, (_, i) => chiaveAreaDedalo(AIY, i + 1)));
  expect(db.prepare("SELECT COUNT(*) FROM punto_interesse WHERE tipo = 'persona' AND area_dedalo_chiave IS NOT NULL").pluck().get()).toBe(0);
  // Qimranut era già organizzato dall'utente: aree, timbri e Richieste restano; la Persona resta nella sua area
  expect(db.prepare('SELECT chiave, nome, timbri_totale FROM area_dedalo WHERE dedalo_chiave = ? ORDER BY ordine').all(QIM)).toEqual([
    { chiave: `${QIM}-area-1`, nome: 'Area 1', timbri_totale: null }, { chiave: `${QIM}-banchina`, nome: 'Banchina', timbri_totale: 3 }]);
  expect(areaDi('richiesta', 'r4')).toBe(`${QIM}-banchina`);
  expect(aree('q/1')).toEqual([`${QIM}-banchina`]);
  // ripetuta: niente di nuovo
  const istantanea = () => JSON.stringify([db.prepare('SELECT * FROM area_dedalo ORDER BY chiave').all(), db.prepare('SELECT * FROM persona_area_dedalo ORDER BY voce_chiave, area_dedalo_chiave').all(), db.prepare('SELECT chiave, area_dedalo_chiave FROM richiesta ORDER BY chiave').all(), db.prepare('SELECT chiave, area_dedalo_chiave FROM punto_interesse ORDER BY chiave').all()]);
  const prima = istantanea();
  migration101.up(db);
  expect(istantanea()).toBe(prima);
  // tolta un'area, le Persona perdono solo il collegamento
  db.prepare('DELETE FROM area_dedalo WHERE chiave = ?').run(`${AIY}-area-3`);
  expect(aree('a/1')).toEqual([`${AIY}-area-1`]);
});

it('nel pacchetto: le aree della guida per ogni dedalo, le Richieste nella loro area, ogni Persona in almeno un\'area', () => {
  const db = dbDiProva();
  const nomi = (dedalo: string) => db.prepare('SELECT nome FROM area_dedalo WHERE dedalo_chiave = ? ORDER BY ordine').pluck().all(dedalo);
  for (const [dedalo, attese] of Object.entries(AREE_DEI_DEDALI)) expect(nomi(dedalo)).toEqual(attese);
  expect(nomi('mementos-09-daat')).toHaveLength(16);
  const areaDi = (nome: string) => db.prepare('SELECT ad.nome FROM richiesta r JOIN area_dedalo ad ON ad.chiave = r.area_dedalo_chiave WHERE r.nome = ?').pluck().get(nome);
  expect(areaDi('Bullismo sui bulli')).toBe('Area 5');
  expect(areaDi("Il sadismo è un gesto d'amore")).toBe('Area 7');
  expect(areaDi('Una piccola richiesta d\'aiuto')).toBe('Piano 3');
  expect(areaDi('Il capoccia dello show business')).toBe('Area 14');
  expect(db.prepare("SELECT ad.nome FROM punto_interesse p JOIN area_dedalo ad ON ad.chiave = p.area_dedalo_chiave WHERE p.nome = 'Sala di controllo cognitivo (oltre Piano 15)'").pluck().get()).toBe('Sala di controllo cognitivo');
  // la Trama che la guida colloca solo nella descrizione va nella sua area (rilievo F2); quella senza indizi resta nella prima
  // (la zona «???» di Iweleth, vuota una volta normalizzata, non prende niente)
  const tramaIn = (nome: string) => db.prepare("SELECT ad.nome FROM punto_interesse p JOIN area_dedalo ad ON ad.chiave = p.area_dedalo_chiave WHERE p.nome = ? AND p.area_chiave LIKE 'mementos-%'").pluck().get(nome);
  expect(tramaIn('Jose, studente di umanità')).toBe('Sala di controllo cognitivo');
  expect(tramaIn('Primo sacerdote x2')).toBe('Corridoio della prigione I');
  expect(tramaIn('Accesso a Iweleth bloccato')).toBe('Area 14');
  expect(tramaIn('Santo Graal (rivincita)')).toBe('Entrata');
  expect(db.prepare("SELECT COUNT(*) FROM punto_interesse p JOIN area_dedalo ad ON ad.chiave = p.area_dedalo_chiave WHERE ad.nome = '???'").pluck().get()).toBe(0);
  expect(db.prepare("SELECT ad.nome FROM punto_interesse p JOIN area_dedalo ad ON ad.chiave = p.area_dedalo_chiave WHERE p.nome = 'Sala d''attesa - Area 4'").pluck().get()).toBe('Area 4');
  expect(db.prepare("SELECT COUNT(*) FROM punto_interesse p WHERE p.tipo = 'persona' AND p.area_chiave LIKE 'mementos-%' AND NOT EXISTS (SELECT 1 FROM persona_area_dedalo x WHERE x.voce_chiave = p.chiave)").pluck().get()).toBe(0);
  expect(db.pragma('foreign_key_check')).toEqual([]);
});
