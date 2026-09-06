"""Dove porta un pin di passaggio, e in che punto della mappa di arrivo.

È il pezzo che rende il mondo uno: un pin su cui si clicca e si finisce dall'altra parte, nel
posto giusto. Serve rispondere a due domande diverse, e le fonti sono due.

**Dove si va.** Lo dicono gli script: `CALL_FIELD(maggiore, minore, sub, ingresso)` porta a quella
planimetria attraverso quell'entrata. Le chiamate sono state lette da tutti i 5443 script del
gioco (`collegamenti-script.json`).

**Quale pin ci porta.** Qui la prudenza è d'obbligo. Se una planimetria ha **un solo** pin di
passaggio e il suo campo ha **una sola** destinazione, l'abbinamento è forzato e non c'è niente da
scegliere. Se ne ha tre e tre, sapere quale va dove richiederebbe di indovinare, e allora si
lascia stare: meglio nessun collegamento che un collegamento che porta altrove.

**In che punto si arriva.** L'entrata citata dalla chiamata ha una posizione nel mondo, e dove la
planimetria di arrivo ha una proiezione certificata quella posizione diventa un punto preciso
sull'immagine. Dove la proiezione manca, il collegamento c'è lo stesso ma senza punto: si arriva
sulla mappa, non su un punto.
"""
from pathlib import Path
import collections
import json
import re
import sys

# Ingrandimento con cui si arriva: abbastanza per vedere dove si è senza perdere il contesto.
ZOOM = 3


def chiave_di(codice):
    return 'nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in codice.split('_')[1:])


def destinazioni_per_campo(collegamenti):
    per_campo = collections.defaultdict(set)
    for c in collegamenti:
        trovato = re.search(r'(\d{3})_(\d{3})_(\d{2})', c['script'])
        if not trovato:
            continue
        campo = 'F%s_%s_%s' % trovato.groups()
        for d in c['destinazioni']:
            per_campo[campo].add(tuple(d))
    return per_campo


def punto_di_arrivo(codice, ingresso, meta, campi, proiezioni):
    """Il punto sulla planimetria di arrivo, se la sua proiezione è certificata."""
    import numpy
    riga = proiezioni.get(codice)
    if not riga or riga['esito'] != 'certificata':
        return None, 'la planimetria di arrivo non ha una proiezione certificata'
    mappa = meta.get(codice)
    if not mappa:
        return None, 'la planimetria di arrivo non è nel censimento'
    campo = campi.get(riga['proiezione']['campo'])
    voci = [e for e in (campo.get('entrances') or []) if campo] if campo else []
    scelta = next((e for e in voci if e.get('entranceId') == ingresso), None) or \
        next((e for e in voci if e.get('index') == ingresso), None)
    if not scelta:
        return None, f'l’entrata {ingresso} non esiste nel campo della planimetria di arrivo'
    p = riga['proiezione']
    x, z = scelta['xyz'][0], scelta['xyz'][2]
    if p['scambiaAssi']:
        x, z = z, x
    px = x*p['segnoX']*p['scala'] + p['traslazione'][0]
    py = z*p['segnoY']*p['scala'] + p['traslazione'][1]
    larghezza, altezza = riga['dimensione']
    fx, fy = 100*px/larghezza, 100*py/altezza
    if not (0 <= fx <= 100 and 0 <= fy <= 100):
        return None, 'il punto di arrivo cade fuori dall’immagine'
    return dict(x=round(fx, 3), y=round(fy, 3), zoom=ZOOM), None


def main(out):
    out = Path(out)
    meta = {m['code']: m for m in json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))['maps']}
    con = json.loads((out/'campi-completi/connessioni.json').read_text(encoding='utf8'))
    campi = {f['field']: f for f in con['fields']}
    riferimento = {r['chiave']: r for r in
                   json.loads((out/'riferimento-pin.json').read_text(encoding='utf8'))['mappe']}
    proiezioni = {r['codice']: r for r in
                  json.loads((out/'proiezioni-mappa.json').read_text(encoding='utf8'))['mappe']}
    bordo = {int(k) for k in
             json.loads((out/'pin-di-bordo.json').read_text(encoding='utf8'))['tipiDimostrati']}
    collegamenti = json.loads((out/'collegamenti-script.json').read_text(encoding='utf8'))['chiamate']
    per_campo = destinazioni_per_campo(collegamenti)
    esistenti = set(meta)

    righe, esiti = [], collections.Counter()
    for codice, mappa in sorted(meta.items()):
        chiave = chiave_di(codice)
        rif = riferimento.get(chiave)
        if not rif or rif['esito'] != 'condiviso':
            continue
        pin = [i for i in rif['collocabili'] if mappa['pins'][i]['nativeType'] in bordo]
        if not pin:
            continue
        destinazioni = set()
        for campo in mappa['fields']:
            destinazioni |= per_campo.get(campo, set())
        # solo le destinazioni che sono planimetrie vere e diverse da questa
        mia = tuple(int(v) for v in codice.split('_')[1:])
        valide = sorted({d for d in destinazioni
                         if (d[0], d[1], d[2]) != mia and 'RMAP_%03d_%d_%d' % d[:3] in esistenti})
        if not valide:
            esiti['nessuna destinazione nota'] += len(pin)
            continue
        if len(pin) != 1 or len(valide) != 1:
            esiti['abbinamento ambiguo, lasciato senza'] += len(pin)
            continue
        maggiore, minore, sub, ingresso = valide[0]
        arrivo_codice = 'RMAP_%03d_%d_%d' % (maggiore, minore, sub)
        fattore = rif['fattoreScala']
        larghezza, altezza = rif['dimensione']
        p = mappa['pins'][pin[0]]
        punto, motivo = punto_di_arrivo(arrivo_codice, ingresso, meta, campi, proiezioni)
        righe.append(dict(
            partenza=chiave, indicePin=pin[0],
            x=round(100*p['x']*fattore/larghezza, 3), y=round(100*p['y']*fattore/altezza, 3),
            arrivo=chiave_di(arrivo_codice), ingresso=ingresso,
            punto=punto, motivoSenzaPunto=motivo,
            prova=f'la planimetria ha un solo pin di passaggio e il suo campo una sola '
                  f'destinazione, {arrivo_codice} attraverso l’entrata {ingresso}'))
        esiti['collegamento certo' if punto else 'collegamento certo, senza punto di arrivo'] += 1

    grafo = set()
    for c in collegamenti:
        trovato = re.search(r'(\d{3})_(\d{3})_(\d{2})', c['script'])
        if not trovato:
            continue
        a = (int(trovato.group(1)), int(trovato.group(2)))
        for d in c['destinazioni']:
            if (d[0], d[1]) != a:
                grafo.add((a, (d[0], d[1])))
    reciproci = sum(1 for a, b in grafo if (b, a) in grafo)

    risultato = dict(
        schemaVersion=1,
        sources=dict(collegamenti='collegamenti-script.json', proiezioni='proiezioni-mappa.json',
                     bordo='pin-di-bordo.json', riferimento='riferimento-pin.json'),
        criterio=dict(zoom=ZOOM,
                      abbinamento='solo dove è forzato: una planimetria con un solo pin di '
                                  'passaggio e una sola destinazione nota',
                      arrivo='posizione dell’entrata citata dalla chiamata, proiettata sulla '
                             'planimetria di arrivo dove la proiezione è certificata'),
        collegamenti=righe,
        grafoDelleRisorse=dict(archi=len(grafo), reciproci=reciproci),
        summary=dict(collegamentiCerti=len(righe),
                     conPuntoDiArrivo=sum(1 for r in righe if r['punto']),
                     esiti=dict(esiti), archiDelGrafo=len(grafo), archiReciproci=reciproci),
        limits=['Dove i pin di passaggio sono più d’uno e le destinazioni pure, quale porti dove '
                'non è deducibile dai conteggi: quei pin restano senza collegamento.',
                'Il grafo delle risorse dice quali planimetrie sono collegate, non da quale pin: '
                'è materiale per il seguito, non un collegamento pronto.'])
    (out/'collegamenti-mappe.json').write_text(json.dumps(risultato, ensure_ascii=False, indent=2),
                                               encoding='utf8')
    print(json.dumps(risultato['summary'], ensure_ascii=False, indent=1))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
