// ============================================================
// Test 094 — la voce della guida di un pin passa dal riferimento a un campo suo (dalla 098 lo schema non ha più quel campo:
// il test lo rimette, come lo trovava la 094)
// ============================================================

import { closeDb, getDb, initDb, prepared } from '../dbService.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { migration094 } from './094_voce_dei_pin.js';

afterEach(() => closeDb());

type Riga = { uid: string; riferimento_tipo: string | null; riferimento_chiave: string | null; voce_chiave: string | null };
/** Uid, riferimento e `voce_chiave` dello spillo `id`. */
const riga = (id: number) => prepared('SELECT uid, riferimento_tipo, riferimento_chiave, voce_chiave FROM spillo WHERE id = ?').get(id) as Riga;

it('i pin delle planimetrie collegati a una voce passano al campo nuovo con il loro uid e il loro «raccolto»; il resto non cambia; ripetuta non fa altro', () => {
  initDb(':memory:');
  caricaPacchetto(getDb());
  // lo schema di allora: dalla 098 la colonna non c'è più (le voci stanno in `spillo_voce`), e la si rimette com'era
  expect((prepared("SELECT name FROM pragma_table_info('spillo')").pluck().all() as string[])).not.toContain('voce_chiave');
  prepared('ALTER TABLE spillo ADD COLUMN voce_chiave TEXT REFERENCES punto_interesse(chiave) ON DELETE SET NULL').run();
  // lo stato di prima, ricostruito: due pin di planimetria collegati a voci nel riferimento (uno a una voce che non c'è più),
  // un elemento della guida senza mappa con il suo riferimento «punto», un passaggio con la sua destinazione
  const [voce, altraVoce] = prepared('SELECT chiave FROM punto_interesse ORDER BY chiave LIMIT 2').pluck().all() as string[];
  const [collegato, orfano] = prepared('SELECT id FROM spillo WHERE mappa_chiave IS NOT NULL AND riferimento_tipo IS NULL AND uid IS NOT NULL ORDER BY id LIMIT 2').pluck().all() as number[];
  const passaggio = prepared("SELECT id FROM spillo WHERE mappa_chiave IS NOT NULL AND riferimento_tipo = 'mappa' ORDER BY id LIMIT 1").pluck().get() as number;
  const senzaMappa = prepared("SELECT id FROM spillo WHERE mappa_chiave IS NULL AND riferimento_tipo = 'punto' ORDER BY id LIMIT 1").pluck().get() as number;
  expect([voce, altraVoce, collegato, orfano, passaggio, senzaMappa].every((x) => x !== undefined)).toBe(true);
  prepared("UPDATE spillo SET riferimento_tipo = 'punto', riferimento_chiave = ? WHERE id = ?").run(voce, collegato);
  prepared("UPDATE spillo SET riferimento_tipo = 'punto', riferimento_chiave = 'voce-che-non-esiste' WHERE id = ?").run(orfano);
  const partita = Number(prepared("INSERT INTO partita (nome, attiva, livello_protagonista, created_at, updated_at) VALUES ('Prova', 0, 1, 'x', 'x')").run().lastInsertRowid);
  prepared("INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, 1, 'x')").run(partita, riga(collegato).uid);
  prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', 'x')").run(partita, voce);
  const prima = { collegato: riga(collegato), orfano: riga(orfano), passaggio: riga(passaggio), senzaMappa: riga(senzaMappa) };

  migration094.up(getDb());
  expect(riga(collegato)).toEqual({ uid: prima.collegato.uid, riferimento_tipo: null, riferimento_chiave: null, voce_chiave: voce });
  // un riferimento a una voce tolta non diventa un collegamento rotto: resta com'era
  expect(riga(orfano)).toEqual(prima.orfano);
  expect(riga(passaggio)).toEqual(prima.passaggio);
  expect(riga(senzaMappa)).toEqual(prima.senzaMappa);
  // gli stati delle partite non si toccano
  expect(prepared('SELECT raccolto FROM spillo_partita WHERE partita_id = ? AND spillo_uid = ?').pluck().get(partita, prima.collegato.uid)).toBe(1);
  expect(prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').pluck().get(partita, voce)).toBe('ottenuto');

  // ripetuta: niente da spostare, niente che cambi
  const tutte = () => prepared('SELECT id, riferimento_tipo, riferimento_chiave, voce_chiave FROM spillo ORDER BY id').all();
  const dopo = tutte();
  migration094.up(getDb());
  expect(tutte()).toEqual(dopo);

  // eliminata la voce, il campo torna vuoto (ON DELETE SET NULL) e il pin resta
  prepared('UPDATE spillo SET voce_chiave = ? WHERE id = ?').run(altraVoce, passaggio);
  prepared('DELETE FROM punto_interesse WHERE chiave = ?').run(altraVoce);
  expect(riga(passaggio)).toEqual(prima.passaggio);
});
