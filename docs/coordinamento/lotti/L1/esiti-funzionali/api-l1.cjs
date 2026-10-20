// Prove in sola lettura (solo GET) per i casi API di L1.
const B = 'http://localhost:3201';
const get = async (p) => { const r = await fetch(B + p); return { status: r.status, j: r.headers.get('content-type')?.includes('json') ? await r.json() : null, h: r.headers }; };
const testa = async (u) => { if (!u) return '-'; const r = await fetch(B + u); const b = await r.arrayBuffer(); return `${r.status} ${r.headers.get('content-type')} ${b.byteLength}B`; };
(async () => {
  const albero = (await get('/api/mappe/albero')).j.data;
  const perChiave = Object.fromEntries(albero.map((m) => [m.chiave, m]));
  const manifest = (await get('/api/immagini/manifest')).j.data;
  const fileMan = JSON.stringify(manifest.file);
  const inMan = (a) => (a ? fileMan.includes(`"${a}`) || fileMan.includes(a) : false);
  console.log('manifest totale', manifest.totale, 'chiavi esempio', Array.isArray(manifest.file) ? JSON.stringify(manifest.file.slice(0, 2)) : Object.keys(manifest.file).slice(0, 3));
  const ruoli = {}; for (const m of albero) ruoli[m.ruoloImmagine] = (ruoli[m.ruoloImmagine] || 0) + 1;
  console.log('albero', albero.length, JSON.stringify(ruoli));
  console.log('\n== F-18 Banchina Yongen-Jaya');
  for (const k of ['yongen-jaya-banchina-della-metropolitana']) { const m = perChiave[k]; console.log(k, m?.ruoloImmagine, m?.immagineUrl, m?.asset); }
  console.log('\n== dettaglio mappe');
  for (const k of ['tokyo', 'shibuya', 'kichijoji', 'nakano', 'ikebukuro', 'santuario-meiji', 'palazzo-di-kamoshida']) {
    const d = await get('/api/mappe/' + k); const m = d.j?.data ?? {};
    console.log(k, d.status, 'ruolo=', m.ruoloImmagine, 'immagineUrl=', m.immagineUrl, 'asset=', m.asset, 'inManifest=', inMan(m.asset), '| albero:', perChiave[k]?.immagineUrl, perChiave[k]?.asset, '| file:', await testa(m.immagineUrl));
  }
  console.log('\n== F-03/F-04 compendio/citta vs mappa del quartiere');
  const citta = (await get('/api/compendio/citta')).j.data;
  let uguali = 0, diversi = [];
  for (const q of citta) {
    const m = Object.values(perChiave).find((x) => x.tipo === 'quartiere' && (x.chiave === q.mappaChiave || x.chiave === q.chiave)) ?? perChiave[q.mappaChiave];
    const det = m ? (await get('/api/mappe/' + m.chiave)).j?.data : null;
    const ok = det && q.illustrazione?.immagineUrl === (det.immagineUrl ?? null) && q.illustrazione?.asset === (det.asset ?? null);
    if (ok) uguali++; else diversi.push({ q: q.chiave, mappaChiave: q.mappaChiave, ill: q.illustrazione, mappa: det && { k: det.chiave, u: det.immagineUrl, a: det.asset } });
  }
  console.log('quartieri', citta.length, 'illustrazione = MappaDto:', uguali, 'diversi:', JSON.stringify(diversi));
  console.log('\n== F-14 dettaglio quartiere');
  for (const q of ['shibuya', 'kichijoji', 'nakano', 'yongen-jaya']) {
    const d = await get('/api/compendio/citta/' + q); const x = d.j?.data ?? {};
    console.log(q, d.status, 'mappa=', x.mappa, 'illustrazione=', JSON.stringify(x.illustrazione), 'mappaChiave=', x.mappaChiave);
  }
  console.log('\n== F-06/F-07 dungeon');
  for (const k of ['kamoshida', 'madarame', 'mementos']) {
    const d = await get('/api/compendio/dungeon/' + k); const x = d.j?.data ?? {};
    console.log(k, d.status, 'illustrazione=', JSON.stringify(x.illustrazione), '| file:', await testa(x.illustrazione?.immagineUrl));
  }
  console.log('radice kamoshida (albero):', perChiave['palazzo-di-kamoshida']?.immagineUrl, perChiave['palazzo-di-kamoshida']?.asset);
  console.log('\n== asset dei 4 quartieri nel manifesto (file)');
  for (const a of ['mappe/citta-kichijoji', 'mappe/citta-nakano', 'mappe/citta-ikebukuro', 'mappe/citta-meiji-shrine', 'mappe/tokyo']) {
    const voce = Array.isArray(manifest.file) ? manifest.file.find((f) => (f.chiave ?? f.percorso ?? JSON.stringify(f)).includes(a)) : manifest.file[a];
    console.log(a, JSON.stringify(voce));
  }
})();
