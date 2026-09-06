from pathlib import Path
p=Path('C:/Repository/project-p5r-main/scripts/atlas-organization.ts');s=p.read_text(encoding='utf8')
s=s.replace("import fs from 'node:fs';", "import fs from 'node:fs';\nimport { rettificaNomiSpilliSeed } from '../server/services/mappe/mappeService.js';\nimport { RETTIFICHE_NOMI_SEED } from '../server/services/mappe/rettificheNomiSeed.js';")
s=s.replace('interface Plan { renames?', 'interface Plan { rectifySeedNames?:boolean;renames?')
s=s.replace('const changes={merges:', 'const changes={pinNames:[] as number[],merges:')
s=s.replace('  sincronizzaPercorsiMappe(db);', '  if(plan.rectifySeedNames)changes.pinNames=rettificaNomiSpilliSeed();\n  sincronizzaPercorsiMappe(db);')
a="const expected=before.spillo.map(s=>s.riferimento_tipo==='mappa'&&plan.merges[String(s.riferimento_chiave)]?{...s,riferimento_chiave:plan.merges[String(s.riferimento_chiave)]}:s);"
b="""const expected=before.spillo.map(s=>{
   let row=s.riferimento_tipo==='mappa'&&plan.merges[String(s.riferimento_chiave)]?{...s,riferimento_chiave:plan.merges[String(s.riferimento_chiave)]}:s;
   if(changes.pinNames.includes(Number(s.id))){
    const r=RETTIFICHE_NOMI_SEED.find(r=>r.mappa===s.mappa_chiave&&r.prima.nome===s.nome&&r.prima.descrizione===s.descrizione&&r.prima.x===s.x&&r.prima.y===s.y);
    if(!r)throw new Error('Rettifica non autorizzata: '+s.id);
    row={...row,nome:r.dopo.nome,descrizione:r.dopo.descrizione};
   }
   return row;
  });"""
assert a in s;s=s.replace(a,b);Path('work/atlas-organization-names.ts').write_text(s,encoding='utf8')
import json,sqlite3,shutil
folder=Path('work/root-name-release');plan=json.loads((folder/'plan.json').read_text(encoding='utf8'));plan['rectifySeedNames']=True;(folder/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf8')
c=sqlite3.connect('work/runtime-atlante/project-p5r.db');dst=sqlite3.connect(folder/'copy.db');c.backup(dst);dst.close();c.close()
seed=folder/'full-seed';shutil.copytree('C:/Repository/project-p5r-main/data/seed',seed,dirs_exist_ok=True)
for p in (folder/'data/seed').rglob('*.json'):
 shutil.copy2(p,seed/p.relative_to(folder/'data/seed'))
print('Piano e copia completa seed pronti')
