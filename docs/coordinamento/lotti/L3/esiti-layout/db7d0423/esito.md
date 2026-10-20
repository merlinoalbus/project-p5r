# L3 — LAY3-6, LAY3-7 e controllo del selettore condiviso su newreview-l3 = db7d0423 (Test layout multi device, 2026-10-20)

Collaudo FE 5473 / BE 3301, dati uguali alla base. Commit:
- 8535c16b: LAY3-6;
- 5bedd907 e db7d0423: LAY3-7.

Solo letture.
- Misura dal DOM in un iframe della stessa origine, coi font caricati (`document.fonts.ready`).
- Menu pieno, cioè la barra laterale predefinita: `menuRidotto:false` solo durante le serie, poi la preferenza del browser è tornata identica
  (controllata).
- Filtro degli elementi nascosti con i contenitori `display: contents` gestiti come in 7562f6ac.
- Il controllo dei testi tagliati copre **tutta la pagina**, tranne il visore.

## 1. LAY3-6 — arcana di Niijima: **verde**
| misura | «Giudizio (Judgement)» | intestazione / soglia 30% |
|---|---|---|
| 375×812 | **135/135**, su due righe (135×38, `white-space: normal`) | **216 / 243** |
| 768×1024 | 147/147 | 198 / 307 |
| 1024×690, 1280×689, 1366×657, 1920×1080 | 147/147 | 106 / 197–324 |

## 2. LAY3-7 — selettori della scheda, con la decisione del PM: **verde**
- **«Aree · N» sotto i 1024 px**: a 375 è alto 44–50 px e il nome dell'area va a capo intero; a 768 c'è la fila delle aree. Nelle 152
  misure a 375 e 768 (76 infiltrazioni × 2) non c'è **nessun testo tagliato** nella pagina.
- **Da 1024 in su** i selettori dell'infiltrazione e delle versioni restano su una riga e il valore chiuso si accorcia, come deciso dal PM:
  - infiltrazione: pulsante 98–103 px a 1280×689 col menu pieno, dove si leggono circa 71 px del nome; 132–137 a 1366; 139–202 a 1024;
  - versioni: 162 a 1280, 248 a 1366, 410 a 1024;
  - il nome intero sta nell'**etichetta accessibile** del selettore dell'infiltrazione («Infiltrazione 1 di 7: 1. Tutorial Palazzo 11/04») e
    in quella delle versioni («Versioni di Prigione sotterranea - Tutorial: Sala Centrale, 1 di 5»).
- **Elenchi aperti**, 9 Palazzi × 1024×690, 1280×689 e 1366×657 (27 casi): tutti i nomi interi, **0 voci troncate**, **0 voci sotto i
  44 px**, sia per l'infiltrazione (246 px, da 5 a 16 voci) sia per le versioni (260–410 px, da 2 a 6 voci).
- Un caso fuori bordo, il nuovo **LAY3-8**: a Shido, a 1366×657, l'elenco delle versioni va da 325 a 667 px, quindi supera di 10 px la
  finestra alta 657. L'ultima voce finisce a 662 ed è nascosta per 5 px su 44. La pagina non scorre (589/589) e l'elenco non ha
  scorrimento proprio (340/340). A 1280×689 sta dentro (667 < 689) e a 1024×690 finisce a 644.
- Altri testi accorciati da 1024 in su, tutti previsti:
  - le frasi del sovrano e le arcane lunghe nell'intestazione, regola di LAY3-2;
  - le righe di dettaglio delle versioni dentro il selettore compatto, per esempio «nessun pin: stanno su «inquadratura…»» o
    «18 pin · si apre per prima · versione 2 di 5», che stanno intere nell'elenco aperto.

## 3. R3-41, LAY3-5 e LAY3-3: **verdi**
| misura | inizio del visore | altezza del visore | intestazione / soglia | `main` |
|---|---|---|---|---|
| 1366×657 | 327–328 (metà 328,5) | 298–299 | 106 / 197 | 589/589 |
| 1280×689 | 327–328 (344,5) | 330–331 | 106 / 206 | 621/621 |
| 1024×690 | 340 (345) | 300 | 106 / 207 | 622/622 |
| 1280×800 | 327–328 (400) | 441–442 | 106 / 240 | 732/732 |
| 1920×1080 | 317–327 (540) | 722–732 | 106 / 324 | 1012/1012 |
| 768×1024 | 546–735 | **560** = min(64dvh, 560) | **198** / 307 | pagina lunga |
| 375×812 | 640–928 | **520** = min(64dvh, 560) | **208–220** / 243 | pagina lunga |

- R3-41 entro metà in 380 su 380. Nessuna barra da 1024 in su, nessuno scorrimento orizzontale.
- Nessun bersaglio sotto i 44 px e nessun testo a una lettera per riga, in 532 misure.

## 4. Selettore condiviso (`Selettore.tsx`, 53 file): **nessun cambiamento**
Confronto fra l'anteprima 5474, che serve il `Selettore.tsx` di prima, e il collaudo 5473 su db7d0423, col menu pieno su tutte e due. Pagine:
Fusione, Compendio, Percorso, Richieste, editor delle mappe (Tokyo), Partita, Impostazioni con la finestra «Nuova partita», e in tutte il
selettore della partita nella barra in alto. Misure: 1366×657, 768×1024, 375×812.

**Identico in 21 misure su 21**: larghezza e altezza dei pulsanti (44 px), etichetta accessibile, testo, larghezza del valore, righe,
`white-space`, nessuno scorrimento orizzontale. Nel codice l'unico cambiamento è l'`aria-label` con `valoreNelNome`, che usa solo la scheda
dei Palazzi. Dettaglio in `selettore-condiviso-prima-dopo.md`. Su p5s non ho potuto misurare, perché questa sessione non può aprire il sito.

## 5. Difetti
- **LAY3-8 (bassa)**: a Shido, a 1366×657, l'elenco aperto delle versioni esce di 10 px dalla finestra e non si può scorrere. Fra i 27 casi
  misurati è l'unico. Vale per l'area predefinita di Shido, 6 versioni, alle larghezze da 1280 in su con la finestra più bassa di 667 px.
  L'elenco non si apre verso l'alto e non si limita all'altezza disponibile.

Prove: `misure-grezze.json` (serie di 532 righe, elenchi aperti, selettore condiviso su 5473) e `selettore-condiviso-prima-dopo.md`.
