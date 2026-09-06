"""Legge gli script compilati del gioco (`.BF`) senza decompilatore esterno.

Dei 5182 script che il gioco contiene, solo 227 — quelli dei campi — erano stati decompilati con
uno strumento esterno. Tutti gli altri (`SCRIPT/FIELD`, `FIELD/DOOR`, `FIELD/INIT`, `FIELD/NPC`,
`EVENT_DATA/SCRIPT`…) sono rimasti chiusi, e con loro le procedure che accendono le bandiere dei
pin: 581 pin condizionali hanno una bandiera che nessuna procedura *fra quelle note* accende.

Qui non serve un decompilatore completo. Serve rispondere a due domande: **come si chiamano le
procedure** e **quali bandiere accendono**. Entrambe si leggono dal binario.

Il formato `FLW0` è a sezioni, tutto big-endian. Dopo un'intestazione di 32 byte c'è la tabella
delle sezioni, quattro interi ciascuna — tipo, dimensione dell'elemento, numero di elementi,
offset:

| tipo | contenuto |
|---|---|
| 0 | etichette di procedura: nome di 32 byte, poi l'indice dell'istruzione da cui parte |
| 1 | etichette di salto, stesso formato |
| 2 | le istruzioni, quattro byte l'una |
| 3 | lo script dei messaggi |
| 4 | le stringhe |

Un'istruzione è `opcode` (16 bit) più un operando (16 bit); gli opcode che spingono una costante
a 32 bit (`PUSHI`) e quelli che spingono un float (`PUSHF`) prendono la parola successiva come
valore. Una chiamata di sistema è `COMM`, e il suo operando è l'indice della funzione nella
libreria: `BIT_ON` accende una bandiera, e l'argomento è la costante spinta subito prima.

Il parser è verificato contro i 227 script già decompilati: deve ritrovare gli stessi nomi di
procedura e le stesse bandiere accese, altrimenti non vale nulla (`verify_flow_binario.py`).
"""
from pathlib import Path
import struct
import sys

MAGIC = b'FLW0'
INTESTAZIONE = 32
VOCE_SEZIONE = 16
PROCEDURE, ETICHETTE, ISTRUZIONI, MESSAGGI, STRINGHE = 0, 1, 2, 3, 4

# Gli opcode che servono, dedotti dal confronto fra il bytecode e gli script gia' decompilati:
# `001d:0f94  0000:0000 2000:0000  000e:0000  0008:000d` e' esattamente
# `BIT_ON(0x20000000 + 3988)`.
PUSHIS = 0x1d   # spinge l'operando a 16 bit dell'istruzione stessa
PUSHI = 0x00    # spinge la parola successiva, valore a 32 bit
PUSHF = 0x01    # come sopra, ma in virgola mobile
ADD = 0x0e      # somma i due valori in cima
COMM = 0x08     # chiama la funzione della libreria indicata dall'operando
# La bandiera dei pin della mappa d'insieme sta in questo intervallo: le procedure la accendono
# con `BIT_ON(0x20000000 + n)`.
BASE_BANDIERA = 0x20000000


def sezioni(dati):
    """La tabella delle sezioni, letta e controllata contro la lunghezza del file."""
    if len(dati) < INTESTAZIONE or dati[8:12] != MAGIC:
        raise ValueError('non è uno script FLW0')
    quante, = struct.unpack_from('>I', dati, 16)
    if quante > 16:
        raise ValueError('numero di sezioni non plausibile')
    trovate = {}
    for i in range(quante):
        off = INTESTAZIONE + i*VOCE_SEZIONE
        if off + VOCE_SEZIONE > len(dati):
            raise ValueError('tabella delle sezioni troncata')
        tipo, misura, numero, posizione = struct.unpack_from('>4I', dati, off)
        if numero and (posizione + misura*numero > len(dati) or misura == 0):
            raise ValueError(f'sezione {tipo} fuori dal file')
        trovate[tipo] = (misura, numero, posizione)
    return trovate


def etichette(dati, sezione):
    """Nome e istruzione d'inizio di ogni procedura (o etichetta di salto)."""
    if not sezione:
        return []
    misura, numero, posizione = sezione
    fuori = []
    for i in range(numero):
        blocco = dati[posizione + i*misura: posizione + (i+1)*misura]
        nome = blocco[:misura-8].split(b'\0')[0].decode('ascii', 'replace')
        indice, = struct.unpack_from('>I', blocco, misura-8)
        fuori.append((nome, indice))
    return fuori


def istruzioni(dati, sezione):
    """Le istruzioni, come coppie (opcode, operando), con il valore già unito dove serve."""
    if not sezione:
        return []
    misura, numero, posizione = sezione
    parole = [struct.unpack_from('>HH', dati, posizione + i*misura) for i in range(numero)]
    fuori, i = [], 0
    while i < len(parole):
        codice, operando = parole[i]
        valore = None
        if codice in (PUSHI, PUSHF) and i + 1 < len(parole):
            alto, basso = parole[i+1]
            valore = (alto << 16) | basso
            i += 1
        elif codice == PUSHIS:
            valore = operando
        fuori.append((codice, operando, valore))
        i += 1
    return fuori


def bandiere_accese(dati, indice_bit_on):
    """Per ogni procedura, le bandiere che accende: `PUSHI <valore>` seguito da `COMM BIT_ON`.

    Si scorre il codice di ciascuna procedura tenendo l'ultima costante spinta; quando arriva la
    chiamata a `BIT_ON`, quella costante è il suo argomento. È lo stesso che fa la macchina
    virtuale del gioco, ridotto a ciò che serve.
    """
    sez = sezioni(dati)
    procedure = etichette(dati, sez.get(PROCEDURE))
    codice = istruzioni(dati, sez.get(ISTRUZIONI))
    if not procedure or not codice:
        return {}
    confini = sorted((inizio, nome) for nome, inizio in procedure)
    fuori = {}
    for n, (inizio, nome) in enumerate(confini):
        fine = confini[n+1][0] if n + 1 < len(confini) else len(codice)
        pila, accese = [], []
        for op, operando, valore in codice[inizio:fine]:
            if op in (PUSHI, PUSHIS) and valore is not None:
                pila.append(valore)
            elif op == ADD and len(pila) >= 2:
                b, a = pila.pop(), pila.pop()
                pila.append((a + b) & 0xffffffff)
            elif op == COMM:
                if operando == indice_bit_on and pila:
                    accese.append(pila[-1])
                pila.clear()
            elif op != PUSHF:
                # ogni altra istruzione consuma quello che c'era: la pila non si porta dietro
                # valori vecchi, che darebbero abbinamenti falsi
                pila.clear()
        if accese:
            fuori.setdefault(nome, []).extend(accese)
    return fuori


def indice_di_bit_on(dati_noti, attese):
    """Ricava dall'evidenza quale indice della libreria corrisponde a `BIT_ON`.

    L'indice non è scritto da nessuna parte nel file: è un numero della libreria del gioco. Lo si
    trova provandoli tutti su script di cui si conosce già il risultato — i 227 campi decompilati —
    e tenendo quello che riproduce esattamente le bandiere attese.
    """
    conteggi = {}
    for indice in range(0, 1024):
        giusti = 0
        for dati, attesa in zip(dati_noti, attese):
            try:
                trovate = bandiere_accese(dati, indice)
            except ValueError:
                continue
            insieme = {v for vs in trovate.values() for v in vs if v >= BASE_BANDIERA}
            if insieme and insieme == attesa:
                giusti += 1
        if giusti:
            conteggi[indice] = giusti
    if not conteggi:
        return None, {}
    migliore = max(conteggi, key=lambda k: conteggi[k])
    return migliore, conteggi


if __name__ == '__main__':
    dati = Path(sys.argv[1]).read_bytes()
    sez = sezioni(dati)
    print('sezioni:', {k: v[1] for k, v in sez.items()})
    for nome, inizio in etichette(dati, sez.get(PROCEDURE))[:20]:
        print('  procedura', nome, '@', inizio)
