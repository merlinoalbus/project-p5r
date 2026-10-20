// Verifica in sola lettura della migrazione 109 su data/gioco.db contro modifiche.md §2.2 e dati.md §1–§3.
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));
const db = new Database(path.join(radice, 'data/gioco.db'), { readonly: true, fileMustExist: true });
const q = (s, ...p) => db.prepare(s).all(...p);
console.log('user_version', db.pragma('user_version', { simple: true }));
console.log('colonne area', q('pragma table_info(area)').map((c) => c.name).join(','));
console.log('colonne nuove mappa', q('pragma table_info(mappa)').map((c) => c.name).filter((n) => /area|versione/.test(n)).join(','));
console.log('colonne quartiere_ingresso', q('pragma table_info(quartiere_ingresso)').map((c) => c.name).join(','));
const aree = q('SELECT chiave, quartiere_chiave q, dungeon_chiave d, citta_chiave c, slug, nome, nome_rivisto nr, ordine, planimetria_predefinita pred, origine, da_verificare dv FROM area ORDER BY IFNULL(quartiere_chiave, citta_chiave), ordine');
console.log('\naree', aree.length);
const perC = {}; for (const a of aree) perC[a.q ?? 'città:' + a.c] = (perC[a.q ?? 'città:' + a.c] ?? 0) + 1; console.log(JSON.stringify(perC));
for (const a of aree) {
  const pl = q('SELECT chiave, versione_ordine vo, versione_etichetta et, genitore_chiave g FROM mappa WHERE area_chiave = ? ORDER BY versione_ordine', a.chiave);
  const predOk = pl.some((p) => p.chiave === a.pred);
  console.log(`${a.chiave} | ${a.nome} | ord ${a.ordine} | pred ${a.pred} ${predOk ? 'OK' : 'NON SUA'} | ${a.origine} nr=${a.nr} dv=${a.dv} | ${pl.map((p) => `${p.chiave}#${p.vo}${p.et ? '«' + p.et + '»' : ''}`).join(', ')}`);
}
console.log('\nplanimetrie con area', q('SELECT count(*) n FROM mappa WHERE area_chiave IS NOT NULL')[0].n, '· con etichetta', q('SELECT count(*) n FROM mappa WHERE versione_etichetta IS NOT NULL')[0].n);
console.log('aree con più versioni', q('SELECT count(*) n FROM (SELECT area_chiave FROM mappa WHERE area_chiave IS NOT NULL GROUP BY 1 HAVING count(*) > 1)')[0].n);
const senza = q(`SELECT m.chiave FROM mappa m JOIN mappa g ON g.chiave = m.genitore_chiave WHERE m.tipo IN ('luogo','area') AND g.tipo='quartiere' AND g.entita_tipo='quartiere' AND IFNULL(g.entita_chiave,'')<>'mementos' AND m.area_chiave IS NULL`);
console.log('zone del mondo senza area', senza.length, JSON.stringify(senza));
console.log('aree su mappe di Palazzi/Memento', q(`SELECT count(*) n FROM area WHERE dungeon_chiave IS NOT NULL`)[0].n);
console.log('genitore del Covo', JSON.stringify(q("SELECT chiave, genitore_chiave, ordine FROM mappa WHERE chiave LIKE 'nativo-rmap-022-1-%' ORDER BY chiave")));
console.log('staff', JSON.stringify(q("SELECT chiave, genitore_chiave, area_chiave FROM mappa WHERE chiave LIKE 'nativo-rmap-150-3-%'")));
console.log('ingressi', JSON.stringify(q('SELECT * FROM quartiere_ingresso')));
console.log('alias', q('SELECT count(*) n FROM mappa_alias')[0].n, '· percorsi', q('SELECT count(*) n FROM mappa_percorso')[0].n, '· mappe', q('SELECT count(*) n FROM mappa')[0].n);
console.log('cestino', JSON.stringify(q("SELECT sql FROM sqlite_master WHERE name='cestino'")[0].sql.match(/CHECK \(tipo IN \([^)]*\)\)/)?.[0]), 'righe', q('SELECT count(*) n FROM cestino')[0].n, 'seq', JSON.stringify(q("SELECT * FROM sqlite_sequence WHERE name='cestino'")));
console.log('indici area', q("SELECT name FROM sqlite_master WHERE type='index' AND (tbl_name='area' OR name IN ('mappa_area','idx_cestino_eliminato'))").map((r) => r.name).join(','));
