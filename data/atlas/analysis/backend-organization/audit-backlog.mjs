import fs from 'node:fs';
import {nomePresentazioneMappa,etichettaPlanimetria} from 'file:///C:/Repository/project-p5r-main/src/utils/presentazioneMappa.ts';
const rows=(await(await fetch('http://127.0.0.1:3103/api/mappe/albero')).json()).data;
const base=JSON.parse(fs.readFileSync('C:/Repository/project-p5r-main/data/seed/mappe/atlante-base.json','utf8'));
const technical=/RMAP|LMAP|ROADMAP|Area\s*\d|Luogo\s*\d|Risorse native|Archivio|livello grafico/i;
const audit=rows.map(m=>{const b=base.mappe.find(b=>(b.assetOriginale||b.asset)&&(b.assetOriginale||b.asset)===m.assetOriginale);return {key:m.chiave,parent:m.genitore,name:m.nome,display:nomePresentazioneMappa(m),selector:etichettaPlanimetria(m),group:m.gruppoImmagini??null,contexts:m.contesti??[],asset:m.assetOriginale,technical:technical.test(nomePresentazioneMappa(m)),baseMatch:b?.chiave??null,baseName:b?.nome??null,baseContextsMatch:b?JSON.stringify(b.contesti??[])===JSON.stringify(m.contesti??[]):null}});
const groups=new Map();for(const m of audit){const k=m.parent+'|'+m.display;groups.set(k,[...(groups.get(k)??[]),m.key]);}
const duplicates=[...groups].filter(([,v])=>v.length>1);
fs.writeFileSync('work/backend-organization/organization-backlog-evidence.json',JSON.stringify({at:new Date().toISOString(),total:rows.length,rows:audit,technical:audit.filter(m=>m.technical),sameDisplaySiblingGroups:duplicates},null,2));
console.log(JSON.stringify({total:rows.length,technical:audit.filter(m=>m.technical).map(m=>({key:m.key,display:m.display})),duplicates,contextCount:audit.filter(m=>m.contexts.length).length,groupCount:audit.filter(m=>m.group).length,baseMismatch:audit.filter(m=>m.baseContextsMatch===false)},null,2));



