# data/seed — dataset Persona 5 Royal

Questa cartella è **versionata** e viene copiata nell'immagine Docker del backend (`Dockerfile.backend`):
al primo avvio il backend crea il DB sul volume `/data` e carica qui dentro il compendio in modo idempotente.

Pipeline (in `scripts/seed/`, comandi `npm run seed:scarica | seed:normalizza | seed:verifica`):

1. `seed:scarica` — scarica i file grezzi delle fonti ai **commit fissati** (`fonti.ts`) in `sorgenti/<fonte>/…`
   e scrive `sorgenti/manifest.json` (URL, sha256, byte, data). Idempotente (`--forza` per riscaricare).
2. `seed:normalizza` — valuta i file TS della fonte primaria in una sandbox, applica le **correzioni documentate**
   (`correzioniRoyal.json`: nomi Royal, livelli, affinità, eredità, oggetti, campi skill — ognuna con fonte),
   verifica la coerenza interna e genera i JSON qui sotto. Fallisce se una qualsiasi stringa di gioco non ha la
   traduzione italiana (`effettiIt.json`, `oggettiIt.json`, `negoziazioniIt.json`, `glossario.ts`).
3. `seed:verifica` — confronta il seed con la seconda fonte (aqiu384) e scrive `verifica-incrociata.md`;
   esce con errore se divergono dati che pilotano il motore di fusione.

| File | Contenuto |
|---|---|
| `descrizioni-persona.json` | 232 descrizioni originali in italiano (2–3 frasi) sull'origine mitologica, folcloristica, religiosa o letteraria di ogni Persona, con fonte sintetica; redatte per l'app (mai testo del gioco), senza spoiler della trama; ordine di `persona.json` |
| `persona.json` | 232 Persona: arcano, livello base, tipo di eredità, flag (speciale/rara/DLC/Confidente max), tratto, oggetti da esecuzione (normale/Allarme), 10 affinità, 5 statistiche, skill con livello di apprendimento, aree e piani di Mementos |
| `skill.json` | 525 skill: elemento, costo (SP / % HP / nessuno), effetto, fonti da esecuzione, fonte carta, negoziazione, fonte esclusiva |
| `oggetti.json` | 223 oggetti da esecuzione: categoria, vincolo d'uso, descrizione |
| `fusione.json` | 24 arcani in ordine, tabella arcana (273 coppie), 24 ricette speciali, 9 Demoni del Tesoro con modificatori per arcano, matrice di eredità 12×12, 13 set DLC |
| `confidenti.json` | i 23 Confidenti: chiave, nome, arcano |
| `doti.json` | le 5 Doti sociali con i 5 ranghi (titolo italiano, soglia di punti) |
| `traduzioni.json` | glossario italiano: arcani, elementi, affinità, tipi di eredità, statistiche, categorie/vincoli oggetti, aree Mementos, Doti sociali, note, fonti esclusive, **effetti skill (512)**, **descrizioni oggetti (223)**, **titoli di negoziazione (120)**, **fonti carta (49)** |
| `versione.json` | versione del seed, data, commit e licenze delle fonti, conteggi |
| `verifica-incrociata.md` | esito del confronto con aqiu384 per categoria, con l'elenco completo delle discrepanze |
| `sorgenti/` | file grezzi scaricati + `manifest.json` |

Le chiavi JSON sono in italiano; i valori identificativi (nomi di Persona e skill, chiavi di arcani/elementi) sono
canonici (inglese della localizzazione **Royal**) e vengono resi in italiano dall'app tramite `traduzioni.json`
(modificabile poi dalla tabella `traduzione`). Le attribuzioni di licenza sono in `NOTICE` (root del repository).
