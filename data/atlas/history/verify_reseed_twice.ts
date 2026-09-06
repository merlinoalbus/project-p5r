import fs from 'node:fs';
import assert from 'node:assert/strict';
import {initDb,closeDb} from 'C:/Repository/project-p5r-main/server/db/dbService.ts';
import {caricaSeed} from 'C:/Repository/project-p5r-main/server/services/seed/caricaSeed.ts';
const db=initDb('C:/Users/rober/Documents/Codex/2026-09-05/al/work/reseed-release-copy.db');
const tables=['spillo','spillo_partita','spillo_immagine','spillo_destinazione'];
const snapshot=()=>Object.fromEntries(tables.map(t=>[t,db.prepare(`SELECT * FROM ${t} ORDER BY 1`).all()]));
const before=snapshot();
for(let n=0;n<2;n++){
 caricaSeed(db,'C:/Repository/project-p5r-main/data/seed',true);
 assert.deepEqual(snapshot(),before);
 assert.equal((db.prepare("SELECT count(*) n FROM spillo WHERE riferimento_chiave='yongen-jaya/batting-cage-yongen'").get() as {n:number}).n,1);
 assert.deepEqual(db.pragma('foreign_key_check'),[]);
}
const result={pass:true,forcedReseeds:2,preservedPins:before.spillo.length,allPinRowsAndDependentsUnchanged:true};
fs.writeFileSync('work/reseed-release-report.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));closeDb();
