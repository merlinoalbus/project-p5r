"""Build app-ready contextual labels without selecting a universal title.

Usage: python genera-contesti-base.py --export-root EXPORT --audit-root AUDIT --output FILE
Only the requested output is written. Source hashes and native table bytes are checked.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import struct


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def require(ok, message):
    if not ok:
        raise ValueError(message)


def key(code):
    return 'nativo-' + code.lower().replace('_', '-')


def unpack(data):
    count = struct.unpack_from('>I', data)[0]
    offset, result = 4, {}
    for _ in range(count):
        name = data[offset:offset+32].split(b'\0')[0].decode('ascii')
        size = struct.unpack_from('>I', data, offset+32)[0]
        offset += 36
        require(offset+size <= len(data), 'Truncated ROADMAP.TBL')
        result[name] = data[offset:offset+size]
        offset += size
    require(offset == len(data), 'ROADMAP.TBL trailing bytes')
    return result


def build(export_root, audit_root):
    census_path = audit_root/'nomi-varianti.json'
    resolutions_path = audit_root/'nomi-risoluzioni.json'
    census, resolutions = read(census_path), read(resolutions_path)
    for relative, expected in census['sources'].items():
        require(sha(export_root/relative) == expected, 'Changed source: '+relative)
    for relative, expected in resolutions['sources'].items():
        path = census_path if relative == 'nomi-varianti.json' else export_root/relative
        require(sha(path) == expected, 'Changed resolution source: '+relative)
    tables = unpack((export_root/'originali/IT/FIELD/PANEL/ROADMAP/ROADMAP.TBL').read_bytes())
    metadata = read(export_root/'mondo_metadati.json')
    fields = {f['id']: f for f in metadata['fields']}
    native_codes = {m['code'] for m in metadata['maps']}
    require(native_codes == {m['code'] for m in census['maps']}, 'Incomplete census')
    require(len(census['maps']) == len(native_codes), 'Duplicate census code')
    existing = {m['code']: m for m in census['maps']}
    resolved = {m['code']: m for m in resolutions['maps']}
    require(len(resolved) == len(resolutions['maps']), 'Duplicate resolution code')
    require(set(resolved) == {m['code'] for m in census['maps'] if m['status']=='identita-irrisolta'},
            'Resolution input does not cover unresolved census entries')
    entries, groups, inventory = [], {}, []
    for code in sorted(native_codes):
        resource = existing[code]
        resolution = resolved.get(code)
        classification = 'existing-verified-title'
        if resolution and resolution['status'] == 'nomi-contestuali-verificati':
            classification = 'contextual-titles'
            alternatives = collections.defaultdict(list)
            for context in resolution['contexts']:
                field = fields[context['field']]
                require(field['texpack'] == context['texpack'] and field['offset'] == context['roadmapOffset'],
                        'Changed field context: '+context['field'])
                records = []
                for evidence in context['records']:
                    offset = evidence['texpack_offset']
                    require(tables['texpack.bin'][offset:offset+72].hex() == evidence['texpackRawHex'],
                            'Changed texpack record')
                    elem_offset = evidence['texelem_index']*16
                    require(tables['texelem.bin'][elem_offset:elem_offset+16].hex() == evidence['texelemRawHex'],
                            'Changed texelem record')
                    title = evidence['areaTitleRecord']
                    raw = tables[title['subfile']][title['offset']:].split(b'\0')[0]
                    require(raw.hex() == title['rawHex'] and title['text'] == context['title'],
                            'Changed contextual title')
                    records.append({'texpackOffset': offset, 'texelemIndex': evidence['texelem_index'],
                                    'titleIndex': evidence['area_title_index'], 'titleOffset': title['offset'],
                                    'titleRawHex': title['rawHex']})
                alternatives[context['title']].append({'field':context['field'], 'texpack':context['texpack'],
                    'roadmapOffset':context['roadmapOffset'], 'records':records})
            require(len(alternatives)>1, 'Contextual resource lacks alternative titles')
            contesti = [{'id':c['field'].lower()+'-texpack-'+str(c['texpack']),
                         'nome':title, 'campo':c['field'], 'texpack':c['texpack']}
                        for title,contexts in alternatives.items() for c in contexts]
            require(len({c['id'] for c in contesti}) == len(contesti), 'Context identifier collision')
            entries.append({'key':key(code), 'kind':classification, 'contesti':contesti,
                            'alternatives':[{'title':title, 'contexts':contexts} for title,contexts in alternatives.items()]})
        elif resolution and resolution['status'] == 'identita-comune-verificata-layer-non-nominati':
            classification = 'resource-group-member'
            group_key = 'covo-dei-ladri'
            source = resolution['sourceEvidence'][0]
            name = source['variantCandidate']
            labels = (export_root/'metadati_originali/IT/FIELD/FTD/FLDPLACENAME.FTD').read_bytes()
            raw = bytes.fromhex(name['rawHex'])
            require(labels[name['offset']:name['offset']+len(raw)] == raw, 'Changed Covo title')
            require(name['text'] == resolution['canonicalTitle'], 'Inconsistent Covo identity')
            group = groups.setdefault(group_key, {'key':group_key, 'title':name['text'], 'resourceKeys':[],
                'semantics':'image-layers-not-verified-floors', 'identityEvidence':{
                    'field':source['field'], 'placeRecordOffset':source['placeRecord']['offset'],
                    'titleOffset':name['offset'], 'titleRawHex':name['rawHex']}})
            group['resourceKeys'].append(key(code))
            entries.append({'key':key(code), 'kind':classification, 'resourceGroupKey':group_key,
                            'gruppoImmagini':{'id':group_key, 'nome':name['text'],
                                             'ordine':len(group['resourceKeys'])-1}})
        elif resolution:
            require(resolution['status'] == 'irrisolto', 'Unknown resolution classification')
            classification = 'unresolved'
        inventory.append({'key':key(code), 'code':code, 'status':classification})
    counts = dict(collections.Counter(i['status'] for i in inventory))
    require(counts.get('contextual-titles') == resolutions['summary']['nomi-contestuali-verificati'], 'Lost contextual entries')
    require(counts.get('resource-group-member') == resolutions['summary']['identita-comune-verificata-layer-non-nominati'], 'Lost group entries')
    require(counts.get('unresolved') == resolutions['summary']['irrisolto'], 'Lost unresolved entries')
    require(len(entries) == counts['contextual-titles'] + counts['resource-group-member'], 'Wrong entry coverage')
    patches = [{'chiave':e['key'], **{k:e[k] for k in ('contesti','gruppoImmagini') if k in e}}
               for e in entries]
    return {'version':1, 'mappe':patches, 'sources':{'censusSha256':sha(census_path),'resolutionsSha256':sha(resolutions_path),
                'roadmapTableSha256':sha(export_root/'originali/IT/FIELD/PANEL/ROADMAP/ROADMAP.TBL')},
            'coverage':{'totalResources':len(inventory), 'entryResources':len(entries), 'counts':counts},
            'entries':entries, 'resourceGroups':list(groups.values()), 'inventory':inventory}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--export-root', type=Path, required=True)
    parser.add_argument('--audit-root', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = build(args.export_root.resolve(), args.audit_root.resolve())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(result['coverage'], ensure_ascii=False))


if __name__ == '__main__':
    main()
