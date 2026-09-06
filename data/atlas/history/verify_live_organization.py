import json, sqlite3, urllib.request, hashlib
from pathlib import Path
base='http://localhost:3103'
def get(p):return json.load(urllib.request.urlopen(base+p))['data']
c=sqlite3.connect('work/runtime-atlante/project-p5r.db');c.row_factory=sqlite3.Row
old=sqlite3.connect('work/pre-organization-042-runtime.db')
old_ids={r[0] for r in old.execute('select id from spillo')};new_ids={r[0] for r in c.execute('select id from spillo')}
assert old_ids<=new_ids
plan=json.loads(Path('work/base-map-assets/piano-organizzazione-v2.json').read_text(encoding='utf8'))
for key,v in plan['renames'].items():assert c.execute('select nome from mappa where chiave=?',(key,)).fetchone()[0]==v['after']
for source,target in plan['merges'].items():
 assert c.execute('select count(*) from mappa where chiave=?',(source,)).fetchone()[0]==0
 assert get('/api/mappe/risolvi/'+source)['tipo']=='mappa'
images=[]
for row in c.execute("select chiave from mappa where chiave like 'nativo-rmap-%'"):
 k=row['chiave'];dto=get('/api/mappe/'+k)
 url=dto['immagineUrl'] or '/asset/'+dto['assetOriginale']+'.png'
 with urllib.request.urlopen((base if dto['immagineUrl'] else 'http://localhost:5275')+url) as f: data=f.read();mime=f.headers.get('Content-Type','')
 assert 'image/' in mime and len(data)>0,k
 expected=Path('C:/Repository/project-p5r-main/public/asset/mappe/native')/(k+'.png')
 assert hashlib.sha256(data).digest()==hashlib.sha256(expected.read_bytes()).digest(),k
 images.append(k)
assert len(images)==301
guides=sum(len(get('/api/mappe/contenuti/dungeon-'+r[0])['aree']) for r in c.execute('select chiave from dungeon'))
assert guides==c.execute('select count(*) from dungeon_area').fetchone()[0]
assert not c.execute('pragma foreign_key_check').fetchall()
report={'pass':True,'nativeImagesLoadedAndHashMatched':len(images),'preservedPinIds':len(old_ids),'currentPinIds':len(new_ids),'guideSections':guides,'maps':c.execute('select count(*) from mappa').fetchone()[0],'renames':len(plan['renames']),'mergedAliases':len(plan['merges'])}
Path('work/organization-live-final-report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report))
