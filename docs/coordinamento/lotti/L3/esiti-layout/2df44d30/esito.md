# L3 — riverifica di layout prima del validatore, newreview-l3 = 2df44d30 (Test layout multi device, 2026-10-20)

Collaudo FE 5473 / BE 3301, dati uguali alla base. Commit nuovi:
- d3c97ac9: UX3-12;
- 2df44d30: UX3-13 («Aree toccate» nella colonna delle aree, con la legenda).

Solo letture.
- Misura dal DOM in un iframe della stessa origine, coi font caricati (`loaded` in tutte).
- Menu pieno: `menuRidotto:false` solo durante le serie, poi la preferenza del browser è tornata identica (controllata).
- Il controllo dei testi tagliati copre tutta la pagina, tranne il visore.

## 1. R3-41: **verde** (380 su 380)
| misura (metà) | inizio del visore | altezza del visore | `main` |
|---|---|---|---|
| 1366×657 (328,5) | **317–318** | 308–309 | 589/589 |
| 1280×689 (344,5) | **317–318** | 340–341 | 621/621 |
| 1024×690 (345) | 340 | 300 | 622/622 |
| 1280×800 (400) | 317–318 | 451–452 | 732/732 |
| 1920×1080 (540) | 317 | 732 | 1012/1012 |

Da 1280 in su, tolta la striscia «Aree toccate», il visore comincia circa 10 px più in alto (prima 327–328) ed è più alto di 10 px. A 1024 è
invariato.

## 2. LAY3-5 — intestazione ≤ 30%: **verde**
| misura (soglia) | 9 Palazzi | Memento |
|---|---|---|
| 375×812 (243) | 208–220 | 136 |
| 768×1024 (307) | 198 | 156 |
| 1024×690 (207), 1280×689 (206), 1366×657 (197), 1920×1080 (324) | 106 | 106 |

Nessun caso sopra soglia in 532 + 6 misure.

## 3. LAY3-3, LAY3-7, LAY3-8: **verdi**
- **LAY3-3**: visore alto **520** a 375×812 e **560** a 768×1024, in 76 su 76.
- **LAY3-7**:
  - a 375 e 768 nessun testo tagliato nella pagina; «Aree · N» a 375 è 299×44–50, col nome intero;
  - da 1024 in su si accorciano solo il valore chiuso dei selettori compatti, come deciso dal PM, e le frasi lunghe dell'intestazione,
    regola di LAY3-2;
  - **nessun altro testo tagliato**, legenda compresa.
- **LAY3-8**: le 72 aree con 2–6 versioni × 1366×657, 1280×689, 1024×690, 1920×1080 e 1280×800 danno **360 elenchi aperti su 360 dentro la
  finestra**.
  - Fondo più basso: 649 a 1366×657, 657 a 1280×689, 662 a 1024×690.
  - L'unico caso che scorre (1366×657) ha l'overscroll contenuto.
  - 0 voci sotto i 44 px, 0 nomi tagliati.

## 4. Colonna delle aree con la legenda (UX3-13): **verde**
Misure 1280×689, 1366×657, 1280×800, 1920×1080, sulle 76 infiltrazioni.
- **Un solo scorrimento nella colonna**: «Aree · N» scorre da sola, con bordo di 1 px e overscroll contenuto, e non è dentro un'altra area
  scorrevole: **0 annidati** in 304 misure. Accanto c'è la colonna «Da raccogliere · N», con il suo scorrimento separato; la pagina non
  scorre.
- La legenda in cima alla colonna («Aree toccate da «N. …» · …», 254×36 a 1366) **non è tagliata**: va su due righe.
- Bersagli ≥ 44 px: nessuno sotto soglia. Nessuno scorrimento orizzontale.
- Schermata: `colonna-aree-legenda-1366x657.jpg`, Kamoshida «4. Vecchio Castello».

## 5. 1024, 768 e 375: **invariati** rispetto a 08da0557
Gli stessi numeri della riprova di 08da0557:

| misura | inizio del visore | altezza del visore | intestazione |
|---|---|---|---|
| 1024×690 | 340 | 300 | 106 |
| 768×1024 | 546–735 | 560 | 198 |
| 375×812 | 640–928 | 520 | 208–220 |

In tutte e tre nessuna barra di pagina dove non c'era, e nessuno scorrimento orizzontale. A 768 e 375 la legenda è il titolo «Aree toccate»
sopra la fila delle aree.

## Difetti
Nessun difetto nuovo.

Prove: `misure-grezze.json` (360 elenchi delle versioni; serie di 532 righe con scorrimenti, legenda e testi tagliati),
`colonna-aree-legenda-1366x657.jpg`.
