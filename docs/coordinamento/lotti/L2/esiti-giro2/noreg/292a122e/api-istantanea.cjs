// Sola lettura (solo GET): istantanea delle risposte API che un lotto può toccare, per confrontarle prima/dopo campo per campo.
// I ?v= di versione delle immagini si tolgono (cambiano a ogni ricarica). Con confronto.json stampa i percorsi JSON cambiati, aggiunti, tolti.
// Uso: node api-istantanea.cjs <porta> <uscita.json> [confronto.json] [max differenze per endpoint, predefinito 30]
const fs = require('fs');
const [porta, uscita, confronto, maxS] = process.argv.slice(2);
const max = Number(maxS || 30);
const base = `http://localhost:${porta}/api`;
// GREZZO=1: i `?v=` restano come sono (serve a vedere le differenze di versione, es. il suffisso di generazione `~r2` delle miniature)
const norm = process.env.GREZZO === '1' ? (v) => v : (v) => JSON.parse(JSON.stringify(v).replace(/([?&])v=[^&"\\]*/g, '$1v=*'));
(async () => {
  const q = (await (await fetch(`${base}/compendio/citta`)).json()).data ?? [];
  const d = (await (await fetch(`${base}/compendio/dungeon?partita=1`)).json()).data ?? [];
  const endpoint = ['/compendio/citta', '/compendio/citta?partita=1', '/compendio/dungeon?partita=1', '/mappe/albero', '/mappe/tokyo?partita=1',
    ...q.map((x) => `/compendio/citta/${x.chiave}?partita=1`), ...d.map((x) => `/compendio/dungeon/${x.chiave}?partita=1`)];
  const out = {};
  for (const e of endpoint) { const r = await fetch(base + e); out[e] = { status: r.status, corpo: norm(await r.json().catch(() => null)) }; }
  fs.writeFileSync(uscita, JSON.stringify(out));
  console.log(`${endpoint.length} endpoint; non 200: ${Object.values(out).filter((x) => x.status !== 200).length}`);
  if (!confronto) return;
  const A = JSON.parse(fs.readFileSync(confronto, 'utf8'));
  const diff = (a, b, p, acc) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (!(k in a)) acc.push(`+ ${p}.${k} = ${JSON.stringify(b[k]).slice(0, 160)}`);
        else if (!(k in b)) acc.push(`- ${p}.${k} (era ${JSON.stringify(a[k]).slice(0, 160)})`);
        else diff(a[k], b[k], `${p}.${k}`, acc);
      }
    } else acc.push(`~ ${p}: ${JSON.stringify(a).slice(0, 160)} → ${JSON.stringify(b).slice(0, 160)}`);
  };
  for (const e of new Set([...Object.keys(A), ...Object.keys(out)])) {
    const acc = [];
    if (!A[e]) { console.log(`\n# ${e}: NUOVO`); continue; }
    if (!out[e]) { console.log(`\n# ${e}: SPARITO`); continue; }
    diff(A[e], out[e], '', acc);
    if (acc.length) console.log(`\n# ${e}: ${acc.length} differenze\n  ${acc.slice(0, max).join('\n  ')}${acc.length > max ? `\n  … (${acc.length - max} altre)` : ''}`);
  }
})();
