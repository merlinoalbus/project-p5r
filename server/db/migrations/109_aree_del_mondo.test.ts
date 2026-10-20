// ============================================================
// Test 109 — le Aree del mondo (L2, 2026-10-20), su una copia ridotta con i casi reali: Shibuya con il gruppo del Sottopasso,
// Shujin con due planimetrie allo stesso ordine, Yongen-Jaya col Covo ancora radice, lo staff sotto Tokyo, l'ingresso dei Memento,
// un Palazzo con un gruppo d'immagini, i passaggi, gli alias, gli ingressi e il cestino
// ============================================================

import { closeDb, initDb, type AppDatabase } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { assegnaAreeDelMondo109 } from './109_aree_del_mondo.js';

afterEach(() => closeDb());

/** Lo schema fino alla 108 e i dati di prova, con le stesse chiavi della produzione. */
function primaDella109(): AppDatabase {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 109));
  const q = db.prepare('INSERT INTO quartiere (chiave, nome, ordine) VALUES (?, ?, ?)');
  [['shibuya', 'Shibuya', 1], ['shujin-academy', 'Shujin Academy', 2], ['yongen-jaya', 'Yongen-Jaya', 3], ['kichijoji', 'Kichijoji', 4], ['ikebukuro', 'Ikebukuro', 5], ['mementos', 'Entrata dei Memento', 6]].forEach((r) => q.run(...r));
  db.prepare("INSERT INTO dungeon (chiave, tipo, ordine, nome) VALUES ('kamoshida', 'palazzo', 1, 'Castello')").run();
  const m = db.prepare("INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, entita_tipo, entita_chiave, origine, nome_rivisto, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'x')");
  // Tokyo la crea già una migrazione di prima (con il suo alias e il suo percorso)
  if (!db.prepare("SELECT 1 FROM mappa WHERE chiave = 'tokyo'").get()) m.run('tokyo', 'Tokyo', 'citta', null, 0, null, null, 'seed', 0);
  for (const [k, ord] of [['shibuya', 1], ['shujin-academy', 2], ['yongen-jaya', 3], ['kichijoji', 4], ['ikebukuro', 5], ['mementos', 6]] as const) m.run(`citta-${k}`, k, 'quartiere', 'tokyo', ord, 'quartiere', k, 'seed', 0);
  // Shibuya: due sciolte e il gruppo del Sottopasso (nome rivisto, utente)
  m.run('nativo-rmap-001-1-0', 'Piazza della stazione', 'luogo', 'citta-shibuya', 0, null, null, 'seed', 0);
  m.run('nativo-rmap-001-2-0', 'Sottopasso', 'luogo', 'citta-shibuya', 100, null, null, 'utente', 1);
  m.run('nativo-rmap-001-2-1', 'Sottopasso Speciale', 'luogo', 'citta-shibuya', 101, null, null, 'utente', 1);
  m.run('nativo-rmap-001-3-0', 'Central Street', 'luogo', 'citta-shibuya', 200, null, null, 'seed', 0);
  // Shujin: due planimetrie allo stesso ordine (una di tipo «area» col nome rivisto), il nome lungo coi piani
  m.run('nativo-rmap-002-0-0', 'Edificio principale 1P / Edificio laboratori 1P', 'luogo', 'citta-shujin-academy', 0, null, null, 'seed', 0);
  m.run('shibuya-tornello-della-linea-ginza-aoyama-itchome', 'Banchina Aoyama Itchome', 'area', 'citta-shujin-academy', 0, null, null, 'utente', 1);
  m.run('nativo-rmap-002-1-0', 'Cancello della scuola', 'luogo', 'citta-shujin-academy', 300, null, null, 'seed', 0);
  // Yongen-Jaya: la Banchina (ordine 0) e Vicoli; il Covo ancora radice, in un gruppo di cinque
  m.run('yongen-java-banchina-della-metropolitana', 'Banchina della metropolitana', 'area', 'citta-yongen-jaya', 0, null, null, 'utente', 0);
  m.run('nativo-rmap-009-2-0', 'Vicoli', 'area', 'citta-yongen-jaya', 100, null, null, 'utente', 0);
  const etichette = ['settore d’ingresso', 'planimetria completa', 'porzione occidentale', 'porzione settentrionale', 'inquadratura orientale'];
  etichette.forEach((e, i) => m.run(`nativo-rmap-022-1-${i}`, i === 1 ? 'Covo dei Ladri' : `Covo dei Ladri — ${e}`, 'luogo', null, i, null, null, 'seed', 0));
  // Kichijoji: una sola; Ikebukuro: nessuna
  m.run('nativo-rmap-005-1-0', 'Quartiere dello shopping', 'luogo', 'citta-kichijoji', 0, null, null, 'seed', 0);
  // lo staff sotto Tokyo; fuori dal mondo: una figlia dell'ingresso dei Memento e il Palazzo con un gruppo
  m.run('nativo-rmap-150-3-0', 'Area riservata allo staff — porzione occidentale', 'luogo', 'tokyo', 100, null, null, 'seed', 0);
  m.run('nativo-rmap-150-3-1', 'Area riservata allo staff', 'luogo', 'tokyo', 101, null, null, 'seed', 0);
  m.run('memento-figlia', 'Figlia del Memento', 'luogo', 'citta-mementos', 0, null, null, 'seed', 0);
  m.run('dungeon-kamoshida', 'Castello', 'palazzo', null, 100, 'dungeon', 'kamoshida', 'seed', 0);
  m.run('nativo-rmap-152-1-0', 'Atrio', 'area', 'dungeon-kamoshida', 0, null, null, 'seed', 0);
  m.run('nativo-rmap-152-1-1', 'Atrio (2)', 'area', 'dungeon-kamoshida', 1, null, null, 'seed', 0);
  const g = db.prepare('INSERT INTO mappa_presentazione (mappa_chiave, contesti_json, gruppo_immagini_json) VALUES (?, \'[]\', ?)');
  g.run('nativo-rmap-001-2-0', JSON.stringify({ id: 'nativo-rmap-001-2-0', nome: 'Sottopasso', ordine: 0, etichetta: 'inquadratura orientale' }));
  g.run('nativo-rmap-001-2-1', JSON.stringify({ id: 'nativo-rmap-001-2-0', nome: 'Sottopasso', ordine: 1, etichetta: 'planimetria completa' }));
  etichette.forEach((e, i) => g.run(`nativo-rmap-022-1-${i}`, JSON.stringify({ id: 'nativo-rmap-022-1-0', nome: 'Covo dei Ladri', ordine: i, etichetta: e })));
  g.run('nativo-rmap-150-3-0', JSON.stringify({ id: 'nativo-rmap-150-3-0', nome: 'Area riservata allo staff', ordine: 0, etichetta: 'porzione occidentale' }));
  g.run('nativo-rmap-150-3-1', JSON.stringify({ id: 'nativo-rmap-150-3-0', nome: 'Area riservata allo staff', ordine: 1, etichetta: 'planimetria completa' }));
  g.run('nativo-rmap-152-1-0', JSON.stringify({ id: 'nativo-rmap-152-1-0', nome: 'Atrio', ordine: 0, etichetta: 'a' }));
  g.run('nativo-rmap-152-1-1', JSON.stringify({ id: 'nativo-rmap-152-1-0', nome: 'Atrio', ordine: 1, etichetta: 'b' }));
  // pin: un passaggio dal quartiere a Central Street, uno da una zona all'altra, un pin di Kamoshida verso il mondo
  const s = db.prepare("INSERT INTO spillo (mappa_chiave, tipo, nome, x, y, riferimento_tipo, riferimento_chiave, origine, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'utente', 'x')");
  s.run('citta-shibuya', 'passaggio', 'Central Street', 38.5, 40.25, 'mappa', 'nativo-rmap-001-3-0');
  s.run('nativo-rmap-001-3-0', 'passaggio', 'Sottopasso', 10, 90, 'mappa', 'nativo-rmap-001-2-0');
  s.run('nativo-rmap-152-1-0', 'passaggio', 'Uscita', 50, 50, 'mappa', 'citta-shujin-academy');
  db.prepare("INSERT INTO mappa_alias (chiave, mappa_chiave) VALUES ('shibuya-sottopasso', 'nativo-rmap-001-2-1'), ('covo-dei-ladri', 'nativo-rmap-022-1-1')").run();
  db.prepare("INSERT INTO mappa_percorso (mappa_chiave, chiave, nome) VALUES ('nativo-rmap-022-1-1', 'covo-dei-ladri', 'Covo dei Ladri')").run();
  db.prepare("INSERT INTO quartiere_ingresso (quartiere_chiave, mappa_chiave, x, y, zoom) VALUES ('shibuya', 'nativo-rmap-001-3-0', 38.29, 32.67, 1), ('yongen-jaya', 'nativo-rmap-009-2-0', 37.46, 25.14, 1)").run();
  // il cestino: due righe con id alti, poi svuotato in parte (il contatore resta più avanti del massimo)
  const c = db.prepare("INSERT INTO cestino (id, uid, tipo, chiave, nome, registro_json, eliminato_il) VALUES (?, ?, ?, ?, ?, '[]', 'x')");
  c.run(7, 'u7', 'voce', 'k7', 'Voce'); c.run(9, 'u9', 'mappa', 'k9', 'Mappa'); c.run(16, 'u16', 'area', 'k16', 'Area');
  db.prepare('DELETE FROM cestino WHERE id = 16').run();
  return db;
}

/** Ciò che non deve cambiare: pin, alias, percorsi, ingressi (senza la colonna nuova), cestino. */
const impronta = (db: AppDatabase) => JSON.stringify({
  spilli: db.prepare('SELECT * FROM spillo ORDER BY id').all(),
  alias: db.prepare('SELECT * FROM mappa_alias ORDER BY chiave').all(),
  percorsi: db.prepare('SELECT * FROM mappa_percorso ORDER BY mappa_chiave').all(),
  ingressi: db.prepare('SELECT quartiere_chiave, mappa_chiave, x, y, zoom FROM quartiere_ingresso ORDER BY quartiere_chiave').all(),
  cestino: db.prepare('SELECT id, uid, tipo, chiave, nome, contesto, riepilogo_json, registro_json, con_partite, vicini_json, eliminato_il FROM cestino ORDER BY id').all(),
  mappe: db.prepare("SELECT chiave, nome, tipo, ordine, origine, nome_rivisto, immagine_chiave, asset, ruolo_immagine, CASE WHEN chiave LIKE 'nativo-rmap-022-1-%' THEN '(covo)' ELSE genitore_chiave END AS genitore FROM mappa ORDER BY chiave").all(),
});

it('crea le Aree del mondo: gruppi in un’Area con le versioni, sciolte una per Area, Covo sotto Yongen-Jaya dopo le altre, staff Area di Tokyo da verificare; nient’altro cambia', () => {
  const db = primaDella109();
  const prima = impronta(db);
  runMigrations(db);
  expect(db.pragma('main.user_version', { simple: true })).toBeGreaterThanOrEqual(109);
  expect(impronta(db)).toBe(prima);

  // la città: lo staff, che nessuna fonte colloca, è un'Area di Tokyo da verificare (decisione dell'utente del 2026-10-20)
  expect(db.prepare('SELECT chiave, quartiere_chiave AS q, dungeon_chiave AS d, citta_chiave AS c, slug, nome, nome_rivisto AS rivisto, ordine, planimetria_predefinita AS predefinita, origine, da_verificare AS verifica FROM area WHERE citta_chiave IS NOT NULL').all())
    .toEqual([{ chiave: 'citta/tokyo/area-riservata-allo-staff', q: null, d: null, c: 'tokyo', slug: 'area-riservata-allo-staff', nome: 'Area riservata allo staff', rivisto: 0, ordine: 0, predefinita: 'nativo-rmap-150-3-0', origine: 'seed', verifica: 1 }]);
  expect(db.prepare('SELECT COUNT(*) FROM area WHERE da_verificare = 1 AND citta_chiave IS NULL').pluck().get()).toBe(0);
  const aree = db.prepare('SELECT chiave, quartiere_chiave AS q, slug, nome, nome_rivisto AS rivisto, ordine, planimetria_predefinita AS predefinita, origine, seed_json FROM area WHERE quartiere_chiave IS NOT NULL ORDER BY quartiere_chiave, ordine').all();
  expect(aree).toEqual([
    { chiave: 'citta/kichijoji/quartiere-dello-shopping', q: 'kichijoji', slug: 'quartiere-dello-shopping', nome: 'Quartiere dello shopping', rivisto: 0, ordine: 0, predefinita: 'nativo-rmap-005-1-0', origine: 'seed', seed_json: null },
    { chiave: 'citta/shibuya/piazza-della-stazione', q: 'shibuya', slug: 'piazza-della-stazione', nome: 'Piazza della stazione', rivisto: 0, ordine: 0, predefinita: 'nativo-rmap-001-1-0', origine: 'seed', seed_json: null },
    { chiave: 'citta/shibuya/sottopasso', q: 'shibuya', slug: 'sottopasso', nome: 'Sottopasso', rivisto: 1, ordine: 100, predefinita: 'nativo-rmap-001-2-0', origine: 'utente', seed_json: null },
    { chiave: 'citta/shibuya/central-street', q: 'shibuya', slug: 'central-street', nome: 'Central Street', rivisto: 0, ordine: 200, predefinita: 'nativo-rmap-001-3-0', origine: 'seed', seed_json: null },
    { chiave: 'citta/shujin-academy/edificio-principale-1p-edificio-laboratori-1p', q: 'shujin-academy', slug: 'edificio-principale-1p-edificio-laboratori-1p', nome: 'Edificio principale 1P / Edificio laboratori 1P', rivisto: 0, ordine: 0, predefinita: 'nativo-rmap-002-0-0', origine: 'seed', seed_json: null },
    { chiave: 'citta/shujin-academy/banchina-aoyama-itchome', q: 'shujin-academy', slug: 'banchina-aoyama-itchome', nome: 'Banchina Aoyama Itchome', rivisto: 1, ordine: 100, predefinita: 'shibuya-tornello-della-linea-ginza-aoyama-itchome', origine: 'utente', seed_json: null },
    { chiave: 'citta/shujin-academy/cancello-della-scuola', q: 'shujin-academy', slug: 'cancello-della-scuola', nome: 'Cancello della scuola', rivisto: 0, ordine: 200, predefinita: 'nativo-rmap-002-1-0', origine: 'seed', seed_json: null },
    { chiave: 'citta/yongen-jaya/banchina-della-metropolitana', q: 'yongen-jaya', slug: 'banchina-della-metropolitana', nome: 'Banchina della metropolitana', rivisto: 0, ordine: 0, predefinita: 'yongen-java-banchina-della-metropolitana', origine: 'utente', seed_json: null },
    { chiave: 'citta/yongen-jaya/vicoli', q: 'yongen-jaya', slug: 'vicoli', nome: 'Vicoli', rivisto: 0, ordine: 100, predefinita: 'nativo-rmap-009-2-0', origine: 'utente', seed_json: null },
    { chiave: 'citta/yongen-jaya/covo-dei-ladri', q: 'yongen-jaya', slug: 'covo-dei-ladri', nome: 'Covo dei Ladri', rivisto: 0, ordine: 200, predefinita: 'nativo-rmap-022-1-0', origine: 'seed', seed_json: null },
  ]);
  // le versioni: etichette solo nelle Aree con più planimetrie, nell'ordine del gruppo
  const versioni = db.prepare("SELECT chiave, area_chiave AS area, versione_ordine AS v, versione_etichetta AS e FROM mappa WHERE area_chiave IN ('citta/shibuya/sottopasso', 'citta/yongen-jaya/covo-dei-ladri', 'citta/kichijoji/quartiere-dello-shopping', 'citta/tokyo/area-riservata-allo-staff') ORDER BY area_chiave, versione_ordine").all();
  expect(versioni).toEqual([
    { chiave: 'nativo-rmap-005-1-0', area: 'citta/kichijoji/quartiere-dello-shopping', v: 0, e: null },
    { chiave: 'nativo-rmap-001-2-0', area: 'citta/shibuya/sottopasso', v: 0, e: 'inquadratura orientale' },
    { chiave: 'nativo-rmap-001-2-1', area: 'citta/shibuya/sottopasso', v: 1, e: 'planimetria completa' },
    { chiave: 'nativo-rmap-150-3-0', area: 'citta/tokyo/area-riservata-allo-staff', v: 0, e: 'porzione occidentale' },
    { chiave: 'nativo-rmap-150-3-1', area: 'citta/tokyo/area-riservata-allo-staff', v: 1, e: 'planimetria completa' },
    ...['settore d’ingresso', 'planimetria completa', 'porzione occidentale', 'porzione settentrionale', 'inquadratura orientale'].map((e, i) => ({ chiave: `nativo-rmap-022-1-${i}`, area: 'citta/yongen-jaya/covo-dei-ladri', v: i, e })),
  ]);
  expect(db.prepare("SELECT COUNT(*) FROM mappa WHERE versione_etichetta IS NOT NULL").pluck().get()).toBe(9);
  // lo staff resta figlio di Tokyo
  expect(db.prepare("SELECT genitore_chiave FROM mappa WHERE chiave LIKE 'nativo-rmap-150-3-%'").pluck().all()).toEqual(['tokyo', 'tokyo']);
  // il Covo: unico cambio di una colonna che c'era, genitore delle cinque planimetrie (ordini 0–4 invariati); il percorso pubblico che
  // aveva resta fissato (FUN2-2), le altre mappe non ne hanno uno
  expect(db.prepare("SELECT genitore_chiave || ':' || ordine FROM mappa WHERE chiave LIKE 'nativo-rmap-022-1-%' ORDER BY chiave").pluck().all()).toEqual([0, 1, 2, 3, 4].map((o) => `citta-yongen-jaya:${o}`));
  expect(db.prepare('SELECT chiave || \'→\' || percorso_fisso FROM mappa WHERE percorso_fisso IS NOT NULL').pluck().all()).toEqual(['nativo-rmap-022-1-1→covo-dei-ladri']);
  // senza Area: la figlia dell'ingresso dei Memento, il Palazzo e le sue planimetrie, quartieri e Tokyo
  expect(db.prepare('SELECT chiave FROM mappa WHERE area_chiave IS NULL AND tipo IN (\'luogo\', \'area\') ORDER BY chiave').pluck().all())
    .toEqual(['memento-figlia', 'nativo-rmap-152-1-0', 'nativo-rmap-152-1-1']);
  // il contenitore è sempre uno solo: un'Area con due contenitori, o con nessuno, si rifiuta
  const prova = db.prepare("INSERT INTO area (chiave, quartiere_chiave, citta_chiave, slug, nome, ordine, updated_at) VALUES (?, ?, ?, 'x', 'X', 0, 'x')");
  expect(() => prova.run('doppia', 'shibuya', 'tokyo')).toThrow(/CHECK/);
  expect(() => prova.run('nessuna', null, null)).toThrow(/CHECK/);
  expect(() => prova.run('altra-citta', null, 'osaka')).toThrow(/CHECK/);
  expect(db.prepare('SELECT COUNT(*) FROM area WHERE dungeon_chiave IS NOT NULL').pluck().get()).toBe(0);
  // gli ingressi con l'Area della loro planimetria
  expect(db.prepare('SELECT quartiere_chiave || \'→\' || area_chiave FROM quartiere_ingresso ORDER BY quartiere_chiave').pluck().all())
    .toEqual(['shibuya→citta/shibuya/central-street', 'yongen-jaya→citta/yongen-jaya/vicoli']);
  // il cestino: stesse righe e stessi id, il tipo nuovo ammesso, il contatore che non torna indietro
  expect(db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'cestino'").pluck().get()).toBe(16);
  db.prepare("INSERT INTO cestino (uid, tipo, chiave, nome, registro_json, eliminato_il) VALUES ('u-nuova', 'area-fisica', 'citta/shibuya/sottopasso', 'Sottopasso', '[]', 'x')").run();
  expect(db.prepare("SELECT id FROM cestino WHERE uid = 'u-nuova'").pluck().get()).toBe(17);
  expect(() => db.prepare("INSERT INTO cestino (uid, tipo, chiave, nome, registro_json, eliminato_il) VALUES ('u-no', 'altro', 'k', 'n', '[]', 'x')").run()).toThrow(/CHECK/);
  expect(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'idx_cestino_eliminato'").get()).toBeTruthy();
  expect(db.pragma('foreign_key_check')).toEqual([]);
});

it('si può rieseguire: la seconda volta nessuna riga toccata; una zona nuova riceve la sua Area in fondo al quartiere, con lo slug libero', () => {
  const db = primaDella109();
  runMigrations(db);
  const prima = JSON.stringify([db.prepare('SELECT * FROM area ORDER BY chiave').all(), db.prepare('SELECT chiave, area_chiave, versione_ordine, versione_etichetta, genitore_chiave FROM mappa ORDER BY chiave').all(), db.prepare('SELECT * FROM quartiere_ingresso').all()]);
  expect(assegnaAreeDelMondo109(db, 'y')).toEqual({ aree: 0, planimetrie: 0, etichette: 0, ingressi: 0 });
  expect(JSON.stringify([db.prepare('SELECT * FROM area ORDER BY chiave').all(), db.prepare('SELECT chiave, area_chiave, versione_ordine, versione_etichetta, genitore_chiave FROM mappa ORDER BY chiave').all(), db.prepare('SELECT * FROM quartiere_ingresso').all()])).toBe(prima);
  // una planimetria sciolta col nome di un'Area che c'è già, e una con uno slug riservato
  db.prepare("INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, origine, updated_at) VALUES ('nuova-1', 'Central Street', 'luogo', 'citta-shibuya', 900, 'utente', 'x'), ('nuova-2', 'Ordine', 'luogo', 'citta-shibuya', 901, 'utente', 'x')").run();
  expect(assegnaAreeDelMondo109(db, 'y')).toEqual({ aree: 2, planimetrie: 2, etichette: 0, ingressi: 0 });
  expect(db.prepare("SELECT slug || ':' || ordine FROM area WHERE quartiere_chiave = 'shibuya' ORDER BY ordine").pluck().all())
    .toEqual(['piazza-della-stazione:0', 'sottopasso:100', 'central-street:200', 'central-street-2:300', 'ordine-area:400']);
});
