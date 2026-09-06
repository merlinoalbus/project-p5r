"""Ricontrollo indipendente di `indice-luoghi-dungeon.json`.

Rilegge le FTD dal disco, ricostruisce i record da 8 byte blocco per blocco e verifica che ogni
indice riportato punti davvero al titolo indicato dalla tabella delle stringhe, che i byte grezzi
coincidano e che nessun record dichiari un major fuori dalla base documentata.
"""
from pathlib import Path
import hashlib
import json
import struct
import sys

from native_labels import Decoder, strings
from world_metadata import ftd_blocks


def main(out):
    out = Path(out)
    atteso = json.loads((out/'indice-luoghi-dungeon.json').read_text(encoding='utf8'))
    sorgenti = atteso['sources']
    titoli_raw = (out/sorgenti['titoli']['file']).read_bytes()
    assert hashlib.sha256(titoli_raw).hexdigest() == sorgenti['titoli']['sha256']
    titoli = strings(titoli_raw, Decoder(Path(__file__).with_name('P5R_EFIGS.tsv')))
    assert len(titoli) == atteso['titleEntries']
    controllati = 0
    for nome in ('dungeon', 'atDungeon'):
        data = (out/sorgenti[nome]['file']).read_bytes()
        assert len(data) == sorgenti[nome]['bytes'] and hashlib.sha256(data).hexdigest() == sorgenti[nome]['sha256']
        mode, blocks = ftd_blocks(data)
        assert mode == 0
        righe = iter(atteso['tables'][nome])
        for blocco, (off, b) in enumerate(blocks):
            zero, size, count, flag = struct.unpack_from('>4I', b)
            assert not zero and not flag and size == count*8 and not any(b[16+size:])
            for minor in range(count):
                at = 16 + minor*8
                r = next(righe)
                assert r['blocco'] == blocco and r['minor'] == minor and r['offset'] == off+at
                assert r['rawHex'] == b[at:at+8].hex()
                ids = list(struct.unpack_from('>4H', b, at))
                assert r['indici'] == ids
                atteso_major = None if nome == 'atDungeon' else atteso['baseDungeon']+blocco
                assert r['major'] == atteso_major
                for voce, i in zip([r['gruppo']]+r['varianti'], ids):
                    if i < len(titoli):
                        assert voce['index'] == i and voce['text'] == titoli[i]['text']
                        assert voce['status'] == titoli[i]['status']
                    else:
                        assert voce['status'] == 'indice-invalido'
                controllati += 1
        assert next(righe, None) is None, f'record in eccesso per {nome}'
    print('OK', controllati, 'record dell’indice ricontrollati sui titoli nativi')


if __name__ == '__main__':
    main(sys.argv[1])
