"""Independently verify pixels, identities, portability and package structure."""
import base64
import collections
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import numpy as np
from PIL import Image
import struct
from render_maps import unpack_tbl
from native_labels import Decoder


def verify(out):
    out = Path(out)
    target = out / 'app-integration'
    read = lambda p: json.loads(p.read_text(encoding='utf-8'))
    package = read(target / 'planimetrie-native.json')
    evidence = read(target / 'evidenze.json')
    metadata = read(out / 'mondo_metadati.json')
    original = {m['code']: m for m in metadata['maps']}
    identities = {f['field']: f for f in read(out/'campi-completi/identita.json')['fields']}
    rows = {m['chiave']: m for m in package['mappe']}
    assert len(rows) == len(package['mappe'])
    assert len(evidence['maps']) == len(original) == 301
    assert len(package['immagini']) == 301
    assert len(set(m['code'] for m in evidence['maps'])) == 301
    required = set(evidence['requiredParents'])
    for row in rows.values():
        assert re.fullmatch('[a-z0-9][a-z0-9-]{0,179}', row['chiave'])
        assert row['spilli'] == [] and row['entita'] is None
        seen = set()
        current = row
        while current:
            assert current['chiave'] not in seen, 'Cycle'
            seen.add(current['chiave'])
            parent = current['genitore']
            assert parent is None or parent in rows or parent in required
            current = rows.get(parent)
    tbl=unpack_tbl((out/'originali/IT/FIELD/PANEL/ROADMAP/ROADMAP.TBL').read_bytes())
    decoder=Decoder(out/'tool/P5R_EFIGS.tsv')
    title_ftd=tbl['fld_texpack_title.ftd']
    for item in evidence['maps']:
        m = original[item['code']]
        row = rows[item['key']]
        assert item['nativePins'] == m['pins'] and item['fields'] == m['fields']
        assert item['nameEvidence'] == m['nameEvidence']
        if item.get('titleTableEvidence'):
            titles=[]
            major,minor,layer=map(int,item['code'].split('_')[1:])
            for ref in item['titleTableEvidence']:
                at=ref['texpack_offset']
                maj,minr,layers,_=struct.unpack_from('<4H',tbl['texpack.bin'],at)
                assert (maj,minr)==(major,minor) and layer<layers
                ix=struct.unpack_from('<H',tbl['texpack.bin'],at+52+layer*2)[0]
                assert ix==ref['texelem_index']
                tid=struct.unpack_from('<H',tbl['texelem.bin'],ix*16+6)[0]
                assert tid==ref['area_title_index']
                off=struct.unpack_from('>I',title_ftd,16+tid*4)[0]
                label,unknown=decoder.decode(title_ftd[off+16:])
                assert not unknown and label==ref['title']
                if label not in ('???','NULL',''):titles.append(label)
            assert set(titles)=={row['nome']}
        elif item.get('displayNameVerified'):
            refs=[identities[k]['variantCandidate'] for k in m['nameEvidence']]
            assert refs and all(r and r['status']=='valido' for r in refs)
            assert row['nome']==' / '.join(dict.fromkeys(r['text'] for r in refs))
        else:assert row['nome']==f'{m["title"]} — {m["code"]}'
        assert item['key'] == 'nativo-' + m['code'].lower().replace('_', '-')
        source = out / m['originalImage']
        assert hashlib.sha256(source.read_bytes()).hexdigest() == item['sourceSha256']
        rgba = np.array(Image.open(source).convert('RGBA'), dtype=np.uint32)
        content = base64.b64decode(package['immagini'][row['immagine']]['base64'], validate=True)
        assert hashlib.sha256(content).hexdigest() == item['imageSha256']
        decoded = Image.open(io.BytesIO(content))
        assert decoded.size == (row['larghezza'], row['altezza']) == (rgba.shape[1], rgba.shape[0])
        assert content == source.read_bytes(), m['code']
        assert np.array_equal(rgba, np.array(decoded.convert('RGBA'))), m['code']
        if not m['fields']:
            assert item['status'] == 'risorsa-senza-campo'
            assert item['parentEvidence']['kind'] in ('resource-group-only','native-dungeon-title')
        if item['parentEvidence']['kind'] == 'city-field-tables':
            assert m['fields'] and m['nameEvidence']
            assert row['genitore'] == 'citta-' + item['parentEvidence']['entity']
        assert len(row['nome']) < 180
    urban = read(target / 'viste-urbane.json')['immagini']
    index = read(out / 'mappe_indice.json')
    urban_sources = {m['code']: m for m in index['maps'] if m['major'] < 0}
    assert len(urban) == len(urban_sources) == 7
    for item in urban:
        assert base64.b64decode(item['base64'], validate=True) == (out / urban_sources[item['code']]['original']).read_bytes()
    report = dict(result='PASS', maps=301, pixelComparisons=301, portableUrbanImages=7,
                  groups=len(rows)-301, statusCounts=dict(collections.Counter(m['status'] for m in evidence['maps'])),
                  packageSha256=hashlib.sha256((target/'planimetrie-native.json').read_bytes()).hexdigest())
    (target / 'verifica-pacchetto.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    verify(sys.argv[1])
