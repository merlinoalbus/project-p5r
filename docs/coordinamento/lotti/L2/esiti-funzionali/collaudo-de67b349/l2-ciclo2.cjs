// Giro finale di L2 sul collaudo (BE 3301, commit 8e75abbb): ciclo che scrive, SOLO dopo la foto del Collaudo, che poi ripristina.
// Area di prova in Kichijoji, ingresso, staff (Tieni/Rimuovi), Colloca con una planimetria di prova, export/import. DB in sola lettura.
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/p5s-sviluppo-l2';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));
const B = 'http://localhost:3301';
const Q = 'kichijoji';
const req = async (metodo, p, corpo, tipo) => {
  const opz = { method: metodo, headers: {} };
  if (corpo !== undefined) { if (Buffer.isBuffer(corpo)) { opz.body = corpo; opz.headers['content-type'] = tipo; } else { opz.body = JSON.stringify(corpo); opz.headers['content-type'] = 'application/json'; } }
  const r = await fetch(B + p, opz); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* vuoto */ } return { s: r.status, j };
};
const leggi = (sql, ...p) => { const db = new Database(path.join(radice, 'data/gioco.db'), { readonly: true }); const r = db.prepare(sql).all(...p); db.close(); return r; };
const breve = (x, n = 320) => JSON.stringify(x)?.slice(0, n);
const aree = (q = Q) => leggi('SELECT slug, ordine FROM area WHERE quartiere_chiave = ? ORDER BY ordine', q).map((a) => `${a.slug}#${a.ordine}`).join(' | ');
const log = (...a) => console.log(...a);
(async () => {
  const png = Buffer.from(await (await fetch(B + '/api/immagini/mappe/citta-nakano/file')).arrayBuffer());
  const png2 = Buffer.from(await (await fetch(B + '/api/immagini/mappe/citta-ikebukuro/file')).arrayBuffer());
  log('prima: aree', leggi('SELECT count(*) n FROM area')[0].n, '· Kichijoji:', aree(), '· cestino', breve((await req('GET', '/api/impostazioni/cestino')).j.data));

  log('\n== F2-24 / F2-25 / F2-26 / F2-27 area di prova');
  let r = await req('POST', `/api/aree/citta/${Q}?nome=Prova%20funzionali%20L2&x=30&y=40&etichetta=prima`, png, 'image/png'); const slug = r.j?.data?.slug;
  log('crea', r.s, slug, breve(r.j?.data && { passaggio: r.j.data.passaggio, predefinita: r.j.data.predefinita, casa: r.j.data.casa }));
  r = await req('POST', `/api/aree/citta/${Q}?nome=x`, Buffer.from('testo'), 'image/png'); log('corpo non immagine', r.s, r.j?.error?.code);
  r = await req('POST', `/api/aree/citta/${Q}/${slug}/planimetrie?etichetta=seconda&predefinita=1`, png2, 'image/png'); log('aggiungi planimetria', r.s, breve(r.j?.data?.planimetrie?.map((p) => [p.etichetta, p.ordine, p.predefinita, p.ruoloImmagine])));
  const pl = (await req('GET', `/api/aree/citta/${Q}/${slug}`)).j.data.planimetrie;
  r = await req('PUT', `/api/aree/citta/${Q}/${slug}`, { nome: 'Prova funzionali L2 rinominata', predefinita: pl[0].chiave }); log('rinomina + predefinita', r.s, breve(r.j?.data && { slug: r.j.data.slug, nome: r.j.data.nome, predefinita: r.j.data.predefinita }));
  const ord = leggi('SELECT slug FROM area WHERE quartiere_chiave = ? ORDER BY ordine', Q).map((x) => x.slug);
  r = await req('PUT', `/api/aree/citta/${Q}/ordine`, { slug: [...ord].reverse() }); log('riordino', r.s, aree());
  r = await req('PUT', `/api/aree/citta/${Q}/${slug}/planimetrie`, { etichette: { [pl[1].chiave]: 'seconda rinominata' } }); log('etichetta', r.s, breve(r.j?.data?.planimetrie?.map((p) => p.etichetta)));

  log('\n== F2-22 ingresso di Kichijoji sull’area di prova (corpo nuovo)');
  r = await req('PUT', `/api/compendio/citta/${Q}/ingresso`, { area: slug, x: 20, y: 30, zoom: 2 }); log('PUT ingresso', r.s, breve(r.j?.data ?? r.j?.error));
  r = await req('PUT', `/api/compendio/citta/${Q}/ingresso`, { area: 'central-street', x: 20, y: 30, zoom: 2 }); log('PUT area di un altro quartiere', r.s, r.j?.error?.code);
  r = await req('DELETE', `/api/aree/citta/${Q}/${slug}`); log('DELETE senza conferma (con ingresso)', r.s, r.j?.error?.message, breve(r.j?.error?.details));

  log('\n== F2-28 Colloca');
  const pac = { pacchetto: { versione: 1, aree: [], mappe: [{ chiave: 'prova-sciolta-l2', nome: 'Planimetria sciolta di prova', tipo: 'luogo', genitore: 'citta-kichijoji', area: null }] } };
  r = await req('POST', '/api/mappe/importa', pac); log('import planimetria sciolta', r.s, breve(r.j?.data ?? r.j?.error));
  let sciolta = leggi("SELECT chiave, genitore_chiave, area_chiave, tipo FROM mappa WHERE chiave = 'prova-sciolta-l2'")[0];
  log('nel DB', JSON.stringify(sciolta));
  if (sciolta?.area_chiave) {
    log('l’import le ha dato un’area: ripiego su una mappa senza genitore');
    r = await req('POST', '/api/mappe', { chiave: 'prova-sciolta-l2b', nome: 'Planimetria sciolta di prova B', tipo: 'luogo', genitore: null }); log('POST /api/mappe senza genitore', r.s, breve(r.j?.error ?? { chiave: r.j?.data?.chiave }));
  }
  const dc = (await req('GET', '/api/aree/da-collocare')).j.data; log('da-collocare', breve(dc));
  const daCollocare = dc[0]?.chiave ?? (sciolta?.area_chiave ? 'prova-sciolta-l2b' : 'prova-sciolta-l2');
  r = await req('PUT', '/api/aree/colloca', { mappa: daCollocare, quartiere: Q, area: slug, etichetta: 'collocata' }); log('colloca nell’area di prova', r.s, breve(r.j?.data?.planimetrie?.map((p) => [p.chiave, p.etichetta, p.ordine]) ?? r.j?.error));
  r = await req('PUT', '/api/aree/colloca', { mappa: daCollocare, quartiere: Q, area: slug }); log('colloca di nuovo', r.s, r.j?.error?.code);
  log('da-collocare dopo', breve((await req('GET', '/api/aree/da-collocare')).j.data));

  log('\n== F2-12 export/import dell’area di prova');
  const e = (await req('GET', '/api/mappe/esporta?radice=citta-kichijoji')).j.data;
  const pacProva = { ...e, mappe: e.mappe.filter((m) => (m.area ?? '').endsWith(slug)), aree: (e.aree ?? []).filter((a) => a.slug === slug), immagini: Object.fromEntries(Object.entries(e.immagini ?? {}).filter(([k]) => /prova/.test(k))), ingressi: [] };
  const prima = JSON.stringify(leggi('SELECT chiave, versione_etichetta, versione_ordine FROM mappa WHERE area_chiave = ? ORDER BY versione_ordine', `citta/${Q}/${slug}`));
  await req('PUT', `/api/aree/citta/${Q}/${slug}/planimetrie`, { etichette: { [pl[0].chiave]: 'cambiata' } });
  r = await req('POST', '/api/mappe/importa', { pacchetto: pacProva, sovrascrivi: true }); log('import con sovrascrivi', r.s, breve(r.j?.data));
  log('versioni rimesse come nel pacchetto:', JSON.stringify(leggi('SELECT chiave, versione_etichetta, versione_ordine FROM mappa WHERE area_chiave = ? ORDER BY versione_ordine', `citta/${Q}/${slug}`)) === prima);

  log('\n== F2-27 elimina con conferma e ripristino');
  r = await req('DELETE', `/api/aree/citta/${Q}/${slug}?conferma=1`); log('DELETE con conferma', r.s, '· ingresso Kichijoji', breve((await req('GET', `/api/compendio/citta/${Q}`)).j.data.ingresso));
  const voce = (await req('GET', '/api/impostazioni/cestino')).j.data.find((c) => c.chiave === `citta/${Q}/${slug}`); log('cestino', breve(voce, 400));
  r = await req('POST', `/api/impostazioni/cestino/${voce.id}/ripristina`); log('ripristino', r.s, '· area', breve((await req('GET', `/api/aree/citta/${Q}/${slug}`)).j?.data?.planimetrie?.map((p) => [p.etichetta, p.ordine])), '· ingresso', breve((await req('GET', `/api/compendio/citta/${Q}`)).j.data.ingresso));

  log('\n(staff: «Rimuovi» e «Tieni» si provano dall’interfaccia, dopo questo script)');
  log('\nfine: aree', leggi('SELECT count(*) n FROM area')[0].n, '· Kichijoji:', aree(), '— il Collaudo ripristina la foto');
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
