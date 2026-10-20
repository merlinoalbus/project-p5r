// L2, casi residui che scrivono, sul collaudo dentro un ciclo del Collaudo. Uso: node residui-ciclo.cjs palazzo | partita | pulisci <id>
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/p5s-sviluppo-l2';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));
const B = 'http://localhost:3301';
const req = async (metodo, p, corpo) => { const r = await fetch(B + p, { method: metodo, headers: corpo ? { 'content-type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* vuoto */ } return { s: r.status, j }; };
const leggi = (file, sql, ...p) => { const db = new Database(path.join(radice, 'data', file), { readonly: true }); const r = db.prepare(sql).all(...p); db.close(); return r; };
const partite = async () => (await req('GET', '/api/partite')).j.data.map((p) => `${p.id}:${p.nome}:${p.attiva ? 'ATTIVA' : '-'}:${p.dataGioco}/${p.fasciaGioco}`).join(' | ');
const log = (...a) => console.log(...a);
(async () => {
  const fase = process.argv[2];
  if (fase === 'palazzo') {
    let r = await req('POST', '/api/mappe', { nome: 'Prova funzionali L2 Palazzo', tipo: 'luogo', genitore: 'dungeon-okumura' });
    log('POST /api/mappe sotto dungeon-okumura', r.s, JSON.stringify(r.j?.data ? { chiave: r.j.data.chiave, genitore: r.j.data.genitore, casa: r.j.data.casa } : r.j?.error));
    const k = r.j?.data?.chiave;
    r = await req('POST', '/api/mappe', { nome: 'Prova funzionali L2 mondo', tipo: 'luogo', genitore: 'citta-shinjuku' }); log('POST /api/mappe sotto citta-shinjuku (confronto)', r.s, r.j?.error?.code ?? '');
    if (k) {
      r = await req('DELETE', `/api/mappe/${k}`); log('DELETE della mappa di prova', r.s);
      for (const c of (await req('GET', '/api/impostazioni/cestino')).j.data) if (/prova-funzionali-l2-palazzo|Prova funzionali L2 Palazzo/i.test(`${c.chiave} ${c.nome}`)) { r = await req('DELETE', `/api/impostazioni/cestino/${c.id}`); log('tolta dal cestino', c.id, r.s); }
    }
    log('mappe con «prova» nel DB:', JSON.stringify(leggi('gioco.db', "SELECT chiave FROM mappa WHERE chiave LIKE '%prova%'")), '· cestino', JSON.stringify((await req('GET', '/api/impostazioni/cestino')).j.data));
  } else if (fase === 'partita') {
    log('partite prima:', await partite());
    const r = await req('POST', '/api/partite', { nome: 'Prova funzionali L2 Oggi', attiva: true, dataGioco: '05-10', fasciaGioco: 'giorno' });
    log('crea partita di prova', r.s, 'id', r.j?.data?.id, '· partite ora:', await partite());
  } else if (fase === 'pulisci') {
    const id = Number(process.argv[3]);
    let r = await req('POST', '/api/partite/1/attiva'); log('partita 1 attiva', r.s);
    r = await req('DELETE', `/api/partite/${id}`); log(`DELETE partita ${id}`, r.s);
    log('partite dopo:', await partite());
    log('ingresso di Shinjuku:', JSON.stringify((await req('GET', '/api/compendio/citta/shinjuku')).j.data.ingresso), '· righe quartiere_ingresso', leggi('gioco.db', 'SELECT count(*) n FROM quartiere_ingresso')[0].n);
  }
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
