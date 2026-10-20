# L3 «Palazzi: aree e infiltrazioni» — test layout multi device

Sessione «Test layout multi device». Casi e base «prima»: `layout-casi.md`. Difetti: `difetti.md`.
Metodo: misura in serie dentro un iframe della stessa origine (`strumenti-layout/README.md`): animazioni finite, immagini lazy forzate,
preferenza della grafica registrata a ogni misura. Solo letture.

## Giro intermedio su 5373 (FE di L3 «in corso», 2026-10-20, ~03:15–03:30Z)
Il codice servito è nella cartella di sviluppo: BE di L3 committato (caf7b511), FE di L3 in corso; secondo `fe.md` restano da fare l'indice,
l'avviso `idCambiati`, la verifica del diario e la variante R3-41 per Stesura.
Risultato: 50 misure + 6 ripetute (5 erano cadute durante un riavvio del BE, «Impossibile avviare l'app»). Grafica predefinita in tutte.
In tutte le 50: nessuno scorrimento orizzontale, nessun elemento oltre il bordo, nessun testo a una lettera per riga, nessuna immagine rotta.

### Criterio «ogni Palazzo in una schermata» (`main` scrollHeight/clientHeight)
| Palazzo | 1366×657 | 1280×689 | 1024×690 | base «prima» (1280×689 · 1024×690) |
|---|---|---|---|---|
| Kamoshida | 589/589 · 170 | 621/621 · 170 | 622/622 · 225 | 621/621 · 622/622 |
| Madarame | 589/589 · 170 | 621/621 · 170 | 622/622 · 225 | 621/621 · 622/622 |
| Kaneshiro | 589/589 · 170 | 621/621 · 170 | 622/622 · 228 | 621/621 · 622/622 |
| Futaba | 589/589 · 170 | 621/621 · 170 | 622/622 · 201 | 621/621 · 622/622 |
| Okumura | 589/589 · 170 | 621/621 · 170 | 622/622 · 228 | 621/621 · 622/622 |
| Niijima | 589/589 · 170 | 621/621 · 170 | 622/622 · 222 | — · 622/622 |
| Shido | 589/589 · 170 | 621/621 · 170 | 622/622 · 222 | 621/621 · 622/622 |
| **Maruki** | 589/589 · 170 | **621/621** · 170 | **622/622** · 222 | **638/621 BARRA · 653/622 BARRA** |
| Iweleth | 589/589 · 170 | 621/621 · 170 | 622/622 · 170 | 621/621 · 622/622 |
- **Nessuna barra di pagina su nessun Palazzo, a nessuna delle tre altezze.** Maruki era l'unico con la barra: ora non ce l'ha più.
- La sua intestazione è scesa da 322–337 px a 170–222, come gli altri.
- Le intestazioni da 1280 in su sono tutte di 170 px: prima andavano da 170 a 270 (Madarame, Kaneshiro e Okumura erano a 194–197).

### R3-41: visore e versioni nella prima schermata (1366×657, 1280×689)
| Palazzo | 1366×657: visore (alto, fondo/main, visibile) | 1280×689 | 1024×690 |
|---|---|---|---|
| Kamoshida (versioni: fila 386 su 1064) | 295 · 817/589 · **23%** | 322 · 892/621 · **16%** | 300 · 904/622 · 6% |
| Madarame | 295 · 739/589 · 49% | 322 · 819/621 · 39% | 300 · 826/622 · 32% |
| Kaneshiro | 295 · 739/589 · 49% | 322 · 814/621 · 40% | — |
| Futaba | 295 · 739/589 · 49% | 322 · 814/621 · 40% | — |
| Okumura | 295 · 689/589 · 66% | 322 · 814/621 · 40% | — |
| Niijima (versioni) | 295 · 817/589 · 23% | 322 · 892/621 · 16% | — |
| Shido (versioni: fila 386 su 1888) | 295 · 772/589 · 38% | 322 · 897/621 · **14%** | — |
| Maruki | 295 · 689/589 · 66% | 322 · 814/621 · 40% | 300 · 823/622 · 33% |
| Iweleth | 295 · 694/589 · 64% | 322 · 819/621 · 39% | 300 · 771/622 · 50% |
- **R3-41 non è ancora soddisfatto.** Il visore è sempre alto 295–322 px (base 295–322), non riempie l'altezza utile e sta in gran parte
  sotto la piega: è visibile dal 14% al 66%, contro lo 0–70% di prima.
- È il punto aperto che FE ha già scritto in `fe.md`: la variante per Stesura, cioè intestazione su una riga, tela minima più bassa,
  «Aree toccate» e riga dell'area insieme. Lo riprendo quando la variante è applicata: non apro un difetto doppio su un lavoro dichiarato in corso.
- «—» nella colonna 1024: in quelle misure il visore non era nella vista del `main`; da ricontrollare a lavoro finito.
- La fila delle versioni (Kamoshida, Niijima, Shido) scorre in orizzontale con contenuto 431–1888 px.

### 768×1024 e 375×812
- 768: pagine lunghe (1489–2330 px). Intestazione 297–470 (Maruki 470). Visore 420, tela 690×365, visibile nella prima schermata al 49–90%.
- 375: pagine lunghe (1887–2753 px). Intestazione 526–740 (Maruki 740: la più alta). Visore 333, tela 297×251, **0% nella prima
  schermata** in tutti e nove: a telefono il visore arriva solo scorrendo. Atteso da §4.2: «intestazione compatta, selettore
  dell'infiltrazione, aree in un foglio dal basso, versioni in fila, visore min(64dvh, 560px)». Oggi il visore è più basso (333) e
  l'intestazione più alta: da riguardare quando FE chiude.

### Pagina dell'area `/guida/dungeon/kamoshida/area/prigione-sotterranea-tutorial`
Misure identiche alla scheda di Kamoshida: 589/589, 621/621 e 622/622; a 768 1903/964, a 375 2350/752. Fila di 5 versioni da 1064 px.
Visore visibile al 23% a 1366×657 e al 16% a 1280×689.

### LAY3-1 — nome dell'area troncato nella riga sopra il visore (segnalato da Test UX)
Kamoshida, infiltrazione «Vecchio Castello», area «Cancello del castello» (2 versioni). Misura del titolo `h3` (`xl:truncate`), visibile/intero:
| 1280×800 | 1366×657 | 1440×789 | 1024×690 |
|---|---|---|---|
| **60/150 px, «Canc…»** (colonna 346: chip 74 + azioni 144) | 146/150 (colonna 432) | intero | intero |
Aperto a FE come LAY3-1 (media). **Verificato** dopo la correzione di FE (5373): nome intero a 1280×800, 1366×657, 1280×689, 1024×690.

### LAY3-2 — nomi dei sovrani troncati nell'intestazione (trovato nella verifica di LAY3-1)
| Palazzo | testo | 1280×800 / 1280×689 | 1366×657 | 1024×690 |
|---|---|---|---|---|
| Maruki | «Dott. Takuto Maruki» | 98/120 | intero | **6/120** |
| Kaneshiro | «Junya Kaneshiro» | 67/102 | intero | intero |
| Niijima | «Sae Niijima» | intero | intero | 49/68 |
| Okumura | «Avarizia» | 50/69 | 57/69 | intero |
| Iweleth | «Yaldabaoth (Dio del Controllo)» | 382/446 | intero | 175/446 |
Aperto a FE (media).

## Variante R3-41 — prima e dopo sulla copia fresca (anteprima 3302/5474, base p5s-0503Z, 2026-10-20)
Criterio del PM: il visore comincia **entro metà altezza** e non c'è barra di pagina. Serie `strumenti-layout/serie-r3-41.js` su 9 Palazzi più
l'area della prigione. «Prima» = istantanea 1 di pensive (04:55Z); «dopo» = istantanea 2 (05:23:40Z), con la variante parziale di FE
(intestazione compatta) e la correzione di LAY3-2. Nessuna barra di pagina, né prima né dopo, a nessuna misura.

| finestra (metà) | prima: top del visore · scarto · quota visibile | dopo: top del visore · scarto · quota visibile | esito dopo |
|---|---|---|---|
| 1366×657 (329) | 462–590 · **+133…+261** · 23–66% | 340–358 · **+11…+29** · 100% | quasi: oltre metà di 11–29 px |
| 1280×689 (345) | 560–643 · **+215…+298** · 14–40% | 341–383 · **−4…+38** · 95–100% | entro metà solo Kaneshiro, Futaba, Okumura |
| 1024×690 (345) | 570–694 · +225…+349 · 0–40% | 414–486 · **+69…+141** · 68–92% | oltre metà |
| 1280×800 (400) | — | 341–383 · entro · 100% | **entro** |
| 1440×789 (395) | 462–540 · +67…+145 · 84–100% | 331–351 · entro · 100% | **entro** |
| 1536×789 (395) | 462–540 · +67…+145 | 330–351 · entro · 100% | **entro** |
| 1920×969 (485) | (solo dopo) | 330–342 · entro · 100% | **entro** |
- Intestazione: da 170 a **106 px** da 1280 in su. Eccezione: Maruki a 1280×689, 137 px. Da 225–253 a 154–185 px a 1024.
- Visore: alto 295–322 a 1366/1280 come prima; da 1280×800 in su cresce (386–608).
- I casi peggiori, sopra metà, sono le aree con la fila delle versioni (Shido +38 a 1280×689, Kamoshida e Niijima +22 a 1366×657) e
  tutto il 1024×690. Per chiudere servono le scelte del PM elencate in `fe.md`.
- **Stato: R3-41 parziale.** Lo rimisuro quando la variante è finita.
- **Scelte del PM:**
  - applicate la 2 (selettore compatto delle versioni, con miniatura e nome) e la 3 (da 1024 «Indietro» e «Correggi» solo come icona, i chip
    di L4 riuniti in un chip solo);
  - scartata la 1 (nascondere le barre di scorrimento), per la regola dell'utente.
  - FE stima che 2+3 bastino ovunque, anche a 1024×690. Rimisuro all'avviso di FE, insieme ai due residui di LAY3-2. Se a 1024×690
    si sfora ancora, mando i numeri al PM.

### LAY3-2 dopo la correzione (stessa serie)
- I nomi dei sovrani non si troncano più da 1280 in su.
- A 1024×690 «Dott. Takuto Maruki» mostra 117 px su 120: tronca di 3 px.
- L'arcana si accorcia per prima, come voluto: Maruki 45–270/2786, Kaneshiro 92–270/388, Iweleth 175–404/446, Niijima «Giudizio (Judgement)»
  93/147 a 1024.
- Resta troncata a ogni misura la parola **«Avarizia»** di Okumura, 45 px su 69: una parola breve ridotta a «Ava…».

### Ancora da fare
- Campo «Infiltrazioni» del diario: FE deve ancora verificarlo in browser su una partita di prova; lo misuro dopo.
- Finestre «Aggiungi area / planimetria / infiltrazione», «Modifica area», «Modifica aree».
- Giro completo ai casi di `layout-casi.md` quando FE è «fatta», poi giro finale sul collaudo.
