# L1 «Immagini» — Test user experience

Sessione «Test user experience». Stato: **fatta** — giro 1 con 3 difetti (UX-1, UX-2, UX-3), corretti da FE e **verificati** il
2026-10-20 (vedi «Verifica delle correzioni» in fondo e `difetti.md`).
Schermate in `lotti/L1/schermate-ux/`.

## Percorsi da provare (dal «Piano dei test di L1» e dai «Casi aggiunti» di modifiche.md)
1. **La città → scheda di un quartiere** (telefono 375, tablet 768, desktop 1280; 1024×690): l'illustrazione si vede piena (opacità 100%),
   la sagoma sopra resta riconoscibile, il quartiere chiuso è attenuato ma leggibile, i 4 senza caricata (Kichijoji, Ikebukuro, Nakano,
   Santuario Meiji) mostrano la sagoma come oggi. Tocchi per arrivare ai luoghi del quartiere: 1 (scheda) — come prima.
2. **Intestazione del quartiere** (Shibuya con caricata, Kichijoji senza): telefono in cima, da 640 px a fianco; da 1024 compatta
   (la planimetria resta visibile nella prima schermata).
3. **Intestazione del Palazzo** (Kamoshida): illustrazione con lo stemma sopra, compatta da 1024; **Memento invariati**.
4. **Metro di Tokyo**: identica (sagome e stemmi, niente illustrazioni).
5. **Grafica predefinita spenta** (Impostazioni, preferenza per dispositivo): schede, intestazioni e metro seguono il manifesto, nessun
   buco o icona rotta.
6. **Peso e tempi** della pagina La città: byte delle immagini, numero di richieste, tempo all'ultima immagine visibile; carico al
   primo schermo su telefono.
7. **Testi e vocabolario**: alt delle illustrazioni in italiano, segno `aria-hidden` quando il nome è già scritto accanto, nessun termine
   fuori dal vocabolario di L0 (Quartiere, Area, Planimetria, Luogo, Palazzo, Memento).

## Il «prima» (fissato il 2026-10-20)
Fonti: istanza locale (http://localhost:5373, commit `bd20ed72`, la pagina La città non è ancora toccata dalle correzioni FE) e
produzione https://persona5royal.nasmerlinoalbus.cloud in sola lettura per le intestazioni (in locale QuartierePage è a metà
modifica della sessione FE: `ReferenceError: IllustrazioneConSegno is not defined`, lavoro in corso, non un difetto).

### La città — schede (locale)
| Misura | 1024×768 | 375×812 |
|---|---|---|
| Scheda (link `.card.piastrella`) | 378×137 | 333×155 |
| Sagoma nella scheda | 92×84 (Shibuya), max 112×84 | **43×39** dentro un riquadro scuro ~128×72: molto spazio vuoto |
| Scorrimento orizzontale | no | no (scrollWidth 375) |
| Immagini della pagina | 43 richieste, **2,6 MB** decodificati (sagome da 16–111 KB) | idem |
| Tempo all'ultima immagine | 479 ms (cache calda) | — |
Schermate: `prima-citta-metro-1024.jpg`, `prima-citta-schede-1024.jpg`, `prima-citta-schede-375.jpg`.

### Peso delle illustrazioni che entreranno nelle schede (misurato dal BE locale)
19 quartieri hanno un'illustrazione caricata: **PNG 1672×941, da 1,86 a 2,46 MB l'una, 39,8 MB in tutto**, servite con
`cache-control: private, max-age=31536000, immutable`. 4 quartieri (Kichijoji, Ikebukuro, Nakano, Santuario Meiji) hanno solo
l'asset dichiarato `mappe/citta-<chiave>`, che **non esiste nel manifesto** (come anche `mappe/tokyo`): per loro resta la sagoma.
Rischio UX da verificare dopo: riquadri da ~128×84 che scaricano ~2 MB ciascuno → con `loading=lazy` sul telefono il primo schermo
(2–3 schede) pesa 4–7 MB, scorrendo la pagina intera ~40 MB su rete mobile durante la partita.

### Intestazione del quartiere — Shibuya (produzione)
| | 1024×690 | 375×812 |
|---|---|---|
| Riquadro d'intestazione | y 148..282, **134 px** | y 136..413, **277 px** (sagoma in cima, centrata) |
| Sagoma | 110×100 | 110×100 |
| alt | «Sagoma di Shibuya sulla mappa di Tokyo» | idem |
Schermate: `prima-prod-shibuya-intestazione-1024x690.jpg`, `prima-prod-shibuya-intestazione-375.jpg`.

### Intestazione del Palazzo — Kamoshida (produzione)
| | 1024×690 | 375×812 |
|---|---|---|
| Riquadro d'intestazione | y 88..310, **222 px**; `main` 622/622 (pagina in una schermata) | y 76..699, **623 px** |
| Stemma | 48×48 accanto al 100% | ~40 px in alto |
| Stemma 280×280 in filigrana in alto a destra | **opacità 0,07** (`opacity-[0.07]`, assoluto): figura velata | nascosta |
Schermate: `prima-prod-kamoshida-intestazione-1024x690.jpg`, `prima-prod-kamoshida-intestazione-375.jpg`.
Nota: la filigrana al 7% è proprio il tipo di «figura velata» che la regola dell'utente (tailwind.css, «Fregio») esclude; con
l'illustrazione al 100% nell'intestazione va verificato che non resti anche la filigrana.

### Memento (produzione)
375×812: riquadro y 76..244, **168 px**, stemma ~40 px, «Date, mappe e conteggi del Memento» richiudibile. Deve restare invariato.
Schermata: `prima-prod-memento-intestazione-375.jpg`.

### Risposta di Implementazione FE (2026-10-20)
- Filigrana: con l'illustrazione la filigrana al 7% sparisce (DungeonDettaglioPage, `illustrato`); resta nei Palazzi **senza**
  illustrazione, com'era prima di L1. Da verificare entrambi i casi. La filigrana residua è una figura velata già esistente, fuori dal
  perimetro di L1: la riporto come nota al PM, non come difetto del lotto.
- Peso: il server non ha versioni ridotte delle immagini (nessun ridimensionamento in `routes/immagini.ts`); FE l'ha chiesto a BE con
  copia al PM. Le schede hanno già `loading=lazy` e `decoding=async`. Misura a pagina pronta, poi decido se aprire il difetto.

### Indicazioni del PM (2026-10-20)
- Peso: affidato a Stesura modifiche come variante di L1 («miniature»). Lo misuro a pagina pronta, con la variante se ci sarà.
- Filigrana: va tolta dove arriva l'illustrazione. Da verificare su Kamoshida (con l'illustrazione) e su un Palazzo senza illustrazione.

## Esiti (giro 1, 2026-10-20 — BE e FE «fatte», con la variante «miniature»)
Istanza locale http://localhost:5373, partita reale **solo in lettura** (nessuna scrittura). La preferenza «grafica predefinita» vive nel
localStorage del browser di prova: spenta per la prova e rimessa com'era (chiave assente), sia in locale sia nella produzione.

| # | Percorso | Esito | Misure / prove |
|---|---|---|---|
| 1 | La città → schede (375, 768, 1024) | **ok** | 23 schede con illustrazione al 100% (opacità 1, nessun filtro sulle aperte), sagoma sopra su piastrina scura: si riconosce (`dopo-citta-schede-375.jpg`, `dopo-citta-schede-768.jpg`). 375: scheda 333×134, figura 126×70, sagoma 45×39; 768: scheda 359×155, figura 128×72. Chiuse in grigio a 0,6: leggibili, Shinjuku notturna visibile. I 4 senza caricata (Kichijoji, Ikebukuro, Nakano, Santuario Meiji) mostrano l'asset dichiarato dal database (vedute aeree 2048×1536, servite in miniatura 320×240): stile diurno diverso dalle scene notturne, ma è grafica dell'utente e si legge. Tocchi per arrivare al quartiere: 1, come prima. Nessuno scorrimento orizzontale |
| 2 | Peso de La città a 375 (dpr 2), scorrendo tutta la pagina | **ok** | 23 miniature, tutte `l=320`, **381 KB** in tutto (la più pesante 37 KB) contro i 39,8 MB delle originali: conferma i ~390 KB dichiarati da FE. Al primo schermo 7 miniature, 110 KB. Pagina intera 66 immagini, **2,9 MB**: il grosso sono le sagome della metro e delle schede (43 immagini, 2,6 MB), **invariate rispetto a prima** (nota, non difetto di L1: anche le sagome potrebbero passare dalle miniature). Nessuna immagine rotta né incompleta |
| 3 | Intestazione del quartiere — Shibuya | **ok** | 375: figura 299×168 in cima, sagoma 59×54 sopra, intestazione 345 px (prima 277), la planimetria comincia a y 497 e resta nella prima schermata (`dopo-shibuya-intestazione-375.jpg`). 1024×690: figura 198×111 a fianco, intestazione 147 (prima 134), miniatura `l=320` (`dopo-shibuya-intestazione-1024x690.jpg`). Bella, al 100%, nessuna figura velata |
| 4 | Intestazione del Palazzo — Kamoshida | **difetto UX-1** | 375: figura 150×84 con stemma, chiara. 1024×690: intestazione 222 (= prima), `main` 622/622, **filigrana assente** (verificato), ma figura **54×30 e stemma 20** (prima 48): non si riconosce. 1280×689: intestazione 170, `main` 621/621, figura 84×46 e stemma 24: appena leggibile. Risposta alla domanda del PM sulla scelta (a): **no, a 56 px non si riconosce più**; confronto a grandezza reale in `confronto-palazzo-misure-reali.jpg` |
| 5 | Memento | **ok** | 375: intestazione 168 px, stemma 40, nessuna illustrazione: identico al «prima» (`dopo-memento-375.jpg`) |
| 6 | Metro di Tokyo (grafica accesa) | **ok** | 10 sagome e stemmi, nessuna illustrazione, uguale alla schermata «prima» (`dopo-citta-metro-1024.jpg` / `prima-citta-metro-1024.jpg`) |
| 7 | Grafica predefinita **spenta** | **difetti UX-2, UX-3** | Schede: illustrazioni caricate visibili senza sagoma; i 4 con solo asset senza figura e testo a sinistra, nessun buco (ok). Metro: nessuna sagoma né nome (UX-2, la produzione le mostra). Intestazione di Kichijoji: riquadro vuoto 132×100 (UX-3). Kamoshida: illustrazione caricata + iniziale «K» al posto dello stemma (ripiego testuale, ok, `dopo-grafica-spenta-kamoshida-375.jpg`) |
| 8 | Testi, vocabolario, accessibilità | **ok** | `alt` in italiano: «Illustrazione di Shibuya», «Illustrazione di Palazzo di Kamoshida»; il segno sta in uno `span aria-hidden="true"` (il nome è scritto accanto). Vocabolario L0 rispettato nelle viste provate («7 infiltrazioni», «26 planimetrie», «Planimetria», «Non ancora aperto»). Nessun testo inglese nuovo |

Difetti aperti: **UX-1** (media), **UX-2** (media), **UX-3** (bassa) in `difetti.md`. Fase ux di L1: **difetti**.

### Decisioni del PM sui difetti (2026-10-20), criteri della verifica
- **UX-1**: da 1024 a 1279 px lo stemma da 48, senza illustrazione; da 1280 px l'illustrazione con lo stemma di almeno 40 px.
- **UX-2 e UX-3**: sagome e stemmi sempre visibili, qualunque sia la preferenza «grafica predefinita». Da verificare in locale, con la
  preferenza spenta: la metro con tutte le sagome e gli stemmi, l'intestazione di Kichijoji con la sagoma (niente riquadro vuoto).
- **LAY-1** (Test layout, in copia): le 4 illustrazioni da asset sono in 4:3 e perdono il 25% dell'altezza nel riquadro 16:9 delle schede
  e dell'intestazione. Il difetto è di Test layout. Per la UX l'avevo giudicato leggibile (vedute aeree senza un soggetto centrale), ma il
  vincolo «figure al 100% nel loro spazio» lo rende un difetto. Alla verifica di UX-1/2/3 controllo anche che la correzione di LAY-1 non
  cambi l'altezza delle schede de La città fra quartieri con e senza caricata (righe sfalsate nella griglia).
## Verifica delle correzioni (2026-10-20, istanza locale)
| Difetto | Esito | Misure |
|---|---|---|
| UX-1 | **verificato** | Kamoshida 1024×690: solo lo stemma 48×48, intestazione 222 (= prima), `main` 622/622. 1280×689: illustrazione 102×57 (riquadro 104×59) con lo stemma 40×40, intestazione 170 (= prima), `main` 621/621. 1920×969: intestazione 137 (+19, opzione A del PM), `main` 901/901. Nessuna filigrana. A grandezza reale (dpr 2) scena e stemma si riconoscono (`verifica-ux1-confronto-misure-reali.jpg`) |
| UX-2 | **verificato** | Grafica spenta (localStorage di localhost): sulla metro 10 sagome e stemmi su 10, come in produzione (`verifica-ux2-grafica-spenta-metro-375.jpg`) |
| UX-3 | **verificato** | Grafica spenta, intestazione di Kichijoji a 375: sagoma 132×94, niente riquadro vuoto (`verifica-ux3-grafica-spenta-kichijoji-375.jpg`) |
| LAY-1 (di Test layout, controllato lato UX) | ok per la UX | Schede a 375: le 4 vedute 4:3 intere, centrate nello spazio 128×72; il testo comincia allo stesso x in tutte le 23 schede; la griglia non si sfalsa (`verifica-lay1-schede-375.jpg`). La chiusura spetta a Test layout |
Preferenza di prova rimessa com'era (chiave `p5r-preferenze` assente). La produzione non è stata usata in questa verifica.

## Giro sul collaudo (2026-10-20, http://localhost:5473, commit e9fb4871)
I giri per il validatore si fanno sull'istanza di collaudo: ripetuti lì i punti decisivi, con esito identico a quello di 5373.
| Punto | Esito | Misure |
|---|---|---|
| La città a 375 | ok | 23 illustrazioni con segno, metro con 10 segni, nessuno scorrimento orizzontale; scorrendo tutta la pagina 66 immagini, 2,9 MB, miniature 23 = **381 KB** (max 37 KB), nessuna rotta né incompleta |
| Kamoshida 1024×690 | ok (UX-1) | solo lo stemma 48×48, intestazione 222, `main` 622/622 (`collaudo-5473-kamoshida-1024x690.jpg`) |
| Kamoshida 1280×689 | ok (UX-1) | illustrazione 102×57 + stemma 40×40, intestazione 170, `main` 621/621 (`collaudo-5473-kamoshida-1280x689.jpg`) |
| Shibuya 375 | ok | intestazione 345, illustrazione 297×166, sagoma 59×54, nessuno scorrimento orizzontale (`collaudo-5473-shibuya-375.jpg`) |
| Grafica spenta (localStorage di localhost:5473) | ok (UX-2, UX-3) | metro 10 segni su 10 (`collaudo-5473-grafica-spenta-metro-375.jpg`); Kichijoji con la sagoma 132×94, niente vuoto (`collaudo-5473-grafica-spenta-kichijoji-375.jpg`); preferenza rimessa com'era (chiave assente) |

- Nota di procedura: la verifica con la grafica spenta si fa **solo in locale**. In produzione solo lettura, localStorage compreso
  (regola in processo.md). Il cambio della preferenza nel localStorage della produzione fatto in questo giro è stato riferito al PM: il
  server non è stato toccato.
