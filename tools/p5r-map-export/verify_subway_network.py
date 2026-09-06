"""Ricontrollo indipendente di `metropolitana.json`.

Rilegge le tre tabelle LMAP dal disco, ricostruisce stazioni, tratte e tariffe e le confronta con
il file prodotto. Controlla inoltre le proprietà che devono valere sui dati: ogni fermata esiste,
ogni tratta è chiusa da soli zeri, la matrice delle tariffe è quadrata sulle stazioni e la sua
prima riga è l'elenco delle colonne.
"""
from pathlib import Path
import hashlib
import json
import struct
import sys

from native_labels import Decoder
from world_metadata import ftd_blocks

CAMPI_STAZIONE = [('nome', 48), ('descrizione1', 64), ('descrizione2', 64), ('curiosita', 48),
                  ('curiosita1', 48), ('curiosita2', 48), ('curiosita3', 48), ('curiosita4', 48)]


def blocco(out, sorgente):
    data = (out/sorgente['file']).read_bytes()
    assert len(data) == sorgente['bytes'] and hashlib.sha256(data).hexdigest() == sorgente['sha256']
    mode, blocks = ftd_blocks(data)
    assert mode == 0 and len(blocks) == 1
    base, b = blocks[0]
    zero, size, count, flag = struct.unpack_from('>4I', b)
    assert not zero and not flag and count and not size % count and not any(b[16+size:])
    return base, b, count, size//count


def main(out):
    out = Path(out)
    atteso = json.loads((out/'metropolitana.json').read_text(encoding='utf8'))
    decoder = Decoder(Path(__file__).with_name('P5R_EFIGS.tsv'))

    base, b, count, lungo = blocco(out, atteso['sources']['stazioni'])
    assert count == len(atteso['stazioni']) and lungo == sum(n for _, n in CAMPI_STAZIONE)
    for i, s in enumerate(atteso['stazioni']):
        at = 16 + i*lungo
        r = b[at:at+lungo]
        assert s['id'] == i and s['offset'] == base+at
        p = 0
        for campo, n in CAMPI_STAZIONE:
            assert s[campo] == decoder.decode(r[p:p+n])[0], (i, campo)
            p += n
        assert p == lungo
        assert s['stato'] == ('segnaposto' if s['nome'] in ('', 'NULL') else 'valida')

    base, b, count, lungo = blocco(out, atteso['sources']['tratte'])
    assert count == len(atteso['tratte']) and lungo == 16
    for i, t in enumerate(atteso['tratte']):
        r = list(b[16+i*lungo:16+(i+1)*lungo])
        assert t['index'] == i and t['rawHex'] == bytes(r).hex()
        assert t['fermate'] == (r[:len(r)-next((k for k, v in enumerate(reversed(r)) if v), lungo)])
        assert not any(r[len(t['fermate']):]), 'la coda della tratta non è tutta a zero'
        assert all(0 <= v < len(atteso['stazioni']) for v in t['fermate'])
        assert t['nomi'] == [atteso['stazioni'][v]['nome'] for v in t['fermate']]
        assert t['conSegnaposto'] == (0 in t['fermate'])

    base, b, count, lungo = blocco(out, atteso['sources']['tariffe'])
    colonne = lungo//4
    assert colonne == len(atteso['stazioni']) == atteso['tariffe']['colonne']
    assert count == len(atteso['tariffe']['righe'])+1
    assert atteso['tariffe']['intestazione'] == list(struct.unpack_from(f'>{colonne}I', b, 16)) == list(range(colonne))
    for k, riga in enumerate(atteso['tariffe']['righe'], start=1):
        at = 16 + k*lungo
        assert riga['index'] == k and riga['offset'] == base+at
        assert riga['valori'] == list(struct.unpack_from(f'>{colonne}I', b, at))

    s = atteso['summary']
    assert s['stazioniValide'] == sum(x['stato'] == 'valida' for x in atteso['stazioni'])
    assert s['fermateTotali'] == sum(len(t['fermate']) for t in atteso['tratte'])
    assert s['archiDistinti'] == len({(a, c) for t in atteso['tratte']
                                      for a, c in zip(t['fermate'], t['fermate'][1:])})
    print('OK', s['stazioniValide'], 'stazioni,', s['tratte'], 'tratte e',
          s['righeTariffa'], 'righe di tariffa ricontrollate')


if __name__ == '__main__':
    main(sys.argv[1])
