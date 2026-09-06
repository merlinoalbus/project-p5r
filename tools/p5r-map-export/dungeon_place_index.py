"""Indice nativo dei luoghi dei Palazzi e dei Memento: campo → nome in `FLDPLACENAME`.

`FLDPLACENO.FTD` copre i campi urbani (già letto da `world_metadata`); i campi dei Palazzi
(major ≥ 150) stanno invece in `FLDDNGPLACENO.FTD`, con la stessa forma: blocchi di record da
8 byte, quattro indici big-endian ciascuno, il primo è il gruppo e i tre seguenti le varianti.
L'indice del blocco più `BASE_DUNGEON` dà il `major` del campo, l'indice del record il `minor`.

`FLDATDNGPLACENO.FTD` è la tabella gemella di un secondo insieme di campi: la sua base non è
dimostrata, quindi i record si conservano con il solo indice di blocco, senza assegnare un major.

Le varianti restano varianti: non vengono dichiarate piani.
"""
from scrittura import scrivi_json
from pathlib import Path
import collections
import hashlib
import json
import struct
import sys

from native_labels import Decoder, strings
from world_metadata import ftd_blocks

BASE_DUNGEON = 150
TITOLI = 'metadati_originali/IT/FIELD/FTD/FLDPLACENAME.FTD'
TABELLE = {'dungeon': 'originali/BASE/FIELD/FTD/FLDDNGPLACENO.FTD',
           'atDungeon': 'originali/BASE/FIELD/FTD/FLDATDNGPLACENO.FTD'}


def indice(data, titoli, base):
    """Legge i record da 8 byte, risolvendo ogni indice sulla tabella dei titoli."""
    mode, blocks = ftd_blocks(data)
    if mode != 0:
        raise ValueError('Indice dei luoghi con modo inatteso')
    righe = []
    for blocco, (off, b) in enumerate(blocks):
        zero, size, count, flag = struct.unpack_from('>4I', b)
        if zero or flag or size != count*8 or size+16 > len(b) or any(b[16+size:]):
            raise ValueError('Blocco dell’indice dei luoghi non valido')
        for minor in range(count):
            at = 16 + minor*8
            ids = list(struct.unpack_from('>4H', b, at))
            voci = [titoli[i] if i < len(titoli) else dict(index=i, status='indice-invalido', text=None) for i in ids]
            righe.append(dict(blocco=blocco, major=None if base is None else base+blocco, minor=minor,
                              offset=off+at, rawHex=b[at:at+8].hex(), indici=ids,
                              gruppo=voci[0], varianti=voci[1:]))
    return righe


def main(out):
    out = Path(out)
    charset = Path(__file__).with_name('P5R_EFIGS.tsv')
    grezzo = {'titoli': (out/TITOLI).read_bytes(), **{k: (out/v).read_bytes() for k, v in TABELLE.items()}}
    titoli = strings(grezzo['titoli'], Decoder(charset))
    tabelle = dict(dungeon=indice(grezzo['dungeon'], titoli, BASE_DUNGEON),
                   atDungeon=indice(grezzo['atDungeon'], titoli, None))

    def conta(righe):
        stati = collections.Counter(v['status'] for r in righe for v in r['varianti'])
        return dict(record=len(righe), blocchi=len({r['blocco'] for r in righe}),
                    conGruppoValido=sum(r['gruppo']['status'] == 'valido' for r in righe),
                    variantiPerStato=dict(stati),
                    nomiDistinti=len({v['text'] for r in righe for v in r['varianti']
                                      if v['status'] == 'valido'} | {r['gruppo']['text'] for r in righe
                                                                     if r['gruppo']['status'] == 'valido'}))
    risultato = dict(
        schemaVersion=1,
        sources={k: dict(file=v, bytes=len(grezzo[k]), sha256=hashlib.sha256(grezzo[k]).hexdigest())
                 for k, v in TABELLE.items()} |
                {'titoli': dict(file=TITOLI, bytes=len(grezzo['titoli']),
                                sha256=hashlib.sha256(grezzo['titoli']).hexdigest())},
        baseDungeon=BASE_DUNGEON, titleEntries=len(titoli), tables=tabelle,
        summary={k: conta(v) for k, v in tabelle.items()},
        limits=['Le varianti sono varianti native, non piani dichiarati.',
                'La base dei major di FLDATDNGPLACENO non è dimostrata: i record restano senza major.',
                'Un titolo di campo non prova un nome distinto del livello grafico.'])
    scrivi_json(out/'indice-luoghi-dungeon.json', risultato)
    print(json.dumps(risultato['summary'], ensure_ascii=False))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
