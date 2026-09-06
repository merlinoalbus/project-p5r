"""Lancia tutti i verificatori, ciascuno con i propri argomenti.

Serve a impedire un errore che è già costato caro. Il comando cumulativo che girava prima passava
gli stessi due argomenti a tutti i verificatori:

```bash
for v in verify_*.py; do python "$v" ../../data/atlas/extracted ../..; done
```

Solo che i verificatori non vogliono tutti le stesse cose. `verify_world_connections.py` legge il
secondo argomento come la cartella dei `.flow`, e `../..` non lo è: il generatore che quel
verificatore richiamava ha riscritto l'artefatto delle evidenze con zero script e zero procedure,
**148.576 righe di prove cancellate**, e il controllo di determinismo è poi tornato verde perché
confrontava la versione impoverita con se stessa.

Qui gli argomenti di ciascuno sono scritti una volta sola, accanto al suo nome. Aggiungere un
verificatore significa aggiungere una riga a `ARGOMENTI`: se non c'è, prende soltanto la cartella
degli artefatti, che è ciò che vuole la maggior parte.

Uso:

```bash
python tools/p5r-map-export/verifica_tutto.py            # dalla radice del repository
python tools/p5r-map-export/verifica_tutto.py --solo pin # solo quelli col nome che contiene «pin»
```

Il codice di uscita è 1 se anche uno solo fallisce, e ogni fallimento è stampato con il suo
messaggio: un `tail` che nasconde l'esito è esattamente il modo in cui ci si convince che tutto sia
verde quando non lo è.
"""
from pathlib import Path
import argparse
import subprocess
import sys

RADICE = Path(__file__).resolve().parents[2]
ARTEFATTI = RADICE/'data/atlas/extracted'
GIOCO = Path(r'C:\Program Files (x86)\Steam\steamapps\common\P5R')

# Chi vuole più della sola cartella degli artefatti lo dice qui, e il perché sta accanto.
ARGOMENTI = {
    # la radice del repository, per leggere il registro dei segnalini in shared/spilli.ts
    'verify_edge_pins.py': [RADICE],
    'verify_icon_observations.py': [RADICE],
    # il pacchetto seed, per ricontrollare i pin che ci sono finiti dentro
    'verify_pin_semantics.py': [RADICE/'data/seed'],
    # i .flow decompilati e i .BF originali: sono due cartelle diverse, ed è la confusione fra le
    # due ad aver cancellato le evidenze
    'verify_world_connections.py': [ARTEFATTI/'campi-completi/scripts',
                                    ARTEFATTI/'connessioni_originali/IT/FIELD/HIT'],
    # gli archivi del gioco, per riconfrontare le risorse estratte con la sorgente
    'verify_export.py': [GIOCO/'CPK'],
    # l'eseguibile, dove sta la tabella che lega il tipo di pin allo sprite
    'verify_pin_part_table.py': [GIOCO/'P5R.exe'],
    # Qui la sola parte a costo zero: forma degli artefatti e censimento dei produttori. La prova
    # di determinismo vera rifà l'intero lotto e dura ore — lanciata dentro questo comando ha
    # trasformato una verifica da tre minuti in una da due ore, e un controllo che nessuno ha più
    # voglia di lanciare non protegge niente. Si lancia da sola, ed è dichiarata:
    #   python tools/p5r-map-export/rigenera_tutto.py
    #   python tools/p5r-map-export/verify_determinismo.py data/atlas/extracted
    'verify_determinismo.py': ['--senza-rigenerare'],
}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--solo', default='', help='esegue solo i verificatori il cui nome contiene questo testo')
    p.add_argument('--artefatti', default=str(ARTEFATTI))
    a = p.parse_args()
    cartella = Path(__file__).resolve().parent
    verificatori = sorted(v.name for v in cartella.glob('verify_*.py') if a.solo in v.name)
    falliti = []
    for nome in verificatori:
        argomenti = [sys.executable, str(cartella/nome), a.artefatti]
        argomenti += [str(x) for x in ARGOMENTI.get(nome, [])]
        esito = subprocess.run(argomenti, cwd=cartella, capture_output=True, text=True,
                               encoding='utf8', errors='replace')
        if esito.returncode == 0:
            print(f'OK   {nome}')
        else:
            falliti.append(nome)
            print(f'FALLITO  {nome}')
            for riga in (esito.stderr or esito.stdout or '').strip().splitlines()[-4:]:
                print('         ' + riga)
    print(f'\n{len(verificatori) - len(falliti)} su {len(verificatori)} passano'
          + (f'; falliti: {", ".join(falliti)}' if falliti else ''))
    return 1 if falliti else 0


if __name__ == '__main__':
    sys.exit(main())
