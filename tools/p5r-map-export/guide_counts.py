"""Che cosa disegna un tipo di pin, dedotto da quanti oggetti la guida conta in ogni area.

È lo stesso ragionamento delle icone contate nelle schermate, ma la fonte dei conteggi è già nel
progetto e copre molte più aree: la guida italiana elenca, area per area, i forzieri, le stanze
sicure, le scorciatoie, i semi della bramosia. Se in un'area la guida conta tre forzieri, il tipo
di pin che li disegna deve comparire tre volte fra i pin della planimetria di quell'area.

Il legame fra area della guida e planimetria nativa esiste già ed è dichiarato nel pacchetto
(`entita: {tipo: 'area'}`): settantadue planimetrie ne hanno uno.

Due differenze rispetto alle schermate, che cambiano il criterio:

* la guida è **editoriale**, non estratta: conta quello che al giocatore serve sapere, e può
  saltare un forziere secondario o contarne uno che la mappa non segna. Per questo non si pretende
  l'accordo su tutte le aree, ma su una **quota alta** di esse, e la quota si scrive;
* una planimetria è **una versione** dell'area, e le versioni possono mostrare parti diverse. Le
  aree con più planimetrie contano una volta sola, sulla planimetria che il pacchetto dichiara.

Un tipo è dimostrato quando, su un numero di aree non piccolo, coincide molto più spesso di
chiunque altro — e il secondo classificato è staccato. Se due tipi vanno quasi uguale non si
sceglie: si dichiara che non si sa.
"""
from pathlib import Path
import collections
import json
import sys

# Aree minime su cui misurare, e quota di accordo perché il tipo sia dimostrato.
MINIME_AREE = 10
QUOTA_ACCORDO = 0.75
# Distacco minimo dal secondo classificato: senza, due tipi equivalenti si sceglierebbero a caso.
DISTACCO = 0.15

# Che cosa la guida chiama così, e con quale segnalino dell'applicazione va reso.
GENERI = {
    'forziere': ('forziere', 'Forziere'),
    'forziere-chiuso': ('forziere', 'Forziere chiuso'),
    'sicura': ('sicura', 'Stanza sicura'),
    'scorciatoia': ('scorciatoia', 'Scorciatoia'),
    'volonta': ('seme-bramosia', 'Seme della bramosia'),
    'oggetto': ('oggetto-chiave', 'Oggetto'),
    'puzzle': ('meccanismo', 'Meccanismo'),
    'boss': ('boss', 'Boss'),
    'miniboss': ('miniboss', 'Nemico potente'),
}


def conteggi_della_guida(seed):
    """Per ogni area della guida, quanti punti di ciascun genere."""
    dungeon = json.loads((seed/'dungeon.json').read_text(encoding='utf8'))
    per_area = {}
    for d in dungeon:
        for area in d.get('aree') or []:
            conta = collections.Counter(p.get('tipo') for p in (area.get('punti') or []))
            per_area[area['chiave']] = conta
    return per_area


def pin_per_area(pacchetto, metadati):
    """Per ogni area della guida, i pin nativi della planimetria che la rappresenta."""
    nativi = {}
    for m in metadati['maps']:
        chiave = 'nativo-rmap-%03d-%d-%d' % tuple(int(v) for v in m['code'].split('_')[1:])
        nativi[chiave] = collections.Counter(p['nativeType'] for p in m['pins'])
    fuori = {}
    for m in pacchetto['mappe']:
        entita = m.get('entita') or {}
        if entita.get('tipo') != 'area' or m['chiave'] not in nativi:
            continue
        # se più planimetrie dichiarano la stessa area si tiene quella con più pin: è la versione
        # che mostra di più, e confrontarla con la guida è il paragone più informativo
        precedente = fuori.get(entita['chiave'])
        if precedente is None or sum(nativi[m['chiave']].values()) > sum(precedente[1].values()):
            fuori[entita['chiave']] = (m['chiave'], nativi[m['chiave']])
    return fuori


def main(out, seed=None):
    out = Path(out)
    seed = Path(seed) if seed else Path(__file__).resolve().parents[2]/'data/seed'
    guida = conteggi_della_guida(seed)
    metadati = json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    pacchetto = json.loads((seed/'mappe/atlante-mondo.json').read_text(encoding='utf8'))
    aree = pin_per_area(pacchetto, metadati)
    tutti = sorted({t for _, c in aree.values() for t in c} |
                   {p['nativeType'] for m in metadati['maps'] for p in m['pins']})

    esito = {}
    for genere, (spillo, etichetta) in sorted(GENERI.items()):
        casi = [(chiave, conta, aree[chiave]) for chiave, conta in guida.items() if chiave in aree]
        if len(casi) < MINIME_AREE:
            continue
        # Le aree in cui la guida non conta nulla vanno escluse: lì «accorda» qualunque tipo che
        # su quella planimetria non compare, e sono la maggioranza. L'accordo si misura dove c'è
        # qualcosa da contare, altrimenti si misura il vuoto.
        casi = [c for c in casi if c[1].get(genere, 0) > 0]
        if len(casi) < MINIME_AREE:
            continue
        punteggi = {}
        for tipo in tutti:
            accordi = sum(1 for _chiave, conta, (_m, pin) in casi
                          if pin.get(tipo, 0) == conta.get(genere, 0))
            punteggi[tipo] = accordi/len(casi)
        ordinati = sorted(punteggi.items(), key=lambda x: (-x[1], x[0]))
        primo, secondo = ordinati[0], (ordinati[1] if len(ordinati) > 1 else (None, 0.0))
        dimostrato = (primo[0] if primo[1] >= QUOTA_ACCORDO and primo[1] - secondo[1] >= DISTACCO
                      else None)
        esito[genere] = dict(
            aree=len(casi), tipoSpillo=spillo, etichetta=etichetta,
            migliori=[dict(tipo=t, accordo=round(q, 3)) for t, q in ordinati[:4]],
            dimostrato=dimostrato,
            motivo=None if dimostrato is not None else
            (f'il migliore accorda solo sul {round(primo[1]*100)}% delle aree'
             if primo[1] < QUOTA_ACCORDO else
             f'il secondo è staccato di appena {round((primo[1]-secondo[1])*100)} punti'))

    dimostrati = {v['dimostrato']: dict(genere=g, tipoSpillo=v['tipoSpillo'],
                                        etichetta=v['etichetta'], aree=v['aree'],
                                        accordo=v['migliori'][0]['accordo'],
                                        motivo=f"su {v['aree']} aree il numero di pin di questo tipo "
                                               f"coincide con quanti «{g}» la guida conta, nel "
                                               f"{round(v['migliori'][0]['accordo']*100)}% dei casi")
                  for g, v in esito.items() if v['dimostrato'] is not None}

    risultato = dict(
        schemaVersion=1,
        sources=dict(guida='data/seed/dungeon.json', pacchetto='data/seed/mappe/atlante-mondo.json',
                     metadati='mondo_metadati.json'),
        criterio=dict(areeMinime=MINIME_AREE, quotaAccordo=QUOTA_ACCORDO, distacco=DISTACCO,
                      forma='il tipo deve comparire tante volte quanti i punti che la guida conta '
                            'in quell’area, su una quota alta delle aree e staccando il secondo'),
        generi=esito, tipiDimostrati={str(k): v for k, v in sorted(dimostrati.items())},
        summary=dict(areeConPlanimetria=len(aree), generiEsaminati=len(esito),
                     tipiDimostrati=len(dimostrati)),
        limits=['La guida è editoriale: conta ciò che serve al giocatore, non ciò che la mappa '
                'disegna. Per questo non si pretende l’accordo perfetto, e la quota è scritta.',
                'Una planimetria è una versione dell’area: si confronta quella con più pin.'])
    (out/'conteggi-guida.json').write_text(json.dumps(risultato, ensure_ascii=False, indent=2),
                                           encoding='utf8')
    print(json.dumps(risultato['summary'], ensure_ascii=False))
    for genere, v in sorted(esito.items()):
        print(f"  {genere:16s} {v['aree']:3d} aree ->",
              f"tipo {v['dimostrato']} ({v['migliori'][0]['accordo']:.0%})" if v['dimostrato'] is not None
              else f"{[(m['tipo'], m['accordo']) for m in v['migliori'][:3]]} — {v['motivo']}")
    return risultato


if __name__ == '__main__':
    main(*sys.argv[1:3])
