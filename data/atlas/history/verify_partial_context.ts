import fs from 'node:fs';
import assert from 'node:assert/strict';
import {initDb,closeDb} from 'C:/Repository/project-p5r-main/server/db/dbService.ts';
import {dettaglioMappa} from 'C:/Repository/project-p5r-main/server/services/mappe/mappeService.ts';
import {nomePresentazioneMappa,risolviContesto,etichettaPlanimetria} from 'C:/Repository/project-p5r-main/src/utils/presentazioneMappa.ts';
const db=initDb('C:/Users/rober/Documents/Codex/2026-09-05/al/work/partial-context-release-copy.db');
const m=dettaglioMappa('nativo-rmap-153-4-0');
assert.equal(m.contesti?.length,2);
assert.equal(m.contesti![0].nome,null);
assert.equal(m.genitoreNome,(db.prepare("SELECT nome FROM mappa WHERE chiave='dungeon-madarame'").get() as {nome:string}).nome);
const known='f153_004_00-texpack-26',unknown='f153_051_00-texpack-138';
assert.equal(nomePresentazioneMappa(m,known),'Ripostiglio');
for(const selection of [null,unknown,'estraneo',`${known}|${unknown}`,`${known}|${known}`,`${known}|`]) {
 const name=nomePresentazioneMappa(m,selection);assert(!name.includes('Ripostiglio')&&!name.includes('RMAP'));assert(name.startsWith(m.genitoreNome!));
}
assert.equal(risolviContesto(m,unknown).stato,'senza-titolo');
assert(!etichettaPlanimetria(m).includes('RMAP'));
const result={pass:true,contexts:m.contesti,persistentName:m.nome,defaultTitle:nomePresentazioneMappa(m),knownTitle:nomePresentazioneMappa(m,known),unknownTitle:nomePresentazioneMappa(m,unknown),unknownState:risolviContesto(m,unknown).stato};
fs.writeFileSync('work/partial-context-real-dto-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));closeDb();
