// L2, pezzo /api/aree: solo letture (GET) contro gli attesi di modifiche.md §1.2, §2.2, §3 e dati.md §3.
const fs = require('fs');
const B = 'http://localhost:3201';
const get = async (p) => { const r = await fetch(B + p); return { s: r.status, j: await r.json().catch(() => null) }; };
const breve = (x, n = 400) => JSON.stringify(x)?.slice(0, n);
(async () => {
  const q = (await get('/api/compendio/citta/shibuya')).j.data;
  console.log('F2-01 shibuya aree', q.aree?.length, JSON.stringify(q.aree?.map((a) => [a.slug, a.nome, a.ordine, a.predefinita, a.numeroPlanimetrie, a.numeroSpilli, a.passaggio && a.passaggio.spillo, a.ingresso, a.casa])));
  console.log('   chiavi del riassunto', Object.keys(q.aree?.[0] ?? {}).join(','));
  console.log('   ingresso', breve(q.ingresso));
  const elenco = (await get('/api/compendio/citta')).j.data;
  console.log('   aree per quartiere (elenco)', JSON.stringify(Object.fromEntries(elenco.filter((x) => x.aree).map((x) => [x.chiave, x.aree]))));
  for (const [c, k, s] of [['citta', 'shibuya', 'sottopasso'], ['citta', 'yongen-jaya', 'covo-dei-ladri'], ['citta', 'tokyo', 'area-riservata-allo-staff'], ['citta', 'shibuya', 'central-street'], ['citta', 'kichijoji', 'quartiere-dello-shopping']]) {
    const r = await get(`/api/aree/${c}/${k}/${s}?partita=1`);
    const a = r.j?.data;
    console.log(`\nGET /api/aree/${c}/${k}/${s}`, r.s, a ? breve({ chiave: a.chiave, contenitore: a.contenitore, nome: a.nome, ordine: a.ordine, predefinita: a.predefinita, daVerificare: a.daVerificare, origine: a.origine, casa: a.casa, illustrazione: a.illustrazione, passaggio: a.passaggio }, 600) : breve(r.j));
    if (a) { console.log('   planimetrie', JSON.stringify(a.planimetrie?.map((p) => [p.chiave, p.etichetta, p.ordine, p.predefinita, p.numeroSpilli, p.ruoloImmagine]))); console.log('   elementi', a.elementi?.length, breve(a.elementi?.slice(0, 3)), '· vicine', breve(a.vicine)); }
  }
  for (const p of ['/api/aree/citta/shibuya/non-esiste', '/api/aree/citta/non-esiste/x', '/api/aree/da-collocare']) { const r = await get(p); console.log('\nGET', p, r.s, breve(r.j)); }
  // F2-19: casa degli indirizzi vecchi
  const base = JSON.parse(fs.readFileSync('C:/Users/rober/.claude/p5s-coordinamento/lotti/L2/esiti-funzionali/base-prima/indirizzi-mondo-prima.json', 'utf8'));
  const visti = new Set(); const righe = []; const conta = {};
  for (const x of base.indirizzi) { if (visti.has(x.indirizzo)) continue; visti.add(x.indirizzo);
    const r = await get('/api/mappe/risolvi/' + encodeURIComponent(x.indirizzo)); const casa = r.j?.data?.casa ?? `ERRORE ${r.s} ${r.j?.error?.code}`;
    const tipoCasa = /^\/guida\/citta$/.test(casa) ? 'citta' : /^\/guida\/citta\/[^/]+$/.test(casa) ? 'quartiere' : /^\/guida\/citta\/[^/]+\/[^/?]+/.test(casa) ? 'area' : /^\/guida\/mappe\//.test(casa) ? 'mappe' : 'altro';
    conta[tipoCasa] = (conta[tipoCasa] ?? 0) + 1; righe.push(`${x.indirizzo}\t${x.mappa}\t${casa}`);
  }
  fs.writeFileSync('C:/Users/rober/.claude/p5s-coordinamento/lotti/L2/esiti-funzionali/f2-19-case.tsv', 'indirizzo\tmappa\tcasa\n' + righe.join('\n'));
  console.log('\nF2-19 indirizzi distinti', visti.size, JSON.stringify(conta));
  for (const r of righe.filter((l) => /sottopasso|^covo|^shibuya\t|^tokyo|staff|aoyama|yongen-java/.test(l))) console.log('  ', r);
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
