from pathlib import Path
import shutil, json, hashlib, zipfile, datetime, sqlite3, urllib.request
root=Path('C:/Users/rober/Documents/Codex/2026-09-05/al');repo=Path('C:/Repository/project-p5r-main');dest=repo/'data/atlas';dest.mkdir(parents=True,exist_ok=True)
source=root/'outputs/mappe-p5r';export=dest/'extracted';export.mkdir(exist_ok=True)
for p in source.iterdir():
 if p.name=='originali':continue
 q=export/p.name
 if p.is_dir():shutil.copytree(p,q,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
 else:shutil.copy2(p,q)
print('Export, PNG e analisi native copiati',flush=True)
for name in ['parallel-cleanup','backend-organization','root-name-release','base-map-assets']:
 src=root/'work'/name;out=dest/'analysis'/name;out.mkdir(parents=True,exist_ok=True)
 for p in src.iterdir():
  if p.is_file() and p.suffix in {'.json','.md','.py','.ts','.mjs','.txt'}:shutil.copy2(p,out/p.name)
workout=dest/'history';workout.mkdir(exist_ok=True)
for p in (root/'work').iterdir():
 if p.is_file() and p.suffix in {'.py','.ts','.mjs','.md','.json'}:shutil.copy2(p,workout/p.name)
for p in (root/'work').glob('handoff-final-*.log'):shutil.copy2(p,workout/(p.stem+'.txt'))
shutil.copytree(root/'work/extractor',repo/'tools/p5r-map-export',dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
shutil.copytree(root/'work/atlus-script-tools',repo/'tools/p5r-map-export/vendor/atlus-script-tools',dirs_exist_ok=True,ignore=shutil.ignore_patterns('*.pdb','*.log'))
shutil.copytree(root/'outputs/documenti-mondo',dest/'documents',dirs_exist_ok=True)
c=sqlite3.connect('file:'+str(root/'work/runtime-atlante/project-p5r.db').replace('\\','/')+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
tables=['mappa','mappa_alias','mappa_percorso','mappa_presentazione','mappa_entita','spillo','spillo_immagine','spillo_destinazione','guida_mappa','guida_alias','quartiere_ingresso']
snapshot={'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Configurazione mappe corrente; non contiene partite o statistiche dei personaggi. Nessun reset eseguito.','tables':{t:[dict(r) for r in c.execute('SELECT * FROM '+t)] for t in tables}}
(dest/'runtime-map-configuration.json').write_text(json.dumps(snapshot,ensure_ascii=False,indent=2),encoding='utf8');c.close()
with urllib.request.urlopen('http://localhost:3103/api/mappe/esporta') as response:(dest/'runtime-map-package.json').write_bytes(response.read())
# Gli originali occupano1.53GB. Archivio lossless suddiviso per mantenere ogni blob sotto il limite GitHub.
zip_path=root/'work/handoff-originali.zip';entries=[]
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
 for i,p in enumerate(sorted((source/'originali').rglob('*'))):
  if not p.is_file():continue
  rel=p.relative_to(source).as_posix();z.write(p,rel);entries.append({'path':rel,'size':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
print('Originali compressi: '+str(zip_path.stat().st_size)+' byte',flush=True)
parts=dest/'original-archives';parts.mkdir(exist_ok=True);part_list=[];whole=hashlib.sha256()
with zip_path.open('rb') as f:
 i=1
 while block:=f.read(48*1024*1024):
  name=f'originali.zip.part{i:03d}';(parts/name).write_bytes(block);whole.update(block);part_list.append({'file':name,'size':len(block),'sha256':hashlib.sha256(block).hexdigest()});i+=1
(parts/'manifest.json').write_text(json.dumps({'format':'Concatenated ZIP split in48MiB parts','archiveSha256':whole.hexdigest(),'parts':part_list,'files':entries},ensure_ascii=False,indent=2),encoding='utf8')
print('Consegna preparata: '+str(len(entries))+' originali in '+str(len(part_list))+' parti',flush=True)
