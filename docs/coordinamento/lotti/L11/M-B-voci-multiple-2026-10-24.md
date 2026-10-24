# R11-10c/2, M-B residuo — le 18 voci senza legame con l'infiltrazione (2026-10-24)

Richiesta del PM. Sola lettura, nessun commit. Dati: copia di p5s migrata fino alla 210; audit `dati_guida` `legami-infiltrazioni-voci-207` (19 voci legate, 16 «multipla» con 81 righe e 2 «probabile» ancora senza legame). Una «infiltrazione» del database è un'**area del Palazzo** (`dungeon_area`); `voce_infiltrazione` ha chiave `(voce, ordine)` e il gesto «Conferma» (`impostaInfiltrazioniVoce`, `giornataService.ts:349`) vieta solo la stessa area due volte **di seguito**.

## 1. In breve

- **Tutte e 18 le voci si legano come la proposta già dice** (83 righe: 81 + 2): per ciascuna ho trovato nella guida italiana (indice verbatim della pagina del Palazzo, AllGameStaff) la stessa sequenza di aree per quel giorno; dove non c'era, il testo della voce o il Royal (Samurai Gamers, SG) la confermano.
- **16 voci coprono davvero più infiltrazioni**; le altre 2 (06-20 e 11-19) una sola.
- **Certezza:** 10 alta, 6 media-alta, 2 media (§2). Nessuna proposta cambia.
- **Tre segnalazioni di testo** (non toccate qui: spetta a M-C): 08-01 sera (la guida mette la sera al Leblanc), 12-11 Shido (il testo si ferma a metà della sequenza della guida), 10-04 Okumura (il testo si ferma alla Linea di smaltimento).
- **Una domanda** (§4): Shido 12/11, 15 aree (guida) o 8 (testo)?

Fonti: [AGS] pagine dei Palazzi `allgamestaff.it/persona-5-royal/palazzo-di-…` (indice verbatim con le date delle sezioni; il corpo di alcune sezioni è letto solo in sintesi); [SG] walkthrough mensili e guide dei Palazzi di Samurai Gamers; [ACE] calendario dati-di-gioco (non elenca aree). **SG e ACE non danno le aree per data** (SG indica «Metaverse: X – n-th Infiltration»; ACE «Reach treasure»): servono solo a confermare giorno, boss e Tesoro.

## 2. Voce per voce

| # | Voce | Legare a (in quest'ordine) | Certezza | Prove |
|---|---|---|---|---|
| 1 | `09e38fdd` 01-02 «Palazzo sconosciuto» (Maruki) | `maruki-01-ingresso`, `-02-sala-d-ingresso`, `-03-percorso-di-prova` | **alta** | AGS 2/1: «??? Ingresso», «??? Sala d'ingresso», «??? Percorso di prova». SG: «??? Palace – Second Infiltration». |
| 2 | `cdf1af20` 01-09 | `maruki-01`, `-02`, `-04-corridoio`, `-05-auditorium` | **alta** | AGS 9/1: Ingresso, Sala d'ingresso, Corridoio, Auditorium. Il testo dice «avanzamento verso l'Auditorium» e la battaglia con Sumire. |
| 3 | `6e28e155` 01-12 | `maruki-01`, `-05`, `-06-ripostiglio`, `-07-sala-di-controllo` | **alta** | AGS 12/1: Ingresso, Auditorium, Ripostiglio, Sala di controllo (le ultime due solo in indice). Il testo nomina Ripostiglio e Sala di controllo. |
| 4 | `cf66b722` 01-26 | `maruki-07`, `-08-ala-ricerca`, `-09-sala-visite`, `-10-sala-di-supporto`, `-11-corridoio-del-crepuscolo` | **alta** | AGS 26/1: le stesse cinque sezioni; il testo le nomina tutte. SG: «Reach treasure area», ACE: Tesoro. L'avvertenza della voce (fonti divergenti su cosa si completa il 26 o il 27/1) non cambia i legami: il 27/1 della guida è a scuola, nessuna area. |
| 5 | `a5133905` 04-20 «infiltrazione completa» | `kamoshida-01-cancello-del-castello-ingresso` (Vecchio Castello), `-13-tetto`, `-15-torre-centrale` | **media-alta** | AGS 20/4: «Trova il Tesoro» con 16 passi, senza intestazioni d'area; i passi sono castello → «Infiltrati nella torre» (Tetto) → «Ispeziona l'interno della torre» (nome esatto dell'area 15). SG: Castle Gate … Old Castle Roof … Castle Tower, «Clear the palace today». **L'area «Rubare i desideri del Cuore» resta al 22/4** (è il nome della sezione del 22/4, già legata); il 20/4 entra nella stanza del Tesoro ma la sezione non è quella. |
| 6 | `65fdbeab` 06-20 (era «probabile») | `kaneshiro-01-sala-d-ingresso` | **alta** | AGS 20/6: «Entra nella banca», «Trova la reception», «Raggiungi l'entrata» (fuga); SG: «Go to the reception room». Una sola area, nessuna Safe Room né Tesoro. |
| 7 | `5796b127` 06-25 | `kaneshiro-01`, `-02-corridoio-dei-banchieri`, `-03-ufficio-riciclaggio`, `-04-caveau-sotterraneo` | **alta** | AGS 25/6: le quattro sezioni con questi titoli; il testo le nomina. (Il Caveau è già legato alla voce del 27/6: è lecito, il 25/6 vi arriva «verso il Tesoro».) |
| 8 | `ac258051` 07-25 | `futaba-01-entrata-della-piramide`, `-02-corridoio-principale…-prima-s…` | **alta** | AGS 25/7: «Entrata della piramide», «Corridoio principale»; SG: «Great Pyramid Corridor». |
| 9 | `62284ab3` 08-01 **sera** | `futaba-06`, `-07-camera-del-rigetto`, `-08-camera-del-rimorso`, `-09-camera-del-santuario` | **media** | AGS 1/8 elenca le aree 01–09 sotto un solo giorno; il taglio fra «giorno» (01–05) e «sera» (06–09) è del Diario, non della guida. **La settimana 17 (solo in sintesi) mette la sera al Leblanc con un DVD, senza Palazzo**, e SG/ACE non hanno il Palazzo l'1/8: il testo «sessione prolungata» è sospetto (→ M-C). |
| 10 | `f5e781ca` 08-01 **giorno** | `futaba-01`, `-02`, `-03-citta-nel-deserto`, `-04-caverna…`, `-05-camera-dei-sarcofagi` | **media** | Stessa guida: le prime cinque aree dell'1/8 (verbatim: Entrata, Corridoio, Città nel deserto, Caverna). Il testo nomina nemici e statue ma nessuna area. Vedi voce 9: se il taglio non regge, la voce del giorno copre 01–09. |
| 11 | `fd2a7b29` 09-15 | `okumura-01-entrata-laterale`, `-02-corridoi-del-complesso` | **media-alta** | AGS 15/9: sezione «Entrata laterale»; «Corridoi del complesso» è la destinazione dell'ascensore, senza intestazione propria. SG: «Side Entrance → Facility Passageway». |
| 12 | `8742bcf9` 10-03 dungeon di Kasumi | `maruki-01-ingresso`, `maruki-02-sala-d-ingresso` | **media-alta** | AGS settimana 25: «??? Ingresso», «??? Sala d'ingresso» (stesse etichette «???» di Maruki; **la guida non dice che sia lo stesso luogo**). SG numera il 10/3 «1st Infiltration» e l'1/2 «Second Infiltration» dello stesso «??? Palace»: è il dato che li unisce. Il guardrail del Palazzo non scatta (la voce ha riferimento «confidente»): il Palazzo si ricava dalla proposta (`palazzoDellaVoce`, `giornataService.ts:258`). |
| 13 | `c66a02b6` 10-04 | `okumura-01` … `-10-produzione-armamenti` (tutte e dieci) | **alta** per 01–07, **media-alta** per 08–10 | AGS 4/10: l'indice elenca le dieci aree in quest'ordine sotto il 4 ottobre. Il testo si ferma alla Linea di smaltimento (07): Fabbrica centrale, Interscambio e Produzione armamenti sono solo in guida (→ M-C). `-10` è anche legata alla voce del 6/10: lecito. |
| 14 | `7dd92df2` 10-29 | `niijima-01-entrata-del-casino`, `-02-piano-terra` | **alta** | AGS 29/10: «Entrata del Casinò», «Piano terra»; SG: «Entrance» + Safe Room. |
| 15 | `ebe00e6b` 11-13 | `niijima-01`, `-02`, `-03`, `-06`, `-07`, `-04`, `-08`, `-05`, `-09`, `-10`, `-11` | **alta** per 01–10, **media-alta** per 11 | AGS 13/11: le undici sezioni **nell'ordine esatto della proposta** (Staff I → Lobby soci → Dadi I → Staff II → Dadi II → Staff III → Slot 1 → Slot 2 → Lobby puntate alte). Il testo nomina Tessera socio, Regine di Mezzanotte, 50.000 monete e «area staff e piano soci». La Lobby puntate alte è anche l'inizio del 14/11. |
| 16 | `dece90bf` 11-14 | `niijima-11`, `-12-arena-combattimenti`, `-13-oscura-dimora`, `-12`, `-14-direzione-sala-del-boss` | **alta** | AGS 14/11: Lobby, Arena I, Oscura dimora, Arena II, Direzione, verbatim per il testo («il biglietto d'ingresso costa 10.000 monete»). L'area 12 compare due volte, **non di seguito**: ammesso. |
| 17 | `589d82e8` 11-19 (era «probabile») | `niijima-14-direzione-sala-del-boss` | **alta** | La sala del boss è l'area 14 «Direzione (sala del boss)». SG: «Boss Battle», Shadow Niijima. Una sola area. |
| 18 | `746682fa` 12-11 | `shido-01` … `shido-15-passaggio-centrale-uscita` (quindici) | **alta** per 01–08, **media-alta** per 09–15 | AGS 11/12: le quindici sezioni dell'indice sotto il giorno, nell'ordine della proposta. **Il testo della voce dice «fino alla Sala Intrattenimento»** (area 08) e la guida va avanti fino al Passaggio centrale (uscita): vedi §4. |

Totale: 3+4+4+5+3+1+4+2+4+5+2+2+10+2+11+5+1+15 = **83 righe**, uguale alla proposta.

## 3. Più infiltrazioni per una voce

Sì: 16 voci coprono davvero più aree (una sessione di gioco attraversa più sezioni della guida); 2 una sola. Non serve cambiare il modello: `voce_infiltrazione` è già un elenco ordinato e il gesto «Conferma» ammette ripetizioni non consecutive (caso 16). Due aree compaiono in più voci di giorni diversi (Caveau al 25/6 e 27/6, Produzione armamenti al 4/10 e 6/10, Lobby puntate alte al 13/11 e 14/11, Direzione al 14/11 e 19/11): è il percorso del gioco, non un doppio conto.

## 4. Domanda per l'utente (una riga)

«Shido 11/12: leghiamo le 15 aree della guida o solo le 8 che il testo della voce nomina (fino alla Sala Intrattenimento)? Raccomando 15 e la correzione del testo.»

## 5. Come scriverle (per BE)

Una migrazione come la 207: stessa funzione di «Conferma», **per elenco di `[uid, data attesa, [aree in ordine]]`** (18 voci), con le guardie della 207 (uid e data, nessun legame esistente, proposta ancora identica, area esistente e dello stesso Palazzo quando la voce ha riferimento «dungeon»; per 10-03, 01-02 e 11-13, che hanno riferimento «confidente», si controlla che le aree siano di `maruki` e di `niijima`), audit in `dati_guida` (`legami-infiltrazioni-voci-211` o numero successivo) con le voci scritte e quelle saltate; le righe di proposta restano come archivio; impronta di `voce_giornata` uguale prima e dopo.

## 6. Limiti

- Le guide AGS sono state lette con l'indice verbatim; i corpi di alcune sezioni (Ripostiglio, Sala di controllo di 12/1; Sala visite, Sala di supporto e Corridoio del Crepuscolo di 26/1; le aree dopo la Caserma del 4/10; il 6/10; il 19/11) solo in sintesi: le aree restano attestate dall'indice, i dettagli no.
- SG ha titoli di aree diversi da quelli italiani (Niijima: 13 titoli contro 14, Shido: 13 contro 16): per confrontare le aree dei Palazzi si usa la guida italiana, che è la fonte del database; SG serve per giorno, boss e Tesoro.
- Il Palazzo di Maruki non ha una guida SG dedicata.
