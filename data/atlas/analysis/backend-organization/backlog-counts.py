import json,collections,sqlite3
from pathlib import Path
j=json.loads(Path('work/backend-organization/organization-backlog-evidence.json').read_text());r=j['rows']; print(json.dumps({'total':len(r),'technical':len(j['technical']),'questionNames':[(x['baseMatch'],x['display']) for x in r if '?' in x['display']],'sameLabelGroups':len(j['sameDisplaySiblingGroups']),'sameLabelNodes':sum(len(v) for k,v in j['sameDisplaySiblingGroups']),'ungroupedSameLabelNodes':sum(1 for k,v in j['sameDisplaySiblingGroups'] for key in v if not next(x for x in r if x['key']==key)['group'])},ensure_ascii=False))
c=sqlite3.connect('file:work/runtime-atlante/project-p5r.db?mode=ro',uri=True);c.row_factory=sqlite3.Row
print(json.dumps([dict(x) for x in c.execute('select * from spillo where id in (376,377,392,393)')],ensure_ascii=False))
