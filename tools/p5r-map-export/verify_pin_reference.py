"""Ricontrollo indipendente di `riferimento-pin.json`.

Rilegge i pin e le immagini dalle fonti e ricalcola, senza usare `pin_reference`, la distanza di
ogni pin dal tratto della planimetria. Poi controlla le affermazioni una per una:

* la copertura — tutte e 301 le planimetrie compaiono, ognuna una volta;
* i conti — pin dichiarati, collocabili ed esclusi corrispondono a quelli ricalcolati;
* le mappe condivise — ogni pin dichiarato collocabile sta davvero sulla tela, dentro il riquadro
  del disegno e vicino al tratto, e la mediana dichiarata è quella misurata;
* i fattori di scala — un fattore diverso da uno deve essere davvero molto meglio della scala uno,
  altrimenti sposterebbe i pin senza motivo;
* le mappe non condivise — devono davvero fallire almeno una prova, così nessuna viene scartata
  per eccesso di prudenza.
"""
from pathlib import Path
import json
import re
import sys


import pin_reference as pr


def main(out):
    import numpy
    from PIL import Image
    out = Path(out)
    atteso = json.loads((out/'riferimento-pin.json').read_text(encoding='utf8'))
    meta = json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    manifest = json.loads((out/'manifest.json').read_text(encoding='utf8'))
    native = Path(__file__).resolve().parents[2]/'public/asset/mappe/native'
    criterio = atteso['criterio']
    vicino, lontano = criterio['vicino'], criterio['lontano']
    quota_minima, miglioramento = criterio['quotaCollocabili'], criterio['miglioramento']

    immagini = {}
    for e in manifest['images']:
        m = re.search(r'ROADMAP/(RMAP_\d+_\d+_\d+)\.DDS$', e['source'])
        if m:
            immagini[m.group(1)] = e
    per_codice = {r['codice']: r for r in atteso['mappe']}
    assert len(per_codice) == len(atteso['mappe']) == 301, 'planimetrie mancanti o ripetute'

    # Il tratto di riferimento e' quello dei livelli della stessa risorsa messi insieme, dove
    # condividono la tela: qui l'unione si ricostruisce da capo dalle immagini, senza fidarsi.
    maschere = {}
    for mappa in meta['maps']:
        c = 'nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in mappa['code'].split('_')[1:])
        maschere[mappa['code']] = numpy.array(
            Image.open(native/(c + '.png')).convert('RGBA').getchannel('A')) > 0
    per_risorsa = {}
    for codice, m in maschere.items():
        maggiore, minore, _ = (int(v) for v in codice.split('_')[1:])
        per_risorsa.setdefault((maggiore, minore, m.shape), []).append(codice)
    unione = {}
    for insieme in per_risorsa.values():
        if len(insieme) < 2:
            continue
        somma = numpy.zeros_like(maschere[insieme[0]])
        for c in insieme:
            somma |= maschere[c]
        for c in insieme:
            unione[c] = somma

    controllati = collocati = 0
    for mappa in meta['maps']:
        r = per_codice[mappa['code']]
        chiave = 'nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in mappa['code'].split('_')[1:])
        assert r['chiave'] == chiave
        pin = mappa['pins']
        assert r['pin'] == len(pin), f'numero di pin diverso su {chiave}'
        if not pin:
            assert r['esito'] == 'senza-pin'
            continue
        immagine = immagini[mappa['code']]
        maschera = maschere[mappa['code']]
        larghezza, altezza = immagine['width'], immagine['height']
        assert maschera.shape == (altezza, larghezza), f'PNG di dimensioni diverse: {chiave}'
        x0, y0, x1, y1 = r.get('riquadroContenuto') or immagine['alpha_bbox']
        diagonale = (larghezza**2 + altezza**2) ** 0.5
        margine = criterio['margineTela'] * diagonale
        tratto = unione.get(mappa['code'])
        atteso_tratto = 'livelli della risorsa uniti' if tratto is not None else 'solo questo livello'
        assert r.get('tratto') == atteso_tratto, f'tratto di riferimento diverso su {chiave}'
        ys, xs = numpy.nonzero(tratto if tratto is not None else maschera)

        def distanze(fattore):
            return [float(numpy.hypot(xs - p['x']*fattore, ys - p['y']*fattore).min())/diagonale for p in pin]

        def mediana(v):
            return sorted(v)[len(v)//2] if v else 1.0

        fattore = r.get('fattoreScala', 1.0)
        # oltre alle potenze di due e' ammesso il fattore suggerito dai dati, che va pero'
        # ricalcolato qui e ritrovato uguale
        suggerito = pr.fattore_suggerito(pin, (x0, y0, x1, y1))
        assert r.get('fattoreSuggerito') == suggerito, f'fattore suggerito diverso su {chiave}'
        assert fattore in criterio['fattori'] or fattore == suggerito,             f'fattore fuori dall’elenco e diverso da quello suggerito su {chiave}'
        base = mediana(distanze(1.0))
        if fattore != 1.0:
            scelto = mediana(distanze(fattore))
            assert base > vicino/4, f'fattore cambiato pur andando bene a scala uno: {chiave}'
            assert scelto * miglioramento <= base, f'fattore non giustificato dal miglioramento: {chiave}'
        d = distanze(fattore)
        dentro = [i for i, p in enumerate(pin)
                  if 0 <= p['x']*fattore <= larghezza and 0 <= p['y']*fattore <= altezza
                  and x0 - margine <= p['x']*fattore <= x1 + margine
                  and y0 - margine <= p['y']*fattore <= y1 + margine and d[i] <= lontano]
        med = mediana([d[i] for i in dentro])
        quota = len(dentro)/len(pin)
        # con un solo pin appoggiato la prova sta nel confronto con il fondo, e va rifatta qui
        solo_debole = False
        if len(dentro) == 1:
            gx, gy = numpy.meshgrid(numpy.linspace(x0, x1, criterio['passoFondo']),
                                    numpy.linspace(y0, y1, criterio['passoFondo']))
            campione = numpy.stack([gx.ravel(), gy.ravel()], 1)
            fondo = [float(numpy.hypot(xs - c[0], ys - c[1]).min())/diagonale for c in campione]
            solo_debole = sum(1 for f in fondo if f <= med)/len(fondo) > criterio['frazioneFondo']
        atteso_esito = 'condiviso' if (med <= vicino and quota >= quota_minima and not solo_debole)             else 'non-condiviso'
        assert r['esito'] == atteso_esito, f'esito diverso su {chiave}: {r["esito"]} invece di {atteso_esito}'
        if atteso_esito == 'condiviso':
            assert r['collocabili'] == dentro, f'elenco dei pin collocabili diverso su {chiave}'
            assert r['numeroCollocabili'] == len(dentro) and r['esclusi'] == len(pin) - len(dentro)
            assert abs(r['distanzaMediana'] - round(med, 4)) < 1e-9, f'mediana diversa su {chiave}'
            for i in dentro:
                assert d[i] <= lontano, f'pin collocabile lontano dal tratto su {chiave}'
            collocati += len(dentro)
        else:
            assert med > vicino or quota < quota_minima or solo_debole,                 f'mappa scartata senza motivo: {chiave}'
            assert not r['collocabili'], f'mappa non condivisa con pin collocabili: {chiave}'
        controllati += 1

    s = atteso['summary']
    assert s['condivise'] == sum(1 for r in atteso['mappe'] if r['esito'] == 'condiviso')
    assert s['pinConvertibili'] == collocati, 'il totale dei pin convertibili non torna'
    assert s['pinTotali'] == sum(len(m['pins']) for m in meta['maps'])
    print('OK', controllati, 'planimetrie con pin ricontrollate;', s['condivise'], 'condividono il riferimento e',
          collocati, 'pin sono collocabili;', s['conFattoreDiverso'], 'mappe hanno i pin in un’altra risoluzione')


if __name__ == '__main__':
    main(sys.argv[1])
