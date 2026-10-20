// L4 sul 3201: sole letture (GET) contro modifiche.md §2.4 e be.md §2, più il confronto con le basi «prima» (schema 109) di voci e pin.
const fs = require('fs');
const B = 'http://localhost:3201';
const BASE3 = 'C:/Users/rober/.claude/p5s-coordinamento/lotti/L3/esiti-funzionali/base-prima';
const BASE4 = 'C:/Users/rober/.claude/p5s-coordinamento/lotti/L4/esiti-funzionali/base-prima';
const get = async (p) => (await (await fetch(B + p)).json());
const log = (...a) => console.log(...a);
(async () => {
  log('== F4-01 carattere per Palazzo (p1)');
  for (const k of ['kamoshida', 'madarame', 'mementos']) {
    const d = (await get(`/api/compendio/dungeon/${k}?partita=1`)).data;
    const conta = {}; for (const a of d.aree) for (const p of a.punti ?? []) { const c = p.carattere === undefined ? '(assente)' : String(p.carattere); conta[c] = (conta[c] ?? 0) + 1; }
    log(k, JSON.stringify(conta), '· completamento', JSON.stringify(d.completamento), '· completato', d.completato, '· daVerificare', JSON.stringify(d.daVerificare)?.slice(0, 120), '· schedeDaSistemare', d.schedeDaSistemare?.length);
  }
  log('\n== F4-19 completamenti');
  for (const [k, p] of [['kamoshida', 1], ['kamoshida', 2], ['madarame', 1], ['madarame', 2]]) { const d = (await get(`/api/compendio/dungeon/${k}?partita=${p}`)).data; log(`${k} p${p}`, JSON.stringify(d.completamento), 'completato', d.completato); }
  log('\n== F4-18 schede da sistemare');
  for (const k of ['kamoshida', 'madarame']) { const d = (await get(`/api/compendio/dungeon/${k}?partita=1`)).data; log(k, JSON.stringify((d.schedeDaSistemare ?? []).map((s) => [s.id, s.nome, s.tipo]))); }
  log('\n== F4-16 copie');
  for (const k of ['kamoshida', 'madarame']) log(k, JSON.stringify((await get(`/api/compendio/dungeon/${k}/copie`)).data));
  log('\n== F4-15 divergenze (lettura)');
  for (const p of [1, 2]) log(`p${p}`, JSON.stringify((await get(`/api/partite/${p}/divergenze?dungeon=kamoshida`)).data), '· madarame', JSON.stringify((await get(`/api/partite/${p}/divergenze?dungeon=madarame`)).data));
  log('\n== F4-23 stato delle voci contro la base «prima» (L3/base-prima, schema 109)');
  for (const k of ['kamoshida', 'madarame', 'mementos']) for (const p of [1, 2]) {
    const prima = JSON.parse(fs.readFileSync(`${BASE3}/dungeon-${k}-p${p}.json`, 'utf8')).data; const dopo = (await get(`/api/compendio/dungeon/${k}?partita=${p}`)).data;
    const mp = new Map(); for (const a of prima.aree) for (const v of a.punti ?? []) mp.set(v.chiave, v.stato);
    let uguali = 0; const diverse = []; let mancanti = 0;
    for (const a of dopo.aree) for (const v of a.punti ?? []) { if (!mp.has(v.chiave)) { mancanti++; continue; } if (mp.get(v.chiave) === v.stato) uguali++; else diverse.push([v.chiave.slice(0, 60), mp.get(v.chiave), v.stato, v.carattere]); }
    log(`${k} p${p}: voci uguali ${uguali}, diverse ${diverse.length}, nuove/assenti nella base ${mancanti}`, diverse.length ? JSON.stringify(diverse.slice(0, 6)) : '');
  }
  log('\n== F4-23 stato dei pin contro la base «prima» (L4/base-prima)');
  for (const k of ['kamoshida', 'madarame']) for (const p of [1, 2]) {
    const prima = JSON.parse(fs.readFileSync(`${BASE4}/pin-${k}-p${p}.json`, 'utf8')); let uguali = 0; const diversi = []; let assenti = 0;
    for (const [mappa, m] of Object.entries(prima)) {
      if (!m.spilli) continue; const d = (await get(`/api/mappe/${encodeURIComponent(mappa)}?partita=${p}`)).data; const per = new Map((d?.spilli ?? []).map((s) => [s.uid, s]));
      for (const s of m.spilli) { const n = per.get(s.uid); if (!n) { assenti++; continue; } const st = n.raccolto; if (st === s.stato) uguali++; else diversi.push([s.id, s.nome, s.stato, st, n.daVerificare ?? '', n.statoProprio ?? '']); }
    }
    log(`${k} p${p}: pin uguali ${uguali}, diversi ${diversi.length}, assenti ${assenti}`, diversi.length ? JSON.stringify(diversi.slice(0, 10)) : '');
  }
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
