"""Ricontrollo indipendente di `atlante-identita.json`.

Quattro controlli, tutti ricalcolati dalle fonti senza usare `atlas_identity`:

1. **Copertura** — le 301 planimetrie native compaiono una volta sola, ognuna in un solo luogo,
   e le chiavi corrispondono ai file davvero presenti in `public/asset/mappe/native`.
2. **Nomi** — ogni nome dichiarato è ritrovato nella fonte che il catalogo indica (titolo d'area
   del record texpack, indice nativo dei luoghi, titolo roadmap o livello fratello), e nessun
   nome è un'etichetta tecnica.
3. **Copie e versioni** — una copia ha davvero gli stessi pixel di un'altra immagine dello stesso
   luogo; due versioni dello stesso luogo hanno davvero pixel diversi. Le etichette delle
   versioni sono univoche dentro il luogo.
4. **Omonimie** — i luoghi marcati omonimi condividono davvero nome e gruppo, e ognuno ha un nome
   distintivo diverso dagli altri del suo gruppo.
"""
from pathlib import Path
import collections
import hashlib
import json
import re
import sys

TECNICO = re.compile(r'^(Area \d+|RMAP|Risorse native|Luogo \d+)')


def main(out):
    out = Path(out)
    catalogo = json.loads((out/'atlante-identita.json').read_text(encoding='utf8'))
    texpack = json.loads((out/'mondo_texpack_evidenze.json').read_text(encoding='utf8'))
    metadati = json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    indice = json.loads((out/'indice-luoghi-dungeon.json').read_text(encoding='utf8'))
    manifest = json.loads((out/'manifest.json').read_text(encoding='utf8'))
    native = Path(__file__).resolve().parents[2]/'public/asset/mappe/native'

    immagini = {r['chiave']: r for r in catalogo['immagini']}
    assert len(immagini) == len(catalogo['immagini']) == 301, 'planimetrie mancanti o duplicate'
    file = {p.stem for p in native.glob('*.png')}
    assert set(immagini) == file, 'catalogo e file su disco non coincidono'

    # 1. ogni immagine sta in un luogo solo
    appartenenza = collections.Counter()
    for l in catalogo['luoghi']:
        for k in l['versioni'] + l['copie']:
            appartenenza[k] += 1
    assert set(appartenenza) == set(immagini), 'immagini non assegnate ad alcun luogo'
    assert all(n == 1 for n in appartenenza.values()), 'immagini assegnate a più luoghi'

    # 2. i nomi provengono davvero dalla fonte dichiarata
    titoli_area = collections.defaultdict(set)
    for r in texpack['records']:
        if r['sentinel']:
            continue
        for lv in r['layers']:
            a = lv.get('areaTitle')
            if a:
                titoli_area[(r['major'], r['minor'], lv['layer'])].add((a['index'], a['text']))
    titolo_roadmap = {m['code']: m['title'] for m in metadati['maps']}
    nomi_indice = collections.defaultdict(set)
    for r in indice['tables']['dungeon']:
        if r['major'] is None:
            continue
        for v in [r['gruppo']] + r['varianti']:
            if v['status'] == 'valido':
                nomi_indice[(r['major'], r['minor'])].add(v['text'])
    controllati = 0
    for r in catalogo['immagini']:
        assert not (r['nome'] and TECNICO.match(r['nome'])), f'nome tecnico su {r["chiave"]}'
        f = r['fonteNome']
        if f is None:
            assert r['statoNome'] == 'senza-nome-nativo' and r['motivoSenzaNome']
            continue
        chiave = (r['major'], r['minor'], r['layer'])
        if f['fonte'] == 'titolo-area-texpack':
            assert (f['indice'], r['nome']) in titoli_area[chiave], f'titolo non nel texpack: {r["chiave"]}'
        elif f['fonte'] == 'titolo-roadmap':
            assert titolo_roadmap[r['codice']].startswith(r['nome'][:12]), f'titolo roadmap diverso: {r["chiave"]}'
        elif f['fonte'] == 'indice-luoghi-dungeon':
            campo = next(c for c in metadati['fields'] if c['id'] == f['campo'])
            assert r['nome'] in nomi_indice[(campo['major'], campo['minor'])], f'nome non nell’indice: {r["chiave"]}'
        elif f['fonte'] == 'livello-fratello-nominato':
            fratello = immagini[f['riferimento']]
            assert fratello['nome'] == r['nome'] and (fratello['major'], fratello['minor']) == (r['major'], r['minor'])
        else:
            raise AssertionError(f'fonte del nome sconosciuta: {f["fonte"]}')
        controllati += 1

    # 3. copie e versioni sui pixel dichiarati dal manifest dell'estrazione
    pixel = {}
    for e in manifest['images']:
        m = re.search(r'ROADMAP/(RMAP_\d+_\d+_\d+)\.DDS$', e['source'])
        if m:
            pixel['nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in m.group(1).split('_')[1:])] = e['pixel_sha256']
    copie = versioni = 0
    for l in catalogo['luoghi']:
        impronte = [pixel[k] for k in l['versioni']]
        assert len(set(impronte)) == len(impronte), f'due versioni identiche in {l["chiaveLuogo"]}'
        for k in l['copie']:
            assert pixel[k] in impronte, f'copia senza originale: {k}'
            copie += 1
        etichette = [v['etichetta'] for v in l.get('descrizioneVersioni', [])]
        assert len(set(etichette)) == len(etichette), f'etichette ripetute in {l["chiaveLuogo"]}'
        assert not etichette or set(v['chiave'] for v in l['descrizioneVersioni']) == set(l['versioni'])
        versioni += len(l['versioni'])
    assert copie == catalogo['summary']['copie']

    # 4. omonimie e nomi distintivi
    per_nome = collections.defaultdict(list)
    for l in catalogo['luoghi']:
        if l['nome']:
            per_nome[(l['gruppo'], l['nome'])].append(l)
    for (gruppo, nome), voci in per_nome.items():
        atteso = len(voci) > 1
        for l in voci:
            assert l['omonimo'] == atteso, f'omonimia non coerente su {l["chiaveLuogo"]}'
            if atteso:
                assert l.get('nomeDistintivo'), f'omonimo senza nome distintivo: {l["chiaveLuogo"]}'
        if atteso:
            distintivi = [l['nomeDistintivo'] for l in voci]
            assert len(set(distintivi)) == len(distintivi), f'nomi distintivi ripetuti per {nome}'

    print('OK', len(immagini), 'planimetrie in', len(catalogo['luoghi']), 'luoghi;',
          controllati, 'nomi ricontrollati sulla fonte;', copie, 'copie e', versioni, 'versioni verificate sui pixel')


if __name__ == '__main__':
    main(sys.argv[1])
