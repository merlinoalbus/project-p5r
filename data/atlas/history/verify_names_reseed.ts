import fs from 'node:fs';import assert from 'node:assert/strict';
import {initDb,closeDb} from 'C:/Repository/project-p5r-main/server/db/dbService.ts';
import {caricaSeed} from 'C:/Repository/project-p5r-main/server/services/seed/caricaSeed.ts';
import {idMappa} from 'C:/Repository/project-p5r-main/server/services/mappe/percorsiMappe.ts';
const base='C:/Users/rober/Documents/Codex/2026-09-05/al/work/root-name-release/';
const db=initDb(base+'copy.db');const plan=JSON.parse(fs.readFileSync(base+'plan.json','utf8'));
const tables=['spillo','spillo_partita','spillo_immagine','spillo_destinazione','quartiere_ingresso','immagine','guida_mappa','guida_alias','mappa_entita','mappa_presentazione'];
const snapshot=()=>Object.fromEntries(tables.map(t=>[t,db.prepare('SELECT * FROM '+t+' ORDER BY 1').all()]));const before=snapshot();
const mapSnapshot=()=>(db.prepare('SELECT * FROM mappa ORDER BY chiave').all() as Array<Record<string,unknown>>).map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>k!=='updated_at')));const mapsBefore=mapSnapshot();
const aliasesBefore=db.prepare('SELECT * FROM mappa_alias').all() as Array<{chiave:string;mappa_chiave:string}>;
for(let i=0;i<2;i++){
 caricaSeed(db,base+'full-seed',true);assert.deepEqual(snapshot(),before);assert.deepEqual(mapSnapshot(),mapsBefore);
 for(const [key,v] of Object.entries(plan.renames) as Array<[string,{after:string}]>)assert.equal((db.prepare('SELECT nome FROM mappa WHERE chiave=?').get(key) as {nome:string}).nome,v.after);
 for(const a of aliasesBefore)assert.equal(idMappa(a.chiave,db),a.mappa_chiave);
 assert.equal(idMappa('banchina-della-metropolitana-di-yongen-jaya',db),'yongen-java-banchina-della-metropolitana');
 assert.equal(idMappa('yongen-jaya-banchina-della-metropolitana',db),'nativo-rmap-011-6-0');
 assert.equal(idMappa('yongen-java-banchina-della-metropolitana',db),'yongen-java-banchina-della-metropolitana');
 assert.deepEqual(db.pragma('foreign_key_check'),[]);
}
const result={pass:true,forcedReseeds:2,preservedPins:before.spillo.length,names:9,typos:4,allPinRowsAndDependentsStable:true,preservedAliases:aliasesBefore.length,mapsUnchangedAcrossReseed:true};
fs.writeFileSync(base+'reseed-proof.json',JSON.stringify(result,null,2));console.log(result);closeDb();

