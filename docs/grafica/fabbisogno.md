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
| agganciata, ripiego attivo; il file compare da solo quando caricato (da generare, priorità alta) | `illustrazioni/vuoto-ricerca` (5 punti: `RicercaDiario`, `ScortaPersona`, `CompendioPage`, `SkillPage`, `GlossarioPage`), `illustrazioni/vuoto-giornata` (`GiornoGuida`: giorno senza voci o non coperto, fuori dalla Home), `illustrazioni/vuoto-confidenti` (`ConfidentiPartita`), `illustrazioni/vuoto-proposte` (`DaCompletarePage`), `illustrazioni/errore-offline` (causa `offline`), `illustrazioni/errore-server` (causa `rete`, `timeout`, `server`) | §33: sei stati vuoti ed errori 1200×800 senza lettere (nome senza suffisso, nessuna variante), nel database. Il codice è collegato: `EmptyState` (`illustrazione="<chiave>"`) e `FiguraVuoto` (`PageState.tsx`) cercano `illustrazioni/<chiave>` nel manifest e, se manca o dà 404, ripiegano (`EmptyState`: sull'illustrazione neutra e poi sull'icona; `FiguraVuoto`: niente, il testo di prima da solo); `VistaErrore` sceglie per causa e ripiega su `errore-senza-testo` e poi sull'icona. Nessun altro intervento di codice: basta `PUT /api/immagini/illustrazioni/<chiave>` e ricaricare l'app |
| da generare (priorità alta); agganciata nel codice con riserva SVG; il PNG, quando generato, compare da solo copiandolo in `public/asset/ui/` | `ui/segno-trama-confidente` | §31: voce Trama collegata a un Confidente, angolo in basso a destra del ritratto da 40 px (`ImmagineAzione` in `PartiAzione.tsx`, 20 px, con nome accessibile «Collegata al Confidente …»); `ChiaveSegno` in `IconaAzione.tsx` |
| da generare (priorità media); agganciate nel codice con riserva SVG; i PNG, quando generati, compaiono da soli copiandoli in `public/asset/ui/` | `ui/segno-consigliata`, `ui/segno-non-dovuta` | §31: chip «Consigliata» (`PartiAzione.tsx`, 14 px davanti al testo) e riga «Non dovuta» (`AzioneGiornata.tsx`, 14 px davanti alla frase); `ChiaveSegno` in `IconaAzione.tsx` |
| agganciate, ripiego «nulla»; il file compare da solo quando caricato (da generare, priorità media) | `illustrazioni/intestazione-diario` (`PercorsoPage`, non con la ricerca attiva), `-compendio` (`CompendioPage`), `-fusione` (`FusionePage`), `-luoghi` (`IndiceLuoghi`, `DungeonPage`, `CittaPage`) | §34: quattro figure 512×512 nello spazio `illustrazione` di `IntestazionePagina`. Senza il file nessuno spazio e nessun salto; con il file l'altezza è `clamp(64px, 11dvh, 120px)` (64 px sul telefono) accanto alla riga del titolo. Misurato il 2026-11-18 con la figura presente a 1366×657, 1280×689, 1024×690, 768×1024 e 375×812: intestazione al più il 21,9% dell'altezza (Diario a 375; Fusione 20,1% e Palazzi 20,3% a 375, Compendio 19,5% a 1024), nessuna barra orizzontale, nessun nuovo scroll interno, scroll della pagina più lungo al più di 54 px (Diario a 375), di 31 px a 1366 (Luoghi) e di 19 px per Fusione a 1024; la figura assente dà le stesse misure di prima su tutte le 40 combinazioni |
| da generare (priorità bassa); agganciata nel codice con riserva SVG; il PNG, quando generato, compare da solo copiandolo in `public/asset/ui/` | `ui/segno-scorta-pronta` | §30: tutto spuntato nell'elenco «In scorta» (`RequisitiVoce.tsx`, 16 px accanto a «n/N», anche nella riga ripiegata a voce fatta); `ChiaveSegno` in `IconaAzione.tsx` |
| rimandata | `ui/segno-scorta-qualunque`, `ui/segno-scorta-precisa` | §30: a 16 px quasi indistinguibili da `scheda-scorta` e `scheda-persona-partita`; i prompt restano scritti, si generano solo su richiesta |
| non collegate (misura del 2026-11-18) | `illustrazioni/intestazione-home`, `illustrazioni/intestazione-partita` | §34: con la figura l'intestazione rientra nel 30% (Home al più 12,0%, Partita 11,3%) ma costa spazio a schermate di lavoro: Home 47→78 px a 1366×657, 47→82 a 1280×689 e 1024×690, 51→123 a 768×1024, 38→74 a 375×812; Partita 46→74, 56→78, 56→78, 56→115, 44→64; a 1024 la fila dei dati e delle scorciatoie della Partita perde ~92 px di larghezza e scorre di più. Non si collegano e non si generano: il collegamento si rivaluta solo se l'utente li chiede |
| rimandati | `ui/sigillo-completato`, `ui/sigillo-concluso`, `ui/sigillo-giornata` e le tre varianti `-senza-testo` | §32: timbri 512×192; nessun consumatore nel codice, duplicano il chip «Completato»; solo con il sì dell'utente; testo solo in italiano |
| in uso | `illustrazioni/vuoto-cicli-senza-testo`, `-obiettivi-senza-testo`, `-piani-senza-testo`, `-persona-senza-testo`, `-storico-senza-testo`, `-partita-senza-testo` | i cinque `EmptyState` di `CicliSalvati`, `ObiettiviPartita`, `PianiSalvati`, `ScortaPersona`, `StoricoPartita` usano la variante senza lettere (il titolo lo scrive l'app); `vuoto-partita-senza-testo` è su `PartitaPage` («Nessuna partita attiva») e su `GestionePartite` («Nessuna partita ancora»). Le sei chiavi esistono nel database (ambito `illustrazioni`) |
| in uso (consegnate, finora non censite) | `ui/categoria-allenamento`, `ui/categoria-obiettivo`, `ui/persona-catturata`, `ui/scheda-progressi`, `ui/sezione-persona`, `ui/sezione-richieste`, `ui/sezione-timbri`, `ui/sezione-trama`, `ui/spillo-forziere-raro`, `ui/spillo-infiltrazione`, `ui/spillo-ingresso-palazzo`, `ui/spillo-scala`, `ui/spillo-uscita`, `ui/timbro-ottenuto`, `ui/timbro-vuoto`, `ui/allerta-notte-torrida`, `ui/allerta-pioggia-torrenziale` | i file ci sono in `public/asset/ui/` e il codice li cerca (`IconaCategoria`, `SezioneDellArea`, `TimbriDelDedalo`, `PiastrelleCattura`, `IconaSpillo`, `TagAllerta`, schede della Partita); mancava solo la riga qui |
| nessuna figura da chiedere | `ui/categoria-casa` | la riserva `casa` di `ICONE` (`IconaCategoria.tsx`) non ha nessun tipo di voce che la usi (`TIPI_AZIONE` non ha `casa`): non serve un file |
| fuori consegna | oggetti del catalogo, negozi, luoghi, trofei | non hanno un posto dove mostrare un'immagine propria (nessun ambito in `shared/immagini.ts`): si riconoscono dalla figura della categoria, dallo spillo del tipo di luogo e dal colore del grado |
