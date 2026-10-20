# L5 «Luoghi, negozi, orari» — Test user experience

Sessione «Test user experience». Stato: **preparazione** (2026-10-20; casi aggiornati sulla stesura finale di requisiti e modifiche e ordinati sul piano di lavoro). Fonti: requisiti.md (R5-29…R5-33), modifiche.md §4 e §6.4;
«prima» di Analisi app in `schermate-prima/` (`01-negozi`, `02-negozio-untouchable`, `03-negozio-takemi`, `04-quartiere-shibuya`,
`05-pin-untouchable-nascosto-chiuso`, `06-pin-takemi`, `07-confidente-takemi`, `08-attivita`, `09-libri`, `10-quartiere-shujin-distributori`,
`11-pin-distributore`, `12-oggetti`, `13-pin-big-bang-burger`, `14-negozio-big-bang`). Acquisti e gestione solo su una partita di prova in locale.

## Percorsi da provare (telefono 375 in partita, tablet 768, desktop 1280; 1366×657 e 1280×689)
| # | Percorso (chi gioca) | Criterio | Cosa misuro | «Prima» |
|---|---|---|---|---|
| W1 | **Diario «compra X da Y» → sezione del negozio** nella pagina del luogo (Untouchable) a 375 | R5-29 | un tocco; badge «Aperto adesso/Chiuso adesso» e orari visibili senza scorrere; il listino comincia subito sotto | voce → `/guida/negozi/<k>` → «Dove» → quartiere (più tocchi) (`02-negozio-untouchable`) |
| W2 | **Pagina del luogo** Untouchable, Leblanc, distributori di Akihabara (6 negozi), un luogo senza pin | R5-30, R5-33, §4.1 | ordine leggibile in gioco: orari e «aperto adesso?» in cima, poi listino, Confidenti, attività; immagini al 100%; intestazione + orari + inizio listino nella prima schermata a 1366×657 / 1280×689; più negozi nella stessa pagina si distinguono | `02-…`, `03-negozio-takemi`, `10-quartiere-shujin-distributori` |
| W3 | **Scheda e visore dicono la stessa cosa sugli orari** («Fatto quando» del piano): pin di Untouchable in un giorno/fascia di chiusura | §2, §4.2 | popup del pin e pagina del luogo uguali; «Non disponibile adesso» con il perché; nessun pin «nascosto» senza spiegazione | `05-pin-untouchable-nascosto-chiuso`, `13-pin-big-bang-burger` |
| W4 | **Dal pin al luogo** e ritorno: popup → «pagina del luogo» → «Dove si trova» → «Apri l'area» | §4.1, §4.2 | percorso circolare senza vicoli ciechi; spillo selezionato e centrato; doppio pin spiegato («Questo luogo ha 2 pin») | `06-pin-takemi`, `11-pin-distributore` |
| W5 | **Altri ingressi**: Negozi, Attività, Libri, Film, Videogiochi, Confidente (Takemi), Oggetti, Progressi | §4.2 `urlLuogo` | ogni «Dove» porta alla pagina del luogo giusta; nessun link rotto; i negozi senza sede (Niijima, Tanaka, TV) restano con «Dove» in prosa | `01-negozi`, `07-confidente-takemi`, `08-attivita`, `09-libri`, `12-oggetti` |
| W6 | **Acquisto** dal listino nella pagina del luogo (partita di prova) | §4.1 | stesso gesto e stessa resa di `NegozioPage` di oggi; contatori aggiornati subito | `14-negozio-big-bang` |
| W7 | **«Aggiungi luogo»** dall'Area (esistente o nuovo) e «Posiziona» (partita di prova, in locale) | §4.4 | due passi chiari, tocco sul punto a piena risoluzione; «Da posizionare (N)» e «Luoghi da collocare (N)» comprensibili; la proposta si vede come suggerimento, non come fatto | — (nuovo) |
| W8 | **Editor**: pin con riferimento `luogo` | §4.4 | «Nome e descrizione vengono dal luogo · Modifica il luogo» chiaro; «Nota del pin» non confonde; «Togli la nota» / «Sposta nel luogo» espliciti | — |
| W9 | **Testi e nomi nella navigazione** | R5-31, §4.4b, §4.5 | «Luogo» solo per l'attività, «Negozio» per il listino; nei menu ogni posto ha il suo nome (mai «Mappa»); ordine delle briciole «La città › Shibuya › Central Street › Untouchable» | — |
| W10 | **Scroll del listino** e peso della pagina del luogo | R5-32, scroll annidati | nessuna area scorrevole annidata (il listino cresce con la pagina); immagini del listino in miniatura | — |

### Casi aggiunti con la stesura finale (requisiti R5-20b…R5-20e, modifiche §2, §4.2, §4.4b; 2026-10-20)
| # | Percorso (chi gioca) | Criterio | Cosa misuro | «Prima» / dato di prova |
|---|---|---|---|---|
| W11 | **Luogo chiuso nascosto dai menu** (decisione dell'utente «luogo chiuso va nascosto dal menu di navigazione»): Central Street in un giorno di chiusura di Untouchable; Kanda con Jinbocho chiuso (Hifumi < rango 4); Kichijoji fuori e dentro una finestra del Mercante Sakai; la Sakura Residence | R5-20b, R5-20d, §2 | il luogo chiuso **non compare** in metro, pin e cartellini del visore, «Luoghi qui», selettori, «vai a»; compare dopo l'evento (Jinbocho al rango 4; Sakai nella finestra); la Sakura Residence in nessun menu in nessun giorno; **nessuna incoerenza** fra visore e «Luoghi qui» (stesso numero di voci: Central Street al 06-01 21 su 24) | oggi «Luoghi qui» rivela a richiesta il pin che il visore nasconde (UX2-2) |
| W12 | **Lo spillo chiesto esplicitamente** (unica eccezione): «Sulla mappa» del diario o `?spillo=1517` in un giorno di chiusura | §2 | il visore mostra il pin **evidenziato**, selezionato e centrato, con «Non disponibile adesso» e il motivo («Chiuso il mercoledì · apre giovedì sera»); chi gioca capisce perché, senza vicolo cieco | oggi `?spillo=1517` di mercoledì non apre niente (app.md §0.5) |
| W12b | **«Dove si trova» di un luogo chiuso** dalla sua pagina: Untouchable al 06-01 (risposta di Stesura, §4.1) | §4.1, §2 | il pin del luogo è lo spillo chiesto: evidenziato con «Non disponibile adesso» e il motivo, selezionato e centrato; gli altri luoghi chiusi della planimetria restano nascosti; «Apri l'area» porta `?spillo=` e si comporta uguale | — |
| W13 | **Interruttore «Mostra anche i non ancora disponibili»** in visore e «Luoghi qui» | §4.2 | acceso: le voci chiuse compaiono **attenuate con il motivo** e il tocco mostra il pin evidenziato «Non disponibile adesso»; spento: assenti da entrambi; bersaglio ≥44 px | Central Street 06-01 |
| W14 | **Nomi nella navigazione** (decisione dell'utente «chiamandolo con il suo nome… e non con mappa»): Negozi → Untouchable → «Dove si trova»; «Sulla mappa» del diario (una voce Confidente, una negozio); Oggetti → «Posizione»; popup del pin di un luogo | R5-20c, §4.4b (M22–M25, T5, 10.3), **UX2-11** | «**Apri in Central Street**» che porta all'Area Central Street sullo spillo 1517; «Sulla mappa» → il nome del posto («Clinica Takemi», «Central Street») con l'icona del pin; «Posizione» → nome della sede; il popup dice il nome del luogo, non «scheda del quartiere»; in nessun menu, pulsante, briciola o «Dove si trova» compaiono «Mappa» o «atlante» per un posto | «Apri sull'atlante» (UX2-11) |
| W15 | **Il pin di un luogo col nome del luogo**: pin «Cinema» di Central Street | §4.2, §3.1 | si chiama «Videonoleggio Scarlet» ovunque; «Pin: «Cinema»» resta come nota in piccolo, senza confondere | pin «Cinema» |
| W16 | **Pin agganciati a negozi di un altro quartiere** (1768, 1769, 1527) in «Luoghi qui» di Central Street | §4.2 (Analisi app §11.1, §7.6) | voce col nome del pin e chip «Da rivedere · negozio di un altro quartiere» comprensibile; il tocco porta al negozio; nessun pin dell'utente cambiato senza il suo sì | «Distributore del cancello» ×2 e «Distributore Edificio Scolastico» in Central Street (L2) |
| W17 | **Orari nella pagina del luogo**: regola dell'app, eccezioni dei negozi | §4.1 «Orari», «Sblocco» | «Giorno e sera · regola dell'app: la guida non indica orari» si capisce; una riga per negozio con eccezione («Chiesa di Kanda (negozio): solo la domenica»); lo sblocco generato dalle condizioni («Si apre dopo l'invito di Ryuji», «con Ann al rango 7»), mai frasi scritte a mano; nessun orario di Confidenti o attività qui | — |

Dati: le prove si fanno sull'istanza che ha la base di p5s (`dati-produzione/p5s-2026-10-20-0503Z`), verificata con i suoi conteggi esatti
prima di partire. Le scritture (W6 acquisto, W7 Aggiungi luogo, W8 editor) solo sul Collaudo, con foto e ripristino. Per W11/W12 servono
giorni diversi della partita: sul Collaudo, cambiando il giorno corrente di una **partita di prova** (mai la partita dell'utente).

### Quando si prova cosa (piano.md «Per i tester», Stesura 2026-10-20)
| Pezzo pronto | Casi UX | Note |
|---|---|---|
| B2 + F2 (pagina del luogo) | W2, W10, W17, W1 (solo la pagina) | sola lettura sulla base p5s |
| B3 + F3 (visore, «Luoghi qui», editor dei pin) | W3, W4, W11, W12, W12b, W13, W15, W16, W8 (lettura) | W11/W12 richiedono di cambiare giorno a una **partita di prova** sul Collaudo |
| B4 + F4 (negozi e link verso il luogo) | W1 completo, W5, W9, W14 (UX2-11) | sola lettura |
| B5 + F5 (finestre e moduli) | W6, W7, W8 (scritture) | solo sul Collaudo, con foto e ripristino |
| B6 + F6 (rifinitura) | tutto il M §6.4, in un giro finale a 375/768/1280, 1366×657 e 1280×689 | — |
## Da verificare, portato da L2
- **UX2-11** (spostato dal PM in L5, R5-20c): «Dove si trova» dice «Apri sull'atlante» (`src/components/mappe/DoveSiTrova.tsx:113`)
  invece del nome del posto; vale per negozi, attività, libri. Ora è il caso W14 («Apri in Central Street»).

## Esiti
(pezzo per pezzo, appena FE segnala una parte pronta)
