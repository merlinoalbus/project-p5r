// ============================================================
// Test cestinoService — registrare un'eliminazione (trigger temporanei, cascate, BLOB, due file) e rimetterla com'era, con
// quel che è successo dopo che vince (migrazioni 104 e utente 021, 2026-10-16)
// ============================================================

import { closeDb, getDb } from '../db/dbService.js';
import { dbDiProva } from '../../test/dbDiProva.js';
import { conCestino, elencoCestino, eliminaDalCestino, registraRipristinoCestino, ripristinaDalCestino, svuotaCestino } from './cestinoService.js';

/** La planimetria di prova: è «l'elemento» eliminato (la radice di tipo `mappa`). */
const MAPPA = 'prova-cestino';
const ELEMENTO = { tipo: 'mappa' as const, chiave: MAPPA, nome: 'Planimetria di prova', contesto: 'Palazzo di prova' };
const BLOB = Buffer.from([0, 1, 2, 250, 255]);

beforeAll(() => {
  dbDiProva();
  getDb().exec(`
    CREATE TABLE main.prova_padre (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, ordine INTEGER NOT NULL);
    CREATE TABLE main.prova_figlio (id INTEGER PRIMARY KEY, padre INTEGER NOT NULL REFERENCES prova_padre(id) ON DELETE CASCADE, dato BLOB);
    CREATE TABLE main.prova_legame (padre INTEGER NOT NULL REFERENCES prova_padre(id), altro INTEGER NOT NULL REFERENCES prova_padre(id), PRIMARY KEY (padre, altro)) WITHOUT ROWID;
    CREATE TABLE main.prova_senza_chiave (x TEXT NOT NULL);
    CREATE TABLE utente.prova_stato (chiave TEXT PRIMARY KEY, valore INTEGER NOT NULL);
  `);
});
afterAll(() => closeDb());

/** Rimette i dati di prova da capo e svuota il cestino. */
function semina(): void {
  const db = getDb();
  svuotaCestino();
  db.exec(`
    DELETE FROM prova_legame; DELETE FROM prova_figlio; DELETE FROM prova_padre; DELETE FROM prova_senza_chiave; DELETE FROM utente.prova_stato;
    DELETE FROM mappa WHERE chiave IN ('${MAPPA}', 'prova-genitore');
    INSERT INTO prova_padre VALUES (1, 'uno', 0), (2, 'due', 1), (3, 'tre', 2);
    INSERT INTO prova_legame VALUES (1, 3), (2, 3);
    INSERT INTO prova_senza_chiave VALUES ('uno'), ('due');
    INSERT INTO utente.prova_stato VALUES ('a', 1), ('b', 2);
    INSERT INTO mappa (chiave, nome, tipo, updated_at) VALUES ('prova-genitore', 'Genitore', 'area', '2026-10-16T00:00:00.000Z');
    INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, updated_at) VALUES ('${MAPPA}', 'Planimetria di prova', 'area', 'prova-genitore', '2026-10-16T00:00:00.000Z');
  `);
  db.prepare('INSERT INTO prova_figlio VALUES (?, 1, ?), (?, 1, NULL), (?, 2, NULL)').run(10, BLOB, 11, 20);
}

/** L'eliminazione di prova: tocca i due file con DELETE (anche in cascata), UPDATE, INSERT e INSERT OR REPLACE. */
function eliminaProva(): void {
  const db = getDb();
  db.prepare('DELETE FROM prova_legame WHERE padre = 1').run();
  db.prepare('DELETE FROM prova_padre WHERE id = 1').run(); // con i figli 10 e 11, in cascata
  db.prepare('UPDATE prova_padre SET ordine = ordine - 1 WHERE ordine > 0').run();
  db.prepare('UPDATE prova_padre SET nome = nome WHERE id = 3').run(); // non cambia niente: non entra nel registro
  db.prepare("INSERT INTO prova_padre VALUES (99, 'creato', 9)").run();
  db.prepare("INSERT OR REPLACE INTO utente.prova_stato VALUES ('a', 7)").run();
  db.prepare("DELETE FROM utente.prova_stato WHERE chiave = 'b'").run();
  db.prepare("DELETE FROM prova_senza_chiave WHERE x = 'uno'").run();
  db.prepare('DELETE FROM mappa WHERE chiave = ?').run(MAPPA);
}

/** Lo stato completo dei dati di prova (BLOB in esadecimale). */
function istantanea(): Record<string, unknown[]> {
  const db = getDb();
  return {
    padre: db.prepare('SELECT * FROM prova_padre ORDER BY id').all(),
    figlio: db.prepare('SELECT id, padre, hex(dato) AS dato FROM prova_figlio ORDER BY id').all(),
    legame: db.prepare('SELECT * FROM prova_legame ORDER BY padre, altro').all(),
    senzaChiave: db.prepare('SELECT rowid, x FROM prova_senza_chiave ORDER BY rowid').all(),
    stato: db.prepare('SELECT * FROM utente.prova_stato ORDER BY chiave').all(),
    mappa: db.prepare("SELECT * FROM mappa WHERE chiave IN ('prova-cestino', 'prova-genitore') ORDER BY chiave").all(),
  };
}

const triggerRimasti = () => (getDb().prepare("SELECT count(*) AS n FROM temp.sqlite_master WHERE type = 'trigger'").get() as { n: number }).n;
const idInCestino = () => elencoCestino()[0].id;

describe('registrare un\'eliminazione', () => {
  beforeEach(semina);

  it('ogni riga toccata nei due file finisce nel registro, cascate e BLOB compresi; i trigger non restano', () => {
    conCestino(ELEMENTO, eliminaProva);
    expect(triggerRimasti()).toBe(0);
    expect(getDb().pragma('recursive_triggers', { simple: true })).toBe(0);
    const [v] = elencoCestino();
    expect(v).toMatchObject({ tipo: 'mappa', chiave: MAPPA, nome: 'Planimetria di prova', contesto: 'Palazzo di prova', partite: 'presente' });
    const quante = Object.fromEntries(v.contenuto.map((c) => [c.tabella, c.quante]));
    // tolte: il padre 1 con i figli 10 e 11 (cascata), il legame (1,3), la riga senza chiave, la mappa; nelle partite 'b'. La vecchia
    // 'a' tolta dal REPLACE è tornata subito con la stessa chiave (valore nuovo): cambiata, non tolta
    expect(quante).toEqual({ prova_padre: 1, prova_figlio: 2, prova_legame: 1, prova_senza_chiave: 1, mappa: 1, prova_stato: 1 });
    // il nome per l'utente col numero giusto: una planimetria, due righe di una tabella senza nome proprio
    expect(v.contenuto.find((c) => c.tabella === 'mappa')!.etichetta).toBe('planimetria');
    expect(v.contenuto.find((c) => c.tabella === 'prova_figlio')!.etichetta).toBe('prova figlio');
    const registro = JSON.parse((getDb().prepare('SELECT registro_json FROM main.cestino').get() as { registro_json: string }).registro_json) as Array<{ tabella: string; op: string; prima?: Record<string, unknown>; dopo?: Record<string, unknown> }>;
    // il figlio con il BLOB, intatto; i due UPDATE dell'ordine; l'INSERT del nuovo padre
    expect(registro.find((p) => p.tabella === 'prova_figlio' && p.prima!.id === 10)!.prima!.dato).toEqual({ $blob: BLOB.toString('base64') });
    expect(registro.filter((p) => p.tabella === 'prova_padre' && p.op === 'U').map((p) => [p.prima!.ordine, p.dopo!.ordine])).toEqual([[1, 0], [2, 1]]);
    expect(registro.some((p) => p.tabella === 'prova_padre' && p.op === 'I' && p.dopo!.id === 99)).toBe(true);
    // i figli si annotano prima del padre (cascata): al ripristino all'inverso torna prima il padre
    const ordine = registro.map((p) => `${p.tabella}:${String((p.prima ?? p.dopo)!.id ?? '')}`);
    expect(ordine.indexOf('prova_figlio:10')).toBeLessThan(ordine.indexOf('prova_padre:1'));
    // la riga senza chiave primaria si annota con il suo rowid
    expect(registro.find((p) => p.tabella === 'prova_senza_chiave')!.prima).toEqual({ rowid: 1, x: 'uno' });
    // le righe delle partite stanno nel loro file
    expect(registro.some((p) => p.tabella === 'prova_stato')).toBe(false);
    const partite = JSON.parse((getDb().prepare('SELECT registro_json FROM utente.cestino_partite').get() as { registro_json: string }).registro_json) as Array<{ op: string; prima?: unknown; dopo?: unknown }>;
    expect(partite.map((p) => p.op)).toEqual(['D', 'I', 'D']);
  });

  it('se l\'eliminazione fallisce non resta niente: né l\'eliminazione, né il registro, né i trigger', () => {
    const prima = istantanea();
    expect(() => conCestino(ELEMENTO, () => { eliminaProva(); throw new Error('a metà'); })).toThrow('a metà');
    expect(istantanea()).toEqual(prima);
    expect(elencoCestino()).toEqual([]);
    expect(triggerRimasti()).toBe(0);
    expect(getDb().pragma('recursive_triggers', { simple: true })).toBe(0);
  });

  it('dentro una transazione già aperta registra lo stesso, anche il REPLACE (e un annullamento di fuori toglie tutto)', () => {
    const prima = istantanea();
    getDb().transaction(() => conCestino(ELEMENTO, eliminaProva))();
    const [v] = elencoCestino();
    expect(v.contenuto.find((c) => c.tabella === 'prova_stato')!.quante).toBe(1);
    // il REPLACE è nel registro: la vecchia 'a' tolta e la nuova messa, poi 'b' tolta
    const partite = JSON.parse((getDb().prepare('SELECT registro_json FROM utente.cestino_partite').get() as { registro_json: string }).registro_json) as Array<{ op: string }>;
    expect(partite.map((p) => p.op)).toEqual(['D', 'I', 'D']);
    expect(triggerRimasti()).toBe(0);
    svuotaCestino();
    semina();
    expect(() => getDb().transaction(() => { conCestino(ELEMENTO, eliminaProva); throw new Error('fuori'); })()).toThrow('fuori');
    expect(istantanea()).toEqual(prima);
    expect(elencoCestino()).toEqual([]);
  });

  it('un\'eliminazione dentro un\'altra finisce nel registro di quella di fuori', () => {
    conCestino(ELEMENTO, () => {
      conCestino({ tipo: 'voce', chiave: 'x', nome: 'interna' }, () => getDb().prepare("DELETE FROM prova_senza_chiave WHERE x = 'due'").run());
      eliminaProva();
    });
    const v = elencoCestino();
    expect(v).toHaveLength(1);
    expect(v[0].contenuto.find((c) => c.tabella === 'prova_senza_chiave')!.quante).toBe(2);
  });
});

describe('rimettere com\'era', () => {
  beforeEach(semina);

  it('rimette ogni riga com\'era (BLOB, rowid, partite), toglie quella aggiunta, ed esce dal cestino', () => {
    const prima = istantanea();
    conCestino(ELEMENTO, eliminaProva);
    expect(istantanea()).not.toEqual(prima);
    const chiamate: string[] = [];
    registraRipristinoCestino('mappa', (k) => chiamate.push(k));
    const esito = ripristinaDalCestino(idInCestino());
    expect(istantanea()).toEqual(prima);
    expect(esito).toMatchObject({ tipo: 'mappa', chiave: MAPPA, nome: 'Planimetria di prova', saltate: [], partiteMancanti: false });
    // 6 reinserite + 2 ordini + 1 tolta nel gioco; nelle partite 'b', la vecchia 'a' e la nuova 'a' tolta
    expect(esito.rimesse).toBe(12);
    expect(chiamate).toEqual([MAPPA]);
    expect(elencoCestino()).toEqual([]);
    expect(getDb().prepare('SELECT count(*) AS n FROM utente.cestino_partite').get()).toEqual({ n: 0 });
  });

  it('quel che è cambiato dopo l\'eliminazione resta com\'è, colonna per colonna, e l\'esito lo dice', () => {
    conCestino(ELEMENTO, eliminaProva);
    // dopo: il 2 cambia nome (colonna che l'eliminazione non aveva toccato); il 3 cambia ordine (la stessa colonna che
    // l'eliminazione aveva spostato); nelle partite 'a' cambia valore
    getDb().exec("UPDATE prova_padre SET nome = 'rinominato' WHERE id = 2; UPDATE prova_padre SET ordine = 7 WHERE id = 3; UPDATE utente.prova_stato SET valore = 5 WHERE chiave = 'a'");
    const esito = ripristinaDalCestino(idInCestino());
    const s = istantanea();
    // il padre 1 e i suoi figli tornano; il 2 riprende il suo ordine e tiene il nome nuovo; il 3 tiene l'ordine di dopo; il 99 se ne va
    expect(s.padre).toEqual([{ id: 1, nome: 'uno', ordine: 0 }, { id: 2, nome: 'rinominato', ordine: 1 }, { id: 3, nome: 'tre', ordine: 7 }]);
    expect(s.figlio).toHaveLength(3);
    // nelle partite: 'a' resta 5 (toccata dopo), 'b' torna
    expect(s.stato).toEqual([{ chiave: 'a', valore: 5 }, { chiave: 'b', valore: 2 }]);
    expect(esito.saltate).toEqual(expect.arrayContaining([
      expect.objectContaining({ tabella: 'prova_padre', motivo: 'cambiata-dopo', quante: 1, esempi: ['3'] }),
      expect.objectContaining({ tabella: 'prova_stato', motivo: 'cambiata-dopo', quante: 2, esempi: ['a', 'a'] }),
    ]));
  });

  it('una chiave del file di gioco presa da qualcosa creato dopo blocca tutto (409) e non cambia niente', () => {
    conCestino(ELEMENTO, eliminaProva);
    getDb().exec("INSERT INTO prova_padre VALUES (1, 'nuovo', 5)");
    const prima = istantanea();
    expect(() => ripristinaDalCestino(idInCestino())).toThrow(expect.objectContaining({ status: 409, code: 'cestino-chiavi-occupate' }));
    expect(istantanea()).toEqual(prima);
    expect(elencoCestino()).toHaveLength(1);
  });

  it('una riga che punta a qualcosa eliminato dopo non torna, il resto sì', () => {
    conCestino(ELEMENTO, eliminaProva);
    getDb().exec('DELETE FROM prova_legame WHERE altro = 3; DELETE FROM prova_padre WHERE id = 3');
    const esito = ripristinaDalCestino(idInCestino());
    expect(istantanea().legame).toEqual([]);
    expect(istantanea().padre.map((p) => (p as { id: number }).id)).toEqual([1, 2]);
    expect(esito.saltate).toEqual(expect.arrayContaining([
      expect.objectContaining({ tabella: 'prova_legame', motivo: 'legame-mancante', esempi: ['1 · 3'] }),
      expect.objectContaining({ tabella: 'prova_padre', motivo: 'non-esiste-piu', esempi: ['3'] }),
    ]));
  });

  it('senza la parte delle partite (file sostituito) si rimettono i dati di gioco, e lo si dice', () => {
    conCestino(ELEMENTO, eliminaProva);
    getDb().exec('DELETE FROM utente.cestino_partite');
    expect(elencoCestino()[0].partite).toBe('mancante');
    const esito = ripristinaDalCestino(idInCestino());
    expect(esito.partiteMancanti).toBe(true);
    expect(istantanea().padre).toHaveLength(3);
    expect(istantanea().stato).toEqual([{ chiave: 'a', valore: 7 }]);
  });

  it('se l\'elemento stesso non può tornare non si rimette niente (409)', () => {
    conCestino(ELEMENTO, eliminaProva);
    // la planimetria genitrice se ne va dopo: la planimetria non si può reinserire (punta a lei)
    getDb().exec("DELETE FROM mappa WHERE chiave = 'prova-genitore'");
    const prima = istantanea();
    expect(() => ripristinaDalCestino(idInCestino())).toThrow(expect.objectContaining({ status: 409, code: 'cestino-non-ripristinabile' }));
    expect(istantanea()).toEqual(prima);
    expect(elencoCestino()).toHaveLength(1);
  });
});

describe('svuotare', () => {
  beforeEach(semina);

  it('eliminare un elemento lo toglie con la sua parte nelle partite; svuotare toglie tutto; 404 se non c\'è', () => {
    conCestino(ELEMENTO, eliminaProva);
    conCestino({ tipo: 'voce', chiave: 'y', nome: 'seconda' }, () => getDb().prepare("DELETE FROM utente.prova_stato WHERE chiave = 'a'").run());
    expect(elencoCestino().map((v) => v.nome)).toEqual(['seconda', 'Planimetria di prova']);
    eliminaDalCestino(elencoCestino()[1].id);
    expect(elencoCestino().map((v) => v.nome)).toEqual(['seconda']);
    expect(getDb().prepare('SELECT count(*) AS n FROM utente.cestino_partite').get()).toEqual({ n: 1 });
    expect(() => eliminaDalCestino(99999)).toThrow(expect.objectContaining({ status: 404 }));
    expect(() => ripristinaDalCestino(99999)).toThrow(expect.objectContaining({ status: 404 }));
    expect(svuotaCestino()).toEqual({ eliminati: 1 });
    expect(elencoCestino()).toEqual([]);
    expect(getDb().prepare('SELECT count(*) AS n FROM utente.cestino_partite').get()).toEqual({ n: 0 });
  });
});
