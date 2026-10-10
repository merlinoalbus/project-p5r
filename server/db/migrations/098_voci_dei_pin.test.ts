// ============================================================
// Test 098 — le voci della guida dei pin passano in `spillo_voce`, e `spillo.voce_chiave` esce dallo schema
// ============================================================

import { closeDb, getDb, initDb, prepared } from '../dbService.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { migration098 } from './098_voci_dei_pin.js';

afterEach(() => closeDb());

/** Le colonne di `spillo`, in ordine. */
const colonne = () => prepared("SELECT name FROM pragma_table_info('spillo')").pluck().all() as string[];
/** Gli indici di `spillo` (solo quelli scritti, non gli automatici). */
const indici = () => prepared("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'spillo' AND sql IS NOT NULL ORDER BY name").pluck().all() as string[];
/** Applica la migrazione come la applica il runner: chiavi esterne spente durante la ricostruzione della tabella. */
const applica = () => { getDb().pragma('foreign_keys = OFF'); try { migration098.up(getDb()); } finally { getDb().pragma('foreign_keys = ON'); } };

it('copia i collegamenti in spillo_voce, toglie la colonna, tiene righe, indici, vincoli e stati; ripetuta non fa altro', () => {
  initDb(':memory:');
  caricaPacchetto(getDb());
  // lo schema della 097, ricostruito: la colonna della 094 e nessuna tabella delle voci
  prepared('DROP TABLE spillo_voce').run();
  prepared('ALTER TABLE spillo ADD COLUMN voce_chiave TEXT REFERENCES punto_interesse(chiave) ON DELETE SET NULL').run();
  prepared('CREATE INDEX idx_spillo_voce ON spillo(voce_chiave)').run();
  const [voce, altraVoce] = prepared("SELECT chiave FROM punto_interesse WHERE tipo <> 'altro' ORDER BY chiave LIMIT 2").pluck().all() as string[];
  const [a, b] = prepared('SELECT id FROM spillo WHERE mappa_chiave IS NOT NULL AND uid IS NOT NULL ORDER BY id LIMIT 2').pluck().all() as number[];
  prepared('UPDATE spillo SET voce_chiave = ? WHERE id = ?').run(voce, a);
  prepared('UPDATE spillo SET voce_chiave = ? WHERE id = ?').run(altraVoce, b);
  const partita = Number(prepared("INSERT INTO partita (nome, attiva, livello_protagonista, created_at, updated_at) VALUES ('Prova', 0, 1, 'x', 'x')").run().lastInsertRowid);
  const uidA = prepared('SELECT uid FROM spillo WHERE id = ?').pluck().get(a) as string;
  prepared("INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, 1, 'x')").run(partita, uidA);
  // tutte le righe e le colonne, tranne quella che se ne va: devono restare identiche
  const tenute = colonne().filter((c) => c !== 'voce_chiave').map((c) => `"${c}"`).join(', ');
  /** Tutte le righe di `spillo`, colonne tenute, in ordine di id. */
  const righe = () => prepared(`SELECT ${tenute} FROM spillo ORDER BY id`).all();
  const prima = righe();
  const indiciPrima = indici();
  const immagini = prepared('SELECT COUNT(*) FROM spillo_immagine').pluck().get();
  const destinazioni = prepared('SELECT COUNT(*) FROM spillo_destinazione').pluck().get();

  applica();
  expect(colonne()).not.toContain('voce_chiave');
  expect(prepared('SELECT spillo_id, voce_chiave FROM spillo_voce ORDER BY spillo_id').all()).toEqual([{ spillo_id: a, voce_chiave: voce }, { spillo_id: b, voce_chiave: altraVoce }]);
  expect(righe()).toEqual(prima);
  expect(indici()).toEqual(indiciPrima.filter((i) => i !== 'idx_spillo_voce'));
  // le tabelle che dipendono da spillo non perdono niente (la ricostruzione non cancella a cascata) e i vincoli reggono
  expect(prepared('SELECT COUNT(*) FROM spillo_immagine').pluck().get()).toBe(immagini);
  expect(prepared('SELECT COUNT(*) FROM spillo_destinazione').pluck().get()).toBe(destinazioni);
  expect(getDb().pragma('main.foreign_key_check')).toEqual([]);
  // gli stati delle partite non si toccano
  expect(prepared('SELECT raccolto FROM spillo_partita WHERE partita_id = ? AND spillo_uid = ?').pluck().get(partita, uidA)).toBe(1);

  // ripetuta: niente da copiare, niente che cambi
  const dopo = prepared('SELECT * FROM spillo_voce ORDER BY spillo_id, voce_chiave').all();
  applica();
  expect(prepared('SELECT * FROM spillo_voce ORDER BY spillo_id, voce_chiave').all()).toEqual(dopo);
  expect(righe()).toEqual(prima);

  // un pin può avere più voci; tolto il pin o la voce, il collegamento se ne va da sé (ON DELETE CASCADE)
  prepared('INSERT INTO spillo_voce (spillo_id, voce_chiave) VALUES (?, ?)').run(a, altraVoce);
  expect(prepared('SELECT voce_chiave FROM spillo_voce WHERE spillo_id = ? ORDER BY voce_chiave').pluck().all(a)).toEqual([voce, altraVoce].sort());
  prepared('DELETE FROM spillo WHERE id = ?').run(b);
  expect(prepared('SELECT COUNT(*) FROM spillo_voce WHERE spillo_id = ?').pluck().get(b)).toBe(0);
  prepared('DELETE FROM marcatore_mappa WHERE punto_chiave = ?').run(altraVoce);
  prepared('DELETE FROM punto_partita WHERE punto_chiave = ?').run(altraVoce);
  prepared("UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE riferimento_tipo = 'punto' AND riferimento_chiave = ?").run(altraVoce);
  prepared('UPDATE punto_interesse SET contenitore_chiave = NULL WHERE contenitore_chiave = ?').run(altraVoce);
  prepared('DELETE FROM punto_interesse WHERE chiave = ?').run(altraVoce);
  expect(prepared('SELECT voce_chiave FROM spillo_voce WHERE spillo_id = ?').pluck().all(a)).toEqual([voce]);
});

it('una colonna voce_chiave dalla forma inattesa ferma la migrazione invece di toccare lo schema', () => {
  initDb(':memory:');
  caricaPacchetto(getDb());
  prepared('DROP TABLE spillo_voce').run();
  // senza il vincolo della 094: non è la colonna che la migrazione sa togliere
  prepared('ALTER TABLE spillo ADD COLUMN voce_chiave TEXT').run();
  expect(() => getDb().transaction(() => applica())()).toThrow(/forma attesa/);
  expect(colonne()).toContain('voce_chiave');
});
