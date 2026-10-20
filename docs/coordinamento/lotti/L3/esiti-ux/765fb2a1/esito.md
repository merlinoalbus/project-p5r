# L3 — riverifica UX su 765fb2a1 (Test UX, 2026-10-20, fino alle 10:41Z)

Collaudo FE 5473 / BE 3301, linea `newreview-l3` = 765fb2a1, dati identici alla base 0948Z.

Solo letture:
- la finestra «Infiltrazioni della voce» è stata aperta e chiusa con «Fatto», senza scegliere niente;
- l'unica scrittura è la cache `immagine_miniatura`, che riempiono le letture `?l=`.

Misure: 1366×657, 1280×689, 1024×690, 1920×1080, 768×1024, 375×812. Le misure sono state prese in un iframe della stessa origine; le schermate a misura emulata.

## UX3-10 — il numero compare una volta sola, nel riquadro: **verificato**
- Madarame (8 carte) e Futaba (17 carte), alle sei misure.
- Ogni carta dice il numero una sola volta, nel riquadro:
  - «7 pin», «47 pin · 2 versioni»;
  - «1 pin» (per esempio «Camera del Rigetto 1P»);
  - «nessun pin» (7 Aree di Futaba).
- Nessun riquadro «N pin» si sovrappone alla figura: 0 casi alle sei misure.
- Il riquadro sta nella riga del titolo, sotto il disegno (`01-ux3-10-futaba-carte-1280x689.jpg`).
- **Nient'altro è cambiato.**
  - L'intestazione è identica a d5eb9650: «307 mappe con 767 pin · più 747 passaggi e 228 note».
  - Le carte delle radici sono identiche: «Città · 159 pin · 23 quartieri · 23 aree», «Palazzo · 221 pin · 10 aree · 26 planimetrie»,
    «Palazzo · 179 pin · 8 aree · 17 planimetrie».

## UX3-11 — segni dei chip delle date a opacità 1: **verificato**
- Scheda di Madarame alle sei misure: «segno-si-apre», «segno-furto» e «segno-scade» hanno opacità effettiva **1,00** e sono larghi 14 px.
- Le altre figure non cambiano, sempre a opacità 1,00:

  | Misure | Illustrazione | Stemma |
  |---|---|---|
  | 1280×689, 1366×657, 1920×1080 | 102×57 | 40 |
  | 768×1024 | 174×97 | 40 |
  | 375×812 | 148×82 | 34 |
  | 1024×690 | — | 48 |

## UX3-9 — una voce senza collegamento non nomina più un collegamento: **verificato**
Il testo non dipende dalla misura. Ho controllato a 1280×689 e a 375×812; a 375 la finestra è un foglio dal basso, senza scorrimento
orizzontale (`02-ux3-9-voce-senza-collegamento-375x812.jpg`).

16 maggio, voce di trama «Primo accesso al Palazzo di Madarame», finestra «Infiltrazioni della voce»:
- «In ordine, come le percorri: dicono in quali infiltrazioni avviene la voce, che non apre il Palazzo. Ogni cambio si salva subito e non
  tocca il resto della voce.»
- «Nessuna: la voce non dice ancora in quale infiltrazione avviene.»

La voce accanto, «Palazzo di Madarame: infiltrazione iniziale.», che ha il collegamento, è invariata: «il collegamento «Palazzo di Madarame»
apre «Prima Infiltrazione al Museo», la prima della proposta» (UX3-2).
