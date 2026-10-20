// L2 giro 2, FUN2-8 sul collaudo 3301 (f19a117f), dentro il ciclo del Collaudo. Uso: node fun2-8.cjs prova | pulisci
const B = 'http://localhost:3301';
const req = async (m, p, b) => { const r = await fetch(B + p, { method: m, headers: b ? { 'content-type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* vuoto */ } return { s: r.status, j }; };
const J = (x, n = 500) => JSON.stringify(x)?.slice(0, n);
(async () => {
  const fase = process.argv[2];
  console.log(`== ${fase} · ${new Date().toISOString()}`);
  if (fase === 'prova') {
    let r = await req('POST', '/api/mappe', { nome: 'Prova funzionali FUN2-8', tipo: 'luogo' });
    console.log('POST /api/mappe senza genitore →', r.s, J(r.j?.data ? { chiave: r.j.data.chiave, genitore: r.j.data.genitore, area: r.j.data.area } : r.j?.error));
    const k = r.j?.data?.chiave;
    r = await req('PUT', `/api/mappe/${k}`, { genitore: 'citta-kichijoji' }); console.log('PUT genitore citta-kichijoji →', r.s, J(r.j?.error ?? r.j?.data?.chiave));
    r = await req('PUT', `/api/mappe/${k}`, { genitore: 'tokyo' }); console.log('PUT genitore tokyo →', r.s, J(r.j?.error ?? r.j?.data?.chiave));
    r = await req('GET', `/api/mappe/${k}`); console.log('la mappa dopo:', r.s, J(r.j?.data && { chiave: r.j.data.chiave, genitore: r.j.data.genitore, area: r.j.data.area }));
    console.log('da-collocare:', J((await req('GET', '/api/aree/da-collocare')).j?.data?.map((x) => x.chiave ?? x)));
  } else if (fase === 'pulisci') {
    const k = process.argv[3];
    let r = await req('DELETE', `/api/mappe/${k}`); console.log('DELETE', k, r.s);
    for (const c of (await req('GET', '/api/impostazioni/cestino')).j.data) if (/Prova funzionali FUN2-8/.test(c.nome ?? '')) { r = await req('DELETE', `/api/impostazioni/cestino/${c.id}`); console.log('tolta dal cestino', c.id, r.s); }
    console.log('cestino ora:', J((await req('GET', '/api/impostazioni/cestino')).j.data.map((c) => [c.id, c.tipo, c.nome])));
  }
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
