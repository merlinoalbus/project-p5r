// Residuo dopo «Elimina area» (segnalazione di Test UX), sull'anteprima 3302 dentro un ciclo del Collaudo. Okumura.
// Uso: node residuo-area.cjs foto <nome> | gesti | confronta <a> <b>   (DB in sola lettura; scritture solo via API)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Database = require('C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941/node_modules/better-sqlite3');
const DATI = 'C:/Users/rober/AppData/Local/Temp/claude/C--Repository-project-p5r--claude-worktrees-p5s-sviluppo-l2/a4ff2e39-92e9-416b-be66-a66bc1f16e27/scratchpad/anteprima/codice/data';
const OUT = 'C:/Users/rober/.claude/p5s-coordinamento/lotti/L3/esiti-collaudo-funzionali/residuo-area';
const B = 'http://localhost:3302';
const req = async (m, p, b) => { const h = {}; let body; if (b !== undefined) { if (Buffer.isBuffer(b)) { h['content-type'] = 'image/png'; body = b; } else { h['content-type'] = 'application/json'; body = JSON.stringify(b); } } const r = await fetch(B + p, { method: m, headers: h, body }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* vuoto */ } return { s: r.status, d: j?.data, e: j?.error }; };
const png = () => { const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; }; const ch = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); }; const w = 40, h = 30; const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; const riga = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 120)]); return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(Buffer.concat(Array(h).fill(riga)))), ch('IEND', Buffer.alloc(0))]); };
const foto = () => { const db = new Database(path.join(DATI, 'gioco.db'), { readonly: true }); const q = (s) => db.prepare(s).all(); const r = {
  area: q('SELECT * FROM area ORDER BY chiave'),
  infiltrazione_area: q('SELECT * FROM infiltrazione_area ORDER BY infiltrazione_chiave, area_chiave'),
  mappa: q("SELECT chiave, nome, tipo, genitore_chiave, ordine, area_chiave, versione_etichetta, versione_ordine, origine, nome_rivisto, updated_at FROM mappa WHERE genitore_chiave = 'dungeon-okumura' OR chiave = 'dungeon-okumura' ORDER BY chiave"),
  dungeon_area: q("SELECT * FROM dungeon_area WHERE dungeon_chiave = 'okumura' ORDER BY chiave") }; db.close(); return r; };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const fase = process.argv[2];
  console.log(`== ${fase} · ${new Date().toISOString()}`);
  if (fase === 'foto') { const f = foto(); fs.writeFileSync(path.join(OUT, `${process.argv[3]}.json`), JSON.stringify(f, null, 1)); console.log(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.length]))); }
  else if (fase === 'gesti') {
    // come il ciclo U6 di Test UX, su Okumura: area con 2 planimetrie legata a un'infiltrazione, un'infiltrazione di prova con «Modifica aree» (un'area esistente messa per prima), poi elimina area e infiltrazione
    let r = await req('POST', `/api/aree/dungeon/okumura?nome=${encodeURIComponent('Prova residuo area')}&infiltrazioni=okumura-05-linea-esportazioni`, png()); const slug = r.d?.slug; console.log('crea area', r.s, slug);
    r = await req('POST', `/api/aree/dungeon/okumura/${slug}/planimetrie?etichetta=Livello%202`, png()); console.log('seconda planimetria', r.s);
    r = await req('POST', '/api/compendio/dungeon/okumura/aree', { nome: 'Prova residuo infiltrazione', areePalazzo: [slug] }); const inf = r.d?.chiave; console.log('crea infiltrazione', r.s, inf);
    r = await req('PUT', `/api/compendio/aree/${inf}/aree-palazzo`, { aree: ['caserma', slug] }); console.log('Modifica aree (caserma per prima)', r.s, r.e?.code ?? '');
    r = await req('DELETE', `/api/aree/dungeon/okumura/${slug}?conferma=1`); console.log('elimina area', r.s, r.e?.code ?? '');
    r = await req('DELETE', `/api/compendio/aree/${inf}`); console.log('elimina infiltrazione', r.s, r.e?.code ?? '');
  } else if (fase === 'confronta') {
    const a = JSON.parse(fs.readFileSync(path.join(OUT, `${process.argv[3]}.json`), 'utf8')); const b = JSON.parse(fs.readFileSync(path.join(OUT, `${process.argv[4]}.json`), 'utf8'));
    for (const t of Object.keys(a)) {
      const chiave = (x) => x.chiave ?? `${x.infiltrazione_chiave}|${x.area_chiave}`; const ma = new Map(a[t].map((x) => [chiave(x), x])); const mb = new Map(b[t].map((x) => [chiave(x), x]));
      const diff = []; for (const [k, x] of ma) { const y = mb.get(k); if (!y) { diff.push({ k, solo: 'prima' }); continue; } const col = Object.keys(x).filter((c) => JSON.stringify(x[c]) !== JSON.stringify(y[c])); if (col.length) diff.push({ k, colonne: Object.fromEntries(col.map((c) => [c, [x[c], y[c]]])) }); }
      for (const k of mb.keys()) if (!ma.has(k)) diff.push({ k, solo: 'dopo' });
      console.log(`${t}: ${a[t].length} → ${b[t].length}, righe diverse ${diff.length}`, diff.length ? JSON.stringify(diff, null, 1).slice(0, 3000) : '');
    }
  }
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
