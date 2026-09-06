"""I pin delle tre planimetrie che sono copie di un'altra, e dove finiscono.

Tre risorse del gioco sono copie effettive di un'altra — stesso record di presentazione, stesso
titolo, pixel identici — e per questo l'atlante ne tiene una sola. I loro pin però esistono, sono
33, e nel conto dei 1429 pin nativi devono andare da qualche parte: dire «non posati» sarebbe
falso, perché il posto ce l'hanno, è quello della canonica.

Questo file scrive dove va ciascuno, uno per uno. La corrispondenza non è per posizione soltanto:
si accoppia per **bandiera**, il numero con cui il gioco governa quel preciso oggetto, che è
identico fra copia e canonica. Sulle coordinate si ammette uno scarto, dichiarato in `TOLLERANZA`,
perché le copie non sono ritagliate esattamente allo stesso pixel.

Perché la bandiera e non il tipo nativo: due dei 33 hanno tipo diverso fra copia e canonica — 17 di
qua, 26 di là, cioè forziere normale e forziere raro — pur avendo la stessa bandiera. È una
disattenzione del gioco, non due oggetti: la bandiera è la stessa, quindi il forziere è quello.
Pretendere anche lo stesso tipo avrebbe lasciato scoperti proprio quei due; la differenza viene
registrata nella riga, con detto che a valere è quel che dice la canonica.

L'accoppiamento è **uno a uno** (algoritmo ungherese): due pin distinti della copia non possono
finire sullo stesso pin della canonica, altrimenti non sarebbe una corrispondenza ma una
sovrapposizione — e nascerebbero duplicati proprio dove si voleva evitarli.
"""
from pathlib import Path

from scrittura import scrivi_json
import json
import sys

import numpy

from assegnazione import assegna

# Scarto massimo ammesso, in pixel della planimetria nativa, fra un pin della copia e il suo
# corrispondente sulla canonica. Le copie sono la stessa immagine, quindi lo scarto è piccolo per
# costruzione: serve solo ad assorbire l'arrotondamento del ritaglio, non a forzare abbinamenti.
TOLLERANZA = 8.0
# Costo proibitivo per una coppia che non condivide la bandiera: l'assegnazione la eviterà se
# esiste un'alternativa, e se non esiste il pin resta dichiarato senza corrispondenza.
IMPOSSIBILE = 1e6


def chiave_di(codice):
    return 'nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in codice.split('_')[1:])


def codice_di(chiave):
    return 'RMAP_%03d_%d_%d' % tuple(int(v) for v in chiave.split('-')[2:])


def coppie_copia_canonica(identita):
    """Per ogni copia dichiarata dal catalogo di identità, la planimetria che la assorbe."""
    fuori = []
    for luogo in identita['luoghi']:
        canonica = luogo['chiaveLuogo']
        for copia in (luogo.get('copie') or []):
            fuori.append((copia if isinstance(copia, str) else copia['chiave'], canonica))
    return sorted(fuori)


def main(out):
    out = Path(out)
    identita = json.loads((out/'atlante-identita.json').read_text(encoding='utf8'))
    meta = {m['code']: m for m in json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))['maps']}
    semantica = {r['tipoNativo']: r for r in
                 json.loads((out/'semantica-pin.json').read_text(encoding='utf8'))['tipi']}

    def resa(pin):
        return (semantica.get(pin['nativeType']) or {}).get('tipoSpillo')

    righe, senza = [], []
    for copia, canonica in coppie_copia_canonica(identita):
        da = meta[codice_di(copia)]['pins']
        a = meta[codice_di(canonica)]['pins']
        costi = numpy.zeros((len(da), max(len(a), len(da))))
        costi[:, len(a):] = IMPOSSIBILE
        for i, p in enumerate(da):
            for j, q in enumerate(a):
                distanza = ((p['x']-q['x'])**2 + (p['y']-q['y'])**2) ** 0.5
                # L'identità di un pin è la sua **bandiera**: è il numero con cui il gioco governa
                # quel preciso oggetto, ed è identico fra copia e canonica. Il tipo nativo no: due
                # dei 33 sono 17 di qua e 26 di là, cioè forziere normale e forziere raro, sulla
                # stessa bandiera — una svista del gioco, che pero' non toglie che sia lo stesso
                # forziere. Accoppiare per bandiera è giusto; pretendere lo stesso tipo lascerebbe
                # scoperti proprio quei due, e la differenza va registrata, non nascosta.
                compatibili = p['flag'] == q['flag'] and distanza <= TOLLERANZA
                costi[i, j] = distanza if compatibili else IMPOSSIBILE
        scelta = assegna(costi)
        for i, p in enumerate(da):
            j = int(scelta[i])
            valida = j < len(a) and costi[i, j] < IMPOSSIBILE
            voce = dict(
                copia=copia, indiceCopia=i, tipoNativo=p['nativeType'], bandiera=p['flag'],
                condizionale=bool(p['conditional']), xCopia=p['x'], yCopia=p['y'],
                resa=resa(p), canonica=canonica,
                indiceCanonica=j if valida else None,
                xCanonica=a[j]['x'] if valida else None,
                yCanonica=a[j]['y'] if valida else None,
                tipoNativoCanonica=a[j]['nativeType'] if valida else None,
                resaCanonica=resa(a[j]) if valida else None,
                scarto=round(float(costi[i, j]), 3) if valida else None)
            if valida and voce['tipoNativo'] != voce['tipoNativoCanonica']:
                voce['differenza'] = ('stessa bandiera ma tipo nativo diverso fra copia e canonica: '
                                      f'{voce["tipoNativo"]} contro {voce["tipoNativoCanonica"]}, '
                                      f'reso «{voce["resa"]}» contro «{voce["resaCanonica"]}». '
                                      'Vale quel che dice la canonica, che è la planimetria tenuta.')
            (righe if valida else senza).append(voce)
            if not valida:
                voce['motivo'] = ('nessun pin della canonica ha la stessa bandiera '
                                  f'entro {TOLLERANZA} pixel')

    per_copia = {}
    for r in righe:
        per_copia.setdefault(r['copia'], []).append(r['indiceCanonica'])
    for copia, indici in per_copia.items():
        if len(set(indici)) != len(indici):
            raise ValueError(f'due pin di {copia} finiscono sullo stesso pin della canonica')

    risultato = dict(
        schemaVersion=1,
        sources=dict(identita='atlante-identita.json', metadati='mondo_metadati.json',
                     semantica='semantica-pin.json'),
        criterio=dict(tolleranzaPixel=TOLLERANZA,
                      abbinamento='uno a uno, per bandiera identica, con lo '
                                  'scarto di posizione entro la tolleranza; l’assegnazione di '
                                  'costo minimo impedisce che due pin finiscano sullo stesso',
                      perche='le tre copie non entrano nell’atlante, ma i loro pin esistono e '
                             'vanno contati: qui si dice a quale pin della canonica corrisponde '
                             'ciascuno, invece di dichiararli genericamente non posati'),
        assorbiti=righe, senzaCorrispondenza=senza,
        summary=dict(copie=len(per_copia), pin=len(righe)+len(senza),
                     assorbiti=len(righe), senzaCorrispondenza=len(senza),
                     conTipoDiverso=sum(1 for r in righe if r.get('differenza')),
                     scartoMassimo=max((r['scarto'] for r in righe), default=0.0)),
        limits=['La corrispondenza dice dove il pin della copia è già rappresentato, non aggiunge '
                'uno spillo: sulla canonica quel pin c’è già, e duplicarlo lo mostrerebbe due volte.'])
    scrivi_json(out/'pin-copie-assorbite.json', risultato)
    print(json.dumps(risultato['summary'], ensure_ascii=False))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
