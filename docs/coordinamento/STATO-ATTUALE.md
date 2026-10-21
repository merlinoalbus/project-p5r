# Stato attuale del lavoro — ramo newreview / p5s (aggiornato 2026-10-21, ripresa)

## DOVE SIAMO ADESSO (leggere per primo; prevale su tutto quanto c'è sotto)
- **07:30Z — gate codice L5–L7 APPROVATO STATICAMENTE.** Revisore distinto contro originali `43ad8889`: chiusi i rilievi su condizioni, Diario, catalogo, acquisti autonomi, riferimenti e snapshot, proposte obsolete, posizioni, tipi delle letture e immutabilità dell'audit. Attivati nei registri gioco 121/122, utente 026, router e OpenAPI; diff di attivazione al riesame breve prima del push. Controlli finali integrati in corso. Nessun test, avvio o migrazione locale. Riferimento live raccolto solo in memoria con GET prima del rilascio: schema 120/25, Diario protetto 255 voci in 54 giorni, Kamoshida 169 e Madarame 226 voci correnti, 611 pin dell'utente nelle 43 planimetrie lette. Nessun dato privato o impronta privata salvati su git. Il confronto successivo riguarda questo perimetro API, non l'intero DB. Proposte da approvare e riconciliazioni aggregate sono distinte dalla funzionalità: l'audit ricostruito non equivale al file preliminare perduto. Pubblicato ancora `c025154a`, pipeline #65. Dopo il rilascio L5–L7 segue L8; analisi L8 in sola lettura già avviata, nessuna implementazione L8 anticipata.
- **21/10 07:17Z — bonifica locale, nessun rilascio nuovo.** A56-01…08 e Diario A7-03 **APPROVATI staticamente** dal revisore distinto contro le specifiche originali. Non è una certificazione dei dati, del runtime o del completamento integrale di L5–L7.
- **L7 ancora in modifica e revisione:** bloccante la conferma di proposte con snapshot non più attuale; riferimenti nei costi JSON durante fusione, ripristino e cestino in correzione dall'esecutore L7. Il coordinatore segue API, interfaccia del censimento, Shinya e integrazione; l'esecutore L5/L6 mantiene il censimento 121 e aggiorna il coordinamento.
- **A7-04 approvato solo nel perimetro esaminato:** helper del censimento, aggancio alla 121, canonicalizzazione condivisa, vista audit con elenco limitato e correzione Shinya riesaminati staticamente. Manifest alla seconda revisione dei campi: **2.430 fonti pubbliche del pacchetto schema 93**, formato `schemaVersion: 1`. Il documento preliminare `l7-proposte.json` non è stato ritrovato: la ricostruzione non ne dimostra l'equivalenza. Aggregati e sottoelementi non riconciliati restano decisioni aperte, visibili nell'app; **A7-04 non integralmente chiuso**. Provenienza e limiti in `lotti/L7/ricostruzione-input.md`.
- **Controlli intermedi:** typecheck sessioni `89630` e `95475` exit 0; lint `61538` exit 0. Non coprono le modifiche L7 successive né sostituiscono il riesame e i controlli finali integrati. Nessun test, migrazione, scrittura DB, commit o push eseguito in questa bonifica.
- **Pubblicato invariato:** `c025154a`, ultima pipeline nota #65 (`39514931684`) riuscita; nessuna nuova osservazione del prodotto pubblicato attestata da questo aggiornamento. Migrazioni gioco **121/122** e utente **026 non registrate**. Prossimo passo: chiudere i rilievi L7, completare la copertura e ottenere il riesame distinto prima del rilascio integrato; poi proseguire L8–L11 come ordinato dall'utente.

### Cronologia precedente — i riferimenti a «corrente» e ai controlli verdi sotto valgono alla data della rispettiva nota

- **06:43Z — implementazione in corso:** piani L5/L6, L7 e Diario APPROVATI dal revisore distinto. Diario locale: dichiarazioni per singola spunta, unione con eventi manuali, modifica senza riapplicare effetti o avanzare il giorno, scelta e rimandi UI. Tre letture proprie (titolarità/undo, ammissibilità/storia, contratti/UI); riesame avversariale del codice in corso. Primo typecheck dopo integrazione Diario riuscito; non è il controllo finale del codice L5–L7 ancora in modifica. Nessun test, migrazione, scrittura DB, commit o push. L8–L11 restano successivi al rilascio integrato; recuperate in sola lettura le fonti originali di negoziazione per L8.
- **Mandato successivo del 21/10: IMPLEMENTARE E RILASCIARE.** L'utente dispone: «Tutti i difetti vanno bonificati e rilasciati, le implementazioni parziali completate, poi va gestito il resto L8–11». Supera il precedente perimetro audit-only. Esecutore L5/L6: bonifica A56 e lacune; esecutore L7: catalogo e completamento; coordinatore: Diario/integrazione; revisore distinto: soluzione e codice contro originali. Piani concreti al gate prima degli edit. File L5–L7 già intrecciati: revisore favorevole alla correzione sequenziale con **unico rilascio integrato L5–L7 completo**, poi L8, L9, L10 e L11. Nessun rilascio della bozza incompleta. Zero test; typecheck/lint/build e tre riesami, dati protetti. Dossier dell'audit preparato nell'indice git, non ancora committato o pubblicato.
- **Consegna documentale riesaminata:** agente distinto `audit_documenti_originali`, esito **APPROVATO solo per il dossier**, senza rilievi documentali bloccanti residui. Non è approvazione delle correzioni proposte né di L5/L6/L7. Il commit di questa consegna contiene solo documenti; pipeline e osservazione browser successive accompagnano il salvataggio, a sorgenti pubblicati invariati.
- **21/10, ripresa dell'audit — stato corrente:** ricostruzione e passate indipendenti L5/L6 e L7 concluse. **Nessuna approvazione integrale dei lotti.** Rapporto in `audit-conformita-2026-10-21.md`, matrice di tutti gli identificativi dei requisiti in `audit-copertura-2026-10-21.md`, con esiti statici, parziali e non verificati distinti. A56-01…08 e A7-01…09 includono i rilievi di Lorentz e quelli successivi, senza confonderne l'autore. Codice pubblicato alla base dell'audit `c025154a`, pipeline #65 (`39514931684`) ricontrollata `completed/success`; la consegna documentale successiva non cambia il prodotto. Nessuna correzione del prodotto, test, migrazione o servizio gestito durante l'audit.
- **Decisione tecnica su delega ricevuta il 21/10:** alla domanda sul conflitto equipaggiamento dataset/listini l'utente risponde «la soluzione migliore». Scelta dell'assistente riesaminata favorevolmente da un agente distinto: nessun abbinamento basato solo sul nome; identità distinte finché l'equivalenza non è documentata, conservando collegamenti espliciti preesistenti e tutti i riferimenti. Fusioni secondo l'approvazione prevista. Non significa che tutti e cinque gli articoli siano certamente diversi; dettagli e vincoli nel rapporto. Nessuna conversione eseguita.
- **Mandato ricostruito anche dai messaggi originali:** si verificano le reinterpretazioni dell'esecutore; le richieste del PM restano input legittimi. Il raccordo intermedio del catalogo è contestato; l'apertura del dedalo va dichiarata dal Diario durante una visita ai Memento. Non introdurre regole automatiche dalle visite. Le note sotto su Progressi e controlli verdi sono storiche. Prima di altre implementazioni occorrono esito dell'audit e soluzione concreta validata, come richiesto dall'utente.
- **Salvataggio di questa ripresa:** il prompt diretto corrente richiede commit/push alla fermata. La consegna dell'audit riguarda soltanto documenti, dopo revisione distinta; il codice L7 incompleto resta escluso dalla pubblicazione. Non si tratta della consegna di L7. Lo stato del codice pubblicato resta quello di `c025154a` finché non viene approvata e realizzata una correzione.
- **21/10 06:09Z — audit richiesto dall'utente, in corso:** confronto fra specifiche originali ricevute e implementazione, esteso integralmente a L5/L6 pubblicati e L7 locale, indipendentemente dall'autore git. Nessuna conclusione globale di conformità ancora dimostrata. Nuova regola: ogni consegna passa da un agente distinto e avversariale con accesso diretto alle specifiche; resta zero test. Revisore indipendente avviato su L5/L6. Audit in sola lettura del prodotto; aggiornati solo i documenti di coordinamento, nessun rilascio o correzione del codice.
- **Stato locale da non confondere con i controlli storici:** l'ultimo typecheck osservato è fallito: `server/routes/partite.ts:129` passa `apertureDedali` non previsto da `OpzioniSpunta`; `server/services/azioniStrutturateService.ts:21` ha un import inutilizzato. I verdi delle 05:14Z non coprono le modifiche successive. Il collegamento intermedio `catalogo_oggetto_fonte` contestato dall'utente è ancora nel codice locale; non è stato rimosso né pubblicato. L'utente ha scelto l'apertura del dedalo **dal Diario quando registra una visita ai Memento**: la precedente scelta implementativa di Progressi non vale come risposta dell'utente. Il gesto nel Diario è incompleto. Non introdurre conteggi di visite o apertura automatica alla seconda visita.
- **Ultimo avanzamento 21/10 05:14Z**: predisposte proposte per i sei baratti Gachapon, senza abbinarli alla capsula casuale da 500 yen né creare offerte/acquisti automaticamente. Conferma di un gruppo → una sola offerta, costo per chiave, risultati distinti nella relazione esistente delle ricompense; nessun oggetto-bundle o contatore nuovo. Mothman espone le alternative annotate, senza dedurle dalla spunta. API/DTO/UI delle proposte mostrano costo e risultati prima del gesto; correzione manuale dal listino con l'editor dei contenuti riusato. Risultati propagati a listino, ricerca, pagina Oggetto e visore; fonte/costo correnti letti in blocco. Guardie contro offerte/risultati occupati, riferimenti spariti e combinazione di oggetto singolo con risultati separati. Le fusioni seguono anche i riferimenti nei metadati e negli snapshot delle proposte; non sommano premi alternativi né raddoppiano quantità equivalenti. Tre riesami statici, typecheck/lint/build exit 0 dopo l'ultima modifica, diff --check pulito; non prova runtime. DB readonly ancora schema 120 senza catalogo e con sola Capsula gachapon a 500 yen. M7/router BE non attivi, nessun test/scrittura/servizio gestito o rilascio. Restano ultimi consumatori/selettore e riesame integrale prima della registrazione finale; non dichiarare concluso R7-13 o L7.
- **Ultimo avanzamento 21/10 04:50Z**: Jose collegato localmente a M7, DTO e foglio Richieste: la fonte completa di 37 scambi prepara offerte normali, costo in fiori e requisiti strutturati. Le sette aperture effettive si segnano nel registro esistente di Partita → Progressi, senza nuova tabella, date presunte o modifiche alla gestione dei dedali. La collocazione è una scelta implementativa comunicata, non un'approvazione attribuita all'utente né un blocco ancora pendente. Il foglio riusa ArticoliTabella e dettaglioNegozio; prima di M7 resta la vista storica. Negozi nascosti/eliminati e offerte preesistenti non sovrascritti; ambiguità nelle proposte. Rafforzate anche fusioni, ripristino degli snapshot e classificazione dei contenuti non inventariabili. Typecheck/lint/build exit 0 dopo le ultime modifiche, tre riesami statici e diff --check pulito; nessuna prova runtime. M7/router BE non attivi e nessuna pubblicazione. Restano baratti Gachapon, ultimi consumatori/selettore e riesame integrale. Gachapon: fonte AGS chiarisce cinque Repliche d'arma, poi Balsamo vitale, non il cambio già al quinto. Dettagli nel checkpoint L7; unico commit/push a fine lotto.
- **Ultimo avanzamento 21/10 04:17Z**: Scambi ora apre i listini esistenti dopo M7, senza duplicare tabella commerciale o gesti. Predisposta conservazione delle copie della guida nelle note dei negozi e negli snapshot già presenti; nessuna origine o dato commerciale riscritto. Note ripiegabili con componente esistente, fuori dall'intestazione Negozio. Tre varianti del Venditore solo proposte; i sei baratti Gachapon non sono la singola capsula casuale da 500 ¥ e restano da risolvere in L7. Dieci descrizioni API predisposte, non ancora registrate come router/M7. Typecheck/lint/build exit 0 dopo l'ultima modifica e tre riesami statici; DB readonly schema 120 senza catalogo. Nessun test, prova runtime, scrittura sui dati, servizio gestito o rilascio. Restano Jose/scelta già inviata, contenuti dubbi, baratti/ultimi consumatori e riesame completo. Dettagli nel checkpoint; unico commit/push a fine lotto.
- **Ultimo avanzamento 21/10 04:02Z**: premi L7 collegati localmente a conversione, DTO e viste di esami, Confidenti, Covo e sfide/boss; pagina Oggetto e proposte leggono nomi/case delle fonti correnti in blocco. Nota del premio conservata anche confermando, scegliendo un'alternativa o fondendo; non sovrascrive note precedenti. Domande con sole Doti, PE/yen e premi ornamentali non diventano oggetti. Fonte readonly: 4 esami, 63 doni espliciti, 39 premi di Battaglie Sfida, 8 premi-oggetto dei boss e 2 finali del Covo; sono perimetri della sorgente, non conteggi di una migrazione eseguita. Typecheck/lint/build exit 0 dopo l'ultima modifica, tre riesami statici; DB ancora schema 120 senza catalogo. Nessuna prova runtime, test, scrittura sui dati, servizio gestito o commit/pipeline. M7/router BE non attivi: restano Jose/scelta già inviata, contenuti dubbi, scambi/altri consumatori/API e riesame integrale. Ultimo rilascio sempre c025154a, pipeline #65 success verificata su GitHub. Dettagli nel checkpoint L7.
- **Ultimo avanzamento 21/10 03:34Z**: L7 locale, collegata anche la sezione proposte in catalogo/Impostazioni e nelle voci, con conferma/scarto/scelta alternativa/fusione espliciti. Fonte attuale, certezza e variazioni visibili prima del gesto; gruppi indipendenti e resa ignota delle ricette conservati. Contenuto manuale modificabile dalla voce, senza riscrivere testo/pin/stato; collisioni fra oggetti già presenti e fonte sparita rifiutate, note preservate salvo cancellazione esplicita. DTO delle proposte in blocco, niente richieste per ogni voce. Typecheck/lint/build exit 0, tre riesami statici; nessuna prova runtime. M7/router BE ancora non attivi e nessun rilascio: restano Jose/altri premi/contenuti dubbi, scambi/altri consumatori/API e riesame integrale. Nessun test, scrittura sui dati, servizio gestito o commit/pipeline intermedio. Checkpoint L7 aggiornato; le note precedenti che indicano F4 ancora assente sono superate.
- **Riscontro corrente 21/10 03:14Z, prevale sulle note 02:34Z e precedenti**: L7 ancora locale. ModuloArticolo sceglie la chiave senza copiare nome/proprietà/prezzo; costo modificabile in yen, fiori o oggetti da cedere, conservato se non editato. Offerte storiche non collegate ancora modificabili; snapshot pre-M7 non azzerano collegamento/costo. Catalogo integrato in OggettiPage e rotta Oggetto montata nel FE; vecchi indirizzi delle tre liste aprono il gruppo equivalente, conservate fabbricazione/personalizzazione/abiti-lavanderia/scambi. Typecheck/lint/build exit 0; la build ora include le pagine nuove, non dimostra il runtime. DB readonly schema 120 senza catalogo; migrazioni e router BE non registrati. Restano M7/Jose/altri premi/contenuti dubbi, UI proposte, altri consumatori/OpenAPI e riesame completo. Nessun test, scrittura sui dati, servizio gestito o commit/push intermedio. Ultimo rilascio ancora `c025154a`, pipeline #65 riuscita verificata su GitHub. Quadro globale: L0–L2 consegnati; L3–L6 implementazione pubblicata con conferme funzionali aperte; L7 in corso; L8–L11 progettati, da implementare. Dettagli in `lotti/L7/ripresa-implementazione.md`.
- **L7 in lavorazione, 21/10 02:34Z**: collegati anche contenuti delle voci (scheda e guida nel visore), ricompense delle Richieste, oggetti della guida, abiti e ricette al catalogo; suggerimenti delle offerte per chiave, non per titolo. Testi originali conservati come note indipendenti. Corretto un dato inventato nella bozza M7: le dieci ricette non dichiarano la resa, ora `null` esplicito fino alle proposte/UI, non «1». Conteggi noti di materiali e contenuti restano positivi. Letture/listini/regali già collegati nel passaggio precedente; nessuna riscrittura di stati, pin, diario o JSON guida da questi lettori. Typecheck/lint/build exit 0, tre riesami statici, nessuna prova runtime. DB readonly schema 120 senza catalogo; migrazioni/router e pagina Oggetto/catalogo non montati. Restano Jose, altri premi/contenuti dubbi, vecchio selettore, integrazione catalogo/proposte/OpenAPI e riesame complessivo. Zero test, nessuna scrittura, servizio gestito, commit o pipeline intermedia; dettagli nel checkpoint L7.
- **L6 consegnato in `c025154a`**: pipeline #65 (`39514931684`) riuscita. Correzione R6-08b pubblicata nelle tre viste; osservata su p5s la descrizione di Asakusa con entrambe le alternative, senza salvataggi. Typecheck/lint/build verdi prima del rilascio. Le note di preparazione sotto sono storiche, superate da questo esito. Calendario derivato già assegnato a L9 da `modifiche.md` §4.3; restano le prove funzionali dell'utente, non il permesso di pubblicare questa correzione.
- **Ripresa L6 del 2026-10-21, dopo il rilascio**: pubblicato `63e12734` con un unico commit/push di codice e coordinamento; pipeline #64 (`39510479328`) riuscita, locale/remoto allineati dopo fetch. Typecheck/lint/build riusciti, nessun test o nuovo validatore. P5s osservato nel browser dopo l'aggiornamento automatico: Asakusa con nuova disposizione e fonte. Nessun servizio gestito manualmente, importazione o salvataggio sui dati dell'utente. **L6 non completo**: descrizioni residue e limiti della copertura in `lotti/L6/copertura-ripresa.md`.
- **Correzione locale di un'omissione già nel piano**: R6-08b e `modifiche.md` §4.1 prescrivono già la descrizione generata. Non è una nuova funzione o regola da approvare: la richiesta di un'altra approvazione era un blocco introdotto dall'assistente, non un requisito del piano. Corrette localmente scheda, carte della città e metro: testo/motivo del DTO invece di prosa/data legacy, senza tagliare la descrizione nelle carte. Typecheck, lint e build riusciti; tre passaggi di controllo su sorgenti, perimetro e compilazione. Nessun server/shared/dato modificato. Da includere nel commit finale del lotto, non ancora pubblicata; nessuna pipeline nuova.
- **Asakusa risolto dall'utente**: «sblocco se vale la prima o la seconda condizione». Ann rango 7 **oppure** Skytree aperto dal libro «Shitamachi rinato». La migrazione 118 esprime già questo OR; allineati R6-10 e decisioni, nessuna nuova migrazione o scrittura dei dati. Nessuna decisione ancora richiesta su questo punto.
- **Revisione precedente delle rimozioni**: approvate esclusivamente nel perimetro statico; non certifica il runtime né la chiusura/pubblicazione di L6.
- **Richieste successive, perimetro confermato**: rimosso soltanto il blocco «Da posizionare» del pannello dell'Area e, separatamente, il riquadro «Schermate di riferimento / Aggiungi schermata» dell'editor, pubblicati con `63e12734`. «Aggiungi luogo», gli altri accessi a «Posiziona», le API e i dati esistenti restano invariati. Il tentativo di aggiungere il tipo di pin «Luogo» è stato ritirato per ordine dell'utente; catalogo dei pin invariato nel rilascio. Non introdurre tipi o processi estranei al piano di L6.
- **Controlli sul rilascio**: `npm run typecheck`, `npm run lint` (zero avvisi) e `npm run build` riusciti; `git diff --check` senza errori. Nessun test scritto o eseguito. La pipeline verde e la lettura della scheda Asakusa non provano tutti i requisiti funzionali/layout di L6: prove dell'utente ancora aperte.
- **Decisioni più recenti dell'utente**: si lavora su un lotto intero e si fa commit/push soltanto alla fine, con codice e coordinamento insieme. «Importa» resta: sostituisce il file DB con un backup locale, non reintroduce il pacchetto come fonte dei dati. La guida del visore va bene com'è: restano tutte le infiltrazioni associate alla planimetria.
- **Implementazione L6 pubblicata in `63e12734`**: collegati editor unico/anteprima server, inviti nelle tre viste, editor requisiti con bozze conservate per rango, fonti degli sblocchi e libri «Apre». La finestra requisiti segue il parametro URL e il Confidente corrente. Città e metro mostrano `disponibile` del server; l'Area chiusa dice perché. Corrette perdita del testo degli avvisi nel DTO/salvataggio, spazi durante la digitazione, prefisso duplicato, avvisi annidati e chip non bloccanti. I semafori generano il testo dai riferimenti correnti, senza perdere le note salvate. Non confondere questa integrazione con la copertura integrale dei requisiti.
- **B6 pubblicato con `63e12734`**: «Importa» allineato al backup locale nell'interfaccia e in `CLAUDE.md`. Recupero dei vecchi `manuale` durante l'importazione esplicita, dopo le migrazioni storiche, con riepilogo e percorso di ripristino esistente; coperti anche snapshot del catalogo e della guida. Anche il JSON delle mappe elenca i recuperi nei pin e nelle copie effettivamente importati, non gli scarti. Riepilogo FE e OpenAPI aggiornati, normalizzazione e regole di sovrascrittura conservate. Nessuna importazione eseguita. `elenco-frasi-condizioni.md`: 201 righe / 147 frasi dal DB pubblico schema 93, non prova dei dati di p5s. Nessuna conversione delle frasi applicata o approvata.
- **Ramo unico `newreview`**: ultimo push `63e12734`, pipeline #64 riuscita. Fetch riuscito, locale e remoto allineati. Aggiornamento post-rilascio del coordinamento ancora locale, in attesa del prossimo commit autorizzato. Nessuna nuova pipeline per soli documenti.
- **Dati di p5s**: il runtime pubblicato espone già `sbloccoCondizione` con snapshot e il pulsante «Modifica sblocco»; la migrazione 120 copia senza sovrascrivere la condizione attuale la guida degli sblocchi dei quartieri, per rendere possibile «Ripristina». L’API pubblica è stata verificata dopo la pipeline #61 con Shibuya coerente; il numero osservato nell’indice dopo il rilascio è 301 mappe e 767 spilli; non è stato eseguito alcun salvataggio su p5s. La pipeline #62 ha pubblicato `f4dd2c08`; la nuova scheda FE anonima è rimasta su «Caricamento», quindi la verifica utente/browser della pagina resta aperta.
- **Metro/diario L6**: il confronto del codice conferma la destinazione unica: `dungeonService`, `giornataService` e `azioniStrutturateService` usano `atterraggioDelPalazzo`/`destinazionePalazzo`; queste applicano la stessa regola d'atterraggio del giorno e lo stesso fallback all'ingresso. Resta la prova funzionale sulla partita reale, non eseguita da questa sessione.
  - 114: planimetria della voce;
  - 115: luoghi come fonte unica;
  - 116 e 117: tolta la frase «Pin nativo del gioco.»;
  - 118: condizioni uniche;
  - 119: requisiti dei Confidenti modificabili;
  - utente 025: inviti della partita.
- **Regole in vigore** (dettaglio in `memoria-del-progetto/`):
  - **zero test**: niente test nuovi/eseguiti o collaudo; prova l'utente. Typecheck e lint verdi obbligatori. Dal 21/10 ogni consegna richiede un **agente distinto e avversariale**, con accesso diretto alla specifica originale; il precedente divieto di verificatori è superato;
  - **un solo ramo**;
  - **il pacchetto di gioco è superato**: la fonte è il DB, e le correzioni ai dati si fanno con migrazioni dirette;
  - **intestazione ≤ 30%** della schermata;
  - **mai dichiarare completo** senza aver verificato le richieste in `richieste-utente-aperte.md`;
  - **mai restringere o rinviare** una richiesta dell'utente senza chiedere.

| Lotto | Stato |
|---|---|
| L0, L1, L2 | consegnati e validati |
| L3 Palazzi | pubblicato. Fatte anche le richieste dell'utente sulla guida: scheda per planimetria (UX3-14, b34e577b), campo «Planimetria» (901c7666), guida nel visore in finestra fluttuante (91986570), pin di spostamento che portano a destinazione (67a7bfda, b8048c1b). Da provare dall'utente |
| L4 Avanzamento unico | pubblicato (fde7add7, poi unito): FE completo con FUN3-3 e FUN4-1 |
| L5 Luoghi, negozi, orari | Pubblicato con difetti accertati dall'audit; **non completo né approvato integralmente**. Dettaglio A56 in `audit-conformita-2026-10-21.md`. |
| L6 Condizioni uniche | Pubblicato in `c025154a`, pipeline #65 riuscita; **non approvato integralmente**, difetti e scostamento delle finestre aperti. Runtime/dati non certificati. Calendario derivato già previsto in L9. |
| L7 Oggetti | In lavorazione locale: catalogo, offerte, lettori, proposte e premi collegati. M7/router BE non attivi; conversione e integrazione da completare. Nessuna pubblicazione intermedia. |
| L8–L11 | progettati (`lotti/Lx/`), da implementare BE e FE |

**Sessioni storiche del team** (app Claude desktop; archivio, non stato corrente: per l'audit valgono le sessioni in `stato.json`):
- «Implementazione FE» al lavoro su L6.
- «Implementazione BE» ferma: aspetta un «procedi» scritto dall'utente nella sua sessione, e non riparte con il via del PM.
- «Analisi dati» ferma, l'app non la lascia archiviare.
- Tutte le altre sono chiuse.

**Decisioni confermate dall'utente**:
1. mantenere «Importa» per sostituire il file DB con un backup locale; allineare interfaccia e documentazione a questo significato;
2. conservare la guida del visore com'è, con tutte le infiltrazioni associate alla planimetria.

**Lavoro non ancora committato**: avvio L7, contratti del catalogo e coordinamento post-rilascio L6. La correzione R6-08b è già in `c025154a`. Codice e coordinamento L7 insieme nel commit finale del lotto, senza commit/pipeline intermedi di soli documenti. Le verifiche di L6 non valgono per le nuove modifiche di L7.

**Note dalla prova di ripresa** (un'altra IA, 2026-10-20 sera):
- `git fetch` può fallire per i permessi su `.git/FETCH_HEAD`: non è prova di un processo bloccato. Il worktree condivide la cartella `.git` del repository principale. Non chiudere altri processi: usare i permessi previsti oppure `git ls-remote github newreview`. Il fetch di questa ripresa è riuscito; locale e remoto restano a `38411d36`.
- `.claude/settings.local.json` è un file di configurazione locale delle sessioni: non va committato.
- Le prove UX di L4 (`lotti/L4/esiti-ux/fde7add7/esito.md`, solo testo) ora sono committate.
- Le richieste in `richieste-utente-aperte.md` segnate «pubblicato» sono **da provare dall'utente**, non da rifare. Importa, guida del visore e OR di Asakusa sono già decisi: non chiedere un'altra approvazione. L7–L11 restano da completare; per le domande correnti vale il riepilogo in testa e la Regia, non i dubbi storici superati.

**Da sapere per chi riprende**:
- `docs/coordinamento/richieste-utente-aperte.md` è l'elenco di controllo delle richieste.
- La Regia è `stato.json`; il cruscotto `regia/server.cjs` legge il file del repository.
- Le copie locali in `~/.claude/p5s-coordinamento` sono superate.

---
# (sotto: storia della giornata, per contesto)

Documento per riprendere il lavoro da zero, con qualunque IA o persona. Il dettaglio è nella Regia (`stato.json`), nella bacheca e in `lotti/`. **Leggere tutto prima di toccare qualcosa.**

## Obiettivo
Mandato dell'utente: completare la razionalizzazione in lotti L0–L11 sul ramo `newreview`, pubblicato su https://p5s.nasmerlinoalbus.cloud. Il ramo `main` e la produzione persona5royal non si toccano. A fine progetto, dopo la validazione dell'utente, i dati di p5s sostituiscono quelli di produzione.

## Avanzamento dei lotti
| Lotto | Stato |
|---|---|
| L0 Vocabolario e testi | consegnato |
| L1 Immagini | consegnato (approvato al giro 5) |
| L2 Mondo: aree e planimetrie | consegnato (approvato al giro 6; push bff237e0; p5s verificato) |
| L3 Palazzi: aree e infiltrazioni | **pubblicato ma NON completo** (19:30Z). Manca la regola dell'utente sulla guida per planimetria: è UX3-14, al lavoro in FE con la guida nel visore e il campo «Planimetria» (`lotti/L3/integrazione-guida-visore.md`, RG-1…RG-5). Il PM l'aveva dichiarato completo per errore. Pubblicazione delle 17:50Z, con la deroga dell'utente: il giro 1 del validatore aveva rigettato solo per prove e documenti, poi chiusi (R1–R9). Push di `newreview-l3` = 91ef6128 su `newreview`, pipeline riuscita, p5s verificato nel browser. FUN3-3 (testo dell'atterraggio) va in L4 |
| L3 · integrazione «Guida nel visore» e «Planimetria della voce» | BE fatto (42b34243, non validato, **non** nella linea di rilascio di L3); FE da fare (B2). Vedi `lotti/L3/integrazione-guida-visore.md` |
| L4 Avanzamento unico | BE fatto (b83c30ac, 71378325, ad585387; migrazioni 111–113, già su p5s). FE fatto: 01e7ae12 più 7 commit c4e9f74e..e058918c (§8.11, §8.6, §4.2, §4.3, §4.1). **Rilascio in corso**: il Collaudo crea `newreview-l4` da 91ef6128 con il cherry-pick dei 7 commit, senza 42b34243. Poi FE su FUN3-3, i tester e il validatore |
| L5–L11 | progettati (requisiti, dati, app, modifiche, piani e casi di prova pronti fino a L9-L10); implementazione da fare |

## Regole in vigore dalla sera del 2026-10-20 (prevalgono su quanto scritto sotto)
- **Un solo ramo: `newreview`.** Le linee di rilascio (`newreview-l2/l3/l4`) e la copia `newreview-lavoro` sono state unite e cancellate. Su GitHub restano solo `main` e `newreview`. Si lavora e si pubblica solo su `newreview`.
- **Zero test**: niente tester, collaudo né validatore; i test li fa l'utente. Restano obbligatori typecheck e lint verdi (`memoria-del-progetto/feedback-zero-test.md`).
- **Un'unica fonte del coordinamento**: questa cartella. La Regia (`regia/server.cjs`) legge `docs/coordinamento/stato.json` del repository.
- **Richieste dell'utente aperte**: `richieste-utente-aperte.md`, da rileggere prima di dichiarare qualsiasi cosa completa.
- Al lavoro, in parallelo: FE (guida per planimetria, poi il FE di L5…L11) e BE (BE di L5…L11).

## Rami e cosa è dove (storico, superato dalla sezione sopra)
- **`newreview` su GitHub** = ciò che gira su p5s. Ultimo push: 49858485, ~08:35Z. Codice di L3/L4 a 01e7ae12 più alcuni documenti. **Ogni push su `newreview` pubblica su p5s** (pipeline «Build & Push Docker Images (newreview)», Watchtower ~3 min) e applica le migrazioni ai dati dell'utente.
- **`newreview` locale** (worktree `pensive-burnell-b50941`) = linea di sviluppo, avanti di molti commit:
  - correzioni di L3 (d73e7027..c8338fd0 e le successive dei tester);
  - **42b34243**, il BE dell'integrazione con la **migrazione 114**;
  - documenti.
  
  Non si pusha su `newreview` finché il lavoro non è validato. Una copia senza pubblicazione è sul ramo remoto **`newreview-lavoro`**, aggiornato a ogni salvataggio importante.
- **`newreview-l3`** (worktree del Collaudo `p5s-sviluppo-l2`) = linea di rilascio di L3:
  - parte da fd988a3e (= c8338fd0 + documenti);
  - si aggiungono solo correzioni dei tester e documenti, con cherry-pick verificati con `git patch-id`;
  - HEAD a db7d0423 alle 14:10Z;
  - copia remota senza pubblicazione: ramo **`newreview-l3`** su GitHub.
  
  Al rilascio di L3, dopo l'APPROVATO, si pusha `newreview-l3` su `newreview`. È un avanzamento rapido: la linea discende dall'ultimo push.
- Poi `newreview` locale si riallinea con un merge di `newreview-l3` e si prosegue con l'integrazione e L4.
- `newreview-l2` = linea di rilascio di L2, già unita. `main` non si tocca.

## L3 — stato di dettaglio
- **Difetti:** tutti in `lotti/L3/difetti.md`, con hash e test.
  - Corretti e verificati dai tester:
    - NR3-4, AP3-1/2/3/4;
    - UX3-1…UX3-11;
    - LAY3-1…LAY3-7;
    - R3-41, E2, E3;
    - residui di L2.
  - E9 rinviato a L11.
- **Aperto:** **LAY3-8** (bassa). A Shido, 1366×657, l'elenco aperto delle versioni esce di 10 px dalla finestra. È assegnato a FE.
- **Prove grezze:**
  - `lotti/L3/esiti-collaudo/<hash>/`;
  - `esiti-funzionali/d5eb9650/`;
  - `esiti-ux/d5eb9650/` e `765fb2a1/`;
  - `esiti-layout/765fb2a1/`, `48d7a958/`, `7562f6ac/`, `db7d0423/`;
  - `esiti-noreg/48d7a958/`;
  - cicli di scrittura sull'istanza: `esiti-collaudo/cicli-dati.md`.
- **Istanza di prova:** del Collaudo, FE 5473 e BE 3301, su `newreview-l3`. Dati = copia di p5s delle 09:48Z, base `L3-base-p5s-20261020-0948Z`. Dopo ogni ciclo di scrittura si ripristina e l'impronta si conferma identica.
- **Prossimi passi:**
  1. FE corregge LAY3-8;
  2. il Collaudo fa il cherry-pick su `newreview-l3`, con typecheck, lint, test mirati e istanza;
  3. Test layout e Test UX riverificano;
  4. riga della ROADMAP di L3;
  5. galaxy-task-validator, con un prompt che indichi linea, prove e richieste dell'utente;
  6. con l'APPROVATO: push di `newreview-l3` su `newreview`, pipeline fino all'esito, verifica di p5s nel browser, notifica all'utente.
- Mentre lavora il validatore, che è un agente e non una sessione, riparte il FE di L4.

## Decisioni dell'utente di oggi da rispettare (oltre a quelle in memoria)
- **Intestazione:** al massimo il **30% dell'altezza della schermata** a ogni dispositivo (`memoria-del-progetto/feedback-intestazione-30.md`).
- **Guida nel visore** (integrazione):
  - solo consultazione: caselle fatto/riapri, dettagli, riferimenti ai pin;
  - la scheda del Palazzo non si tocca, salvo il campo «Planimetria» nella modifica della voce;
  - le voci senza pin stanno solo sulla planimetria dove sono state inserite (per regola, la planimetria 1 dell'infiltrazione) e si spostano a mano.
- **E2:** l'indice conta i pin di contenuto, «più N passaggi e N note». Le porte vanno fra i passaggi.

## Decisioni del PM di oggi
- **NR3-4:** strada (a). Arrivando dalla casa di un'Area si apre la predefinita.
- **LAY3-4 e LAY3-7:** il testo intero si legge con un tocco, nei «Dettagli dalla guida» o nell'elenco aperto. R3-41 ha la precedenza sul mandare a capo i selettori da 1024 in su.
- **UX3-10:** il numero dei pin compare una volta sola, nel riquadro «N pin».
- **UX3-11:** opacità piena.
- **Un Enigma con passi** non si aggancia a mano a una planimetria: sta dove stanno i passi.

## Regole di lavoro in vigore
- La fonte dei dati è p5s, che non si sovrascrive mai. La produzione è in sola lettura. La base delle prove è una copia di p5s, in sola lettura.
- Chi implementa non si convalida da solo: validano i tester e il galaxy-task-validator a fine lotto.
- Modifiche dirette, mai script o sed sui sorgenti. Test mirati, con il rosso visto prima e il verde dopo; typecheck e lint verdi.
- **Una sessione del team alla volta.** Si riapre solo quando serve e si richiude a fine compito. Il PM guida, aggiorna la Regia e porta all'utente solo i blocchi e le decisioni che spettano a lui.
- Niente backup del volume di p5s prima dei rilasci (decisione dell'utente).
- Tutto il lavoro va salvato su git (questa cartella) e copiato su GitHub nei rami `newreview-lavoro` e `newreview-l3`. Mai DB, indirizzi del server o dati personali: il repository è pubblico.

## Come riprendere (per qualunque IA o persona, partendo dal repository pubblico)
1. **Leggere, in quest'ordine:**
   - `CLAUDE.md`;
   - questo file;
   - `PROMPT-RIPRESA.md`;
   - `docs/ROADMAP.md`, `docs/DECISIONI.md`, `docs/ARCHITETTURA.md`;
   - in `docs/coordinamento/`: `processo.md`, `bacheca.md`, `decisioni-pm.md`, `stato.json`;
   - `memoria-del-progetto/`, tutto: sono regole dell'utente;
   - `lotti/L3/` (difetti, integrazione, esiti) e `lotti/L4/` (fe.md, modifiche.md, difetti.md).
2. **Prendere i rami** `newreview-lavoro` e `newreview-l3` da GitHub. Controllare con `git log` che coincidano con quanto scritto qui.
3. **Avvio in locale:** `npm install`, `cp .env.example .env`, `bash scripts/start-all.sh`. Verifiche: `npm run typecheck`, `npm run lint`, test mirati `npx vitest run <percorso>`. La pipeline controlla typecheck, lint e audit, non i test.
4. **Ciclo di un lotto** (vedi `processo.md`):
   1. requisiti, dati, app e modifiche;
   2. BE e FE;
   3. prove sul codice esatto: funzionali, UX, layout ai formati 1366×657 · 1280×689 · 1024×690 · 1920×1080 · 768 · 375, no-reg sui dati;
   4. riga della ROADMAP;
   5. validatore fino all'APPROVATO;
   6. push, pipeline, verifica di p5s.
5. **Dati per le prove:** una copia fresca di p5s, che fornisce l'utente o la sessione del Collaudo, oppure una copia locale. Le copie dei database non sono nel repository.
6. **Prossimo passo concreto:** quello indicato in «L3 — stato di dettaglio», poi L4, `lotti/L4/fe.md` «Da fare». Poi l'integrazione B2, `lotti/L3/integrazione-guida-visore.md`. Poi L5.
7. **Accesso a p5s e al server:** solo l'utente ha indirizzi e chiavi, omessi qui. La verifica di p5s si fa dall'indirizzo pubblico.

## Elenco «da rivedere» per l'utente
Vedi `rapporto-finale.md`.
