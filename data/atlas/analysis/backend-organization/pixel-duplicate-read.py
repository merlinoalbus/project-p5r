import sqlite3,json
from pathlib import Path
codes=['RMAP_151_2_1','RMAP_151_3_0','RMAP_151_4_0','RMAP_155_4_0','RMAP_155_6_0','RMAP_161_4_0','RMAP_161_7_0']
rows=[r for r in json.loads(Path('work/parallel-cleanup/nomi-varianti.json').read_text())['maps'] if r['code'] in codes]
c=sqlite3.connect('file:work/runtime-atlante/project-p5r.db?mode=ro',uri=True);c.row_factory=sqlite3.Row
for r in rows:
 key='nativo-'+r['code'].lower().replace('_','-');r['live']=dict(c.execute('select * from mappa where chiave=?',(key,)).fetchone());r['dependencies']={}
 for name,sql in {'pins':'select * from spillo where mappa_chiave=?','incomingReferences':"select * from spillo where riferimento_tipo='mappa' and riferimento_chiave=?",'destinations':'select * from spillo_destinazione where mappa_chiave=?','aliases':'select * from mappa_alias where mappa_chiave=?','entities':'select * from mappa_entita where mappa_chiave=?','children':'select chiave from mappa where genitore_chiave=?','quarterIngress':'select * from quartiere_ingresso where mappa_chiave=?'}.items():r['dependencies'][name]=[dict(x) for x in c.execute(sql,(key,))]
Path('work/backend-organization/pixel-duplicate-merge-evidence.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));
for r in rows:print(r['code'],[(e['texpack_group'],e['texelem_index'],e['area_title_index'],e['title']) for e in r['titleEvidence']],[(f['field'],f['texpack']) for f in r['fields']],{k:len(v) for k,v in r['dependencies'].items()})
