import json,hashlib,sqlite3
from pathlib import Path
base=Path('work/base-map-assets')
evidence=json.loads(Path('work/parallel-cleanup/nomi-residui-approfondimento.json').read_text(encoding='utf8'))
metaPath=Path('outputs/mappe-p5r/mondo_metadati.json')
assert hashlib.sha256(metaPath.read_bytes()).hexdigest()==evidence['sources']['mondo_metadati.json']
meta=json.loads(metaPath.read_text(encoding='utf8'))
key='nativo-rmap-153-4-0';row=next(r for r in evidence['maps'] if r['key']==key)
assert row['originalFields']==['F153_051_00','F153_004_00']
contexts=[]
for fieldId in row['originalFields']:
 f=next(f for f in meta['fields'] if f['id']==fieldId)
 assert any(t['major']==153 and t['minor']==4 and t['sub']==0 and t['layers']>0 for t in f['textures'])
 title=next((x['nome'] for x in row['contexts'] if x['field']==fieldId),None)
 contexts.append({'id':fieldId.lower()+'-texpack-'+str(f['texpack']),'nome':title,'campo':fieldId,'texpack':f['texpack']})
assert [c['nome'] for c in contexts]==[None,'Ripostiglio']
patch={'chiave':key,'contesti':contexts}
package=json.loads((base/'atlante-organizzato-v2.json').read_text(encoding='utf8'))
target=next(m for m in package['mappe'] if m['chiave']==key);originalName=target['nome'];target.update(patch)
assert target['nome']==originalName
(base/'atlante-organizzato-v3.json').write_text(json.dumps(package,ensure_ascii=False,indent=2),encoding='utf8')
(base/'piano-contesto-parziale.json').write_text(json.dumps({'merges':{},'updates':{},'presentationPatches':[patch]},ensure_ascii=False,indent=2),encoding='utf8')
src=sqlite3.connect('work/runtime-atlante/project-p5r.db');dst=sqlite3.connect('work/partial-context-release-copy.db');src.backup(dst);dst.close();src.close()
print(json.dumps({'patch':patch,'persistentNameUnchanged':originalName},ensure_ascii=True))
