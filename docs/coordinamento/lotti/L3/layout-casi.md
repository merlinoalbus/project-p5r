# L3 «Palazzi: aree e infiltrazioni» — casi di layout (preparati prima del lotto)

Sessione «Test layout multi device», 2026-10-20. Fonti: `requisiti.md` R3-40, R3-41; `modifiche.md` §4.2–4.4 e §6.6.
Strumenti: `strumenti-layout/misura-layout.js` (pagina caricata) e la misura in serie in un iframe (`strumenti-layout/README.md`).
Misure: 1366×657, 1280×689, 1024×690 (una schermata), 768×1024, 375×812; in più 1440×789 e 1920×969 per controllare l'intestazione da 1280 in su.

## Criterio principale: ogni Palazzo in una schermata
Le schede di **tutti** i Palazzi (Kamoshida, Madarame, Kaneshiro, Futaba, Okumura, Niijima, Shido, **Maruki**, Iweleth) a 1366×657, 1280×689 e
1024×690 senza barra di pagina: `main.scrollHeight <= main.clientHeight`, misurato dal DOM con le animazioni finite. **Maruki** oggi ha la barra a
1280×689 (main 638/621): con L3 non deve più averla. In più (R3-41): **visore e versioni nella prima schermata** a 1366×657 e 1280×689. Oggi il
visore sta sotto la piega: la base sotto dice quanto se ne vede.

## Variante R3-41 accolta dal PM (2026-10-20): «il visore deve cominciare entro metà altezza»
Criterio misurabile, per ogni Palazzo e per la pagina dell'area:
- `top` del visore (`main .visore-mappa`, nella vista della finestra) **≤ innerHeight / 2**;
- **nessuna barra di pagina** (`main.scrollHeight <= clientHeight`);
- fila delle versioni, se c'è, sopra il visore e nella prima schermata.
Serie (iframe, `strumenti-layout/serie-r3-41.js`): i nove Palazzi + `kamoshida/area/prigione-sotterranea-tutorial` + `shido` (versioni lunghe) a
**1366×657, 1280×689, 1024×690, 1440×789, 1536×789, 1920×969**. Per ogni misura: top del visore, metà altezza, scarto, altezza del visore e
quota visibile, altezza dell'intestazione, barra sì/no. Prima la base di oggi: nel giro intermedio il visore cominciava fra 383 e 826 px dall'alto del
`main`, quindi oltre metà altezza (328–345) a 1366×657 e 1280×689 su tutti i Palazzi; la serie la rimisura nella vista. Poi a variante applicata, sulla **copia fresca** dei dati di persona5royal quando BE la porta su 5373.

## Casi
| id | vista | cosa si misura | atteso |
|---|---|---|---|
| L3-L01 | Le nove schede dei Palazzi, nessun parametro | `main` scrollHeight/clientHeight; altezza dell'intestazione; posizione del visore (top, altezza, quota visibile nella prima schermata) | nessuna barra a 1366×657, 1280×689, 1024×690; visore e versioni visibili per intero a 1366×657 e 1280×689 |
| L3-L02 | Kamoshida con l'area dalle 5 versioni (152-1-0), `?infiltrazione=` / `/area/<slug>` | fila delle versioni (`VersioniArea`): segmenti ≥44 px, sopra il visore; visore `calc(100dvh - intestazione - righe)`, min 420 | R3-41 |
| L3-L03 | Madarame (la più lunga in intestazione: 194/265 px) | colonna «Aree · N» con scorrimento proprio, confine evidente, overscroll contenuto; ↑/↓ di riordino ≥44 px | R3-40, R3-41 |
| L3-L04 | Futaba (infiltrazioni senza aree) | in coda «infiltrazioni senza aree» con «Collega aree» ≥44 px; al posto del visore il messaggio «Quest'infiltrazione non tocca ancora aree»: niente vuoto né barra | R3-40 |
| L3-L05 | Iweleth | come L01 e L02 | R3-41 |
| L3-L06 | 768–1279 | aree in fila scorrevole orizzontale sopra il visore, con confine e `overscroll-behavior: contain`; raccolta sotto | memoria «Scroll annidati» |
| L3-L07 | <768 (375) | intestazione compatta; selettore dell'infiltrazione; aree in un foglio dal basso («Aree · N»); versioni in fila scorrevole; visore `min(64dvh, 560px)`; nessuno scorrimento orizzontale | R3-40 |
| L3-L08 | Finestre «Aggiungi area / planimetria / infiltrazione», «Modifica area», «Modifica aree», eliminazione (riepilogo) | a 375 foglio dal basso; nessun orizzontale; caselle e pulsanti ≥44 px; contenuto scorrevole interno contenuto | R3-40 |
| L3-L09 | Diario: campo «Infiltrazione» ed «Entra» (§4.4) | riga della voce senza testi a una lettera per riga a 375; «Entra» ≥44 px | R3-40 |
| L3-L10 | «Da collocare» (La città) con le planimetrie dei Palazzi | come L2-L11 | R3-40 |
| L3-L11 | Memento | invariati rispetto alla base di L1 (intestazione 116 da 1024, una schermata) | no-reg di layout |

## Base «prima» (FE 5373, 2026-10-20, `DungeonDettaglioPage` com'è nel commit di L1; misura in serie nell'iframe, grafica predefinita)
`main` = scrollHeight/clientHeight (**BARRA** = barra di pagina) · intestazione in px · visore: distanza dall'alto del `main`, altezza, parte
visibile nella prima schermata.

| Palazzo | 1366×657 | 1280×689 | 1024×690 | 1440×789 | 1920×969 |
|---|---|---|---|---|---|
| Kamoshida | 589/589 · 170 · visore 605/295, **0%** | 621/621 · 170 · 626/322, **0%** | 622/622 · 222 · 666/300, **0%** | 721/721 · 170 · 70% | 901/901 · 137 · 100% |
| Madarame | 589/589 · 194 · 745/295, **0%** | 621/621 · 194 · 770/322, **0%** | 622/622 · 265 · 826/300, **0%** | 721/721 · 194 · 25% | 901/901 · 170 · 100% |
| Kaneshiro | 589/589 · 197 · 39% | 621/621 · 197 · 40% | 622/622 · 249 · 29% | 721/721 · 197 · 92% | 901/901 · 137 · 100% |
| Futaba | 589/589 · 170 · 55% | 621/621 · 170 · 60% | 622/622 · 222 · 45% | 721/721 · 170 · 100% | 901/901 · 137 · 100% |
| Okumura | 589/589 · 197 · 39% | 621/621 · 197 · 40% | 622/622 · 249 · 29% | 721/721 · 197 · 92% | 901/901 · 137 · 100% |
| Niijima | 589/589 · 170 · 70% | (pagina non caricata nel giro: da ripetere) | 622/622 · 249 · 51% | 721/721 · 170 · 100% | 901/901 · 137 · 100% |
| Shido | 589/589 · 170 · 56% | 621/621 · 170 · 50% | 622/622 · 222 · 46% | 721/721 · 170 · 100% | 901/901 · 170 · 100% |
| **Maruki** | 589/589 · 270 · 22% | **638/621 BARRA** · 322 · 1% | **653/622 BARRA** · 337 · 8% | 721/721 · 255 · 72% | 901/901 · 240 · 100% |
| Iweleth | 589/589 · 170 · 42% | 621/621 · 194 · 35% | 622/622 · 194 · 41% | 721/721 · 170 · 93% | 901/901 · 137 · 100% |

Letture:
- Oggi la barra di pagina c'è solo su **Maruki**, a 1280×689 (+17 px) e **anche a 1024×690 (+31 px)**: questo secondo caso non era fra i
  rilievi di FE. L'intestazione di Maruki è la più alta (270–337 px), contro i 170–265 degli altri.
- Il criterio R3-41 oggi non è soddisfatto: a 1366×657 e 1280×689 il visore è visibile dallo **0%** (Kamoshida, Madarame) al **70%**
  (Niijima), mai per intero. È la ragione del lavoro di L3 (visore che riempie l'altezza utile).
- Il visore misura 295–322 px. Con L3 deve diventare `calc(100dvh - intestazione - righe)`, minimo 420 px: a 1280×689 serve un'intestazione
  compatta, perché 621 − 420 = 201 px restano per intestazione, riga dell'infiltrazione e versioni.
- Nessuno scorrimento orizzontale a nessuna misura.
