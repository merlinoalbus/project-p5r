import sqlite3,json
from pathlib import Path
w=Path('work/backend-organization'); src=sqlite3.connect('file:work/organization-final-copy.db?mode=ro',uri=True);dst=sqlite3.connect(w/'partial-context-proof.db');src.backup(dst);src.close();dst.close()
p={'merges':{},'updates':{},'presentationPatches':[{'chiave':'nativo-rmap-153-4-0','contesti':[{'id':'fixture-known','nome':'Ripostiglio','campo':'F153_004_00','texpack':1},{'id':'fixture-unknown','nome':None,'campo':'F153_051_00','texpack':2}]}]}
(w/'partial-context-plan.json').write_text(json.dumps(p));(w/'partial-context-atlas.json').write_text('{"mappe":[]}')
