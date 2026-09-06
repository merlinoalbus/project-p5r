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

## Fase 1 — Organizzazione dell'atlante · **PRONTA PER VERIFICA**

| passo | stato | esito |
|---|---|---|
| 1a — catalogo di identità certificato | ♻️ corretta la terza volta | `atlas_identity.py` → `extracted/atlante-identita.json`: **301 planimetrie in 149 luoghi**, 274 nomi ognuno con file, offset e impronta della sua fonte, 27 senza nome nativo con il motivo, **3 copie effettive**, 5 gruppi di omonimi. `verify_atlas_identity.py` passa. |
| 1b — pacchetto seed autosufficiente | ✅ | `build_seed_package.py` → `data/seed/mappe/atlante-mondo.json`: 298 mappe, 228 con `gruppoImmagini`, 49 con contesti, **72 agganciate a un'area della guida**. Sostituisce `atlante-base.json`. |
| 1c — reset e ricostruzione dei soli dati mappe | ✅ | `reimpostaDatiMappe.ts` + `npm run mappe:ricarica`. Eseguita: 334 mappe, 268 spilli, 116 contenuti guida, **zero tabelle cambiate fuori dal livello mappe**, due esecuzioni di fila danno lo stesso stato. |
| 1d — indice a schede e presentazione | ✅ | migrazioni 043-045, etichette parlanti delle versioni, raggruppamento delle radici, conteggi aggregati sull'intero sottoalbero. Nell'app: **13 schede** invece di 18. |

### Come si distinguono le cose che prima si confondevano

**Identità.** Non il titolo, ma il record nativo di presentazione: elemento di texture più indice
del titolo d'area. Da lì le tre distinzioni richieste:

- **copia effettiva** — stessi pixel *e* stesso record di presentazione → **3 immagini**, le sole
  che escono dal pacchetto. Due immagini pixel-identiche senza record restano distinte: sono
  risorse native diverse, e il gioco riusa la stessa sagoma in luoghi diversi;
- **versione della stessa zona** — 79 luoghi ne hanno più d'una, raccolte sotto quel luogo;
- **zona omonima** — 5 gruppi, tenuti separati e distinti.

**Le versioni hanno nomi che dicono qualcosa**, misurati sui pixel e non supposti: «settore
d'ingresso», «porzione settentrionale», «planimetria completa», «inquadratura orientale»,
«variante grafica».

**I nomi hanno una fonte, una posizione e un'impronta.** In ordine: la grafia ufficiale della
mappa d'insieme (81 nomi), il titolo d'area del record texpack, l'indice nativo dei luoghi, il
titolo roadmap. I titoli composti — «Edificio principale 1P / Edificio laboratori 1P» — portano
la posizione di **ogni** pezzo. Il verificatore ricalcola l'impronta sul file e rifiuta un nome
senza offset.

**Il ruolo dell'immagine è un dato, non una deduzione** (migrazioni 043 e 044):
`planimetria-nativa`, `illustrazione-editoriale`, `emblema`, `nessuna`. Prima frontend e backend
lo deducevano in modo diverso dal percorso dell'asset, con una lista di eccezioni nel codice.

### Un difetto trovato nel database dell'utente

`mappa_presentazione` non esisteva pur essendo `user_version` oltre la 042, e l'importazione la
salta in silenzio quando non la trova: contesti e gruppi di immagini sparivano senza errore, e
l'indice mostrava le versioni di uno stesso luogo come luoghi separati. La **migrazione 045** la
crea dove manca.

### Punto arbitrato dall'utente il 6 settembre 2026

Sette luoghi omonimi non sono distinguibili né dai vicini nel grafo né dalla guida: cinque
«Corridoio della prigione» nella discesa dei Memento e due «Ufficio riciclaggio» nel Palazzo di
Kaneshiro. Per questi resta l'ordine di attraversamento, scritto nella forma **«– Parte I, II,
III»**. Altri sei prendono lo stesso schema perché **è la guida stessa a usarlo** per quelle
zone: `iweleth` ha già «Corridoio della prigione – Parte I/II/III» e «Vuoto cavernoso – Parte
I/II», e adottarlo fa sì che Mappe e Palazzi chiamino la stessa zona allo stesso modo.

Codex ha segnalato questa forma come violazione del divieto di numerare, in entrambe le
verifiche. **L'utente ha esaminato il rilievo e ha confermato la forma «Parte I, II, III»**
(messaggio del 6 settembre 2026: «confermo il tema Parte 1, 2 e 3»). Resta quindi la soluzione
adottata. Ogni caso dichiara la propria `fonteDistinzione` — `nomi-enumerati-dalla-guida` per i
sei, `ordine-di-attraversamento` per i sette — così la differenza fra le due resta leggibile.

## Fase 2 — Pin di tutti i tipi · **PRONTA PER VERIFICA**

| passo | stato | esito |
|---|---|---|
| 2b — riferimento pin↔planimetria | ✅ | `pin_reference.py`: **227 planimetrie su 301 condividono il riferimento**, 1361 pin su 1429 collocabili, 7 esclusi uno per uno, 23 mappe scartate con il motivo, 51 senza pin. `verify_pin_reference.py` passa. |
| 2a — significato dei tipi nativi | 🟡 **56 tipi su 102** | 51 dal nome interno dello sprite urbano, **5 dalle procedure degli script**: forziere, forziere raro, meccanismo, seme della bramosia, porta. `pin_semantics.py`. |
| 2c — pin nel pacchetto | 🟡 **405 pin posati** | 80 urbani e 325 nei Palazzi; **42 collegati a un luogo del catalogo**. `verify_pin_semantics.py` ricalcola le prove dagli script e passa. |

### Come il gioco dice che cos'è un pin

Per la città lo dice il **nome interno dello sprite** (blocco dimostrato, 51 tipi). Per i Palazzi
lo sprite non basta — le loro icone stanno in tratti spezzati del foglio — ma il gioco lo dice nel
proprio codice: ogni pin condizionale porta la **bandiera** che lo rivela, e negli script esiste la
procedura che quella bandiera accende. Il nome della procedura è parlante:

| tipo nativo | procedura dominante | segnalino | prova |
|---|---|---|---|
| 17 | `D#_#_#_TBOX_minimap_#` | forziere | 122 casi su 122 riconosciuti |
| 26 | `D#_#_#_R_TBOX_minimap_#` | forziere raro | 32 su 33 |
| 12 | `D#_GIM_BLUE_SWITCH#` | meccanismo | 57 su 58, e i trigger dicono «Tira leva» 47 volte |
| 97 | `D#_#_#_SEEDicon_#` | seme della bramosia | 21 su 21 — e la guida conta 21 volontà |
| 10 | porte (`CheckPasswardDoor`, `MONEY_DOOR_PROC`) | porta | 5 su 6, e i trigger dicono «Apri porta» |

Le due strade sono indipendenti e concordano dove si incontrano.

### La copertura dei pin, e che cosa la limita ancora

Aggiornato il 6 settembre 2026, dopo l'ampliamento delle prove. **1297 pin su 1429 sono posati:
il 90,8%.** Erano 710 (49,7%) alla dichiarazione precedente.

| grado di prova | tipi | pin del tipo |
|---|---|---|
| **dimostrato** — nome interno dello sprite (blocco urbano o blocco del Covo) | 57 | 90 |
| **dimostrato** — procedura che accende la bandiera del pin | 5 | 351 |
| **dimostrato** — procedura del trigger che sta sotto il pin | 15 | 867 |
| **ipotesi dichiarata** — ciò che la proiezione trova sotto il pin | 2 | 53 |
| **nessuna prova sul tipo** | 23 | 68 |

più **40 pin risolti singolarmente**, uno per uno, dove il tipo resta muto ma quel pin ha sotto di
sé un trigger che parla.

#### Che cosa ha sbloccato la copertura

Il limite dichiarato in precedenza — «servirebbe certificare la proiezione su più planimetrie,
oppure una fonte esterna» — era in buona parte **un mio difetto, non un limite dei dati**. Quattro
interventi, in ordine di peso:

1. **Le mappe non certificate non conservavano il proprio riferimento.** Il ramo che le scartava
   non salvava `pinCollocabili`, e così nessuna di loro poteva nemmeno essere provata con la
   proiezione di un livello gemello. Corretto.
2. **I livelli della stessa risorsa condividono la tela.** `ICON_<maggiore>_<minore>.BIN` divide i
   pin in sezioni con un record separatore: sono livelli grafici della *stessa* zona, quindi la
   trasformazione è per forza la stessa. Ora i loro pin si stimano **insieme** (29 planimetrie
   certificate così) e una proiezione provata su un livello si **riprova** sugli altri (20 così,
   ciascuna rimisurata sui propri pin, e accettata solo se almeno metà ci cade sopra).
3. **La procedura del trigger sotto il pin.** Con la proiezione si sa quale punto del campo sta
   sotto ogni pin. Se è un trigger, si sa quale procedura chiama, e il nome dice che cosa vi si
   fa: `DUCT_…INOUT` un condotto, `AC_GOTO_…` uno spostamento, `CheckStair_…` una scala,
   `DUNGEON_EXIT` l'uscita. Le procedure `*_minimap_*` **restano fuori dal conto**: accendono
   l'icona senza dire di che icona si tratti, e contarle gonfierebbe il risultato.
4. **La prova non deve per forza riguardare il tipo.** Un tipo con tre pin in tutto non potrà mai
   avere una dominanza statistica, e per quella strada resterebbe muto per sempre. Ma se *quel*
   pin cade su `DUNGEON_EXIT`, quel pin è un'uscita: 40 pin sono risolti così, uno per uno.

Una scoperta collaterale ha chiuso un blocco intero: lo scarto **76** porta i tipi 98–103 sugli
sprite «マイパレス_…», e cinque di quei sei tipi cadono su procedure `MyPalace_*` che dicono la
stessa identica cosa dello sprite (Maker sul creatore, Sound sulla musica, Image sulla galleria,
Daifugou sull'area giochi, Award sui premi). Cinque conferme indipendenti, nessuna smentita: sono
le voci del Covo dei Ladri.

#### Due tipi di segnalino nuovi

Dalla semantica nativa emergono due cose che nessuno dei 34 tipi esistenti esprime: la **scala**
(passaggio verticale fra livelli dello stesso luogo, che il gioco distingue) e l'**uscita** (il
punto da cui si lascia un Palazzo). Sono entrati nel registro `shared/spilli.ts` con la loro
riserva SVG; il prompt per l'asset in stile va nella Fase 4, come previsto dal piano.

#### Che cosa resta fuori, e perché

I 132 pin non posati, con il motivo per ciascuno:

| motivo | pin |
|---|---|
| la planimetria non condivide il riferimento con i suoi pin | 69 |
| il tipo nativo non ha significato e il pin non ha un trigger sotto | 41 |
| il pin è escluso singolarmente: cade lontano dal tratto della sua tela | 22 |

I 69 stanno su **23 planimetrie**, quasi tutte con uno, due o tre pin in croce; nove hanno i pin
completamente fuori dal disegno, anche con il fattore di scala che i dati stessi suggeriscono, il
che fa pensare che quei pin appartengano visivamente a un altro livello del gruppo. I 22 esclusi
singolarmente sono la stessa cosa vista da vicino: collocarli significherebbe metterli nel posto
sbagliato, che è peggio che non metterli.

Resta quindi un residuo del **9,2%**, tutto documentato pin per pin. Non lo dichiaro un limite
invalicabile: è il punto in cui è arrivata la misura, con i motivi scritti perché il prossimo
passo sappia dove guardare.

#### Il riferimento e la proiezione, in numeri

- **227 planimetrie su 250 con pin** condividono il riferimento; 1371 pin sono convertibili in
  percentuali. Le 51 planimetrie senza pin non fanno numero.
- **176 proiezioni certificate**, scarto mediano dell'1% della tela, **1178 coppie** fra pin e
  punti del campo, tutte riprodotte punto per punto da `verify_map_projection.py`.

### Che cosa è successo, e perché la Fase 2 non è tutta qui

Il riferimento fra pin e planimetria è certificato per 227 mappe su 301. La misura ha mostrato
due cose che il criterio ha recepito: **otto planimetrie hanno i pin in un'altra risoluzione**
(il fattore si cerca fra potenze di due e si accetta solo con un miglioramento netto), e **un pin
isolato fuori posto** non deve far perdere alla mappa tutti gli altri, quindi resta escluso da
solo.

Il significato dei tipi nativi è invece risolto solo per la città. Per i Palazzi ho provato tre
strade e nessuna regge:

1. **uno scarto costante sul foglio sprite** — funziona in città perché quelle icone sono
   contigue (indici 114-164), ma le icone da Palazzo stanno in tratti spezzati (22-33, 53-65,
   73-94) e nessuno scarto le raggiunge tutte;
2. **un altro foglio sprite** — gli altri fogli dell'archivio sono la mappa delle linee, i
   Memento e i bonus: nessuno contiene icone da Palazzo;
3. **la correlazione con i punti della guida** — su 65 aree, la correlazione più alta fra tipo
   nativo e tipo di punto è 0,58 e la maggioranza sta sotto 0,3: è rumore.

La via che resta è **l'etichetta del trigger che sta nello stesso punto**, e richiede la
proiezione delle coordinate 3D sulla planimetria — cioè il primo passo della Fase 3. Perciò
**i 1248 pin dei Palazzi non vengono importati adesso**: un pin senza significato è peggio di un
pin assente. Si completano subito dopo la proiezione.

### Quello che già funziona nell'app

Un negozio è ora un accesso diretto al suo punto sulla mappa. `GET /api/mappe/accesso/negozio/penguin-sniper`
risponde con una destinazione unica: *Kichijoji › Quartiere dello shopping*, spillo «Penguin
Sniper (Freccette e Biliardo)», sulla planimetria nativa del gioco. Leblanc ne dà due, il
quartiere e i Vicoli, entrambe con il pin.

## Fase 3 — Collegamenti effettivi · **accessi fatti, collegamenti da fare**

| passo | stato |
|---|---|
| 3d — accessi dalle altre sezioni | ✅ |
| 3a — proiezione 3D→2D per mappa | ⬜ |
| 3b — collegamenti con partenza e arrivo | ⬜ |
| 3c — condizioni narrative | ⬜ |

### Le sezioni arrivano allo stesso mondo

`attivita` è ora un tipo di accesso come gli altri, e il risolutore unico sa raggiungere il posto
in tre modi nuovi: un'attività passa dal quartiere che la scheda registra e, dentro quel
quartiere, dal luogo che porta il suo nome; un confidente passa dai luoghi che il catalogo elenca
per lui; un negozio, un articolo o un luogo passavano già dagli spilli.

Copertura misurata sull'intero inventario, non su un campione:

| sezione | voci | con accesso alla mappa | con il pin esatto |
|---|---|---|---|
| negozi | 47 | 30 | 30 |
| attività | 30 | 29 | 3 |
| confidenti | 23 | 12 | 12 |
| quartieri | 24 | 24 | — |
| Palazzi e Dedali | 10 | 10 | — |
| luoghi | 84 | 61 | 61 |
| aree della guida | 116 | 72 | — |
| articoli (primi 200) | 200 | 140 | 140 |
| **totale** | **534** | **378** | **246** |

Esempi verificati: Sojiro apre *Yongen-Jaya › Vicoli* sul Café Leblanc, Iwai *Shibuya › Central
Street* su Untouchable, «Gabbie di Battuta» il suo pin nei Vicoli, il Palazzo di Kamoshida la sua
mappa. Le voci senza accesso sono quelle che un posto non ce l'hanno: Morgana, la lettura in
metropolitana, i negozi ambulanti.

Nelle pagine è comparso un collegamento unico, `CollegamentoMappa`, usato da negozi, attività,
confidenti e Palazzi: la scheda dice che cos'è, la mappa dove si trova.

## Fase 4 — Specifica grafica per Codex · ⬜ da iniziare

Prompt per i soli asset che risultano davvero mancanti dopo le fasi 1-3, nello stile degli
esistenti, in `docs/grafica/prompt-immagini.md` e `docs/grafica/stato-generazione-asset.md`.

---

## Registro delle dichiarazioni di pronto

### Fase 2 — terza dichiarazione, 6 settembre 2026

Copertura portata da 710 a **1297 pin su 1429 (90,8%)**. Comandi per riprodurre, nell'ordine:

```
python tools/p5r-map-export/map_icons.py data/atlas/extracted
python tools/p5r-map-export/pin_reference.py data/atlas/extracted
python tools/p5r-map-export/map_projection.py data/atlas/extracted
python tools/p5r-map-export/pin_semantics.py data/atlas/extracted
python tools/p5r-map-export/build_seed_package.py data/atlas/extracted data/seed data/seed/mappe/atlante-mondo.json
python tools/p5r-map-export/verify_pin_reference.py data/atlas/extracted
python tools/p5r-map-export/verify_map_projection.py data/atlas/extracted
python tools/p5r-map-export/verify_pin_semantics.py data/atlas/extracted
npm run mappe:ricarica && npm run typecheck && npm run lint && npm test
```

Misurato dopo la ricarica sul database reale: 334 mappe, **1565 spilli** (erano 978), 1378 con
mappa; `fuoriDalLivelloMappe` vuoto, partita e catalogo intatti. Suite **535 su 535**, typecheck e
lint puliti.

**Cosa verificare, oltre alla riproducibilità.** Il merito delle tre estensioni:

1. che lo scarto **76** del blocco del Covo sia davvero confermato dalle procedure e non scelto
   per far tornare i conti — le cinque conferme sono nel campo `sottoIlPin.procedure` dei tipi
   98–103 di `semantica-pin.json`;
2. che la **procedura sotto il pin** non sia una prova circolare: la proiezione è stimata sui pin,
   e da lì si legge il trigger. Il verificatore ricalcola tutto dalle sorgenti, ma il giudizio su
   quanto la cosa provi va dato;
3. che l'esclusione delle procedure `*_minimap_*` dal conto sia rispettata ovunque, e che nessuna
   famiglia dichiarata in `FAMIGLIE_SOTTO` sia più larga di quanto il suo nome giustifichi;
4. che le proiezioni **ricevute da un livello gemello** reggano davvero: ciascuna deve essere
   rimisurata sui pin del livello che la riceve, con almeno la quota dichiarata di pin vicini;
5. che i due tipi nuovi (`scala`, `uscita`) siano usati solo dove la prova lo dice, e che la
   palette, la legenda e l'editor li mostrino correttamente.



| data | fase | dichiarazione | esito Codex |
|---|---|---|---|
| 2026-09-06 | Fase 0 | fonti native in chiaro, 4 estrattori con 4 verificatori indipendenti, suite 534/534 | **PASS** |
| 2026-09-06 | Fase 1a | catalogo di identità delle 301 planimetrie | **FAIL** — 5 rilievi bloccanti |
| 2026-09-06 | Fase 1a (2ª) | i cinque rilievi corretti: 3 copie, 81 nomi ufficiali, provenienza con impronta, nessuna etichetta sintetica | **FAIL** — 2 rilievi |
| 2026-09-06 | Fase 1a (3ª) | **PRONTA PER VERIFICA** — ogni nome ha ora anche l'offset, compresi i titoli composti (ogni pezzo con la sua posizione); sulla numerazione degli omonimi ha deciso l'utente | in attesa |
| 2026-09-06 | Fasi 1b, 1c, 1d | **PRONTE PER VERIFICA** — pacchetto seed unico agganciato alla guida, ricarica dei soli dati mappe, indice a schede | in attesa |
| 2026-09-06 | Fase 2 (parte urbana) | riferimento certificato, 51 tipi urbani, 80 pin posati | **2b PASS**, 2a/2c FAIL |
| 2026-09-06 | Fase 1d (2ª) | **PRONTA PER VERIFICA** — nessuna etichetta tecnica nel DOM espanso, etichetta di versione da un'unica funzione condivisa | in attesa |
| 2026-09-06 | Fase 2 (2ª) | **PRONTA PER VERIFICA** — 324 pin condizionali con condizione strutturata, artefatto semantico deterministico, contabilità chiusa su 1429 | in attesa |
| 2026-09-06 | Fase 3d — accessi dalle sezioni | **PRONTA PER VERIFICA** — 378 voci su 534 raggiungono la mappa, 246 con il pin esatto | in attesa |

### Risposta ai tre rilievi sulla Fase 2

| rilievo di Codex | correzione |
|---|---|
| 324 pin condizionali importati come incondizionati | ognuno entra ora con una **condizione strutturata** `da-configurare` che riporta la bandiera nativa; l'interfaccia la mostra e l'editor la corregge. Nel database: 324 spilli con `condizioni_json`. |
| `semantica-pin.json` non riproducibile | l'ordine non dipende più dall'iterazione degli insiemi: tutto ordinato per conteggio e poi per nome. Tre rigenerazioni di fila danno la stessa impronta. |
| contabilità che non chiude (1422 su 1429) | i 7 pin esclusi uno per uno dalla certificazione del riferimento sono ora una voce del rapporto, e il rapporto dichiara `pinNativi` e `pinContati`: **1429 = 1429**. Il verificatore lo controlla. |

### Risposta ai due rilievi sulla Fase 1d

Le 26 etichette tecniche sono sparite: le immagini che non rappresentano una zona nota si
descrivono ora per **forma della tela ed estensione del disegno** («tela alta, disegno medio»),
che sono misure. L'etichetta di versione viene da **un'unica funzione condivisa**,
`src/utils/etichettaVersione.ts`, usata da indice, albero, miniature, selettori dell'editor,
scelta della destinazione e ingresso del quartiere.

### Cosa verificare nelle Fasi 1b, 1c e 1d

1. `python tools/p5r-map-export/build_seed_package.py data/atlas/extracted data/seed data/seed/mappe/atlante-mondo.json`
   rigenera il pacchetto in modo riproducibile: 298 mappe, 149 luoghi, 3 copie escluse, 228 con
   gruppo immagini, 49 con contesti, 72 con entità della guida.
2. `npx tsx --env-file=.env scripts/ricarica-mappe.ts --dati <copia>` su una copia del database:
   - `fuoriDalLivelloMappe` deve essere vuoto — nessuna tabella fuori dall'atlante cambia;
   - due esecuzioni di fila devono dare gli stessi conteggi;
   - partite, catalogo, Persona, confidenti, negozi e contenuti della guida restano ai valori di
     partenza (il rapporto conta **tutte** le tabelle prima e dopo).
   Attenzione: `--env-file` reimposta `DATA_DIR`, quindi la cartella va passata con `--dati`,
   altrimenti il comando lavora sul database dell'utente.
3. Installazione da zero (database nuovo) e ricarica devono produrre lo stesso atlante.
4. Nell'app (`/guida/mappe`): 13 schede, il Covo dei Ladri come scheda unica con 5 versioni
   etichettate, i conteggi che sommano l'intero sottoalbero, e nessuna etichetta tecnica.
5. Che nessuna mappa dichiari un'area della guida senza avere una planimetria
   (`SELECT count(*) FROM mappa WHERE entita_tipo='area' AND ruolo_immagine='nessuna'` = 0) e che
   le 116 aree restino contenuti della guida.

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
