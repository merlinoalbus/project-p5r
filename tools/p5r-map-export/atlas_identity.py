"""Catalogo di identità delle 301 planimetrie native: nome, gruppo, luogo e ruolo dell'immagine.

Il problema che risolve: il titolo mostrato non identifica una planimetria. Lo stesso nome è usato
per zone diverse, la stessa zona ha più immagini, e alcune immagini sono la stessa risorsa usata
due volte. L'identità vera sta nel **record nativo di presentazione**: l'elemento di texture
(`texelem`) e l'indice del titolo d'area nel record texpack.

Da qui discendono le tre distinzioni richieste:

* **copia effettiva** — stesso `texelem`, stesso indice di titolo *e* stessi pixel: una sola
  immagine, le altre sono ripetizioni della medesima risorsa;
* **versione della stessa zona** — stesso luogo (gruppo + indice di titolo) ma pixel diversi:
  restano tutte, raccolte sotto quel luogo;
* **zona diversa con lo stesso nome** — indici di titolo distinti che portano lo stesso testo:
  restano luoghi separati e vengono segnalati perché ricevano un nome distintivo verificato.

Il nome si prende dalla prima fonte che lo dimostra, e la fonte viene registrata con offset e
hash. Nessun nome viene inventato: ciò che il gioco non nomina resta dichiarato senza nome, con
il motivo. In particolare non si inventano piani fissi dei Memento: le strutture ricorrenti dei
campi 190-195 sono marcate come tali.
"""
from pathlib import Path
import collections
import json
import re
import sys

CODICE = re.compile(r'^RMAP_(\d+)_(\d+)_(\d+)$')
TECNICO = re.compile(r'^(Area \d+|RMAP|Risorse native|Luogo \d+)')
VUOTI = (None, '', '???', 'NULL')
# I campi da 190 in su sono le strutture ricorrenti usate dai Memento generati: non sono piani fissi.
MEMENTO_RICORRENTI = 190
# Numerazione aggiunta dall'estrattore precedente al Covo dei Ladri: non identifica, si toglie.
LIVELLO_GRAFICO = re.compile(r'\s*·\s*livello grafico \d+$')
# Procedure di teletrasporto e di collaudo: non sono passaggi percorribili, non distinguono nulla.
PROCEDURE_NON_PERCORRIBILI = re.compile(r'(SAFETY_GOTO|DEBUG_GOTO_FIELD|DUNGEON_EXIT_DEBUG)')
GRAFO = 'campi-completi/grafo/collegamenti.csv'


def carica(out):
    leggi = lambda p: json.loads((out/p).read_text(encoding='utf8'))
    return (leggi('mondo_metadati.json'), leggi('mondo_texpack_evidenze.json'),
            leggi('manifest.json'), leggi('indice-luoghi-dungeon.json'))


def contesti_per_immagine(texpack):
    """Ogni livello grafico di ogni record texpack è un contesto in cui l'immagine è presentata."""
    per = collections.defaultdict(list)
    for r in texpack['records']:
        if r['sentinel']:
            continue
        for lv in r['layers']:
            area, gruppo = lv.get('areaTitle') or {}, lv.get('groupTitle') or {}
            per[(r['major'], r['minor'], lv['layer'])].append(dict(
                gruppoTexpack=r['group'], offsetRecord=r['offset'], texelem=lv['elementIndex'],
                elementOffset=lv['elementOffset'],
                areaIndice=area.get('index'), areaOffset=area.get('offset'), areaTesto=area.get('text'),
                gruppoIndice=gruppo.get('index'), gruppoOffset=gruppo.get('offset'), gruppoTesto=gruppo.get('text')))
    return per


def nomi_dall_indice(mappa, campi, indice):
    """Nomi che l'indice nativo dei luoghi assegna ai campi da cui la planimetria è raggiunta."""
    trovati = []
    for fid in mappa['fields']:
        f = campi.get(fid)
        if not f:
            continue
        rec = indice.get((f['major'], f['minor']))
        if not rec:
            continue
        voce = rec['varianti'][f['sub']] if f['sub'] < len(rec['varianti']) else None
        if voce and voce['status'] == 'valido' and voce['text'] not in VUOTI:
            trovati.append((voce['text'], dict(fonte='indice-luoghi-dungeon', campo=fid,
                                               offset=voce['offset'], indice=voce['index'], ruolo='variante')))
        elif rec['gruppo']['status'] == 'valido' and rec['gruppo']['text'] not in VUOTI:
            trovati.append((rec['gruppo']['text'], dict(fonte='indice-luoghi-dungeon', campo=fid,
                                                        offset=rec['gruppo']['offset'],
                                                        indice=rec['gruppo']['index'], ruolo='gruppo')))
    return trovati


def costruisci(out):
    meta, texpack, manifest, indice_dng = carica(out)
    contesti = contesti_per_immagine(texpack)
    campi = {f['id']: f for f in meta['fields']}
    indice = {(r['major'], r['minor']): r for r in indice_dng['tables']['dungeon'] if r['major'] is not None}
    pixel = {}
    for e in manifest['images']:
        m = re.search(r'ROADMAP/(RMAP_\d+_\d+_\d+)\.DDS$', e['source'])
        if m:
            pixel[m.group(1)] = e

    righe = []
    for mappa in meta['maps']:
        c = CODICE.match(mappa['code'])
        if not c:
            raise ValueError(f'Codice di planimetria inatteso: {mappa["code"]}')
        major, minor, layer = (int(v) for v in c.groups())
        im = pixel[mappa['code']]
        ctx = [x for x in contesti.get((major, minor, layer), [])
               if x['areaTesto'] not in VUOTI or x['gruppoTesto'] not in VUOTI]
        titolo_meta = None if TECNICO.match(mappa['title'] or '') else mappa['title']
        dai_campi = nomi_dall_indice(mappa, campi, indice)

        nome = fonte = None
        if ctx and ctx[0]['areaTesto'] not in VUOTI:
            nome, fonte = ctx[0]['areaTesto'], dict(fonte='titolo-area-texpack', indice=ctx[0]['areaIndice'],
                                                    offset=ctx[0]['areaOffset'], texelem=ctx[0]['texelem'])
        elif titolo_meta:
            nome, fonte = titolo_meta, dict(fonte='titolo-roadmap', evidenze=mappa['nameEvidence'])
        elif dai_campi:
            nome, fonte = dai_campi[0]

        gruppo = fonte_gruppo = None
        if ctx and ctx[0]['gruppoTesto'] not in VUOTI:
            gruppo, fonte_gruppo = ctx[0]['gruppoTesto'], 'titolo-gruppo-texpack'
        elif mappa['group'] not in VUOTI and not TECNICO.match(mappa['group'] or ''):
            gruppo, fonte_gruppo = mappa['group'], 'gruppo-roadmap'
        elif dai_campi:
            gruppo, fonte_gruppo = dai_campi[0][0], 'indice-luoghi-dungeon'

        righe.append(dict(
            chiave='nativo-' + mappa['code'].lower().replace('rmap_', 'rmap-').replace('_', '-'),
            codice=mappa['code'], major=major, minor=minor, layer=layer,
            asset='mappe/native/' + mappa['code'].lower().replace('rmap_', 'nativo-rmap-').replace('_', '-'),
            larghezza=im['width'], altezza=im['height'], pixelSha256=im['pixel_sha256'],
            riquadroContenuto=im['alpha_bbox'], categoria=im['category'],
            campi=mappa['fields'], contesti=ctx, nome=nome, fonteNome=fonte,
            gruppo=gruppo, fonteGruppo=fonte_gruppo,
            nomiDaiCampi=[t for t, _ in dai_campi], titoloRoadmap=mappa['title']))

    for r in righe:
        r['chiave'] = 'nativo-rmap-%03d-%d-%d' % (r['major'], r['minor'], r['layer'])
        r['asset'] = 'mappe/native/' + r['chiave']
    return righe, meta


def raggruppa(righe):
    """Assegna ogni immagine al suo luogo e distingue copie, versioni e omonimie."""
    # Un livello grafico senza titolo proprio appartiene al luogo dei livelli fratelli nominati.
    per_risorsa = collections.defaultdict(list)
    for r in righe:
        per_risorsa[(r['major'], r['minor'])].append(r)
    for gruppo_risorsa in per_risorsa.values():
        nominati = [x for x in gruppo_risorsa if x['contesti'] and x['contesti'][0]['areaTesto'] not in VUOTI]
        if not nominati:
            continue
        riferimento = nominati[0]
        for x in gruppo_risorsa:
            if x is riferimento or (x['contesti'] and x['contesti'][0]['areaTesto'] not in VUOTI):
                continue
            if x['nome'] is None or TECNICO.match(x['nome']):
                x['nome'] = riferimento['nome']
                x['gruppo'] = x['gruppo'] or riferimento['gruppo']
                x['fonteNome'] = dict(fonte='livello-fratello-nominato', riferimento=riferimento['chiave'])
                # appartiene al luogo del fratello, non a un luogo omonimo separato
                x['contesti'] = x['contesti'] or riferimento['contesti']

    for r in righe:
        # «livello grafico N» era una numerazione aggiunta a valle: non identifica, si toglie
        if r['nome']:
            r['nome'] = LIVELLO_GRAFICO.sub('', r['nome']).strip()
        if r['nome'] and not TECNICO.match(r['nome']):
            r['statoNome'] = 'nominata'
        else:
            r['nome'] = None
            r['statoNome'] = 'senza-nome-nativo'
            r['motivoSenzaNome'] = ('struttura-ricorrente-dei-memento' if r['major'] >= MEMENTO_RICORRENTI
                                    else 'nessun-campo-la-usa' if not r['campi']
                                    else 'nessuna-tabella-nativa-la-nomina')

    luoghi = collections.OrderedDict()
    for r in righe:
        c = r['contesti'][0] if r['contesti'] else None
        if r['statoNome'] == 'nominata' and c and c['areaIndice'] is not None:
            chiave = ('titolo', c['gruppoIndice'], c['areaIndice'])
        elif r['statoNome'] == 'nominata':
            chiave = ('nome', r['gruppo'], r['nome'])
        elif r['motivoSenzaNome'] == 'struttura-ricorrente-dei-memento':
            # sono le strutture che i Memento riusano: un solo luogo, senza piani inventati
            chiave = ('memento-ricorrenti',)
        else:
            # risorse grafiche che nessun campo usa: una voce sola per Palazzo, non una per texture
            chiave = ('non-usate', r['gruppo'])
        luoghi.setdefault(chiave, []).append(r)

    # Due voci con lo stesso nome, nello stesso gruppo e sulla stessa risorsa di texture sono la
    # stessa zona vista a livelli grafici diversi: vanno raccolte in un luogo solo, non separate.
    radice = {k: k for k in luoghi}

    def trova(k):
        while radice[k] != k:
            radice[k] = radice[radice[k]]
            k = radice[k]
        return k

    per_risorsa_nome = collections.defaultdict(list)
    for chiave, membri in luoghi.items():
        for m in membri:
            per_risorsa_nome[(m['gruppo'], m['nome'], m['major'], m['minor'])].append(chiave)
    for insieme in per_risorsa_nome.values():
        for altra in insieme[1:]:
            radice[trova(altra)] = trova(insieme[0])
    if any(trova(k) != k for k in luoghi):
        unite = collections.OrderedDict()
        for chiave, membri in luoghi.items():
            unite.setdefault(trova(chiave), []).extend(membri)
        luoghi = unite

    catalogo = []
    for chiave, membri in luoghi.items():
        membri.sort(key=lambda x: (x['major'], x['minor'], x['layer']))
        visti, versioni, copie = {}, [], []
        for m in membri:
            gemello = visti.get(m['pixelSha256'])
            if gemello is None:
                visti[m['pixelSha256']] = m['chiave']
                versioni.append(m)
                m['ruolo'] = 'canonica' if len(versioni) == 1 else 'versione'
            else:
                m['ruolo'] = 'copia-di:' + gemello
                copie.append(m)
        primo = versioni[0]
        nome = primo['nome']
        if chiave[0] == 'memento-ricorrenti':
            nome = 'Strutture ricorrenti dei Memento'
        elif chiave[0] == 'non-usate':
            nome = 'Risorse grafiche non usate da alcun campo'
        catalogo.append(dict(
            chiaveLuogo=primo['chiave'], tipoIdentita=chiave[0], identita=list(chiave[1:]),
            nome=nome, nomeNativo=primo['nome'], gruppo=primo['gruppo'], statoNome=primo['statoNome'],
            motivoSenzaNome=primo.get('motivoSenzaNome'),
            campi=sorted({f for m in membri for f in m['campi']}),
            versioni=[m['chiave'] for m in versioni], copie=[m['chiave'] for m in copie]))

    per_testo = collections.defaultdict(set)
    for l in catalogo:
        if l['nome']:
            per_testo[(l['gruppo'], l['nome'])].add(l['chiaveLuogo'])
    omonimi = {f'{g} › {n}': sorted(v) for (g, n), v in per_testo.items() if len(v) > 1}
    for l in catalogo:
        l['omonimo'] = f"{l['gruppo']} › {l['nome']}" in omonimi
    return catalogo, omonimi


def condiviso(campo):
    """Vero per i campi di servizio (stanze sicure e simili) che ogni Palazzo riusa con lo stesso numero.

    Sono le voci `F1xx_05y`: comparirebbero come vicine di tutto e renderebbero indistinguibili
    proprio le zone che si vogliono distinguere.
    """
    m = re.match(r'^F(\d+)_(\d+)_', campo or '')
    return bool(m) and int(m.group(1)) >= 150 and int(m.group(2)) >= 50


def adiacenze(out):
    """Grafo delle transizioni fra campi, escluse le procedure che non sono passaggi percorribili."""
    import csv
    archi = collections.defaultdict(set)
    with (out/GRAFO).open(encoding='utf-8-sig', newline='') as f:
        for r in csv.DictReader(f):
            if PROCEDURE_NON_PERCORRIBILI.search(r['procedura'] or ''):
                continue
            partenza, arrivo = r['campo_partenza'], r['campo_arrivo']
            if not partenza or not arrivo or partenza == arrivo:
                continue
            if condiviso(partenza) or condiviso(arrivo):
                continue
            archi[partenza].add(arrivo)
            archi[arrivo].add(partenza)
    return archi


def distingui_omonimi(out, catalogo, omonimi):
    """Dà un nome distintivo ai luoghi che il gioco chiama allo stesso modo, usando ciò che collegano.

    Quando due zone diverse portano lo stesso nome, il tratto che le distingue davvero è a cosa
    sono attaccate: il grafo delle transizioni fra campi lo dice senza inventare nulla. Se i
    vicini non bastano a distinguerle, resta l'ordine con cui la storia le attraversa.
    """
    archi = adiacenze(out)
    luogo_di_campo = {c: l for l in catalogo for c in l['campi'] if not condiviso(c)}
    for testo, chiavi in omonimi.items():
        gruppo = [l for l in catalogo if l['chiaveLuogo'] in chiavi]
        vicini = {}
        for l in gruppo:
            propri, omonimi_vicini = [], []
            for c in l['campi']:
                for v in archi.get(c, ()):
                    altro = luogo_di_campo.get(v)
                    if not altro or altro is l or not altro['nome']:
                        continue
                    (omonimi_vicini if altro['omonimo'] else propri).append(altro['nome'])
            # prima i vicini con nome proprio, poi quelli a loro volta omonimi
            vicini[l['chiaveLuogo']] = list(dict.fromkeys(sorted(set(propri)) + sorted(set(omonimi_vicini))))
        etichette = {l['chiaveLuogo']: (f"{l['nome']} (tra {' e '.join(vicini[l['chiaveLuogo']][:2])})"
                                        if len(vicini[l['chiaveLuogo']]) >= 2
                                        else f"{l['nome']} (verso {vicini[l['chiaveLuogo']][0]})"
                                        if vicini[l['chiaveLuogo']] else None)
                     for l in gruppo}
        distinti = all(etichette.values()) and len(set(etichette.values())) == len(gruppo)
        # in ordine di attraversamento: i campi seguono l'avanzare della storia dentro la zona
        for posto, l in enumerate(sorted(gruppo, key=lambda x: x['campi'] or ['~'])):
            vic = vicini[l['chiaveLuogo']]
            if distinti:
                l['nomeDistintivo'] = etichette[l['chiaveLuogo']]
                l['fonteDistinzione'] = dict(fonte='vicini-nel-grafo', vicini=vic)
            else:
                l['nomeDistintivo'] = f"{l['nome']} — {posto+1}º tratto"
                l['fonteDistinzione'] = dict(fonte='ordine-di-attraversamento', vicini=vic,
                                             nota='i vicini non bastano a distinguere le zone omonime')
    return catalogo


def confronta_versioni(out, chiavi):
    """Misura come le versioni di un luogo differiscono fra loro: estensione mostrata e inquadratura.

    Le versioni di uno stesso luogo sono la medesima zona rivelata a stadi diversi: il livello
    grafico successivo mostra la parte già nota più quella appena raggiunta. Qui la relazione
    viene misurata sui pixel opachi, non supposta: `contiene` è vero quando la versione più
    grande copre davvero tutto ciò che mostra la più piccola.
    """
    import numpy
    from PIL import Image
    base = Path(__file__).resolve().parents[2]/'public/asset/mappe/native'
    maschere, misure = {}, {}
    for k in chiavi:
        im = Image.open(base/(k+'.png')).convert('RGBA')
        m = numpy.array(im.getchannel('A')) > 0
        maschere[k] = m
        colonne, righe_ = numpy.any(m, axis=0), numpy.any(m, axis=1)
        x = numpy.flatnonzero(colonne)
        y = numpy.flatnonzero(righe_)
        misure[k] = dict(opachi=int(m.sum()), dimensione=list(im.size),
                         riquadro=[int(x[0]), int(y[0]), int(x[-1])+1, int(y[-1])+1] if len(x) else None)
    return maschere, misure


def descrivi_versioni(out, catalogo):
    """Assegna a ogni versione un'etichetta parlante, ricavata da ciò che l'immagine mostra."""
    import numpy
    for luogo in catalogo:
        chiavi = luogo['versioni']
        if len(chiavi) < 2:
            luogo['descrizioneVersioni'] = []
            continue
        if luogo['statoNome'] != 'nominata':
            # Sono risorse grafiche senza zona: descriverne la porzione sarebbe una descrizione di
            # nulla. L'unica identità che hanno è quella nativa, e quella si riporta.
            luogo['descrizioneVersioni'] = [
                dict(chiave=k, progressione=posto, relazione='risorsa nativa distinta',
                     etichetta='risorsa {} livello {}'.format('/'.join(k.split('-')[2:4]), k.split('-')[4]))
                for posto, k in enumerate(chiavi)]
            luogo['relazioneVersioni'] = {'risorsa nativa distinta': len(chiavi)}
            continue
        maschere, misure = confronta_versioni(out, chiavi)
        ordinate = sorted(chiavi, key=lambda k: misure[k]['opachi'])
        intera = ordinate[-1]
        piena = maschere[intera]

        def centro(m):
            y, x = numpy.nonzero(m)
            return x.mean()/m.shape[1], y.mean()/m.shape[0]

        def direzione(dx, dy):
            return ('settentrionale' if dy < 0 else 'meridionale') if abs(dy) >= abs(dx) else \
                   ('occidentale' if dx < 0 else 'orientale')

        cx_int, cy_int = centro(piena)
        etichette, relazioni = {}, {}
        etichette[intera] = 'planimetria completa'
        relazioni[intera] = 'la più estesa'
        for k in ordinate[:-1]:
            m = maschere[k]
            if m.shape != piena.shape:
                relazioni[k] = 'inquadratura diversa'
            else:
                fuori = int((m & ~piena).sum())
                dentro = int((m & piena).sum())
                if fuori <= m.sum()*0.02 and dentro >= piena.sum()*0.98:
                    relazioni[k] = 'quasi identica'
                    etichette[k] = 'variante grafica'
                    continue
                relazioni[k] = 'contenuta' if fuori <= m.sum()*0.02 else 'inquadratura diversa'
            cx, cy = centro(m)
            verso = direzione(cx-cx_int, cy-cy_int)
            if relazioni[k] == 'contenuta':
                etichette[k] = ('settore d’ingresso' if k == ordinate[0] and misure[k]['opachi'] < misure[intera]['opachi']*0.5
                                else f'porzione {verso}')
            else:
                etichette[k] = f'inquadratura {verso}'
        # se due versioni finiscono con la stessa etichetta, si distinguono per quanta zona coprono
        ORDINALI = ['più ampia', 'seconda per ampiezza', 'terza per ampiezza', 'quarta per ampiezza',
                    'quinta per ampiezza', 'sesta per ampiezza']
        for testo, quante in collections.Counter(etichette.values()).items():
            if quante < 2:
                continue
            pari = sorted((j for j in ordinate if etichette[j] == testo),
                          key=lambda j: -misure[j]['opachi'])
            for posto, j in enumerate(pari):
                etichette[j] = testo + ' — ' + ('più ristretta' if posto == len(pari)-1
                                                else ORDINALI[posto] if posto < len(ORDINALI)
                                                else f'{posto+1}ª per ampiezza')
        cronologia = sorted(chiavi, key=lambda k: tuple(int(v) for v in k.split('-')[2:]))
        luogo['descrizioneVersioni'] = [
            dict(chiave=k, opachi=misure[k]['opachi'], dimensione=misure[k]['dimensione'],
                 riquadro=misure[k]['riquadro'], progressione=cronologia.index(k),
                 relazione=relazioni[k], etichetta=etichette[k]) for k in chiavi]
        luogo['relazioneVersioni'] = dict(collections.Counter(relazioni.values()))
    return catalogo


def main(out):
    out = Path(out)
    righe, meta = costruisci(out)
    catalogo, omonimi = raggruppa(righe)
    distingui_omonimi(out, catalogo, omonimi)
    descrivi_versioni(out, catalogo)
    senza = [r for r in righe if r['statoNome'] == 'senza-nome-nativo']
    risultato = dict(
        schemaVersion=1,
        sources=dict(metadati='mondo_metadati.json', texpack='mondo_texpack_evidenze.json',
                     manifest='manifest.json', indiceDungeon='indice-luoghi-dungeon.json'),
        criterio=dict(
            identita='texelem + indice del titolo d’area del record texpack',
            copia='stesso texelem, stesso indice di titolo e stessi pixel',
            versione='stesso luogo, pixel diversi',
            omonimia='stesso testo con indici di titolo distinti: luoghi separati da distinguere'),
        immagini=righe, luoghi=catalogo, omonimi=omonimi,
        summary=dict(
            immagini=len(righe), luoghi=len(catalogo),
            nominate=sum(r['statoNome'] == 'nominata' for r in righe), senzaNome=len(senza),
            motiviSenzaNome=dict(collections.Counter(r['motivoSenzaNome'] for r in senza)),
            fontiDelNome=dict(collections.Counter(
                (r['fonteNome'] or {}).get('fonte', 'nessuna') for r in righe)),
            luoghiConPiuVersioni=sum(len(l['versioni']) > 1 for l in catalogo),
            copie=sum(len(l['copie']) for l in catalogo),
            nomiOmonimi=len(omonimi),
            luoghiOmonimi=sum(l['omonimo'] for l in catalogo),
            distinzioniDimostrate=sum((l.get('fonteDistinzione') or {}).get('fonte') == 'vicini-nel-grafo' for l in catalogo),
            luoghiPerGruppo=dict(collections.Counter(l['gruppo'] for l in catalogo))),
        limits=['Un titolo di campo non prova un nome distinto del livello grafico.',
                'Le strutture ricorrenti dei Memento non sono piani fissi e non ricevono un nome inventato.',
                'Gli omonimi restano luoghi separati: vanno distinti, non numerati.'])
    (out/'atlante-identita.json').write_text(json.dumps(risultato, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps(risultato['summary'], ensure_ascii=False, indent=1))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
