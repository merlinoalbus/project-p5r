// Collaudo — foto e ripristino di data/ dell'istanza di collaudo (p5s-sviluppo-l2, BE 3301), con impronta completa del contenuto.
// Uso (dalla cartella dell'istanza, per trovare node_modules):
//   node collaudo-dati.cjs impronta  <cartella con gioco.db e partite.db> <file json di uscita>
//   node collaudo-dati.cjs foto      <cartella data/> <cartella della foto>      (a server acceso o fermo: API di backup, sorgente in sola lettura)
//   node collaudo-dati.cjs ripristina <cartella della foto> <cartella data/>     (SOLO a server fermo: lo script lo controlla sulla porta)
//   node collaudo-dati.cjs confronta <impronta A.json> <impronta B.json>
// L'impronta copre OGNI tabella dei due file (schema, user_version, conteggio e sha256 delle righe in ordine stabile, BLOB compresi):
// dopo un ripristino deve coincidere con quella della foto, tabella per tabella.
const Database = require(process.cwd() + '/node_modules/better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const FILE = ['gioco.db', 'partite.db'];
// la porta del BE dell'istanza: 3301 il collaudo, 3302 l'anteprima (variabile PORTA_BE)
const PORTA_BE = Number(process.env.PORTA_BE || 3301);

function improntaFile(file) {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  const esito = { user_version: db.pragma('user_version', { simple: true }), schema: null, tabelle: {} };
  const oggetti = db.prepare(`select type, name, tbl_name, sql from sqlite_master where name not like 'sqlite_%' order by type, name`).all();
  esito.schema = crypto.createHash('sha256').update(JSON.stringify(oggetti)).digest('hex');
  for (const { name } of oggetti.filter(o => o.type === 'table')) {
    const q = '"' + name.replace(/"/g, '""') + '"';
    const colonne = db.prepare(`select name from pragma_table_info(?)`).all(name).map(c => c.name);
    let ordine;
    try { db.prepare(`select rowid from ${q} limit 1`).get(); ordine = 'rowid'; }
    catch { ordine = colonne.map((_, i) => i + 1).join(','); } // tabelle WITHOUT ROWID: ordine su tutte le colonne
    const h = crypto.createHash('sha256');
    let righe = 0;
    for (const r of db.prepare(`select ${ordine === 'rowid' ? 'rowid as __rowid, ' : ''}* from ${q} order by ${ordine}`).raw().iterate()) {
      for (const v of r) {
        if (Buffer.isBuffer(v)) { h.update('B' + v.length + ':'); h.update(v); }
        else h.update(typeof v === 'bigint' ? 'N' + v.toString() : JSON.stringify(v));
        h.update('\u0001');
      }
      h.update('\u0002');
      righe++;
    }
    esito.tabelle[name] = { righe, sha256: h.digest('hex') };
  }
  db.close();
  return esito;
}

function impronta(dir) {
  const out = {};
  for (const f of FILE) out[f] = improntaFile(path.join(dir, f));
  return out;
}

function confronta(a, b) {
  const diff = [];
  for (const f of FILE) {
    if (a[f].user_version !== b[f].user_version) diff.push(`${f}: user_version ${a[f].user_version} ≠ ${b[f].user_version}`);
    if (a[f].schema !== b[f].schema) diff.push(`${f}: schema diverso`);
    const nomi = new Set([...Object.keys(a[f].tabelle), ...Object.keys(b[f].tabelle)]);
    for (const t of [...nomi].sort()) {
      const x = a[f].tabelle[t], y = b[f].tabelle[t];
      if (!x || !y) diff.push(`${f}.${t}: presente solo in ${x ? 'A' : 'B'}`);
      else if (x.sha256 !== y.sha256) diff.push(`${f}.${t}: righe ${x.righe} → ${y.righe}, contenuto diverso`);
    }
  }
  return diff;
}

function portaInAscolto(porta) {
  const out = execSync('netstat -ano', { encoding: 'utf8' });
  return out.split(/\r?\n/).some(l => /^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING/.test(l) && l.trim().split(/\s+/)[1].endsWith(':' + porta));
}

function sintesi(imp) {
  return Object.fromEntries(FILE.map(f => [f, { user_version: imp[f].user_version, tabelle: Object.keys(imp[f].tabelle).length,
    righe: Object.values(imp[f].tabelle).reduce((s, t) => s + t.righe, 0) }]));
}

(async () => {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === 'impronta') {
    const imp = impronta(a);
    fs.writeFileSync(b, JSON.stringify(imp, null, 1));
    console.log(JSON.stringify(sintesi(imp)));
  } else if (cmd === 'foto') {
    if (fs.existsSync(b) && fs.readdirSync(b).length) throw new Error(`la cartella della foto ${b} esiste già e non è vuota`);
    fs.mkdirSync(b, { recursive: true });
    for (const f of FILE) {
      const db = new Database(path.join(a, f), { readonly: true, fileMustExist: true });
      await db.backup(path.join(b, f));
      db.close();
    }
    for (const f of FILE) {
      const c = new Database(path.join(b, f), { readonly: true });
      const ok = c.pragma('integrity_check', { simple: true });
      c.close();
      if (ok !== 'ok') throw new Error(`${f}: integrity_check ${ok}`);
    }
    const imp = impronta(b);
    fs.writeFileSync(path.join(b, 'impronta.json'), JSON.stringify(imp, null, 1));
    console.log('FOTO OK', b, JSON.stringify(sintesi(imp)));
  } else if (cmd === 'ripristina') {
    if (portaInAscolto(PORTA_BE)) throw new Error(`il BE è ancora in ascolto su ${PORTA_BE}: fermarlo prima del ripristino`);
    const attesa = JSON.parse(fs.readFileSync(path.join(a, 'impronta.json'), 'utf8'));
    for (const f of FILE) {
      for (const suf of ['', '-wal', '-shm', '-journal']) {
        const p = path.join(b, f + suf);
        if (fs.existsSync(p)) fs.rmSync(p);
      }
      fs.copyFileSync(path.join(a, f), path.join(b, f));
    }
    const dopo = impronta(b);
    const diff = confronta(attesa, dopo);
    console.log(diff.length ? 'RIPRISTINO DIVERSO DALLA FOTO:\n' + diff.join('\n') : 'RIPRISTINO OK: impronta identica alla foto ' + JSON.stringify(sintesi(dopo)));
    if (diff.length) process.exit(2);
  } else if (cmd === 'confronta') {
    const diff = confronta(JSON.parse(fs.readFileSync(a, 'utf8')), JSON.parse(fs.readFileSync(b, 'utf8')));
    console.log(diff.length ? diff.join('\n') : 'IDENTICHE');
    if (diff.length) process.exit(2);
  } else {
    throw new Error('comando: impronta | foto | ripristina | confronta');
  }
})().catch(e => { console.error('ERRORE:', e.message); process.exit(1); });
