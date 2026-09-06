"""Read-only investigation of field exits; keep every source and compiler log."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
sys.path.insert(0, str(Path(__file__).parent/'extractor'))
from extract_maps import Archive, GAME

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'field_scripts'
EXE=ROOT/'atlus-script-tools/AtlusScriptCompiler.exe'


def main():
    OUT.mkdir(exist_ok=True)
    fields=json.loads((ROOT.parent/'outputs/mappe-p5r/mondo_metadati.json').read_text(encoding='utf8'))['fields']
    wanted={f'{f["major"]:03d}_{f["minor"]:03d}_{f["sub"]:02d}' for f in fields}
    files={}
    sources=[]
    for archive in ('BASE','IT'):
        a=Archive(GAME/(archive+'.CPK'))
        try:
            for e in a.entries:
                m=re.fullmatch(r'FIELD/HIT/FHIT_(\d{3}_\d{3}_\d{2})\.BF',e['path'])
                if m and m[1] in wanted:
                    b=a.read(e)
                    p=OUT/(m[1]+'.BF')
                    p.write_bytes(b)
                    files[m[1]]=p
                    sources.append(dict(archive=archive,path=e['path'],file=p.name,sha256=hashlib.sha256(b).hexdigest()))
        finally:
            a.f.close()
    (OUT/'sources.json').write_text(json.dumps(sources,indent=2),encoding='utf8')
    def run(item):
        key,p=item
        dest=p.with_suffix('.flow')
        if dest.exists():
            return dict(field=key,success=True,cached=True)
        # The compiler always creates a fixed-name log in cwd: isolate each job.
        cwd=OUT/'compiler_logs'/key
        cwd.mkdir(parents=True,exist_ok=True)
        r=subprocess.run([str(EXE),'-Decompile','-In',str(p),'-Library','P5R','-Encoding','P5','-Out',str(dest)],capture_output=True,timeout=180,cwd=cwd)
        p.with_suffix('.log').write_text(r.stdout.decode('utf-16le',errors='replace')+'\nSTDERR:\n'+r.stderr.decode('utf8',errors='replace'),encoding='utf8')
        return dict(field=key,success=r.returncode==0 and dest.is_file(),exit=r.returncode)
    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for r in pool.map(run,files.items()):
            results.append(r)
            if len(results)%20==0:print('DECOMPILED',len(results),'/',len(files),flush=True)
    (OUT/'report.json').write_text(json.dumps(results,indent=2),encoding='utf8')
    print('DONE',len(results),'FAIL',sum(not r['success'] for r in results),flush=True)


if __name__=='__main__':
    main()
