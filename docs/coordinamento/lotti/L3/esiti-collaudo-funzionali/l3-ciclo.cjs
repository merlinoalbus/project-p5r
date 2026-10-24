// L3, ciclo di scrittura sull'ANTEPRIMA del Collaudo (BE 3302), dentro la foto anteprima-ciclo1-funzionali-L3 (05:00:32Z).
// Uso: node l3-ciclo.cjs aree | modifica | cestino | correzioni | diario | partita | importa
// Il DB si legge solo in sola lettura; tutto si scrive via API. Okumura dove si può (richiesta del Collaudo).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Database = require('C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941/node_modules/better-sqlite3');
const DATI = '~/AppData/Local/Temp/claude/C--Repository-project-p5r--claude-worktrees-p5s-sviluppo-l2/a4ff2e39-92e9-416b-be66-a66bc1f16e27/scratchpad/anteprima/codice/data';
const B = 'http://localhost:3302';
const STATO = path.join(__dirname, 'l3-ciclo-stato.json');
const st = fs.existsSync(STATO) ? JSON.parse(fs.readFileSync(STATO, 'utf8')) : {};
const salva = () => fs.writeFileSync(STATO, JSON.stringify(st, null, 1));
const log = (...a) => console.log(...a);
const J = (x, n = 600) => JSON.stringify(x)?.slice(0, n);
const req = async (metodo, p, corpo, tipo) => {
  const h = {}; let body;
  if (corpo !== undefined) { if (Buffer.isBuffer(corpo)) { h['content-type'] = tipo ?? 'image/png'; body = corpo; } else { h['content-type'] = 'application/json'; body = JSON.stringify(corpo); } }
  const r = await fetch(B + p, { method: metodo, headers: h, body }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* vuoto */ }
  return { s: r.status, j, d: j?.data, e: j?.error };
};
const get = async (p) => (await req('GET', p)).d;
const db = (f = 'gioco.db') => new Database(path.join(DATI, f), { readonly: true });
const q = (sql, ...p) => { const d = db(); const r = d.prepare(sql).all(...p); d.close(); return r; };
// PNG valido w×h (RGB, un colore) per i corpi delle immagini
const png = (w = 64, h = 48, rgb = [200, 40, 40]) => {
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (tipo, dati) => { const l = Buffer.alloc(4); l.writeUInt32BE(dati.length); const td = Buffer.concat([Buffer.from(tipo), dati]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const riga = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3).map((_, i) => rgb[i % 3])]); const raw = Buffer.concat(Array.from({ length: h }, () => riga));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const K = 'okumura';
const areaRiassunto = async (slug) => (await get(`/api/compendio/dungeon/${K}`)).areePalazzo.find((a) => a.slug === slug);
const okumuraConti = () => q(`SELECT (SELECT count(*) FROM punto_interesse pi JOIN dungeon_area a ON a.chiave = pi.area_chiave WHERE a.dungeon_chiave = 'okumura') voci,
  (SELECT count(*) FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave WHERE m.area_chiave LIKE 'dungeon/okumura/%') pin,
  (SELECT count(*) FROM area WHERE dungeon_chiave = 'okumura') aree, (SELECT count(*) FROM infiltrazione_area ia JOIN area a ON a.chiave = ia.area_chiave WHERE a.dungeon_chiave = 'okumura') legami`)[0];
(async () => {
  const fase = process.argv[2];
  log(`== fase ${fase} · ${new Date().toISOString()}`);
  if (fase === 'aree') {
    log('Okumura prima', J(okumuraConti()));
    // F3-19 «Aggiungi area» con immagine e un'infiltrazione da collegare
    let r = await req('POST', `/api/aree/dungeon/${K}?nome=${encodeURIComponent('Prova funzionali L3')}&etichetta=Livello%201&infiltrazioni=okumura-05-linea-esportazioni`, png());
    log('F3-19 POST /api/aree/dungeon/okumura', r.s, J(r.d ?? r.e, 900));
    st.slugA = r.d?.slug ?? r.d?.area?.slug; salva();
    const a = await areaRiassunto(st.slugA); log('nella scheda:', J(a && { slug: a.slug, nome: a.nome, ordine: a.ordine, origine: a.origine, planimetrie: a.numeroPlanimetrie, predefinita: a.predefinita, casa: a.casa, inf: a.infiltrazioni.map((i) => i.chiave) }));
    const det = await get(`/api/aree/dungeon/${K}/${st.slugA}`); log('dettaglio area:', J(det && { nome: det.nome, predefinita: det.predefinita, versioni: (det.versioni ?? det.planimetrie)?.map((v) => [v.chiave, v.etichetta, v.tipo]) }, 800));
    st.mappaA1 = a?.predefinita; salva();
    // F3-20 «Aggiungi planimetria»: ruolo dedotto
    r = await req('POST', `/api/aree/dungeon/${K}/${st.slugA}/planimetrie?etichetta=Livello%202`, png(80, 60, [40, 40, 200]));
    log('F3-20 POST …/planimetrie', r.s, J(r.d ?? r.e, 700));
    const det2 = await get(`/api/aree/dungeon/${K}/${st.slugA}`); const vv = det2?.versioni ?? det2?.planimetrie ?? [];
    log('versioni ora:', J(vv.map((v) => [v.chiave, v.etichetta, v.tipo, v.ordine])));
    st.mappaA2 = vv.map((v) => v.chiave).find((c) => c !== st.mappaA1); salva();
    log('ruolo nel DB:', J(q("SELECT chiave, tipo, genitore_chiave, area_chiave, versione_etichetta, versione_ordine, origine FROM mappa WHERE area_chiave = ?", `dungeon/${K}/${st.slugA}`)));
    // F3-21 «Aggiungi infiltrazione» con le aree toccate
    r = await req('POST', `/api/compendio/dungeon/${K}/aree`, { nome: 'Prova funzionali L3 — infiltrazione', areePalazzo: [st.slugA, 'caserma'] });
    log('F3-21 POST /api/compendio/dungeon/okumura/aree', r.s, J(r.d ?? r.e, 500));
    const sch = await get(`/api/compendio/dungeon/${K}`); const inf = sch.aree.find((x) => /prova-funzionali-l3/.test(x.chiave)); st.infP = inf?.chiave; salva();
    log('infiltrazione nella scheda:', J(inf && { chiave: inf.chiave, nome: inf.nome, ordine: inf.ordine, areePalazzo: inf.areePalazzo ?? inf.areeToccate }), '· aree che la mostrano:', J(sch.areePalazzo.filter((x) => x.infiltrazioni.some((i) => i.chiave === st.infP)).map((x) => x.slug)));
    // F3-22 collegare e scollegare dai due lati
    const conti0 = okumuraConti();
    r = await req('PUT', `/api/aree/dungeon/${K}/interscambio/infiltrazioni`, { infiltrazioni: ['okumura-09-interscambio', st.infP] });
    log('\nF3-22 dall\'area: PUT …/interscambio/infiltrazioni +prova', r.s, J(r.d ?? r.e, 300));
    let infDopo = (await get(`/api/compendio/dungeon/${K}`)).aree.find((x) => x.chiave === st.infP); log('dall\'infiltrazione si vede:', J(infDopo?.areePalazzo ?? infDopo?.areeToccate, 400));
    r = await req('PUT', `/api/compendio/aree/${st.infP}/aree-palazzo`, { aree: [st.slugA, 'caserma'] });
    log('dall\'infiltrazione: PUT …/aree-palazzo senza interscambio', r.s, J(r.d?.areePalazzo ?? r.d ?? r.e, 400));
    log('l\'area interscambio ora:', J((await areaRiassunto('interscambio')).infiltrazioni.map((i) => i.chiave)));
    r = await req('PUT', `/api/compendio/aree/${st.infP}/aree-palazzo`, { aree: ['dungeon/madarame/museo-1p'] });
    log('area di un altro Palazzo dall\'infiltrazione →', r.s, J(r.e));
    r = await req('PUT', `/api/aree/dungeon/${K}/interscambio/infiltrazioni`, { infiltrazioni: ['madarame-01-entrata-del-museo'] });
    log('infiltrazione di un altro Palazzo dall\'area →', r.s, J(r.e));
    log('voci e pin di Okumura prima/dopo i legami:', J(conti0), '→', J(okumuraConti()));
  } else if (fase === 'modifica') {
    // F3-23 rinomina, riordino, predefinita, etichetta
    let r = await req('PUT', `/api/aree/dungeon/${K}/${st.slugA}`, { nome: 'Prova funzionali L3 rinominata' });
    log('F3-23 rinomina', r.s, J(r.d && { nome: r.d.nome, slug: r.d.slug }, 300) ?? J(r.e));
    const ordine = (await get(`/api/compendio/dungeon/${K}`)).areePalazzo.sort((a, b) => a.ordine - b.ordine).map((a) => a.slug);
    st.ordinePrima = ordine; salva();
    const nuovo = [st.slugA, ...ordine.filter((s) => s !== st.slugA)];
    r = await req('PUT', `/api/aree/dungeon/${K}/ordine`, { slug: nuovo }); log('riordino (prova in cima)', r.s, J(r.e));
    r = await req('PUT', `/api/aree/dungeon/${K}/${st.slugA}`, { predefinita: st.mappaA2 }); log('predefinita → seconda', r.s, J(r.e));
    r = await req('PUT', `/api/aree/dungeon/${K}/${st.slugA}/planimetrie`, { etichette: { [st.mappaA2]: 'Livello alto' }, ordine: [st.mappaA2, st.mappaA1] }); log('etichetta e ordine versioni', r.s, J(r.e));
    const a = await areaRiassunto(st.slugA); log('scheda:', J({ nome: a.nome, ordine: a.ordine, predefinita: a.predefinita }), '· prima nell\'elenco:', (await get(`/api/compendio/dungeon/${K}`)).areePalazzo.sort((x, y) => x.ordine - y.ordine)[0].slug);
    const det = await get(`/api/aree/dungeon/${K}/${st.slugA}`); log('dettaglio:', J({ nome: det.nome, predefinita: det.predefinita, versioni: (det.versioni ?? det.planimetrie).map((v) => [v.chiave, v.etichetta]) }, 600));
    const inf = (await get(`/api/compendio/dungeon/${K}`)).aree.find((x) => x.chiave === st.infP); log('nell\'infiltrazione:', J(inf?.areePalazzo ?? inf?.areeToccate, 300));
    log('risolvi della seconda versione:', J(await get(`/api/mappe/risolvi/${st.mappaA2}`)));
    const mappe = await get(`/api/mappe/albero`); const t = JSON.stringify(mappe ?? null); const nodo = (mappe ?? []).filter((m) => (m.chiave ?? '').startsWith('palazzo-di-okumura-prova-funzionali-l3')); log('albero delle mappe: nome nuovo', t.includes('Prova funzionali L3 rinominata'), '· etichetta', t.includes('Livello alto'), '· nodi', J(nodo.map((m) => ({ chiave: m.chiave, nome: m.nome, nomeCompleto: m.nomeCompleto, area: m.area })), 500));
    const cerca = await req('GET', `/api/compendio/cerca?q=${encodeURIComponent('Prova funzionali L3 rinominata')}`); log('ricerca', cerca.s, J(cerca.d, 300));
    // F3-26 rinomina di un'area seed e «Ripristina»; un'area utente → 409
    log('\nF3-26 caserma prima:', J(q("SELECT nome, nome_rivisto, origine, seed_json FROM area WHERE chiave = 'dungeon/okumura/caserma'")));
    r = await req('PUT', `/api/aree/dungeon/${K}/caserma`, { nome: 'Caserma (prova L3)' }); log('rinomina seed', r.s, J(r.e));
    log('dopo la rinomina:', J(q("SELECT nome, nome_rivisto, origine, seed_json FROM area WHERE chiave = 'dungeon/okumura/caserma'")));
    r = await req('POST', `/api/aree/dungeon/${K}/caserma/ripristina`); log('Ripristina', r.s, J(r.d?.nome ?? r.e));
    log('dopo Ripristina:', J(q("SELECT nome, nome_rivisto, origine, seed_json FROM area WHERE chiave = 'dungeon/okumura/caserma'")));
    r = await req('POST', `/api/aree/dungeon/${K}/${st.slugA}/ripristina`); log('Ripristina su area utente →', r.s, J(r.e));
  } else if (fase === 'cestino') {
    const legami = () => q('SELECT infiltrazione_chiave, area_chiave, ordine, planimetria_iniziale FROM infiltrazione_area WHERE area_chiave = ? ORDER BY infiltrazione_chiave', `dungeon/${K}/${st.slugA}`);
    const versioni = () => q('SELECT chiave, versione_etichetta, versione_ordine FROM mappa WHERE area_chiave = ? ORDER BY chiave', `dungeon/${K}/${st.slugA}`);
    const prima = { legami: legami(), versioni: versioni(), area: q('SELECT chiave, nome, ordine, planimetria_predefinita, origine FROM area WHERE chiave = ?', `dungeon/${K}/${st.slugA}`) };
    log('F3-24 area prima:', J(prima, 900));
    let r = await req('DELETE', `/api/aree/dungeon/${K}/${st.slugA}`); log('DELETE senza conferma', r.s, J(r.e));
    r = await req('DELETE', `/api/aree/dungeon/${K}/${st.slugA}?conferma=1`); log('DELETE ?conferma=1', r.s);
    let c = await get('/api/impostazioni/cestino'); const voce = c.find((x) => /Prova funzionali L3/.test(x.nome ?? '') && /area/.test(x.tipo ?? '')) ?? c[0];
    log('cestino:', J(c.map((x) => [x.id, x.tipo, x.nome])), '· area ancora nella scheda:', !!(await areaRiassunto(st.slugA)));
    r = await req('POST', `/api/impostazioni/cestino/${voce.id}/ripristina`); log('ripristino', r.s, J(r.e));
    const dopo = { legami: legami(), versioni: versioni(), area: q('SELECT chiave, nome, ordine, planimetria_predefinita, origine FROM area WHERE chiave = ?', `dungeon/${K}/${st.slugA}`) };
    log('dopo il ripristino identica:', JSON.stringify(prima) === JSON.stringify(dopo), J(dopo, 900));
    // planimetria → cestino → ripristino
    r = await req('DELETE', `/api/mappe/${st.mappaA1}`); log('\nDELETE planimetria', st.mappaA1, r.s, J(r.e));
    c = await get('/api/impostazioni/cestino'); const vm = c.find((x) => (x.chiave ?? '').includes(st.mappaA1) || /Livello 1|Prova funzionali/.test(x.nome ?? '')); log('cestino:', J(c.map((x) => [x.id, x.tipo, x.nome, x.chiave])));
    log('versioni senza:', J(versioni()));
    if (vm) { r = await req('POST', `/api/impostazioni/cestino/${vm.id}/ripristina`); log('ripristino', r.s, J(r.e), '· versioni:', J(versioni())); }
    // infiltrazione → cestino → ripristino
    const vociInf = () => q('SELECT count(*) n FROM punto_interesse WHERE area_chiave = ?', st.infP)[0].n;
    const legInf = () => q('SELECT area_chiave FROM infiltrazione_area WHERE infiltrazione_chiave = ? ORDER BY ordine', st.infP).map((x) => x.area_chiave);
    log('\ninfiltrazione prima: voci', vociInf(), 'legami', J(legInf()));
    r = await req('DELETE', `/api/compendio/aree/${st.infP}`); log('DELETE infiltrazione', r.s, J(r.e));
    c = await get('/api/impostazioni/cestino'); const vi = c.find((x) => /Prova funzionali L3 — infiltrazione/.test(x.nome ?? '')); log('cestino:', J(c.map((x) => [x.id, x.tipo, x.nome])), '· legami dopo DELETE', J(legInf()));
    if (vi) { r = await req('POST', `/api/impostazioni/cestino/${vi.id}/ripristina`); log('ripristino', r.s, J(r.e), '· legami', J(legInf()), 'voci', vociInf()); }
    // F3-25: POST /api/mappe sotto il Palazzo e le rotte vecchie
    r = await req('POST', '/api/mappe', { nome: 'Prova funzionali L3 mappa', tipo: 'luogo', genitore: 'dungeon-okumura' }); log('\nF3-25 POST /api/mappe sotto dungeon-okumura →', r.s, J(r.e));
    r = await req('PUT', `/api/mappe/${st.mappaA2}/aree`, { aree: ['okumura-05-linea-esportazioni'] }); log('rotta vecchia /aree', r.s, J(r.d ?? r.e, 300), '· legami dell\'area:', J(legami().map((x) => x.infiltrazione_chiave)));
    r = await req('PUT', `/api/mappe/${st.mappaA2}/presentazione`, { etichetta: 'Livello alto (presentazione)' }); log('rotta vecchia /presentazione', r.s, J(r.e), '· versioni:', J(versioni()));
  } else if (fase === 'correzioni') {
    // §3.6.1: un'area B con una sola planimetria; «Colloca» della sua unica versione nell'area A
    let r = await req('POST', `/api/aree/dungeon/${K}?nome=${encodeURIComponent('Prova funzionali L3 B')}`, png(50, 50, [40, 160, 40]));
    st.slugB = r.d?.slug; salva(); const b = await areaRiassunto(st.slugB); st.mappaB = b?.predefinita; salva();
    log('area B', r.s, st.slugB, st.mappaB);
    r = await req('PUT', `/api/aree/colloca`, { mappa: st.mappaB, dungeon: K, nuova: { nome: 'Prova L3 nuova' } }); log('«Rendila un\'area a sé» sull\'unica versione →', r.s, J(r.e));
    r = await req('PUT', `/api/aree/colloca`, { mappa: st.mappaB, dungeon: K, area: st.slugA, etichetta: 'Da B' }); log('Colloca unica versione di B in A →', r.s, J(r.e, 400));
    r = await req('PUT', `/api/aree/colloca?conferma=1`, { mappa: st.mappaB, dungeon: K, area: st.slugA, etichetta: 'Da B' }); log('con ?conferma=1 →', r.s, J(r.e ?? (r.d && { slug: r.d.slug, nome: r.d.nome }), 300));
    log('B nella scheda:', !!(await areaRiassunto(st.slugB)), '· versioni di A:', J(q('SELECT chiave, versione_etichetta FROM mappa WHERE area_chiave = ?', `dungeon/${K}/${st.slugA}`)));
    const c = await get('/api/impostazioni/cestino'); const vb = c.find((x) => /Prova funzionali L3 B/.test(x.nome ?? '')); log('cestino:', J(c.map((x) => [x.id, x.tipo, x.nome, x.dettaglio ?? x.descrizione]), 700));
    if (vb) { r = await req('POST', `/api/impostazioni/cestino/${vb.id}/ripristina`); log('ripristino di B', r.s, J(r.e), '· B:', J(await areaRiassunto(st.slugB) && { planimetrie: (await areaRiassunto(st.slugB)).numeroPlanimetrie }), J(q('SELECT count(*) n FROM mappa WHERE area_chiave = ?', `dungeon/${K}/${st.slugB}`))); }
    // /stanza: il nome dato non sovrascrive quello scelto dall'utente (A è stata rinominata dall'utente)
    const nomeA = q('SELECT nome, nome_rivisto FROM area WHERE chiave = ?', `dungeon/${K}/${st.slugA}`)[0];
    r = await req('PUT', `/api/mappe/${st.mappaB}/stanza`, { con: st.mappaA2, nome: 'Nome dato dalla rotta vecchia' }); log('\n/stanza con nome →', r.s, J(r.e), '· A prima', J(nomeA), 'dopo', J(q('SELECT nome, nome_rivisto FROM area WHERE chiave = ?', `dungeon/${K}/${st.slugA}`)));
  } else if (fase === 'extra') {
    // §3.6.1 con legami: area C con un'infiltrazione, svuotata con conferma, poi dal cestino torna vuota con i legami
    let r = await req('POST', `/api/aree/dungeon/${K}?nome=${encodeURIComponent('Prova funzionali L3 C')}&infiltrazioni=okumura-03-caserma`, png(40, 40, [160, 160, 40]));
    const slugC = r.d?.slug; const mappaC = r.d?.predefinita; log('area C', r.s, slugC, mappaC, J(r.d?.infiltrazioni?.map((i) => i.chiave)));
    r = await req('PUT', `/api/aree/colloca`, { mappa: mappaC, dungeon: K, area: st.slugA }); log('Colloca senza conferma →', r.s, J(r.e?.details));
    r = await req('PUT', `/api/aree/colloca?conferma=1`, { mappa: mappaC, dungeon: K, area: st.slugA }); log('con conferma →', r.s);
    const c = await get('/api/impostazioni/cestino'); const vc = c.find((x) => /Prova funzionali L3 C/.test(x.nome ?? '')); log('cestino', J(vc));
    r = await req('POST', `/api/impostazioni/cestino/${vc.id}/ripristina`); log('ripristino', r.s, '· C:', J(q('SELECT (SELECT count(*) FROM mappa WHERE area_chiave = a.chiave) planimetrie, (SELECT group_concat(infiltrazione_chiave) FROM infiltrazione_area WHERE area_chiave = a.chiave) legami FROM area a WHERE chiave = ?', `dungeon/${K}/${slugC}`)));
    // cestino di un'area seed con pin e voci collegate: caserma
    const fotoCaserma = () => ({ mappe: q("SELECT chiave, versione_etichetta, versione_ordine FROM mappa WHERE area_chiave = 'dungeon/okumura/caserma' ORDER BY chiave"), pin: q("SELECT s.id, s.uid, s.x, s.y, s.nome FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave WHERE m.area_chiave = 'dungeon/okumura/caserma' ORDER BY s.id"), sv: q("SELECT sv.* FROM spillo_voce sv JOIN spillo s ON s.id = sv.spillo_id JOIN mappa m ON m.chiave = s.mappa_chiave WHERE m.area_chiave = 'dungeon/okumura/caserma' ORDER BY 1, 2"), legami: q("SELECT * FROM infiltrazione_area WHERE area_chiave = 'dungeon/okumura/caserma' ORDER BY infiltrazione_chiave"), area: q("SELECT * FROM area WHERE chiave = 'dungeon/okumura/caserma'"), voci: q("SELECT count(*) n FROM punto_interesse WHERE area_chiave = 'okumura-03-caserma'") });
    const p = fotoCaserma(); log('\ncaserma prima', J({ mappe: p.mappe.length, pin: p.pin.length, spillo_voce: p.sv.length, legami: p.legami.length, voci: p.voci }));
    r = await req('DELETE', `/api/aree/dungeon/${K}/caserma?conferma=1`); log('DELETE caserma', r.s, J(r.e));
    const c2 = await get('/api/impostazioni/cestino'); const vk = c2.find((x) => x.nome === 'Caserma'); log('cestino', J(vk), '· dopo:', J({ mappe: fotoCaserma().mappe.length, pin: fotoCaserma().pin.length, voci: fotoCaserma().voci }));
    r = await req('POST', `/api/impostazioni/cestino/${vk.id}/ripristina`); log('ripristino', r.s, J(r.e));
    const d = fotoCaserma(); for (const k of Object.keys(p)) log(`  ${k} identico:`, JSON.stringify(p[k]) === JSON.stringify(d[k]), JSON.stringify(p[k]) === JSON.stringify(d[k]) ? '' : J({ prima: p[k], dopo: d[k] }, 600));
  } else if (fase === 'diario') {
    const voce = async (g, filtro) => { const d = await get(`/api/compendio/percorso/${g}?partita=1`); const tutte = JSON.parse(JSON.stringify(d)); const out = []; const visita = (x) => { if (x && typeof x === 'object') { if (x.uid && x.azione !== undefined) out.push(x); for (const v of Object.values(x)) visita(v); } }; visita(tutte); return out.filter(filtro); };
    // «Conferma» su 05-19 (proposta certa), poi insieme vuoto (comportamento di prima)
    const [v] = await voce('05-19', (x) => /Scopri dov/.test(x.azione)); log('05-19', v.uid, 'proposta', J(v.propostaInfiltrazioni?.infiltrazioni?.map((i) => i.chiave)), 'insieme', J(v.infiltrazioni));
    let r = await req('PUT', `/api/compendio/percorso/voci/${v.uid}?partita=1`, { infiltrazioni: v.propostaInfiltrazioni.infiltrazioni.map((i) => i.chiave) });
    log('Conferma', r.s, J(r.e), '· insieme', J(r.d?.infiltrazioni), '· voce_infiltrazione', J(q('SELECT * FROM voce_infiltrazione WHERE voce_uid = ?', v.uid)), '· collegamento', J(r.d?.collegamento ?? r.d?.link, 300));
    r = await req('PUT', `/api/compendio/percorso/voci/${v.uid}?partita=1`, { infiltrazioni: [] }); log('insieme vuoto', r.s, '· righe', q('SELECT count(*) n FROM voce_infiltrazione WHERE voce_uid = ?', v.uid)[0].n, '· proposta di nuovo', !!r.d?.propostaInfiltrazioni);
    // ripetizione non consecutiva sì, consecutiva no (11-13)
    const [n] = await voce('11-13', (x) => /Palazzo di Sae/.test(x.azione)); const p = n.propostaInfiltrazioni.infiltrazioni.map((i) => i.chiave);
    r = await req('PUT', `/api/compendio/percorso/voci/${n.uid}?partita=1`, { infiltrazioni: [p[0], p[1], p[0]] }); log('\n11-13 non consecutiva', r.s, J(r.e));
    r = await req('PUT', `/api/compendio/percorso/voci/${n.uid}?partita=1`, { infiltrazioni: [p[0], p[0]] }); log('11-13 consecutiva →', r.s, J(r.e));
    r = await req('PUT', `/api/compendio/percorso/voci/${n.uid}?partita=1`, { infiltrazioni: [] }); log('11-13 vuoto', r.s);
    // «Da rivedere»: rimetti (06-20, ha il testo precedente), tieni (08-03), fatto (06-26)
    for (const [g, esito, rx] of [['06-20', 'rimetti', /Kaneshiro/], ['08-03', 'tieni', /Futaba/], ['06-26', 'fatto', /lettera di sfida/]]) {
      const [x] = await voce(g, (y) => rx.test(y.azione) && y.daRivedere); if (!x) { log(g, 'voce da rivedere non trovata'); continue; }
      const primaDb = q('SELECT azione, da_rivedere, testo_precedente_json FROM voce_giornata WHERE uid = ?', x.uid)[0];
      r = await req('POST', `/api/compendio/percorso/voci/${x.uid}/rivista?partita=1`, { esito });
      log(`\n${g} «${esito}»`, r.s, J(r.e), '· prima', J({ azione: primaDb.azione.slice(0, 60), da: primaDb.da_rivedere, prec: primaDb.testo_precedente_json?.slice(0, 80) }), '· dopo', J(q('SELECT substr(azione,1,60) azione, da_rivedere, testo_precedente_json FROM voce_giornata WHERE uid = ?', x.uid)[0], 300));
    }
    r = await req('POST', `/api/compendio/percorso/voci/${v.uid}/rivista?partita=1`, { esito: 'rimetti' }); log('\nrimetti su una voce senza testo precedente →', r.s, J(r.e));
  } else if (fase === 'partita') {
    // F3-27: partita di prova; segnare e togliere una voce dalla guida e un pin dalla mappa in un'area di Okumura
    let r; if (!st.partita) { r = await req('POST', '/api/partite', { nome: 'Prova funzionali L3' }); st.partita = r.d.id; salva(); log('partita di prova', r.s, st.partita, 'attiva', r.d.attiva); } else log('partita di prova già creata', st.partita);
    // le voci di Okumura non hanno pin: si usa Madarame (si scrive solo nella partita di prova)
    const KP = 'madarame'; const SLUG = 'museo-2p';
    const P = st.partita; const scheda = await get(`/api/compendio/dungeon/${KP}?partita=${P}`);
    const mappeArea = new Set(q('SELECT chiave FROM mappa WHERE area_chiave = ?', `dungeon/${KP}/${SLUG}`).map((x) => x.chiave));
    const inf = scheda.aree.find((a) => a.chiave === 'madarame-scopri-dove-il-tesoro'); const v = inf.punti.find((x) => x.chiave === 'madarame-scopri-dove-il-tesoro-saccheggia-rasetsu-ofuda') ?? inf.punti.find((x) => x.tipo === 'forziere' && (x.pin ?? []).length === 1 && [...mappeArea].some((m) => x.pin[0].mappa.endsWith(m) || x.pin[0].mappa.includes(m.replace('nativo-', ''))));
    const pin = (v ?? inf.punti.find((x) => x.carattere === 'permanente' && (x.pin ?? []).length)).pin[0]; const voceK = (v ?? inf.punti.find((x) => x.carattere === 'permanente' && (x.pin ?? []).length)).chiave; log('voce', voceK, 'pin', J(pin));
    const statoTutto = async () => { const s = await get(`/api/compendio/dungeon/${KP}?partita=${P}`); const a = s.areePalazzo.find((x) => x.slug === SLUG); const vv = s.aree.flatMap((x) => x.punti).find((x) => x.chiave === voceK); const m = await get(`/api/mappe/${pin.mappa}?partita=${P}`); const sp = m.spilli.find((x) => x.id === pin.id); const det = await get(`/api/aree/dungeon/${KP}/${SLUG}?partita=${P}`); return { voce: vv.stato, pin: sp.raccolto, areaRaccolta: a.raccolta, areaDettaglio: det?.raccolta ?? det?.completamento, scheda: s.completamento }; };
    const v2 = { chiave: voceK };
    log('prima', J(await statoTutto()));
    r = await req('PUT', `/api/partite/${P}/punti`, { punto: voceK, stato: 'ottenuto' }); log('segno dalla guida', r.s, J(await statoTutto()));
    r = await req('PUT', `/api/partite/${P}/punti`, { punto: voceK, stato: null }); log('tolgo dalla guida', r.s, J(await statoTutto()));
    r = await req('PUT', `/api/partite/${P}/spilli/${pin.id}`, { raccolto: true }); log('spunta dal pin', r.s, J(await statoTutto()));
    r = await req('PUT', `/api/partite/${P}/spilli/${pin.id}`, { raccolto: false }); log('tolgo dal pin', r.s, J(await statoTutto()));
    r = await req('DELETE', `/api/partite/${P}`); log('DELETE partita', r.s, '· partite', J((await get('/api/partite')).map((p) => [p.id, p.nome, p.attiva])));
    const u = db('partite.db'); log('righe residue', J(['punto_partita', 'spillo_partita', 'divergenza_partita'].map((t) => [t, u.prepare(`SELECT count(*) n FROM ${t} WHERE partita_id = ?`).get(P).n]))); u.close();
  } else if (fase === 'importa') {
    // F3-10 export/import di un Palazzo (Okumura) con sovrascrivi; idCambiati
    const foto = () => ({ aree: q("SELECT chiave, nome, nome_rivisto, ordine, planimetria_predefinita, origine, seed_json, da_verificare FROM area WHERE dungeon_chiave = 'okumura' ORDER BY chiave"),
      mappe: q("SELECT chiave, nome, tipo, genitore_chiave, ordine, area_chiave, versione_etichetta, versione_ordine, immagine_chiave, asset, origine, nome_rivisto FROM mappa WHERE area_chiave LIKE 'dungeon/okumura/%' OR chiave = 'dungeon-okumura' ORDER BY chiave"),
      legami: q("SELECT ia.* FROM infiltrazione_area ia JOIN area a ON a.chiave = ia.area_chiave WHERE a.dungeon_chiave = 'okumura' ORDER BY ia.infiltrazione_chiave, ia.area_chiave"),
      pin: q("SELECT s.id, s.uid, s.mappa_chiave, s.nome, s.tipo, s.x, s.y, s.origine FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave WHERE m.area_chiave LIKE 'dungeon/okumura/%' ORDER BY s.uid") });
    const a = foto(); log('prima', J({ aree: a.aree.length, mappe: a.mappe.length, legami: a.legami.length, pin: a.pin.length }));
    const re = await fetch(B + '/api/mappe/esporta?radice=dungeon-okumura'); const testo = await re.text(); const pac = JSON.parse(testo).data ?? JSON.parse(testo);
    log('export', re.status, Math.round(testo.length / 1e6) + ' MB', '· mappe', pac.mappe?.length, '· aree', pac.aree?.length, '· legami', (pac.infiltrazioniAree ?? pac.legami ?? pac.infiltrazioneArea)?.length, '· chiavi', Object.keys(pac).join(','));
    const ri = await fetch(B + '/api/mappe/importa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pacchetto: pac, sovrascrivi: true }) });
    const esito = await ri.json(); log('import con sovrascrivi', ri.status, J(esito.data ? { ...esito.data, idCambiati: esito.data.idCambiati?.length ?? esito.data.idCambiati } : esito, 700), '· idCambiati esempio', J(esito.data?.idCambiati?.slice?.(0, 3)));
    const b = foto(); for (const k of Object.keys(a)) { const sa = a[k].map((x) => JSON.stringify(x)); const sb = new Set(b[k].map((x) => JSON.stringify(x))); const diverse = sa.filter((x) => !sb.has(x)); log(`${k}: ${a[k].length} → ${b[k].length}, righe cambiate ${diverse.length}`, diverse.length ? J({ prima: diverse.slice(0, 2), dopo: b[k].map((x) => JSON.stringify(x)).filter((x) => !new Set(sa).has(x)).slice(0, 2) }, 900) : ''); }
  }
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
