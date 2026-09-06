import fs from 'node:fs';
import {initDb,closeDb} from '../server/db/dbService.js';
import {runMigrations} from '../server/db/migrationRunner.js';
import {sincronizzaPercorsiMappe} from '../server/services/mappe/percorsiMappe.js';
import {caricaSeed} from '../server/services/seed/caricaSeed.js';
const [dbPath,planPath,reportPath,seedPath]=process.argv.slice(2);
if(!dbPath||!planPath||!reportPath)throw Error('Database, piano e report richiesti');
const plan=JSON.parse(fs.readFileSync(planPath,'utf8')) as {roots:Array<{source:string;target:string;title:string}>;renames:Array<{key:string;title:string}>};
const db=initDb(dbPath);runMigrations(db);
const snapshot=()=>Object.fromEntries(['mappa','spillo','spillo_partita','spillo_immagine','spillo_destinazione','quartiere_ingresso','mappa_alias','mappa_percorso'].map(t=>[t,db.prepare('SELECT * FROM '+t+' ORDER BY 1').all()]));
const before=snapshot();const changes:{roots:string[];names:string[]}={roots:[],names:[]};
db.transaction(()=>{
 for(const row of plan.roots){
  const old=db.prepare('SELECT * FROM mappa WHERE chiave=?').get(row.source) as {immagine_chiave:string|null;asset:string|null;note:string}|undefined;
  if(!old)continue;
  if(!db.prepare('SELECT 1 FROM mappa WHERE chiave=?').get(row.target))throw Error('Destinazione assente '+row.target);
  if(old.immagine_chiave||old.asset||old.note!=='Raggruppamento delle risorse per codice originale. Non certifica adiacenza, ordine narrativo o disponibilità.')throw Error('Contenuto da conservare nella radice '+row.source);
  for(const [table,column] of [['spillo','mappa_chiave'],['spillo_destinazione','mappa_chiave'],['quartiere_ingresso','mappa_chiave']])if(db.prepare(`SELECT 1 FROM ${table} WHERE ${column}=?`).get(row.source))throw Error('Coordinate da trasformare '+row.source);
  db.prepare('UPDATE mappa SET genitore_chiave=? WHERE genitore_chiave=?').run(row.target,row.source);
  db.prepare("UPDATE spillo SET riferimento_chiave=? WHERE riferimento_tipo='mappa' AND riferimento_chiave=?").run(row.target,row.source);
  db.prepare('UPDATE mappa_alias SET mappa_chiave=? WHERE mappa_chiave=?').run(row.target,row.source);
  db.prepare('INSERT OR IGNORE INTO mappa_alias(chiave,mappa_chiave) SELECT chiave,? FROM mappa_percorso WHERE mappa_chiave=?').run(row.target,row.source);
  db.prepare('DELETE FROM mappa WHERE chiave=?').run(row.source);changes.roots.push(row.source);
 }
 for(const row of plan.renames){
  const current=db.prepare('SELECT nome FROM mappa WHERE chiave=?').get(row.key) as {nome:string}|undefined;
  if(!current)throw Error('Mappa assente '+row.key);
  const expected=(plan as unknown as {snapshot:{mappa:Array<{chiave:string;nome:string}>}}).snapshot.mappa.find(m=>m.chiave===row.key)?.nome;
  if(current.nome!==row.title&&current.nome!==expected)throw Error('Nome modificato dopo piano '+row.key);
  if(current.nome!==row.title){db.prepare('UPDATE mappa SET nome=?,updated_at=? WHERE chiave=?').run(row.title,new Date().toISOString(),row.key);changes.names.push(row.key);}
 }
 sincronizzaPercorsiMappe(db);
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Riferimenti non validi');
})();
const after=snapshot();
if(seedPath)caricaSeed(db,seedPath);
const reboot=snapshot();
for(const row of plan.roots)if(db.prepare('SELECT 1 FROM mappa WHERE chiave=?').get(row.source))throw Error('Radice ricreata '+row.source);
for(const t of ['spillo_partita','spillo_immagine','spillo_destinazione','quartiere_ingresso'])if(JSON.stringify(before[t])!==JSON.stringify(after[t])||JSON.stringify(after[t])!==JSON.stringify(reboot[t]))throw Error('Regressione '+t);
if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Riferimenti non validi dopo seed');
fs.writeFileSync(reportPath,JSON.stringify({changes,before,after,reboot,integrity:db.prepare('PRAGMA integrity_check').all()},null,2));closeDb();
console.log(JSON.stringify({roots:changes.roots.length,names:changes.names.length,report:reportPath}));
