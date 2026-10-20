// L2: verifica di FUN2-3 (formato dell'immagine) e FUN2-4 (testo del 409), poi export/import con `aree` e ricerca dei riferimenti.
// Scritture SOLO su aree di prova in Kichijoji, eliminate e tolte dal cestino alla fine. DB in sola lettura.
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));
const B = 'http://localhost:3201';
const Q = 'kichijoji';
const req = async (metodo, p, corpo, tipo) => {
  const opz = { method: metodo, headers: {} };
  if (corpo !== undefined) { if (Buffer.isBuffer(corpo)) { opz.body = corpo; opz.headers['content-type'] = tipo; } else { opz.body = JSON.stringify(corpo); opz.headers['content-type'] = 'application/json'; } }
  const r = await fetch(B + p, opz); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* vuoto */ } return { s: r.status, j };
};
const leggi = (sql, ...p) => { const db = new Database(path.join(radice, 'data/gioco.db'), { readonly: true }); const r = db.prepare(sql).all(...p); db.close(); return r; };
const breve = (x, n = 320) => JSON.stringify(x)?.slice(0, n);
const aree = () => leggi('SELECT slug FROM area WHERE quartiere_chiave = ? ORDER BY ordine', Q).map((a) => a.slug).join(',');
const conta = () => `aree ${leggi('SELECT count(*) n FROM area')[0].n} · mappe ${leggi('SELECT count(*) n FROM mappa')[0].n} · immagini mappa ${leggi("SELECT count(*) n FROM immagine WHERE ambito='mappa'")[0].n}`;
(async () => {
  const png = Buffer.from(await (await fetch(B + '/api/immagini/mappe/citta-nakano/file')).arrayBuffer());
  const testo = Buffer.from('non è un’immagine');
  console.log('prima:', aree(), '·', conta());
  console.log('\n== FUN2-3: contenuti non immagine (nulla deve essere scritto)');
  let r = await req('POST', `/api/aree/citta/${Q}?nome=Prova%20funzionali%20L2`, testo, 'image/png'); console.log('crea area, testo come image/png →', r.s, breve(r.j?.error), '·', aree(), '·', conta());
  r = await req('POST', `/api/aree/citta/${Q}?nome=Prova%20funzionali%20L2`, Buffer.from('<html>no</html>'), 'image/svg+xml'); console.log('crea area, html come svg →', r.s, breve(r.j?.error), '·', conta());
  console.log('\n== creazione valida (PNG mandato come image/jpeg)');
  r = await req('POST', `/api/aree/citta/${Q}?nome=Prova%20funzionali%20L2&x=30&y=40`, png, 'image/jpeg'); const a = r.j?.data; const slug = a?.slug;
  console.log('crea →', r.s, slug, breve(a?.planimetrie?.map((p) => [p.chiave, p.ruoloImmagine])));
  const k0 = a?.planimetrie?.[0]?.chiave; const immagine = leggi("SELECT mime, length(contenuto) byte FROM immagine WHERE ambito='mappa' AND chiave = ?", leggi('SELECT chiave FROM mappa_percorso WHERE chiave = ?', k0).length ? (leggi('SELECT mappa_chiave c FROM mappa_percorso WHERE chiave = ?', k0)[0].c) : k0);
  console.log('formato salvato:', JSON.stringify(immagine));
  const prima = conta();
  r = await req('POST', `/api/aree/citta/${Q}/${slug}/planimetrie?etichetta=x`, testo, 'image/png'); console.log('aggiungi planimetria, testo →', r.s, breve(r.j?.error), '· invariato:', conta() === prima);
  r = await req('PUT', `/api/immagini/mappa/${k0}`, testo, 'image/png'); console.log('PUT generica, testo →', r.s, breve(r.j?.error), '· invariato:', conta() === prima);
  r = await req('PUT', `/api/mappe/${k0}/immagine`, testo, 'image/png'); console.log('PUT editor, testo →', r.s, breve(r.j?.error), '· invariato:', conta() === prima);
  r = await req('POST', `/api/immagini/mappa/${k0}/da-url`, { url: B + '/api/partite' }); console.log('da-url verso un JSON →', r.s, breve(r.j?.error), '· invariato:', conta() === prima);
  r = await req('POST', `/api/aree/citta/${Q}/${slug}/planimetrie?etichetta=seconda`, png, 'image/png'); console.log('aggiungi planimetria valida →', r.s);
  console.log('\n== FUN2-4: testo del 409');
  r = await req('DELETE', `/api/aree/citta/${Q}/${slug}`); console.log('DELETE senza conferma →', r.s, r.j?.error?.message, breve(r.j?.error?.details));

  console.log('\n== export/import con aree');
  const e = await req('GET', '/api/mappe/esporta?radice=citta-kichijoji'); const pac = e.j?.data ?? e.j;
  console.log('export →', e.s, 'chiavi', Object.keys(pac).join(','), '· mappe', pac.mappe?.length, '· aree', JSON.stringify(pac.aree?.map((x) => [x.chiave, x.slug, x.ordine, x.predefinita])));
  console.log('   mappe:', JSON.stringify(pac.mappe?.map((m) => [m.chiave, m.area, m.versione])));
  const pacSoloProva = { ...pac, mappe: pac.mappe.filter((m) => (m.area ?? '').includes(slug)), aree: (pac.aree ?? []).filter((x) => x.slug === slug), immagini: Object.fromEntries(Object.entries(pac.immagini ?? {}).filter(([k]) => k.includes('prova'))), ingressi: [] };
  const etichettaPrima = leggi('SELECT chiave, versione_etichetta et, versione_ordine vo FROM mappa WHERE area_chiave = ? ORDER BY vo', `citta/${Q}/${slug}`);
  r = await req('PUT', `/api/aree/citta/${Q}/${slug}/planimetrie`, { etichette: { [a.planimetrie[0].chiave]: 'cambiata' } }); console.log('etichetta cambiata →', r.s);
  r = await req('POST', '/api/mappe/importa', { pacchetto: pacSoloProva, sovrascrivi: true }); console.log('import (solo l’area di prova, sovrascrivi) →', r.s, breve(r.j?.data ?? r.j?.error));
  const etichettaDopo = leggi('SELECT chiave, versione_etichetta et, versione_ordine vo FROM mappa WHERE area_chiave = ? ORDER BY vo', `citta/${Q}/${slug}`);
  console.log('versioni prima:', JSON.stringify(etichettaPrima), '\n       dopo l’import:', JSON.stringify(etichettaDopo), '· uguali:', JSON.stringify(etichettaPrima) === JSON.stringify(etichettaDopo));
  console.log('area dopo l’import:', JSON.stringify(leggi('SELECT chiave, slug, nome, ordine, planimetria_predefinita FROM area WHERE chiave = ?', `citta/${Q}/${slug}`)));

  console.log('\n== ricerca dei riferimenti');
  for (const q of ['sottopasso', 'Prova funzionali']) { r = await req('GET', `/api/mappe/riferimenti?tipo=mappa&q=${encodeURIComponent(q)}`); console.log(q, '→', r.s, breve(r.j?.data?.map?.((x) => x.etichetta ?? x.nome ?? x), 500)); }

  console.log('\n== pulizia');
  r = await req('DELETE', `/api/aree/citta/${Q}/${slug}?conferma=1`); console.log('DELETE area di prova', r.s);
  for (const c of (await req('GET', '/api/impostazioni/cestino')).j.data) if (/prova-funzionali-l2/.test(c.chiave)) { r = await req('DELETE', `/api/impostazioni/cestino/${c.id}`); console.log('tolta dal cestino', c.id, r.s); }
  console.log('cestino:', breve((await req('GET', '/api/impostazioni/cestino')).j.data), '· dopo:', aree(), '·', conta());
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
