import hashlib
import json
from pathlib import Path
import sqlite3

root=Path(__file__).resolve().parent
db=sqlite3.connect((root/'runtime-atlante/project-p5r.db').as_uri()+'?mode=ro',uri=True)
db.row_factory=sqlite3.Row
quarters=[dict(r) for r in db.execute('SELECT chiave,nome,sblocco,sblocco_data FROM quartiere')]
pins=[dict(r) for r in db.execute("SELECT nome,tipo,riferimento_tipo,riferimento_chiave,condizioni_json FROM spillo WHERE mappa_chiave='tokyo'")]
out=root.parent/'outputs/mappe-p5r'
candidate=out/'originali/BASE/FIELD/PANEL/LMAP/ROSENZU.GMD'
report=dict(quarters=quarters,tokyoPins=pins,
    candidate=dict(file=candidate.relative_to(out).as_posix(),sha256=hashlib.sha256(candidate.read_bytes()).hexdigest(),
                   containsDDS=b'DDS ' in candidate.read_bytes(),usableBackgroundVerified=False),
    limits=['sblocco_data does not capture alternative unlocks through books, confidants or events.',
            'The candidate GMD has not been rendered or visually verified as the Tokyo background.'])
(out/'verifica-tokyo-stato-attuale.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(dict(quarters=len(quarters),dated=sum(bool(q['sblocco_data']) for q in quarters),tokyoPins=len(pins))))
