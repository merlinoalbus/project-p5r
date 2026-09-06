"""Build a portable staging import, preserving the native coordinate canvas.

This package deliberately contains no inferred physical links or unconditional
native pins. The evidence sidecar retains all native flags for later decoding.
"""
import base64
import hashlib
import json
from pathlib import Path
import re
import sys
from PIL import Image
import render_maps
from native_labels import Decoder

DUNGEONS = {151:"kamoshida",152:"kamoshida",153:"madarame",154:"kaneshiro",155:"futaba",156:"okumura",157:"niijima",159:"shido",162:"maruki"}

# Only city associations established by FLDPLACENO/FLDPLACENAME and existing
# app entity keys. This is an organizational parent, never a physical exit.
CITY = {1: 'shibuya', 2: 'shujin-academy', 5: 'kichijoji',
        6: 'shinjuku', 7: 'akihabara', 9: 'yongen-jaya'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding='utf-8')


def build(out):
    out = Path(out).resolve()
    target = out / 'app-integration'
    target.mkdir(exist_ok=True)
    metadata = read(out / 'mondo_metadati.json')
    index = read(out / 'mappe_indice.json')
    fields = {f['id']: f for f in metadata['fields']}
    identities = {f['field']: f for f in read(out/'campi-completi/identita.json')['fields']}
    decoder=Decoder(out/'tool/P5R_EFIGS.tsv')
    def decode(raw):
        label, unknown=decoder.decode(raw)
        if unknown: raise ValueError('Titolo non decodificato')
        return label
    render_maps.text=decode
    native_names, native_groups, _=render_maps.read_names(out)
    maps, images, evidence, roots = [], {}, [], {}
    for number, m in enumerate(sorted(metadata['maps'], key=lambda m: m['code'])):
        major, minor, layer = map(int, re.fullmatch(r'RMAP_(\d+)_(\d+)_(\d+)', m['code']).groups())
        key = 'nativo-' + m['code'].lower().replace('_', '-')
        city = CITY.get(major)
        if major == 11 and minor == 6:
            city = 'yongen-jaya'
        # No-field resources and unconfirmed identities remain explicitly archival.
        status = 'riferimento-roadmap'
        if not m['fields']:
            status = 'risorsa-senza-campo'
        elif all(fields[f]['mode'] == 0 for f in m['fields']):
            status = 'modalita-zero-da-verificare'
        unresolved = not m['nameEvidence'] or m['title'].startswith('Area ')
        if major in DUNGEONS:
            parent='dungeon-'+DUNGEONS[major]
            assert len(native_groups[major])==1
            parent_evidence={'kind':'native-dungeon-title','entity':DUNGEONS[major],'major':major,'nativeGroups':sorted(native_groups[major])}
        elif city and status == 'riferimento-roadmap':
            parent = 'citta-' + city
            parent_evidence = {'kind': 'city-field-tables', 'entity': city,
                               'fields': m['fields'], 'names': m['nameEvidence']}
        else:
            parent = f'nativo-archivio-{major:03d}'
            roots.setdefault(parent, dict(chiave=parent,
                nome=f'Risorse native {major:03d} — {m["group"]}', tipo='generica',
                genitore=None, ordine=major, immagine=None, asset=None,
                larghezza=None, altezza=None, entita=None,
                note='Raggruppamento delle risorse per codice originale. Non certifica adiacenza, ordine narrativo o disponibilità.', spilli=[]))
            parent_evidence = {'kind': 'resource-group-only', 'major': major}
        source = out / m['originalImage']
        rgba = Image.open(source).convert('RGBA')
        # Preserve original PNG bytes and alpha; fitting must not treat the
        # transparent DDS margins as part of the visible planimetry.
        content = source.read_bytes()
        images[key] = {'mime': 'image/png', 'base64': base64.b64encode(content).decode('ascii')}
        title = m['title']
        named = bool(m['nameEvidence']) and major != 22 and not title.startswith(('Area ', 'Luogo '))
        if named:
            labels = [identities[k]['variantCandidate'] for k in m['nameEvidence']]
            assert all(v and v['status']=='valido' for v in labels)
            assert title == ' / '.join(dict.fromkeys(v['text'] for v in labels))
        title_records=native_names.get((major,minor,layer),[])
        native_titles=list(dict.fromkeys(r['title'] for r in title_records if r['title'] not in ('???','NULL','')))
        title_from_texpack=len(native_titles)==1
        if title_from_texpack: title=native_titles[0]
        named=named or title_from_texpack
        maps.append(dict(chiave=key, nome=title if named else f'{title} — {m["code"]}',
            tipo='luogo' if city else 'area', genitore=parent, ordine=number,
            immagine=key, asset=None, larghezza=rgba.width, altezza=rgba.height,
            entita=None, note=f'Planimetria originale. Stato: {status}. '
                + ('Identità del luogo da verificare. ' if unresolved else '')
                + 'Collegamenti, condizioni narrative e punti di interesse non ancora applicati.', spilli=[]))
        evidence.append(dict(key=key, code=m['code'], status=status,
            displayNameVerified=named, titleTableEvidence=title_records if title_from_texpack else [],
            identityUnresolved=unresolved, parentEvidence=parent_evidence,
            source=m['originalImage'], sourceSha256=sha(source.read_bytes()),
            imageSha256=sha(content), width=rgba.width, height=rgba.height,
            fields=m['fields'], nameEvidence=m['nameEvidence'], nativePins=m['pins']))
    package = dict(versione=1, mappe=list(roots.values()) + maps, immagini=images)
    write(target / 'planimetrie-native.json', package)
    # The seven urban illustrations stay portable in a separate companion file.
    urban = []
    for m in index['maps']:
        if m['major'] >= 0:
            continue
        data = (out / m['original']).read_bytes()
        urban.append(dict(code=m['code'], title=m['title'], group=m['group'],
                          mime='image/png', sha256=sha(data), base64=base64.b64encode(data).decode('ascii')))
    write(target / 'viste-urbane.json', dict(versione=1, immagini=urban))
    write(target / 'evidenze.json', dict(version=2, transparency='original-alpha-preserved',
        coordinateSystem='DDS canvas pixels, origin top-left, no crop or resize; percent x=100*x/width, y=100*y/height.',
        requiredParents=sorted({m['genitore'] for m in maps} - set(roots)),
        maps=evidence, urbanIllustrations=len(urban),
        limits=['Staging only: organizational hierarchy is not the physical graph.',
                'No native event flags interpreted as save conditions.',
                'No unverified native pins imported as always available.']))
    (target / 'LEGGIMI.md').write_text(
        '# Planimetrie native per l’app\n\n'
        'Pacchetto di prova: 301 planimetrie con immagini incorporate e coordinate originali. '
        'Importare planimetrie-native.json con l’importatore delle mappe, in un ambiente isolato. '
        'Le radici già richieste sono elencate in evidenze.json.\n\n'
        'Le cartelle Risorse native raccolgono materiali ancora da associare; non sono luoghi inventati del mondo. '
        'Le associazioni ai quartieri organizzano le mappe e non dimostrano passaggi fisici. '
        'Le sette viste urbane illustrate sono conservate separatamente in viste-urbane.json.\n\n'
        'L’importazione non completa la navigazione continua: restano da certificare uscite, ingressi, '
        'posizioni e condizioni narrative dei pin. I flag originali sono conservati nelle evidenze.\n\n'
        'Rigenerazione: `python app_package.py CARTELLA_EXPORT`. '
        'Verifica indipendente: `python verify_app_package.py CARTELLA_EXPORT`.\n', encoding='utf-8')
    print(json.dumps({'maps': len(maps), 'resourceGroups': len(roots), 'images': len(images), 'urban': len(urban)}))
    return package


if __name__ == '__main__':
    build(sys.argv[1])
