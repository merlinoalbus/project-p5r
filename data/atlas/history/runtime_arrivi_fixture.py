"""Temporary UI validation fixture in the isolated 3103 runtime only."""
import json
from pathlib import Path
import urllib.request

root=Path(__file__).resolve().parent
def request(path,data=None,method='GET',mime='application/json'):
    body=data if isinstance(data,bytes) else json.dumps(data).encode('utf8') if data is not None else None
    with urllib.request.urlopen(urllib.request.Request('http://localhost:3103'+path,data=body,method=method,headers={'Content-Type':mime}),timeout=30) as r:
        if r.status==204:return None
        value=json.load(r);return value.get('data',value)

source=request('/api/mappe',{'nome':'Verifica navigazione arrivi','tipo':'generica'},'POST')
key=source['chiave']
image=root.parent/'outputs/mappe-p5r/png/BASE/FIELD/PANEL/ROADMAP/RMAP_002_0_0.png'
request('/api/mappe/'+key+'/immagine',image.read_bytes(),'PUT','image/png')
pins=[]
for nome,tipo,dest in [
    ('Verifica evento al secondo piano','attivita',{'mappa':'nativo-rmap-002-0-1','x':30,'y':60,'zoom':2.5}),
    ('Verifica scorciatoia locale','scorciatoia',{'mappa':key,'x':70,'y':30,'zoom':3}),
]:
    pins.append(request('/api/mappe/'+key+'/spilli',{'nome':nome,'tipo':tipo,'x':40,'y':45,'destinazione':dest},'POST'))
report={'source':key,'pins':[{'id':p['id'],'name':p['nome'],'destination':p['destinazione']} for p in pins],
        'scope':'UI-only fixture; not certified game connections. Delete after validation.'}
(root/'runtime-arrivi-fixture.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=True))
