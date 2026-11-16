// ============================================================
// Test — i tipi degli spilli nei dati di gioco, e gli spilli dei luoghi che seguono il catalogo dei tipi di luogo
// ============================================================

import { closeDb, initDb } from '../../db/dbService.js';
import { riallineaSpilliLuoghi } from './riallineaSpilliLuoghi.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

describe('i tipi degli spilli dei punti della guida', () => {
  beforeAll(() => {
    dbDiProva();
  });
  afterAll(() => closeDb());

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
    dbDiProva();
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
