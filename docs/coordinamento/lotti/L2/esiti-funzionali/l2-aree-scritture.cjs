// L2, pezzo /api/aree: scritture SOLO su aree di prova in Kichijoji, poi eliminate e tolte dal cestino. DB letto in sola lettura.
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
const breve = (x, n = 300) => JSON.stringify(x)?.slice(0, n);
const aree = () => leggi('SELECT slug, nome, ordine, planimetria_predefinita pred, origine FROM area WHERE quartiere_chiave = ? ORDER BY ordine', Q).map((a) => `${a.slug}#${a.ordine}(${a.pred},${a.origine})`).join(' | ');
(async () => {
  const png = Buffer.from(await (await fetch(B + '/api/immagini/mappe/citta-nakano/file')).arrayBuffer());
  const png2 = Buffer.from(await (await fetch(B + '/api/immagini/mappe/citta-ikebukuro/file')).arrayBuffer());
  console.log('aree di Kichijoji prima:', aree());
  const pinPrima = leggi("SELECT count(*) n FROM spillo WHERE mappa_chiave = 'citta-kichijoji'")[0].n;
  console.log('pin sull’illustrazione di Kichijoji prima:', pinPrima);

  console.log('\n== F2-24 errori (nulla deve essere scritto)');
  let r = await req('POST', `/api/aree/citta/${Q}?nome=`, png, 'image/png'); console.log('nome vuoto →', r.s, breve(r.j?.error));
  r = await req('POST', `/api/aree/citta/${Q}?nome=Prova%20funzionali%20L2`, Buffer.from('non è un’immagine'), 'image/png'); console.log('immagine non valida →', r.s, breve(r.j?.error));
  r = await req('POST', `/api/aree/citta/${Q}?nome=Nuova`, png, 'image/png'); console.log('slug riservato «nuova» →', r.s, breve(r.j?.error));
  r = await req('POST', `/api/aree/citta/${Q}?nome=Prova&x=10`, png, 'image/png'); console.log('x senza y →', r.s, breve(r.j?.error));
  console.log('aree dopo gli errori:', aree());

  console.log('\n== F2-24 creazione');
  r = await req('POST', `/api/aree/citta/${Q}?nome=Prova%20funzionali%20L2&x=40&y=60&etichetta=prima`, png, 'image/png');
  const a = r.j?.data; console.log('POST →', r.s, breve(a && { chiave: a.chiave, slug: a.slug, ordine: a.ordine, predefinita: a.predefinita, origine: a.origine, passaggio: a.passaggio, casa: a.casa, planimetrie: a.planimetrie }, 700));
  const slug = a?.slug;
  r = await req('POST', `/api/aree/citta/${Q}?nome=Prova%20funzionali%20L2`, png, 'image/png'); const slug2 = r.j?.data?.slug; console.log('stesso nome →', r.s, 'slug', slug2);
  console.log('aree:', aree());
  const pin = leggi("SELECT id, nome, tipo, x, y, riferimento_tipo, riferimento_chiave FROM spillo WHERE mappa_chiave = 'citta-kichijoji' ORDER BY id DESC LIMIT 2"); console.log('pin nuovi sull’illustrazione:', JSON.stringify(pin));
  const q = (await req('GET', `/api/compendio/citta/${Q}`)).j.data; console.log('GET quartiere → aree', q.aree.map((x) => x.slug).join(','));

  console.log('\n== F2-25 aggiungi planimetria');
  r = await req('POST', `/api/aree/citta/${Q}/${slug}/planimetrie?etichetta=seconda&predefinita=1`, png2, 'image/png');
  console.log('POST planimetria →', r.s, breve(r.j?.data && { predefinita: r.j.data.predefinita, planimetrie: r.j.data.planimetrie.map((p) => [p.chiave, p.etichetta, p.ordine, p.predefinita, p.ruoloImmagine]) }, 600) ?? breve(r.j));

  console.log('\n== F2-26 rinomina, predefinita, ordine');
  const pl = (await req('GET', `/api/aree/citta/${Q}/${slug}`)).j.data.planimetrie;
  r = await req('PUT', `/api/aree/citta/${Q}/${slug}`, { nome: 'Prova funzionali L2 rinominata', predefinita: pl[0].chiave });
  console.log('PUT nome+predefinita →', r.s, breve(r.j?.data && { slug: r.j.data.slug, nome: r.j.data.nome, predefinita: r.j.data.predefinita, casa: r.j.data.casa, nomeRivisto: r.j.data.nomeRivisto }));
  r = await req('GET', `/api/aree/citta/${Q}/${slug}`); console.log('GET con lo slug di prima →', r.s, r.j?.data?.nome);
  r = await req('PUT', `/api/aree/citta/${Q}/${slug}`, { predefinita: 'shibuya-central-street' }); console.log('predefinita non sua →', r.s, breve(r.j?.error));
  const ordinePrima = leggi('SELECT slug FROM area WHERE quartiere_chiave = ? ORDER BY ordine', Q).map((x) => x.slug);
  r = await req('PUT', `/api/aree/citta/${Q}/ordine`, { slug: [...ordinePrima].reverse() }); console.log('riordino (al contrario) →', r.s, '·', aree());
  r = await req('PUT', `/api/aree/citta/${Q}/ordine`, { slug: ordinePrima }); console.log('riordino rimesso →', r.s, '·', aree());
  r = await req('PUT', `/api/aree/citta/${Q}/${slug}/planimetrie`, { etichette: { [pl[1].chiave]: 'seconda rinominata' } }); console.log('etichetta versione →', r.s, breve(r.j?.data?.planimetrie?.map((p) => [p.etichetta, p.ordine])));
  r = await req('POST', `/api/aree/citta/${Q}/${slug}/ripristina`); console.log('ripristina su area utente →', r.s, breve(r.j?.error));

  console.log('\n== F2-11 / F2-27 vincoli');
  r = await req('POST', '/api/mappe', { nome: 'Sciolta di prova', tipo: 'luogo', genitore: 'citta-kichijoji' }); console.log('POST /api/mappe nel mondo →', r.s, breve(r.j?.error));
  const pl2 = (await req('GET', `/api/aree/citta/${Q}/${slug2}`)).j.data.planimetrie;
  r = await req('DELETE', `/api/mappe/${pl2[0].chiave}`); console.log('DELETE dell’ultima planimetria →', r.s, breve(r.j?.error));
  r = await req('DELETE', `/api/aree/citta/${Q}/${slug}`); console.log('DELETE area con contenuti senza conferma →', r.s, breve(r.j?.error, 500));
  r = await req('DELETE', `/api/aree/citta/${Q}/${slug}?conferma=1`); console.log('DELETE con conferma →', r.s, '·', aree());
  const cest = (await req('GET', '/api/impostazioni/cestino')).j.data; const voce = cest.find((c) => c.chiave?.includes(slug) || c.nome?.startsWith('Prova funzionali L2 rinominata'));
  console.log('cestino →', breve(voce, 500));
  r = await req('POST', `/api/impostazioni/cestino/${voce.id}/ripristina`); console.log('ripristino →', r.s, '·', aree());
  const dopo = (await req('GET', `/api/aree/citta/${Q}/${slug}`)).j?.data; console.log('area rimessa →', breve(dopo && { nome: dopo.nome, ordine: dopo.ordine, predefinita: dopo.predefinita, passaggio: dopo.passaggio, planimetrie: dopo.planimetrie.map((p) => [p.chiave, p.etichetta, p.ordine, p.predefinita]) }, 600));

  console.log('\n== pulizia');
  for (const s of [slug, slug2]) { r = await req('DELETE', `/api/aree/citta/${Q}/${s}?conferma=1`); console.log('DELETE', s, r.s); }
  const cest2 = (await req('GET', '/api/impostazioni/cestino')).j.data;
  for (const c of cest2) { if (/prova-funzionali-l2|Prova funzionali L2/i.test(`${c.chiave} ${c.nome}`)) { r = await req('DELETE', `/api/impostazioni/cestino/${c.id}`); console.log('tolta dal cestino', c.id, c.tipo, c.chiave, r.s); } }
  console.log('cestino ora:', breve((await req('GET', '/api/impostazioni/cestino')).j.data));
  console.log('aree di Kichijoji dopo:', aree());
  console.log('pin sull’illustrazione dopo:', leggi("SELECT count(*) n FROM spillo WHERE mappa_chiave = 'citta-kichijoji'")[0].n, '(prima', pinPrima + ')');
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
