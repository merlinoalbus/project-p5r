import json, hashlib
from pathlib import Path
repo=Path('C:/Repository/project-p5r-main')
out=Path('work/root-name-release');out.mkdir(exist_ok=True)
report=json.loads(Path('work/parallel-cleanup/nomi-radici-pulizia.json').read_text(encoding='utf8'))
paths=['data/seed/citta.json','data/seed/dungeon.json','data/seed/mappe/citta-yongen-jaya.json','data/seed/mappe/yongen-java-banchina-della-metropolitana.json']
originals={p:(repo/p).read_text(encoding='utf8') for p in paths}
docs={p:json.loads(t) for p,t in originals.items()}
changes=[]
for proposal in report['proposals']:
 if proposal['entity']!='mappa':continue
 key,before,after=proposal['key'],proposal['before'],proposal['after']
 if key.startswith('citta-'):
  p=paths[0]; rows=[x for x in docs[p]['quartieri'] if x['chiave']==key[6:]]
 elif key.startswith('dungeon-'):
  p=paths[1]; rows=[x for x in docs[p] if x['chiave']==key[8:]]
 else:
  p=paths[3];rows=[x for x in docs[p]['mappe'] if x['chiave']==key]
 assert len(rows)==1,(key,rows)
 assert rows[0]['nome']==before,(key,rows[0]['nome'])
 rows[0]['nome']=after;changes.append({'file':p,'key':key,'before':before,'after':after})
pins=[]
for p in paths[2:]:
 for m in docs[p]['mappe']:
  for s in m['spilli']:
   if 'Yongen-Java' not in s['nome']:continue
   old=dict(s);s['nome']=s['nome'].replace('Yongen-Java','Yongen-Jaya');s['descrizione']=s['descrizione'].replace('Yongen-Java','Yongen-Jaya')
   pins.append({'file':p,'map':m['chiave'],'before':old,'after':s})
assert len(changes)==9 and len(pins)==4
for p,d in docs.items():
 dest=out/p;dest.parent.mkdir(parents=True,exist_ok=True)
 # Preserve all untouched bytes by replacing only the exact JSON property values.
 old=originals[p]
 updates=[(x['before'],x['after'],'nome') for x in changes if x['file']==p]
 for x in pins:
  if x['file']==p:
   updates += [(x['before'][f],x['after'][f],f) for f in ('nome','descrizione')]
 for before,after,field in set(updates):
  a=json.dumps(field)+': '+json.dumps(before,ensure_ascii=False)
  b=json.dumps(field)+': '+json.dumps(after,ensure_ascii=False)
  assert a in old,(p,a)
  old=old.replace(a,b)
 assert json.loads(old)==d,p
 dest.write_text(old,encoding='utf8')
summary={'maps':changes,'pins':pins,'sourceSha256':{p:hashlib.sha256((repo/p).read_bytes()).hexdigest() for p in paths}}
(out/'changes.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
plan={'merges':{},'updates':{},'presentationPatches':[],'renames':{x['key']:{'before':x['before'],'after':x['after']} for x in changes}}
(out/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf8')
carrier={'mappe':[{'chiave':x['key'],'nome':x['after']} for x in changes]}
(out/'name-scope.json').write_text(json.dumps(carrier,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'stagedMapNames':len(changes),'stagedPinTypos':len(pins),'files':paths}))
