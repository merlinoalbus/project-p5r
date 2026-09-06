"""Ricontrollo della mappatura dei pin che stanno sulle copie.

Tre planimetrie sono copie di un'altra e non entrano nell'atlante; i loro 33 pin però esistono e
nel conto dei 1429 devono avere un posto. Dire «non posati» sarebbe stato comodo e falso: il posto
ce l'hanno, ed è quello della canonica.

Cinque controlli:

1. **le copie sono quelle dichiarate** — l'elenco viene ricostruito dal catalogo di identità, non
   letto dall'artefatto: se un domani ne comparisse una quarta senza mappatura, il conto salterebbe;
2. **ogni pin della copia c'è** — la mappatura copre tutti i pin di ciascuna copia, uno per uno,
   con coordinate e bandiera che coincidono con il record nativo;
3. **la corrispondenza è biunivoca** — due pin della copia non finiscono sullo stesso pin della
   canonica, altrimenti sarebbe una sovrapposizione e nascerebbero duplicati;
4. **la bandiera è la stessa e lo scarto è dentro la tolleranza dichiarata** — sono le due
   condizioni su cui l'abbinamento si regge, e vanno ricalcolate qui;
5. **le differenze di tipo sono dichiarate** — dove copia e canonica danno tipi nativi diversi
   sulla stessa bandiera, la riga deve dirlo: nasconderlo farebbe sparire una discrepanza vera.

E poi la cosa che conta davvero: **i conti chiudono**. Posati, assorbiti, esclusi puntualmente e
pin su planimetrie senza riferimento devono fare esattamente i 1429 pin nativi.
"""
from pathlib import Path
import json
import sys

import pin_copie_assorbite as pca


def main(out):
    out = Path(out)
    dati = json.loads((out/'pin-copie-assorbite.json').read_text(encoding='utf8'))
    identita = json.loads((out/'atlante-identita.json').read_text(encoding='utf8'))
    meta = {m['code']: m for m in json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))['maps']}
    rapporto = json.loads((out/'pacchetto-seed-rapporto.json').read_text(encoding='utf8'))

    # 1. le copie sono quelle che il catalogo di identità dichiara
    attese = dict(pca.coppie_copia_canonica(identita))
    trovate = {r['copia']: r['canonica'] for r in dati['assorbiti'] + dati['senzaCorrispondenza']}
    assert trovate == attese, \
        f'le copie mappate non sono quelle dichiarate: {sorted(trovate)} contro {sorted(attese)}'

    # 2. ogni pin di ogni copia compare una volta sola, con i dati del record nativo
    for copia, canonica in attese.items():
        pin = meta[pca.codice_di(copia)]['pins']
        righe = [r for r in dati['assorbiti'] + dati['senzaCorrispondenza'] if r['copia'] == copia]
        indici = sorted(r['indiceCopia'] for r in righe)
        assert indici == list(range(len(pin))), \
            f'la mappatura di {copia} non copre tutti i suoi pin una volta sola'
        for r in righe:
            p = pin[r['indiceCopia']]
            assert (p['nativeType'], p['flag'], p['x'], p['y']) == \
                (r['tipoNativo'], r['bandiera'], r['xCopia'], r['yCopia']), \
                f'la riga non corrisponde al record nativo: {copia} pin {r["indiceCopia"]}'

    # 3, 4, 5. biunivocità, bandiera, tolleranza e differenze dichiarate
    # La biunivocità si pretende **dentro una copia**: due pin della stessa copia non possono
    # finire sullo stesso pin della canonica. Fra copie diverse invece è normale che coincidano —
    # le due copie di Kamoshida rappresentano la stessa planimetria, quindi il loro primo pin è
    # lo stesso pin. Pretenderla globalmente sarebbe stato un errore mio, non una regola.
    per_canonica = {}
    for r in dati['assorbiti']:
        chiave = (r['copia'], r['canonica'], r['indiceCanonica'])
        assert chiave not in per_canonica, \
            f'due pin della stessa copia finiscono sullo stesso pin della canonica: {chiave}'
        per_canonica[chiave] = r
        q = meta[pca.codice_di(r['canonica'])]['pins'][r['indiceCanonica']]
        assert q['flag'] == r['bandiera'], \
            f'bandiera diversa fra copia e canonica: {r["copia"]} pin {r["indiceCopia"]}'
        scarto = ((r['xCopia']-q['x'])**2 + (r['yCopia']-q['y'])**2) ** 0.5
        assert abs(scarto - r['scarto']) < 1e-6, 'lo scarto registrato non è quello che si ricalcola'
        assert scarto <= pca.TOLLERANZA, \
            f'scarto oltre la tolleranza dichiarata: {scarto} > {pca.TOLLERANZA}'
        diverso = q['nativeType'] != r['tipoNativo']
        assert diverso == bool(r.get('differenza')), \
            (f'differenza di tipo non dichiarata (o dichiarata a vuoto) su {r["copia"]} '
             f'pin {r["indiceCopia"]}')

    # la contabilità: nessuna occorrenza nativa può sparire
    nativi = sum(len(m['pins']) for m in meta.values())
    assorbiti = rapporto['pinNonPosati'].get('assorbito dalla planimetria canonica', 0)
    assert assorbiti == len(dati['assorbiti']) + len(dati['senzaCorrispondenza']), \
        (f'il rapporto del pacchetto conta {assorbiti} pin assorbiti, la mappatura '
         f'{len(dati["assorbiti"])}')
    somma = rapporto['spilliPosati'] + sum(rapporto['pinNonPosati'].values())
    assert somma == nativi, f'contabilità aperta: {somma} invece di {nativi}'
    assert not dati['senzaCorrispondenza'], \
        (f'{len(dati["senzaCorrispondenza"])} pin delle copie restano senza corrispondenza: '
         'vanno risolti o dichiarati con il loro motivo nello stato')

    print('OK copie assorbite:', len(attese), 'planimetrie,', len(dati['assorbiti']),
          'pin mappati uno a uno sulla canonica, scarto massimo',
          dati['summary']['scartoMassimo'], 'pixel su una tolleranza di', pca.TOLLERANZA, ';',
          dati['summary']['conTipoDiverso'], 'con tipo nativo diverso e differenza dichiarata;',
          f'contabilità chiusa su {nativi} pin nativi')


if __name__ == '__main__':
    main(sys.argv[1])
