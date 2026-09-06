"""Rete della metropolitana: stazioni, tratte percorribili e tariffe.

Tre tabelle della cartella `FIELD/PANEL/LMAP`:

* `FLDLMAPSTATION.FTD` (IT) — 36 record da 416 byte: nome della stazione, due righe di
  descrizione e una curiosità con titolo e quattro righe. L'indice del record è l'identificativo
  della stazione usato dalle altre due tabelle; il record 0 è il segnaposto `NULL`.
* `FLDLMAPLINE.FTD` — record da 16 byte: la successione di identificativi di stazione che
  compone una tratta, chiusa dagli zeri finali. Uno zero interno è il segnaposto (stazione 0),
  non un terminatore. È il grafo dei collegamenti ferroviari.
* `FLDLMAPFARE.FTD` — record da 144 byte, cioè 36 interi big-endian: la prima riga è l'elenco
  degli indici di colonna, le seguenti sono le tariffe verso ciascuna stazione. Zero significa
  «nessuna tariffa dichiarata», non «gratis».
"""
from scrittura import scrivi_json
from pathlib import Path
import hashlib
import json
import struct
import sys

from native_labels import Decoder
from world_metadata import ftd_blocks

STAZIONI = 'originali/IT/FIELD/PANEL/LMAP/FLDLMAPSTATION.FTD'
TRATTE = 'originali/BASE/FIELD/PANEL/LMAP/FLDLMAPLINE.FTD'
TARIFFE = 'originali/BASE/FIELD/PANEL/LMAP/FLDLMAPFARE.FTD'
# nome, due righe di descrizione, titolo della curiosità, quattro righe di curiosità
CAMPI_STAZIONE = [('nome', 48), ('descrizione1', 64), ('descrizione2', 64), ('curiosita', 48),
                  ('curiosita1', 48), ('curiosita2', 48), ('curiosita3', 48), ('curiosita4', 48)]


def blocco_unico(data, atteso=None):
    """Restituisce l'unico blocco della tabella con il suo conteggio e la lunghezza dei record."""
    mode, blocks = ftd_blocks(data)
    if mode != 0 or len(blocks) != 1:
        raise ValueError('Tabella LMAP con struttura inattesa')
    base, b = blocks[0]
    zero, size, count, flag = struct.unpack_from('>4I', b)
    if zero or flag or not count or size % count or size+16 > len(b) or any(b[16+size:]):
        raise ValueError('Intestazione LMAP non valida')
    lungo = size//count
    if atteso is not None and lungo != atteso:
        raise ValueError(f'Record LMAP da {lungo} byte invece di {atteso}')
    return base, b, count, lungo


def leggi_stazioni(data, decoder):
    base, b, count, lungo = blocco_unico(data, sum(n for _, n in CAMPI_STAZIONE))
    righe = []
    for i in range(count):
        at = 16 + i*lungo
        r = b[at:at+lungo]
        voce = dict(id=i, offset=base+at)
        p = 0
        for campo, n in CAMPI_STAZIONE:
            testo, ignoti = decoder.decode(r[p:p+n])
            voce[campo] = testo
            if ignoti:
                voce.setdefault('codificaIrrisolta', []).append(campo)
            p += n
        voce['stato'] = 'segnaposto' if voce['nome'] in ('', 'NULL') else 'valida'
        righe.append(voce)
    return righe


def leggi_tratte(data, stazioni):
    base, b, count, lungo = blocco_unico(data, 16)
    righe = []
    for i in range(count):
        at = 16 + i*lungo
        grezzo = list(b[at:at+lungo])
        # La tratta è chiusa dagli zeri finali; uno zero interno è il segnaposto (stazione 0),
        # non un terminatore: si conserva così com'è invece di troncare la successione.
        fermate = grezzo[:len(grezzo) - next((k for k, v in enumerate(reversed(grezzo)) if v), lungo)]
        if any(v >= len(stazioni) for v in fermate):
            raise ValueError('Tratta con stazione inesistente')
        righe.append(dict(index=i, offset=base+at, rawHex=b[at:at+lungo].hex(), fermate=fermate,
                          conSegnaposto=0 in fermate,
                          nomi=[stazioni[v]['nome'] for v in fermate]))
    return righe


def leggi_tariffe(data, stazioni):
    base, b, count, lungo = blocco_unico(data)
    colonne = lungo//4
    if lungo % 4 or colonne != len(stazioni):
        raise ValueError('Tariffe con un numero di colonne diverso dalle stazioni')
    righe = []
    for i in range(count):
        at = 16 + i*lungo
        valori = list(struct.unpack_from(f'>{colonne}I', b, at))
        righe.append(dict(index=i, offset=base+at, valori=valori))
    if righe[0]['valori'] != list(range(colonne)):
        raise ValueError('La prima riga delle tariffe non è l’elenco delle colonne')
    return dict(intestazione=righe[0]['valori'], righe=righe[1:], colonne=colonne)


def main(out):
    out = Path(out)
    charset = Path(__file__).with_name('P5R_EFIGS.tsv')
    decoder = Decoder(charset)
    grezzo = {k: (out/v).read_bytes() for k, v in
              dict(stazioni=STAZIONI, tratte=TRATTE, tariffe=TARIFFE).items()}
    stazioni = leggi_stazioni(grezzo['stazioni'], decoder)
    tratte = leggi_tratte(grezzo['tratte'], stazioni)
    tariffe = leggi_tariffe(grezzo['tariffe'], stazioni)
    valide = [s for s in stazioni if s['stato'] == 'valida']
    archi = {(a, b) for t in tratte for a, b in zip(t['fermate'], t['fermate'][1:])}
    risultato = dict(
        schemaVersion=1,
        sources={k: dict(file=v, bytes=len(grezzo[k]), sha256=hashlib.sha256(grezzo[k]).hexdigest())
                 for k, v in dict(stazioni=STAZIONI, tratte=TRATTE, tariffe=TARIFFE).items()},
        recordLayout=dict(stazione=dict(CAMPI_STAZIONE), tratta=16, tariffa='36 × uint32 big-endian'),
        stazioni=stazioni, tratte=tratte, tariffe=tariffe,
        summary=dict(stazioni=len(stazioni), stazioniValide=len(valide), tratte=len(tratte),
                     fermateTotali=sum(len(t['fermate']) for t in tratte),
                     tratteVuote=sum(not t['fermate'] for t in tratte),
                     tratteConSegnaposto=sum(t['conSegnaposto'] for t in tratte),
                     archiDistinti=len(archi), righeTariffa=len(tariffe['righe'])),
        limits=['Le tratte sono successioni dichiarate dal gioco, non percorsi verificati nell’app.',
                'Tariffa zero significa «non dichiarata», non «gratuita».',
                'L’identificativo di stazione è l’indice del record, non una chiave dell’applicazione.'])
    scrivi_json(out/'metropolitana.json', risultato)
    print(json.dumps(risultato['summary'], ensure_ascii=False))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
