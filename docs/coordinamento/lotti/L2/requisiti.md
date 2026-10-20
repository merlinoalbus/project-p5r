# L2 «Mondo: aree e planimetrie» — requisiti

Autore: sessione «Analisi requisiti» (2026-10-20). Fonti: piano `docs/analisi/2026-10-20-piano-razionalizzazione.md` (righe 89, 96,
160-167, 191-201, 220-222, 233-236, 240-257, 362-363, 415, 434), `ricognizione-L2-mondo.md`, memoria «Gerarchia del mondo»,
«Un punto di modifica», «Lavoro da preservare», «Tre formati», «Altezze realistiche», «Scroll annidati», DECISIONI 2026-10-20 (D2).
Conteggi di contesto presi in sola lettura sulla copia di produzione `prod-20261020/gioco.db` (il censimento vero lo fa Analisi dati).

## Obiettivo
Il mondo segue la gerarchia dell'utente **Città (Tokyo) → Quartiere → Area → Planimetrie (versioni) → Luoghi**. Nasce l'entità **Area del
mondo** (quartiere, nome, ordine, planimetria predefinita); le mappe di oggi che rappresentano zone di un quartiere diventano
**planimetrie** (versioni) della loro Area. Ogni oggetto ha **una casa**: la pagina Quartiere (`/guida/citta/<quartiere>`) e la pagina
Area (`/guida/citta/<quartiere>/<area>`), raggiunte nello stesso modo da ogni punto (metro, briciole, pin di passaggio, «Dove si trova»,
schede, indice). L'ingresso del quartiere diventa «area d'ingresso + punto», gestito in una finestra propria. Si aggiungono aree e
planimetrie dalla pagina del livello sopra («Aggiungi area», «Aggiungi planimetria»), con eliminazione nel cestino.

**Fatto quando** (piano, riga 415): Shibuya si apre in un solo modo da ogni punto; Sottopasso Speciale è una versione; il Covo sta nel suo
posto (D2).

## Perimetro misurato (contesto, da confermare con `dati.md`)
- 29 mappe di zona sotto i quartieri o senza genitore: 26 di tipo `luogo` (21 sotto 6 quartieri + Tokyo, 5 del Covo `nativo-rmap-022-1-*`
  senza genitore) e 3 di tipo `area` sotto un quartiere (`nativo-rmap-009-2-0` Vicoli di Yongen-Jaya,
  `yongen-java-banchina-della-metropolitana` — chiave con refuso «java» —, `shibuya-tornello-della-linea-ginza-aoyama-itchome` sotto
  Shujin Academy).
- Shibuya: 7 mappe → 6 aree (Sottopasso Speciale `001-2-1` è versione del Sottopasso `001-2-0`, già nello stesso gruppo d'immagini).
- Gruppi d'immagini già presenti fuori dai Palazzi: Sottopasso (2), Covo dei Ladri (5), Area riservata allo staff sotto Tokyo (2).
- `quartiere_ingresso`: 2 righe (Yongen-Jaya → Vicoli, Shibuya → Central Street), 22 quartieri senza ingresso; 15 quartieri senza aree
  (piano riga 363: restano senza aree finché non se ne aggiungono).
- Pin sulle mappe del mondo (città, quartieri, zone): circa 300, di cui circa 185 creati dall'utente; 70 passaggi (censimento di Analisi
  dati; la mia prima lettura, 62, contava solo i `riferimento_tipo='mappa'` su città/quartieri/zone di tipo `luogo`), di cui 8 individuati dalla ricognizione come pin di passaggio fra aree (id 1625-1626, 1630-1635).

## Criteri di accettazione
Tipo: **F** funzionale (API + browser), **UX** esperienza, **NR** no-reg, **L** layout. Ogni riga è provabile da sola.

### Modello e migrazione
- R2-01 [F] Esiste l'entità Area del mondo con chiave stabile, quartiere, nome, ordine e planimetria predefinita; l'API del quartiere la restituisce nell'elenco delle sue aree, ordinate.
- R2-01b [F] Un'Area può stare anche a livello di città, sotto Tokyo, senza quartiere. È il caso dell'«Area riservata allo staff», decisione dell'utente del 2026-10-20. Ha il segno «da verificare», visibile nella pagina dell'Area e nell'indice. Si raggiunge dalla pagina della Città. Il segno si toglie, o l'Area si elimina nel cestino, con un gesto dell'utente.
- R2-02 [F] Ogni mappa di zona del mondo (le 29 sopra, salvo i casi dubbi decisi diversamente) appartiene a esattamente un'Area; nessuna mappa di zona del mondo resta senza Area dopo la migrazione, tranne quelle elencate «da collocare».
- R2-03 [F] Ogni Area ha almeno una planimetria e una planimetria predefinita che appartiene a lei.
- R2-04 [F] Una planimetria con più versioni mostra l'etichetta della versione (es. «inquadratura orientale», «planimetria completa») presa dai gruppi d'immagini di oggi; l'ordine delle versioni è quello visibile oggi.
- R2-05 [F] Shibuya ha 6 aree: Piazza della stazione, Sottopasso (versioni: inquadratura orientale, planimetria completa = ex «Sottopasso Speciale»), Central Street, Centro comm. sotterraneo, Tornello della linea Ginza, Banchina della metropolitana.
- R2-06 [F] «Sottopasso Speciale» non compare più come area, né nell'elenco del quartiere né nell'indice né nella ricerca, ma come versione del Sottopasso.
- R2-07 [F] Il Covo dei Ladri è un'Area di Yongen-Jaya (D2) con 5 planimetrie-versione (settore d'ingresso, planimetria completa, porzione occidentale, porzione settentrionale, inquadratura orientale); non è più una mappa senza genitore.
- R2-08 [F] La migrazione è append-only, con ID successivo all'ultimo su `newreview` al momento dell'implementazione, e copia di sicurezza all'avvio; riapplicata su una copia già migrata non cambia nulla (idempotenza provata da test).
- R2-09 [F] La terza copia del legame quartiere↔mappa (colonne `mappa.entita_*` dei quartieri) non è più la fonte: il quartiere di un'Area e di una planimetria si legge in un solo posto (piano riga 199). Se la colonna resta per compatibilità, nessun lettore ne dipende (elenco dei lettori in `app.md`).
- R2-10 [F] La regola della migrazione 054 che oggi deduce i legami delle mappe del mondo è sostituita o neutralizzata: un riavvio del BE e un import del pacchetto non ricreano mappe di zona senza Area né duplicano Aree.
- R2-11 [F] Import ed export del pacchetto di gioco portano le Aree del mondo e il legame planimetria→Area; un pacchetto esportato e reimportato su una copia restituisce le stesse Aree, planimetrie, versioni e predefinite.

### Pagine e navigazione («una casa»)
- R2-12 [F] `/guida/citta/<quartiere>` è l'unica pagina del quartiere: illustrazione con i pin delle aree, elenco delle aree con miniatura (immagine dal risolutore di L1), elenco dei luoghi filtrabile, ingresso.
- R2-13 [F] `/guida/citta/<quartiere>/<area>` è l'unica pagina dell'Area: visore sulla planimetria predefinita, selettore delle versioni, luoghi presenti, aree vicine (raggiungibili dai pin di passaggio).
- R2-14 [F] Il selettore delle versioni cambia solo la planimetria mostrata, resta nella stessa Area e non cambia l'indirizzo dell'Area (l'eventuale versione scelta può stare nella query); non porta mai ad altre aree.
- R2-15 [F] Da ciascuno di questi punti si arriva alla stessa pagina Quartiere di Shibuya (stesso indirizzo `/guida/citta/shibuya`): fermata della metro, briciole, scheda della città (La città), indice Mappe, ricerca, collegamento dal diario o da una scheda; le 4 strade diverse misurate dalla ricognizione si riducono a una (elenco «prima/dopo» per strada in `funzionali.md`). Dalla metro la pagina si apre **sull'Area d'ingresso, nel punto e con lo zoom dell'ingresso** (R2-22); dalle altre strade la stessa pagina si apre nella sua vista d'insieme del quartiere. È la stessa pagina adattata al punto d'arrivo, non una seconda vista.
- R2-16 [F] Da ciascuno di questi punti si arriva alla stessa pagina Area: elenco aree del quartiere, pin dell'area sull'illustrazione del quartiere, pin di passaggio da un'area vicina, «Dove si trova» di un luogo, indice Mappe, briciole.
- R2-17 [F] Le briciole seguono la gerarchia (Tokyo › Shibuya › Central Street) e l'indietro risale la gerarchia (dall'Area al Quartiere, dal Quartiere alla Città).
- R2-18 [F] Gli indirizzi vecchi delle mappe del mondo (`/guida/mappe/<chiave>` di quartieri, zone e versioni, comprese le chiavi del Covo e di Sottopasso Speciale) rimandano alla nuova casa (Quartiere o Area, con la versione giusta selezionata) invece di dare 404 o una vista diversa.
- R2-19 [F] I pin di passaggio fra aree (gli 8 individuati, più gli altri `riferimento_tipo='mappa'` verso mappe di zona) portano alla pagina dell'Area di destinazione, non alla mappa sciolta.
- R2-20 [F] L'editor delle mappe (`/guida/mappe/<chiave>/modifica`) resta raggiungibile da una planimetria per pin, ritagli e passaggi, e da lì si torna alla pagina dell'Area.

### Ingresso del quartiere
- R2-21 [F] L'ingresso di un quartiere è «area d'ingresso + punto»: si sceglie l'area da un elenco delle aree del quartiere, poi il punto sulla sua planimetria predefinita, in una finestra propria (non più in fondo alla pagina).
- R2-22 [NR] I due ingressi esistenti (Yongen-Jaya → Vicoli, Shibuya → Central Street) restano con la stessa area e lo stesso punto (x, y, zoom) di oggi; la metro apre la pagina del Quartiere (R2-15) posizionata su quell'Area d'ingresso, in quel punto e con quello zoom, come oggi.

### Gestione (Aggiungi, Modifica, Elimina)
- R2-23 [F] Dalla pagina Quartiere «Aggiungi area» chiede nome, posizione sull'illustrazione del quartiere (crea il pin di passaggio) e prima planimetria con immagine; l'area nuova compare subito nell'elenco, sull'illustrazione e nell'indice, senza ricaricare.
- R2-24 [F] Dalla pagina Area «Aggiungi planimetria» chiede immagine (obbligatoria), etichetta della versione e se diventa la predefinita; il ruolo dell'immagine si deduce (regola di L1), non si chiede.
- R2-25 [F] Rinominare un'Area, cambiarne l'ordine o la planimetria predefinita si fa dalla pagina Area (o dall'elenco del Quartiere) e si vede ovunque: elenco, briciole, indice, metro (dove compare), ricerca.
- R2-26 [F] Eliminare un'Area o una planimetria la manda nel cestino, da cui si rimette al suo posto con versioni, pin e predefinita; l'eliminazione di un'Area con luoghi o pin chiede conferma e dice cosa porta con sé.
- R2-27 [F] Non esiste più nel mondo un modo di creare una mappa «sciolta» senza Area: «Nuova mappa» generica non c'è; le mappe senza posto si vedono in una lista «da collocare» da cui si assegnano a un'Area.
- R2-28 [F] Le modifiche dell'utente alle Aree (nome, ordine, predefinita) sopravvivono a un aggiornamento del pacchetto, come oggi per le mappe (`origine='utente'`, «Ripristina» al valore della guida dove il valore viene dalla guida).

### Lavoro da preservare e non regressione
- R2-29 [NR] Ogni pin delle mappe del mondo (città, quartieri, zone; ≈300) resta sulla stessa immagine, nella stessa posizione, con lo stesso nome, riferimento e condizioni, e apre la stessa cosa; confronto pin per pin prima/dopo sulla copia di produzione.
- R2-30 [NR] Gli stati di partita legati ai pin e ai luoghi del mondo (raccolti, visitati) restano uguali per la partita reale copiata e per una partita di prova.
- R2-31 [NR] Il diario dal 04-01 al 06-01 (255 voci sulla copia di produzione 0440Z del 2026-10-20; 254 sulla copia precedente) resta invariato in testo, ordine, giorno, fascia, uid e spunte; i suoi collegamenti a quartieri, luoghi e mappe portano alla nuova casa giusta.
- R2-32 [NR] Kamoshida (169 voci, 359 pin) e Madarame (227 voci e 254 pin utente sulla copia 0440Z, impronta 263; 225/252 sulla copia precedente, base confermata dall'utente; 196/250 il 2026-10-19) non cambiano: L2 non tocca mappe, voci né pin dei Palazzi (impronta prima/dopo identica su quelle tabelle).
- R2-33 [NR] I Memento (radice `dedalo`, quartiere «Entrata dei Memento») restano come sono: nessuna Area del mondo creata per loro, la loro navigazione invariata.
- R2-34 [NR] Le immagini mostrate restano quelle del risolutore di L1 (caricata → asset → icona) in visore, miniature, indice, schede e intestazioni; nessuna regressione su La città, metro e intestazioni del quartiere.
- R2-35 [NR] Gli altri lettori delle mappe del mondo (mappa di Tokyo, metro e atterraggi, «Dove si trova», accesso al mondo, scheda luogo, negozi, condizioni sui quartieri) funzionano come prima; elenco dei lettori e loro prova in `noreg.md`.
- R2-36 [NR] Typecheck e lint verdi; i test mirati delle aree toccate (citta, mappe, quartiere, migrazione nuova) verdi con output grezzo.

### Esperienza e layout
- R2-37 [UX] Dal telefono durante la partita: dalla metro al luogo cercato (es. Untouchable a Central Street) in al più 3 tocchi (fermata → area → luogo), senza passare da selettori che cambiano posto.
- R2-38 [UX] La pagina Area mostra il visore della planimetria nel suo spazio, non miniature al posto del visore; le figure stanno al 100% di opacità, non come sfondi velati; la grafica resta curata come oggi.
- R2-39 [UX] I testi usano il vocabolario di L0: «Area» per la zona, «Planimetria» per l'immagine/versione, «Luogo» solo per l'attività; «Mappa» non compare nell'interfaccia delle nuove pagine.
- R2-40 [L] Pagine Quartiere e Area, finestra d'ingresso, «Aggiungi area», «Aggiungi planimetria» e lista «da collocare» senza scorrimento orizzontale a 1280, 768 e 375; bersagli ≥44 px.
- R2-41 [L] A 1366×657 e 1280×689 la pagina Area mostra il visore e il selettore delle versioni nella prima schermata; nessuno scroll annidato che trascina la pagina (overscroll contenuto, area scorrevole evidente).
- R2-42 [L] Su desktop (≥1024) l'elenco delle aree e quello dei luoghi del quartiere usano più colonne; su tablet due; su telefono colonna piena e finestre come fogli dal basso.

## Decisioni coinvolte
| Decisione | Scelta consigliata applicata, da confermare | Effetto sui criteri |
|---|---|---|
| D2 Covo dei Ladri | **Area di Yongen-Jaya**: le 5 planimetrie `nativo-rmap-022-1-*` diventano le sue versioni (scelta di ordinamento dell'app: nel gioco il Covo si apre dal menu, G-004) | R2-07, R2-18; la fermata della metro del Covo porta alla pagina dell'Area (vedi dubbio 4) |
| D1 Ordine dei lotti | L0 → L11 | L2 parte dopo la consegna di L1 |
| D3 Iweleth | Solo come dedalo dei Memento | Non tocca L2 (è dei Palazzi/Memento) |

## Lavoro dell'utente da preservare toccato dal lotto
- Diario 04-01..06-01: solo i collegamenti verso quartieri/luoghi/mappe (R2-31); niente riscritture delle voci.
- Kamoshida e Madarame: non toccati (R2-32), ma l'impronta va confrontata perché le migrazioni toccano la tabella `mappa` condivisa.
- Non nell'elenco formale ma lavoro manuale dell'utente: ≈185 pin creati sulle mappe del mondo, le immagini caricate per i quartieri
  (2026-10-18), i nomi rivisti (`nome_rivisto`) e i gruppi d'immagini definiti a mano. Trattarli con la stessa garanzia (R2-29, R2-04).

## Dipendenze
- **L1 consegnato** (risolutore d'immagine e ruolo dedotto: le miniature delle Aree e la regola del ruolo in «Aggiungi planimetria» lo usano).
- L0 (vocabolario) consegnato.
- Consumato da **L5** (luogo con quartiere e Area, «Aggiungi luogo» sulla planimetria) e **L11** (indice Mappe come albero, ricerca globale):
  L2 non deve anticiparli, ma il modello deve permettere a L5 di legare il luogo all'Area (oggi 51 luoghi su 93 senza area, ricognizione).
- Parallelo a **L3** (aree dei Palazzi): stesse parole e stessi gesti («Aggiungi area / planimetria», versioni, predefinita); le due entità
  possono restare separate, ma l'interfaccia deve comportarsi allo stesso modo (da verificare in `modifiche.md`).

## Casi dubbi da approvare (soluzione prudente proposta)
1. **Shujin Academy su tre piani** (`002-0-0/1/2`, «Edificio principale 1P / Edificio laboratori 1P» ecc.): un'Area per piano o un'Area
   «Edifici» con tre versioni? Prudente: un'Area per piano (sono zone diverse, non inquadrature), reversibile unendole dopo.
   **Esperto della guida (G-001, certezza media-alta)**: nel gioco il piano è la zona (destinazioni separate del viaggio rapido), e ogni
   planimetria `002-0-*` copre lo stesso piano di entrambi gli edifici → **un'Area per piano**, nome dal piano (es. «Edificio principale 2P»);
   la Biblioteca `002-8-0` è una zona a sé. Resta da approvare solo il nome delle Aree.
2. **Area riservata allo staff sotto Tokyo** (`150-3-0/1`, gruppo già esistente): non c'è un quartiere. Prudente: lasciarla «da collocare»
   (nessuna Area inventata), con la decisione all'utente; oppure Area della Città. Da approvare.
   **Esperto della guida (G-002, «non risulta»)**: la guida non nomina un'area dello staff; forse lo studio televisivo della gita del 9 giugno,
   non dimostrato → resta **«da collocare»**; solo l'utente, guardando le due planimetrie, può dire dove va.
   **Deciso dall'utente (2026-10-20, tramite il PM)**: l'«Area riservata allo staff» si aggancia a **Tokyo, a livello di città**, come
   **area a sé marcata «da verificare»**, con le due planimetrie `150-3-0`/`150-3-1` come versioni. Se tenerla o toglierla si decide dopo.
   Chiuso (R2-01b).
3. **Banchina Aoyama Itchome sotto Shujin Academy** (`shibuya-tornello-della-linea-ginza-aoyama-itchome`, tipo `area`) e **Banchina della
   metropolitana di Yongen-Jaya** (chiave con refuso `yongen-java-…`): diventano Aree del quartiere in cui stanno oggi, chiavi invariate
   (il refuso non si corregge: le chiavi le citano pin e link). **Esperto della guida (G-003, certezza alta)**: Aoyama-Itchome è la
   fermata della scuola, raggiungibile dal Cortile e disponibile dall'inizio → **resta Area di Shujin Academy** (chiuso).
4. **Fermata del Covo sulla metro**: oggi la fermata «Covo dei Ladri» porta a `/guida/covo`, la pagina delle sfide e delle Medaglie P
   (rilievo di Analisi app), non alle planimetrie. Con D2 il Covo diventa un'Area di Yongen-Jaya, ma la fermata non deve perdere la sua
   destinazione. Prudente: la fermata continua a portare a `/guida/covo` (sfide e Medaglie P, invariata); la pagina `/guida/covo` prende un
   collegamento all'Area del Covo (planimetrie), e l'Area del Covo uno alla pagina delle sfide. Da approvare se la fermata debba invece
   aprire l'Area. R2-07 e R2-18 non cambiano `/guida/covo`.
   **Esperto della guida (G-004)**: nel gioco il Covo (esclusivo Royal) non è la soffitta del Leblanc né un posto della città: si apre
   dall'opzione del menu di gioco, dal 6 maggio (gruppo formato il 5/5). Quindi D2 («Area di Yongen-Jaya») è **una scelta di ordinamento
   dell'app**, non un dato del gioco: nei documenti e nei testi non va motivata con «è la soffitta del Leblanc». La fermata della metro non
   ha corrispondente nel gioco: la soluzione prudente (resta su `/guida/covo`) non contraddice la fonte.
5. **Sottopasso: planimetria predefinita** `001-2-0` (inquadratura orientale) e la «trappola degli alias» citata dalla ricognizione: la
   predefinita resta quella che si apre oggi; gli alias che puntano a `001-2-1` aprono il Sottopasso con la versione «planimetria completa».
6. **Aula non collegata** (`002-6-0`; per l'Esperto, G-001, è l'aula 2-D: una stanza raggiunta da «Edificio principale 2P», non una zona
   del viaggio rapido — prudente: resta un'Area propria del quartiere, collegabile a 2P da un pin di passaggio messo dall'utente) e **14 aree senza passaggio dal quartiere** (censimento di Analisi dati; la ricognizione diceva 12): diventano Aree normali, senza creare pin automatici; l'elenco
   finisce in un «da completare» per l'utente.
7. **7 luoghi con doppio pin** e **51 luoghi senza area**: L2 non li corregge (è L5), ma non deve peggiorarli; l'elenco passa a L5.
8. **Slug dell'Area nell'indirizzo**: dal nome italiano di oggi (es. `central-street`, `sottopasso`); se l'utente rinomina, l'indirizzo
   resta stabile (slug fissato alla creazione) — da confermare.
9. **Etichetta della versione per le Aree con una sola planimetria**: nessuna etichetta mostrata (oggi non c'è).
