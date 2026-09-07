# Che cosa serve all'app e che cosa era il cantiere

Analisi del repository al 8 settembre 2026, fatta misurando l'albero corrente (`git ls-tree -r -l HEAD`)
e cercando chi usa davvero ogni cartella. Non è una proposta di cancellazione: è la distinzione fra
quello che l'app **esegue** e quello che è servito a **costruirla**, con l'indicazione di dove sta il
peso e di che cosa costa tenerlo.

**Il numero che spiega tutto: l'albero pesa 899 MB in 7243 file, e il pacchetto git 708 MB.** Chi
clona il repository scarica quello. Il codice dell'app — `src`, `server`, `shared`, `scripts`,
`vite`, `docs` — sono **meno di 5 MB**: tutto il resto sono immagini e materiale d'estrazione.

## 1. Serve all'app, sempre

| cosa | peso | perché |
|---|---:|---|
| `src/`, `server/`, `shared/`, `vite/`, `test/` | 3,5 MB | il programma |
| `scripts/*.sh` e gli script in `package.json` | < 1 MB | avvio dei server, esportazione del seed, ricarica mappe, crosswalk |
| `data/seed/` | 5,5 MB | **i dati di gioco**: è ciò che rende l'app utile a una installazione nuova |
| `data/font/`, `public/font/` | 0,2 MB | i caratteri |
| `public/asset/` | **490,6 MB** | la grafica che l'app mostra — vedi il punto 3, perché qui c'è il grosso |

`data/*.db` è generato al primo avvio e già ignorato da git, come `data/backups/`, `data/immagini/`
(3,3 GB in locale!) e `dist/`.

## 2. È stato il cantiere: serve a **rifare** l'atlante, non a usarlo

`data/atlas/` — **385,6 MB in 5058 file** — non è citato da nessuna riga di `server/`, `src/` o
`shared/`: lo usano soltanto i sette script Python in `tools/p5r-map-export/`. È il banco di lavoro
da cui sono nate le mappe, non quello che l'app apre.

| cartella | peso | a che serve |
|---|---:|---|
| `data/atlas/extracted/` | 250,9 MB | i 4854 file estratti dai `.SPD` del gioco: la materia prima |
| `data/atlas/original-archives/` | 35,5 MB | due archivi originali, per rifare l'estrazione da zero |
| `data/atlas/history/` | 32,4 MB | le versioni intermedie del pacchetto mappe |
| `data/atlas/documents/` | 25,9 MB | documenti d'analisi (nessun codice li apre) |
| `data/atlas/analysis/` | 24,7 MB | tabelle intermedie dell'analisi dei pin |
| `data/atlas/runtime-map-package.json` | 15,5 MB | il pacchetto importato una volta nel database |
| `tools/p5r-map-export/` | 11,0 MB | i programmi che hanno prodotto tutto questo |

**Che cosa ne farei.** Non cancellare: quel materiale è la prova che le mappe vengono dal gioco e non
sono state disegnate, ed è l'unico modo per rigenerarle se il pacchetto va rifatto. Ma non deve
stare nel repository dell'app: la strada pulita è **staccarlo in un repository separato**
(`project-p5r-atlante`) che contiene `data/atlas/` e `tools/`, lasciando qui solo il risultato —
`data/seed/mappe*.json` e le immagini in `public/asset/mappe/`. Il repository dell'app scende
sotto i 500 MB e chi lo clona per lavorare al codice non scarica 385 MB di sorgenti d'estrazione.

Se invece si vuole tenere tutto insieme, la cosa minima è togliere `documents/` e `analysis/`
(50,6 MB, nessun codice li apre) e `history/` (32,4 MB, versioni superate).

## 3. La grafica: 490 MB, e qui il taglio si fa senza perdere niente

| cartella | peso | file | media |
|---|---:|---:|---:|
| `public/asset/mappe/` | 176,7 MB | 504 | 350 kB |
| `public/asset/persona/` | 116,8 MB | 233 | 513 kB |
| `public/asset/arcani/` | 71,4 MB | 72 | **1015 kB** |
| `public/asset/confidenti/` | 54,6 MB | 46 | **1216 kB** |
| `public/asset/persona-gruppo/` | 15,2 MB | 27 | 577 kB |
| `public/asset/identita/` | 11,4 MB | 11 | **1060 kB** |
| `public/asset/sfondi/` | 10,4 MB | 4 | **2660 kB** |

Le carte degli Arcani sono 768×1344 e pesano un mega l'una; i ritratti dei Confidenti 768×1024. Sono
misure da stampa, non da schermo: l'app li mostra come ritratti tondi da 24-56 px negli elenchi e a
qualche centinaio di pixel nella scheda. **È lo stesso caso dei fregi**, dove la conversione a 768 px
con palette a 256 colori ha portato 10 MB a 3,3 senza differenza visibile (scarto massimo 2/255).

Applicata a questi cinque gruppi la stessa cura, il repository perde **circa 300 MB** e l'app diventa
sensibilmente più veloce sul tablet, dove ogni ritratto è una richiesta di rete. Va fatto misurando
prima e dopo, come per i decori, e con l'originale conservato altrove (o rigenerabile).

## 4. Roba che non dovrebbe stare qui

- `.codex-temp/` (9,5 MB): cartella di lavoro di un'altra sessione. **Non è tracciata** da git, ma sta
  nella copia di lavoro: si può togliere e aggiungere a `.gitignore`.
- `docs/analisi/verifica-percorso-grezza.json` (1,0 MB) e `editor-dati-grezza.json` (0,3 MB): output
  grezzo di due analisi già riassunte in `ESITOVERIFICHE.md`. Si tengono solo se si vuole poter
  rifare quel confronto senza rieseguirlo.
- `scripts/atlas-cleanup.ts`, `scripts/atlas-organization.ts`, `scripts/organization-smoke.ts`: non
  sono in `package.json` e nessuno li cita. Erano di servizio all'organizzazione dell'atlante: se
  l'atlante si stacca, se ne vanno con lui.

## 5. Documentazione: si tiene, ma va distinta

`docs/` pesa poco (meno di 2 MB senza `analisi/`) e non costa niente tenerla. Ma sono due cose
diverse messe insieme: `ARCHITETTURA`, `MAPPE`, `DECISIONI` e `riferimenti/` **servono a chi lavora
sull'app domani**; `ESITOVERIFICHE` (179 kB), `ATLANTE-STATO` (141 kB), `CODEX-SEMANTICA-PIN`
(84 kB) e `ROADMAP` (75 kB) sono **il diario di come ci siamo arrivati** — utilissimi finché il
lavoro è in corso, materiale d'archivio quando sarà finito.
