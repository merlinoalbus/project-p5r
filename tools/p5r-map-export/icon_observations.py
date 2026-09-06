"""Che cosa disegna un tipo di pin, dedotto contando le icone nelle schermate del gioco.

Per i pin dei Palazzi né il foglio degli sprite né le procedure dicono di che icona si tratti: la
tabella che lega il tipo all'icona sta nel codice del gioco, non nei dati. Ma il gioco quelle
icone le disegna, e chi ci gioca le vede.

Il metodo è un vincolo di conteggio. In una schermata si contano le icone di un certo genere — per
esempio due rombi verdi con la S, che sono le stanze sicure. Il tipo di pin che le disegna deve
comparire **esattamente quel numero di volte** fra i pin nativi di quella planimetria. Un tipo che
ne ha un numero diverso è escluso. Con abbastanza schermate resta un solo tipo compatibile con
tutte, e allora quello è dimostrato: non per somiglianza, per esclusione di tutti gli altri.

Serve una cautela: una schermata può corrispondere a più planimetrie native, perché le versioni di
una stessa area sono immagini distinte. In quel caso si prendono i tipi compatibili con **almeno
una** delle planimetrie — la lettura prudente, che esclude di meno.

Le osservazioni stanno in `data/atlas/osservazioni-icone.json`, con la loro provenienza. Chi
aggiunge una schermata aggiunge una riga lì, e i tipi che restano compatibili si stringono.
"""
from pathlib import Path
import collections
import json
import sys

# Un tipo è dimostrato quando le osservazioni che lo riguardano sono almeno queste e lui è l'unico
# a sopravvivere a tutte. Sotto, il vincolo combinatorio è troppo debole: con due schermate i tipi
# compatibili sono ancora molti, e sceglierne uno sarebbe tirare a indovinare.
MINIME_OSSERVAZIONI = 4


def risolvi(osservazioni, mappe, tipi_per_sprite=None):
    """Per ogni genere di icona, i tipi di pin compatibili con tutte le osservazioni.

    Attenzione a che cosa si conta. Chi guarda una schermata vede **icone**, e un'icona è uno
    sprite: se due tipi nativi condividono lo stesso sprite — come il 17 e il 26, che sono il
    forziere normale e quello raro e il gioco disegna identici — chi conta «i forzieri» li conta
    insieme, e il vincolo di conteggio riguarda la loro **somma**, non l'uno o l'altro.

    Trattarli separatamente è l'errore che questo metodo aveva: il conteggio delle icone «forziere»
    risultava compatibile con il solo tipo 26, e da lì si concludeva che il 26 fosse il forziere —
    mentre l'osservazione non poteva distinguerlo dal 17. Con `tipi_per_sprite` il vincolo si
    applica ai gruppi che condividono l'icona: se il gruppo ne contiene uno solo, il tipo è
    dimostrato; se ne contiene di più, l'osservazione dimostra che quel gruppo disegna quel genere,
    e a dire quale sia quale devono pensarci le procedure.
    """
    per_genere = collections.defaultdict(list)
    for voce in osservazioni:
        for genere, quante in voce['icone'].items():
            per_genere[genere].append((voce, quante))

    esito = {}
    for genere, casi in sorted(per_genere.items()):
        insiemi = []
        for voce, quante in casi:
            compatibili = set()
            for codice in voce['planimetrie']:
                conta = mappe.get(codice)
                if conta is None:
                    raise ValueError(f'planimetria non censita: {codice}')
                if quante:
                    compatibili |= {t for t, n in conta.items() if n == quante}
                else:
                    # zero icone: sono compatibili tutti i tipi che su quella mappa non compaiono
                    compatibili |= {t for t in mappe['__tutti__'] if conta.get(t, 0) == 0}
            insiemi.append(compatibili)
        rimasti = set.intersection(*insiemi) if insiemi else set()
        # Il gruppo di tipi che condividono l'icona di quelli rimasti: se il vincolo lascia in
        # piedi il tipo 26 ma quell'icona la usa anche il 17, l'osservazione non li distingue.
        gruppo = set(rimasti)
        if tipi_per_sprite:
            for t in rimasti:
                gruppo |= set(tipi_per_sprite.get(t, ()))
        abbastanza = len(casi) >= MINIME_OSSERVAZIONI
        dimostrato = sorted(gruppo)[0] if len(gruppo) == 1 and abbastanza else None
        if len(rimasti) == 1 and len(gruppo) > 1:
            motivo = (f'l’icona di questo genere è condivisa dai tipi {sorted(gruppo)}: il conteggio '
                      'dice quanti sono in tutto, non quale sia quale')
        elif len(rimasti) == 1:
            motivo = None
        elif not rimasti:
            motivo = ('nessun tipo è compatibile con tutte le osservazioni: una di esse è sbagliata, '
                      'oppure la schermata non mostrava tutte le icone')
        else:
            motivo = f'{len(rimasti)} tipi restano compatibili: servono altre schermate per distinguerli'
        esito[genere] = dict(
            osservazioni=len(casi),
            schermate=[v['schermata'] for v, _ in casi],
            compatibili=sorted(rimasti), gruppoIcona=sorted(gruppo),
            dimostrato=dimostrato, motivo=motivo)
    return esito


def main(out, radice=None):
    out = Path(out)
    radice = Path(radice) if radice else Path(__file__).resolve().parents[2]
    dati = json.loads((radice/'data/atlas/osservazioni-icone.json').read_text(encoding='utf8'))
    meta = json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    mappe = {m['code']: collections.Counter(p['nativeType'] for p in m['pins']) for m in meta['maps']}
    mappe['__tutti__'] = sorted({p['nativeType'] for m in meta['maps'] for p in m['pins']})

    # Quali tipi condividono la stessa icona: senza questo il vincolo di conteggio crederebbe di
    # distinguere due tipi che il gioco disegna identici.
    percorso_parti = out/'tabella-parti-pin.json'
    tipi_per_sprite = {}
    if percorso_parti.exists():
        per_sprite = collections.defaultdict(set)
        for r in json.loads(percorso_parti.read_text(encoding='utf8'))['tipi']:
            if r['indiceSprite'] is not None:
                per_sprite[r['indiceSprite']].add(r['tipoNativo'])
        for tipi in per_sprite.values():
            for t in tipi:
                tipi_per_sprite[t] = tipi
    esito = risolvi(dati['osservazioni'], mappe, tipi_per_sprite)
    corrispondenza = dati['corrispondenzaIcone']
    determinati = {}
    for genere, voce in esito.items():
        if voce['dimostrato'] is not None:
            reso = corrispondenza.get(genere)
            if not reso:
                raise ValueError(f'genere di icona senza corrispondenza dichiarata: {genere}')
            determinati[voce['dimostrato']] = dict(
                genere=genere, tipoSpillo=reso['tipoSpillo'], etichetta=reso['etichetta'],
                osservazioni=voce['osservazioni'], schermate=voce['schermate'],
                motivo=f"su {voce['osservazioni']} schermate del gioco il numero di icone «{genere}» "
                       f"coincide con il numero di pin di questo tipo, e nessun altro tipo regge "
                       f"tutte le osservazioni")

    risultato = dict(
        schemaVersion=1,
        sources=dict(osservazioni='data/atlas/osservazioni-icone.json', metadati='mondo_metadati.json'),
        criterio=dict(minimeOsservazioni=MINIME_OSSERVAZIONI,
                      forma='vincolo di conteggio: il tipo deve comparire tante volte quante le '
                            'icone osservate, in ogni schermata',
                      prudenza='una schermata con più planimetrie candidate accetta i tipi '
                               'compatibili con almeno una di esse'),
        generi=esito,
        tipiDimostrati={str(k): v for k, v in sorted(determinati.items())},
        summary=dict(generiOsservati=len(esito), tipiDimostrati=len(determinati),
                     pinCoperti=sum(sum(c.get(t, 0) for c in mappe.values() if isinstance(c, collections.Counter))
                                    for t in determinati)),
        limits=['Il conteggio prova qualcosa solo se la schermata mostra tutte le icone di quel '
                'genere: una partita a metà ne nasconde, e il vincolo diventa un «almeno».',
                'Un solo genere osservato non basta a coprire i pin: serve una schermata per '
                'ciascun genere di icona che si vuole dimostrare.'])
    (out/'osservazioni-icone-esito.json').write_text(
        json.dumps(risultato, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps(risultato['summary'], ensure_ascii=False, indent=1))
    for genere, voce in sorted(esito.items()):
        print(f"  {genere}: {voce['osservazioni']} osservazioni ->",
              f"tipo {voce['dimostrato']} dimostrato" if voce['dimostrato'] is not None
              else f"{voce['compatibili'][:8]} ({voce['motivo']})")
    return risultato


if __name__ == '__main__':
    main(*sys.argv[1:3])
