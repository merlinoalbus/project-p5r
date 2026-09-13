# Consegna asset grafici — 9 file mancanti (2026-09-13)

Specifica unica e autoconsistente per chi genera gli asset (Codex o altro agente grafico). Non
serve leggere altri documenti: qui c'è tutto — contesto, stile, prompt pronti, nomi dei file,
criteri di accettazione.

## 1. Che cosa consegnare

Nove file PNG, tutti con canale alfa reale. Tre gruppi:

| # | File | Misura | Dove si vede nell'app |
|---|---|---|---|
| 1 | `public/asset/ui/spillo-ingresso-palazzo.png` | 128×128 | segnalino dell'ingresso di un Palazzo sulle mappe di città |
| 2 | `public/asset/ui/scheda-progressi.png` | 128×128 | tessera «Progressi» nella pagina Partita |
| 3 | `public/asset/attivita/videogioco-featherman-seeker.png` | 256×256 | riga e scheda in Guida → Videogiochi |
| 4 | `public/asset/attivita/videogioco-gambla-goemon.png` | 256×256 | idem |
| 5 | `public/asset/attivita/videogioco-golfer-sarutahiko.png` | 256×256 | idem |
| 6 | `public/asset/attivita/videogioco-power-intuition.png` | 256×256 | idem |
| 7 | `public/asset/attivita/videogioco-punch-ouch.png` | 256×256 | idem |
| 8 | `public/asset/attivita/videogioco-star-forneus.png` | 256×256 | idem |
| 9 | `public/asset/attivita/videogioco-train-of-life.png` | 256×256 | idem |

**Consegna**: copiare i file in quei percorsi esatti. Il manifest (`/asset/manifest.json`) è
generato automaticamente dal plugin Vite: non va scritto a mano. Il nome del file **è** la chiave
che l'app cerca; un nome diverso non viene trovato e resta la riserva disegnata in codice.

Non toccare nessun altro file del repository: né codice, né manifest, né asset esistenti.

## 2. Regole valide per tutti e nove

- **Originali**, ispirati allo stile di Persona 5 Royal: nessuna copia di illustrazioni ufficiali
  Atlus, nessun personaggio riconoscibile del gioco, nessun logo.
- **Nessun testo dentro l'immagine**: niente lettere, niente numeri, niente sigle. Anche sugli
  schermi dei videogiochi: solo forme.
- **PNG RGBA con alfa nativo**: trasparenza vera, non una scacchiera disegnata e non un fondo
  bianco. Generare più grande e ridurre con lo stesso fattore sui due assi.
- **Un solo soggetto**, centrato, con margine minimo; deve reggere alle misure d'uso dichiarate al
  §5 (lo spillo si legge a 20 px).
- **Palette**: nero `#0b0b0e`, bianco `#ececf1`, grigio `#6f6f80`, rosso `#e5352b`. **Niente oro**,
  niente colori pastello, niente sfumature.
- Forme piatte, contorno nero spesso e uniforme, angoli tagliati in diagonale dove serve carattere.

### Blocco di stile — anteporre a OGNI prompt

```
Stile grafico ispirato all'interfaccia di Persona 5 Royal (Atlus): estetica "pop punk" e anarchica, palette
dominata da rosso acceso (#e5352b), nero profondo (#0b0b0e) e bianco, forme irregolari con angoli tagliati in
diagonale, silhouette piatte ad alto contrasto, retini a punti (halftone) e texture da stampa, stelle e schizzi
come accenti. Illustrazione vettoriale pulita, bordi netti, nessuna sfumatura fotorealistica, nessun rumore.
```

### Prompt negativo — accodare a OGNI prompt

```
fotorealismo, 3D render, sfumature morbide, testo inglese, testo giapponese, loghi ufficiali Atlus/Sega,
personaggi copiati dal gioco, watermark, firma, bordi sfocati, colori pastello, rumore, JPEG artifacts
```

## 3. Gruppo A — lo spillo dell'ingresso al Palazzo (1 file)

**Specifica cambiata rispetto ai vecchi spilli, leggere prima di generare.** Gli asset
`ui/spillo-<tipo>` oggi sono **solo la figura** su alfa vera: niente goccia, niente cornice, niente
colore del tipo. Spillo, colore (qui `#dc2626`), bordo, ombra e punta li disegna l'app attorno alla
figura. Una figura consegnata dentro una goccia colorata va rifatta.

La figura sta su un piattello chiaro disegnato dall'app, quindi il tratto è **nero su chiaro**.

**Da non ripetere**, perché già in uso su spilli vicini della stessa mappa:
- `spillo-porta`: porta socchiusa con schegge rosse attorno;
- `spillo-passaggio`: porta con una grande freccia rossa;
- `spillo-velluto`: cancello a sbarre aperto;
- `spillo-mementos`: tornello della metropolitana.

```
[blocco di stile] Figura per uno spillo da mappa di Persona 5 Royal, PNG 128×128 con sfondo trasparente, nessuna
cornice e nessuno spillo attorno: solo il soggetto, centrato, con margine minimo. Un portale monumentale visto di
fronte — due battenti alti e stretti sotto un timpano triangolare, incorniciati da due colonne tozze — chiuso e
intatto, percorso da una crepa a zigzag che lo attraversa dall'alto in basso e ne sfalsa leggermente le due metà,
come se la realtà dietro fosse distorta. Forme piatte bianche #ececf1 e grigio #6f6f80 con contorno nero #0b0b0e
spesso e uniforme, un solo accento rosso #e5352b lungo la crepa. Deve restare riconoscibile a 20 px e
distinguersi da una porta comune (qui ci sono il timpano e la crepa) e da un cancello a sbarre. Nessun testo,
nessun marchio, nessuna persona, nessuna maschera.
[prompt negativo]
```
→ `public/asset/ui/spillo-ingresso-palazzo.png`

## 4. Gruppo B — la tessera «Progressi» (1 file)

Tessera della pagina Partita: figura sopra, etichetta sotto scritta dall'app. Un soggetto pieno,
leggibile a 28 px.

**Da non ripetere**: `scheda-obiettivi` è un bersaglio con freccia, `segno-medaglie` è una medaglia.

```
[blocco di stile] Figura per una tessera di interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente:
una scala a tre gradini vista di tre quarti, ciascun gradino più alto del precedente, con una bandierina
triangolare piantata sul gradino più alto; sul primo e sul secondo gradino un segno di spunta. Forme piatte
bianche #ececf1 e grigio #6f6f80 con contorno nero #0b0b0e spesso; bandierina e spunte in rosso #e5352b. Un solo
soggetto, centrato, leggibile a 28 px. Nessun testo, nessun numero, nessuna persona.
[prompt negativo]
```
→ `public/asset/ui/scheda-progressi.png`

## 5. Gruppo C — le illustrazioni dei sette videogiochi (7 file)

L'app le mostra a **56 px** nella riga dell'elenco e più grandi nella scheda aperta.

**Contesto comune**, che è il testo stesso che legge chi gioca: attività **serale** nella mansarda
sopra il bar Leblanc (Yongen-Jaya); richiede la TV CRT (mansarda Leblanc, dal 18 aprile) e il Set
per retrogaming; completare il gioco produce una tessera scambiabile al negozio retro di Akihabara
per accessori che potenziano abilità elementali specifiche; ogni livello completato dà 2 note di
Dote.

**Impianto identico per tutti e sette** — cambia solo la scena sullo schermo:

```
[blocco di stile] Illustrazione per la scheda di un'attività di Persona 5 Royal, PNG 256×256 con sfondo
trasparente, un solo soggetto centrato: un vecchio televisore CRT panciuto, di tre quarti, con manopole a destra
e antenna a V, appoggiato su un piano; a terra davanti al televisore una cartuccia da console rettangolare con
l'etichetta liscia e vuota. Sullo schermo, resa come grafica a pixel grossi e piatta, la scena descritta sotto.
È una sessione serale nella mansarda sopra un bar: luce bassa, nessuna finestra. Forme piatte bianche #ececf1 e
grigio #6f6f80 con contorno nero #0b0b0e spesso, accenti rosso #e5352b; niente oro. Nessun testo, nessuna
lettera, nessun numero, nessun logo dentro o fuori lo schermo.
SCENA SULLO SCHERMO: <una delle sette qui sotto>
[prompt negativo]
```

| File | Dati della riga (dal database) | SCENA SULLO SCHERMO |
|---|---|---|
| `videogioco-featherman-seeker.png` | 5.000 yen · 3 livelli · Conoscenza · dal 1 settembre | un eroe mascherato in stile tokusatsu con casco a becco d'uccello, visiera e mantello corto, in posa di combattimento, con tre stelline di scatto attorno |
| `videogioco-gambla-goemon.png` | 5.200 yen · 2 livelli · Fascino · dal 26 luglio | un ladro d'epoca Edo con fascia in fronte e grande fagotto sulle spalle, in corsa sopra tre rulli da slot machine allineati che mostrano simboli geometrici semplici (cerchio, rombo, stella) |
| `videogioco-golfer-sarutahiko.png` | 3.200 yen · 3 livelli · Perizia · dal 1 settembre | una creatura tengu dal naso lungo, con piccole ali, a fine swing con una mazza da golf, e la pallina che schizza via lasciando una scia a tratti verso una bandierina piantata su un dosso |
| `videogioco-power-intuition.png` | 5.500 yen · 3 livelli · Coraggio · dal 1 settembre | un pugno chiuso di profilo che sfonda una lastra incrinata, con tre linee di scatto e un punto esclamativo tozzo sopra le nocche |
| `videogioco-punch-ouch.png` | 5.300 yen · 3 livelli · Fascino · dal 1 settembre | due guantoni da boxe visti frontalmente, uno in guardia e l'altro appena partito, con l'impatto reso da una stella a punte irregolari e tre stelline piccole che rimbalzano |
| `videogioco-star-forneus.png` | incluso nel Set per retrogaming (Negozio usati Yumenoshima, Yongen-Jaya, dal 5 giugno) · 3 livelli · Coraggio | sparatutto spaziale a scorrimento: una navicella tozza vista di profilo che spara tre colpi tondi verso destra contro due asteroidi angolosi, su un fondo di stelle a quattro punte |
| `videogioco-train-of-life.png` | 5.600 yen · 3 livelli · Gentilezza · dal 1 settembre | un treno locale a due vagoni visto di tre quarti dal davanti, fermo a una banchina con pensilina semplice e un binario che si allontana in prospettiva piatta |

I dati della riga servono a orientare la scena (un gioco a due livelli non è un epico a tre capitoli,
un gioco regalato col set non è un titolo costoso); **non vanno scritti dentro l'immagine**.

## 6. Criteri di accettazione

Un file è accettato solo se tutte queste cose sono vere:

1. dimensioni esatte (128×128 o 256×256), PNG RGBA, alfa nativo, nessun fondo opaco;
2. nome e percorso identici a quelli della tabella al §1;
3. nessun testo, numero o logo dentro l'immagine;
4. palette rispettata, nessun oro, nessuna sfumatura fotorealistica;
5. leggibile alla misura d'uso: **20 px** lo spillo, **28 px** la tessera, **56 px** le attività —
   controllare davvero rimpicciolendo, non a occhio sull'immagine grande;
6. per lo spillo: **nessuna goccia, nessuna cornice, nessun colore di tipo** attorno alla figura;
7. si distingue dagli asset vicini elencati ai §3 e §4;
8. nessun altro file del repository modificato.
