// Sola lettura (solo GET, DB in sola lettura): ogni indirizzo /guida/mappe/<k> dei Palazzi e dei Memento (chiavi interne, pubbliche di
// mappa_percorso, alias di mappa_alias, alias della guida di guida_alias) risolto con GET /api/mappe/risolvi/<k>; controlla che porti alla
// stessa mappa di prima (quella del DB) e che la casa sia quella dell'albero per quella mappa (già verificata: stessa mappa).
// Uso (dalla cartella di sviluppo): node <questo> <porta> <cartella dati> <api.json dell'istanza> <uscita.json>
const D = require(process.cwd() + '/node_modules/better-sqlite3');
const fs = require('fs'); const path = require('path');
const [porta, dir, apiF, uscita] = process.argv.slice(2);
const db = new D(path.join(dir, 'gioco.db'), { readonly: true, fileMustExist: true });
const mappe = db.prepare('select chiave, genitore_chiave, tipo, entita_tipo, entita_chiave from mappa').all();
const per = new Map(mappe.map((m) => [m.chiave, m]));
const radice = (k) => { let m = per.get(k), n = 0; while (m?.genitore_chiave && n++ < 20) m = per.get(m.genitore_chiave); return m; };
const delPalazzo = (k) => radice(k)?.entita_tipo === 'dungeon';
const pubblica = new Map(db.prepare('select chiave, mappa_chiave from mappa_percorso').all().map((p) => [p.mappa_chiave, p.chiave]));
const albero = new Map(JSON.parse(fs.readFileSync(apiF, 'utf8'))['/mappe/albero'].corpo.data.map((m) => [m.chiave, m]));
const ind = new Map();
for (const m of mappe) if (delPalazzo(m.chiave)) ind.set(m.chiave, { fonte: 'interna', mappa: m.chiave });
for (const p of db.prepare('select chiave, mappa_chiave from mappa_percorso').all()) if (delPalazzo(p.mappa_chiave)) ind.set(p.chiave, { fonte: 'pubblica', mappa: p.mappa_chiave });
for (const a of db.prepare('select chiave, mappa_chiave from mappa_alias').all()) if (delPalazzo(a.mappa_chiave) && !ind.has(a.chiave)) ind.set(a.chiave, { fonte: 'alias', mappa: a.mappa_chiave });
const ga = db.prepare('select g.chiave, g.area_chiave, a.dungeon_chiave, d.tipo from guida_alias g join dungeon_area a on a.chiave = g.area_chiave join dungeon d on d.chiave = a.dungeon_chiave').all();
for (const g of ga) ind.set(g.chiave, { fonte: 'alias-guida', area: g.area_chiave, dungeon: g.dungeon_chiave, tipoDungeon: g.tipo });
(async () => {
  const righe = [], esiti = {};
  const nota = (k, x) => (esiti[k] = esiti[k] || []).push(x);
  for (const [k, v] of [...ind].sort()) {
    const r = await fetch(`http://localhost:${porta}/api/mappe/risolvi/${encodeURIComponent(k)}`);
    const j = (await r.json().catch(() => null))?.data ?? null;
    righe.push({ indirizzo: k, ...v, status: r.status, risolve: j });
    if (r.status !== 200) { nota('non risolto', `${k} (${v.fonte}) ${r.status}`); continue; }
    if (v.fonte === 'alias-guida') {
      const attesa = v.tipoDungeon === 'palazzo' ? `/guida/dungeon/${v.dungeon}?infiltrazione=${v.area}` : null;
      if (j.tipo !== 'guida') nota('alias della guida non risolto come guida', `${k}: ${JSON.stringify(j)}`);
      else if (attesa ? j.casa === attesa : j.casa.startsWith('/guida/mappe/')) nota(`alias della guida → ${attesa ? 'scheda del Palazzo sull\'infiltrazione' : 'visore (Memento)'}`, k);
      else nota('alias della guida → casa INATTESA', `${k}: ${j.casa} (attesa ${attesa})`);
      continue;
    }
    const pub = pubblica.get(v.mappa) ?? v.mappa;
    if (j.mappa !== pub) nota('porta a un\'ALTRA mappa', `${k}: ${j.mappa} invece di ${pub}`);
    const a = albero.get(j.mappa);
    if (!a) nota('mappa assente dall\'albero', k);
    else if (a.casa === j.casa) nota(`${v.fonte}: casa = quella dell'albero (${radice(v.mappa).entita_chiave === 'mementos' ? 'Memento' : 'Palazzo'})`, k);
    else nota('casa DIVERSA da quella dell\'albero', `${k}: ${j.casa} vs ${a.casa}`);
  }
  fs.writeFileSync(uscita, JSON.stringify({ righe }, null, 1));
  console.log(`indirizzi: ${righe.length}`);
  for (const [k, v] of Object.entries(esiti)) { console.log(`${k}: ${v.length}`); if (/INATTESA|ALTRA|DIVERSA|non risolto|assente/.test(k)) v.slice(0, 20).forEach((x) => console.log('   ', x)); }
})();
