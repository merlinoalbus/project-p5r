# L3, passo A3 — layout sulla linea di rilascio newreview-l3 = 765fb2a1 (Test layout multi device, 2026-10-20)

Collaudo FE 5473 / BE 3301, dati uguali alla base p5s 0948Z. Il lavoro è in sola lettura.
- Le finestre si sono aperte e chiuse con Annulla; dopo «Elimina area» Madarame ha ancora le sue 8 aree.
- Le letture `?l=` scrivono la cache `immagine_miniatura`.

Metodo: misura dal DOM in un iframe della stessa origine, grande quanto la finestra, con le animazioni finite.
- Per R3-41 c'è un iframe per Palazzo: cambio misura ridimensionandolo e cambio infiltrazione con la navigazione interna (`?infiltrazione=`).
- Preferenza trovata nel browser: `{"graficaPredefinita":true,"vistaPersona":"piastrelle","menuRidotto":true,"mappaHomeChiusa":false}`.
  Ho misurato col **menu pieno**, la barra laterale predefinita: `menuRidotto:false` solo durante le serie, poi ho rimesso la stringa
  originale, identica (controllata).
- Ho escluso i testi nascosti a vista (≤ 2 px o dentro un contenitore 1×1, come le etichette dei bottoni a sola icona) e le caselle dentro
  un'etichetta `.touch` ≥ 44 px.

## 1. R3-41 — visore entro metà altezza: **verde**
Ho preso tutte le infiltrazioni dei 9 Palazzi che hanno mappe: 76 su 91 (le 15 senza aree sono nel caso L3-L04). Le ho misurate a 1366×657,
1280×689, 1024×690, 1920×1080, 1280×800, 768×1024 e 375×812: in tutto 532 misure.

| misura (metà) | inizio del visore, in tutti i 9 Palazzi | esito | `main` |
|---|---|---|---|
| 1366×657 (328,5) | **327–328** | entro, 76/76 | 589/589 in tutte |
| 1280×689 (344,5) | **327–328** | entro, 76/76 | 621/621 |
| 1024×690 (345) | **340** | entro, 76/76 | 622/622 |
| 1280×800 (400) | 327–328 | entro, 76/76 | 732/732 |
| 1920×1080 (540) | 317–327 | entro, 76/76 | 1012/1012 |

- Intestazione di 106 px in tutti i Palazzi, da 1024 in su. Nessuna barra di pagina e nessuno scorrimento orizzontale.
- Le misure coincidono con quelle di FE: 340 su 345, 327 su 328, 327–328 su 344.
- Controprova con `document.fonts.ready` (font caricati) su Kamoshida, Maruki e Shido alle tre altezze: valori identici.
- Le aree scorrevoli interne della scheda (colonna «Aree · N», raccolta) hanno bordo di 1 px e overscroll contenuto.
- 768 e 375: le pagine sono lunghe per scelta (L3-L06, L3-L07) e il visore comincia sotto la prima schermata: a 768 da 676 a 1008, a 375
  da 693 a 1190. R3-41 vale per le altezze dei portatili; il telefono è in LAY3-3 qui sotto.
- Misure grezze: `R3-41-misure-grezze.json`, righe `[Palazzo, infiltrazione, misura, main, intestazione, inizio visore, altezza visore,
  metà, entro, orizzontale, n. ellissi nell'intestazione, n. titoli troncati]`.

## 2. LAY3-2 — nomi dei sovrani: **verde**
Il nome del sovrano è intero a ogni misura e in ogni Palazzo:

| Palazzo | nome intero (px) |
|---|---|
| Kamoshida | «Suguru Kamoshida» 116/116 |
| Kaneshiro | «Junya Kaneshiro» 102/102 |
| Futaba | «Futaba Sakura» 88/88 |
| Niijima | «Sae Niijima» 68/68 |
| Shido | «Masayoshi Shido» 104/104 |
| Maruki | **«Dott. Takuto Maruki» 120/120** |
| Okumura | **«Avarizia» 69/69** |

- Si accorciano coi puntini solo l'arcana e le frasi più larghe di tutto lo spazio:
  - Kaneshiro «Diavolo (The Devil) — forma…» 150–270/388;
  - Maruki «Consigliere (Councillor) — arc…» 182–270/2786.
- Le frasi del sovrano tengono comunque intero il nome:
  - «Ichiryusai Madarame (nel comba…» 143/650 a 1024: il nome, largo 128 px, finisce 14 px prima dei puntini;
  - Okumura «Kunikazu Okumura (aspetto…» 162–387/488;
  - Iweleth «Yaldabaoth (Dio del Controllo)» 187–419/446.

## 3. LAY3-1 — nome dell'area sopra il visore: **verde**
Nessun titolo d'area troncato in nessuna delle 532 misure. Sono le 76 infiltrazioni dei 9 Palazzi, che portano ciascuna la sua area.

## 4. Pagine della ripresa — scheda del Palazzo, indice delle Mappe e carte (UX3-10, E2): **verde**
`/guida/mappe` in 5 stati a 7 misure (35 misure): indice chiuso, Tokyo aperto, Madarame aperto, Futaba aperto, «Elenco» di Madarame aperto.
- Una sola barra, quella di `main`, e il documento non è mai più alto della finestra.
- Nessun riquadro che scorre in verticale o in orizzontale, nessun elemento oltre il bordo, nessun testo troncato, nessun testo a una
  lettera per riga.
- Unico bersaglio sotto i 44 px: il bottone del titolo di Tokyo (39–41×21). Ha un velo `after:absolute inset-0` che copre tutta la carta,
  quindi il bersaglio vero è la carta (86–133 px).
- Indice a **1024×690: 622/622** (intestazione 107, il testo di E2 su due righe) e a **768×1024: 964/964**. Controllato in modo diretto
  nella scheda e nell'iframe, col menu pieno e col menu ridotto, anche a 1100, 1180 e 1279 px.
  - **Correzione di una mia misura**: nella serie avevo trovato 641/622 a 1024×690. Era un errore di misura: il font Inter non era
    ancora caricato e il testo, in un font più largo, andava su tre righe (547×59). Con i font caricati è 640×39 e 622/622. Non apro
    un difetto.
- Schermata: `indice-mappe-1024x690.jpg`. Misure grezze: `mappe-misure-grezze.json`.

## 5. Casi di `layout-casi.md`
| caso | esito |
|---|---|
| L3-L01, L3-L02, L3-L05 | verdi: vedi 1–3, fila delle versioni coi segmenti ≥ 44 |
| L3-L03 Madarame | colonna «Aree · N» con scorrimento proprio (bordo 1 px, overscroll contenuto); frecce di riordino 44×46–95 |
| L3-L04 infiltrazioni senza aree (15 × 1366, 1024, 375) | verde: c'è sempre «Quest’infiltrazione non tocca ancora aree.», «Collega aree» 84–89×44, nessuna barra a 1366 e 1024, nessuno scorrimento orizzontale |
| L3-L06 768–1279 | verde: aree in fila scorrevole (`fila-scorrevole--sempre`, barra sottile visibile e overscroll contenuto) sopra il visore |
| L3-L07 375 | **parziale**: ci sono il selettore dell'infiltrazione (182×44), «Aree · 10» (299×44), le versioni in fila (sfumature ai lati, overscroll contenuto) e nessun orizzontale. Ma il visore è **333 px** invece di `min(64dvh, 560px)` = **520**, e comincia a 827–837, sotto la prima schermata → **LAY3-3** |
| L3-L08 finestre | verde: a 375 «Aggiungi infiltrazione», «Modifica aree», «Modifica area», «Aggiungi planimetria», «Elimina area» sono fogli dal basso a tutta larghezza (distanza dal fondo 0) col corpo scorrevole contenuto; a 1366 sono centrate (520–860 px); nessun bersaglio sotto i 44 |
| L3-L09 diario (12 aprile, voce di Kamoshida) | verde per il criterio: campo «Infiltrazioni: nessuna · Modifica · Proposta … Conferma» coi pulsanti a 44 px e nessun testo a una lettera per riga. Osservazioni per UX: a 375 il testo della voce sta in una colonna larga 138 px su 299; senza infiltrazioni scelte non compare «Entra» (ci sono «Palazzo di Kamoshida» e «Sulla mappa») |
| L3-L10 «Da collocare» | **non misurabile in sola lettura**: sul collaudo non c'è nessuna planimetria da collocare (`/api/aree/da-collocare` = 0) e la sezione non compare. Va provato dal Collaudo con una planimetria di prova, foto e ripristino |
| L3-L11 Memento | verde: 589/589, 621/621, 622/622 con intestazione 106 da 1024 in su; nessun orizzontale |

## 6. Difetti nuovi
- **LAY3-3 (media)**: a 375×812 il visore della scheda di un Palazzo è alto 333 px. L3-L07 e R3-40 vogliono `min(64dvh, 560px)`, cioè 520
  px, e il visore comincia sotto la prima schermata (827–837 px). Schermata: `LAY3-3-kamoshida-375x812.jpg`.
- **LAY3-4 (bassa)**: nell'intestazione, da 1024 px in su, i chip delle date hanno `max-width` di 97,5 px. Dove il valore è una frase si
  legge solo l'inizio: Shido «Furto consigliato · Nella tabella di…» (98/136), Maruki «Si apre · Il Palazzo diventa…» (98/173). Succede
  anche a 1920×1080. Il testo intero sta solo nel `title`, che col tocco non si vede. A 375 il chip è intero (165/165, 210/210).
