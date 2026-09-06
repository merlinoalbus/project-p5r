"""Gli elementi con cui il gioco disegna la mappa di viaggio e quella dei Memento.

L'utente ha chiesto due mappe **costruite**, non due illustrazioni: i quartieri di Tokyo visibili
solo quando sono sbloccati, i Palazzi sopra quando sono attivi, e la stessa cosa per i Memento. E
ha chiesto che siano fatte **con gli elementi originali**. Questo estrattore li tira fuori.

`P5_MAPDATA.SPD` (3 texture, 245 sprite, 30 MB) contiene tutto quel che serve, e per fortuna gli
sprite hanno un nome. Per ciascun quartiere ce ne sono **tre**:

| forma | esempio | a cosa serve |
|---|---|---|
| nome latino | `SHIBUYA`, `ODAIBA KAIHINKOEN` | l'etichetta |
| nome giapponese | `渋屋`, `お台場` | l'etichetta originale |
| `<nome>_lm` | `渋屋_lm` 726×660, `秋葉原_lm` 912×654 | **il disegno del quartiere**: il 105 di Shibuya, il Kabukichō di Shinjuku, la ruota di Odaiba, il Kaminarimon di Asakusa |

Sono i `_lm` — *landmark* — a fare la mappa. Nella stessa terza texture, dopo i quartieri, stanno
gli elementi dei Memento: `本体` (il corpo) con la sua maschera, sei `触手` (i tentacoli) con le
loro, e le `光の道` (le vie di luce) in tre misure, sopra e sotto.

**Quel che qui non c'è è la posizione.** Il campo `resa` di ogni sprite vale sempre esattamente
metà della larghezza e metà dell'altezza: è il perno con cui il gioco àncora lo sprite, non il
posto in cui lo mette. Le posizioni stanno altrove — probabilmente in `LMAP.BF` — e finché non si
trovano il layout va scritto a mano e **dichiarato tale**. Questo file estrae i pezzi; non
pretende di sapere dove vanno.

L'associazione fra il nome dello sprite e il quartiere dell'app è scritta in `QUARTIERI`, a mano e
per intero: sono ventiquattro righe, e leggerle è più veloce che fidarsi di una regola che
sbaglierebbe in silenzio proprio sui casi strani — `渋屋` non è la grafia comune di Shibuya, e
`四軒茶屋` non è quella di Yongen-Jaya.
"""
from pathlib import Path

from scrittura import scrivi_json
import argparse
import io
import re
import sys

from map_icons import sprite_del_foglio

FOGLIO = 'originali/IT/FIELD/PANEL/LMAP/P5_MAPDATA.SPD'
FOGLIO_MEMENTO = 'originali/IT/FIELD/PANEL/MEMENTOS/MEMENTOS.SPD'

# nome dello sprite giapponese -> chiave del quartiere nell'app. Le grafie del gioco non sempre
# coincidono con quelle comuni, ed è la ragione per cui questa tabella è scritta e non dedotta.
QUARTIERI = {
    '渋屋': 'shibuya',
    '四軒茶屋': 'yongen-jaya',
    '秋葉原': 'akihabara',
    '新宿': 'shinjuku',
    '原宿': 'harajuku',
    '池袋': 'ikebukuro',
    '上野': 'ueno',
    '井の頭公園': 'inokashira-park',
    '荻窪': 'ogikubo',
    '六本木': 'roppongi',
    '元町中華街': 'yokohama-chinatown',
    'お台場': 'odaiba',
    '市ヶ谷': 'ichigaya',
    '神保町': 'kanda-jinbocho',
    '水道橋': 'suidobashi',
    '月島': 'tsukishima',
    '浅草': 'asakusa',
    '吉祥寺': 'kichijoji',
    '品川': 'shinagawa',
    '中野': 'nakano',
    '舞浜': 'maihama',
    '明治神宮': 'meiji-shrine',
}

# Quartieri del gioco che l'app non ha come quartiere proprio: si estraggono lo stesso, perché
# servono a disegnare la mappa, ma non hanno una scheda dove portare.
SENZA_SCHEDA = {'神田': 'kanda', '青岾一丁目': 'aoyama-itchome', '永田町': 'nagatacho',
                '銀座': 'ginza', '赤坂': 'akasaka', '三浦海岸': 'miura-kaigan', '埋浜': 'umihama'}

# Gli sprite del nome in caratteri latini. Il gioco li scrive sotto al nome giapponese, sulla stessa
# targa nera, e senza di loro il cartellino di un quartiere non si legge da fuori dal Giappone.
LATINI = {
    'SHIBUYA': 'shibuya', 'YONGENJAYA': 'yongen-jaya', 'AOYAMAICHOUME': 'aoyama-itchome',
    'KANDA': 'kanda', 'SHINJUKU': 'shinjuku', 'AKIHABARA': 'akihabara', 'UENO': 'ueno',
    'GINZA': 'ginza', 'HARAJUKU': 'harajuku', 'OGIKUBO': 'ogikubo', 'TSUKISHIMA': 'tsukishima',
    'JINBOCHO': 'kanda-jinbocho', 'NAGATACHO': 'nagatacho', 'ICHIGAYA': 'ichigaya',
    'IKEBUKURO': 'ikebukuro', 'SUIDOBASHI': 'suidobashi', 'ROPPONGI': 'roppongi',
    'MIURAKAIGAN': 'miura-kaigan', 'MOTOMACHI CHUKAGAI': 'yokohama-chinatown',
    'MAIHAMA': 'maihama', 'ASAKUSA': 'asakusa', 'ODAIBA KAIHINKOEN': 'odaiba',
    'MEIJI JINGUMAE': 'meiji-shrine', 'AKASAKA MITSUKE': 'akasaka',
    'INOKASHIRA KOEN': 'inokashira-park', 'KICHIJOJI': 'kichijoji', 'SHINAGAWA': 'shinagawa',
    'NAKANO': 'nakano',
}

# Gli elementi con cui il gioco disegna la mappa dei Memento, da `MEMENTOS.SPD`. Il pozzo non si
# inventa: c'è tutto qui dentro, e ha pure i nomi. Gli otto `第N層` — «strato N» — sono i grappoli
# di città divelta che compongono l'imbuto scendendo; `街並み` è il profilo della città che sta
# sopra; i `血管`, letteralmente «vasi sanguigni», sono le venature rosse che solcano il cratere;
# `鎖` sono le catene. Il terzo semestre ha i suoi dieci strati a parte, perché il pozzo cambia.
MEMENTO = {
    # gli strati dell'imbuto, dall'alto in giù
    '第１層': 'strato-1', '第2層': 'strato-2', '第3層': 'strato-3', '第4層': 'strato-4',
    '第5層': 'strato-5', '第6層': 'strato-6', '第7層': 'strato-7', '第8層': 'strato-8',
    '第1層入口': 'strato-1-ingresso',
    # il mondo attorno al pozzo
    '街並み': 'citta-sopra', '街並み（反転）': 'citta-sopra-riflessa',
    '雲大': 'nuvola-grande', '雲中': 'nuvola-media', '雲小': 'nuvola-piccola',
    '109': 'edificio-109', '都庁': 'municipio', 'スカイツリー': 'skytree',
    '東京タワー': 'torre-di-tokyo', '普通のビル': 'palazzo-qualunque',
    # le catene e le venature del cratere
    '鎖': 'catena', '鎖小': 'catena-corta',
    '血管長': 'vena-lunga', '血管長　反転': 'vena-lunga-riflessa',
    '右上血管0': 'vena-alto-destra-0', '右上血管1': 'vena-alto-destra-1',
    '右上血管2': 'vena-alto-destra-2', '中央血管0': 'vena-centrale-0',
    '中央血管1': 'vena-centrale-1', '中央血管2': 'vena-centrale-2',
    '右下血管': 'vena-basso-destra',
    '血管グラデ': 'vena-sfumata', '赤丸': 'cerchio-rosso', '青丸': 'cerchio-blu',
    # insegne e figure
    'メメントスロゴ': 'logo', 'モルガナカー': 'pulmino-di-morgana',
    '入口': 'ingresso', '神殿跡地　文字': 'rovine-del-tempio',
    '認知得し者たちの路': 'via-di-chi-ha-compreso',
    # il terzo semestre: il pozzo cambia, e ha i suoi strati
    '３学期メメントス①': 'terzo-semestre-1', '３学期メメントス②': 'terzo-semestre-2',
    '３学期メメントス③': 'terzo-semestre-3', '３学期メメントス④': 'terzo-semestre-4',
    '３学期メメントス⑤': 'terzo-semestre-5', '３学期メメントス⑥': 'terzo-semestre-6',
    '３学期メメントス⑦': 'terzo-semestre-7', '３学期メメントス⑧': 'terzo-semestre-8',
    '３学期メメントス⑨': 'terzo-semestre-9', '３学期メメントス⑩': 'terzo-semestre-10',
    '3学期用　街': 'terzo-semestre-citta',
    # i tentacoli, che nel gioco avvolgono il pozzo
    '触手①': 'tentacolo-1', '触手②': 'tentacolo-2', '触手③': 'tentacolo-3',
    '触手④': 'tentacolo-4', '触手⑤': 'tentacolo-5', '触手⑥': 'tentacolo-6',
    '触手⑦': 'tentacolo-7', '触手縦伸ばし': 'tentacolo-allungato',
    '町素材': 'materiale-di-citta', 'パレス': 'palazzo',
}


def famiglia(nome):
    """A quale delle due mappe serve questo sprite, e in che veste."""
    base = nome[:-3] if nome.endswith('_lm') else nome[:-3] if nome.endswith('_lb') else nome
    if nome.endswith(('_lm', '_lb')) or nome.endswith(('_lm1', '_lm2')):
        base = nome.split('_lm')[0].split('_lb')[0]
        if base in QUARTIERI:
            return 'tokyo', QUARTIERI[base], 'disegno'
        if base in SENZA_SCHEDA:
            return 'tokyo', SENZA_SCHEDA[base], 'disegno'
        return None, None, None
    if nome in LATINI:
        return 'tokyo', LATINI[nome], 'nome-latino'
    if nome in QUARTIERI:
        return 'tokyo', QUARTIERI[nome], 'nome-giapponese'
    if nome in SENZA_SCHEDA:
        return 'tokyo', SENZA_SCHEDA[nome], 'nome-giapponese'
    if nome.replace('　日本語', '') in QUARTIERI and '日本語' in nome:
        return 'tokyo', QUARTIERI[nome.replace('　日本語', '')], 'nome-giapponese'
    if nome in MEMENTO:
        return 'memento', MEMENTO[nome], 'elemento'
    # `触手3学期第N層` — i tentacoli del terzo semestre, uno per strato
    m = re.fullmatch(r'触手3学期第(\d+)層([12ABC]?)', nome)
    if m:
        coda = f'-{m.group(2).lower()}' if m.group(2) else ''
        return 'memento', f'tentacolo-terzo-semestre-{int(m.group(1))}{coda}', 'elemento'
    return None, None, None


def main(out, destinazione=None):
    from PIL import Image
    out = Path(out)
    destinazione = Path(destinazione) if destinazione else out/'lmap'
    righe = []
    for foglio in (FOGLIO, FOGLIO_MEMENTO):
      dati = (out/foglio).read_bytes()
      texture, voci = sprite_del_foglio(dati)
      immagini = {t['id']: Image.open(io.BytesIO(dati[t['offset']:t['offset']+t['bytes']])).convert('RGBA')
                  for t in texture}
      for v in voci:
          if v.get('vuoto'):
              continue
          mappa, chiave, veste = famiglia(v['nome'])
          if not mappa:
              continue
          im = immagini.get(v['texturaId'])
          riquadro = (v['x'], v['y'], v['x']+v['larghezza'], v['y']+v['altezza'])
          if im is None or riquadro[2] > im.width or riquadro[3] > im.height:
              righe.append(dict(indice=v['index'], nome=v['nome'], mappa=mappa, chiave=chiave,
                                veste=veste, png=None, motivo='ritaglio fuori dalla texture'))
              continue
          cartella = destinazione/mappa
          cartella.mkdir(parents=True, exist_ok=True)
          file = f'{chiave}-{veste}.png' if veste != 'disegno' else f'{chiave}.png'
          ritaglio = im.crop(riquadro)
          ritaglio.save(cartella/file)
          # L'alfa deve essere reale, non un rettangolo opaco: se lo fosse, il disegno del quartiere
          # apparirebbe come un francobollo sopra la mappa invece che come una sagoma.
          canale = ritaglio.getchannel('A')
          righe.append(dict(indice=v['index'], nome=v['nome'], mappa=mappa, chiave=chiave, veste=veste,
                            larghezza=v['larghezza'], altezza=v['altezza'],
                            png=f'{mappa}/{file}', alfaMinima=canale.getextrema()[0],
                            conTrasparenza=canale.getextrema()[0] < 255))
    per_mappa = {}
    for r in righe:
        per_mappa.setdefault(r['mappa'], set()).add(r['chiave'])
    risultato = dict(
        schemaVersion=1,
        sources={'fogli': [FOGLIO, FOGLIO_MEMENTO]},
        criterio=dict(
            associazione='tabella scritta a mano: le grafie del gioco non coincidono sempre con '
                         'quelle comuni (渋屋 per Shibuya, 四軒茶屋 per Yongen-Jaya)',
            vesti='disegno (lo sprite _lm, il landmark), nome-giapponese, nome-latino, elemento (Memento)'),
        elementi=righe,
        summary=dict(estratti=sum(1 for r in righe if r['png']),
                     senzaRitaglio=sum(1 for r in righe if not r['png']),
                     quartieri=len(per_mappa.get('tokyo', ())),
                     elementiMemento=len(per_mappa.get('memento', ())),
                     conTrasparenza=sum(1 for r in righe if r.get('conTrasparenza'))),
        limits=['Il campo `resa` di ogni sprite vale metà larghezza e metà altezza: è il perno, '
                'non la posizione sulla mappa. Le collocazioni non stanno in questo foglio.',
                'I quartieri che l’app non ha come scheda propria sono estratti lo stesso: '
                'servono a disegnare la mappa, non portano da nessuna parte.'])
    scrivi_json(out/'elementi-mappe-lmap.json', risultato)
    import json
    print(json.dumps(risultato['summary'], ensure_ascii=False))
    return risultato


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('out')
    p.add_argument('--destinazione', default=None, help='cartella dei PNG (predefinita: <out>/lmap)')
    a = p.parse_args()
    sys.exit(0 if main(a.out, a.destinazione) else 1)
