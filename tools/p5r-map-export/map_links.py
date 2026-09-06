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

from scrittura import scrivi_json
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


def meta_unica(destinazioni, mia, esistenti):
    """L'unica destinazione a cui portano queste chiamate, se ce n'è una sola.

    Due livelli, e la differenza non è un dettaglio. Una chiamata dice mappa **e** entrata, e
    l'entrata è ciò che decide in che punto si arriva: due entrate diverse della stessa mappa
    sono due arrivi diversi. Perciò:

    - una sola destinazione completa (mappa + entrata) → si collega con il punto d'arrivo;
    - più entrate ma **una sola mappa** → la mappa di arrivo è certa, il punto no. Si collega
      lo stesso, senza entrata e senza punto: dire dove si va è già il collegamento, e
      sceglierne una a caso metterebbe il giocatore in un punto sbagliato della mappa giusta;
    - più mappe → non si sa dove si va e non si collega niente.

    Restituisce `(destinazione, esito)`, dove la destinazione è `[maggiore, minore, sub, entrata]`
    con entrata `None` quando è ignota, ed `esito` è `'entrata-ambigua'`, `'piu-mete'` o `None`.
    Chi chiama sa se sta guardando una procedura o una planimetria intera, e scrive la voce di
    riepilogo di conseguenza.
    """
    buone = sorted({tuple(d) for d in destinazioni
                    if tuple(d[:3]) != mia and 'RMAP_%03d_%d_%d' % tuple(d[:3]) in esistenti})
    if not buone:
        return None, None
    if len(buone) == 1:
        return list(buone[0]), None
    mappe = {d[:3] for d in buone}
    if len(mappe) == 1:
        return list(next(iter(mappe))) + [None], 'entrata-ambigua'
    return None, 'piu-mete'


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
    if ingresso is None:
        return None, ('le chiamate citano più entrate della stessa planimetria: la mappa di '
                      'arrivo è certa, il punto d’arrivo no')
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
    scartate = []
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
                ordinati = sorted(pin, key=lambda q: (q[1]-px)**2 + (q[2]-py)**2)
                vicino = ordinati[0]
                distanza = ((vicino[1]-px)**2 + (vicino[2]-py)**2) ** 0.5 / diagonale
                secondo = (((ordinati[1][1]-px)**2 + (ordinati[1][2]-py)**2) ** 0.5 / diagonale
                           if len(ordinati) > 1 else None)
                if distanza > DISTANZA_ABBINAMENTO:
                    esiti['trigger troppo lontano da ogni pin'] += 1
                    # La distanza scartata si conserva. Una soglia si giudica dai numeri che
                    # taglia: se gli scarti si affollano appena oltre, la soglia è stretta e sta
                    # buttando via abbinamenti buoni; se stanno lontani, sta facendo il suo
                    # mestiere. Senza questi numeri l'unico modo di saperlo è allargarla e vedere
                    # che succede, che è il modo sbagliato.
                    scartate.append(dict(distanza=round(distanza, 4),
                                         secondo=round(secondo, 4) if secondo else None))
                    continue
                scelta, esito = meta_unica(destinazioni, mia, esistenti)
                if esito == 'piu-mete':
                    esiti['procedura con piu’ mete, lasciata senza'] += 1
                elif esito == 'entrata-ambigua':
                    esiti['procedura con una meta sola ma piu’ entrate'] += 1
                if scelta is None:
                    continue
                precedente = assegnati.get(vicino[0])
                if precedente and precedente[1] <= distanza:
                    continue
                assegnati[vicino[0]] = (scelta, distanza,
                                        f'il trigger che chiama il movimento cade a '
                                        f'{round(distanza*100, 1)}% della tela da questo pin',
                                        'trigger proiettato')

        # 2. Dove la proiezione non arriva: se la planimetria ha **una sola meta**, ogni suo pin
        #    di passaggio porta li'. Non c'e' niente da abbinare — la destinazione e' una, e
        #    qualunque uscita si prenda si finisce nello stesso posto.
        destinazioni = set()
        for nome_campo in mappa['fields']:
            destinazioni |= per_campo.get(nome_campo, set())
        scelta_unica, esito = meta_unica(destinazioni, mia, esistenti)
        if esito == 'piu-mete':
            esiti['planimetria con piu’ mete, nessun abbinamento forzato'] += 1
        elif esito == 'entrata-ambigua':
            esiti['planimetria con una meta sola ma piu’ entrate'] += 1
        if scelta_unica is not None:
            for indice in indici:
                if indice in assegnati:
                    continue
                assegnati[indice] = (scelta_unica, None,
                                     'la planimetria ha una sola meta, quindi ogni suo pin di '
                                     'passaggio porta li’',
                                     'meta unica della planimetria')

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
                             'planimetria di arrivo dove la proiezione è certificata',
                      # Le distanze che la soglia ha tagliato, in ordine. Servono a giudicarla:
                      # se si affollassero appena oltre, la soglia starebbe buttando via
                      # abbinamenti buoni e andrebbe allargata *con questa prova in mano*.
                      distanzeScartate=sorted(scartate, key=lambda s: s['distanza']),
                      scartateSottoIlDoppio=sum(1 for s in scartate
                                                if s['distanza'] <= DISTANZA_ABBINAMENTO*2),
                      # Quanti scarti hanno il secondo pin almeno tre volte più lontano del primo:
                      # lì la scelta è netta anche se la distanza assoluta è grande, e un criterio
                      # di margine li recupererebbe senza inventare nulla.
                      scartateConMargineNetto=sum(1 for s in scartate
                                                  if s['secondo'] and s['secondo'] >= s['distanza']*3)),
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
    scrivi_json(out/'collegamenti-mappe.json', risultato)
    print(json.dumps(risultato['summary'], ensure_ascii=False, indent=1))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
