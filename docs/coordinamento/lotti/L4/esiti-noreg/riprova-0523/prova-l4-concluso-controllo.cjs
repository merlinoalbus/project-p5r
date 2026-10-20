// NR4-2 (2), parte con il controllo: SOLO su un'istanza mia su copia (rifiuta 3201, 3301, 3302). Porta la partita di prova «concluso e non
// completato» (id dato) dentro la finestra di Kamoshida e crea una partita di controllo con il solo boss (Tesoro mancante → non concluso).
// Confronta le due: elenco dei Palazzi, ingresso dalla Shujin (pin «Palazzo di Kamoshida»), requisiti «dopo il Palazzo» nel diario.
// Uso: node prova-l4-concluso-controllo.cjs <porta> <id partita concluso> <data in finestra, es. 04-20>
const [porta, idConcluso, data] = process.argv.slice(2);
if (['3201', '3301', '3302'].includes(String(porta))) { console.error('porta condivisa: rifiuto'); process.exit(2); }
const base = `http://localhost:${porta}/api`;
const api = async (m, u, b) => { const r = await fetch(base + u, { method: m, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, json: j }; };
(async () => {
  const ctrl = (await api('POST', '/partite', { nome: 'Prova no-reg L4 controllo (solo boss)', attiva: false })).json.data.id;
  const boss = 'kamoshida-rubare-i-desideri-del-cuore-sconfiggi-kamoshida';
  console.log('controllo', ctrl, 'boss segnato', (await api('PUT', `/partite/${ctrl}/punti`, { punto: boss, stato: 'ottenuto' })).status);
  for (const p of [Number(idConcluso), ctrl]) console.log('data', p, (await api('PUT', `/partite/${p}`, { dataGioco: data })).status);
  for (const p of [Number(idConcluso), ctrl]) {
    const k = (await api('GET', `/compendio/dungeon?partita=${p}`)).json.data.find((x) => x.chiave === 'kamoshida');
    const shujin = (await api('GET', `/mappe/citta-shujin-academy?partita=${p}`)).json?.data;
    const pin = (shujin?.spilli ?? []).filter((s) => /Kamoshida/.test(s.nome ?? '')).map((s) => ({ id: s.id, nome: s.nome, tipo: s.tipo, disponibile: s.disponibilita ?? s.disponibile ?? null, nascosto: s.nascosto ?? null }));
    const giorni = ['04-20', '05-02', '05-03', '05-05', '05-10'];
    let requisiti = [];
    for (const g of giorni) {
      const pj = JSON.stringify((await api('GET', `/compendio/percorso/${g}?partita=${p}`)).json?.data ?? {});
      for (const m of pj.matchAll(/[^"]{0,80}Palazzo di Kamoshida[^"]{0,120}/g)) if (/manca|non risulta|Completare/i.test(m[0])) requisiti.push(`${g}: ${m[0].slice(0, 180)}`);
    }
    console.log(`\npartita ${p} (${p === ctrl ? 'controllo: solo boss' : 'Tesoro + boss, 15 permanenti mancanti'}):`);
    console.log('  elenco:', JSON.stringify({ concluso: k?.concluso, completato: k?.completato, completamento: k?.completamento }));
    console.log('  pin di Kamoshida sulla Shujin:', JSON.stringify(pin).slice(0, 500));
    console.log('  requisiti su Kamoshida (', requisiti.length, '):', requisiti.slice(0, 3).join(' | '));
  }
})();
