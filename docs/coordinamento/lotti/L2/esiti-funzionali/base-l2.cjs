// Basi «prima» di L2, in sola lettura: (1) voci del diario 04-01..06-01 con «Sulla mappa»; (2) indirizzi vecchi delle mappe del mondo
// (chiavi pubbliche e alias di zone, quartieri, Covo, staff) con la risoluzione di oggi. Uscita: JSON nella cartella indicata.
const fs = require('fs');
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));
const B = 'http://localhost:3201';
const uscita = process.argv[2];
const giorni = () => { const out = []; const d = new Date(Date.UTC(2026, 3, 1)); while (d <= new Date(Date.UTC(2026, 5, 1))) { out.push(`${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`); d.setUTCDate(d.getUTCDate() + 1); } return out; };
const get = async (p) => { const r = await fetch(B + p); return { s: r.status, j: await r.json().catch(() => null) }; };

(async () => {
  fs.mkdirSync(uscita, { recursive: true });
  const db = new Database(path.join(radice, 'data/gioco.db'), { readonly: true, fileMustExist: true });
  console.log('user_version', db.pragma('user_version', { simple: true }));
  // (1) diario
  const voci = []; let totale = 0;
  for (const g of giorni()) {
    const r = await get(`/api/compendio/percorso/${g}?partita=1`);
    for (const v of r.j?.data?.azioni ?? []) { totale++; if (v.mappa) voci.push({ giorno: g, uid: v.uid, fascia: v.fascia, azione: v.azione.slice(0, 60), chiave: v.mappa.chiave, spillo: v.mappa.spilloId }); }
  }
  const mappe = Object.fromEntries(db.prepare('SELECT m.chiave, m.tipo, m.genitore_chiave g, p.chiave pubblica FROM mappa m LEFT JOIN mappa_percorso p ON p.mappa_chiave = m.chiave').all().map((m) => [m.chiave, m]));
  const mondo = (k) => { let m = mappe[k]; for (let i = 0; m && i < 10; i++) { if (m.chiave === 'tokyo') return 'mondo'; if (/^(palazzo|dedalo|dungeon)/.test(m.chiave) || m.tipo === 'palazzo') return 'palazzi'; if (m.chiave === 'citta-mementos' || m.tipo === 'dedalo') return 'memento'; m = mappe[m.g]; } return m ? '?' : 'radice'; };
  for (const v of voci) { v.pubblica = mappe[v.chiave]?.pubblica ?? null; v.dominio = mondo(v.chiave); }
  fs.writeFileSync(path.join(uscita, 'diario-sulla-mappa-prima.json'), JSON.stringify({ totale, conMappa: voci.length, voci }, null, 1));
  const perDominio = {}; for (const v of voci) perDominio[v.dominio] = (perDominio[v.dominio] ?? 0) + 1;
  console.log('diario: voci', totale, 'con mappa', voci.length, JSON.stringify(perDominio));
  // (2) indirizzi vecchi
  const zone = db.prepare(`SELECT m.chiave FROM mappa m JOIN mappa g ON g.chiave = m.genitore_chiave WHERE m.tipo IN ('luogo','area') AND g.tipo='quartiere' AND g.entita_tipo='quartiere' AND IFNULL(g.entita_chiave,'') <> 'mementos'
    UNION SELECT chiave FROM mappa WHERE chiave LIKE 'nativo-rmap-022-1-%' OR chiave LIKE 'nativo-rmap-150-3-%'`).all().map((r) => r.chiave);
  const quartieri = db.prepare(`SELECT chiave FROM mappa WHERE tipo='quartiere' AND entita_tipo='quartiere' AND IFNULL(entita_chiave,'') <> 'mementos'`).all().map((r) => r.chiave);
  const insieme = [...new Set([...zone, ...quartieri, 'tokyo'])];
  const indirizzi = [];
  for (const k of insieme) {
    if (mappe[k]?.pubblica) indirizzi.push({ indirizzo: mappe[k].pubblica, tipo: 'pubblica', mappa: k });
    for (const a of db.prepare('SELECT chiave AS alias FROM mappa_alias WHERE mappa_chiave = ?').all(k)) indirizzi.push({ indirizzo: a.alias, tipo: 'alias', mappa: k });
  }
  for (const x of indirizzi) { const r = await get('/api/mappe/risolvi/' + encodeURIComponent(x.indirizzo)); x.risoluzionePrima = r.j?.data ?? r.j?.error?.code ?? r.s; }
  fs.writeFileSync(path.join(uscita, 'indirizzi-mondo-prima.json'), JSON.stringify({ zone: zone.length, quartieri: quartieri.length, indirizzi }, null, 1));
  console.log('zone', zone.length, 'quartieri', quartieri.length, 'indirizzi', indirizzi.length, 'pubbliche', indirizzi.filter((x) => x.tipo === 'pubblica').length, 'alias', indirizzi.filter((x) => x.tipo === 'alias').length);
  console.log('esempi', JSON.stringify(indirizzi.filter((x) => /sottopasso|covo-dei-ladri$|^shibuya$/.test(x.indirizzo)).map((x) => [x.indirizzo, x.mappa, x.risoluzionePrima])));
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
