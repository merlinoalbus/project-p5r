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
from scrittura import scrivi_json
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
            leggi('manifest.json'), leggi('indice-luoghi-dungeon.json'),
            leggi('nomi-mappe-ufficiali.json'))


def normalizza_nome(testo):
    """Forma di confronto fra nomi della stessa zona scritti da tabelle diverse."""
    import unicodedata
    t = unicodedata.normalize('NFKD', (testo or '').casefold())
    t = ''.join(c for c in t if not unicodedata.combining(c))
    return ' '.join(re.sub(r'[^a-z0-9]+', ' ', t).split())


def nomi_ufficiali(tabella):
    """Le destinazioni del menu di viaggio, indicizzate per forma di confronto del nome.

    È la tabella che il gioco mostra al giocatore quando apre la mappa d'insieme, quindi è la
    grafia ufficiale italiana di quei luoghi. Non è però indicizzata per planimetria: dice come
    si chiama una destinazione, non quale immagine la rappresenta. Serve perciò a fissare la
    grafia di un nome che l'identità nativa ha già stabilito, non a stabilire l'identità.
    """
    per_nome = {}
    for insieme, record in tabella['tables'].items():
        sorgente = tabella['sources'][insieme]
        for r in record:
            for v in r['voci']:
                if v['stato'] != 'valido' or v['nome'] in ('Annulla',):
                    continue
                chiave = normalizza_nome(v['nome'])
                if chiave and chiave not in per_nome:
                    per_nome[chiave] = dict(nome=v['nome'], insieme=insieme, offset=v['offset'],
                                            record=r['index'], voce=v['index'],
                                            file=sorgente['file'], sha256=sorgente['sha256'])
    return per_nome


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
    meta, texpack, manifest, indice_dng, tabella_ufficiale = carica(out)
    ufficiali = nomi_ufficiali(tabella_ufficiale)
    sorgente_texpack = texpack['source']
    sorgente_indice = indice_dng['sources']['dungeon']
    sorgente_titoli = {s['path'].rsplit('/', 1)[-1]: s for s in meta['sources']}
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

        # L'identità la stabilisce il record nativo; sulla grafia ha l'ultima parola la tabella
        # ufficiale delle destinazioni, che è il testo che il gioco mostra al giocatore.
        nome = fonte = None
        if ctx and ctx[0]['areaTesto'] not in VUOTI:
            nome = ctx[0]['areaTesto']
            fonte = dict(fonte='titolo-area-texpack', indice=ctx[0]['areaIndice'], offset=ctx[0]['areaOffset'],
                         texelem=ctx[0]['texelem'], file=sorgente_texpack['file'], sha256=sorgente_texpack['sha256'])
        elif dai_campi:
            nome, fonte = dai_campi[0]
            fonte = dict(fonte, file=sorgente_indice['file'], sha256=sorgente_indice['sha256'])
        elif titolo_meta:
            # Il titolo roadmap può essere composto: la scuola unisce due edifici con «/», e per il
            # Covo l'estrattore aveva aggiunto una numerazione. Ogni pezzo del nome deve poter
            # essere ritrovato nella tabella dei luoghi, con il suo indice e il suo offset.
            nome = LIVELLO_GRAFICO.sub('', titolo_meta).strip()
            luoghi_campo = [campi[f]['place'] for f in mappa['nameEvidence'] if campi.get(f, {}).get('place')]
            voci = [v for l in luoghi_campo for v in (l['floors'] + [l['group']])]
            componenti = []
            for pezzo in [t.strip() for t in nome.split('/')]:
                v = next((x for x in voci if x['title'] == pezzo), None)
                componenti.append(dict(testo=pezzo, indice=v['index'] if v else None,
                                       offset=v['offset'] if v else None))
            titoli = sorgente_titoli.get('FLDPLACENAME.FTD', {})
            primo = next((c for c in componenti if c['offset'] is not None), None)
            fonte = dict(fonte='titolo-roadmap', evidenze=mappa['nameEvidence'], componenti=componenti,
                         offset=primo['offset'] if primo else None, indice=primo['indice'] if primo else None,
                         file=titoli.get('file'), sha256=titoli.get('sha256'),
                         indiceLuoghi={k: sorgente_titoli['FLDPLACENO.FTD'][k] for k in ('file', 'sha256')}
                         if 'FLDPLACENO.FTD' in sorgente_titoli else None)
        if nome:
            ufficiale = ufficiali.get(normalizza_nome(nome))
            if ufficiale:
                fonte = dict(fonte='nome-ufficiale-mappa-insieme', grafiaDa=fonte,
                             tabella=ufficiale['insieme'], record=ufficiale['record'], voce=ufficiale['voce'],
                             offset=ufficiale['offset'], file=ufficiale['file'], sha256=ufficiale['sha256'],
                             identitaDa=(fonte or {}).get('fonte'))
                nome = ufficiale['nome']

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
                x['fonteNome'] = dict(fonte='livello-fratello-nominato', riferimento=riferimento['chiave'],
                                      **{k: v for k, v in (riferimento['fonteNome'] or {}).items()
                                         if k in ('file', 'sha256', 'offset')})
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
        # Una copia è la stessa risorsa usata due volte: stessi pixel **e** stesso record nativo di
        # presentazione. Pixel uguali da soli non bastano — il gioco riusa la stessa sagoma per
        # stanze diverse — e un'immagine senza record non è dimostrabile come copia di nessuna.
        def presentazione(m):
            return tuple(sorted({(c['texelem'], c['areaIndice']) for c in m['contesti']}))
        visti, versioni, copie = {}, [], []
        for m in membri:
            firma = presentazione(m)
            gemello = visti.get((m['pixelSha256'], firma)) if firma else None
            if gemello is None:
                if firma:
                    visti[(m['pixelSha256'], firma)] = m['chiave']
                versioni.append(m)
                m['ruolo'] = 'canonica' if len(versioni) == 1 else 'versione'
            else:
                m['ruolo'] = 'copia-di:' + gemello
                copie.append(m)
        primo = versioni[0]
        catalogo.append(dict(
            chiaveLuogo=primo['chiave'], tipoIdentita=chiave[0], identita=list(chiave[1:]),
            nome=primo['nome'], gruppo=primo['gruppo'], statoNome=primo['statoNome'],
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


def vicini_nel_grafo(archi, luogo_di_campo, luogo):
    """I luoghi attaccati a questo, secondo le transizioni fra campi."""
    trovati = []
    for c in luogo['campi']:
        for v in archi.get(c, ()):
            altro = luogo_di_campo.get(v)
            if altro is not None and altro is not luogo:
                trovati.append(altro)
    return trovati


def nomi_enumerati_dalla_guida(seed):
    """Nomi che la guida usa per le zone che il gioco chiama tutte allo stesso modo.

    La guida italiana distingue già ciò che il gioco confonde: dove il gioco ha cinque
    «Corridoio della prigione», la guida ha «Corridoio della prigione – Parte I, II, III». Sono
    nomi di una fonte editoriale che l'applicazione già usa in Palazzi e Dedali: adottarli qui
    significa che le due sezioni chiamano la stessa zona allo stesso modo.
    """
    if not seed or not (seed/'dungeon.json').exists():
        return {}
    dungeon = json.loads((seed/'dungeon.json').read_text(encoding='utf8'))
    per_base = collections.defaultdict(list)
    for d in dungeon:
        for a in d.get('aree', []):
            base = re.split(r'\s+[–—-]\s+Parte\b', a['nome'], maxsplit=1)[0].strip()
            if base != a['nome']:
                per_base[(d['chiave'], base.casefold())].append(a)
    return {k: sorted(v, key=lambda a: a['ordine']) for k, v in per_base.items()}


def raffina_colori(catalogo, archi, luogo_di_campo, giri=4):
    """Raffinazione iterativa: due zone omonime possono separarsi guardando com'è fatto l'intorno.

    Al primo giro ogni luogo vale il proprio nome, quindi le omonime si equivalgono. Al giro
    successivo conta anche il colore dei vicini, poi quello dei vicini dei vicini: una catena di
    zone identiche si distingue partendo dagli estremi, che confinano con qualcosa di diverso.
    """
    colore = {l['chiaveLuogo']: (l['gruppo'], l['nome']) for l in catalogo}
    for _ in range(giri):
        nuovo = {l['chiaveLuogo']: (colore[l['chiaveLuogo']],
                                    tuple(sorted(str(colore[v['chiaveLuogo']])
                                                 for v in vicini_nel_grafo(archi, luogo_di_campo, l))))
                 for l in catalogo}
        if len({str(v) for v in nuovo.values()}) == len({str(v) for v in colore.values()}):
            break
        colore = nuovo
    return {k: str(v) for k, v in colore.items()}


ROMANI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']


def risolvi_omonimi(gruppo, contesto, ultimo=False):
    """Prova a dare un nome distintivo a un gruppo di zone che il gioco chiama allo stesso modo.

    In ordine, e solo con prove:

    1. **ciò a cui sono attaccate** — i vicini nel grafo delle transizioni, presi con il loro nome
       distintivo quando ce l'hanno già;
    2. **i nomi che la guida ha già enumerato** — dove la guida distingue le stesse zone e il
       numero coincide, si adottano i suoi nomi nell'ordine in cui il grafo le attraversa;
    3. **la raffinazione sul grafo** — se l'intorno esteso le separa, il nome lo danno comunque i
       vicini più prossimi.

    Torna vero quando ci riesce. Con `ultimo` resta l'ordine di attraversamento, nella stessa
    forma che la guida usa per le zone omonime dello stesso tipo.
    """
    archi, luogo_di_campo = contesto['archi'], contesto['luoghiPerCampo']
    ordinati = sorted(gruppo, key=lambda x: x['campi'] or ['~'])

    def nome_utile(v):
        return v.get('nomeDistintivo') or (None if v['omonimo'] else v['nome'])
    vicini = {l['chiaveLuogo']: sorted({n for n in (nome_utile(v) for v in vicini_nel_grafo(archi, luogo_di_campo, l)) if n})
              for l in gruppo}

    def dai_vicini(l):
        v = vicini[l['chiaveLuogo']]
        return f"{l['nome']} (tra {' e '.join(v[:2])})" if len(v) >= 2 else f"{l['nome']} (verso {v[0]})" if v else None

    def assegna(fonte, etichette, extra=None):
        for l in gruppo:
            l['nomeDistintivo'] = etichette[l['chiaveLuogo']]
            l['fonteDistinzione'] = dict(fonte=fonte, vicini=vicini[l['chiaveLuogo']], **(extra or {}))

    def univoche(etichette):
        return all(etichette.values()) and len(set(etichette.values())) == len(gruppo)

    proposte = {l['chiaveLuogo']: dai_vicini(l) for l in gruppo}
    if univoche(proposte):
        assegna('vicini-nel-grafo', proposte)
        return True

    dungeon = contesto['dungeonDiGruppo'].get(gruppo[0]['gruppo'], '')
    aree = contesto['guida'].get((dungeon, (gruppo[0]['nome'] or '').casefold()), [])
    if len(aree) == len(gruppo):
        for l, area in zip(ordinati, aree):
            l['nomeDistintivo'] = area['nome']
            l['fonteDistinzione'] = dict(fonte='nomi-enumerati-dalla-guida', area=area['chiave'],
                                         vicini=vicini[l['chiaveLuogo']],
                                         nota='assegnati nell’ordine in cui il grafo attraversa le zone')
        return True

    colore = contesto['colore']
    if len({colore[l['chiaveLuogo']] for l in gruppo}) == len(gruppo) and univoche(proposte):
        assegna('raffinazione-sul-grafo', proposte)
        return True

    for l in gruppo:
        l['nomeDistintivo'] = None
        l['fonteDistinzione'] = None
    if not ultimo:
        return False
    for posto, l in enumerate(ordinati):
        l['nomeDistintivo'] = f"{l['nome']} – Parte {ROMANI[posto] if posto < len(ROMANI) else posto + 1}"
        l['fonteDistinzione'] = dict(
            fonte='ordine-di-attraversamento', vicini=vicini[l['chiaveLuogo']],
            nota='né i vicini nel grafo né la guida distinguono queste zone: resta l’ordine in cui la '
                 'storia le attraversa, nella forma che la guida usa per le zone omonime dello stesso tipo')
    return True


def distingui_omonimi(out, catalogo, omonimi, seed=None, dungeon_di_gruppo=None):
    """Distingue tutti i gruppi di zone omonime, in più passaggi.

    Un gruppo appena distinto diventa un vicino utile per gli altri: così una catena di zone
    identiche si scioglie dagli estremi verso il centro, invece di arrendersi al primo giro.
    """
    archi = adiacenze(out)
    luogo_di_campo = {c: l for l in catalogo for c in l['campi'] if not condiviso(c)}
    contesto = dict(archi=archi, luoghiPerCampo=luogo_di_campo,
                    guida=nomi_enumerati_dalla_guida(seed),
                    dungeonDiGruppo=dungeon_di_gruppo or {},
                    colore=raffina_colori(catalogo, archi, luogo_di_campo))
    per_chiave = {l['chiaveLuogo']: l for l in catalogo}
    da_fare = [[per_chiave[c] for c in chiavi] for chiavi in omonimi.values()]
    while da_fare:
        rimasti = [g for g in da_fare if not risolvi_omonimi(g, contesto)]
        if len(rimasti) == len(da_fare):
            break
        da_fare = rimasti
    for gruppo in da_fare:
        risolvi_omonimi(gruppo, contesto, ultimo=True)
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


def descrivi_immagini(out, chiavi):
    """Descrive immagini che non rappresentano una zona nota: com'è la tela, quanto disegno porta.

    Serve dove il gioco non dà un nome e le immagini non sono versioni di uno stesso luogo: dirne
    la porzione sarebbe falso, e riportarne il codice nativo sarebbe un'etichetta tecnica. Restano
    la forma e l'estensione, che sono misure e si leggono.
    """
    maschere, misure = confronta_versioni(out, chiavi)

    def forma(k):
        larghezza, altezza = misure[k]['dimensione']
        rapporto = larghezza/altezza
        return 'tela larga' if rapporto > 1.4 else 'tela alta' if rapporto < 0.72 else 'tela quadrata'

    def estensione(k):
        larghezza, altezza = misure[k]['dimensione']
        quota = misure[k]['opachi']/(larghezza*altezza)
        return 'disegno esteso' if quota > 0.22 else 'disegno medio' if quota > 0.07 else 'disegno minuto'

    etichette = {k: f'{forma(k)}, {estensione(k)}' for k in chiavi}
    ORDINALI = ['la più estesa', 'la seconda per estensione', 'la terza per estensione',
                'la quarta per estensione', 'la quinta per estensione']
    for testo, quante in collections.Counter(etichette.values()).items():
        if quante < 2:
            continue
        pari = sorted((k for k in chiavi if etichette[k] == testo), key=lambda k: -misure[k]['opachi'])
        for posto, k in enumerate(pari):
            etichette[k] = testo + ' — ' + ('la meno estesa' if posto == len(pari)-1
                                            else ORDINALI[posto] if posto < len(ORDINALI)
                                            else f'{posto+1}ª per estensione')
    return [dict(chiave=k, opachi=misure[k]['opachi'], dimensione=misure[k]['dimensione'],
                 riquadro=misure[k]['riquadro'], progressione=posto,
                 relazione='risorsa nativa distinta', etichetta=etichette[k])
            for posto, k in enumerate(chiavi)]


def descrivi_versioni(out, catalogo):
    """Assegna a ogni versione un'etichetta parlante, ricavata da ciò che l'immagine mostra."""
    import numpy
    for luogo in catalogo:
        chiavi = luogo['versioni']
        if len(chiavi) < 2:
            luogo['descrizioneVersioni'] = []
            continue
        if luogo['statoNome'] != 'nominata':
            # Sono risorse grafiche che non rappresentano una zona nota: dire «porzione
            # settentrionale» suggerirebbe che siano parti di uno stesso luogo, e non lo sono.
            # Si descrive allora l'immagine per quello che è: la forma della tela e quanto disegno
            # porta. Sono misure, non un codice.
            luogo['descrizioneVersioni'] = descrivi_immagini(out, chiavi)
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


# Dove vive ciascun gruppo nativo: serve solo a ritrovare le aree della guida dello stesso Palazzo.
DUNGEON_DI_GRUPPO = {
    'Palazzo di Kamoshida': 'kamoshida', 'Palazzo di Madarame': 'madarame',
    'Palazzo di Kaneshiro': 'kaneshiro', 'Palazzo di Futaba': 'futaba',
    'Palazzo di Okumura': 'okumura', 'Palazzo di Niijima': 'niijima',
    'Palazzo di Shido': 'shido', 'Palazzo di Maruki': 'maruki',
    'Profondità dei Memento': 'iweleth', 'Mondo del clifoto': 'iweleth',
    'Memento - aree fisse': 'mementos',
}


def main(out, seed=None):
    out = Path(out)
    seed = Path(seed) if seed else Path(__file__).resolve().parents[2]/'data/seed'
    righe, meta = costruisci(out)
    catalogo, omonimi = raggruppa(righe)
    distingui_omonimi(out, catalogo, omonimi, seed, DUNGEON_DI_GRUPPO)
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
    scrivi_json(out/'atlante-identita.json', risultato)
    print(json.dumps(risultato['summary'], ensure_ascii=False, indent=1))
    return risultato


if __name__ == '__main__':
    main(*sys.argv[1:3])
