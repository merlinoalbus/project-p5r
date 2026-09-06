"""Lossless texpack records and per-layer naming evidence; no inferred edges."""
from scrittura import scrivi_json
import collections
import json
import math
from pathlib import Path
import struct
import sys
from extract_maps import sha
from render_maps import unpack_tbl
from native_labels import Decoder
from world_metadata import ftd_blocks


def main(out):
    out = Path(out)
    source = out/'originali/IT/FIELD/PANEL/ROADMAP/ROADMAP.TBL'
    contents = unpack_tbl(source.read_bytes())
    decoder = Decoder(out/'tool/P5R_EFIGS.tsv')
    title_bytes = contents['fld_texpack_title.ftd']
    mode, blocks = ftd_blocks(title_bytes)
    assert mode == 0
    titles = []
    for index, (offset, block) in enumerate(blocks):
        text, unknown = decoder.decode(block[16:])
        titles.append(dict(index=index, offset=offset, rawHex=block.hex(), text=text, unknownOffsets=unknown))
    elements = contents['texelem.bin']
    assert len(elements) % 16 == 0
    records = []
    data = contents['texpack.bin']
    assert len(data) % 72 == 0
    group = 0
    for offset in range(0, len(data), 72):
        raw = data[offset:offset+72]
        major, minor, sub, layers = struct.unpack_from('<hBBI', raw)
        sentinel = major == -1
        decoded_floats = []
        for at in (8, *range(16, 48, 4)):
            value, = struct.unpack_from('<f', raw, at)
            decoded_floats.append(dict(offset=at, rawHex=raw[at:at+4].hex(),
                value=value if math.isfinite(value) else None, finite=math.isfinite(value)))
        per_layer = []
        if not sentinel:
            assert 1 <= layers <= 10
            for layer in range(layers):
                element_index, = struct.unpack_from('<H', raw, 52+2*layer)
                assert element_index*16+16 <= len(elements)
                elem = elements[element_index*16:element_index*16+16]
                group_title, area_title = struct.unpack_from('<HH', elem, 4)
                assert max(group_title, area_title) < len(titles)
                per_layer.append(dict(layer=layer, indexOffset=offset+52+2*layer,
                    elementIndex=element_index, elementOffset=element_index*16,
                    elementRawHex=elem.hex(), groupTitle=titles[group_title], areaTitle=titles[area_title]))
        records.append(dict(offset=offset, rawHex=raw.hex(), major=major, minor=minor,
            sub=sub, layerCount=layers, group=group, sentinel=sentinel,
            floats=decoded_floats, rawFlag12=raw[12:16].hex(), rawFlag48=raw[48:52].hex(), layers=per_layer))
        if sentinel:
            group += 1
    metadata = json.loads((out/'mondo_metadati.json').read_text(encoding='utf-8'))
    connections = json.loads((out/'mondo_connessioni_evidenze.json').read_text(encoding='utf-8'))
    field_map = {f['id']: f for f in metadata['fields']}
    school = []
    for f in connections['fields']:
        if not f['field'].startswith(('F002_002_', 'F002_003_')):
            continue
        fm = field_map[f['field']]
        school.append(dict(field=f['field'], roadmap=fm,
            texpackRecords=[r['offset'] for r in records if r['group'] == fm['texpack'] and not r['sentinel']],
            sources=f['sources'], entrances=f['entrances'], triggers=f['triggers'],
            procedures=f['procedures'], script=f['script'],
            transformationStatus='non-dimostrata',
            conditionStatus='rami-originali-conservati-non-tradotti-in-condizioni-app'))
    report = dict(schemaVersion=1,
        source=dict(file=source.relative_to(out).as_posix(), sha256=sha(source.read_bytes())),
        members={name: dict(size=len(b), sha256=sha(b)) for name, b in contents.items()},
        records=records, titles=titles, school=school,
        limits=['Float fields retain byte-offset names: neither scale nor layer thresholds proven.',
            'Per-layer index at byte52 points to texelem, not directly to a string table.',
            'School scripts retain BIT96 and SUB_KFEVT branches. No unconditional exits emitted.',
            'Texture group associations may cover multiple fields and must not imply a shared XYZ transform.'])
    scrivi_json(out/'mondo_texpack_evidenze.json', report, ammetti_nan=False)
    print(json.dumps(dict(records=len(records), sentinels=sum(r['sentinel'] for r in records),
        layers=sum(len(r['layers']) for r in records), titles=len(titles), schoolFields=len(school))))


if __name__ == '__main__':
    main(sys.argv[1])
