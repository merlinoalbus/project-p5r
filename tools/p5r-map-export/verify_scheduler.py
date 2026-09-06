"""Independent census coverage for selected literal native addresses."""
from scrittura import scrivi_json
import collections,hashlib,json,re,sys
from pathlib import Path

def main(out):
    out=Path(out);root=out/'scheduler';m=json.loads((root/'decompilazione.json').read_text(encoding='utf-8'));d=json.loads((root/'riferimenti.json').read_text(encoding='utf-8'))
    assert len(m['coverage'])==24 and len(m['results'])==12 and all(r['success'] for r in m['results'])
    assert len({(c['archive'],c['resource']) for c in m['coverage']})==24
    assert all(c['present']==(c['archive']=='BASE') for c in m['coverage'])
    totals=collections.Counter()
    for f in d['files']:
        e=f['source'];raw=(out/e['flow']).read_bytes();assert hashlib.sha256(raw).hexdigest()==e['flowSha256']
        assert hashlib.sha256((out/e['file']).read_bytes()).hexdigest()==e['sha256']
        text=raw.decode('utf-8-sig').replace('\r\n','\n');masked=re.sub(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"','',text)
        # Match exact bank zero, not e.g. 0x10000000+96.
        expected=collections.Counter((fn,'flag',int(address)) for fn,address in re.findall(r'\b(BIT_CHK|BIT_ON|BIT_OFF)\(\(0 \+ (96|102|1087)\)\)',masked))
        expected.update((fn,'counter',16) for fn in re.findall(r'\b(GET_COUNT|SET_COUNT)\(0x10\b',masked))
        actual=collections.Counter((r['function'],r['kind'],r['address']) for r in f['references'] if r['address'] is not None)
        assert actual==expected,(e['flow'],actual,expected)
        for r in f['references']:
            assert r['function'] in text.splitlines()[r['line']-1]
            p=next(p for p in f['procedures'] if p['name']==r['procedure'])
            assert r in p['references'] and p['body'] in text
        totals.update(actual)
    assert len(d['files'])==12
    report={'status':'PASS-census-only','files':12,'coverageSlots':24,'literalReferences':sum(totals.values()),
      'unresolvedDynamicAddresses':d['summary']['dynamicAddresses'],'counts':[{'function':k[0],'kind':k[1],'address':k[2],'count':v} for k,v in totals.items()],
      'appConditionsGenerated':0}
    scrivi_json(root/'verifica.json', report);print(json.dumps(report))

if __name__=='__main__':main(sys.argv[1])
