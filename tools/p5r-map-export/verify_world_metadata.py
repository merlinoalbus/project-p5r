"""Three checks for raw world metadata; not a certification of navigability."""
from scrittura import scrivi_json
import ast
import hashlib
import json
from pathlib import Path
import struct
import sys
import world_metadata as world
from render_maps import unpack_tbl


def main(out):
    out=Path(out)
    path=out/'mondo_metadati.json'
    previous=hashlib.sha256(path.read_bytes()).hexdigest()
    data=json.loads(path.read_text(encoding='utf8'))
    ast.parse(Path(world.__file__).read_text(encoding='utf8'))
    fields={f['id']:f for f in data['fields']}
    assert len(fields)==len(data['fields']) and all(f['major']>=0 for f in fields.values())
    for s in data['sources']:
        assert hashlib.sha256((out/s['file']).read_bytes()).hexdigest()==s['sha256']
    for m in data['maps']:
        assert (out/m['originalImage']).is_file()
        assert all(f in fields for f in m['fields'])
    print('1 syntax, source hashes, valid identities and image paths PASS')
    b=unpack_tbl((out/'originali/IT/FIELD/PANEL/ROADMAP/ROADMAP.TBL').read_bytes())['roadmap.bin']
    expected=[]
    for o in range(0,len(b),16):
        major=int.from_bytes(b[o:o+2],'little',signed=True)
        if major==-1:
            assert o==len(b)-16 and b[o+2:o+4]==b'\xff\xff'
            continue
        expected.append(f'F{major:03d}_{b[o+2]:03d}_{b[o+3]:02d}')
    assert expected==list(fields)
    pins=0
    for m in data['maps']:
        b=(out/'originali/BASE/FIELD/PANEL/ROADMAP'/m['iconSource']).read_bytes()
        for pin in m['pins']:
            o=pin['offset']
            assert int.from_bytes(b[o:o+4],'little')==pin['nativeType']
            assert struct.unpack('<ff',b[o+20:o+28])==(pin['x'],pin['y'])
            assert int.from_bytes(b[o+28:o+32],'little')==pin['flag']
            assert int.from_bytes(b[o+32:o+36],'little')==pin['effect']
            assert pin['conditional']==(pin['flag']!=0xffffffff)
            pins+=1
    print('2 independent field identities and all native pin bytes PASS')
    world.main(out)
    assert hashlib.sha256(path.read_bytes()).hexdigest()==previous
    for function,b in [(world.ftd_blocks,b'bad'),(world.icon_layers,b'\0'*72),(world.roadmap_tables,b'bad')]:
        try:
            function(b)
        except (ValueError,struct.error):
            continue
        raise AssertionError('Malformed data accepted')
    print('3 deterministic rerun and malformed input rejection PASS')
    report=dict(status='PASS',fields=len(fields),maps=len(data['maps']),pins=pins,
        passes=['syntax, source hashes, identity and images','independent binary fields and pin bytes','determinism and malformed input'],
        metadataSha256=previous,scope='Raw metadata only; not a navigability certification')
    scrivi_json(out/'verifica_metadati.json', report)


if __name__=='__main__':
    main(sys.argv[1])
