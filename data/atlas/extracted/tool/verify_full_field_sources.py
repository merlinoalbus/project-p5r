"""Check complete field resource extraction against fresh original CPK indices."""
import hashlib,json,re,sys
from pathlib import Path
from extract_maps import Archive,GAME

def sha(b):return hashlib.sha256(b).hexdigest()
def main(out,cpk=GAME):
    out=Path(out);root=out/'campi-completi';m=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
    expected={};ids=set()
    for archive in ['BASE','IT']:
        a=Archive(Path(cpk)/(archive+'.CPK'))
        try:
            for e in a.entries:
                if not (e['path'].startswith('FIELD/DATA/') and e['path'].endswith('.FBN') or e['path'].startswith('FIELD/HIT/') and e['path'].endswith(('.HTB','.BF'))):continue
                match=re.fullmatch(r'(F|FHIT_)(\d{3}_\d{3}_\d{2})\.(FBN|HTB|BF)',Path(e['path']).name)
                if not match:continue
                assert (match[1]=='FHIT_')==(match[3]=='BF')
                key=(archive,e['path']);assert key not in expected
                expected[key]={'field':'F'+match[2],'kind':match[3],'sha256':sha(a.read(e))};ids.add('F'+match[2])
        finally:a.f.close()
    metadata=json.loads((out/'mondo_metadati.json').read_text(encoding='utf-8'));ids.update(f['id'] for f in metadata['fields'])
    assert {(s['archive'],s['path']) for s in m['sources']}==set(expected)
    assert len(m['sources'])==len(expected)
    for s in m['sources']:
        e=expected[(s['archive'],s['path'])];assert all(s[k]==v for k,v in e.items())
        assert sha((out/s['file']).read_bytes())==s['sha256']
    assert {f['field'] for f in m['fields']}==ids
    for f in m['fields']:
        for kind in ['FBN','HTB','BF']:
            variants=[s for s in m['sources'] if s['field']==f['field'] and s['kind']==kind]
            assert f['variants'][kind]==variants
            assert f['resources'][kind]==(variants[-1] if variants else None)
    bf={f['field']:f['resources']['BF'] for f in m['fields'] if f['resources']['BF']}
    assert len(m['decompilations'])==len(bf) and {r['field'] for r in m['decompilations']}==set(bf)
    for r in m['decompilations']:
        assert r['sourceSha256']==bf[r['field']]['sha256']
        assert (out/r['logDirectory']/'stdout.bin').exists() and (out/r['logDirectory']/'stderr.bin').exists()
        if r['success']:assert sha((out/r['flow']).read_bytes())==r['flowSha256']
    assert not m['previousComparison']['lostFieldIds'] and not m['previousComparison']['oldSourceChanges']
    report={'status':'PASS-source-coverage','fields':len(ids),'sourceResourcesChecked':len(expected),'scriptsChecked':len(bf),
      'decompiled':sum(r['success'] for r in m['decompilations']),'failed':sum(not r['success'] for r in m['decompilations']),
      'oldSourceChanges':0,'oldFieldsLost':0,'scope':'Union of matching FBN/HTB/FHIT resources in BASE and IT plus ROADMAP; no semantic map or navigation claims.'}
    (root/'verifica-fonti.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))

if __name__=='__main__':main(sys.argv[1])
