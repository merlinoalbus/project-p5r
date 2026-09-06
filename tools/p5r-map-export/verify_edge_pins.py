"""Ricontrollo dei pin di bordo: sono davvero le uscite, o è il criterio che se le inventa?

La deduzione è geometrica e vale solo per il divario che la sostiene: quattro tipi si accostano
ciascuno a un lato diverso molto più di quanto faccia qualunque tipo interno. Se quel divario si
assottiglia, la deduzione non regge più, e questo verificatore deve accorgersene.

Sei controlli:

1. **la misura si riproduce** — lati e quote si ricalcolano dalle sorgenti e devono coincidere;
2. **il divario c'è** — il migliore dei tipi interni deve stare sotto la soglia con un margine
   dichiarato, altrimenti il criterio non distingue nulla;
3. **i lati sono esclusivi** — due tipi non possono avere lo stesso lato: sarebbero la stessa
   freccia contata due volte;
4. **i lati sono tutti diversi fra loro e coprono direzioni opposte** — se uscissero tutti dallo
   stesso lato non sarebbero uscite ma un addensamento;
5. **il segnalino esiste** nel registro, e l'etichetta dice la direzione;
6. **nessun conflitto** con i tipi già dimostrati per altre strade.
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
              irrisolti, 'restano senza, nessuno scelto fra piu’ mete')


def controlla_collegamenti(out):
    """I collegamenti devono essere solo quelli non ambigui, e i conti devono chiudere.

    Ricostruisce per ogni pin collegato le mete valide del suo campo e rifiuta ogni assegnazione
    che avrebbe potuto sceglierne più d'una: oggi non capita, ma se un domani i dati cambiassero
    un trigger ambiguo potrebbe vincere, e allora il collegamento porterebbe altrove.
    """
    import re
    percorso = out/'collegamenti-mappe.json'
    if not percorso.exists():
        return 0, 0
    dati = json.loads(percorso.read_text(encoding='utf8'))
    bordo = {int(k) for k in json.loads((out/'pin-di-bordo.json').read_text(encoding='utf8'))['tipiDimostrati']}
    meta = {m['code']: m for m in json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))['maps']}
    riferimento = {r['chiave']: r for r in
                   json.loads((out/'riferimento-pin.json').read_text(encoding='utf8'))['mappe']}
    chiamate = json.loads((out/'collegamenti-script.json').read_text(encoding='utf8'))['chiamate']
    per_campo = collections.defaultdict(set)
    for c in chiamate:
        t = re.search(r'(\d{3})_(\d{3})_(\d{2})', c['script'])
        if t:
            for d in c['destinazioni']:
                per_campo['F%s_%s_%s' % t.groups()].add(tuple(d[:3]))

    collegamenti = dati['collegamenti']
    chiavi = [(r['partenza'], r['indicePin']) for r in collegamenti]
    assert len(set(chiavi)) == len(chiavi), 'lo stesso pin compare in piu’ collegamenti'
    for r in collegamenti:
        codice = 'RMAP_%03d_%d_%d' % tuple(int(x) for x in r['partenza'].split('-')[2:])
        mappa = meta[codice]
        assert mappa['pins'][r['indicePin']]['nativeType'] in bordo,             f'collegamento su un pin che non e’ un passaggio: {r["partenza"]}'
        if r['modo'] == 'meta unica della planimetria':
            mete = set()
            for campo in mappa['fields']:
                mete |= {m for m in per_campo.get(campo, set())
                         if m != tuple(int(x) for x in codice.split('_')[1:])}
            mete = {m for m in mete if 'RMAP_%03d_%d_%d' % m in meta}
            assert len(mete) == 1,                 f'dichiarato «meta unica» ma le mete sono {len(mete)}: {r["partenza"]}'

    # contabilita': ogni pin di passaggio o e' collegato o e' dichiarato irrisolto
    candidati = 0
    for codice, mappa in meta.items():
        chiave = 'nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in codice.split('_')[1:])
        rif = riferimento.get(chiave)
        if not rif or rif['esito'] != 'condiviso':
            continue
        candidati += sum(1 for i in rif['collocabili'] if mappa['pins'][i]['nativeType'] in bordo)
    irrisolti = dati['summary']['esiti'].get('pin di passaggio senza destinazione', 0)
    assert len(collegamenti) + irrisolti == candidati,         (f'i conti non chiudono: {len(collegamenti)} collegati piu’ {irrisolti} irrisolti '
         f'non fanno {candidati} pin di passaggio')
    return len(collegamenti), irrisolti


if __name__ == '__main__':
    main(*sys.argv[1:3])
