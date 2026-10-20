// L4 sul 3201, partita di prova «Prova funzionali L4» (scrive solo in partite.db, solo sulla partita di prova).
// Uso: node l4-prova.cjs crea | madarame | kamoshida | completa | effetti | pulisci
const fs = require('fs');
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));
const B = 'http://localhost:3201';
const FILE_ID = path.join(__dirname, 'l4-prova-id.txt');
const req = async (metodo, p, corpo) => { const r = await fetch(B + p, { method: metodo, headers: corpo ? { 'content-type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* vuoto */ } return { s: r.status, j, t }; };
const get = async (p) => (await req('GET', p)).j?.data;
const leggiU = (sql, ...p) => { const db = new Database(path.join(radice, 'data/partite.db'), { readonly: true }); const r = db.prepare(sql).all(...p); db.close(); return r; };
const log = (...a) => console.log(...a);
const partite = async () => (await get('/api/partite')).map((p) => `${p.id}:${p.nome}:${p.attiva ? 'ATTIVA' : '-'}`).join(' | ');
const ID = () => Number(fs.readFileSync(FILE_ID, 'utf8'));
const voce = async (k, chiave, inf) => { const d = await get(`/api/compendio/dungeon/${k}?partita=${ID()}${inf ? `&infiltrazione=${inf}` : ''}`); for (const a of d.aree) for (const v of a.punti ?? []) if (v.chiave === chiave) return v; return null; };
const stati = async (k, chiavi, inf) => { const d = await get(`/api/compendio/dungeon/${k}?partita=${ID()}${inf ? `&infiltrazione=${inf}` : ''}`); const m = {}; for (const a of d.aree) for (const v of a.punti ?? []) if (chiavi.includes(v.chiave)) m[v.chiave] = v.stato; return { m, completamento: d.completamento, completato: d.completato }; };
const pin = async (mappa, id, inf) => { const d = await get(`/api/mappe/${mappa}?partita=${ID()}${inf ? `&infiltrazione=${inf}` : ''}`); const s = d.spilli.find((x) => x.id === id); return s ? { raccolto: s.raccolto, contesto: s.contestoInfiltrazione, statoProprio: s.statoProprio, daVerificare: s.daVerificare, disp: s.disponibilita?.stato, dettaglio: s.dettaglio, voci: (s.voci ?? []).map((v) => `${v.chiave.slice(-38)}=${v.stato}`) } : null; };
const righeSp = (uid) => leggiU('SELECT raccolto FROM spillo_partita WHERE partita_id = ? AND spillo_uid = ?', ID(), uid);
const punto = async (chiave, stato) => { const r = await req('PUT', `/api/partite/${ID()}/punti`, { punto: chiave, stato }); return `${r.s}${r.s >= 400 ? ' ' + r.t.slice(0, 200) : ''}`; };
const spillo = async (id, raccolto, infiltrazione) => { const r = await req('PUT', `/api/partite/${ID()}/spilli/${id}`, infiltrazione ? { raccolto, infiltrazione } : { raccolto }); return `${r.s}${r.s >= 400 ? ' ' + r.t.slice(0, 200) : ''}`; };
const J = (x) => JSON.stringify(x);
const M = 'madarame';
(async () => {
  const fase = process.argv[2];
  if (fase === 'crea') {
    log('partite prima:', await partite());
    const r = await req('POST', '/api/partite', { nome: 'Prova funzionali L4' });
    log('POST /api/partite', r.s, 'id', r.j?.data?.id, 'attiva', r.j?.data?.attiva);
    fs.writeFileSync(FILE_ID, String(r.j.data.id));
    log('partite dopo:', await partite());
  } else if (fase === 'madarame') {
    log('partita di prova', ID(), '·', await partite());
    // F4-04 / R4-03, R4-18: forziere permanente su pin condiviso (2159), segnato nella 2ª (scopri) → fatto nella 4ª (profondità)
    const V2 = 'madarame-scopri-dove-il-tesoro-visita-ai-bagni', V4 = 'madarame-nelle-profondita-del-museo-visita-ai-bagni-2';
    log('\n== F4-04 prima', J(await stati(M, [V2, V4])), '· pin 2159', J(await pin('nativo-rmap-153-3-0', 2159)));
    log('PUT punti', V2, 'ottenuto →', await punto(V2, 'ottenuto'));
    log('dopo', J(await stati(M, [V2, V4])), '· pin 2159', J(await pin('nativo-rmap-153-3-0', 2159)), '· righe spillo_partita 2159', J(righeSp('c035260cd66073071d61b0d020476810')));
    log('righe punto_partita della prova:', J(leggiU('SELECT punto_chiave, stato, automatico FROM punto_partita WHERE partita_id = ?', ID())));
    // F4-07 / R4-06: togliere la spunta al pin del permanente riapre l'oggetto intero
    log('\n== F4-07 PUT spilli/2159 raccolto:false →', await spillo(2159, false));
    log('dopo', J(await stati(M, [V2, V4])), '· pin 2159', J(await pin('nativo-rmap-153-3-0', 2159)), '· righe punto_partita', J(leggiU('SELECT punto_chiave, stato FROM punto_partita WHERE partita_id = ?', ID())));
    // F4-09 / R4-09: pin 737 (3 voci permanenti di 3 infiltrazioni) fatto dalle voci, senza riga in spillo_partita
    const P737 = ['madarame-01-entrata-del-museo/1', 'madarame-scopri-dove-il-tesoro-lucernario-aperto', 'madarame-nelle-profondita-del-museo-lucernario-aperto-2'];
    log('\n== F4-09 prima', J(await stati(M, P737)), '· pin 737', J(await pin('nativo-rmap-153-1-0', 737)));
    log('PUT punti', P737[0], '→', await punto(P737[0], 'ottenuto'));
    log('dopo una sola voce', J(await stati(M, P737)), '· pin 737', J(await pin('nativo-rmap-153-1-0', 737)));
    const uid737 = leggiU("SELECT 1").length && (await get('/api/mappe/nativo-rmap-153-1-0?partita=' + ID())).spilli.find((x) => x.id === 737).uid;
    log('righe spillo_partita del 737:', J(righeSp(uid737)));
    // F4-08 / R4-07: esaurito su non esauribile → 400; su esauribile (atrio/2, forziere permanente) → fatto, pin 786/2203/2204
    log('\n== F4-08 esaurito su', P737[1], '(non esauribile) →', await punto(P737[1], 'esaurito'));
    const A2 = 'madarame-06-sala-del-tesoro-atrio/2';
    log('esaurito su', A2, '(esauribile) →', await punto(A2, 'esaurito'), '·', J(await stati(M, [A2])));
    // F4-10 / R4-10: pin di sole descrittive (2102) e pin senza voci (2085): stato proprio in spillo_partita
    log('\n== F4-10 PUT spilli/2102 (sole descrittive) →', await spillo(2102, true), '· pin', J(await pin('nativo-rmap-153-2-0', 2102)), '· righe', J(righeSp((await get('/api/mappe/nativo-rmap-153-2-0?partita=' + ID())).spilli.find((x) => x.id === 2102).uid)));
    log('PUT spilli/2085 (senza voci) →', await spillo(2085, true), '· pin', J(await pin('nativo-rmap-153-1-0', 2085)), '· righe', J(righeSp('cd7cba58814066035b34fcfd6701449c')));
    // F4-05 / F4-06 / R4-04, R4-05: rigenerabile del pin 2090 (voci di 1ª, 2ª e 4ª) raccolto nella 2ª
    const R1 = 'madarame-01-entrata-del-museo/0', R2 = 'madarame-scopri-dove-il-tesoro-installazioni-artistiche', R4 = 'madarame-nelle-profondita-del-museo-installazioni-artistiche-2';
    log('\n== F4-05 PUT punti', R2, '→', await punto(R2, 'ottenuto'));
    log('voci', J(await stati(M, [R1, R2, R4])));
    for (const inf of ['madarame-scopri-dove-il-tesoro', 'madarame-nelle-profondita-del-museo', 'madarame-01-entrata-del-museo', null]) log(`F4-06 pin 2090 infiltrazione=${inf}`, J(await pin('nativo-rmap-153-1-0', 2090, inf)));
    log('F4-06 voce R4 guardando la 4ª', J((await voce(M, R4, 'madarame-nelle-profondita-del-museo'))?.stato), '· voce R2 guardando la 2ª', J((await voce(M, R2, 'madarame-scopri-dove-il-tesoro'))?.stato));
    // spunta del pin 2090 con contesto 4ª: segna la voce della 4ª
    log('PUT spilli/2090 {raccolto:true, infiltrazione: 4ª} →', await spillo(2090, true, 'madarame-nelle-profondita-del-museo'), '· voci', J(await stati(M, [R1, R2, R4])));
    // F4-11 / R4-11: pin 2201 con due voci esauribili; una esaurita, spunta → segna l'altra; togliere → riapre tutte, esaurito compreso
    const E1 = 'madarame-06-sala-del-tesoro-atrio/0', E2 = 'madarame-il-furto-del-cuore-di-madarame-affronta-agente-della-security';
    const mappa2201 = 'nativo-rmap-153-9-0';
    const trovaMappa = async (id) => { for (const m of ['nativo-rmap-153-6-0', 'nativo-rmap-153-6-1', 'nativo-rmap-153-7-0', 'nativo-rmap-153-7-1', 'nativo-rmap-153-7-2', 'nativo-rmap-153-9-0', 'nativo-rmap-153-9-1', 'nativo-rmap-153-9-2']) { const d = await get(`/api/mappe/${m}?partita=${ID()}`); if (d.spilli.some((x) => x.id === id)) return m; } return mappa2201; };
    const m2201 = await trovaMappa(2201);
    log('\n== F4-11 pin 2201 su', m2201, J(await pin(m2201, 2201)));
    log('PUT punti', E1, 'esaurito →', await punto(E1, 'esaurito'), '·', J(await stati(M, [E1, E2])));
    log('PUT spilli/2201 raccolto:true →', await spillo(2201, true), '·', J(await stati(M, [E1, E2])), '· pin', J(await pin(m2201, 2201)));
    log('PUT spilli/2201 raccolto:false →', await spillo(2201, false), '·', J(await stati(M, [E1, E2])), '· pin', J(await pin(m2201, 2201)));
    // F4-22 (parte condizioni): «Mona» 2155 chiede i pin 2143, 2149 (dalle voci), 2152 (sole descrittive) e la voce «Sblocca Laser»
    log('\n== condizioni di Mona 2155 prima', J(await pin('nativo-rmap-153-3-0', 2155)));
    log('voci premi-interruttore-1/2 →', await punto('madarame-scopri-dove-il-tesoro-premi-interruttore-1', 'ottenuto'), await punto('madarame-scopri-dove-il-tesoro-premi-interruttore-2', 'ottenuto'), '· spilli/2152 →', await spillo(2152, true), '· voce sblocca-laser →', await punto('madarame-scopri-dove-il-tesoro-sblocca-laser', 'ottenuto'));
    const d33 = await get(`/api/mappe/nativo-rmap-153-3-0?partita=${ID()}`); const mona = d33.spilli.find((x) => x.id === 2155);
    log('Mona dopo', J(mona.disponibilita), '· pin 2143', J(await pin('nativo-rmap-153-3-0', 2143)), '· righe spillo_partita 2143', J(righeSp('885d16464d9f3bec08ed333fa46eb28f')));
    log('\nrighe della prova: punto_partita', leggiU('SELECT count(*) n FROM punto_partita WHERE partita_id = ?', ID())[0].n, '· spillo_partita', J(leggiU('SELECT spillo_uid, raccolto FROM spillo_partita WHERE partita_id = ?', ID())), '· divergenze', J(await get(`/api/partite/${ID()}/divergenze?dungeon=madarame`)));
  } else if (fase === 'extra') {
    // F4-08: l'esaurito di atrio/2 sui suoi pin (786, 2203, 2204) e sulle altre voci dell'oggetto
    const A2 = 'madarame-06-sala-del-tesoro-atrio/2';
    const v = await voce(M, A2); log('== F4-08 voce', A2, 'stato', v?.stato, 'oggetto', J(v?.oggetto), 'pin', J(v?.pin));
    const trova = async (id) => { for (const m of ['nativo-rmap-153-6-0', 'nativo-rmap-153-6-1', 'nativo-rmap-153-7-0', 'nativo-rmap-153-7-1', 'nativo-rmap-153-7-2', 'nativo-rmap-153-9-0', 'nativo-rmap-153-9-1', 'nativo-rmap-153-9-2', 'palazzo-di-madarame-il-labirinto-contorto']) { const d = await get(`/api/mappe/${m}?partita=${ID()}`); if (d.spilli.some((x) => x.id === id)) return m; } return null; };
    for (const id of [786, 2203, 2204]) { const m = await trova(id); log(`pin ${id}@${m}`, J(m && await pin(m, id))); }
    // F4-11 con più voci permanenti: pin 777 «Giardino Centrale» (4 voci di 3 infiltrazioni)
    const P777 = ['madarame-scopri-dove-il-tesoro-visita-safe-room-del-giardino', 'madarame-nelle-profondita-del-museo-visita-safe-room-del-giardino', 'madarame-il-furto-del-cuore-di-madarame-visita-safe-room-del-giardino', 'madarame-il-furto-del-cuore-di-madarame-raggiungi-la-sr-stanza-principale'];
    log('\n== F4-11b pin 777 prima', J((await stati(M, P777)).m));
    log('PUT spilli/777 true →', await spillo(777, true), J((await stati(M, P777)).m), '· righe punto_partita', J(leggiU('SELECT punto_chiave, stato FROM punto_partita WHERE partita_id = ? AND punto_chiave IN (' + P777.map(() => '?').join(',') + ')', ID(), ...P777)));
    log('pin 806 (Sala Principale, stesso oggetto)', J(await pin('nativo-rmap-153-9-0', 806)));
    log('PUT spilli/777 false →', await spillo(777, false), J((await stati(M, P777)).m), '· pin 806', J((await pin('nativo-rmap-153-9-0', 806))?.raccolto));
    // pin misto permanente + rigenerabile (dati §4)
    const db = new Database(path.join(radice, 'data/gioco.db'), { readonly: true });
    const misti = db.prepare(`SELECT sv.spillo_id id, s.mappa_chiave m, group_concat(pi.chiave || ':' || coalesce(pi.carattere,'?') || ':' || pi.tipo, ' ; ') v FROM spillo_voce sv JOIN spillo s ON s.id = sv.spillo_id JOIN punto_interesse pi ON pi.chiave = sv.voce_chiave JOIN dungeon_area a ON a.chiave = pi.area_chiave WHERE a.dungeon_chiave = 'madarame' GROUP BY 1 HAVING count(DISTINCT pi.tipo) > 1`).all(); db.close();
    const d = await get(`/api/compendio/dungeon/${M}?partita=${ID()}`); const car = new Map(); for (const a of d.aree) for (const x of a.punti ?? []) car.set(x.chiave, x.carattere);
    const mm = misti.filter((r) => { const cs = new Set(r.v.split(' ; ').map((t) => car.get(t.split(':')[0]))); return cs.has('permanente') && cs.has('rigenerabile'); });
    log('\n== pin misti permanente+rigenerabile:', J(mm));
    if (mm[0]) { const p = mm[0]; const voci = p.v.split(' ; ').map((t) => t.split(':')[0]); log('prima', J(await pin(p.m, p.id)), J((await stati(M, voci)).m)); log('PUT spilli true →', await spillo(p.id, true), J((await stati(M, voci)).m), J(await pin(p.m, p.id))); log('PUT spilli false →', await spillo(p.id, false), J((await stati(M, voci)).m)); }
  } else if (fase === 'kamoshida') {
    const K = 'kamoshida';
    // F4-03 / R4-02: voce storia segnata e tolta, completamento invariato
    const S = 'kamoshida-15-torre-centrale-esci-dal-castello';
    const c0 = (await stati(K, [S])); log('== F4-03 prima', J(c0));
    log('PUT punti storia →', await punto(S, 'ottenuto'), J(await stati(K, [S])));
    log('PUT punti storia null →', await punto(S, null), J(await stati(K, [S])));
    // F4-21 / R4-24: voce permanente su 3 planimetrie (8 pin) conta una volta
    const V = 'kamoshida-01-cancello-del-castello-ingresso-la-rivincita-sui-nemici';
    const v0 = await voce(K, V); log('\n== F4-21 voce', V, 'carattere', v0?.carattere, 'oggetto', J(v0?.oggetto)?.slice(0, 200), 'prima', J((await stati(K, [V])).completamento));
    log('PUT punti →', await punto(V, 'ottenuto'), '· dopo', J((await stati(K, [V]))));
    for (const [id, m] of [[1894, 'nativo-rmap-151-5-1'], [1908, 'nativo-rmap-151-5-2'], [1909, 'nativo-rmap-151-4-1'], [2072, 'nativo-rmap-151-4-1']]) log(`pin ${id}@${m}`, J(await pin(m, id)));
    log('PUT punti null →', await punto(V, null), '·', J((await stati(K, [V])).completamento));
    // F4-13 / R4-13: Enigma «Attraversa la sala da pranzo» con 10 passi
    const EN = 'kamoshida-01-cancello-del-castello-ingresso-attraversa-la-sala-da-pranzo';
    const d = await get(`/api/compendio/dungeon/${K}?partita=${ID()}`); const passi = []; for (const a of d.aree) for (const v of a.punti ?? []) if (v.contenitore === EN) passi.push(v.chiave);
    log('\n== F4-13 Enigma', EN, 'passi', passi.length, 'prima', J((await stati(K, [EN])).m));
    for (const p of passi.slice(0, -1)) await punto(p, 'ottenuto');
    log('tutti i passi tranne l\'ultimo →', J((await stati(K, [EN])).m));
    log('ultimo passo →', await punto(passi[passi.length - 1], 'ottenuto'), J((await stati(K, [EN])).m));
    log('tolgo il primo passo →', await punto(passi[0], null), J((await stati(K, [EN])).m));
    log('rimetto il primo →', await punto(passi[0], 'ottenuto'), J((await stati(K, [EN])).m));
  } else if (fase === 'completa') {
    // F4-20 / R4-23: tutti i permanenti di Kamoshida, il Tesoro (pin 614) e il boss; nessun rigenerabile
    const K = 'kamoshida';
    // F4-21 con una voce permanente su più planimetrie: «Raccogli forziere raro» (pin 572@151-5-1, 1897 e 1901@151-5-2)
    const FR = 'kamoshida-01-cancello-del-castello-ingresso-raccogli-forziere-raro';
    log('== F4-21b voce', FR, 'carattere', (await voce(K, FR))?.carattere, 'prima', J((await stati(K, [FR])).completamento));
    log('PUT punti →', await punto(FR, 'ottenuto'), '· dopo', J(await stati(K, [FR])));
    for (const [id, m] of [[572, 'nativo-rmap-151-5-1'], [1897, 'nativo-rmap-151-5-2'], [1901, 'nativo-rmap-151-5-2']]) log(`pin ${id}@${m}`, J(await pin(m, id)));
    log('PUT punti null →', await punto(FR, null), '·', J((await stati(K, [FR])).completamento));
    // tolgo i segni non permanenti lasciati dalla prova dell'Enigma (F4-13): il 100% va provato senza rigenerabili
    const d0 = await get(`/api/compendio/dungeon/${K}?partita=${ID()}`); const tolti = [];
    for (const a of d0.aree) for (const v of a.punti ?? []) if (v.carattere !== 'permanente' && v.stato) { tolti.push(`${v.chiave}:${v.carattere}:${await punto(v.chiave, null)}`); }
    log('\nsegni non permanenti tolti:', J(tolti));
    const d = await get(`/api/compendio/dungeon/${K}?partita=${ID()}`); const perm = []; const altri = { rigenerabile: 0, descrittiva: 0 };
    for (const a of d.aree) for (const v of a.punti ?? []) { if (v.carattere === 'permanente') perm.push(v); }
    log('== F4-20 prima', J(d.completamento), 'completato', J(d.completato), '· permanenti', perm.length);
    const esiti = {}; for (const v of perm) if (v.stato == null) { const e = await punto(v.chiave, 'ottenuto'); esiti[e] = (esiti[e] ?? 0) + 1; }
    log('PUT dei permanenti da fare:', J(esiti));
    let d2 = await get(`/api/compendio/dungeon/${K}?partita=${ID()}`); log('dopo i permanenti', J(d2.completamento), 'completato', J(d2.completato));
    log('Tesoro: PUT spilli/614 →', await spillo(614, true)); d2 = await get(`/api/compendio/dungeon/${K}?partita=${ID()}`);
    log('dopo il Tesoro', J(d2.completamento), 'completato', J(d2.completato));
    const rig = []; for (const a of d2.aree) for (const v of a.punti ?? []) { if (v.carattere !== 'permanente' && v.stato) rig.push(`${v.chiave}:${v.carattere}`); altri[v.carattere] = (altri[v.carattere] ?? 0) + (v.carattere !== 'permanente' && v.stato ? 1 : 0); }
    log('voci non permanenti segnate:', J(rig.slice(0, 10)), rig.length);
    const el = await get(`/api/compendio/dungeon?partita=${ID()}`); const k = (el ?? []).find?.((x) => x.chiave === K); log('elenco dei Palazzi:', J(k ? { completato: k.completato, completamento: k.completamento } : el)?.slice(0, 400));
  } else if (fase === 'pulisci') {
    const id = ID();
    log('partite prima:', await partite());
    const r = await req('DELETE', `/api/partite/${id}`); log(`DELETE /api/partite/${id}`, r.s);
    log('partite dopo:', await partite());
    log('righe residue della prova:', J(['punto_partita', 'spillo_partita', 'divergenza_partita'].map((t) => [t, leggiU(`SELECT count(*) n FROM ${t} WHERE partita_id = ?`, id)[0].n])));
  }
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
