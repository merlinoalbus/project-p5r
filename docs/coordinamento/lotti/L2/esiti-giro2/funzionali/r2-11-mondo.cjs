// R2-11 sul collaudo, dentro un ciclo del Collaudo: export di tutto il mondo (radice tokyo) e reimport con sovrascrivi; confronto prima e
// dopo di aree, planimetrie (area, versione, etichetta, genitore, tipo), predefinite, ingressi, percorsi pubblici e alias. DB in sola lettura.
const fs = require('fs');
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/p5s-sviluppo-l2';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));
const B = 'http://localhost:3301';
const uscita = process.argv[2];
const istantanea = () => {
  const db = new Database(path.join(radice, 'data/gioco.db'), { readonly: true });
  const q = (s) => db.prepare(s).all();
  const r = {
    area: q('SELECT chiave, quartiere_chiave, dungeon_chiave, citta_chiave, slug, nome, nome_rivisto, ordine, planimetria_predefinita, origine, seed_json, da_verificare FROM area ORDER BY chiave'),
    planimetrie: q('SELECT chiave, nome, tipo, genitore_chiave, ordine, area_chiave, versione_etichetta, versione_ordine, immagine_chiave, asset, origine, nome_rivisto, larghezza, altezza FROM mappa WHERE area_chiave IS NOT NULL OR chiave = \'tokyo\' OR tipo = \'quartiere\' ORDER BY chiave'),
    ingressi: q('SELECT * FROM quartiere_ingresso ORDER BY quartiere_chiave'),
    percorsi: q('SELECT * FROM mappa_percorso ORDER BY mappa_chiave'),
    alias: q('SELECT * FROM mappa_alias ORDER BY chiave'),
    spilliMondo: q(`WITH RECURSIVE t(c) AS (SELECT 'tokyo' UNION ALL SELECT m.chiave FROM mappa m JOIN t ON m.genitore_chiave = t.c) SELECT s.id, s.uid, s.mappa_chiave, s.nome, s.tipo, s.x, s.y, s.riferimento_tipo, s.riferimento_chiave, s.condizioni_json, s.origine FROM spillo s JOIN t ON t.c = s.mappa_chiave ORDER BY s.id`),
  };
  db.close(); return r;
};
const confronta = (a, b) => { const out = {}; for (const k of Object.keys(a)) { const sa = a[k].map((x) => JSON.stringify(x)); const sb = new Set(b[k].map((x) => JSON.stringify(x))); const sa2 = new Set(sa); out[k] = { prima: a[k].length, dopo: b[k].length, soloPrima: sa.filter((x) => !sb.has(x)).slice(0, 8), soloDopo: b[k].map((x) => JSON.stringify(x)).filter((x) => !sa2.has(x)).slice(0, 8) }; } return out; };
(async () => {
  fs.mkdirSync(uscita, { recursive: true });
  const prima = istantanea(); fs.writeFileSync(path.join(uscita, 'r2-11-prima.json'), JSON.stringify(prima));
  console.log('prima: aree', prima.area.length, '· planimetrie e mappe del mondo', prima.planimetrie.length, '· ingressi', prima.ingressi.length, '· pin del mondo', prima.spilliMondo.length);
  const t0 = Date.now(); const re = await fetch(B + '/api/mappe/esporta?radice=tokyo'); const testo = await re.text(); const pac = JSON.parse(testo).data ?? JSON.parse(testo);
  fs.writeFileSync(path.join(uscita, 'r2-11-pacchetto-riassunto.json'), JSON.stringify({ chiavi: Object.keys(pac), mappe: pac.mappe?.length, aree: pac.aree?.length, ingressi: pac.ingressi?.length, immagini: Object.keys(pac.immagini ?? {}).length, byte: testo.length, esempioMappa: pac.mappe?.find((m) => m.area), esempioArea: pac.aree?.[0] }, null, 1));
  console.log('export', re.status, `${Math.round(testo.length / 1e6)} MB`, (Date.now() - t0) + ' ms', '· mappe', pac.mappe?.length, '· aree', pac.aree?.length, '· ingressi', pac.ingressi?.length, '· immagini', Object.keys(pac.immagini ?? {}).length);
  const t1 = Date.now(); const ri = await fetch(B + '/api/mappe/importa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pacchetto: pac, sovrascrivi: true }) });
  const esito = await ri.text(); console.log('import con sovrascrivi', ri.status, (Date.now() - t1) + ' ms', esito.slice(0, 600));
  const dopo = istantanea(); fs.writeFileSync(path.join(uscita, 'r2-11-dopo.json'), JSON.stringify(dopo));
  const c = confronta(prima, dopo); fs.writeFileSync(path.join(uscita, 'r2-11-confronto.json'), JSON.stringify(c, null, 1));
  for (const [k, v] of Object.entries(c)) console.log(`${k}: ${v.prima} → ${v.dopo} · righe cambiate ${v.soloPrima.length}${v.soloPrima.length ? ' (es. prima ' + v.soloPrima[0].slice(0, 220) + ' / dopo ' + (v.soloDopo[0] ?? '').slice(0, 220) + ')' : ''}`);
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
