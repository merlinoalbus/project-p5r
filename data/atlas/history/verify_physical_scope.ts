import fs from 'node:fs';
import assert from 'node:assert/strict';
import { haPlanimetria } from 'C:/Repository/project-p5r-main/src/utils/haPlanimetria.ts';
import type { MappaDto } from 'C:/Repository/project-p5r-main/shared/types.ts';
const source=JSON.parse(fs.readFileSync('work/backend-organization/physical-maps-proof.json','utf8'));
const results=source.datasets.map((d:{database:string;rows:Array<{key:string;registeredImage:boolean;assetOriginale:string|null;metadataDimensions:[number|null,number|null];native:boolean;palaceEmblem:boolean;excludedExistingMapAsset:boolean}>})=>{
 const rows=d.rows.map(r=>({...r,physical:haPlanimetria({immagineUrl:r.registeredImage?'registered':null,assetOriginale:r.assetOriginale,larghezza:r.metadataDimensions[0],altezza:r.metadataDimensions[1]} as MappaDto)}));
 assert(rows.filter(r=>r.native).every(r=>r.physical));
 assert(rows.filter(r=>r.palaceEmblem).every(r=>!r.physical));
 assert(rows.filter(r=>r.excludedExistingMapAsset).every(r=>r.physical));
 assert(rows.find(r=>r.key==='yongen-java-banchina-della-metropolitana')?.physical);
 return {database:d.database,native:rows.filter(r=>r.native&&r.physical).length,cityRestored:rows.filter(r=>r.excludedExistingMapAsset&&r.physical).length,emblemsExcluded:rows.filter(r=>r.palaceEmblem&&!r.physical).length,platform:true};
});
fs.writeFileSync('work/physical-scope-final-report.json',JSON.stringify({pass:true,results},null,2));
console.log(JSON.stringify({pass:true,results}));
