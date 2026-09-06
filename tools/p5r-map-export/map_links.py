"""Dove porta un pin di passaggio, e in che punto della mappa di arrivo.

È il pezzo che rende il mondo uno: un pin su cui si clicca e si finisce dall'altra parte, nel
posto giusto. Serve rispondere a due domande diverse, e le fonti sono due.

**Dove si va.** Lo dicono gli script: `CALL_FIELD(maggiore, minore, sub, ingresso)` porta a quella
planimetria attraverso quell'entrata. Le chiamate sono state lette da tutti i 5443 script del
gioco (`collegamenti-script.json`).

**Quale pin ci porta.** Il trigger che chiama `CALL_FIELD` ha una posizione nel mondo, e dove la
planimetria di partenza ha una proiezione certificata quella posizione diventa un punto
sull'immagine: il pin di passaggio che gli sta più vicino è quello che porta lì. Non è un
indovinello — è il punto in cui il gioco fa scattare il movimento, misurato sulla stessa
planimetria. Oltre la distanza ammessa non si abbina niente.

Resta il caso in cui la planimetria ha un solo pin di passaggio e il suo campo una sola
destinazione: lì l'abbinamento è forzato e vale anche senza proiezione.

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
# Quanto puo' distare, in frazione della diagonale, il trigger dal pin perche' si possa dire
# che sia quello: oltre, il pin piu' vicino e' solo il meno lontano.
DISTANZA_ABBINAMENTO = 0.08


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

    def destinazioni_per_procedura(collegamenti):
        fuori = {}
        for c in collegamenti:
            trovato = re.search(r'(\d{3})_(\d{3})_(\d{2})', c['script'])
            if trovato:
                fuori[('F%s_%s_%s' % trovato.groups(), c['procedura'])] = c['destinazioni']
        return fuori

    per_procedura = destinazioni_per_procedura(collegamenti)
    righe, esiti = [], collections.Counter()
    for codice, mappa in sorted(meta.items()):
        chiave = chiave_di(codice)
        rif = riferimento.get(chiave)
        if not rif or rif['esito'] != 'condiviso':
            continue
        indici = [i for i in rif['collocabili'] if mappa['pins'][i]['nativeType'] in bordo]
        if not indici:
            continue
        fattore = rif['fattoreScala']
        larghezza, altezza = rif['dimensione']
        diagonale = (larghezza**2 + altezza**2) ** 0.5
        pin = [(i, mappa['pins'][i]['x']*fattore, mappa['pins'][i]['y']*fattore) for i in indici]
        mia = tuple(int(v) for v in codice.split('_')[1:])
        riga_proiezione = proiezioni.get(codice)
        assegnati = {}

        # 1. dove la proiezione regge: il trigger che chiama CALL_FIELD si porta sull'immagine, e
        #    il pin di passaggio piu' vicino e' quello che fa scattare quel movimento
        if riga_proiezione and riga_proiezione['esito'] == 'certificata':
            p = riga_proiezione['proiezione']
            campo = campi.get(p['campo'])
            nomi = [q['name'] for q in campo['procedures']] if campo else []
            for t in (campo['triggers'] if campo else []):
                posizione = t.get('position')
                if not posizione:
                    continue
                i = t.get('procedureIndex')
                nome = nomi[i] if isinstance(i, int) and 0 <= i < len(nomi) else None
                destinazioni = per_procedura.get((p['campo'], nome)) if nome else None
                if not destinazioni:
                    continue
                x, z = posizione['xyz'][0], posizione['xyz'][2]
                if p['scambiaAssi']:
                    x, z = z, x
                px = x*p['segnoX']*p['scala'] + p['traslazione'][0]
                py = z*p['segnoY']*p['scala'] + p['traslazione'][1]
                vicino = min(pin, key=lambda q: (q[1]-px)**2 + (q[2]-py)**2)
                distanza = ((vicino[1]-px)**2 + (vicino[2]-py)**2) ** 0.5 / diagonale
                if distanza > DISTANZA_ABBINAMENTO:
                    esiti['trigger troppo lontano da ogni pin'] += 1
                    continue
                scelta = next((d for d in destinazioni
                               if tuple(d[:3]) != mia and 'RMAP_%03d_%d_%d' % tuple(d[:3]) in esistenti),
                              None)
                if not scelta:
                    continue
                precedente = assegnati.get(vicino[0])
                if precedente and precedente[1] <= distanza:
                    continue
                assegnati[vicino[0]] = (scelta, distanza,
                                        f'il trigger che chiama il movimento cade a '
                                        f'{round(distanza*100, 1)}% della tela da questo pin',
                                        'trigger proiettato')

        # 2. dove non regge, resta il caso forzato: un pin, una destinazione
        if not assegnati and len(indici) == 1:
            destinazioni = set()
            for nome_campo in mappa['fields']:
                destinazioni |= per_campo.get(nome_campo, set())
            valide = sorted({d for d in destinazioni
                             if tuple(d[:3]) != mia and 'RMAP_%03d_%d_%d' % tuple(d[:3]) in esistenti})
            if len(valide) == 1:
                assegnati[indici[0]] = (list(valide[0]), None,
                                        'la planimetria ha un solo pin di passaggio e il suo '
                                        'campo una sola destinazione',
                                        'un solo pin, una sola destinazione')

        for indice, (scelta, distanza, motivo, modo) in sorted(assegnati.items()):
            maggiore, minore, sub, ingresso = scelta
            arrivo_codice = 'RMAP_%03d_%d_%d' % (maggiore, minore, sub)
            punto, senza = punto_di_arrivo(arrivo_codice, ingresso, meta, campi, proiezioni)
            p_pin = mappa['pins'][indice]
            righe.append(dict(
                partenza=chiave, indicePin=indice,
                x=round(100*p_pin['x']*fattore/larghezza, 3),
                y=round(100*p_pin['y']*fattore/altezza, 3),
                arrivo=chiave_di(arrivo_codice), ingresso=ingresso,
                punto=punto, motivoSenzaPunto=senza, modo=modo,
                distanza=round(distanza, 4) if distanza is not None else None,
                prova=motivo))
            esiti['collegato' if punto else 'collegato, senza punto di arrivo'] += 1
        senza_collegamento = len(indici) - len(assegnati)
        if senza_collegamento:
            esiti['pin di passaggio senza destinazione'] += senza_collegamento

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
                      distanzaAbbinamento=DISTANZA_ABBINAMENTO,
                      abbinamento='il pin più vicino al trigger che chiama il movimento, entro la '
                                  'distanza ammessa; in mancanza di proiezione, solo il caso '
                                  'forzato di un pin e una destinazione',
                      arrivo='posizione dell’entrata citata dalla chiamata, proiettata sulla '
                             'planimetria di arrivo dove la proiezione è certificata'),
        collegamenti=righe,
        grafoDelleRisorse=dict(archi=len(grafo), reciproci=reciproci),
        summary=dict(collegamenti=len(righe),
                     perModo=dict(collections.Counter(r['modo'] for r in righe)),
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
