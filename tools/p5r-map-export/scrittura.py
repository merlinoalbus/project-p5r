"""Come si scrive un artefatto, in un posto solo.

`Path.write_text()` sembra innocuo e non lo è: in modalità testo Python traduce `\\n` nel fine riga
della piattaforma, quindi lo stesso identico artefatto esce con `\\r\\n` su Windows e `\\n` su Linux.
Il contenuto è lo stesso, i byte no — e i verificatori confrontano byte e impronte. Un controllo di
riproducibilità che passa su una macchina e fallisce sull'altra non sta misurando i dati, sta
misurando il sistema operativo.

Qui il fine riga è dichiarato: sempre `\\n`, ovunque. È anche quello che git tiene nell'indice, così
il file su disco e quello versionato coincidono senza che nessuno debba ricordarsene.
"""
from pathlib import Path
import json


def scrivi_json(percorso, dati, indent=2):
    """Un artefatto JSON con fine riga stabile e una riga finale."""
    testo = json.dumps(dati, ensure_ascii=False, indent=indent)
    scrivi_testo(percorso, testo if testo.endswith('\n') else testo + '\n')


def scrivi_testo(percorso, testo):
    """Testo con fine riga `\\n` su qualunque piattaforma."""
    with open(Path(percorso), 'w', encoding='utf8', newline='\n') as f:
        f.write(testo)
