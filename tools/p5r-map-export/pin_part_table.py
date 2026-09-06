"""La tabella nativa che lega il tipo di un pin allo sprite con cui il gioco lo disegna.

Per mesi questo è stato il buco: i record `ICON_*.BIN` dicono *dove* sta un pin e di che tipo è,
ma non che cosa disegni. Il censimento di tutti i campi di quei record lo conferma — su 1782
record soltanto cinque campi portano informazione (tipo, x, y, bandiera, attivo) e tredici sono
identicamente zero. La corrispondenza non è nei dati: sta nel codice, ed è lì che è stata trovata.

Nel renderer dei record ICON (`0x1412a7500`) la tabella viene caricata a `0x1412a756c` dall'indirizzo
virtuale `0x1424575a0`, che nel file dell'eseguibile è l'offset `0x24557a0`. A `0x1412a77d4`
l'indice viene calcolato come `5 × tipo` e poi scalato per quattro: ogni voce è dunque larga
`0x14` byte, e il primo `uint32` della voce è l'identificativo della parte grafica, **a base uno**.

```text
partId = uint32(tabella + 0x14 * tipoNativo)
```

Dentro il foglio `P5MINIMAP_01.SPD` il renderer usa la voce `partId - 1`. La relazione non va
generalizzata oltre il foglio: il foglio ha 193 sprite, e i tipi 113–119 restituiscono `partId`
200–206. Per quei sette il numero è dimostrato, la sorgente grafica no — e restano dichiarati
aperti, senza indicizzarli a forza dentro i 193 record.

La prova che l'offset e il passo siano quelli giusti non è la lettura del disassemblato ma il
fatto che **tutte** le corrispondenze già note per altre strade tornano, e tornano tutte insieme:

* il tipo 4, dimostrato «stanza sicura» contando le icone, dà 24 → sprite 23, `ミニマップ：セーフルームアイコン`;
* il blocco urbano, dimostrato dai nomi degli sprite, dà `tipo + 68` per tutti i 51 tipi 46–96;
* il blocco del Covo dei Ladri dà `tipo + 76` per i 6 tipi 98–103;
* il tipo 97 dà 108 → sprite 107.

Quattro famiglie indipendenti, nessuna eccezione. Una tabella letta all'offset sbagliato non
riproduce quattro famiglie di ancore per caso.

Il ritrovamento nel codice è di Codex; qui l'estrazione è rifatta dal file, ricontrollata contro
le ancore e resa riproducibile.
"""
from pathlib import Path

from scrittura import scrivi_json
import hashlib
import json
import struct
import sys

# Dove Steam installa il gioco. Si può passare un percorso diverso come secondo argomento.
ESEGUIBILE = Path(r'C:\Program Files (x86)\Steam\steamapps\common\P5R\P5R.exe')
# Offset della tabella nel file, passo di una voce, e quanti sprite ha il foglio noto.
TABELLA = 0x24557a0
PASSO = 0x14
SPRITE_DEL_FOGLIO = 193

# Le corrispondenze già dimostrate per altre strade, che la tabella deve riprodurre tutte.
ANCORE = {
    'stanza sicura contata nelle schermate': {4: 24},
    'blocco urbano dai nomi degli sprite': {t: t + 69 for t in range(46, 97)},
    'blocco del Covo dei Ladri dai nomi degli sprite': {t: t + 77 for t in range(98, 104)},
    'tipo 97 dal nome dello sprite': {97: 108},
}


def parte_di(dati, tipo):
    """L'identificativo della parte grafica per un tipo di pin, letto dalla tabella."""
    return struct.unpack_from('<I', dati, TABELLA + PASSO*tipo)[0]


def leggi(percorso):
    dati = Path(percorso).read_bytes()
    if len(dati) < TABELLA + PASSO*256:
        raise ValueError('l’eseguibile è più corto della tabella: percorso sbagliato?')
    return dati


def main(out, eseguibile=None):
    out = Path(out)
    percorso = Path(eseguibile) if eseguibile else ESEGUIBILE
    dati = leggi(percorso)
    icone = json.loads((out/'icone-mappa.json').read_text(encoding='utf8'))
    nomi = {s['index']: s for s in icone['sprite']}
    tipi_usati = sorted(r['tipoNativo'] for r in icone['tipiNativi'])

    righe = []
    for tipo in tipi_usati:
        parte = parte_di(dati, tipo)
        indice = parte - 1
        sprite = nomi.get(indice) if 0 <= indice < SPRITE_DEL_FOGLIO else None
        righe.append(dict(
            tipoNativo=tipo, partId=parte, indiceSprite=indice,
            dentroIlFoglio=bool(sprite is not None),
            nomeNativo=(sprite or {}).get('nome') or None,
            spriteVuoto=(sprite or {}).get('vuoto'),
            png=(sprite or {}).get('png'),
            motivoSenzaSprite=None if sprite is not None else
            (f'il foglio ha {SPRITE_DEL_FOGLIO} sprite e questo identificativo cade fuori: '
             'la sorgente grafica di questa parte non è ancora stata trovata')))

    verifiche = {}
    for nome, attese in ANCORE.items():
        esiti = {t: parte_di(dati, t) for t in attese}
        verifiche[nome] = dict(tipi=len(attese),
                               coincidono=sum(1 for t, v in attese.items() if esiti[t] == v),
                               discordanti={str(t): esiti[t] for t, v in attese.items()
                                            if esiti[t] != v})

    regione = dati[TABELLA:TABELLA + PASSO*(max(tipi_usati) + 1)]
    risultato = dict(
        schemaVersion=1,
        sources=dict(eseguibile=dict(nome=percorso.name, bytes=len(dati),
                                     sha256=hashlib.sha256(dati).hexdigest()),
                     foglio='icone-mappa.json'),
        tabella=dict(offset=TABELLA, passo=PASSO, baseUno=True,
                     spriteDelFoglio=SPRITE_DEL_FOGLIO,
                     sha256Regione=hashlib.sha256(regione).hexdigest(),
                     provenienza='renderer dei record ICON: la tabella è caricata a 0x1412a756c '
                                 'dall’indirizzo virtuale 0x1424575a0; l’indice è 5×tipo scalato '
                                 'per quattro, quindi voci da 0x14 byte'),
        ancore=verifiche,
        tipi=righe,
        summary=dict(tipi=len(righe),
                     dentroIlFoglio=sum(1 for r in righe if r['dentroIlFoglio']),
                     conNome=sum(1 for r in righe if r['nomeNativo']),
                     fuoriDalFoglio=sorted(r['tipoNativo'] for r in righe if not r['dentroIlFoglio']),
                     ancoreCoincidenti=sum(v['coincidono'] for v in verifiche.values()),
                     ancoreTotali=sum(v['tipi'] for v in verifiche.values())),
        limits=['La tabella dice quale parte grafica il gioco disegna per un tipo, non che cosa '
                'quella parte significhi per l’applicazione: il nome nativo dello sprite va '
                'ancora tradotto in un tipo di segnalino, voce per voce.',
                'Gli identificativi oltre i 193 sprite del foglio noto restano senza sorgente '
                'grafica: il numero è dimostrato, l’immagine no.',
                'Più tipi nativi possono usare la stessa parte: sono uguali a vedersi, non '
                'necessariamente la stessa cosa, e non vanno fusi senza altre prove.'])
    scrivi_json(out/'tabella-parti-pin.json', risultato)
    print(json.dumps(risultato['summary'], ensure_ascii=False, indent=1))
    return risultato


if __name__ == '__main__':
    main(*sys.argv[1:3])
