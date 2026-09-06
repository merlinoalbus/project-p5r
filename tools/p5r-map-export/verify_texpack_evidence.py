"""Audit serialized evidence directly against original member bytes."""
import hashlib
import json
from pathlib import Path
import struct
import sys
from render_maps import unpack_tbl


def main(out):
    out = Path(out)
    d = json.loads((out/'mondo_texpack_evidenze.json').read_text(encoding='utf-8'))
    original = (out/d['source']['file']).read_bytes()
    assert hashlib.sha256(original).hexdigest() == d['source']['sha256']
    members = unpack_tbl(original)
    assert b''.join(bytes.fromhex(r['rawHex']) for r in d['records']) == members['texpack.bin']
    assert len(d['records']) == len(members['texpack.bin'])//72 == 400
    titles = members['fld_texpack_title.ftd']
    for row in d['titles']:
        size = len(bytes.fromhex(row['rawHex']))
        assert titles[row['offset']:row['offset']+size].hex() == row['rawHex']
    layers = 0
    for r in d['records']:
        b = bytes.fromhex(r['rawHex'])
        assert r['sentinel'] == (int.from_bytes(b[:2], 'little', signed=True) == -1)
        if r['sentinel']:
            assert r['layers'] == []
        else:
            assert len(r['layers']) == int.from_bytes(b[4:8], 'little')
        for f in r['floats']:
            assert b[f['offset']:f['offset']+4].hex() == f['rawHex']
            if f['finite']:
                assert struct.pack('<f', f['value']).hex() == f['rawHex']
            else:
                assert f['value'] is None
        for layer in r['layers']:
            layers += 1
            index = int.from_bytes(b[52+2*layer['layer']:54+2*layer['layer']], 'little')
            element = members['texelem.bin'][16*index:16*index+16]
            assert element.hex() == layer['elementRawHex']
            for field, byte in [('groupTitle', 4), ('areaTitle', 6)]:
                assert layer[field] == d['titles'][int.from_bytes(element[byte:byte+2], 'little')]
    connections = json.loads((out/'mondo_connessioni_evidenze.json').read_text(encoding='utf-8'))
    by_field = {f['field']: f for f in connections['fields']}
    metadata = json.loads((out/'mondo_metadati.json').read_text(encoding='utf-8'))
    fields = {f['id']: f for f in metadata['fields']}
    for f in d['school']:
        source = by_field[f['field']]
        for key in ['procedures', 'triggers', 'entrances', 'script', 'sources']:
            assert f[key] == source[key]
        assert f['roadmap'] == fields[f['field']]
        expected = [t['offset'] for t in f['roadmap']['textures']]
        assert f['texpackRecords'] == expected
    first = next(f for f in d['school'] if f['field'] == 'F002_002_00')
    for index, entrance in [(14, 1), (15, 2)]:
        body = next(p['body'] for p in first['procedures'] if p['index'] == index)
        assert 'BIT_CHK((0 + 96))' in body and 'SUB_KFEVT_' in body
        assert f'CALL_FIELD(2, 2, {entrance}, 1)' in body and 'else' in body
    report = dict(result='PASS', records=len(d['records']), sentinels=sum(r['sentinel'] for r in d['records']),
        titleReferencesChecked=layers*2, schoolFields=len(d['school']), physicalEdgesCertified=0)
    (out/'verifica_texpack.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    main(sys.argv[1])
