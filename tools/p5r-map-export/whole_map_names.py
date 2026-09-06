"""Destinazioni ufficiali della mappa d'insieme (città e Palazzi), con i nomi italiani del gioco.

`FLDWHOLEMAPTABLE.FTD` e `FLDWHOLEMAPTABLEDNG.FTD` (archivio IT) contengono il menu di viaggio
mostrato sulla mappa d'insieme: per ogni luogo di partenza il titolo e fino a 19 voci di
destinazione. Ogni record è lungo 1124 byte: titolo di 48 byte, poi 19 voci da 56 byte
(8 byte di campi nativi + 48 byte di nome) e 12 byte di coda.

I quattro interi delle voci sono conservati grezzi: non sono ancora interpretati e non vengono
usati come collegamenti. Qui si estraggono nomi ed evidenze, non si certifica navigabilità.
"""
from pathlib import Path
import hashlib
import json
import struct
import sys

from native_labels import Decoder
from world_metadata import ftd_blocks

TABELLE = {'citta': 'IT/FIELD/PANEL/FLDWHOLEMAPTABLE.FTD', 'dungeon': 'IT/FIELD/PANEL/FLDWHOLEMAPTABLEDNG.FTD'}
RECORD = 1124
TITOLO = 48
VOCI = 19
VOCE = 56
CAMPI = 8
CODA = RECORD - TITOLO - VOCI*VOCE


def leggi_tabella(data, decoder):
    """Scompone la tabella nei suoi record, conservando offset e byte originali."""
    mode, blocks = ftd_blocks(data)
    if mode != 0 or len(blocks) != 1:
        raise ValueError('Tabella della mappa d’insieme con struttura inattesa')
    base, b = blocks[0]
    zero, size, count, flag = struct.unpack_from('>4I', b)
    if zero or flag or size != count*RECORD or size+16 > len(b) or any(b[16+size:]):
        raise ValueError('Intestazione della mappa d’insieme non valida')
    record = []
    for i in range(count):
        at = 16 + i*RECORD
        r = b[at:at+RECORD]
        titolo, ignoti = decoder.decode(r[:TITOLO])
        voci = []
        for k in range(VOCI):
            p = TITOLO + k*VOCE
            campi = struct.unpack_from('>4H', r, p)
            nome, sconosciuti = decoder.decode(r[p+CAMPI:p+VOCE])
            voci.append(dict(index=k, offset=base+at+p, campiRawHex=r[p:p+CAMPI].hex(), campi=list(campi),
                             nomeRawHex=r[p+CAMPI:p+VOCE].hex(), nome=nome,
                             stato='codifica-irrisolta' if sconosciuti else 'vuoto' if not nome
                             else 'null' if nome == 'NULL' else 'valido'))
        record.append(dict(index=i, offset=base+at, titoloRawHex=r[:TITOLO].hex(), titolo=titolo,
                           titoloStato='codifica-irrisolta' if ignoti else 'vuoto' if not titolo
                           else 'null' if titolo == 'NULL' else 'valido',
                           voci=voci, codaRawHex=r[RECORD-CODA:].hex()))
    return record


def main(out):
    out = Path(out)
    charset = Path(__file__).with_name('P5R_EFIGS.tsv')
    decoder = Decoder(charset)
    sources, tables = {}, {}
    for nome, path in TABELLE.items():
        data = (out/'originali'/path).read_bytes()
        sources[nome] = dict(archive='IT', path=path, file=('originali/'+path),
                             bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
        tables[nome] = leggi_tabella(data, decoder)
    utili = {k: [v for r in t for v in r['voci'] if v['stato'] == 'valido'] for k, t in tables.items()}
    risultato = dict(
        schemaVersion=1, sources=sources,
        recordLayout=dict(record=RECORD, titolo=TITOLO, voci=VOCI, voce=VOCE, campi=CAMPI, coda=CODA,
                          campiEndianness='big', campiTipo='4 × uint16 non interpretati'),
        tables=tables,
        charset=dict(file='tool/P5R_EFIGS.tsv', sha256=hashlib.sha256(charset.read_bytes()).hexdigest()),
        summary={k: dict(record=len(t), vociValide=len(utili[k]),
                         titoliValidi=sum(r['titoloStato'] == 'valido' for r in t),
                         nomiDistinti=len({v['nome'] for v in utili[k]})) for k, t in tables.items()},
        limits=['I quattro interi di ogni voce non sono ancora interpretati: non sono collegamenti.',
                'Il menu di viaggio non certifica che la destinazione sia sempre disponibile.',
                'I nomi sono quelli della localizzazione italiana, anche quando restano in inglese.'])
    (out/'nomi-mappe-ufficiali.json').write_text(json.dumps(risultato, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps(risultato['summary'], ensure_ascii=False))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
