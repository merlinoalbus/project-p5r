// ============================================================
// Test sincronizzaMappe — gli spilli di seed già esistenti seguono il registro quando cambia la corrispondenza dei tipi
// ============================================================

import { closeDb, initDb } from '../../db/dbService.js';
import { caricaPacchetto } from '../pacchetto/pacchettoGioco.js';
import { riallineaSpilliLuoghi, sincronizzaMappe } from './sincronizzaMappe.js';


describe('sincronizzaMappe: riclassificazione degli spilli di seed', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    caricaPacchetto(db);
  });
  afterAll(() => closeDb());

  it('riporta al tipo del registro uno spillo di seed rimasto a un tipo vecchio, senza toccare quelli dell’utente', () => {
    const db = initDb(':memory:');
    const enigma = db.prepare(`SELECT s.id, s.tipo, s.collezionabile, s.riferimento_chiave FROM spillo s JOIN punto_interesse p ON p.chiave = s.riferimento_chiave
      WHERE s.riferimento_tipo = 'punto' AND s.origine = 'seed' AND p.tipo = 'puzzle' LIMIT 1`).get() as { id: number; tipo: string; collezionabile: number; riferimento_chiave: string };
    expect(enigma.tipo).toBe('punto-sensibile');
    // simulo il dato lasciato da una versione precedente del registro
    db.prepare("UPDATE spillo SET tipo = 'nota', collezionabile = 1 WHERE id = ?").run(enigma.id);
    // uno spillo dell'utente sullo stesso punto non deve essere riclassificato
    const mappa = 'tokyo'; // User-owned spatial note remains separate from nonspatial guide ownership.
    const utente = db.prepare(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at)
      VALUES (?, 'nota', 'Mio appunto', '', 10, 10, 'punto', ?, 0, 99, 'utente', '2026-01-01T00:00:00.000Z')`).run(mappa, enigma.riferimento_chiave);

    const esito = sincronizzaMappe(db);
    expect(esito.riclassificati).toBeGreaterThanOrEqual(1);
    const dopo = db.prepare('SELECT tipo, collezionabile FROM spillo WHERE id = ?').get(enigma.id) as { tipo: string; collezionabile: number };
    expect(dopo.tipo).toBe('punto-sensibile');
    expect(dopo.collezionabile).toBe(enigma.collezionabile);
    const mio = db.prepare('SELECT tipo FROM spillo WHERE id = ?').get(Number(utente.lastInsertRowid)) as { tipo: string };
    expect(mio.tipo).toBe('nota');
    // una seconda sincronizzazione non cambia più nulla
    expect(sincronizzaMappe(db).riclassificati).toBe(0);
  });

  it('nel database sincronizzato esistono i cinque tipi nuovi dove i punti lo prevedono', () => {
    const db = initDb(':memory:');
    const tipi = new Set((db.prepare('SELECT DISTINCT tipo FROM spillo').all() as Array<{ tipo: string }>).map((r) => r.tipo));
    expect(tipi.has('punto-sensibile')).toBe(true);
    expect(tipi.has('seme-bramosia')).toBe(true);
    expect(tipi.has('oggetto-chiave')).toBe(true);
    expect(tipi.has('nemico')).toBe(true);
    // nessun enigma resta «nota»
    expect((db.prepare(`SELECT COUNT(*) AS n FROM spillo s JOIN punto_interesse p ON p.chiave = s.riferimento_chiave WHERE s.riferimento_tipo = 'punto' AND p.tipo = 'puzzle' AND s.tipo = 'nota' AND s.origine = 'seed'`).get() as { n: number }).n).toBe(0);
  });
});

describe('riallineaSpilliLuoghi: gli spilli dei luoghi seguono il catalogo dei tipi di luogo', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    caricaPacchetto(db);
  });
  afterAll(() => closeDb());

  it('un luogo «scuola» rimasto con lo spillo «attività» passa a «biblioteca»; un tipo più fine e gli spilli dell’utente restano', () => {
    const db = initDb(':memory:');
    // dopo il seed non deve restare alcuno spillo di seed di scuola al tipo vecchio
    const vecchi = () => (db.prepare(`SELECT COUNT(*) AS n FROM spillo s JOIN luogo l ON l.chiave = s.riferimento_chiave
      WHERE s.riferimento_tipo = 'luogo' AND s.origine = 'seed' AND s.tipo = 'attivita' AND l.tipo = 'scuola'`).get() as { n: number }).n;
    expect(vecchi()).toBe(0);
    // Il pacchetto è la fotografia dell'istanza: che ci sia ancora uno spillo di seed su una scuola o su un
    // servizio dipende dalle correzioni dell'utente. Il caso si costruisce qui: un luogo «scuola» con lo spillo
    // lasciato dalla vecchia corrispondenza e un luogo «servizio» con un tipo più fine assegnato da un pacchetto.
    const quartiere = db.prepare('SELECT chiave FROM quartiere ORDER BY ordine LIMIT 1').pluck().get() as string;
    db.prepare(`INSERT INTO luogo (chiave, quartiere_chiave, ordine, tipo, nome) VALUES (?, ?, 900, 'scuola', 'Scuola di prova'), (?, ?, 901, 'servizio', 'Servizio di prova')`)
      .run(`${quartiere}/scuola-di-prova`, quartiere, `${quartiere}/servizio-di-prova`, quartiere);
    const spilloSeed = db.prepare(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at)
      VALUES ('tokyo', ?, ?, '', ?, ?, 'luogo', ?, 0, 99, 'seed', '2026-01-01T00:00:00.000Z')`);
    const scuola = { id: Number(spilloSeed.run('attivita', 'Scuola di prova', 1, 1, `${quartiere}/scuola-di-prova`).lastInsertRowid) };
    const terme = { id: Number(spilloSeed.run('terme', 'Servizio di prova', 2, 2, `${quartiere}/servizio-di-prova`).lastInsertRowid) };
    const utente = db.prepare(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at)
      SELECT mappa_chiave, 'attivita', 'Mio', '', 5, 5, 'luogo', riferimento_chiave, 0, 99, 'utente', '2026-01-01T00:00:00.000Z' FROM spillo WHERE id = ?`).run(scuola.id);

    expect(riallineaSpilliLuoghi(db)).toBe(1);
    expect((db.prepare('SELECT tipo FROM spillo WHERE id = ?').get(scuola.id) as { tipo: string }).tipo).toBe('biblioteca');
    expect((db.prepare('SELECT tipo FROM spillo WHERE id = ?').get(terme.id) as { tipo: string }).tipo).toBe('terme');
    expect((db.prepare('SELECT tipo FROM spillo WHERE id = ?').get(Number(utente.lastInsertRowid)) as { tipo: string }).tipo).toBe('attivita');
    expect(riallineaSpilliLuoghi(db)).toBe(0);
  });
});

describe('sincronizzaMappe: i passaggi automatici verso le mappe figlie di una radice della guida', () => {
  // Il pacchetto è la fotografia dell'istanza: Tokyo l'utente l'ha ritoccata (origine «utente») e i suoi
  // passaggi li decide l'editor, quindi i test sulle API non vedono più il caso. Qui si costruisce.
  beforeEach(() => {
    const db = initDb(':memory:');
    caricaPacchetto(db);
  });
  afterEach(() => closeDb());

  /** Toglie ogni spillo che porta a una figlia della radice: la sincronizzazione non crea un passaggio che esiste già. */
  function senzaPassaggiVersoLeFiglie(radice: string): void {
    const db = initDb(':memory:');
    db.prepare(`DELETE FROM spillo WHERE riferimento_tipo = 'mappa' AND riferimento_chiave IN (SELECT chiave FROM mappa WHERE genitore_chiave = ?)`).run(radice);
  }

  it('Tokyo della guida: un passaggio per quartiere, Shibuya dove la mette la mappa ufficiale, nessuno verso i Memento', () => {
    const db = initDb(':memory:');
    db.prepare("UPDATE mappa SET origine = 'seed' WHERE chiave = 'tokyo'").run();
    senzaPassaggiVersoLeFiglie('tokyo');
    const attese = (db.prepare("SELECT chiave FROM mappa WHERE genitore_chiave = 'tokyo' AND chiave NOT LIKE 'nativo-%' AND chiave <> 'citta-mementos'").all() as Array<{ chiave: string }>).map((r) => r.chiave);
    expect(attese).toContain('citta-shibuya');

    sincronizzaMappe(db);
    const passaggi = db.prepare(`SELECT riferimento_chiave, x, y, origine, tipo FROM spillo WHERE mappa_chiave = 'tokyo' AND riferimento_tipo = 'mappa'`).all() as Array<{ riferimento_chiave: string; x: number; y: number; origine: string; tipo: string }>;
    expect(passaggi.map((p) => p.riferimento_chiave).sort()).toEqual([...attese].sort());
    expect(passaggi.every((p) => p.tipo === 'passaggio' && p.origine === 'seed')).toBe(true);
    expect(passaggi.find((p) => p.riferimento_chiave === 'citta-shibuya')).toMatchObject({ x: 34.5, y: 49.5 });
    expect(passaggi.some((p) => p.riferimento_chiave === 'citta-mementos')).toBe(false);
    // ripetuta, non duplica
    sincronizzaMappe(db);
    expect(db.prepare("SELECT COUNT(*) FROM spillo WHERE mappa_chiave = 'tokyo' AND riferimento_tipo = 'mappa'").pluck().get()).toBe(passaggi.length);
  });

  it('un Palazzo della guida: un passaggio per area, non verso le planimetrie native; una radice dell’utente non ne riceve', () => {
    const db = initDb(':memory:');
    const t = '2026-01-01T00:00:00.000Z';
    const mappa = db.prepare('INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, origine, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    mappa.run('palazzo-di-prova', 'Palazzo di prova', 'palazzo', null, 900, 'seed', t);
    mappa.run('palazzo-di-prova-ingresso', 'Ingresso', 'area', 'palazzo-di-prova', 1, 'seed', t);
    mappa.run('palazzo-di-prova-torre', 'Torre', 'area', 'palazzo-di-prova', 2, 'seed', t);
    mappa.run('nativo-palazzo-di-prova', 'Planimetria', 'area', 'palazzo-di-prova', 3, 'seed', t);
    mappa.run('palazzo-dell-utente', 'Palazzo dell’utente', 'palazzo', null, 901, 'utente', t);
    mappa.run('palazzo-dell-utente-sala', 'Sala', 'area', 'palazzo-dell-utente', 1, 'utente', t);

    sincronizzaMappe(db);
    const verso = (radice: string) => (db.prepare("SELECT riferimento_chiave FROM spillo WHERE mappa_chiave = ? AND riferimento_tipo = 'mappa' AND tipo = 'passaggio' ORDER BY riferimento_chiave").all(radice) as Array<{ riferimento_chiave: string }>).map((r) => r.riferimento_chiave);
    expect(verso('palazzo-di-prova')).toEqual(['palazzo-di-prova-ingresso', 'palazzo-di-prova-torre']);
    expect(verso('palazzo-dell-utente')).toEqual([]);
  });
});
