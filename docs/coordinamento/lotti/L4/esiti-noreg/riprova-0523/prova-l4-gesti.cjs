// Prove dei gesti di L4 (§8.10, §8.11) SOLO su un'istanza mia avviata su una COPIA (rifiuta 3201, 3301, 3302) e solo su partite di prova
// create qui. NR4-1: contatore k/N della voce con N pin, «Segna» sulla voce, togliere un pin, pin con due voci, pin condiviso di rigenerabili
// letto per infiltrazione. NR4-2 (2): Kamoshida con Tesoro e boss fatti e 15 permanenti non segnate → concluso e non completato, senza
// ingresso, assente dalla metro, senza requisiti rossi «Completare il Palazzo».
// Uso (dalla cartella di sviluppo): node prova-l4-gesti.cjs <porta> <cartella dati della copia> <uscita.json>
const D = require(process.cwd() + '/node_modules/better-sqlite3');
const fs = require('fs');
const path = require('path');
const [porta, dir, uscita] = process.argv.slice(2);
if (['3201', '3301', '3302'].includes(String(porta))) { console.error('porta condivisa: rifiuto'); process.exit(2); }
const db = new D(path.join(dir, 'gioco.db'), { readonly: true, fileMustExist: true });
db.exec(`ATTACH '${path.join(dir, 'partite.db').replace(/'/g, "''")}' AS utente`);
const base = `http://localhost:${porta}/api`;
const log = []; let errori = 0;
const esito = (ok, cosa, dati) => { if (!ok) errori++; log.push({ ok, cosa, dati }); console.log(`${ok ? 'OK ' : 'KO '} ${cosa}${dati !== undefined ? ' — ' + JSON.stringify(dati).slice(0, 300) : ''}`); };
const api = async (m, u, b) => { const r = await fetch(base + u, { method: m, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, json: j }; };
const dungeon = async (p, dg, inf) => (await api('GET', `/compendio/dungeon/${dg}?partita=${p}${inf ? '&infiltrazione=' + encodeURIComponent(inf) : ''}`)).json.data;
const voce = (d, k) => { for (const a of d.aree) { const v = a.punti.find((x) => x.chiave === k); if (v) return { ...v, infiltrazione: a.chiave }; } return null; };
const specchio = (p, k) => db.prepare('select stato from utente.punto_partita where partita_id=? and punto_chiave=?').get(p, k)?.stato ?? null;
const nuovaPartita = async (nome) => { const r = await api('POST', '/partite', { nome, attiva: false }); return r.json?.data?.id; };

(async () => {
  esito((await api('GET', '/health')).status === 200, 'istanza della copia in ascolto');
  // ---------- NR4-1 ----------
  const p = await nuovaPartita('Prova no-reg L4 gesti');
  esito(!!p, 'partita di prova per i gesti', { id: p });
  let d = await dungeon(p, 'madarame');
  // voce con più pin (la più grande), tutti da fare
  const tutte = d.aree.flatMap((a) => a.punti.map((v) => ({ ...v, infiltrazione: a.chiave })));
  const v8 = tutte.filter((v) => v.avanzamento && v.avanzamento.totale > 1).sort((a, b) => b.avanzamento.totale - a.avanzamento.totale)[0];
  const N = v8.avanzamento.totale;
  esito(v8.avanzamento.fatti === 0, `voce più grande: ${v8.chiave} (${v8.nome}), ${N} pin, 0/${N}`);
  const pin0 = v8.pin[0].id, pin1 = v8.pin[1].id;
  let r = await api('PUT', `/partite/${p}/spilli/${pin0}`, { raccolto: true, infiltrazione: v8.infiltrazione });
  d = await dungeon(p, 'madarame', v8.infiltrazione); let v = voce(d, v8.chiave);
  esito(r.status === 200 && v.avanzamento.fatti === 1 && v.pin.filter((x) => x.fatto).length === 1 && v.stato == null && specchio(p, v8.chiave) === null,
    `raccolto 1 pin → voce 1/${N}, gli altri ${N - 1} pin invariati, voce non segnata`, { status: r.status, avanzamento: v.avanzamento, pinFatti: v.pin.filter((x) => x.fatto).length, stato: v.stato });
  r = await api('PUT', `/partite/${p}/punti`, { punto: v8.chiave, stato: 'ottenuto' });
  d = await dungeon(p, 'madarame', v8.infiltrazione); v = voce(d, v8.chiave);
  esito(r.status === 200 && v.avanzamento.fatti === N && v.pin.every((x) => x.fatto) && specchio(p, v8.chiave) === 'ottenuto',
    `«Segna» sulla voce → ${N}/${N}, tutti i pin fatti, specchio «ottenuto»`, { status: r.status, avanzamento: v.avanzamento, effetti: r.json?.data?.effetti ?? r.json?.effetti ?? null });
  r = await api('PUT', `/partite/${p}/spilli/${pin1}`, { raccolto: false, infiltrazione: v8.infiltrazione });
  d = await dungeon(p, 'madarame', v8.infiltrazione); v = voce(d, v8.chiave);
  esito(r.status === 200 && v.avanzamento.fatti === N - 1 && v.stato == null && specchio(p, v8.chiave) === null,
    `tolto 1 pin → ${N - 1}/${N}, la voce non è più fatta e lo specchio sparisce`, { status: r.status, avanzamento: v.avanzamento, stato: v.stato, specchio: specchio(p, v8.chiave) });
  // pin con due voci (non descrittive): segnate le due voci, togliere il pin le riapre entrambe (R4-11)
  const perPin = new Map();
  for (const x of tutte) if (x.avanzamento) for (const q of x.pin) { if (!perPin.has(q.id)) perPin.set(q.id, []); perPin.get(q.id).push(x); }
  const [pinDue, vociDue] = [...perPin].find(([, vs]) => vs.length >= 2 && new Set(vs.map((x) => x.infiltrazione)).size === 1) ?? [...perPin].find(([, vs]) => vs.length >= 2) ?? [];
  if (pinDue) {
    for (const x of vociDue) await api('PUT', `/partite/${p}/punti`, { punto: x.chiave, stato: 'ottenuto' });
    const prima = vociDue.map((x) => specchio(p, x.chiave));
    r = await api('PUT', `/partite/${p}/spilli/${pinDue}`, { raccolto: false, infiltrazione: vociDue[0].infiltrazione });
    const dopo = vociDue.map((x) => specchio(p, x.chiave));
    esito(r.status === 200 && prima.every((s) => s === 'ottenuto') && dopo.every((s) => s === null),
      `pin ${pinDue} con ${vociDue.length} voci: tolto il pin si riaprono tutte`, { voci: vociDue.map((x) => x.chiave), prima, dopo });
  } else esito(false, 'nessun pin con due voci trovato');
  // pin condiviso da rigenerabili di più infiltrazioni: raccolto in una, resta da fare nell'altra
  const condiviso = [...perPin].find(([, vs]) => new Set(vs.map((x) => x.infiltrazione)).size >= 2 && vs.every((x) => x.carattere === 'rigenerabile'));
  if (condiviso) {
    const [pc, vs] = condiviso;
    const inf = [...new Set(vs.map((x) => x.infiltrazione))];
    const p2 = await nuovaPartita('Prova no-reg L4 condivisi');
    r = await api('PUT', `/partite/${p2}/spilli/${pc}`, { raccolto: true, infiltrazione: inf[0] });
    const stati = [];
    for (const i of inf) { const dd = await dungeon(p2, 'madarame', i); const vv = vs.filter((x) => x.infiltrazione === i).map((x) => voce(dd, x.chiave)); stati.push({ i, pinFatto: vv.map((x) => x.pin.find((q) => q.id === pc)?.fatto), avanzamento: vv.map((x) => x.avanzamento) }); }
    esito(r.status === 200 && stati[0].pinFatto.every(Boolean) && stati.slice(1).every((s) => s.pinFatto.every((f) => !f)),
      `pin condiviso ${pc} raccolto in «${inf[0]}» resta da fare in ${inf.slice(1).join(', ')}`, { stati });
  } else esito(false, 'nessun pin condiviso da rigenerabili di più infiltrazioni trovato');

  // ---------- NR4-2 (2) ----------
  const q = await nuovaPartita('Prova no-reg L4 concluso non completato');
  esito(!!q, 'partita di prova per il Palazzo concluso e non completato', { id: q });
  let k = await dungeon(q, 'kamoshida');
  const kt = k.aree.flatMap((a) => a.punti.map((x) => ({ ...x, infiltrazione: a.chiave })));
  const bossK = db.prepare("select voce_boss_finale v from dungeon where chiave='kamoshida'").get().v;
  const perm = kt.filter((x) => x.carattere === 'permanente' && x.chiave !== bossK && !x.pin.some((pp) => pp.tipo === 'tesoro-palazzo'));
  const lasciate = new Set(perm.slice(-15).map((x) => x.chiave));
  let ko = 0;
  for (const x of kt) {
    if (lasciate.has(x.chiave) || x.carattere === 'descrittiva' || !x.carattere) continue;
    const rr = await api('PUT', `/partite/${q}/punti`, { punto: x.chiave, stato: 'ottenuto' }); if (rr.status !== 200) ko++;
  }
  // Tesoro: tutti i pin tesoro-palazzo
  const tesori = db.prepare(`with recursive t(c) as (select 'dungeon-kamoshida' union all select m.chiave from mappa m join t on m.genitore_chiave=t.c)
    select s.id from spillo s join t on s.mappa_chiave=t.c where s.tipo='tesoro-palazzo'`).all();
  for (const t of tesori) { const rr = await api('PUT', `/partite/${q}/spilli/${t.id}`, { raccolto: true }); if (rr.status !== 200) ko++; }
  k = await dungeon(q, 'kamoshida');
  const c = k.completamento;
  esito(ko === 0 && c.tesoro && c.boss && c.concluso && !c.completato && c.oggetti - c.fatti === 15,
    'Kamoshida: Tesoro e boss fatti, 15 permanenti non segnate → concluso e NON completato', { errori: ko, completamento: c, concluso: k.concluso, completato: k.completato });
  const lista = (await api('GET', `/compendio/dungeon?partita=${q}`)).json.data;
  const riga = lista.find((x) => x.chiave === 'kamoshida');
  esito(!!riga && !!riga.concluso && !riga.completato, 'elenco dei Palazzi: Kamoshida concluso, non completato', { concluso: riga?.concluso, completato: riga?.completato });
  // metro: Kamoshida assente (oggi della partita di prova)
  const citta = (await api('GET', `/compendio/citta?partita=${q}`)).json.data;
  const tokyo = (await api('GET', `/mappe/tokyo?partita=${q}`)).json?.data;
  const attiva = (await api('GET', `/partite/${q}`)).json?.data;
  esito(true, 'giorno della partita di prova', { data: attiva?.dataGioco ?? attiva?.data_gioco, fascia: attiva?.fasciaGioco });
  const sj = JSON.stringify(citta) + JSON.stringify(tokyo);
  const ingressi = (sj.match(/ingresso-palazzo[^}]{0,200}kamoshida|kamoshida[^}]{0,200}ingresso-palazzo/g) || []).length;
  esito(true, 'riferimenti a un ingresso di Kamoshida nelle risposte di città e Tokyo (da leggere)', { occorrenze: ingressi });
  // requisiti rossi «Completare il Palazzo di Kamoshida» nel diario 04-09..06-01
  const giorni = db.prepare("select distinct data from voce_giornata where data between '04-09' and '06-30' order by data").all().map((x) => x.data);
  const rossi = [];
  for (const g of giorni) {
    const pj = JSON.stringify((await api('GET', `/compendio/percorso/${g}?partita=${q}`)).json?.data ?? {});
    for (const m of pj.matchAll(/[^"]{0,120}Palazzo di Kamoshida[^"]{0,160}/g)) if (/manca|non risulta|Completare/i.test(m[0])) rossi.push(`${g}: ${m[0].slice(0, 200)}`);
  }
  esito(rossi.length === 0, 'nessun requisito rosso su Kamoshida nel diario 04-09..06-30', { righe: rossi.slice(0, 6), totale: rossi.length });
  fs.writeFileSync(uscita, JSON.stringify({ errori, log }, null, 1));
  console.log(`\nerrori: ${errori}`);
  process.exit(errori ? 1 : 0);
})();
