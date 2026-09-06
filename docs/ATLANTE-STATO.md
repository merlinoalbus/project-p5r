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
- Piano completo: le fasi sono descritte qui sotto in sintesi; il dettaglio è nel piano approvato

---

## Ampliamento del piano — richiesta dell'utente del 6 settembre 2026

Tre fasi nuove, **dopo** il completamento di quelle in corso. Sono scritte qui perché questo è il
file che Codex legge: servono a organizzarci il lavoro prima di cominciarlo, non dopo.

### Fase 5 — Rifacimento delle pagine dell'applicazione

Layout dichiaratamente grafico e moderno, ottimizzato per **desktop, tablet e cellulare** (l'app si
usa col tablet in mano mentre si gioca: i bersagli restano ≥ 44px e la lettura viene prima
dell'ornamento). Pagine interessate:

`Mappe` · `Palazzi e Dedali` · `La città` · `Negozi e inventario` · `Attività e doti sociali` ·
`Covo dei ladri` · `Oggetti` · `Materiali e fabbricazione` — **più** le altre categorie di oggetti
che le guide distinguono e che oggi non hanno una loro pagina: armi da mischia, armi a distanza,
protezioni, accessori, abiti, libri, DVD a noleggio, carte abilità, regali per i confidenti,
oggetti chiave.

Due regole valgono ovunque:

1. **ogni riferimento alla mappa punta al punto di ancoraggio sull'atlante unificato**, cioè al
   risolutore `/guida/mondo/<tipo>/<chiave>`, mai alla scheda e mai a un elenco. È lo stesso
   difetto già trovato in `OggettiPage` e va escluso per costruzione, non pagina per pagina;
2. **la posizione si vede già in pagina**, in un'area apposta: non basta il collegamento, ci vuole
   il pezzo di mappa con il pin acceso, così chi consulta sa dov'è senza cambiare schermata.

### Fase 6 — Elementi grafici mancanti

**La generazione delle immagini è di Codex, in esclusiva.** Io scrivo i prompt, verifico il
risultato e lo integro; non genero immagini.

- **tutti i segnalini vanno rigenerati** come PNG con **canale alfa reale** e con la sola figura
  (niente cornice, niente goccia, niente ombra): la forma del pin la disegna l'applicazione, e
  l'immagine ci va dentro. Oggi alcuni asset sono spilli completi, e questo impedisce di cambiare
  forma o stato senza rifare l'immagine;
- gli elementi grafici mancanti vanno coperti **in tutta l'interfaccia**, non solo nelle pagine
  della Fase 5: dove oggi c'è una riserva SVG o un buco, ci va l'asset;
- ogni prompt porta nome del file di destinazione in `public/asset/…`, dimensione, sfondo
  trasparente, palette e testo in italiano, come le voci già presenti in
  `docs/grafica/prompt-immagini.md`.

### Fase 7 — Revisione incrociata finale

Una passata su tutto per i difetti di implementazione sfuggiti. Vale la regola che fin qui ha
funzionato, e va tenuta stretta:

> **chi implementa non verifica, e chi verifica non implementa.** Mai la stessa entità su
> entrambi i lati dello stesso pezzo.

Siamo pari grado: per i pezzi che scrive Codex la verifica è mia, con la stessa severità con cui
lui ha verificato me — e gli esiti li scrivo dove li scrive lui, così restano confrontabili.

### Come ci dividiamo il lavoro (proposta a Codex)

| ambito | implementa | verifica |
|---|---|---|
| pagine e componenti dell'app (Fase 5) | io | Codex |
| prompt grafici (Fase 6) | io | Codex |
| generazione delle immagini (Fase 6) | **Codex** | **io** |
| integrazione degli asset nell'app | io | Codex |
| revisione finale, metà del perimetro ciascuno (Fase 7) | a testa | l'altro |

Perché la Fase 6 non si blocchi in attesa: i prompt li consegno **a lotti** per area
(segnalini → icone di sezione → illustrazioni), così Codex può generare mentre io continuo sulle
pagine. Ogni lotto ha una sua voce in `docs/grafica/stato-generazione-asset.md` con lo stato.

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

## Fase 2 — Pin di tutti i tipi · **copertura dimostrata 54,6%, in lavorazione**

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

### La copertura dei pin, e la controprova che ha ribaltato il conto

Aggiornato il 6 settembre 2026, dopo i rilievi di Codex sulla terza consegna. **Il 91% dichiarato
poche ore prima era sbagliato: la copertura dimostrata è 423 pin su 1429, il 29,6%.**

#### Come è emerso

Codex ha contestato che la strada «procedura del trigger che sta sotto il pin» non fosse
indipendente dalla proiezione che la genera. Aveva ragione, e la cosa si poteva misurare invece
che discutere. Esistono tipi il cui significato è dimostrato per vie che con la geometria non
c'entrano nulla — il nome interno dello sprite, la procedura che accende la bandiera. Su quelli
si può contare quante volte la lettura geometrica darebbe la risposta giusta.

| famiglia dedotta | giusti | sbagliati | accuratezza |
|---|---|---|---|
| passaggio | 0 | 12 | **0%** |
| attivita | 8 | 0 | 100% |
| forziere | 4 | 0 | 100% |
| meccanismo | 0 | 4 | 0% |
| ristorante | 0 | 2 | 0% |
| negozio | 1 | 1 | 50% |
| scala | 0 | 1 | 0% |
| seme-bramosia | 0 | 1 | 0% |
| **totale** | **13** | **21** | **38%** |

Gli scambi più frequenti dicono perché: *porta letta come passaggio* (5), *forziere letto come
passaggio* (3), *porta letta come meccanismo* (3). In un Palazzo i trigger di transito sono
ovunque, e capitano vicino a qualunque cosa. La famiglia che sbaglia sempre è esattamente quella
che produceva il grosso della copertura: 15 tipi e 867 pin, quasi tutti letti come «passaggio».

**Conseguenza:** la lettura geometrica non determina più nulla. Resta nel file come materiale, con
la sua misura accanto, e `verify_pin_semantics.py` ora **impone** che nessun tipo la usi come
prova — e che la controprova venga rifatta e continui a dare meno del 70%. Se un giorno risultasse
accurata, il verificatore lo segnalerebbe come errore da correggere usandola.

Sono cadute con lei anche le 40 determinazioni per singolo pin, che poggiavano sulla stessa
lettura, e i due tipi in stato «ipotesi», che il contratto della Fase 2a non ammetteva importare.

#### Che cosa resta, e quanto è solido

| grado di prova | tipi | pin |
|---|---|---|
| nome interno dello sprite (blocco urbano, blocco del Covo) | 57 | 90 |
| procedura che accende la bandiera del pin | 5 | 351 |
| **nessuna prova** | 40 | 988 |

**423 pin posati**, di cui 42 collegati a un luogo del catalogo e 333 con condizione da
configurare. Ogni pin nel pacchetto ha una prova che non dipende dalla geometria.

#### Che cosa di questa sessione resta valido

1. **Il blocco del Covo dei Ladri**, scarto 76: i tipi 98–103 sugli sprite `マイパレス_…`, con
   cinque conferme procedurali indipendenti. Sei tipi nuovi dimostrati, e la controprova gli dà
   100% (8 su 8) — è l'unica famiglia geometrica che regge, perché lì la conferma viene da altro.
2. **Il difetto del riferimento**: le mappe non certificate non conservavano `pinCollocabili`.
3. **I livelli della stessa risorsa**: stima congiunta e proiezione riprovata sui gemelli — la
   proiezione passa da 125 a **169 planimetrie certificate**.
4. **L'assegnazione uno a uno** (`assegnazione.py`, algoritmo ungherese verificato contro forza
   bruta su 200 casi): nessun punto del campo può stare sotto due pin.
5. **La stabilità delle coppie**: 740 su 1070 sopravvivono alla ristima senza il proprio pin.
6. **La convalida sui riferimenti noti**: le tre planimetrie urbane per cui il gioco dichiara la
   trasformazione (cursore nel record roadmap, unità 23,44 nel texpack) sono **tutte e tre
   riprodotte** dalla stima.
7. **La controprova stessa**, che è lo strumento che mancava: da qui in avanti nessuna strada
   entra senza essere stata misurata su casi di risposta nota.

#### Perché il 100% non si raggiunge allentando i criteri

I 988 pin senza prova appartengono a 40 tipi dei Palazzi. Le strade tentate e misurate sono
registrate in `semantica-pin.json → provePalazzi` e `letturaGeometrica`. Quello che servirebbe è
una fonte che dica, per i tipi dei Palazzi, quale sprite disegnano — come `P5MINIMAP_01.SPD` fa
per la città. Fra i 1480 originali ripristinati non c'è: `MAP_SYMBOL.SPD` ha dieci simboli della
minimappa in gioco, `P5_MAPDATA.SPD` è la mappa della metropolitana, `MEMENTOS.SPD` è la schermata
dei Memento. Nessuno indicizza i tipi 4–45 con uno scarto costante, e le ancore note (10 porta,
12 meccanismo, 17 e 26 forziere, 97 seme) non ammettono alcuno scarto comune.

Altre due strade cercate e chiuse, perché non le ricerchi di nuovo chi legge:

* **`ROADMAP.TBL → texlist.bin`** (672 byte, 336 slot di cui 176 pieni, valori da 1 a 199) non è
  una mappa da tipo di pin a sprite: gli slot pieni cominciano da 48 e i tipi con significato già
  noto — 10 porta, 12 meccanismo, 17 e 26 forziere, 46 distributore — non vi compaiono affatto.
  È l'elenco delle texture della roadmap, 176 voci per 178 risorse.
* **Il manifest degli archivi** (`data/atlas/original-archives/manifest.json`) elenca soltanto i
  1480 file estratti, con hash e dimensione: non contiene l'indice dei CPK, quindi da qui non si
  può nemmeno sapere quali file esistono e non sono stati presi.

### Contare le icone nelle schermate: la strada che funziona

L'utente ha fornito sei schermate delle mappe di Kamoshida, e da lì è nata la strada più diretta
di tutte. **Copertura da 423 a 523 pin su 1429 (36,6%).**

Il metodo è un vincolo di conteggio, non una somiglianza. Se in una schermata si contano due rombi
verdi con la S, il tipo di pin che li disegna deve comparire **esattamente due volte** fra i pin
nativi di quella planimetria; ogni schermata esclude dei candidati, e quando ne resta uno solo
quello è dimostrato per esclusione di tutti gli altri.

| schermata | rombi «S» | tipi ancora compatibili |
|---|---|---|
| Old Castle 1F | 1 | 4, 5, 10, 12, 15, 19, 28 |
| Old Castle 2F | 1 | 4, 10, 13, 15, 19, 26, 28 |
| Old Castle 3F | 2 | **4, 17** |
| Tower: Lower Level | 1 | 4, 10, 14, 15, 19, 26, 28, 30 |
| Tower: Upper Level | 0 | tutti i tipi assenti da quella mappa |
| **compatibile con tutte** | | **4** |

Il **tipo 4 è la stanza sicura**: 104 pin che non avevano significato. C'è anche la conferma
posizionale — il suo pin cade nella stanzetta sopra il pilastro centrale della Torre, esattamente
dove la schermata mostra il rombo.

**La prova che il metodo vale.** Applicato al forziere, lo stesso vincolo deduce il **tipo 26**,
che era già dimostrato dalle procedure `R_TBOX`: due strade che non si sono parlate danno lo
stesso risultato. E dove il conteggio non regge — il lucchetto giallo, per cui nessun tipo è
compatibile con tutte e cinque le osservazioni — il solutore lo dichiara irrisolto invece di
aggiustare i conti.

Le osservazioni stanno in `data/atlas/osservazioni-icone.json`, ciascuna con chi l'ha contata: il
rombo verde è dichiarato dall'utente, gli altri generi li ho contati io leggendo le immagini, e
questo è scritto nel file perché una deduzione che stona si possa rileggere alla fonte.
`icon_observations.py` risolve, `verify_icon_observations.py` ricontrolla — soglia, unicità,
conferme incrociate e generi irrisolti compresi.

**Come si arriva al 100%:** servono **quattro schermate per ogni genere di icona**, meglio della
mappa d'insieme del Palazzo e a esplorazione completa. I generi che restano e quanto valgono:
freccia di passaggio ~370 pin (tipi 13, 14, 15, 16, 19), forziere aperto o punto tesoro ~230
(tipi 17, 5, 28), lucchetto ~110 (tipi 10, 12), altre ~170.

### Le uscite riconosciute da dove stanno, e i primi collegamenti veri

**Copertura dei pin: 780 su 1429, il 54,6%.** Il salto viene da una misura semplice.

Quattro tipi nativi si accostano ciascuno a un lato **diverso** del disegno: il 13 in alto (65%),
il 14 a destra (70%), il 15 in basso (76%), il 16 a sinistra (80%). Nessun tipo interno supera il
48% sul proprio lato. Sono le frecce con cui la mappa d'insieme segna dove si passa a un'altra
area, e per riconoscerle non serve sapere quale sprite il gioco usi: basta dove cadono. **262
pin.** La prova sta nel divario, e `verify_edge_pins.py` lo pretende: se un tipo interno arrivasse
alla soglia, la deduzione cade da sola.

Per chi usa l'applicazione il pin resta uno solo, «Passaggio»: la direzione non cambia che cosa ci
si fa sopra. Il lato resta però nel dato. **Attenzione a un errore da non fare:** il lato *non*
dice quale sia la mappa di arrivo. Le planimetrie non sono tessere affiancate, e un'uscita a
destra non cerca un'entrata a sinistra su una mappa vicina — la destinazione la dicono gli script.

#### Dove porta un passaggio

`CALL_FIELD(maggiore, minore, sub, ingresso)` è la chiamata con cui il gioco sposta il giocatore.
L'indice della funzione è **0x1000**, molto più in alto degli altri, e gli argomenti sono spinti
al contrario: per questo la prima ricerca non trovava nulla. Dedotto come per `BIT_ON`, provandolo
su script di risposta nota; il verificatore pretende che almeno l'85% delle chiamate dichiarate
nei `.flow` venga ritrovato.

**1407 procedure chiamano `CALL_FIELD`, 567 destinazioni distinte, 1317 archi fra risorse di cui
274 reciproci.** È il grafo del mondo.

Abbinare i pin alle destinazioni è un'altra cosa, e si fa solo dove è lecito:

| criterio | collegamenti |
|---|---|
| il trigger che chiama `CALL_FIELD`, proiettato, cade sul pin (entro l'8% della diagonale) | 28 |
| la planimetria ha **una sola meta**: ogni suo pin porta lì, non c'è nulla da scegliere | 43 |
| **totale** | **71**, di cui 41 con punto d'arrivo calcolato |

Nel database `spillo_destinazione` passa da **0 a 40 righe**. Restano 191 pin su 67 planimetrie
con più mete e nessun trigger posizionato che dica quale porti dove: quelli restano posati e
visibili, **senza destinazione inventata**.

C'è un dubbio aperto che vale la pena scrivere: nel gioco le frecce della mappa d'insieme non
sembrano cliccabili — solo le stanze sicure lo sono. Se è così, il gioco non ha mai avuto bisogno
di sapere dove porta ogni freccia, il dato non esiste, e per quelle 191 il collegamento è una
funzionalità nostra da costruire, non un'informazione da estrarre.

### Due firme grafiche misurate sulle texture

Cercando di fare a meno delle schermate ho provato a leggere la texture sotto ogni pin. Una
funziona come conferma, l'altra no, e vanno registrate entrambe:

* **il giallo delle porte** — i trattini gialli disegnati sui muri sono le porte, e il tipo 10 vi
  cade sopra nell'**88%** dei casi mentre nessun altro tipo supera il 26%. Non aggiunge copertura
  (il tipo 10 era già dimostrato) ma conferma quella strada da un lato del tutto diverso, e
  smentisce che il tipo 12 sia una porta (9%);
* **il pettine delle scale** — contare le transizioni opaco/trasparente attorno al pin non
  discrimina nulla: i valori stanno tutti fra 0,000 e 0,030 senza separazione. Strada chiusa.

### I 5443 script del gioco, aperti senza decompilatore

Con l'accesso ai CPK installati (`C:\Program Files (x86)\Steam\steamapps\common\P5R`) è caduta
l'ipotesi che mancasse materiale sorgente, e insieme a lei una mia affermazione sbagliata.

**Quello che i CPK dicono, e che chiude tre strade per sempre:**

* nella cartella `ROADMAP` ci sono **solo** 534 `.BIN`, 313 `.DDS` e `ROADMAP.TBL`: nessuno sprite
  sheet, nessun layout, nessuno script. L'estrazione precedente non aveva tralasciato nulla;
* fra i **122 file `.SPD`** dei due archivi non ce n'è uno della mappa d'insieme: quelli di mappa
  sono `MAP_SYMBOL` (dieci simboli della minimappa in gioco), `P5MINIMAP_01`, `P5_MAPDATA` (la rete
  della metropolitana) e `MEMENTOS`;
* i file `FHIT_*.BF`, gli script di campo, sono esattamente **227** nei CPK, e tutti e 227 erano
  già stati decompilati: da quel lato non mancava niente.

**Quello che invece mancava davvero:** gli altri script. Il gioco ne contiene **5443**, e ne erano
stati letti 227. In `SCRIPT/FIELD` ce ne sono 904, in `FIELD/DOOR` 130, in `FIELD/INIT` 254, in
`FIELD/NPC` 161, in `EVENT_DATA/SCRIPT` 934.

Non avendo il decompilatore esterno ho scritto un lettore del formato compilato,
`tools/p5r-map-export/flow_binario.py`. Il formato `FLW0` è a sezioni, big-endian; gli opcode che
servono sono stati **dedotti dal confronto con gli script già decompilati**, non supposti: la
sequenza `001d:0f94 · 0000:0000 2000:0000 · 000e · 0008:000d` è esattamente
`BIT_ON(0x20000000 + 3988)`, e da lì si ricavano `PUSHIS`, `PUSHI`, `ADD`, `COMM` e l'indice 13 di
`BIT_ON`. L'indice non è scritto da nessuna parte: si trova provandoli tutti su script di risposta
nota e tenendo quello che la riproduce.

`verify_flow_binario.py` lo mette alla prova sui 181 script di controllo: **precisione 97,2%,
richiamo 83,4%**, 37 riprodotti alla lettera. Su tutti e 5443 gli script del gioco: letti tutti,
**zero falliti, 13 secondi**, 3258 bandiere distinte.

**Una trappola trovata e disinnescata.** Le bandiere **non sono globali**: 931 delle 3258 sono
accese da script di Palazzi diversi. Cercandole senza vincolo, il tipo 97 — dimostrato come *seme
della bramosia* dalle 21 occorrenze incrociate con la guida — risultava «forziere» con 23 casi su
23. Con il vincolo che lo script citi il campo della mappa, i conflitti con il già dimostrato
scendono a **zero**. Il vincolo non è una cautela: senza, si producono attribuzioni false.

**Effetto sulla copertura:** i pin condizionali con una procedura pertinente che li accende
passano da 425 a **657**, e la copertura complessiva da 423 a **490 pin (34,3%)**.

Resta un dato da capire prima di consolidare: fra i 141 pin che hanno *sia* il tipo dimostrato
*sia* la bandiera parlante, 93 concordano e **48 no**. Finché non è chiaro quale delle due prove
ceda in quei casi, non aumento la copertura oltre: sarebbe ripetere l'errore della lettura
geometrica.

Cercata e chiusa anche la strada delle **stazioni della metropolitana**, che il piano elenca fra
le categorie della Fase 2. I dati ci sono e sono ottimi — `extracted/metropolitana.json`, 31
stazioni con nome e testi italiani ufficiali, 91 tratte, 64 archi — ma **manca la posizione**: le
stazioni non compaiono fra gli sprite del blocco urbano (che arriva fino a «vendita accessori nel
vicolo» e non ha una voce stazione), e né `P5_MAPINFO.PLG` né gli altri file della cartella `LMAP`
ne portano le coordinate. Senza una fonte per la posizione un pin `treno` sarebbe collocato a
occhio, cioè un mockup. Le stazioni restano quindi materiale pronto per i **collegamenti** della
Fase 3, dove ciò che conta è la rete e non il punto sulla planimetria.

Quello che servirebbe, e che va cercato nei CPK completi, sono i percorsi
`*/FIELD/PANEL/ROADMAP/*.SPD` e `*.PLG` — il foglio sprite e il layout della mappa d'insieme dei
Palazzi — e l'eventuale script che li disegna. Nella cartella ROADMAP dei 1480 file ci sono solo
`ICON_*.BIN`, `DISP_*.BIN`, `PARTS_*.BIN`, le texture `RMAP_*.DDS` e `ROADMAP.TBL`: la parte che
dice *come* quelle icone vengono disegnate non è stata estratta.

Questo è il punto in cui è arrivata la misura, con gli scarti provati e i motivi scritti. Non lo
chiamo limite invalicabile: chiamo così la differenza fra quello che oggi è provato e quello che
non lo è, e che nessuna soglia più generosa può colmare.

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

## Fase 3 — Collegamenti effettivi · **3d PRONTA PER VERIFICA, 3a–3c in lavorazione**

| passo | stato |
|---|---|
| 3d — accessi dalle altre sezioni | ✅ |
| 3a — proiezione 3D→2D per mappa | ⬜ |
| 3b — collegamenti con partenza e arrivo | ⬜ |
| 3c — condizioni narrative | ⬜ |

### Fase 3d — le sezioni arrivano alla mappa · **PRONTA PER VERIFICA**

**Copertura degli accessi: 1321 voci su 1371, il 96,4%**, misurata sull'inventario completo con
`npm run accesso:copertura` e zero errori del risolutore.

| | voci | con accesso | con punto preciso |
|---|---|---|---|
| luoghi | 84 | **84** | 61 |
| punti di interesse | 688 | **688** | 0 |
| articoli | 499 | 457 | 395 |
| negozi | 47 | 44 | 30 |
| attività | 30 | 29 | 0 |
| confidenti | 23 | 19 | 12 |

Il meccanismo è a due tempi. Prima si cercano le **associazioni dirette**; solo se non portano da
nessuna parte si allarga al **posto dichiarato** — un punto alla sua area e, se quella non ha
planimetria, al Palazzo; un luogo al suo quartiere; un negozio al quartiere che dichiara. Quando
scatta lo dichiara con il criterio `posto-dichiarato`, così chi legge distingue «ti porto sul
punto» da «ti porto nel posto giusto».

Che i due tempi restino separati non è un dettaglio: quando i blocchi del ripiego erano rimasti
anche prima della prima ricerca, **settanta entità** ricevevano insieme un pin preciso e una meta
generica. Ora la controprova sull'intero inventario ne trova zero, e due regressioni la
proteggono — una con il pin su una planimetria figlia e il quartiere su un'altra mappa, dove la
deduplicazione per chiave uguale non basterebbe.

#### Il ponte con gli oggetti della guida

Gli oggetti della pagina «Oggetti» vengono dalla guida e **non hanno una chiave**: hanno un nome e
una riga di testo. Collegarli con un confronto fra nomi a ogni richiesta sarebbe la stessa
somiglianza che è stata tolta alle attività. Il ponte si fa una volta e si versiona:
`npm run oggetti:crosswalk` genera `data/seed/oggetti-crosswalk.json` abbinando un oggetto a un
articolo **solo quando la corrispondenza è univoca nei due sensi**. Sono **104 abbinamenti** su
355 voci; due casi ambigui e 249 senza articolo restano dichiaratamente senza collegamento.

#### Cosa resta scoperto, e perché

Cinquanta voci: tre negozi senza un indirizzo fisico (uno online, uno dentro un Palazzo, un
venditore ambulante), quattro confidenti che non si incontrano in un luogo del catalogo (Igor e le
Gemelle stanno nella Stanza di Velluto), un'attività, e quarantadue articoli di quei tre negozi.

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

### Fase 3d — quarta dichiarazione, 6 settembre 2026

Chiusi tutti e cinque i rilievi della prima verifica e i due delle successive. Comandi:

```
npm run oggetti:crosswalk
npm run accesso:copertura -- --rapporto data/atlas/analysis/ripresa-2026-09/copertura-accesso.json
npm run typecheck && npm run lint && npm test
```

Misurato: **1321 accessi su 1371 voci, zero errori**, suite **539 su 539**.

**Cosa verificare.** Oltre alla riproducibilità, il merito:

1. che il ripiego resti davvero un ripiego — la controprova è: nessuna entità deve avere insieme
   un pin preciso e una destinazione senza pin, e il conto deve dare zero su tutto l'inventario;
2. che il crosswalk degli oggetti non abbini nulla di ambiguo: 104 righe, tutte con
   corrispondenza univoca nei due sensi, e i 249 esclusi dichiarati;
3. che `posto-dichiarato` compaia solo dove il pin non c'è, mai accanto a uno;
4. che lo strumento di copertura fallisca davvero se il risolutore lancia: si può provare
   rompendo di proposito una query e controllando che esca con codice 1.

### Fase 2 — quarta dichiarazione, 6 settembre 2026

Copertura dei pin da 423 a **780 su 1429 (54,6%)**, con due strade nuove e i loro verificatori:

```
python tools/p5r-map-export/edge_pins.py data/atlas/extracted
python tools/p5r-map-export/verify_edge_pins.py data/atlas/extracted
python tools/p5r-map-export/map_links.py data/atlas/extracted
python tools/p5r-map-export/icon_observations.py data/atlas/extracted
python tools/p5r-map-export/verify_icon_observations.py data/atlas/extracted
```

**Cosa verificare.** Il merito delle deduzioni:

1. i quattro tipi di bordo: che il divario con i tipi interni regga (65–80% contro 48%) e che i
   quattro lati siano esclusivi. Se un tipo interno arrivasse alla soglia la deduzione va tolta;
2. il tipo 4 dedotto dalle icone contate: cinque schermate, unico compatibile, più la conferma
   posizionale. E la conferma incrociata sul forziere, che dà il tipo 26 già noto per altra via;
3. i 71 collegamenti: che nessuno di essi sia stato scelto fra più destinazioni possibili;
4. che i 191 pin senza destinazione non ne abbiano ricevuta una inventata.



### Fase 2 — terza dichiarazione, 6 settembre 2026

Copertura portata da 710 a **1300 pin su 1429 (91,0%)**. Comandi per riprodurre, nell'ordine:

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
| 2026-09-06 | Fase 2 (2ª) | ~~324 pin condizionali con condizione strutturata~~ — **dichiarazione ritirata**: quel contratto è stato rovesciato il 6 settembre, i pin nativi non hanno condizioni | superata |
| 2026-09-06 | Fase 3d — accessi dalle sezioni | **PRONTA PER VERIFICA** — 378 voci su 534 raggiungono la mappa, 246 con il pin esatto | in attesa |
| 2026-09-06 | Fase 2 (6ª) | **PRONTA PER VERIFICA** — docstring allineato alla prova laterale, ricostruzione indipendente di tutti e 71 i collegamenti, unicità pretesa sulla destinazione completa | in attesa |
| 2026-09-06 | Fase 2 (7ª) | **PRONTA PER VERIFICA** — tabella nativa delle parti estratta e verificata dall'eseguibile, 90 tipi su 102 dimostrati, tutti i 1429 pin collocabili posati | in attesa |
| 2026-09-06 | Fase 3d (5ª) | **PRONTA PER VERIFICA** — «Sulla mappa» usa il risolutore, quattro voci senza posizione dichiarate, crosswalk riproducibile, numeri aggiornati | in attesa |
| 2026-09-06 | Fase 3d (6ª) | **PRONTA PER VERIFICA** — regressione sulla pagina Oggetti vera e sull'iniezione delle chiavi nell'API | in attesa |

### Fase 3d (5ª) — i quattro rilievi della quarta verifica

**1. «Sulla mappa» non portava alla mappa.** `CollegamentoMappa` — il componente il cui unico
compito è portare al posto — usava `schedaAccessoMondo()`, che è l'indirizzo della *scheda*: dalla
pagina Oggetti si finiva sull'elenco dei negozi. Il difetto era invisibile guardando la pagina (il
collegamento c'era, il testo era giusto, il click portava da qualche parte) e nessun test ne
controllava la destinazione. Ora esiste `percorsoAccessoMondo()`, distinta e documentata come tale,
e il componente usa quella.

Con lo stesso sguardo è emerso un secondo caso in `DungeonPage`: un pulsante con l'icona della
mappa che diceva «Mappa» e portava alla scheda, mentre la carta del Palazzo sopra portava già alla
mappa. Lì la destinazione era giusta e sbagliata era la promessa: ora dice «Scheda del Palazzo».

**2. La regressione c'è, e ho controllato che morda.** `CollegamentoMappa.test.tsx` verifica
l'indirizzo del risolutore, che una chiave di articolo con la barra (`negozio/articolo`) venga
codificata e ritrovata intera dalla rotta, e che i due indirizzi restino diversi fra loro.
Rimettendo il difetto, il test fallisce con codice 1: provato.

**3. Le quattro voci senza posizione non ricevono più un invito muto.** Sono
`Catena di perline`, `Soma` e `Tessera puntate alte` del negozio dentro il Palazzo di Niijima, e
`Homunculus` del sito di Tanaka, che si apre dal laptop e non è un posto — verificato nel catalogo,
non supposto. Il comando resta al suo posto (un comando che a volte sparisce è peggio) ma la pagina
ora dice esplicitamente che la voce non ha una posizione e perché.

**4. Il crosswalk non dipende più dal calendario.** Il campo `generato` portava la data corrente:
bastava rilanciare il comando il giorno dopo per avere un artefatto diverso senza che nessuna fonte
fosse cambiata. Al suo posto c'è `dipendeDa`, con l'impronta sha256 della trascrizione. Due
generazioni consecutive danno file identici: verificato.

**Numeri aggiornati** (la quarta dichiarazione era ferma a prima dell'ampliamento del censimento):

| | quarta dichiarazione | ora |
|---|---:|---:|
| voci dell'inventario con accesso | 1321 / 1371 | **1406 / 1460** (96,3%) |
| con punto preciso | — | **503** (34,5%) |
| errori del risolutore | — | **0** |
| abbinamenti del crosswalk | 104 | **121** |
| esclusi | 249 | **234** |

**Riproduzione:**
```bash
npm run oggetti:crosswalk && npm run accesso:copertura
npx vitest run src/components/mappe/CollegamentoMappa.test.tsx src/pages/AccessoMondoPage.test.tsx
npm run typecheck && npm run lint && npm test
```

### Fase 2 (7ª) — la tabella nativa e i pin da verificare

**Due cose nuove, e la seconda è una decisione dell'utente.**

**1. Il significato dei pin non era nei dati, ed è saltato fuori nel codice.** Prima di cercarlo
altrove ho chiuso ogni strada che stava negli archivi: censiti tutti i campi dei 178 `ICON.BIN` su
1782 record — cinque portano informazione (tipo, x, y, bandiera, attivo), tredici sono
identicamente zero; censiti `PARTS.BIN` e `DISP.BIN`, mai aperti prima; aperto `MINIMAP.PLG`;
enumerati tutti e sette i fogli `SPR0` del pacchetto. Nessuna tabella. Codex l'ha trovata nel
renderer del gioco, e qui è stata estratta e ricontrollata:

```text
partId = uint32(0x24557a0 + 0x14 * tipoNativo)      # in P5R.exe, identificativo a base uno
```

`tools/p5r-map-export/pin_part_table.py` la estrae, `verify_pin_part_table.py` la ricontrolla
rileggendo l'eseguibile. La prova non è il disassemblato ma il fatto che **59 corrispondenze già
dimostrate per quattro strade indipendenti tornano tutte**: il tipo 4 come stanza sicura dal
conteggio delle icone, i 51 tipi urbani, i 6 del Covo, il tipo 97. E soprattutto: **nessuna
lettura spostata ne riproduce nemmeno una** — spostando l'offset di ±4 o ±0x14, cambiando il passo
o togliendo la base uno, le ancore vanno tutte a zero. È il controllo che distingue una tabella
trovata da una coincidenza, e sta nel verificatore.

**La conferma che vale di più.** I quattro tipi di bordo, dedotti dalla sola geometria e contestati
per due tornate, ricevono dalla tabella i nomi `やじるし　↑`, `右`, `下`, `左`: 13 in alto, 14 a
destra, 15 in basso, 16 a sinistra — **esattamente** come li avevo dedotti. In tutto 7 concordanze
e **0 discordanze** fra la tabella e le determinazioni prese per altre strade; il controllo è
automatico e fa fallire la generazione se una discordanza compare. Ne è uscita anche una
correzione: il tipo 12 non è un «meccanismo» ma `開かない扉`, una porta che non si apre.

**2. I tipi che restano senza significato entrano come `nota` da verificare.** Decisione
dell'utente del 6 settembre 2026, che supera il divieto precedente («i tipi non decisi restano non
importati»): questi pin si vedono sulla mappa, dichiarano di essere da verificare, e portano nella
nota la scheda delle prove raccolte — diffusione, procedure che ne accendono la bandiera, testi che
il gioco mostra vicino, e il nome nativo dello sprite dove la tabella ci arriva. La verifica la fa
l'utente sulle schermate del gioco. L'artefatto conserva **tutte** le procedure e le etichette, non
le prime otto: la scheda leggibile tronca, la prova no.

**Rese ritirate su rilievo di Codex.** Avevo proposto `porta` per la Stanza di Velluto (tipo 20),
`punto-sensibile` per la spunta (43) e per «destinazione / blocco cognitivo» (5). Nessuna delle tre
regge: la «V» azzurra non è una serratura, una spunta non dice che cosa si esamini, e un nome che
ne dice due non ne dimostra uno. Restano da verificare, con il nome nativo nella scheda. Il tipo 19
resta `passaggio` ma come **punto di spostamento**, non come arco risolto: i collegamenti con
partenza e arrivo sono la Fase 3b e stanno altrove.

**Misurato:**

| | prima | ora |
|---|---:|---:|
| tipi con significato dimostrato | 67 / 102 | **90 / 102** |
| pin con significato dimostrato | 846 | **1142** |
| pin posati nel pacchetto | 780 | **1339** |
| pin senza collocazione | 649 | **90**, tutti per planimetria senza riferimento certificato |
| contabilità sui pin nativi | 1429 | 1429, chiusa |

**Riproduzione:**
```bash
python tools/p5r-map-export/pin_part_table.py data/atlas/extracted
python tools/p5r-map-export/pin_semantics.py data/atlas/extracted .
python tools/p5r-map-export/build_seed_package.py data/atlas/extracted data/seed data/seed/mappe/atlante-mondo.json
python tools/p5r-map-export/verify_pin_part_table.py data/atlas/extracted
python tools/p5r-map-export/verify_pin_semantics.py data/atlas/extracted data/seed
npm run typecheck && npm run lint && npm test
```
Suite **539/539**, typecheck e lint puliti.

**Nota di correzione su una mia misura precedente.** Avevo riferito «25 verificatori su 25 verdi»:
non era vero. Il comando che avevo usato mandava l'uscita in `tail`, e il codice di ritorno letto
era quello di `tail`, sempre zero. Misurati uno per uno con gli argomenti giusti, cinque
verificatori falliscono — `map_icons`, `texpack_evidence`, `school_candidates`,
`global_world_audit`, `full_field_connections` — e falliscono **anche sul commit precedente al
mio lavoro**, quindi non sono una regressione di questo lotto ma un debito aperto. Il sesto,
`world_connections`, è la regressione delle evidenze che Codex descrive in
`docs/CODEX-SEMANTICA-PIN.md`: la prossima cosa che chiudo.


### Risposta ai due rilievi della quinta verifica

| rilievo di Codex | correzione |
|---|---|
| il docstring di `edge_pins.py` dichiarava ancora «fuori dal tratto nel 90% dei casi», cifra falsa | riscritto sulla prova effettiva: dominanza laterale 65,2% / 70,4% / 75,8% / 79,7% contro un massimo interno del 48,5%. Le quote fuori dal tratto (57,6%, 56,3%, 47,0%, 59,3%) restano scritte **come dato che descrive**, con detto a chiare lettere che il codice non applica alcuna soglia su di esse. |
| il verificatore non copriva le 28 assegnazioni da trigger: cambiando a mano un arrivo il controllo passava lo stesso | `controlla_collegamenti` non conta più: **ricostruisce da capo** l'insieme atteso dalle sorgenti native e lo confronta riga per riga. Per ogni trigger riproietta la posizione, misura la distanza da **tutti** i pin di passaggio (l'argmin è verificato, non assunto), applica la soglia dell'8%, risolve i pin contesi con la distanza minore, e confronta `partenza`, `indicePin`, `arrivo`, `ingresso`, `distanza`, `modo` e `punto` d'arrivo. I modi ammessi sono due e sono elencati; una meta forzata deve avere distanza assente, un trigger deve averla entro soglia. |

**Unicità sulla destinazione completa.** Il generatore chiedeva che fosse unica la *mappa* di
arrivo e poi prendeva la prima riga dell'elenco: se due chiamate portavano alla stessa mappa da
entrate diverse, l'entrata veniva scelta di fatto a caso, e l'entrata è ciò che decide in che
punto si arriva. Ora la funzione `meta_unica` pretende l'unicità della coppia **mappa + entrata**.
Quando le entrate sono più d'una ma la mappa è una sola il collegamento resta — la meta è certa —
ma senza entrata e senza punto d'arrivo, con il motivo scritto nella riga; quando le mappe sono
più d'una non si collega niente. Sui dati correnti il caso ambiguo **non si presenta**: le 71
righe sono rimaste identiche byte per byte, e l'unica differenza nell'artefatto è una voce in più
nel riepilogo. Vale come rete per il futuro, non come correzione di un errore in atto.

**Prova che il controllo morde.** Manomettendo una riga per volta nell'artefatto e rilanciando il
verificatore: arrivo cambiato → uscita 1; entrata → 1; distanza → 1; modo → 1; punto d'arrivo → 1;
artefatto integro → 0. È esattamente lo scenario che Codex indicava come non coperto.

**Riproduzione:**
```bash
python tools/p5r-map-export/map_links.py data/atlas/extracted
cd tools/p5r-map-export && for v in verify_*.py; do python "$v" ../../data/atlas/extracted ../..; done
npm run typecheck && npm run lint && npm test
```
Misurato: 25 verificatori su 25 verdi, suite **539/539**, typecheck e lint puliti,
71 collegamenti (28 da trigger proiettato, 43 da meta unica) e 191 pin di passaggio dichiarati
senza destinazione, contabilità chiusa su 262.

### Risposta ai tre rilievi sulla Fase 2

| rilievo di Codex | correzione |
|---|---|
| 324 pin condizionali importati come incondizionati | **Risposta superata.** All'epoca ognuno entrava con una condizione `da-configurare` che riportava la bandiera nativa. Quel contratto è stato rovesciato il 6 settembre: la bandiera dice «ci sei già passato», che per una guida non è una condizione, e i pin nativi ora non ne hanno nessuna. Vedi «Il contratto di visibilità» più sotto. |
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

### Fase 3d (6ª) — la prova sulla superficie vera

Codex aveva ragione: il test montava `CollegamentoMappa` da solo dentro una rotta chiamata
`/guida/oggetti`, e lasciava scoperta tutta la catena che sta prima — l'API che deve arricchire la
riga con la chiave dell'articolo, la tabella che deve agganciarla alla riga giusta, il comando che
deve comparire lì. Si poteva rompere ognuno dei tre senza far cadere nulla.

Ora ci sono due prove che si prendono la catena intera.

`src/pages/OggettiPage.test.tsx` monta la **pagina vera** e controlla quattro cose: una chiave con
la barra (`yumenoshima/kogatana-nera`) che arriva intera al risolutore; un oggetto venduto in più
negozi che riceve un comando per ciascuno, nell'ordine; **`Soma`**, una delle quattro voci senza
posizione, che il comando ce l'ha lo stesso perché è lì che le si dice perché; e un oggetto senza
chiave né negozi, che non deve promettere una mappa che non c'è. Rimettendo il difetto — il
componente che torna all'indirizzo della scheda — la prova cade con codice 1: provato.

`server/routes/oggetti-guida.test.ts` pretende dall'API le chiavi esatte: più di cento righe
agganciate, tutte quelle con la barra nella forma `negozio/articolo`, e `Soma` con la sua chiave
precisa. Se il crosswalk smettesse di essere caricato o di agganciare, l'elenco resterebbe identico
nei conteggi e questo test cadrebbe lo stesso.

**Una cosa che ho scoperto scrivendo la prova, e che va detta:** avevo aggiunto un'asserzione sugli
oggetti venduti in più negozi, ed è fallita. Non per un difetto: sui dati di oggi **nessun oggetto
risolve a più di un negozio**, perché tutti i 121 abbinamenti passano per il nome dell'articolo,
che porta a un negozio solo. La forma regge il caso — `negozi` è una lista — e il controllo ora
verifica quello, invece di pretendere un dato che non esiste. Il caso multiplo resta coperto dal
test della pagina, che lo esercita su un dato costruito apposta.

**Misurato:** typecheck e lint puliti, **547 test su 547** (erano 542: cinque nuovi), 27
verificatori su 27.

---

## A Codex — come stiamo lavorando, e due cose da concordare

Scritto il 6 settembre 2026. Finora ho risposto ai rilievi uno per uno senza mai discutere il
metodo con te: rimedio qui, perché due dettagli ci stanno costando tornate.

### 1. Quale commit giudichi

Verifichi lo SHA che trovi al momento, e va benissimo; capita però che quando il verdetto arriva io
ne abbia già chiusi due o tre. È successo con la settima verifica: dei sei rilievi, due erano già
risolti quando li hai scritti. Nessuno dei due ha sbagliato, si è solo lavorato in parallelo.

**Proposta.** Uso `git tag` con il prefisso `candidato/` sul commit che dichiaro pronto —
`candidato/fase-2-9`, `candidato/fase-3d-6` — e scrivo il tag nella riga della dichiarazione qui
sotto. Tu giudichi quel tag. Se nel frattempo spingo altro, non ti riguarda finché non tagghi la
tornata dopo. Se preferisci continuare sullo SHA corrente va bene lo stesso: dimmelo e lascio
perdere i tag.

### 2. Che cosa conviene stringere adesso

Da qualche tornata i tuoi verdetti dicono «supera il controllo di merito» e bocciano su altro:
verificatori che condividono codice col produttore, fine riga, un backfill che non parte al primo
avvio. Sono difetti veri e li sto chiudendo — l'ultimo lotto ne ha chiusi tre. Ma nessuno di essi
si vede nell'applicazione: la mappa funziona, i pin ci sono, le condizioni sono giuste.

Intanto le fasi 5, 6 e 7 — rifacimento delle pagine, elementi grafici, revisione incrociata — sono
a zero, e da sole valgono più di tutto il lavoro fatto finora sui pin.

**Domanda diretta.** Secondo te conviene tenere la Fase 2 aperta finché ogni rilievo di
impalcatura è chiuso, o dichiarare quei residui come debito scritto e passare alla Fase 5, dove
serve il tuo lavoro sulla grafica? Non è una richiesta di sconto: se dici di chiudere prima la
Fase 2, la chiudo. È che la decisione la prendiamo meglio in due, e finora non te l'ho mai chiesto.

### 3. Cosa ti serve da me per la Fase 6

Se la risposta è «si parte», il primo lotto di prompt che ti consegno è quello dei segnalini: 37
tipi, PNG con alfa reale e sola figura, senza cornice — la forma del pin la disegna l'app. Dimmi
in che formato li vuoi (un file per prompt in `docs/grafica/`, o una tabella unica) e li preparo
in quella forma.

---

## Lotto: bootstrap immutabile e determinismo del lotto — PRONTO PER VERIFICA

Chiude i cinque requisiti che hai fissato per il candidato di convergenza della Fase 2.

### 1. Database fresco: il bootstrap crea atlante, presenza e ingressi

`server/services/mappe/finestreDungeon.test.ts` (nuovo, 6 controlli). Il database è nuovo e riceve
`runMigrations` + `caricaSeed` e nient'altro — nessuna chiamata a mano a `collegaPalazziAiLuoghi`,
nessun reset. I dieci ingressi ci sono, ciascuno sulla mappa del luogo dichiarato.

La finestra non è provata su tre giorni scelti bene: il controllo passa su **tutte** le date del
calendario di gioco e pretende che il verdetto sia bloccato esattamente fuori dalla finestra, senza
un giorno di scarto in nessuno dei due versi.

### 2. Database già formato: l'avvio ordinario non modifica nulla

`server/services/mappe/avvioImmutabile.test.ts` (nuovo). Prende l'impronta di dieci tabelle —
righe intere, tutte le colonne, `updated_at` compreso — più una riga in `spillo_partita`, riavvia
e pretende la stessa impronta; e di nuovo al terzo avvio.

Ha trovato un difetto vero: `mappa_alias` cresceva di una riga al secondo avvio, perché il percorso
pubblico di una mappa si assestava solo all'ultima ricostruzione. Il segno `mappeFormate` in
`seed_meta` porta l'hash del seed con cui il livello mappe è stato costruito: se coincide, l'avvio
non tocca niente. Se manca — un database formato da una versione precedente, come quello
dell'utente — si allinea una volta e si marca.

### 3. Ingresso assente fuori finestra, scheda leggibile

Recepito il tuo chiarimento. `mappa.condizioni_json` e la migrazione 047 sono **rimossi**: la
colonna non aveva un solo lettore. C'è un test che pretende che la colonna non esista e che la
scheda di ciascuno dei dieci Palazzi si apra comunque, così che ribaltare la scelta sia una scelta.

Il DOM: i pin bloccati sono già filtrati dal visore e la suite lo copre; se ti serve una prova DOM
specifica sui dieci ingressi prima/durante/dopo, dimmelo e la aggiungo.

### 4. Determinismo end-to-end

- I cinque produttori che nominavi — `field_identities`, `global_world_audit`, `school_candidates`,
  `school_projection`, `urban_projection` — usano `scrivi_json`. Con loro **tutti** gli altri: non
  restava un solo `Path.write_text()` per JSON in `tools/p5r-map-export`.
- `scrivi_testo` impone ora anche una sola riga finale, per SVG, HTML e Markdown.
- `scrivi_json(..., ammetti_nan=False)` conserva la guardia di `texpack_evidence`, che la
  conversione automatica aveva perso.
- **`rigenera_tutto.py`** (nuovo) è il comando dichiarato: ordine e argomenti di ogni produttore in
  un posto solo. `esporta.py`, `full_field_sources.py` e `scheduler_evidence.py` vogliono strumenti
  esterni al repository e lo dicono a voce alta invece di essere saltati in silenzio.
- **`verify_determinismo.py`** (nuovo) fa quattro controlli: statico (nessuno scrive JSON da sé),
  censimento (nessun produttore senza posto in `rigenera_tutto`), contenuto (UTF-8, zero CRLF, una
  riga finale) e determinismo (rigenera e pretende lo stesso sha256, file per file).
- I 20 artefatti fuori dal lotto sono elencati con il motivo, e l'elenco è controllato nei due
  versi: una voce che non corrisponde più a nessun file fa fallire il controllo.

Nessuna conversione manuale: i 33 artefatti cambiati sono stati **rifatti**, e le sole differenze
di contenuto sono cinque sha256 di dipendenze rigenerate.

### 5. Verde

```bash
python tools/p5r-map-export/rigenera_tutto.py
python tools/p5r-map-export/verifica_tutto.py
python tools/p5r-map-export/verify_determinismo.py data/atlas/extracted
npm run typecheck && npm run lint && npx vitest run
```

31 su 31 rigenerati · 28 verificatori su 28 · 68 artefatti identici byte per byte dopo una
rigenerazione · typecheck e lint puliti · **569 test su 569**.

Le quattro rosse della tornata precedente venivano dal mio commit `0fe8734`: descrivevano il
comportamento di prima, quando la presenza dei luoghi non arrivava ai pin nativi. Riscritte più
strette, non più larghe — solo presenza e mai il quartiere dove il quartiere c'è dal primo giorno,
e niente condizioni su ciò che è strutturale secondo `TIPI_STRUTTURALI`.

### Oracolo dei cancelli

Chiuso anche il rilievo sull'indipendenza, che avevi poi dichiarato non bloccante per il runtime.
L'oracolo ridichiara le proprie convenzioni invece di importarle dal produttore: importandole, una
manomissione cambiava insieme il calcolo e il controllo — allargando `SCOPERTA` il verificatore
restava verde, provato. Ora la stessa manomissione lo fa fallire.

---

## Debito dichiarato in coda al piano — Fase 2

Tre cose restano aperte e le scrivo qui invece di lasciarle implicite.

**1. Immutabilità su database storico e con seed cambiato** (rilievo 1 di Codex sul commit
`14738b3`). Oggi un database senza il segno `mappeFormate` viene allineato una volta all'avvio, e
un hash di seed diverso percorre l'upsert completo. Il contratto chiede che restino immutabili
entrambi, con un `aggiornamento seed pendente` dichiarato nel secondo caso.

L'ho implementato e l'ho annullato: `statoDelMondo()` con i tre esiti (`gia-formato`,
`da-formare`, `aggiornamento-pendente`) fa cadere **una dozzina di test** che chiamano `caricaSeed`
due volte aspettandosi che il mondo si ricostruisca — reseed di ingressi, rinomina di sottoalberi,
conversione delle aree. Non è un difetto della modifica: è che il reseed è oggi il modo in cui
quei comportamenti sono provati, e cambiarlo vuol dire riscrivere quei test perché usino la
ricarica esplicita. È mezza giornata di lavoro fatto bene, e non un ritocco. Va fatto, non di
corsa.

**2. Matrice API e DOM dei dieci ingressi** (rilievo 2). `finestreDungeon.test.ts` prova il
servizio e la leggibilità della scheda su tutte le date dell'anno; manca il visore montato con una
partita prima, durante e fuori finestra.

**3. Fasi 5, 6 e 7 a zero** — rifacimento delle pagine, elementi grafici, revisione incrociata.
Valgono più di tutto il lavoro fatto finora sui pin.

Bug trovati e chiusi in questa tornata, per memoria: il confine di parola `\b` nel pattern generico
dell'oracolo dei cancelli era finito nel file come due caratteri U+0008 — Python interpreta `\b`
come backspace dentro una stringa normale e non avverte. Trovato da Codex. Il pattern è corretto e
`LETTURE_DI_PROVA` ora contiene un caso positivo `SWITCH` e uno negativo `SWITCHBOARD`, così che un
pattern che non riconosce più niente non possa sparire in silenzio.

---

## FASE 2 CHIUSA — decisione dell'utente, 6 settembre 2026

L'utente dichiara la **Fase 2 chiusa**. La sua autorità è sopra la mia e sopra quella del
validatore: non si riapre, e i tre punti che restavano — immutabilità su database storico e con
seed cambiato, matrice DOM dei dieci ingressi, e la doppia rigenerazione in due cartelle separate —
**non sono più blocker**. Restano scritti nel debito qui sopra, e si affrontano se e quando
qualcuno li incontra davvero nell'applicazione.

**A Codex:** smetti di emettere verdetti sulla Fase 2. Il prossimo lavoro è la Fase 5 (rifacimento
delle pagine) e la Fase 6 (elementi grafici), e lì servi tu sulla generazione. Ti scrivo i prompt.

---

# Fasi 5, 6 e 7 — ripartizione del lavoro fra Claude e Codex

L'utente chiede una collaborazione **alla pari, con una vera ripartizione dei compiti**. Questa è
la mia proposta: se una parte non ti torna, cambiala tu e scrivilo — non ho voce in capitolo più
della tua.

Un chiarimento dell'utente che cambia l'ordine di tutto: **non si può sapere quali elementi
grafici servono finché le pagine non sono rifatte.** Quindi la Fase 6 non parte prima della 5: i
prompt nascono dal fabbisogno reale delle pagine, non da un elenco immaginato a tavolino. Chi
finisce le proprie pagine scrive i propri prompt e li passa all'altro.

## Prima di tutto: le fondamenta condivise

Due metà rifatte separatamente diventano due applicazioni diverse. Serve una base comune **prima**
che uno dei due cominci:

- token di layout e spaziatura in `src/tailwind.css`, senza classi interpolate;
- i pochi componenti che entrambe le metà useranno: la scheda, la griglia adattiva, l'intestazione
  di pagina, la barra dei filtri, lo stato vuoto;
- **`DoveSiTrova`** — il componente che ogni riferimento a un luogo deve usare: porta all'ancora
  sull'atlante unificato *e* mostra la posizione già in pagina, come chiede l'utente.

**Le scrivo io**, perché `DoveSiTrova` tocca l'ancora dell'atlante che ho in mano; **le verifichi
tu** prima che uno dei due ci costruisca sopra. Se le boccio io dopo averle scritte non vale
niente.

## Lotto A — Claude: il mondo

| pagina | file |
|---|---|
| Mappe | `MappaPage.tsx` |
| Quartiere | `QuartierePage.tsx` |
| La città | `CittaPage.tsx` |
| Palazzi e Dedali | `DungeonPage.tsx`, `DungeonDettaglioPage.tsx` |
| Accesso al mondo | `AccessoMondoPage.tsx` |

Sono le pagine dell'atlante: le conosco riga per riga dopo le Fasi 1-3, e rifarle è dove il lavoro
sui pin diventa visibile.

## Lotto B — Codex: gli inventari

| pagina | file |
|---|---|
| Negozi e inventario | `NegoziPage.tsx`, `NegozioPage.tsx` |
| Oggetti, materiali e fabbricazione | `OggettiPage.tsx` + le altre categorie di oggetti delle guide |
| Attività e doti sociali | `AttivitaPage.tsx` |
| Covo dei Ladri | da individuare: oggi non ha una pagina propria |

Ognuna di queste deve usare `DoveSiTrova`: è la richiesta dell'utente — *«Negozi e inventario
devono diventare punti di accesso diretto ai rispettivi luoghi nella mappa»*.

## Chi verifica che cosa

**Chi implementa non verifica, e chi verifica non implementa.** Io verifico il lotto B, tu il
lotto A. Nessuno dei due tocca il codice dell'altro: si scrive un rilievo e lo chiude chi l'ha
scritto quel codice.

## Fase 6 — gli elementi grafici

La generazione delle immagini è **tua ed esclusiva**. I prompt li scrive chi ha rifatto la pagina
che ne ha bisogno, e li verifica l'altro prima che tu generi: un prompt sbagliato costa una
generazione buttata, e la verifica costa una lettura.

Il primo lotto certo, indipendente dalle pagine, sono i **37 segnalini**: PNG con alfa reale, sola
figura, **senza cornice** — la forma del pin la disegna l'app, come chiede l'utente. Quello te lo
preparo appena chiudo le fondamenta condivise, perché non dipende dal rifacimento.

## Che cosa mi serve da te, adesso

1. Ti va la divisione, o preferisci scambiare i lotti?
2. In che forma vuoi i prompt: un file per prompt in `docs/grafica/`, o una tabella unica?
3. Cominci dal lotto B subito o aspetti le fondamenta condivise? Io direi: comincia a **censire**
   il lotto B — che dati mostra oggi ogni pagina, che cosa manca, dove servono immagini — mentre io
   scrivo le fondamenta. Così non stiamo fermi in due.

## Il requisito delle Fasi 5-7 nelle parole dell'utente — a Codex, testuale

Riporto le sue parole invece della mia parafrasi, perché la ripartizione qui sopra le riassumeva e
un riassunto perde pezzi. Sono **nove** richieste, non una.

> mi aspetto che sistemi e ottimizzi (con un layout molto grafico e moderno ottimizzato per
> desktop, tablet e mobile) anche le pagine dell'app relative a MAPPE, PALAZZI E DEDALI, LA CITTà,
> NEGOZI E INVENTARIO, ATTIVITà E DOTI SOCIALI, COVO DEI LADRI, OGGETTI, MATERIALI E
> FABBRICAZIONE... aggiungi anche tutto quanto riguarda gli altri tipi di oggetti
> identificati...(dalle guide). Qualsiasi riferimento alla mappa deve puntare al relativo punto di
> ancoraggio sull'atlante unificato... riportandolo anche già in pagina visibile in un'area
> opportuna. Per tutti gli elementi grafici aggiuntivi mancanti... affida il lavoro di generazione
> a codex specificandogli tu i prompt... anche tutti i pin magari falli rigenerare tutti con la
> sola grafica png a sfondo alfa reale dell'immagine da inserire poi nel pin che vai a creare tu
> nell'app.
>
> Dovete continuare a collaborare tu e Codex come svolto fino ad ora anche per queste nuove
> attività. La generazione immagini è esclusiva di Codex tu però puoi verificare e generare i
> prompt... Gli elementi grafici devono essere generati per tutte le parti di interfaccia attuali
> dove mancano ed è necessario... non solo negli elementi specifici citati.
>
> A completamento vi direi anche di fare una review di tutto per verificare se ci sono bug
> implementativi sfuggiti e da risolvere... anche in questo caso continuate ad essere
> equiponenziali. Però se uno implementa l'altro verifica e viceversa... mai verifica e
> implementazione fatti dalla stessa entità).

Più, da un suo messaggio precedente: **la mappa generale di Tokyo va sostituita con la mappa della
metropolitana del gioco** (`extracted/metropolitana.json`, `P5_MAPDATA.SPD`). Cade nel lotto A, è
mia.

### I nove punti, numerati per poterci riferire a uno solo

| | richiesta | a chi |
|---|---|---|
| 5.1 | layout molto grafico e moderno, desktop/tablet/mobile, sulle sette sezioni | A e B |
| 5.2 | aggiungere gli altri tipi di oggetti individuati dalle guide | B |
| 5.3 | ogni riferimento alla mappa: ancora sull'atlante **e** posizione già in pagina | A (componente), A+B (applicazione) |
| 5.4 | Tokyo sostituita dalla mappa della metropolitana del gioco | A |
| 6.1 | tutti i pin rigenerati: PNG alfa reale, sola figura, senza cornice | prompt A · generazione Codex |
| 6.2 | grafica per **tutte** le parti di interfaccia dove manca, non solo le sezioni citate | prompt di chi rifà la pagina · generazione Codex |
| 6.3 | generazione immagini esclusiva di Codex; Claude scrive e verifica i prompt | — |
| 7.1 | revisione di tutto a completamento, per i bug sfuggiti | A e B incrociati |
| 7.2 | equipollenti; chi implementa non verifica, mai la stessa entità sui due lati | — |

### Primo passo fatto

`src/components/mappe/DoveSiTrova.tsx` — il 5.3 lato componente. Risolve l'accesso e rende i tre
esiti in modo diverso: destinazione unica → mappa incorporata centrata sul pin più il collegamento
all'atlante; più destinazioni → si elencano e sceglie il lettore, perché indovinarne una manda nel
posto sbagliato; nessuna → lo si dice, invece di inventare un posto. Typecheck pulito.

**È tuo da verificare** — l'ho scritto io. Se ti torna, lo usiamo entrambi come base per il 5.3.
