"""Che cosa blocca un pin, una volta che ci sei arrivato.

Per un pezzo abbiamo trattato la bandiera di un pin come se fosse una condizione: ogni pin
condizionato entrava con un `da-configurare` che riportava il numero della bandiera. Era sbagliato,
e l'ha detto l'utente in due righe: **questa è una guida, non il gioco**. Che tu abbia già scoperto
un posto non interessa a chi consulta la guida — la apre proprio per sapere che cosa c'è prima di
trovarlo. Quello che interessa è un'altra cosa: *arrivato lì, la cosa è disponibile o è bloccata?*

E quello il gioco lo scrive, in un posto che finora nessuno aveva guardato. Ogni trigger di campo
porta due liste di bit, `enableFlags` e `disableFlags`: il trigger è attivo solo se i primi sono
accesi e i secondi spenti. Sono i **cancelli**, e su 4653 trigger ne hanno uno 3335.

La catena è esatta, non geometrica:

1. il pin porta la sua bandiera;
2. negli script c'è la procedura che quella bandiera accende;
3. quella procedura è agganciata a un trigger del campo (406 casi su 425 verificati);
4. quel trigger ha i suoi cancelli;
5. e ciascun cancello è a sua volta acceso da un'altra procedura, il cui nome dice che cosa devi
   aver fatto: `GIM_BLUE_SWITCH` la leva blu, `ELEVATOR_A_SWITCH` l'ascensore, `e05_02_START`
   un evento della storia.

Un cancello però non vale l'altro. Il più frequente è la famiglia `minimap`, che vuol dire «ci sei
già passato»: per la guida non è un blocco, è di nuovo la scoperta, e va scartato. Restano i
cancelli veri — meccanismi azionati, eventi avvenuti, porte a codice — e sono quelli che questo
file raccoglie.

Il risultato è piccolo e onesto: la maggior parte dei pin **non ha niente che li blocchi**, e
dirlo è giusto. Metterci un «da configurare» a tutti faceva sembrare condizionato un mondo che
per lo più non lo è, e nascondeva i pochi casi che contano davvero.
"""
from pathlib import Path

from scrittura import scrivi_json
import collections
import json
import re
import sys

SENTINELLA = 0xFFFFFFFF
BIT_ON = re.compile(r'BIT_ON\(\((0x[0-9a-fA-F]+|\d+) \+ (\d+)\)\)')
# Famiglie di cancelli che per la guida non sono un blocco: dicono che sei già stato in un posto o
# che un'icona è già comparsa. Scartarle non è un'assunzione, è la conseguenza di che cos'è una
# guida: mostrare prima, non dopo.
SCOPERTA = re.compile(r'minimap|_ICON|icon_', re.I)

# Come si legge il nome di una procedura che accende un cancello. Prima le forme parlanti; ciò che
# non rientra qui resta senza resa e viene dichiarato, non tradotto a caso.
LETTURE = [
    (re.compile(r'GIM_?\w*BLUE_SWITCH', re.I), 'dopo aver azionato la leva blu'),
    (re.compile(r'GIM_?\w*RED_SWITCH', re.I), 'dopo aver azionato la leva rossa'),
    (re.compile(r'GIM_?\w*GREEN_SWITCH', re.I), 'dopo aver azionato la leva verde'),
    (re.compile(r'ELEVATOR\w*_SWITCH', re.I), 'dopo aver chiamato l’ascensore'),
    (re.compile(r'GIM\d*_BUTTON', re.I), 'dopo aver premuto il pulsante'),
    (re.compile(r'MOUSE_SWITCH', re.I), 'dopo aver azionato il meccanismo del topo'),
    (re.compile(r'\bSWITCH\b|_SWITCH', re.I), 'dopo aver azionato il meccanismo'),
    (re.compile(r'PASSWARD|PASSWORD', re.I), 'dopo aver trovato la parola d’ordine'),
    (re.compile(r'SEEDicon', re.I), 'dopo aver trovato il seme della bramosia'),
    (re.compile(r'MEME_LOCK_CLEAR', re.I), 'dopo aver rimosso il blocco nei Memento'),
    # N_TBOX/R_TBOX come **cancello** non e' il forziere in se': e' un altro punto che si sblocca
    # quando quel forziere e' stato aperto.
    (re.compile(r'R_TBOX|N_TBOX|N_BOX', re.I), 'dopo aver aperto il forziere'),
    (re.compile(r'ex_battle', re.I), 'dopo lo scontro'),
    (re.compile(r'DOOR', re.I), 'dopo aver aperto la porta'),
    (re.compile(r'_e\d+_\d+(_START|_pre)?$|EVT_LAST|EV_FIRST', re.I), 'dopo un evento della storia'),
]


def famiglia(nome):
    return re.sub(r'\d+', '#', nome or '')


def resa(nome):
    for schema, testo in LETTURE:
        if schema.search(nome or ''):
            return testo
    return None


def accenditori(con):
    """Per ogni bit, i nomi delle procedure che lo accendono, ovunque nel gioco."""
    fuori = collections.defaultdict(set)
    for f in con['fields']:
        for p in f['procedures']:
            for base, scarto in BIT_ON.findall(p['body'] or ''):
                fuori[int(base, 0) + int(scarto)].add(p['name'])
    return fuori


def trigger_per_bandiera(con):
    """Per (campo, bandiera), i trigger che la accendono: sono i punti che rivelano quel pin."""
    fuori = collections.defaultdict(list)
    for f in con['fields']:
        per_indice = collections.defaultdict(list)
        for t in f['triggers']:
            per_indice[t.get('procedureIndex')].append(t)
        for p in f['procedures']:
            for base, scarto in BIT_ON.findall(p['body'] or ''):
                for t in per_indice.get(p['index'], []):
                    fuori[(f['field'], int(base, 0) + int(scarto))].append(t)
    return fuori


def calcola(out):
    """Il conto, senza scrivere niente.

    Sta separato dalla scrittura apposta: un verificatore deve poter rifare il calcolo senza
    toccare l'artefatto ufficiale. Rigenerarlo per confrontarlo con se stesso non prova nulla, e
    se il comando riceve un percorso sbagliato distrugge quello buono — e' gia' successo.
    """
    out = Path(out)
    con = json.loads((out/'campi-completi/connessioni.json').read_text(encoding='utf8'))
    meta = json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))['maps']
    accende = accenditori(con)
    per_bandiera = trigger_per_bandiera(con)

    righe, esiti = [], collections.Counter()
    senza_resa = collections.Counter()
    for mappa in meta:
        chiave = 'nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in mappa['code'].split('_')[1:])
        for indice, pin in enumerate(mappa['pins']):
            if not pin['conditional']:
                esiti['non condizionato: niente lo governa'] += 1
                continue
            trigger = [t for campo in mappa['fields'] for t in per_bandiera.get((campo, pin['flag']), [])]
            if not trigger:
                esiti['nessun trigger accende la sua bandiera'] += 1
                continue
            cancelli = set()
            for t in trigger:
                cancelli |= {x for x in [*t['enableFlags'], *t['disableFlags']]
                             if x not in (0, SENTINELLA)}
            if not cancelli:
                esiti['trigger senza cancelli: niente lo blocca'] += 1
                continue
            veri = []
            for g in sorted(cancelli):
                nomi = sorted(accende.get(g, ()))
                utili = [n for n in nomi if not SCOPERTA.search(n)]
                if not utili:
                    continue
                for n in utili:
                    veri.append(dict(bandiera=g, procedura=n, famiglia=famiglia(n), resa=resa(n)))
            if not veri:
                esiti['solo cancelli di scoperta: per la guida non blocca'] += 1
                continue
            tradotti = [v for v in veri if v['resa']]
            for v in veri:
                if not v['resa']:
                    senza_resa[v['famiglia']] += 1
            esiti['con un cancello tradotto' if tradotti else 'con cancelli, nessuno traducibile'] += 1
            righe.append(dict(mappa=chiave, indicePin=indice, tipoNativo=pin['nativeType'],
                              bandiera=pin['flag'], cancelli=veri,
                              rese=sorted({v['resa'] for v in tradotti})))

    risultato = dict(
        schemaVersion=1,
        sources=dict(connessioni='campi-completi/connessioni.json', metadati='mondo_metadati.json'),
        criterio=dict(
            catena='pin → bandiera → procedura che la accende → trigger a cui è agganciata → '
                   'cancelli di quel trigger → procedura che accende ciascun cancello',
            scartate='le famiglie di scoperta (minimap, icone): dicono che ci sei già passato, e '
                     'per una guida non sono un blocco',
            rese=[testo for _, testo in LETTURE]),
        pin=righe,
        summary=dict(esiti=dict(esiti), pinConCancello=len(righe),
                     pinConResa=sum(1 for r in righe if r['rese']),
                     famiglieSenzaResa=dict(senza_resa.most_common(20))),
        limits=['I forzieri e la gran parte degli oggetti non hanno una procedura di interazione '
                'negli script di campo: sono oggetti del motore, e per loro un cancello negli '
                'script non esiste. Che non ne abbiano non è un buco dell’estrazione.',
                'Un cancello dice che qualcosa deve essere avvenuto, non quando: la data non c’è.'])
    return risultato


def main(out):
    risultato = calcola(out)
    scrivi_json(Path(out)/'cancelli-pin.json', risultato)
    print(json.dumps(risultato['summary'], ensure_ascii=False, indent=1))
    return risultato


if __name__ == '__main__':
    main(sys.argv[1])
