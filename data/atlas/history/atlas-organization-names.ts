import fs from 'node:fs';
import { rettificaNomiSpilliSeed } from '../server/services/mappe/mappeService.js';
import { RETTIFICHE_NOMI_SEED } from '../server/services/mappe/rettificheNomiSeed.js';
import path from 'node:path';
import crypto from 'node:crypto';
import { initDb, closeDb } from '../server/db/dbService.js';
import { sincronizzaPercorsiMappe } from '../server/services/mappe/percorsiMappe.js';

type Row = Record<string, unknown>;
interface Update { nome: string; tipo: string; genitore: string|null; entita?: { tipo:string;chiave:string } }
interface Patch { chiave:string;contesti?:Array<{id:string;nome:string|null;campo:string;texpack:number}>;gruppoImmagini?:{id:string;nome:string;ordine:number} }
interface Plan { rectifySeedNames?:boolean;renames?:Record<string,{before:string;after:string}>;merges:Record<string,string>;updates:Record<string,Update>;presentationPatches:Patch[] }
const [dbArg,planArg,atlasArg,reportArg]=process.argv.slice(2);
if(!dbArg||!planArg||!atlasArg||!reportArg)throw new Error('Uso: atlas-organization.ts <database esistente> <piano.json> <atlante-organizzato.json> <report.json>');
const dbPath=path.resolve(dbArg),reportPath=path.resolve(reportArg);
if(!fs.existsSync(dbPath)||[dbPath,path.resolve(planArg),path.resolve(atlasArg)].includes(reportPath))throw new Error('Database esistente e percorso report distinto obbligatori.');
const plan=JSON.parse(fs.readFileSync(planArg,'utf8').replace(/^\uFEFF/,'')) as Plan;
const atlas=JSON.parse(fs.readFileSync(atlasArg,'utf8').replace(/^\uFEFF/,'')) as {mappe:Array<{chiave:string;nome:string}>};
if(!plan.merges||!plan.updates||!Array.isArray(plan.presentationPatches)||!Array.isArray(atlas.mappe))throw new Error('Piano non valido.');
const names=new Map(atlas.mappe.map(m=>[m.chiave,m.nome]));
const db=initDb(dbPath);
const tableNames=new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{name:string}>).map(r=>r.name));
if(!tableNames.has('mappa_presentazione'))throw new Error('Schema42 richiesto; il tool non applica migrazioni né seed.');
const tables=['mappa','spillo','spillo_partita','spillo_immagine','spillo_destinazione','quartiere_ingresso','immagine','mappa_alias','mappa_percorso','guida_mappa','guida_alias','mappa_entita','mappa_presentazione'];
const snapshot=():Record<string,Row[]>=>Object.fromEntries(tables.map(t=>[t,db.prepare('SELECT * FROM '+t+' ORDER BY 1').all() as Row[]]));
const before=snapshot();
const staging=new Set([
 'Raggruppamento delle risorse per codice originale. Non certifica adiacenza, ordine narrativo o disponibilità.',
 'Planimetria originale. Stato: riferimento-roadmap. Collegamenti, condizioni narrative e punti di interesse non ancora applicati.',
 'Planimetria originale. Stato: riferimento-roadmap. Identità del luogo da verificare. Collegamenti, condizioni narrative e punti di interesse non ancora applicati.',
 'Planimetria originale. Stato: risorsa-senza-campo. Identità del luogo da verificare. Collegamenti, condizioni narrative e punti di interesse non ancora applicati.'
]);
const nomiOriginaliRadici:Record<string,string>={"nativo-archivio-010": "Risorse native 010 — Chiesa", "nativo-archivio-011": "Risorse native 011 — Aoyama-Itchome", "nativo-archivio-012": "Risorse native 012 — Seaside Park", "nativo-archivio-022": "Risorse native 022 — Covo dei Ladri", "nativo-archivio-160": "Risorse native 160 — Mondo del clifoto", "nativo-archivio-161": "Risorse native 161 — Profondità dei Memento"};
const changes={pinNames:[] as number[],merges:[] as string[],updates:[] as string[],presentations:[] as string[],renames:[] as string[],notes:[] as string[]};
const backup=dbPath+'.before-organization-'+crypto.randomUUID()+'.sqlite';
await db.backup(backup);
let committed=false;
try {
 db.transaction(()=>{
  for(const [source,target] of Object.entries(plan.merges)) {
   const old=db.prepare('SELECT * FROM mappa WHERE chiave=?').get(source) as Row|undefined;
   if(!old) {
    const a=db.prepare('SELECT mappa_chiave FROM mappa_alias WHERE chiave=?').get(source) as {mappa_chiave:string}|undefined;
    if(a?.mappa_chiave!==target)throw new Error('Radice assente senza alias di fusione: '+source);
    continue;
   }
   const dest=db.prepare('SELECT * FROM mappa WHERE chiave=?').get(target) as Row|undefined;
   if(!dest||source===target)throw new Error('Destinazione fusione non valida: '+target);
   if(old.immagine_chiave||old.asset||old.entita_tipo||db.prepare("SELECT 1 FROM immagine WHERE ambito='mappa' AND chiave=?").get(source))throw new Error('Radice con contenuto non trasferibile: '+source);
   for(const t of ['spillo','spillo_destinazione','quartiere_ingresso','mappa_entita','mappa_presentazione'])if(db.prepare('SELECT 1 FROM '+t+' WHERE mappa_chiave=?').get(source))throw new Error('Radice con coordinate o associazioni da conservare: '+source);
   const aliases=[source,...(db.prepare('SELECT chiave FROM mappa_alias WHERE mappa_chiave=? UNION SELECT chiave FROM mappa_percorso WHERE mappa_chiave=?').all(source,source) as Array<{chiave:string}>).map(a=>a.chiave)];
   for(const key of aliases) {
    if(db.prepare('SELECT 1 FROM guida_alias WHERE chiave=?').get(key))throw new Error('Alias già usato dalla guida: '+key);
    const a=db.prepare('SELECT mappa_chiave FROM mappa_alias WHERE chiave=?').get(key) as {mappa_chiave:string}|undefined;
    if(a&&a.mappa_chiave!==source&&a.mappa_chiave!==target)throw new Error('Alias in conflitto: '+key);
   }
   if(old.note && !staging.has(String(old.note))) {
    const note=[dest.note, String(old.note)].filter(Boolean).join('\n\n');
    db.prepare('UPDATE mappa SET note=? WHERE chiave=?').run(note,target);
   }
   db.prepare('UPDATE mappa SET genitore_chiave=? WHERE genitore_chiave=?').run(target,source);
   db.prepare("UPDATE spillo SET riferimento_chiave=? WHERE riferimento_tipo='mappa' AND riferimento_chiave=?").run(target,source);
   db.prepare('UPDATE mappa_alias SET mappa_chiave=? WHERE mappa_chiave=?').run(target,source);
   for(const key of aliases)db.prepare('INSERT OR IGNORE INTO mappa_alias VALUES(?,?)').run(key,target);
   db.prepare('DELETE FROM mappa_percorso WHERE mappa_chiave=?').run(source);
   db.prepare('DELETE FROM mappa WHERE chiave=?').run(source);
   changes.merges.push(source);
  }
  for(const [key,v] of Object.entries(plan.updates)) {
   const old=db.prepare('SELECT * FROM mappa WHERE chiave=?').get(key) as Row|undefined;
   if(!old)throw new Error('Mappa da aggiornare assente: '+key);
   if(v.genitore && !db.prepare('SELECT 1 FROM mappa WHERE chiave=?').get(v.genitore))throw new Error('Genitore assente: '+v.genitore);
   if(old.nome!==v.nome && old.nome!==nomiOriginaliRadici[key])throw new Error('Nome personalizzato da preservare: '+key);
   if(old.nome!==v.nome||old.tipo!==v.tipo||old.genitore_chiave!==v.genitore|| (v.entita && (old.entita_tipo!==v.entita.tipo||old.entita_chiave!==v.entita.chiave))) {
    db.prepare('UPDATE mappa SET nome=?,tipo=?,genitore_chiave=?,entita_tipo=?,entita_chiave=? WHERE chiave=?').run(v.nome,v.tipo,v.genitore,v.entita?.tipo??old.entita_tipo,v.entita?.chiave??old.entita_chiave,key);changes.updates.push(key);
   }
  }
  for(const [key,value] of Object.entries(plan.renames??{})) {
   if(!value.before||!value.after||!names.has(key))throw new Error('Piano nome non valido: '+key);
   const row=db.prepare('SELECT nome FROM mappa WHERE chiave=?').get(key) as {nome:string}|undefined;
   if(!row)throw new Error('Risorsa nome assente: '+key);
   if(row.nome!==value.before&&row.nome!==value.after)throw new Error('Nome cambiato dopo il piano, preservazione richiesta: '+key);
   if(row.nome!==value.after){db.prepare('UPDATE mappa SET nome=? WHERE chiave=?').run(value.after,key);changes.renames.push(key);}
  }
  for(const v of plan.presentationPatches) {
   const old=db.prepare('SELECT * FROM mappa WHERE chiave=?').get(v.chiave) as Row|undefined;
   if(!old||!names.has(v.chiave))throw new Error('Risorsa presentazione assente: '+v.chiave);
   if(v.contesti && (new Set(v.contesti.map(c=>c.id)).size!==v.contesti.length||v.contesti.some(c=>!c.id||(c.nome!==null&&(typeof c.nome!=='string'||c.nome.length===0||c.nome.length>240))||!c.campo||!Number.isInteger(c.texpack)||c.texpack<0)))throw new Error('Contesti non validi: '+v.chiave);
   const desired={contesti_json:JSON.stringify(v.contesti??[]),gruppo_immagini_json:v.gruppoImmagini?JSON.stringify(v.gruppoImmagini):null};
   const prev=db.prepare('SELECT contesti_json,gruppo_immagini_json FROM mappa_presentazione WHERE mappa_chiave=?').get(v.chiave);
   if(JSON.stringify(prev)!==JSON.stringify(desired)) {
    db.prepare('INSERT INTO mappa_presentazione VALUES(?,?,?) ON CONFLICT(mappa_chiave) DO UPDATE SET contesti_json=excluded.contesti_json,gruppo_immagini_json=excluded.gruppo_immagini_json').run(v.chiave,desired.contesti_json,desired.gruppo_immagini_json);changes.presentations.push(v.chiave);
   }
  }
  for(const m of db.prepare("SELECT chiave,note FROM mappa WHERE chiave LIKE 'nativo-%'").all() as Array<{chiave:string;note:string}>)if(staging.has(m.note)){db.prepare("UPDATE mappa SET note='' WHERE chiave=?").run(m.chiave);changes.notes.push(m.chiave);}
  if(plan.rectifySeedNames)changes.pinNames=rettificaNomiSpilliSeed();
  sincronizzaPercorsiMappe(db);
  const after=snapshot();
  const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
  for(const t of ['spillo_partita','spillo_immagine','spillo_destinazione','quartiere_ingresso','immagine','guida_mappa','guida_alias','mappa_entita'])if(!equal(before[t],after[t]))throw new Error('Regressione dati: '+t);
  const expected=before.spillo.map(s=>{
   let row=s.riferimento_tipo==='mappa'&&plan.merges[String(s.riferimento_chiave)]?{...s,riferimento_chiave:plan.merges[String(s.riferimento_chiave)]}:s;
   if(changes.pinNames.includes(Number(s.id))){
    const r=RETTIFICHE_NOMI_SEED.find(r=>r.mappa===s.mappa_chiave&&r.prima.nome===s.nome&&r.prima.descrizione===s.descrizione&&r.prima.x===s.x&&r.prima.y===s.y);
    if(!r)throw new Error('Rettifica non autorizzata: '+s.id);
    row={...row,nome:r.dopo.nome,descrizione:r.dopo.descrizione};
   }
   return row;
  });
  if(!equal(expected,after.spillo))throw new Error('ID, coordinate o contenuti pin modificati.');
  for(const old of before.mappa) {
   if(changes.merges.includes(String(old.chiave)))continue;
   const n=after.mappa.find(n=>n.chiave===old.chiave);
   if(!n)throw new Error('Mappa persa: '+old.chiave);
   if(!plan.updates[String(old.chiave)]&&!plan.renames?.[String(old.chiave)]&&n.nome!==old.nome)throw new Error('Nome non autorizzato modificato: '+old.chiave);
   for(const col of ['immagine_chiave','asset','larghezza','altezza','origine'])if(n[col]!==old[col])throw new Error('Risorsa modificata: '+old.chiave+'/'+col);
   if(old.note&&!staging.has(String(old.note))&&!String(n.note).includes(String(old.note)))throw new Error('Nota utente persa.');
  }
  for(const a of before.mappa_alias) {
   const expected=plan.merges[String(a.mappa_chiave)]??a.mappa_chiave;
   if(!after.mappa_alias.some(n=>n.chiave===a.chiave&&n.mappa_chiave===expected))throw new Error('Alias perso: '+a.chiave);
  }
  if((db.pragma('foreign_key_check') as unknown[]).length)throw new Error('Violazioni FK.');
 })();
 committed=true;
 const after=snapshot();
 fs.writeFileSync(reportPath,JSON.stringify({success:true,dbPath,backup,planSha256:crypto.createHash('sha256').update(fs.readFileSync(planArg)).digest('hex'),changes,before,after,integrity:db.pragma('integrity_check')},null,2));
 console.log(JSON.stringify({success:true,changes:Object.fromEntries(Object.entries(changes).map(([k,v])=>[k,v.length])),report:reportPath,backup}));
} catch(error) {
 fs.writeFileSync(reportPath,JSON.stringify({success:false,dbPath,backup,error:String(error),rolledBack:!committed},null,2));throw error;
} finally { closeDb(); }
