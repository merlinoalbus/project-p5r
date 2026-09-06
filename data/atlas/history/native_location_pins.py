import json,urllib.request,urllib.parse,hashlib,sqlite3,sys
from pathlib import Path
out=Path('outputs/mappe-p5r');base='http://localhost:3103'
def req(path,data=None,method=None):
 r=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'},method=method or ('GET' if data is None else 'PUT'))
 with urllib.request.urlopen(r) as response:return json.load(response)['data']
cases=json.loads((out/'proiezione-urbana/sei-accessi.json').read_text(encoding='utf-8'))['cases']
fields={r['field']:r for r in json.loads((out/'proiezione-urbana/evidenze.json').read_text(encoding='utf-8'))['fields']}
places={'F010_019_00':('shibuya/big-bang-burger','Big Bang Burger','ristorante'),'F010_005_00':('shibuya/protein-lovers','Palestra Protein Lovers','attivita'),'F005_002_00':('kichijoji/penguin-sniper','Freccette e biliardo','attivita'),'F005_003_00':('kichijoji/jazz-jin','Jazz Club','attivita'),'F009_003_00':('yongen-jaya/batting-cage-yongen','Gabbie di battuta','attivita')}
plan=[]
for c in cases:
 if c['target'] not in places:continue
 place,name,kind=places[c['target']];field=fields[c['field']];key='nativo-'+field['map'].lower().replace('_','-')
 m=req('/api/mappe/'+key);assert [m['larghezza'],m['altezza']]==field['size']
 access=req('/api/mappe/accesso/luogo/'+urllib.parse.quote(place,safe=''))
 assert access['esito'] in ('unica','assente'),access
 pin=None
 if access['esito']=='unica':
  dest=access['destinazioni'][0];pins=req('/api/mappe/'+dest['mappa'])['spilli'];pin=next(p for p in pins if p['id']==dest['spillo'])
  assert pin['riferimento']=={'tipo':'luogo','chiave':place}
  assert pin['origine']=='seed' or pin.get('soloPosizione') is True,(place,pin['origine'])
 xy=c['projection']['xy'];payload={'mappa':key,'x':100*xy[0]/field['size'][0],'y':100*xy[1]/field['size'][1],'nome':name,'tipo':kind,'soloPosizione':True}
 if pin is None:payload.update(riferimento={'tipo':'luogo','chiave':place},collezionabile=False)
 plan.append({'id':pin['id'] if pin else None,'place':place,'before':pin,'payload':payload,'evidence':c,'canvas':field['size']})
target=out/'app-integration/pin-luoghi-verificati.json'
if '--apply' in sys.argv:
 backup=Path('work/pre-location-pins.db');assert not backup.exists(),'Backup precedente presente: verificare prima di ripetere'
 s=sqlite3.connect(Path('work/runtime-atlante/project-p5r.db').resolve().as_uri()+'?mode=ro',uri=True);d=sqlite3.connect(backup);s.backup(d);d.close();s.close()
 for row in plan:
  if row['id'] is None:
   payload=dict(row['payload']);key=payload.pop('mappa');result=req('/api/mappe/'+key+'/spilli',payload,'POST')
  else:
   result=req('/api/mappe/spilli/'+str(row['id']),row['payload']);assert result['id']==row['id']
   assert result['riferimento']==row['before']['riferimento'] and result['condizioni']==row['before']['condizioni']
  assert result['soloPosizione']
  row['after']=result
target.write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{'id':p['id'],'nome':p['payload']['nome'],'from':p['before']['mappaChiave'] if p['before'] else None,'to':p['payload']['mappa']} for p in plan],ensure_ascii=False))
