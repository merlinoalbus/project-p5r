import json
from pathlib import Path
src=Path('work/base-map-assets/atlante-base.json')
package=json.loads(src.read_text(encoding='utf-8'))
patches=json.loads(Path('work/parallel-cleanup/contesti-base.json').read_text(encoding='utf-8'))['mappe']
bykey={m['chiave']:m for m in package['mappe']}
merges={'nativo-archivio-001':'citta-shibuya','nativo-archivio-002':'citta-shujin-academy',**{f'nativo-archivio-{i}':'dungeon-mementos' for i in (190,192,195)}}
updates={
 'nativo-archivio-010':dict(nome='Chiesa di Kanda',tipo='luogo',genitore='citta-kanda-jinbocho',entita={'tipo':'luogo','chiave':'kanda-jinbocho/chiesa-kanda'}),
 'nativo-archivio-011':dict(nome='Aoyama-Itchome',tipo='quartiere',genitore='tokyo'),
 'nativo-archivio-012':dict(nome='Seaside Park',tipo='luogo',genitore='citta-odaiba'),
 'nativo-archivio-022':dict(nome='Covo dei Ladri',tipo='luogo',genitore=None),
 'nativo-archivio-160':dict(nome='Mondo del clifoto',tipo='generica',genitore='dungeon-iweleth'),
 'nativo-archivio-161':dict(nome='Profondità dei Memento',tipo='generica',genitore='dungeon-iweleth'),
}
for key,value in updates.items():bykey[key].update(value)
bykey['nativo-rmap-011-4-0']['genitore']='nativo-archivio-011'
bykey['nativo-rmap-011-6-0']['genitore']='citta-yongen-jaya'
for p in patches:
 row=bykey[p['chiave']];row.update(p)
 if p.get('contesti'):row['nome']=' / '.join(dict.fromkeys(c['nome'] for c in p['contesti']))
 elif p.get('gruppoImmagini'):row['nome']=p['gruppoImmagini']['nome']
for row in bykey.values():
 row['genitore']=merges.get(row['genitore'],row['genitore'])
 row['note']=''
package['mappe']=[m for m in bykey.values() if m['chiave'] not in merges]
assert sum(bool(m.get('asset')) for m in package['mappe'])==301
assert sum(bool(m.get('contesti')) for m in package['mappe'])==19
assert sum(bool(m.get('gruppoImmagini')) for m in package['mappe'])==5
Path('work/base-map-assets/atlante-organizzato.json').write_text(json.dumps(package,ensure_ascii=False,indent=2),encoding='utf-8')
Path('work/base-map-assets/piano-organizzazione.json').write_text(json.dumps({'merges':merges,'updates':updates,'presentationPatches':patches},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'nodes':len(package['mappe']),'images':301,'contextResources':19,'groupedImages':5}))
