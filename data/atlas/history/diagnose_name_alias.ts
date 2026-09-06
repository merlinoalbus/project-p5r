import fs from 'node:fs';import {initDb,closeDb} from 'C:/Repository/project-p5r-main/server/db/dbService.ts';import {slug} from 'C:/Repository/project-p5r-main/shared/slug.ts';
const db=initDb('C:/Users/rober/Documents/Codex/2026-09-05/al/work/root-name-release/copy.db');
const plan=JSON.parse(fs.readFileSync('work/root-name-release/plan.json','utf8'));
const nodes=db.prepare('SELECT chiave,nome,tipo,genitore_chiave FROM mappa').all() as Array<{chiave:string;nome:string;tipo:string;genitore_chiave:string|null}>;
for(const n of nodes)if(plan.renames[n.chiave])n.nome=plan.renames[n.chiave].after;
const index=new Map(nodes.map(n=>[n.chiave,n]));
for(const n of nodes){const chain=[n];let p=n;while(p.genitore_chiave){p=index.get(p.genitore_chiave)!;chain.unshift(p);}const key=chain.filter(x=>x.tipo!=='citta'||x===n).map(x=>slug(x.nome)).join('-');const a=db.prepare('select mappa_chiave from mappa_alias where chiave=?').get(key) as {mappa_chiave:string}|undefined;if(a&&a.mappa_chiave!==n.chiave&&!n.chiave.startsWith('nativo-rmap'))console.log({id:n.chiave,name:n.nome,key,owner:a.mappa_chiave});}closeDb();
