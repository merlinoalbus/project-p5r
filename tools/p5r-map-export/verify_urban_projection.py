"""Verify complete urban diagnostic geometry against original bytes."""
from scrittura import scrivi_json
import hashlib,json,math,struct,sys
from pathlib import Path
from PIL import Image
from render_maps import unpack_tbl

def main(out):
    out=Path(out);dest=out/'proiezione-urbana';d=json.loads((dest/'evidenze.json').read_text(encoding='utf-8'))
    for f,h in d['sources'].items():assert hashlib.sha256((out/f).read_bytes()).hexdigest()==h
    conn=json.loads((out/'campi-completi/connessioni.json').read_text(encoding='utf-8'));fields={f['field']:f for f in conn['fields']}
    tbl=unpack_tbl((out/'originali/IT/FIELD/PANEL/ROADMAP/ROADMAP.TBL').read_bytes());n=0;counts=[]
    assert {r['field'] for r in d['fields']}=={'F001_003_00','F005_001_00','F009_002_00'}
    for r in d['fields']:
        f=fields[r['field']];b=(out/f['sources']['fbn']['file']).read_bytes();assert r['procedures']==f['procedures']
        assert [t['trigger'] for t in r['triggers']]==f['triggers'] and [e['entrance'] for e in r['entrances']]==f['entrances']
        assert not r['unassociatedPositions'] and f['positionAssociation']=='indice-parallelo'
        ro=r['roadmap']['offset'];to=r['texpack']['offset'];x,y=struct.unpack_from('<hh',tbl['roadmap.bin'],ro+4);scale=struct.unpack_from('<f',tbl['texpack.bin'],to+8)[0]
        assert r['scale']==scale and r['roadmapRawHex']==tbl['roadmap.bin'][ro:ro+16].hex()
        assert list(Image.open(out/r['image']).size)==r['size']
        for kind,items in [('trigger',r['triggers']),('entrance',r['entrances'])]:
            for item in items:
                pos=item['trigger']['position'] if kind=='trigger' else item['entrance'];at=pos['offset'];xyz=struct.unpack_from('>3f',b,at+8)
                assert list(xyz)==pos['xyz'];stride=100 if kind=='trigger' else 36
                assert item['rawPositionHex' if kind=='trigger' else 'rawHex']==b[at:at+stride].hex()
                for p in item['projections']:
                    expected=[x+xyz[0]*p['factor']/scale,y+xyz[2]*p['factor']/scale]
                    assert all(math.isclose(a,c,abs_tol=1e-9) for a,c in zip(expected,p['xy']))
                n+=1
        counts.append({'field':r['field'],'triggers':len(r['triggers']),'entrances':len(r['entrances'])})
    graph=json.loads((out/'campi-completi/grafo/inventario.json').read_text(encoding='utf-8'));targets={'F003_010_00','F010_019_00','F010_005_00','F005_002_00','F005_003_00','F009_003_00'}
    assert d['cases']==[o for o in graph['occurrences'] if o['targetField'] in targets]
    result={'status':'PASS-diagnostic-calculation','pointsChecked':n,'fields':counts,'cases':len(d['cases']),'scope':'Formula arithmetic and raw coverage; visual semantics require independent review.'}
    scrivi_json(dest/'verifica.json', result);print(json.dumps(result))

if __name__=='__main__':main(sys.argv[1])
