# L2 «Mondo: aree e planimetrie» — Test user experience

Sessione «Test user experience». Stato: **fatta** (2026-10-20, ciclo 4 sul Collaudo 2222d51f; esito in fondo). Nato in preparazione. Ritmo nuovo (processo.md): ogni pagina che FE segnala pronta
(Quartiere, Area, metro → ingresso) la provo subito; qui sotto i percorsi già pronti e il «prima».
Fonti: requisiti.md (R2-37…R2-42), modifiche.md §4 e §6.4, app.md §3 e §9. «Prima» di Analisi app in `schermate-prima/` (21 viste × 5
misure); i miei in `schermate-ux/`. Regola: la produzione **solo in lettura** (indirizzi e lettura della pagina, nessun clic né localStorage).

## Percorsi da provare (da telefono 375, tablet 768, desktop 1280; per le schermate uniche 1366×657 e 1280×689)
| # | Percorso (chi gioca) | Criterio | Cosa misuro | «Prima» |
|---|---|---|---|---|
| P1 | **Metro → Untouchable** (Central Street) a 375: fermata Shibuya → area → luogo | R2-37: ≤3 tocchi, nessun selettore che cambia posto | tocchi contati, cosa si vede a ogni tocco, se il luogo si trova senza tentativi (nome visibile, non grappoli «+11») | 1 tocco → Central Street a zoom 1 (visore ~240 px), pin raggruppati «+10»/«+11»; i nomi dei pin **non** sono nell'elenco del pannello (solo categorie): Untouchable si trova toccando i grappoli alla cieca, ≥3 tocchi e incerto (`schermate-ux/prima-prod-metro-shibuya-central-street-375.jpg`) |
| P2 | **Metro → finestra d'ingresso** (Shibuya, Yongen-Jaya) e chiusura; Kichijoji senza ingresso | R2-15, R2-22, §4.2.5 | la finestra si capisce («<Area> — ingresso di <Quartiere>»), punto e zoom come prima, «Apri l'area» / «Chiudi» chiari; dopo «Chiudi» l'indietro non la riapre; su telefono foglio dal basso | metro → planimetria sciolta di Central Street (`08-area-central-street`) |
| P3 | **Pagina Quartiere** (Shibuya) dalla scheda de La città | R2-12, §6.4 | si capisce cosa sono le aree e come si entra; «Entra: <area>» al primo colpo d'occhio; carte delle aree con miniatura riconoscibile; luoghi filtrabili come prima; illustrazione L1 al 100%; prima schermata a 1366×657 / 1280×689 | `02-quartiere-shibuya` (a 1280×689 solo intestazione + inizio della mappa incorporata) |
| P4 | **Pagina Area** con versioni (Sottopasso) e senza (Central Street) | R2-13, R2-14, R2-38, R2-41, punto B | visore nel suo spazio (non miniature al posto del visore); segmenti delle versioni comprensibili («inquadratura orientale» / «planimetria completa») con il numero di pin; avviso utile sulla versione senza pin con il pulsante per passare a quella con i pin; cambiare versione non cambia posto; testata + versioni + visore in una schermata a 1366×657 e 1280×689 | `09-area-sottopasso` (versioni come due riquadri grigi con miniature minuscole, visore ~240 px a 375, barra delle azioni tagliata «TO…»), `10-area-sottopasso-speciale`, `19-alias-shibuya-sottopasso` (l'alias apre la versione senza pin) |
| P5 | **Una sola Shibuya**: metro, scheda, indice, briciole, «Dove si trova», schede di negozi/attività/libri, Oggi | R2-15, R2-16, R2-17 | stessa pagina e stesso aspetto da ogni strada; briciole «La città › Shibuya › Central Street» e indietro che risale; in Oggi la metro scende sul posto **con il centro** (punto C) | tre viste diverse da quattro strade (app.md §3); Oggi senza centro (`21-home-oggi`) |
| P6 | **Covo**: metro → sfide (`/guida/covo`) → «Planimetrie del Covo» → area con 5 versioni → «Sfide e Medaglie P del Covo» → ritorno | punto A, R2-07 | il giro si fa senza perdersi, testi chiari (niente «soffitta del Leblanc», G-004); versioni con pochi pin avvisate | `13-covo`, `14-mappa-covo` (oggi nessun collegamento fra le due) |
| P7 | **Diario «Sulla mappa»** (una voce di Central Street, una di Ogikubo) da `/guida/percorso/<data>` e da Oggi | R2-31 | si atterra sull'area giusta con lo spillo selezionato e centrato, come prima; nessun salto in più | `L3/schermate-prima/12-percorso-0518` |
| P8 | **Gestione** su dati di prova (solo in locale, partita di prova; cancellati alla fine): «Aggiungi area», «Aggiungi planimetria», «Modifica area», «Elimina area» → cestino, «Colloca», «Tieni»/«Rimuovi» dell'area dello staff | R2-23…R2-27, §4.5 | finestre comprensibili e in italiano, passi pochi e nell'ordine giusto, conferme che dicono cosa si porta via, foglio dal basso su telefono; l'area nuova compare subito | oggi «Nuova mappa» dell'editor (`17-editor-central-street`) |
| P9 | **Testi e vocabolario** in tutte le viste nuove | R2-39, §4.6 «Nomi nella navigazione», §4.7 | nessun «Mappa/Mappe» come voce di navigazione o titolo nelle pagine nuove; nomi dei posti (pin 1628 «Yongen-Jaya», non «Mappa»); «Area», «Planimetria», «Luogo» col loro senso; testi di §4.7 corretti | «Planimetrie e mappe collegate», «Su: Shibuya», «Modifica mappa» (`09-area-sottopasso`) |
| P10 | **Peso e tempi** di Quartiere e Area a 375 | §4.2 miniature `sizes="96px"` | byte delle immagini al primo schermo e a pagina intera (miniature `l=`), nessuna immagine a piena risoluzione per una miniatura; tempo all'apertura del visore | — |
| P11 | **Grafica predefinita spenta** (solo in locale) su Quartiere e Area | regola di L1 (UX-2/UX-3) | sagome e stemmi presenti, nessun riquadro vuoto, miniature delle aree con ripiego | — |

## Note sul «prima» utili al confronto
- 375: nel visore di un'area la barra delle azioni va a capo e un'azione esce dal bordo («TO…» in `09-area-sottopasso__375x812`, «Torna alla
  partita» in `12-…__375x812`); il visore occupa ~240 px su 812, il resto è pannello (categorie) con un elenco scorrevole annidato
  (`overscroll-behavior: contain`, 924/323 px).
- Le versioni del Sottopasso sono due riquadri 136×136 con miniature di ~60×20 px su fondo grigio: poco leggibili.
- 1280×689 / 1366×657: la pagina del quartiere mostra solo intestazione e inizio della mappa incorporata.

## Esiti
### Pezzo 1 — pagina Quartiere, metro → ingresso, pagina Area (5373, 2026-10-20, ~03:30; partita reale solo in lettura)
| # | Esito | Misure / prove |
|---|---|---|
| P1 metro → luogo (375) | **difetto UX2-1** (e UX2-2) | 1 tocco sulla fermata: finestra «Central Street — ingresso di Shibuya», planimetria grande (~465 px), «Chiudi» e «Apri l'area» da 44 px: bene. Ma il luogo per nome è a **4 tocchi** (fermata → «Apri l'area» → «Pannello» → luogo), perché il pannello «Luoghi qui» parte chiuso. Untouchable è nascosto (non disponibile alla data e fascia della partita) e toccarlo nell'elenco non dà alcun riscontro (UX2-2); con Big Bang Burger pin e scheda arrivano subito. Prima: ≥3 tocchi alla cieca sui gruppi «+N» |
| P2 finestra d'ingresso | **ok** | Titolo chiaro («Central Street — ingresso di Shibuya»), punto e zoom dell'ingresso; «Chiudi» toglie `?ingresso=1` e l'indietro torna a La città senza riaprirla. Nota: a 375 è un riquadro centrato, non un foglio dal basso (UX2-6, nota) |
| P3 pagina Quartiere | **ok con rilievi** (UX2-6) | 375: intestazione con illustrazione L1, «6 aree · 25 luoghi», azioni «Entra: Central Street» (primaria, rossa), «Ingresso», «Aggiungi area»: si capisce come si entra. Aree in carte con miniatura, «N planimetrie · M pin», chip «Ingresso» su Central Street; 3 carte su 6 con «Segna sull'illustrazione · il suo pin manca». Illustrazione nel visore piccola in un riquadro alto (~300 px vuoti); pin di passaggio senza nome. 1280×689: due colonne, illustrazione a sinistra, aree a destra, buona (`pezzo1-quartiere-1280x689.jpg`) |
| P4 pagina Area | **difetti UX2-3, UX2-4, UX2-5** | Briciole «La città › Shibuya › Sottopasso», «‹ Shibuya» che risale. Versioni a segmenti chiare («inquadratura orientale · 16 pin · si apre per prima», «planimetria completa · nessun pin»), fila scorrevole con barra visibile; avviso sulla versione senza pin con «Passa a «inquadratura orientale»»: **ottimo**. Però a 375 la testata con tre pulsanti di gestione («Elimina area» rosso in primo piano) spinge il visore a y=480 (UX2-3); il titolo del visore dice «Sottopasso Speciale» (UX2-4); briciole doppie e «Aree vicine» ripetuto (UX2-5). 1280×689: testata in una riga, versioni e visore nella prima schermata (visore 273..693, `main` 625/621: i 4 px li valuta Test layout) |
| P9 testi | **ok con UX2-4/UX2-5** | Chip del visore «Planimetria»; pin di passaggio col nome della meta (pannello: «Piazza della stazione», «Sottopasso»); «Su: Shibuya» resta nel pannello. Nessun «Mappa» nelle pagine nuove, salvo l'etichetta d'icona «Modifica planimetria» corretta |
| P10 peso | **ok** | Quartiere a 375, pagina intera: 10 immagini da `/api/immagini`, ~726 KB, di cui 428 KB il logo (già prima); nessuna immagine piena per una miniatura |
| P5, P6, P7, P8, P11 | da fare | La città («Aree della città», da collocare), carta del Covo, indice, editor non ancora pronti (messaggio di FE); P8 richiede una partita di prova; P11 con l'avviso a Test layout |

Schermate del pezzo: `schermate-ux/pezzo1-*.jpg`.

### Verifica delle correzioni UX2-1…UX2-6 e pezzo 2 (5373, 2026-10-20 ~04:20; partita reale solo in lettura)
| # | Esito | Misure / prove |
|---|---|---|
| UX2-1 | **verificato** | «Luoghi qui» aperto sotto il visore a 375; metro → «Apri l'area» → luogo = **3 tocchi** (R2-37 rispettato) |
| UX2-2 | **verificato** | Untouchable dall'elenco: scheda con «Non ancora» e «Niente in vendita in questo momento della partita» |
| UX2-3 | **verificato** | Testata «Modifica · Planimetria · Altro», visore a y=328 (era 480) |
| UX2-4 | **verificato** | Titolo del visore «Sottopasso»; l'editor dice ancora «Sottopasso Speciale» (tecnico, L11) |
| UX2-5 | **verificato** | Una riga di briciole; «Aree vicine» una volta |
| UX2-6 | **riaperto** | Nomi dei passaggi solo al passaggio del mouse o sul pin selezionato (invisibili al tocco); vuoto di ~300 px nel riquadro a 375 invariato |
| P5 una sola Shibuya | **ok** | `/guida/mappe/shibuya` → `/guida/citta/shibuya`; `/guida/mondo/quartiere/shibuya` → `/guida/citta/shibuya` (redirect di ~3 s); Negozi → `/guida/citta/shibuya`; metro → `/guida/citta/shibuya?ingresso=1`; alias `shibuya-sottopasso` → Sottopasso con «planimetria completa» |
| P6 Covo | **ok** | Fermata della metro → `/guida/covo` (cartellino «dal menu di gioco, dal 6/5»); in cima alla pagina delle sfide la carta «Planimetrie del Covo · un'area di Yongen-Jaya» → area con 5 versioni (si apre su «settore d'ingresso · 3 pin · si apre per prima») e «Sfide e Medaglie P del Covo» in testata per tornare; `/guida/mappe/covo-dei-ladri` → area sulla versione `covo-dei-ladri` (`pezzo2-covo-sfide-375.jpg`, `pezzo2-covo-area-375.jpg`) |
| P7 diario | **ok** (a campione; il giro completo delle 75 voci è di Test no-reg, NR2-1 verificato) | `/guida/mappe/shibuya-central-street?spillo=1515` → `/guida/citta/shibuya/central-street?spillo=1515` con la scheda «Sala giochi (Central Street)» aperta (`pezzo2-diario-spillo-1515-375.jpg`) |
| P8 editor (solo vista) | **ok** | Nessun «Nuova mappa» né «Mappa collegata»; nella scheda «Mappa» niente tipo né genitore e la frase «Planimetria dell'area «Sottopasso» (Shibuya), versione «planimetria completa»: l'area e le sue versioni si cambiano dalla pagina dell'area»; «Chiudi» → `/guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale`. Restano «Salva mappa», «Elimina mappa», titolo «Sottopasso Speciale» (tecnico, L11) (`pezzo2-editor-sottopasso-1280.jpg`). Le finestre «Aggiungi area / planimetria» con scrittura: da provare con una partita di prova |
| Indice Mappe | **ok** | Radici: Tokyo e i Palazzi; il Covo non è più una radice. Testi «298 spilli · 52 mappe»: vocabolario dell'indice di L11 (`pezzo2-indice-mappe-375.jpg`) |
| La città, «Aree della città» | **difetto UX2-7** | A 1280 la carta dello staff è corretta (nome, «Da verificare», «2 planimetrie · 0 pin», «Tieni», «Rimuovi»); a 768 e 375 il testo è schiacciato a ~40 px e si legge una lettera per riga. Intro della pagina nuova chiara: «tocca un quartiere sulla mappa o una scheda per aprirlo, con le sue aree, i luoghi, gli orari e gli sblocchi». «Planimetrie da collocare» assente perché 0 (corretto) |

Difetti aperti: **UX2-6** (bassa, riaperto), notificato a FE. **UX2-7 verificato** (2026-10-20): carta dello staff 333×166 a 375 e
359×166 a 768, leggibile (`verifica-ux2-7-aree-della-citta-*.jpg`).

### Blocco con scrittura e grafica spenta sul Collaudo (5473/3301, commit 8e75abbb, foto «L2-ciclo1-ux»; 2026-10-20 02:03:35–02:06:53Z)
Avviso a Test layout prima e «grafica ripristinata» dopo; ora esatta al Collaudo per il ripristino. Schermate `schermate-ux/collaudo-*.jpg`.
| # | Esito | Misure / prove |
|---|---|---|
| Aggiungi area (Kichijoji, 375) | **ok con UX2-9 a, d** | Finestra a foglio con titolo «Aggiungi un'area a Kichijoji», campi Nome, Immagine («PNG, JPEG o WEBP, fino a 8 MB. Resta nella tua istanza.»), Etichetta facoltativa, «Dove sta in Kichijoji · Tocca l'illustrazione dove si entra nell'area: lì comparirà il suo pin», anteprima dell'immagine; tutti i campi da 45 px. Dopo l'invio: avviso «Prova UX — Galleria aggiunta a Kichijoji.», «2 aree», carta «Prova UX — Galleria · 1 planimetria · nessun pin», senza ricaricare. Ma il riscontro del punto è tecnico («39.94%») e il pin appena creato non si vede (quartiere non ancora aperto) |
| Aggiungi planimetria | **ok** | Finestra chiara («Diventa la planimetria che … mostra aprendola»); la versione compare subito come segmento «seconda versione · nessun pin» e si apre nel visore |
| Modifica area | **ok con UX2-9 c** | Nome con «L'indirizzo della pagina non cambia.», scelta della planimetria che si apre per prima, versioni con ↑/↓ (50×44), «Apri nell'editor», «Elimina»; la rinomina aggiorna titolo e briciole e l'indirizzo resta |
| Elimina area | **difetto UX2-8** | Conferma chiara, ma dopo «Elimina» il server risponde 409 e non si elimina nulla |
| Tieni (staff) | **ok** | Un tocco, avviso «Area riservata allo staff: tenuta.», «Da verificare» sparisce. Dopo «Tieni» «Rimuovi» non c'è più: si toglie solo dalla pagina dell'area («Altro → Elimina area», oggi bloccato da UX2-8). «Rimuovi» quindi non provato |
| Colloca | **non provabile** | 0 planimetrie da collocare: la sezione giustamente non c'è |
| Grafica spenta (Shibuya, Sottopasso) | **ok** | Intestazione con illustrazione caricata e sagoma; segmenti delle versioni con un'icona di ripiego, nessun riquadro vuoto. Le planimetrie native (grafica predefinita) spariscono: nel visore «Nessuna immagine di base» in caratteri minuscoli e pin raggruppati «+16», come prima di L2 (non è una regressione del lotto) |

Difetti nuovi: **UX2-8** (media), **UX2-9** (bassa).

### Verifica di UX2-6, UX2-8, UX2-9 e LAY2-4 su 5373 (solo lettura, finestre annullate; 2026-10-20)
- UX2-6 **verificato** (etichette sempre visibili su touch, riquadro 333×241); residuo **UX2-10** (bassa): etichette sovrapposte e
  «Central Street» sotto i pulsanti dello zoom.
- UX2-8: il **testo** della conferma dice cosa si porta via (verificato); l'**invio** e «Rimuovi» si provano sul Collaudo.
- UX2-9 a, b, c **verificati**; d sul Collaudo.
- LAY2-4 (di Test layout, lato UX): a 375 «Luoghi qui» sta nella pagina sotto il visore; il tocco su un luogo riporta il visore in vista
  con il pin selezionato e la scheda aperta (`verifica-lay2-4-luoghi-qui-375.jpg`).

### Giro breve sul Collaudo de67b349 (5473, solo lettura; durante il ciclo 2 di Test funzionali; 2026-10-20)
| Punto | Esito | Misure |
|---|---|---|
| R2-37 metro → luogo (375) | **ok** | fermata → «Apri l'area» → luogo = 3 tocchi; «Luoghi qui» ora è nella pagina sotto il visore (titolo a y≈877, si raggiunge scorrendo), pannello del visore chiuso su telefono; visore 520 px da y=328 (`collaudo2-central-street-375.jpg`) |
| UX2-2 | **ok** | Untouchable dall'elenco → visore riportato in vista (y=136) con la scheda «Non ancora · Niente in vendita in questo momento della partita» (`collaudo2-untouchable-375.jpg`) |
| UX2-6 / UX2-10 | ok / **UX2-10 ancora aperto** | Etichette sempre visibili su touch; sovrapposte e «Central Street» sotto lo zoom (`collaudo2-shibuya-etichette-375.jpg`) |
| Area a 1280×689 | **ok** | Pannello «Luoghi qui / Aree vicine» aperto accanto al visore; `main` 621/621, pagina in una schermata (`collaudo2-sottopasso-1280x689.jpg`) |
| Miniature delle aree (375) | ok | Si caricano scorrendo (caricamento differito) |
Prove con scrittura (UX2-8 invio, UX2-9 d, «Rimuovi» dello staff): prenotate al Collaudo come **ciclo 3**, dopo il ciclo 2 di Test funzionali.

**UX2-10 verificato** su 5373 (2026-10-20): etichette intere e senza sovrapposizioni a 375; quella che coprirebbe un'altra
(«Piazza della stazione») si nasconde finché non c'è posto o non si tocca il suo pin (`verifica-ux2-10-etichette-375.jpg`).

### Ciclo 3 sul Collaudo (600af81c = codice finale di L2; foto «L2-ciclo3-ux-600af81c»; 2026-10-20 02:26:34–02:28:00Z)
| Punto | Esito | Prove |
|---|---|---|
| UX2-10 | **ok** | Etichette intere, «Piazza della stazione» nascosta finché non c'è posto (`ciclo3-shibuya-etichette-375.jpg`) |
| Carta del Covo (LAY2-6, lato UX) | **ok** | «Planimetrie del Covo · un'area di Yongen-Jaya» in cima alla pagina delle sfide, leggibile (`ciclo3-covo-375.jpg`) |
| UX2-9 d | **verificato** | Dopo «Aggiungi area» il pin nuovo è selezionato con la scheda e «Vai: …», anche a quartiere non aperto |
| UX2-8 | **verificato** | Elimina area con conferma → cestino, ritorno al quartiere; «Rimuovi» dello staff → cestino con avviso |
| Nuovi | **UX2-11, UX2-12** (bassi) | «Apri sull'atlante» in «Dove si trova»; testi del cestino senza le aree del mondo e con etichette tecniche |

### Ciclo 4 sul Collaudo (2222d51f, foto «L2-ciclo4-ux-2222d51f»; 2026-10-20 02:37:15–02:37:22Z)
**UX2-12 verificato**: «Rimuovi» dello staff → Cestino con l'introduzione che nomina le aree dei quartieri e della città e la voce
«Area di Tokyo: Area riservata allo staff · con 2 planimetrie», senza etichette tecniche (`ciclo4-cestino-375.jpg`).

**Esito della fase ux di L2: fatta.** Difetti UX trovati 12: UX2-1…UX2-10 e UX2-12 corretti e verificati; UX2-11 spostato dal PM in L5.

Decisioni del PM sul ciclo 3: **UX2-11 spostato in L5** (R5-20c); **UX2-12 si corregge in L2**, da verificare sul Collaudo quando arriva.
Fase ux di L2 in «difetti» fino ad allora. Ripristino del ciclo 3: impronta di 3301 identica alla base di L2 (04:28:17 locali,
`esiti-collaudo/cicli-dati.md`, `BE-ciclo3-ux.log`: 5 scritture, tutte quelle dichiarate).

Ripristino del Collaudo (2026-10-20 04:07:14 locali): impronta di 3301 **identica** alla foto e alla base di L2
(`esiti-collaudo/cicli-dati.md`, `BE-ciclo1-ux.log`). Il Collaudo ha trovato nel log anche una `POST /api/mappe/piante-citta/kichijoji/scarica`
alle 02:03:31Z (400, nessuna scrittura): è lo scarico automatico che parte **aprendo** la pagina di Kichijoji (LAY-2). Va saputo per ogni
prova «di sola lettura» su quartieri senza illustrazione: visitarli prova una scrittura.

**Restano da provare (indicazione del PM, 2026-10-20):** P8 con scrittura (Aggiungi area e planimetria, Colloca, Tieni/Rimuovi) e
P11 a grafica spenta, **sull'istanza di Collaudo 5473/3301 portata su L2**: le scritture dopo la foto dei dati del Collaudo e con il suo
ripristino (PROCEDURA-DATI.md); la grafica spenta con avviso prima a Test layout e «grafica ripristinata» alla fine. Sui dati di sviluppo
5373 nessuna scrittura.
