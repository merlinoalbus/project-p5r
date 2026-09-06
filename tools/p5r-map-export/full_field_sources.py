"""Inventory every original field resource; no ROADMAP-only filtering."""
from scrittura import scrivi_json, scrivi_testo
import argparse,collections,concurrent.futures,hashlib,json,re,subprocess
from pathlib import Path
from extract_maps import Archive,GAME

PATTERN=re.compile(r'FIELD/(?:DATA/F(\d{3}_\d{3}_\d{2})\.FBN|HIT/F(\d{3}_\d{3}_\d{2})\.HTB|HIT/FHIT_(\d{3}_\d{3}_\d{2})\.BF)')
def sha(b):return hashlib.sha256(b).hexdigest()
def main(out,compiler,cpk):
    out=Path(out).resolve();root=out/'campi-completi';root.mkdir(exist_ok=True);exe=Path(compiler).resolve()
    metadata=json.loads((out/'mondo_metadati.json').read_text(encoding='utf-8'));fieldids={f['id'][1:] for f in metadata['fields']}
    entries=[];sources=[];selected={}
    for archive in ['BASE','IT']:
        arc=Archive(Path(cpk)/(archive+'.CPK'))
        try:
            for e in arc.entries:
                m=PATTERN.fullmatch(e['path'])
                if not m:continue
                key=next(v for v in m.groups() if v);fieldids.add(key);kind=e['path'].rsplit('.',1)[1]
                data=arc.read(e);p=root/'originali'/archive/e['path'];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
                source={'archive':archive,'path':e['path'],'field':'F'+key,'kind':kind,'file':p.relative_to(out).as_posix(),'sha256':sha(data),'bytes':len(data)}
                entries.append({'archive':archive,**e});sources.append(source);selected[(key,kind)]=source
        finally:arc.f.close()
    config={p.relative_to(exe.parent).as_posix():sha(p.read_bytes()) for p in exe.parent.rglob('*') if p.is_file() and p.suffix.lower() in ['.json','.tsv']}
    manifest={'schemaVersion':1,'precedence':'IT overrides BASE for equal field and resource kind; both originals retained',
      'archiveEntries':entries,'sources':sources,'compiler':{'exeSha256':sha(exe.read_bytes()),'configurationHashes':config,'library':'P5R','encoding':'P5','cacheUsed':False},
      'fields':[{'field':'F'+key,'inRoadmap':any(f['id']=='F'+key for f in metadata['fields']),
        'resources':{kind:selected.get((key,kind)) for kind in ['FBN','HTB','BF']},
        'variants':{kind:[s for s in sources if s['field']=='F'+key and s['kind']==kind] for kind in ['FBN','HTB','BF']}}
        for key in sorted(fieldids)],'decompilations':[]}
    scrivi_json(root/'manifest.json', manifest)
    jobs=[s for (key,kind),s in selected.items() if kind=='BF']
    def decode(source):
        key=source['field'][1:];dest=root/'scripts'/(key+'.flow');dest.parent.mkdir(exist_ok=True);cwd=root/'logs'/key;cwd.mkdir(parents=True,exist_ok=True)
        command=[str(exe),'-Decompile','-In',str(out/source['file']),'-Library','P5R','-Encoding','P5','-Out',str(dest)]
        try:
            r=subprocess.run(command,cwd=cwd,capture_output=True,timeout=180)
            (cwd/'stdout.bin').write_bytes(r.stdout);(cwd/'stderr.bin').write_bytes(r.stderr)
            scrivi_testo(cwd/'console.txt', r.stdout.decode('utf-16le',errors='replace')+'\nSTDERR\n'+r.stderr.decode('utf-8',errors='replace'))
            return {'field':source['field'],'sourceSha256':source['sha256'],'success':r.returncode==0 and dest.exists(),'exitCode':r.returncode,
              'flow':dest.relative_to(out).as_posix() if dest.exists() else None,'flowSha256':sha(dest.read_bytes()) if dest.exists() else None,'logDirectory':cwd.relative_to(out).as_posix()}
        except subprocess.TimeoutExpired as e:
            (cwd/'stdout.bin').write_bytes(e.stdout or b'');(cwd/'stderr.bin').write_bytes(e.stderr or b'')
            return {'field':source['field'],'sourceSha256':source['sha256'],'success':False,'error':'timeout180seconds','logDirectory':cwd.relative_to(out).as_posix()}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for i,r in enumerate(pool.map(decode,jobs),1):
            manifest['decompilations'].append(r)
            if i%10==0:print('DECOMPILED',i,'/',len(jobs),flush=True)
    old=json.loads((out/'mondo_connessioni_evidenze.json').read_text(encoding='utf-8'))
    manifest['previousComparison']={'oldFields':len(old['fields']),'newFields':len(fieldids),'lostFieldIds':sorted({f['field'] for f in old['fields']}-{'F'+k for k in fieldids}),
      'oldSourceChanges':[{'field':f['field'],'kind':kind,'old':s['sha256'],'new':selected.get((f['field'][1:],kind.upper()),{}).get('sha256')}
        for f in old['fields'] for kind,s in f['sources'].items() if s and s['sha256']!=selected.get((f['field'][1:],kind.upper()),{}).get('sha256')]}
    manifest['summary']={'fields':len(fieldids),'sources':len(sources),'resourcesByArchive':dict(collections.Counter(s['archive']+'/'+s['kind'] for s in sources)),
      'scripts':len(jobs),'decompiled':sum(r['success'] for r in manifest['decompilations']),'failed':sum(not r['success'] for r in manifest['decompilations'])}
    scrivi_json(root/'manifest.json', manifest);print(json.dumps(manifest['summary']),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('out');p.add_argument('--compiler',required=True);p.add_argument('--cpk',default=str(GAME));a=p.parse_args();main(a.out,a.compiler,a.cpk)
