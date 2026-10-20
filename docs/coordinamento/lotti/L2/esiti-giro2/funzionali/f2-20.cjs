// F2-20 (R2-19) sul collaudo, sola lettura: per ogni pin di passaggio (riferimento_tipo='mappa') sulle mappe del mondo, la destinazione
// che dà l'API della mappa e la casa della mappa d'arrivo secondo `risolvi`.
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/p5s-sviluppo-l2';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));
const B = 'http://localhost:3301';
const db = new Database(path.join(radice, 'data/gioco.db'), { readonly: true });
const get = async (p) => (await (await fetch(B + p)).json());
(async () => {
  const mondo = db.prepare(`WITH RECURSIVE t(c) AS (SELECT 'tokyo' UNION ALL SELECT m.chiave FROM mappa m JOIN t ON m.genitore_chiave = t.c) SELECT c FROM t`).all().map((r) => r.c);
  const set = new Set(mondo);
  const pin = db.prepare(`SELECT id, mappa_chiave, nome, riferimento_chiave FROM spillo WHERE riferimento_tipo = 'mappa'`).all().filter((s) => set.has(s.mappa_chiave));
  console.log('mappe del mondo', mondo.length, '· passaggi', pin.length);
  const perMappa = {};
  let ok = 0; const diversi = []; let primo = null;
  for (const s of pin) {
    perMappa[s.mappa_chiave] ??= (await get('/api/mappe/' + s.mappa_chiave)).data;
    const sp = perMappa[s.mappa_chiave].spilli.find((x) => x.id === s.id);
    if (!primo) primo = sp && Object.keys(sp.dettaglio?.mappa ?? {});
    const casaApi = sp?.dettaglio?.mappa?.casa ?? null;
    const casaRisolvi = (await get('/api/mappe/risolvi/' + encodeURIComponent(s.riferimento_chiave))).data?.casa ?? null;
    if (casaApi && casaApi === casaRisolvi) ok++; else diversi.push({ id: s.id, mappa: s.mappa_chiave, nome: s.nome, verso: s.riferimento_chiave, casaApi, casaRisolvi, dettaglio: sp?.dettaglio });
  }
  console.log('campi di destinazione', JSON.stringify(primo));
  console.log('passaggi con destinazione.casa = casa di risolvi:', ok, 'su', pin.length);
  console.log('diversi', JSON.stringify(diversi.slice(0, 12), null, 0));
  for (const id of [1631, 1501, 1630, 1632, 1628]) { const s = pin.find((x) => x.id === id); if (!s) { console.log(id, 'non è un passaggio del mondo'); continue; } const sp = perMappa[s.mappa_chiave].spilli.find((x) => x.id === id); console.log(id, s.mappa_chiave, `«${s.nome}» →`, s.riferimento_chiave, '· casa', sp?.dettaglio?.mappa?.casa, '· nome della meta', sp?.dettaglio?.mappa?.area?.nome ?? sp?.dettaglio?.mappa?.nome); }
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
