# data/seed — dataset Persona 5 Royal

Questa cartella è **versionata** e viene copiata nell'immagine Docker del backend (`Dockerfile.backend`):
al primo avvio il backend crea il DB sul volume `/data` e carica qui dentro il compendio in modo idempotente.

Contenuto previsto (step 0.2 della roadmap, `docs/ROADMAP.md`):

| File | Contenuto |
|---|---|
| `sorgenti/` | file grezzi scaricati dalle fonti (Apache-2.0), con hash e data di download |
| `arcana.json` | 24 Arcani con nome canonico e resa italiana |
| `persona.json` | 232 Persona: livello base, arcano, tipo di eredità, affinità, statistiche, skill con livello, tratto, itemizzazione, area di Mementos |
| `skill.json` | 525 skill: elemento, costo, effetto, skill card |
| `fusione.json` | tabella arcana 24×24, ricette speciali, Demoni del Tesoro con modificatori, matrice di ereditarietà, DLC |
| `traduzioni.json` | glossario italiano (arcani, elementi, statistiche, affinità, effetti) |
| `verifica-incrociata.md` | esito del confronto con la seconda fonte (aqiu384) |
| `versione.json` | versione del seed, usata dal caricatore per gli aggiornamenti |

Le attribuzioni di licenza delle fonti sono in `NOTICE` (root del repository).
