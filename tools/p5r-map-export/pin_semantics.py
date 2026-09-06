"""Che cosa indica ciascun pin nativo, e con quale segnalino dell'applicazione va reso.

Il tipo nativo di un pin è un numero. Il suo significato sta nel nome interno dello sprite che il
gioco gli associa, letto in `icone-mappa.json`. Per il blocco urbano la corrispondenza è
dimostrata (i negozi che ne risultano coincidono, mappa per mappa, con le destinazioni ufficiali
della stessa mappa), e qui ogni nome interno viene tradotto in un tipo di segnalino
dell'applicazione e in un'etichetta italiana.

**I tipi dei Palazzi restano senza significato assegnato.** Non è una dimenticanza: è il risultato
di tre prove, tutte fallite e tutte registrate in `prove` perché siano ricontrollabili. Le icone
dei Palazzi occupano intervalli spezzati del foglio, quindi nessuno scarto costante può
collegarle; nessun altro foglio sprite contiene icone da Palazzo; e la correlazione fra i tipi
nativi e i punti che la guida descrive per le stesse aree resta nel rumore. La via che resta è
l'etichetta del trigger che sta nello stesso punto, e richiede la proiezione delle coordinate:
appartiene alla fase dei collegamenti, non a questa.

Le icone native non entrano nell'applicazione: servono a capire, e ogni pin viene poi disegnato
con il segnalino dell'app corrispondente.
"""
from pathlib import Path
import collections
import json
import sys

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
    dict(prova='etichetta del trigger nello stesso punto',
         esito='rimandata',
         dettaglio='è la via che resta, e richiede la proiezione delle coordinate dei trigger sulla '
                   'planimetria: appartiene alla fase dei collegamenti.'),
]


def main(out):
    out = Path(out)
    icone = json.loads((out/'icone-mappa.json').read_text(encoding='utf8'))
    righe = []
    for r in icone['tipiNativi']:
        voce = dict(tipoNativo=r['tipoNativo'], occorrenze=r['occorrenze'],
                    mappeUrbane=r['mappeUrbane'], mappeDungeon=r['mappeDungeon'],
                    condizionali=r['condizionali'], sprite=r['sprite'], nomeNativo=r['nomeNativo'],
                    associazione=r['associazione'])
        significato = SIGNIFICATO.get(r['nomeNativo'] or '')
        if r['associazione'] == 'blocco-urbano-dimostrato' and significato:
            voce.update(tipoSpillo=significato[0], etichetta=significato[1], stato='determinato')
        else:
            voce.update(tipoSpillo=None, etichetta=None, stato='non-determinato',
                        motivo=('nome interno senza traduzione dichiarata' if r['associazione'] == 'blocco-urbano-dimostrato'
                                else 'lo sprite di questo tipo nativo non è dimostrato'))
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
                     motiviNonDeterminati=dict(collections.Counter(r.get('motivo') for r in senza))),
        limits=['I tipi non determinati non vanno importati: un pin senza significato è peggio di un pin assente.',
                'Le icone native servono a riconoscere, non a disegnare: l’applicazione usa i propri segnalini.'])
    (out/'semantica-pin.json').write_text(json.dumps(risultato, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps(risultato['summary'], ensure_ascii=False, indent=1))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
