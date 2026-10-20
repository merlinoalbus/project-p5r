# L4 «Avanzamento unico» — casi di layout (preparati prima del lotto)

Sessione «Test layout multi device», 2026-10-20. Fonti: `requisiti.md` R4-37; `modifiche.md` §4.1–4.4 e §6.6.
Strumenti: `strumenti-layout/misura-layout.js` e la misura in serie in un iframe (`strumenti-layout/README.md`).
Misure: 1280×689, 1366×657, 1024×690, 768×1024, 375×812. L4 si appoggia sulla scheda del Palazzo di L3: la base «prima» di L4 è il
**risultato di L3** (`lotti/L3/layout.md`), non lo stato di oggi.

| id | vista | cosa si misura | atteso |
|---|---|---|---|
| L4-L01 | Scheda di ogni Palazzo con le sezioni nuove: intestazione con «N da verificare», «Tesoro ✓/✗ · Boss ✓/✗»; sezioni richiudibili «Da verificare (N)» e «Schede da sistemare (N)» sotto «Da raccogliere» | `main` senza barra a 1366×657, 1280×689, 1024×690; visore visibile; altezza dell'intestazione invariata rispetto a L3 (le aggiunte non la allungano); le sezioni richiudibili stanno nella colonna «Da raccogliere» con il suo scorrimento (confine, overscroll contenuto) | **R4-37** |
| L4-L02 | Voce della guida (`GuidaDellArea`): chip del carattere (Permanente / Si ripropone / Racconto), «Esaurito», «Da verificare» (ambra), riga «Anche nella 4ª infiltrazione» | a 375 i chip vanno a capo senza testi a una lettera per riga; chip cliccabili ≥44 px di bersaglio; nessun orizzontale | R4-37 |
| L4-L03 | Popup e scheda del pin con più voci (una riga per voce), selettore dell'infiltrazione, «Riapre anche: …» | popup dentro la tela del visore senza uscire dal bordo a 375 e 768; contenuto lungo scorrevole internamente con confine e overscroll contenuto; pulsanti ≥44 px | R4-37; memoria «Scroll annidati» |
| L4-L04 | Finestra «Da verificare» (pin + voce + due pulsanti) | `Modal`: foglio dal basso a 375, nessun orizzontale, pulsanti ≥44 px | R4-37 |
| L4-L05 | Elenco delle schede senza mappa («Crea la voce» / «Collega a una voce») | righe ≥44 px, nessun orizzontale | R4-37 |
| L4-L06 | `DungeonPage` (elenco dei Palazzi), `MappaTokyo` (Palazzo completato) | invariati nel layout rispetto alla base di L1/L2 | no-reg di layout |

Base «prima»: da prendere sul commit congelato di L3 appena consegnato, con gli stessi script (nove Palazzi a 1366×657, 1280×689, 1024×690).
