// Basi «prima» di L3 in sola lettura (GET e DB read-only): dettaglio dei Palazzi e dei Memento (partite 1 e 2), risoluzione delle chiavi
// pubbliche e degli alias delle mappe dei Palazzi, voci del diario dell'anno con riferimento a un Palazzo (o «Sulla mappa» in un Palazzo).
const fs = require('fs');
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));
const B = 'http://localhost:3201';
const uscita = process.argv[2];
const get = async (p) => { const r = await fetch(B + p); return { s: r.status, j: await r.json().catch(() => null) }; };
(async () => {
  fs.mkdirSync(uscita, { recursive: true });
  const db = new Database(path.join(radice, 'data/gioco.db'), { readonly: true, fileMustExist: true });
  console.log('user_version', db.pragma('user_version', { simple: true }));
  const dungeon = (await get('/api/compendio/dungeon')).j.data.map((d) => d.chiave);
  for (const k of dungeon) for (const p of [1, 2]) {
    const r = await get(`/api/compendio/dungeon/${k}?partita=${p}`);
    fs.writeFileSync(path.join(uscita, `dungeon-${k}-p${p}.json`), JSON.stringify(r.j, null, 1));
  }
  console.log('dettagli salvati', dungeon.length * 2, dungeon.join(','));
  // mappe dei Palazzi e dei Memento: radici dungeon-<k>, discendenti
  const mappe = db.prepare('SELECT m.chiave, m.genitore_chiave g, m.tipo, p.chiave pubblica FROM mappa m LEFT JOIN mappa_percorso p ON p.mappa_chiave = m.chiave').all();
  const per = Object.fromEntries(mappe.map((m) => [m.chiave, m]));
  const radiceDi = (k) => { let m = per[k]; for (let i = 0; m && i < 12; i++) { if (/^dungeon-/.test(m.chiave) || m.chiave === 'citta-mementos') return m.chiave; m = per[m.g]; } return null; };
  const indirizzi = [];
  for (const m of mappe) { const r0 = radiceDi(m.chiave); if (!r0) continue;
    if (m.pubblica) indirizzi.push({ indirizzo: m.pubblica, tipo: 'pubblica', mappa: m.chiave, radice: r0 });
    for (const a of db.prepare('SELECT chiave FROM mappa_alias WHERE mappa_chiave = ? AND chiave <> ?').all(m.chiave, m.pubblica ?? '')) indirizzi.push({ indirizzo: a.chiave, tipo: 'alias', mappa: m.chiave, radice: r0 });
  }
  let guidaAlias = [];
  try { guidaAlias = db.prepare('SELECT * FROM guida_alias').all(); } catch (e) { console.log('guida_alias:', e.message); }
  for (const g of guidaAlias) { const k = g.alias ?? g.chiave; if (k) indirizzi.push({ indirizzo: k, tipo: 'guida_alias', riga: g }); }
  for (const x of indirizzi) { const r = await get('/api/mappe/risolvi/' + encodeURIComponent(x.indirizzo)); x.risoluzionePrima = r.j?.data ?? r.j?.error?.code ?? r.s; }
  fs.writeFileSync(path.join(uscita, 'indirizzi-palazzi-prima.json'), JSON.stringify(indirizzi, null, 1));
  const conta = {}; for (const x of indirizzi) conta[x.tipo] = (conta[x.tipo] ?? 0) + 1;
  console.log('indirizzi', indirizzi.length, JSON.stringify(conta));
  // diario dell'anno
  const voci = []; let totale = 0; const d = new Date(Date.UTC(2026, 3, 1)); const fine = new Date(Date.UTC(2027, 2, 31));
  for (; d <= fine; d.setUTCDate(d.getUTCDate() + 1)) {
    const g = `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const r = await get(`/api/compendio/percorso/${g}?partita=1`);
    for (const v of r.j?.data?.azioni ?? []) { totale++;
      const palazzo = v.riferimento?.tipo === 'dungeon' || (v.mappa && radiceDi(v.mappa.chiave)) || v.atterraggio;
      if (palazzo) voci.push({ giorno: g, uid: v.uid, fascia: v.fascia, azione: v.azione, riferimento: v.riferimento, mappa: v.mappa, atterraggio: v.atterraggio, fatta: v.fatta });
    }
  }
  fs.writeFileSync(path.join(uscita, 'diario-palazzi-prima.json'), JSON.stringify({ totale, voci }, null, 1));
  const perP = {}; for (const v of voci) { const k = v.riferimento?.tipo === 'dungeon' ? v.riferimento.chiave : 'altro'; perP[k] = (perP[k] ?? 0) + 1; }
  console.log('diario: voci dell’anno', totale, 'con un Palazzo', voci.length, JSON.stringify(perP), 'fino al 06-01', voci.filter((v) => v.giorno <= '06-01' && v.giorno >= '04-01').length);
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
