"""Verify identity references directly against native table offsets."""
import hashlib,json,struct,sys
from pathlib import Path
from native_labels import Decoder

def main(out):
    out=Path(out);root=out/'campi-completi';d=json.loads((root/'identita.json').read_text(encoding='utf-8'));raw={}
    for k,s in d['sources'].items():
        raw[k]=(out/s['file']).read_bytes();assert hashlib.sha256(raw[k]).hexdigest()==s['sha256']
    m=json.loads(raw['manifest']);meta=json.loads(raw['roadmap']);fm={f['id']:f for f in meta['fields']}
    assert [f['field'] for f in d['fields']]==[f['field'] for f in m['fields']]
    placecount=struct.unpack_from('>H',raw['places'],14)[0];titlecount=struct.unpack_from('>H',raw['titles'],14)[0]
    decoder=Decoder(out/d['sources']['charset']['file']);checked=0
    for f in d['fields']:
        major,minor,sub=map(int,f['field'][1:].split('_'));p=f['placeRecord'];valid=False
        if major<placecount:
            off=struct.unpack_from('>I',raw['places'],16+major*4)[0];count=struct.unpack_from('>I',raw['places'],off+8)[0]
            if minor<count:valid=True
        if not valid:assert p is None and f['placeRecordStatus']=='voce-assente'
        else:
            pos=off+16+minor*8;record=raw['places'][pos:pos+8];ids=list(struct.unpack('>4H',record))
            assert p['offset']==pos and p['rawHex']==record.hex() and p['indices']==ids
            for ref,i in zip([p['group']]+p['variants'],ids):
                if i>=titlecount:assert ref['status']=='indice-invalido';continue
                at=struct.unpack_from('>I',raw['titles'],16+i*4)[0];length=raw['titles'][at];b=raw['titles'][at+4:at+4+length]
                text,unknown=decoder.decode(b)
                assert (ref['index'],ref['offset'],ref['rawHex'],ref['text'],ref['unknownOffsets'])==(i,at+4,b.hex(),text,unknown)
                checked+=1
            assert f['variantCandidate']==(p['variants'][sub] if sub<3 else None)
        assert f['canonicalName'] is None and f['roadmap']==fm.get(f['field'])
        assert f['mapCandidates']==[r['code'] for r in meta['maps'] if f['field'] in r['fields']]
    result={'status':'PASS-native-identity-references','fields':len(d['fields']),'rawTitleReferencesChecked':checked,'roadmapFieldsUnchanged':len(fm),'scope':'Native references; candidate variant not canonical floor.'}
    (root/'verifica-identita.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))

if __name__=='__main__':main(sys.argv[1])
