"""Ricontrollo indipendente di `nomi-mappe-ufficiali.json`.

Rilegge le due FTD dal disco senza usare `whole_map_names`, ricalcola offset, byte grezzi e
testo di ogni titolo e di ogni voce, e confronta tutto con il file prodotto. Verifica inoltre
che gli offset dichiarati puntino davvero ai byte riportati e che i record coprano la tabella
senza sovrapporsi né lasciare buchi.
"""
from pathlib import Path
import hashlib
import json
import struct
import sys

from native_labels import Decoder
from world_metadata import ftd_blocks

RECORD, TITOLO, VOCI, VOCE, CAMPI = 1124, 48, 19, 56, 8


def main(out):
    out = Path(out)
    atteso = json.loads((out/'nomi-mappe-ufficiali.json').read_text(encoding='utf8'))
    decoder = Decoder(Path(__file__).with_name('P5R_EFIGS.tsv'))
    controllati = voci_controllate = 0
    for nome, sorgente in atteso['sources'].items():
        data = (out/sorgente['file']).read_bytes()
        assert len(data) == sorgente['bytes'], nome
        assert hashlib.sha256(data).hexdigest() == sorgente['sha256'], nome
        mode, blocks = ftd_blocks(data)
        assert mode == 0 and len(blocks) == 1, nome
        base, b = blocks[0]
        zero, size, count, flag = struct.unpack_from('>4I', b)
        assert not zero and not flag and size == count*RECORD, nome
        assert not any(b[16+size:]), 'coda non nulla'
        righe = atteso['tables'][nome]
        assert len(righe) == count, nome
        coperti = 0
        for i, riga in enumerate(righe):
            at = 16 + i*RECORD
            r = b[at:at+RECORD]
            assert riga['index'] == i and riga['offset'] == base+at
            assert riga['titoloRawHex'] == r[:TITOLO].hex()
            assert riga['titolo'] == decoder.decode(r[:TITOLO])[0]
            assert riga['codaRawHex'] == r[TITOLO+VOCI*VOCE:].hex()
            assert len(riga['voci']) == VOCI
            for k, voce in enumerate(riga['voci']):
                p = TITOLO + k*VOCE
                assert voce['offset'] == base+at+p
                assert voce['campiRawHex'] == r[p:p+CAMPI].hex()
                assert voce['campi'] == list(struct.unpack_from('>4H', r, p))
                assert voce['nomeRawHex'] == r[p+CAMPI:p+VOCE].hex()
                assert voce['nome'] == decoder.decode(r[p+CAMPI:p+VOCE])[0]
                assert bytes.fromhex(voce['campiRawHex']+voce['nomeRawHex']) == r[p:p+VOCE]
                voci_controllate += 1
            coperti += RECORD
            controllati += 1
        assert coperti == size, 'i record non coprono esattamente la tabella'
        conteggio = atteso['summary'][nome]
        assert conteggio['record'] == count
        assert conteggio['vociValide'] == sum(v['stato'] == 'valido' for r in righe for v in r['voci'])
    print('OK', controllati, 'record e', voci_controllate, 'voci ricontrollati byte per byte')


if __name__ == '__main__':
    main(sys.argv[1])
