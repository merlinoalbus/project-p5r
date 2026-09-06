"""Extract monthly scheduler variants and retain reproducible decompilation evidence."""
import argparse,concurrent.futures,hashlib,json,re,subprocess
from pathlib import Path
from extract_maps import Archive,GAME

def sha(b):return hashlib.sha256(b).hexdigest()
def main(out,exe,cpk):
    out=Path(out);exe=Path(exe).resolve();target=out/'scheduler';target.mkdir(exist_ok=True)
    sources=[];coverage=[]
    for archive in ['BASE','IT']:
        a=Archive(Path(cpk)/(archive+'.CPK'))
        try:
            entries={e['path']:e for e in a.entries}
            for month in range(1,13):
                name=f'SCHEDULER/SCHEDULER_{month:02d}.BF';e=entries.get(name)
                coverage.append({'archive':archive,'resource':name,'present':e is not None})
                if not e:continue
                data=a.read(e);p=target/archive/Path(name).name;p.parent.mkdir(exist_ok=True);p.write_bytes(data)
                sources.append({'archive':archive,'resource':name,'file':p.relative_to(out).as_posix(),'sha256':sha(data),'bytes':len(data)})
        finally:a.f.close()
    def decode(s):
        p=out/s['file'];dest=p.with_suffix('.flow');cwd=p.parent/'logs'/p.stem;cwd.mkdir(parents=True,exist_ok=True)
        args=[str(exe),'-Decompile','-In',str(p.resolve()),'-Library','P5R','-Encoding','P5','-Out',str(dest.resolve())]
        try:
            run=subprocess.run(args,cwd=cwd,capture_output=True,timeout=180)
            (cwd/'stdout.bin').write_bytes(run.stdout);(cwd/'stderr.bin').write_bytes(run.stderr)
            # Keep exact bytes even if the console encoding differs from this readable rendering.
            (cwd/'console.txt').write_text(run.stdout.decode('utf-16le',errors='replace')+'\nSTDERR\n'+run.stderr.decode('utf-8',errors='replace'),encoding='utf-8')
            return {**s,'exitCode':run.returncode,'success':run.returncode==0 and dest.exists(),
              'flow':dest.relative_to(out).as_posix() if dest.exists() else None,'flowSha256':sha(dest.read_bytes()) if dest.exists() else None,
              'logDirectory':cwd.relative_to(out).as_posix(),'command':args}
        except subprocess.TimeoutExpired as e:
            (cwd/'stdout.bin').write_bytes(e.stdout or b'');(cwd/'stderr.bin').write_bytes(e.stderr or b'')
            return {**s,'success':False,'error':'timeout180seconds','logDirectory':cwd.relative_to(out).as_posix(),'command':args}
    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for result in pool.map(decode,sources):results.append(result);print(result['file'],result['success'],flush=True)
    report={'schemaVersion':1,'compiler':{'file':str(exe),'sha256':sha(exe.read_bytes()),'library':'P5R','encoding':'P5'},
      'coverage':coverage,'results':results,'limits':['File suffix alone is not a proof of date semantics.','Decompiled sources do not directly map native flags into app conditions.']}
    (target/'decompilazione.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'coverageSlots':len(coverage),'sources':len(sources),'success':sum(r['success'] for r in results)}),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('out');p.add_argument('--compiler',required=True);p.add_argument('--cpk',default=str(GAME));a=p.parse_args();main(a.out,a.compiler,a.cpk)
