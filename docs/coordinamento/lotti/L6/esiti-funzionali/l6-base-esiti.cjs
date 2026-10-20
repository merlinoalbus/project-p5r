// L6, base «prima» degli esiti (prima della M6), sull'anteprima 3302 dentro un ciclo del Collaudo.
// Uso: node l6-base-esiti.cjs <uscita-dir> [B]   — crea una partita di prova NON attiva, la porta alle 6 date, legge gli esiti, la elimina;
//      in più legge la partita 1 alla sua data senza cambiarla. Scrive solo la partita di prova (partite.db).
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const B = process.argv[3] ?? 'http://localhost:3302';
const DATE = ['04-11', '04-16', '05-20', '06-09', '07-05', '10-11'];
const req = async (m, p, b) => { const r = await fetch(B + p, { method: m, headers: b ? { 'content-type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* vuoto */ } return { s: r.status, d: j?.data, e: j?.error }; };
const ID = ['uid', 'chiave', 'id', 'slug', 'rango', 'indice'];
const STATI = ['disponibilita', 'disponibile', 'sbloccato', 'aperto', 'bloccato', 'presenza', 'stato', 'semafori', 'requisiti', 'manca', 'completato', 'concluso'];
// raccoglie, per ogni oggetto con un'identità, i suoi campi di esito (in profondità; il percorso degli antenati fa da chiave)
const estrai = (x, pref, out) => {
  if (Array.isArray(x)) { x.forEach((v, i) => estrai(v, `${pref}[${i}]`, out)); return; }
  if (!x || typeof x !== 'object') return;
  const idk = ID.find((k) => x[k] !== undefined && typeof x[k] !== 'object');
  const base = idk ? `${pref.replace(/\[\d+\]$/, '')}{${idk}=${x[idk]}}` : pref;
  const es = {}; for (const k of STATI) if (x[k] === null) es[k] = null; else if (x[k] !== undefined && typeof x[k] !== 'object') es[k] = x[k]; else if (k === 'disponibilita' && x[k] && typeof x[k] === 'object') es[k] = x[k].stato ?? JSON.stringify(x[k]).slice(0, 120);
  if (idk && Object.keys(es).length) out[base] = es;
  for (const [k, v] of Object.entries(x)) if (v && typeof v === 'object' && !(k === 'disponibilita')) estrai(v, `${base}.${k}`, out);
};
const leggiTutto = async (P) => {
  const out = {}; const conta = {};
  const leggi = async (nome, p) => { const r = await req('GET', p); conta[nome] = r.s; if (r.d) estrai(r.d, nome, out); };
  for (const e of ['citta', 'negozi', 'attivita', 'libri', 'film', 'videogiochi', 'richieste', 'dungeon', 'completamento']) await leggi(e, `/api/compendio/${e}?partita=${P}`);
  const citta = (await req('GET', `/api/compendio/citta?partita=${P}`)).d; const quartieri = (citta?.quartieri ?? citta ?? []).map((q) => q.chiave).filter(Boolean);
  for (const q of quartieri) await leggi(`citta/${q}`, `/api/compendio/citta/${q}?partita=${P}`);
  for (const n of ((await req('GET', `/api/compendio/negozi?partita=${P}`)).d ?? []).map((x) => x.chiave)) await leggi(`negozi/${n}`, `/api/compendio/negozi/${n}?partita=${P}`);
  await leggi('confidenti', `/api/partite/${P}/confidenti`);
  const albero = (await req('GET', '/api/mappe/albero')).d ?? []; const figli = new Map(); for (const m of albero) { if (!figli.has(m.genitore)) figli.set(m.genitore, []); figli.get(m.genitore).push(m.chiave); }
  const mondo = []; const visita = (k) => { mondo.push(k); for (const f of figli.get(k) ?? []) visita(f); }; visita('tokyo');
  for (const k of mondo) await leggi(`mappe/${k}`, `/api/mappe/${encodeURIComponent(k)}?partita=${P}`);
  return { quartieri: quartieri.length, mappe: mondo.length, esiti: Object.keys(out).length, conta, out };
};
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const log = (...a) => { const s = a.join(' '); console.log(s); fs.appendFileSync(path.join(OUT, 'log.txt'), s + '\n'); };
  log(`== base «prima» L6 · ${new Date().toISOString()} · ${B}`);
  log('partite prima', JSON.stringify((await req('GET', '/api/partite')).d.map((p) => [p.id, p.nome, p.attiva, p.dataGioco, p.fasciaGioco])));
  const p1 = await leggiTutto(1); fs.writeFileSync(path.join(OUT, 'p1.json'), JSON.stringify(p1.out)); log('p1', p1.esiti, 'esiti · quartieri', p1.quartieri, '· mappe', p1.mappe, '· http', JSON.stringify(p1.conta).slice(0, 200));
  if (process.env.SOLO_P1) return;
  const c = await req('POST', '/api/partite', { nome: 'Prova funzionali L6 base', attiva: false, dataGioco: DATE[0], fasciaGioco: 'giorno' }); const P = c.d.id; log('partita di prova', c.s, P, 'attiva', c.d.attiva);
  try {
    for (const d of DATE) {
      const u = await req('PUT', `/api/partite/${P}`, { dataGioco: d, fasciaGioco: 'giorno' }); const r = await leggiTutto(P);
      fs.writeFileSync(path.join(OUT, `prova-${d}.json`), JSON.stringify(r.out)); log(`data ${d}: PUT ${u.s} · esiti ${r.esiti}`);
    }
  } finally {
    const del = await req('DELETE', `/api/partite/${P}`); log('DELETE partita di prova', del.s, '· partite dopo', JSON.stringify((await req('GET', '/api/partite')).d.map((p) => [p.id, p.attiva, p.dataGioco])), new Date().toISOString());
  }
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
