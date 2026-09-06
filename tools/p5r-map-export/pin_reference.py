"""Verifica che i pin nativi e la planimetria condividano lo stesso riferimento.

I 1429 pin di `mondo_metadati.json` sono in pixel della texture DDS originale, con origine in alto
a sinistra. Convertirli in percentuali dell'immagine è banale — `100·x/larghezza` — ma è lecito
solo se i pin e la planimetria misurano davvero la stessa cosa. Un pin fuori dal disegno, o
addensato in un angolo, direbbe che il riferimento non è quello.

Qui la condivisione del riferimento viene messa alla prova, mappa per mappa, su fatti misurabili:

* **dentro la tela** — nessun pin cade fuori dalle dimensioni dichiarate dell'immagine;
* **sul disegno** — i pin cadono dentro il riquadro del contenuto opaco, con una tolleranza pari
  a un margine dell'icona; un pin appoggiato appena fuori dal bordo del disegno è ancora sul
  disegno, un pin a metà tela vuota no;
* **sul tratto** — quanto dista ciascun pin dal pixel disegnato più vicino, rapportato alla
  diagonale della tela. Un intorno fisso in pixel non serve: quaranta pixel su una tela di 2048
  sono un niente, su una di 256 sono un terzo del disegno.

Due cose che la misura ha mostrato e che il criterio recepisce. La prima: qualche planimetria ha
i pin in una **risoluzione diversa dalla propria**, e allora il riferimento è condiviso a meno di
un fattore, che viene cercato fra potenze di due e accettato solo quando il miglioramento è netto.
La seconda: un pin isolato fuori posto non dice che l'intera mappa abbia un altro riferimento, e
non deve farle perdere tutti gli altri; resta **escluso singolarmente**, con il conto scritto.

Le mappe che superano le prove ricevono `esito: condiviso`, il fattore di scala e l'elenco dei pin
collocabili. Le altre restano senza pin nativi, con il motivo: meglio una mappa senza pin che una
mappa con pin nel posto sbagliato.
"""
from pathlib import Path
import collections
import json
import re
import sys

# Un pin è disegnato attorno al proprio punto: tanto quanto basta perché appoggiarlo sul bordo
# del disegno resti dentro il disegno. La quota è sulla diagonale della tela, non un numero fisso.
MARGINE_TELA = 0.02
# Distanza massima dal tratto, in frazione della diagonale della tela: oltre, il pin non è
# appoggiato al disegno. La prima soglia vale per quasi tutti i pin, la seconda per ognuno.
VICINO = 0.02
LONTANO = 0.06
# Quota minima di pin collocabili perché la mappa valga: sotto, non è un pin fuori posto ma un
# riferimento diverso.
QUOTA_COLLOCABILI = 0.5
# Con un solo pin appoggiato la quota non dice nulla, e una soglia piu' stretta sarebbe un numero
# scelto a mano. La prova diventa allora un confronto con il fondo: si misura quanto disterebbe dal
# tratto un punto qualunque preso dentro il riquadro del disegno, e si chiede che quel pin sia
# molto piu' vicino di cosi'. In concreto: si guarda che frazione dei punti del riquadro sarebbe
# vicina al tratto almeno quanto quel pin. Se e' una frazione piccola, la vicinanza non e' un caso;
# se meta' della tela e' vicina quanto lui, non prova nulla.
FRAZIONE_FONDO = 0.05
PASSO_FONDO = 48
# Alcune planimetrie hanno i pin in un'altra risoluzione: si prova solo con potenze di due, e si
# accetta il cambio solo se migliora la mediana di almeno questo fattore.
FATTORI = [1.0, 0.5, 2.0, 0.25, 4.0]
# Oltre alle potenze di due si prova il fattore che i dati stessi suggeriscono: il rapporto fra
# l'estensione del disegno e l'estensione dei pin. Se i pin sono in un'altra risoluzione ma non in
# rapporto binario, e' questo a trovarla — e passa solo se supera le stesse prove degli altri.
def fattore_suggerito(pin, riquadro):
    x0, y0, x1, y1 = riquadro
    xs = [p['x'] for p in pin]
    ys = [p['y'] for p in pin]
    ampiezza_x, ampiezza_y = max(xs) - min(xs), max(ys) - min(ys)
    if ampiezza_x <= 0 or ampiezza_y <= 0:
        return None
    f = ((x1 - x0)/ampiezza_x + (y1 - y0)/ampiezza_y) / 2
    return round(f, 4) if 0.05 <= f <= 20 else None
MIGLIORAMENTO = 5


def carica(out):
    leggi = lambda p: json.loads((out/p).read_text(encoding='utf8'))
    return leggi('mondo_metadati.json'), leggi('manifest.json')


def chiave_di(codice):
    return 'nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in codice.split('_')[1:])


def prova_mappa(mappa, immagine, maschera, maschera_gruppo=None, riquadro_gruppo=None):
    """Le prove su una singola planimetria, e il fattore di scala con cui i pin le corrispondono."""
    import numpy
    larghezza, altezza = immagine['width'], immagine['height']
    pin = mappa['pins']
    if not pin:
        return dict(esito='senza-pin', motivo='la mappa non ha pin nativi', pin=0)
    x0, y0, x1, y1 = riquadro_gruppo or immagine['alpha_bbox']
    diagonale = (larghezza**2 + altezza**2) ** 0.5
    margine = MARGINE_TELA * diagonale
    # I livelli di una stessa risorsa sono sovrapposizioni: il piano superiore disegna solo ciò che
    # gli appartiene, e un suo pin puo' cadere dove quel livello e' trasparente ma il disegno,
    # nell'insieme dei livelli, c'e' eccome. Il tratto di riferimento e' allora quello della
    # risorsa intera; dove i livelli non condividono la tela si resta al proprio.
    ys, xs = numpy.nonzero(maschera_gruppo if maschera_gruppo is not None else maschera)

    def distanze_con(fattore):
        return [float(numpy.hypot(xs - p['x']*fattore, ys - p['y']*fattore).min()) / diagonale for p in pin]

    def mediana(v):
        return sorted(v)[len(v)//2]

    # Alcune planimetrie hanno i pin in una risoluzione diversa dalla propria. Il fattore si accetta
    # solo se è una potenza di due, se migliora la mediana di molto e se il risultato è ottimo:
    # altrimenti si resta a uno, che è il caso normale.
    suggerito = fattore_suggerito(pin, (x0, y0, x1, y1))
    prove = list(FATTORI) + ([suggerito] if suggerito and suggerito not in FATTORI else [])
    misure = {f: distanze_con(f) for f in prove}
    base = mediana(misure[1.0])
    fattore, distanze = 1.0, misure[1.0]
    migliore = min((f for f in prove if f != 1.0), key=lambda f: mediana(misure[f]))
    # se la scala uno va già bene non si cambia: un fattore diverso sposterebbe i pin senza motivo
    if base > VICINO/4 and mediana(misure[migliore]) <= VICINO/4 and mediana(misure[migliore]) * MIGLIORAMENTO <= base:
        fattore, distanze = migliore, misure[migliore]

    dentro_tela, dentro_disegno = [], []
    for i, p in enumerate(pin):
        x, y = p['x']*fattore, p['y']*fattore
        dentro_tela.append(0 <= x <= larghezza and 0 <= y <= altezza)
        dentro_disegno.append(x0 - margine <= x <= x1 + margine and y0 - margine <= y <= y1 + margine)
    # Un pin è collocabile se sta sulla tela, dentro il disegno e vicino al tratto. Gli altri non
    # bocciano la mappa: restano esclusi uno per uno, con il conto scritto.
    collocabili = [i for i in range(len(pin))
                   if dentro_tela[i] and dentro_disegno[i] and distanze[i] <= LONTANO]
    med = mediana([distanze[i] for i in collocabili]) if collocabili else 1.0
    quota = len(collocabili)/len(pin)
    esito, motivo = 'condiviso', None
    if med > VICINO:
        esito, motivo = 'non-condiviso', f'i pin distano in media il {round(med*100, 1)}% della tela dal tratto'
    elif quota < QUOTA_COLLOCABILI:
        esito, motivo = 'non-condiviso', (f'solo {len(collocabili)} pin su {len(pin)} '
                                          f'({round(quota*100)}%) sono appoggiati al disegno')
    elif len(collocabili) == 1:
        # un solo pin: vale se e' molto piu' vicino al tratto di quanto lo sarebbe un punto a caso
        griglia_x = numpy.linspace(x0, x1, PASSO_FONDO)
        griglia_y = numpy.linspace(y0, y1, PASSO_FONDO)
        gx, gy = numpy.meshgrid(griglia_x, griglia_y)
        campione = numpy.stack([gx.ravel(), gy.ravel()], 1)
        fondo = [float(numpy.hypot(xs - c[0], ys - c[1]).min())/diagonale for c in campione]
        frazione = sum(1 for f in fondo if f <= med)/len(fondo)
        if frazione > FRAZIONE_FONDO:
            esito, motivo = 'non-condiviso', (
                f'un solo pin appoggiato, e il {round(frazione*100)}% della tela e’ vicino al tratto '
                f'quanto lui: la sua posizione non prova che il riferimento sia condiviso')
    return dict(esito=esito, motivo=motivo, pin=len(pin), fattoreScala=fattore,
                collocabili=collocabili if esito == 'condiviso' else [],
                numeroCollocabili=len(collocabili) if esito == 'condiviso' else 0,
                esclusi=len(pin) - len(collocabili),
                fuoriDallaTela=sum(not v for v in dentro_tela),
                fuoriDalDisegno=sum(not v for v in dentro_disegno),
                fattoreSuggerito=suggerito,
                quotaCollocabili=round(quota, 4), distanzaMediana=round(med, 4),
                distanzaMedianaScalaUno=round(base, 4),
                dimensione=[larghezza, altezza], riquadroContenuto=[x0, y0, x1, y1],
                tratto='livelli della risorsa uniti' if maschera_gruppo is not None else 'solo questo livello',
                margineAmmesso=round(margine, 1))


def main(out):
    import numpy
    from PIL import Image
    out = Path(out)
    meta, manifest = carica(out)
    native = Path(__file__).resolve().parents[2]/'public/asset/mappe/native'
    immagini = {}
    for e in manifest['images']:
        m = re.search(r'ROADMAP/(RMAP_\d+_\d+_\d+)\.DDS$', e['source'])
        if m:
            immagini[m.group(1)] = e

    maschere, valide = {}, {}
    for mappa in meta['maps']:
        immagine = immagini[mappa['code']]
        chiave = chiave_di(mappa['code'])
        maschera = numpy.array(Image.open(native/(chiave + '.png')).convert('RGBA').getchannel('A')) > 0
        maschere[mappa['code']] = maschera
        valide[mappa['code']] = maschera.shape == (immagine['height'], immagine['width'])

    # unione dei tratti, per risorsa e solo fra livelli che hanno la stessa tela
    per_risorsa = collections.defaultdict(list)
    for codice in maschere:
        maggiore, minore, _ = (int(v) for v in codice.split('_')[1:])
        per_risorsa[(maggiore, minore)].append(codice)
    unione, riquadro_unione = {}, {}
    for codici in per_risorsa.values():
        gruppi = collections.defaultdict(list)
        for c in codici:
            if valide[c]:
                gruppi[maschere[c].shape].append(c)
        for insieme in gruppi.values():
            if len(insieme) < 2:
                continue
            somma = numpy.zeros_like(maschere[insieme[0]])
            for c in insieme:
                somma |= maschere[c]
            ys, xs = numpy.nonzero(somma)
            if not len(xs):
                continue
            riquadro = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
            for c in insieme:
                unione[c] = somma
                riquadro_unione[c] = riquadro

    righe = []
    for mappa in meta['maps']:
        immagine = immagini[mappa['code']]
        chiave = chiave_di(mappa['code'])
        if not valide[mappa['code']]:
            righe.append(dict(chiave=chiave, codice=mappa['code'], esito='non-condiviso',
                              motivo='il PNG non ha le dimensioni dichiarate dal manifest'))
            continue
        esito = prova_mappa(mappa, immagine, maschere[mappa['code']],
                            unione.get(mappa['code']), riquadro_unione.get(mappa['code']))
        righe.append(dict(chiave=chiave, codice=mappa['code'], **esito))

    condivise = [r for r in righe if r['esito'] == 'condiviso']
    risultato = dict(
        schemaVersion=1,
        sources=dict(metadati='mondo_metadati.json', manifest='manifest.json',
                     immagini='public/asset/mappe/native'),
        criterio=dict(sistemaCoordinate=meta['coordinateSystem'], margineTela=MARGINE_TELA,
                      vicino=VICINO, lontano=LONTANO, quotaCollocabili=QUOTA_COLLOCABILI,
                      fattori=FATTORI, miglioramento=MIGLIORAMENTO,
                      frazioneFondo=FRAZIONE_FONDO, passoFondo=PASSO_FONDO,
                      fattoreSuggerito='rapporto fra estensione del disegno ed estensione dei pin',
                      conversione='x% = 100·x·fattoreScala/larghezza, y% = 100·y·fattoreScala/altezza, '
                                  'solo per gli indici elencati in «collocabili» delle mappe condivise'),
        mappe=righe,
        summary=dict(mappe=len(righe), condivise=len(condivise),
                     conFattoreDiverso=sum(1 for r in condivise if r.get('fattoreScala') != 1.0),
                     pinConvertibili=sum(r['numeroCollocabili'] for r in condivise),
                     pinEsclusiDalleCondivise=sum(r['esclusi'] for r in condivise),
                     pinTotali=sum(r.get('pin', 0) for r in righe),
                     perEsito=dict(collections.Counter(r['esito'] for r in righe)),
                     motivi=dict(collections.Counter(r['motivo'] for r in righe if r.get('motivo')))),
        limits=['La condivisione del riferimento non dice che cosa un pin rappresenti.',
                'Le mappe non condivise restano senza pin nativi: il motivo è scritto per ciascuna.'])
    (out/'riferimento-pin.json').write_text(json.dumps(risultato, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps(risultato['summary'], ensure_ascii=False, indent=1))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
