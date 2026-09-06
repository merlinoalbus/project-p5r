"""I pin che legano una planimetria a quella accanto, riconosciuti da dove stanno.

Su una mappa d'insieme i punti in cui si passa a un'altra area sono disegnati come frecce sul
bordo del disegno, una per direzione. Non serve sapere quale sprite il gioco usi per riconoscerli:
basta guardare **dove cadono**.

La misura è netta e si regge su un contrasto, non su una soglia. Quattro tipi nativi — 13, 14, 15,
16 — si accostano ciascuno a un lato **diverso** del disegno: 13 in alto nel 65,2% dei casi, 14 a
destra nel 70,4%, 15 in basso nel 75,8%, 16 a sinistra nel 79,7%. Tutti gli altri tipi, quelli che
stanno dentro le stanze, non superano il 48,5% sul proprio lato più frequente e si spargono sui
quattro. Che quattro tipi si dividano i quattro lati in modo esclusivo, con quel divario dai tipi
interni, non è una coincidenza che capita: è il modo in cui il gioco disegna le uscite.

Quanto spesso cadano *oltre* il perimetro del tratto — 57,6%, 56,3%, 47,0% e 59,3% — è un dato che
descrive, non la prova: un'uscita disegnata sul bordo interno resta un'uscita, e infatti il tipo 15
sta fuori meno di una volta su due. Chi legge questo file non trovi qui una soglia che il codice
non applica.

Questo dà il significato — sono passaggi — e da che parte del disegno si esce. Non dà la
destinazione: le planimetrie non sono tessere affiancate, e sapere che si esce a destra non dice
quale mappa ci sia dall'altra parte. Dove porta un passaggio lo dicono gli script, con
`CALL_FIELD`.
"""
from pathlib import Path

from scrittura import scrivi_json
import collections
import json
import sys

# Quota del lato dominante perché il tipo sia riconosciuto come freccia di bordo. La prova non è
# questa soglia da sola ma il **divario** con i tipi interni, che non arrivano al 49%: se un tipo
# interno la raggiungesse, il criterio non distinguerebbe più nulla e non si dimostra niente.
QUOTA_LATO = 0.6
MINIMI_PIN = 20
# Quanto spesso il tipo cade oltre il perimetro del disegno. **Non è un criterio**: si è provato a
# usarlo e scartava il tipo 15, che sta in basso nel 76% dei casi ma dentro il perimetro — un'uscita
# disegnata sul bordo interno resta un'uscita. Resta come dato, perché descrive, non perché decide.
SOGLIA_FUORI_INFORMATIVA = 0.5

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
                   f"tratto (dato, non criterio), mentre nessun tipo interno supera il "
                   f"{round(massimo_interni*100)}% sul proprio lato")

    risultato = dict(
        schemaVersion=1,
        sources=dict(metadati='mondo_metadati.json', riferimento='riferimento-pin.json'),
        criterio=dict(quotaLato=QUOTA_LATO, minimiPin=MINIMI_PIN,
                      quotaMassimaDeiTipiInterni=round(massimo_interni, 3),
                      quotaFuoriDalTrattoInformativa=SOGLIA_FUORI_INFORMATIVA,
                      forma='un tipo è una freccia di bordo se cade prevalentemente su un lato, '
                            'se quel lato è solo suo, e se i tipi interni restano molto sotto. '
                            'La quota fuori dal tratto è riportata ma non seleziona.'),
        tipi=righe, tipiDimostrati={str(k): v for k, v in dimostrati.items()},
        summary=dict(tipiEsaminati=len(righe), tipiDimostrati=len(dimostrati),
                     pinCoperti=sum(v['pin'] for v in dimostrati.values()),
                     latiCoperti=sorted({v['lato'] for v in dimostrati.values()}),
                     quotaMassimaDeiTipiInterni=round(massimo_interni, 3)),
        limits=['La direzione è quella sulla planimetria, non un punto d’arrivo: dice da che parte '
                'si esce, non dove si finisce. L’arrivo è lavoro della fase dei collegamenti.',
                'Un tipo con pochi pin non entra: il lato prevalente lo deciderebbe il caso.'])
    scrivi_json(out/'pin-di-bordo.json', risultato)
    print(json.dumps(risultato['summary'], ensure_ascii=False))
    for tipo, v in sorted(dimostrati.items()):
        print(f"  tipo {tipo:3d} -> {v['etichetta']} ({v['pin']} pin)")
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
