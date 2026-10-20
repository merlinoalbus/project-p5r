# L8 «Persona e Ombre» — test funzionali

Stato: **casi preparati** (bozza di Analisi requisiti del 2026-10-20 05:47Z, rivista e completata da Test funzionali lo stesso giorno: rotte di
`modifiche.md` §4, non reclutabili 5 come G-035, F8-33…F8-36 aggiunti). Il file è di Test funzionali. Esecuzione a pezzi secondo la tabella
«Per i tester» di `piano.md`, col via del Manager.

> **Non reclutabili: 5, non 7** (`modifiche.md` §6 passo 4 e verifiche, G-035): Fango pulsante e «Maestra degli scherzi» di Kaneshiro sono
> **reclutabili** (Persona Black Ooze / High Pixie, personalità Timida / Irritabile). Per le coppie di nomi italiani della stessa Ombra vale il
> nome della guida («Maestra degli scherzi», «Straziato re dei desideri») e l'altro va in `nomi_altri_json`. F8-01 e F8-13 sono allineati.

- **Fonti**: `requisiti.md` (R8-01…R8-30, R8-07a…f, R8-08b, R8-15b, R8-19b, R8-20b/c; dubbi 1–7), `modifiche.md` (§1 modello, §1.4 negoziazione,
  §2 cattura, §3 Iweleth, §4 API, §5 interfaccia, §6 migrazioni M8 e M8b con le verifiche, §7 piano), `dati.md`, registro dell'Esperto (G-019,
  G-021 con l'allegato `guida/G-021-negoziazione.md`, G-025 con `guida/G-025-persona-del-gruppo.json`, G-026).
- **Base**: `dati-produzione/p5s-2026-10-20-0533Z`. Misure «prima» in sola lettura su una copia della base (Analisi requisiti, 07:46 ora locale). Gli attesi
  «dopo» vengono da `modifiche.md` §6 e vanno confermati da Analisi dati dopo il boot di L2–L8.
- **Partite**: p1 «Partita Roberto» (attiva, 06-02), p2 «Tutorial». Registrazioni e catture solo su una **partita di prova** creata apposta e poi
  eliminata; correzioni dei dati di gioco (Ombre, affinità, negoziazione, cestino) solo sul **Collaudo (foto e ripristino), anteprima 3302/5474**.

## Misure «prima» sulla base 0533Z (sola lettura)
| Misura | Valore |
|---|---|
| Persona del compendio | 232 |
| compendio della partita p1 / scorta p1 | 53 registrate / 7 Persona possedute |
| dedali dei Memento | 95 aree dei dedali, 827 legami `persona_area_dedalo`, 131 voci Persona nei dedali |
| voci Persona fuori dai Memento | 41, di cui 9 di Iweleth (`iweleth-02-…/5..13`) |
| voci boss | 26 (comprese le 2 nuove di Madarame dell'utente, ordine 18 e 19) |
| traduzioni degli elementi da correggere | **13** righe con «Psichico», «Oscurità», «Quasi-divino» o «Guarigione» negli ambiti `elementoAffinita`, `elementoSkill`, `colonnaEredita`, `tipoEredita` |
| negoziazione nel repository | `server/db/dati/negoziazione-domande.json`: 230 domande |
| Ombre della Battaglia | 217 (in `dati_guida.battaglia`, da `dati.md`) |

> **Numeri di G-021 da allineare in `modifiche.md` §1.4 e §6** (segnalato a Stesura): l'Esperto ha corretto i conteggi di G-021. Gli esiti diversi da
> Royal sono **86** (non 88), gli esiti mancanti **979** (non 957), le domande senza risposta buona **52** (non 55), e le **24** risposte con esiti
> contraddittori si contano a parte. I casi qui sotto usano i numeri corretti (requisiti R8-07b).

## Casi
| id | Criterio | Dove | Passi | Atteso |
|---|---|---|---|---|
| F8-01 | R8-01, R8-02 | API, sola lettura | `GET /api/compendio/ombre?dungeon=&personalita=&q=&partita=` e `GET /api/compendio/ombre/:chiave` | Ogni Ombra ha chiave, nome italiano, Persona (o «non reclutabile»: **5**, G-035), personalità, luoghi d'incontro. Le 217 Ombre della Battaglia, le 131 voci dei dedali e le voci Persona dei Palazzi sono collegate a un'Ombra o in elenco «non abbinati»; nessuna riga persa |
| F8-02 | R8-03 | Collaudo (foto e ripristino), anteprima 3302/5474 | Rinomina di un'Ombra (`PUT /api/compendio/ombre/:chiave {nome}`), «Ripristina»; eliminazione nel cestino (tipo `ombra`) e ripristino | Il nome nuovo compare in Battaglia, dedali, voci dei Palazzi e negoziazione; «Ripristina» torna al nome della guida; dal cestino l'Ombra torna con luoghi e legami alle voci; ripristino del Collaudo |
| F8-03 | R8-04 | API | Personalità di tutte le Ombre | Una delle 4 (giocosa, timida, irritabile, cupa) oppure «sconosciuta»; le 75 senza personalità di oggi la prendono dall'allegato di G-021 dove c'è |
| F8-04 | R8-05, R8-07 | Browser | Scheda di una Persona che si incontra in più posti (Battaglia, Palazzo, Memento) | «Dove si incontra» è l'unione dalla fonte unica; «Registrata nella partita» c'è |
| F8-05 | R8-06 | Browser | `/guida/ombra/<chiave>` da Battaglia, dedalo e voce di un Palazzo | Nome, Persona (piastrella con «Registrata»), debolezze, dove si incontra, personalità con «Negoziazione per <umore>» |
| F8-06 | R8-07a, R8-07b | API, sola lettura | `GET /api/compendio/negoziazione/verifica` | Per ogni umore: domande, risposte, verdetti per fonte, aggiunte, discordanze. Dopo la migrazione: le **49** domande di Royal ci sono; gli **86** esiti diversi hanno Royal come principale e quello di prima come «altra fonte»; i **979** esiti mancanti ci sono; delle **52** domande senza risposta buona ne restano solo quelle senza risposta buona anche in Royal; le **24** contraddittorie hanno tutte e due le righe; i 642 verdetti di oggi tutti presenti |
| F8-07 | R8-07c, R8-07f | Browser 375 (dati da `GET /api/compendio/negoziazione`) | Battaglia → Negoziazione: scegli l'umore «Timida», cerca una domanda per testo; poi scegli un'Ombra | Domande e risposte raggruppate per umore; verdetto leggibile per l'umore scelto, con «incerto» e la fonte; scegliendo l'Ombra si preseleziona il suo umore; dalla domanda alla risposta in al più due tocchi |
| F8-08 | R8-07d | Browser | Dalla pagina di un'Ombra «Negoziazione per <umore>»; dalla negoziazione «Ombre di questo umore» | I due collegamenti funzionano nei due versi |
| F8-09 | R8-07e (NR) | API | Confronto voce per voce della negoziazione prima e dopo | Ogni domanda, risposta, esito e nota di oggi c'è ancora (come principale o «altra fonte»); nulla tolto senza elenco approvato |
| F8-10 | R8-08 | API, sola lettura | Affinità di un'Ombra con Persona (es. Pixie) | Uguali a `persona_affinita` della Persona; nessuna copia propria |
| F8-11 | R8-08b | Browser | Le 4 eccezioni: Vendicatore sconfitto (Take-Minakata), Sole oscuro (Mithras), Orsacchiotto assassino (Bugs), Guerriero divino / Potestà (Power) | Solo gli elementi diversi sono propri: Elettricità Riflette; Nucleare Riflette; Fuoco Debole con Psicocinesi e Maledizione neutre; Arma da fuoco neutra. La scheda della Persona (Bugs, Power…) resta com'è: Power debole all'Arma da fuoco |
| F8-12 | R8-08b, R8-08 | API | Le altre 37 Ombre della Battaglia e 45 voci con debolezze diverse dal compendio | Mostrano il compendio |
| F8-13 | R8-09 | API | Le **5** non reclutabili (`reclutabile: false`, `persona: null`); in più Fango pulsante e «Maestra degli scherzi», reclutabili (G-035) | Le 5: affinità proprie, una copia sull'Ombra. Fango pulsante e «Maestra degli scherzi»: Persona Black Ooze / High Pixie, debolezze **dal compendio** della Persona, personalità Timida / Irritabile |
| F8-14 | R8-10 | Collaudo (foto e ripristino), anteprima 3302/5474 | Correzione di un'affinità nel compendio di una Persona | Cambia nell'Ombra, nel dedalo, in Battaglia; ripristino |
| F8-15 | R8-11, R8-14 | Partita di prova | Tocco di cattura di una Persona in un dedalo dei Memento (`PUT /api/partite/<prova>/compendio/:personaId`, corpo invariato, ora via `registraPersona`); poi «togli registrazione» | Registrata nel compendio della partita; il livello non si azzera se la riga c'era; tolta con la conferma di oggi, sparisce ovunque |
| F8-16 | R8-12, R8-15 | Partita di prova | Tocco sulla piastrella di una voce Persona di un Palazzo | Registra la Persona nel compendio; `punto_partita` non si scrive per quella voce; il completamento del Palazzo non cambia |
| F8-17 | R8-13 | Partita di prova | Tocco sulla carta di un'Ombra in Battaglia | Stessa registrazione |
| F8-18 | R8-14 | Partita di prova | Registrare da una vista e guardare le altre tre | «Registrata» in tutte |
| F8-19 | R8-15b | Partita di prova | Pagina di un'Ombra che si incontra solo in un Palazzo, con il Palazzo concluso | «Non più raggiungibile: il Palazzo è sparito»; «Dove si cattura ancora» elenca gli altri incontri, oppure «Solo per fusione» |
| F8-20 | R8-16 | Partita di prova | Catturare nel dedalo di Iweleth una delle 9 Persona doppie | Risulta catturata anche nell'archivio del Palazzo di Iweleth (un solo stato) |
| F8-21 | R8-17, R8-19 | Documento + API | Elenco delle 38 voci di Iweleth con tipi non ammessi nei dedali, scambio Parte III/IV, area-8 «???» | In elenco da approvare; nessuna voce persa; le 47 voci, 26 planimetrie e i 12 spilli guida restano nell'archivio |
| F8-22 | R8-18, R8-19b | API + browser | Elenco dei Palazzi, metro, `/guida/dungeon/iweleth`, condizioni «Palazzo concluso» | Iweleth non è fra i Palazzi né sulla metro; l'indirizzo porta al dedalo; nessuna condizione «Palazzo concluso» cita Iweleth |
| F8-23 | R8-20, R8-20b | API + browser | Le 27 Persona del gruppo; scheda di Ervardo, Ecate, Prometeo | 9 membri × 3 forme con i nomi della guida; arcano del membro; forme 2 e 3 legate alla 1ª (`forma_di`); affinità 1ª/2ª da G-025 e 3ª = 2ª con la nota; skill per forma; statistiche mostrate solo per la 1ª; la scheda di Ervardo dice che deriva da Loki |
| F8-24 | R8-20b | API | Motore di fusione, ricette, cicli, suggerimenti | Nessuna Persona del gruppo compare (`del_party = 1` escluse) |
| F8-25 | R8-20c | Browser + DOM, 1280/768/375 | Compendio, Battaglia, pagina Ombra, negoziazione | Nomi unici degli elementi (Psicocinesi, Maledizione, Divino, Recupero, Elettricità, Ghiaccio, Riflette); nessun «Psichico», «Oscurità», «Quasi-divino», «Guarigione», «Tuono», «Gelo», «respinge» nei testi generati. Le 13 righe di traduzione corrette |
| F8-26 | R8-20c (eccezione) | Browser | Voci del boss di Madarame scritte dall'utente (ordine 18 e 19) | «Gelo» e «respinge» restano come le ha scritte l'utente; la voce è nell'elenco «Da rivedere» con la proposta «Ghiaccio» / «riflette» |
| F8-27 | R8-22 (NR) | API | Risposta di `GET` del dungeon `mementos` prima e dopo | Identica (9 dedali, 95 aree, 827 legami, 131 voci), salvo i campi in più e Iweleth |
| F8-28 | R8-23 (NR) | API, partita 1 | Compendio e scorta di p1 | 53 registrate e 7 possedute, invariate; nessuna registrazione aggiunta senza elenco |
| F8-29 | R8-24 (NR) | API | Voci Persona/Ombra di Kamoshida (169 voci) e Madarame (227 voci); le 2 voci «persona» di Kamoshida che non sono Ombre («Parla con Morgana», «Risveglio Persona di Ryuji») | Testi, ordine, pin, posizioni invariati; le 2 voci restano com'erano |
| F8-30 | R8-25, R8-26 (NR) | Browser, partita 1 | Diario 04-01..06-01 (255 voci); scorta, fusioni, Stanza di Velluto | Invariati |
| F8-31 | R8-27 (NR) | Comandi | Typecheck, lint, test mirati di `modifiche.md` §7 | Verdi, con output grezzo |
| F8-32 | R8-28, R8-29 (controllo funzionale) | Browser 375, partita di prova | Battaglia: trova un'Ombra, guarda debolezze e registrazione; in un Palazzo, tocca la piastrella | Due tocchi; la piastrella ha lo stesso aspetto dei Memento |

| F8-33 | R8-11 (`modifiche.md` §2) | Partita di prova | Una Persona registrata con il tocco (livello e abilità della riga); poi «Registra» dalla scorta e un'aggiunta alla scorta da fusione | Il tocco non azzera livello, bonus né abilità di una riga che c'era; «Registra» dalla scorta e la fusione scrivono l'**istantanea completa**, che sostituisce la precedente; tutte e tre le strade passano dalla stessa funzione (stesso esito in compendio della partita) |
| F8-34 | R8-03b, R8-02 (G-035, `modifiche.md` §6 passo 4) | API + browser | Ricerca «Capo dei burloni» e «Re lacerato»; pagina delle due Ombre | Il nome mostrato è quello della guida («Maestra degli scherzi», «Straziato re dei desideri»); il nome di prima è in `nomiAltri` e la ricerca lo trova |
| F8-35 | R8-19b, R8-15b | Partita di prova | Pagina di un'Ombra che si incontra nel dedalo di Iweleth, con la partita a un giorno qualsiasi | Mai «Non più raggiungibile: il Palazzo è sparito» per Iweleth (segue la regola dei Memento); gli altri incontri come in F8-19 |
| F8-36 | `modifiche.md` §5 (Richieste) | Browser | `/guida/richieste`: un bersaglio con un'Ombra e uno senza | Il primo mostra le debolezze **del compendio** (o proprie, se è un'eccezione) con il collegamento all'Ombra; il secondo mostra il `bersaglio_json` in testo come oggi |

**Vitest mirati** (`modifiche.md` §7 BE e FE): sui file pronti, con `DATA_DIR` su una cartella vuota, output grezzo nell'esito (F8-31).

**Layout**: R8-30 lo prova Test layout (piastrelle ≥ 88 px, tre per riga su telefono; bersagli ≥ 44 px).

## Note per Test funzionali
- Gli attesi «dopo» di F8-01, F8-03, F8-06 e F8-23 vanno confermati da Analisi dati dopo il boot delle migrazioni M8 e M8b.
- Le conversioni delle voci di Iweleth e il cambio di tipo delle 2 voci di Kamoshida sono «da approvare»: non si provano come scritture finché
  l'utente non dà il sì.
