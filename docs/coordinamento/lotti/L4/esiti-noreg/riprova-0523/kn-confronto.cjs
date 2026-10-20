// Sola lettura (solo GET): il contatore k/N (`avanzamento` delle voci, L4 §8.11) di Kamoshida e Madarame per p1 e p2, confrontato voce per
// voce con gli attesi di Analisi dati sulla base p5s-0503Z (dati.md §11.8–11.9): p1 tutte N/N; p2 come §11.6 (atteso-kn.json) più
// «scontro-con-madarame-2» 0/2. Uso: node kn-confronto.cjs <porta> <atteso-kn.json> <uscita.json>
const fs = require('fs');
const [porta, attesoF, uscita] = process.argv.slice(2);
const atteso = JSON.parse(fs.readFileSync(attesoF, 'utf8'));
atteso.push({ palazzo: 'madarame', infiltrazione: 'il-furto-del-cuore-di-madarame', voce: 'il-furto-del-cuore-di-madarame-scontro-con-madarame-2', tipo: 'boss (P)', p1: [2, 2], p2: [0, 2] });
const attesi = new Map(atteso.map((a) => [`${a.palazzo}-${a.voce}`, a]));
(async () => {
  const righe = [], diverse = [], fuoriElenco = [];
  for (const p of [1, 2]) {
    for (const dg of ['kamoshida', 'madarame']) {
      const d = (await (await fetch(`http://localhost:${porta}/api/compendio/dungeon/${dg}?partita=${p}`)).json()).data;
      for (const a of d.aree) for (const v of a.punti) {
        const av = v.avanzamento ?? null;
        if (!av) continue;
        const att = attesi.get(v.chiave);
        const kN = [av.fatti, av.totale];
        if (!att) { if (av.totale > 1) fuoriElenco.push(`p${p} ${v.chiave} ${kN.join('/')}`); continue; }
        const exp = p === 1 ? [att.p1[1], att.p1[1]] : att.p2;
        righe.push({ p, voce: v.chiave, kN, atteso: exp, stato: v.stato });
        if (kN[0] !== exp[0] || kN[1] !== exp[1]) diverse.push(`p${p} ${v.chiave}: ${kN.join('/')} invece di ${exp.join('/')}`);
      }
      righe.push({ p, riepilogo: dg, completato: d.completato, concluso: d.concluso, completamento: d.completamento });
    }
  }
  const viste = (p) => new Set(righe.filter((r) => r.p === p && r.voce).map((r) => r.voce));
  const mancanti = [1, 2].flatMap((p) => [...attesi.keys()].filter((k) => !viste(p).has(k)).map((k) => `p${p} ${k}`));
  const conta = (p) => righe.filter((r) => r.p === p && r.voce).reduce((a, r) => { const s = r.kN[0] === r.kN[1] ? 'fatte' : r.kN[0] ? 'in corso' : 'da fare'; a[s] = (a[s] || 0) + 1; return a; }, {});
  fs.writeFileSync(uscita, JSON.stringify({ righe, diverse, mancanti, fuoriElenco }, null, 1));
  console.log('p1', JSON.stringify(conta(1)), 'p2', JSON.stringify(conta(2)));
  console.log('diverse dagli attesi:', diverse.length); diverse.slice(0, 20).forEach((x) => console.log('  ' + x));
  console.log('attese ma senza contatore:', mancanti.length); mancanti.slice(0, 20).forEach((x) => console.log('  ' + x));
  console.log('con N>1 fuori elenco:', fuoriElenco.length); fuoriElenco.slice(0, 20).forEach((x) => console.log('  ' + x));
  for (const r of righe.filter((r) => r.riepilogo)) console.log(`p${r.p} ${r.riepilogo}: concluso ${JSON.stringify(r.concluso)} · completato ${JSON.stringify(r.completato)} · ${JSON.stringify(r.completamento)}`);
})();
