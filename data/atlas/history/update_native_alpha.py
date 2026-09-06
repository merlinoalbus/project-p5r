"""Update only unchanged staging images via the isolated app API."""
import argparse,base64,hashlib,json,urllib.request
from pathlib import Path
BASE='http://localhost:3103'
def sha(b):return hashlib.sha256(b).hexdigest()
def get(url):
    with urllib.request.urlopen(url) as r:return r.read()
def main(apply=False,key=None):
    old=json.loads(Path('work/pre-rgba-package/planimetrie-native.json').read_text(encoding='utf-8'))
    new=json.loads(Path('outputs/mappe-p5r/app-integration/planimetrie-native.json').read_text(encoding='utf-8'))
    backup=Path('work/pre-rgba-runtime');backup.mkdir(exist_ok=True);report=[]
    for k,image in new['immagini'].items():
        if key and k!=key:continue
        before=json.loads(get(BASE+'/api/mappe/'+k))['data'];current=get(BASE+before['immagineUrl']);wanted=base64.b64decode(image['base64']);previous=base64.b64decode(old['immagini'][k]['base64'])
        row={'key':k,'oldSha256':sha(current),'newSha256':sha(wanted)}
        if current==wanted:row['status']='already-original-alpha'
        elif current!=previous:row['status']='skipped-modified-image'
        elif not apply:row['status']='eligible'
        else:
            (backup/(k+'.png')).write_bytes(current);(backup/(k+'.json')).write_text(json.dumps(before,ensure_ascii=False,indent=2),encoding='utf-8')
            latest=json.loads(get(BASE+'/api/mappe/'+k))['data'];assert latest==before and get(BASE+latest['immagineUrl'])==current,'Changed during update'
            request=urllib.request.Request(BASE+'/api/mappe/'+k+'/immagine',data=wanted,headers={'Content-Type':'image/png'},method='PUT')
            with urllib.request.urlopen(request) as r:after=json.loads(r.read())['data']
            assert get(BASE+after['immagineUrl'])==wanted
            for field in before:
                if field not in ('immagineUrl','updatedAt'):assert before[field]==after[field],(k,field)
            row['status']='updated-verified'
        report.append(row)
    suffix=key or 'all';Path(f'work/alpha-update-{suffix}.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({s:sum(r['status']==s for r in report) for s in {r['status'] for r in report}}))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--apply',action='store_true');p.add_argument('--key');a=p.parse_args();main(a.apply,a.key)
