// Impronta in sola lettura di un DB SQLite: per tabella, numero di righe e hash del contenuto ordinato.
// Uso: node impronta-db.cjs <db> [uscita.json]   — confronto: node impronta-db.cjs --confronta a.json b.json
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const radice = 'C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941';
const Database = require(path.join(radice, 'node_modules/better-sqlite3'));

if (process.argv[2] === '--confronta') {
  const a = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const b = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
  const nomi = new Set([...Object.keys(a), ...Object.keys(b)]);
  let diff = 0;
  for (const n of [...nomi].sort()) {
    const x = a[n], y = b[n];
    if (!x || !y || x.righe !== y.righe || x.hash !== y.hash) { diff++; console.log('DIVERSA', n, JSON.stringify(x), '→', JSON.stringify(y)); }
  }
  console.log(diff === 0 ? 'NESSUNA DIFFERENZA' : `${diff} tabelle diverse`);
  process.exit(0);
}
const db = new Database(process.argv[2], { readonly: true, fileMustExist: true });
const tabelle = db.prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name").all();
const out = {};
for (const { name } of tabelle) {
  const righe = db.prepare(`select * from "${name}"`).raw().all();
  const testi = righe.map((r) => JSON.stringify(r.map((v) => (Buffer.isBuffer(v) ? 'B:' + crypto.createHash('sha1').update(v).digest('hex') : typeof v === 'bigint' ? String(v) : v)))).sort();
  const h = crypto.createHash('sha1');
  for (const t of testi) h.update(t + '\n');
  out[name] = { righe: righe.length, hash: h.digest('hex') };
}
const s = JSON.stringify(out, null, 1);
if (process.argv[3]) fs.writeFileSync(process.argv[3], s); else console.log(s);
