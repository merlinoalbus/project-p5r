# Consegna asset grafici — spilli nuovi, categorie, asset mancanti (2026-09-29)

Richiesta dell'utente: «Verifica tutti gli elementi che non hanno una grafica appropriata e dammi i prompt da passare a
codex per la generazione dei relativi png da inserire». Il censimento (registri `RISERVA_SPILLO`, `RISERVA_AZIONE`,
`RISERVA_SCHEDA`, `RISERVA_SEGNO`, `ICONE` di `IconaCategoria` e immagini `attivita/*` confrontati con
`public/asset/**` e con la tabella `immagine` di `gioco.db`) ha trovato 14 file: due per i tipi di spillo nuovi, uno
inadatto da rifare, due categorie di attività senza figura e i nove della consegna del 2026-09-13 mai arrivati.

Le regole comuni sono quelle di [consegna-2026-09-13-asset-mancanti.md](consegna-2026-09-13-asset-mancanti.md) §2
(originali, nessun testo, PNG RGBA con alfa vera, un soggetto centrato, palette nero `#0b0b0e` / bianco `#ececf1` /
grigio `#6f6f80` / rosso `#e5352b`, niente oro).

**Dove vanno i file** (regola dell'utente, `public/asset/README.md`, migrazione 079): le icone `ui/*` si copiano in
`public/asset/ui/`; **le illustrazioni delle attività no**. `attivita/*` vive nel database di gioco (tabella `immagine`,
ambito `attivita`, chiave senza prefisso): Codex consegna il PNG, poi lo si **carica dall'app** (scheda dell'elemento o
`PUT /api/immagini/attivita/<chiave>` con `Content-Type: image/png`) e si rigenera il pacchetto. La consegna del
2026-09-13 indicava `public/asset/attivita/…` (§1 e §5): era in contrasto con il README e va letta così.

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

## 1. Esito della consegna (controllata il 2026-09-29)

| # | File | Misura | Esito |
|---|---|---|---|
| 1 | `public/asset/ui/spillo-oggetto.png` | 128×128 | ✅ accettato |
| 2 | `public/asset/ui/spillo-infiltrazione.png` | 128×128 | ✅ accettato |
| 3 | `public/asset/ui/spillo-ingresso-palazzo.png` | 128×128 | ✅ accettato |
| 4 | `public/asset/ui/scheda-progressi.png` | 128×128 | ✅ accettato |
| 5 | `public/asset/ui/spillo-sicura.png` (rifatto) | 128×128 | ✅ accettato (prima era una cassaforte) |
| 6 | `public/asset/ui/categoria-obiettivo.png` | 128×128 | ✅ accettato (tipo di attività «sfida») |
| 7 | `public/asset/ui/categoria-allenamento.png` | 128×128 | ✅ accettato |
| 8 | DB `attivita/videogioco-featherman-seeker` | 256×256 | ✅ accettato |
| 9 | DB `attivita/videogioco-gambla-goemon` | 256×256 | ✅ accettato |
| 10 | DB `attivita/videogioco-power-intuition` | 256×256 | ✅ accettato (il «!» sullo schermo è quello chiesto dal prompt del 09-13: è un glifo, da evitare nei prossimi) |
| 11 | DB `attivita/videogioco-punch-ouch` | 256×256 | ✅ accettato (due raggi toccano il bordo: 7% del contorno non trasparente) |
| 12 | DB `attivita/videogioco-train-of-life` | 256×256 | ✅ accettato |
| 13 | DB `attivita/videogioco-golfer-sarutahiko` | 256×256 | ⚠️ **da rifare**: fondo a retino bianco fino ai bordi (52% del contorno non trasparente, 6% di pixel trasparenti) |
| 14 | DB `attivita/videogioco-star-forneus` | 256×256 | ⚠️ **da rifare**: fondo a raggi rossi e bianchi fino ai bordi (54% del contorno non trasparente, 5% di pixel trasparenti) |

Verifica fatta su ogni file: intestazione PNG (misura, tipo di colore 6 = RGBA), pixel trasparenti (alfa = 0) e
contorno di 3 px non trasparente (alfa > 8), esame visivo, resa nell'app (spilli nell'editor e nel visore, categorie,
tessera «Progressi», schede dei videogiochi a 56 px). I 7 ui hanno il contorno trasparente al 100%. I sette videogiochi
sono caricati nel database dell'istanza locale (2026-09-29); i due da rifare restano in uso finché non arriva la
versione nuova: sono meglio dell'icona generica, ma a 56 px sul fondo scuro si leggono come un riquadro pieno.

## 2. Prompt di rifacimento (13 e 14)

Stesso impianto della consegna del 2026-09-13 §5, con il fondo reso esplicito: **fuori dal televisore e dalla
cartuccia l'immagine è trasparente**. Niente raggi, retini, schizzi o aloni dietro al soggetto; il soggetto non tocca
i bordi (almeno 8 px di margine trasparente su ogni lato).

```
[blocco di stile] Illustrazione per la scheda di un'attività di Persona 5 Royal, PNG 256×256 con sfondo
completamente trasparente: fuori dal televisore e dalla cartuccia non c'è niente — nessun raggio, nessun retino,
nessuno schizzo, nessun alone, nessun riquadro — e il soggetto lascia almeno 8 px di margine trasparente su ogni
lato. Un solo soggetto centrato: un vecchio televisore CRT panciuto, di tre quarti, con manopole a destra e antenna
a V, appoggiato su un piano; a terra davanti al televisore una cartuccia da console rettangolare con l'etichetta
liscia e vuota. Sullo schermo, resa come grafica a pixel grossi e piatta, la scena descritta sotto. Forme piatte
bianche #ececf1 e grigio #6f6f80 con contorno nero #0b0b0e spesso, accenti rosso #e5352b; niente oro. Nessun testo,
nessuna lettera, nessun numero, nessun logo dentro o fuori lo schermo.
SCENA SULLO SCHERMO: <quella del file>
[prompt negativo], sfondo pieno, sfondo a raggi, sfondo a retino, cornice quadrata, soggetto che tocca i bordi
```

| File | SCENA SULLO SCHERMO |
|---|---|
| `videogioco-golfer-sarutahiko.png` | una creatura tengu dal naso lungo, con piccole ali, a fine swing con una mazza da golf, e la pallina che schizza via lasciando una scia a tratti verso una bandierina piantata su un dosso |
| `videogioco-star-forneus.png` | sparatutto spaziale a scorrimento: una navicella tozza vista di profilo che spara tre colpi tondi verso destra contro due asteroidi angolosi, su un fondo di stelle a quattro punte (le stelle stanno **dentro lo schermo**, non attorno al televisore) |

**Accettazione**: come la consegna del 2026-09-13 §6, più: contorno di 3 px interamente trasparente (alfa = 0) e nessun
glifo sullo schermo. Il PNG consegnato si carica nel database con la stessa chiave (`PUT /api/immagini/attivita/<chiave>`,
che sostituisce quello attuale); nessun file in `public/asset/`, nessun altro file toccato.

## 3. Prompt usati per i file nuovi (per memoria)

**Spillo «Oggetto»** (tipo `oggetto`, consumabile, colore dell'app `#34d399`) — distinto da chiave antica
(`oggetto-chiave`), scrigni (`forziere`, `forziere-raro`) e sacco di monete (`tesoro`):
```
[blocco di stile] Figura per uno spillo da mappa di Persona 5 Royal, PNG 128×128 con sfondo trasparente, nessuna
cornice e nessuno spillo attorno: solo il soggetto, centrato, con margine minimo. Un sacchetto di tela chiuso da
un laccio, appoggiato a terra e leggermente inclinato, con una piccola stella a quattro punte che brilla sopra
l'apertura, come un oggetto raccolto da terra. Forme piatte bianche #ececf1 e grigio #6f6f80 con contorno nero
#0b0b0e spesso e uniforme, un solo accento rosso #e5352b sul laccio e sulla stella. Deve restare riconoscibile a
20 px e distinguersi da una chiave, da uno scrigno e da un sacco di monete (niente monete, niente lucchetto).
Nessun testo, nessun marchio, nessun oro.
[prompt negativo]
```

**Spillo «Punto di infiltrazione»** (tipo `infiltrazione`, spostamento, colore dell'app `#ff2e63`) — distinto da
porta con freccia (`passaggio`), portale incrinato (`ingresso-palazzo`), cancello a sbarre (`velluto`), porta aperta
con freccia (`uscita`):
```
[blocco di stile] Figura per uno spillo da mappa di Persona 5 Royal, PNG 128×128 con sfondo trasparente, nessuna
cornice e nessuno spillo attorno: solo il soggetto, centrato, con margine minimo. Una maschera da ladro a
domino vista di fronte, sospesa sopra un piccolo vortice a spirale piatto disegnato sul pavimento, come il punto
da cui ci si infiltra e si torna indietro. Forme piatte bianche #ececf1 e grigio #6f6f80 con contorno nero
#0b0b0e spesso e uniforme, spirale e occhi della maschera in rosso #e5352b. Deve restare riconoscibile a 20 px e
distinguersi da una porta, da un portale, da un cancello e da una freccia. Nessun testo, nessun marchio, nessuna
persona, nessun volto.
[prompt negativo]
```

**Spillo «Stanza sicura»** (rifacimento: il file precedente era una cassaforte):
```
[blocco di stile] Figura per uno spillo da mappa di Persona 5 Royal, PNG 128×128 con sfondo trasparente, nessuna
cornice e nessuno spillo attorno: solo il soggetto, centrato, con margine minimo. Una porticina sormontata da un
piccolo arco, socchiusa, da cui esce una luce calda a raggi, con sopra lo stipite una stella a cinque punte:
il rifugio dove ci si ferma a salvare. Forme piatte bianche #ececf1 e grigio #6f6f80 con contorno nero #0b0b0e
spesso e uniforme, luce e stella in rosso #e5352b. Deve restare riconoscibile a 20 px e distinguersi da una
cassaforte, da una porta chiusa con schegge e da un ingranaggio. Nessun testo, nessun marchio, nessuna persona.
[prompt negativo]
```

**Categoria «sfida»** (`ui/categoria-obiettivo`, alias `sfida → obiettivo` in `src/utils/categorie.ts`):
```
[blocco di stile] Icona di categoria per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente:
due guantoni da combattimento che si toccano di punta, con un piccolo lampo a zigzag nel punto di contatto.
Silhouette piena, bianca #ececf1 con dettagli grigio #6f6f80, contorno nero #0b0b0e spesso, lampo rosso #e5352b.
Un solo soggetto centrato, leggibile a 20 px sopra un cartiglio rosso. Nessun testo, nessun numero.
[prompt negativo]
```

**Categoria «allenamento»** (`ui/categoria-allenamento`):
```
[blocco di stile] Icona di categoria per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente:
un manubrio da palestra visto di lato, inclinato, con due dischi per parte e tre piccole linee di movimento
sopra. Silhouette piena, bianca #ececf1 con dischi grigio #6f6f80, contorno nero #0b0b0e spesso, linee di
movimento in rosso #e5352b. Un solo soggetto centrato, leggibile a 20 px sopra un cartiglio rosso. Nessun testo.
[prompt negativo]
```

Ingresso al Palazzo, tessera «Progressi» e i sette videogiochi: prompt della consegna del 2026-09-13 (§3, §4, §5).

## 4. Collegamenti fatti nel codice perché i file si vedano

- `shared/spilli.ts`: tipi `oggetto` e `infiltrazione` (con riserva SVG in `IconaSpillo.tsx`).
- `src/utils/categorie.ts`: alias `sfida → obiettivo`; `IconaCategoria`: riserve `obiettivo` e `allenamento`;
  `ModuloAttivita`: il tipo «allenamento» usa la sua figura (prima quella di «battaglia»).
- `src/pages/VideogiochiPage.tsx`: la scheda di ogni gioco mostra `attivita/<chiave>` (prima un'icona fissa: le
  illustrazioni dei videogiochi non si vedevano da nessuna parte, contrariamente a quanto diceva la consegna del
  2026-09-13).
