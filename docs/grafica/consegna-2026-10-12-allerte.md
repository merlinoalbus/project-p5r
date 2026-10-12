# Consegna asset grafici — icone delle allerte meteo del gioco (2026-10-12)

Richiesta dell'utente (2026-10-12): «vorrei venisse mostrato un tag con l'allerta meteo quando in quella giornata è
presente... se serve fai i prompt e passameli da passare a codex per le grafiche».

Il tag dell'allerta compare nella scheda del giorno (Partita → Oggi, Guida giorno per giorno) e nel calendario di gioco:
un'etichetta gialla d'avviso con un'icona e il nome dell'allerta («Ondata di calore · giorno»). Le allerte del gioco sono sei.
Serve un'icona per ciascuna, così che il tag si riconosca prima ancora di leggerlo. Finché un file manca, il tag usa il segno
d'allarme generico che l'app ha già (`ui/azione-allarme`): funziona anche prima della consegna.

## 1. File da consegnare

Tutti in **`public/asset/ui/`** (icone dell'interfaccia: vivono nel repository, non nel database di gioco — regola di
`public/asset/README.md`). Il manifest si rigenera da sé al riavvio del FE.

| # | File | Misura | Allerta (date del gioco) |
|---|---|---|---|
| 1 | `public/asset/ui/allerta-pioggia-torrenziale.png` | 128×128 | Pioggia torrenziale (luglio–agosto) |
| 2 | `public/asset/ui/allerta-polline.png` | 128×128 | Allerta polline (maggio) |
| 3 | `public/asset/ui/allerta-ondata-di-calore.png` | 128×128 | Ondata di calore (luglio–agosto, di giorno) |
| 4 | `public/asset/ui/allerta-notte-torrida.png` | 128×128 | Notte torrida (luglio–agosto, di sera) |
| 5 | `public/asset/ui/allerta-stagione-influenzale.png` | 128×128 | Stagione influenzale (novembre–dicembre) |
| 6 | `public/asset/ui/allerta-ondata-di-gelo.png` | 128×128 | Ondata di gelo (26–27 gennaio) |

Dove si vede e a che misura: **16 px**, a sinistra del nome dentro il tag, su un fondo scuro con una velatura gialla
(`#f59e0b` al 16% su `#14141a`) e il bordo giallo; il testo del tag è giallo `#f59e0b`.

## 2. Regole valide per tutte e sei

Le stesse delle consegne precedenti ([consegna-2026-10-12-memento.md](consegna-2026-10-12-memento.md) §2), con una
differenza nella palette:

- **Originali**, ispirati allo stile di Persona 5 Royal: nessuna copia di illustrazioni ufficiali Atlus, nessun personaggio
  riconoscibile, nessun logo.
- **Nessun testo dentro l'immagine**: niente lettere, numeri, sigle, gradi, simboli di temperatura scritti.
- **PNG RGBA con alfa nativo**: trasparenza vera, non una scacchiera disegnata né un fondo bianco. Generare più grande e
  ridurre con lo stesso fattore sui due assi. Il contorno di 3 px dell'immagine deve essere trasparente.
- **Un solo soggetto**, centrato, con margine minimo; deve leggersi a **16 px**: forme grandi, al massimo tre masse di colore,
  niente dettagli fini né texture che a 16 px diventano rumore.
- **Palette**: nero `#0b0b0e`, bianco `#ececf1`, rosso `#e5352b` e, solo per queste sei icone, il **giallo d'avviso
  `#f59e0b`** (è il colore del tag: l'icona deve starci dentro). Un azzurro freddo `#7dd3fc` è ammesso solo nell'ondata di
  gelo, e solo per il ghiaccio. Niente oro, niente pastello, niente sfumature.
- Forme piatte, contorno nero spesso e uniforme, angoli tagliati in diagonale dove serve carattere.
- Le sei icone sono **una famiglia**: stesso spessore di contorno, stesso peso visivo, stessa inclinazione, sei soggetti
  diversi e distinguibili fra loro a 16 px (in agosto due o tre tag stanno uno accanto all'altro: pioggia torrenziale,
  ondata di calore, notte torrida).
- Devono distinguersi dalle icone del meteo di base che l'app già usa (sereno, nuvoloso, pioggia, neve): un'allerta è un
  evento eccezionale, non il tempo del giorno. Per questo ogni icona ha un **accento d'allarme**: un piccolo triangolo o
  una punta esclamativa grafica (senza il carattere «!») in giallo, o un taglio diagonale rosso.

### Blocco di stile — anteporre a OGNI prompt

```
Stile grafico ispirato all'interfaccia di Persona 5 Royal (Atlus): estetica "pop punk" e anarchica, palette
dominata da rosso acceso (#e5352b), nero profondo (#0b0b0e) e bianco, forme irregolari con angoli tagliati in
diagonale, silhouette piatte ad alto contrasto, stelle e schizzi come accenti. Illustrazione vettoriale pulita,
bordi netti, nessuna sfumatura fotorealistica, nessun rumore.
```

### Prompt negativo — accodare a OGNI prompt

```
fotorealismo, 3D render, sfumature morbide, testo inglese, testo giapponese, lettere, numeri, punto esclamativo
scritto, simboli di gradi, loghi ufficiali Atlus/Sega, personaggi copiati dal gioco, watermark, firma, bordi
sfocati, colori pastello, oro, rumore, texture fini, JPEG artifacts, sfondo pieno, scacchiera disegnata
```

## 3. Prompt

### 1 · `public/asset/ui/allerta-pioggia-torrenziale.png` (128×128)

```
[blocco di stile] Icona d'allerta meteo per un'interfaccia ispirata a Persona 5 Royal, PNG 128×128 con sfondo
trasparente, nessuna cornice: una nuvola nera spigolosa con angoli tagliati in diagonale, da cui cadono tre
grosse gocce bianche #ececf1 inclinate come spinte dal vento, molto più fitte e pesanti di una pioggia normale;
un piccolo triangolo d'avviso giallo #f59e0b senza segni dentro, nell'angolo in alto a destra della nuvola.
Contorno nero spesso uniforme. Deve leggersi a 16 px dentro un'etichetta gialla su fondo scuro, accanto alle
altre cinque icone d'allerta della stessa famiglia. [prompt negativo]
```

### 2 · `public/asset/ui/allerta-polline.png` (128×128)

```
[blocco di stile] Icona d'allerta meteo per un'interfaccia ispirata a Persona 5 Royal, PNG 128×128 con sfondo
trasparente, nessuna cornice: un fiore stilizzato a cinque petali bianchi #ececf1 con il centro giallo #f59e0b,
da cui si alza una nuvoletta di quattro o cinque grossi granelli di polline gialli, tondi e pieni (non puntini
fini). Un taglio diagonale rosso #e5352b attraversa l'angolo in basso come segno d'allarme. Contorno nero spesso
uniforme, angoli tagliati in diagonale sui petali. Deve leggersi a 16 px dentro un'etichetta gialla su fondo
scuro. Stessa famiglia delle altre cinque icone d'allerta. [prompt negativo]
```

### 3 · `public/asset/ui/allerta-ondata-di-calore.png` (128×128)

```
[blocco di stile] Icona d'allerta meteo per un'interfaccia ispirata a Persona 5 Royal, PNG 128×128 con sfondo
trasparente, nessuna cornice: un sole a raggi spigolosi e irregolari, disco rosso #e5352b con raggi gialli
#f59e0b, sotto il quale salgono tre onde di calore ondulate bianche #ececf1 come aria che tremola sull'asfalto.
Contorno nero spesso uniforme, angoli tagliati in diagonale. È di giorno: deve essere chiaramente diversa dalla
«notte torrida» (luna). Deve leggersi a 16 px dentro un'etichetta gialla su fondo scuro. Stessa famiglia delle
altre cinque icone d'allerta. [prompt negativo]
```

### 4 · `public/asset/ui/allerta-notte-torrida.png` (128×128)

```
[blocco di stile] Icona d'allerta meteo per un'interfaccia ispirata a Persona 5 Royal, PNG 128×128 con sfondo
trasparente, nessuna cornice: una falce di luna bianca #ececf1 spigolosa, con sotto due onde di calore ondulate
rosse #e5352b che salgono, e una piccola goccia di sudore gialla #f59e0b che cade dalla punta della luna.
Contorno nero spesso uniforme, angoli tagliati in diagonale. È di sera: deve essere chiaramente diversa
dall'«ondata di calore» (sole). Deve leggersi a 16 px dentro un'etichetta gialla su fondo scuro. Stessa famiglia
delle altre cinque icone d'allerta. [prompt negativo]
```

### 5 · `public/asset/ui/allerta-stagione-influenzale.png` (128×128)

```
[blocco di stile] Icona d'allerta meteo per un'interfaccia ispirata a Persona 5 Royal, PNG 128×128 con sfondo
trasparente, nessuna cornice: una mascherina chirurgica bianca #ececf1 vista di fronte, con gli elastici, e
dietro un virus stilizzato rosso #e5352b, tondo con sei corte punte spigolose, che sporge da un lato; un piccolo
triangolo d'avviso giallo #f59e0b senza segni dentro nell'angolo in alto. Contorno nero spesso uniforme, angoli
tagliati in diagonale. Nessuna croce medica, nessun termometro con numeri. Deve leggersi a 16 px dentro
un'etichetta gialla su fondo scuro. Stessa famiglia delle altre cinque icone d'allerta. [prompt negativo]
```

### 6 · `public/asset/ui/allerta-ondata-di-gelo.png` (128×128)

```
[blocco di stile] Icona d'allerta meteo per un'interfaccia ispirata a Persona 5 Royal, PNG 128×128 con sfondo
trasparente, nessuna cornice: un grande fiocco di neve a sei bracci spigolosi, bianco #ececf1 con il cuore
azzurro ghiaccio #7dd3fc, con tre piccoli ghiaccioli appuntiti che pendono sotto, e un taglio diagonale rosso
#e5352b come segno d'allarme nell'angolo in basso. Contorno nero spesso uniforme. Forme grandi: i bracci del
fiocco devono restare distinti a 16 px. Deve leggersi dentro un'etichetta gialla su fondo scuro. Stessa famiglia
delle altre cinque icone d'allerta. [prompt negativo]
```

## 4. Criteri di accettazione

Un file è accettato solo se tutte queste cose sono vere:

1. misura esatta 128×128, PNG RGBA, alfa nativo, contorno di 3 px trasparente;
2. nome e percorso identici a quelli della tabella al §1;
3. nessun testo, numero, «!» scritto o logo dentro l'immagine;
4. palette rispettata (nero, bianco, rosso, giallo d'avviso; azzurro solo nel gelo), nessun oro, nessuna sfumatura;
5. leggibile a **16 px** dentro il tag giallo su fondo scuro — controllare davvero rimpicciolendo, non a occhio
   sull'immagine grande;
6. le sei icone sono distinguibili fra loro a 16 px, anche messe in fila (pioggia torrenziale, ondata di calore, notte
   torrida stanno insieme in agosto), e distinte dalle icone del meteo di base;
7. stesso spessore di contorno e stesso peso visivo in tutte e sei;
8. nessun altro file del repository modificato.
