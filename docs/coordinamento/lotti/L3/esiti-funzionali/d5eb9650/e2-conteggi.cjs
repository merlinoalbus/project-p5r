// E2 di L3 sul collaudo 3301 (d5eb9650): conteggi dei pin dell'API contro un conteggio SQL indipendente su una COPIA del DB.
// La copia si prende con l'API di backup di better-sqlite3 (sorgente aperta in sola lettura). Uso: node e2-conteggi.cjs <uscita-dir>
const fs = require('fs');
const path = require('path');
const DB = require('C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941/node_modules/better-sqlite3');
const SRC = 'C:/Repository/project-p5r/.claude/worktrees/p5s-sviluppo-l2/data/gioco.db';
const OUT = process.argv[2]; const B = 'http://localhost:3301';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const copia = path.join(__dirname, 'gioco-collaudo-copia.db');
  const src = new DB(SRC, { readonly: true, fileMustExist: true }); await src.backup(copia); src.close();
  const db = new DB(copia, { readonly: true });
  // regola scritta qui, dal testo di modifiche.md §E2 e dai tipi della categoria «spostamento» di shared/spilli.ts (più «porta»)
  const PASSAGGI = ['passaggio', 'scala', 'uscita', 'treno', 'velluto', 'mementos', 'ingresso-palazzo', 'infiltrazione', 'scorciatoia', 'rampino', 'porta'];
  const gruppo = `CASE WHEN s.tipo IN (${PASSAGGI.map((t) => `'${t}'`).join(',')}) THEN 'passaggi' WHEN s.tipo = 'nota' THEN 'note' ELSE 'contenuto' END`;
  // mappe dei Memento (sottoalberi di dungeon-mementos e citta-mementos) escluse, come dice l'albero
  const sql = `
    WITH RECURSIVE memento(c) AS (SELECT 'dungeon-mementos' UNION SELECT 'citta-mementos' UNION SELECT m.chiave FROM mappa m JOIN memento ON m.genitore_chiave = memento.c),
    albero AS (SELECT chiave, genitore_chiave FROM mappa WHERE chiave NOT IN (SELECT c FROM memento)),
    antenati(mappa, antenato) AS (SELECT chiave, chiave FROM albero UNION SELECT a.mappa, al.genitore_chiave FROM antenati a JOIN albero al ON al.chiave = a.antenato WHERE al.genitore_chiave IN (SELECT chiave FROM albero))
    SELECT coalesce((SELECT p.chiave FROM mappa_percorso p WHERE p.mappa_chiave = a.antenato), a.antenato) AS nodo, ${gruppo} AS g, count(*) AS n
    FROM spillo s JOIN antenati a ON a.mappa = s.mappa_chiave GROUP BY 1, 2`;
  const perNodo = new Map(); for (const r of db.prepare(sql).all()) { const c = perNodo.get(r.nodo) ?? { contenuto: 0, passaggi: 0, note: 0 }; c[r.g] += r.n; perNodo.set(r.nodo, c); }
  const radiceSql = db.prepare(`WITH RECURSIVE memento(c) AS (SELECT 'dungeon-mementos' UNION SELECT 'citta-mementos' UNION SELECT m.chiave FROM mappa m JOIN memento ON m.genitore_chiave = memento.c)
    SELECT ${gruppo} AS g, count(*) n FROM spillo s WHERE s.mappa_chiave IS NOT NULL AND s.mappa_chiave NOT IN (SELECT c FROM memento) GROUP BY 1`).all();
  const radice = { contenuto: 0, passaggi: 0, note: 0 }; for (const r of radiceSql) radice[r.g] = r.n;
  const tipi = db.prepare('SELECT tipo, count(*) n FROM spillo WHERE mappa_chiave IS NOT NULL GROUP BY 1 ORDER BY 2 DESC').all();
  db.close(); fs.unlinkSync(copia);
  const albero = (await (await fetch(B + '/api/mappe/albero')).json()).data;
  const conteggi = (await (await fetch(B + '/api/mappe/albero/conteggi')).json()).data;
  const diff = []; let uguali = 0;
  for (const m of albero) { const a = m.conteggiPin; const s = perNodo.get(m.chiave) ?? { contenuto: 0, passaggi: 0, note: 0 }; if (a.contenuto === s.contenuto && a.passaggi === s.passaggi && a.note === s.note) uguali++; else diff.push({ chiave: m.chiave, api: a, sql: s }); }
  const out = [
    `quando ${new Date().toISOString()} · ${B} · copia con backup API di ${SRC}`,
    `radice API ${JSON.stringify(conteggi.conteggiPin)} · radice SQL ${JSON.stringify(radice)} · uguali ${JSON.stringify(conteggi.conteggiPin) === JSON.stringify(radice)}`,
    `nodi dell'albero ${albero.length} · uguali ${uguali} · diversi ${diff.length}`,
    ...diff.slice(0, 20).map((d) => `  DIVERSO ${d.chiave} api ${JSON.stringify(d.api)} sql ${JSON.stringify(d.sql)}`),
    `radici (genitore nullo) API: ${albero.filter((m) => !m.genitore).map((m) => `${m.chiave}=${m.conteggiPin.contenuto}/${m.conteggiPin.passaggi}/${m.conteggiPin.note}`).join(' · ')}`,
    `tipi dei pin (tutto il DB): ${tipi.map((t) => `${t.tipo} ${t.n}`).join(', ')}`,
  ];
  fs.writeFileSync(path.join(OUT, 'e2-conteggi.txt'), out.join('\n') + '\n'); console.log(out.join('\n'));
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
