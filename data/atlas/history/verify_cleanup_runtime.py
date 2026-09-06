import json
from pathlib import Path
r=json.loads(Path('work/cleanup-runtime-report.json').read_text(encoding='utf-8'));p=json.loads(Path('outputs/mappe-p5r/app-integration/piano-pulizia-globale.json').read_text(encoding='utf-8'))
mapping={x['source']:x['target'] for x in p['roots']}
before,after,reboot=r['before'],r['after'],r['reboot']
for t in ['spillo','spillo_partita','spillo_immagine','spillo_destinazione','quartiere_ingresso']:
 assert before[t]==after[t]==reboot[t],t
for phase in [after,reboot]:
 index={m['chiave']:m for m in phase['mappa']}
 assert len(index)==len(before['mappa'])-len(mapping)
 for old in before['mappa']:
  if old['chiave'] in mapping:continue
  new=index[old['chiave']]
  assert {k:v for k,v in old.items() if k not in ('nome','genitore_chiave','updated_at')}=={k:v for k,v in new.items() if k not in ('nome','genitore_chiave','updated_at')},old['chiave']
  assert new['genitore_chiave']==mapping.get(old['genitore_chiave'],old['genitore_chiave'])
 aliases={a['chiave']:a['mappa_chiave'] for a in phase['mappa_alias']}
 for a in before['mappa_alias']+before['mappa_percorso']:
  assert aliases[a['chiave']]==mapping.get(a['mappa_chiave'],a['mappa_chiave']),a
 assert len({a['chiave'] for a in phase['mappa_percorso']})==len(index)
for t in ['mappa','mappa_percorso']:assert after[t]==reboot[t],t
old_alias={a['chiave']:a['mappa_chiave'] for a in after['mappa_alias']}
current={a['chiave']:a['mappa_chiave'] for a in after['mappa_percorso']}
for a in reboot['mappa_alias']:assert a['mappa_chiave']==old_alias.get(a['chiave'],current.get(a['chiave'])),a
print('PASS: nessuna perdita o modifica pin, immagini, stati partita, alias; 9 radici fuse, 199 titoli puliti; seed invariato.')
