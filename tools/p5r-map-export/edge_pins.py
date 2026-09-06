"""I pin che legano una planimetria a quella accanto, riconosciuti da dove stanno.

Su una mappa d'insieme i punti in cui si passa a un'altra area sono disegnati come frecce sul
bordo del disegno, una per direzione. Non serve sapere quale sprite il gioco usi per riconoscerli:
basta guardare **dove cadono**.

La misura è netta e si regge sul contrasto. Quattro tipi nativi — 13, 14, 15, 16 — cadono fuori
dal tratto nel 90% dei casi e, di quelle volte, ciascuno si accosta a un lato **diverso**: 13 in alto,
14 a destra, 15 in basso, 16 a sinistra, con quote fra il 65% e l'80%. Tutti gli altri tipi, quelli
che stanno dentro le stanze, non superano il 47% sul proprio lato più frequente e si spargono sui
quattro. Che quattro tipi si dividano i quattro lati in modo esclusivo non è una coincidenza che
capita: è il modo in cui il gioco disegna le uscite.

Questo dà il significato — sono passaggi — e da che parte del disegno si esce. Non dà la
destinazione: le planimetrie non sono tessere affiancate, e sapere che si esce a destra non dice
quale mappa ci sia dall'altra parte. Dove porta un passaggio lo dicono gli script, con
`CALL_FIELD`.
"""
from pathlib import Path
import collections
import json
import sys

# Quota del lato dominante perché il tipo sia riconosciuto come freccia di bordo, e quota massima
# che i tipi «interni» raggiungono: è il contrasto fra le due a fare la prova, non la soglia da sola.
QUOTA_LATO = 0.6
QUOTA_INTERNI = 0.5
# Un tipo di bordo deve anche cadere fuori dal tratto: è lì che il gioco disegna le frecce.
QUOTA_FUORI = 0.5
MINIMI_PIN = 20

# Per chi usa l'applicazione il pin e' uno solo — un passaggio — e la direzione non cambia che
# cosa ci si fa sopra: si clicca e si va. Il lato resta pero' scritto nel dato, perche' serve ad
# sapere da che parte si esce. Attenzione: il lato NON dice quale sia la mappa di arrivo — le
# planimetrie non sono tessere affiancate, e la destinazione va letta dagli script.
ETICHETTA = ('passaggio', 'Passaggio')
LATI = {'alto': ETICHETTA, 'destra': ETICHETTA, 'basso': ETICHETTA, 'sinistra': ETICHETTA}


def lato_di(x, y, riquadro):
    """Da che parte del disegno sta il punto, rispetto al centro."""
    x0, y0, x1, y1 = riquadro
    dx = (x - (x0+x1)/2) / max((x1-x0)/2, 1)
    dy = (y - (y0+y1)/2) / max((y1-y0)/2, 1)
    if dx > abs(dy):
        return 'destra'
    if -dx > abs(dy):
        return 'sinistra'
    return 'basso' if dy > 0 else 'alto'


def misura(out):
    """Per ogni tipo: da che lato cade, e quanto spesso è fuori dal tratto."""
    out = Path(out)
    meta = json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    riferimento = {r['chiave']: r for r in
                   json.loads((out/'riferimento-pin.json').read_text(encoding='utf8'))['mappe']}
    lati = collections.defaultdict(collections.Counter)
    fuori = collections.defaultdict(lambda: [0, 0])
    posizioni = collections.defaultdict(list)
    for m in meta['maps']:
        chiave = 'nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in m['code'].split('_')[1:])
        rif = riferimento.get(chiave)
        if not rif or rif['esito'] != 'condiviso':
            continue
        riquadro = rif['riquadroContenuto']
        x0, y0, x1, y1 = riquadro
        fattore = rif['fattoreScala']
        for i in rif['collocabili']:
            p = m['pins'][i]
            x, y = p['x']*fattore, p['y']*fattore
            tipo = p['nativeType']
            lati[tipo][lato_di(x, y, riquadro)] += 1
            # «fuori dal tratto» = oltre il novanta per cento della semiampiezza, su un asse
            dx = abs(x - (x0+x1)/2) / max((x1-x0)/2, 1)
            dy = abs(y - (y0+y1)/2) / max((y1-y0)/2, 1)
            q = fuori[tipo]
            q[0] += max(dx, dy) > 0.9
            q[1] += 1
            posizioni[tipo].append((chiave, i))
    return lati, fuori, posizioni


def main(out):
    out = Path(out)
    lati, fuori, posizioni = misura(out)
    righe = {}
    for tipo in sorted(lati):
        conta = lati[tipo]
        totale = sum(conta.values())
        if totale < MINIMI_PIN:
            continue
        lato, quante = conta.most_common(1)[0]
        quota = quante/totale
        quota_fuori = fuori[tipo][0]/fuori[tipo][1]
        righe[tipo] = dict(pin=totale, lato=lato, quotaLato=round(quota, 3),
                           quotaFuoriDalTratto=round(quota_fuori, 3),
                           distribuzione=dict(conta.most_common()))
    # Un tipo e' di bordo se si accosta a un lato molto piu' di quanto facciano gli altri. La
    # condizione «fuori dal tratto» resta come dato, non come filtro: un'uscita puo' essere
    # disegnata dentro il perimetro senza per questo smettere di essere un'uscita.
    candidati = {t: v for t, v in righe.items() if v['quotaLato'] >= QUOTA_LATO}
    interni = {t: v for t, v in righe.items() if t not in candidati}
    massimo_interni = max((v['quotaLato'] for v in interni.values()), default=0.0)
    # la prova sta nel divario: se un tipo interno arrivasse alla soglia, il criterio non
    # distinguerebbe piu' nulla e non si dimostra niente
    if massimo_interni >= QUOTA_LATO:
        candidati = {}
    # e i lati devono essere distinti fra loro: due frecce nella stessa direzione non hanno senso
    per_lato = collections.Counter(v['lato'] for v in candidati.values())
    esclusivi = {t: v for t, v in candidati.items() if per_lato[v['lato']] == 1}

    dimostrati = {}
    for tipo, v in sorted(esclusivi.items()):
        spillo, etichetta = LATI[v['lato']]
        dimostrati[tipo] = dict(
            tipoSpillo=spillo, etichetta=etichetta, lato=v['lato'], pin=v['pin'],
            motivo=f"{round(v['quotaLato']*100)}% dei suoi {v['pin']} pin cade sul lato "
                   f"{v['lato']} del disegno e {round(v['quotaFuoriDalTratto']*100)}% fuori dal "
                   f"tratto, mentre nessun tipo interno supera il "
                   f"{round(massimo_interni*100)}% sul proprio lato")

    risultato = dict(
        schemaVersion=1,
        sources=dict(metadati='mondo_metadati.json', riferimento='riferimento-pin.json'),
        criterio=dict(quotaLato=QUOTA_LATO, quotaFuoriDalTratto=QUOTA_FUORI,
                      minimiPin=MINIMI_PIN, quotaMassimaDeiTipiInterni=round(massimo_interni, 3),
                      forma='un tipo è una freccia di bordo se cade fuori dal tratto e '
                            'prevalentemente su un lato, e se quel lato è solo suo'),
        tipi=righe, tipiDimostrati={str(k): v for k, v in dimostrati.items()},
        summary=dict(tipiEsaminati=len(righe), tipiDimostrati=len(dimostrati),
                     pinCoperti=sum(v['pin'] for v in dimostrati.values()),
                     latiCoperti=sorted({v['lato'] for v in dimostrati.values()}),
                     quotaMassimaDeiTipiInterni=round(massimo_interni, 3)),
        limits=['La direzione è quella sulla planimetria, non un punto d’arrivo: dice da che parte '
                'si esce, non dove si finisce. L’arrivo è lavoro della fase dei collegamenti.',
                'Un tipo con pochi pin non entra: il lato prevalente lo deciderebbe il caso.'])
    (out/'pin-di-bordo.json').write_text(json.dumps(risultato, ensure_ascii=False, indent=2),
                                         encoding='utf8')
    print(json.dumps(risultato['summary'], ensure_ascii=False))
    for tipo, v in sorted(dimostrati.items()):
        print(f"  tipo {tipo:3d} → {v['etichetta']} ({v['pin']} pin)")
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
