import json
from pathlib import Path
j=json.loads(Path('work/backend-organization/organization-backlog-evidence.json').read_text());r=j['rows'];print('base matches',sum(x['baseMatch']!=None for x in r),'mismatch',sum(x['baseContextsMatch']==False for x in r)); print('unknown',[x['baseMatch'] for x in j['technical']][:6]);print('question',len([x for x in r if '?' in x['display']]))
