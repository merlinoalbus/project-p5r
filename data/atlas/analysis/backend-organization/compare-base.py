import json,sqlite3
from pathlib import Path
p=Path('work/backend-organization/organization-backlog-evidence.json');j=json.loads(p.read_text());base=json.loads(Path('C:/Repository/project-p5r-main/data/seed/mappe/atlante-base.json').read_text());c=sqlite3.connect('file:work/runtime-atlante/project-p5r.db?mode=ro',uri=True);keys=dict(c.execute('select chiave,mappa_chiave from mappa_percorso'))
for r in j['rows']:
 key=keys.get(r['key']);b=next((b for b in base['mappe'] if b['chiave']==key),None)
 r['stableKey']=key;r['baseMatch']=b['chiave'] if b else None;r['baseName']=b['nome'] if b else None;r['baseContextsMatch']=b.get('contesti',[])==r['contexts'] if b else None
j['technical']=[r for r in j['rows'] if r['technical']];p.write_text(json.dumps(j,ensure_ascii=False,indent=2));print('base coverage',sum(r['baseMatch']!=None for r in j['rows']),'context diff',sum(r['baseContextsMatch']==False for r in j['rows']))
