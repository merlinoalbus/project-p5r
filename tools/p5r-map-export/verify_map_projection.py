"""Ricontrollo indipendente di `proiezioni-mappa.json`.

La proiezione è ciò che permette di dire che cosa sia un pin guardando il punto del campo che gli
sta sotto: se sbaglia, sbaglia tutto quello che ne discende. Qui non si crede al file — si
riapplica la trasformazione dichiarata ai punti del campo e si guarda dove finiscono.

Sette controlli:

1. **la forma è quella dichiarata** — scala positiva, assi solo scambiati o ribaltati, e i
   parametri del file bastano da soli a rifare il conto;
2. **l'abbinamento è uno a uno** — nessun punto del campo compare sotto due pin, e l'insieme delle
   coppie è quello che l'assegnazione di costo minimo produce, non un nearest-neighbour;
3. **lo scarto dichiarato è quello misurato**, e sta sotto la soglia;
4. **le coppie bastano**: una proiezione stimata sui propri pin ne vuole almeno `COPPIE_MINIME`;
   una ricevuta da un livello gemello deve reggere su almeno la quota dichiarata dei pin di quel
   livello, che è il motivo per cui le si può dare credito;
5. **la stabilità è ricalcolata**: per ogni coppia dichiarata stabile si ristima la trasformazione
   senza quel pin e si controlla che il pin torni sullo stesso punto — e che nessuna coppia
   instabile sia stata dichiarata stabile;
6. **il campo è dichiarato dalla mappa**, o dal gruppo di livelli da cui la proiezione arriva:
   nessuna proiezione può appoggiarsi a un campo che quella planimetria non nomina;
7. **i riferimenti noti si ritrovano** — dove il gioco dichiara la trasformazione, la stima deve
   riprodurla, e la convalida scritta nel file deve dirlo.

E nessuna mappa non certificata deve portare con sé una proiezione usabile.
"""
from pathlib import Path
import collections
import json
import math
import sys

import map_projection as mp


def main(out):
    import numpy
    out = Path(out)
    dati = json.loads((out/'proiezioni-mappa.json').read_text(encoding='utf8'))
    meta = {m['code']: m for m in json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))['maps']}
    con = json.loads((out/'campi-completi/connessioni.json').read_text(encoding='utf8'))
    campi = {f['field']: f for f in con['fields']}
    riferimento = {r['chiave']: r for r in json.loads((out/'riferimento-pin.json').read_text(encoding='utf8'))['mappe']}

    # campi nominati da ciascuna risorsa: una proiezione ricevuta da un livello gemello puo'
    # appoggiarsi a un campo che un altro livello della stessa risorsa dichiara, non ad altri
    campi_della_risorsa = collections.defaultdict(set)
    for codice, m in meta.items():
        maggiore, minore, _ = (int(v) for v in codice.split('_')[1:])
        campi_della_risorsa[(maggiore, minore)].update(m['fields'])

    certificate = coppie = stabili = 0
    modi = collections.Counter()
    for r in dati['mappe']:
        if r['esito'] != 'certificata':
            # una stima scartata resta nel file per trasparenza, ma non deve avere nulla di
            # utilizzabile: niente coppie stabili, e il motivo del rifiuto scritto
            assert r.get('motivo'), f'proiezione scartata senza motivo: {r["chiave"]}'
            assert not (r.get('proiezione') or {}).get('stabili'),                 f'proiezione non certificata con coppie dichiarate stabili: {r["chiave"]}'
            continue
        p = r['proiezione']
        assert p['scala'] > 0, f'scala non positiva su {r["chiave"]}'
        assert p['segnoX'] in (1, -1) and p['segnoY'] in (1, -1), f'ribaltamento non valido su {r["chiave"]}'
        rif = riferimento[r['chiave']]
        assert rif['esito'] == 'condiviso', f'proiezione su una planimetria senza riferimento: {r["chiave"]}'
        assert r['pinCollocabili'] == rif['collocabili'], f'pin diversi da quelli certificati su {r["chiave"]}'
        assert r['fattoreScala'] == rif['fattoreScala'] and r['dimensione'] == rif['dimensione']

        maggiore, minore, _ = (int(v) for v in r['codice'].split('_')[1:])
        assert p['campo'] in campi_della_risorsa[(maggiore, minore)], \
            f'la proiezione usa un campo che nessun livello della risorsa dichiara: {r["chiave"]}'

        mappa = meta[r['codice']]
        larghezza, altezza = r['dimensione']
        diagonale = (larghezza**2 + altezza**2) ** 0.5
        pin = numpy.array([[mappa['pins'][i]['x']*r['fattoreScala'], mappa['pins'][i]['y']*r['fattoreScala']]
                           for i in r['pinCollocabili']], dtype=float)
        voci = mp.punti_del_campo(campi[p['campo']])
        mondo = numpy.array([[v['xyz'][0], v['xyz'][2]] for v in voci], dtype=float)
        w, proiettati = mp._applica(mondo, p['scambiaAssi'], p['segnoX'], p['segnoY'],
                                    p['scala'], p['traslazione'])
        assegnato, misure = mp.accoppia(proiettati, pin, mp.VICINANZA*diagonale)
        buoni = numpy.nonzero(assegnato >= 0)[0]

        attesi = [[int(i), int(assegnato[i])] for i in buoni]
        assert p['accoppiamenti'] == attesi, f'accoppiamenti non riproducibili su {r["chiave"]}'
        punti_usati = [c[1] for c in p['accoppiamenti']]
        assert len(set(punti_usati)) == len(punti_usati), \
            f'lo stesso punto del campo sta sotto piu’ pin: {r["chiave"]}'
        assert p['coppie'] == len(attesi), f'numero di coppie diverso su {r["chiave"]}'
        misurato = float(misure[buoni].mean()/diagonale) if len(buoni) else 1.0
        assert abs(p['scarto'] - round(misurato, 5)) < 1e-9, f'scarto diverso su {r["chiave"]}'
        assert p['scarto'] <= mp.SCARTO, f'scarto oltre la soglia su {r["chiave"]}'

        modo = p.get('stimataSu', 'propria')
        modi[modo] += 1
        if modo == 'propria':
            assert p['coppie'] >= mp.COPPIE_MINIME, f'troppe poche coppie per una stima propria: {r["chiave"]}'
            assert p['campo'] in mappa['fields'], f'campo non dichiarato dalla mappa: {r["chiave"]}'
        else:
            assert p['coppie'] >= max(1, math.ceil(mp.QUOTA_EREDITA*len(pin))), \
                f'proiezione ricevuta che non regge sui pin del livello: {r["chiave"]}'
            if modo == 'livello-gemello':
                assert p.get('ereditataDa'), f'proiezione ereditata senza origine: {r["chiave"]}'

        # la stabilità si rifà da capo, coppia per coppia
        attese_stabili = mp.stabilita(mondo, pin, diagonale, p)
        assert p.get('stabili') == attese_stabili, f'coppie stabili non riproducibili su {r["chiave"]}'
        insieme = {tuple(c) for c in p['accoppiamenti']}
        for c in p['stabili']:
            assert tuple(c) in insieme, f'coppia stabile che non è fra gli accoppiamenti: {r["chiave"]}'
        certificate += 1
        coppie += p['coppie']
        stabili += len(p['stabili'])

    # la convalida sui riferimenti noti va rifatta, non letta
    noti = mp.convalida_noti(dati['mappe'])
    assert noti == dati['convalidaRiferimentiNoti'], 'la convalida dei riferimenti noti non si riproduce'
    riprodotti = [n for n in noti if n['esito'] == 'riprodotta']
    assert len(riprodotti) == len(mp.RIFERIMENTI_NOTI), \
        f'solo {len(riprodotti)} riferimenti noti su {len(mp.RIFERIMENTI_NOTI)} sono riprodotti dalla stima'

    assert certificate == dati['summary']['certificate'], 'il riepilogo non conta le certificate trovate'
    assert coppie == dati['summary']['coppie'], 'il riepilogo non conta le coppie trovate'
    assert stabili == dati['summary']['coppieStabili'], 'il riepilogo non conta le coppie stabili trovate'
    print('OK', certificate, 'proiezioni ricontrollate punto per punto,', coppie,
          'coppie riprodotte uno a uno e', stabili, 'confermate stabili;',
          f'{modi["propria"]} stimate sui propri pin, {modi["livelli-uniti"]} sui pin dei livelli uniti,',
          f'{modi["livello-gemello"]} ricevute da un livello gemello e riprovate;',
          len(riprodotti), 'riferimenti dichiarati dal gioco ritrovati dalla stima')


if __name__ == '__main__':
    main(sys.argv[1])
