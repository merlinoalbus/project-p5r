"""Independent completeness and native entrance-byte verification for global inventory."""
import collections,hashlib,json,struct,sys
from pathlib import Path

def main(out,connection_file='mondo_connessioni_evidenze.json',target_dir='mondo-globale'):
    out=Path(out);target=out/target_dir;d=json.loads((target/'inventario.json').read_text(encoding='utf-8'))
    for name,h in d['sources'].items():assert hashlib.sha256((out/name).read_bytes()).hexdigest()==h
    conn=json.loads((out/connection_file).read_text(encoding='utf-8'));meta=json.loads((out/'mondo_metadati.json').read_text(encoding='utf-8'))
    expected={(f['field'],p['index'],i):call for f in conn['fields'] for p in f['procedures'] for i,call in enumerate(p['calls'])}
    occurrences=d['occurrences'];assert len(occurrences)==len(expected)
    assert len({o['id'] for o in occurrences})==len(occurrences)
    assert {f['id'] for f in d['fields']}=={f['field'] for f in conn['fields']}
    assert d['maps']==meta['maps']
    native={};sourcesChecked=0;parse_failed=set()
    for f in conn['fields']:
        source=f['sources'].get('fbn')
        if not source:continue
        raw=(out/source['file']).read_bytes();assert hashlib.sha256(raw).hexdigest()==source['sha256'];sourcesChecked+=1
        if f.get('components',{}).get('entrances',{}).get('status')=='parse-failed':
            parse_failed.add(f['field']);continue
        entries=[];offset=0
        while offset<len(raw):
            kind,version,size,payload=struct.unpack_from('>4I',raw,offset);assert size>=16 and offset+size<=len(raw)
            if kind==4 and payload:
                count=struct.unpack_from('>I',raw,offset+16)[0];assert size==32+count*36
                for i in range(count):
                    at=offset+32+i*36;entries.append({'id':struct.unpack_from('>h',raw,at+32)[0],'xyz':list(struct.unpack_from('>3f',raw,at+8)),'offset':at})
            offset+=size
        native[f['field']]=entries
    allfields={f['field'] for f in conn['fields']};groups=collections.defaultdict(list)
    for o in occurrences:
        field,proc,index=o['id'].split(':');assert o['call']==expected[(field,int(proc),int(index))]
        a=o['call']['literalArguments']
        if a is None:status='dynamic-arguments'
        else:
            targetkey=f'F{a[0]:03d}_{a[1]:03d}_{a[3]:02d}';assert targetkey==o['targetField']
            groups[(field,targetkey,a[2])].append(o['id'])
            if targetkey not in allfields:status='target-field-absent'
            elif targetkey in parse_failed:status='target-fbn-parse-failed'
            elif targetkey not in native:status='target-fbn-missing'
            else:
                matches=[e for e in native[targetkey] if e['id']==a[2]]
                status='entrance-id-duplicate' if len(matches)>1 else 'field-and-entrance-resolved' if matches else 'entrance-id-missing'
                if len(matches)==1:assert matches[0]['xyz']==o['matchedEntrances'][0]['xyz'] and matches[0]['offset']==o['matchedEntrances'][0]['offset']
        assert status==o['status'] and o['appImportable'] is False
    assert len(groups)==len(d['edges'])
    for e in d['edges']:assert e['occurrenceIds']==groups[(e['sourceField'],e['targetField'],e['entranceId'])]
    assert sum(r['outgoingOccurrences'] for r in d['regions'])==len(expected)
    assert {k for r in d['regions'] for k in r['fields']}==allfields
    fm={f['id'] for f in meta['fields']}
    for o in occurrences:
        if o['targetField'] not in fm:assert not o['arrivalProjectionCandidates']
        if o['sourceField'] not in fm:assert all(not p['candidates'] for p in o['sourceProjectionCandidates'])
    if 'previousComparison' in d:
        old=json.loads((out/'mondo-globale/inventario.json').read_text(encoding='utf-8'));now={o['id']:o for o in occurrences};changes=[]
        for o in old['occurrences']:
            n=now[o['id']];assert o['call']==n['call']
            if o['status']!=n['status']:changes.append({'id':o['id'],'targetField':n['targetField'],'previous':o['status'],'current':n['status']})
        assert d['previousComparison']=={'occurrencesPreserved':len(old['occurrences']),'newOccurrences':len(now)-len(old['occurrences']),'statusChanges':changes}
    report={'status':'PASS-global-inventory-only','fields':len(allfields),'maps':len(d['maps']),'occurrencesChecked':len(expected),'nativeFbnHashesChecked':sourcesChecked,
      'deduplicatedEdgesChecked':len(groups),'statuses':dict(collections.Counter(o['status'] for o in occurrences)),'operationalPinsGenerated':0}
    (target/'verifica.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))

if __name__=='__main__':main(*sys.argv[1:])
