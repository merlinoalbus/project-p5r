"""Ricontrollo della tabella nativa tipo di pin → parte grafica.

La tabella non è dichiarata da nessuna parte nei dati: è stata trovata nel codice del gioco, e un
offset letto male produce comunque dei numeri. Perciò qui non ci si limita a rileggerla: si
pretende che sia **l'unica** lettura che regge.

Sei controlli:

1. **l'eseguibile è quello** — l'impronta registrata nell'artefatto deve coincidere, altrimenti si
   sta ricontrollando un file diverso da quello estratto;
2. **la tabella si rilegge** — ogni riga viene ricalcolata dal file con un conto proprio e deve
   dare lo stesso `partId`, lo stesso indice di sprite e lo stesso nome nativo;
3. **le ancore tornano tutte** — le 59 corrispondenze già dimostrate per quattro strade
   indipendenti (icone contate, blocco urbano, blocco del Covo, tipo 97) devono coincidere una per
   una, senza eccezioni;
4. **l'offset non è arbitrario** — spostando la tabella anche di una sola voce, o cambiando il
   passo, le ancore devono **rompersi**. È il controllo che distingue una tabella trovata da una
   coincidenza: se anche l'offset sbagliato le riproducesse, non si starebbe dimostrando niente;
5. **la base uno è quella giusta** — leggendo il `partId` come indice diretto invece che a base
   uno le ancore devono rompersi anch'esse;
6. **quel che manca è dichiarato** — i sette tipi il cui identificativo cade fuori dai 193 sprite
   del foglio restano senza nome e con il motivo scritto, e nessuno di loro viene indicizzato a
   forza dentro il foglio.
"""
from pathlib import Path
import hashlib
import json
import struct
import sys

import pin_part_table as ppt


def ancore_reggono(dati, offset, passo, sottrai_uno=True):
    """Quante delle corrispondenze note tornano con questa lettura della tabella."""
    giuste = 0
    for attese in ppt.ANCORE.values():
        for tipo, atteso in attese.items():
            fine = offset + passo*tipo + 4
            if fine > len(dati):
                continue
            letto = struct.unpack_from('<I', dati, offset + passo*tipo)[0]
            if (letto if sottrai_uno else letto + 1) == atteso:
                giuste += 1
    return giuste


def main(out, eseguibile=None):
    out = Path(out)
    dati = json.loads((out/'tabella-parti-pin.json').read_text(encoding='utf8'))
    percorso = Path(eseguibile) if eseguibile else ppt.ESEGUIBILE
    binario = ppt.leggi(percorso)
    icone = json.loads((out/'icone-mappa.json').read_text(encoding='utf8'))
    nomi = {s['index']: s for s in icone['sprite']}

    # 1. l'eseguibile è quello
    atteso = dati['sources']['eseguibile']
    assert len(binario) == atteso['bytes'], \
        f'l’eseguibile ha {len(binario)} byte, l’artefatto ne dichiara {atteso["bytes"]}'
    impronta = hashlib.sha256(binario).hexdigest()
    assert impronta == atteso['sha256'], \
        'l’impronta dell’eseguibile non coincide: si sta ricontrollando un file diverso'

    # 2. la tabella si rilegge riga per riga
    offset, passo = dati['tabella']['offset'], dati['tabella']['passo']
    assert (offset, passo) == (ppt.TABELLA, ppt.PASSO), 'offset o passo diversi da quelli dichiarati'
    for riga in dati['tipi']:
        parte = struct.unpack_from('<I', binario, offset + passo*riga['tipoNativo'])[0]
        assert parte == riga['partId'], \
            f'tipo {riga["tipoNativo"]}: la tabella dice {parte}, l’artefatto {riga["partId"]}'
        indice = parte - 1
        assert indice == riga['indiceSprite'], f'indice di sprite diverso per {riga["tipoNativo"]}'
        dentro = 0 <= indice < ppt.SPRITE_DEL_FOGLIO
        assert dentro == riga['dentroIlFoglio'], \
            f'tipo {riga["tipoNativo"]}: dentro/fuori dal foglio dichiarato male'
        nome = (nomi.get(indice) or {}).get('nome') if dentro else None
        assert (nome or None) == riga['nomeNativo'], \
            f'tipo {riga["tipoNativo"]}: nome nativo diverso da quello del foglio'

    # 3. le ancore tornano tutte
    totali = sum(len(v) for v in ppt.ANCORE.values())
    giuste = ancore_reggono(binario, offset, passo)
    assert giuste == totali, \
        (f'solo {giuste} delle {totali} corrispondenze gia’ dimostrate tornano: la tabella letta '
         'qui non e’ quella che il gioco usa')
    for nome, esito in dati['ancore'].items():
        assert not esito['discordanti'], f'ancore discordanti dichiarate per «{nome}»'
        assert esito['coincidono'] == esito['tipi'], f'ancore incomplete per «{nome}»'

    # 4. l'offset non e' arbitrario: spostarlo o cambiare passo deve rompere tutto
    prove = {}
    for scarto in (-passo, -4, 4, passo):
        prove[f'offset{scarto:+d}'] = ancore_reggono(binario, offset + scarto, passo)
    for altro in (0x10, 0x18, 0x04):
        if altro != passo:
            prove[f'passo 0x{altro:x}'] = ancore_reggono(binario, offset, altro)
    peggiore = max(prove.values())
    assert peggiore < totali, \
        (f'una lettura sbagliata riproduce comunque {peggiore} ancore su {totali}: '
         f'l’offset dichiarato non sta dimostrando nulla — {prove}')

    # 5. la base uno e' quella giusta
    senza_base = ancore_reggono(binario, offset, passo, sottrai_uno=False)
    assert senza_base < totali, \
        'le ancore tornano anche senza la base uno: la convenzione dichiarata non e’ dimostrata'

    # 6. quel che manca e' dichiarato
    fuori = [r for r in dati['tipi'] if not r['dentroIlFoglio']]
    assert sorted(r['tipoNativo'] for r in fuori) == dati['summary']['fuoriDalFoglio'], \
        'l’elenco dei tipi fuori dal foglio non coincide con le righe'
    for r in fuori:
        assert r['nomeNativo'] is None and r['png'] is None, \
            f'tipo {r["tipoNativo"]}: fuori dal foglio ma con una grafica assegnata'
        assert r['motivoSenzaSprite'], f'tipo {r["tipoNativo"]}: fuori dal foglio senza motivo scritto'

    print('OK tabella delle parti:', dati['summary']['tipi'], 'tipi letti,',
          dati['summary']['conNome'], 'raggiungono un nome nativo,',
          len(fuori), 'restano senza sorgente grafica', dati['summary']['fuoriDalFoglio'], ';',
          totali, 'ancore su', totali, 'coincidono, e nessuna lettura spostata ne riproduce piu’ di',
          peggiore)


if __name__ == '__main__':
    main(*sys.argv[1:3])
