import json
from pathlib import Path
import sqlite3
root=Path(__file__).resolve().parent
db=sqlite3.connect((root/'runtime-atlante/project-p5r.db').as_uri()+'?mode=ro',uri=True)
result=dict(schema=db.execute('pragma user_version').fetchone()[0],
    foreignKeyViolations=db.execute('pragma foreign_key_check').fetchall(),
    nativeMaps=db.execute("SELECT count(*) FROM mappa WHERE chiave LIKE 'nativo-rmap-%'").fetchone()[0])
assert result==dict(schema=40,foreignKeyViolations=[],nativeMaps=301)
(root.parent/'outputs/mappe-p5r/app-integration/verifica-migrazione-arrivi.json').write_text(json.dumps(result,indent=2),encoding='utf8')
print(json.dumps(result))
