# L3 «Palazzi: aree e infiltrazioni» — requisiti

Autore: sessione «Analisi requisiti» (2026-10-20). Fonti: piano `docs/analisi/2026-10-20-piano-razionalizzazione.md` (righe 111, 117,
169-175, 187-193, 201, 205-206, 224-225, 246-252, 364-365, 382-386, 396, 416, 435), `ricognizione-L3-palazzi.md`, memoria «Gerarchia del
mondo», «Lavoro da preservare», «Prove sui dati reali», «Tre formati», «Altezze realistiche», «Scroll annidati»; DECISIONI 2026-10-04
(«Un'area della guida su più planimetrie», «Spunta delle aree completate», «Il Palazzo è completato con Tesoro, boss…»), 2026-10-16
(recupero delle aree di Madarame), 2026-10-18 («Una planimetria aggiunta al Palazzo si apre caricandone l'immagine»), 2026-10-20 (D3, L0).

## Obiettivo
I Palazzi seguono la gerarchia **Città → Palazzo → Area → Planimetria (versioni)**, con le **Infiltrazioni** (oggi `dungeon_area`, le
voci della guida) trasversali, legate **molti a molti alle Aree** che toccano. Le «stanze» di oggi (gruppi di versioni in
`mappa_presentazione.gruppo_immagini_json` e planimetrie sciolte) diventano **Aree del Palazzo** con nome proprio; il legame
infiltrazione↔planimetria diventa infiltrazione↔Area; la pagina del Palazzo (`/guida/dungeon/<k>`) mostra tutte le aree con le loro
planimetrie e le infiltrazioni; la griglia del Palazzo in `/guida/mappe` sparisce e ogni link porta alla scheda del Palazzo. Si aggiungono
area, planimetria e infiltrazione dalla pagina del Palazzo.

**Fatto quando** (piano, riga 416): una stanza (area) aggiunta compare subito nel Palazzo e nel visore, senza «scegli una planimetria»;
la prova è il caso di Madarame.

## Perimetro misurato (dalla ricognizione, da confermare con `dati.md`)
- 101 aree negli 8 Palazzi (kamoshida 10, madarame 8, kaneshiro 13, futaba 18, okumura 11, niijima 13, shido 16, maruki 12) + 16 di Iweleth.
- 219 planimetrie (+26 di Iweleth), tutte `planimetria-nativa`, profondità 1.
- 92 coppie infiltrazione↔area dai legami `mappa_entita(entita_tipo='area')` + 1 dal pin 777 di Madarame.
- 15 infiltrazioni senza planimetria; 126 planimetrie senza infiltrazione; 31 aree senza infiltrazione.
- Lavoro dell'utente: Kamoshida 169 voci / 359 pin dell'utente, impronta 373, invariata sulla copia 0440Z (piano; la ricognizione contava 367 spilli di cui 10 predefiniti: vale l'impronta),
  Madarame vedi sotto; dettaglio della ricognizione (punto_partita,
  spillo_voce, spillo_partita, destinazioni, pezzi, copie, atterraggi) è l'impronta da confrontare. **Madarame, due cifre**: 196 voci e
  250 pin utente sulla fotografia del 2026-10-19 (piano); 225 voci e 252 pin utente (258 spilli con i 6 predefiniti) sulla copia del
  2026-10-20 (dati cresciuti: l'ultima infiltrazione è stata completata quel giorno). Base confermata dall'utente (tramite il PM, 2026-10-20): 225/252, con l'impronta
  `impronta-prod-20261020.json` come perimetro. **Da ora la base è la copia fresca di produzione `dati-produzione/2026-10-20-0440Z`**
  (decisione del PM): Madarame **227 voci e 254 pin utente**, impronta 263. Le voci nuove sono quelle del boss in ordine 18 e 19, inserite
  dall'utente; i pin nuovi sono il 2300 e il 2301. Kamoshida è invariata: 169 voci, 359 pin utente, impronta 373. Misure del Collaudo,
  confermate da Analisi dati.

## Criteri di accettazione
Tipo: **F** funzionale (API + browser), **UX** esperienza, **NR** no-reg, **L** layout.

### Modello e migrazione
- R3-01 [F] Esiste l'entità Area del Palazzo (chiave stabile, Palazzo, nome, nome rivisto, ordine, planimetria predefinita, origine); l'API della scheda del Palazzo restituisce le sue aree ordinate, ciascuna con le sue planimetrie-versione.
- R3-02 [F] Ogni planimetria di un Palazzo appartiene a esattamente un'Area; nessuna planimetria del Palazzo resta senza Area dopo la migrazione, salvo quelle elencate «da collocare».
- R3-03 [F] Il numero di aree per Palazzo dopo la migrazione coincide con quello del censimento (`dati.md`, oggi 10/8/13/18/11/13/16/12), salvo differenze spiegate una per una.
- R3-04 [F] Il nome di ogni Area è quello che l'utente vede oggi come titolo della stanza (nome rivisto se c'è, altrimenti quello mostrato), e non è più sovrascritto dal nome di una mappa (piano riga 111: «il nome della mappa vince su quello dell'area» sparisce).
- R3-05 [F] L'ordine delle aree e l'ordine e l'etichetta delle versioni dentro l'area sono quelli visibili oggi (compresi i casi `152-1-0` e `153-7-0` dove l'ordine delle versioni oggi differisce da quello delle mappe: si conserva quello mostrato, elencato in `dati.md`).
- R3-06 [F] Il legame Infiltrazione↔Area è molti a molti; ogni coppia di oggi (92 + quella del pin 777, salvo decisione diversa sul caso dubbio 2) esiste dopo la migrazione; nessuna coppia nuova nasce senza essere elencata.
- R3-07 [F] Un'infiltrazione legata a un'Area tocca tutte le sue planimetrie-versione; la mappa dell'infiltrazione mostra le planimetrie delle aree toccate.
- R3-08 [F] Le 15 infiltrazioni senza planimetria restano visibili nella scheda del Palazzo, segnalate «senza aree» (o «da collocare»), con le loro voci intatte.
- R3-09 [F] Le fonti vecchie del legame (`mappa_entita` di tipo area, colonne `mappa.entita_*='area'`, `gruppo_immagini_json` dei Palazzi, il nome in `guida_mappa`) non sono più lette da nessuna vista; se restano fisicamente fino a L11, nessun lettore ne dipende (elenco in `app.md`).
- R3-10 [F] La migrazione è append-only, con ID successivo all'ultimo su `newreview`, copia di sicurezza all'avvio, idempotente (provata da test con i conteggi del censimento).
- R3-11 [F] Import ed export del pacchetto portano aree del Palazzo, versioni e legami infiltrazione↔area; un giro export→import su copia restituisce gli stessi dati.
- R3-12 [F] I dedali dei Memento non sono toccati: `DungeonDettaglioDto.aree` dei Memento, `area_dedalo`, timbri, Richieste, Persona catturabili restano identici (stessa risposta API prima/dopo per `mementos`).

### Pagina del Palazzo e navigazione
- R3-13 [F] `/guida/dungeon/<k>` mostra tutte le aree del Palazzo, ciascuna con le sue planimetrie (versioni) e le infiltrazioni che la toccano, e tutte le infiltrazioni con le aree che toccano.
- R3-14 [F] Aprire un'area mostra subito il visore sulla sua planimetria predefinita, con il selettore delle versioni; non compare mai «— scegli una planimetria —».
- R3-15 [F] La griglia del Palazzo in `/guida/mappe/<radice del Palazzo>` non esiste più: l'indirizzo rimanda alla scheda `/guida/dungeon/<k>`; gli indirizzi `/guida/mappe/<planimetria>` di un Palazzo rimandano alla scheda del Palazzo sull'area e sulla versione giuste.
- R3-16 [F] Ogni link che oggi porta alla griglia o a una planimetria del Palazzo (elenco della ricognizione: RisolviMappa e i suoi 80 alias, mappa incorporata, accesso al mondo, metro di Tokyo, percorso/«Entra», indice Mappe, contenuti della guida, Battaglia) porta alla scheda del Palazzo, area e infiltrazione giuste; i link dei Memento (Richieste) restano come sono.
- R3-17 [F] La pagina dell'infiltrazione (`/guida/dungeon/<k>` con l'infiltrazione aperta, o `/guida/dungeon/<k>/infiltrazione/<i>`) mostra le sue aree, la sua guida e la mappa delle aree toccate; la «seconda vista con l'area aperta nella griglia» sparisce.
- R3-18 [F] Il parametro `?area=` di oggi (DungeonDettaglioPage) continua ad aprire la stessa infiltrazione (compatibilità degli indirizzi salvati e del diario).
- R3-19 [F] La radice del Palazzo resta la sua scheda: lo stemma e l'illustrazione di L1 sono invariati.

### Gestione (Aggiungi, Modifica, Elimina)
- R3-20 [F] «Aggiungi area» dalla pagina del Palazzo chiede nome e prima planimetria con immagine; l'area compare subito nell'elenco del Palazzo e nel visore, senza ricaricare e senza «scegli una planimetria» (criterio del piano, provato su Madarame su una copia).
- R3-21 [F] «Aggiungi planimetria» dall'area chiede immagine (obbligatoria), etichetta della versione, se diventa la predefinita; il ruolo si deduce (L1); la planimetria si apre nel visore appena caricata (DECISIONI 2026-10-18 mantenuta).
- R3-22 [F] «Aggiungi infiltrazione» dalla pagina del Palazzo chiede nome, aree toccate e ordine; l'infiltrazione compare subito nell'elenco e sulle aree scelte.
- R3-23 [F] Collegare o scollegare un'area a un'infiltrazione si fa dalla pagina del Palazzo (da entrambi i lati: dall'area e dall'infiltrazione), è un gesto solo e non sposta voci né pin.
- R3-24 [F] Rinominare, riordinare un'area, cambiarne la predefinita, rinominare o riordinare una versione si fa dalla pagina del Palazzo e si vede ovunque (elenco, visore, infiltrazioni, Battaglia, indice, ricerca).
- R3-25 [F] Eliminare un'area, una planimetria o un'infiltrazione la manda nel cestino; rimetterla la riporta con versioni, legami, voci e pin (il cestino accetta il tipo nuovo; i tipi di oggi area|voce|mappa|area-dedalo continuano a funzionare).
- R3-26 [F] Nei Palazzi non si crea più una mappa «sciolta»: l'editor resta per pin, ritagli, pezzi e passaggi; le planimetrie senza area finiscono in «da collocare» da cui si assegnano.
- R3-27 [F] Le modifiche dell'utente alle aree sopravvivono a un aggiornamento del pacchetto (`origine='utente'`, «Ripristina» al valore della guida dove il valore viene dalla guida).

### Lavoro da preservare e non regressione
- R3-28 [NR] Kamoshida: le 169 voci restano con testo, ordine, tipo, dettagli, uid e infiltrazione invariati; ogni infiltrazione mostra le stesse voci nello stesso ordine.
- R3-29 [NR] Kamoshida: i 359 pin restano sulla stessa planimetria nella stessa posizione e aprono la stessa voce; spillo_voce, destinazioni, pezzi, copie e atterraggi (152-2-0 con spillo 1657, 151-16-0, 151-1-0) identici all'impronta.
- R3-30 [NR] Madarame: come R3-28/R3-29 per le 227 voci e i 254 pin utente della copia 0440Z (impronta 263; 225/252 sulla copia precedente, 196/250 il 2026-10-19; impronta: 258 spilli, 284 spillo_voce, 61 destinazioni, 14 pezzi, 32 copie); nessuna fusione di voci in L3 (le fusioni sono di L4, con elenco approvato).
- R3-31 [NR] Gli stati di partita (punto_partita, spillo_partita) di Kamoshida e Madarame, per la partita reale copiata (p1) e per p2, risultano uguali; percentuali e completamenti di area, infiltrazione e Palazzo uguali a prima (la regola nuova del completamento è di L4).
- R3-32 [NR] Collegare, segnare e togliere segni funzionano dalla guida e dalla mappa come prima, su una partita di prova nuova (creata e poi rimossa).
- R3-33b [NR] Il pin 1656 di Shujin Academy (mondo → planimetria di Kamoshida) resta nella stessa posizione e porta alla stessa planimetria, ora dentro la scheda del Palazzo (caso dubbio 11).
- R3-33 [NR] Gli spilli utente sulla radice `dungeon-kamoshida` (1735→151-1-0, 1816→151-16-0) e lo spillo 1815 continuano a portare dove portano oggi.
- R3-34 [NR] Il diario 04-01..06-01 (255 voci sulla copia di produzione 0440Z del 2026-10-20; 254 sulla copia precedente) resta invariato; le sue voci dei Palazzi (46 collegate su 58) portano alla stessa infiltrazione di prima, sulla scheda del Palazzo.
- R3-35 [NR] Il Palazzo sulla mappa di Tokyo (apertura, scadenza, atterraggio, cartellino) si comporta come prima (DECISIONI 2026-10-04).
- R3-36 [NR] Typecheck e lint verdi; test mirati (dungeon, palazzi, mappe, cestino, migrazione nuova, PlanimetriePalazzo, DungeonDettaglioPage) verdi con output grezzo.

### Esperienza e layout
- R3-37 [UX] Durante un'infiltrazione dal tablet: dalla voce del diario «Entra» si arriva alla scheda del Palazzo sull'infiltrazione in corso con la mappa delle sue aree, senza passare per la griglia né per scelte di planimetria.
- R3-37b [F] Il legame tra una voce del diario e un'infiltrazione è un **campo visibile e selezionabile** nella voce del diario. È un selettore che elenca le infiltrazioni già esistenti nel Palazzo della voce. Decisione dell'utente del 2026-10-20: il legame «non deve essere nascosto ma selezionabile... attingendo alle infiltrazioni già esistenti nel palazzo». Il comportamento è questo:
  - per le **9 voci** di `elenco-diario-infiltrazioni.md` (04-11, 04-12, 04-15, 04-22, 05-16, 05-19, 05-20, 05-27, 06-01) il campo **propone** l'infiltrazione dell'elenco e l'utente la **conferma** con un gesto;
  - per la voce del **04-20** («infiltrazione completa in un unico viaggio») il campo, che è un **insieme ordinato** di infiltrazioni, **propone le tre infiltrazioni in ordine**: Vecchio Castello, Tetto del Vecchio Castello, Ispeziona l'interno della torre (G-022, certezza alta). L'utente conferma. Una voce con più infiltrazioni confermate apre la prima non completata dell'insieme. *Decisione del PM sul difetto FUN3-2 (2026-10-20), allineata a `modifiche.md` §6.3: il «nessuna proposta» dell'utente valeva per il campo a scelta singola, dove una sola infiltrazione sarebbe stata sbagliata.*
  - **nessuna scrittura automatica**: la migrazione non salva nessun legame;
  - finché il legame non è confermato, la voce apre la prima infiltrazione non completata, come prevede `modifiche.md`;
  - il legame confermato si può sempre cambiare o togliere dallo stesso campo;
  - testo, ordine, giorno, fascia, uid e spunte della voce non cambiano.

- R3-37c [F] **Il campo «Infiltrazione» vale per tutte le voci del diario che fanno riferimento a un Palazzo**: tutti i Palazzi e tutti i giorni, non solo le voci validate fino al 1° giugno. È un'estensione chiesta dall'utente il 2026-10-20: «questa modifica... va applicata a tutti i riferimenti dei palazzi».
  - Dove l'infiltrazione si ricava (nome o data dell'infiltrazione nel testo, ordine delle visite, orari delle spunte), il campo la **propone**, e serve sempre la **conferma dell'utente**.
  - Dove non si ricava, il campo resta vuoto.
  - **Nessuna scrittura automatica.**
  - Le proposte stanno in un elenco per Palazzo, voce per voce, con il motivo, sul modello di `elenco-diario-infiltrazioni.md`.
  - Nessuna voce di Palazzo resta senza il campo.

  Verifica: il conteggio delle voci di Palazzo che mostrano il campo è uguale al numero di voci di Palazzo del diario (misura in `dati.md`); nessun legame è scritto dalla migrazione.

  Le proposte vengono dalla scheda **G-022** dell'Esperto della guida (`guida/registro.md`), che copre 45 voci del diario con le fonti: 32 confermate, 7 corrette, 3 completate, 11 senza infiltrazione. Fra queste ultime c'è il falso positivo «Kamoshida il professore», che non riguarda il Palazzo e non deve mostrare proposte. Ne seguono quattro regole:
  - le proposte del campo sono quelle di G-022, sempre confermate dall'utente;
  - le 11 voci senza infiltrazione hanno il campo vuoto;
  - le **3 voci di Niijima** puntano al Palazzo giusto (`dungeon:niijima`), e il selettore offre le infiltrazioni di Niijima;
  - i **4 giorni d'infiltrazione «senza voce»** di G-022 cadono tutti **dopo il 06-01**, quindi nessuno tocca il diario validato. Allineato a `lotti/L3/modifiche.md` §2.2 e §7.13, confermati dal PM:
    - **10/3 (Maruki), 13/11 (Niijima, voce del giorno) e 2/1 (Maruki)**: una voce c'è già, riferita al Confidente. **Niente voce nuova**, perché la duplicherebbe: quella voce riceve solo la **proposta di infiltrazione** di G-022 nel campo, da confermare. Il **riferimento al Confidente resta invariato**: il campo «Infiltrazione» è indipendente dal riferimento. La voce del **13/11 sera**, seguito dello stesso viaggio, si **marca «da rivedere»**, senza proposta, senza campo e senza cambiare il testo (correzione dell'Esperto, tramite il PM).
    - **26/6 (Kaneshiro)**: la lettera di sfida al Ritrovo. È **l'unica voce nuova**, marcata «da rivedere», con riferimento `dungeon:kaneshiro`. È **senza proposta di infiltrazione**: come le altre lettere di sfida (n/a), non è un'infiltrazione. Il campo c'è, perché la voce è di Palazzo, ma è vuoto. Correzioni: la data è il 06-26, non il 06-25 (Esperto); «con la proposta da confermare» era sbagliato (decisione del PM, FUN3-2, allineata a `modifiche.md` §2.1.6(d)).

    Nel diario validato 04-01..06-01, se mai servisse, si userebbe un evento e non una voce. Verifica:
    - dopo la migrazione c'è **esattamente 1 voce nuova** (06-26, «da rivedere», campo «Infiltrazione» vuoto, senza proposta);
    - le **3 voci esistenti** (10-03, 11-13 giorno, 01-02) mostrano il campo «Infiltrazione» con la proposta, con il riferimento invariato;
    - la voce dell'11-13 sera ha il segno «da rivedere», nessuna proposta, nessun campo e il testo invariato;
    - nessun legame è scritto (`voce_infiltrazione` vuota, §2.2);
    - il diario validato è identico.
  - **Nomi delle visite**: dove la guida chiama diversamente una visita (Kaneshiro 20/6 «Cerca il boss della mala», Shido 24/11 «Ponte anteriore»), resta il nome dell'app e il nome della guida diventa una nota della voce (G-022).

  Verifica di R3-37b nella partita di prova e su una copia: ognuna delle 9 voci mostra la proposta giusta, la conferma salva il legame, «Entra» porta su quell'infiltrazione, togliere il legame riporta al comportamento di prima. Il 04-20 propone le tre infiltrazioni in ordine e, confermato, apre la prima non completata. Il confronto prima/dopo la migrazione non mostra nessun legame scritto.
- R3-38 [UX] I testi usano il vocabolario di L0: «Area» (ex stanza), «Planimetria» (versione), «Infiltrazione»; nei Memento resta «area del dedalo».
- R3-39 [UX] La grafica della scheda del Palazzo resta curata come oggi: stemma, illustrazione al 100%, visore nel suo spazio.
- R3-40 [L] Scheda del Palazzo, elenco aree/infiltrazioni, finestre «Aggiungi area / planimetria / infiltrazione», «da collocare»: nessuno scorrimento orizzontale a 1280, 768, 375; bersagli ≥44 px.
- R3-41 [L] A 1366×657 e 1280×689 la scheda del Palazzo con un'area aperta mostra visore e selettore delle versioni nella prima schermata («Palazzo in una schermata», memoria «Altezze realistiche»); scroll annidati con confine evidente e overscroll contenuto.

## Decisioni coinvolte
| Decisione | Scelta consigliata applicata, da confermare | Effetto sui criteri |
|---|---|---|
| D3 Iweleth | **Solo come dedalo dei Memento**: le aree del «Palazzo» confluiscono nel dedalo | In L3 riguarda solo il destino delle 16 aree / 26 planimetrie di Iweleth (caso dubbio 7); la confluenza delle Persona e degli stati è di L8 |
| D1 Ordine dei lotti | L0 → L11 | L3 dopo L2 (dipende da L1, non da L2: può procedere se L2 si ferma) |
| D4 Permanenti/rigenerabili | Rigenerabili: oggetto, nemico, ombra-sciagura | Non applicata in L3 (è L4): L3 non cambia stati né completamenti |

## Lavoro dell'utente da preservare toccato dal lotto
- **Kamoshida e Madarame**: è il cuore del lotto (R3-28..R3-33). Il passaggio ad aree e infiltrazioni sposta legami, non contenuti;
  confronto voce per voce e pin per pin sulla copia di produzione, consegnato con la richiesta di rilascio.
- Nomi rivisti a mano delle stanze, gruppi d'immagini ed etichette, le tre aree di Madarame recuperate dal WAL (2026-10-16), la planimetria
  aggiunta dall'utente a Madarame (2026-10-18).
- Diario 04-01..06-01: solo i link verso i Palazzi (R3-34).

## Dipendenze
- **L1 consegnato** (risolutore d'immagine, ruolo dedotto; stemma e illustrazione nell'intestazione del Palazzo).
- L0 consegnato. Indipendente da L2 nei dati, ma **stessi gesti e parole** di L2 per «Aggiungi area / planimetria» e versioni.
- Prepara **L4** (stato sull'oggetto, permanenti/rigenerabili, fusioni di Madarame, schede senza mappa) e **L8** (Iweleth secondo D3, Ombre).
- DTO: `AreaDungeonDto` è condiviso con i dedali dei Memento (ricognizione): i cambi di contratto non devono toccare i Memento.

## Casi dubbi da approvare (soluzione prudente proposta)
1. **Granularità del legame**: con il legame all'Area nascono 95 coppie planimetria×infiltrazione implicite in più (Kamoshida 14,
   Madarame 11). Prudente: accettarle (è il modello dell'utente: l'infiltrazione tocca l'area intera), ma verificare che nessun pin o voce
   cambi visibilità o conteggio per questo (R3-31); se qualcosa cambia, conservare la planimetria iniziale del legame.
2. **Coppia (153-5-0 «Giardino centrale», Il furto del cuore di Madarame) dal pin 777**: oggi esiste solo come pin. Prudente: aggiungerla
   (nessuna perdita, reversibile), elencata.
3. **Chiavi nuove** `area-<dungeon>-<slug>` per tutte le aree, senza riusare gli id dei gruppi (3 id `utente:nativo-rmap-151-*` di
   Kamoshida non sono chiavi di mappa). Prudente: chiavi nuove, con tabella di corrispondenza per i redirect.
4. **Planimetrie senza infiltrazione dentro aree con infiltrazioni** (151-1-1, 151-6-0 «Scala»): ereditano le infiltrazioni dell'area.
5. **15 infiltrazioni senza planimetria**: restano senza aree, mostrate «senza aree», nessun legame inventato.
6. **Radice `dungeon-kamoshida` con spilli utente** (1735, 1816, 1815): la radice non è un'Area; gli spilli restano dove sono e si vedono
   nella scheda del Palazzo come oggi (non spostarli su un'Area senza sì).
7. **Iweleth** (D3 consigliata: solo dedalo): in L3 la confluenza nel dedalo non si fa (tocca Persona, stati e voci di tipi non ammessi nei
   dedali: è di L8). Prudente: le 16 aree/26 planimetrie di Iweleth si migrano come gli altri Palazzi (nessuna perdita di pin), e restano
   navigabili fino a L8; alternativa: escluderle da L3 lasciando Iweleth com'è. Da approvare.
8. **`palazzo-di-madarame-il-labirinto-contorto`** (tipo `generica` sciolta, con immagine caricata dall'utente, legata a
   `madarame-nelle-profondita-del-museo`): diventa una planimetria di una nuova Area «Il Labirinto Contorto» di Madarame. Da confermare.
9. **Ordine delle versioni diverso dall'ordine delle mappe** (`152-1-0`, `153-7-0`): si conserva l'ordine mostrato oggi.
10. **Nome dell'area quando il gruppo e la mappa hanno nomi diversi**: vince il nome mostrato oggi (rivisto o senza gergo), l'altro resta
    come nome della versione se diverso.
11. **Pin 1656 di Shujin Academy che porta a una planimetria di Kamoshida** (rilievo di Analisi app): è probabilmente l'ingresso voluto
    dal mondo al Palazzo. Prudente: conservarlo; dopo L3 porta alla scheda del Palazzo di Kamoshida sull'area e sulla versione di quella
    planimetria (come R3-15/R3-16), senza cambiarne posizione né destinazione logica. Da confermare che sia l'ingresso voluto.
12. **Legame voce del diario → infiltrazione** (`elenco-diario-infiltrazioni.md`: 9 certe, 1 ambigua al 04-20, 3 senza infiltrazione) —
    **deciso dall'utente (2026-10-20)**: è un campo visibile, un selettore con le infiltrazioni del Palazzo. Per le 9 voci propone e
    l'utente conferma; non c'è nessuna scrittura automatica (R3-37b). Per il 04-20 la decisione era «nessuna proposta»; con il campo diventato un insieme ordinato, il PM (FUN3-2) ha stabilito che propone le tre infiltrazioni in ordine, sempre da confermare. Le 3 voci senza infiltrazione (lettere
    di sfida, Stanza di Velluto) hanno il campo vuoto e aprono la scheda del Palazzo come oggi. Chiuso.
    **Esteso dall'utente (2026-10-20)** a tutte le voci di Palazzo di ogni giorno e Palazzo (R3-37c), con proposte dove ricavabili, sempre
    confermate.
