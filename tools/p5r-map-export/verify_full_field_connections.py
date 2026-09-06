"""Independent raw record and whole-flow coverage verification."""
from scrittura import scrivi_json
import hashlib,json,re,struct,sys
from pathlib import Path

def digest(b):return hashlib.sha256(b).hexdigest()
def main(out):
    out=Path(out);root=out/'campi-completi';m=json.loads((root/'manifest.json').read_text(encoding='utf-8'));d=json.loads((root/'connessioni.json').read_text(encoding='utf-8'))
    assert d['manifestSha256']==digest((root/'manifest.json').read_bytes())
    assert [f['field'] for f in d['fields']]==[f['field'] for f in m['fields']]
    calls=records=0;failures=[]
    for f in d['fields']:
        raw={}
        for kind,s in f['sources'].items():
            if s:
                raw[kind]=(out/s['file']).read_bytes();assert digest(raw[kind])==s['sha256']
        for component,kind,wanted,stride in [('triggerPositions','fbn',1,100),('entrances','fbn',4,36),('hits','htb',5,60)]:
            state=f['components'][component];key='triggers' if component=='hits' else component
            if kind not in raw:
                assert state['status']=='absent' and not f[key];continue
            b=raw[kind];offset=0;expected=[];error=False
            while offset<len(b):
                typ,version,size,start=struct.unpack_from('>4I',b,offset)
                assert size>=16 and offset+size<=len(b) and start in (0,16)
                if start:
                    count,a,c,e=struct.unpack_from('>4I',b,offset+16)
                    if typ==wanted:
                        if a or c or e:error=True
                        payload=b[offset+32:offset+size]
                        if len(payload)<count*stride or any(payload[count*stride:]):error=True
                        for i in range(count):expected.append((i,offset+32+i*stride))
                offset+=size
            if kind=='fbn':
                offset=0
                for block in f['fbnBlocks']:
                    typ,version,size,start=struct.unpack_from('>4I',b,offset)
                    assert block=={'offset':offset,'kind':typ,'version':version,'size':size,'payloadOffset':start,'headerHex':b[offset:offset+(32 if start else 16)].hex(),'decodedSpatialType':typ in (1,4)}
                    offset+=size
                assert offset==len(b)
            if error:
                assert state['status']=='parse-failed' and not f[key];failures.append([f['field'],component]);continue
            assert state['status']==('valid' if expected else 'valid-empty')
            assert len(f[key])==len(expected)
            for row,(i,p) in zip(f[key],expected):
                assert row['index']==i and row['offset']==p
                if kind=='fbn':
                    assert row['xyz']==list(struct.unpack_from('>3f',b,p+8))
                    if wanted==4:assert row['entranceId']==struct.unpack_from('>h',b,p+32)[0]
                else:
                    flags=list(struct.unpack_from('<6I',b,p));name,proc,prompt=struct.unpack_from('<3H',b,p+26)
                    assert row['enableFlags']==flags[:3] and row['disableFlags']==flags[3:]
                    assert (row['nameId'],row['procedureIndex'],row['promptType'],row['hitType'])==(name,proc,prompt,b[p+25])
                    pos=f['triggerPositions'][i] if f['positionAssociation']=='indice-parallelo' else None
                    assert row['position']==pos
                records+=1
        if f['script']:
            b=(out/f['script']['file']).read_bytes();assert digest(b)==f['script']['sha256'];s=b.decode('utf-8-sig')
            # Mask comments/strings preserving line numbers across the entire file.
            masked=re.sub(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"',lambda x:''.join('\n' if c=='\n' else ' ' for c in x[0]),s)
            lines=[masked[:x.start()].count('\n')+1 for x in re.finditer(r'\bCALL_FIELD\s*\(',masked)]
            actual=[c for p in f['procedures'] for c in p['calls']]
            assert lines==[c['line'] for c in actual],f['field']
            assert len(f['procedures'])==len(re.findall(r'// Procedure Index: \d+',s))
            for p in f['procedures']:assert p['body'] in s
            calls+=len(lines)
    old=json.loads((out/'mondo_connessioni_evidenze.json').read_text(encoding='utf-8'));byid={f['field']:f for f in d['fields']}
    for f in old['fields']:
        for k in ('triggers','triggerPositions','entrances','procedures','triggerCountFbn'):assert f[k]==byid[f['field']][k]
    report={'status':'PASS-evidence-coverage','fields':len(d['fields']),'rawRecordsChecked':records,'callsIndependentlyCounted':calls,'explicitParseFailures':failures,'oldFieldsUnchanged':len(old['fields']),'scope':'Evidence extraction only; no operational navigation claim.'}
    scrivi_json(root/'verifica-connessioni.json', report);print(json.dumps(report))

if __name__=='__main__':main(sys.argv[1])
