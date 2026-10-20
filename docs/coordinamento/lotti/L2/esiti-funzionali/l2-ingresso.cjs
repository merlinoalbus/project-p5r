// L2 pezzo 109: ingresso dei quartieri (PUT) e import di un pacchetto con soli ingressi, SOLO su Kichijoji (che non ha ingresso),
// poi ingresso tolto. Il DB si legge in sola lettura per vedere area_chiave.
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));
const B = 'http://localhost:3201';
const req = async (metodo, p, corpo) => { const r = await fetch(B + p, { method: metodo, headers: corpo ? { 'content-type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* vuoto */ } return { s: r.status, j }; };
const riga = () => { const db = new Database(path.join(radice, 'data/gioco.db'), { readonly: true }); const r = db.prepare("SELECT * FROM quartiere_ingresso WHERE quartiere_chiave='kichijoji'").get(); const n = db.prepare('SELECT count(*) n FROM quartiere_ingresso').get().n; db.close(); return JSON.stringify(r ?? null) + ` (righe totali ${n})`; };
const breve = (x) => JSON.stringify(x)?.slice(0, 300);
(async () => {
  console.log('prima', riga());
  let r = await req('PUT', '/api/compendio/citta/kichijoji/ingresso', { mappa: 'nativo-rmap-005-1-0', x: 10, y: 20, zoom: 2 });
  console.log('\nPUT corpo vecchio {mappa} (planimetria di Kichijoji)', r.s, breve(r.j?.data ?? r.j?.error), '→ DB', riga());
  const d = await req('GET', '/api/compendio/citta/kichijoji');
  console.log('GET dettaglio → ingresso', breve(d.j?.data?.ingresso));
  r = await req('PUT', '/api/compendio/citta/kichijoji/ingresso', { mappa: 'nativo-rmap-001-3-0', x: 10, y: 20, zoom: 2 });
  console.log('\nPUT con una planimetria di UN ALTRO quartiere (Central Street di Shibuya)', r.s, breve(r.j?.data ?? r.j?.error), '→ DB', riga());
  r = await req('PUT', '/api/compendio/citta/kichijoji/ingresso', { area: 'quartiere-dello-shopping', x: 10, y: 20, zoom: 2 });
  console.log('\nPUT corpo nuovo {area} (non ancora annunciato)', r.s, breve(r.j?.data ?? r.j?.error), '→ DB', riga());
  r = await req('DELETE', '/api/compendio/citta/kichijoji/ingresso');
  console.log('\nDELETE ingresso', r.s, '→ DB', riga());

  const pub = (await req('GET', '/api/mappe/nativo-rmap-005-1-0')).j?.data?.chiave;
  console.log('\nchiave pubblica della planimetria di Kichijoji', pub);
  const pac = (ingressi) => ({ pacchetto: { versione: 1, mappe: [], ingressi } });
  r = await req('POST', '/api/mappe/importa', pac([{ quartiere: 'kichijoji', mappa: pub, x: 11, y: 22, zoom: 3 }]));
  console.log('IMPORT pacchetto con solo l’ingresso', r.s, breve(r.j?.data ?? r.j?.error), '→ DB', riga());
  r = await req('POST', '/api/mappe/importa', { ...pac([{ quartiere: 'kichijoji', mappa: pub, x: 12, y: 23, zoom: 4 }]), sovrascrivi: true });
  console.log('IMPORT di nuovo con sovrascrivi', r.s, breve(r.j?.data ?? r.j?.error), '→ DB', riga());
  r = await req('POST', '/api/mappe/importa', { ...pac([{ quartiere: 'kichijoji', mappa: 'nativo-rmap-001-3-0', x: 13, y: 24, zoom: 1 }]), sovrascrivi: true });
  console.log('IMPORT con la planimetria di UN ALTRO quartiere', r.s, breve(r.j?.data ?? r.j?.error), '→ DB', riga());
  r = await req('DELETE', '/api/compendio/citta/kichijoji/ingresso');
  console.log('\nDELETE ingresso (pulizia)', r.s, '→ DB', riga());
  for (const q of ['shibuya', 'yongen-jaya']) console.log('ingresso', q, breve((await req('GET', '/api/compendio/citta/' + q)).j?.data?.ingresso));
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
