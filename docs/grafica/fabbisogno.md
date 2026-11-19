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
  nessun pixel con alfa > 8. **Deroga alla misura:** i sigilli `ui/sigillo-*` sono 512×192, come i `badge-*` (§7.3); le illustrazioni
  di §33 sono 1200×800 e quelle di §34 512×512; il controllo dell'alfa nel contorno di 3 px vale per tutte.
- **I colori degli spilli restano quelli del registro**, anche gli otto molto chiari (`forziere-raro`, `terme`, `casa`, `lavanderia`,
  `nemico`, `porta`, `nota`, `scala`): è una scelta dell'utente, non un difetto da correggere.
- **Le lettere accentate dei caratteri caricati** si costruiscono dal carattere stesso con `scripts/font-italiano.py` (base + accento,
  più « » — … ’ “ ” ° •): un carattere nuovo va passato di lì prima di caricarlo.

- **Un'illustrazione senza lettere non ha la variante `-senza-testo` e non porta il suffisso.** Le illustrazioni di stato nuove (§33) e di
  intestazione (§34) si consegnano senza testo: titolo e suggerimento li scrive l'app. La variante `-senza-testo` esiste solo per ciò che
  porta lettere (i sigilli, §32), con testo solo in italiano. Le illustrazioni vecchie con lettere restano con il loro nome e le loro due varianti.
- **Gli asset che si sovrappongono a un'altra figura** (angolo di un ritratto, timbro su un emblema) si provano sopra il fondo reale a
  18–20 px e a 96–160 px prima di accettarli.

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
| in uso | `ui/categoria-yen`, `ui/categoria-oggetto-ricevuto`, `ui/categoria-oggetto-uscito`, `ui/categoria-persona-tolta`, `ui/categoria-punti-confidente`, `ui/categoria-trofeo` | figure dei tipi di effetto della voce (yen, oggetto ricevuto, oggetto restituito o venduto, Persona tolta, note a un Confidente, trofeo) in `MENU_EFFETTI` (`src/utils/effettiDellaVoce.ts`): menu «Aggiungi un effetto», righe degli effetti e proposte da completare; senza il file, o se non si carica, resta la figura della famiglia (`catenaCategoria` in `src/utils/categorie.ts`: acquisto, velluto, confidente, trama) e poi la sua riserva SVG |
| consegnate, da caricare nel database | `illustrazioni/vuoto-ricerca` (5 punti: `RicercaDiario`, `ScortaPersona`, `CompendioPage`, `SkillPage`, `GlossarioPage`; anche «Non trovato», la lettura a cui il server risponde 404), `illustrazioni/vuoto-giornata` (`GiornoGuida`: giorno senza voci, fuori dalla Home), `illustrazioni/vuoto-confidenti` (`ConfidentiPartita`), `illustrazioni/vuoto-proposte` (`DaCompletarePage`), `illustrazioni/errore-offline` (causa `offline`), `illustrazioni/errore-server` (causa `rete`, `timeout`, `server`) | §33: sei stati vuoti ed errori 1200×800 senza lettere (nome senza suffisso, nessuna variante). I PNG sono in `docs/grafica/asset-generati/2026-11-18/illustrazioni/`; si caricano con `PUT /api/immagini/illustrazioni/<chiave>`. Il codice è collegato: `EmptyState`, `VistaErrore` e «Non trovato» mostrano la figura con `FiguraStato` (`VistaErrore.tsx`: riquadro 3:2 di misura fissa, scelta a manifest caricato, miniatura da 320 px; ripiego sull'illustrazione neutra o su `errore-senza-testo` e poi sull'icona); `FiguraVuoto` (`PageState.tsx`, miniatura da 160 px) senza il file non mostra niente e lascia il testo da solo |
| in uso | `ui/segno-trama-confidente` | §31: PNG in `public/asset/ui/`. Voce Trama collegata a un Confidente, angolo in basso a destra del ritratto da 40 px (`ImmagineAzione` in `PartiAzione.tsx`, 20 px, con nome accessibile «Collegata al Confidente …»); `ChiaveSegno` in `IconaAzione.tsx`, con la riserva SVG se il file non si carica |
| in uso | `ui/segno-consigliata`, `ui/segno-non-dovuta` | §31: PNG in `public/asset/ui/`. Chip «Consigliata» (`PartiAzione.tsx`, 14 px davanti al testo) e riga «Non dovuta» (`AzioneGiornata.tsx`, 14 px davanti alla frase); `ChiaveSegno` in `IconaAzione.tsx`, con la riserva SVG se il file non si carica |
| consegnate, da caricare nel database | `illustrazioni/intestazione-diario` (`PercorsoPage`, non con la ricerca attiva), `-compendio` (`CompendioPage`), `-fusione` (`FusionePage`), `-luoghi` (`IndiceLuoghi`, `DungeonPage`, `CittaPage`) | §34: quattro figure 512×512 nello spazio `illustrazione` di `IntestazionePagina`; i PNG sono in `docs/grafica/asset-generati/2026-11-18/illustrazioni/` e si caricano con `PUT /api/immagini/illustrazioni/<chiave>`. Senza il file nessuno spazio e nessun salto; con il file l'altezza è `clamp(64px, 11dvh, 120px)` (64 px sul telefono) accanto alla riga del titolo, la miniatura chiesta è quella da 160 px e l'intestazione resta entro il 30% dell'altezza a ogni formato |
| in uso | `ui/segno-scorta-pronta` | §30: PNG in `public/asset/ui/`. Tutto spuntato nell'elenco «In scorta» (`RequisitiVoce.tsx`, 16 px accanto a «n/N», anche nella riga ripiegata a voce fatta); `ChiaveSegno` in `IconaAzione.tsx`, con la riserva SVG se il file non si carica |
| rimandata | `ui/segno-scorta-qualunque`, `ui/segno-scorta-precisa` | §30: a 16 px quasi indistinguibili da `scheda-scorta` e `scheda-persona-partita`; i prompt restano scritti, si generano solo su richiesta |
| non collegate | `illustrazioni/intestazione-home`, `illustrazioni/intestazione-partita` | §34: la figura costa da 31 a 72 px di altezza a schermate di lavoro e alla Partita toglie spazio alla fila dei dati e delle scorciatoie. Non si collegano e non si generano; se l'utente lo chiede si collegano con una riga per pagina (`illustrazione` di `IntestazionePagina`) |
| rimandati | `ui/sigillo-completato`, `ui/sigillo-concluso`, `ui/sigillo-giornata` e le tre varianti `-senza-testo` | §32: timbri 512×192; nessun consumatore nel codice, duplicano il chip «Completato»; solo con il sì dell'utente; testo solo in italiano |
| in uso | `illustrazioni/vuoto-cicli-senza-testo`, `-obiettivi-senza-testo`, `-piani-senza-testo`, `-persona-senza-testo`, `-storico-senza-testo`, `-partita-senza-testo` | i cinque `EmptyState` di `CicliSalvati`, `ObiettiviPartita`, `PianiSalvati`, `ScortaPersona`, `StoricoPartita` usano la variante senza lettere (il titolo lo scrive l'app); `vuoto-partita-senza-testo` è su `PartitaPage` («Nessuna partita attiva») e su `GestionePartite` («Nessuna partita ancora»). Le sei chiavi esistono nel database (ambito `illustrazioni`) |
| in uso (consegnate, finora non censite) | `ui/categoria-allenamento`, `ui/categoria-obiettivo`, `ui/persona-catturata`, `ui/scheda-progressi`, `ui/sezione-persona`, `ui/sezione-richieste`, `ui/sezione-timbri`, `ui/sezione-trama`, `ui/spillo-forziere-raro`, `ui/spillo-infiltrazione`, `ui/spillo-ingresso-palazzo`, `ui/spillo-scala`, `ui/spillo-uscita`, `ui/timbro-ottenuto`, `ui/timbro-vuoto`, `ui/allerta-notte-torrida`, `ui/allerta-pioggia-torrenziale` | i file ci sono in `public/asset/ui/` e il codice li cerca (`IconaCategoria`, `SezioneDellArea`, `TimbriDelDedalo`, `PiastrelleCattura`, `IconaSpillo`, `TagAllerta`, schede della Partita); mancava solo la riga qui |
| nessuna figura da chiedere | `ui/categoria-casa` | la riserva `casa` di `ICONE` (`IconaCategoria.tsx`) non ha nessun tipo di voce che la usi (`TIPI_AZIONE` non ha `casa`): non serve un file |
| fuori consegna | oggetti del catalogo, negozi, luoghi, trofei | non hanno un posto dove mostrare un'immagine propria (nessun ambito in `shared/immagini.ts`): si riconoscono dalla figura della categoria, dallo spillo del tipo di luogo e dal colore del grado |
