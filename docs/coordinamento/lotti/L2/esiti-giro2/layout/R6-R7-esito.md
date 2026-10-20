# L2, giro 2 del validatore — R6 e R7, misure di layout (Test layout multi device, 2026-10-20)

Istanza di collaudo BE 3301 / FE 5473. Codice in esecuzione **2222d51f**, checkout 90137ce2 (in più solo documenti). Ciclo dati del
Collaudo **L2g2-ciclo6-layout**: foto alle 04:59:09; stati preparati dal Collaudo (stati pronti alle 05:00); mie misure dalle 02:58 alle
**03:03:24Z**; poi ripristino del Collaudo. Grafica predefinita in tutte le misure (`p5r-preferenze` assente, controllata a ogni misura).
Nessuna scrittura da parte mia: nel Cestino né «Rimetti» né «Elimina per sempre»; «Colloca» aperta 7 volte e chiusa sempre con
**Annulla**. Dopo le misure `GET /api/aree/da-collocare` dava ancora la sola planimetria di prova.

Metodo: scheda mia a misura emulata, animazioni finite, misure dal DOM (`getBoundingClientRect`), schermate in questa cartella.
Il controllo copre: scorrimento orizzontale del documento, elementi oltre il bordo, bersagli < 44 px (etichetta compresa per le caselle),
testi a una lettera per riga, contenitori scorrevoli.

## R7 — Cestino con una voce `area-fisica`
Voce id 17 «Area di Kichijoji: Prova collaudo cestino», con 1 planimetria e 1 immagine (Impostazioni → Cestino).
| misura | voce | «Rimetti com'era» | «Elimina per sempre» | scorrimento orizzontale | testi a una lettera | schermata |
|---|---|---|---|---|---|---|
| 1280×800 | 986×85 | 96×44 | 162×44 (in riga) | no | nessuno | `R7-cestino-1280x800.jpg` |
| 1366×657 | 1072×85 | 96×44 | 162×44 | no | nessuno | — |
| 1024×690 | 730×85 | 96×44 | 162×44 | no | nessuno | `R7-cestino-1024x690.jpg` |
| 768×1024 | 692×85 | 96×44 | 162×44 | no | nessuno | `R7-cestino-768x1024.jpg` |
| 375×812 | 299×137 (pulsanti sotto il testo) | 96×44 | 162×44 | no | nessuno | `R7-cestino-375x812.jpg` |
- Il titolo della voce sta su una riga (266–273×21). Sotto ci sono «con 1 planimetria e 1 immagine» e «Nel cestino dal 20/10/26, 04:59 · 150 kB».
- Gli elementi 1×23 «1 planimetria» e «1 immagine» sono testo per lettori di schermo, non visibile.
- Nessun elemento oltre il bordo. La sezione non ha contenitori scorrevoli propri.
- **Esito R7: a posto ai tre formati e alle altezze dei portatili.**

## R6 — «Planimetrie da collocare» e finestra «Colloca» (La città)
Stato: una planimetria senza area, «Planimetria di prova collaudo», sotto Kichijoji, 0 pin, senza immagine (preparata dal Collaudo).
La sezione è un `<details>` chiuso all'arrivo («Planimetrie da collocare (1)», sommario 986×44 a 1280). L'ho aperta per le misure.
| misura | sezione aperta | «Colloca» | finestra «Colloca» | campi della finestra | scorrimento orizzontale | schermate |
|---|---|---|---|---|---|---|
| 1280×800 | 1020×142 | 98×44 | **520×376 centrata** (212 px dal fondo) | Chiudi 44×44, Quartiere 478×44, Area 478×44, Etichetta 478×45, Annulla 91×44, Colloca 91×44 | no | `R6-citta-sezione-chiusa-1280x800.jpg`, `R6-citta-sezione-aperta-1280x800.jpg`, `R6-colloca-finestra-1280x800.jpg` |
| 1366×657 | 1106×142 | 98×44 | 520×376 (141 dal fondo, dentro la vista) | come sopra | no | — |
| 1280×689 | 1020×142 | 98×44 | 520×376 (157 dal fondo) | come sopra | no | — |
| 1024×690 | 764×142 | 98×44 | 520×376 (157 dal fondo) | come sopra | no | — |
| 768×1024 | 726×142 | 98×44 | 520×376 centrata (324 dal fondo) | come sopra | no | `R6-colloca-finestra-768x1024.jpg` |
| 375×812 | 333×157 (nome su due righe) | 98×44 | **foglio dal basso 375×382** (0 dal fondo) | Quartiere / Area 333×44, Etichetta 333×45, Annulla e Colloca 91×44 | no | `R6-citta-sezione-aperta-375x812.jpg`, `R6-colloca-foglio-375x812.jpg` |
- Nessun bersaglio < 44 px, nessun testo a una lettera per riga e nessun elemento oltre il bordo, né nella sezione né nella finestra.
  La finestra non ha corpo scorrevole: il contenuto ci sta.
- **Esito R6: a posto ai tre formati e alle altezze dei portatili.** Sotto i 768 px la finestra segue la regola di LAY2-3, foglio dal basso.
- **Osservazione non di layout (per Test funzionali e UX):** la finestra si apre con il campo «Quartiere» su **Yongen-Jaya**, anche se la
  planimetria sta sotto **Kichijoji** (si vede nella riga «Kichijoji · 0 pin»). Ci si aspetterebbe il quartiere del genitore preselezionato.
