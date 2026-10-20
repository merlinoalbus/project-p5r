// Sola lettura: confronta due fotografie (fotografia.cjs) solo sulle colonne che esistono in entrambe, riga per riga e campo per campo.
// Serve a dire se una migrazione ha cambiato un valore che c'era già (non solo aggiunto colonne o righe).
// Uso: node confronta-colonne-comuni.cjs <prima.json> <dopo.json> [max righe di dettaglio per tabella]
const fs = require('fs');
const [aF, bF, maxS] = process.argv.slice(2);
const max = Number(maxS || 20);
const A = JSON.parse(fs.readFileSync(aF, 'utf8'));
const B = JSON.parse(fs.readFileSync(bF, 'utf8'));
const tabelle = (f) => f.tabelle ?? f;
const ta = tabelle(A), tb = tabelle(B);
let totale = 0;
for (const nome of Object.keys(ta)) {
  const x = ta[nome], y = tb[nome];
  if (!y || !x || !x.dati || !y.dati) continue;
  const comuni = (x.colonne || []).filter((c) => (y.colonne || []).includes(c));
  const mappaY = new Map(Object.entries(y.dati));
  const diverse = [];
  for (const [chiave, riga] of Object.entries(x.dati)) {
    const r2 = mappaY.get(chiave);
    if (!r2) { diverse.push(`- ${chiave} (tolta)`); continue; }
    const campi = comuni.filter((c) => JSON.stringify(riga[c]) !== JSON.stringify(r2[c]));
    if (campi.length) diverse.push(`~ ${chiave}: ` + campi.map((c) => `${c} ${JSON.stringify(riga[c])} → ${JSON.stringify(r2[c])}`).join('; '));
  }
  const aggiunte = [...mappaY.keys()].filter((k) => !(k in x.dati));
  if (diverse.length || aggiunte.length) {
    totale++;
    console.log(`# ${nome}: valori cambiati ${diverse.filter((d) => d.startsWith('~')).length}, tolte ${diverse.filter((d) => d.startsWith('-')).length}, aggiunte ${aggiunte.length}`);
    diverse.slice(0, max).forEach((d) => console.log('   ' + d.slice(0, 400)));
    aggiunte.slice(0, Math.min(max, 5)).forEach((k) => console.log('   + ' + k));
  }
}
console.log(`tabelle con valori cambiati, righe tolte o aggiunte: ${totale}`);
