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


def scrivi_json(percorso, dati, indent=2, ammetti_nan=True):
    """Un artefatto JSON con fine riga stabile e una riga finale.

    `ammetti_nan=False` rifiuta `NaN` e `Infinity`. Python li scriverebbe tali e quali, ma non sono
    JSON valido: un lettore che non sia Python si ferma lì. Serve a chi produce misure in virgola
    mobile, dove un valore non finito non è un dato ma il segno che il calcolo è andato storto —
    meglio fermarsi subito che salvarlo in un file che poi nessun altro riesce a leggere.
    """
    testo = json.dumps(dati, ensure_ascii=False, indent=indent, allow_nan=ammetti_nan)
    scrivi_testo(percorso, testo if testo.endswith('\n') else testo + '\n')


def scrivi_testo(percorso, testo):
    """Testo con fine riga `\\n` su qualunque piattaforma e una sola riga vuota in fondo.

    La riga finale non è pignoleria: senza, l'ultima riga del file non è una riga, e ogni
    strumento che lavora per righe — `diff`, `git`, `tail`, il confronto fra due rigenerazioni —
    la tratta come un caso a parte. Una sola, sempre: se il testo ne porta già tre, ne resta una.
    """
    with open(Path(percorso), 'w', encoding='utf8', newline='\n') as f:
        f.write(testo.rstrip('\n') + '\n')
