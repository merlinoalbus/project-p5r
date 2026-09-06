# Stato del lavoro — Atlante del mondo P5R

File di avanzamento tenuto da Claude. Sostituisce `ATLANTE-CONSEGNA.md` come punto di ripresa:
la consegna resta come fotografia del 6 settembre 2026, questo file dice **dove siamo adesso**.

**Verifiche finali:** a carico di Codex, che risponde in `docs/ESITOVERIFICHE.md` (stessa cartella).
Quando dichiaro una fase **PRONTA PER VERIFICA** Codex la revisiona e scrive lì le evidenze;
io intanto proseguo con la fase successiva e recepisco i rilievi appena arrivano.

**Canale:** il ramo `lavoro/atlante-mondo` su `github`. Faccio `git push` a ogni dichiarazione di
pronto e a ogni punto di lavoro significativo; faccio `git pull` prima di leggere
`ESITOVERIFICHE.md`. Se una dichiarazione non è stata spinta, non è arrivata.

- Worktree: `C:\Repository\project-p5r-main`, ramo `lavoro/atlante-mondo`
- App: BE 3101 / FE 5273 (`bash scripts/start-all.sh`), DB `data/project-p5r.db` (1 partita dell'utente)
- Piano completo: le 5 fasi sono descritte qui sotto in sintesi; il dettaglio è nel piano approvato

---

## Quadro di partenza (misurato il 6 settembre 2026)

| | valore |
|---|---|
| nodi mappa a runtime | 344 (308 dal seed + 36 contenitori generati all'avvio) |
| pin | 387, di cui **303 senza mappa**, e solo **5 su 3 delle 301 planimetrie native** |
| `spillo_destinazione` (punti di arrivo) | 0 righe |
| `mappa_entita` | 0 righe |
| `condizioni_json` valorizzati | 0 su 387 |
| etichette ancora tecniche | 51 |
| famiglie di omonimi | 62 famiglie / 179 nodi, 10 distinti |
| suite test | 533 PASS, 1 FAIL |

Decisioni dell'utente che governano il lavoro:
1. la bozza attuale delle mappe **non va preservata**: il livello mappe si ricostruisce ex novo.
   Restano intatti partite, catalogo, Persona e i contenuti editoriali della guida;
2. i **segnalini restano quelli dell'app** (`public/asset/ui/spillo-*.png`): i segnalini gialli
   originali del gioco non si usano. Gli atlanti `ICON_*.BIN` servono solo a capire *cosa
   significa* ogni pin nativo, non a disegnarlo;
3. verifiche finali a Codex, in parallelo.

---

## Fase 0 — Sblocco delle fonti e test rosso · **PRONTA PER VERIFICA**

Obiettivo: portare in chiaro le fonti native mai usate e chiudere l'unico test rosso.

| passo | stato | esito |
|---|---|---|
| ripristino dei 1480 originali dai CPK | ✅ | `python tools/p5r-map-export/restore_originals.py` → «Originali ripristinati e verificati: 1480» in `data/atlas/extracted/originali/` (ignorati da git, rigenerabili a hash verificati) |
| correzione `server/routes/mappe-editor.test.ts:55` | ✅ | la chiave pubblica del Dedalo è `memento` (percorso derivato dal nome di seed «Memento»), non più `mementos-i-dedali` |
| `whole_map_names.py` → `extracted/nomi-mappe-ufficiali.json` | ✅ | 106 record (95 città + 11 Palazzi), **530 destinazioni ufficiali** con nome italiano |
| `dungeon_place_index.py` → `extracted/indice-luoghi-dungeon.json` | ✅ | 192 record, 159 con gruppo valido, **113 nomi distinti** per i campi `major ≥ 150` |
| `map_icons.py` → `extracted/icone-mappa.json` + `extracted/icone-mappa/` | ✅ | 193 sprite con nome interno, **144 PNG ritagliati**, 1429 pin censiti, **51 tipi nativi urbani dimostrati** |
| `subway_network.py` → `extracted/metropolitana.json` | ✅ | 31 stazioni valide, 91 tratte, 64 archi distinti, matrice tariffe 33×36 |

### Verifiche eseguite

| comando | esito |
|---|---|
| `python tools/p5r-map-export/verify_whole_map_names.py data/atlas/extracted` | OK — 106 record e 2014 voci ricontrollati byte per byte |
| `python tools/p5r-map-export/verify_dungeon_place_index.py data/atlas/extracted` | OK — 192 record ricontrollati sui titoli nativi |
| `python tools/p5r-map-export/verify_map_icons.py data/atlas/extracted` | OK — 193 sprite, 144 PNG ricalcolati pixel per pixel, 1429 pin ricontati |
| `python tools/p5r-map-export/verify_subway_network.py data/atlas/extracted` | OK — 31 stazioni, 91 tratte, 33 righe di tariffa |
| `npm test` | **534 PASS su 534** (era 533/534) — 132 file |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |

### Scoperte che cambiano il seguito del lavoro

**1. La tabella ufficiale delle destinazioni esiste ed è in italiano.**
`FLDWHOLEMAPTABLE.FTD` / `FLDWHOLEMAPTABLEDNG.FTD` sono il menu di viaggio della mappa
d'insieme: per ogni luogo di partenza, il titolo e fino a 19 destinazioni con il nome che il
gioco mostra al giocatore. Esempi reali estratti:

- *Stazione di Shibuya* → Piazza della stazione, Central Street, Sottopasso, Centro comm.
  sotterraneo, Tornello della linea Ginza, Negozio softair, Stanza di Velluto, Sala giochi,
  Big Bang Burger, Diner, Beef Bowl Shop, Convenience store, Cinema, Palestra, Fioraio
- *Cancello del castello* (Palazzo di Kamoshida) → Safe Room precedente, Prigione sotterranea,
  Edificio ovest 1P, Sala centrale 2P, **Edificio est 3P**, **Edificio est, dépendance**,
  **Torre centrale**, Sala del trono

Le tre voci in grassetto sono esattamente i nomi che `kamoshida-nomi-campi.json` proponeva senza
prova: ora la prova c'è. Questa tabella è la sorgente autorevole per la **Fase 1** (nomi) e per
la **Fase 3** (collegamenti), e supera per qualità sia i titoli texpack sia gli indici FTD.

**2. La semantica dei pin urbani è risolta, con prova incrociata.**
`ICON_*.BIN` non è un atlante di immagini ma la **tabella di piazzamento** dei pin (72 byte per
record). Le icone stanno in `P5MINIMAP_01.SPD`, foglio `SPR0` di 193 sprite, ognuno con il
**nome interno in Shift-JIS**. La corrispondenza è `sprite = tipoNativo + 68` per il blocco
urbano 46-96, dimostrata perché i negozi che ne risultano coincidono, mappa per mappa, con le
destinazioni della tabella ufficiale:

| mappa | tipi nativi | icone risultanti | riscontro nella tabella ufficiale |
|---|---|---|---|
| Yongen-Jaya (`009_2`) | 82-87 | bagno pubblico, Leblanc, lavanderia, gabbie di battuta, usato, clinica | Bagno pubblico, Café Leblanc, Lavanderia automatica, Gabbie di battuta, Clinica |
| Shibuya Central St. (`001_3`) | 51-62 | libreria, DVD, ristorante, beef bowl, softair, sala giochi, minimarket, palestra, Big Bang Burger, farmacia, Don Quijote, cinema | Negozio softair, Sala giochi, Big Bang Burger, Diner, Beef Bowl Shop, Convenience store, Cinema, Palestra |
| Akihabara (`007_1`) | 76-81 | retrogaming, maid café, gachapon, elettronica, gadget, ferramenta | — |
| Kichijoji (`005_1`) | 88-95 | cartoleria, usato, tempio, jazz club, pietre, freccette, incensi, fritti | — |

Sono **51 tipi nativi su 102**, cioè tutti i pin urbani. I 38 tipi usati nei Palazzi restano
**deliberatamente senza significato assegnato**: si risolvono in Fase 2 incrociandoli con le
etichette dei trigger, non per somiglianza. I 144 PNG ritagliati stanno in
`data/atlas/extracted/icone-mappa/` come materiale di riconoscimento — **non sono asset
dell'app**, che continua a disegnare i propri segnalini.

**3. La rete della metropolitana è completa.** 31 stazioni con nome, descrizione e curiosità in
italiano, 91 tratte dichiarate (64 archi distinti) e la matrice delle tariffe. È la base dei pin
`treno` e dei collegamenti di rete della Fase 3.

---

## Fase 1 — Organizzazione dell'atlante · ⬜ da iniziare

Nomi corretti, gerarchia completa, deduplicazione secondo il record nativo di presentazione
(`texpack` + `texelem` + indice titolo + offset), non secondo il titolo. Pacchetto seed
autosufficiente, migrazione per il ruolo dell'immagine, reset e ricarica dei soli dati mappe,
indice a schede con presentazione uniforme degli omonimi.

## Fase 2 — Pin di tutti i tipi · ⬜ da iniziare

Semantica certificata degli ID icona nativi, certificazione del riferimento pin↔planimetria,
import dei pin per tutte le categorie richieste (negozi, confidenti, attività, oggetti, passaggi,
stazioni, rampino, scorciatoie, salvataggio).

## Fase 3 — Collegamenti effettivi · ⬜ da iniziare

Proiezione 3D→2D certificata per mappa, collegamenti con partenza e arrivo precisi, condizioni
narrative da giorno/momento/meteo, accessi dalle altre sezioni dell'app.

## Fase 4 — Specifica grafica per Codex · ⬜ da iniziare

Prompt per i soli asset che risultano davvero mancanti dopo le fasi 1-3, nello stile degli
esistenti, in `docs/grafica/prompt-immagini.md` e `docs/grafica/stato-generazione-asset.md`.

---

## Registro delle dichiarazioni di pronto

| data | fase | dichiarazione | esito Codex |
|---|---|---|---|
| 2026-09-06 | Fase 0 | fonti native in chiaro, 4 estrattori con 4 verificatori indipendenti, suite 534/534 | **PASS** |
| 2026-09-06 | Fase 1a | **PRONTA PER VERIFICA** — catalogo di identità delle 301 planimetrie: 149 luoghi, nomi con la fonte, copie/versioni/omonimi distinti | in attesa |

### Cosa verificare nella Fase 1a

Riguarda **solo** `tools/p5r-map-export/atlas_identity.py` e `data/atlas/extracted/atlante-identita.json`.
Il resto della Fase 1 (pacchetto seed, ricarica, interfaccia) non è ancora dichiarato pronto.

1. `python tools/p5r-map-export/atlas_identity.py data/atlas/extracted` rigenera il catalogo in
   modo riproducibile, e `python tools/p5r-map-export/verify_atlas_identity.py data/atlas/extracted`
   passa sia sul file rigenerato sia su quello versionato.
2. Il merito delle tre distinzioni:
   - le **4 copie** dichiarate hanno davvero gli stessi pixel di un'altra immagine dello stesso
     luogo, e nessun'altra coppia pixel-identica è stata fusa (in particolare *Vuoto cavernoso*
     e i gruppi di Shido, che hanno elementi di texture distinti, restano separati);
   - le **versioni** di ogni luogo hanno pixel diversi fra loro e un'etichetta univoca dentro il
     luogo; le etichette geometriche corrispondono a ciò che le immagini mostrano davvero;
   - gli **omonimi** restano luoghi separati e ricevono un nome distintivo diverso; dove la
     distinzione viene dai vicini nel grafo, quei vicini esistono davvero.
3. Che nessun nome sia inventato: ogni nome ha una fonte fra titolo d'area del record texpack,
   indice nativo dei luoghi, titolo roadmap o livello fratello, e nessuna etichetta è tecnica.
   Le 27 planimetrie senza nome nativo devono avere un motivo dichiarato, e le strutture
   ricorrenti dei Memento non devono essere presentate come piani fissi.

### Cosa verificare nella Fase 0

1. `python tools/p5r-map-export/restore_originals.py` deve ristampare «1480» senza modificare nulla
   (lo script rifiuta di sovrascrivere file con hash diverso).
2. I quattro estrattori rigenerano i JSON in modo riproducibile:
   `python tools/p5r-map-export/{whole_map_names,dungeon_place_index,map_icons,subway_network}.py data/atlas/extracted`.
3. I quattro `verify_*.py` corrispondenti passano su file rigenerati e su file già presenti.
4. `npm run typecheck && npm run lint && npm test` → 534/534.
5. Il merito: che la corrispondenza `tipoNativo + 68` sia davvero dimostrata e non assunta, e che
   nessun tipo dei Palazzi abbia ricevuto un significato. In `icone-mappa.json` il campo
   `associazione` deve valere `blocco-urbano-dimostrato` solo per i 51 tipi urbani.
