# L2 · fe — esiti grezzi (Implementazione FE, 2026-10-20)

Worktree `pensive-burnell-b50941`, branch `newreview`, FE 5373 / BE 3201. Niente commit: i file sono nella working copy per il PM.

## Stato
**Fase fe fatta.** Tutti i pezzi di `modifiche.md` per FE sono nel codice e provati dal vivo. Il Covo a 1024×690 sforava di 12 px:
l'ho chiuso con la terza via di Stesura (§4.3). Da 1024 a 1279 px il collegamento «Sfide e Medaglie P del Covo» va in fondo alla fila
delle versioni, a destra e fuori dalla parte che scorre (`VersioniArea` prop `coda`). Senza la fila resta in testata. Le misure sono
nella tabella sotto.

## File (solo `src/`)
- **Nuovi**:
  - pagine e componenti: `pages/AreaPage.tsx`, `components/mappe/{AreeDelQuartiere,AreeDellaCitta,FinestraAggiungiArea,FinestraAggiungiPlanimetria,FinestraModificaArea,SceltaImmagine,SceltaPunto,VersioniArea}.tsx` (`VersioniArea` con la prop `coda`);
  - API e utilità: `services/api/aree.ts`, `utils/aree.ts`, `utils/covo.ts`;
  - test: `pages/AreaPage.test.tsx`.
- **Modificati**:
  - router e API: `router.tsx`, `services/api/{index,mappe,compendio}.ts`;
  - pagine: `pages/{MappaPage,QuartierePage,CittaPage,CovoPage,AccessoMondoPage,EditorMappaPage,DungeonDettaglioPage}.tsx`;
  - componenti delle mappe: `components/mappe/{VisoreMappa,MappaIncorporata,RisolviMappa,MappaTokyo,IngressoQuartiere,AlberoLuoghi,IllustrazioneConSegno,SagomaQuartiere,segniMappa,collocazioneTokyo}`;
  - altri componenti e hook: `components/partita/OggiMappa.tsx`, `components/shared/Modal.tsx`, `hooks/useOggi.ts`;
  - utilità: `utils/{navigazioneMappa,vocabolarioMappe,accessoMondo,cestino}.ts`;
  - stile: `tailwind.css`.
- **Test aggiornati o nuovi**: in tutto 21 file `*.test.ts[x]` (elenco in `esiti-fe/file-test-l2.txt`).

## Pezzi (riferimenti a `modifiche.md` / `requisiti.md`)
- **Casa unica (R2-15, R2-16)**:
  - `/guida/mappe/<k>` reindirizza alla casa calcolata dal server (`RisolviMappa` passa `casa`) e conserva spillo, x, y, zoom, contesto e area;
  - Tokyo va a La città;
  - una mappa la cui casa è il visore resta nel visore.
- **Pagina Area (§4.3)**:
  - briciole, titolo con `aria-current`, versioni come `?planimetria=` (replace), avviso della versione senza pin con «Passa a…»;
  - «Luoghi qui» seleziona il pin come comando (UX2-2), «Aree vicine» porta alle case;
  - Covo con il collegamento alle sfide, «Da verificare» per lo staff;
  - finestre Modifica, Aggiungi planimetria, Ripristina ed Elimina (con il riepilogo del 409);
  - «Area non trovata».
- **Quartiere (§4.2)**:
  - illustrazione nel visore, «Entra: <area>», «Ingresso», «Aggiungi area», aree e luoghi;
  - `?ingresso=1` apre la finestra d'ingresso (lo spillo vince); «Chiudi» toglie il parametro, «Apri l'area» porta sul punto;
  - scarico 4xx → avviso senza «Riprova» (LAY-2).
- **La città**: «Aree della città» (staff con «Tieni» e «Rimuovi»), «Planimetrie da collocare» con «Colloca» (R2-27).
- **Covo**: la carta «Planimetrie del Covo» porta a `/guida/citta/yongen-jaya/covo-dei-ladri`.
- **Indice (§4.6)**:
  - carte per area, con le versioni sommate;
  - `AlberoLuoghi` raggruppa le versioni di un'Area in una voce col nome dell'Area, il link alla casa e «N versioni · pin»;
  - il gruppo si chiama «Aree di …» (M19).
- **Editor (§4.6, R2-20, R2-27)**:
  - per le mappe del mondo (`eMappaDelMondo`: casa `/guida/citta…`) niente «Nuova mappa» né «Crea mappa collegata»; al loro posto il collegamento «Aggiungi area / planimetria dalla pagina del quartiere» (`paginaPerAggiungere`);
  - «Chiudi» e «Apri il visore» portano alla casa, sulla versione aperta;
  - una planimetria di un'Area non mostra tipo né genitore e non li manda al salvataggio;
  - nei Palazzi l'editor è invariato.
- **Metro e Oggi**: il cartellino del quartiere usa `?ingresso=1`; OggiMappa scende con il centro dell'ingresso.
- **Nomi (§4.4b)**: M6, M8, M9, M11, M12, M16, M17, M18, M18b, M19, T3 e T4 secondo la tabella; il chip dice «Planimetria» solo per le planimetrie di un'Area.

## Difetti corretti (stato in `difetti.md`)
- Corretti: UX2-1…UX2-6, LAY2-2, LAY2-3, FUN2-6, LAY-2 (avviso FE).
- LAY2-1: corretto a tutte e tre le altezze (terza via di Stesura per il Covo a 1024).
- Testers avvisati il 2026-10-20: UX, layout, funzionali.
- **Regressione trovata e corretta da me**: l'auto-accensione dei non disponibili per UX2-2 rivelava un pin bloccato anche arrivando
  da un indirizzo, contro la regola del test `VisoreMappa` «un indirizzo con lo spillo bloccato non lo rivela». Ora si accende solo
  col comando (`rivelaSelezione` / `rivelaSpilloIniziale`, passato da AreaPage al tocco su «Luoghi qui»). È verificato dal vivo:
  - col tocco, Untouchable 1517 è selezionato, ha la sua scheda e il chip è acceso;
  - con lo stesso indirizzo ricaricato, nessun pin e il chip è spento.

## Misure (spazio occupato / spazio disponibile)
| | Covo | Sottopasso | Central Street | Piazza della stazione |
|---|---|---|---|---|
| 1366×657 | 589/589 | 589/589 | 589/589 | 589/589 |
| 1280×689 | 621/621 | 621/621 | 621/621 | 621/621 |
| 1024×690 | 622/622 (prima della terza via: 634/622) | 622/622 | 622/622 | 622/622 |

A 1024 il collegamento in coda alla fila misura 183×44 e il segmento premuto resta in vista (fila larga 581 px, scorre). A 1280 e 1366 il
collegamento sta in testata (183×44): nulla è cambiato.

A 375 e 768 nessuno scorrimento orizzontale su `/guida/citta`, Shibuya, Sottopasso, Covo, indice ed editor. Il collegamento dell'editor
a 375 misura 355×44.

## Esiti (cartella `esiti-fe/`)
- `vitest-fe-l2.txt`: area L2 (`src/components/mappe`, OggiMappa, OggiPartita, useMappaPartita, AccessoMondo, Area, Città, Covo, Editor,
  Mappa, QuartierePage.scarico, DungeonDettaglio, `src/utils`). Risultato: **52 file, 493 test passati, EXIT=0**. Dopo la terza via:
  `AreaPage.test.tsx` 8/8, con 2 casi sul collegamento del Covo (in coda alla fila; in testata senza fila); typecheck e lint ancora verdi.
- `typecheck-fe-l2.txt`: `tsc -b tsconfig.full.json`, **EXIT=0** (0 righe in `src/`).
- `lint-fe-l2.txt`: `eslint src`, **EXIT=0**.

## Note per gli altri
- Dati (L5?): in «Luoghi qui» di Central Street «Distributore del cancello» compare due volte. Sono due pin con lo stesso nome; da vedere
  con chi cura i luoghi.
- L3: preso nota dell'avviso di BE (Memento senza `areePalazzo` e `mappe[].area`): si leggeranno con `?? []`.

## Correzioni dopo il commit aed23dee (dai test e dal collaudo, 2026-10-20)
Solo file di L2, nessun file di L3 toccato: si possono committare a parte.
- **UX2-8**: «Elimina area» (AreaPage) e «Rimuovi» (AreeDellaCitta) mandano la conferma alla prima pressione; la finestra dice già
  che cosa si porta via, ricavandolo dai dati dell'area.
- **LAY2-4**: sotto i 768 px «Luoghi qui» e «Aree vicine» stanno nella pagina sotto il visore, e il pannello del visore parte chiuso.
  A 375 la tela è 331×465 (prima 240) e non c'è nessuno scorrimento annidato.
- **UX2-6**: con `(hover: none)` le etichette dei pin di spostamento restano visibili. Sotto i 640 px il visore del quartiere è alto
  quanto l'illustrazione: a 375 la tela è 331×186 (prima 400).
- **UX2-7**: la colonna del testo della carta ha come minimo 10rem e i pulsanti vanno a capo.
- **UX2-9**:
  - (a) il punto scelto è detto a parole;
  - (b) «Nessun pin qui.»;
  - (c) i comandi delle versioni vanno a capo interi;
  - (d) il pin nuovo si mostra selezionato e la mappa si rilegge (contatore `revisione` in `versione`).
- **LAY2-5**: `lg:gap-3` nell'indice, che a 1024×690 ora è 622/622. A 1280 e 1366 l'indice resta lungo (1095), come prima.
- **FUN2-7**: il riepilogo dice «Aree di <posto> (N)» e conta le voci mostrate.
- **File**:
  - `components/mappe/{AlberoLuoghi,AreeDelQuartiere,AreeDellaCitta,FinestraAggiungiArea,FinestraModificaArea,VisoreMappa}.tsx`;
  - `pages/{AreaPage,MappaPage,QuartierePage}.tsx`, `tailwind.css`;
  - test: `components/mappe/{CollezioniImmagini,OrganizzazioneMappe,VisoreMappa}.test.tsx`, `components/mappe/FinestreAree.test.tsx` (nuovo), `pages/{AreaPage,CittaPage,MappaPage}.test.tsx`.
- **Esiti** (`esiti-fe/*-collaudo.txt`): vitest area L2, 53 file e 505 test, EXIT=0; typecheck EXIT=0; `eslint src` EXIT=0.

## UX2-10 e LAY2-6 (ultimo giro di collaudo, 2026-10-20)
- **UX2-10** (`VisoreMappa.tsx`, funzione `sistemaEtichette` e il suo effetto; `tailwind.css`, `[data-coperta]`): su touch i nomi dei passaggi
  restano nella tela e a sinistra dei comandi dello zoom, e quello che ne coprirebbe un altro si nasconde. Il calcolo si rifà a ogni disegno
  e a fine transizione. A 375 su Shibuya «Central Street» è intera (spostata di 28 px), mentre «Piazza della stazione» resta nascosta finché
  non si ingrandisce.
- **LAY2-6** (`CovoPage.tsx`): la carta «Planimetrie del Covo» ha `touch` e `min-h-12`; a 768 misura 352×48.
- **Test**: `VisoreMappa.test.tsx` (UX2-10), `CovoPage.test.tsx` (LAY2-6).
- **Esiti** (`esiti-fe/*-collaudo-2.txt`): vitest area L2, 53 file e 507 test, EXIT=0; typecheck EXIT=0; `eslint src` EXIT=0.
- **Fuori da L2**: `src/services/api/aree.ts` è cambiato per L3 (contenitore `{ tipo, chiave }` accanto alla stringa di L2; le firme
  sono compatibili con L2). Non va nel commit di L2.

## UX2-12 (Cestino, 2026-10-20) — file per il commit di L2
- **File**: `src/utils/cestino.ts` (`contenutoLeggibile`, `descrizioneElementoCestino`), `src/components/impostazioni/Cestino.tsx`,
  `src/components/impostazioni/Cestino.test.tsx`.
- **Cosa cambia**: ogni elemento si legge «Area di Shibuya: Sottopasso» e sotto «con 2 planimetrie, 14 pin e 3 immagini», con le sole
  parole di chi gioca. I dettagli interni e l'elemento stesso non si contano più, e l'introduzione cita le aree del mondo. Solo FE.
- **Esiti**: Cestino.test 8/8, typecheck EXIT=0, eslint EXIT=0. Non visto nel browser: il cestino di 5373 è vuoto, va guardato sul Collaudo.
- **UX2-11** («Apri sull'atlante» in Dove si trova) è la riga M22 della tabella §4.4b, assegnata a L5: non l'ho toccato.
- **Da NON mettere nel commit di L2** (L3 in corso): `src/services/api/aree.ts`, `src/services/api/compendio.ts` (creaArea con
  `areePalazzo`), `src/router.tsx`, `src/components/guida/{AreePalazzo,SpuntaCompletata,FinestraLegamiInfiltrazione,ModuloNuovaArea,AreeDelDedalo}.tsx`,
  `src/components/mappe/{FinestraAggiungiArea,FinestraModificaArea,FinestraAggiungiPlanimetria}.tsx`. `src/tailwind.css` ha
  insieme le righe di UX2-10 (L2) e `.chip--toccata` (L3, una classe nuova e innocua).

## Correzioni del validatore, giro 1 (2026-10-20) — parte FE
Output grezzi in `esiti-giro2/fe/`. Modifiche solo con Edit/Write.
- **R6 + FUN2-9** (commit `b0ebdad0`):
  - `AreeDellaCitta.tsx`: «Colloca» propone il quartiere la cui `mappaChiave` è il genitore della planimetria (`MappaDaCollocareDto.genitore`, BE `b6f3dd9a`); con un genitore che non è un quartiere, il primo.
  - `CittaPage.test.tsx`, due test:
    - lista non vuota: compare la sezione, si apre la finestra, quartiere Kichijoji e aree Piazza + «Un’area nuova…», l'invio va a `collocaPlanimetria` con area ed etichetta, la finestra si chiude, la lista viene riletta e sparisce;
    - genitore Tokyo → Yongen-Jaya.
  - Rosso: `R6-FUN2-9-rosso.txt` (Expected "Kichijoji", Received "Yongen-Jaya"). Verde: `vitest-verde.txt`.
- **R1** (commit `c43b8bc0`):
  - `AlberoLuoghi.tsx`: chip «Da verificare» accanto al nome dell'Area con `daVerificare` (BE `1cd41876`), con classi e suggerimento della pagina Area;
  - `OrganizzazioneMappe.test.tsx`: il segno c'è sull'area da verificare e manca sulle altre. Rosso: `R1-rosso.txt`.
  - Nel browser (5373, Tokyo aperto nell'indice):
    - 1280: chip accanto al nome (x 872, nella riga del link);
    - 768: accanto (346–436);
    - 375: va a capo sotto il nome (x 54, top +53), `scrollWidth` 375, niente scorrimento orizzontale.
- **FUN2-8 parte FE** (commit `fcff89e3`):
  - `EditorMappaPage.tsx`: il 409 `usa-aggiungi-area` (BE `1cd41876`) diventa un avviso che resta sopra le proprietà della mappa (`role=alert` «La mappa non si sposta lì»), al posto del toast che spariva;
  - l'avviso ha il messaggio del server, il link a `paginaPerAggiungere(genitore scelto)` e «Planimetrie da collocare» (`/guida/citta`); «Chiudi» lo toglie, un nuovo salvataggio lo azzera; niente «Mappa salvata.».
  - Rosso: `FUN2-8-rosso.txt`. Verde: `FUN2-8-verde.txt` (48/48).
  - Non visto dal vivo: nei dati di 3201 non c'è nessuna mappa sciolta da spostare, e crearne una sporcherebbe i dati condivisi. Va visto in un ciclo del Collaudo.
- **R1, carta di Tokyo** (commit `a7fe0aee`, decisione del PM: il segno visibile senza aprire niente):
  - nell'indice `/guida/mappe` la carta di Tokyo mostra il chip «1 da verificare», che porta alla casa dell'area dello staff;
  - la carta resta il pulsante che apre il pannello, steso su tutta la carta; il chip è un collegamento sopra di lui;
  - rosso `R1-carta-tokyo-rosso.txt`, verde `R1-carta-tokyo-verde.txt` (24/24);
  - browser: carta 86 px a 1024, 768 e 375; indice 622/622 a 1024×690; chip 96×44 che riceve il tocco; nessuno scorrimento orizzontale a 375.
- **R8**: qui sopra `VersioniArea.tsx` è passato fra i sorgenti.
- **Verifiche**:
  - `tsc -p tsconfig.app.json` e `tsconfig.test.json`: EXIT=0;
  - `npm run typecheck` (full): 2 errori, solo in `server/routes/palazzi-aree.test.ts` (`impostaCasaSchedaPalazzi`, lavoro L3 del BE in corso, non committato);
  - eslint sui 4 file: EXIT=0;
  - Vitest CittaPage + OrganizzazioneMappe: 46/46.
- **Commit**: solo L2. Le righe di L3 degli stessi file di test (href del Memento, `?infiltrazione=`) le ho tolte con Edit prima del commit e rimesse dopo; restano nella working copy.

## Dichiarazione: modifiche fatte con sed (regola dell'utente, promemoria del PM del 2026-10-20)
In questa sessione, prima del promemoria, ho cambiato alcune righe con `sed -i` (sostituzioni di stringhe precise, tutte riverificate
dopo) invece che con Edit:
- **Sorgenti**: `src/pages/QuartierePage.tsx` (classe `visore-alto-quanto-immagine`, `rivelaSpilloIniziale`, `onPinSegnato`,
  `onCreata`, `versione` con `revisione`), `src/components/mappe/VisoreMappa.tsx` (`as CSSProperties`) e
  `src/components/mappe/VersioniArea.tsx` (nome `riquadro`; correzione R8 del validatore, giro 1: è un sorgente, prima stava fra i test).
- **Test**: `src/pages/CittaPage.test.tsx` (import di `useLocation`, mock di `getAreeCitta`, `getDaCollocare`, `aggiornaAreaMondo`,
  `eliminaAreaMondo`), `src/pages/MappaPage.test.tsx` (import di `cleanup`, tipo del mock di `risolviMappa`),
  `src/pages/AreaPage.test.tsx` (regex di «Vicoli»).
- **Documenti**: `lotti/L2/difetti.md` (colonna dello stato di più righe).
Dopo il promemoria uso solo Edit e Write.
