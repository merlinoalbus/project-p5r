import hashlib,json,struct,sys
from pathlib import Path

def main(out):
    out=Path(out);path=out/'proiezione-scuola/candidati-collegamenti.json';d=json.loads(path.read_text(encoding='utf-8'))
    for name,h in d['sources'].items():assert hashlib.sha256((out/name).read_bytes()).hexdigest()==h
    graph=json.loads((out/'mondo_connessioni_evidenze.json').read_text(encoding='utf-8'));fields={f['field']:f for f in graph['fields']}
    for c in d['candidates']:
        assert not c['appImportable'] and c['conditionsStatus']=='native-only-not-mapped-to-app'
        f=fields[c['destinationField']];a=c['call']['literalArguments'];matches=[e for e in f['entrances'] if e['entranceId']==a[2]]
        assert len(matches)==1
        e=matches[0];b=(out/f['sources']['fbn']['file']).read_bytes()[e['offset']:e['offset']+36]
        assert b.hex()==c['arrival']['rawHex'] and struct.unpack_from('>h',b,32)[0]==a[2]
        assert list(struct.unpack_from('>3f',b,8))==c['arrival']['xyz']
        root=next(p for p in c['procedures'] if p['name']==c['rootProcedure'])
        assert 'BIT_CHK((0 + 96)) == 1' in root['body']
        if a[1]==3:
            assert 'BIT_CHK((0 + 102)) == 1' in root['body'] and abs(c['arrival']['altitudeResidual'])<1
        else:assert c['arrival']['xy'] is None and c['arrival']['map'] is None
        assert c['trigger']==next(t for t in fields[c['sourceField']]['triggers'] if t['index']==c['triggerIndex'])
        for p in c['procedures']:assert p==next(o for o in fields[c['sourceField']]['procedures'] if o['name']==p['name'])
    report={'status':'PASS-candidate-evidence-only','candidates':len(d['candidates']),'spatialCandidates':sum(c['arrival']['xy'] is not None for c in d['candidates']),
      'unresolvedLocalArrivals':sum(c['arrival']['xy'] is None for c in d['candidates']),'sourceHashes':len(d['sources']),'appEdgesGenerated':0}
    (out/'proiezione-scuola/verifica-candidati.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))

if __name__=='__main__':main(sys.argv[1])
