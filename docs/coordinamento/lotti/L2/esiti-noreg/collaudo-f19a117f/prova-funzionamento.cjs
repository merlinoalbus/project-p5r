// Prove di funzionamento del lavoro da preservare, SOLO contro un'istanza avviata su una COPIA della produzione (mai 3201, mai data/).
// Per la partita reale (1) e per una partita di prova creata qui: spunta e toglie una voce del diario, segna e toglie una voce di
// Kamoshida e una di Madarame, raccoglie e toglie un pin di ciascun Palazzo; dopo ogni passo verifica la riga nel DB e il riassunto API.
// Uso (dalla cartella di sviluppo): node <questo> <porta> <cartella dati della copia> <file json di uscita>
const D = require(process.cwd() + '/node_modules/better-sqlite3');
const fs = require('fs');
const path = require('path');
const [porta, dir, uscita] = process.argv.slice(2);
if (porta === '3201' || /[\\/]data[\\/]?$/.test(dir)) throw new Error('rifiuto: solo istanze su copia');
const base = `http://localhost:${porta}/api`;
const db = new D(path.join(dir, 'gioco.db'), { readonly: true, fileMustExist: true });
db.exec(`ATTACH '${path.join(dir, 'partite.db').replace(/'/g, "''")}' AS utente`);
const log = [];
let errori = 0;
const esito = (ok, cosa, dettaglio) => { if (!ok) errori++; log.push({ ok, cosa, dettaglio }); console.log(`${ok ? 'OK ' : 'KO '} ${cosa}${dettaglio ? ' — ' + JSON.stringify(dettaglio) : ''}`); };
async function api(metodo, url, corpo) {
  const r = await fetch(base + url, { method: metodo, headers: corpo ? { 'content-type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, json: j };
}
const riassunto = async (p, dg) => (await api('GET', `/compendio/dungeon?partita=${p}`)).json.data.find((d) => d.chiave === dg);

async function provaPartita(p) {
  console.log(`\n== partita ${p}`);
  // Diario: prima voce 04-01..06-01 non spuntata in questa partita
  const voce = db.prepare(`select uid, data from voce_giornata v where data between '04-01' and '06-01'
    and not exists (select 1 from utente.spunta_voce_partita s where s.partita_id=? and s.voce_uid=v.uid) order by data desc, fascia, ordine limit 1`).get(p);
  const spunta = () => db.prepare('select * from utente.spunta_voce_partita where partita_id=? and voce_uid=?').get(p, voce.uid);
  const doti = () => db.prepare('select dote_chiave, punti from utente.dote_sociale_partita where partita_id=? order by 1').all(p);
  const dotiPrima = JSON.stringify(doti());
  let r = await api('PUT', `/partite/${p}/percorso`, { uid: voce.uid, fatta: true });
  esito(r.status === 200 && !!spunta(), `diario: spunta ${voce.data} ${voce.uid}`, { status: r.status });
  r = await api('PUT', `/partite/${p}/percorso`, { uid: voce.uid, fatta: false });
  esito(r.status === 200 && !spunta() && JSON.stringify(doti()) === dotiPrima, `diario: tolta la spunta, doti come prima`, { status: r.status });

  for (const dg of ['kamoshida', 'madarame']) {
    // Voce della guida senza stato in questa partita
    const pt = db.prepare(`select p.chiave from punto_interesse p join dungeon_area a on a.chiave=p.area_chiave where a.dungeon_chiave=?
      and not exists (select 1 from utente.punto_partita x where x.partita_id=? and x.punto_chiave=p.chiave) order by a.ordine, p.ordine limit 1`).get(dg, p);
    const stato = () => db.prepare('select stato from utente.punto_partita where partita_id=? and punto_chiave=?').get(p, (pt ?? ps).chiave)?.stato ?? null;
    // Palazzo con tutte le voci segnate (es. Kamoshida p1 chiuso al 100%): si toglie lo stato a una voce segnata e lo si rimette com'era
    const ps = pt ? null : db.prepare(`select p.chiave, x.stato from punto_interesse p join dungeon_area a on a.chiave=p.area_chiave
      join utente.punto_partita x on x.partita_id=? and x.punto_chiave=p.chiave where a.dungeon_chiave=? order by a.ordine, p.ordine limit 1`).get(p, dg);
    if (!pt) {
      const g0 = (await riassunto(p, dg)).gestiti;
      r = await api('PUT', `/partite/${p}/punti`, { punto: ps.chiave, stato: null });
      const g1 = (await riassunto(p, dg)).gestiti;
      esito(r.status === 200 && stato() === null && g1 === g0 - 1, `${dg}: (tutte segnate) stato tolto a ${ps.chiave}`, { status: r.status, gestiti: [g0, g1] });
      r = await api('PUT', `/partite/${p}/punti`, { punto: ps.chiave, stato: ps.stato });
      const g2 = (await riassunto(p, dg)).gestiti;
      esito(r.status === 200 && stato() === ps.stato && g2 === g0, `${dg}: stato rimesso «${ps.stato}»`, { status: r.status, gestiti: g2 });
    } else {
      const gPrima = (await riassunto(p, dg)).gestiti;
      r = await api('PUT', `/partite/${p}/punti`, { punto: pt.chiave, stato: 'ottenuto' });
      const gDurante = (await riassunto(p, dg)).gestiti;
      esito(r.status === 200 && stato() === 'ottenuto' && gDurante === gPrima + 1, `${dg}: voce segnata ${pt.chiave}`, { status: r.status, gestiti: [gPrima, gDurante] });
      r = await api('PUT', `/partite/${p}/punti`, { punto: pt.chiave, stato: null });
      const gDopo = (await riassunto(p, dg)).gestiti;
      esito(r.status === 200 && stato() === null && gDopo === gPrima, `${dg}: voce tolta`, { status: r.status, gestiti: gDopo });
    }

    // Pin collezionabile del Palazzo non raccolto in questa partita (raccolta per id, stato per uid)
    const pin = db.prepare(`with recursive t(c) as (select ? union all select m.chiave from mappa m join t on m.genitore_chiave=t.c)
      select s.id, s.uid from spillo s join t on s.mappa_chiave=t.c where s.collezionabile=1
      and not exists (select 1 from utente.spillo_partita x where x.partita_id=? and x.spillo_uid=s.uid and x.raccolto=1) order by s.uid limit 1`).get('dungeon-' + dg, p);
    if (!pin) { esito(true, `${dg}: nessun pin collezionabile ancora da raccogliere (tutto raccolto)`); continue; }
    const racc = () => db.prepare('select raccolto from utente.spillo_partita where partita_id=? and spillo_uid=?').get(p, pin.uid)?.raccolto ?? 0;
    const rPrima = (await riassunto(p, dg)).raccolta;
    r = await api('PUT', `/partite/${p}/spilli/${pin.id}`, { raccolto: true });
    const rDurante = (await riassunto(p, dg)).raccolta;
    esito(r.status === 200 && racc() === 1 && rDurante.presi === rPrima.presi + 1, `${dg}: pin raccolto ${pin.uid}`, { status: r.status, presi: [rPrima.presi, rDurante.presi], totale: rPrima.totale });
    r = await api('PUT', `/partite/${p}/spilli/${pin.id}`, { raccolto: false });
    const rDopo = (await riassunto(p, dg)).raccolta;
    esito(r.status === 200 && racc() === 0 && rDopo.presi === rPrima.presi, `${dg}: pin tolto`, { status: r.status, presi: rDopo.presi });
  }
  // Dettaglio dei Palazzi leggibile
  for (const dg of ['kamoshida', 'madarame']) {
    r = await api('GET', `/compendio/dungeon/${dg}?partita=${p}`);
    esito(r.status === 200, `${dg}: dettaglio per la partita`, { status: r.status, aree: r.json?.data?.aree?.length });
  }
}

(async () => {
  const salute = await api('GET', '/health');
  esito(salute.status === 200, 'istanza della copia in ascolto', salute.json?.data?.db);
  await provaPartita(1);
  const nuova = await api('POST', '/partite', { nome: 'Prova no-reg', attiva: false });
  esito(nuova.status === 201 || nuova.status === 200, 'partita di prova creata', { status: nuova.status, id: nuova.json?.data?.id });
  if (nuova.json?.data?.id) await provaPartita(nuova.json.data.id);
  fs.writeFileSync(uscita, JSON.stringify({ errori, log }, null, 1));
  console.log(`\nerrori: ${errori}`);
  process.exit(errori ? 1 : 0);
})();
