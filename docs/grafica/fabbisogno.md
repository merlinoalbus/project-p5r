# Fabbisogno grafico — regole e figure richieste dal codice

Le regole con cui si decide se un asset serve, e le figure che il codice cerca. La numerazione delle voci è stabile: la citano i
commenti del codice. I prompt sono in `prompt-immagini.md` e `archivio-grafico.md`.

## Regole
- **Prima si guarda fra gli originali.** Prima di chiedere un asset si controlla se esiste fra gli originali estratti del gioco, in
  tutte le cartelle e non solo nel foglio che si sta guardando. Un asset generato al posto di uno del gioco è una differenza di tratto
  che si vede e un pezzo di mappa che smette di essere autentico.
- **Si conta con il nome con cui il codice lo cerca.** Prima di dichiarare che un asset manca si leggono i registri del codice
  (`RISERVA_AZIONE` e `RISERVA_SCHEDA` in `IconaAzione.tsx` sono due registri distinti, `RISERVA_SPILLO`, `RISERVA_SEGNO`, `ICONE` di
  `IconaCategoria`, gli ambiti di `shared/immagini.ts`) e si confrontano con `public/asset/` e con la tabella `immagine` del database
  (una copia di `gioco.db`).
- **Nessun pulsante senza figura**, in ogni pagina e sottopagina: ogni chiave nuova nasce con una riserva SVG in codice (l'app non
  aspetta nessuno) e con una riga nel registro delle figure da generare (la riserva non è il traguardo).
- **Dove vanno i file**: icone dell'interfaccia (`ui/`) e compendio (`persona/`, `arcani/`, `skill/`) in `public/asset/`; tutto il
  resto (mappe, guida, decori, illustrazioni delle attività, dei Confidenti, dei Palazzi…) nel database, caricato con
  `PUT /api/immagini/<ambito>/<chiave>` (vedi `public/asset/README.md`).
- **Controlli all'arrivo**: misura esatta (128×128 per `ui/`, 256×256 per `attivita/`), PNG con alfa reale; nel contorno di 3 px
  nessun pixel con alfa > 8.
- **I colori degli spilli restano quelli del registro**, anche gli otto molto chiari (`forziere-raro`, `terme`, `casa`, `lavanderia`,
  `nemico`, `porta`, `nota`, `scala`): è una scelta dell'utente, non un difetto da correggere.
- **Le lettere accentate dei caratteri caricati** si costruiscono dal carattere stesso con `scripts/font-italiano.py` (base + accento,
  più « » — … ’ “ ” ° •): un carattere nuovo va passato di lì prima di caricarlo.

## 1. Shujin Academy — sagoma per la mappa di viaggio
`mappe/lmap/tokyo/shujin-academy` (760 × 620, alfa reale; nel database, come tutte le mappe), usata da `MappaTokyo.tsx`. È **l'unica sagoma della mappa
che non viene dal gioco**: la scuola non è una destinazione del treno e nel foglio dei quartieri non c'è. È disegnata nello stesso
stile (nero pieno, dettagli in negativo, alfa reale) e va dichiarata come tale accanto alla sua posizione: un disegno fatto apposta non
deve poter passare per originale.

## 2 e 3. Pezzi dei Memento — dagli originali
Grappoli della città divelta, catene, venature del cratere e strati del terzo semestre esistono fra gli originali estratti
(73 elementi, chiavi `mappe/lmap/memento/…` nel database): non si generano.

## 4. Covo dei Ladri sulla mappa di viaggio — ritaglio dell'originale
`mappe/lmap/tokyo/covo-dei-ladri` (nel database) è la pianta originale del Covo (Luogo 022) ritagliata al suo riquadro, senza
ingrandirla (un ritaglio può solo rimpicciolire). È di un genere diverso dalle sagome dei quartieri (una pianta vista dall'alto) e va
bene così: il Covo non è un posto di Tokyo ma una schermata del menu. Senza il file resta la targa. La scritta «COVO DEI LADRI» del gioco
esiste ma non si usa: sulla mappa tutte le targhe sono testo reso dall'app.

## 5. Covo dei Ladri — piastrella della Guida
`guida/covo` (256 × 256, nel database), chiave usata da `sezioniGuida.tsx`: stella del Covo dentro la pianta poligonale,
contorno nero spesso, campiture bianche, un solo accento rosso. Senza il file la piastrella mostra la riserva vettoriale.

## 6. Figure delle pagine
Famiglie cercate dal codice, tutte con riserva SVG: icone delle azioni (`ui/azione-<chiave>`), icone di categoria
(`ui/categoria-<chiave>`, con `chiaveCategoria()` che traduce le chiavi equivalenti al singolare e al plurale), fregi decorativi delle
sezioni di sola prosa (`decori/<chiave>`, al 16% di opacità; senza il file resta una macchia del colore del tema), figure delle schede a
tessera (`ui/scheda-<chiave>`), segni (`ui/segno-<chiave>`), illustrazioni delle attività (`attivita/<chiave>`, nel database).

## 7. Registro delle chiavi nuove
Le chiavi aggiunte nel codice si registrano qui con lo stato della figura.

| stato | file | nota |
|---|---|---|
| da caricare nel database | `attivita/estrazione-lotteria`, `attivita/concimare-pianta`, `attivita/fabbricazione-strumenti`, `attivita/fabbricazione-kawakami` | i PNG sono in `docs/grafica/asset-generati/2026-10-29/attivita/`; finché non sono caricati le quattro attività mostrano `ui/categoria-altro` |
| consegnato, da agganciare | `ui/categoria-yen`, `ui/categoria-oggetto-ricevuto`, `ui/categoria-oggetto-uscito`, `ui/categoria-persona-tolta`, `ui/categoria-punti-confidente`, `ui/categoria-trofeo` | figure distinte per i tipi di effetto della voce che oggi ne condividono una; si vedono solo dopo l'aggancio in `MENU_EFFETTI` (`src/utils/effettiDellaVoce.ts`) e in `ICONE`, che chiede il sì dell'utente |
| fuori consegna | oggetti del catalogo, negozi, luoghi, trofei | non hanno un posto dove mostrare un'immagine propria (nessun ambito in `shared/immagini.ts`): si riconoscono dalla figura della categoria, dallo spillo del tipo di luogo e dal colore del grado |
