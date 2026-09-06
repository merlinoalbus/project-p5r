"""Porta le coordinate del mondo di gioco sulla planimetria, quando i conti tornano.

I trigger e gli ingressi di un campo hanno coordinate 3D del mondo; i pin della planimetria hanno
pixel della texture. Le due cose descrivono gli stessi oggetti in due sistemi diversi, e passare
dall'uno all'altro serve a dire che cosa sia un pin — è il trigger che ci sta sopra a dirlo.

La trasformazione si cerca fra le similitudini con assi allineati: scala uniforme, eventuale
scambio fra l'asse x e l'asse z, eventuale ribaltamento di ciascun asse, traslazione. Sono otto
combinazioni, e per ciascuna la scala e la traslazione si ricavano dai due riquadri; poi si
raffina accoppiando ogni pin al punto 3D più vicino e risolvendo ai minimi quadrati sulle coppie
stabili. Vince la combinazione con lo scarto minore.

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

# Scarto massimo, in frazione della diagonale della tela, perché la proiezione valga.
SCARTO = 0.03
# Coppie minime fra pin e punti del campo: sotto, la trasformazione la deciderebbe il caso.
COPPIE_MINIME = 4
# Una coppia entra nella stima solo se il punto 3D è il più vicino a quel pin entro questa
# distanza, sempre in frazione della diagonale.
VICINANZA = 0.08
# Quota dei pin di un livello che deve cadere sulla trasformazione ricevuta da un livello
# gemello perche' valga anche per lui: sotto, quella proiezione non descrive quel livello.
QUOTA_EREDITA = 0.5


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


def stima(mondo, pin, diagonale):
    """La migliore similitudine ad assi allineati fra i due insiemi di punti."""
    import numpy
    migliore = None
    for scambia, segno_x, segno_y in itertools.product((False, True), (1, -1), (1, -1)):
        w = mondo[:, ::-1].copy() if scambia else mondo.copy()
        w[:, 0] *= segno_x
        w[:, 1] *= segno_y
        minimo, massimo = w.min(0), w.max(0)
        ampiezza = massimo - minimo
        if ampiezza.min() <= 0:
            continue
        scala = float(((pin.max(0) - pin.min(0)) / ampiezza).mean())
        traslazione = pin.min(0) - minimo*scala
        for _ in range(6):
            proiettati = w*scala + traslazione
            distanze = numpy.hypot(proiettati[:, None, 0] - pin[None, :, 0], proiettati[:, None, 1] - pin[None, :, 1])
            vicino = distanze.argmin(0)
            buone = distanze.min(0) <= VICINANZA*diagonale
            if buone.sum() < COPPIE_MINIME:
                break
            a, b = w[vicino[buone]], pin[buone]
            # scala e traslazione ai minimi quadrati sulle coppie scelte, senza ruotare oltre gli assi
            ca, cb = a.mean(0), b.mean(0)
            denominatore = float(((a-ca)**2).sum())
            if denominatore <= 0:
                break
            nuova = float(((a-ca)*(b-cb)).sum()/denominatore)
            if not (nuova > 0):
                break
            scala, traslazione = nuova, cb - ca*nuova
        proiettati = w*scala + traslazione
        distanze = numpy.hypot(proiettati[:, None, 0] - pin[None, :, 0], proiettati[:, None, 1] - pin[None, :, 1])
        vicino = distanze.argmin(0)
        buone = distanze.min(0) <= VICINANZA*diagonale
        if buone.sum() < COPPIE_MINIME:
            continue
        scarto = float(distanze.min(0)[buone].mean()/diagonale)
        voce = dict(scambiaAssi=scambia, segnoX=segno_x, segnoY=segno_y, scala=round(scala, 6),
                    traslazione=[round(float(v), 3) for v in traslazione],
                    coppie=int(buone.sum()), scarto=round(scarto, 5),
                    accoppiamenti=[[int(i), int(vicino[i])] for i in range(len(pin)) if buone[i]])
        if migliore is None or voce['scarto'] < migliore['scarto']:
            migliore = voce
    return migliore


def main(out):
    import numpy
    out = Path(out)
    meta = json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    con = json.loads((out/'campi-completi/connessioni.json').read_text(encoding='utf8'))
    riferimento = {r['chiave']: r for r in json.loads((out/'riferimento-pin.json').read_text(encoding='utf8'))['mappe']}
    campi = {f['field']: f for f in con['fields']}
    per_codice = {m['code']: m for m in meta['maps']}

    righe = []
    for mappa in meta['maps']:
        chiave = 'nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in mappa['code'].split('_')[1:])
        rif = riferimento[chiave]
        if rif['esito'] != 'condiviso' or not rif['collocabili']:
            righe.append(dict(chiave=chiave, codice=mappa['code'], esito='senza-riferimento',
                              motivo='la planimetria non ha un riferimento certificato per i suoi pin'))
            continue
        fattore = rif['fattoreScala']
        larghezza, altezza = rif['dimensione']
        diagonale = (larghezza**2 + altezza**2) ** 0.5
        indici = rif['collocabili']
        pin = numpy.array([[mappa['pins'][i]['x']*fattore, mappa['pins'][i]['y']*fattore] for i in indici], dtype=float)
        candidati = []
        for nome_campo in mappa['fields']:
            campo = campi.get(nome_campo)
            if not campo:
                continue
            voci = punti_del_campo(campo)
            if len(voci) < COPPIE_MINIME:
                continue
            mondo = numpy.array([[v['xyz'][0], v['xyz'][2]] for v in voci], dtype=float)
            esito = stima(mondo, pin, diagonale)
            if esito:
                candidati.append(dict(esito, campo=nome_campo, punti=len(voci),
                                      generi=dict(collections.Counter(v['genere'] for v in voci))))
        if not candidati:
            righe.append(dict(chiave=chiave, codice=mappa['code'], esito='non-certificata',
                              motivo='nessun campo offre abbastanza punti accoppiabili',
                              pinCollocabili=indici, dimensione=[larghezza, altezza], fattoreScala=fattore))
            continue
        migliore = min(candidati, key=lambda c: c['scarto'])
        certificata = migliore['scarto'] <= SCARTO and migliore['coppie'] >= COPPIE_MINIME
        righe.append(dict(chiave=chiave, codice=mappa['code'],
                          esito='certificata' if certificata else 'non-certificata',
                          motivo=None if certificata else f"scarto {round(migliore['scarto']*100, 1)}% della tela",
                          pinCollocabili=indici, dimensione=[larghezza, altezza], fattoreScala=fattore,
                          proiezione=migliore, alternative=len(candidati)))

    # I livelli grafici della stessa risorsa (`ICON_<maggiore>_<minore>.BIN`, sezioni separate dal
    # record di tipo 2) disegnano pin sulla **stessa tela**: la trasformazione che porta il mondo
    # sui pixel e' per forza la stessa per tutti. Due conseguenze, entrambe sfruttate qui:
    #
    #   * i pin dei livelli si possono **stimare insieme**, e cosi' un gruppo in cui nessun livello
    #     da solo raggiunge le quattro coppie ce la fa lo stesso;
    #   * una proiezione certificata su un livello si puo' **provare** sugli altri, e vale per
    #     quelli i cui pin ci cadono davvero sopra.
    #
    # Non e' una scorciatoia: la trasformazione ricevuta viene rimisurata sui pin del livello che
    # la riceve, e se lo scarto non regge o troppi pin restano lontani, quel livello resta senza.
    per_risorsa = collections.defaultdict(list)
    for r in righe:
        maggiore, minore, _ = (int(v) for v in r['codice'].split('_')[1:])
        per_risorsa[(maggiore, minore)].append(r)

    def pin_di(r):
        mappa = per_codice[r['codice']]
        f = r['fattoreScala']
        return numpy.array([[mappa['pins'][i]['x']*f, mappa['pins'][i]['y']*f]
                            for i in r['pinCollocabili']], dtype=float)

    def prova(r, p, campo):
        """Rimisura la trasformazione `p` sui pin di `r`: quanti ci cadono sopra e con che scarto."""
        voci = punti_del_campo(campo)
        if not voci:
            return None
        larghezza, altezza = r['dimensione']
        diagonale = (larghezza**2 + altezza**2) ** 0.5
        pin = pin_di(r)
        w = numpy.array([[v['xyz'][0], v['xyz'][2]] for v in voci], dtype=float)
        if p['scambiaAssi']:
            w = w[:, ::-1].copy()
        w[:, 0] *= p['segnoX']
        w[:, 1] *= p['segnoY']
        proiettati = w*p['scala'] + numpy.array(p['traslazione'], dtype=float)
        distanze = numpy.hypot(proiettati[:, None, 0] - pin[None, :, 0],
                               proiettati[:, None, 1] - pin[None, :, 1])
        vicino, minime = distanze.argmin(0), distanze.min(0)
        buone = minime <= VICINANZA*diagonale
        if buone.sum() < max(1, math.ceil(QUOTA_EREDITA*len(pin))):
            return None
        scarto = float(minime[buone].mean()/diagonale)
        if scarto > SCARTO:
            return None
        return dict(p, coppie=int(buone.sum()), scarto=round(scarto, 5),
                    accoppiamenti=[[int(i), int(vicino[i])] for i in range(len(pin)) if buone[i]])

    campi_del_maggiore = collections.defaultdict(list)
    for m in meta['maps']:
        maggiore = int(m['code'].split('_')[1])
        for nome in m['fields']:
            if nome not in campi_del_maggiore[maggiore]:
                campi_del_maggiore[maggiore].append(nome)

    def cerca_campi(nomi, pin, diagonale):
        trovati = []
        for nome in nomi:
            campo = campi.get(nome)
            if not campo:
                continue
            voci = punti_del_campo(campo)
            if len(voci) < COPPIE_MINIME:
                continue
            mondo = numpy.array([[v['xyz'][0], v['xyz'][2]] for v in voci], dtype=float)
            esito = stima(mondo, pin, diagonale)
            if esito and esito['scarto'] <= SCARTO:
                trovati.append(dict(esito, campo=nome))
        return trovati

    aggregate = ereditate = 0
    for chiave_risorsa in sorted(per_risorsa):
        gruppo = per_risorsa[chiave_risorsa]
        membri = [r for r in gruppo if 'pinCollocabili' in r]
        if not membri:
            continue
        sorgenti = [r for r in membri if r['esito'] == 'certificata']
        origine = None
        if sorgenti:
            migliore = min(sorgenti, key=lambda r: r['proiezione']['scarto'])
            origine = dict(proiezione=migliore['proiezione'], da=migliore['chiave'], modo='livello-gemello')
        elif len({tuple(r['dimensione']) for r in membri}) == 1:
            # nessun livello ce la fa da solo: si tenta la stima sui pin di tutti insieme
            larghezza, altezza = membri[0]['dimensione']
            diagonale = (larghezza**2 + altezza**2) ** 0.5
            uniti = numpy.vstack([pin_di(r) for r in membri])
            nomi_campo = []
            for r in membri:
                for nome in per_codice[r['codice']]['fields']:
                    if nome not in nomi_campo:
                        nomi_campo.append(nome)
            candidati = cerca_campi(nomi_campo, uniti, diagonale)
            if not candidati:
                # nessun campo dichiarato regge: si prova con tutti i campi del Palazzo
                allargati = [n for n in campi_del_maggiore.get(chiave_risorsa[0], []) if n not in nomi_campo]
                candidati = cerca_campi(allargati, uniti, diagonale)
                for c in candidati:
                    c['campoAllargato'] = True
            if candidati:
                migliore = min(candidati, key=lambda c: c['scarto'])
                origine = dict(proiezione=migliore, da=None, modo='livelli-uniti',
                               pinUniti=int(len(uniti)), livelli=len(membri))
        if not origine:
            continue
        campo = campi.get(origine['proiezione']['campo'])
        if not campo:
            continue
        for r in membri:
            if r['esito'] == 'certificata':
                continue
            misura = prova(r, origine['proiezione'], campo)
            if not misura:
                continue
            misura['stimataSu'] = origine['modo']
            if origine['da']:
                misura['ereditataDa'] = origine['da']
            if origine.get('pinUniti'):
                misura['pinUniti'] = origine['pinUniti']
                misura['livelliUniti'] = origine['livelli']
            r.update(esito='certificata', motivo=None, alternative=r.get('alternative', 0),
                     proiezione=misura)
            if origine['modo'] == 'livelli-uniti':
                aggregate += 1
            else:
                ereditate += 1

    certificate = [r for r in righe if r['esito'] == 'certificata']
    risultato = dict(
        schemaVersion=1,
        sources=dict(metadati='mondo_metadati.json', connessioni='campi-completi/connessioni.json',
                     riferimento='riferimento-pin.json'),
        criterio=dict(scartoMassimo=SCARTO, coppieMinime=COPPIE_MINIME, vicinanza=VICINANZA,
                      forma='similitudine ad assi allineati: scala uniforme, scambio e ribaltamento degli assi, traslazione',
                      applicazione='pixel = mondo(x,z) trasformato; vale solo per le mappe certificate'),
        mappe=righe,
        summary=dict(mappe=len(righe), certificate=len(certificate), daLivelliUniti=aggregate,
                     conCampoAllargato=sum(1 for r in certificate
                                          if r['proiezione'].get('campoAllargato')), ereditate=ereditate,
                     coppie=sum(r['proiezione']['coppie'] for r in certificate),
                     scartoMediano=sorted(r['proiezione']['scarto'] for r in certificate)[len(certificate)//2] if certificate else None,
                     perEsito=dict(collections.Counter(r['esito'] for r in righe))),
        limits=['Una proiezione non certificata non va usata: metterebbe i pin nel posto di un altro.',
                'La similitudine ad assi allineati non copre inquadrature ruotate o prospettiche.'])
    (out/'proiezioni-mappa.json').write_text(json.dumps(risultato, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps(risultato['summary'], ensure_ascii=False, indent=1))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
