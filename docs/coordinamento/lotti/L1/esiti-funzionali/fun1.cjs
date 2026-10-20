// Verifica di FUN-1 su mappe di prova create qui (poi eliminate a parte).
const B = 'http://localhost:3201';
const req = async (metodo, p, corpo, tipo) => {
  const opz = { method: metodo, headers: {} };
  if (corpo !== undefined) {
    if (Buffer.isBuffer(corpo)) { opz.body = corpo; opz.headers['content-type'] = tipo; }
    else { opz.body = JSON.stringify(corpo); opz.headers['content-type'] = 'application/json'; }
  }
  const r = await fetch(B + p, opz);
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch { /* vuoto */ }
  return { s: r.status, j };
};
const dim = async (k) => { const d = (await req('GET', '/api/mappe/' + k)).j?.data; return d && `${d.chiave} ${d.larghezza}x${d.altezza} ruolo=${d.ruoloImmagine} url=${d.immagineUrl ? 'caricata' : 'null'}`; };
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#c00"/></svg>');
(async () => {
  const png = Buffer.from(await (await fetch(B + '/api/immagini/mappe/citta-kichijoji/file')).arrayBuffer());
  const casi = [['funone editor', 'editor'], ['funone generica', 'generica']];
  const chiavi = [];
  for (const [nome, strada] of casi) {
    const c = await req('POST', '/api/mappe', { nome, tipo: 'luogo', genitore: null, larghezza: 777, altezza: 555 });
    const k = c.j?.data?.chiave; chiavi.push(k);
    console.log(`\n== ${strada}: crea`, c.s, await dim(k));
    const p = strada === 'editor' ? `/api/mappe/${k}/immagine` : `/api/immagini/mappa/${k}`;
    let r = await req('PUT', p, svg, 'image/svg+xml'); console.log('PUT svg', r.s, r.j?.error?.code ?? '', '→', await dim(k));
    r = await req('PUT', p, png, 'image/png'); console.log('PUT png', r.s, r.j?.error?.code ?? '', '→', await dim(k));
    r = await req('PUT', p, svg, 'image/svg+xml'); console.log('PUT svg dopo il png', r.s, r.j?.error?.code ?? '', '→', await dim(k));
  }
  // import: PNG con dimensioni del pacchetto diverse → vince l'intestazione (F6 invariato)
  const k = chiavi[0];
  await req('PUT', `/api/mappe/${k}/immagine`, png, 'image/png');
  const pac = (await req('GET', '/api/mappe/esporta?radice=' + k)).j.data;
  pac.mappe[0].larghezza = 1234; pac.mappe[0].altezza = 567;
  const i = await req('POST', '/api/mappe/importa', { pacchetto: pac, sovrascrivi: true });
  console.log('\n== import PNG con 1234x567', i.s, '→', await dim(k));
  console.log('\nCHIAVI', JSON.stringify(chiavi));
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
