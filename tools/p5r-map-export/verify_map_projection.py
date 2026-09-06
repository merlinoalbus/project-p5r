"""Ricontrollo indipendente di `proiezioni-mappa.json`.

La proiezione è ciò che permette di dire che cosa sia un pin guardando il punto del campo che gli
sta sotto: se sbaglia, sbaglia tutto quello che ne discende. Qui non si crede al file — si
riapplica la trasformazione dichiarata ai punti del campo e si guarda dove finiscono.

Cinque controlli:

1. **la forma è quella dichiarata** — scala positiva, assi solo scambiati o ribaltati, e i
   parametri del file bastano da soli a rifare il conto;
2. **gli accoppiamenti sono i più vicini** — ogni pin accoppiato lo è al punto del campo che gli
   sta effettivamente più vicino, entro la distanza ammessa;
3. **lo scarto dichiarato è quello misurato**, e sta sotto la soglia;
4. **le coppie bastano**: una proiezione stimata sui propri pin ne vuole almeno `COPPIE_MINIME`;
   una ricevuta da un livello gemello deve reggere su almeno la quota dichiarata dei pin di quel
   livello, che è il motivo per cui le si può dare credito;
5. **nessuna mappa non certificata porta con sé una proiezione usabile**: se non è provata non
   deve nemmeno sembrare disponibile.
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

    certificate = coppie = 0
    modi = collections.Counter()
    for r in dati['mappe']:
        if r['esito'] != 'certificata':
            # una mappa non certificata non deve offrire accoppiamenti a nessuno
            assert not (r.get('proiezione') or {}).get('accoppiamenti') or r['esito'] == 'certificata', \
                f'proiezione non certificata ma con accoppiamenti: {r["chiave"]}'
            continue
        p = r['proiezione']
        assert p['scala'] > 0, f'scala non positiva su {r["chiave"]}'
        assert p['segnoX'] in (1, -1) and p['segnoY'] in (1, -1), f'ribaltamento non valido su {r["chiave"]}'
        rif = riferimento[r['chiave']]
        assert rif['esito'] == 'condiviso', f'proiezione su una planimetria senza riferimento: {r["chiave"]}'
        assert r['pinCollocabili'] == rif['collocabili'], f'pin diversi da quelli certificati su {r["chiave"]}'
        assert r['fattoreScala'] == rif['fattoreScala'] and r['dimensione'] == rif['dimensione']

        campo = campi[p['campo']]
        voci = mp.punti_del_campo(campo)
        mappa = meta[r['codice']]
        larghezza, altezza = r['dimensione']
        diagonale = (larghezza**2 + altezza**2) ** 0.5
        pin = numpy.array([[mappa['pins'][i]['x']*r['fattoreScala'], mappa['pins'][i]['y']*r['fattoreScala']]
                           for i in r['pinCollocabili']], dtype=float)
        w = numpy.array([[v['xyz'][0], v['xyz'][2]] for v in voci], dtype=float)
        if p['scambiaAssi']:
            w = w[:, ::-1].copy()
        w[:, 0] *= p['segnoX']
        w[:, 1] *= p['segnoY']
        proiettati = w*p['scala'] + numpy.array(p['traslazione'], dtype=float)
        distanze = numpy.hypot(proiettati[:, None, 0] - pin[None, :, 0], proiettati[:, None, 1] - pin[None, :, 1])
        vicino, minime = distanze.argmin(0), distanze.min(0)
        buone = minime <= mp.VICINANZA*diagonale

        attesi = [[int(i), int(vicino[i])] for i in range(len(pin)) if buone[i]]
        assert p['accoppiamenti'] == attesi, f'accoppiamenti non riproducibili su {r["chiave"]}'
        assert p['coppie'] == len(attesi) == int(buone.sum()), f'numero di coppie diverso su {r["chiave"]}'
        misurato = float(minime[buone].mean()/diagonale) if buone.any() else 1.0
        assert abs(p['scarto'] - round(misurato, 5)) < 1e-9, f'scarto diverso su {r["chiave"]}'
        assert p['scarto'] <= mp.SCARTO, f'scarto oltre la soglia su {r["chiave"]}'

        modo = p.get('stimataSu', 'propria')
        modi[modo] += 1
        if modo == 'propria':
            assert p['coppie'] >= mp.COPPIE_MINIME, f'troppe poche coppie per una stima propria: {r["chiave"]}'
        else:
            # una proiezione ricevuta vale solo se regge su abbastanza pin di questo livello
            assert p['coppie'] >= max(1, math.ceil(mp.QUOTA_EREDITA*len(pin))), \
                f'proiezione ricevuta che non regge sui pin del livello: {r["chiave"]}'
            if modo == 'livello-gemello':
                assert p.get('ereditataDa'), f'proiezione ereditata senza origine: {r["chiave"]}'
        certificate += 1
        coppie += p['coppie']

    assert certificate == dati['summary']['certificate'], 'il riepilogo non conta le certificate trovate'
    assert coppie == dati['summary']['coppie'], 'il riepilogo non conta le coppie trovate'
    print('OK', certificate, 'proiezioni ricontrollate punto per punto e', coppie, 'coppie riprodotte;',
          f'{modi["propria"]} stimate sui propri pin, {modi["livelli-uniti"]} sui pin dei livelli uniti,',
          f'{modi["livello-gemello"]} ricevute da un livello gemello e riprovate')


if __name__ == '__main__':
    main(sys.argv[1])
