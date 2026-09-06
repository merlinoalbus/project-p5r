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
import sys

from map_icons import sprite_del_foglio

FOGLIO = 'originali/IT/FIELD/PANEL/LMAP/P5_MAPDATA.SPD'

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

# Gli elementi con cui il gioco disegna i Memento: il corpo, i tentacoli e le vie di luce, ognuno
# con la propria maschera di trasparenza.
MEMENTO = {
    '本体': 'corpo', '本体_マスク': 'corpo-maschera',
    '触手': 'tentacolo', '触手_マスク': 'tentacolo-maschera',
    'テクスチャ': 'trama', '光': 'luce', '光（仮）': 'luce-provvisoria', 'ヒカリ（新規）': 'luce-nuova',
    '光の道1(下)': 'via-di-luce-1-sotto', '光の道1(上)': 'via-di-luce-1-sopra',
    '光の道2(下)': 'via-di-luce-2-sotto', '光の道2(上)': 'via-di-luce-2-sopra',
    '光の道3(下)': 'via-di-luce-3-sotto', '光の道3(上)': 'via-di-luce-3-sopra',
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
    if nome in QUARTIERI:
        return 'tokyo', QUARTIERI[nome], 'nome-giapponese'
    if nome in SENZA_SCHEDA:
        return 'tokyo', SENZA_SCHEDA[nome], 'nome-giapponese'
    if nome.replace('　日本語', '') in QUARTIERI and '日本語' in nome:
        return 'tokyo', QUARTIERI[nome.replace('　日本語', '')], 'nome-giapponese'
    if nome in MEMENTO:
        return 'memento', MEMENTO[nome], 'elemento'
    for schema, resa in MEMENTO.items():
        # i tentacoli e le loro maschere sono numerati: 触手01 … 触手06
        if nome.startswith(schema) and nome[len(schema):].isdigit():
            return 'memento', f'{resa}-{int(nome[len(schema):])}', 'elemento'
    return None, None, None


def main(out, destinazione=None):
    from PIL import Image
    out = Path(out)
    destinazione = Path(destinazione) if destinazione else out/'lmap'
    dati = (out/FOGLIO).read_bytes()
    texture, voci = sprite_del_foglio(dati)
    immagini = {t['id']: Image.open(io.BytesIO(dati[t['offset']:t['offset']+t['bytes']])).convert('RGBA')
                for t in texture}
    righe = []
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
        sources={'foglio': FOGLIO},
        criterio=dict(
            associazione='tabella scritta a mano: le grafie del gioco non coincidono sempre con '
                         'quelle comuni (渋屋 per Shibuya, 四軒茶屋 per Yongen-Jaya)',
            vesti='disegno (lo sprite _lm, il landmark), nome-giapponese, elemento (Memento)'),
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
