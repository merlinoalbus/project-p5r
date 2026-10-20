// L3 sul 3201: sole letture (DB in sola lettura e GET) contro gli attesi di modifiche.md §2.2, §3 e requisiti R3-37b/c (aggiornato).
const fs = require('fs');
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));
const B = 'http://localhost:3201';
const BASE = 'C:/Users/rober/.claude/p5s-coordinamento/lotti/L3/esiti-funzionali/base-prima';
const db = new Database(path.join(radice, 'data/gioco.db'), { readonly: true, fileMustExist: true });
const q = (s, ...p) => db.prepare(s).all(...p);
const get = async (p) => { const r = await fetch(B + p); return { s: r.status, j: await r.json().catch(() => null) }; };
const breve = (x, n = 300) => JSON.stringify(x)?.slice(0, n);
const log = (...a) => console.log(...a);
(async () => {
  log('user_version', db.pragma('user_version', { simple: true }));
  log('\n== F3-02 conteggi');
  const perP = q('SELECT dungeon_chiave d, count(*) n FROM area WHERE dungeon_chiave IS NOT NULL GROUP BY 1 ORDER BY 1'); log('aree per Palazzo', JSON.stringify(perP), 'totale', perP.reduce((s, x) => s + x.n, 0));
  const ord = ['kamoshida', 'madarame', 'kaneshiro', 'futaba', 'okumura', 'niijima', 'shido', 'maruki']; log('attesi 10/8/13/18/11/13/16/12 + iweleth 16 →', ord.map((k) => perP.find((x) => x.d === k)?.n).join('/'), '+', perP.find((x) => x.d === 'iweleth')?.n);
  const pal = q(`WITH RECURSIVE t(c, r) AS (SELECT chiave, chiave FROM mappa WHERE chiave LIKE 'dungeon-%' AND chiave <> 'dungeon-mementos' UNION ALL SELECT m.chiave, t.r FROM mappa m JOIN t ON m.genitore_chiave = t.c) SELECT c, r FROM t WHERE c <> r`);
  const conArea = q(`SELECT chiave FROM mappa WHERE area_chiave LIKE 'dungeon/%'`).map((x) => x.chiave); const setA = new Set(conArea);
  log('planimetrie dei Palazzi (discendenti delle radici)', pal.length, '· con area', pal.filter((x) => setA.has(x.c)).length, '· senza area', JSON.stringify(pal.filter((x) => !setA.has(x.c)).map((x) => x.c).slice(0, 10)));
  log('con etichetta (Palazzi)', q(`SELECT count(*) n FROM mappa WHERE area_chiave LIKE 'dungeon/%' AND versione_etichetta IS NOT NULL`)[0].n, '(attese 187, 203 con Iweleth)');
  log('\n== F3-05 legami');
  log('infiltrazione_area', q('SELECT count(*) n FROM infiltrazione_area')[0].n, '(attese 93, 105 con Iweleth)', '· per origine', JSON.stringify(q('SELECT origine, count(*) n FROM infiltrazione_area GROUP BY 1')));
  log('pin 777 → coppia', JSON.stringify(q(`SELECT ia.* FROM infiltrazione_area ia JOIN area a ON a.chiave = ia.area_chiave WHERE a.dungeon_chiave='madarame' AND ia.infiltrazione_chiave LIKE '%furto%'`)));
  const senzaAree = q(`SELECT da.chiave FROM dungeon_area da WHERE da.dungeon_chiave <> 'mementos' AND NOT EXISTS (SELECT 1 FROM infiltrazione_area ia WHERE ia.infiltrazione_chiave = da.chiave)`);
  log('infiltrazioni senza aree', senzaAree.length, '(attese 15)');
  log('aree senza infiltrazione', q(`SELECT count(*) n FROM area a WHERE a.dungeon_chiave IS NOT NULL AND NOT EXISTS (SELECT 1 FROM infiltrazione_area ia WHERE ia.area_chiave = a.chiave)`)[0].n, '(attese 31, 35 con Iweleth)');
  log('aree su Memento', q(`SELECT count(*) n FROM area WHERE dungeon_chiave = 'mementos'`)[0].n, '· aree del mondo', q('SELECT count(*) n FROM area WHERE dungeon_chiave IS NULL')[0].n);
  log('\n== F3-01 / F3-12 dettaglio Madarame (p1)');
  const m = (await get('/api/compendio/dungeon/madarame?partita=1')).j.data;
  log('areePalazzo', m.areePalazzo?.length, JSON.stringify(m.areePalazzo?.map((a) => [a.slug, a.ordine, a.numeroPlanimetrie, (a.infiltrazioni ?? []).length])));
  const prima = JSON.parse(fs.readFileSync(`${BASE}/dungeon-madarame-p1.json`, 'utf8')).data;
  const vociDi = (d) => (d.aree ?? []).map((i) => [i.chiave, (i.punti ?? i.voci ?? []).length].join(':')).join(',');
  log('infiltrazioni con lo stesso numero di voci di prima:', vociDi(prima) === vociDi(m), '· prima', prima.aree?.length, 'dopo', m.aree?.length);
  for (const campo of ['percentuale', 'completato', 'raccolta']) log(`  ${campo}: prima ${breve(prima[campo], 80)} · dopo ${breve(m[campo], 80)}`);
  log('\n== F3-11 Memento senza campi nuovi');
  const me = (await get('/api/compendio/dungeon/mementos?partita=1')).j.data; log('areePalazzo nei Memento:', JSON.stringify(me).includes('areePalazzo'));
  log('\n== F3-15 casa (interruttore spento)');
  for (const k of ['dungeon-kamoshida', 'nativo-rmap-152-1-0', 'palazzo-di-madarame-museo-1p']) log(k, '→', (await get('/api/mappe/risolvi/' + k)).j?.data?.casa);
  log('\n== F3-29 / F3-30 / F3-31 diario');
  log('voce_infiltrazione righe', q('SELECT count(*) n FROM voce_infiltrazione')[0].n, '(attese 0: nessuna scrittura automatica)');
  try { log('proposte (tabella)', q('SELECT count(DISTINCT voce_uid) v, count(*) n FROM proposta_infiltrazione_voce')[0]); } catch (e) { log('proposte:', e.message); }
  log('voci da rivedere', JSON.stringify(q(`SELECT data, fascia, aggiunta_da, substr(azione,1,50) a, testo_precedente_json IS NOT NULL tp FROM voce_giornata WHERE da_rivedere = 1 ORDER BY data`)));
  log('voci del team', JSON.stringify(q(`SELECT data, fascia, substr(azione,1,60) a FROM voce_giornata WHERE aggiunta_da = 'team'`)));
  log('voci corrette con data <= 06-01 (devono essere 0)', q(`SELECT count(*) n FROM voce_giornata WHERE (da_rivedere = 1 OR testo_precedente_json IS NOT NULL OR aggiunta_da IS NOT NULL) AND data BETWEEN '04-01' AND '06-01'`)[0].n);
  const giorni = ['04-11', '04-12', '04-15', '04-20', '04-22', '05-16', '05-19', '05-20', '05-27', '06-01', '06-26', '10-03', '11-13', '01-02'];
  for (const g of giorni) {
    const d = (await get(`/api/compendio/percorso/${g}?partita=1`)).j?.data; if (!d) { log(g, 'nessun dato'); continue; }
    for (const v of d.azioni.filter((v) => v.infiltrazioniDelPalazzo || v.propostaInfiltrazioni || v.riferimento?.tipo === 'dungeon' || v.daRivedere)) {
      log(`${g} ${v.fascia} [${v.riferimento?.tipo}:${v.riferimento?.chiave}] «${v.azione.slice(0, 45)}» · campo=${!!v.infiltrazioniDelPalazzo} opzioni=${v.infiltrazioniDelPalazzo?.length ?? '-'} insieme=${breve(v.infiltrazioni?.map((i) => i.nome))} proposta=${breve(v.propostaInfiltrazioni && { inf: v.propostaInfiltrazioni.infiltrazioni.map((i) => i.nome), certezza: v.propostaInfiltrazioni.certezza }, 200)} daRivedere=${v.daRivedere ?? '-'}`);
    }
  }
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
