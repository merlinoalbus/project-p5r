"""Independent raw-byte and numerical cross-check; not a semantic certification."""
import hashlib,json,struct,sys
from pathlib import Path
from PIL import Image
import numpy as np

def main(out):
    out=Path(out);d=json.loads((out/'proiezione-scuola/evidenze.json').read_text(encoding='utf-8'))
    for path,expected in d['sources'].items():assert hashlib.sha256((out/path).read_bytes()).hexdigest()==expected,path
    prior=json.loads((out/'mondo_texpack_evidenze.json').read_text(encoding='utf-8'))
    assert len(d['fields'])==6
    count=0
    for f,original in zip(d['fields'],prior['school']):
        assert f['field']==original['field']
        r=bytes.fromhex(f['roadmapSource']['rawHex']);assert list(struct.unpack_from('<hh',r,4))==f['origin']
        assert len(f['triggers'])==len([t for t in original['triggers'] if t['position']])
        assert len(f['entrances'])==len(original['entrances'])
        image=np.array(Image.open(out/f"png/BASE/FIELD/PANEL/ROADMAP/RMAP_002_0_{f['layer']}.png").convert('RGBA'))
        yy,xx=np.where((image[:,:,0]>200)&(image[:,:,1]>180)&(image[:,:,2]<80)&(image[:,:,3]>128))
        for t in f['triggers']:
            xyz=struct.unpack_from('>3f',bytes.fromhex(t['rawHex']),8);assert list(xyz)==t['xyz']
            for p in t['projections']:
                expected=np.array(f['origin'])+np.array([xyz[0],xyz[2]])/(d['scale']/p['factor'])
                assert np.allclose(expected,p['xy'],atol=1e-9)
                dist=float(np.hypot(xx-expected[0],yy-expected[1]).min())
                assert abs(dist-p['distance'])<1e-9
            count+=1
        for e in f['entrances']:
            expected=np.array(f['origin'])+np.array([e['xyz'][0],e['xyz'][2]])/(d['scale']/1.5)
            assert np.allclose(expected,e['xy'],atol=1e-9)
    report={'status':'PASS-diagnostic-consistency-only','fields':6,'triggersChecked':count,'goTriggers':len(d['goComparison']),
      'sourcesChecked':len(d['sources']),'appEdgesGenerated':0,'exceptionsRetained':d['exceptions'],'statistics':d['statistics']}
    (out/'proiezione-scuola/verifica.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report))

if __name__=='__main__':main(sys.argv[1])
