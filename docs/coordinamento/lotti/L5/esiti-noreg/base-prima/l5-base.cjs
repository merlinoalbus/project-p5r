// Sola lettura (DB aperto in sola lettura, solo GET): base «prima» di L5 (Luoghi, negozi, orari) e confronto «dopo».
// DB: righe complete di luogo, negozio, articolo, pin del mondo (spillo sotto tokyo, con condizioni), acquisti e punti negozio delle partite,
// cestino, legami mappa_entita dei luoghi; conteggi del M §1.3 di L5. API: /compendio/luoghi, /compendio/negozi(+dettaglio) per p1,
// /catalogo/luogo e /catalogo/negozio, ogni mappa del mondo con la partita 1 (pin: nome, tipo, x, y, riferimento, disponibilità).
// Uso: node l5-base.cjs <porta> <cartella dati> <uscita.json> [prima.json per il confronto]
const D = require(process.cwd() + '/node_modules/better-sqlite3');
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const [porta, dir, uscita, primaF] = process.argv.slice(2);
const db = new D(path.join(dir, 'gioco.db'), { readonly: true, fileMustExist: true });
db.exec(`ATTACH '${path.join(dir, 'partite.db').replace(/'/g, "''")}' AS utente`);
const sha = (v) => crypto.createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
const norm = (v) => JSON.parse(JSON.stringify(v ?? null).replace(/([?&])v=[^&"\\]*/g, '$1v=*'));
const tab = (sql, chiave) => Object.fromEntries(db.prepare(sql).all().map((r) => [r[chiave] ?? JSON.stringify(r), r]));
const esiste = (t) => !!db.prepare("select 1 from sqlite_master where name=?").get(t);
(async () => {
  const api = async (u) => { const r = await fetch(`http://localhost:${porta}/api${u}`); let j = null; try { j = await r.json(); } catch {} return { status: r.status, data: norm(j?.data ?? j) }; };
  const mondo = db.prepare(`with recursive t(c) as (select 'tokyo' union all select m.chiave from mappa m join t on m.genitore_chiave=t.c) select c from t`).all().map((r) => r.c);
  const out = {
    versioni: { gioco: db.pragma('user_version', { simple: true }) },
    db: {
      luogo: tab('select * from luogo', 'chiave'),
      negozio: tab('select * from negozio', 'chiave'),
      articolo: tab('select * from articolo', 'chiave'),
      pinMondo: {},
      acquisti: {},
      puntiNegozio: tab('select rowid as _r, * from utente.punti_negozio_partita', '_r'),
      cestino: tab('select * from cestino', 'uid'),
      legamiLuoghi: tab("select rowid as _r, * from mappa_entita where entita_tipo in ('luogo','negozio')", '_r'),
    },
    api: {},
  };
  // pinMondo con i parametri (la tab() sopra non passa i parametri)
  out.db.pinMondo = Object.fromEntries(db.prepare(`select s.* from spillo s where s.mappa_chiave in (${mondo.map(() => '?').join(',')})`).all(...mondo).map((r) => [r.uid, r]));
  out.db.acquisti = Object.fromEntries(db.prepare('select rowid as _r, * from utente.acquisto_partita').all().map((r) => [`${r.partita_id}|${r._r}`, r]));
  out.conteggi = {
    luoghi: Object.keys(out.db.luogo).length, negozi: Object.keys(out.db.negozio).length, articoli: Object.keys(out.db.articolo).length,
    negoziConSede: Object.values(out.db.negozio).filter((n) => n.sede_chiave).length,
    pinMondo: Object.keys(out.db.pinMondo).length,
    pinDiLuogo: Object.values(out.db.pinMondo).filter((s) => s.riferimento_tipo === 'luogo').length,
    acquistiP1: Object.values(out.db.acquisti).filter((a) => a.partita_id === 1).length,
    puntiNegozio: Object.keys(out.db.puntiNegozio).length, cestino: Object.keys(out.db.cestino).length,
    colonneLuogo: Object.keys(Object.values(out.db.luogo)[0] ?? {}), colonneNegozio: Object.keys(Object.values(out.db.negozio)[0] ?? {}),
  };
  out.api.luoghi = await api('/compendio/luoghi');
  out.api.negozi = await api('/compendio/negozi?partita=1');
  out.api.negoziDettaglio = {};
  for (const k of Object.keys(out.db.negozio)) out.api.negoziDettaglio[k] = await api(`/compendio/negozi/${encodeURIComponent(k)}?partita=1`);
  out.api.catalogoLuogo = await api('/catalogo/luogo');
  out.api.catalogoNegozio = await api('/catalogo/negozio');
  out.api.mappeMondo = {};
  for (const k of mondo) {
    const r = await api(`/mappe/${encodeURIComponent(k)}?partita=1`);
    out.api.mappeMondo[k] = { status: r.status, spilli: (r.data?.spilli ?? []).map((s) => ({ id: s.id, uid: s.uid, nome: s.nome, tipo: s.tipo, x: s.x, y: s.y, riferimento: s.riferimento ?? null, disponibile: s.disponibile ?? null, raccolto: s.raccolto ?? null })) };
  }
  fs.writeFileSync(uscita, JSON.stringify(out));
  const statusKo = [out.api.luoghi, out.api.negozi, out.api.catalogoLuogo, out.api.catalogoNegozio, ...Object.values(out.api.negoziDettaglio), ...Object.values(out.api.mappeMondo)].filter((r) => r.status !== 200).length;
  console.log(JSON.stringify(out.conteggi));
  console.log(`API: ${4 + Object.keys(out.api.negoziDettaglio).length + mondo.length} risposte, non 200: ${statusKo}; mappe del mondo ${mondo.length}`);
  console.log('impronte:', JSON.stringify(Object.fromEntries([...Object.entries(out.db).map(([k, v]) => ['db.' + k, sha(v)]), ...Object.entries(out.api).map(([k, v]) => ['api.' + k, sha(v)])])));
  if (primaF) {
    const P = JSON.parse(fs.readFileSync(primaF, 'utf8'));
    const diff = (x, y, p, o) => { if (JSON.stringify(x) === JSON.stringify(y)) return; if (x && y && typeof x === 'object' && typeof y === 'object') { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) diff(x[k], y[k], p + '.' + k, o); return; } o.push(`${p}: ${JSON.stringify(x)?.slice(0, 120)} → ${JSON.stringify(y)?.slice(0, 120)}`); };
    for (const parte of ['db', 'api']) for (const k of Object.keys({ ...P[parte], ...out[parte] })) {
      const o = []; diff(P[parte][k], out[parte][k], k, o);
      console.log(`${o.length ? '≠' : '='} ${parte}.${k}${o.length ? ': ' + o.length + ' differenze' : ''}`); o.slice(0, 8).forEach((x) => console.log('     ' + x));
    }
  }
})();
