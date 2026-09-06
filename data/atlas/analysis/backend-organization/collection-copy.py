import sqlite3
s=sqlite3.connect('file:work/runtime-atlante/project-p5r.db?mode=ro',uri=True);d=sqlite3.connect('work/backend-organization/collection-proof.db');s.backup(d);d.close();s.close()
