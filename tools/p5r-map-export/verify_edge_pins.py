"""Ricontrollo dei pin di bordo: sono davvero le uscite, o è il criterio che se le inventa?

La deduzione è geometrica e vale solo per il divario che la sostiene: quattro tipi si accostano
ciascuno a un lato diverso molto più di quanto faccia qualunque tipo interno. Se quel divario si
assottiglia, la deduzione non regge più, e questo verificatore deve accorgersene.

Sette controlli:

1. **la misura si riproduce** — lati e quote si ricalcolano dalle sorgenti e devono coincidere;
2. **il divario c'è** — il migliore dei tipi interni deve stare sotto la soglia con un margine
   dichiarato, altrimenti il criterio non distingue nulla;
3. **i lati sono esclusivi** — due tipi non possono avere lo stesso lato: sarebbero la stessa
   freccia contata due volte;
4. **i lati sono tutti diversi fra loro e coprono direzioni opposte** — se uscissero tutti dallo
   stesso lato non sarebbero uscite ma un addensamento;
5. **il segnalino esiste** nel registro, e l'etichetta dice la direzione;
6. **nessun conflitto** con i tipi già dimostrati per altre strade;
7. **i collegamenti si ricostruiscono da capo** — non basta che i totali tornino: l'insieme
   atteso viene rifatto dalle sorgenti native e confrontato riga per riga con l'artefatto su
   partenza, indice del pin, arrivo, entrata, distanza, modo e punto d'arrivo. Cambiando a mano
   uno solo di quei campi il controllo deve cadere, e cade: è stato provato manomettendone uno
   alla volta.
"""
from pathlib import Path
import collections
import json
import re
import sys

import edge_pins as ep


def tipi_spillo_del_registro(radice):
    testo = (radice/'shared/spilli.ts').read_text(encoding='utf8')
    elenco = re.search(r'TIPI_SPILLO\s*=\s*\[(.*?)\]', testo, re.S)
    assert elenco, 'registro dei tipi di spillo non trovato'
    return set(re.findall(r"'([a-z0-9-]+)'", elenco.group(1)))


def main(out, radice=None):
    out = Path(out)
    radice = Path(radice) if radice else Path(__file__).resolve().parents[2]
    dati = json.loads((out/'pin-di-bordo.json').read_text(encoding='utf8'))
    semantica = {r['tipoNativo']: r for r in
                 json.loads((out/'semantica-pin.json').read_text(encoding='utf8'))['tipi']}
    registro = tipi_spillo_del_registro(radice)

    # 1. la misura si riproduce
    lati, fuori, _posizioni = ep.misura(out)
    for chiave, atteso in dati['tipi'].items():
        tipo = int(chiave)
        conta = lati[tipo]
        totale = sum(conta.values())
        lato, quante = conta.most_common(1)[0]
        assert totale == atteso['pin'], f'numero di pin diverso per il tipo {tipo}'
        assert lato == atteso['lato'], f'lato diverso per il tipo {tipo}'
        assert abs(quante/totale - atteso['quotaLato']) < 1e-3, f'quota diversa per il tipo {tipo}'

    dimostrati = {int(k): v for k, v in dati['tipiDimostrati'].items()}
    assert dimostrati, 'nessun tipo di bordo dimostrato: il file non serve a niente'

    # 2. il divario
    interni = {t: v for t, v in dati['tipi'].items() if int(t) not in dimostrati}
    massimo = max((v['quotaLato'] for v in interni.values()), default=0.0)
    assert massimo < ep.QUOTA_LATO, \
        (f'un tipo interno arriva al {massimo:.0%}, cioè alla soglia: il criterio non distingue '
         'più le uscite dal resto')
    minimo_dimostrati = min(dati['tipi'][str(t)]['quotaLato'] for t in dimostrati)
    assert minimo_dimostrati - massimo >= 0.1, \
        (f'il divario fra il peggiore dei tipi di bordo ({minimo_dimostrati:.0%}) e il migliore '
         f'degli interni ({massimo:.0%}) è troppo stretto per fondarci una prova')

    # 3 e 4. lati esclusivi e diversi
    per_lato = collections.Counter(v['lato'] for v in dimostrati.values())
    for lato, quanti in per_lato.items():
        assert quanti == 1, f'due tipi dichiarati sullo stesso lato: {lato}'
    assert len(per_lato) >= 2, 'le uscite dichiarate stanno tutte dallo stesso lato'
    opposti = {('alto', 'basso'), ('destra', 'sinistra')}
    assert any(a in per_lato and b in per_lato for a, b in opposti), \
        'nessuna coppia di lati opposti: non sembrano direzioni di uscita'

    # 5 e 6. segnalino e coerenza con le altre strade
    for tipo, v in sorted(dimostrati.items()):
        assert v['tipoSpillo'] in registro, f'tipo di segnalino fuori registro: {v["tipoSpillo"]}'
        assert v['lato'] in v['etichetta'].lower() or 'passaggio' in v['etichetta'].lower(), \
            f'etichetta che non dice la direzione: {v["etichetta"]}'
        altra = semantica.get(tipo)
        if altra and altra['stato'] == 'determinato' and \
                not (altra.get('prova') or '').startswith('posizione sul bordo'):
            assert altra['tipoSpillo'] == v['tipoSpillo'], \
                (f'il tipo {tipo} risulta «{v["tipoSpillo"]}» dalla posizione e '
                 f'«{altra["tipoSpillo"]}» per un’altra strada')

    coperti = sum(v['pin'] for v in dimostrati.values())
    print('OK', len(dimostrati), 'tipi riconosciuti come uscite dalla posizione sul bordo,',
          coperti, 'pin;', 'lati:', ', '.join(f"{v['lato']} ({dati['tipi'][str(t)]['quotaLato']:.0%})"
                                              for t, v in sorted(dimostrati.items())),
          f'— il migliore dei tipi interni si ferma al {massimo:.0%}')
    collegati, irrisolti = controlla_collegamenti(out)
    if collegati or irrisolti:
        print('OK contabilita’ dei collegamenti:', collegati, 'pin portano a una mappa e',
              irrisolti, 'restano senza, nessuno scelto fra piu’ mete ne’ fra piu’ entrate')


MODI_AMMESSI = ('trigger proiettato', 'meta unica della planimetria')


def _proietta(p, xyz):
    """Un punto del mondo portato sull'immagine, con la similitudine certificata per quel campo."""
    x, z = xyz[0], xyz[2]
    if p['scambiaAssi']:
        x, z = z, x
    return x*p['segnoX']*p['scala'] + p['traslazione'][0], z*p['segnoY']*p['scala'] + p['traslazione'][1]


def _destinazione_unica(destinazioni, mia, esistenti):
    """La sola destinazione a cui portano queste chiamate, riscritta qui per non fidarsi.

    Stessa regola del generatore, formulata da capo: prima si tengono solo le chiamate che portano
    davvero altrove e su una planimetria censita, poi si guarda quante destinazioni **complete**
    (mappa più entrata) restano. Una sola: arrivo con punto. Più entrate di una sola mappa: la
    mappa è certa, l'entrata no, e l'entrata resta `None`. Più mappe: niente.
    """
    buone = sorted({tuple(d) for d in destinazioni
                    if tuple(d[:3]) != mia and 'RMAP_%03d_%d_%d' % tuple(d[:3]) in esistenti})
    if not buone:
        return None
    if len(buone) == 1:
        return buone[0]
    mappe = {d[:3] for d in buone}
    return (mappe.pop() + (None,)) if len(mappe) == 1 else None


def _atteso_da_trigger(codice, mappa, rif, proiezione, campi, per_procedura, esistenti,
                       bordo, soglia):
    """Le assegnazioni che i trigger di questa planimetria devono produrre, ricalcolate qui.

    Non si chiama il generatore: si ricostruisce l'insieme atteso dalle stesse sorgenti native con
    un conto proprio. Ogni trigger che chiama un movimento viene proiettato, si misurano le
    distanze da **tutti** i pin di passaggio (non solo dal più vicino, così l'argmin è verificato e
    non assunto), si scarta oltre la soglia e per ogni pin conteso vince la distanza minore, a
    parità la prima chiamata incontrata. È la regola dichiarata dal generatore, applicata da fuori.
    """
    p = proiezione['proiezione']
    campo = campi.get(p['campo'])
    if not campo:
        return {}
    nomi = [q['name'] for q in campo['procedures']]
    fattore = rif['fattoreScala']
    larghezza, altezza = rif['dimensione']
    diagonale = (larghezza**2 + altezza**2) ** 0.5
    passaggi = [(i, mappa['pins'][i]['x']*fattore, mappa['pins'][i]['y']*fattore)
                for i in rif['collocabili'] if mappa['pins'][i]['nativeType'] in bordo]
    mia = tuple(int(v) for v in codice.split('_')[1:])
    candidati = collections.defaultdict(list)
    for ordine, t in enumerate(campo['triggers']):
        posizione = t.get('position')
        if not posizione:
            continue
        i = t.get('procedureIndex')
        nome = nomi[i] if isinstance(i, int) and 0 <= i < len(nomi) else None
        destinazioni = per_procedura.get((p['campo'], nome)) if nome else None
        if not destinazioni:
            continue
        px, py = _proietta(p, posizione['xyz'])
        misure = sorted(((((q[1]-px)**2 + (q[2]-py)**2) ** 0.5 / diagonale, q[0]) for q in passaggi))
        if not misure:
            continue
        distanza, indice = misure[0]
        if distanza > soglia:
            continue
        scelta = _destinazione_unica(destinazioni, mia, esistenti)
        if scelta is None:
            continue
        candidati[indice].append((distanza, ordine, scelta))
    return {indice: min(v)[::2] for indice, v in candidati.items()}


def controlla_collegamenti(out):
    """Ogni collegamento va ricostruito da capo, non contato.

    Un controllo che si limita ai totali lascia passare un arrivo cambiato a mano: il conto
    torna e il collegamento porta altrove. Qui l'insieme atteso viene ricostruito per intero
    dalle sorgenti native — planimetria di partenza, indice del pin, planimetria di arrivo,
    entrata, distanza, modo e punto d'arrivo — e confrontato riga per riga con l'artefatto.
    Passano solo due modi, e per quello dei trigger si riverificano la soglia, il pin più vicino
    fra tutti e la vittoria della distanza minore quando due chiamate si contendono lo stesso pin.
    """
    percorso = out/'collegamenti-mappe.json'
    if not percorso.exists():
        return 0, 0
    import map_links as ml
    dati = json.loads(percorso.read_text(encoding='utf8'))
    bordo = {int(k) for k in json.loads((out/'pin-di-bordo.json').read_text(encoding='utf8'))['tipiDimostrati']}
    meta = {m['code']: m for m in json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))['maps']}
    riferimento = {r['chiave']: r for r in
                   json.loads((out/'riferimento-pin.json').read_text(encoding='utf8'))['mappe']}
    proiezioni = {r['codice']: r for r in
                  json.loads((out/'proiezioni-mappa.json').read_text(encoding='utf8'))['mappe']}
    campi = {f['field']: f for f in
             json.loads((out/'campi-completi/connessioni.json').read_text(encoding='utf8'))['fields']}
    chiamate = json.loads((out/'collegamenti-script.json').read_text(encoding='utf8'))['chiamate']

    per_campo, per_procedura = collections.defaultdict(set), {}
    for c in chiamate:
        t = re.search(r'(\d{3})_(\d{3})_(\d{2})', c['script'])
        if not t:
            continue
        campo = 'F%s_%s_%s' % t.groups()
        per_procedura[(campo, c['procedura'])] = c['destinazioni']
        for d in c['destinazioni']:
            per_campo[campo].add(tuple(d))

    esistenti = set(meta)
    atteso, candidati = {}, 0
    for codice, mappa in sorted(meta.items()):
        chiave = 'nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in codice.split('_')[1:])
        rif = riferimento.get(chiave)
        if not rif or rif['esito'] != 'condiviso':
            continue
        indici = [i for i in rif['collocabili'] if mappa['pins'][i]['nativeType'] in bordo]
        if not indici:
            continue
        candidati += len(indici)
        mia = tuple(int(v) for v in codice.split('_')[1:])
        riga_proiezione = proiezioni.get(codice)
        mio = {}
        if riga_proiezione and riga_proiezione['esito'] == 'certificata':
            for indice, (distanza, scelta) in _atteso_da_trigger(
                    codice, mappa, rif, riga_proiezione, campi, per_procedura, esistenti,
                    bordo, ml.DISTANZA_ABBINAMENTO).items():
                mio[indice] = (scelta, round(distanza, 4), 'trigger proiettato')
        destinazioni = set()
        for nome_campo in mappa['fields']:
            destinazioni |= per_campo.get(nome_campo, set())
        unica = _destinazione_unica(destinazioni, mia, esistenti)
        if unica is not None:
            for indice in indici:
                mio.setdefault(indice, (unica, None, 'meta unica della planimetria'))
        for indice, (scelta, distanza, modo) in mio.items():
            arrivo = 'RMAP_%03d_%d_%d' % tuple(scelta[:3])
            punto, _ = ml.punto_di_arrivo(arrivo, scelta[3], meta, campi, proiezioni)
            atteso[(chiave, indice)] = (ml.chiave_di(arrivo), scelta[3], distanza, modo, punto)

    collegamenti = dati['collegamenti']
    chiavi = [(r['partenza'], r['indicePin']) for r in collegamenti]
    assert len(set(chiavi)) == len(chiavi), 'lo stesso pin compare in piu’ collegamenti'
    trovato = {(r['partenza'], r['indicePin']):
               (r['arrivo'], r['ingresso'], r['distanza'], r['modo'], r['punto'])
               for r in collegamenti}
    mancanti = sorted(set(atteso) - set(trovato))
    in_piu = sorted(set(trovato) - set(atteso))
    assert not mancanti, f'{len(mancanti)} collegamenti attesi e assenti, il primo: {mancanti[:1]}'
    assert not in_piu, f'{len(in_piu)} collegamenti presenti e non ricostruibili, il primo: {in_piu[:1]}'
    for chiave_pin, atteso_riga in sorted(atteso.items()):
        assert trovato[chiave_pin] == atteso_riga, \
            (f'il collegamento di {chiave_pin[0]} pin {chiave_pin[1]} e’ registrato come '
             f'{trovato[chiave_pin]} ma dalle sorgenti native risulta {atteso_riga}')

    for r in collegamenti:
        assert r['modo'] in MODI_AMMESSI, f'modo non ammesso: {r["modo"]}'
        codice = 'RMAP_%03d_%d_%d' % tuple(int(x) for x in r['partenza'].split('-')[2:])
        assert meta[codice]['pins'][r['indicePin']]['nativeType'] in bordo, \
            f'collegamento su un pin che non e’ un passaggio: {r["partenza"]}'
        if r['modo'] == 'trigger proiettato':
            assert r['distanza'] is not None and r['distanza'] <= ml.DISTANZA_ABBINAMENTO, \
                f'trigger oltre la soglia dichiarata: {r["partenza"]} a {r["distanza"]}'
        else:
            assert r['distanza'] is None, 'una meta forzata non ha distanza da dichiarare'

    irrisolti = dati['summary']['esiti'].get('pin di passaggio senza destinazione', 0)
    assert len(collegamenti) + irrisolti == candidati, \
        (f'i conti non chiudono: {len(collegamenti)} collegati piu’ {irrisolti} irrisolti '
         f'non fanno {candidati} pin di passaggio')
    per_modo = collections.Counter(r['modo'] for r in collegamenti)
    print('OK ricostruzione indipendente dei collegamenti:',
          ', '.join(f'{n} da «{m}»' for m, n in sorted(per_modo.items())),
          '— partenza, pin, arrivo, entrata, distanza, modo e punto d’arrivo coincidono tutti')
    return len(collegamenti), irrisolti


if __name__ == '__main__':
    main(*sys.argv[1:3])
