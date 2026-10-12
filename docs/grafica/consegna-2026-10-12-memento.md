# Consegna asset grafici — pagina dei Memento: Timbri, Persona, Richieste, Trama (2026-10-12)

Richiesta dell'utente (2026-10-12), nel progetto della nuova pagina dei Memento: «I timbri come le Persona devono essere
banalmente un click per segnare i timbri ottenuti... progettalo poi dimmi quali elementi grafici serve generare che chiedo a
codex di generarli (dammi i prompt come fatto in passato indicando dove ti aspetti le risorse e come devono essere)».

Nella pagina nuova ogni area di un dedalo ha quattro sezioni — **Timbri**, **Persona**, **Richieste**, **Trama** — e ogni
elemento si segna con un tocco. Servono sette icone: due stati del timbro, il segno «catturata» sulle Persona e le quattro
icone delle sezioni. Tutto il resto (stati delle Richieste, spunta della Trama, Gioca/Modifica) usa icone che l'app ha già
(`ui/azione-accettata`, `ui/azione-raggiunto`, `ui/azione-aperti`, `ui/azione-modifica`).

## 1. File da consegnare

Tutti in **`public/asset/ui/`** (icone dell'interfaccia: vivono nel repository, non nel database di gioco — regola di
`public/asset/README.md`). Il manifest si rigenera da sé al riavvio del FE; finché un file manca l'app mostra la riserva
disegnata in CSS, quindi la pagina funziona anche prima della consegna.

| # | File | Misura | Dove si vede e a che misura |
|---|---|---|---|
| 1 | `public/asset/ui/timbro-ottenuto.png` | 128×128 | sezione Timbri: un timbro raccolto; **32 px** sul telefono, 36 px su tablet e desktop, in fila con gli altri |
| 2 | `public/asset/ui/timbro-vuoto.png` | 128×128 | sezione Timbri: un timbro ancora da raccogliere, accanto ai raccolti; stesse misure |
| 3 | `public/asset/ui/persona-catturata.png` | 128×128 | angolo in alto a destra della piastrella di una Persona catturata; **20 px** |
| 4 | `public/asset/ui/sezione-timbri.png` | 128×128 | intestazione della sezione Timbri; **22 px** |
| 5 | `public/asset/ui/sezione-persona.png` | 128×128 | intestazione della sezione Persona; 22 px |
| 6 | `public/asset/ui/sezione-richieste.png` | 128×128 | intestazione della sezione Richieste; 22 px |
| 7 | `public/asset/ui/sezione-trama.png` | 128×128 | intestazione della sezione Trama; 22 px |

## 2. Regole valide per tutti e sette

Le stesse delle consegne precedenti ([consegna-2026-09-13-asset-mancanti.md](consegna-2026-09-13-asset-mancanti.md) §2):

- **Originali**, ispirati allo stile di Persona 5 Royal: nessuna copia di illustrazioni ufficiali Atlus, nessun personaggio
  riconoscibile, nessun logo.
- **Nessun testo dentro l'immagine**: niente lettere, numeri, sigle.
- **PNG RGBA con alfa nativo**: trasparenza vera, non una scacchiera disegnata né un fondo bianco. Generare più grande e
  ridurre con lo stesso fattore sui due assi. Il contorno di 3 px dell'immagine deve essere trasparente.
- **Un solo soggetto**, centrato, con margine minimo; deve leggersi alla misura d'uso del §1 (fino a 20 px).
- **Palette**: nero `#0b0b0e`, bianco `#ececf1`, grigio `#6f6f80`, rosso `#e5352b`. **Niente oro**, niente pastello, niente
  sfumature.
- Forme piatte, contorno nero spesso e uniforme, angoli tagliati in diagonale dove serve carattere.
- I file 1 e 2 sono **una coppia**: stessa sagoma, stessa misura e stessa posizione nel riquadro, così che passando da uno
  all'altro il timbro «si riempie» senza spostarsi. Lo stesso vale per i file 4–7 fra loro: stessa grammatica (spessore del
  contorno, peso visivo, inclinazione), quattro soggetti diversi.
- Devono distinguersi da `ui/spillo-timbro.png` (lo spillo dei timbri sulle mappe) e da `ui/spillo-mementos.png`: quelli sono
  segnalini da mappa, questi sono icone d'interfaccia su fondo scuro.

### Blocco di stile — anteporre a OGNI prompt

```
Stile grafico ispirato all'interfaccia di Persona 5 Royal (Atlus): estetica "pop punk" e anarchica, palette
dominata da rosso acceso (#e5352b), nero profondo (#0b0b0e) e bianco, forme irregolari con angoli tagliati in
diagonale, silhouette piatte ad alto contrasto, retini a punti (halftone) e texture da stampa, stelle e schizzi
come accenti. Illustrazione vettoriale pulita, bordi netti, nessuna sfumatura fotorealistica, nessun rumore.
```

### Prompt negativo — accodare a OGNI prompt

```
fotorealismo, 3D render, sfumature morbide, testo inglese, testo giapponese, lettere, numeri, loghi ufficiali
Atlus/Sega, personaggi copiati dal gioco, watermark, firma, bordi sfocati, colori pastello, oro, rumore,
JPEG artifacts, sfondo pieno, scacchiera disegnata
```

## 3. Prompt

### 1 · `public/asset/ui/timbro-ottenuto.png` (128×128)

```
[blocco di stile] Icona d'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente, nessuna cornice:
l'impronta di un timbro di gomma appena impresso, vista dall'alto. Sagoma tonda leggermente irregolare, come
inchiostro premuto sulla carta: al centro una stella a cinque punte stilizzata con angoli tagliati, attorno un
anello spesso con piccole sbavature d'inchiostro sul bordo. Inchiostro rosso pieno #e5352b con texture halftone
leggera nelle zone meno premute, contorno nero sottile solo dove serve a staccarla dal fondo scuro. Leggermente
ruotata (circa 8 gradi) per sembrare timbrata a mano. Deve leggersi come «timbro preso» a 32 px, su fondo nero.
[prompt negativo]
```

### 2 · `public/asset/ui/timbro-vuoto.png` (128×128)

```
[blocco di stile] Icona d'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente, nessuna cornice:
il posto vuoto di un timbro non ancora raccolto. ESATTAMENTE la stessa sagoma, la stessa misura, la stessa
rotazione (circa 8 gradi) e la stessa posizione dell'impronta del timbro rosso (anello tondo con stella a cinque
punte al centro), ma senza inchiostro: solo il contorno tratteggiato in grigio #6f6f80, sottile e regolare,
interno completamente trasparente. Deve sembrare lo spazio in attesa del timbro, chiaramente «non preso»
accanto alla versione rossa, leggibile a 32 px su fondo nero. [prompt negativo]
```

### 3 · `public/asset/ui/persona-catturata.png` (128×128)

```
[blocco di stile] Piccolo contrassegno d'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente: una
maschera da ladro gentiluomo stilizzata (domino bianca #ececf1, due fori per gli occhi, angoli tagliati in
diagonale) sovrapposta a una stella rossa #e5352b a punte irregolari, contorno nero spesso uniforme. Significa
«Persona catturata». Forme grandi e semplici: deve leggersi a 20 px nell'angolo di una piastrella con
l'illustrazione della Persona sotto. Nessun dettaglio fine, nessuna texture che si perda a 20 px.
[prompt negativo]
```

### 4 · `public/asset/ui/sezione-timbri.png` (128×128)

```
[blocco di stile] Icona d'intestazione di sezione per Persona 5 Royal, PNG 128×128 con sfondo trasparente: un
timbro di gomma con il manico, visto di tre quarti, inclinato come se stesse per timbrare. Manico nero, base
rossa #e5352b, piccolo schizzo d'inchiostro sotto. Silhouette piatta, contorno nero spesso uniforme, angoli
tagliati in diagonale. Deve leggersi a 22 px accanto alla parola «Timbri», su fondo nero. Stesso spessore di
contorno e stesso peso visivo delle altre tre icone di sezione (Persona, Richieste, Trama). [prompt negativo]
```

### 5 · `public/asset/ui/sezione-persona.png` (128×128)

```
[blocco di stile] Icona d'intestazione di sezione per Persona 5 Royal, PNG 128×128 con sfondo trasparente: una
maschera teatrale stilizzata con un ghigno, bianca #ececf1, con due piccole fiamme rosse #e5352b che salgono dai
lati, contorno nero spesso uniforme, angoli tagliati in diagonale. Rappresenta le Persona che si incontrano nei
Memento. Deve leggersi a 22 px accanto alla parola «Persona», su fondo nero. Stessa grammatica delle altre tre
icone di sezione. Non deve somigliare al contrassegno «catturata» (maschera domino su stella). [prompt negativo]
```

### 6 · `public/asset/ui/sezione-richieste.png` (128×128)

```
[blocco di stile] Icona d'intestazione di sezione per Persona 5 Royal, PNG 128×128 con sfondo trasparente: uno
smartphone visto di fronte, inclinato, con sullo schermo un fumetto di messaggio rosso #e5352b con una stella
bianca al centro (una richiesta arrivata sul sito dei Ladri), contorno nero spesso uniforme, angoli tagliati in
diagonale. Nessuna lettera sullo schermo. Deve leggersi a 22 px accanto alla parola «Richieste», su fondo nero.
Stessa grammatica delle altre tre icone di sezione. [prompt negativo]
```

### 7 · `public/asset/ui/sezione-trama.png` (128×128)

```
[blocco di stile] Icona d'intestazione di sezione per Persona 5 Royal, PNG 128×128 con sfondo trasparente: un
libro aperto visto dall'alto, pagine bianche #ececf1 con segni grafici astratti (righe spezzate, nessuna
lettera), un segnalibro rosso #e5352b a coda di rondine che scende dal centro, contorno nero spesso uniforme,
angoli tagliati in diagonale. Rappresenta gli eventi di trama di un'area. Deve leggersi a 22 px accanto alla
parola «Trama», su fondo nero. Stessa grammatica delle altre tre icone di sezione. [prompt negativo]
```

## 4. Criteri di accettazione

Un file è accettato solo se tutte queste cose sono vere:

1. misura esatta 128×128, PNG RGBA, alfa nativo, contorno di 3 px trasparente;
2. nome e percorso identici a quelli della tabella al §1;
3. nessun testo, numero o logo dentro l'immagine;
4. palette rispettata, nessun oro, nessuna sfumatura fotorealistica;
5. leggibile alla misura d'uso del §1 (32 px i timbri, 20 px il contrassegno, 22 px le sezioni) — controllare davvero
   rimpicciolendo, non a occhio sull'immagine grande;
6. `timbro-ottenuto` e `timbro-vuoto` sovrapposti coincidono (stessa sagoma, misura, rotazione e posizione);
7. le quattro icone di sezione hanno lo stesso spessore di contorno e lo stesso peso visivo;
8. nessun altro file del repository modificato.
