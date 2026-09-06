"""Gli artefatti del lotto sono gli stessi byte ogni volta che li si rifà, ovunque li si rifaccia.

Non è pignoleria sui fine riga. `Path.write_text()` in modalità testo traduce `\\n` nel fine riga
della piattaforma: lo stesso identico artefatto esce con `\\r\\n` su Windows e `\\n` su Linux, e un
controllo di riproducibilità che confronta impronte passa su una macchina e fallisce sull'altra
senza che nessun dato sia cambiato. Peggio: smette di misurare i dati e comincia a misurare il
sistema operativo, cioè diventa rumore che nasconde le differenze vere.

Quattro controlli, e ciascuno chiude un modo diverso di sbagliare:

1. **statico** — nessun produttore scrive JSON per conto suo. Chi reintroduce `write_text` per un
   JSON viene nominato qui, prima che l'artefatto storto finisca nel repository. È il controllo che
   Codex ha chiesto: i cinque produttori che importavano `scrivi_json` senza usarlo sono passati
   per mesi perché nessuno guardava;
2. **censimento** — ogni produttore ha un posto in `rigenera_tutto.py`, o in `ORDINE` o fra quelli
   che dichiarano di volere uno strumento esterno. Un produttore senza posto è un artefatto che
   nessuno sa più come si rifà;
3. **contenuto** — ogni artefatto del lotto è UTF-8, senza `\\r`, con una sola riga finale;
4. **determinismo** — si rifà il lotto e si pretende lo stesso sha256, file per file. È l'unico dei
   quattro che guarda i dati e non la forma.

Quel che **non** è del lotto è elencato in `FUORI_DAL_LOTTO` con il motivo, e l'elenco è chiuso: un
artefatto storto che non compare lì fa fallire il controllo, e una voce che non corrisponde più a
nessun file fa fallire il controllo lo stesso — le esenzioni scadono, altrimenti diventano il posto
dove si nasconde quel che non si è voluto sistemare.

Uso:

```bash
python tools/p5r-map-export/verify_determinismo.py data/atlas/extracted   # dalla radice
python tools/p5r-map-export/verify_determinismo.py data/atlas/extracted --senza-rigenerare
```
"""
from pathlib import Path
import argparse
import hashlib
import re
import subprocess
import sys

import rigenera_tutto

RADICE = Path(__file__).resolve().parents[2]
CARTELLA = Path(__file__).resolve().parent
ESTENSIONI = {'.json', '.svg', '.html', '.md', '.txt'}

# Artefatti che il lotto non rifà, con il perché. L'elenco è chiuso e viene controllato in tutti e
# due i versi: quel che è storto e non è qui fa fallire, e quel che è qui e non esiste più fa
# fallire uguale.
FUORI_DAL_LOTTO = {
    # Il decompilatore degli script non sta nel repository: `full_field_sources.py` e
    # `scheduler_evidence.py` non si possono rifare qui, e i loro artefatti restano com'erano.
    'campi-completi/manifest.json': 'prodotto da full_field_sources.py, che vuole il decompilatore esterno',
    'scheduler/decompilazione.json': 'prodotto da scheduler_evidence.py, che vuole il decompilatore esterno',
    'scheduler/versione-decompilatore.json': 'scritto dal decompilatore esterno',
    # `esporta.py` rifà l'estrazione dai CPK del gioco: si lancia a mano, non a ogni giro.
    'manifest.json': 'prodotto da esporta.py, che rilegge gli archivi del gioco',
    'tool/LEGGIMI.md': 'copiato dentro l’esportazione da esporta.py',
    # Script monouso di `data/atlas/history/`: materiale di una lavorazione precedente, conservato
    # come evidenza e non più eseguito. Vanno con la ripulitura del vecchio, non con il lotto.
    'app-integration/audit-pulizia-globale.json': 'script monouso storico (data/atlas/history)',
    'app-integration/esito-importazione-isolata.json': 'script monouso storico (data/atlas/history)',
    'app-integration/piano-pulizia-globale.json': 'script monouso storico (data/atlas/history)',
    'app-integration/pin-luoghi-verificati.json': 'script monouso storico (data/atlas/history)',
    'app-integration/verifica-importazione-isolata.json': 'script monouso storico (data/atlas/history)',
    'app-integration/verifica-migrazione-arrivi.json': 'script monouso storico (data/atlas/history)',
    'app-integration/verifica-nomi-runtime.json': 'script monouso storico (data/atlas/history)',
    'bandiere-script.json': 'script monouso storico (data/atlas/history)',
    'campi-completi/grafo/inventario.json': 'script monouso storico (data/atlas/history)',
    'campi-completi/grafo/verifica.json': 'script monouso storico (data/atlas/history)',
    'collegamenti-script.json': 'script monouso storico (data/atlas/history)',
    'proiezione-urbana/sei-accessi.json': 'script monouso storico (data/atlas/history)',
    'verifica-tokyo-stato-attuale.json': 'script monouso storico (data/atlas/history)',
}

# Pacchetti mappa del seed scritti a mano dall'editor, non da un produttore: stessa regola, elenco
# a parte perché stanno in un'altra cartella.
FUORI_DAL_LOTTO_SEED = {
    'citta-yongen-jaya.json': 'pacchetto esportato dall’editor, non da un produttore',
    'yongen-java-banchina-della-metropolitana.json': 'pacchetto esportato dall’editor, non da un produttore',
}

SCRITTURA_DIRETTA = re.compile(r'\.write_text\s*\(')


def artefatti_del_lotto(out: Path):
    """Gli artefatti testuali versionati, meno quelli dichiarati fuori."""
    dentro, fuori = [], []
    elenco = subprocess.run(['git', 'ls-files', 'data/atlas/extracted', 'data/seed/mappe'],
                            cwd=RADICE, capture_output=True, text=True, encoding='utf8')
    assert elenco.returncode == 0, 'git ls-files non ha risposto: il controllo vuole un repository'
    for riga in elenco.stdout.splitlines():
        percorso = RADICE/riga
        if percorso.suffix.lower() not in ESTENSIONI or not percorso.is_file():
            continue
        if riga.startswith('data/seed/mappe/'):
            (fuori if percorso.name in FUORI_DAL_LOTTO_SEED else dentro).append(percorso)
            continue
        relativo = riga[len('data/atlas/extracted/'):]
        (fuori if relativo in FUORI_DAL_LOTTO else dentro).append(percorso)
    return dentro, fuori


def controlla_statico():
    """Nessun produttore scrive JSON da sé, e ognuno ha un posto nel comando di rigenerazione."""
    colpevoli = []
    for sorgente in sorted(CARTELLA.glob('*.py')):
        # `scrittura.py` è il posto dove la scrittura diretta è giusta; questo file la nomina per
        # cercarla, e cercarla non è farla.
        if sorgente.name in ('scrittura.py', Path(__file__).name):
            continue
        testo = sorgente.read_text(encoding='utf8')
        for numero, riga in enumerate(testo.splitlines(), 1):
            if SCRITTURA_DIRETTA.search(riga):
                colpevoli.append(f'{sorgente.name}:{numero} scrive da sé invece di passare da scrittura.py')
    assert not colpevoli, ('produttori che scrivono senza `scrittura.py`:\n  ' + '\n  '.join(colpevoli)
                           + '\nUsare `scrivi_json(percorso, dati)` o `scrivi_testo(percorso, testo)`: '
                             '`Path.write_text()` traduce i fine riga e rende l’artefatto diverso '
                             'a seconda del sistema operativo.')

    dichiarati = {n for n, _ in rigenera_tutto.ORDINE} | set(rigenera_tutto.SERVE_UNO_STRUMENTO)
    # I moduli di appoggio non producono artefatti: non hanno un posto da avere.
    appoggio = {'scrittura.py', 'verifica_tutto.py', 'rigenera_tutto.py', 'assegnazione.py',
                'legacy_utf.py', 'flow_binario.py', 'restore_originals.py', 'extract_maps.py',
                'pin_luoghi.py'}
    senza_posto = sorted(s.name for s in CARTELLA.glob('*.py')
                         if not s.name.startswith('verify_') and s.name not in appoggio
                         and s.name not in dichiarati)
    assert not senza_posto, ('produttori senza un posto in rigenera_tutto.py: ' + ', '.join(senza_posto)
                             + '. Un produttore che non compare né in ORDINE né fra quelli che '
                               'vogliono uno strumento esterno è un artefatto che nessuno sa più rifare.')


def controlla_contenuto(dentro, fuori):
    """UTF-8, nessun `\\r`, una sola riga finale — e le esenzioni ancora vere."""
    guasti = []
    for percorso in dentro:
        byte = percorso.read_bytes()
        relativo = percorso.relative_to(RADICE).as_posix()
        try:
            byte.decode('utf8')
        except UnicodeDecodeError:
            guasti.append(f'{relativo}: non è UTF-8')
            continue
        if b'\r' in byte:
            guasti.append(f'{relativo}: contiene fine riga di Windows')
        if not byte.endswith(b'\n'):
            guasti.append(f'{relativo}: non finisce con una riga')
        elif byte.endswith(b'\n\n'):
            guasti.append(f'{relativo}: finisce con più di una riga vuota')
    assert not guasti, ('artefatti non canonici:\n  ' + '\n  '.join(guasti)
                        + '\nRifarli con `python tools/p5r-map-export/rigenera_tutto.py`.')

    # Le esenzioni scadono: una voce che non corrisponde più a nessun file è una scusa rimasta lì.
    presenti = {p.relative_to(RADICE/'data/atlas/extracted').as_posix()
                for p in fuori if 'extracted' in p.parts}
    presenti |= {p.name for p in fuori if p.parent.name == 'mappe'}
    dichiarate = set(FUORI_DAL_LOTTO) | set(FUORI_DAL_LOTTO_SEED)
    scadute = sorted(dichiarate - presenti)
    assert not scadute, ('esenzioni che non corrispondono più a nessun file: ' + ', '.join(scadute)
                         + '. Toglierle da FUORI_DAL_LOTTO invece di lasciarle a coprire il nulla.')


def controlla_determinismo(out: Path, dentro):
    """Si rifà il lotto e si pretende lo stesso sha256, file per file."""
    def impronte():
        return {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in dentro}

    prima = impronte()
    esito = subprocess.run([sys.executable, str(CARTELLA/'rigenera_tutto.py'), '--artefatti', str(out)],
                           cwd=CARTELLA, capture_output=True, text=True, encoding='utf8', errors='replace')
    assert esito.returncode == 0, ('la rigenerazione è fallita, e senza rigenerazione il determinismo '
                                   'non si misura:\n' + (esito.stdout or '') + (esito.stderr or ''))
    dopo = impronte()
    cambiati = sorted(p.relative_to(RADICE).as_posix() for p in dentro if prima[p] != dopo[p])
    assert not cambiati, ('rifacendo il lotto dagli stessi ingressi questi artefatti cambiano:\n  '
                          + '\n  '.join(cambiati)
                          + '\nUn produttore che non dà due volte lo stesso risultato sta leggendo '
                            'qualcosa che non ha dichiarato: l’ora, l’ordine di un insieme, un percorso.')
    return len(dentro)


def main(out, rigenera=True):
    # Assoluto: la rigenerazione gira con la cartella degli strumenti come cartella corrente, e un
    # percorso relativo lì dentro punta altrove — trentuno produttori falliti tutti insieme.
    out = Path(out).resolve()
    dentro, fuori = artefatti_del_lotto(out)
    controlla_statico()
    controlla_contenuto(dentro, fuori)
    quanti = controlla_determinismo(out, dentro) if rigenera else 0
    print(f'{len(dentro)} artefatti del lotto: UTF-8, senza CRLF, con la riga finale')
    print(f'{len(fuori)} fuori dal lotto, ciascuno con il motivo dichiarato')
    print('nessun produttore scrive JSON senza passare da scrittura.py')
    print(f'{quanti} artefatti identici byte per byte dopo una rigenerazione'
          if rigenera else 'determinismo non misurato (--senza-rigenerare)')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('out')
    p.add_argument('--senza-rigenerare', action='store_true',
                   help='salta la rigenerazione: controlla solo forma e censimento')
    a = p.parse_args()
    main(a.out, not a.senza_rigenerare)
