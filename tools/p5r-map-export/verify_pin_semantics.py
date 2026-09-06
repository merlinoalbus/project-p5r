"""Ricontrollo indipendente di `semantica-pin.json` e dei pin finiti nel pacchetto del seed.

Quattro controlli:

1. **copertura** — ogni tipo nativo censito compare una volta sola, e i conti tornano;
2. **solo il dimostrato** — un tipo ha significato o perché il suo sprite appartiene al blocco
   urbano dimostrato, o perché le procedure che accendono la sua bandiera lo dicono. La seconda
   strada viene **ricalcolata dagli script**, senza fidarsi del file: si rileggono i corpi delle
   procedure, si ritrovano le bandiere accese, si riconta la famiglia dominante e si controlla che
   superi le soglie dichiarate;
3. **tipi dell'applicazione** — ogni tipo di segnalino assegnato esiste nel registro
   `shared/spilli.ts`, e ogni etichetta è scritta;
4. **i pin nel pacchetto** — ognuno viene da un tipo determinato, sta su una planimetria che
   condivide il riferimento, ha le coordinate che si ottengono applicando il fattore dichiarato,
   e se cita un luogo quel luogo esiste nel quartiere della sua mappa;
5. **i condizionali restano condizionali** — un pin che il gioco mostra a una bandiera deve avere
   una condizione strutturata `da-configurare`, non una frase nella descrizione: senza condizione
   comparirebbe sempre, che è falso. E chi non è condizionale non deve averne;
6. **la contabilità chiude** — posati più esclusi devono fare esattamente i pin nativi: nessuna
   occorrenza può sparire dal riepilogo.
"""
from pathlib import Path
import collections
import json
import re
import sys


def tipi_spillo_del_registro(radice):
    testo = (radice/'shared/spilli.ts').read_text(encoding='utf8')
    elenco = re.search(r'TIPI_SPILLO\s*=\s*\[(.*?)\]', testo, re.S)
    assert elenco, 'registro dei tipi di spillo non trovato'
    return set(re.findall(r"'([a-z0-9-]+)'", elenco.group(1)))


def evidenze_dagli_script(out):
    """Ricalcola, dai corpi delle procedure, quale famiglia domina per ciascun tipo di pin."""
    meta = json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    con = json.loads((out/'campi-completi/connessioni.json').read_text(encoding='utf8'))
    bit = re.compile(r'BIT_ON\(\(0x20000000 \+ (\d+)\)\)')
    procedure = {}
    for f in con['fields']:
        for p in f['procedures']:
            for m in bit.finditer(p['body'] or ''):
                procedure.setdefault((f['field'], 0x20000000 + int(m.group(1))), set()).add(p['name'])
    conteggi = {}
    for mappa in meta['maps']:
        for p in mappa['pins']:
            if not p['conditional']:
                continue
            for campo in mappa['fields']:
                nomi = procedure.get((campo, p['flag']))
                if not nomi:
                    continue
                conteggi.setdefault(p['nativeType'], collections.Counter()).update(nomi)
                break
    return conteggi


def sotto_il_pin(out):
    """Ricalcola, dalle proiezioni certificate, che cosa cade sotto i pin di ciascun tipo.

    Non si fida di `semantica-pin.json`: rilegge le proiezioni, riaccoppia pin e punti del campo,
    rilegge i nomi delle procedure e riconta le famiglie. Restituisce anche, pin per pin, la
    procedura trovata sotto, per ricontrollare le determinazioni puntuali.
    """
    percorso = out/'proiezioni-mappa.json'
    if not percorso.exists():
        return {}, {}
    import pin_semantics as ps
    meta = {m['code']: m for m in json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))['maps']}
    con = json.loads((out/'campi-completi/connessioni.json').read_text(encoding='utf8'))
    campi = {f['field']: f for f in con['fields']}
    proiezioni = json.loads(percorso.read_text(encoding='utf8'))
    famiglie = collections.defaultdict(collections.Counter)
    per_pin = {}
    for r in proiezioni['mappe']:
        if r['esito'] != 'certificata':
            continue
        mappa, p = meta[r['codice']], r['proiezione']
        campo = campi[p['campo']]
        nomi = [q['name'] for q in campo['procedures']]
        punti = [('trigger', t) for t in campo['triggers'] if t.get('position')]
        punti += [('ingresso', e) for e in (campo.get('entrances') or [])]
        for i_pin, i_punto in p['accoppiamenti']:
            indice = r['pinCollocabili'][i_pin]
            tipo = mappa['pins'][indice]['nativeType']
            genere, voce = punti[i_punto]
            if genere == 'ingresso':
                famiglie[tipo][ps.FAMIGLIA_INGRESSO] += 1
                continue
            i = voce.get('procedureIndex')
            nome = nomi[i] if isinstance(i, int) and 0 <= i < len(nomi) else None
            fam = ps.famiglia_sotto(nome) if nome else None
            if fam:
                famiglie[tipo][fam] += 1
                per_pin[(r['chiave'], indice)] = (tipo, fam, nome)
    return famiglie, per_pin


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
    dagli_script = evidenze_dagli_script(out)
    famiglie_sotto, procedure_sotto = sotto_il_pin(out)
    famiglie = [(f[0], f[1]) for f in __import__('pin_semantics').FAMIGLIE]
    import pin_semantics as ps

    urbani = dagli_script_ok = sotto_ok = con_condizione = ipotesi = 0
    per_tipo = {r['tipoNativo']: r for r in semantica['tipi']}
    assert len(per_tipo) == len(semantica['tipi']), 'tipi nativi ripetuti'
    assert {r['tipoNativo'] for r in icone['tipiNativi']} == set(per_tipo), 'censimento diverso da quello delle icone'
    determinati = 0
    for r in icone['tipiNativi']:
        v = per_tipo[r['tipoNativo']]
        assert v['occorrenze'] == r['occorrenze'] and v['associazione'] == r['associazione']
        if v['stato'] == 'ipotesi':
            # un'ipotesi deve dichiararsi tale e portare la propria misura, e non puo' esistere
            # dove una prova vera c'era gia'
            assert v['tipoSpillo'] in registro and v['etichetta'] and v.get('prova')
            assert v['proiezione'] and v['proiezione']['proposta'], f'ipotesi senza misura: {r["tipoNativo"]}'
            assert v['proiezione']['coppie'] >= ps.MINIME_COPPIE, f'ipotesi con troppe poche coppie: {r["tipoNativo"]}'
            ipotesi += 1
        elif v['stato'] == 'determinato':
            assert v['tipoSpillo'] in registro, f'tipo di segnalino fuori registro: {v["tipoSpillo"]}'
            assert v['etichetta'] and v.get('prova'), f'significato senza etichetta o senza prova: {r["tipoNativo"]}'
            if r['associazione'] in ('blocco-urbano-dimostrato', 'blocco-covo-dimostrato'):
                assert r['mappeDungeon'] == 0, f'tipo dello sprite usato anche nei Palazzi: {r["tipoNativo"]}'
                # lo scarto del blocco deve riprodurre esattamente lo sprite dichiarato
                import map_icons as mi
                scarto = (mi.SCARTO_CITTA if r['associazione'].startswith('blocco-urbano')
                          else mi.SCARTO_MY_PALACE)
                assert r['sprite'] == r['tipoNativo'] + scarto, f'sprite fuori scarto: {r["tipoNativo"]}'
                urbani += 1
            elif v['prova'].startswith('procedura del trigger'):
                # la terza strada va ricalcolata dalle proiezioni, non creduta
                conti = famiglie_sotto.get(r['tipoNativo'], collections.Counter())
                riconosciute = sum(conti.values())
                (spillo, etichetta), quante = sorted(conti.items(), key=lambda x: (-x[1], x[0][0]))[0]
                assert spillo == v['tipoSpillo'], f'famiglia sotto il pin diversa: {r["tipoNativo"]}'
                quota = quante/riconosciute
                assert (riconosciute >= ps.MINIME_SOTTO and quota >= ps.DOMINANZA_SOTTO) or \
                       (riconosciute >= ps.MINIME_SOTTO_RIDOTTE and quota >= ps.DOMINANZA_SOTTO_RIDOTTA), \
                    f'dominanza insufficiente sotto il pin: {r["tipoNativo"]}'
                sotto_ok += 1
            else:
                # la strada degli script va ricalcolata, non creduta
                nomi = dagli_script.get(r['tipoNativo'], collections.Counter())
                per_famiglia = collections.Counter()
                for nome, quante in nomi.items():
                    fam = next((f for f in famiglie if re.search(f[0], nome)), None)
                    if fam:
                        per_famiglia[fam] += quante
                riconosciute = sum(per_famiglia.values())
                (schema, tipo_spillo), quante = per_famiglia.most_common(1)[0]
                assert tipo_spillo == v['tipoSpillo'], f'famiglia diversa da quella dichiarata: {r["tipoNativo"]}'
                assert quante >= riconosciute*ps.DOMINANZA, f'famiglia non dominante: {r["tipoNativo"]}'
                conferme = sum(n for testo, n in (v['script']['etichetteDeiTrigger'] or {}).items()
                               if any(par in testo.casefold() for par in ps.CONFERME.get(tipo_spillo, [])))
                assert quante >= ps.MINIMO_CASI or (quante >= ps.MINIMO_CASI_CON_CONFERMA and conferme >= ps.MINIME_CONFERME),                     f'casi insufficienti e senza conferma: {r["tipoNativo"]}'
                dagli_script_ok += 1
            determinati += 1
        else:
            assert v['tipoSpillo'] is None and v['etichetta'] is None and v['motivo']
    assert determinati == semantica['summary']['determinati']

    # Ogni determinazione puntuale deve corrispondere a una procedura trovata davvero sotto quel
    # pin, e non puo' riguardare un tipo che ha gia' una prova sua.
    puntuali = {(x['chiave'], x['indicePin']): x for x in semantica.get('pinPuntuali') or []}
    assert len(puntuali) == len(semantica.get('pinPuntuali') or []), 'pin puntuali ripetuti'
    for (chiave, indice), x in puntuali.items():
        trovato = procedure_sotto.get((chiave, indice))
        assert trovato, f'determinazione puntuale senza procedura sotto: {chiave}#{indice}'
        tipo, (spillo, etichetta), nome = trovato
        assert tipo == x['tipoNativo'] and spillo == x['tipoSpillo'] and etichetta == x['etichetta'] \
            and nome == x['procedura'], f'determinazione puntuale non riproducibile: {chiave}#{indice}'
        assert per_tipo[tipo]['stato'] != 'determinato', \
            f'determinazione puntuale su un tipo gia' + chr(39) + f' dimostrato: {tipo}'
        assert spillo in registro, f'tipo di segnalino fuori registro: {spillo}'

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
        attese = collections.Counter()
        for i in rif['collocabili']:
            p = pin_nativi[m['chiave']][i]
            v = per_tipo[p['nativeType']]
            puntuale = puntuali.get((m['chiave'], i))
            if v['stato'] not in ('determinato', 'ipotesi') and not puntuale:
                continue
            spillo = puntuale['tipoSpillo'] if (puntuale and v['stato'] != 'determinato') else v['tipoSpillo']
            attese[(spillo, round(100*p['x']*fattore/larghezza, 3), round(100*p['y']*fattore/altezza, 3))] += 1
        assert len(propri) == sum(attese.values()), f'numero di pin diverso su {m["chiave"]}'
        trovati = collections.Counter((x['tipo'], x['x'], x['y']) for x in propri)
        assert trovati == attese, f'pin fuori posto o di tipo diverso su {m["chiave"]}'
        quartiere = m['genitore'].removeprefix('citta-') if (m['genitore'] or '').startswith('citta-') else None
        def spillo_di(i):
            v = per_tipo[pin_nativi[m['chiave']][i]['nativeType']]
            puntuale = puntuali.get((m['chiave'], i))
            if v['stato'] == 'determinato':
                return v['tipoSpillo']
            if puntuale:
                return puntuale['tipoSpillo']
            return v['tipoSpillo'] if v['stato'] == 'ipotesi' else None

        condizionali = {(spillo_di(i),
                         round(100*pin_nativi[m['chiave']][i]['x']*fattore/larghezza, 3),
                         round(100*pin_nativi[m['chiave']][i]['y']*fattore/altezza, 3))
                        for i in rif['collocabili'] if pin_nativi[m['chiave']][i]['conditional']
                        and spillo_di(i) is not None}
        for s in propri:
            assert (s['tipo'], s['x'], s['y']) in attese, f'pin fuori posto o di tipo diverso su {m["chiave"]}'
            assert 0 <= s['x'] <= 100 and 0 <= s['y'] <= 100
            atteso_condizionale = (s['tipo'], s['x'], s['y']) in condizionali
            ha = bool(s.get('condizioni'))
            assert ha == atteso_condizionale, f'condizione mancante o di troppo su {m["chiave"]}'
            if ha:
                assert all(c['tipo'] == 'da-configurare' and c.get('nota') for c in s['condizioni']),                     f'condizione senza forma valida su {m["chiave"]}'
                con_condizione += 1
            if s['riferimento']:
                assert s['riferimento']['tipo'] == 'luogo'
                assert quartiere and s['riferimento']['chiave'] in quartieri[quartiere], \
                    f'luogo citato fuori dal quartiere della mappa: {s["riferimento"]["chiave"]}'
                con_luogo += 1
            controllati += 1
    # la contabilità del rapporto deve chiudere su tutte le occorrenze native
    rapporto = json.loads((out/'pacchetto-seed-rapporto.json').read_text(encoding='utf8'))
    nativi = sum(len(m['pins']) for m in meta['maps'])
    assert rapporto['pinNativi'] == nativi, 'il rapporto non conta tutti i pin nativi'
    assert rapporto['pinContati'] == nativi, f'contabilità aperta: {rapporto["pinContati"]} su {nativi}'
    assert rapporto['spilliCondizionati'] == con_condizione, 'i condizionati dichiarati non sono quelli trovati'
    assert ipotesi == semantica['summary']['ipotesi']
    print('OK', determinati, f'tipi dimostrati ({urbani} dal nome dello sprite,',
          f'{dagli_script_ok} dalle procedure che accendono la bandiera,',
          f'{sotto_ok} dalla procedura sotto il pin) e', ipotesi, 'per ipotesi dichiarata,',
          len(puntuali), 'pin risolti singolarmente;',
          len(per_tipo)-determinati-ipotesi, 'lasciati senza;',
          controllati, 'pin nel pacchetto ricontrollati,', con_luogo, 'collegati a un luogo del catalogo,',
          con_condizione, 'con condizione da configurare; contabilità chiusa su', nativi, 'pin nativi')


if __name__ == '__main__':
    main(*sys.argv[1:3])
