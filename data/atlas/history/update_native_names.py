import hashlib,json,sqlite3,urllib.request,urllib.error
from pathlib import Path
BASE='http://localhost:3103'
def get(url):
    with urllib.request.urlopen(url) as r:return r.read()
def dto(k):return json.loads(get(BASE+'/api/mappe/'+k))['data']
def main():
    out=Path('outputs/mappe-p5r/app-integration');new=json.loads((out/'planimetrie-native.json').read_text(encoding='utf-8'));old=json.loads(Path('work/pre-names-package.json').read_text(encoding='utf-8'));previous={m['chiave']:m for m in old['mappe']}
    targets=[m for m in new['mappe'] if m['nome']!=previous[m['chiave']]['nome']];assert len(targets)==19
    assert old['immagini']==new['immagini']
    for m in new['mappe']:assert {k:v for k,v in m.items() if k!='nome'}=={k:v for k,v in previous[m['chiave']].items() if k!='nome'}
    backup=Path('work/pre-names-runtime');backup.mkdir(exist_ok=True)
    db=sqlite3.connect(Path('work/runtime-atlante/project-p5r.db').resolve().as_uri()+'?mode=ro',uri=True)
    dest=sqlite3.connect(backup/'before.db');db.backup(dest);dest.close()
    maps_before=db.execute('SELECT * FROM mappa ORDER BY chiave').fetchall();columns=[r[1] for r in db.execute('PRAGMA table_info(mappa)')]
    immutable={t:db.execute('SELECT * FROM '+t+' ORDER BY 1').fetchall() for t in ['spillo','spillo_destinazione']};db.close();report=[]
    for m in targets:
        k=m['chiave'];before=dto(k);row={'key':k,'oldName':before['nome'],'newName':m['nome'],'oldPath':before['chiave']}
        if before['nome']==m['nome']:row['status']='already-renamed'
        elif before['nome']!=previous[k]['nome']:row['status']='skipped-user-name'
        else:
            (backup/(k+'.json')).write_text(json.dumps(before,ensure_ascii=False,indent=2),encoding='utf-8')
            image=get(BASE+before['immagineUrl']);assert dto(k)==before
            req=urllib.request.Request(BASE+'/api/mappe/'+k,data=json.dumps({'nome':m['nome']}).encode(),headers={'Content-Type':'application/json'},method='PUT')
            try:
                with urllib.request.urlopen(req) as r:after=json.loads(r.read())['data']
            except urllib.error.HTTPError as e:
                row.update(status='rejected',error=e.read().decode());report.append(row);continue
            assert after['nome']==m['nome'] and get(BASE+after['immagineUrl'])==image
            assert dto(before['chiave'])==after and dto(k)==after and dto(after['chiave'])==after
            row.update(status='renamed-verified',newPath=after['chiave'],imageSha256=hashlib.sha256(image).hexdigest())
        report.append(row)
    db=sqlite3.connect(Path('work/runtime-atlante/project-p5r.db').resolve().as_uri()+'?mode=ro',uri=True)
    for t,v in immutable.items():assert db.execute('SELECT * FROM '+t+' ORDER BY 1').fetchall()==v,t
    after=db.execute('SELECT * FROM mappa ORDER BY chiave').fetchall();assert len(after)==len(maps_before)
    for a,b in zip(maps_before,after):
        for i,name in enumerate(columns):
            if name not in ('nome','updated_at'):assert a[i]==b[i],name
    db.close();(out/'verifica-nomi-runtime.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({s:sum(r['status']==s for r in report) for s in {r['status'] for r in report}}))
if __name__=='__main__':main()
