# Piano Fasi 5, 6 e 7 — pagine, grafica, revisione incrociata

Documento condiviso fra **Claude** e **Codex**. Finora il piano stava nella cartella locale di
Claude e Codex non poteva leggerlo: da qui in avanti sta nel repository, e si aggiorna qui.

---

## 1. La richiesta, nelle parole dell'utente

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
> dove mancano ed è necessario... non solo negli elementi specifici citati. (aggiorna quindi il
> piano e condividi questo nuovo requisito con codex così da organizzarvi il lavoro in modo da
> massimizzare efficacia e correttezza dell'implementazione).
>
> A completamento vi direi anche di fare una review di tutto per verificare se ci sono bug
> implementativi sfuggiti e da risolvere... anche in questo caso continuate ad essere
> equiponenziali. Però se uno implementa l'altro verifica e viceversa... mai verifica e
> implementazione fatti dalla stessa entità).

E, dallo stesso giorno: **la mappa generale di Tokyo va sostituita con la mappa della metropolitana
del gioco.**

## 2. I nove punti

| | richiesta | proprietario |
|---|---|---|
| **5.1** | layout molto grafico e moderno, desktop/tablet/mobile, sulle sette sezioni | A e B, ciascuno sulle proprie |
| **5.2** | aggiungere gli altri tipi di oggetti individuati dalle guide | B |
| **5.3** | ogni riferimento alla mappa: ancora sull'atlante **e** posizione già in pagina | componente: A · applicazione: A e B |
| **5.4** | **ogni mappa radice è quella del gioco**: Tokyo → mappa della metropolitana, Mementos → mappa dei Memento, ogni Palazzo → la sua mappa d'insieme nativa | A |
| **6.1** | tutti i pin rigenerati: PNG alfa reale, **sola figura, senza cornice** | prompt A · generazione Codex |
| **6.2** | grafica per **tutte** le parti di interfaccia dove manca, non solo le sezioni citate | prompt di chi rifà la pagina · generazione Codex |
| **6.3** | generazione immagini **esclusiva di Codex**; Claude scrive e verifica i prompt | — |
| **7.1** | revisione di tutto, per i bug implementativi sfuggiti | incrociata |
| **7.2** | equipollenti; chi implementa non verifica, mai la stessa entità sui due lati | — |

## 3. La divisione del lavoro

Divisa **per dominio, non per file**: ciascuno possiede pagine intere. Nessuno modifica un file
dell'altro, quindi non ci sono conflitti di merge né lavoro perso.

### Lotto A — Claude: il mondo

`MappaPage` · `QuartierePage` · `CittaPage` · `DungeonPage` · `DungeonDettaglioPage` ·
`AccessoMondoPage` · la sostituzione di Tokyo con la metropolitana (5.4) · il lotto dei pin (6.1).

Sono le pagine dell'atlante: dopo le Fasi 1-3 le conosco riga per riga, e rifarle è dove il lavoro
sui pin diventa finalmente visibile.

### Lotto B — Codex: gli inventari

`NegoziPage` · `NegozioPage` · `OggettiPage` e le altre categorie di oggetti delle guide (5.2) ·
`AttivitaPage` e le doti sociali · il Covo dei Ladri, che oggi non ha una pagina propria e va
individuato.

Ognuna deve usare `DoveSiTrova`: è la richiesta dell'utente — *«Negozi e inventario devono
diventare punti di accesso diretto ai rispettivi luoghi nella mappa»*.

### Le fondamenta, prima di tutto il resto

Due metà rifatte separatamente diventano due applicazioni diverse. Serve una base comune **prima**
che uno dei due cominci a rifare pagine: token di layout e spaziatura, la scheda, la griglia
adattiva, l'intestazione, la barra dei filtri, lo stato vuoto, e `DoveSiTrova`.

**Le scrive Claude, le verifica Codex.** Non perché Claude conti di più: perché `DoveSiTrova` tocca
l'ancora dell'atlante, che è del lotto A. Se le validasse chi le ha scritte non varrebbe niente.

## 4. Come lavoriamo, e come si ottimizza

Sei regole. Le prime tre esistono perché il loro contrario è già costato tornate in Fase 2.

**a) Verifica a lotto chiuso, non a commit.** In Fase 2 Codex ha verificato più volte commit che
Claude aveva già superato: dei sei rilievi di una tornata, due erano risolti prima di essere
scritti. Si adotta la proposta di Codex: chi dichiara pronto mette un tag `candidato/<nome>` e la
verifica giudica **quel tag**. Quel che si spinge dopo non riguarda la tornata in corso.

**b) Nessuno tocca il codice dell'altro.** Un rilievo si scrive, e lo chiude chi ha scritto quel
codice. È ciò che rende reale «chi implementa non verifica», invece che nominale.

**c) Il fabbisogno grafico si raccoglie strada facendo.** Ogni pagina finita aggiunge le proprie
voci mancanti a `docs/grafica/fabbisogno.md`: nome del file di destinazione, dimensione, dove si
usa, perché serve. A Fase 5 conclusa quel file **è già** l'elenco della Fase 6, senza un giro di
censimento a parte. È la risposta all'osservazione dell'utente: non si sa cosa serve finché le
pagine non sono rifatte, e allora lo si scrive mentre lo si scopre.

**d) La generazione grafica va a lotti, non a pezzi singoli.** Codex genera un lotto per volta, su
prompt già verificati. Un prompt sbagliato costa una generazione buttata; verificarlo costa una
lettura.

**e) Il lotto dei pin (6.1) parte subito, in parallelo.** È l'unico pezzo grafico che non dipende
dal rifacimento: i 37 tipi di segnalino sono nel registro `shared/spilli.ts` e non cambiano. Claude
scrive i prompt, Codex li verifica e genera, mentre entrambi lavorano alle pagine.

**f) La Fase 7 non è una seconda revisione di tutto.** Se lungo la strada ciascuno ha verificato il
lotto dell'altro, alla fine resta da guardare solo ciò che attraversa il confine fra i due lotti:
la coerenza visiva, la navigazione fra le sezioni, e i casi che nessuno dei due possiede da solo.

## 5. Ordine

```
fondamenta condivise (A scrive, B verifica)
        │
        ├── 5.1/5.3/5.4 lotto A ──┐
        ├── 5.1/5.2/5.3 lotto B ──┤   in parallelo, verifica incrociata
        └── 6.1 pin (A scrive i prompt, Codex genera) ──┘
        │
   docs/grafica/fabbisogno.md riempito strada facendo
        │
     6.2 generazione dei lotti grafici (Codex)
        │
     7.1 revisione incrociata di ciò che attraversa il confine
```

## 6. Stato

Aggiornato il 7 settembre 2026.

| | |
|---|---|
| fondamenta condivise | **fatto** — `DoveSiTrova` scritto da Claude, verificato da Codex e corretto sul suo rilievo (due destinazioni omonime); lo usano tutte e due le parti |
| lotto A — le pagine del mondo | **fatto**, tag `candidato/lotto-a-mondo-v2`: Città, MappaTokyo, Palazzi, scheda del Palazzo, Mappe (indice e dettaglio), Quartiere, Accesso al mondo, visore. Da verificare a Codex |
| lotto B — gli inventari | **in corso** — `candidato/lotto-b-negozio-posizione-v1` e `candidato/lotto-b-negozi-contesto-v2`, il secondo **verificato PASS da Claude** il 7 settembre |
| 6.1 pin | **fatto** — 37 asset rigenerati da Codex come sola figura su alfa; lo spillo (colore, misura, punta, stati) lo costruisce il codice |
| 6.2 grafica mancante | **in corso** — `docs/grafica/fabbisogno.md`: voce 1 consegnata (Shujin), 2 e 3 ritirate (i pezzi dei Memento c'erano già), 4 aperta (il Covo dei Ladri) |
| 7.1 revisione incrociata | **in corso** — ciascuno verifica i candidati dell'altro; resta quel che attraversa il confine |

### Quel che manca, scritto per non doverlo ricostruire a memoria

1. **Lotto B**: 5.2 (gli altri tipi di oggetti delle guide), `AttivitaPage` e le doti, il Covo dei
   Ladri come pagina propria, e le tre nuove sezioni Libri / Film-DVD / Videogiochi con il
   progresso per sessioni, che l'utente ha assegnato a Codex.
2. **Grafica**: la sagoma del Covo dei Ladri (voce 4), e la decisione sugli otto colori di spillo
   troppo chiari — che non è grafica ma una riga di `shared/spilli.ts`.
3. **Un confine da decidere insieme**: se «bloccato = assente» valga anche per le **schede** dei
   quartieri o solo per i loro cartellini sulla mappa. Oggi negozi e articoli spariscono del tutto;
   i quartieri restano in elenco con scritto «Non ancora aperto». Le due letture sono in
   `docs/ATLANTE-STATO.md` e nel canale; se non ci si accorda, decide l'utente.
4. **L'integrazione**: il lotto B verificato può entrare in `lavoro/atlante-mondo`, così c'è
   un'istanza sola che mostra tutto invece di due mondi separati su una porta sola.

## 7. Domande aperte a Codex

1. Ti va la divisione, o preferisci scambiare i lotti?
2. I prompt: un file per prompt in `docs/grafica/`, o una tabella unica?
3. Mentre scrivo le fondamenta, cominci a **censire** il lotto B — che dati mostra oggi ogni
   pagina, cosa manca, dove servono immagini? Così non stiamo fermi in due.

---

## 5.4 — la mappa di Tokyo e quella dei Memento si **costruiscono**

Precisazioni dell'utente del 6 settembre, che restringono e chiariscono il punto:

> non hai capito... fai la mappa dei mementos e quella dei quartieri di tokyo
>
> se poi la costruisci con gli elementi originali... e puoi rendere i quartieri visibili solo se
> sbloccati ancora meglio
>
> stessa cosa per i memento... gli altri lascia così
>
> nella mappa di tokyo aggiungi i PNG posizionati a dovere dei palazzi quando attivi e del covo
> fantasma e delle altre mappe root quando attive

Quindi: **due mappe, non undici.** I nove Palazzi tengono la loro illustrazione. Tokyo e Memento si
disegnano nell'app, con gli elementi originali del gioco, e diventano vive:

- **Tokyo** — i quartieri, visibili **solo quando sbloccati**; sopra, i Palazzi **quando sono
  attivi** (la finestra dal/al è già in `finestre-dungeon.json` e già valutata), il Covo dei Ladri,
  e le altre mappe radice quando attive;
- **Memento** — la stessa cosa per i suoi livelli.

Le condizioni ci sono già tutte: la data di sblocco di ogni quartiere sta in `quartiere`, la
finestra di ogni Palazzo in `finestre-dungeon.json`, e il valutatore che le legge è quello della
Fase 2. Il lavoro è il disegno, non i dati.

### Gli elementi originali: cosa c'è, e cosa manca ancora

**C'è**, dentro `P5_MAPDATA.SPD` (3 texture, 245 sprite, già estratte in
`extracted/png/IT/FIELD/PANEL/LMAP/`): l'icona disegnata di ogni quartiere — il 105 di Shibuya, il
Kabukichō di Shinjuku, la ruota di Odaiba, il Kaminarimon di Asakusa, il cigno di Inokashira — e
gli sprite dei **nomi**, sia in caratteri latini (`SHIBUYA`, `YONGENJAYA`, `AKIHABARA`) sia in
giapponese (`渋谷`, `新宿`, `秋葉原`, `お台場`). Gli sprite sono **nominati per quartiere**: è ciò
che rende possibile associarli senza indovinare.

**Manca la posizione.** Il campo `resa` di ogni sprite non è la collocazione sulla mappa: vale
sempre esattamente metà della larghezza e metà dell'altezza — è il perno, non il posto. Va cercata
altrove, e le piste sono due:

- `BASE/FIELD/PANEL/LMAP/P5_MAPINFO.PLG` — solo 368 byte, troppo pochi per trenta posizioni:
  probabilmente descrive il riquadro delle informazioni, non la mappa;
- `IT/FIELD/PANEL/LMAP/LMAP.BF` — 150 kB e contiene un blocco `FLW0`: è lo script della schermata,
  ed è lì che le posizioni hanno più senso di stare.

Per i Memento c'è `IT/FIELD/PANEL/MEMENTOS/MEMENTOS.PLG`, **197 kB**: un pannello di quella
dimensione un layout ce l'ha quasi certamente.

Se la posizione non salta fuori da nessuna delle due, si dichiara e si scrive una tabella di
collocazione **autorata**, detta tale — un layout scritto a mano è legittimo, spacciarlo per
estratto no.

---

# Da fare, in ordine — lista aperta al 6 settembre 2026 sera

Scritta qui perché la prossima sessione riparta da questa e non da capo. Sono richieste
dell'utente, testuali o quasi, nell'ordine in cui le ha date.

## 1. «Palazzi e Dedali» diventa «Palazzi»

Il Dedalo che resta è **solo Iweleth**, con le sue mappe. I Memento non ci vanno: hanno la loro
pagina. Da cambiare anche l'etichetta della piastrella nella Guida, non solo il titolo.

## 2. La Città mostra la mappa due volte

`CittaPage` rende `MappaTokyo` **e** `MappaIncorporata chiave="tokyo"`. La seconda va tolta:
`MappaTokyo` **è** la mappa di Tokyo, non un di più. E anche `Mappe → Tokyo` deve portare a quella
— o reindirizzarci — invece di aprire un visore alternativo.

## 3. Le miniature delle schede dei quartieri sono vuote

Devono usare **le stesse immagini della mappa composta**, cioè le sagome `_lm` in
`public/asset/mappe/lmap/tokyo/<quartiere>.png`. Oggi `MiniaturaMappa` cerca solo
`mappe/<chiave>` e per i quartieri non trova niente.

## 4. La pagina di dettaglio di un Palazzo va rifatta

È il punto 5.1 per il lotto A e ancora non è stato toccato: layout molto grafico e moderno,
desktop/tablet/mobile. Oggi è una scheda con delle liste.

## 5. Un elemento fuori riquadro: «SCHEDA DEL PALAZZO»

Compare e sparisce senza che si capisca quando né perché, e sborda. Va capito da dove esce e
tolto o reso stabile.

## 6. Il resto delle Fasi 5-7

Lotto A: `MappaPage`, `QuartierePage`, `DungeonPage`, `DungeonDettaglioPage`, `AccessoMondoPage`.
Lotto B (Codex): inventari. Poi la Fase 6 sulla grafica e la 7 di revisione incrociata.

## Come lavorare, che stavolta è servito impararlo

- **Prima di scrivere un prompt grafico, cercare fra gli originali estratti.** Il pozzo dei
  Memento era già in `MEMENTOS.SPD`, con i nomi, e per poco non si faceva ridisegnare.
- **Guardare il riferimento prima di costruire**, non dopo: la mappa di Tokyo e quella dei Memento
  sono state rifatte tre volte perché si è partiti a disegnare senza avere sotto gli occhi come le
  fa il gioco.
- **Un pezzo per volta, verificato nel browser, poi il commit.** Diversi commit di oggi sono
  partiti su lavoro che a schermo non reggeva.
