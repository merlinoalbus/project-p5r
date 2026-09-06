"""Che cosa indica ciascun pin nativo, e con quale segnalino dell'applicazione va reso.

Il tipo nativo di un pin è un numero. Il suo significato sta nel nome interno dello sprite che il
gioco gli associa, letto in `icone-mappa.json`. Per il blocco urbano la corrispondenza è
dimostrata (i negozi che ne risultano coincidono, mappa per mappa, con le destinazioni ufficiali
della stessa mappa), e qui ogni nome interno viene tradotto in un tipo di segnalino
dell'applicazione e in un'etichetta italiana.

Per i Palazzi lo sprite non basta — le loro icone stanno in tratti spezzati del foglio e nessuno
scarto le raggiunge — ma il gioco dice lo stesso che cosa sono, e lo dice nel proprio codice.
Ogni pin condizionale porta la **bandiera** che lo rende visibile, e negli script di campo esiste
la procedura che quella bandiera accende: il suo nome dice che cosa è appena stato rivelato
(`TBOX_minimap` un forziere, `R_TBOX` un forziere raro, `SEEDicon` un seme della bramosia,
`GIM_BLUE_SWITCH` una leva). Dove il nome è parlante e domina, il tipo è determinato; dove le
procedure si limitano ad accendere un bit senza dire altro, resta indeterminato.

La conferma arriva da una seconda strada indipendente: il trigger che chiama quella procedura ha
un'etichetta nelle tabelle native, e per le leve dice «Tira leva», per le porte «Apri porta».

Le icone native non entrano nell'applicazione: servono a capire, e ogni pin viene poi disegnato
con il segnalino dell'app corrispondente.
"""
from pathlib import Path
import collections
import json
import re
import sys

BIT_ACCESA = re.compile(r'BIT_ON\(\(0x20000000 \+ (\d+)\)\)')
# tabella nativa da cui viene l'etichetta di un trigger, secondo il tipo di richiesta
PROMPTS = {**{i: 'FLDCHECKNAME' for i in (*range(7), 12)}, **{i: 'FLDACTIONNAME' for i in (7, 8, 9)},
           10: 'FLDNPCNAME', 11: 'FLDPLACENAME', 13: 'FLDKFECHECKNAME', 14: 'FLDDNGCHECKNAME'}

# Nome interno dello sprite → tipo di segnalino dell'applicazione, etichetta italiana e parole con
# cui riconoscere, nel catalogo del quartiere, il luogo che il pin indica. Il tipo è uno di quelli
# del registro `shared/spilli.ts`; le parole servono solo a cercare, e una corrispondenza vale
# soltanto se nel quartiere ne trova esattamente una.
SIGNIFICATO = {
    'アイコン：自販機': ('distributore', 'Distributore di bevande'),
    'アイコン：宝くじ': ('attivita', 'Lotteria'),
    'アイコン：バイト情報': ('cercalavoro', 'Bacheca dei lavori'),
    'アイコン：ジューサーバー': ('distributore', 'Chiosco dei succhi'),
    'アイコン：キヨスク': ('negozio', 'Chiosco'),
    'アイコン：本屋': ('negozio', 'Libreria'),
    'アイコン：レンタルDVD': ('negozio', 'Noleggio di film'),
    'アイコン：ファミレス': ('ristorante', 'Ristorante di famiglia'),
    'アイコン：牛丼': ('ristorante', 'Manzo e riso'),
    'アイコン：ミリタリーショップ': ('negozio', 'Negozio softair'),
    'アイコン：ゲーセン': ('sala-giochi', 'Sala giochi'),
    'アイコン：コンビニ': ('negozio', 'Minimarket'),
    'アイコン：ジム': ('attivita', 'Palestra'),
    'アイコン：ビックバンバーガー': ('ristorante', 'Big Bang Burger'),
    'アイコン：ドラッグストア': ('negozio', 'Farmacia'),
    'アイコン：ドンキ': ('negozio', 'Grande magazzino'),
    'アイコン：映画館': ('cinema', 'Cinema'),
    'アイコン：花屋': ('negozio', 'Fioraio'),
    'アイコン：スーパー': ('negozio', 'Supermercato'),
    'アイコン：スポーツ用品': ('negozio', 'Articoli sportivi'),
    'アイコン：和風雑貨': ('negozio', 'Articoli tradizionali'),
    'アイコン：宝石店': ('negozio', 'Gioielleria'),
    'アイコン：アクセサリー': ('negozio', 'Accessori'),
    'アイコン：コスメ': ('negozio', 'Cosmetici'),
    'アイコン：パン屋': ('negozio', 'Panetteria'),
    'アイコン：トイレ': ('nota', 'Servizi igienici'),
    'アイコン：教室': ('attivita', 'Aula'),
    'アイコン：囚人高校': ('attivita', 'Scuola'),
    'アイコン：バー': ('ristorante', 'Bar'),
    'アイコン：雑貨屋': ('negozio', 'Casalinghi'),
    'アイコン：レトロゲーム': ('negozio', 'Retrogiochi'),
    'アイコン：メイドカフェ': ('ristorante', 'Maid café'),
    'アイコン：カチャガチャ': ('negozio', 'Distributori di capsule'),
    'アイコン：家電量販店': ('negozio', 'Elettronica'),
    'アイコン：グッズショップ': ('negozio', 'Gadget'),
    'アイコン：工具店': ('negozio', 'Ferramenta'),
    'アイコン：銭湯': ('terme', 'Bagno pubblico'),
    'アイコン：ルブラン': ('casa', 'Café Leblanc'),
    'アイコン：コインランドリー': ('lavanderia', 'Lavanderia automatica'),
    'アイコン：バッティング': ('attivita', 'Gabbie di battuta'),
    'アイコン：リサイクルショップ': ('negozio', 'Usato'),
    'アイコン：診療所': ('negozio', 'Clinica'),
    'アイコン：文房具': ('negozio', 'Cartoleria'),
    'アイコン：古着屋': ('negozio', 'Abbigliamento usato'),
    'アイコン：お寺': ('culto', 'Tempio'),
    'アイコン：ジャズクラブ': ('attivita', 'Jazz club'),
    'アイコン：パワーストーン': ('negozio', 'Pietre'),
    'アイコン：ダーツ': ('attivita', 'Freccette'),
    'アイコン：お香': ('negozio', 'Incensi'),
    'アイコン：揚げ物屋': ('ristorante', 'Fritti'),
    'スーパー（小）': ('negozio', 'Supermercato'),
}

# Nomi di procedura che dicono che cosa il pin rappresenta, con il tipo di segnalino e l'etichetta.
# L'ordine conta: la prima famiglia che riconosce il nome vince, e le varianti rare vanno prima
# della forma generica.
FAMIGLIE = [
    (r'(R_TBOX|RARE_TBOX)', 'forziere', 'Forziere raro'),
    (r'(TBOX|_BOX_)', 'forziere', 'Forziere'),
    (r'SEEDicon', 'seme-bramosia', 'Seme della bramosia'),
    (r'(GIM_\w*SWITCH|_SWITCH|gate_\w*chenge)', 'meccanismo', 'Meccanismo'),
    (r'DOOR', 'porta', 'Porta'),
    (r'SAFETY_ROOM', 'sicura', 'Stanza sicura'),
]
# Un tipo è determinato quando una famiglia parlante copre almeno questa quota delle procedure
# riconosciute, e i casi sono almeno questi: sotto, è un indizio, non una prova.
DOMINANZA = 0.7
MINIMO_CASI = 8
# Con meno casi il tipo passa lo stesso se la seconda strada lo conferma: l'etichetta del trigger
# che chiama quella procedura deve dire la stessa cosa, e dirlo più di una volta.
MINIMO_CASI_CON_CONFERMA = 3
MINIME_CONFERME = 2
# Parole che, nell'etichetta di un trigger, confermano la famiglia.
CONFERME = {
    'forziere': ['forzier', 'tesoro'],
    'meccanismo': ['leva', 'interruttore', 'pulsante'],
    'porta': ['porta', 'portone'],
    'sicura': ['safe room', 'stanza sicura', 'punto di ritorno'],
    'seme-bramosia': ['seme'],
}

PROVE_PALAZZI = [
    dict(prova='scarto costante sul foglio sprite',
         esito='fallita',
         dettaglio='per il blocco urbano lo scarto 68 funziona perché quelle icone sono contigue nel '
                   'foglio (indici 114-164); le icone da Palazzo stanno invece in tratti spezzati '
                   '(22-33, 53-65, 73-94), e nessuno scarto fra -5 e 44 le raggiunge tutte.'),
    dict(prova='un altro foglio sprite',
         esito='fallita',
         dettaglio='gli unici altri fogli dell’archivio sono la mappa delle linee (nomi di stazione) '
                   'e quelli dei Memento e dei bonus: nessuno contiene icone da Palazzo.'),
    dict(prova='correlazione con i punti della guida',
         esito='fallita',
         dettaglio='confrontando, su 65 aree, quante volte ciascun tipo nativo compare con quante volte '
                   'compare ciascun tipo di punto della guida, la correlazione più alta è 0,58 e la '
                   'maggioranza sta sotto 0,3: è rumore, non una corrispondenza.'),
    dict(prova='procedura che accende la bandiera del pin',
         esito='riuscita',
         dettaglio='ogni pin condizionale porta la bandiera che lo rivela, e negli script esiste la '
                   'procedura che la accende con BIT_ON: il suo nome dice che cosa è. Copre i tipi con '
                   'una famiglia dominante e lascia indeterminati quelli le cui procedure si limitano '
                   'ad accendere un bit.'),
    dict(prova='etichetta del trigger che chiama quella procedura',
         esito='riuscita come conferma',
         dettaglio='seconda strada indipendente: per il tipo delle leve dice «Tira leva» 47 volte su 53, '
                   'per quello delle porte «Apri porta». Conferma la prima senza sostituirla.'),
]


def famiglia_di(nome):
    for schema, tipo, etichetta in FAMIGLIE:
        if re.search(schema, nome):
            return schema, tipo, etichetta
    return None


def significato_dagli_script(out):
    """Che cosa dice il gioco di ciascun tipo di pin, leggendo il proprio codice.

    Un pin condizionale è reso visibile da una bandiera; negli script c'è la procedura che quella
    bandiera accende, e il nome della procedura dice che cosa è appena comparso sulla mappa. Il
    trigger che chiama la procedura porta, quando c'è, anche un'etichetta nelle tabelle native: la
    si raccoglie come conferma indipendente, non come prova principale.
    """
    meta = json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    con = json.loads((out/'campi-completi/connessioni.json').read_text(encoding='utf8'))
    tabelle = json.loads((out/'mondo_etichette.json').read_text(encoding='utf8'))['tables']

    def etichetta(trigger):
        nome = PROMPTS.get(trigger.get('promptType'))
        voci = tabelle.get(nome) or []
        i = trigger.get('nameId')
        if not nome or i is None or i >= len(voci):
            return None
        v = voci[i]
        return v['text'] if v.get('status') == 'valido' and v['text'] not in ('NULL', '') else None

    procedure_di_bandiera, etichette_di_procedura = collections.defaultdict(set), collections.defaultdict(set)
    for f in con['fields']:
        for i, p in enumerate(f['procedures']):
            for m in BIT_ACCESA.finditer(p['body'] or ''):
                procedure_di_bandiera[(f['field'], 0x20000000 + int(m.group(1)))].add((i, p['name']))
        for t in f['triggers']:
            e = etichetta(t)
            if e is not None and t.get('procedureIndex') is not None:
                etichette_di_procedura[(f['field'], t['procedureIndex'])].add(e)

    prove = collections.defaultdict(lambda: dict(famiglie=collections.Counter(), procedure=collections.Counter(),
                                                 etichette=collections.Counter(), pin=0))
    for mappa in meta['maps']:
        for p in mappa['pins']:
            if not p['conditional']:
                continue
            for campo in mappa['fields']:
                trovate = procedure_di_bandiera.get((campo, p['flag']))
                if not trovate:
                    continue
                v = prove[p['nativeType']]
                v['pin'] += 1
                for indice, nome in trovate:
                    v['procedure'][re.sub(r'\d+', '#', nome)] += 1
                    fam = famiglia_di(nome)
                    if fam:
                        v['famiglie'][fam[0]] += 1
                    for e in etichette_di_procedura.get((campo, indice), ()):
                        v['etichette'][e] += 1
                break

    esito = {}
    for tipo, v in prove.items():
        riconosciute = sum(v['famiglie'].values())
        migliore, quante = (v['famiglie'].most_common(1) or [(None, 0)])[0]
        _, tipo_spillo, etichetta_it = next(f for f in FAMIGLIE if f[0] == migliore) if migliore else (None, None, None)
        conferme = sum(n for testo, n in v['etichette'].items()
                       if any(par in testo.casefold() for par in CONFERME.get(tipo_spillo, [])))
        abbastanza = quante >= MINIMO_CASI or (quante >= MINIMO_CASI_CON_CONFERMA and conferme >= MINIME_CONFERME)
        determinato = bool(migliore) and abbastanza and quante >= riconosciute*DOMINANZA
        esito[tipo] = dict(
            pinConBandieraRisolta=v['pin'], procedureRiconosciute=riconosciute,
            famigliaDominante=migliore, casiDellaFamiglia=quante, confermeDaiTrigger=conferme,
            quota=round(quante/riconosciute, 3) if riconosciute else 0.0,
            procedure=dict(v['procedure'].most_common(5)), etichetteDeiTrigger=dict(v['etichette'].most_common(5)),
            tipoSpillo=tipo_spillo if determinato else None,
            etichetta=etichetta_it if determinato else None,
            stato='determinato' if determinato else 'non-determinato')
    return esito


def main(out):
    out = Path(out)
    icone = json.loads((out/'icone-mappa.json').read_text(encoding='utf8'))
    dagli_script = significato_dagli_script(out)
    righe = []
    for r in icone['tipiNativi']:
        voce = dict(tipoNativo=r['tipoNativo'], occorrenze=r['occorrenze'],
                    mappeUrbane=r['mappeUrbane'], mappeDungeon=r['mappeDungeon'],
                    condizionali=r['condizionali'], sprite=r['sprite'], nomeNativo=r['nomeNativo'],
                    associazione=r['associazione'])
        significato = SIGNIFICATO.get(r['nomeNativo'] or '')
        script = dagli_script.get(r['tipoNativo'])
        voce['script'] = script
        if r['associazione'] == 'blocco-urbano-dimostrato' and significato:
            voce.update(tipoSpillo=significato[0], etichetta=significato[1], stato='determinato',
                        prova='nome interno dello sprite del blocco urbano dimostrato')
        elif script and script['stato'] == 'determinato':
            voce.update(tipoSpillo=script['tipoSpillo'], etichetta=script['etichetta'], stato='determinato',
                        prova=f"procedura che accende la bandiera del pin: {script['famigliaDominante']} "
                              f"in {script['casiDellaFamiglia']} casi su {script['procedureRiconosciute']} riconosciuti"
                              + (f", con {script['confermeDaiTrigger']} conferme dalle etichette dei trigger"
                                 if script['confermeDaiTrigger'] else ''))
        else:
            voce.update(tipoSpillo=None, etichetta=None, stato='non-determinato',
                        motivo=('nessuna famiglia di procedure domina fra quelle che accendono la sua bandiera'
                                if script and script['procedureRiconosciute']
                                else 'né lo sprite né le procedure che accendono la sua bandiera lo dicono'))
        righe.append(voce)
    determinati = [r for r in righe if r['stato'] == 'determinato']
    senza = [r for r in righe if r['stato'] != 'determinato']
    mancanti = sorted(set(SIGNIFICATO) - {r['nomeNativo'] for r in righe})
    if mancanti:
        raise ValueError(f'Traduzioni dichiarate per sprite che nessun pin usa: {mancanti}')
    risultato = dict(
        schemaVersion=1, sources=dict(icone='icone-mappa.json', registro='shared/spilli.ts'),
        tipi=righe, provePalazzi=PROVE_PALAZZI,
        summary=dict(tipi=len(righe), determinati=len(determinati), nonDeterminati=len(senza),
                     pinDeterminati=sum(r['occorrenze'] for r in determinati),
                     pinNonDeterminati=sum(r['occorrenze'] for r in senza),
                     perTipoSpillo=dict(collections.Counter(r['tipoSpillo'] for r in determinati)),
                     perProva=dict(collections.Counter((r.get('prova') or '').split(':')[0] for r in determinati)),
                     motiviNonDeterminati=dict(collections.Counter(r.get('motivo') for r in senza))),
        limits=['I tipi non determinati non vanno importati: un pin senza significato è peggio di un pin assente.',
                'Le icone native servono a riconoscere, non a disegnare: l’applicazione usa i propri segnalini.'])
    (out/'semantica-pin.json').write_text(json.dumps(risultato, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps(risultato['summary'], ensure_ascii=False, indent=1))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
