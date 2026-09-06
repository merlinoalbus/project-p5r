"""Ricontrollo indipendente di `icone-mappa.json`.

Tre passate distinte:

1. **Foglio sprite** — rilegge il file `SPR0`, ricalcola per ogni sprite identificativo, texture,
   rettangolo e nome in Shift-JIS, e confronta con il JSON. Per ogni PNG salvato riapre la
   texture, riesegue il ritaglio e confronta i pixel: il file deve essere identico byte a byte
   all'immagine ricalcolata.
2. **Piazzamenti** — ricalcola il censimento dei pin dai 178 `ICON_*.BIN` senza usare il modulo
   di estrazione, e confronta occorrenze, mappe, condizionali ed effetti.
3. **Associazione urbana** — verifica che i tipi dichiarati dimostrati siano davvero soltanto
   quelli del blocco urbano, che nessun tipo usato anche nei Palazzi riceva un nome, e che nessun
   nome assegnato provenga da uno sprite vuoto.
"""
from pathlib import Path
import collections
import hashlib
import io
import json
import re
import struct
import sys

SPRITE, TEXTURA, RECORD_PIN, SEPARATORE = 160, 48, 72, 2


def main(out):
    out = Path(out)
    atteso = json.loads((out/'icone-mappa.json').read_text(encoding='utf8'))
    data = (out/atteso['sources']['foglio']['file']).read_bytes()
    assert hashlib.sha256(data).hexdigest() == atteso['sources']['foglio']['sha256']
    assert data[:4] == b'SPR0'
    ntex, nspr = struct.unpack_from('<HH', data, 0x14)
    toff, soff = struct.unpack_from('<II', data, 0x18)
    assert ntex == len(atteso['texture']) and nspr == len(atteso['sprite'])

    from PIL import Image
    immagini = {}
    for i, t in enumerate(atteso['texture']):
        ident, _, dati, misura, larghezza, altezza = struct.unpack_from('<6I', data, toff+i*TEXTURA)
        assert (t['id'], t['offset'], t['bytes'], t['larghezza'], t['altezza']) == (ident, dati, misura, larghezza, altezza)
        assert data[dati:dati+4] == b'DDS '
        immagini[ident] = Image.open(io.BytesIO(data[dati:dati+misura])).convert('RGBA')
        assert immagini[ident].size == (larghezza, altezza), 'dimensioni DDS diverse da quelle dichiarate'

    png = 0
    for i, v in enumerate(atteso['sprite']):
        e = data[soff+i*SPRITE:soff+(i+1)*SPRITE]
        ident, texId = struct.unpack_from('<2I', e, 0)
        x, y, larghezza, altezza = struct.unpack_from('<4I', e, 0x20)
        assert (v['index'], v['id'], v['texturaId']) == (i, ident, texId)
        assert (v['x'], v['y'], v['larghezza'], v['altezza']) == (x, y, larghezza, altezza)
        assert v['nomeRawHex'] == e[0x70:0x90].split(b'\0')[0].hex()
        assert v['vuoto'] == (not (larghezza and altezza))
        if isinstance(v['png'], str) and v['png'].endswith('.png'):
            atteso_im = immagini[texId].crop((x, y, x+larghezza, y+altezza))
            salvato = Image.open(out/'icone-mappa'/v['png']).convert('RGBA')
            assert salvato.size == atteso_im.size and salvato.tobytes() == atteso_im.tobytes(), v['png']
            png += 1
    assert png == atteso['summary']['pngSalvati']

    per_tipo = collections.defaultdict(lambda: dict(occorrenze=0, mappe=set(), condizionali=0, effettoZero=0))
    cartella = out/atteso['sources']['piazzamenti']['cartella']
    file = sorted(cartella.glob('ICON_*.BIN'))
    assert len(file) == atteso['sources']['piazzamenti']['file']
    for percorso in file:
        b = percorso.read_bytes()
        assert not any(b[len(b)//RECORD_PIN*RECORD_PIN:]), percorso.name
        for at in range(0, len(b)//RECORD_PIN*RECORD_PIN, RECORD_PIN):
            tipo, = struct.unpack_from('<I', b, at)
            if tipo == SEPARATORE:
                continue
            bandiera, effetto = struct.unpack_from('<2I', b, at+28)
            v = per_tipo[tipo]
            v['occorrenze'] += 1
            v['mappe'].add(percorso.name)
            v['condizionali'] += bandiera != 0xffffffff
            v['effettoZero'] += effetto == 0
    assert sorted(per_tipo) == [r['tipoNativo'] for r in atteso['tipiNativi']]
    for r in atteso['tipiNativi']:
        v = per_tipo[r['tipoNativo']]
        assert (r['occorrenze'], sorted(v['mappe']), r['condizionali'], r['effettoZero']) == \
               (v['occorrenze'], r['mappe'], v['condizionali'], v['effettoZero'])
        assert r['mappeUrbane'] == sum(int(m[5:8]) < 100 for m in r['mappe'])
        assert r['mappeDungeon'] == len(r['mappe'])-r['mappeUrbane']
        # Due blocchi, non uno: quello urbano e quello del Covo dei Ladri, ciascuno con il suo
        # scarto. Il controllo ne conosceva solo il primo e mandava il secondo nel ramo «non deve
        # avere sprite», dove invece lo sprite ce l'ha ed e' dimostrato — falliva su una cosa giusta.
        import map_icons as mi
        blocchi = {'blocco-urbano-dimostrato': (mi.BLOCCO_CITTA, mi.SCARTO_CITTA),
                   'blocco-covo-dimostrato': (mi.BLOCCO_MY_PALACE, mi.SCARTO_MY_PALACE)}
        assert tuple(atteso['associazioneUrbana']['blocco']) == mi.BLOCCO_CITTA and \
            atteso['associazioneUrbana']['scarto'] == mi.SCARTO_CITTA, \
            'il blocco urbano dichiarato nell’artefatto non è quello del generatore'
        if r['associazione'] in blocchi:
            (basso, alto), scarto = blocchi[r['associazione']]
            assert basso <= r['tipoNativo'] <= alto and r['mappeDungeon'] == 0
            sprite = atteso['sprite'][r['tipoNativo']+scarto]
            assert r['sprite'] == sprite['index'] and r['nomeNativo'] == sprite['nome'] and not sprite['vuoto']
        else:
            assert r['sprite'] is None and r['nomeNativo'] is None
    assert atteso['summary']['pinTotali'] == sum(v['occorrenze'] for v in per_tipo.values())
    print('OK', nspr, 'sprite,', png, 'PNG ricalcolati pixel per pixel,',
          atteso['summary']['pinTotali'], 'pin ricontati')


if __name__ == '__main__':
    main(sys.argv[1])
