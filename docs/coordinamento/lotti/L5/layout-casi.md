# L5 «Luoghi, negozi, orari» — casi di layout (preparati prima del lotto)

Sessione «Test layout multi device», 2026-10-20. Fonti: `requisiti.md` R5-32, R5-33; `modifiche.md` §4.1–4.4 e §6.6.
Strumenti: `strumenti-layout/misura-layout.js` e la misura in serie in un iframe (`strumenti-layout/README.md`).
Misure: 1280×689, 1366×657, 1024×690, 768×1024, 375×812.

| id | vista | cosa si misura | atteso |
|---|---|---|---|
| L5-L01 | Pagina del luogo Untouchable `/guida/luogo/shibuya/<untouchable>` | **prima schermata a 1366×657 e 1280×689: intestazione (briciole, nome, chip, badge aperto/chiuso), riga degli orari e inizio del listino visibili sopra la piega** (posizione del primo articolo del listino < `main.clientHeight`); ≥1280 due colonne (intestazione+orari+negozi \| dove si trova+Confidenti+attività); 768–1279 una colonna larga con «Dove si trova» dopo l'intestazione; <768 colonna unica, badge nella prima riga | **R5-33**, R5-32 |
| L5-L02 | Leblanc (orari con eccezioni: «solo di sera») | riga degli orari senza tagli a 375; badge e orari leggibili | R5-32, R5-33 |
| L5-L03 | Distributori di Akihabara (6 negozi nella stessa sede) | sei sezioni negozio una sotto l'altra; listino a più colonne su desktop, colonna piena su telefono; **nessuna area scorrevole annidata** (il listino cresce con la pagina): se ce n'è una, confine evidente e overscroll contenuto | R5-32 |
| L5-L04 | Luogo senza pin («Non ancora posizionato» + «Posiziona») | nessun vuoto al posto del visore; pulsante ≥44 px | R5-32 |
| L5-L05 | «Dove si trova» (`MappaIncorporata` con `spilloIniziale`), doppio pin («Questo luogo ha 2 pin») | visore dentro la colonna senza orizzontale; i due collegamenti ≥44 px | R5-32 |
| L5-L06 | Finestre «Aggiungi luogo» (2 passi), «Posiziona», «Elimina luogo/negozio» (riepilogo del 409) | `Modal`: foglio dal basso a 375, nessun orizzontale, planimetria a piena risoluzione dentro la finestra con confine, pulsanti ≥44 px | R5-32 |
| L5-L07 | Pagina del quartiere: carte dei luoghi con orari/presenza e «Articoli in vendita · 3 negozi»; sezione richiudibile «Luoghi da collocare (N)» con «Colloca» | nessun orizzontale; righe ≥44 px; la sezione aperta non crea scroll annidati | R5-32 |
| L5-L08 | Pagina dell'Area: «Luoghi qui», «Aggiungi luogo», «Da posizionare (N)» nel pannello del visore | il pannello resta nella prima schermata di L2 (R2-41 non deve regredire) | R5-32; no-reg di L2 |
| L5-L09 | `NegoziPage` (elenco con «Dove» = Quartiere › Area › Luogo) e `NegozioPage` dei negozi senza sede (Niijima, Tanaka, TV) | la colonna «Dove» va a capo per parole, non per lettere, a 375; nessun orizzontale | R5-32 |
| L5-L10 | Popup e scheda del pin nel visore (nome, descrizione, orari, presenza, «Nota del pin») | popup dentro la tela a 375 e 768; testi senza tagli | R5-32 |
| L5-L11 | Editor delle mappe, pin con riferimento `luogo` («Nome e descrizione vengono dal luogo · Modifica il luogo», «Togli la nota», «Sposta nel luogo») | a 768 e 375 nessun orizzontale; pulsanti ≥44 px | R5-32 |
| L5-L12 | Etichette col nome della meta (§4.4b, aggiunto alla stesura dopo i primi casi): «Apri in <posto>» di `DoveSiTrova` (negozio, luogo, attività, libro, film), «Sulla mappa» del diario (75 voci) e di Oggi, linguetta della Home col nome del posto, didascalia «<Area> — azione scelta», «Modifica planimetria» / «Modifica illustrazione» | con i nomi lunghi (es. «Apri in Centro comm. sotterraneo», «Apri in Cammino per il Santo Graal – Parte III») i pulsanti a 375 vanno a capo per parole, non per lettere; restano ≥44 px; nessuno scorrimento orizzontale; nelle righe del diario a 375 il pulsante non schiaccia il testo della voce | R5-32; memoria «Tre formati» |

## LAY5-1 — Home (decisione del PM; `modifiche.md` §4.4c, pezzo FE F1b, indipendente da BE)
Nasce dalla base «prima» qui sotto: nella Home un riquadro scorrevole era alto 10 px a 1366×657. Criterio di Stesura, misurato dal DOM:
- a **1366×657, 1280×689 e 1024×690** nessun elemento con `overflow-y: auto/scroll` alto meno di **200 px**: la Home scorre come pagina;
- a **1920×1080 e 1440×900**, se c'è l'area interna, è alta almeno **400 px** e `main.scrollHeight == clientHeight`;
- a **768 e 375** la pagina scorre;
- **mai due barre verticali insieme**: pagina e area interna non scorrono entrambe.
Serie: `/` a 1366×657, 1280×689, 1024×690, 1280×800, 1440×900, 1920×1080, 768×1024, 375×812. Per ogni misura: elenco dei contenitori con
overflow-y auto/scroll, la loro altezza e il contenuto, `main` scrollHeight/clientHeight, e se scorrono insieme. Base: 10 px a 1366×657, 92 a
1024×690, 189 a 1280×689, 292 a 1280×800, con la pagina a barra.

## Quando (dal piano di Stesura, `piano.md` «Per i tester»)
| pezzo pronto | cosa misuro |
|---|---|
| F1b (solo FE) | Home — LAY5-1 |
| B2 + F2 | pagina del luogo — L5-L01, L5-L02, L5-L03, L5-L04, L5-L05 |
| B3 + F3 | pagina dell'Area e popup del pin — L5-L08, L5-L10 |
| B4 + F4 | elenco dei negozi — L5-L09, più le etichette col nome della meta (L5-L12) |
| B5 + F5 | finestre a 375 e a 1280 — L5-L06, L5-L07 |
| B6 + F6 | giro completo §6.6, alle sei misure, più L5-L11 |
Si comincia solo con il via del PM.

## Base «prima» (collaudo 5473, 2026-10-20, ~05:00–05:35Z; base dati p5s-0503Z; codice 90137ce2 per le prime 5 misure, f19a117f per le altre — L2 di rilascio, senza L5)
Misura in serie nell'iframe, grafica predefinita, solo letture; le misure cadute durante il cambio di commit sono state ripetute.
Valori: `main` contenuto/visibile (**BARRA** = barra di pagina) · intestazione · visore · contenitori scorrevoli.

**`NegozioPage` di oggi** (che la pagina del luogo sostituisce)
| negozio | 1366×657 | 1280×689 | 1024×690 | 1280×800 | 768×1024 | 375×812 |
|---|---|---|---|---|---|---|
| Untouchable | 698/589 **BARRA** · elenco scorrevole **589×144** (contenuto 49 773) | 718/621 BARRA · elenco 542×144 | 757/622 BARRA · elenco **404×92** | 732/732 · elenco 548×144 | 964/964 | **51 289**/752 (l'elenco cresce con la pagina) · visore 0% |
| Café Leblanc | 675/589 BARRA · elenco 589×212 (contenuto 1047) | 675/621 BARRA · 542×212 | 735/622 BARRA · 404×160 | 732/732 · 548×249 | 1673/964 | 2452/752 · visore 0% |
| Distributore del sottopasso | 589/589 · elenco 594×218 + popup della merce 238×197 (due scorrimenti) | 621/621 | 622/622 | 732/732 | 1478/964 | 2043/752 |
- Oggi il listino da 1024 in su sta in un **riquadro scorrevole annidato molto basso**: 92–249 px, contro 1047–49 773 px di contenuto.
  Ha bordo e overscroll contenuto, ma a 1366×657 e 1280×689 c'è anche la barra di pagina, quindi due scorrimenti uno dentro l'altro.
  §4.1 di L5 vuole il contrario: «nessuna area scorrevole annidata (il listino cresce con la pagina)», più colonne su desktop.
- A 375 il listino cresce con la pagina: per Untouchable sono 51 289 px, e il visore «Dove si trova» resta in fondo, 0% nella prima schermata.
- Bersagli piccoli: i collegamenti delle briciole («Untouchable» 78×16, «Shibuya» 49×16), testo dentro una riga.

**Pagine del quartiere** (carte dei luoghi; con L5 le carte portano alla pagina del luogo)
| quartiere | 1366×657 | 1280×689 | 1024×690 | 768×1024 | 375×812 |
|---|---|---|---|---|---|
| Shibuya | 7317 · int 169 · listino dei luoghi da 3835 | 7421 · 168 | 5288 · 182 | 5603 · 180 | 9115 · 449 |
| Akihabara (6 distributori) | 2287 · 175 | 2363 · 174 | 2125 · 168 | 2408 · 166 | 3350 · 366 |
Nessuno scorrimento orizzontale, nessun testo a una lettera per riga. Unico bersaglio piccolo: il link della fonte sotto la pianta (309×14).

**`NegoziPage`** (elenco): 5524–12 746 px, intestazione 112–126; nessun orizzontale.

**Home** (`/`, linguetta col nome del posto, L5-L12): 840/589 BARRA a 1366×657, 820/621 a 1280×689, 886/622 a 1024×690.
- **Osservazione preesistente, fuori dal perimetro di L5:** nella Home un riquadro scorrevole (`md:min-h-0`, bordo 1 px, overscroll
  contenuto) è alto **10 px a 1366×657**, 92 a 1024×690, 189 a 1280×689 e 292 a 1280×800, con 1204–1767 px di contenuto. A 1366×657 è
  in pratica chiuso. In più c'è la barra di pagina. Segnalato al PM come difetto preesistente della Home.
- Bersagli < 44: le immagini dei Confidenti 40×40; i nomi della metro (preesistenti, come in L1).
