import json, sqlite3
from pathlib import Path
base=Path('work/base-map-assets')
package=json.loads((base/'atlante-organizzato.json').read_text(encoding='utf8'))
plan=json.loads((base/'piano-organizzazione.json').read_text(encoding='utf8'))
evidence=json.loads(Path('work/parallel-cleanup/nomi-residui-approfondimento.json').read_text(encoding='utf8'))
bykey={m['chiave']:m for m in package['mappe']}
db=sqlite3.connect('work/runtime-atlante/project-p5r.db')
original=dict(db.execute('SELECT chiave,nome FROM mappa'));db.close()
names={p['chiave']:bykey[p['chiave']]['nome'] for p in plan['presentationPatches']}
applied=[]
for row in evidence['maps']:
    if row['status']!='new-dungeon-field-title-evidence' or row['unresolvedContexts']:continue
    titles=list(dict.fromkeys(c['nome'] for c in row['contexts']))
    assert len(titles)==1
    key=row['key'];names[key]=titles[0];bykey[key]['nome']=titles[0];applied.append(key)
    if key.startswith('nativo-rmap-150-3-') or key.startswith('nativo-rmap-154-12-'):
        group={'id':'immagini-'+key.rsplit('-',1)[0], 'nome':titles[0], 'ordine':int(key.rsplit('-',1)[1])}
        bykey[key]['gruppoImmagini']=group
        plan['presentationPatches'].append({'chiave':key,'gruppoImmagini':group})
assert len(applied)==8
plan['renames']={key:{'before':original[key],'after':name} for key,name in names.items()}
(base/'atlante-organizzato-v2.json').write_text(json.dumps(package,ensure_ascii=False,indent=2),encoding='utf8')
(base/'piano-organizzazione-v2.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'renames':len(names),'newNativeNames':len(applied),'presentations':len(plan['presentationPatches'])}))
