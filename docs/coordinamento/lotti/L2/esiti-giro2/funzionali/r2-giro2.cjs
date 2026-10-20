// L2 giro 2, R2 — sul collaudo (BE 3301) dentro un ciclo del Collaudo (foto e ripristino). Uso: node r2-giro2.cjs prepara | area | pulisci
// prepara: partita di prova attiva (06-01 giorno), «raccolto» sul pin 1750 di Central Street, letture API.
// area: F2-29, rinomina dell'area seed Kichijoji › Quartiere dello shopping e «Ripristina», con la riga del DB prima e dopo.
// pulisci: partita 1 di nuovo attiva, partita di prova eliminata, controllo delle partite.
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/p5s-sviluppo-l2';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));
const B = 'http://localhost:3301';
const PIN = 1750;
const req = async (metodo, p, corpo) => { const r = await fetch(B + p, { method: metodo, headers: corpo ? { 'content-type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* vuoto */ } return { s: r.status, j }; };
const leggi = (file, sql, ...p) => { const db = new Database(path.join(radice, 'data', file), { readonly: true }); const r = db.prepare(sql).all(...p); db.close(); return r; };
const partite = async () => (await req('GET', '/api/partite')).j.data.map((p) => `${p.id}:${p.nome}:${p.attiva ? 'ATTIVA' : '-'}:${p.dataGioco}/${p.fasciaGioco}`).join(' | ');
const statoPin = async (partita) => { const m = (await req('GET', `/api/mappe/shibuya-central-street?partita=${partita}`)).j.data; const p = m.spilli.find((x) => x.id === PIN); return `${p.nome}: raccolto=${p.raccolto}`; };
const log = (...a) => console.log(...a);
const fase = process.argv[2];
(async () => {
  if (fase === 'prepara') {
    log('partite prima:', await partite());
    let r = await req('POST', '/api/partite', { nome: 'Prova funzionali L2', attiva: true, dataGioco: '06-01', fasciaGioco: 'giorno' });
    const id = r.j?.data?.id; log('crea partita di prova', r.s, 'id', id, '· partite ora:', await partite());
    log('pin prima: prova', await statoPin(id), '· partita 1', await statoPin(1));
    r = await req('PUT', `/api/partite/${id}/spilli/${PIN}`, { raccolto: true }); log(`PUT /api/partite/${id}/spilli/${PIN} {raccolto:true}`, r.s, JSON.stringify(r.j?.data ?? r.j?.error).slice(0, 200));
    log('pin dopo: prova', await statoPin(id), '· partita 1', await statoPin(1));
    log('DB spillo_partita (pin, partita di prova):', JSON.stringify(leggi('partite.db', 'SELECT * FROM spillo_partita WHERE partita_id = ?', id)));
    const a = (await req('GET', `/api/aree/citta/shibuya/central-street?partita=${id}`)).j.data;
    log('GET area Central Street (partita di prova): elemento del pin', JSON.stringify(a.elementi.filter((e) => e.spillo === PIN)), '· chiavi', Object.keys(a).join(','));
    log('ID_PROVA', id);
  } else if (fase === 'area') {
    const riga = () => JSON.stringify(leggi('gioco.db', "SELECT chiave, nome, nome_rivisto, ordine, planimetria_predefinita, origine, seed_json, da_verificare, updated_at FROM area WHERE chiave = 'citta/kichijoji/quartiere-dello-shopping'")[0]);
    const api = async () => { const a = (await req('GET', '/api/aree/citta/kichijoji/quartiere-dello-shopping')).j.data; return JSON.stringify({ nome: a.nome, nomeRivisto: a.nomeRivisto, origine: a.origine, modificata: a.modificata, slug: a.slug, casa: a.casa }); };
    log('prima  DB', riga()); log('prima  API', await api());
    let r = await req('PUT', '/api/aree/citta/kichijoji/quartiere-dello-shopping', { nome: 'Quartiere dello shopping (prova)' }); log('rinomina', r.s);
    log('dopo la rinomina DB', riga()); log('dopo la rinomina API', await api());
    r = await req('GET', '/api/compendio/citta/kichijoji'); log('nell’elenco del quartiere:', JSON.stringify(r.j.data.aree.map((x) => [x.slug, x.nome, x.modificata])));
    r = await req('POST', '/api/aree/citta/kichijoji/quartiere-dello-shopping/ripristina'); log('ripristina', r.s, JSON.stringify(r.j?.error ?? {}).slice(0, 160));
    log('dopo il ripristino DB', riga()); log('dopo il ripristino API', await api());
    r = await req('POST', '/api/aree/citta/kichijoji/quartiere-dello-shopping/ripristina'); log('ripristina di nuovo (area tornata seed)', r.s, r.j?.error?.code ?? '');
  } else if (fase === 'pulisci') {
    const id = Number(process.argv[3]);
    log('partite prima della pulizia:', await partite());
    let r = await req('POST', '/api/partite/1/attiva'); log('partita 1 attiva', r.s);
    r = await req('DELETE', `/api/partite/${id}`); log(`DELETE partita ${id}`, r.s);
    log('partite dopo:', await partite());
    log('righe di spillo_partita della partita di prova:', leggi('partite.db', 'SELECT count(*) n FROM spillo_partita WHERE partita_id = ?', id)[0].n);
  }
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
