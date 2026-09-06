"""Costruisce il pacchetto di seed dell'atlante: un solo mondo, agganciato all'albero dell'app.

Prende il catalogo di identità (`atlante-identita.json`) e ne fa un pacchetto nel formato che
`importaMappe` già conosce. Tre scelte guidano la costruzione:

* **un luogo, una voce.** Le versioni della stessa zona restano immagini distinte ma condividono
  il `gruppoImmagini`, così l'indice mostra un luogo solo con le sue versioni; le copie effettive
  non entrano nel pacchetto.
* **agganciato, non parallelo.** Ogni luogo dichiara il genitore nell'albero che l'applicazione
  già costruisce dalla guida (`tokyo` → quartieri, `dungeon-<x>` → aree) e, quando la guida
  descrive la stessa zona, dichiara anche l'entità: è ciò che permette a Mappe, Città, Palazzi e
  Dedali, negozi e inventario di arrivare allo stesso posto.
* **niente nomi inventati.** Il nome è quello del catalogo, con il nome distintivo dove la zona è
  omonima di un'altra dello stesso gruppo.
"""
from pathlib import Path
import collections
import json
import re
import sys
import unicodedata

# Dove vive ciascun gruppo nativo nell'albero dell'applicazione. Le chiavi dei quartieri e dei
# Palazzi sono quelle che `sincronizzaMappe` crea dalla guida.
GENITORE = {
    'Shibuya': 'citta-shibuya',
    'Edificio Teikyu': 'citta-shibuya',
    'Shujin Academy': 'citta-shujin-academy',
    'Aoyama-Itchome': 'citta-shujin-academy',
    'Yongen-Jaya': 'citta-yongen-jaya',
    'Akihabara': 'citta-akihabara',
    'Kichijoji': 'citta-kichijoji',
    'Shinjuku': 'citta-shinjuku',
    'Chiesa': 'citta-kanda-jinbocho',
    'Seaside Park': 'citta-odaiba',
    'Palazzo di Kamoshida': 'dungeon-kamoshida',
    'Palazzo di Madarame': 'dungeon-madarame',
    'Palazzo di Kaneshiro': 'dungeon-kaneshiro',
    'Palazzo di Futaba': 'dungeon-futaba',
    'Palazzo di Okumura': 'dungeon-okumura',
    'Palazzo di Niijima': 'dungeon-niijima',
    'Palazzo di Shido': 'dungeon-shido',
    'Palazzo di Maruki': 'dungeon-maruki',
    'Profondità dei Memento': 'dungeon-iweleth',
    'Mondo del clifoto': 'dungeon-iweleth',
    'Memento - aree fisse': 'dungeon-mementos',
    'Covo dei Ladri': None,
    'Area riservata allo staff': None,
}
# Il gruppo nativo del Covo e della risorsa isolata diventa il nome del luogo radice.
RADICI = {'Covo dei Ladri': 'luogo', 'Area riservata allo staff': 'luogo'}
DUNGEON_DI_GRUPPO = {g: v.removeprefix('dungeon-') for g, v in GENITORE.items()
                     if v and v.startswith('dungeon-')}


def normalizza(testo):
    """Forma di confronto dei nomi: senza accenti, punteggiatura né parole di servizio."""
    t = unicodedata.normalize('NFKD', (testo or '').lower())
    t = ''.join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r'\b(parte|sezione|piano|livello)\b', ' ', t)
    t = re.sub(r'[^a-z0-9]+', ' ', t)
    return ' '.join(t.split())


def numero_romano(testo):
    m = re.search(r'\b(i{1,3}|iv|v|vi{1,3}|ix|x)\b', (testo or '').lower())
    valori = dict(i=1, ii=2, iii=3, iv=4, v=5, vi=6, vii=7, viii=8, ix=9, x=10)
    return valori.get(m.group(1)) if m else None


def ordinale(testo):
    m = re.search(r'(\d+)º tratto', testo or '')
    return int(m.group(1)) if m else None


def abbina_aree(luoghi, aree_per_dungeon):
    """Associa ogni luogo nativo all'area della guida che descrive la stessa zona, quando esiste.

    Si accetta solo una corrispondenza dimostrabile: nome normalizzato uguale, oppure contenuto
    l'uno nell'altro con la stessa parte quando entrambi ne indicano una. Ciò che resta spaiato è
    elencato: le aree della guida senza planimetria restano contenuti della guida, e le
    planimetrie senza area restano mappe senza entità.
    """
    esiti = []
    for luogo in luoghi:
        dungeon = DUNGEON_DI_GRUPPO.get(luogo['gruppo'])
        luogo['entita'] = None
        luogo['abbinamento'] = 'fuori-dai-palazzi' if not dungeon else 'nessuna-area-corrispondente'
        if not dungeon:
            continue
        nome = luogo.get('nomeDistintivo') or luogo['nome']
        base = normalizza(luogo['nome'])
        parte = ordinale(nome)
        candidati = []
        for area in aree_per_dungeon.get(dungeon, []):
            if area.get('preso'):
                continue
            n = normalizza(area['nome'])
            if not base or not n:
                continue
            uguale = n == base
            contenuto = base in n or n in base
            if not (uguale or contenuto):
                continue
            romano = numero_romano(area['nome'])
            if parte and romano and parte != romano:
                continue
            if parte and not romano and any(numero_romano(a['nome']) for a in aree_per_dungeon[dungeon]
                                            if normalizza(a['nome']).startswith(base)):
                continue
            candidati.append((0 if uguale else 1, len(n), area))
        if candidati:
            candidati.sort(key=lambda c: (c[0], c[1]))
            area = candidati[0][2]
            area['preso'] = True
            luogo['entita'] = dict(tipo='area', chiave=area['chiave'])
            luogo['abbinamento'] = 'nome-uguale' if candidati[0][0] == 0 else 'nome-contenuto'
        esiti.append(luogo['abbinamento'])
    return collections.Counter(esiti)


def costruisci(out, seed):
    catalogo = json.loads((out/'atlante-identita.json').read_text(encoding='utf8'))
    dungeon = json.loads((seed/'dungeon.json').read_text(encoding='utf8'))
    aree_per_dungeon = {d['chiave']: [dict(chiave=a['chiave'], nome=a['nome'], ordine=a['ordine'])
                                      for a in d.get('aree', [])] for d in dungeon}
    metadati = json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    campo_di_texpack = {}
    for f in metadati['fields']:
        campo_di_texpack.setdefault(f['texpack'], f['id'])
    immagini = {r['chiave']: r for r in catalogo['immagini']}
    luoghi = catalogo['luoghi']
    sconosciuti = {l['gruppo'] for l in luoghi} - set(GENITORE)
    if sconosciuti:
        raise ValueError(f'Gruppi nativi senza genitore dichiarato: {sorted(sconosciuti)}')
    abbinamenti = abbina_aree(luoghi, aree_per_dungeon)

    mappe, ordine_per_genitore = [], collections.Counter()
    for luogo in luoghi:
        nome = luogo.get('nomeDistintivo') or luogo['nome'] or segnaposto(luogo)
        genitore = GENITORE[luogo['gruppo']]
        tipo = 'luogo' if luogo['gruppo'] in RADICI else ('area' if genitore and genitore.startswith('dungeon-') else 'luogo')
        etichette = {v['chiave']: v for v in luogo.get('descrizioneVersioni', [])}
        ordine_luogo = ordine_per_genitore[genitore]
        ordine_per_genitore[genitore] += 1
        # la versione più estesa porta il nome del luogo; le altre lo qualificano con ciò che mostrano
        principale = next((v['chiave'] for v in luogo.get('descrizioneVersioni', [])
                           if v['etichetta'] == 'planimetria completa'), luogo['versioni'][0])
        for posto, chiave in enumerate(luogo['versioni']):
            im = immagini[chiave]
            e = etichette.get(chiave) or {}
            voce = dict(
                chiave=chiave, nome=nome if chiave == principale else f"{nome} — {e['etichetta']}",
                tipo=tipo, genitore=genitore,
                ordine=ordine_luogo*100 + posto, immagine=None, asset=im['asset'],
                ruoloImmagine='planimetria-nativa',
                larghezza=im['larghezza'], altezza=im['altezza'],
                entita=luogo['entita'] if chiave == principale else None,
                note=nota(luogo, im, e or None), spilli=[])
            if len(luogo['versioni']) > 1:
                voce['gruppoImmagini'] = dict(id=luogo['chiaveLuogo'], nome=nome, ordine=posto,
                                              etichetta=e.get('etichetta') or f'versione {posto+1}')
            # lo stesso contesto elencato due volte resta un contesto solo
            distinti, visti = [], set()
            for c in im['contesti']:
                firma = (c['gruppoTexpack'], c['texelem'], c['areaIndice'])
                if firma in visti:
                    continue
                visti.add(firma)
                distinti.append(c)
            if len(distinti) > 1:
                voce['contesti'] = [dict(id=f"texpack-{c['gruppoTexpack']}-elemento-{c['texelem']}",
                                         nome=c['areaTesto'] if c['areaTesto'] not in (None, '???', 'NULL') else None,
                                         campo=campo_di_texpack.get(c['gruppoTexpack'], f"texpack-{c['gruppoTexpack']}"),
                                         texpack=c['gruppoTexpack'])
                                    for c in distinti]
            mappe.append(voce)
    return catalogo, luoghi, mappe, abbinamenti, aree_per_dungeon


# Testo da mostrare per cio' che il gioco non nomina. Non e' un nome del gioco e il catalogo non
# lo contiene: dice al lettore che cosa sta guardando, invece di far passare un'etichetta tecnica.
SEGNAPOSTO = {
    'struttura-ricorrente-dei-memento': 'Strutture che i Memento riusano',
    'nessun-campo-la-usa': 'Immagini native che nessun campo usa',
    'nessuna-tabella-nativa-la-nomina': 'Zona che nessuna tabella nativa nomina',
}


def segnaposto(luogo):
    testo = SEGNAPOSTO[luogo['motivoSenzaNome']]
    return f"{luogo['gruppo']} — {testo}" if luogo['gruppo'] and luogo['gruppo'] not in testo else testo


def nota(luogo, immagine, etichetta):
    parti = []
    if luogo['statoNome'] == 'senza-nome-nativo':
        parti.append({'struttura-ricorrente-dei-memento':
                      'Struttura che i Memento riusano nelle aree generate: non è un piano fisso.',
                      'nessun-campo-la-usa': 'Risorsa grafica nativa che nessun campo del gioco usa.',
                      'nessuna-tabella-nativa-la-nomina':
                      'Nessuna tabella nativa dà un nome a questa zona.'}[luogo['motivoSenzaNome']])
    if luogo.get('fonteDistinzione'):
        f = luogo['fonteDistinzione']
        parti.append('Zona omonima distinta ' + ('dai luoghi a cui è collegata.' if f['fonte'] == 'vicini-nel-grafo'
                                                 else 'dall’ordine in cui la storia la attraversa.'))
    if etichetta and etichetta.get('relazione') != 'la più estesa':
        parti.append(f"Versione «{etichetta['etichetta']}» della stessa zona.")
    return ' '.join(parti)


def main(out, seed, destinazione):
    out, seed, destinazione = Path(out), Path(seed), Path(destinazione)
    catalogo, luoghi, mappe, abbinamenti, aree_per_dungeon = costruisci(out, seed)
    pacchetto = dict(versione=1, mappe=mappe)
    destinazione.write_text(json.dumps(pacchetto, ensure_ascii=False, indent=1), encoding='utf8')
    aree_spaiate = [a['nome'] for v in aree_per_dungeon.values() for a in v if not a.get('preso')]
    rapporto = dict(
        pacchetto=destinazione.name, mappe=len(mappe), luoghi=len(luoghi),
        copieEscluse=sum(len(l['copie']) for l in luoghi),
        conGruppoImmagini=sum('gruppoImmagini' in m for m in mappe),
        conContesti=sum('contesti' in m for m in mappe),
        conEntita=sum(1 for m in mappe if m['entita']),
        abbinamentoAree=dict(abbinamenti),
        areeGuidaSenzaPlanimetria=len(aree_spaiate),
        perGenitore=dict(collections.Counter(m['genitore'] for m in mappe)))
    print(json.dumps(rapporto, ensure_ascii=False, indent=1))
    (out/'pacchetto-seed-rapporto.json').write_text(
        json.dumps(dict(rapporto, areeSpaiate=sorted(aree_spaiate)), ensure_ascii=False, indent=2), encoding='utf8')
    return rapporto


if __name__ == '__main__':
    main(*sys.argv[1:4])
