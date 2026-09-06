"""Rigenera gli artefatti del lotto, ciascuno con i propri argomenti.

`verifica_tutto.py` dice se gli artefatti reggono; questo dice **come sono stati fatti**. Finché il
comando di rigenerazione restava sparso fra la memoria di chi lo aveva lanciato e qualche riga nei
documenti, «riproducibile» era una parola: nessuno poteva rifare il lotto senza indovinare gli
argomenti, e chi provava a lanciarli tutti con gli stessi due — è successo — ha cancellato 148.576
righe di prove riscrivendo un artefatto con una versione formalmente valida e vuota.

Qui l'ordine e gli argomenti di ciascun produttore sono scritti una volta sola. Chi aggiunge un
produttore aggiunge una riga a `ORDINE`: se non compare, non viene eseguito, e
`verify_determinismo.py` se ne accorge perché trova un produttore senza posto nel lotto.

Due produttori — `full_field_sources.py` e `scheduler_evidence.py` — chiamano un decompilatore
esterno che non sta nel repository. Non vengono eseguiti a vuoto: sono dichiarati in
`SERVE_UNO_STRUMENTO` e il comando lo dice a voce alta, invece di saltarli in silenzio e lasciar
credere che il lotto sia stato rifatto per intero.

Uso:

```bash
python tools/p5r-map-export/rigenera_tutto.py               # dalla radice del repository
python tools/p5r-map-export/rigenera_tutto.py --solo pin    # solo quelli col nome che contiene «pin»
python tools/p5r-map-export/rigenera_tutto.py --artefatti CARTELLA   # altrove, per confrontare
```

Il codice di uscita è 1 se anche uno solo fallisce.
"""
from pathlib import Path
import argparse
import subprocess
import sys

RADICE = Path(__file__).resolve().parents[2]
ARTEFATTI = RADICE/'data/atlas/extracted'
SEED = RADICE/'data/seed'
GIOCO = Path(r'C:\Program Files (x86)\Steam\steamapps\common\P5R')

# I produttori del lotto, nell'ordine in cui si rifanno. Ognuno riceve la cartella degli artefatti
# come primo argomento; quel che vuole in più è scritto qui accanto, col perché.
ORDINE = [
    ('world_metadata.py', []),
    ('world_connections.py', []),       # gli argomenti veri stanno in SPECIALI
    ('native_labels.py', []),
    ('whole_map_names.py', []),
    ('dungeon_place_index.py', []),
    ('texpack_evidence.py', []),
    ('field_identities.py', []),
    ('full_field_connections.py', []),
    ('scheduler_references.py', []),
    ('global_world_audit.py', []),
    # Prima chi produce, poi chi ne registra l'impronta: `urban_conditions` e `school_candidates`
    # scrivono nel proprio artefatto lo sha256 delle evidenze da cui partono, e invertirli fa
    # registrare l'impronta della versione precedente — il lotto converge lo stesso, ma solo
    # perché lo si è rigenerato due volte, che non è una garanzia, è una coincidenza.
    ('urban_projection.py', []),
    ('urban_conditions.py', []),
    ('school_projection.py', []),
    ('school_candidates.py', []),
    ('map_icons.py', []),
    ('subway_network.py', []),
    ('save_places.py', []),
    ('guide_counts.py', [SEED]),            # conta le voci del catalogo del seed
    ('atlas_identity.py', [SEED]),          # incrocia il catalogo del seed
    ('pin_reference.py', []),
    ('edge_pins.py', [RADICE]),             # legge il registro dei segnalini in shared/spilli.ts
    ('icon_observations.py', [RADICE]),
    ('pin_part_table.py', [GIOCO/'P5R.exe']),   # la tabella tipo→sprite sta nell'eseguibile
    ('pin_copie_assorbite.py', []),
    ('cancelli_pin.py', []),
    ('map_projection.py', []),
    ('map_links.py', []),
    ('pin_semantics.py', []),
    ('app_package.py', []),
    ('render_maps.py', []),                 # l'indice consultabile e le tavole
    # il catalogo del seed da incrociare e il pacchetto da scrivere, detti tutti e due
    ('build_seed_package.py', [SEED, SEED/'mappe/atlante-mondo.json']),
]

# Chiedono un decompilatore esterno che non sta nel repository: non si possono rifare qui, e va
# detto invece che passato sotto silenzio.
SERVE_UNO_STRUMENTO = {
    'full_field_sources.py': 'vuole --compiler: il decompilatore degli script, esterno al repository',
    'scheduler_evidence.py': 'vuole --compiler: lo stesso decompilatore',
    # `esporta.py` rifà l'estrazione dai CPK del gioco: rilegge gli archivi, ridecodifica le
    # texture e riscrive i PNG. Non è parte del giro quotidiano — si lancia a mano quando cambia
    # la fonte, non per rifare un JSON — e `extract_maps.py` è il suo motore, non un produttore
    # a sé: scrive in `outputs/mappe-p5r`, non nella cartella degli artefatti.
    'esporta.py': 'rifà l’estrazione dai CPK: `python esporta.py --out CARTELLA`, si lancia a mano',
}

# Vogliono le tre fonti separate, e confonderle è già costato le evidenze delle connessioni.
SPECIALI = {
    'world_connections.py': ['--scripts', ARTEFATTI/'campi-completi/scripts',
                             '--bf', ARTEFATTI/'connessioni_originali/IT/FIELD/HIT'],
}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--solo', default='', help='esegue solo i produttori il cui nome contiene questo testo')
    p.add_argument('--artefatti', default=str(ARTEFATTI))
    a = p.parse_args()
    cartella = Path(__file__).resolve().parent
    elenco = [(n, extra) for n, extra in ORDINE if a.solo in n]
    falliti = []
    for nome, extra in elenco:
        argomenti = [sys.executable, str(cartella/nome), a.artefatti]
        argomenti += [str(x) for x in SPECIALI.get(nome, extra)]
        esito = subprocess.run(argomenti, cwd=cartella, capture_output=True, text=True,
                               encoding='utf8', errors='replace')
        if esito.returncode == 0:
            print(f'OK   {nome}')
        else:
            falliti.append(nome)
            print(f'FALLITO  {nome}')
            for riga in (esito.stderr or esito.stdout or '').strip().splitlines()[-4:]:
                print('         ' + riga)
    for nome, perche in sorted(SERVE_UNO_STRUMENTO.items()):
        if a.solo in nome:
            print(f'NON RIFATTO  {nome}: {perche}')
    print(f'\n{len(elenco) - len(falliti)} su {len(elenco)} rigenerati'
          + (f'; falliti: {", ".join(falliti)}' if falliti else ''))
    return 1 if falliti else 0


if __name__ == '__main__':
    sys.exit(main())
