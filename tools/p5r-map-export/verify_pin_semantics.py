"""Ricontrollo indipendente di `semantica-pin.json` e dei pin finiti nel pacchetto del seed.

Quattro controlli:

1. **copertura** — ogni tipo nativo censito compare una volta sola, e i conti tornano;
2. **solo il dimostrato** — un tipo ha significato solo se lo sprite è quello del blocco urbano
   dimostrato; nessun tipo dei Palazzi ne ha ricevuto uno;
3. **tipi dell'applicazione** — ogni tipo di segnalino assegnato esiste nel registro
   `shared/spilli.ts`, e ogni etichetta è scritta;
4. **i pin nel pacchetto** — ognuno viene da un tipo determinato, sta su una planimetria che
   condivide il riferimento, ha le coordinate che si ottengono applicando il fattore dichiarato,
   e se cita un luogo quel luogo esiste nel quartiere della sua mappa.
"""
from pathlib import Path
import json
import re
import sys


def tipi_spillo_del_registro(radice):
    testo = (radice/'shared/spilli.ts').read_text(encoding='utf8')
    elenco = re.search(r'TIPI_SPILLO\s*=\s*\[(.*?)\]', testo, re.S)
    assert elenco, 'registro dei tipi di spillo non trovato'
    return set(re.findall(r"'([a-z0-9-]+)'", elenco.group(1)))


def main(out, seed=None):
    out = Path(out)
    radice = Path(__file__).resolve().parents[2]
    seed = Path(seed) if seed else radice/'data/seed'
    semantica = json.loads((out/'semantica-pin.json').read_text(encoding='utf8'))
    icone = json.loads((out/'icone-mappa.json').read_text(encoding='utf8'))
    riferimento = {r['chiave']: r for r in json.loads((out/'riferimento-pin.json').read_text(encoding='utf8'))['mappe']}
    meta = json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    pacchetto = json.loads((seed/'mappe/atlante-mondo.json').read_text(encoding='utf8'))
    quartieri = {q['chiave']: {l['chiave'] for l in q.get('luoghi', [])}
                 for q in json.loads((seed/'citta.json').read_text(encoding='utf8'))['quartieri']}
    registro = tipi_spillo_del_registro(radice)

    per_tipo = {r['tipoNativo']: r for r in semantica['tipi']}
    assert len(per_tipo) == len(semantica['tipi']), 'tipi nativi ripetuti'
    assert {r['tipoNativo'] for r in icone['tipiNativi']} == set(per_tipo), 'censimento diverso da quello delle icone'
    determinati = 0
    for r in icone['tipiNativi']:
        v = per_tipo[r['tipoNativo']]
        assert v['occorrenze'] == r['occorrenze'] and v['associazione'] == r['associazione']
        if v['stato'] == 'determinato':
            assert r['associazione'] == 'blocco-urbano-dimostrato', f'significato su tipo non dimostrato: {r["tipoNativo"]}'
            assert r['mappeDungeon'] == 0, f'tipo dei Palazzi con significato: {r["tipoNativo"]}'
            assert v['tipoSpillo'] in registro, f'tipo di segnalino fuori registro: {v["tipoSpillo"]}'
            assert v['etichetta'], f'significato senza etichetta: {r["tipoNativo"]}'
            determinati += 1
        else:
            assert v['tipoSpillo'] is None and v['etichetta'] is None and v['motivo']
    assert determinati == semantica['summary']['determinati']

    pin_nativi = {}
    for m in meta['maps']:
        pin_nativi['nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in m['code'].split('_')[1:])] = m['pins']
    controllati = con_luogo = 0
    for m in pacchetto['mappe']:
        propri = [s for s in m['spilli'] if 'Pin nativo del gioco.' in (s.get('descrizione') or '')]
        if not propri:
            continue
        rif = riferimento[m['chiave']]
        assert rif['esito'] == 'condiviso', f'pin su planimetria senza riferimento condiviso: {m["chiave"]}'
        fattore, (larghezza, altezza) = rif['fattoreScala'], rif['dimensione']
        attese = set()
        for i in rif['collocabili']:
            p = pin_nativi[m['chiave']][i]
            v = per_tipo[p['nativeType']]
            if v['stato'] != 'determinato':
                continue
            attese.add((v['tipoSpillo'], round(100*p['x']*fattore/larghezza, 3), round(100*p['y']*fattore/altezza, 3)))
        assert len(propri) == len(attese), f'numero di pin diverso su {m["chiave"]}'
        quartiere = m['genitore'].removeprefix('citta-') if (m['genitore'] or '').startswith('citta-') else None
        for s in propri:
            assert (s['tipo'], s['x'], s['y']) in attese, f'pin fuori posto o di tipo diverso su {m["chiave"]}'
            assert 0 <= s['x'] <= 100 and 0 <= s['y'] <= 100
            if s['riferimento']:
                assert s['riferimento']['tipo'] == 'luogo'
                assert quartiere and s['riferimento']['chiave'] in quartieri[quartiere], \
                    f'luogo citato fuori dal quartiere della mappa: {s["riferimento"]["chiave"]}'
                con_luogo += 1
            controllati += 1
    print('OK', determinati, 'tipi con significato dimostrato,', len(per_tipo)-determinati, 'lasciati senza;',
          controllati, 'pin nel pacchetto ricontrollati,', con_luogo, 'collegati a un luogo del catalogo')


if __name__ == '__main__':
    main(*sys.argv[1:3])
