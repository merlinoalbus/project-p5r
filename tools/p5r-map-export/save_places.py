"""I nomi ufficiali italiani dei luoghi di salvataggio, da `FLDSAVEDATAPLACE.FTD`.

Il gioco tiene un elenco dei posti in cui si può salvare, con il nome già tradotto: «Mansarda del
Leblanc», «Cortile della Shujin», «Accesso Teikyu». Serve a due cose. La prima è dare un nome vero
ai pin delle stanze sicure, che altrimenti si chiamerebbero tutti «Stanza sicura». La seconda è di
controllo: i luoghi che il gioco dichiara e i pin di quel tipo devono stare insieme.

Il formato è quello delle altre tabelle FTD. Il passo non è supposto: si misura sulla distanza fra
le stringhe consecutive del file, che risulta 52 byte per settantanove volte su ottanta. Il numero
che precede il nome **non è un indice progressivo** — gli stessi luoghi tornano per salvataggi
diversi — quindi si tiene l'ordine di lettura e il valore grezzo, senza pretendere che salga.
"""
from pathlib import Path
import collections
import json
import re
import sys

# Primo nome e passo fra un record e il successivo, ricavati misurando il file.
PRIMO = 0x68
RECORD = 52
NOME = 48


def passo_misurato(dati):
    """Ricava dal file stesso la distanza fra i nomi, per controllare che sia quella attesa."""
    posizioni = [m.start() for m in re.finditer(rb'[\x20-\x7e\xc0-\xff][\x20-\x7e\xa0-\xff]{2,47}\x00', dati)
                 if m.start() >= PRIMO]
    distanze = collections.Counter(b - a for a, b in zip(posizioni, posizioni[1:]))
    return (distanze.most_common(1)[0] if distanze else (None, 0)), len(posizioni)


def leggi(dati):
    """Ordine, codice e nome di ogni voce dell'elenco."""
    voci = []
    posizione, ordine = PRIMO, 0
    while posizione + NOME <= len(dati):
        nome = dati[posizione:posizione+NOME].split(b'\0')[0].decode('utf8', 'replace').strip()
        codice = int.from_bytes(dati[posizione-2:posizione], 'little')
        voci.append(dict(ordine=ordine, offset=posizione, codice=codice, nome=nome,
                         stato='valido' if nome and nome != '???' else
                               ('segnaposto' if nome == '???' else 'vuoto')))
        ordine += 1
        posizione += RECORD
    while voci and voci[-1]['stato'] == 'vuoto':
        voci.pop()
    return voci


def main(out):
    out = Path(out)
    sorgente = out/'originali/IT/FIELD/FTD/FLDSAVEDATAPLACE.FTD'
    dati = sorgente.read_bytes()
    (passo, quante), stringhe = passo_misurato(dati)
    voci = leggi(dati)
    validi = [v for v in voci if v['stato'] == 'valido']
    distinti = sorted({v['nome'] for v in validi})
    risultato = dict(
        schemaVersion=1,
        sources=dict(tabella='IT.CPK/FIELD/FTD/FLDSAVEDATAPLACE.FTD', byte=len(dati)),
        formato=dict(primoRecord=PRIMO, lunghezzaRecord=RECORD, lunghezzaNome=NOME,
                     passoMisurato=passo, ricorrenzeDelPasso=quante, stringheNelFile=stringhe,
                     nota='il numero che precede il nome non è un indice progressivo'),
        luoghi=voci, nomiDistinti=distinti,
        summary=dict(record=len(voci), validi=len(validi), nomiDistinti=len(distinti),
                     segnaposto=sum(1 for v in voci if v['stato'] == 'segnaposto'),
                     vuoti=sum(1 for v in voci if v['stato'] == 'vuoto')),
        limits=['I nomi sono quelli del gioco e non vanno tradotti di nuovo.',
                'Un «???» è un segnaposto del gioco, non un nome mancante: va lasciato tale.',
                'Lo stesso luogo compare più volte: l’elenco è dei salvataggi, non dei posti.'])
    (out/'luoghi-salvataggio.json').write_text(
        json.dumps(risultato, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps(risultato['summary'], ensure_ascii=False))
    print('passo misurato:', passo, 'su', quante, 'stringhe')
    for n in distinti[:12]:
        print('  ', n)
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
