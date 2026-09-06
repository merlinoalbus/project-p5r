"""Porta le coordinate del mondo di gioco sulla planimetria, quando i conti tornano.

I trigger e gli ingressi di un campo hanno coordinate 3D del mondo; i pin della planimetria hanno
pixel della texture. Le due cose descrivono gli stessi oggetti in due sistemi diversi, e passare
dall'uno all'altro serve a dire che cosa sia un pin — è il trigger che ci sta sopra a dirlo.

La trasformazione si cerca fra le similitudini con assi allineati: scala uniforme, eventuale
scambio fra l'asse x e l'asse z, eventuale ribaltamento di ciascun asse, traslazione. Sono otto
combinazioni, e per ciascuna la scala e la traslazione si ricavano dai due riquadri; poi si
raffina risolvendo ai minimi quadrati sulle coppie scelte. Vince la combinazione con lo scarto
minore.

Tre cose rendono l'accoppiamento una corrispondenza e non un'attrazione:

* **uno a uno** — due pin distinti non possono cadere sullo stesso trigger, e l'abbinamento si
  risolve con un'assegnazione di costo minimo (`assegnazione.assegna`), non prendendo per ciascun
  pin il più vicino e amen;
* **stabilità** — una coppia vale come prova solo se sopravvive a se stessa: si ristima la
  trasformazione **senza quel pin** e si guarda se il pin torna sullo stesso punto. Una coppia che
  esiste solo perché ha contribuito a crearla non prova nulla, e non entra fra le stabili;
* **riferimenti noti** — dove il gioco dichiara lui la trasformazione (il cursore nel record
  roadmap e l'unità nel record texpack), la stima deve riprodurla. Se non lo fa, è un errore.

**Una proiezione vale solo se lo scarto è piccolo rispetto alla tela e se le coppie sono
abbastanza.** Le altre restano non certificate: una proiezione sbagliata metterebbe i pin nel
posto di un altro, che è peggio di non metterli.
"""
from pathlib import Path
import collections
import itertools
import json
import math
import sys

from assegnazione import assegna

# Scarto massimo, in frazione della diagonale della tela, perché la proiezione valga.
SCARTO = 0.03
# Coppie minime fra pin e punti del campo: sotto, la trasformazione la deciderebbe il caso.
COPPIE_MINIME = 4
# Una coppia entra nella stima solo se il punto 3D dista dal pin meno di questo, sempre in
# frazione della diagonale.
VICINANZA = 0.08
# Quota dei pin di un livello che deve cadere sulla trasformazione ricevuta da un livello
# gemello perché valga anche per lui: sotto, quella proiezione non descrive quel livello.
QUOTA_EREDITA = 0.5

# Le tre planimetrie urbane per cui la trasformazione è dichiarata dal gioco: il cursore sta nel
# record roadmap, l'unità nel primo float del record texpack, e la formula documentata in
# `extracted/proiezione-urbana/evidenze.json` è `pixel = cursore + (x, z)·fattore/unità`, con il
# fattore fra 1, 1.5 e 2. Servono da convalida incrociata: la stima deve ritrovarle.
RIFERIMENTI_NOTI = {
    'RMAP_001_3_0': dict(campo='F001_003_00', cursore=[180, 710], unita=23.44),
    'RMAP_005_1_0': dict(campo='F005_001_00', cursore=[367, 482], unita=23.44),
    'RMAP_009_2_0': dict(campo='F009_002_00', cursore=[575, 101], unita=23.44),
}
FATTORI_DISEGNO = [1.0, 1.5, 2.0]
# Quanto la scala stimata può discostarsi da quella dichiarata, in frazione.
TOLLERANZA_NOTI = 0.15


def punti_del_campo(campo):
    """Trigger e ingressi del campo, con la loro posizione nel piano del mondo."""
    voci = []
    for t in campo['triggers']:
        p = t.get('position')
        if p:
            voci.append(dict(genere='trigger', indice=t['index'], xyz=p['xyz'],
                             hitType=t.get('hitType'), nameId=t.get('nameId'),
                             promptType=t.get('promptType'), procedura=t.get('procedureIndex')))
    for e in campo.get('entrances') or []:
        voci.append(dict(genere='ingresso', indice=e['index'], xyz=e['xyz'], entranceId=e.get('entranceId')))
    return voci


def accoppia(proiettati, pin, soglia):
    """Abbina i pin ai punti proiettati, uno a uno, al costo complessivo minimo.

    Torna, per ogni pin, l'indice del punto assegnato (o -1 se oltre la soglia) e la distanza.
    L'assegnazione si calcola su tutti i pin e si taglia dopo: così il taglio non altera l'ottimo.
    """
    import numpy
    n, m = len(pin), len(proiettati)
    assegnato = numpy.full(n, -1, dtype=int)
    if n == 0 or m == 0:
        return assegnato, numpy.full(n, numpy.inf)
    distanze = numpy.hypot(proiettati[:, None, 0] - pin[None, :, 0], proiettati[:, None, 1] - pin[None, :, 1])
    if n <= m:
        assegnato[:] = assegna(distanze.T)          # righe = pin, colonne = punti del campo
    else:
        for i_punto, i_pin in enumerate(assegna(distanze)):   # più pin che punti
            assegnato[i_pin] = i_punto
    misure = numpy.array([distanze[assegnato[i], i] if assegnato[i] >= 0 else numpy.inf
                          for i in range(n)])
    return numpy.where(misure <= soglia, assegnato, -1), misure


def _applica(mondo, scambia, segno_x, segno_y, scala, traslazione):
    import numpy
    w = mondo[:, ::-1].copy() if scambia else mondo.copy()
    w[:, 0] *= segno_x
    w[:, 1] *= segno_y
    return w, w*scala + numpy.asarray(traslazione, dtype=float)


def _raffina(w, pin, diagonale, scala, traslazione):
    """Alterna assegnazione e minimi quadrati finché la trasformazione si assesta."""
    import numpy
    traslazione = numpy.asarray(traslazione, dtype=float)
    for _ in range(6):
        assegnato, _misure = accoppia(w*scala + traslazione, pin, VICINANZA*diagonale)
        buoni = numpy.nonzero(assegnato >= 0)[0]
        if len(buoni) < COPPIE_MINIME:
            break
        a, b = w[assegnato[buoni]], pin[buoni]
        ca, cb = a.mean(0), b.mean(0)
        denominatore = float(((a-ca)**2).sum())
        if denominatore <= 0:
            break
        nuova = float(((a-ca)*(b-cb)).sum()/denominatore)
        if not (nuova > 0):
            break
        scala, traslazione = nuova, cb - ca*nuova
    return scala, traslazione


def stima(mondo, pin, diagonale):
    """La migliore similitudine ad assi allineati fra i due insiemi di punti."""
    import numpy
    migliore = None
    for scambia, segno_x, segno_y in itertools.product((False, True), (1, -1), (1, -1)):
        w, _ = _applica(mondo, scambia, segno_x, segno_y, 1.0, [0.0, 0.0])
        ampiezza = w.max(0) - w.min(0)
        if ampiezza.min() <= 0:
            continue
        scala = float(((pin.max(0) - pin.min(0)) / ampiezza).mean())
        scala, traslazione = _raffina(w, pin, diagonale, scala, pin.min(0) - w.min(0)*scala)
        # si arrotonda prima di accoppiare, non dopo: quello che il file dichiara e' esattamente
        # quello con cui le coppie sono state trovate, e chi ricontrolla ritrova le stesse
        scala = round(scala, 6)
        traslazione = numpy.array([round(float(v), 3) for v in traslazione])
        assegnato, misure = accoppia(w*scala + traslazione, pin, VICINANZA*diagonale)
        buoni = numpy.nonzero(assegnato >= 0)[0]
        if len(buoni) < COPPIE_MINIME:
            continue
        voce = dict(scambiaAssi=scambia, segnoX=segno_x, segnoY=segno_y, scala=scala,
                    traslazione=[float(v) for v in traslazione],
                    coppie=int(len(buoni)), scarto=round(float(misure[buoni].mean()/diagonale), 5),
                    accoppiamenti=[[int(i), int(assegnato[i])] for i in buoni])
        if migliore is None or voce['scarto'] < migliore['scarto']:
            migliore = voce
    return migliore


def stabilita(mondo, pin, diagonale, p):
    """Quali coppie sopravvivono a se stesse: si ristima senza il pin e si guarda dove torna.

    Una coppia che si regge solo sul proprio contributo alla stima non è una prova. Qui, per
    ciascuna, si rifà il raffinamento sugli altri pin — con la stessa forma già scelta — e si
    controlla che il pin escluso finisca ancora sullo stesso punto, e che nessun altro pin glielo
    porti via: l'assegnazione resta uno a uno anche nella riprova.
    """
    import numpy
    w, _ = _applica(mondo, p['scambiaAssi'], p['segnoX'], p['segnoY'], 1.0, [0.0, 0.0])
    stabili = []
    for i_pin, i_punto in p['accoppiamenti']:
        resto = numpy.array([j for j in range(len(pin)) if j != i_pin], dtype=int)
        if len(resto) < COPPIE_MINIME:
            continue
        scala, traslazione = _raffina(w, pin[resto], diagonale, p['scala'], p['traslazione'])
        assegnato, _misure = accoppia(w*scala + traslazione, pin, VICINANZA*diagonale)
        if int(assegnato[i_pin]) == i_punto:
            stabili.append([int(i_pin), int(i_punto)])
    return stabili


def convalida_noti(righe):
    """Le tre planimetrie con trasformazione dichiarata devono ritrovarsi nella stima.

    La formula del gioco dà una scala pari a `fattore/unità`, moltiplicata per l'eventuale fattore
    con cui i pin sono stati riportati alla risoluzione della planimetria. Si controlla che la
    scala stimata sia una di quelle, entro tolleranza. Un disaccordo è un errore, non una nota.
    """
    esiti = []
    per_codice = {r['codice']: r for r in righe}
    for codice, atteso in sorted(RIFERIMENTI_NOTI.items()):
        r = per_codice.get(codice)
        if r is None:
            esiti.append(dict(mappa=codice, esito='assente', motivo='la planimetria non è nel censimento'))
            continue
        if r['esito'] != 'certificata':
            esiti.append(dict(mappa=codice, esito='non-certificata', motivo=r.get('motivo')))
            continue
        attese = [f/atteso['unita']*r['fattoreScala'] for f in FATTORI_DISEGNO]
        scala = r['proiezione']['scala']
        vicine = [(f, s) for f, s in zip(FATTORI_DISEGNO, attese) if abs(scala - s) <= TOLLERANZA_NOTI*s]
        assert vicine, (f'la scala stimata su {codice} è {scala}, e nessuno dei fattori dichiarati '
                        f'{[round(s, 5) for s in attese]} la riproduce: la proiezione non è quella '
                        'che il gioco dichiara')
        esiti.append(dict(mappa=codice, esito='riprodotta', campo=r['proiezione']['campo'],
                          fattoreDisegno=vicine[0][0], scalaAttesa=round(vicine[0][1], 6),
                          scalaStimata=scala, unita=atteso['unita'], cursore=atteso['cursore']))
    return esiti


def main(out):
    import numpy
    out = Path(out)
    meta = json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    con = json.loads((out/'campi-completi/connessioni.json').read_text(encoding='utf8'))
    riferimento = {r['chiave']: r for r in json.loads((out/'riferimento-pin.json').read_text(encoding='utf8'))['mappe']}
    campi = {f['field']: f for f in con['fields']}
    per_codice = {m['code']: m for m in meta['maps']}

    def punti_pin(r):
        mappa = per_codice[r['codice']]
        f = r['fattoreScala']
        return numpy.array([[mappa['pins'][i]['x']*f, mappa['pins'][i]['y']*f]
                            for i in r['pinCollocabili']], dtype=float)

    def mondo_del_campo(nome):
        campo = campi.get(nome)
        if not campo:
            return None, None
        voci = punti_del_campo(campo)
        if len(voci) < COPPIE_MINIME:
            return None, None
        return voci, numpy.array([[v['xyz'][0], v['xyz'][2]] for v in voci], dtype=float)

    righe = []
    for mappa in meta['maps']:
        chiave = 'nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in mappa['code'].split('_')[1:])
        rif = riferimento[chiave]
        if rif['esito'] != 'condiviso' or not rif['collocabili']:
            righe.append(dict(chiave=chiave, codice=mappa['code'], esito='senza-riferimento',
                              motivo='la planimetria non ha un riferimento certificato per i suoi pin'))
            continue
        larghezza, altezza = rif['dimensione']
        diagonale = (larghezza**2 + altezza**2) ** 0.5
        base = dict(chiave=chiave, codice=mappa['code'], pinCollocabili=rif['collocabili'],
                    dimensione=[larghezza, altezza], fattoreScala=rif['fattoreScala'])
        pin = punti_pin(base)
        candidati = []
        for nome_campo in mappa['fields']:
            voci, mondo = mondo_del_campo(nome_campo)
            if mondo is None:
                continue
            esito = stima(mondo, pin, diagonale)
            if esito:
                candidati.append(dict(esito, campo=nome_campo, punti=len(voci),
                                      generi=dict(collections.Counter(v['genere'] for v in voci))))
        if not candidati:
            righe.append(dict(base, esito='non-certificata',
                              motivo='nessun campo dichiarato dalla mappa offre abbastanza punti accoppiabili'))
            continue
        migliore = min(candidati, key=lambda c: c['scarto'])
        certificata = migliore['scarto'] <= SCARTO and migliore['coppie'] >= COPPIE_MINIME
        righe.append(dict(base, esito='certificata' if certificata else 'non-certificata',
                          motivo=None if certificata else f"scarto {round(migliore['scarto']*100, 1)}% della tela",
                          proiezione=migliore, alternative=len(candidati)))

    # I livelli grafici della stessa risorsa (`ICON_<maggiore>_<minore>.BIN`, sezioni separate dal
    # record di tipo 2) disegnano pin sulla **stessa tela**: la trasformazione che porta il mondo
    # sui pixel è per forza la stessa per tutti. Due conseguenze, entrambe sfruttate qui: i pin dei
    # livelli si possono stimare insieme, e una proiezione certificata su un livello si può provare
    # sugli altri. Non è una scorciatoia — la trasformazione ricevuta viene rimisurata sui pin del
    # livello che la riceve, e se troppi restano lontani quel livello resta senza. I campi provati
    # restano quelli che i record delle mappe dichiarano: non se ne cercano altri.
    per_risorsa = collections.defaultdict(list)
    for r in righe:
        maggiore, minore, _ = (int(v) for v in r['codice'].split('_')[1:])
        per_risorsa[(maggiore, minore)].append(r)

    def prova(r, p, nome_campo):
        voci, mondo = mondo_del_campo(nome_campo)
        if mondo is None:
            return None
        larghezza, altezza = r['dimensione']
        diagonale = (larghezza**2 + altezza**2) ** 0.5
        pin = punti_pin(r)
        _w, proiettati = _applica(mondo, p['scambiaAssi'], p['segnoX'], p['segnoY'], p['scala'], p['traslazione'])
        assegnato, misure = accoppia(proiettati, pin, VICINANZA*diagonale)
        buoni = numpy.nonzero(assegnato >= 0)[0]
        if len(buoni) < max(1, math.ceil(QUOTA_EREDITA*len(pin))):
            return None
        scarto = float(misure[buoni].mean()/diagonale)
        if scarto > SCARTO:
            return None
        return dict(p, coppie=int(len(buoni)), scarto=round(scarto, 5),
                    accoppiamenti=[[int(i), int(assegnato[i])] for i in buoni])

    aggregate = ereditate = 0
    for chiave_risorsa in sorted(per_risorsa):
        membri = [r for r in per_risorsa[chiave_risorsa] if 'pinCollocabili' in r]
        if not membri:
            continue
        sorgenti = [r for r in membri if r['esito'] == 'certificata']
        origine = None
        if sorgenti:
            scelta = min(sorgenti, key=lambda r: r['proiezione']['scarto'])
            origine = dict(proiezione=scelta['proiezione'], da=scelta['chiave'], modo='livello-gemello')
        elif len(membri) > 1 and len({tuple(r['dimensione']) for r in membri}) == 1:
            larghezza, altezza = membri[0]['dimensione']
            diagonale = (larghezza**2 + altezza**2) ** 0.5
            uniti = numpy.vstack([punti_pin(r) for r in membri])
            nomi = []
            for r in membri:
                for nome in per_codice[r['codice']]['fields']:
                    if nome not in nomi:
                        nomi.append(nome)
            trovati = []
            for nome in nomi:
                voci, mondo = mondo_del_campo(nome)
                if mondo is None:
                    continue
                esito = stima(mondo, uniti, diagonale)
                if esito and esito['scarto'] <= SCARTO:
                    trovati.append(dict(esito, campo=nome))
            if trovati:
                origine = dict(proiezione=min(trovati, key=lambda c: c['scarto']), da=None,
                               modo='livelli-uniti', pinUniti=int(len(uniti)), livelli=len(membri))
        if not origine:
            continue
        for r in membri:
            if r['esito'] == 'certificata':
                continue
            misura = prova(r, origine['proiezione'], origine['proiezione']['campo'])
            if not misura:
                continue
            misura['stimataSu'] = origine['modo']
            if origine['da']:
                misura['ereditataDa'] = origine['da']
            if origine.get('pinUniti'):
                misura['pinUniti'] = origine['pinUniti']
                misura['livelliUniti'] = origine['livelli']
            r.update(esito='certificata', motivo=None, alternative=r.get('alternative', 0), proiezione=misura)
            if origine['modo'] == 'livelli-uniti':
                aggregate += 1
            else:
                ereditate += 1

    # Stabilità: quali coppie reggono anche senza il pin che le ha prodotte. Solo queste valgono
    # come prova di che cosa sia un pin.
    stabili_totali = 0
    for r in righe:
        if r['esito'] != 'certificata':
            continue
        p = r['proiezione']
        larghezza, altezza = r['dimensione']
        diagonale = (larghezza**2 + altezza**2) ** 0.5
        _voci, mondo = mondo_del_campo(p['campo'])
        p['stabili'] = stabilita(mondo, punti_pin(r), diagonale, p) if mondo is not None else []
        stabili_totali += len(p['stabili'])

    certificate = [r for r in righe if r['esito'] == 'certificata']
    noti = convalida_noti(righe)
    risultato = dict(
        schemaVersion=2,
        sources=dict(metadati='mondo_metadati.json', connessioni='campi-completi/connessioni.json',
                     riferimento='riferimento-pin.json',
                     riferimentiNoti='proiezione-urbana/evidenze.json'),
        criterio=dict(scartoMassimo=SCARTO, coppieMinime=COPPIE_MINIME, vicinanza=VICINANZA,
                      quotaEredita=QUOTA_EREDITA, tolleranzaNoti=TOLLERANZA_NOTI,
                      forma='similitudine ad assi allineati: scala uniforme, scambio e ribaltamento degli assi, traslazione',
                      abbinamento='assegnazione di costo minimo, uno a uno: nessun punto del campo sotto due pin',
                      stabilita='una coppia vale come prova solo se si ritrova ristimando senza il suo pin',
                      applicazione='pixel = mondo(x,z) trasformato; vale solo per le mappe certificate'),
        convalidaRiferimentiNoti=noti,
        mappe=righe,
        summary=dict(mappe=len(righe), certificate=len(certificate), daLivelliUniti=aggregate,
                     ereditate=ereditate,
                     coppie=sum(r['proiezione']['coppie'] for r in certificate),
                     coppieStabili=stabili_totali,
                     riferimentiNotiRiprodotti=sum(1 for n in noti if n['esito'] == 'riprodotta'),
                     scartoMediano=sorted(r['proiezione']['scarto'] for r in certificate)[len(certificate)//2]
                     if certificate else None,
                     perEsito=dict(collections.Counter(r['esito'] for r in righe))),
        limits=['Una proiezione non certificata non va usata: metterebbe i pin nel posto di un altro.',
                'La similitudine ad assi allineati non copre inquadrature ruotate o prospettiche.',
                'Solo le coppie stabili valgono come prova di che cosa sia un pin: le altre restano '
                'nel file per trasparenza, ma non vanno usate per dedurre significati.'])
    (out/'proiezioni-mappa.json').write_text(json.dumps(risultato, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps(risultato['summary'], ensure_ascii=False, indent=1))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
