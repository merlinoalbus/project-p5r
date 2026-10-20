// Sola lettura: confronta due uscite di impronta.cjs (PM) voce per voce e pin per pin, ignorando le chiavi indicate
// (es. le colonne nuove di voce_giornata di L3, escluse per modifiche.md §1.4). Stampa ogni differenza.
// Uso: node confronta-impronta.cjs <prima.json> <dopo.json> [chiave,chiave,...]
const fs = require('fs');
const [fa, fb, ign] = process.argv.slice(2);
const ignora = new Set((ign || '').split(',').filter(Boolean));
const A = JSON.parse(fs.readFileSync(fa, 'utf8'));
const B = JSON.parse(fs.readFileSync(fb, 'utf8'));
const pul = (v) => JSON.parse(JSON.stringify(v, (k, x) => (ignora.has(k) ? undefined : x)));
const d = [];
const cmp = (x, y, p) => {
  if (JSON.stringify(x) === JSON.stringify(y)) return;
  if (x && y && typeof x === 'object' && typeof y === 'object' && !Array.isArray(x)) { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) cmp(x[k], y[k], `${p}.${k}`); }
  else d.push(`${p}: ${JSON.stringify(x)?.slice(0, 160)} → ${JSON.stringify(y)?.slice(0, 160)}`);
};
cmp(pul(A), pul(B), 'impronta');
console.log(`chiavi ignorate: ${[...ignora].join(', ') || '(nessuna)'}; differenze: ${d.length}`);
d.slice(0, 60).forEach((x) => console.log('  ' + x));
