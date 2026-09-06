import sqlite3, json, sys
from pathlib import Path
path=Path(sys.argv[1]).resolve();report=Path(sys.argv[2]).resolve()
assert path.exists() and path!=report
c=sqlite3.connect(path);c.row_factory=sqlite3.Row
backup=path.with_name(path.name+'.before-duplicate-repair.db')
assert not backup.exists()
with sqlite3.connect(backup) as b:c.backup(b)
c.execute('PRAGMA foreign_keys=ON');c.execute('BEGIN IMMEDIATE')
try:
 keep=dict(c.execute('SELECT * FROM spillo WHERE id=389').fetchone())
 remove=dict(c.execute('SELECT * FROM spillo WHERE id=397').fetchone())
 assert keep['origine']=='utente' and keep['mappa_chiave']=='nativo-rmap-009-2-0' and keep['solo_posizione']==1
 expected={'tipo':'attivita','nome':'Gabbie di Battuta','x':50.6,'y':54.9,'riferimento':{'tipo':'luogo','chiave':'yongen-jaya/batting-cage-yongen'}}
 assert json.loads(keep['seed_identita_json'])==expected
 assert remove['origine']=='seed' and remove['mappa_chiave']=='citta-yongen-jaya' and remove['seed_identita_json'] is None
 assert remove['nome']==expected['nome'] and remove['tipo']==expected['tipo'] and remove['x']==expected['x'] and remove['y']==expected['y']
 assert remove['riferimento_tipo']==expected['riferimento']['tipo'] and remove['riferimento_chiave']==expected['riferimento']['chiave']
 assert remove['descrizione']=='Minigioco di battuta per aumentare la dote Perizia.' and remove['condizioni_json'] is None and remove['solo_posizione']==0
 assert remove['updated_at']=='2026-09-06T02:22:51.168Z'
 quote=lambda s:'"'+s.replace('"','""')+'"'
 checked=[]
 for (table,) in c.execute("SELECT name FROM sqlite_master WHERE type='table'"):
  for fk in c.execute('PRAGMA foreign_key_list('+quote(table)+')'):
   if fk['table']=='spillo':
    count=c.execute('SELECT count(*) FROM '+quote(table)+' WHERE '+quote(fk['from'])+'=?',(397,)).fetchone()[0]
    assert count==0,(table,count);checked.append(table+'.'+fk['from'])
 c.execute('DELETE FROM spillo WHERE id=397')
 assert dict(c.execute('SELECT * FROM spillo WHERE id=389').fetchone())==keep
 assert not c.execute('PRAGMA foreign_key_check').fetchall()
 c.commit()
 result={'pass':True,'database':str(path),'backup':str(backup),'kept':keep,'removed':remove,'dependentReferencesChecked':checked}
 report.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps({'pass':True,'preservedId':389,'removedAccidentalSeedId':397,'referencesChecked':len(checked)}))
except Exception:
 c.rollback();raise
finally:c.close()
