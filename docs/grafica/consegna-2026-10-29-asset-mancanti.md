# Consegna asset grafici — icone e illustrazioni mancanti dopo le ondate 5 e L13 (2026-10-29)

Richiesta dell'utente (2026-10-29): «ok se ci sono asset grafici da generare o altri elementi per i quali possiamo generare
grafiche su codex prepara e aggiorna i prompt come fatto in passato e forniscimi i prompt per far generare gli asset grafici».

## 0. Come è stato fatto il censimento

Il censimento è stato fatto **confrontando i dati**, non guardando le pagine a campione, come nella consegna del
2026-09-29:

- **Registri del codice** confrontati con `public/asset/ui/` (242 file): `ChiaveAzione`, `ChiaveScheda` e `ChiaveSegno` di
  `src/components/shared/IconaAzione.tsx`; `TIPI_SPILLO` di `shared/spilli.ts` (41 tipi); `ICONE` di
  `src/components/guida/IconaCategoria.tsx` con gli alias di `src/utils/categorie.ts` e tutte le categorie che gli arrivano
  (`TIPI_AZIONE`, `MENU_EFFETTI` compresi i tipi nuovi `personaTolta`, `puntiConfidente` e `uscitaOggetto`,
  `ICONA_FAMIGLIA_EFFETTO`, `TIPI_ATTIVITA`, le categorie degli articoli, le schede di Oggetti, Battaglia, Fusione,
  Completamento e Richieste); `nav-*`, `rango-*`, `badge-*`, `stat-*`, `tesoro-*`, `sezione-*`, `timbro-*`, `allerta-*`.
- **Database di gioco**: una copia nuova di `gioco.db` (copia del 25 ottobre) con le migrazioni del codice applicate fino
  alla 301, tabella `immagine`, confrontata con ogni punto che chiede un'immagine predefinita: `attivita/<chiave>`
  (Attività e Videogiochi), `confidenti/<chiave>` e `-fedele`, `personaggi/<chiave>` (boss segreti e ritratti),
  `palazzi/<chiave>` (10 dungeon), `guida/<chiave>` (21 sezioni), `decori/<chiave>` (11 fregi), `meteo/<chiave>`,
  `illustrazioni/*`, `sfondi/*`, le immagini delle 316 mappe, e il compendio (259 Persona: le 27 senza file in
  `public/asset/persona/` sono le Persona dei personaggi giocabili, che hanno la loro figura in `persona-gruppo/`).

**Già a posto, quindi fuori consegna**: tutti i 41 spilli, le 12 chiavi dei segni, 34 tessere su 35, 54 azioni su 59,
tutte le categorie che arrivano a `IconaCategoria` (con un'eccezione che è un dato, non un disegno: §9), i 23 Confidenti (46 ritratti), i 10 palazzi, le 21 sezioni della
Guida, gli 11 fregi, il meteo, le 316 mappe, gli arcani.

**Che cosa manca davvero**: 18 file in quattro gruppi.

| Gruppo | Dove vive | File | Che cosa |
|---|---|---:|---|
| **A** — icone con la chiave già nel codice | `public/asset/ui/` (repository) | 6 | 5 azioni (prompt scritti fra l'1 e il 26 ottobre, mai consegnati) e la tessera «Persona della partita» |
| **B** — illustrazioni delle attività nuove | `gioco.db`, ambito `attivita` | 4 | estrazione della lotteria, concimare la pianta, le due fabbricazioni |
| **R** — riconsegne | `public/asset/ui/` | 2 | le 2 icone delle allerte il cui soggetto tocca il bordo (soglia dichiarata nel §1, gruppo R) |
| **C** — proposte che chiedono un aggancio nel codice | `public/asset/ui/` (repository) | 6 | figure distinte per i tipi di effetto della voce che oggi ne condividono una |

I gruppi A, B e R si vedono nell'app appena il file c'è. **Il gruppo C no**: è la risposta alla seconda metà della
richiesta («altri elementi per i quali possiamo generare grafiche») e serve solo se si decide di agganciarlo (§6).

## 1. File da consegnare

### Gruppo A — icone dell'interfaccia (6)

Tutti in **`public/asset/ui/`**: le icone dell'interfaccia vivono nel repository, non nel database di gioco (regola di
`public/asset/README.md`). Nessun elenco da aggiornare: in sviluppo il plugin `vite/assetPredefiniti.ts` calcola
`/asset/manifest.json` a ogni richiesta (un file appena copiato compare al prossimo ricaricamento della pagina), nella build
lo emette insieme ai file. Finché un file manca l'app mostra la riserva SVG disegnata in codice (indicata nell'ultima
colonna), quindi funziona anche prima della consegna.

| # | File | Misura | Soggetto | Dove si vede e a che misura | Riserva oggi |
|---|---|---|---|---|---|
| A1 | `public/asset/ui/azione-su.png` | 128×128 | freccia spessa verso l'alto sopra una base orizzontale corta | **14 punti nel codice**, con due significati: (a) **riordinare un elemento di un posto in su** (12 punti a 20 px: pulsantini fantasma, uno secondario, e le voci del menu della voce del Diario): voci del Diario (`GiornoGuida`, `PostoVoce`), acquisti di una voce (`AcquistiNegozioVoce`), infiltrazioni di una voce e legami di un'infiltrazione (`InfiltrazioniVoce`, `FinestraLegamiInfiltrazione`), guida dell'area (`GuidaDellArea`), aree del Dedalo e del quartiere (`AreeDelDedalo`, `AreeDelQuartiere`, `FinestraModificaArea`), regole di Tokyo (`AtterraggioTokyo`), abilità e dialoghi nell'editor dei Confidenti (`ModificaAbilita`, `ModificaDialogo`); (b) **salire di rango con un Confidente** (2 punti, pulsanti **primari rossi**): «Sali al rango N» a **22 px** (`partita/DettaglioConfidente.tsx`) e «Aggiorna il rango» a 20 px (`ConfidenteDettaglioPage.tsx`) | `IconSu` |
| A2 | `public/asset/ui/azione-giu.png` | 128×128 | freccia spessa verso il basso sotto una base orizzontale corta | **12 punti nel codice**, solo «sposta giù di un posto»: gli stessi 12 di A1 (a), a 20 px | `IconGiu` |
| A3 | `public/asset/ui/azione-scarta.png` | 128×128 | l'imbuto dei filtri, senza le tre righe che vi entrano in `azione-filtri.png`, con un pezzetto di carta appallottolato espulso di lato | **7 punti nel codice**, tutti col senso «lasciar fuori»: «Usa le condizioni leggibili e scarta le altre parti» (`ModuloCatalogo.tsx:217`, 22 px) e «Sostituisci con gli esiti dell'editor» (`moduli/ModuloAttivita.tsx:182`, 22 px); «Incolla senza gli effetti segnalati» (`FinestraIncolla.tsx:60`, pulsante secondario, 20 px); «Scarta» una proposta intera (`ProposteDaCompletare.tsx:216`, 20 px, e il pulsante del dialogo di conferma alla riga 129); «Non applicare» una proposta del passato (`partita/DaApplicare.tsx:223`, 20 px); «Cancella ricerca» del Diario (`RicercaDiario.tsx:64`, 20 px, a sola icona sul telefono) | `IconFiltro`, lo stesso imbuto di `azione-filtri.png` |

**Perché A3 è un imbuto e non un foglio tagliato.** La versione precedente di questo prompt (§21 di
[prompt-immagini.md](prompt-immagini.md), 2026-10-25) disegnava un foglio di cui «si tiene una parte», pensato solo per i
due moduli. Ma la stessa chiave serve anche a scartare una proposta intera e a cancellare la ricerca, e
`RicercaDiario.tsx:62–63` vuole di proposito la figura del filtro: «l'icona è quella del filtro, non una seconda «×»». Il
soggetto giusto per tutti e sette gli usi è quindi **l'imbuto che lascia fuori qualcosa**. Resta della famiglia del filtro,
come vuole la ricerca, e si distingue da `azione-filtri.png` per il pezzetto espulso, che dice «questo resta fuori». Usare
due figure diverse (per esempio «scarta la parte» e «scarta tutto») vorrebbe dire separare la chiave nel codice. Non è
richiesto e questa consegna non lo presuppone.
| A4 | `public/asset/ui/azione-ricevute.png` | 128×128 | scontrino con il bordo basso a denti di sega | pulsantino a sola icona «Ricevute degli effetti della spunta» nella colonna dei comandi di una voce del Diario; **32 px**, con il distintivo del numero disegnato dall'app sopra l'angolo | `IconRicevuta` |
| A5 | `public/asset/ui/azione-taglia.png` | 128×128 | forbici aperte viste di lato | «Taglia» nella barra delle voci selezionate e nel menu della voce del Diario; **32–40 px** | `IconForbici` |
| A6 | `public/asset/ui/scheda-persona-partita.png` | 128×128 | maschera da ladro davanti a tre carte a ventaglio | tessera «Persona della partita» nella fila delle schede della Partita, **22 px** sopra l'etichetta, accanto a «Scorta» (due carte) e «Compendio» (libro aperto) | `IconPersone` (tre sagome: la stessa di «Confidenti») |

### Gruppo B — illustrazioni delle attività nuove (4)

Vivono **nel database di gioco** (tabella `immagine`, ambito `attivita`, chiave = chiave dell'attività, senza prefisso),
non nel repository. Si vedono **a 56 px, a sinistra della riga** di ogni attività in Guida → Attività. Oggi tutte e
quattro hanno tipo `altro` e mostrano la stessa figura generica di quel tipo, `ui/categoria-altro.png` (rombo pieno con
tre punti): `AttivitaPage.tsx:130–132` passa a `IconaCategoria`, che con il file presente mostra l'illustrazione e non
il cartiglio (`IconaCategoria.tsx:66–72`). Le altre 30 attività hanno già la loro figura.

| # | Chiave nel database | Misura | Attività (nome che legge chi gioca) | Soggetto |
|---|---|---|---|---|
| B1 | `attivita/estrazione-lotteria` | 256×256 | Estrazione della lotteria — Shibuya, Piazza della Stazione | chiosco della lotteria con il biglietto controllato allo sportello |
| B2 | `attivita/concimare-pianta` | 256×256 | Concimare la pianta della mansarda — Yongen-Jaya, Leblanc (mansarda) | la pianta in vaso sul davanzale della mansarda e il sacchetto di concime che la nutre |
| B3 | `attivita/fabbricazione-strumenti` | 256×256 | Fabbricazione degli strumenti d'infiltrazione — Yongen-Jaya, Leblanc (mansarda), di sera | il banco di lavoro della mansarda con attrezzi, materiali e uno strumento appena finito |
| B4 | `attivita/fabbricazione-kawakami` | 256×256 | Fabbricazione degli strumenti di Kawakami — Yongen-Jaya, Leblanc, di sera | il bancone del Leblanc con un grembiule da domestica piegato e gli strumenti fatti in fila |

### Gruppo R — riconsegne (2)

**Soglia dichiarata.** Un pixel del contorno di 3 px conta come «non trasparente» solo se ha **alfa > 8**. È la misura con
cui la consegna del 2026-09-29 ha accettato e respinto i file
([consegna-2026-09-29-spilli-e-categorie.md](consegna-2026-09-29-spilli-e-categorie.md) §1, righe 55–56). Un alone con
alfa da 1 a 8 non si vede su nessun fondo dell'app e non basta a far rifare un file. La regola vale **per i file nuovi e
per quelli già respinti**. Non riapre i file accettati in passato: alcuni hanno il soggetto fino al bordo, e fra questi
anche dei modelli di stile citati nel §2 (`categoria-acquisto`, `categoria-trama`, `categoria-confidente`,
`categoria-velluto`, `attivita/videogioco-punch-ouch`, `attivita/caffe-leblanc`). Restano modelli **per il tratto e la
palette**, non per il margine. Rimisurarli tutti con questa soglia sarebbe un lavoro a parte: si fa solo se l'utente lo
chiede.

Misurati il 2026-10-29 con questa soglia:

| # | File | Misura | Pixel con alfa > 8 nel contorno di 3 px | Esito |
|---|---|---|---|---|
| R1 | `public/asset/ui/allerta-ondata-di-calore.png` | 128×128 | 14, opacità fino a 255: il raggio del sole tocca il bordo | **da riconsegnare** |
| R2 | `public/asset/ui/allerta-ondata-di-gelo.png` | 128×128 | 28, opacità fino a 227: fiocco e ghiaccioli toccano il bordo | **da riconsegnare** |
| — | `public/asset/ui/allerta-polline.png` | 128×128 | 0 (6 pixel con alfa fino a 4: alone invisibile) | accettato, fuori consegna |
| — | `public/asset/ui/allerta-stagione-influenzale.png` | 128×128 | 0 (4 pixel con alfa 1) | accettato, fuori consegna |
| — | `attivita/videogioco-golfer-sarutahiko` (database) | 256×256 | 0 (66 pixel con alfa fino a 4); il fondo pieno della prima consegna non c'è più | accettato, fuori consegna |

R1 e R2 sono due delle quattro icone della consegna del 2026-10-12
([consegna-2026-10-12-allerte.md](consegna-2026-10-12-allerte.md) §5). Quella consegna le aveva già fatte rifare perché il
soggetto risultava tagliato, ma non sono mai arrivate: i file in `public/asset/ui/` sono ancora quelli del commit 24c61a7d.
La stessa consegna chiedeva di ripulire anche `allerta-polline` e `allerta-stagione-influenzale`. Con la soglia qui sopra
quella richiesta cade: il loro alone non si vede. Anche il golfer non va più rifatto: nella copia del database c'è già la
versione rifatta di entrambi i videogiochi della consegna del 2026-09-29. `videogioco-star-forneus` ha il contorno pulito,
`videogioco-golfer-sarutahiko` ha soltanto un alone che non si vede.

### Gruppo C — proposte: figure distinte per i tipi di effetto della voce (6)

Il menu «Aggiungi un effetto» di una voce del Diario mostra **venti tipi con dieci figure**: cinque tipi hanno la stessa
borsa della spesa di «Acquisto» (`ui/categoria-acquisto`), e i tre tipi nuovi dell'utente 055 hanno la figura del
fratello opposto — «Persona tolta dalla scorta» la chiave del Velluto come «Persona ottenuta», «Punti a un Confidente» le due
sagome come «Invito», «Oggetto restituito o venduto» la borsa come «Oggetto ricevuto». La figura dice la famiglia, non il
gesto: in elenco «riceve un oggetto» e «restituisce un oggetto» si leggono uguali finché non si legge la riga.

Tutti in **`public/asset/ui/`**, 128×128. Si vedono a **40 px** nel menu «Aggiungi un effetto», a **32 px** nell'elenco
degli effetti della voce e a **24 px** nelle proposte da completare.

| # | File | Tipo di effetto (`MENU_EFFETTI`) | Oggi condivide la figura con | Soggetto |
|---|---|---|---|---|
| C1 | `public/asset/ui/categoria-yen.png` | `yen` — yen ricevuti o spesi | Acquisto, Articolo, Oggetto, Oggetto restituito | pila di tre monete di sbieco con una quarta che cade |
| C2 | `public/asset/ui/categoria-oggetto-ricevuto.png` | `oggetto` — un oggetto entra nell'inventario | Acquisto, Articolo, Yen, Oggetto restituito | sacchetto chiuso dal laccio con una freccia spessa che entra dall'alto |
| C3 | `public/asset/ui/categoria-oggetto-uscito.png` | `uscitaOggetto` — oggetto restituito o venduto | Acquisto, Articolo, Yen, Oggetto | lo stesso sacchetto di C2, aperto, con la freccia che esce di lato |
| C4 | `public/asset/ui/categoria-persona-tolta.png` | `personaTolta` — Persona tolta dalla scorta | Persona ottenuta (Velluto) | carta con la maschera, tagliata in diagonale, la metà destra che si stacca |
| C5 | `public/asset/ui/categoria-punti-confidente.png` | `puntiConfidente` — punti (note) a un Confidente | Invito (Confidente) | due mani che si stringono con tre note musicali che salgono |
| C6 | `public/asset/ui/categoria-trofeo.png` | `trofeo` — un trofeo ottenuto | Evento di storia (Trama) | coppa a due manici su una base a gradino, con una stella sul corpo |

## 2. Regole valide per tutti

Le stesse delle consegne precedenti ([consegna-2026-09-13-asset-mancanti.md](consegna-2026-09-13-asset-mancanti.md) §2,
[consegna-2026-10-12-memento.md](consegna-2026-10-12-memento.md) §2):

- **Originali**, ispirati allo stile di Persona 5 Royal: nessuna copia di illustrazioni ufficiali Atlus, nessun logo.
  Nelle illustrazioni del gruppo B nessun personaggio riconoscibile: si mostrano luoghi, oggetti e mani, non volti.
- **Nessun testo dentro l'immagine**: niente lettere, numeri, cifre sui biglietti, simboli di valuta scritti (niente «¥»),
  sigle, insegne leggibili.
- **PNG RGBA con alfa nativo**: trasparenza vera, non una scacchiera disegnata né un fondo bianco. Generare più grande e
  ridurre con lo stesso fattore sui due assi. **Il contorno di 3 px dell'immagine deve essere trasparente**: nessun pixel
  con alfa > 8 (la soglia del §1, gruppo R; l'obiettivo resta alfa 0). Nelle illustrazioni 256×256 il soggetto lascia
  almeno 8 px di margine trasparente su ogni lato. Per questo difetto, nelle ultime due consegne, quattro file sono stati
  rifatti o sono ancora da rifare (i due videogiochi e R1–R2): va controllato prima di consegnare. La regola vale per
  questa consegna e non riapre i file accettati in passato (§1, gruppo R).
- **Un solo soggetto**, centrato; deve leggersi alla misura più piccola della tabella del §1.
- **Palette**: nero `#0b0b0e`, bianco `#ececf1`, grigio `#6f6f80`, rosso `#e5352b`. **Niente oro**, niente pastello, niente
  sfumature. Le riconsegne del gruppo R tengono i colori che hanno (il giallo d'avviso `#f59e0b` e l'azzurro del gelo).
- **Coerenti con la famiglia esistente**, che va guardata prima di generare:
  - azioni (A1–A5): figura **bianca piena con contorno nero spesso e ombra rossa sfalsata in basso a destra**, come
    `azione-piu.png`, `azione-dettagli.png`, `azione-copia.png`; leggibili su fondo rosso acceso e su fondo scuro;
  - tessera (A6): la stessa grammatica di `scheda-scorta.png` (due carte bianche con l'ombra rossa) e
    `scheda-compendio.png` (libro aperto): stesso tratto, stesso peso;
  - illustrazioni (B): come le altre 30 di `attivita/` (per esempio `attivita/curry-leblanc`): scena piena in bianco,
    grigio, nero e rosso, contorno nero, una sagoma unica ritagliata su fondo trasparente;
  - categorie (C): come `categoria-acquisto.png`, `categoria-velluto.png`, `categoria-confidente.png`,
    `categoria-trama.png`: silhouette piena, bianco e grigio con dettagli rossi, contorno nero spesso, ombra rossa sfalsata.
- Ogni figura nuova deve **distinguersi dalle vicine** indicate nel prompt: è la ragione per cui esiste.
- I modelli di famiglia citati qui sopra servono **per tratto, palette e peso**, non per il margine: alcuni toccano il
  bordo (§1, gruppo R) e non vanno imitati in questo.

### Blocco di stile — anteporre a OGNI prompt

```
Stile grafico ispirato all'interfaccia di Persona 5 Royal (Atlus): estetica "pop punk" e anarchica, palette
dominata da rosso acceso (#e5352b), nero profondo (#0b0b0e) e bianco, forme irregolari con angoli tagliati in
diagonale, silhouette piatte ad alto contrasto, retini a punti (halftone) e texture da stampa, stelle e schizzi
come accenti. Illustrazione vettoriale pulita, bordi netti, nessuna sfumatura fotorealistica, nessun rumore.
```

### Prompt negativo — accodare a OGNI prompt

```
fotorealismo, 3D render, sfumature morbide, testo inglese, testo giapponese, testo italiano, lettere, numeri,
simbolo dello yen scritto, loghi ufficiali Atlus/Sega, personaggi copiati dal gioco, volti riconoscibili, watermark,
firma, bordi sfocati, colori pastello, oro, rumore, JPEG artifacts, sfondo pieno, scacchiera disegnata, soggetto che
tocca i bordi
```

Nei prompt qui sotto `[blocco di stile]` e `[prompt negativo]` stanno per i due blocchi qui sopra, da incollare per
intero.

## 3. Prompt — gruppo A (icone dell'interfaccia)

### A1 · `public/asset/ui/azione-su.png` (128×128)

```
[blocco di stile] Icona di azione per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente,
nessuna cornice: una freccia spessa che punta verso l'alto, con la punta triangolare larga e gli angoli tagliati in
diagonale, posata sopra una base orizzontale corta e spessa. La stessa icona dice due cose: «sposta su di un posto»
in un elenco e «sali di rango» con un Confidente, quindi la freccia è dinamica e decisa, con uno slancio verso
l'alto, e non deve sembrare un'icona di caricamento né un cursore. Forma piatta bianca #ececf1 con contorno nero
#0b0b0e spesso e uniforme, ombra rossa #e5352b sfalsata in basso a destra, come le altre icone di azione dell'app.
Deve leggersi a 20 px su fondo scuro e a 22 px dentro un pulsante rosso acceso #e5352b, dove l'ombra rossa non si
vede e la figura deve reggersi su bianco e contorno nero. È lo specchio esatto dell'icona «sposta giù» (stessa
freccia capovolta). Nessun testo, nessun numero. [prompt negativo]
```

### A2 · `public/asset/ui/azione-giu.png` (128×128)

```
[blocco di stile] Icona di azione per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente,
nessuna cornice: una freccia spessa che punta verso il basso, con la punta triangolare larga e gli angoli tagliati in
diagonale, sotto una base orizzontale corta e spessa: dice «sposta giù di un posto» in un elenco. Forma piatta
bianca #ececf1 con contorno nero #0b0b0e spesso e uniforme, ombra rossa #e5352b sfalsata in basso a destra, come le
altre icone di azione dell'app. Deve leggersi a 20 px su fondo scuro, ed essere lo specchio esatto dell'icona
«sposta su» (stessa freccia capovolta, stessa base, stesso spessore, stesso slancio). Nessun testo, nessun numero.
[prompt negativo]
```

### A3 · `public/asset/ui/azione-scarta.png` (128×128)

```
[blocco di stile] Icona di azione per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente,
nessuna cornice: un imbuto da filtro visto di fronte, leggermente inclinato, con la bocca larga in alto e il
becco stretto in basso, e un pezzetto di carta appallottolato che ne è appena stato espulso di lato, verso
destra, con due trattini di movimento. Il senso è «lasciare fuori»: scartare una parte, scartare una proposta,
togliere un filtro. Forme piatte bianche #ececf1 con contorno nero #0b0b0e spesso, angoli tagliati in diagonale,
ombra rossa #e5352b sfalsata in basso a destra; la pallina espulsa è grigia #6f6f80. Deve leggersi a 20 px e restare
della famiglia dell'icona «filtri» (lo stesso imbuto con tre righe che vi entrano dall'alto), distinguendosi da
quella perché qui non ci sono le tre righe e c'è il pezzetto espulso di lato. Deve
distinguersi anche dal cestino dell'eliminazione e dalla «×» di chiusura: niente cestino, niente croce, niente
forbici. Nessun testo, nessun marchio. [prompt negativo]
```

### A4 · `public/asset/ui/azione-ricevute.png` (128×128)

```
[blocco di stile] Icona di azione per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente,
nessuna cornice: uno scontrino di cassa verticale, leggermente inclinato, con il bordo inferiore strappato a denti
di sega e tre righe orizzontali di importi (barre piene, non cifre), l'ultima più corta. Forme piatte bianche
#ececf1 con contorno nero #0b0b0e spesso, angoli tagliati in diagonale, ombra rossa #e5352b sfalsata in basso a
destra. Lasciare libero l'angolo in alto a destra: l'app ci appoggia sopra un distintivo con il numero. Deve
leggersi a 20 px. Nessun testo, nessuna cifra, nessun marchio; niente appunti con la molletta, niente libro.
[prompt negativo]
```

### A5 · `public/asset/ui/azione-taglia.png` (128×128)

```
[blocco di stile] Icona di azione per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente,
nessuna cornice: un paio di forbici aperte viste di lato, i due anelli in basso a sinistra e le lame incrociate che
puntano in alto a destra, con angoli tagliati in diagonale. Forme piatte bianche #ececf1 con contorno nero #0b0b0e
spesso, ombra rossa #e5352b sfalsata in basso a destra, come le icone «copia» (due fogli) e «incolla» (tavoletta
con molletta) che le stanno accanto nella stessa barra. Deve leggersi a 20 px. Nessun testo, nessun marchio;
niente fogli né linee tratteggiate. [prompt negativo]
```

### A6 · `public/asset/ui/scheda-persona-partita.png` (128×128)

```
[blocco di stile] Icona di scheda per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente,
nessuna cornice: una mascherina da ladro bianca con gli occhi a mandorla vuoti, in primo piano, davanti a tre carte
da gioco verticali aperte a ventaglio, con il dorso pieno senza segni. Forme piatte bianche #ececf1 e grigio
#6f6f80 con contorno nero #0b0b0e spesso, ombra rossa #e5352b sfalsata in basso a destra. È la scheda «Persona
della partita» (scorta e compendio personale in una vista): deve stare in famiglia con «Scorta» (due carte bianche
inclinate) e «Compendio» (libro aperto) e distinguersi da entrambe e da «Confidenti» (persone) a 22 px: è la
maschera a fare la differenza. Nessun testo, nessun numero, nessun volto. [prompt negativo]
```

## 4. Prompt — gruppo B (illustrazioni delle attività, nel database)

Come la §26 di [prompt-immagini.md](prompt-immagini.md): **il prompt nasce dal testo che l'app mette accanto
all'illustrazione**. Sopra ogni prompt c'è il testo della scheda (nome, dove, quando, dettagli), preso dal database senza
parafrasi; quello che il testo non dice non va inventato.

### B1 · `attivita/estrazione-lotteria` (256×256)

- **Nome:** Estrazione della lotteria — **Tipo:** Altro — **Dove:** Shibuya, Piazza della Stazione — **Quando:** giorno e sera
- **Dettagli:** «Si controlla il biglietto la settimana dopo l'acquisto, al chiosco della lotteria. La guida non dà le date
  delle estrazioni né gli importi delle vincite: gli yen vinti si segnano a mano.»

```
[blocco di stile] Illustrazione per la scheda di un'attività di Persona 5 Royal, PNG 256×256 con sfondo
completamente trasparente e almeno 8 px di margine trasparente su ogni lato: un piccolo chiosco della lotteria di
strada, di tre quarti, con il tettuccio a strisce bianche e rosse, lo sportello aperto e un'insegna vuota senza
scritte; davanti allo sportello una mano tiene un biglietto rettangolare con il bordo dentellato e le caselle vuote,
e dallo sportello si sporge una piccola lente d'ingrandimento sul biglietto, a dire «si controlla». Ai piedi del
chiosco due monete e una stella a cinque punte come accenti. Forme piatte bianche #ececf1 e grigio #6f6f80, contorno
nero #0b0b0e spesso, accenti rosso #e5352b; niente oro. Deve leggersi a 56 px: chiosco e biglietto grandi, pochi
dettagli. Nessun testo, nessun numero sul biglietto, nessun simbolo di valuta, nessun volto. [prompt negativo]
```

### B2 · `attivita/concimare-pianta` (256×256)

- **Nome:** Concimare la pianta della mansarda — **Tipo:** Altro — **Dove:** Yongen-Jaya, Leblanc (mansarda) — **Quando:**
  giorno e sera
- **Dettagli:** «Concimare la pianta della mansarda del Leblanc non consuma la fascia. Il concime si compra prima
  (Bionutrienti al Fioraio Rafflesia, Megafertilizzante al Fioraio Sukebe di Shinjuku) e concimando se ne usa una copia.
  I valori di Gentilezza (♪♪ i Bionutrienti, ♪♪♪ il Megafertilizzante) […]»

```
[blocco di stile] Illustrazione per la scheda di un'attività di Persona 5 Royal, PNG 256×256 con sfondo
completamente trasparente e almeno 8 px di margine trasparente su ogni lato: una pianta da appartamento con foglie
larghe in un vaso semplice, appoggiata sul davanzale di una finestrella di mansarda con il telaio di legno; una
mano inclina sopra il vaso un sacchetto di concime senza etichetta, da cui cadono granelli tondi e grossi; dalle
foglie salgono due piccole note musicali stilizzate, segno di Gentilezza. Forme piatte bianche #ececf1 e grigio
#6f6f80, contorno nero #0b0b0e spesso, foglie con i bordi tagliati in diagonale, accenti rosso #e5352b sul vaso e
sulle note; niente verde acceso, niente oro. Deve leggersi a 56 px e distinguersi da «Fioraio Rafflesia» (mazzi di
fiori al bancone): qui c'è una pianta sola, in casa. Nessun testo, nessun volto. [prompt negativo]
```

### B3 · `attivita/fabbricazione-strumenti` (256×256)

- **Nome:** Fabbricazione degli strumenti d'infiltrazione — **Tipo:** Altro — **Dove:** Yongen-Jaya, Leblanc (mansarda) —
  **Quando:** di sera
- **Dettagli:** «Si fabbrica nella mansarda del Leblanc, di sera, dal rango 1 di Morgana […]. Ogni creazione usa i materiali
  della ricetta e dà un oggetto; la sessione dà Perizia ♪♪. A volte, a caso, arriva il bonus: un oggetto in più senza altri
  materiali e Perizia ♪♪♪. […]»

```
[blocco di stile] Illustrazione per la scheda di un'attività di Persona 5 Royal, PNG 256×256 con sfondo
completamente trasparente e almeno 8 px di margine trasparente su ogni lato: un banco di lavoro di legno visto di
tre quarti, illuminato da una lampada da tavolo a braccio sotto la luce di sera; sul piano un cacciavite, una
pinza, un rotolo di filo, viti e piccoli pezzi di metallo (i materiali), e al centro un grimaldello appena finito e
una piccola bomba fumogena tonda con la miccia (gli strumenti d'infiltrazione); accanto, un secondo grimaldello
identico con una stellina scintillante, il bonus. Due mani con guanti senza dita lavorano al pezzo. Forme piatte
bianche #ececf1 e grigio #6f6f80, contorno nero #0b0b0e spesso, accenti rosso #e5352b sulla lampada e sulla
stellina; niente oro. Deve leggersi a 56 px. Nessun testo, nessun numero, nessun volto, nessun gatto. [prompt negativo]
```

### B4 · `attivita/fabbricazione-kawakami` (256×256)

- **Nome:** Fabbricazione degli strumenti di Kawakami — **Tipo:** Altro — **Dove:** Yongen-Jaya, Leblanc — **Quando:** di sera
- **Dettagli:** «Dal rango 6 di Kawakami («Domestica tuttofare»), di sera al Leblanc, Kawakami fabbrica al posto tuo gli
  strumenti d'infiltrazione: ognuno usa i materiali della sua ricetta, e ne fa circa la metà di quelli che faresti tu […]»

```
[blocco di stile] Illustrazione per la scheda di un'attività di Persona 5 Royal, PNG 256×256 con sfondo
completamente trasparente e almeno 8 px di margine trasparente su ogni lato: il bancone di legno di un piccolo caffè
di sera, visto di tre quarti; sul bancone un grembiule da domestica bianco con il bordo a balza, piegato con cura, e
accanto una fila ordinata di tre grimaldelli finiti e un mucchietto di materiali (viti, filo, pezzi di metallo); due
mani in guanti bianchi da domestica posano l'ultimo grimaldello in fila. Dietro, appena accennati, un sifone da
caffè e due tazze. Forme piatte bianche #ececf1 e grigio #6f6f80, contorno nero #0b0b0e spesso, accenti rosso
#e5352b sul fiocco del grembiule; niente oro. Deve distinguersi a 56 px dalla «Fabbricazione degli strumenti
d'infiltrazione» (banco di lavoro con la lampada, mani con i guanti senza dita) e dalla «Preparazione del caffè a
Leblanc» (sifone in primo piano): qui il segno è il grembiule da domestica. Nessun testo, nessun volto, nessuna figura intera.
[prompt negativo]
```

## 5. Prompt — gruppo R (riconsegne)

Si riesporta il file già consegnato: **stesso soggetto, stessi colori, stessa composizione, stesso nome e stesso
percorso**. Non si ridisegna.

### R1 · `public/asset/ui/allerta-ondata-di-calore.png` (128×128)

```
Riesporta l'icona già consegnata public/asset/ui/allerta-ondata-di-calore.png senza ridisegnarla (stesso sole a
raggi spigolosi, stesse onde di calore, stessi colori). Oggi la punta del raggio in alto tocca il bordo: riduci il
soggetto in proporzione, con lo stesso fattore sui due assi, quanto basta a stare dentro i 122×122 px centrali, e
ricentralo. Nel contorno di 3 px dell'immagine 128×128 (prime e ultime 3 righe e colonne) nessun pixel deve avere
alfa > 8; meglio alfa 0 ovunque. PNG RGBA 128×128, alfa nativo, stesso nome e percorso, nessun altro file modificato.
```

### R2 · `public/asset/ui/allerta-ondata-di-gelo.png` (128×128)

```
Riesporta l'icona già consegnata public/asset/ui/allerta-ondata-di-gelo.png senza ridisegnarla (stesso fiocco a
sei bracci, stessi ghiaccioli, stesso taglio rosso, stessi colori). Oggi il fiocco in alto e i ghiaccioli in basso
toccano il bordo: riduci il soggetto in proporzione, con lo stesso fattore sui due assi, quanto basta a stare dentro
i 122×122 px centrali, e ricentralo. Nel contorno di 3 px dell'immagine 128×128 (prime e ultime 3 righe e colonne)
nessun pixel deve avere alfa > 8; meglio alfa 0 ovunque. PNG RGBA 128×128, alfa nativo, stesso nome e percorso,
nessun altro file modificato.
```

I prompt di ripulitura di `allerta-polline`, `allerta-stagione-influenzale` e `videogioco-golfer-sarutahiko`, presenti in
una prima stesura di questa consegna, sono stati tolti: con la soglia del §1 (gruppo R) quei tre file sono accettati.

## 6. Prompt — gruppo C (proposte, da agganciare nel codice)

**Questi sei file, da soli, non si vedono.** Il menu degli effetti prende la figura da `MENU_EFFETTI` in
`src/utils/effettiDellaVoce.ts`, che oggi assegna ai sei tipi le categorie esistenti (`acquisto`, `velluto`,
`confidente`, `trama`). Perché compaiano servono, dopo il sì dell'utente: la categoria nuova nella riga del tipo in
`MENU_EFFETTI` (`yen → yen`, `oggetto → oggetto-ricevuto`, `uscitaOggetto → oggetto-uscito`, `personaTolta →
persona-tolta`, `puntiConfidente → punti-confidente`, `trofeo → trofeo`) e la riserva SVG di ciascuna in `ICONE` di
`IconaCategoria.tsx`, come vuole la regola «le chiavi sono il censimento». Si possono generare prima: finché il
codice non le chiede restano file inerti in `public/asset/ui/`.

### C1 · `public/asset/ui/categoria-yen.png` (128×128)

```
[blocco di stile] Icona di categoria per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente,
nessuna cornice: una pila di tre monete spesse viste di sbieco, leggermente storta, con una quarta moneta che cade
dall'alto con due trattini di movimento. Le facce delle monete sono lisce, con un solo anello inciso: nessun
simbolo di valuta, nessuna cifra. Silhouette piena bianca #ececf1 con i bordi delle monete grigio #6f6f80,
contorno nero #0b0b0e spesso, ombra rossa #e5352b sfalsata. Deve leggersi a 24 px e distinguersi da «Acquisto»
(una borsa della spesa rossa con il cartellino): qui non c'è nessun negozio, solo il denaro. Nessun testo.
[prompt negativo]
```

### C2 · `public/asset/ui/categoria-oggetto-ricevuto.png` (128×128)

```
[blocco di stile] Icona di categoria per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente,
nessuna cornice: un sacchetto di stoffa chiuso dal laccio con il nodo, visto di fronte, e sopra una freccia spessa
rossa #e5352b che scende e ci entra dall'alto. Silhouette piena bianca #ececf1 con pieghe grigio #6f6f80, contorno
nero #0b0b0e spesso, ombra rossa sfalsata. È la coppia di «oggetto restituito» (stesso sacchetto, freccia che
esce): stessa sagoma, stessa misura, stessa posizione nel riquadro. Deve leggersi a 24 px e distinguersi da
«Acquisto» (borsa della spesa con il cartellino). Nessun testo, nessun numero. [prompt negativo]
```

### C3 · `public/asset/ui/categoria-oggetto-uscito.png` (128×128)

```
[blocco di stile] Icona di categoria per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente,
nessuna cornice: lo stesso sacchetto di stoffa dell'icona «oggetto ricevuto», con il laccio sciolto e la bocca
aperta, e una freccia spessa rossa #e5352b che ne esce verso destra, piegata in fuori. Silhouette piena bianca
#ececf1 con pieghe grigio #6f6f80, contorno nero #0b0b0e spesso, ombra rossa sfalsata. Stessa sagoma, stessa
misura e stessa posizione nel riquadro dell'icona «oggetto ricevuto», così che le due si leggano come entrata e
uscita. Deve leggersi a 24 px. Nessun testo, nessun numero, nessuna moneta. [prompt negativo]
```

### C4 · `public/asset/ui/categoria-persona-tolta.png` (128×128)

```
[blocco di stile] Icona di categoria per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente,
nessuna cornice: una carta verticale con il disegno stilizzato di una maschera da ladro, tagliata in diagonale da
un colpo netto: la metà sinistra resta ferma, la metà destra si stacca e scivola in basso a destra, con tre
trattini di movimento. Silhouette piena bianca #ececf1 con la maschera grigio #6f6f80, contorno nero #0b0b0e
spesso, il taglio sottolineato da una scia rossa #e5352b. Deve leggersi a 24 px e distinguersi dalla chiave con
le ali di farfalla della Stanza di Velluto («Persona ottenuta»): qui la Persona esce dalla scorta. Nessun testo,
nessun numero, nessun volto. [prompt negativo]
```

### C5 · `public/asset/ui/categoria-punti-confidente.png` (128×128)

```
[blocco di stile] Icona di categoria per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente,
nessuna cornice: due mani che si stringono, viste di lato, e sopra tre note musicali stilizzate (crome) che salgono
in diagonale, la più alta più grande. Silhouette piena bianca #ececf1 con dettagli grigio #6f6f80, contorno nero
#0b0b0e spesso, note in rosso #e5352b, ombra rossa sfalsata. Le note sono quelle con cui l'app misura i punti di un
Confidente. Deve leggersi a 24 px e distinguersi da «Confidente» (due profili di ragazzi affiancati) e da «Dote»
(stella argentata): qui il legame cresce. Nessun testo, nessun numero, nessun volto. [prompt negativo]
```

### C6 · `public/asset/ui/categoria-trofeo.png` (128×128)

```
[blocco di stile] Icona di categoria per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente,
nessuna cornice: una coppa a due manici su una base a gradino, con gli angoli tagliati in diagonale e una stella a
cinque punte sul corpo della coppa, e due piccole scintille accanto. Silhouette piena bianca #ececf1 e grigio
#6f6f80, contorno nero #0b0b0e spesso, stella rossa #e5352b, ombra rossa sfalsata. Niente oro: la coppa è
bianca e grigia come le altre icone. Deve leggersi a 24 px e distinguersi da «Trama» (cartolina con cilindro e
maschera) e dalla medaglia dei segni: qui è un trofeo del gioco. Nessun testo, nessun numero. [prompt negativo]
```

## 7. Istruzioni di consegna

**Gruppi A, C e R — repository.** Copiare i PNG in `public/asset/ui/` con i nomi esatti del §1 (sovrascrivendo i due
di R1–R2). Non serve registrare niente: in sviluppo il plugin `vite/assetPredefiniti.ts` calcola `/asset/manifest.json` a
ogni richiesta, quindi il file compare al prossimo ricaricamento della pagina; nella build il manifest si emette con i
file. Non toccare nessun altro file del repository.

**Gruppo B — database di gioco.** Le illustrazioni `attivita/*` non vanno in `public/asset/` (regola dell'utente,
`public/asset/README.md`, migrazione 079: tutto fuorché compendio e `ui/` vive in `gioco.db`). Codex consegna i quattro
PNG in una cartella d'appoggio fuori dal repository, con il nome `<chiave>.png` (per esempio
`estrazione-lotteria.png`); poi si **caricano nel database dell'istanza di preparazione** con
`PUT /api/immagini/attivita/<chiave>`, il PNG come corpo e `Content-Type: image/png` (per esempio
`PUT /api/immagini/attivita/estrazione-lotteria`). La riga dell'attività mostra la figura ma non ha un riquadro di
caricamento (l'unico componente che carica immagini è `ImmagineEntita`, usato per Arcani, Confidenti, personaggi e
Persona): il caricamento passa dalla rotta. La produzione si
guarda soltanto: il caricamento si fa dove si prepara, e arriva al rilascio con il database.

## 8. Criteri di accettazione

Un file è accettato solo se tutte queste cose sono vere:

1. misura esatta (128×128 per `ui/`, 256×256 per `attivita/`), PNG RGBA, alfa nativo;
2. **nel contorno di 3 px nessun pixel con alfa > 8** (la soglia del §1, gruppo R, la stessa della consegna del
   2026-09-29), misurato sul file e non a occhio; per le 256×256 il soggetto ha almeno 8 px di margine;
3. nome e percorso (o chiave) identici a quelli della tabella del §1;
4. nessun testo, numero, simbolo di valuta, logo o volto riconoscibile;
5. palette rispettata, niente oro, niente sfumature;
6. leggibile alla misura più piccola del §1 — controllare rimpicciolendo davvero (20–24 px per le icone, 56 px per le
   illustrazioni);
7. distinto dalle figure vicine indicate nel prompt: su/giù specchiati fra loro, e «su» leggibile anche a 22 px dentro il
   pulsante rosso di «Sali al rango»; scarta della famiglia dell'imbuto ma diverso da `azione-filtri.png` (niente righe
   che entrano, pezzetto espulso), dal cestino e dalla «×»; la tessera
   «Persona della partita» diversa da «Scorta», «Compendio» e «Confidenti», le due fabbricazioni diverse fra loro, le
   coppie C2/C3 con la stessa sagoma;
8. in famiglia con i file esistenti dello stesso gruppo (stesso tratto, stessa ombra rossa, stesso peso);
9. nessun altro file del repository modificato.

## 9. Fuori consegna — elementi senza un posto dove mostrare un'immagine

Il compito chiedeva di guardare anche gli **oggetti del catalogo** (bombe, accessori, distintivi, tessere, la Carta
Phoenix Rangers, i set delle televendite, i biglietti della lotteria), i **negozi e i luoghi nuovi** (chiosco della
lotteria, Canale di televendite, Videonoleggio Scarlet) e i **trofei**. Nessuno di questi ha un'immagine propria
nell'app: non esiste un ambito `oggetto`, `negozio`, `luogo` o `trofeo` in `shared/immagini.ts` né un componente che
chieda `oggetti/<chiave>` o simili. Oggetti e articoli si riconoscono dalla figura della loro **categoria**
(`ui/categoria-*`, tutte consegnate: una bomba consumabile ha quella degli oggetti, un distintivo quella degli
accessori), i luoghi dallo **spillo** del loro tipo (tutti consegnati), i trofei dal colore del grado. Le foto delle sedi
(`negozio_sede_foto`) sono schermate del gioco caricate dall'utente, non grafica da generare.

Generarne le immagini oggi vorrebbe dire produrre centinaia di file che l'app non mostrerebbe. Se l'utente vuole le
illustrazioni per singolo oggetto, negozio o trofeo, prima serve la decisione e l'aggancio nel codice (un ambito nuovo e
un riquadro nelle schede); i prompt si scrivono dopo, dai testi delle schede come nella §26.

Due note trovate facendo il censimento, che non chiedono un disegno:

- l'articolo `chihaya-shinjuku/pietra-sacra` ha la categoria `chiave`, che `chiaveCategoria` non traduce in
  `oggetti-chiave`: dove la sua categoria diventa un'icona compare il cartiglio generico; si sistema con un alias in
  `src/utils/categorie.ts` (o correggendo il dato), non con un file `categoria-chiave`;
- nelle schede della Fusione «Due arcani» e «Matrice completa» usano la stessa figura del «Calcolatore A + B», e
  «Demoni del Tesoro» quella delle «Ricette speciali»: è una scelta del codice (`VISTE_STRUMENTI` in
  `src/pages/FusionePage.tsx`), non un file mancante.
