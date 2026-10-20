# L3 — LAY3-8 e riprova breve su newreview-l3 = 08da0557 (Test layout multi device, 2026-10-20)

Collaudo FE 5473 / BE 3301, dati uguali alla base. Fra db7d0423 e 08da0557 cambia solo `SelettoreVersioni.tsx` (più il suo test). Solo
letture.
- Misura dal DOM in un iframe della stessa origine, coi font caricati.
- Menu pieno: `menuRidotto:false` solo durante le serie, poi la preferenza del browser è tornata identica (controllata).

## 1. LAY3-8 — elenco aperto delle versioni dentro la finestra: **verde**
L'elenco delle versioni si apre solo nelle aree con 2 o più versioni, e solo da 1024 in su. Sotto i 1024 le versioni sono una fila.
- **Tutte le 72 aree con 2–6 versioni dei 9 Palazzi**, a 1366×657, 1280×689, 1024×690, 1920×1080 e 1280×800: **360 elenchi aperti su 360
  dentro la finestra**.

  | misura | casi | dentro | fine più bassa dell'elenco | scorrono dentro |
  |---|---|---|---|---|
  | 1366×657 | 72 | 72 | 649 (finestra 657) | 2, con overscroll contenuto |
  | 1280×689 | 72 | 72 | 667 (689) | 0 |
  | 1024×690 | 72 | 72 | 662 (690) | 0 |
  | 1920×1080 | 72 | 72 | 621 (1080) | 0 |
  | 1280×800 | 72 | 72 | 667 (800) | 0 |

  In tutti: 0 voci sotto i 44 px, 0 nomi tagliati nell'elenco.
- Il caso di LAY3-8, Shido col suo elenco di 6 versioni a 1366×657, ora va da 325 a **649** e scorre dentro (322/340, overscroll contenuto).
  Prima andava da 325 a 667.
- Area predefinita dei 9 Palazzi alle 7 misure, 375 e 768 comprese (63 casi):
  - l'elenco c'è a Kamoshida, Niijima e Shido da 1024 in su (15 casi), sempre dentro;
  - negli altri casi il selettore delle versioni non c'è, perché l'area predefinita ha una sola versione o sotto i 1024 c'è la fila.

## 2. R3-41, LAY3-5 e LAY3-7: **verdi**
Serie di 532 misure (76 infiltrazioni × 7 misure):

| misura | inizio del visore (metà) | intestazione / soglia 30% | altro |
|---|---|---|---|
| 1366×657 | 327–328 (328,5) | 106 / 197 | nessuna barra |
| 1280×689 | 327–328 (344,5) | 106 / 206 | nessuna barra |
| 1024×690 | 340 (345) | 106 / 207 | nessuna barra |
| 1280×800 | 327–328 (400) | 106 / 240 | nessuna barra |
| 1920×1080 | 317–327 (540) | 106 / 324 | nessuna barra |
| 768×1024 | visore alto 560 | **198** / 307 | |
| 375×812 | visore alto 520 | **208–220** / 243 | «Aree · N» 299×44–50, intero |

- R3-41 entro metà in **380 su 380**. Nessuno scorrimento orizzontale, nessun bersaglio sotto i 44 px, nessun testo a una lettera per riga.
- LAY3-7: a 375 e 768 **nessun testo tagliato** nella pagina. Da 1024 in su i soli testi accorciati sono:
  - il valore chiuso dei selettori compatti dell'infiltrazione e delle versioni, come deciso dal PM, col nome intero nell'etichetta
    accessibile e nell'elenco aperto;
  - le frasi del sovrano e le arcane lunghe nell'intestazione, regola di LAY3-2.

  Fuori da questi non ci sono testi tagliati.

Prove: `misure-grezze.json` (360 elenchi per area, 63 elenchi dell'area predefinita, serie di 532 righe).
