"""Decode field identities and native map pins without inventing connections."""
from pathlib import Path
from scrittura import scrivi_json
import collections
import json
import math
import struct
from extract_maps import Archive, GAME, sha
from render_maps import unpack_tbl, text


def ftd_blocks(data):
    if len(data) < 16 or data[4:8] != b'FTD0':
        raise ValueError('Invalid FTD header')
    size, mode, count = struct.unpack_from('>IHH', data, 8)
    if size != len(data) or 16+count*4 > size:
        raise ValueError('Invalid FTD size/count')
    offsets = struct.unpack_from('>'+str(count)+'I', data, 16)
    if list(offsets) != sorted(set(offsets)):
        raise ValueError('Invalid FTD offsets')
    blocks = []
    for i, off in enumerate(offsets):
        end = offsets[i+1] if i+1 < count else size
        if off < 16+4*count or end > size or off >= end:
            raise ValueError('FTD block outside file')
        blocks.append((off, data[off:end]))
    return mode, blocks


def title_table(data):
    mode, blocks = ftd_blocks(data)
    if mode != 1:
        raise ValueError('Expected FTD string table')
    result = []
    for off, b in blocks:
        size, flags = struct.unpack_from('<HH', b)
        length = size & 255
        if flags != 0 or size >> 8 != 1 or length > len(b)-4:
            raise ValueError('Unexpected FTD string block')
        result.append(dict(index=len(result), offset=off+4, title=text(b[4:4+length])))
    return result


def place_table(data, titles):
    mode, blocks = ftd_blocks(data)
    if mode != 0:
        raise ValueError('Expected FTD record table')
    result = {}
    for major, (off, b) in enumerate(blocks):
        zero, size, count, flag = struct.unpack_from('>4I', b)
        if zero or flag or size != count*8 or size+16 > len(b):
            raise ValueError('Unexpected place table block')
        for minor in range(count):
            ids = struct.unpack_from('>4H', b, 16+minor*8)
            if max(ids) >= len(titles):
                raise ValueError('Unknown place title index')
            result[(major, minor)] = dict(offset=off+16+minor*8,
                group=titles[ids[0]], floors=[titles[i] for i in ids[1:]])
    return result


def roadmap_tables(data):
    tables = unpack_tbl(data)
    b = tables['texpack.bin']
    if len(b)%72 or len(tables['roadmap.bin'])%16:
        raise ValueError('Invalid roadmap record alignment')
    groups, group = [], []
    for off in range(0, len(b), 72):
        major, minor, sub, layers = struct.unpack_from('<hBBI', b, off)
        if major == -1:
            groups.append(group)
            group = []
        else:
            if not 1 <= layers <= 10:
                raise ValueError('Unexpected map layer count')
            group.append(dict(major=major, minor=minor, sub=sub, layers=layers, offset=off))
    if group:
        raise ValueError('Unterminated texpack group')
    fields = []
    b = tables['roadmap.bin']
    for off in range(0, len(b), 16):
        major, minor, sub, x, y, pack, unknown, mode = struct.unpack_from('<hBBhhHHI', b, off)
        if major == -1:
            if minor != 255 or sub != 255 or off != len(b)-16:
                raise ValueError('Unexpected roadmap sentinel')
            continue
        if major < 0:
            raise ValueError('Invalid field identity')
        if pack >= len(groups):
            raise ValueError('Unknown texpack group')
        fields.append(dict(id=f'F{major:03d}_{minor:03d}_{sub:02d}',major=major,
            minor=minor,sub=sub,cursor=[x,y],texpack=pack,mode=mode,offset=off,
            textures=groups[pack]))
    return groups, fields


def icon_layers(data):
    count, padding = divmod(len(data), 72)
    if padding and any(data[count*72:]):
        raise ValueError('Nonzero icon table padding')
    layers, current = [], []
    for i in range(count):
        off = i*72
        kind, = struct.unpack_from('<I', data, off)
        if kind == 2:
            layers.append(current)
            current = []
            continue
        x, y, flag, effect = struct.unpack_from('<ffII', data, off+20)
        if not (math.isfinite(x) and math.isfinite(y)) or effect not in (0, 1):
            raise ValueError('Invalid icon position/condition')
        current.append(dict(offset=off, nativeType=kind,x=x,y=y,
            flag=flag,effect=effect,conditional=flag != 0xffffffff))
    if current:
        raise ValueError('Unterminated icon layer')
    return layers


def main(out, cpk=GAME):
    out = Path(out)
    sources = []
    resources = {}
    for archive, path in [('IT','FIELD/FTD/FLDPLACENAME.FTD'),('BASE','FIELD/FTD/FLDPLACENO.FTD')]:
        arc = Archive(Path(cpk)/(archive+'.CPK'))
        try:
            entry = next(e for e in arc.entries if e['path']==path)
            data = arc.read(entry)
        finally:
            arc.f.close()
        dest = out/'metadati_originali'/archive/path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        sources.append(dict(archive=archive,path=path,file=dest.relative_to(out).as_posix(),sha256=sha(data)))
        resources[Path(path).stem] = data
    titles = title_table(resources['FLDPLACENAME'])
    places = place_table(resources['FLDPLACENO'], titles)
    groups, fields = roadmap_tables((out/'originali/IT/FIELD/PANEL/ROADMAP/ROADMAP.TBL').read_bytes())
    for field in fields:
        p = places.get((field['major'],field['minor']))
        field['place'] = p
        if p and field['sub'] < 3:
            field['title'] = p['floors'][field['sub']]['title']
            field['group'] = p['group']['title']
        else:
            field['title'] = None
            field['group'] = None
    index = json.loads((out/'mappe_indice.json').read_text(encoding='utf8'))
    maps = []
    for m in index['maps']:
        if m['major'] < 0:
            continue
        matching = [f for f in fields if any(t['major']==m['major'] and t['minor']==m['minor'] and m['layer']<t['layers'] for t in f['textures'])]
        exact = [f for f in matching if f['major']==m['major'] and f['minor']==m['minor']]
        direct = exact or matching
        # Composite school canvases cover both buildings on the same floor.
        if m['major']==2 and m['minor']==0:
            direct = [f for f in matching if f['minor'] in (2,3) and f['sub']==m['layer']]
        useful = [f for f in direct if f['title'] and f['title'] not in ('NULL','???')]
        # Some unused texture packs (classroom/library) have no roadmap row.
        # Keep this weaker, direct resource-name association explicitly separate.
        dormant = None
        if not matching and m['major']==2 and m['minor'] in (6,8) and m['layer']==0:
            dormant = places[(2,m['minor'])]
        unique_titles = list(dict.fromkeys(f['title'] for f in useful))
        title = ' / '.join(unique_titles) if unique_titles else m['title']
        newgroup = m['group']
        groupnames = set(f['group'] for f in useful if f['group'] not in (None,'NULL','???'))
        if m['major'] < 100 and len(groupnames)==1:
            newgroup = next(iter(groupnames))
        if m['major']==22 and unique_titles:
            newgroup = unique_titles[0]
            title += f' · livello grafico {m["layer"]+1}'
        if m['major'] >= 100:
            title = m['title']
        if dormant:
            title = dormant['floors'][0]['title']
            newgroup = dormant['group']['title']
        filename = f'ICON_{m["major"]:03d}_{m["minor"]}.BIN'
        path = out/'originali/BASE/FIELD/PANEL/ROADMAP'/filename
        layers = icon_layers(path.read_bytes()) if path.is_file() else []
        pins = layers[m['layer']] if m['layer'] < len(layers) else []
        maps.append(dict(code=m['code'],title=title,group=newgroup,layer=m['layer'],
            nameEvidence=[f['id'] for f in useful],fields=[f['id'] for f in matching],
            dormantTextureNameEvidence=dormant,
            originalImage=m['original'],displayImage=m['file'],iconSource=filename,pins=pins))
    result=dict(schemaVersion=1,sources=sources,fields=fields,maps=maps,
        coordinateSystem='Native DDS pixels; origin top-left, x right, y down. No crop or scale applied.',
        limits=['Field-to-texture associations are not physical connections.',
            'Raw flags/effects are retained; conditional pins must not become always visible.',
            'Native icon IDs still require verified semantic mapping.',
            'Map title corrections and pins are metadata, not yet applied to the application.'])
    scrivi_json(out/'mondo_metadati.json', result)
    print('FIELDS',len(fields),'MAPS',len(maps),'PINS',sum(len(m['pins']) for m in maps))
    return result


if __name__ == '__main__':
    import sys
    main(sys.argv[1])
