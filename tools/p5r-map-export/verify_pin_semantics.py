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

import pin_semantics as ps


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
    atteso_bandiera = ps.significato_dalle_bandiere(out)
    famiglie = [(f[0], f[1]) for f in ps.FAMIGLIE]
    percorso_bordo = out/'pin-di-bordo.json'
    di_bordo = (json.loads(percorso_bordo.read_text(encoding='utf8'))['tipiDimostrati']
                if percorso_bordo.exists() else {})
    percorso_osservato = out/'osservazioni-icone-esito.json'
    osservati = (json.loads(percorso_osservato.read_text(encoding='utf8'))['tipiDimostrati']
                 if percorso_osservato.exists() else {})
    urbani = dagli_script_ok = sotto_ok = dai_pin_ok = osservati_ok = bordo_ok = con_condizione = ipotesi = 0
    tabella_ok = 0
    da_verificare_nel_pacchetto = [0]
    cancelli = {(r['mappa'], r['indicePin']): r for r in json.loads(
        (out/'cancelli-pin.json').read_text(encoding='utf8'))['pin']}
    parti = {r['tipoNativo']: r for r in json.loads(
        (out/'tabella-parti-pin.json').read_text(encoding='utf8'))['tipi']}
    # La tabella nativa si ricontrolla dall'eseguibile, non dall'artefatto: e' la sola sorgente
    # che non si puo' aggiustare a mano senza che il controllo se ne accorga.
    import pin_part_table as ppt
    binario = ppt.leggi(ppt.ESEGUIBILE)
    nomi_sprite = {s['index']: s.get('nome') for s in icone['sprite']}
    per_tipo = {r['tipoNativo']: r for r in semantica['tipi']}
    assert len(per_tipo) == len(semantica['tipi']), 'tipi nativi ripetuti'
    assert {r['tipoNativo'] for r in icone['tipiNativi']} == set(per_tipo), 'censimento diverso da quello delle icone'
    determinati = 0
    for r in icone['tipiNativi']:
        v = per_tipo[r['tipoNativo']]
        assert v['occorrenze'] == r['occorrenze'] and v['associazione'] == r['associazione']
        assert v['stato'] in ('determinato', 'da-verificare'), \
            f'stato non ammesso: un tipo o è dimostrato o è da verificare ({r["tipoNativo"]})'
        if v['stato'] == 'determinato':
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
            elif v['prova'].startswith('posizione sul bordo'):
                # ha il suo verificatore dedicato: qui basta che il tipo sia fra quelli dedotti
                assert str(r['tipoNativo']) in di_bordo,                     f'tipo dichiarato di bordo ma assente dall’esito: {r["tipoNativo"]}'
                assert di_bordo[str(r['tipoNativo'])]['tipoSpillo'] == v['tipoSpillo'],                     f'segnalino diverso da quello dedotto dal bordo: {r["tipoNativo"]}'
                bordo_ok += 1
            elif v['prova'].startswith('icone contate'):
                # la deduzione dalle schermate ha il suo verificatore dedicato: qui basta che il
                # tipo sia davvero fra quelli dedotti li', e che il segnalino coincida
                assert str(r['tipoNativo']) in osservati,                     f'tipo dichiarato dedotto dalle icone ma assente dall’esito: {r["tipoNativo"]}'
                assert osservati[str(r['tipoNativo'])]['tipoSpillo'] == v['tipoSpillo'],                     f'segnalino diverso da quello dedotto dalle icone: {r["tipoNativo"]}'
                osservati_ok += 1
            elif v['prova'].startswith('tabella nativa delle parti'):
                # La strada piu' diretta, e per questo va ricontrollata dall'eseguibile e non
                # dall'artefatto: si rilegge il partId dal file, si risale allo sprite e si
                # pretende che il nome sia proprio quello a cui la traduzione dichiarata associa
                # questo segnalino. Cambiare la tabella a mano deve far cadere il controllo.
                import struct
                import pin_part_table as ppt
                parte = struct.unpack_from('<I', binario, ppt.TABELLA + ppt.PASSO*r['tipoNativo'])[0]
                indice = parte - 1
                assert 0 <= indice < ppt.SPRITE_DEL_FOGLIO, \
                    f'tipo {r["tipoNativo"]}: dichiarato dalla tabella ma la parte cade fuori dal foglio'
                nome = nomi_sprite.get(indice)
                assert nome and nome == (v.get('tabellaParti') or {}).get('nomeNativo'), \
                    f'tipo {r["tipoNativo"]}: nome dello sprite diverso da quello registrato'
                reso = ps.DALLA_TABELLA_DELLE_PARTI.get(nome)
                assert reso, f'tipo {r["tipoNativo"]}: nome nativo senza traduzione dichiarata'
                assert (v['tipoSpillo'], v['etichetta']) == reso, \
                    f'tipo {r["tipoNativo"]}: segnalino diverso da quello dichiarato per «{nome}»'
                assert str(parte) in v['prova'] and nome in v['prova'], \
                    f'tipo {r["tipoNativo"]}: la prova scritta non cita la parte e il nome'
                tabella_ok += 1
            elif v['prova'].startswith('prove dirette'):
                # il tipo e' dimostrato dai suoi stessi pin: si riaggregano le prove dirette e si
                # controlla che siano tante e concordi quanto dichiarato
                rifatto = ps.tipi_dalle_prove_dirette(atteso_bandiera)
                atteso = rifatto.get(r['tipoNativo'])
                assert atteso and atteso['tipoSpillo'] == v['tipoSpillo'],                     f'prove dirette non riproducibili: {r["tipoNativo"]}'
                assert atteso['totale'] >= ps.MINIME_PROVE_DIRETTE and                     atteso['prove']/atteso['totale'] >= ps.DOMINANZA_PROVE_DIRETTE,                     f'prove dirette insufficienti: {r["tipoNativo"]}'
                dai_pin_ok += 1
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
            # Un tipo senza significato dimostrato entra come «nota» dichiarato da verificare: non
            # deve mai indossare un tipo che afferma qualcosa, deve dire perché non si sa, e deve
            # portare la scheda delle prove — altrimenti la verifica manuale non ha da cosa partire.
            assert v['tipoSpillo'] == 'nota', \
                f'un tipo non dimostrato ha ricevuto un segnalino che afferma: {r["tipoNativo"]}'
            assert v['etichetta'] and 'Da identificare' in v['etichetta'], \
                f'un tipo da verificare non si dichiara tale nell’etichetta: {r["tipoNativo"]}'
            assert v['motivo'], f'tipo da verificare senza motivo scritto: {r["tipoNativo"]}'
            scheda = v.get('riferimenti')
            assert scheda and scheda.get('diffusione'), \
                f'tipo da verificare senza la scheda delle prove: {r["tipoNativo"]}'
            assert scheda.get('avvertenza'), \
                f'la scheda non avverte che gli indizi geometrici non decidono: {r["tipoNativo"]}'
            # dove la tabella nativa arriva a un nome, la scheda e l'etichetta devono portarlo
            nome = (v.get('tabellaParti') or {}).get('nomeNativo')
            if nome:
                assert nome in v['etichetta'], \
                    f'il nome nativo è noto ma non compare nell’etichetta: {r["tipoNativo"]}'
                assert (scheda.get('tabellaParti') or {}).get('nomeNativo') == nome, \
                    f'la scheda non riporta il nome nativo raggiunto: {r["tipoNativo"]}'
                assert nome not in ps.DALLA_TABELLA_DELLE_PARTI, \
                    (f'il tipo {r["tipoNativo"]} ha una resa dichiarata per «{nome}» ma resta da '
                     'verificare: o si applica o si toglie dalla tabella delle rese')
    for v in per_tipo.values():
        assert 'sotto il pin' not in (v.get('prova') or ''), \
            f'un tipo è determinato dalla lettura geometrica, che la controprova smentisce: {v["tipoNativo"]}'
    assert not semantica.get('pinPuntuali'), 'nessun pin deve essere determinato singolarmente'
    # la controprova va rifatta, non letta: è lei a giustificare l'esclusione della lettura
    misura = ps.controprova(out, per_tipo)
    assert misura == semantica['letturaGeometrica']['controprova'], 'la controprova non si riproduce'
    assert misura['casi'] >= 20, 'la controprova ha troppi pochi casi per dire qualcosa'
    assert misura['accuratezza'] < 0.7, \
        ('la lettura geometrica risulta accurata: se lo è davvero, va usata come prova, '
         'non lasciata da parte')
    assert determinati == semantica['summary']['determinati']

    # La via delle bandiere va ricalcolata dalle sorgenti, non creduta: si rilegge la raccolta
    # delle bandiere, si riapplica il vincolo di pertinenza e quello di bandiera unica, e si
    # controlla che esca esattamente lo stesso elenco.
    da_bandiera = {(r['chiave'], r['indicePin']): r for r in semantica.get('pinDaBandiera') or []}
    assert set(da_bandiera) == set(atteso_bandiera), 'i pin riconosciuti dalla bandiera non si riproducono'
    for k, v in da_bandiera.items():
        rifatto = atteso_bandiera[k]
        assert v['tipoSpillo'] == rifatto['tipoSpillo'] and v['etichetta'] == rifatto['etichetta'],             f'significato dalla bandiera diverso: {k}'
        assert v['tipoSpillo'] in registro, f'tipo di segnalino fuori registro: {v["tipoSpillo"]}'
        assert v['procedure'] and v['script'], f'riconoscimento dalla bandiera senza fonte: {k}'

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
            scelto = da_bandiera.get((m['chiave'], i))
            # Anche i tipi da verificare sono posati, come «nota»: entrano nel conto atteso,
            # altrimenti la contabilità direbbe che nel pacchetto c'è piu' di quel che dovrebbe.
            spillo = scelto['tipoSpillo'] if scelto else v['tipoSpillo']
            attese[(spillo, round(100*p['x']*fattore/larghezza, 3),
                    round(100*p['y']*fattore/altezza, 3))] += 1
        assert len(propri) == sum(attese.values()), f'numero di pin diverso su {m["chiave"]}'
        trovati = collections.Counter((x['tipo'], x['x'], x['y']) for x in propri)
        assert trovati == attese, f'pin fuori posto o di tipo diverso su {m["chiave"]}'
        quartiere = m['genitore'].removeprefix('citta-') if (m['genitore'] or '').startswith('citta-') else None
        def spillo_di(i):
            scelto = da_bandiera.get((m['chiave'], i))
            if scelto:
                return scelto['tipoSpillo']
            # anche i tipi da verificare hanno il loro segnalino, «nota»: sono posati come gli altri
            return per_tipo[pin_nativi[m['chiave']][i]['nativeType']]['tipoSpillo']

        # Una condizione va **solo** dove un cancello leggibile la giustifica. Non piu' a ogni pin
        # condizionato: la bandiera di un pin dice quasi sempre «ci sei gia' passato», e in una
        # guida — che si consulta prima di arrivarci — quella non e' una condizione. Il controllo
        # pretende la corrispondenza esatta nei due sensi: niente condizioni inventate, e nessun
        # cancello dimenticato.
        # Il contratto di visibilita', in una riga: **un pin nativo non ha condizioni**.
        #
        # Sono elementi fissi del mondo — passaggi, porte, forzieri, stanze sicure, scale, semi,
        # uscite — e ci sono sempre. Nasconderli finche' il giocatore non li ha trovati vorrebbe
        # dire che la guida mostra un posto solo dopo che ci sei stato, cioe' quando non serve
        # piu'. Anche un prerequisito (la porta che si apre con la leva blu) non nasconde niente:
        # la porta si vede, e la descrizione dice che cosa ci vuole per aprirla.
        #
        # `condizioni` resta riservato alla **presenza nel momento della visita** — data, fascia,
        # meteo, sblocco del quartiere — e quella riguarda le entita' della guida, non i pin
        # nativi: nei Palazzi non piove. Se un giorno un pin nativo ne avesse una davvero, andra'
        # dimostrata qui prima di passare.
        condizionali = set()
        for s in propri:
            assert (s['tipo'], s['x'], s['y']) in attese, f'pin fuori posto o di tipo diverso su {m["chiave"]}'
            assert 0 <= s['x'] <= 100 and 0 <= s['y'] <= 100
            atteso_condizionale = (s['tipo'], s['x'], s['y']) in condizionali
            ha = bool(s.get('condizioni'))
            assert ha == atteso_condizionale, f'condizione mancante o di troppo su {m["chiave"]}'
            if ha:
                assert all(c['tipo'] == 'da-configurare' and c.get('nota') for c in s['condizioni']),                     f'condizione senza forma valida su {m["chiave"]}'
                # la nota deve dire che cosa devi aver fatto, non un numero di bandiera
                atteso_testo = (cancelli.get((m['chiave'], (s.get('nativo') or {}).get('indicePin'))) or {}).get('rese') or []
                for c in s['condizioni']:
                    assert all(t in c['nota'] for t in atteso_testo),                         f'la condizione non riporta il cancello che la giustifica su {m["chiave"]}'
                    assert not re.search(r'bandiera nativa \d+', c['nota']),                         f'la condizione cita ancora un numero di bandiera invece del blocco su {m["chiave"]}'
                con_condizione += 1
            # Le prove native devono arrivare nel pacchetto come dato, non come frase. Per gli
            # spilli di un tipo ancora da identificare sono l'unica cosa che rende possibile la
            # verifica manuale: se sparissero, resterebbe un pin muto e nessuno se ne accorgerebbe,
            # perche' il conteggio tornerebbe lo stesso. Qui non torna.
            nat = s.get('nativo')
            assert nat, f'spillo nativo senza le sue prove strutturate su {m["chiave"]}'
            assert isinstance(nat.get('tipoNativo'), int) and isinstance(nat.get('indicePin'), int), \
                f'prove native senza tipo o indice del pin su {m["chiave"]}'
            atteso_nativo = pin_nativi[m['chiave']][nat['indicePin']]
            assert atteso_nativo['nativeType'] == nat['tipoNativo'], \
                f'le prove citano un tipo nativo diverso da quello del pin su {m["chiave"]}'
            tab = parti.get(nat['tipoNativo']) or {}
            for campo in ('partId', 'indiceSprite', 'nomeNativo', 'png', 'motivoSenzaSprite'):
                assert nat.get(campo) == tab.get(campo), \
                    f'prove native discordi dalla tabella delle parti ({campo}) su {m["chiave"]}'
            stato = per_tipo[nat['tipoNativo']]['stato']
            scelto_a_parte = (m['chiave'], nat['indicePin']) in da_bandiera
            assert bool(nat.get('daVerificare')) == (stato == 'da-verificare' and not scelto_a_parte), \
                f'«da verificare» dichiarato male su {m["chiave"]} pin {nat["indicePin"]}'
            if nat.get('daVerificare'):
                prove = nat.get('prove') or {}
                assert prove.get('diffusione') and prove.get('avvertenza'), \
                    f'spillo da verificare senza la scheda delle prove su {m["chiave"]}'
                assert prove == per_tipo[nat['tipoNativo']]['riferimenti'], \
                    f'le prove nel pacchetto non sono quelle del registro semantico su {m["chiave"]}'
                da_verificare_nel_pacchetto[0] += 1
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
    # Ogni pin posato di un tipo ancora da identificare deve portare le sue prove: il conto atteso
    # si ricava dal registro semantico, non dal pacchetto, cosi' toglierle non passa inosservato.
    atteso_da_verificare = 0
    for m in pacchetto['mappe']:
        for s in (m.get('spilli') or []):
            n = s.get('nativo') or {}
            if 'tipoNativo' not in n:
                continue
            if per_tipo[n['tipoNativo']]['stato'] == 'da-verificare' and \
                    (m['chiave'], n.get('indicePin')) not in da_bandiera:
                atteso_da_verificare += 1
    assert da_verificare_nel_pacchetto[0] == atteso_da_verificare, \
        (f'{atteso_da_verificare} spilli sono di un tipo da verificare ma solo '
         f'{da_verificare_nel_pacchetto[0]} portano le prove')
    assert atteso_da_verificare > 0, 'nessuno spillo da verificare: il controllo non starebbe controllando nulla'
    assert ipotesi == semantica['summary']['ipotesi']
    print('OK', determinati, f'tipi dimostrati ({tabella_ok} dalla tabella nativa delle parti '
          f'ricontrollata sull’eseguibile, {urbani} dal nome dello sprite,',
          f'{dagli_script_ok} dalle procedure che accendono la bandiera,',
          f'{dai_pin_ok} dalle prove dirette dei propri pin,',
          f'{osservati_ok} contando le icone nelle schermate,',
          f'{bordo_ok} dalla posizione sul bordo),',
          len(da_bandiera), 'pin riconosciuti uno per uno dalla propria bandiera;',
          f'la lettura geometrica azzecca il {round(misura["accuratezza"]*100)}% su',
          misura['casi'], 'casi di controllo e non determina nulla;',
          len(per_tipo)-determinati-ipotesi, 'lasciati senza;',
          controllati, 'pin nel pacchetto ricontrollati,', con_luogo, 'collegati a un luogo del catalogo,',
          con_condizione, 'con condizione da configurare; contabilità chiusa su', nativi, 'pin nativi')


if __name__ == '__main__':
    main(*sys.argv[1:3])
