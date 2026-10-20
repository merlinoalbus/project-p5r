// L10, misure «prima» in sola lettura su una COPIA della base p5s-2026-10-20-0533Z (scratchpad/base-0533Z).
const path = require('path');
const DB = require('C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941/node_modules/better-sqlite3');
const C = path.join(__dirname, 'base-0533Z');
const g = new DB(path.join(C, 'gioco.db'), { readonly: true }); const u = new DB(path.join(C, 'partite.db'), { readonly: true });
const q = (db, s, ...p) => db.prepare(s).all(...p); const n = (db, s, ...p) => db.prepare(s).get(...p).n;
const log = (...a) => console.log(...a);
log('user_version gioco', g.pragma('user_version', { simple: true }), '· partite', u.pragma('user_version', { simple: true }));
log('voci del diario', n(g, 'SELECT count(*) n FROM voce_giornata'), '· validato 04-01..06-01', n(g, "SELECT count(*) n FROM voce_giornata WHERE data BETWEEN '04-01' AND '06-01'"));
// effetti di oggi (produce_json)
const eff = {}; let vociEff = 0; for (const r of q(g, "SELECT produce_json p FROM voce_giornata WHERE produce_json IS NOT NULL AND produce_json NOT IN ('', '[]', '{}')")) { vociEff++; let a; try { a = JSON.parse(r.p); } catch { continue; } for (const e of Array.isArray(a) ? a : [a]) { const t = e?.tipo ?? e?.type ?? Object.keys(e ?? {})[0]; eff[t] = (eff[t] ?? 0) + 1; } }
log('produce_json: voci con effetti', vociEff, '· per tipo', JSON.stringify(eff));
log('riferimento_tipo delle voci', JSON.stringify(q(g, 'SELECT coalesce(riferimento_tipo, \'(nessuno)\') t, count(*) n FROM voce_giornata GROUP BY 1 ORDER BY 2 DESC')));
log('voci «domanda in classe»', n(g, "SELECT count(*) n FROM voce_giornata WHERE azione LIKE '%omanda in classe%'"), '· voci «Cruciverba»', n(g, "SELECT count(*) n FROM voce_giornata WHERE azione LIKE 'Cruciverba%' OR azione LIKE '%cruciverba%'"));
log('domande', n(g, 'SELECT count(*) n FROM domanda'), '· cruciverba', n(g, "SELECT count(*) n FROM sqlite_master WHERE name='cruciverba'") ? n(g, 'SELECT count(*) n FROM cruciverba') : '(tabella assente)');
log('«Inizia a pulire» 04-09', JSON.stringify(q(g, "SELECT uid, data, fascia, ordine, substr(azione,1,40) a, riferimento_tipo, riferimento_chiave FROM voce_giornata WHERE azione LIKE '%Inizia a pulire%'")));
log('voci Stanza di Velluto', n(g, "SELECT count(*) n FROM voce_giornata WHERE azione LIKE '%Velluto%'"), '· voci con rango_atteso', n(g, 'SELECT count(*) n FROM voce_giornata WHERE rango_atteso IS NOT NULL'));
// giorni delle 8 voci di invito: voci esistenti per fascia (ordine massimo)
for (const [d, f] of [['07-02', 'sera'], ['07-03', 'giorno'], ['07-28', 'sera'], ['07-29', 'giorno'], ['07-30', 'giorno'], ['08-06', 'giorno'], ['10-08', 'sera'], ['10-09', 'giorno']]) log(`  ${d} ${f}: voci ${n(g, 'SELECT count(*) n FROM voce_giornata WHERE data=? AND fascia=?', d, f)}, ordine max ${q(g, 'SELECT max(ordine) m FROM voce_giornata WHERE data=? AND fascia=?', d, f)[0].m}`);
// partite
for (const t of ['spunta_voce_partita', 'evento_partita', 'evento_storia_partita', 'lettura_partita', 'effetto_lettura_partita', 'progresso_libro_partita', 'progresso_film_partita', 'progresso_videogioco_partita', 'turno_partita', 'attivita_svolta_partita', 'acquisto_partita', 'regalo_partita', 'incontro_confidente_partita', 'confidente_partita', 'dote_sociale_partita', 'richiesta_partita', 'domanda_partita', 'cruciverba_partita', 'compendio_partita', 'persona_posseduta', 'punti_negozio_partita', 'cestino_partite', 'requisito_partita']) {
  const cols = q(u, `PRAGMA table_info(${t})`).map((c) => c.name); const per = cols.includes('partita_id') ? q(u, `SELECT partita_id p, count(*) n FROM ${t} GROUP BY 1`).map((r) => `p${r.p}=${r.n}`).join(' ') : '';
  log(`  ${t}: ${n(u, `SELECT count(*) n FROM ${t}`)} ${per}`);
}
log('mansarda pulita negli eventi di storia', JSON.stringify(q(u, "SELECT * FROM evento_storia_partita WHERE evento_chiave LIKE '%mansarda%'")));
log('Sojiro p1', JSON.stringify(q(u, "SELECT * FROM confidente_partita WHERE partita_id = 1 AND confidente_chiave = 'sojiro'")));
log('partite', JSON.stringify(q(u, 'SELECT id, nome, attiva, data_gioco, fascia_gioco, yen FROM partita')));
