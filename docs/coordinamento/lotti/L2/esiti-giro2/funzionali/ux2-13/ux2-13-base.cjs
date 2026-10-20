// UX2-13 / E4-E5-E7 (L2), sola lettura sul collaudo 3301. Uso: node ux2-13-base.cjs <uscita.json>
// Per ogni mappa dell'albero: pin (uid, x, y, tipo), dimensioni della tela intera e della miniatura ?l=320 (intestazione dell'immagine).
// NB: le GET con ?l= scrivono la cache delle miniature (immagine_miniatura): è l'unico effetto.
const fs = require('fs');
const B = process.argv[3] ?? 'http://localhost:3301';
const dim = (buf) => {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { tipo: 'png', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const c = buf.toString('ascii', 12, 16);
    if (c === 'VP8X') return { tipo: 'webp', w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (c === 'VP8 ') return { tipo: 'webp', w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (c === 'VP8L') { const b = buf.readUInt32LE(21); return { tipo: 'webp', w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) { let i = 2; while (i < buf.length) { if (buf[i] !== 0xff) break; const m = buf[i + 1]; const l = buf.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return { tipo: 'jpeg', w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) }; i += 2 + l; } }
  return { tipo: 'altro' };
};
const img = async (url) => { const r = await fetch(B + url); const buf = Buffer.from(await r.arrayBuffer()); return { s: r.status, ct: r.headers.get('content-type'), byte: buf.length, ...dim(buf) }; };
(async () => {
  const albero = (await (await fetch(B + '/api/mappe/albero')).json()).data;
  const out = { quando: new Date().toISOString(), albero: albero.length, mappe: {} };
  for (const m of albero) {
    const d = (await (await fetch(B + '/api/mappe/' + encodeURIComponent(m.chiave))).json()).data;
    if (!d) continue;
    const r = { tipo: d.tipo, genitore: d.genitore, area: d.area?.chiave ?? null, w: d.larghezza, h: d.altezza, pin: (d.spilli ?? []).map((s) => [s.uid, s.x, s.y, s.tipo]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))) };
    const u = d.immagineUrl ?? (d.asset ? `/api/immagini/${d.asset.split('/')[0]}/${encodeURIComponent(d.asset.split('/').slice(1).join('/'))}/file` : null);
    if (u) { r.url = u; r.intera = await img(u); r.mini = await img(u + (u.includes('?') ? '&' : '?') + 'l=320'); }
    out.mappe[m.chiave] = r;
  }
  fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
  const v = Object.values(out.mappe); console.log('mappe', v.length, '· pin', v.reduce((n, x) => n + x.pin.length, 0), '· con immagine', v.filter((x) => x.url).length, '· mini 200', v.filter((x) => x.mini?.s === 200).length);
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
