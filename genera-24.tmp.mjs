import Database from 'better-sqlite3';
import fs from 'node:fs';
const db = new Database('data/project-p5r.db', { readonly: true });
// Per ogni tipo di azione del percorso: quante volte compare e tre frasi vere fra quelle che
// l'app scrive accanto all'icona nella Guida del giorno.
const conta = {}, esempi = {};
for (const r of db.prepare('select data, azioni_json from giorno_percorso order by data').all()) {
  for (const a of JSON.parse(r.azioni_json || '[]')) {
    conta[a.tipo] = (conta[a.tipo] || 0) + 1;
    (esempi[a.tipo] = esempi[a.tipo] || []);
    if (esempi[a.tipo].length < 3 && a.azione) esempi[a.tipo].push(`${r.data} · «${String(a.azione).replace(/\s+/g,' ').slice(0,110)}»`);
  }
}
let out = '';
for (const t of Object.keys(conta).sort((x, y) => conta[y] - conta[x])) {
  out += `\n### \`ui/categoria-${t}.png\` — azione «${t}» (${conta[t]} volte in una partita intera)\nTesto che l'app mostra accanto all'icona:\n`;
  for (const e of esempi[t]) out += `- ${e}\n`;
}
fs.writeFileSync('blocco-24.tmp.md', out);
console.log('tipi:', Object.keys(conta).length);
db.close();
