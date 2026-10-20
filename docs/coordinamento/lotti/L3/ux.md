# L3 «Palazzi: aree e infiltrazioni» — Test user experience

Sessione «Test user experience». Stato: **in corso** (2026-10-20, giro 1 su 5373 fatto; 4 difetti UX3-1…UX3-4). Fonti: requisiti.md (R3-37…R3-41), modifiche.md §4 e §6.4,
app.md §3 e §9; «prima» di Analisi app in `schermate-prima/` (15 viste × 5 misure). Prove con dati scritti solo in locale, con una
partita di prova o una copia; produzione solo in lettura.

## Percorsi da provare (tablet 768 durante un'infiltrazione, telefono 375, desktop 1280; 1366×657 e 1280×689 per «Palazzo in una schermata»)
| # | Percorso (chi gioca) | Criterio | Cosa misuro | «Prima» |
|---|---|---|---|---|
| U1 | **Diario → «Entra» → infiltrazione in corso** (Madarame, una voce del 18/05; Kamoshida, una voce con più infiltrazioni) dal tablet | R3-37, §4.4 | tocchi dalla voce alla mappa dell'infiltrazione giusta (atteso 1); niente griglia né «scegli una planimetria»; l'area aperta è quella giusta; si capisce dove si è | voce → scheda sulla 1ª infiltrazione o atterraggio del giorno (P9); a 768 il visore comincia a y≈840 su 1024: per vedere la mappa bisogna scorrere (`10-palazzo-madarame-infiltrazione-4__768x1024.png`) |
| U2 | **Campo «Infiltrazioni» della voce del diario**: proposta → «Conferma», aggiungi, ordina ↑/↓, togli (partita di prova, in locale) | §4.4 | il campo si capisce accanto al cartellino del Palazzo; la proposta è leggibile e dice perché; ogni gesto salva subito senza toccare il resto; foglio dal basso su telefono; bersagli 44 px | — (nuovo) |
| U3 | **Scheda del Palazzo**: elenco «Aree · N», chip delle infiltrazioni, aree evidenziate al cambio d'infiltrazione, versioni, visore | R3-13, R3-14, R3-39, R3-41 | le aree si capiscono come «stanze» del Palazzo; cambiare infiltrazione non fa sparire le aree; versioni comprensibili con i pin; visore e versioni nella prima schermata a 1366×657 e 1280×689; stemma + illustrazione L1 come verificati in L1 (UX-1) | a 1366×657 il visore sta sotto la prima schermata (app.md §9); selettore «Planimetria» a tendina + «Su questa planimetria» (`10-…`) |
| U4 | **Metro → stemma di Madarame** (senza atterraggio) e **Kamoshida** (con atterraggio) | §4.1 | si arriva alla scheda (non più alla griglia) o all'area con lo spillo; un tocco | griglia `/guida/mappe/palazzo-di-madarame` (`09-accesso-dungeon-madarame`, `04-griglia-madarame`) |
| U5 | **Indirizzi vecchi**: griglia, planimetrie, alias (museo 1P), «Sulla mappa» del diario (153-1-0, 152-1-0) | R3-15, §4.1 | atterraggio sull'area e la versione giuste con lo spillo selezionato; nessuna versione sbagliata | `13-alias-museo-1p` (alias sulla versione sbagliata), `06-…`, `07-…` |
| U6 | **Gestione** (copia/partita di prova, in locale): «Aggiungi area» su Madarame → l'area si apre subito nel visore; «Aggiungi planimetria»; «Aggiungi infiltrazione» con «Aree toccate»; «Modifica area», «Modifica aree», elimina → cestino | R3-14, R3-20…R3-27, criterio «Fatto quando» del piano | passi e conferme chiari; la finestra dice cosa si porta via (planimetrie, pin, infiltrazioni; «le voci restano»); il passaggio da «Gestisci» alle finestre di L2 si capisce; nessun «scegli una planimetria» | «Aggiungi» crea una mappa sciolta e apre l'editor; «Gestisci» con «Rendila un'area a sé», «Sposta in un'altra area» |
| U7 | **Memento** (`/guida/dungeon/mementos`, Richieste) | R3-12, R3-16, R3-38 | invariati: «area del dedalo», intestazione 168 px a 375, stemma 40 | `14-memento`, `L1/schermate-ux/dopo-memento-375.jpg` |
| U8 | **Testi** in scheda, finestre, diario | R3-38, §4.5 | vocabolario di L0; spariti «— scegli una planimetria —», «Collega una planimetria», «Mappa del Palazzo», «Questa mappa non ha una pianta sua…»; «Infiltrazione» al singolare/plurale giusto | testi elencati in §4.5 |
| U9 | **Scroll** delle colonne laterali (≥1280) e della fila delle aree (768) | memoria «Scroll annidati», R3-41 | confine evidente, `overscroll-behavior: contain`, la pagina non scorre insieme | colonne laterali con scorrimento proprio (`02-palazzo-madarame__1280x800`) |
| U10 | **Peso** della scheda a 375 e 768 (miniature delle aree e delle versioni) | variante «miniature» di L1 | miniature `l=` e `sizes`, nessuna immagine piena per una miniatura | — |
| U11 | **Grafica predefinita spenta** (solo in locale) | regola di L1 | stemma e segni presenti, nessun riquadro vuoto | — |

## Esiti
### Giro 1 su 5373 (solo lettura; 2026-10-20 ~03:10–03:20Z; partita reale al 1/6)
| # | Esito | Misure / prove |
|---|---|---|
| U4 metro → Palazzo | **ok con UX3-4** | Lo stemma di Madarame porta a `/guida/dungeon/madarame` (la scheda, non più la griglia), un tocco. Si apre però sempre sulla 1ª infiltrazione, anche al 99% |
| U3 scheda (768) | **ok** | Intestazione con illustrazione e stemma, «Infiltrazione 1 di 5» come titolo, «Aree toccate», fila delle aree scorrevole con barra visibile, riga dell'area, versioni e visore: il visore parte a **y=664 su 1024** (prima ~840, `schermate-prima/10-…__768x1024`), la mappa si vede nella prima schermata (`pezzo1-madarame-dalla-metro-768.jpg`). Grafica curata come prima |
| U1 diario → «Entra» (768) | **difetto UX3-1** | 20/5, voce «Terza visita…»: collegamento «Palazzo di Madarame» → `?infiltrazione=in-corso` → «1. Prima Infiltrazione al Museo», non «Disabilita i sistemi di sicurezza» proposta «certa» dalla voce |
| U2 campo Infiltrazioni | **ok con UX3-2** | «Infiltrazioni: nessuna · Modifica» e sotto il riquadro della proposta con «Conferma» (44 px): chiaro. La finestra «Infiltrazioni della voce» a 375 è un foglio dal basso con testo chiaro e «Aggiungi infiltrazione», ma parla di un pulsante «Entra» che sulla voce si chiama «Palazzo di Madarame». Non ho confermato né modificato (5373: niente scritture) |
| U5 alias (375) | **ok** | `/guida/mappe/kamoshida-01-cancello-del-castello-ingresso` → `/guida/dungeon/kamoshida?infiltrazione=…` su «Infiltrazione 4 di 7 · Vecchio Castello», area «Cancello del castello · 2 versioni» |
| U3 scheda (375) | **difetto UX3-3** | Gestione impilata prima del visore («+ Infiltrazione», «Modifica aree», «Modifica / Planimetria / Elimina» rosso), visore sotto la prima schermata: la regola di UX2-3 non è applicata alla riga dell'area del Palazzo. Nessuno scorrimento orizzontale (375) |
Decisioni del PM (2026-10-20): UX3-1 e UX3-4 accolte (collegamento della voce sulla prima infiltrazione della proposta; dalla metro la
prima non completata); Stesura aggiorna il §4, poi FE. UX3-2 e UX3-3 a FE.

### Giro 2 su 5373 (solo lettura; 2026-10-20 ~03:25–03:35Z)
| # | Esito | Misure / prove |
|---|---|---|
| U7 Memento (375) | **ok** | Intestazione 168 px, stemma 40, «Dedalo di Qimranut», nessuna area dei Palazzi: identico al «prima» di L1/L2 (`giro2-memento-375.jpg`) |
| U8 testi spariti | **ok** | Sulla scheda di Madarame nessuno di «— scegli una planimetria —», «Collega anche a», «Collega una planimetria», «Scollega questa planimetria», «Mappa del Palazzo», «Questa mappa non ha una pianta sua». Resta «Tocca un'area per vederla sulla mappa» nella colonna «Aree» (testo d'istruzione, accettabile) |
| U9 scroll a 1366×657 | **ok** per gli scroll; **rilievo R3-41** | Pagina in una schermata (`main` 589/589). Tre colonne scorrevoli (Aree 861/361, centro 548/361, Da raccogliere 579/361), ciascuna con bordo e `overscroll-behavior: contain`. Ma il visore comincia a **y=512 su 657**: della mappa si vedono ~145 px senza scorrere la colonna centrale. È l'aperto R3-41 dichiarato da FE (variante per Stesura): per chi gioca su un portatile è il punto debole della scheda (`giro2-madarame-1366x657.jpg`) |
| U10 peso (375, Kamoshida, pagina intera) | **ok** | 10 immagini da `/api/immagini`, ~831 KB; i soli file grandi sono il logo (428 KB) e lo stemma del Palazzo a piena risoluzione (214 KB), entrambi preesistenti |

Decisione del PM su R3-41 (2026-10-20): visore entro metà altezza alle altezze realistiche, intestazione più compatta, riga
dell'infiltrazione più bassa; Stesura → FE.

### U11 grafica spenta su 5373 (su indicazione del PM; avviso a Test layout prima e «grafica ripristinata» dopo; 04:42:52–04:43:23Z)
| Vista (375) | Esito | Prove |
|---|---|---|
| Intestazione di Madarame | **difetto UX3-5** | Illustrazione caricata presente; lo stemma diventa la lettera «M» (la regola L1 «stemmi sempre visibili» non vale per `EmblemaDungeon`) |
| Riga dell'area e visore | ok (preesistente) | Riga «Modifica · Altro» (UX3-3 sembra già corretto: da verificare quando FE lo segnala); la planimetria nativa sparisce e restano «Nessuna immagine di base» in caratteri minuscoli e il gruppo «+6», come in L2 |
| Memento | **UX3-5** | Stemma → «M»; il resto invariato (168 px) |
Preferenza rimessa com'era (chiave `p5r-preferenze` assente).

Da fare: ~~U6~~ (fatto il 2026-10-20 sull'anteprima, vedi sotto); verifica di UX3-1…UX3-5 quando corretti.

### Avvertenza sui dati (PM, 2026-10-20): i giri 1–2 sono su dati vecchi di 5373
Finché la copia fresca di persona5royal non è installata su 5373 valgono solo le conclusioni su **struttura, testi e grafica**:
UX3-2, UX3-3, UX3-5, U7 (Memento), U8 (testi spariti), U9 (scroll), la grafica spenta. **Da rifare sui dati nuovi**, perché dipendono
dai dati: UX3-1 e U1/U2 (insiemi d'infiltrazione e proposte delle voci del diario), UX3-4 (percentuale e infiltrazione in corso di
Madarame), la posizione del visore di Madarame a 1366×657 (R3-41: numero di aree e lunghezza dei testi), il peso della scheda (U10),
e ogni misura sulla scheda di Madarame (l'utente vi ha inserito i pin finali).

### Giro 4 sull'ANTEPRIMA del Collaudo (5474/3302; codice di pensive alle 04:55Z con L3 e L4; dati 0440Z; solo lettura)
Dati freschi **verificati con segni esatti**: pin 2300 e 2301 presenti su Madarame (API); partita al 2 giugno. Giro finito alle
**04:58Z**, prima del ciclo di Test funzionali che scrive sui Palazzi dell'anteprima dalle 05:00Z: dati originali.
Avviso (Test layout, su indicazione del PM): l'utente ha cambiato altri dati in produzione (Kamoshida ora al 100%); il Collaudo installa
una copia ancora più nuova sull'anteprima. Le prove legate ai dati (UX3-1, UX3-4 su un Palazzo in corso, R3-41) si **rifanno su quella
copia**, controllando i suoi segni esatti nel LEGGIMI prima di partire.
| # | Esito | Prove |
|---|---|---|
| UX3-1 sui dati nuovi | **confermato** (correzione decisa, non ancora nel codice dell'anteprima) | 20/5: insieme vuoto, proposta «Disabilita i sistemi di sicurezza (certa)», collegamento `?infiltrazione=in-corso`; 20/4 proposta «multipla», 1/6 «certa» (`anteprima-diario-0520-768.jpg`) |
| UX3-4 sui dati nuovi | non provabile dalla metro | Madarame al 2/6 è concluso: in La città non è più fra le fermate ma nell'elenco «Non ancora nel mondo» (`anteprima-citta-768.jpg`); aperto senza parametro va su «Infiltrazione 1 di 5», che con tutte completate è anche la regola nuova. Da riprovare su un Palazzo in corso quando c'è |
| R3-41 sui dati nuovi | **confermato** (decisione presa, non ancora nel codice) | Madarame a 1366×657: pagina 589/589, visore a **y=512** (criterio ≤ 328) (`anteprima-madarame-1366x657.jpg`) |
| UX3-2, UX3-3 | **verificati** anche qui | 375 «Modifica · Altro», Elimina non in vista; finestra con «il collegamento «Palazzo di Madarame»» |

### Verifica delle correzioni UX3-1, UX3-4 e prima lettura di R3-41 (5373, dati di 3201; 2026-10-20)
| # | Esito | Prove |
|---|---|---|
| UX3-1 | **verificato** | 768: 20/5 «Palazzo di Madarame» → `?infiltrazione=madarame-disabilita-i-sistemi-di-sicurezza&daVoce=…` → «Infiltrazione 3 di 5 · Disabilita i sistemi di sicurezza», area «Museo, 1P» (`verifica-ux3-1-arrivo-768.jpg`). La riga «Aperta dalla proposta…» aspetta la rotta BE |
| UX3-4 | **verificato** | Metro: Madarame `/guida/dungeon/madarame?infiltrazione=in-corso`, Memento `/guida/dungeon/mementos` |
| R3-41 (a metà) | in corso | visore a **y=358** a 1366×657 (≤ 328 richiesto; era 512), **y=431** a 1024×690 (≤ 345), pagina in una schermata |
| **UX3-6** | **difetto alto** | L'intestazione compatta ha messo l'illustrazione come sfondo velato (opacità 0,30, maschera) dietro il testo da 1024: contraddice la regola dell'utente |

Ricontrollo sull'anteprima (istantanea 05:23:40Z con L3 committato, base p5s verificata: pin 2300 presente): UX3-1 regge (20/5 →
«3. Disabilita i sistemi di sicurezza», `&daVoce`); **UX3-6 presente** (illustrazione 324×183 a opacità 0,30 a 1024×690); visore a y=431.
U6 prenotato al Collaudo.

### Controllo sull'avviso di Test no-reg (3201: 500 sulle mappe con partita fino alle 04:36:07Z, fermi di ~2 min dalle 04:42)
Le mie letture nel visore su 5373: giri 1–2 alle ~03:10–03:35Z (prima dell'errore di L4? — le pagine e i visori si sono caricati con pin e
schede, nessun errore a schermo); grafica spenta 04:42:52–04:43:23Z (pagine caricate, visore con 13 pin e testo di ripiego: BE attivo).
Le conclusioni che dipendono dal visore (UX3-3, UX3-2, U5, R3-41) sono state **rifatte sull'anteprima 3302/5474** (giro 4), che l'avviso
dichiara non toccata: niente da rifare. UX3-5 è chiuso per decisione del PM.

### Anteprima sulla base p5s-2026-10-20-0503Z (05:09Z; stesso codice delle 04:55; solo lettura)
Segni verificati: pin 2300 presente su Madarame; voce del 20/5 ancora con insieme vuoto e proposta «certa». Il codice non è cambiato,
quindi UX3-2 e UX3-3 restano verificati (giro 4) e UX3-1, R3-41 restano come confermati. **UX3-4** ora non è provabile su nessun
Palazzo della partita 1: Kamoshida e Madarame sono conclusi, i successivi non ancora aperti al 2/6. Si prova con una **partita di prova**
sul Collaudo (giorno dentro la finestra di un Palazzo in corso) quando la correzione arriva.

### Criteri di verifica scritti da Stesura (modifiche.md §4, 2026-10-20)
- **UX3-1** (§4.4, §4.1): una voce con proposta apre la prima infiltrazione della proposta; se la proposta non è certa compare la riga
  «Aperta dalla proposta…» con «Conferma». Prova: 20/5 (certa) → «Disabilita i sistemi di sicurezza»; 20/4 (multipla) → riga con «Conferma».
- **UX3-4** (§4.2): dalla metro `?infiltrazione=in-corso`; se sono tutte completate, la prima. Prova: Kamoshida (in corso) e Madarame (100%
  sui dati freschi → la prima, corretto per regola).
- **R3-41** (§4.2): bordo superiore del visore entro metà altezza: **≤ 328 px a 1366×657, ≤ 344 a 1280×689, ≤ 345 a 1024×690**, con
  intestazione e riga dell'infiltrazione compatte; nessun peggioramento a 768 (oggi visore a y=664) e 375.

### Giro 3 su 5373 (solo lettura) — ATTENZIONE: **non** sui dati freschi
Correzione (segnalata da Test layout e Test funzionali): il 3201 **non** ha ancora la copia 0440Z. Madarame ha 225 voci (non 227), i pin
2300/2301 non ci sono (verificato anche da me via API); la parola «Igor» nel 06-01 sta in un altro testo, non è la voce nuova. Il mio
controllo era sbagliato. Valgono quindi solo le verifiche di **struttura e testi** (UX3-2, UX3-3); le righe «confermato» su UX3-1, UX3-4,
R3-41 e Madarame al 100% sono **sui dati vecchi** e vanno rifatte quando BE avvisa che 0440Z è installata sul 3201.
| # | Esito | Prove |
|---|---|---|
| UX3-3 | **verificato** | 375 «Modifica · Altro» (Altro: Aggiungi planimetria, Elimina area); 1024 «Planimetria · Altro»; 1280 icone con titolo |
| UX3-2 | **verificato** | La finestra nomina «il collegamento «Palazzo di Madarame»» |
| UX3-1 sui dati nuovi | **confermato** (correzione decisa dal PM, in attesa) | Le voci di Palazzo del diario (04-11 … 06-01) hanno ancora l'insieme vuoto e una proposta (certa, tranne il 20/4 «multipla»): il collegamento resta `?infiltrazione=in-corso` |
| UX3-4 / U3 Madarame | **confermato** (correzione decisa, in attesa) | Madarame al **100%**, «8 aree · 17 planimetrie · 17 complete»; dalla metro si apre ancora «Infiltrazione 1 di 5» |
| R3-41 a 1366×657 | **confermato** (decisione presa, in attesa) | Pagina 589/589; visore a **y=512** su 657, come sui dati vecchi (`dati-nuovi-madarame-1366x657.jpg`) |
| Osservazione per L4 | — | Accanto all'anello «100%» l'intestazione dice «Tesoro ✗ · Boss ✗»: per chi gioca «100%» e «non concluso» insieme vanno spiegati (tema dell'avanzamento unico, L4) |
| U10 peso | invariato | I dati nuovi aggiungono voci e pin, non immagini: il peso della scheda resta quello misurato (~0,8 MB) |

### U6 Gestione — ciclo sull'anteprima del Collaudo (5474/3302, base p5s-2026-10-20-0503Z; foto «anteprima-ciclo2-ux-L3» 05:26:39Z; 05:27:01–05:30:33Z; tablet 768; solo dati di prova su Madarame, nessuna partita toccata)
Schermate: `schermate-ux/u6-01…u6-04` (768). Ripristino chiesto al Collaudo con l'elenco delle scritture.
| Passo | Tocchi | Esito |
|---|---|---|
| «Aggiungi area» «Prova UX L3 — Sala» + planimetria + immagine, infiltrazione 3 preselezionata | 1 finestra, 1 invio | **ok** — avviso «… aggiunta a Palazzo di Madarame.», l'area **si apre subito nel visore** (criterio «Fatto quando»), chip in «Aree toccate», conteggi 9 aree · 18 planimetrie |
| «Aggiungi planimetria» «seconda versione» | 1 finestra, 1 invio | **ok** — aperta subito; segmenti «piano di prova · si apre per prima» / «seconda versione · nessun pin» chiari |
| «Infiltrazione» (nuova) con «Aree toccate» | 1 finestra: nome, descrizione, «Dove va nella guida», 9 caselle | **ok** — creata come «4. … (4 di 6)», si apre con l'area toccata; nota «È un'infiltrazione della guida, per tutte le partite…» chiara |
| «Modifica aree»: aggiunta «Giardino centrale», spostata su, Salva | 3 tocchi | **ok** — finestra chiara («L'ordine è quello in cui l'infiltrazione le percorre: la prima si apre arrivando… Voci della guida e pin restano dove sono»); ↑ ↓ «Togli» 44 px con aria-label per area; dopo il ricaricamento si apre «Giardino centrale» |
| Elimina area di prova | 2 tocchi (Elimina → Elimina) | **ok** — conferma esemplare: «Si eliminano l'area, le sue 2 planimetrie e i legami con 2 infiltrazioni. Le voci della guida restano… Finisce nel cestino (Impostazioni → Cestino)»; conteggi tornati a 8 · 17 |
| Elimina infiltrazione di prova | 3 tocchi (Modifica testo → Elimina → Confermo) | **ok** — conferma in linea «… le aree del Palazzo restano, con le loro altre infiltrazioni. Finisce nel cestino…»; Confermo/No 44 px; tornati a 5 infiltrazioni |
| Cestino (Impostazioni) | — | **ok** — 2 elementi · 323 kB: «Infiltrazione di Palazzo di Madarame: …» e «Area di Palazzo di Madarame: … con 2 planimetrie e 2 immagini», ognuno con «Rimetti com'era» / «Elimina per sempre» (non usati) |

Osservazioni (non difetti bloccanti, nessuna riga in difetti.md):
- l'area si elimina con una **finestra**, l'infiltrazione con una **conferma in linea**: due gesti diversi per la stessa azione; testi entrambi chiari, quindi resa coerente con L2 da valutare con FE se si vuole uniformare;
- nella modifica in linea dell'infiltrazione il suo «Elimina» sta a pochi centimetri dall'«Elimina» rosso dell'area aperta sotto (a 768 ~340 px più in basso): la conferma protegge, ma l'etichetta potrebbe dire «Elimina l'infiltrazione» / «Elimina l'area»;
- dopo l'eliminazione dell'area non ho visto un avviso (entro 3,5 s), mentre l'aggiunta lo dà; i conteggi però si aggiornano subito.
Esito U6: **superato** (criterio «Fatto quando» rispettato; nessun «scegli una planimetria»; ogni finestra dice cosa si porta via e che le voci restano).
Ripristino del Collaudo: 05:31:31Z, impronta identica alla base dell'anteprima, lavoro da preservare identico. BE.log: 6 scritture 05:27:13–05:30:33Z (201/201/201/200/204/204), tutte quelle dichiarate.
Dato del Collaudo, prima del ripristino: la tabella `area` aveva 140 righe come la foto, ma il contenuto era diverso, quindi almeno un'altra riga di area risultava cambiata dopo l'eliminazione di quella di prova. Dal lato UX l'ordine visibile delle aree di Madarame dopo l'eliminazione era intatto: 1. Entrata del Museo … 8. Sala Principale, «Giardino centrale» 4ª. L'ipotesi è un `ordine` o un `updated_at` toccato da «Aggiungi area» o «Modifica aree». È una questione funzionale, l'ho passata a Test funzionali. **Esito di Test funzionali** (riprodotto su Okumura con gli stessi gesti,
`lotti/L3/funzionali.md` pezzo 8): l'unica riga diversa è `area.updated_at` dell'area aggiunta con «Modifica aree» (qui il Giardino centrale);
legami, ordine, mappe e infiltrazioni tornano identici. È la traccia di una modifica reale, non un dato perso: nessun difetto.
