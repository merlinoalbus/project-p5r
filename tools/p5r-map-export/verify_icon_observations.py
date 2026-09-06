"""Ricontrollo delle deduzioni fatte contando le icone nelle schermate del gioco.

Questa strada usa un'osservazione umana come dato, e per questo va controllata più delle altre:
un conteggio sbagliato produrrebbe una deduzione sbagliata con la stessa faccia di una giusta.

Cinque controlli:

1. **le osservazioni sono ben formate** — ogni schermata cita planimetrie che esistono nel
   censimento, ogni genere di icona ha la sua corrispondenza dichiarata in un tipo di segnalino
   del registro, e nessuna schermata è ripetuta;
2. **la deduzione si riproduce** — il vincolo di conteggio viene risolto da capo e deve dare gli
   stessi tipi;
3. **la soglia è rispettata** — un tipo dimostrato ha almeno `MINIME_OSSERVAZIONI` schermate a
   sostegno, ed è l'unico compatibile con tutte;
4. **le conferme incrociate reggono** — dove un tipo dedotto qui è già dimostrato per un'altra
   strada, le due devono dire la stessa cosa. È il controllo che dà credito al metodo: il
   forziere risulta il tipo 26 sia contando le icone sia leggendo le procedure `R_TBOX`, e le due
   cose non si sono parlate;
5. **i generi irrisolti restano irrisolti** — dove nessun tipo regge tutte le osservazioni, o dove
   ne reggono più d'uno, non deve esserci alcuna deduzione: un'osservazione sbagliata si dichiara,
   non si aggiusta.
"""
from pathlib import Path
import collections
import json
import re
import sys

import icon_observations as io_
import pin_semantics as ps


def tipi_spillo_del_registro(radice):
    testo = (radice/'shared/spilli.ts').read_text(encoding='utf8')
    elenco = re.search(r'TIPI_SPILLO\s*=\s*\[(.*?)\]', testo, re.S)
    assert elenco, 'registro dei tipi di spillo non trovato'
    return set(re.findall(r"'([a-z0-9-]+)'", elenco.group(1)))


def main(out, radice=None):
    out = Path(out)
    radice = Path(radice) if radice else Path(__file__).resolve().parents[2]
    dati = json.loads((radice/'data/atlas/osservazioni-icone.json').read_text(encoding='utf8'))
    esito = json.loads((out/'osservazioni-icone-esito.json').read_text(encoding='utf8'))
    meta = json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    semantica = {r['tipoNativo']: r for r in
                 json.loads((out/'semantica-pin.json').read_text(encoding='utf8'))['tipi']}
    registro = tipi_spillo_del_registro(radice)
    mappe = {m['code']: collections.Counter(p['nativeType'] for p in m['pins']) for m in meta['maps']}
    mappe['__tutti__'] = sorted({p['nativeType'] for m in meta['maps'] for p in m['pins']})

    # 1. osservazioni ben formate
    schermate = [v['schermata'] for v in dati['osservazioni']]
    assert len(set(schermate)) == len(schermate), 'schermate ripetute nelle osservazioni'
    for voce in dati['osservazioni']:
        assert voce['planimetrie'], f'osservazione senza planimetrie: {voce["schermata"]}'
        for codice in voce['planimetrie']:
            assert codice in mappe, f'planimetria inesistente: {codice}'
        for genere, quante in voce['icone'].items():
            assert isinstance(quante, int) and quante >= 0, f'conteggio non valido: {genere}'
            reso = dati['corrispondenzaIcone'].get(genere)
            assert reso, f'genere senza corrispondenza dichiarata: {genere}'
            assert reso['tipoSpillo'] in registro, f'tipo di segnalino fuori registro: {reso["tipoSpillo"]}'

    # 2. la deduzione si riproduce
    rifatto = io_.risolvi(dati['osservazioni'], mappe)
    assert set(rifatto) == set(esito['generi']), 'generi diversi da quelli risolti'
    for genere, voce in rifatto.items():
        salvato = esito['generi'][genere]
        assert voce['compatibili'] == salvato['compatibili'], f'compatibili diversi per {genere}'
        assert voce['dimostrato'] == salvato['dimostrato'], f'deduzione diversa per {genere}'

    # 3. soglia e unicità
    incrociate = 0
    for chiave, voce in esito['tipiDimostrati'].items():
        tipo = int(chiave)
        genere = voce['genere']
        assert rifatto[genere]['dimostrato'] == tipo, f'tipo dedotto diverso per {genere}'
        assert rifatto[genere]['osservazioni'] >= io_.MINIME_OSSERVAZIONI, \
            f'troppe poche osservazioni per {genere}'
        assert len(rifatto[genere]['compatibili']) == 1, f'piu’ di un tipo compatibile per {genere}'
        assert voce['tipoSpillo'] in registro, f'tipo di segnalino fuori registro: {voce["tipoSpillo"]}'

        # 4. Conferma incrociata. Guardare la `prova` finale non serve: per un tipo dedotto qui e'
        #    gia' stata sovrascritta con «icone contate», e il confronto che si promette non
        #    avverrebbe mai. Si legge invece l'evidenza grezza delle altre strade — quella degli
        #    script, che resta nel file accanto — e si pretende che dica la stessa cosa.
        altra = semantica.get(tipo) or {}
        script = altra.get('script')
        if script and script.get('stato') == 'determinato':
            assert script['tipoSpillo'] == voce['tipoSpillo'],                 (f'il tipo {tipo} risulta «{voce["tipoSpillo"]}» contando le icone e '
                 f'«{script["tipoSpillo"]}» dalle procedure che accendono la sua bandiera: '
                 'una delle due strade sbaglia')
            incrociate += 1

    # 4-bis. Dove l'osservazione dice in che parte della planimetria l'icona e' stata vista, il pin
    #        dedotto deve cadere li'. E' l'unico modo di ricontrollare un'osservazione visiva senza
    #        avere l'immagine: se il tipo fosse sbagliato, il suo pin starebbe da un'altra parte.
    import edge_pins as ep
    riferimento = {r['chiave']: r for r in
                   json.loads((out/'riferimento-pin.json').read_text(encoding='utf8'))['mappe']}
    perCodice = {m['code']: m for m in meta['maps']}
    posizioni = 0
    for voce in dati['osservazioni']:
        vista = voce.get('posizioneVista')
        if not vista:
            continue
        atteso = esito['generi'][vista['genere']]['dimostrato']
        assert atteso is not None, f'posizione dichiarata per un genere non dedotto: {vista["genere"]}'
        codice = vista['planimetria']
        chiave = 'nativo-rmap-%03d-%d-%d' % tuple(int(x) for x in codice.split('_')[1:])
        rif = riferimento[chiave]
        fattore = rif['fattoreScala']
        quadranti = {ep.lato_di(perCodice[codice]['pins'][i]['x']*fattore,
                                perCodice[codice]['pins'][i]['y']*fattore, rif['riquadroContenuto'])
                     for i in rif['collocabili']
                     if perCodice[codice]['pins'][i]['nativeType'] == atteso}
        assert vista['quadrante'] in quadranti,             (f'l’osservazione dice che su {codice} l’icona sta in «{vista["quadrante"]}», ma il pin '
             f'di tipo {atteso} sta in {sorted(quadranti)}: una delle due cose e’ sbagliata')
        posizioni += 1

    # 5. gli irrisolti restano tali
    dedotti = {int(k) for k in esito['tipiDimostrati']}
    for genere, voce in rifatto.items():
        if voce['dimostrato'] is None:
            assert not any(v['genere'] == genere for v in esito['tipiDimostrati'].values()), \
                f'genere irrisolto ma con una deduzione: {genere}'
            assert voce['motivo'], f'genere irrisolto senza motivo scritto: {genere}'
    for tipo in dedotti:
        v = semantica.get(tipo)
        assert v and v['stato'] == 'determinato', f'tipo dedotto ma non usato nella semantica: {tipo}'

    # La conferma incrociata non e' un di piu': e' cio' che da' credito al metodo, e almeno una
    # dev'esserci. Oggi e' il forziere, che risulta il tipo 26 anche dalle procedure R_TBOX.
    assert incrociate >= 1, ('nessuna deduzione risulta confermata da una strada indipendente: '
                             'senza controprova il metodo vale quanto la fiducia che gli si da')

    coperti = sum(sum(c.get(t, 0) for c in mappe.values() if isinstance(c, collections.Counter))
                  for t in dedotti)
    irrisolti = [g for g, v in rifatto.items() if v['dimostrato'] is None]
    print('OK', len(dedotti), 'tipi dedotti contando le icone su', len(dati['osservazioni']),
          'schermate,', coperti, 'pin coperti;', incrociate,
          'confermati anche da un’altra strada indipendente;',
          posizioni, 'osservazioni ricontrollate anche sulla posizione;',
          len(irrisolti), 'generi restano irrisolti e dichiarati tali', irrisolti or '')


if __name__ == '__main__':
    main(*sys.argv[1:3])
