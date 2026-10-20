# L2 «Mondo: aree e planimetrie» — casi di layout (preparati prima del lotto)

Sessione «Test layout multi device», 2026-10-20. Fonti: `requisiti.md` R2-40, R2-41, R2-42; `modifiche.md` §4.2–4.6 e §6.6.
Strumento: `C:\Users\rober\.claude\p5s-coordinamento\strumenti-layout\misura-layout.js`, da incollare in javascript_tool dopo
navigate → resize_window → screenshot. Per le misure in serie (molte pagine, una sola informazione) uso un iframe della stessa origine
dimensionato come la finestra (`strumenti-layout/README.md`). Grafica predefinita accesa; controllo `p5r-preferenze` prima di ogni giro.
Misure: **1280×689, 1366×657, 1024×690** (barra di pagina), **768×1024**, **375×812**; 1280×800 come riferimento per le schermate «prima» di Analisi app.
Nelle risposte, per ogni pezzo segnalato da FE: misura subito alle sei misure; i difetti in `difetti.md` (id LAY-n), notificati a FE.

## Casi
| id | vista | cosa si misura | atteso (criterio) |
|---|---|---|---|
| L2-L01 | Quartiere Shibuya `/guida/citta/shibuya` (con caricata, molte aree) | orizz., fuori, intestazione con IllustrazioneConSegno, colonne del corpo (≥1280 due: illustrazione \| aree + luoghi; da 1536 aree in 2 colonne; 768–1279 illustrazione piena + aree/luoghi in 2 colonne; <768 colonna unica), altezza dell'illustrazione (`max(420px, min(64vh, 740px))`; telefono `min(56vh, 460px)`), carte delle aree (telefono: orizzontali, miniatura 96×72), azioni «Entra / Ingresso / Aggiungi area» ≥44 px, ↑/↓ di «Riordina» ≥44 px | R2-40, R2-42; nessuna area scorrevole annidata (le liste crescono con la pagina); colonna sinistra `sticky` da 1280 senza coprire niente |
| L2-L02 | Quartiere Kichijoji (1 area, solo asset 4:3) | come L01; illustrazione 4:3 intera (LAY-1 di L1 non deve tornare) | R2-40; nessun taglio |
| L2-L03 | Quartiere Ikebukuro (nessuna area) | messaggio «Nessuna area in Ikebukuro: aggiungine una» + pulsante ≥44 px; la colonna destra non lascia buchi | R2-40 |
| L2-L04 | Quartiere con `?ingresso=1` (dalla metro) | finestra dell'area d'ingresso: `Modal` larga su desktop, foglio dal basso a 375; visore dentro senza scorrimento orizzontale; «Apri l'area» / «Chiudi» ≥44 px; niente barra di pagina sotto la finestra che scorre insieme | R2-40; memoria «Scroll annidati» |
| L2-L05 | Area Sottopasso `/guida/citta/shibuya/sottopasso` (versioni) | testata compatta (una riga da 1024), fila delle versioni (miniature 64×48, segmenti ≥44 px), visore `calc(100dvh - testata - versioni)` min 420; **a 1366×657 e 1280×689 testata + versioni + visore nella prima schermata** (`main` senza barra o visore interamente sopra la piega); a 375 versioni in fila orizzontale con bordo evidente e `overscroll-behavior-x: contain`, visore `min(64dvh, 560px)`, pannello sotto | **R2-41**, R2-40 |
| L2-L06 | Area Sottopasso, versione senza pin | l'avviso in testa al visore non spinge il visore sotto la piega a 1366×657 / 1280×689 | R2-41 |
| L2-L07 | Area Central Street (senza versioni) | niente fila delle versioni; visore pieno; pannello a destra da 1280, chiudibile 768–1279, sotto a 375 | R2-41, R2-40 |
| L2-L08 | Area Covo dei Ladri (5 versioni) + carta «Sfide e Medaglie P del Covo» | fila di 5 versioni: a 375 scorre in orizzontale contenuta; la carta non va oltre il bordo | R2-40, R2-41 |
| L2-L09 | `CovoPage` con la carta «Planimetrie del Covo» | nessun orizzontale, carta ≥44 px | R2-40 |
| L2-L10 | Finestre Ingresso / Aggiungi area / Aggiungi planimetria / Modifica area / Colloca | `Modal`: a 375 foglio dal basso, nessun orizzontale, contenuto scorrevole interno con confine e overscroll contenuto, pulsanti ≥44 px, zoom 1–6 con bersagli ≥44 px | R2-40 |
| L2-L11 | La città: sezione «Planimetrie da collocare (N)» con «Colloca» | sotto le schede; righe ≥44 px; nessun orizzontale; la lista schede a 1280/1366 resta con contain e bordo | R2-40 |
| L2-L12 | Metro (`MappaTokyo`) e «Oggi» (`OggiMappa`) toccati da FE | nessuna regressione di layout rispetto a L1 (sagome, stemmi, nessun orizzontale; con grafica spenta sagome presenti) | no-reg di layout |
| L2-L13 | Visore intero `/guida/mappe/<chiave>` di un Palazzo (casa invariata) | invariato rispetto alla base | no-reg di layout |

## Base «prima» (collaudo 5473, commit e9fb4871 = L1, 2026-10-20; misura in serie nell'iframe, grafica predefinita)
Le schermate «prima» di Analisi app sono in `schermate-prima/` (1280×689, 1280×800, 1366×657, 375×812, 768×1024). Le mie misure dal DOM
sono qui sotto. Tre misure prese mentre un'altra sessione aveva spento la grafica sono state ripetute.
Formato: `main` contenuto/visibile · intestazione · visore (distanza dall'alto del `main`, altezza, quota visibile nella prima schermata) · scroll annidati.

**Pagine del quartiere** (oggi `QuartierePage`: intestazione, poi visore incorporato della pianta d'ingresso e luoghi; L2 la riscrive)
| quartiere | 1280×689 | 1366×657 | 1024×690 | 768×1024 | 375×812 |
|---|---|---|---|---|---|
| Shibuya | 6638/621 · 147 | 6532/589 · 147 | 4848/622 · 147 · visore 243/442, 86% | 5176/964 · 158 · 250/655, 100% | 8565/752 · 345 · 437/520, 61% |
| Yongen-Jaya | 3943/621 · 147 · visore 243/441, 86% | 3775/589 · 147 · 243/420, 82% | 3522/622 · 147 · 86% | 3819/964 · 158 · 100% | 5704/752 · 306 · 398/520, 68% |
| Kichijoji (1 area) | 3851/621 · 159 · 255/441, 83% | 3819/589 · 147 · 243/420, 82% | 3415/622 · 153 · 84% | 3756/964 · 158 · 100% | 5435/752 · 390 · 482/520, 52% |
| Ikebukuro (nessuna area) | 1011/621 · 147 · 86% | 973/589 · 147 · 82% | 1325/622 · 134 · 89% | 1671/964 · 158 · 100% | 1957/752 · 331 · 423/520, 63% |
Nessuno scorrimento orizzontale, nessun elemento oltre il bordo, nessuno scroll annidato: le liste crescono con la pagina, come chiede §4.2.
Unico bersaglio piccolo: il link della fonte «Megami Tensei Wiki» sotto la pianta di Kichijoji (309×14; 225×32 a 375).

**Visori di oggi** (`/guida/mappe/<chiave>`: diventeranno pagine Area; il visore occupa tutta la vista)
| mappa | 1280×689 | 1366×657 | 1024×690 | 768×1024 | 375×812 |
|---|---|---|---|---|---|
| Sottopasso `shibuya-sottopasso-nativo-rmap-001-2-0` | 621/621 · barra 57 · pannello 340×632 (contain) + elenco 309×276 (contain, bordo) | 589/589 · pannello 340×600 | 622/622 | 964/964 · barra 109 · pannello 768×614 + elenco 738×410 | 752/752 · barra 101 · pannello 375×471 + elenco 345×325 |
| Sottopasso Speciale | 621/621 | 589/589 | 622/622 | 964/964 · barra 109 | 752/752 · barra 101 |
| Central Street | come il Sottopasso | idem | idem | idem | idem |
| Covo dei Ladri `covo-dei-ladri` (in L1 le 5 planimetrie sono radici senza genitore) | 621/621 · pannello 340×632 | 589/589 | 622/622 | 964/964 · barra 94 | 752/752 · barra 80 · pannello 375×487 |
Il pannello laterale del visore (`aside.visore-mappa__pannello`) scorre con `overscroll-behavior: contain` ma senza bordo proprio
(bordo 0; lo separa lo sfondo). Il suo elenco interno ha il bordo da 1 px. Preesistente, da tenere d'occhio quando diventa
`contenutiPannello` della pagina Area.
Attenzione: gli indirizzi `yongen-jaya-covo-dei-ladri…` esistono solo dopo la 109 (L2). Sul collaudo L1 danno «La mappa o il contenuto
richiesto non esiste».

**`CovoPage`** (`/guida/covo`): 5099/621 a 1280×689, 4884/589 a 1366×657, 5781/622 a 1024×690, 7942/964 a 768, 11675/752 a 375; intestazione
93 px (87 a 375); nessun orizzontale. È una pagina lunga: la carta «Planimetrie del Covo» di L2 si aggiungerà senza cambiare la natura della pagina.

**Che cosa deve cambiare con L2 (R2-41).** A 1366×657 e 1280×689 la pagina Area deve mostrare testata + versioni + visore nella prima
schermata. Il visore di oggi occupa già tutta la vista, ma senza testata e senza versioni. La pagina Area nuova sta dentro il layout con la
barra dell'app: `calc(100dvh - testata - versioni)`, minimo 420 px, quindi a 1280×689 restano circa 201 px per testata e versioni.
