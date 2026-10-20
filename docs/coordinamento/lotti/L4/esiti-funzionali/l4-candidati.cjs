// L4: sceglie in sola lettura (DB readonly + GET) i pin e le voci per le prove sulla partita di prova.
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));
const B = 'http://localhost:3201';
const get = async (p) => (await (await fetch(B + p)).json()).data;
(async () => {
  const db = new Database(path.join(radice, 'data/gioco.db'), { readonly: true });
  for (const k of ['madarame', 'kamoshida']) {
    const d = await get(`/api/compendio/dungeon/${k}?partita=1`);
    const voci = new Map(); for (const a of d.aree) for (const v of a.punti ?? []) voci.set(v.chiave, { ...v, area: a.chiave, areaOrd: a.ordine });
    const sv = db.prepare(`SELECT sv.spillo_id id, sv.voce_chiave v, s.uid, s.mappa_chiave m, s.nome FROM spillo_voce sv JOIN spillo s ON s.id = sv.spillo_id JOIN punto_interesse pi ON pi.chiave = sv.voce_chiave JOIN dungeon_area a ON a.chiave = pi.area_chiave WHERE a.dungeon_chiave = ?`).all(k);
    const perPin = new Map(); for (const r of sv) { if (!perPin.has(r.id)) perPin.set(r.id, { id: r.id, uid: r.uid, m: r.m, nome: r.nome, voci: [] }); perPin.get(r.id).voci.push(voci.get(r.v) ?? { chiave: r.v }); }
    const pins = [...perPin.values()];
    const desc = (p) => `${p.id} «${p.nome}» ${p.m} [${p.voci.map((v) => `${v.chiave}:${v.tipo}/${v.carattere}/${v.area}/esaur=${v.esauribile}`).join(' ; ')}]`;
    console.log(`\n=== ${k}: pin con voci ${pins.length}`);
    const permMulti = pins.filter((p) => new Set(p.voci.filter((v) => v.carattere === 'permanente').map((v) => v.area)).size > 1);
    console.log(`-- permanenti di più infiltrazioni sullo stesso pin: ${permMulti.length}`); for (const p of permMulti.slice(0, 20)) console.log(desc(p));
    const rigMulti = pins.filter((p) => new Set(p.voci.filter((v) => v.carattere === 'rigenerabile').map((v) => v.area)).size > 1);
    console.log(`-- rigenerabili di più infiltrazioni: ${rigMulti.length}`); for (const p of rigMulti.slice(0, 5)) console.log(desc(p));
    const piu = pins.filter((p) => p.voci.length >= 3 && p.voci.every((v) => v.carattere && v.carattere !== 'descrittiva'));
    console.log(`-- pin con ≥3 voci che contano: ${piu.length}`); for (const p of piu.slice(0, 5)) console.log(desc(p));
    const soloDesc = pins.filter((p) => p.voci.every((v) => v.carattere === 'descrittiva'));
    console.log(`-- pin di sole descrittive: ${soloDesc.length}`); for (const p of soloDesc.slice(0, 3)) console.log(desc(p));
    const esa = [...voci.values()].filter((v) => v.esauribile); console.log(`-- voci esauribili: ${esa.length}`, esa.slice(0, 4).map((v) => `${v.chiave}:${v.tipo}/${v.carattere}`).join(' ; '));
    const enig = [...voci.values()].filter((v) => v.tipo === 'puzzle' || v.passi?.length || v.enigma); console.log(`-- enigmi/puzzle: ${enig.length}`, enig.slice(0, 6).map((v) => `${v.chiave}:${v.tipo} passi=${JSON.stringify(v.passi ?? v.enigma ?? null)?.slice(0, 80)}`).join(' | '));
    const conPassoDi = [...voci.values()].filter((v) => Object.keys(v).some((x) => /enigma|passo/i.test(x))); console.log('-- campi enigma/passo nelle voci:', [...new Set(conPassoDi.flatMap((v) => Object.keys(v).filter((x) => /enigma|passo/i.test(x))))]);
    const senzaVoci = db.prepare(`SELECT s.id, s.uid, s.nome, s.tipo, s.mappa_chiave m FROM spillo s WHERE s.mappa_chiave LIKE ? AND s.id NOT IN (SELECT spillo_id FROM spillo_voce) LIMIT 4`).all(`palazzo-di-${k}%`);
    console.log('-- pin senza voci:', JSON.stringify(senzaVoci));
    console.log('-- chiavi di una voce:', Object.keys([...voci.values()][0]).join(','));
  }
  db.close();
})().catch((e) => { console.error('ERRORE', e); process.exit(1); });
