// Sola lettura: confronta due istantanee API grezze (api-istantanea.cjs con GREZZO=1) e spiega ogni differenza: vale «spiegata» solo se
// il valore dopo è identico al valore prima con ogni `?v=<data>` diventato `?v=<data>~r2` (generazione delle miniature, UX2-13).
// Per ogni differenza spiegata registra il tipo di URL (immagine caricata di mappa, grafica predefinita, altro) e il campo.
// Uso: node spiega-v-r2.cjs <prima.json> <dopo.json> <uscita.txt>
const fs = require('fs');
const [aF, bF, uscita] = process.argv.slice(2);
const A = JSON.parse(fs.readFileSync(aF, 'utf8'));
const B = JSON.parse(fs.readFileSync(bF, 'utf8'));
const conR2 = (s) => s.replace(/([?&]v=)([^&"\\]*)/g, (m, p, v) => (v.endsWith('~r2') || v.endsWith('%7Er2') ? m : `${p}${v}~r2`));
const righe = []; const perTipo = {}; const perCampo = {}; let spiegate = 0, nonSpiegate = 0;
const tipo = (u) => /\/api\/immagini\/mappa\//.test(u) ? 'immagine caricata di mappa (ambito mappa)' : /\/api\/immagini\/mappe\//.test(u) ? 'grafica predefinita delle mappe (ambito mappe, es. native)' : /\/api\/immagini\/palazzi\//.test(u) ? 'stemma di Palazzo (ambito palazzi)' : /\/api\/immagini\//.test(u) ? 'altra immagine del database' : 'altro';
const diff = (a, b, p, e) => {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], `${p}.${k}`, e); return; }
  const ok = typeof a === 'string' && typeof b === 'string' && (conR2(a) === b || conR2(a) === decodeURIComponent(b) || encodeURIComponent(conR2(a)) === b || conR2(a).replace(/~r2/g, '%7Er2') === b);
  const campo = p.replace(/\.\d+/g, '[]');
  if (ok) { spiegate++; const t = tipo(b); perTipo[t] = (perTipo[t] || 0) + 1; perCampo[`${e} ${campo}`] = (perCampo[`${e} ${campo}`] || 0) + 1; }
  else { nonSpiegate++; righe.push(`NON SPIEGATA ${e} ${p}: ${JSON.stringify(a)?.slice(0, 200)} → ${JSON.stringify(b)?.slice(0, 200)}`); }
};
for (const e of new Set([...Object.keys(A), ...Object.keys(B)])) diff(A[e], B[e], '', e);
const out = [`differenze spiegate (stesso valore con ?v=<data>~r2): ${spiegate}`, `non spiegate: ${nonSpiegate}`, '', 'per tipo di URL:',
  ...Object.entries(perTipo).map(([k, v]) => `  ${v}  ${k}`), '', 'per endpoint e campo:', ...Object.entries(perCampo).map(([k, v]) => `  ${v}  ${k}`), '', ...righe];
fs.writeFileSync(uscita, out.join('\n'));
console.log(out.slice(0, 12).join('\n'));
