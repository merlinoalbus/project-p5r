"""Ricontrollo del lettore di script compilati, contro i 227 già decompilati.

Il lettore di `flow_binario.py` sostituisce un decompilatore esterno, quindi va messo alla prova
dove la risposta è già nota: i 227 script di campo sono stati decompilati con lo strumento
ufficiale, e i loro `.flow` dicono quali bandiere accende ciascuna procedura. Il lettore deve
ritrovare le stesse.

Quattro controlli:

1. **il formato si legge** — ogni script di controllo espone le sue sezioni, e i nomi delle
   procedure sono testo leggibile, non byte a caso;
2. **l'indice di `BIT_ON` si deduce dai dati** e vale 13, senza che nessuno gliel'abbia detto;
3. **precisione e richiamo** stanno sopra le soglie dichiarate: quello che il lettore trova deve
   quasi sempre essere vero (precisione), e deve trovare la gran parte di quello che c'è
   (richiamo). Le due cose sono diverse e vanno misurate separatamente;
4. **le bandiere sono locali** — la stessa bandiera è accesa da procedure di Palazzi diversi, e
   questo va scritto nel file dei risultati, perché usarle senza il vincolo di pertinenza porta
   ad attribuzioni sbagliate (misurato: il tipo del seme della bramosia diventava un forziere).
"""
from pathlib import Path
import collections
import json
import re
import sys

import flow_binario as fb

# Soglie: il lettore non è un decompilatore e non pretende di esserlo, ma quello che dichiara
# deve essere quasi sempre giusto.
PRECISIONE_MINIMA = 0.95
RICHIAMO_MINIMO = 0.80
INDICE_BIT_ON = 13
# `CALL_FIELD(maggiore, minore, sub, ingresso)` dice dove porta un passaggio; l'indice sta molto
# piu' in alto degli altri e gli argomenti sono spinti al contrario.
INDICE_CALL_FIELD = 0x1000
RICHIAMO_DESTINAZIONI = 0.85


def main(out):
    out = Path(out)
    campi = out/'campi-completi'
    bit = re.compile(r'BIT_ON\(\(0x20000000 \+ (\d+)\)\)')

    dati, attese, nomi = [], [], []
    for f in sorted((campi/'originali').rglob('FHIT_*.BF')):
        flow = campi/'scripts'/(f.stem.replace('FHIT_', '') + '.flow')
        if not flow.exists():
            continue
        testo = flow.read_text(encoding='utf8', errors='replace')
        attesa = {fb.BASE_BANDIERA + int(m.group(1)) for m in bit.finditer(testo)}
        if not attesa:
            continue
        dati.append(f.read_bytes())
        attese.append(attesa)
        nomi.append(f.name)
    assert len(dati) >= 150, f'troppi pochi script di controllo: {len(dati)}'

    # 1. il formato si legge
    for d, nome in zip(dati[:20], nomi[:20]):
        sez = fb.sezioni(d)
        procedure = fb.etichette(d, sez.get(fb.PROCEDURE))
        assert procedure, f'nessuna procedura letta in {nome}'
        for etichetta, _inizio in procedure:
            assert etichetta and all(32 <= ord(c) < 127 for c in etichetta), \
                f'nome di procedura illeggibile in {nome}: {etichetta!r}'

    # 2. l'indice di BIT_ON si deduce
    indice, conteggi = fb.indice_di_bit_on(dati[:30], attese[:30])
    assert indice == INDICE_BIT_ON, f'indice di BIT_ON dedotto diverso: {indice}'

    # 3. precisione e richiamo
    attese_totali = trovate_totali = mancanti = inventate = esatti = 0
    for d, attesa in zip(dati, attese):
        trovate = fb.bandiere_accese(d, INDICE_BIT_ON)
        insieme = {v for vs in trovate.values() for v in vs if v >= fb.BASE_BANDIERA}
        attese_totali += len(attesa)
        trovate_totali += len(insieme)
        mancanti += len(attesa - insieme)
        inventate += len(insieme - attesa)
        esatti += insieme == attesa
    richiamo = (attese_totali - mancanti)/attese_totali
    precisione = (trovate_totali - inventate)/max(trovate_totali, 1)
    assert precisione >= PRECISIONE_MINIMA, f'precisione troppo bassa: {precisione:.3f}'
    assert richiamo >= RICHIAMO_MINIMO, f'richiamo troppo basso: {richiamo:.3f}'

    # 3-bis. anche le destinazioni si leggono, e vanno ritrovate negli script noti
    import re as _re
    rx = _re.compile(r'CALL_FIELD\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(-?\d+)\s*\)')
    trovate_dest = attese_dest = 0
    for d, nome in zip(dati[:40], nomi[:40]):
        flow = campi/'scripts'/(nome.replace('FHIT_', '').replace('.BF', '') + '.flow')
        if not flow.exists():
            continue
        attesa = {tuple(int(x) & 0xffffffff for x in m.groups())
                  for m in rx.finditer(flow.read_text(encoding='utf8', errors='replace'))}
        if not attesa:
            continue
        lette = {tuple(reversed(c['argomenti']))
                 for c in fb.chiamate_con_argomenti(d, INDICE_CALL_FIELD, 4)}
        attese_dest += len(attesa)
        trovate_dest += len(attesa & lette)
    if attese_dest:
        richiamo_dest = trovate_dest/attese_dest
        assert richiamo_dest >= RICHIAMO_DESTINAZIONI,             f'troppe destinazioni CALL_FIELD non lette: {richiamo_dest:.1%}'

    # 4. le bandiere sono locali, e il file lo deve dire
    percorso = out/'bandiere-script.json'
    if percorso.exists():
        raccolta = json.loads(percorso.read_text(encoding='utf8'))
        assert raccolta['scriptFalliti'] == 0, 'alcuni script non sono stati letti'
        assert raccolta['scriptLetti'] > 5000, 'letti troppi pochi script del gioco'
        condivise = sum(1 for v in raccolta['bandiere'].values()
                        if len({x['script'] for x in v}) > 1)
        assert condivise > 100, ('nessuna bandiera risulta condivisa fra script: il vincolo di '
                                 'pertinenza sembrerebbe inutile, e invece serve')
        print('OK lettore verificato su', len(dati), 'script di controllo:',
              f'precisione {precisione:.1%}, richiamo {richiamo:.1%},',
              esatti, 'riprodotti alla lettera;', raccolta['scriptLetti'],
              'script del gioco letti,', len(raccolta['bandiere']), 'bandiere,',
              condivise, 'accese da piu’ script (per questo serve il vincolo di pertinenza)')
    else:
        print('OK lettore verificato su', len(dati), 'script di controllo:',
              f'precisione {precisione:.1%}, richiamo {richiamo:.1%},', esatti, 'riprodotti alla lettera')


if __name__ == '__main__':
    main(sys.argv[1])
