// Prove che scrivono (F5, F6, F9) SOLO su mappe di prova create qui e poi eliminate (con il cestino svuotato della loro voce).
const fs = require('fs');
const B = 'http://localhost:3201';
const K = 'prova-funzionali-l1-a';
const K2 = 'prova-funzionali-l1-svg';
const log = (...a) => console.log(...a);
const req = async (metodo, p, corpo, tipo) => {
  const opz = { method: metodo, headers: {} };
  if (corpo !== undefined) {
    if (Buffer.isBuffer(corpo)) { opz.body = corpo; opz.headers['content-type'] = tipo; }
    else { opz.body = JSON.stringify(corpo); opz.headers['content-type'] = 'application/json'; }
  }
  const r = await fetch(B + p, opz);
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch { /* corpo vuoto */ }
  return { s: r.status, j };
};
const breve = (x) => JSON.stringify(x)?.slice(0, 400);
const pezzi = async (k) => ((await req('GET', '/api/mappe/' + k)).j?.data?.pezzi ?? []).length;
const mappa = async (k) => { const d = (await req('GET', '/api/mappe/' + k)).j?.data; return d && { immagineUrl: d.immagineUrl, asset: d.asset, ruolo: d.ruoloImmagine, larghezza: d.larghezza, altezza: d.altezza, origine: d.origine, origineUrl: d.origineUrl, pezzi: (d.pezzi ?? []).length }; };
const creaPezzo = async (k) => req('POST', `/api/mappe/${k}/pezzi`, { nome: 'pezzo di prova', sorgente: { x: 0, y: 0, larghezza: 10, altezza: 10 } });

(async () => {
  const png = Buffer.from(await (await fetch(B + '/api/immagini/mappe/citta-kichijoji/file')).arrayBuffer());
  const png2 = Buffer.from(await (await fetch(B + '/api/immagini/mappe/citta-nakano/file')).arrayBuffer());
  log('png', png.length, 'B; png2', png2.length, 'B');

  log('\n== F-20/F9 creaMappa senza asset');
  let r = await req('POST', '/api/mappe', { chiave: K, nome: 'Prova funzionali L1', tipo: 'luogo', genitore: null });
  log('POST /api/mappe', r.s, breve(r.j?.data && { chiave: r.j.data.chiave, asset: r.j.data.asset, immagineUrl: r.j.data.immagineUrl, ruolo: r.j.data.ruoloImmagine }) ?? breve(r.j));
  const albero = (await req('GET', '/api/mappe/albero')).j.data.find((m) => m.chiave === K);
  log('albero', breve(albero && { asset: albero.asset, immagineUrl: albero.immagineUrl, ruolo: albero.ruoloImmagine }));

  log('\n== caricamento (editor) senza pezzi');
  r = await req('PUT', `/api/mappe/${K}/immagine`, png, 'image/png');
  log('PUT /api/mappe/:k/immagine', r.s, breve(await mappa(K)));
  r = await creaPezzo(K); log('POST pezzo', r.s, 'pezzi=', await pezzi(K));

  log('\n== F-15 sostituzioni senza conferma');
  r = await req('PUT', `/api/mappe/${K}/immagine`, png2, 'image/png'); log('PUT editor senza conferma', r.s, breve(r.j?.error), 'pezzi=', await pezzi(K));
  r = await req('PUT', `/api/immagini/mappa/${K}`, png2, 'image/png'); log('PUT generica senza conferma', r.s, breve(r.j?.error), 'pezzi=', await pezzi(K));
  log('\n== F-16/F-26 da-url');
  const url = B + '/api/immagini/mappe/citta-nakano/file';
  r = await req('POST', `/api/immagini/mappa/${K}/da-url`, { url }); log('da-url senza conferma', r.s, breve(r.j?.error), breve(await mappa(K)));
  r = await req('POST', `/api/immagini/mappa/${K}/da-url?eliminaPezzi=1`, { url }); log('da-url con conferma', r.s, breve(r.j?.error), breve(await mappa(K)));

  log('\n== F-17 DELETE singola');
  r = await creaPezzo(K); log('POST pezzo', r.s, 'pezzi=', await pezzi(K));
  r = await req('DELETE', `/api/immagini/mappa/${K}`); log('DELETE senza conferma', r.s, breve(r.j?.error), breve(await mappa(K)));
  r = await req('DELETE', `/api/immagini/mappa/${K}?eliminaPezzi=1`); log('DELETE con conferma', r.s, breve(await mappa(K)));

  log('\n== F-27/F6 import con dimensioni diverse (PNG) e SVG');
  r = await req('PUT', `/api/mappe/${K}/immagine`, png, 'image/png'); log('ricarico png', r.s, breve(await mappa(K)));
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#c00"/></svg>');
  r = await req('POST', '/api/mappe', { chiave: K2, nome: 'Prova funzionali L1 SVG', tipo: 'luogo', genitore: null, larghezza: 777, altezza: 555 }); log('crea svg', r.s);
  r = await req('PUT', `/api/mappe/${K2}/immagine`, svg, 'image/svg+xml'); log('PUT svg', r.s, breve(r.j?.error), breve(await mappa(K2)));
  for (const k of [K, K2]) {
    const e = await req('GET', '/api/mappe/esporta?radice=' + k);
    const pac = e.j?.data ?? e.j;
    const m = pac.mappe.find((x) => x.chiave === k || x.chiavePubblica === k) ?? pac.mappe[0];
    log('export', k, e.s, 'mappe=', pac.mappe.length, 'asset=', m.asset, 'assetOriginale=', m.assetOriginale, 'dim=', m.larghezza, m.altezza, 'immagini=', Object.keys(pac.immagini ?? {}).length);
    fs.writeFileSync(`${__dirname}/export-${k}.json`, JSON.stringify(pac).slice(0, 2000));
    m.larghezza = 1234; m.altezza = 567;
    const i = await req('POST', '/api/mappe/importa', { pacchetto: pac, sovrascrivi: true });
    log('import con dim 1234x567', i.s, breve(i.j?.data ?? i.j?.error), '→', breve(await mappa(k)));
  }
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
