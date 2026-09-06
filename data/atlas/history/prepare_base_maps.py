"""Prepare repository-owned base maps from the verified native export."""
import base64,hashlib,json
from pathlib import Path
src=Path('outputs/mappe-p5r/app-integration')
package=json.loads((src/'planimetrie-native.json').read_text(encoding='utf-8'))
evidence=json.loads((src/'evidenze.json').read_text(encoding='utf-8'))
bykey={r['key']:r for r in evidence['maps']}
target=Path('work/base-map-assets');target.mkdir(exist_ok=True)
maps=[];proof=[]
# These are organizational parents only, not inferred exits or narrative availability.
merged={'nativo-archivio-001':'citta-shibuya','nativo-archivio-002':'citta-shujin-academy'}
for old in package['mappe']:
 if old['chiave'] in merged:continue
 row=dict(old);row['genitore']=merged.get(row['genitore'],row['genitore'])
 if row['immagine']:
  key=row['chiave'];image=base64.b64decode(package['immagini'][row['immagine']]['base64'],validate=True)
  assert hashlib.sha256(image).hexdigest()==bykey[key]['imageSha256']
  (target/(key+'.png')).write_bytes(image)
  row.update(immagine=None,asset='mappe/native/'+key)
  proof.append(dict(key=key,sha256=bykey[key]['imageSha256'],source=bykey[key]['source'],width=row['larghezza'],height=row['altezza']))
 maps.append(row)
assert {m['chiave'] for m in maps if m['asset']}==set(bykey)
dest=target/'atlante-base.json';dest.write_text(json.dumps({'versione':1,'mappe':maps},ensure_ascii=False,indent=2),encoding='utf-8')
(target/'provenienza.json').write_text(json.dumps({'maps':proof,'organizationalParentMerges':merged},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'images':len(proof),'nodes':len(maps),'jsonBytes':dest.stat().st_size,'imageBytes':sum((target/(p['key']+'.png')).stat().st_size for p in proof)}))
