import json,urllib.request,collections,sys
from pathlib import Path
sys.path.insert(0,str(Path('work/extractor').resolve()))
from render_maps import read_names
from native_labels import Decoder
import render_maps
out=Path('outputs/mappe-p5r')
decoder=Decoder(out/'tool/P5R_EFIGS.tsv')
def decode(raw):
 s,unknown=decoder.decode(raw)
 assert not unknown,unknown
 return s
render_maps.text=decode
names,groups,city=read_names(out)
with urllib.request.urlopen('http://localhost:3103/api/mappe/albero') as r:tree=json.load(r)['data']
meta=json.loads((out/'mondo_metadati.json').read_text(encoding='utf-8'))
rows=[]
for m in meta['maps']:
 major,minor,layer=map(int,m['code'].split('_')[1:])
 records=names.get((major,minor,layer),[])
 valid=[r for r in records if r['title'] not in ('???','NULL','')]
 titles=list(dict.fromkeys(r['title'] for r in valid))
 rows.append(dict(code=m['code'],title=m['title'],group=m['group'],nativeTitles=titles,evidence=records,fields=m['fields']))
roots=[m for m in tree if m['genitore'] is None]
report=dict(roots=roots,native=rows,tree=tree,summary=dict(maps=len(tree),roots=len(roots),nativeUniqueTitles=sum(len(m['nativeTitles'])==1 for m in rows),missingTitles=[m['code'] for m in rows if not m['nativeTitles']]))
(out/'app-integration/audit-pulizia-globale.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report['summary']))
print(json.dumps([{k:m.get(k) for k in ('chiave','nome','entita')} for m in roots],ensure_ascii=False))
