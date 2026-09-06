import fs from 'node:fs';
import assert from 'node:assert/strict';
import request from 'supertest';
import {initDb,closeDb} from '../server/db/dbService.js';
import {runMigrations} from '../server/db/migrationRunner.js';
import {caricaSeed} from '../server/services/seed/caricaSeed.js';
import {createApp} from '../server/bootstrap.js';
const [database,reportFile]=process.argv.slice(2);if(!database||!reportFile)throw Error('Percorsi richiesti');
const db=initDb(database);
const exists=!!db.prepare("SELECT 1 FROM sqlite_master WHERE name='spillo'").get();
const ids=exists?db.prepare('SELECT id FROM spillo ORDER BY id').all() as {id:number}[]:[];
const aliases=exists?db.prepare("SELECT a.chiave,a.mappa_chiave FROM mappa_alias a JOIN mappa m ON m.chiave=a.mappa_chiave WHERE m.entita_tipo='area'").all() as {chiave:string;mappa_chiave:string}[]:[];
runMigrations(db);caricaSeed(db,'C:/Repository/project-p5r-main/data/seed');
const allIds=new Set((db.prepare('SELECT id FROM spillo').all() as {id:number}[]).map(r=>r.id));for(const {id} of ids)assert(allIds.has(id));
assert.equal((db.prepare("SELECT count(*) n FROM mappa WHERE entita_tipo='area'").get() as {n:number}).n,0);
const areas=(db.prepare('SELECT count(*) n FROM dungeon_area').get() as {n:number}).n;
assert.equal((db.prepare('SELECT count(*) n FROM guida_mappa').get() as {n:number}).n,areas);
const native=db.prepare("SELECT chiave,asset FROM mappa WHERE chiave LIKE 'nativo-rmap-%'").all() as {chiave:string;asset:string|null}[];
assert.equal(native.length,301);const app=createApp();
for(const m of native){
 const response=await request(app).get('/api/mappe/'+m.chiave);assert.equal(response.status,200,m.chiave);
 const dto=response.body.data;assert(dto.larghezza>0&&dto.altezza>0,m.chiave);
 assert(dto.immagineUrl||fs.existsSync('C:/Repository/project-p5r-main/public/asset/'+m.asset+'.png'),m.chiave);
}
for(const a of aliases){const response=await request(app).get('/api/mappe/risolvi/'+a.chiave);assert.equal(response.status,200,a.chiave);assert.equal(response.body.data.tipo,'guida',a.chiave);assert.equal(response.body.data.area,a.mappa_chiave);}
for(const d of db.prepare('SELECT chiave FROM dungeon').all() as {chiave:string}[]){
 const response=await request(app).get('/api/mappe/contenuti/dungeon-'+d.chiave);assert.equal(response.status,200,d.chiave);
 const expected=(db.prepare('SELECT count(*) n FROM dungeon_area WHERE dungeon_chiave=?').get(d.chiave) as {n:number}).n;
 assert.equal(response.body.data.aree.length,expected,d.chiave);
}
assert.deepEqual(db.pragma('foreign_key_check'),[]);
const report={pass:true,nativeMaps:native.length,guideAreas:areas,preservedIds:ids.length,guideAliasesChecked:aliases.length,maps:(db.prepare('SELECT count(*) n FROM mappa').get() as {n:number}).n};
fs.writeFileSync(reportFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));closeDb();
