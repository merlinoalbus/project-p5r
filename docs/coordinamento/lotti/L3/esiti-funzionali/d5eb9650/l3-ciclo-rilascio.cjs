// L3 sulla linea di rilascio (collaudo 3301, d5eb9650), dentro un ciclo del Collaudo. Uso: node l3-ciclo-rilascio.cjs ricerca | ap33 | partita | pulisci
const fs = require('fs');
const path = require('path');
const B = 'http://localhost:3301';
const ID = path.join(__dirname, 'l3-rilascio-partita.txt');
const req = async (m, p, b) => { const r = await fetch(B + p, { method: m, headers: b ? { 'content-type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* vuoto */ } return { s: r.status, d: j?.data, e: j?.error }; };
const J = (x, n = 500) => JSON.stringify(x)?.slice(0, n);
const log = (...a) => console.log(...a);
(async () => {
  const fase = process.argv[2];
  log(`== ${fase} · ${new Date().toISOString()}`);
  if (fase === 'ricerca') {
    // F3-23: la ricerca delle destinazioni trova l'area col nome nuovo
    const prima = await req('GET', `/api/mappe/riferimenti?tipo=mappa&q=${encodeURIComponent('Caserma')}`);
    log('ricerca «Caserma» prima', prima.s, J((prima.d ?? []).map((x) => x.nome ?? x.etichetta ?? x)));
    let r = await req('PUT', '/api/aree/dungeon/okumura/caserma', { nome: 'Caserma prova ricerca L3' }); log('rinomina', r.s, J(r.e));
    const dopo = await req('GET', `/api/mappe/riferimenti?tipo=mappa&q=${encodeURIComponent('prova ricerca L3')}`);
    log('ricerca «prova ricerca L3»', dopo.s, J(dopo.d, 800));
    const vecchio = await req('GET', `/api/mappe/riferimenti?tipo=mappa&q=${encodeURIComponent('Caserma')}`); log('ricerca «Caserma» dopo la rinomina', vecchio.s, J((vecchio.d ?? []).map((x) => x.nome ?? x.etichetta ?? x)));
    r = await req('POST', '/api/aree/dungeon/okumura/caserma/ripristina'); log('Ripristina', r.s, J(r.d?.nome ?? r.e));
  } else if (fase === 'ap33') {
    let r = await req('POST', '/api/mappe', { nome: 'Prova funzionali AP3-3', tipo: 'luogo' }); const k = r.d?.chiave; log('POST /api/mappe senza genitore', r.s, J({ chiave: k, genitore: r.d?.genitore, area: r.d?.area }));
    for (const g of ['dungeon-okumura', 'palazzo-di-okumura', 'palazzo-di-okumura-caserma', 'dungeon-mementos']) { r = await req('PUT', `/api/mappe/${k}`, { genitore: g }); log(`PUT genitore ${g} →`, r.s, J(r.e ?? { genitore: r.d?.genitore, area: r.d?.area })); if (r.s === 200) { const b = await req('PUT', `/api/mappe/${k}`, { genitore: null }); log('  rimessa senza genitore', b.s, J(b.e)); } }
    r = await req('DELETE', `/api/mappe/${k}`); log('DELETE', r.s);
    for (const c of (await req('GET', '/api/impostazioni/cestino')).d ?? []) if (/Prova funzionali AP3-3/.test(c.nome ?? '')) { r = await req('DELETE', `/api/impostazioni/cestino/${c.id}`); log('tolta dal cestino', c.id, r.s); }
  } else if (fase === 'partita') {
    let r = await req('POST', '/api/partite', { nome: 'Prova funzionali L3 rilascio', attiva: true, dataGioco: '05-20', fasciaGioco: 'giorno' }); fs.writeFileSync(ID, String(r.d.id)); log('partita di prova', r.s, r.d.id, 'attiva', r.d.attiva, r.d.dataGioco);
    const P = r.d.id;
    for (const v of ['madarame-01-entrata-del-museo/1', 'madarame-01-entrata-del-museo-raccogli-il-tesoro', 'madarame-01-entrata-del-museo-raccogli-la-sciabola-lunare']) { r = await req('PUT', `/api/partite/${P}/punti`, { punto: v, stato: 'ottenuto' }); log('PUT punti', v, r.s, J(r.e)); }
    const d = (await req('GET', `/api/compendio/dungeon/madarame?partita=${P}`)).d; log('infiltrazioni di Madarame nella prova:', J(d.aree.map((a) => [a.chiave.replace('madarame-', ''), a.completamento?.completata ?? a.completata])));
  } else if (fase === 'data') {
    const P = Number(fs.readFileSync(ID, 'utf8')); const r = await req('PUT', `/api/partite/${P}/giorno`, { data: process.argv[3] }); const r2 = r.s === 404 || r.s === 400 ? await req('PUT', `/api/partite/${P}`, { dataGioco: process.argv[3], fasciaGioco: 'giorno' }) : null; log('cambio data', process.argv[3], r.s, J(r.e), r2 ? `PUT /partite ${r2.s}` : '');
  } else if (fase === 'pulisci') {
    const P = Number(fs.readFileSync(ID, 'utf8'));
    let r = await req('POST', '/api/partite/1/attiva'); log('attiva 1', r.s);
    r = await req('DELETE', `/api/partite/${P}`); log(`DELETE partita ${P}`, r.s);
    log('partite', J((await req('GET', '/api/partite')).d.map((p) => [p.id, p.nome, p.attiva, p.dataGioco, p.fasciaGioco])));
  }
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
