"""Dizionario nativo delle icone della mappa d'insieme e censimento dei pin che le usano.

Due sorgenti indipendenti:

* `IT/FIELD/PANEL/P5MINIMAP_01.SPD` — foglio sprite in formato `SPR0`: intestazione di 32 byte,
  tabella texture e tabella sprite (record di 160 byte). Ogni sprite porta identificativo,
  indice di texture, rettangolo nella texture, dimensione di resa e **nome interno in Shift-JIS**:
  è il vocabolario che dice cosa rappresenta ogni icona.
* `BASE/FIELD/PANEL/ROADMAP/ICON_<major>_<minor>.BIN` — piazzamenti: record di 72 byte con il
  tipo nativo, la posizione in pixel della texture ROADMAP, la condizione e l'effetto. Il tipo `2`
  separa i livelli grafici. Sono gli stessi record già letti da `world_metadata.icon_layers`.

L'associazione tipo nativo → sprite **non è l'identità**. Per il blocco urbano è dimostrata con
scarto costante `SCARTO_CITTA`: i negozi che ne risultano coincidono, mappa per mappa, con quelli
elencati dalla tabella ufficiale delle destinazioni. Fuori da quel blocco l'associazione resta
aperta e viene marcata come tale: nessun tipo riceve un significato non dimostrato.

Le immagini ritagliate servono a riconoscere le icone: sono materiale di lavoro, non asset
dell'applicazione, che disegna i propri segnalini.
"""
from scrittura import scrivi_json
from pathlib import Path
import collections
import hashlib
import io
import json
import re
import struct
import sys

FOGLIO = 'originali/IT/FIELD/PANEL/P5MINIMAP_01.SPD'
PIAZZAMENTI = 'originali/BASE/FIELD/PANEL/ROADMAP'
SPRITE = 160
TEXTURA = 48
RECORD_PIN = 72
SEPARATORE = 2
# Blocco urbano dimostrato: il tipo nativo 46 è la prima icona negozio del foglio (indice 114).
SCARTO_CITTA = 68
BLOCCO_CITTA = (46, 96)
# Secondo blocco con scarto dimostrato: le voci del Covo dei Ladri. Lo scarto 76 porta i tipi
# 98..103 sugli sprite «マイパレス_…» e cinque di quei sei tipi cadono, dove la proiezione e'
# certificata, su procedure `MyPalace_*` che dicono la stessa cosa dello sprite (Maker sul
# creatore, Sound sulla musica, Image sulla galleria, Daifugou sull'area giochi, Award sui
# premi). Nessuna smentita: lo scarto e' provato, non supposto.
SCARTO_MY_PALACE = 76
BLOCCO_MY_PALACE = (98, 103)


def sprite_del_foglio(data):
    """Legge la tabella sprite di un file SPR0, conservando byte e offset di ogni voce."""
    if data[:4] != b'SPR0':
        raise ValueError('Foglio sprite senza intestazione SPR0')
    ntex, nspr = struct.unpack_from('<HH', data, 0x14)
    toff, soff = struct.unpack_from('<II', data, 0x18)
    if not ntex or not nspr or soff + nspr*SPRITE > len(data):
        raise ValueError('Tabella sprite fuori dal file')
    texture = []
    for i in range(ntex):
        at = toff + i*TEXTURA
        ident, _, dati, misura, larghezza, altezza = struct.unpack_from('<6I', data, at)
        nome = data[at+32:at+TEXTURA].split(b'\0')[0].decode('ascii', 'replace')
        if data[dati:dati+4] != b'DDS ':
            raise ValueError('Texture del foglio sprite non in formato DDS')
        texture.append(dict(id=ident, offset=dati, bytes=misura, larghezza=larghezza,
                            altezza=altezza, nome=nome))
    voci = []
    for i in range(nspr):
        off = soff + i*SPRITE
        e = data[off:off+SPRITE]
        ident, texId = struct.unpack_from('<2I', e, 0)
        x, y, larghezza, altezza = struct.unpack_from('<4I', e, 0x20)
        resaX, resaY = struct.unpack_from('<2I', e, 0x38)
        grezzo = e[0x70:0x90].split(b'\0')[0]
        try:
            nome, codifica = grezzo.decode('cp932'), 'shift-jis'
        except UnicodeDecodeError:
            nome, codifica = grezzo.hex(), 'non-decodificato'
        voci.append(dict(index=i, id=ident, texturaId=texId, offset=off, x=x, y=y,
                         larghezza=larghezza, altezza=altezza, resa=[resaX, resaY],
                         nomeRawHex=grezzo.hex(), nome=nome, codifica=codifica,
                         vuoto=not (larghezza and altezza)))
    return texture, voci


def ritaglia(data, texture, voci, cartella):
    """Salva un PNG per ogni sprite non vuoto, ritagliandolo dalla texture di appartenenza."""
    from PIL import Image
    cartella.mkdir(parents=True, exist_ok=True)
    immagini = {}
    for t in texture:
        immagini[t['id']] = Image.open(io.BytesIO(data[t['offset']:t['offset']+t['bytes']])).convert('RGBA')
    salvati = 0
    for v in voci:
        im = immagini.get(v['texturaId'])
        v['png'] = None
        if v['vuoto'] or im is None:
            continue
        riquadro = (v['x'], v['y'], v['x']+v['larghezza'], v['y']+v['altezza'])
        if riquadro[2] > im.width or riquadro[3] > im.height:
            v['png'] = 'fuori-dalla-texture'
            continue
        nome = f"sprite-{v['index']:03d}.png"
        im.crop(riquadro).save(cartella/nome)
        v['png'] = nome
        salvati += 1
    return salvati


def censimento(cartella):
    """Conta i pin nativi per tipo, distinguendo mappe urbane e mappe dei Palazzi."""
    per_tipo = collections.defaultdict(lambda: dict(occorrenze=0, mappe=[], condizionali=0, effettoZero=0))
    for percorso in sorted(cartella.glob('ICON_*.BIN')):
        maggiore = int(re.match(r'ICON_(\d+)_', percorso.name).group(1))
        b = percorso.read_bytes()
        if any(b[len(b)//RECORD_PIN*RECORD_PIN:]):
            raise ValueError(f'Coda non nulla in {percorso.name}')
        for at in range(0, len(b)//RECORD_PIN*RECORD_PIN, RECORD_PIN):
            tipo, = struct.unpack_from('<I', b, at)
            if tipo == SEPARATORE:
                continue
            bandiera, effetto = struct.unpack_from('<2I', b, at+28)
            v = per_tipo[tipo]
            v['occorrenze'] += 1
            v['mappe'].append(percorso.name)
            v['condizionali'] += bandiera != 0xffffffff
            v['effettoZero'] += effetto == 0
    righe = []
    for tipo in sorted(per_tipo):
        v = per_tipo[tipo]
        mappe = sorted(set(v['mappe']))
        urbane = [m for m in mappe if int(m[5:8]) < 100]
        righe.append(dict(tipoNativo=tipo, occorrenze=v['occorrenze'], mappe=mappe,
                          mappeUrbane=len(urbane), mappeDungeon=len(mappe)-len(urbane),
                          condizionali=v['condizionali'], effettoZero=v['effettoZero']))
    return righe


def associa(righe, voci):
    """Assegna lo sprite solo dove l'associazione è dimostrata, e dice perché altrove non lo è."""
    for r in righe:
        tipo = r['tipoNativo']
        if BLOCCO_CITTA[0] <= tipo <= BLOCCO_CITTA[1] and r['mappeDungeon'] == 0:
            i = tipo + SCARTO_CITTA
            sprite = voci[i] if i < len(voci) else None
            r['sprite'] = None if sprite is None or sprite['vuoto'] else sprite['index']
            r['nomeNativo'] = None if r['sprite'] is None else sprite['nome']
            r['associazione'] = 'blocco-urbano-dimostrato' if r['sprite'] is not None else 'sprite-vuoto'
        elif BLOCCO_MY_PALACE[0] <= tipo <= BLOCCO_MY_PALACE[1] and r['mappeDungeon'] == 0:
            i = tipo + SCARTO_MY_PALACE
            sprite = voci[i] if i < len(voci) else None
            r['sprite'] = None if sprite is None or sprite['vuoto'] else sprite['index']
            r['nomeNativo'] = None if r['sprite'] is None else sprite['nome']
            r['associazione'] = 'blocco-covo-dimostrato' if r['sprite'] is not None else 'sprite-vuoto'
        else:
            r['sprite'] = None
            r['nomeNativo'] = None
            r['associazione'] = ('fuori-dal-blocco-urbano' if r['mappeDungeon'] else 'urbano-non-dimostrato')
    return righe


def main(out):
    out = Path(out)
    data = (out/FOGLIO).read_bytes()
    texture, voci = sprite_del_foglio(data)
    cartella = out/'icone-mappa'
    salvati = ritaglia(data, texture, voci, cartella)
    righe = associa(censimento(out/PIAZZAMENTI), voci)
    dimostrati = [r for r in righe if r['associazione'] == 'blocco-urbano-dimostrato']
    risultato = dict(
        schemaVersion=1,
        sources=dict(foglio=dict(file=FOGLIO, bytes=len(data), sha256=hashlib.sha256(data).hexdigest()),
                     piazzamenti=dict(cartella=PIAZZAMENTI,
                                      file=len(list((out/PIAZZAMENTI).glob('ICON_*.BIN'))))),
        texture=texture, sprite=voci, tipiNativi=righe,
        associazioneUrbana=dict(scarto=SCARTO_CITTA, blocco=list(BLOCCO_CITTA),
                                prova='I negozi ottenuti coincidono con le destinazioni ufficiali della '
                                      'stessa mappa in nomi-mappe-ufficiali.json (Leblanc, lavanderia e '
                                      'gabbie di battuta a Yongen-Jaya; softair, Big Bang Burger e palestra '
                                      'a Shibuya; i negozi di Akihabara).'),
        summary=dict(sprite=len(voci), spriteNonVuoti=sum(not v['vuoto'] for v in voci), pngSalvati=salvati,
                     tipiNativi=len(righe), tipiAssociati=len(dimostrati),
                     pinTotali=sum(r['occorrenze'] for r in righe),
                     pinAssociati=sum(r['occorrenze'] for r in dimostrati),
                     associazioniPerEsito=dict(collections.Counter(r['associazione'] for r in righe))),
        limits=['Fuori dal blocco urbano il tipo nativo non ha ancora un significato dimostrato.',
                'I ritagli sono materiale di riconoscimento, non asset dell’applicazione.',
                'I pin condizionali restano condizionali: la bandiera non è tradotta qui.'])
    scrivi_json(out/'icone-mappa.json', risultato)
    print(json.dumps(risultato['summary'], ensure_ascii=False))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
