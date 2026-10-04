# Registro delle decisioni — project-p5r

Formato: data · decisione · motivazione · chi (U = utente, IA = assistente su proposta validata dall'utente).

| Data | Decisione | Motivazione | Chi |
|---|---|---|---|
| 2026-09-04 | Requisiti dei Confidenti solo dalla guida Royal di allgamestaff: un semaforo è ciò che il gioco impone; non lo sono la data consigliata, la Persona dello stesso arcano (bonus punti), regali/risposte, le descrizioni di eventi automatici di trama, le scelte di dialogo e l'attesa di un messaggio; Gemelle Custodi con semaforo automatico sulla scorta (`persona-abilita`); Igor rango 1 = 11 aprile (guida giorno per giorno del progetto) anche se la pagina Royal scrive 12 | l'utente ha trovato vincoli errati o presi dalla versione non Royal (Haru, Gemelle) | U |
| 2026-09-04 | Date di rango 1 dei Confidenti: valgono solo se la pagina Royal le dichiara come sblocco («si sblocca il», «a partire dal», «si avvia automaticamente», evento di trama) o se la guida giorno per giorno del progetto fa scattare l'evento quel giorno (Igor, 11 aprile); un «giorno consigliato» o un'intestazione nuda non è un requisito (Yusuke, Makoto, Chihaya, Takemi, Sojiro, Ohya senza data). Chi «non è mai disponibile in caso di pioggia» (Haru, Chihaya, Yoshida) ha il vincolo meteo su ogni rango: una sola regola per tutti; Futaba, la cui pagina scrive la frase contraddittoria «non è mai disponibile anche in caso di pioggia», resta senza vincolo meteo (scelta tracciata in semafori-confidenti.md) | rigetto del validatore: quattro date prese da «giorno consigliato» bloccavano Confidenti disponibili; meteo applicato solo a Yoshida | U/IA |
| 2026-09-04 | Home desktop: niente accessi rapidi con una partita attiva (doppione della barra laterale e di quella in basso); guida del giorno stretta e mappa a tutta altezza; stella grande ma limitata dalla colonna. Spilli: l'immagine consegnata è lo spillo intero, la goccia è solo riserva. Personaggi senza Confidente con lo stesso riquadro degli altri (ambito `personaggio`), Lavenza in Stanza di Velluto (dato dal progetto, `verificato: false`), Persona ingrandibili | richieste dell'utente del 2026-09-04 | U |
| 2026-09-04 | Le «Dote +N» della guida giorno per giorno sono NOTE, non punti: alla spunta diventano 2/3/5 punti (prima venivano sommate come N punti: 132 azioni segnano «+1», un guadagno da un punto non esiste nel gioco). Modificatore «Anima da cineasta» (nome del libro nel seed, non «L'arte del cinema»): +1 scalino su film e DVD, automatico alla spunta se il libro risulta letto, manuale nel pannello Doti; ×1,5 di Chihaya applicato dopo. I DVD danno sempre due note (3 punti, 5 col libro: la pagina dei DVD della stessa fonte dice «♪♪» e «un punto aggiuntivo» col libro), quindi il «+3» con cui la guida li segna non viene usato; le tre visite al cinema della guida («Il cameriere oscuro» = The Cake Knight Rises, «L'amore chissà» due volte) sono collegate al film nel seed, con i testi invariati | richiesta dell'utente («sistema il modificatore l'arte del cinema») e coerenza con le soglie cumulative | U/IA |
| 2026-09-04 | Soglie delle Doti sociali = totali cumulativi del contatore nascosto (34/82/126/192 ecc.), note→punti 2/3/5 (7 libri speciali), ×1,5 per difetto: confermate da tre prove (esperimento citato dalla wiki, somma dei guadagni pianificati dalla guida, pagina italiana allgamestaff); il libro «L'arte del cinema» (+1 scalino su film e DVD) non è modellato | contestazione dell'utente: nessuna pagina scrive «totali», servivano prove numeriche | U/IA |
| 2026-09-04 | Tre formati come requisito verificato sul continuo delle larghezze (360–1440 px): nessuno sbordo orizzontale, file di schede/filtri scorrevoli sotto i 768 px invece di quattro righe di pulsanti, Home con tre disposizioni distinte; le modifiche desktop non toccano mobile e tablet (prefissi `lg:`) | l'utente ha verificato mobile e tablet trovando Home, Fusione e Skill inusabili | U |
| 2026-09-04 | Suggerimenti del giorno: si accende d'oro tutto ciò che serve a eseguire un'azione ancora da fare del giorno corrente, incluse le entità indirette (negozio e articolo di un libro, luogo/quartiere/spillo di un Confidente); le azioni bloccate dai requisiti non sono suggerimenti | richiesta dell'utente («evidenziare le interazioni utili a seguire i suggerimenti del giorno») | U |
| 2026-09-04 | 12.3: alla spunta di un incontro con un Confidente l'app chiede quante note (1–3, 2 preselezionato) invece di assumerle; i requisiti non verificabili restano grigi con conferma manuale per partita; i punti applicati dalla guida si annullano togliendo la spunta | scelte consigliate all'utente, applicate con l'obiettivo «completa la ROADMAP» | IA (assunzione dichiarata) |
| 2026-09-04 | 12.9: le descrizioni delle Persona sono testi originali in italiano sull'origine mitologica/folcloristica/letteraria della figura (redatti per l'app con verifica delle fonti), non il testo del compendio di gioco, che non può essere ridistribuito; niente spoiler della trama | richiesta dell'utente («descrizione localizzata in italiano di riferimento») | IA (assunzione dichiarata) |
| 2026-09-04 | 12.2: le statistiche delle Persona possedute sono stima del livello + bonus per statistica (non più valori assoluti fermi); il compendio personale conserva un'istantanea presa all'ingresso in scorta o con «Registra» esplicito e non segue i cambiamenti (fedele al gioco); l'evocazione dal Registro ripristina l'istantanea | richiesta dell'utente dal test | U/IA |
| 2026-09-04 | Fase 12: il catalogo dei riferimenti dal wiki è rimosso (l'app ha la propria grafica); resta il caricamento singolo di immagini con «Rimuovi tutte» per tornare agli asset; la stella delle statistiche usa la scala unica 0–99 di default; i filtri del compendio stanno nell'URL per conservarli al ritorno dalla scheda | richieste dell'utente in fase di test | U/IA |
| 2026-09-04 | Leggibilità prima dello stile: i font P5 caricati dall'utente si applicano solo a titoli e parole grandi (display ≥ 17 px, tasselli rossi, titoli degli stati vuoti); pulsanti, chip, barra in basso e corpo restano nel sans | la prima applicazione «a tappeto» aveva reso molte parti difficili da leggere (verifica dell'utente) | U/IA |
| 2026-09-04 | Fase 11 «Impatto visivo» (decisioni dell'utente): prima la grafica poi il testo; pulsanti e chip a taglio diagonale in CSS e non con gli sprite consegnati (nitidi a ogni dimensione, focus visibile); elenco Persona a piastrelle con vista compatta alternativa; sfondi a tema in tutte le sezioni; font P5 (P5 Hatty, Menu Font Prototype, Exposé) caricati dall'utente nella propria istanza e MAI nel repository pubblico (licenze «uso personale»/non ridistribuibili; Monolisk è commerciale ed Earwig Factory non consente l'incorporamento web), con predefiniti open source nel repo (Anton, Bebas Neue, Inter in OFL; Special Elite in Apache 2.0); stati vuoti con l'illustrazione neutra finché Codex non consegna le quattro dedicate | coerenza con lo stile del gioco senza violare licenze né spezzare l'app quando un asset manca | U/IA |
| 2026-09-04 | Localizzazione 10.4: le rese italiane di skill, Persona ed equipaggiamento vengono solo dalla guida allgamestaff (nessuna traduzione inventata: chi manca resta col nome canonico); le voci già presenti non vengono mai sovrascritte dal seed arricchito; l'equipaggiamento è abbinato per statistiche/effetto/esecuzione e i 3 abbinamenti «probabili» sono accettati solo con nome ed effetto concordanti; i nomi inglesi dei consumabili della guida sono dedotti (prezzo/effetto) e servono solo alla ricerca: scartati quelli a bassa confidenza non identici | i nomi devono essere quelli che l'utente legge nel gioco in italiano; l'inglese resta come chiave canonica e aiuto alla ricerca | U/IA |
| 2026-09-03 | Nuovo repo separato `C:\Repository\project-p5r`, stesso stack/convenzioni di project-jira | isolamento totale, nessun rischio di regressione, riuso di pattern collaudati | U |
| 2026-09-03 | Versione del gioco: **Persona 5 Royal** (non vanilla) | dataset `*Royal` (Faith, Councillor, tratti, allarme, Kichijoji…) | U |
| 2026-09-03 | Tutto in italiano (UI, API, schema, commenti); nomi Persona originali; skill con chiave canonica EN + resa IT in tabella `traduzione` editabile | localizzazione italiana ufficiale non disponibile come dataset; serve restare agganciati alle fonti aggiornabili | U/IA |
| 2026-09-03 | Dataset: import dal repo Apache-2.0 chinhodado/persona5_calculator **+ verifica incrociata** con aqiu384/megaten-fusion-tool, attribuzione in `NOTICE` | dati completi subito, massima affidabilità | U |
| 2026-09-03 | Fase 0 ampia: scaffold + compendio consultabile + tracking partita | app subito utile in gioco | U |
| 2026-09-03 | "Catene di fusione cicliche" = TUTTI i bonus attuabili: propagazione skill a catena, bonus EXP arcana del Confidente, Allarme delle fusioni, Potenziamento/Forca, Addestramento, altri | richiesta esplicita dell'utente | U |
| 2026-09-03 | Uso da tablet durante la partita → layout tablet-first, **anche mobile** (375px) e desktop; bersagli touch ≥ 44px | l'app sostituisce la guida cartacea/online mentre si gioca | U |
| 2026-09-03 | Obiettivo di prodotto: trasformare la guida allgamestaff.it in app (Doti sociali con pulsanti, Confidenti con rango e risposte migliori, domande in classe, calendario…) | richiesta esplicita; mappa in `docs/riferimenti/mappa-moduli-guida.md` | U |
| 2026-09-03 | Partite multiple: ogni dato utente ha `partita_id`, una partita attiva selezionabile | l'utente vuole passare fra set di gioco diversi | U |
| 2026-09-03 | Porte dev 5273 (FE) / 3101 (BE); in Docker NESSUNA porta pubblicata: FE sulla rete esterna del tunnel (`PROXY_NETWORK`, default `proxy`), BE solo su rete interna proxato da nginx su `/api/` | il tunnel Cloudflare (gestito dall'utente) raggiunge il FE per nome sulla rete del proxy; nessuna esposizione pubblica | U |
| 2026-09-03 | Repository GitHub pubblico `merlinoalbus/project-p5r`, push autorizzato all'assistente | immagini GHCR pubbliche senza credenziali per Portainer/watchtower | U |
| 2026-09-03 | Deploy: docker-compose per Portainer che punta al repo GitHub; immagini su GHCR da GitHub Actions (gate CI → build); watchtower ESTERNO globale (solo label) | infrastruttura già in uso dall'utente | U |
| 2026-09-03 | DB SQLite creato dal backend sul volume `/data` al primo avvio; dataset seed dentro l'immagine backend, caricamento idempotente | nessun passo manuale al deploy; dati utente sopravvivono agli update | U/IA |
| 2026-09-03 | Documentazione di bordo obbligatoria (`CLAUDE.md`, `docs/ARCHITETTURA.md`, `docs/ROADMAP.md`, `docs/DECISIONI.md`) aggiornata a ogni step | qualsiasi IA/persona deve capire progetto, architettura e stato dal solo repo | U |
| 2026-09-03 | Prompt per la generazione degli asset grafici in stile P5R con link di riferimento (`docs/grafica/`) | coerenza visiva con il gioco | U |
| 2026-09-03 | Procedura: ogni step validato dal galaxy-task-validator (agent verifica-only, emulato con agent general-purpose) | CLAUDE.md globale dell'utente | U |
| 2026-09-03 | Elementi visivi: nessuna immagine protetta (Atlus) nel repo; caricamento dall'app + import da URL + asset originali generati da IA grafica, **con ogni testo in italiano**; serve un prompt per OGNI asset (`docs/grafica/prompt-immagini.md`) | vincolo di lingua e di licenza | U/IA |
| 2026-09-03 | Sezione Confidenti: immagine dell'arcano e del personaggio, rango raggiunto, prossime risposte ottimali per massimizzare i punti | richiesta esplicita | U |
| 2026-09-03 | Nomi canonici delle skill = localizzazione inglese di **Royal** (es. `Drain Fire`, non `Absorb Fire`); correzioni al dataset primario tracciate in `scripts/seed/correzioniRoyal.json` con fonte | la fonte primaria conserva nomi della versione base; l'app è per Royal | U/IA |
| 2026-09-03 | Step 0.6 (prompt grafici) anticipato prima di 0.3–0.5 per far partire la produzione degli asset | richiesta dell'utente | U |
| 2026-09-03 | Reseed: `persona`/`skill`/`oggetto`/`confidente` in UPSERT per chiave naturale con id stabili, righe sparite dal seed MAI cancellate; relazioni di gioco svuotate e ricaricate; hash = versione + contenuto dei 6 JSON (metadati esclusi) | i dati utente referenziano gli id; un aggiornamento del dataset non deve mai perdere lo stato della partita | IA |
| 2026-09-03 | `traduzione.fonte='utente'` non viene mai sovrascritta dal seed | l'utente corregge le rese italiane dall'app e le correzioni devono sopravvivere | U/IA |
| 2026-09-03 | Una Persona per partita in `persona_posseduta` (UNIQUE partita+persona) | nel gioco la scorta non ammette duplicati | IA |
| 2026-09-03 | Lo health check espone `userVersion` dello schema (oggi 4) | diagnostica rapida in produzione | IA |
| 2026-09-03 | Persona posseduta: dotazione iniziale = ultime 8 skill apprese fino al livello indicato; l'aggiunta alla scorta registra la Persona nel compendio personale col livello più alto raggiunto; una Persona per partita | riflette il comportamento del gioco, meno inserimento manuale da tablet | IA |
| 2026-09-03 | Doti sociali: `punti` (valore assoluto) prevale su `delta` (incremento), mai sotto zero; Confidenti: rango > 0 forza lo sblocco | pulsanti +/− veloci in gioco, stato sempre coerente | U/IA |
| 2026-09-03 | Doti sociali a **note**: 1♪=2, 2♪=3, 3♪=5 punti (7 con libro a resa maggiorata), fortuna di Chihaya ×1,5 per difetto; conversione lato server (`note`,`libro`,`fortuna`); soglie e nomi italiani dei 5 ranghi nel seed (`dote_sociale_rango`); l'API restituisce rango, nome, soglia successiva e punti mancanti | l'utente in gioco vede le note, non i punti; deve sapere quanto manca al rango successivo | U |
| 2026-09-03 | Confidenti: stesso meccanismo con `punti` verso il rango successivo e soglie per Confidente da guida Steam + aqiu384 (121/122 concordi; Akechi 6→7 = 55 da verificare); 0 = passaggio non a punti; Igor/Morgana/Sae/Mishima/Gemelle senza soglie; al cambio di rango i punti ripartono da 0 (nessun riporto, come nel gioco) | richiesta esplicita; fonti in `docs/riferimenti/confidenti-punti.md` | U/IA |
| 2026-09-03 | Confidenti a **note** come nel gioco: ♪=5, ♪♪=10, ♪♪♪=15 punti base, regalo 50, uscita 10; moltiplicatori cumulativi Persona dello stesso arcano ×1,5 (rilevata dalla scorta della partita, forzabile), esami ×1,5/×1,2, invito SMS ×1,2; decimali conservati (`punti` REAL) | l'utente in gioco vede le note; il bonus arcano è la ragione della "nota in più" | U/IA |
| 2026-09-03 | Motore di fusione fedele alle regole di chinhodado (fonte del dataset), compresi i dettagli non ovvi: due Demoni del Tesoro fra loro seguono la fusione normale, il modificatore del Tesoro salta speciali e rari, le DLC non possedute escono dagli elenchi (e spostano gli indici); il contesto DLC viene dalla partita attiva; il costo è la somma sugli ingredienti di 27L²+126L+2147 | stessa semantica del calcolatore di riferimento, verificabile; test di coerenza diretta↔inversa su tutto il compendio | IA |
| 2026-09-04 | Piante (Fase 7.4): le mappe arrivano dalle guide giapponesi (omoteura, game8) perché le fonti occidentali coprono solo Kamoshida; nel repo restano solo i collegamenti e il download avviene nell'istanza dell'utente al primo uso; i piani dei Mementos non hanno pianta perché generati casualmente | vincolo sulle immagini ufficiali e copertura massima | IA |
| 2026-09-04 | Sfide (Fase 9.2): il quiz TV entra nelle Domande esistenti (stesso flusso «fatta») invece di una pagina a parte; i tratti riportano il nome inglese ricavato dalle traduzioni del compendio (dataset aqiu384/chinhodado già nel repo: 88 abbinati per nome italiano, «Ave Maria» e «Naranari» identici) | riuso e nessuna corrispondenza inventata | IA |
| 2026-09-04 | Fedeltà dei nomi contro spoiler (Fase 10.2, decisione dell'utente in appello): i nomi degli oggetti, dei luoghi e dei personaggi restano quelli della guida italiana anche quando rivelano elementi del terzo semestre (es. «Cioccolato di Sumire», «Palazzo di Maruki», «Lavenza»); un nome alterato non si ritroverebbe nel gioco e l'app perderebbe utilità. Solo le presentazioni dei personaggi (10.3) sono scritte senza spoiler; un eventuale filtro anti-spoiler sarà un'impostazione trasversale, mai una modifica dei dati | utilità e verificabilità in gioco | Utente |
| 2026-09-04 | Completamento (Fase 9.1): solo i trofei hanno una tabella (servono stato per partita e chiavi stabili); finali, Covo, DLC, meteo, NG+ e tempo restano JSON di consultazione in `dati_guida`; il campo «mancabile» resta nullo quando la guida non lo dichiara | niente dati inventati, modello minimo | IA |
| 2026-09-04 | Guida giorno per giorno (Fase 7.5b): le azioni sono tenute in JSON dentro il giorno (non una tabella per azione) e identificate da data + indice, perché il seed è la sola fonte e l'ordine è stabile; i riferimenti testuali della soluzione sono risolti alle chiavi dell'app in fase di build, con il testo originale conservato quando non risolvibile | semplicità e collegamenti navigabili | IA |
| 2026-09-04 | Inventario (Fase 8.2): gli articoli dei negozi sono un catalogo separato dal compendio `oggetti` (equipaggiamento con statistiche di gioco) perché descrivono l'offerta commerciale (prezzo, dove, quando); i luoghi della città rimandano al negozio tramite la chiave `negozio` | evitare duplicazioni e tenere le fonti distinte | IA |
| 2026-09-04 | Città e attività (Fase 8.1): i dati non confermati sulla guida italiana entrano nel seed con `verificato: false` e sono segnalati nella UI («da fonte secondaria») invece di essere omessi; i quartieri senza luoghi restano fuori | completezza con trasparenza sulle fonti | IA |
| 2026-09-04 | Aiuto in battaglia (Fase 7.3): dati testuali in JSON (`dati_guida`) invece di tabelle dedicate, perché sono contenuti di consultazione senza stato per partita; l'indice delle Ombre è precalcolato nel seed e collegato alle Persona a runtime | semplicità e reseed idempotente | IA |
| 2026-09-04 | Mementos (Fase 7.2): i Dedali riusano il modello dei dungeon (aree, punti, mappe) invece di un modulo separato; le Richieste restano entità proprie con stato per partita; livelli delle Ombre assenti perché la guida non li riporta | un solo sistema di mappe e tracking | IA |
| 2026-09-04 | Mappe interattive (Fase 7.1): niente immagini ufficiali nel repo; la pianta di ogni area la importa l'utente (file o URL) e gli spilli si fissano a mano in percentuale (validi a ogni zoom e schermo); i punti di interesse esistono anche senza mappa; stato «ottenuto/esaurito» per partita con vista completa a richiesta (richiesta utente) | rispetto dei diritti, funzionamento senza grafica | U/IA |
| 2026-09-04 | Calendario (Fase 6.3): giorno della settimana ancorato al 9 aprile = sabato (wikiwiki.jp, calendario 2016); meteo e sblocchi senza fonte restano vuoti; le date di sblocco di Allarme e Forca non confermate dalla guida non vengono inserite come eventi | nessuna data inventata | IA |
| 2026-09-04 | Domande in classe (Fase 6.2): testo delle domande parafrasato dalla guida (limite di estrazione), risposte riportate fedelmente; la spunta «fatta» aggiunge la nota di Conoscenza solo quando la ricompensa documentata la prevede e solo alla prima spunta | tracciabilità senza doppi conteggi | IA |
| 2026-09-04 | Confidenti completi (Fase 6.1): i dati vengono dalla guida italiana allgamestaff (terminologia ufficiale) raccolti da agenti di ricerca con fonti per Confidente; i punti per scelta sono presenti solo dove la guida li assegna davvero (verifica pagina per pagina: 17 dialoghi con punti espliciti, 9 con la sola sequenza e l'esito «RANGO +1» riportato nelle note, 4 misti), conservati sia normalizzati (note 1–3) sia nel testo originale; nessun regalo «sconsigliato» inventato dove la guida tace | fedeltà alla fonte scelta dall'utente, trasparenza sulle lacune | IA |
| 2026-09-03 | Cicli di fusione (Fase 5.5): il ciclo è una sequenza ripetibile identica (richiesta utente); l'app lo cerca, lo quantifica con le regole verificate di Royal (bonus di livello per anello, Allarme, Persona cariche) senza attribuire trasferimenti di statistiche inesistenti, e lo esegue anello per anello tracciando i giri | rispetto della richiesta senza inventare meccaniche | U/IA |
| 2026-09-03 | Esecuzione dalla scorta (Fase 5.4): i valori non deterministici (livello raggiunto con la Forca, ripartizione dei punti casuali dell'Allarme/incidente) li inserisce l'utente osservandoli in gioco; l'app propone i valori attesi dalle regole documentate senza inventarli. Verificato con fonti JP/EN che in Royal la fusione NON trasferisce livelli/statistiche dei materiali (solo livello base della specie; il Tesoro usa il livello attuale): l'accumulo passa da Forca, incidenti e Persona «cariche» (+20/+25 alla fusione) | fedeltà al gioco, nessun numero inventato | IA |
| 2026-09-03 | Piani salvati (Fase 5.3): si salva l'istantanea calcolata (non si ricalcola in automatico: il motore può cambiare esito al variare di scorta/Registro/DLC) e l'avanzamento si deriva sempre dalla scorta attuale; «Ricalcola» riporta alla vista dei piani con le stesse skill | il piano scelto dall'utente resta stabile; nessun dato derivato persistito | IA |
| 2026-09-03 | Obiettivi (Fase 5.2): un solo obiettivo aperto per Persona e partita (indice univoco parziale); i tratti non sono skill desiderate (non si ereditano); chiusura automatica solo quando la copia posseduta soddisfa TUTTE le condizioni, altrimenti l'avanzamento mostra cosa manca; «Segna raggiunto» manuale resta possibile | evita duplicati e ambiguità; coerente col motore di eredità | IA |
| 2026-09-03 | Storico della partita (Fase 5.1): eventi registrati dal backend dentro la stessa transazione della modifica, con titolo e dettaglio già in italiano (nessuna ricostruzione lato client) e dati grezzi in JSON; evento solo quando il valore cambia davvero (rango, livello, Allarme); voce eliminabile dall'utente senza annullare la modifica | tracciabilità affidabile, testo stabile anche se cambiano le traduzioni | IA |
| 2026-09-03 | Bonus della Stanza di Velluto (Fase 4.2): si modellano solo regole con fonte (affidabilità dichiarata in `docs/riferimenti/bonus-velluto.md`): sconto del Registro per completamento (alta), EXP del Confidente tabella generica (media, mostrata come moltiplicatore), Forca con ranghi 1/5/10 documentati e intermedi interpolati (segnalati), Allarme come interruttore manuale della partita (l'attivazione in gioco è probabilistica), Isolamento (incensi alta, giorni per rango media, tier per livello alta). Il prezzo di evocazione 27L²+126L+2147 resta una stima dichiarata (chinhodado) | trasparenza sulle incertezze, nessun numero inventato | IA |
| 2026-09-03 | Propagazione delle skill nei piani (Fase 4.1): la skill richiesta viene assegnata a un solo ingrediente per fusione (preferendo chi la possiede già), gli slot sono quelli a scelta (slot−1) salvo opzione «Conta lo slot casuale»; una Persona che apprende la skill salendo di livello soddisfa la richiesta ma è segnalata (↑); i tratti non si propagano come skill (400) | rispetta la regola della skill casuale senza nascondere l'alternativa ottimistica; l'apprendimento per livello è un costo di tempo esplicitato | IA |
| 2026-09-03 | Eredità (Fase 3): regole dal wiki P5/P5R (tabella slot 3–5→1 … 42→8, una skill casuale → slot a scelta = slot−1; matrice tipo×elemento del dataset; supporto/passive/quasi-divine sempre; skill esclusive mai; un tratto a scelta fra ingredienti e proprio); il bacino di un ingrediente è quello della scorta se posseduto, altrimenti innate + apprese al livello base; l'effetto dell'Allarme sugli slot delle fusioni normali non è documentato con certezza e non è modellato | fedeltà alle fonti disponibili, trasparenza sui limiti | IA |
| 2026-09-03 | Piani di fusione (Fase 2): il costo è la somma dei prezzi di evocazione dal Registro (la fusione in sé è gratuita nel gioco); le Persona in scorta valgono 0 ma un esemplare si usa una sola volta; le catture sono ammesse come foglie a 0 yen ma conteggiate a parte; ricerca con stima ottimistica e potatura, ampiezza 12 ricette per nodo, profondità ≤ 4 | riflette i costi reali del gioco e resta calcolabile in pochi secondi anche per bersagli di alto livello | IA |
| 2026-09-03 | Il filtro «fino al livello del protagonista» esclude ricette con ingredienti o risultato oltre il livello della partita (nel gioco non si fonde sopra il proprio livello); attivabile dall'utente, non imposto | utile in gioco, ma l'utente può voler pianificare | IA |
| 2026-09-03 | Localizzazione italiana ufficiale dalla guida allgamestaff (371 nomi skill, 58 nomi Persona, 56 termini) in `scripts/seed/localizzazione-it.json`, validata contro il dataset dal normalizzatore; nell'app il nome italiano è primario e il canonico inglese resta visibile in piccolo (per guide e calcolatori esterni); voci a bassa affidabilità incluse e documentate | richiesta dell'utente: adeguare i termini alla localizzazione italiana del gioco | U/IA |
| 2026-09-03 | Statistiche che crescono col livello: +3 punti/livello (dedotto dal dataset Royal, somma ≈ 10 + 3·L) ripartiti in proporzione alla base; stima mostrata con differenza e didascalia, l'utente registra i valori reali nella scorta | in gioco la ripartizione è casuale/manipolabile (guida pixelflood): la stima è dichiarata tale | U/IA |
| 2026-09-03 | Immagini: mai ritagliate (object-contain), riquadri grandi, tocco = finestra di ingrandimento con i comandi di caricamento; nessun pulsante Carica/Da URL nelle card | leggibilità su tablet e card pulite (feedback dell'utente) | U |
| 2026-09-03 | Immagini ufficiali (Arcani, Confidenti, Persona): MAI nel repo né nelle immagini Docker (© ATLUS/SEGA, repo pubblico); l'app include solo un catalogo di LINK al Megami Tensei Wiki (`data/riferimenti/immagini.json`) e l'utente le importa nella propria istanza dalle Impostazioni (lotti di 10, immagini proprie mai sovrascritte salvo richiesta); il download remoto usa uno User-Agent identificabile | richiesta dell'utente di "salvare" le immagini trovate online, conciliata con la licenza | U/IA |
| 2026-09-03 | Grafica predefinita: gli asset generati si copiano in `public/asset/` e basta (manifest automatico dal plugin Vite, chiave = percorso in slug); preferenza per dispositivo "usa grafica predefinita" attiva di default; precedenza alle immagini dell'utente; fallback testuale/SVG in ogni punto e asset non caricabili segnati mancanti | richiesta dell'utente: usare di default gli asset già generati, ma app perfettamente attiva senza grafica | U/IA |
| 2026-09-03 | nginx: `/asset/` servito con `Cache-Control: public, no-cache` (rivalidazione ETag) perché i nomi non sono hashati | una sostituzione di asset deve essere visibile subito | IA |
| 2026-09-03 | Le immagini servite con `Cache-Control: private, no-cache` (rivalidazione ETag) e versione per (ambito/chiave) a livello di modulo nel FE | una sostituzione deve essere visibile subito su ogni pagina | IA |
| 2026-09-03 | Eliminando la partita attiva viene promossa la più recente | non restare mai senza partita attiva | IA |
| 2026-09-03 | Immagini: PNG/JPEG/WEBP/GIF/SVG fino a 8 MB, una per entità (la nuova sostituisce), file in `DATA_DIR/immagini/` (fuori dal git); importazione da URL indicato dall'utente | caricamento da tablet e da link della guida | U/IA |
| 2026-09-03 | Errori 4xx di Express/body-parser mappati nell'envelope canonico in italiano (413 corpo troppo grande, 400 JSON/percorso non validi) | mai un 500 in inglese per un caso d'uso ordinario (foto da telefono) | IA |
| 2026-09-03 | Frontend: elenchi Persona/skill caricati una volta e filtrati lato client; stato di caricamento derivato in `useCarica` (nessun setState negli effetti, regola del compilatore React) | reattività istantanea da tablet; lint pulito | IA |
| 2026-09-03 | Pagina Fusione della Fase 0 = consultazione delle regole (due arcani, matrice, ricette speciali, Demoni del Tesoro); il calcolatore con Persona e livelli è la Fase 1 | contenuto reale e utile subito, nessun segnaposto | IA |
| 2026-09-03 | Aggiunta alla scorta: le skill vengono precompilate con le ultime 8 apprese al livello scelto; modifica libera nella scheda | meno inserimento manuale in gioco | IA |
| 2026-09-04 | Pacchetto delle mappe esportato dall'editor sempre COMPLETO (immagini di base e schermate degli spilli, puntate come asset), anche per le immagini scaricate dalle guide (provenienza annotata nel LEGGIMI): l'utente lo consegna e viene caricato come dato preimpostato dell'app (`data/seed/mappe/*.json` + `public/asset/`); supera l'esclusione precedente delle immagini di terzi | le mappe definitive le costruisce l'utente giocando; il flusso «esporto → consegno → dato preimpostato» deve essere completo | U |
| 2026-09-05 | Disponibilità degli articoli e dei negozi «ad un dato momento» = tutto il pacchetto delle condizioni della guida (date, Confidenti, Doti, Palazzi, richieste dei Mementos, meteo, giorni, stagioni, quartieri), valutato con lo stesso valutatore dei semafori dei Confidenti (`disponibilitaService` → `semaforiService.valuta`); una condizione non leggibile resta «ignoto» e l'articolo resta visibile con il chip «Da verificare», mai nascosto | una sola regola in tutta l'app; non nascondere per un dubbio dell'app | Utente + IA |
| 2026-09-05 | Fonte delle condizioni di sblocco degli articoli: le pagine italiane Royal di allgamestaff (quelle che riportano Cuoio conciato «dal 1 settembre»); le date della guida sono in formato mese/giorno («9/1» = primo settembre, «1/13» = 13 gennaio, confermato dalle ancore dei link); le fonti non italiane valgono solo dove la guida italiana tace e restano marcate. «A partire dall'arco del Palazzo di X» si tiene alla lettera e vale «Palazzo precedente completato» (l'inventario di Untouchable si espande all'inizio dell'infiltrazione, non alla fine) | richiesta dell'utente; la lettura giorno/mese aveva prodotto date sbagliate (9 gennaio per il primo settembre) | Utente |
| 2026-09-05 | Campo `sblocco` dei negozi = solo la condizione (o vuoto se la guida non ne pone: negozi del Centro commerciale sotterraneo, Yongen-Jaya, Leblanc, negozio scolastico, distributori); descrizioni, orari e curiosità stanno in `note`; le note di posizione o di prezzo tolte dalla `condizione` degli articoli passano nella `nota` dell'articolo, le note redazionali («elenco parziale», «fonte non italiana», «rifornimento» non citato dalla pagina) si eliminano | il valutatore legge il testo: frasi descrittive («il Confidente si avvia con Coraggio Rango 4») venivano lette come condizioni del negozio | IA |
| 2026-09-05 | Date decise dall'utente sui Confidenti: Rango 1 di Yusuke e di Ohya «dal 18 giugno», Rango 1 di Takemi «dal 15 aprile» (Rango 2 «Coraggio di livello 2»); la Clinica di Takemi apre con il Confidente, quindi «dal 15 aprile» (la pagina negozi-speciali non dà una data; il vecchio «16 aprile» non ha fonte). Shinjuku si sblocca il 18 giugno, Akihabara il 31 agosto, Kichijoji il 5 giugno (`citta.json`): sono le date usate per «da quando si sblocca <quartiere>» | coerenza fra Confidenti, negozi e quartieri | Utente |
| 2026-09-05 | Editor delle mappe: copia/incolla di uno spillo tramite appunti di sessione (`sessionStorage`), mai tramite gli appunti di sistema; l'incolla crea un nuovo spillo con tutti i campi tranne la posizione e riporta allo strumento «Seleziona»; gli appunti restano per altre copie anche su altre mappe | due punti che richiedono lo stesso spillo senza ricrearlo; niente permessi del browser | Utente + IA |
| 2026-09-05 | «Batting Cage» → «Gabbie di Battuta» (nome del luogo in `citta.json`, dell'attività in `attivita.json` e dello spillo nel pacchetto `citta-yongen-jaya.json`): è il nome usato dalla localizzazione italiana del gioco, richiesto esplicitamente dall'utente nel lotto del 2026-09-05 («Batting Cage => Gabbie di Battuta»); la chiave `yongen-jaya/batting-cage-yongen` resta invariata | richiesta dell'utente; coerenza fra Guida, attività e mappa | Utente |
| 2026-09-05 | Momento della giornata: due fasce, «giorno» (mattina, pranzo, pomeriggio, dopo scuola) e «sera», come la guida giorno per giorno e tutti i dati dell'app (azioni del percorso, «quando» dei luoghi); non le sei fasce del gioco, che la guida non distingue e che l'utente dovrebbe aggiornare di continuo. La fascia è uno stato della partita impostato dalla scheda «Oggi», predefinito «giorno», riportato a «giorno» a ogni cambio di giorno corrente; «solo di sera» / «solo di giorno» valgono per spilli, articoli e negozi con lo stesso valutatore | richiesta dell'utente («manca la condizione sul momento della giornata»); una fascia deve essere calcolabile, quindi tracciata nella partita | Utente + IA |
| 2026-09-05 | Tipi di spillo della città = etichette che la mappa del gioco dà ai punti di interesse («Bevande», «Sigarette», «Cercalavoro»…): `distributore` si presenta come «Bevande» (stessa chiave e stesso asset, nessuna migrazione), si aggiungono sigarette, cercalavoro, lavoro part-time, bagno pubblico, lavanderia, cinema, biblioteca, chiesa o tempio, sala giochi, casa; per Palazzi e Mementos timbro (collezionabile), meccanismo, rampino, porta chiusa. Restano su tipi esistenti chioschi/bancarelle, pesca, gabbie, palestra, studio (attività o negozio), Jose (negozio), bersagli delle richieste (boss/miniboss), fiori dei Mementos (casuali, non spillabili). Le corrispondenze automatiche dalla guida non cambiano; il pacchetto Yongen-Jaya riclassifica bagno pubblico, cinema e lavanderia | richiesta dell'utente («Bevande, Sigarette, Cercalavoro, fai tu analisi di quali possono essere i punti di interesse»): chi spilla mentre gioca ritrova nella palette il nome che legge sulla mappa; un solo tipo per i distributori evita doppioni | Utente + IA |
| 2026-09-05 | Statistiche delle Persona: l'app continua a stimare la crescita (+3 punti per livello in proporzione) perché nessuna fonte con licenza compatibile dà le curve di crescita delle 232 Persona, ma l'utente registra i valori reali letti nel gioco a un livello: da lì in su la stima riparte da quelli e i bonus (Potenziamento, Addestramento, Isolamento, Forca) ripartono da zero perché i valori reali li comprendono già; sotto il livello registrato vale la base del dataset; l'istantanea del compendio porta con sé i valori reali. Nessuna importazione di curve da wiki | segnalazione dell'utente su Arsène (FR 4 MA 2 nel gioco, FR 3 MA 3 nell'app); il gioco ripartisce i 3 punti con pesi propri di ogni Persona, non deducibili dalle statistiche base; i valori reali sono l'unica verità disponibile e migliorano le stime successive | Utente + IA |
| 2026-09-05 | Asset del repository delle mappe create dall'utente: predefinito «mappe/<chiave>» per ogni tipo di mappa (è il percorso che l'esportazione del luogo dà all'immagine di base e che il seed usa per i quartieri); il campo resta modificabile e svuotabile; le aree della guida create da `sincronizzaMappe` restano senza asset perché la loro immagine arriva dalla guida | richiesta dell'utente; un unico percorso per creazione ed esportazione evita di doverlo scrivere a mano prima di consegnare il pacchetto | Utente + IA |
| 2026-09-05 | Albero e passaggi: «Nuova mappa» crea il passaggio sul genitore (preselezionato) e il ritorno a scelta; le figlie senza spillo che le raggiunge e il genitore senza ritorno sono segnalati nell'albero con «Crea passaggio»; il server piazza il nuovo passaggio nel punto libero più vicino al centro (in basso al centro per il ritorno) e l'utente lo trascina; un solo spillo per destinazione (409). I passaggi automatici del seed non cambiano | richiesta dell'utente («procedi con tutti e tre i punti») dopo la spiegazione della doppia struttura albero/passaggi: una mappa creata dall'albero non deve restare irraggiungibile dalla mappa | Utente + IA |
| 2026-09-05 | Condizioni di visibilità degli spilli delle mappe: strutturate (non testo libero) e limitate a ciò che l'app sa calcolare — data, periodo, Palazzo completato, Dote, rango di un Confidente, richiesta dei Mementos, pioggia, giorni della settimana, stagione, sblocco di un quartiere — valutate con lo stesso valutatore di articoli e Confidenti; niente condizioni «manuali»; con una partita attiva lo spillo bloccato sparisce dalla mappa (riapribile con «Mostra anche i non ancora disponibili»), senza partita le condizioni si leggono soltanto. Tutti gli spilli esistenti restano senza condizioni: nessuna migrazione dei dati, la colonna nasce vuota | richiesta dell'utente («le stesse di oggetti e confidenti, non vanno gestiti quelli non calcolabili dall'app», «tutti i punti attuali per semplificare sono senza condizioni»); selettori chiusi evitano condizioni che l'app non saprebbe valutare | Utente + IA |
| 2026-09-05 | Backup dell'istanza: l'esportazione predefinita è l'ISTANZA COMPLETA (ZIP con database, immagini caricate, caratteri, manifesto), non il solo database, perché immagini e caratteri vivono come file in DATA_DIR e un backup del solo database lascerebbe righe `immagine` senza file; resta disponibile anche il solo `.db`. Il ripristino sostituisce l'istanza ma salva sempre prima una copia di sicurezza in `data/backups/prima-del-ripristino-…` e torna indietro da solo se fallisce | richiesta dell'utente («export di tutto il DB corrente … e reimport con replace»); un backup che perde le immagini caricate non è un backup | Utente + IA |

### 2026-09-05 — Revisione editor e catalogo approvata
L’utente approva: condizioni strutturate per tutti i tipi, quartieri selezionabili, ricerca negozi senza prodotti, elenco prodotti desktop/tablet/mobile, chiavi e asset mappe derivati dal percorso dei nomi, ricerca mappe per percorso completo, editor semplificato e generazione degli asset mancanti. Testo libero solo descrittivo; requisiti ambigui da configurare esplicitamente.

### Condizioni: ambito e priorità
Tutti i tipi presenti nel costruttore si applicano a negozi, articoli e spilli. Eventi, attività, oggetti posseduti, gradi e contatori si definiscono come stati e si registrano in Impostazioni → Stati della partita; nome e descrizione non sono codice. I blocchi si configurano al livello principale e prevalgono su tutti gli sblocchi. Le alternative restano dentro i gruppi; un blocco non può essere annidato dentro un’alternativa. Date di archi narrativi non deducibili con certezza restano da configurare.

### Nomi naturali e file gerarchici
Nome visibile locale (Piano 0); ricerca con percorso (Shibuya › Castello Imperiale › Piano 0); chiave e immagine mappe/shibuya-castello-imperiale-piano-0 generate automaticamente. Nessun campo tecnico richiesto. Un vecchio percorso resta riservato alla propria mappa per non deviare collegamenti storici. Eliminare un genitore può essere rifiutato se le figlie diventerebbero radici omonime: spostarle o rinominarle prima.

### Ingresso da Città
Confermato dall’utente: mappa e punto iniziale per quartiere. La scelta è visuale nella pagina del quartiere, con ricerca del percorso completo, tocco sull’immagine e coordinate accessibili da tastiera. Si può regolare l’ingrandimento e ripristinare il comportamento predefinito.

### 2026-09-06 — Un solo mondo di mappe e luoghi
L'utente richiede che Mappe, Palazzi e Dedali, Città, negozi e inventario siano accessi allo stesso atlante. Si introduce una risoluzione comune delle associazioni esatte, preservando identità interne, alias, ingressi configurati e dati personali. I casi multipli restano scelte esplicite; l'assenza di un'associazione non autorizza a inventare un pin. La ricostruzione dai dati originali e la sostituzione verificata delle mappe restano attività aperte.

### 2026-09-07 — «Palazzi», e i Memento fuori dall'atlante
La sezione «Palazzi e Dedali» diventa **«Palazzi»** e ne elenca nove: gli otto Palazzi più il
Dedalo di Iweleth, che ci sta perché si visita per aree come loro e le sue mappe esistono. I
**Memento** ne escono: non hanno aree fisse — i piani si generano a ogni discesa — e la loro pagina
li disegna per intero. Restano raggiungibili da `/guida/dungeon/mementos` e dalle Richieste; non
compaiono né nell'elenco dei Palazzi, né come quartiere nella Città, né come radice nell'indice
delle Mappe. Il filtro è per **inclusione** (`tipo === 'palazzo'`) e non per esclusione: rilievo di
Codex, perché una lista di ciò che non si vuole invecchia da sola.

### 2026-09-07 — «Bloccato» vuol dire assente dalla mappa attiva, non cancellato
Tre piani distinti, e vanno tenuti distinti:
1. il **catalogo si consulta sempre** — un negozio, un articolo o un quartiere bloccato resta nella
   sua lista con lo stato dichiarato e il motivo. Sapere che Kichijoji apre il 5 giugno è metà del
   motivo per cui si consulta una guida;
2. la **presenza attiva sulla mappa** segue la partita: quel che è bloccato non compare come pin,
   perché la mappa risponde a «cosa posso fare adesso». Un comando esplicito lo riporta, e allora
   il pin è **marcato** (grigio, tratteggiato, e col motivo nel nome accessibile);
3. l'**azione è vietata**: acquistare un articolo bloccato risponde 409.

Non fa parte del comando la rivelazione **da indirizzo**: un `?spillo=` non deve mostrare un pin
bloccato. Un comando lo si preme sapendo che cosa si sta chiedendo; un indirizzo arriva da un
collegamento.

### 2026-09-07 — Lo sblocco dei quartieri è una regola, non solo una data
Solo sette quartieri su ventitré hanno una data di sblocco; gli altri si aprono col rango di un
Confidente, con un libro letto o durante un Palazzo, e restano chiusi lo stesso. Le venti regole
sono scritte **a mano** in `data/seed/sblocco-quartieri.json`, non ricavate dalla prosa: il lettore
automatico dei negozi non riconosce «Confidente Emperor (Yusuke) Rango 3» e spezza gli «oppure» in
requisiti che poi pretende tutti, cioè bloccherebbe quartieri aperti. Dove la guida è ambigua c'è
una `nota` che dice cosa non è stato tradotto e perché.

### 2026-09-07 — I colori degli spilli restano quelli autorati
Otto tipi hanno una tinta molto chiara — `forziere-raro`, `terme`, `casa`, `lavanderia`, `nemico`,
`porta`, `nota`, `scala` — e le figure nuove, che sono a tratto chiaro, ci si leggono con poco
stacco. **L'utente ha deciso di lasciarli come sono**: si leggono, sono il caso peggiore e non un
difetto, e la tavolozza resta quella decisa a suo tempo. Annotato qui perché non venga «corretto»
di iniziativa da qualcuno che rivede gli spilli fra sei mesi.

### 2026-09-11 — Le condizioni sono stati della partita, mai frasi
Richiesta dell'utente, testuale: «le condizioni sono stati del sistema che definiscono il
comportamento degli elementi e del resto delle sezioni nella partita. Questo deve valere per ogni
elemento in questa app. Non voglio più vedere condizioni espresse come frasi testuali». E, sui
gruppi: «devo poter impostare uno stato e una o più condizioni in OR o in AND o mescolate tra loro».

Al momento della richiesta 324 righe del catalogo (13 attività, 22 libri, 21 film, 23 negozi, 245
articoli) portavano una condizione «da configurare» — la frase della guida che il convertitore non
sapeva leggere — e tre righe uno «stato» con nome libero. Decisioni:

1. **Una condizione è `stato × operatore × valore`, da cataloghi chiusi** (`shared/statiPartita.ts`).
   Il tipo `da-configurare` e lo `stato` a nome libero non esistono più; `fatto_gioco` e
   `fatto_partita` sono tolte (migrazione 064). Le frasi che non si sanno convertire **non diventano
   niente** e finiscono nel rapporto di conversione, mai nei dati.
2. **Gli stati che mancavano** e che la guida usa davvero: arco della storia (159 righe, «a partire
   dall'arco del Palazzo di X», derivato dalla data di gioco e dalle finestre dei Palazzi), attività
   svolta n volte, evento di storia (mansarda pulita, ingressi in squadra), grado cliente di un
   negozio (calcolato dalla spesa: Tanaka), punti negozio, contatori (film/videogiochi/libri
   completati). I primi tre si segnano in **Partita → Progressi**; gli altri si calcolano.
3. **La conversione dalla prosa avviene una volta**, all'ingresso dei dati (seed, migrazione,
   esportazione), con regole che coprono tutte le 128 frasi distinte censite e le 516 righe di prosa
   del seed senza scarti; non si rifà più a ogni avvio.
4. **Un editor solo per tutta l'app**: righe `[NON] [Stato ▾] [operatore] [valori]`, blocchi TUTTE /
   ALMENO UNA annidabili con NON a qualsiasi profondità, numeri a passi, elenchi con ricerca
   scrivendo (`SelettoreRicerca`). Nessun campo di testo libero.
5. Effetto voluto e accettato: condizioni che prima erano ignorate ora **bloccano** (la clinica di
   Takemi apre il 15 aprile col Confidente avviato; gli articoli di Tanaka chiedono il grado).

### 2026-09-12 — Quattro categorie di spillo, e la destinazione è «mappa + spillo»
Richiesta dell'utente (11-12 settembre), testuale: «Uno Spillo deve richiedere solo Nome, Tipo,
Descrizione. Ed in base alla tipologia le informazioni necessarie»; «gli spilli che identificano
passaggi o spostamenti possono collegare la mappa corrente a qualsiasi altra mappa e (se viene
selezionato uno spillo di quella mappa) devono puntare a quello specifico spillo mettendo lo
spillo al centro già selezionato ma la mappa sempre adattata alla finestra»; gli spilli di città
«non sono condizionati e permettono solo di scegliere il Negozio o l'Attività… quando lo spillo
viene cliccato deve visualizzare i prodotti disponibili in quel negozio in un dato momento»; i
consumabili «tracciano cosa è stato già fatto»; «tutti gli spilli non identificati nelle categorie
sopra devono essere trattati come spilli informativi». Decisioni:

1. **Quattro categorie, per tipo** (`shared/spilli.ts`: `categoriaSpillo`, `RIFERIMENTI_PER_CATEGORIA`):
   spostamento (passaggio, scala, uscita, stazione, Velluto, Memento, **Ingresso al Palazzo** — nuovo,
   scorciatoia, rampino), città (negozi, servizi, casa, attività, lavoro, **Confidente**), consumabile
   (dialogo, forzieri, tesori, seme, oggetto chiave, timbro, boss, miniboss, nemico), informativo (il resto).
   **Il server applica le regole**, chiunque scriva (API, pacchetti, seed): consumabile ⇒ collezionabile,
   gli altri no; città ⇒ nessuna condizione; riferimento solo dei tipi ammessi dalla categoria (altrimenti
   400); destinazione solo per gli spostamenti. Migrazione 065.
2. **Destinazione = mappa + spillo** (`spillo_destinazione.spillo_arrivo_id`). Il punto in percentuale
   con lo zoom e la checkbox «Posizione del luogo» spariscono dall'interfaccia. All'arrivo la mappa si
   adatta alla finestra e lo spillo è già selezionato. Nei pacchetti lo spillo d'arrivo viaggia per nome e
   posizione (gli id non valgono fra installazioni); i pacchetti vecchi con `x`, `y`, `zoom` diventano lo
   spillo più vicino entro l'8% dell'immagine (24 delle 40 destinazioni esistenti), altrimenti la sola mappa.
3. **Gli spilli di città non sono condizionati** — neanche dal seed: `sincronizzaMappe` non scrive più
   orari e sblocchi del quartiere sui pin dei luoghi; lo sblocco del quartiere resta sul **passaggio**
   che ci porta. La disponibilità di un negozio la dice il negozio, nel popup.
4. **Il popup lo decide la categoria**: spostamento → «Vai: mappa (allo spillo «…»)»; città → la merce
   del negozio disponibile adesso (con la casella «comprato» in partita), o il Confidente, o il luogo;
   consumabile → «Raccolto / Riapri»; informativo → nome e descrizione. Il popup resta dentro la tela
   (scorre di lato, la freccia resta sullo spillo); sotto i 768 px è un foglio dal basso, fuori dal
   livello trasformato della mappa (portale), con la merce che scorre dentro.
5. **La scheda dello spillo nell'editor chiede una cosa sola per categoria**: «Porta a» (mappa con
   ricerca + spillo di quella mappa) per gli spostamenti; «Collegato a» (negozio / attività / luogo /
   Confidente, elenco con ricerca) per la città; niente per consumabili e informativi. Le condizioni
   compaiono dove la categoria le ammette. La palette di «Aggiungi» è divisa nelle quattro categorie.

### 2026-09-12 — Un solo selettore in tutta l'app, con la ricerca da dieci voci
Richiesta dell'utente: «Aggiungi la ricerca nel selettore Tipo e in tutti i selettori con più di
10 voci» e «quanto indicato sui selettori con più di 10 voci va esteso a tutti i selettori
nell'app». Decisione: nessuna tendina nativa nel frontend. Il `Selettore` (pulsante `combobox` +
`listbox`, 44 px, tastiera) sostituisce ogni `<select>`; il campo di ricerca compare da dieci voci
in su, sempre sugli elenchi della Guida (mappe, spilli, negozi, luoghi, articoli, letture) e mai su
giorno e mese delle date. Il valore è sempre una voce dell'elenco, mai il testo digitato. La regola
è verificata da ESLint (`no-restricted-syntax` sul JSX `select`) e da un test che scandisce i
sorgenti, perché il lint del frontend non era un cancello obbligatorio.

### 2026-09-12 — Città: la mappa apre il mappamondo, la scheda apre il quartiere; i luoghi si classificano da un catalogo
Richiesta dell'utente: «se clicco sulla mappa interattiva deve aprire il mappamondo. Ma se clicco
sulle voci a destra deve aprirmi le relative schede del luogo»; «definire come [vengono classificati]
e integrare così da poter classificare anche eventuali luoghi aggiuntivi»; «Rimuovere fonte»;
«Migliorare la selezione del punto di apertura del quartiere che ad oggi richiede tre input».
Decisioni: la voce a destra porta a `/guida/citta/<quartiere>` (prima entrambi i clic finivano nel
visore); i tipi di luogo vivono in `shared/tipiLuogo.ts` (dieci tipi con colore e icona dello
spillo corrispondente), da cui derivano etichette e colori del frontend e che sarà l'enum del
catalogo dei luoghi; «fonte» non si mostra più (il credito dell'immagine scaricata resta perché è
attribuzione di licenza, non provenienza del dato); l'ingresso del quartiere salva al tocco
sull'immagine, con l'ingrandimento a pastiglie e le coordinate numeriche solo sotto «Avanzate».
I personaggi senza Confidente usano la coppia `personaggi/<chiave>-fedele` + `personaggi/<chiave>`.
Dai giri di validazione: (a) il catalogo dei tipi di luogo è l'unica sorgente anche dello spillo
generato sulla pianta (`spilloPerLuogo` vive in `tipiLuogo.ts`) e il colore della pastiglia è quello
dello spillo, così scheda e mappa dicono la stessa cosa; (b) «servizio» resta sull'icona generica
«attività» perché con un'icona specifica (lavanderia) il Leblanc e la palestra risultavano lavanderie;
«scuola» diventa «biblioteca» e gli spilli di seed rimasti alla vecchia corrispondenza si riallineano
all'avvio, senza toccare i tipi più fini assegnati dai pacchetti (terme, cinema…); (c) la tendina del
Selettore, quando a destra non c'è spazio, si appende al bordo destro del pulsante: la tendina della
partita nella barra in alto usciva dalla finestra e faceva scorrere la pagina (rilievo dell'utente).

### 2026-09-12 — Il seed è dismesso: il DB di gioco è la sorgente, le partite stanno in un altro file
Decisione dell'utente: «il file del DB viene manutenuto con import ed export. I dati utente delle
partite vanno gestiti separatamente (non devono essere influenzati dal DB così che se io devo fare
replace del DB non perdo l'avanzamento)»; «non ci sono dati personali… quello che è attualmente è
dato completo da mettere su db (unica esclusione i dati della partita in corso)»; il salvataggio
della produzione è la sorgente del pacchetto. Conseguenze: `pacchetto/gioco.db` versionato in git
(~5 MB, cambia a ogni aggiornamento dei dati); `data/seed`, `caricaSeed`, `esportaSeed` e gli
script della pipeline rimossi; i test che partivano da uno schema precedente alla 42 con i dati del
seed non sono più riproducibili e sono stati tolti; le asserzioni sui conteggi della guida pura sono
diventate relative ai dati (la produzione ha piante già scaricate, Tokyo e Yongen-Jaya ritoccate).
I vincoli fra i due file non esistono per SQLite: «raccolto» segue l'`uid` dello spillo, che è
l'impronta della sua identità (mappa, tipo, nome, posizione, riferimento: stesso spillo, stesso uid
in ogni file disceso dagli stessi dati) e che i pacchetti mappe conservano; `persona_id`/`skill_id` nelle partite restano id numerici (stabili
finché il pacchetto discende dallo stesso compendio) e la verifica degli orfani è a carico
dell'import del pacchetto (voce 10). Le regole sui dati che il seed applicava a ogni ricarica
(nomi degli spilli, luoghi↔planimetrie, spilli dei luoghi, uid mancanti) restano all'avvio
(`regoleAllAvvio`); la formazione del livello mappe dalla guida (spilli dai marcatori, ingressi
dei Palazzi, presenza dei luoghi) non avviene più da nessuna parte: il pacchetto è la fotografia
dell'istanza di produzione («ha cancellato quello che andava cancellato e aggiunto quello che
andava aggiunto… contiene la fotografia corrente»), e i test che non sono più riproducibili dal
seed sono tre (due sull'organizzazione geografica, uno sulla conservazione).

### 2026-09-12 — Modello dati del catalogo (voce 4): scelte prese sui dati, riga per riga
- **«rango cliente Iniziale» non è una condizione**: è il grado di partenza, che il convertitore
  della 064 rende già come «nessuna condizione»; la 070 segue quella regola invece di scrivere un
  `rango-cliente: iniziale` sempre vero.
- **Orari**: le cinque frasi che non descrivono un orario valutabile (Palazzo di Niijima, il
  venditore «una settimana sì e una no», le date del calendario, l'apertura come negozio di
  equipaggiamento, la nota sul curry) restano nella `nota` con gli orari a «sempre»; «giorni di
  scuola» diventa lunedì–sabato con la nota, perché la scuola giapponese del gioco ha il sabato.
- **Sedi**: dove `luogo` non aveva il posto (Taisho Store, venditore ambulante, negozio scolastico,
  gachapon, mercante Sakai, due distributori) la 072 crea la riga della guida; i quattordici
  distributori puntano ai luoghi «distributori» del quartiere; `distributori-automatici`, negozio
  mai esistito, sparisce da `luogo.negozio`. Tanaka, la TV e il negozio del Palazzo di Niijima non
  hanno una sede; la lettura in metropolitana nemmeno.
- **Videogiochi**: sei avevano già l'articolo (Super Baron come «regalo», Gambla Goemon da
  Yumenoshima come «altro»): si collegano, non si duplicano; Star Forneus nasce da Yumenoshima a
  prezzo zero, «incluso nel Set per retrogaming».
- **Effetti dei libri**: i dodici «Sblocca <quartiere>» tornano `sblocca-luogo` (in produzione il
  ricaricamento del seed aveva azzerato l'esito della 061); gli altri dodici `sblocca` («Raddoppia
  la velocità di lettura»…) sono voci «descrittivo», dichiarate come tali; le spiegazioni delle
  Doti delle attività che non sono valutabili («la fonte non specifica le note») vanno nei
  `dettagli`, non negli effetti. Lo studio al Leblanc e al Diner porta due voci esclusive
  («non piove» → 2 note, «piove» → 3): chi somma le voci non ne conta mai più di una.
- **I luoghi creati dalla 072** hanno `cosa_offre` vuoto: il negozio collegato dice già che cosa
  vende, e una frase scritta qui non sarebbe un dato della guida.
- **Doppione da decidere**: `hinokuniya/abc-dell-artigianato` è una copia senza apostrofo di
  `hinokuniya/l-abc-dell-artigianato` (quello collegato al libro); la migrazione non lo tocca —
  è una scelta sui dati dell'utente (nasconderlo dalla pagina «Rimossi» della voce 6, o tenerlo).
- **Timbri**: si leggono dalla descrizione della guida («20 Timbri totali»); Qimranut, Chemdah e
  Iweleth restano nulli perché la guida non li dichiara — un dato che manca, non uno zero.
- **Domande**: il quiz in TV è `tipo='tv'` (tabella ricostruita con l'`id` conservato); le righe
  degli esami portano il quesito accanto alla risposta, da `esame.domande_json`.
- **Filtro «Esami» della pagina Domande**: con il tipo «tv» il filtro mostra solo gli esami
  (`esame-medio`, `esame-finale`); prima vi finivano anche le domande del quiz in TV, perché
  «esami» era «tutto ciò che non è in classe». Il filtro dedicato al quiz arriva con la voce 8.

### 2026-09-12 — Server del catalogo (voce 5): tre regole che cambiano il comportamento
- **Una lettura non disponibile non si registra (409 `lettura-non-disponibile`)**: un libro che
  esce il 18 aprile non si può segnare l'11; azzerare è sempre permesso. Le partite nascono il
  9 aprile: chi registra una lettura deve avere il giorno della partita aggiornato. I test
  creano le partite a una data in cui le righe usate sono disponibili.
- **La presenza di un negozio sono i suoi orari**, non più le condizioni: Untouchable (giovedì,
  sabato e domenica sera) di giorno è «bloccato» e con lui i suoi articoli (`daNegozio`); lo
  sblocco che era del negozio sta sugli articoli e dice «non ancora» senza nascondere il pin.
- **Le domande «prossime» sono il prossimo appuntamento** (le domande non fatte della prima data
  da oggi in poi, una o due), non un elenco di cinque.
- Il modulo del catalogo continua a scrivere `dote`/`note`/`doti_json` finché le voci 6–7 non
  lo rifanno: il server deriva `effetti_json` da lì (`normalizzaScrittura`), così i punti della
  partita, che leggono gli effetti, non restano indietro. `orari` (frase) resta accettato accanto
  a `orari_json` per lo stesso motivo.

### 2026-09-12 — UI di negozi e articoli (voce 6): che cosa scrive il modulo e che cosa non c'è più
- **Il modulo scrive solo valori.** Negozio: `orari_json` (chip), `sede_chiave` + `luogo_chiave`
  (la sede porta il quartiere; «solo il quartiere» lascia la sede vuota), `confidente_chiave`,
  `programma_punti_json`; non manda più `orari` (frase), `sblocco`, `condizioni_json`, `fonte`.
  Libro/film/attività: `effetti_json` (voci con `ripetuto` e condizioni) al posto di
  `dote`/`note`/`note_successive`/`doti_json`/`effetto_json`; film senza `periodo`, libro senza
  `dove`/`disponibile_dal`/`nome_it` (identico al titolo per tutti i 46), attività senza
  `regole`/`premi`/`altri_effetti`/`paga` (testo): tutto in `dettagli`. Le colonne restano nel
  DB per le righe della guida; il server le legge finché ci sono.
- **«Come trovarlo» resta**: la colonna `negozio.luogo` («vicino alla stazione») è un'indicazione,
  non un riferimento, e si mostra solo quando la sede manca. Non è un dato che l'app interpreta.
- **«Confermato»** (`verificato`) è una spunta del guscio per articoli, libri, film, attività e
  luoghi: prima si poteva solo perdere. Una riga nuova nasce non confermata.
- **Videogioco = attività col tipo fissato**: `ModuloCatalogo` accetta `tipo='videogioco'` (stesso
  componente delle attività senza la scelta del tipo, conteggio per round); l'API resta `attivita`.
- **Le tessere (`SelettoreIcone`) sostituiscono le tendine dove la figura aiuta a scegliere**: tipo
  di negozio, categoria dell'articolo, famiglia dell'effetto, tipo e fascia dell'attività, dove si
  vede un film, tipo di luogo. Dove le voci sono molte o senza figura (Confidente, sede, Dote)
  resta il `Selettore`.
- **Il blocco «Rimossi» del negozio si ricarica con la scheda** (`versione` che cambia a ogni
  salvataggio): nascondere dal modulo lo fa comparire subito, senza ricaricare la pagina — difetto
  trovato nel giro di prova e corretto prima del PR.
- **Dopo il primo giro del validatore (voce 6)**: la sede del negozio apre la pagina del quartiere con
  il luogo evidenziato (`/guida/citta/<quartiere>#luogo-…`, `ancoraLuogo` in `src/utils/citta.ts`,
  ancora e scorrimento in `QuartierePage`), perché `/guida/citta/<chiave-del-luogo>` non esiste;
  «Dove» resta anche per i negozi senza quartiere né sede (Tanaka, TV, Palazzo di Niijima) con
  l'indicazione testuale; una domanda salva `ricompensa`/`note` vuoti come `''` (lo schema non
  ammette `null`); un valore di «Chi la fa» fuori dall'elenco resta visibile e scelto; un legame
  a un oggetto che l'archivio non ha più si segnala e si conserva finché non si sceglie altro o si
  passa alla via «a mano»; i regali dichiarano «gradito a» con i Confidenti come interruttori;
  `ICONA_FAMIGLIA_EFFETTO` sta in `shared/effettiOggetto.ts` come da piano; nella pagina «Rimossi»
  un articolo mostra il nome del negozio, non la chiave.

### 2026-09-12 — UI delle letture e delle attività (voce 7)
- **Il «+» di una riga non ancora disponibile resta spento** e il motivo (il dettaglio del requisito
  rosso: «Disponibile dal 18 aprile, oggi è l'11») sta scritto sotto i pulsanti: il server rifiuterebbe
  comunque (409), ma l'interfaccia non deve invitare a un gesto che non passa. Una riga già iniziata
  si può sempre correggere (togliere o completare).
- **Il periodo dei film in prosa non si mostra più**: «quando» sono le condizioni della riga, che
  l'app valuta. `periodo` è stato tolto dal DTO nella voce 11.
- **«Dove» di un libro sono i negozi collegati**, con il prezzo dell'articolo; il testo `dove` della
  guida compare solo se non c'è né un negozio né una posizione (premi, eventi).
- **La fonte non si mostra** nelle pagine di libri, film, videogiochi e attività (principio 4 del
  piano): resta colonna interna.
- **Le Doti negli effetti si scrivono col nome** («Conoscenza ♪♪♪»): la frase la compone
  `descriviEffetto` in `shared`, che ora conosce i cinque nomi.

### 2026-09-12 — UI di Palazzi, Memento, Richieste, domande e cruciverba (voce 8)
- **La colonna della scheda del Palazzo mostra quel che fa la percentuale**: i collezionabili delle
  planimetrie con «Raccolto», non i punti della guida. La maggior parte delle planimetrie non è
  legata a un'area della guida, quindi oltre a quelle dell'area scelta c'è una piega con tutte le
  planimetrie del Palazzo. I punti della guida restano consultabili e segnabili in «Dalla guida».
- **Nei Memento la colonna sono gli obiettivi del dedalo** (timbri + richieste); dove la guida non
  dichiara i timbri lo si dice e non c'è contatore. La «Pianta della guida» dei Memento non si mostra:
  i piani si generano a ogni discesa.
- **Il prossimo appuntamento non è un secondo elenco**: domande e cruciverba evidenziano la riga nel
  suo mese e in cima c'è il rimando «Vai a…». Gli esami hanno una rappresentazione sola: le righe per
  data con il quesito accanto a ogni risposta; la sezione «Esami» tiene date, risultati e premi.
- **Il dedalo delle Richieste sta nell'indirizzo** (`?dedalo=`), così dalla scheda del dedalo si
  arriva già filtrati; accettazione e completamento sono due segmenti indipendenti.
- **Dopo il validatore (voce 8)**: quando l'area scelta non ha planimetrie legate, la colonna mostra la
  raccolta di tutto il Palazzo aperta (non una piega chiusa), con la nota che spiega perché; la Conoscenza
  delle domande si accredita solo dove la guida scrive «Conoscenza +…» (le domande in classe), non agli
  esami né ai quiz TV; dopo Ottenuto/Esaurito su un punto della guida la raccolta si rilegge dal server,
  perché un punto può essere agganciato a uno spillo collezionabile.
- **Dopo il secondo giro (voce 8)**: la voce dell'area distingue «nessuna planimetria legata» da «niente da
  raccogliere sulla sua planimetria» (34 aree hanno una planimetria senza collezionabili), e la nota sopra la
  raccolta del Palazzo dice il motivo giusto; l'etichetta della colonna e il messaggio di vuoto seguono ciò che si
  sta guardando (area o Palazzo).

### 2026-09-12 — Progressi calcolati (voce 9)
- **Gli eventi «entra in squadra» non si segnano più**: valgono quel che dice la squadra della partita
  (`in_squadra`), a tre stati come i semafori dei Confidenti; niente date canoniche, perché la data in cui
  un Ladro entra dipende dalla partita. Le righe manuali esistenti dei quattro eventi vengono cancellate
  (migrazione utente 004): non le leggerebbe più nessuno.
- **Si conta solo ciò che ha un tracciamento**: le condizioni «svolta almeno n volte» e i progressi vedono le
  sole attività con `tracciamento = 'svolta'`; i videogiochi si contano per round in Letture e giochi;
  studio, allenamento, cibo e lettura non si contano.
- **I punti negozio si segnano solo dove il programma è manuale** (Vestiti usati di Kichijoji: i punti
  vengono dalle vendite, non dalla spesa); il grado cliente (Tanaka) si calcola dalla spesa e non si segna.
  L'editor delle condizioni offre l'uno o l'altro secondo il programma del negozio.

### 2026-09-12 — Immagini dentro il database di gioco (voce 10)
- **Correzione di una decisione registrata male.** Il piano riportava fra le decisioni dell'utente «gli asset di gioco
  sono png esterni al DB»: l'utente non l'ha mai chiesto né motivato, e ha ristabilito la regola vera: **in
  `public/asset/` restano solo le grafiche del compendio (persona, arcani, skill) e dell'interfaccia (`ui/`); tutto il
  resto va dentro il database**. Le 16 famiglie di grafica di gioco (mappe, spilli, Confidenti, personaggi, sfondi,
  identità, illustrazioni, gruppi di Persona, palazzi, doti, elementi, affinità, meteo, attività, decori, guida) e ogni
  immagine caricata vivono in `immagine.contenuto` (migrazione 079).
- **Il pacchetto di gioco è un solo file** (`gioco.db`, ~310 MB con le immagini): niente ZIP, niente manifesto; la
  versione è `user_version`, i conteggi si leggono dal file. Lo ZIP resta solo per il backup dell'istanza completa
  (i due database e i caratteri). `pacchetto/immagini/` e le cartelle spostate di `public/asset/` escono dal repository.
- **L'importazione passa sempre dall'anteprima**: schema (un pacchetto più nuovo del codice non si importa), tabelle che
  cambiano, immagini e i riferimenti delle partite che resterebbero orfani; si sostituisce solo alla conferma, con copia
  di sicurezza e rollback. Le partite non vengono toccate.
- **Il backup di avvio si fa solo con una migrazione in arrivo**: sette copie da 310 MB a ogni avvio non avrebbero senso.
- **Un solo file, `gioco.db`, in due stati.** Il completo (con le immagini, 311 MB > limite GitHub di 100 MB) resta fuori
  da git — niente LFS per ora, si rivaluta con il database definitivo — e vive in locale in `pacchetto/completo/gioco.db`,
  ignorato ed evidenziato in `pacchetto/README.md`. **Il caricamento iniziale completo avviene sempre con l'importazione
  dall'app**, che sostituisce il file dell'istanza sul volume. Perché l'interfaccia si apra subito, in git c'è
  `pacchetto/gioco.db` iniziale (stessi dati, senza il contenuto delle immagini) che il primo avvio copia in
  `DATA_DIR/gioco.db`; la card «Pacchetto di gioco» avvisa finché il completo non è importato (`StatoIstanzaDto.completo`).
  Senza iniziale l'istanza nasce vuota (`vuota`) e non è un errore fatale.

### 2026-09-12 — Pulizia (voce 11)
- **I giorni di un luogo sono chiavi, non una frase** (`giorni_json`, migrazione 080). Ciò che nella frase non era un
  giorno («per il Confidente Iwai», «e festività») non si interpreta: resta nelle note del luogo, com'era scritto.
- **Dai DTO escono i campi di prosa che nessuna pagina legge**: `periodo` dei film, `orari` e `sblocco` del negozio,
  `fonte` di catalogo e cruciverba. Le colonne restano nel database come credito della guida.

### 2026-09-12 — Il pacchetto su un'istanza pubblicata
- **Per le istanze dietro un proxy il file non passa dal browser**: si indica un indirizzo e lo scarica il server. È
  l'unica strada che sopravvive ai limiti di corpo di nginx e dei tunnel, e riusa il pattern già in uso per le
  immagini da URL. L'indirizzo può essere privato (il PC di casa in Tailscale): è il caso d'uso previsto, quindi non
  si filtrano le destinazioni.
- **I tempi lunghi non sono errori**: un invio che dura mezz'ora è normale con centinaia di MB. Si interrompe solo per
  inattività (client e server), mai per durata complessiva.
- **Un'importazione alla volta, e sempre interrogabile**: se la connessione cade mentre il server sostituisce i dati,
  l'app chiede lo stato invece di dichiarare il fallimento, e un secondo tentativo viene rifiutato con 409 finché il
  primo non ha finito.
- **Un esito vale solo per il tentativo che lo ha chiesto**: l'importazione porta un identificativo e il frontend
  confronta quello dell'ultima operazione vista prima di partire. Dire «riuscita» per un lavoro mai iniziato sarebbe
  peggio di qualunque errore: l'utente crederebbe di avere dati che non ha.

### 2026-09-12 — Il pacchetto arriva dalla cartella d'appoggio sul NAS
- **Il file non passa più dal browser né da internet**: si deposita su una condivisione del NAS montata sul server e
  l'app lo importa da lì. Sostituisce l'idea del tunnel verso il PC, che l'utente ha respinto.
- **Il NAS non ospita il database vivo**: SQLite qui gira in WAL, che ha bisogno di memoria condivisa fra i processi e
  non funziona su un filesystem di rete. Sul NAS sta solo il file di scambio; `/data` resta un volume locale.
- **L'elenco dei file dice sempre la verità**: cartella non configurata, non montata o vuota sono tre messaggi
  diversi, perché «nessun file» quando in realtà il mount è caduto manderebbe a cercare il problema dalla parte
  sbagliata.

### 2026-09-13 — Il nome con cui si presenta una mappa
- **Il nome rivisto a mano vince su ogni nome dedotto, e si mostra così com'è scritto.** Le planimetrie estratte dal
  gioco hanno nella colonna `nome` delle sigle («Area 4 — RMAP 153», «livello grafico 4») e il nome leggibile sta nei
  contesti e nel gruppo di immagini di `mappa_presentazione`, che l'importazione del pacchetto scrive una volta e
  nessuna schermata modifica. Finché quel nome dedotto aveva la precedenza, chi correggeva il campo «Nome»
  nell'editor salvava e continuava a vedere in alto il vecchio titolo — suffisso della versione compreso — senza
  nessun posto dove intervenire. Fra le alternative valutate con l'utente (rendere modificabile il gruppo dall'editor;
  rinominare in blocco tutte le versioni del gruppo) è stata scelta questa, che non tocca l'istantanea
  dell'estrazione e lascia l'ultima parola a chi cura l'atlante.
- **Lo dichiara una colonna sua, `mappa.nome_rivisto` (migrazione 082), non `origine = 'utente'`**: quella la
  assegnano anche il caricamento di un'immagine e l'importazione di un pacchetto di mappe dalla rotta pubblica, che
  riscrive pure i contesti — bastava una importazione per far parlare tutto l'atlante col nome grezzo delle righe.
  Il flag lo accende solo il salvataggio dell'editor quando il nome cambia davvero, e lo spegne l'importazione di un
  pacchetto, che quel nome lo sovrascrive. Le righe esistenti partono spente: nessuna revisione è dimostrabile a
  posteriori, e così i titoli mostrati finora non cambiano.
- **Resta davanti il titolo del contesto selezionato**: quella è la vista in corso — quale zona della planimetria si
  sta guardando — non il nome della mappa.
- **Salvare dall'editor dichiara il nome, anche se il testo non cambia** (correzione del 2026-09-13): legarlo al
  cambiamento del testo lasciava senza rimedio chi il nome l'aveva già corretto prima della 082 — con il nome giusto
  già scritto non c'era più niente da cambiare, e uno spazio in più veniva tolto dal `trim()`. Finché il nome non è
  dichiarato, il modulo dice quale dei due nomi si sta leggendo in alto e «Salva» resta attivo per confermarlo.
- **Un solo posto decide il nome**: albero, indice, briciole e striscia delle miniature leggevano per conto loro
  `gruppoImmagini.nome`, e una mappa rivista si sarebbe chiamata in un modo nell'editor e in un altro altrove. Ora
  passano tutti da `titoloGruppoImmagini` in `src/utils/presentazioneMappa.ts`.

### 2026-09-13 — I collegamenti fra mappe sono un grafo, non un albero
- **La scheda «Collegamenti» dell'editor mostra anche i passaggi, nei due versi.** Mostrava solo
  l'albero — genitore e figlie — ma in città ci si sposta di lato (dal Sottopasso alla Banchina, due
  luoghi di Shibuya allo stesso livello) e i treni collegano quartieri diversi: sedici spilli su
  ventiquattro non puntavano a una figlia e non comparivano da nessuna parte. L'albero resta:
  dice chi contiene chi, che è un'altra informazione e serve lo stesso.
- **Anche il verso opposto**: `MappaDto.arrivi` porta gli spilli di altre mappe che arrivano qui.
  Una mappa conosce da sé solo le proprie uscite, quindi un collegamento a senso unico non era
  visibile da nessuna parte. Gli arrivi si leggono sia da `spillo_destinazione` sia dal riferimento
  `mappa` dei passaggi più vecchi, senza contare due volte lo stesso spillo.
- **Il ritorno si crea dalla mappa che lo deve portare**: lo spillo sta su quella, non su questa.
  Perciò l'avviso in uscita dice dove andare, e il pulsante «Crea il passaggio» sta nell'elenco
  degli arrivi, dove l'azione è davvero possibile.
- **Nell'editor si naviga senza uscire dalla modifica** (richiesta dell'utente): doppio tocco su
  uno spillo di spostamento, voci dell'elenco dei passaggi, e «Apri l'arrivo» spostato in cima al
  pannello dello spillo. Nel visore basta un clic, ma nell'editor il clic seleziona per modificare:
  la via d'uscita va data a parte, altrimenti l'unico modo era un pulsante in fondo al pannello.

### 2026-09-18 — Le planimetrie di un Palazzo sono una cosa sola, ordinata
- **Un'area della guida ha una sola planimetria** (decisione dell'utente): legarne una seconda
  stacca la prima. Con più planimetrie per area «completa» non misurava niente, e la stessa stanza
  compariva due volte nell'elenco del Palazzo.
- **Il legame si scrive in un posto solo dal punto di vista di chi lo usa**: `mappa_entita` è la
  tabella che leggono scheda del Palazzo e contenuti della guida, e ora la scrive anche l'editor,
  nella stessa transazione delle colonne `entita_*`. Prima il salvataggio dell'editor sembrava
  riuscito e non cambiava nulla.
- **La scheda elenca tutte le planimetrie, anche quelle vuote**: l'elenco serve a ordinarle,
  legarle e toglierle, e le planimetrie da togliere sono proprio quelle senza niente da raccogliere
  (i ritagli che nessun campo usa, le inquadrature alternative della stessa stanza).
- **L'ordine si cambia trascinando, ma non con l'HTML5 drag-and-drop**: col dito non parte, e questa
  scheda si consulta dal tablet mentre si gioca. Trascinamento a puntatore, più Su/Giù per la
  precisione e per la tastiera.
- **Le duplicazioni restano una scelta di chi gioca** (risposta dell'utente): niente fusione né
  cancellazione automatica delle varianti; l'app dà gli strumenti (ordine, legame, eliminazione) e
  la decisione su quale tavola tenere si prende planimetria per planimetria.
- **L'editor può guardare il giorno corrente, ma non lo fa da solo**: di regola vede tutto, perché
  deve poter modificare anche quel che nel mondo non c'è ancora; l'interruttore serve a controllare
  il lavoro con gli occhi di chi consulta la guida oggi, senza uscire dalla modifica.


### 2026-09-18 — Nella negoziazione si cerca la domanda, e il carattere è un colore
- **La domanda è l'unica cosa che si legge sullo schermo** mentre l'Ombra parla: la ricerca parte da
  lì (e prende anche il testo delle risposte, perché a volte è quello che si riconosce prima).
- **Solo italiano** (scelta dell'utente): la fonte è inglese e la resa è nostra; il gioco in
  italiano può usare parole diverse, e questo va detto nella scheda invece di lasciarlo scoprire.
- **Un carattere che non compare non è indifferente: non è stato verificato.** Inventare un verdetto
  costerebbe la trattativa, quindi la riga lo dice; le voci che nemmeno la fonte conferma sono
  marcate «incerto».
- **Il carattere è un colore fisso** in tutta l'app: durante la trattativa si riconosce con la coda
  dell'occhio, senza rileggere i nomi.
- **Il dato sta nella guida alla battaglia, non in tabelle nuove**: è testo della guida, si serve in
  un colpo solo e la ricerca avviene nel browser, che su tablet è istantanea.
- **Nel dubbio vale il verdetto peggiore** (rilievo della revisione, 2026-09-18): quando la fonte dà
  alla stessa risposta due esiti per lo stesso carattere, la scheda mostra il peggiore e lo marca
  incerto. Consigliare come buona una risposta che qualcuno ha segnato cattiva fa fallire la
  trattativa, e una guida che consiglia e sconsiglia la stessa cosa è peggio di una che tace.
- **Una domanda, una scheda**: le domande trascritte due volte si fondono (risposte per testo,
  verdetti per carattere) invece di comparire come due righe gemelle che si spartiscono i verdetti.


### 2026-09-18 — La guida si corregge dove si legge, e la pianta scaricata esce di scena
- **La sezione dei Palazzi non è più in sola lettura** (richiesta dell'utente): erano trascrizioni
  fatte a mano e non c'era nessun posto per correggerle. La correzione sta accanto al testo, non in
  una schermata a parte: altrimenti bisogna ricordarsi che cosa non andava.
- **Le correzioni sono dati di gioco, non avanzamento**: stanno in `gioco.db`, valgono per tutte le
  partite ed entrano nel pacchetto alla rigenerazione.
- **Una stanza ha un nome solo**: rinominarla da una delle sue tavole la rinomina su tutte, perché
  altrimenti due versioni della stessa stanza finirebbero sotto due titoli diversi.
- **La pianta scaricata dalla guida è stata rimossa** (decisione dell'utente): seconda immagine
  della stessa stanza, con uno scaricamento da indirizzi esterni e un sistema di marcatori tutto
  suo, usata 11 volte su 107 aree. Dove manca la planimetria la scheda ora **offre di collegarla**,
  che è il rimedio vero: le tavole ci sono, mancava il legame.
- **Nessun accostamento automatico per nome**: provato sui dati, 0 proposte su 35 aree, perché la
  guida e l'estrazione chiamano le stanze in modo diverso. Un automatismo che indovina avrebbe
  lasciato legami sbagliati da disfare a mano.
- **I tetti dei campi si misurano sui dati, non si scelgono** (2026-09-18): un modulo che rimanda
  indietro anche i campi non toccati trasforma un limite troppo stretto su un solo campo nel blocco
  dell'intero salvataggio. Un test risalva ogni Palazzo, area e punto così com'è per accorgersene.
- **Una correzione che tocca l'atlante rilegge l'atlante**: nome della stanza ed etichetta della
  versione non stanno nella scheda del Palazzo, e ricaricare solo quella lasciava a schermo il testo
  vecchio benché salvato.
- **Un tetto si scrive una volta sola** (2026-09-18): schema del server e `maxLength` del campo
  leggono `shared/limitiGuida.ts`, perché due copie dello stesso numero divergono al primo ritocco e
  il sintomo — un 400 che non dice quale campo — arriva a chi sta scrivendo.
- **Un elenco solo per il Palazzo, ed è la colonna di atterraggio** (2026-09-19): la scheda aveva
  due liste dello stesso Palazzo — le aree della guida a sinistra, dove per Kamoshida 15 voci su 18
  dicevano «nessuna planimetria legata», e il pannello delle stanze, che bisognava sapere di poter
  aprire da un chip indistinguibile dalle targhette accanto. Nessuna delle due era completa e
  l'ordine non coincideva. Ora la lista è una: le stanze in ordine di percorso, con i comandi sulle
  righe, e in coda le aree della guida ancora da collegare. Comanda l'ordine del percorso, quello
  che si trascina, non la numerazione della guida.
- **Un elenco di scelte fatto di nomi uguali non è una scelta** (2026-09-19): le tavole libere di
  Kamoshida si presentavano tutte come «Palazzo di Kamoshida — Immagini native che nessun campo
  usa», 32 voci identiche. Anche il selettore passa dai nomi dell'atlante, gli stessi dell'elenco.
- **L'elenco unico vale a tutte le larghezze** (2026-09-19): sotto i 1024 px restava la fila di chip
  di tutte le aree sopra l'elenco che le contiene già — per Kamoshida diciotto chip in otto righe,
  circa 320 px di muro prima del contenuto, cioè la doppia lista rimessa in piedi sul formato dove
  fa più male. La fila resta solo nei Memento, dove i dedali non hanno planimetrie.

### 2026-09-29 — La giornata della guida si modifica, e ciò che scorre dentro la pagina si vede
- **Le correzioni alle azioni della guida valgono sempre per tutte le partite** (scelta dell'utente fra «per partita»,
  «a scelta» e «tutte»). Vivono nel file delle partite (`correzione_azione_guida`), non nella guida: il pacchetto la
  sostituisce per intero e le spunte sono legate alla posizione dell'azione, quindi l'azione si corregge o si
  «rimuove» (nascosta, ripristinabile) senza spostare nient'altro.
- **Gli eventi dell'utente stanno dentro «Di giorno» / «Di sera»** (scelta dell'utente, invece che nella scheda del
  giorno): hanno una fascia e un cartellino, e non si spuntano. Il riquadro «Le mie note» non esiste più.
- **Una correzione che la guida nuova ha superato non si applica in silenzio**: se a quella posizione c'è un'azione con
  un altro testo, la correzione si mostra in «Correzioni da rivedere» (Riapplica / Scarta) e intanto non la si può
  sovrascrivere né dall'interfaccia né dall'API (409).
- **Si lavora direttamente su `main`, senza ramo dedicato né PR** (richiesta dell'utente del 2026-09-29).
- **Aree che scorrono dentro altre** (richiesta dell'utente): l'area deve essere riconoscibile e il gesto non deve
  passare a una seconda barra. Regola unica nelle utility `area-scorrevole` / `area-scorrevole-x` e un test che vieta
  gli scorrimenti fatti a mano. Nelle schermate «senza scorrimento» (Home, scheda «Oggi») la pagina scorreva comunque
  di 50-70 px per la mappa di Tokyo: ora la mappa si adatta alla colonna e scorre solo la guida.

### 2026-09-29 — «Oggetto» e «Punto di infiltrazione»; le illustrazioni restano nel database
- **Tipo di spillo «Oggetto»**, consumabile accanto a «Oggetto chiave», «Forziere» e «Forziere raro» (richiesta
  dell'utente). **Solo il tipo nuovo** (scelta dell'utente): gli spilli esistenti non si riclassificano e i punti
  «oggetto» della guida continuano a diventare «Oggetto chiave»; li si cambia a mano dall'editor.
- **Tipo di spillo «Punto di infiltrazione»**, spostamento **con destinazione** (scelta dell'utente): porta a un'altra
  mappa come Passaggio e Uscita. È dentro il Palazzo, distinto da «Ingresso al Palazzo» che sta sulla mappa di città.
- **Le correzioni visive proposte sono state approvate dall'utente**: Giorno/Sera affiancati a metà larghezza sotto
  l'etichetta, schede dei quartieri in una griglia con colonne di almeno 300 px.
- Le illustrazioni delle attività generate da Codex vanno nel database (regola della migrazione 079), non in
  `public/asset/attivita/` come diceva per errore la consegna del 2026-09-13.

### 2026-09-30 — Più aree della guida per planimetria; Palazzi e Memento in una schermata
- **Una planimetria contiene più aree della guida** (richiesta dell'utente del 2026-09-29: «devo poter selezionare più
  elementi della guida alla stessa mappa… deve mostrare le sue aree in ordine»). Resta la decisione del 2026-09-18:
  **un'area ha una sola planimetria**; spuntarla su un'altra la sposta, e la finestra lo dice prima di salvare. Le
  aree si mostrano sempre in ordine di guida (`dungeon_area.ordine`).
- Le colonne `mappa.entita_tipo/entita_chiave` restano un legame solo: quando la mappa è legata ad aree dichiarano la
  **prima in ordine di guida**. Passando da un'area a un legame di altro tipo (quartiere, luogo) le altre aree
  restano in `mappa_entita`; si tolgono con la scelta delle aree.
- Le aree si legano solo alle planimetrie **del loro Palazzo** (non alla mappa d'insieme `dungeon-<k>`), anche da un
  pacchetto e spostando una mappa (con tutto il suo sottoalbero) sotto un altro genitore.
- **Palazzi e Memento stanno in una schermata da 1024 px** (richiesta dell'utente: niente barra di pagina, colonne
  che finiscono alla stessa altezza; «sì, anche i Memento»). Scelte dell'utente: **intestazione compatta su due
  righe** da 1024 px; **mappa con minimo 240 px** — sotto quel minimo scorre la sola colonna della mappa, mai la
  pagina. Sotto i 1024 px resta la colonna unica con lo scorrimento di pagina.
- **Colonna del Palazzo ristrutturata** (richiesta dell'utente: «è fatta molto molto male ed è poco usabile…
  ristrutturala»; scelta «Elenco + scheda in finestra», con il trascinamento come modo di riordinare): l'elenco serve
  a scegliere, «Gestisci» apre la scheda con nome della stanza, «Che cosa mostra», nome, aree, editor ed
  eliminazione. Niente più matite, frecce o cestini nelle righe; le conferme stanno nel piè delle finestre.
- **Un'area della guida si elimina davvero** (scelta dell'utente, invece di nasconderla), per tutte le partite, con i
  suoi punti e quel che le partite ne avevano segnato; un pacchetto importato dopo la rimette.
- **I nemici non si raccolgono** («si rigenerano»): categoria informativa, fuori dal completamento e dai «da
  raccogliere». Boss e miniboss restano consumabili. Il conteggio «esauribili» della pagina dei Palazzi riguarda i punti
  della guida (comprese le ombre sciagura esauribili), non il completamento delle mappe: resta com'è.
- **Stanze**: una planimetria entra nella stanza di un'altra o diventa una stanza a sé dalla sua scheda (richiesta
  dell'utente). Solo fra planimetrie dello stesso luogo; l'etichetta resta; entrando va in fondo alle versioni.
- **Il nome della stanza scelto da una persona vince** sul nome rivisto della singola mappa, e rinominare una
  planimetria che sta in una stanza non rinomina la stanza, da qualunque schermata (editor compreso): se era lei a
  dare il titolo alla stanza, quel titolo si fissa com'era (difetto segnalato dall'utente: il nome della stanza non
  si vedeva, quello della planimetria rinominava la stanza). Una mappa che non sta in nessuna stanza è stanza e
  planimetria insieme: lì il nome è uno solo, salvo che la sua scheda fissa un nome di stanza separato.
- **Un Palazzo è completato dai fatti della partita, mai dalla data** (richiesta dell'utente): boss **finale** segnato
  nella Guida o raccolto sulla mappa, oppure Tesoro del Palazzo raccolto (suggerimento dell'utente), oppure raccolta al
  100% con la regola della scheda. Il boss finale è quello dell'ultima area che ha boss: gli intermedi (Akechi a Shido,
  Sumire a Maruki) non completano il Palazzo.
- Scelte dell'utente (domande del 2026-09-30): il **boss finale della Guida si segna da solo** raccogliendo il Tesoro o il
  boss finale sulla mappa, e **si toglie** se si tolgono (salvo che la mappa dica ancora «finito»); l'**ingresso al
  Palazzo sparisce** a Palazzo completato, anche prima della scadenza; gli **archi** («dall'arco del Palazzo di X»)
  **restano legati alla data**, non al completamento anticipato.
- Precisazione della revisione (non parole dell'utente): togliendo il Tesoro o il boss finale sulla mappa si toglie solo
  il segno che il raccolto aveva messo nella Guida (`punto_partita.automatico = 1`); un boss della Guida segnato a mano
  dall'utente resta, perché è un suo dato e non un effetto del raccolto.
- Limite noto: `riconciliaAreeGuida` (migrazione 042 e sincronizzazione delle mappe) converte una mappa **senza
  geometria** in «area della guida» leggendo le colonne, cioè la sola prima area; una planimetria senza immagine
  legata a più aree non viene gestita per le altre. Oggi tutte le planimetrie dei Palazzi hanno l'immagine.

### 2026-09-30 — Le azioni della Guida dichiarano i loro effetti; la Guida si modifica al 100%

- Difetti segnalati dall'utente: finito Zorro, il fuorilegge la Gentilezza non è salita («3 note + bonus libro doveva
  fare un +7», da tutti e tre i punti dell'app); la nota di Coraggio del rango 2 di Takemi non è stata contata; il bagno
  del 25 aprile dava +3 note di Fascino e in gioco ne ha date 2; «Sbloccare il lavoro da fioraio Rafflesia…» dava la
  Gentilezza, che «è per quando effettivamente faccio quel lavoro». Causa comune: la spunta leggeva i punti dal testo
  delle note e segnava come letto ogni libro collegato (anche solo preso in prestito).
- Piano approvato dall'utente (6 voci): **effetti strutturati** dell'azione (Dote, Lettura, Turno), modificabili; le
  note restano testo; una conversione una volta sola dalle note di oggi.
- Scelte dell'utente: per il 26 aprile «2 voci distinte» (sblocco e primo giorno di lavoro), e più in generale gli
  eventi della Guida, anche quelli aggiunti dall'utente, devono potersi classificare e collegare (Confidenti, Libri,
  Doti…) «al 100%»; la Dote dei Confidenti a ogni incontro arriva **da ogni incontro registrato**; le partite già in
  corso **restano come sono** (nessuna correzione dei libri già segnati letti); «mi interessa risolvere il problema, al
  dato finale ci penso io»: l'app deve permettere di correggere i dati, non li corregge da sé (il bagno del 25 aprile
  resta +3 nella guida finché l'utente non lo cambia).
- Regole di realizzazione della Dote a ogni incontro (scelte dell'implementazione dentro «da ogni incontro registrato» e «il
  passaggio al rango R conta una volta sola», approvate col piano; non parole dell'utente): la Dote è un dato del Confidente
  per ciascun rango verso cui vale (1–10, modificabile nella sua scheda); un incontro è unico per Confidente, giorno e fascia
  (nel gioco si esce con un Confidente una volta per fascia: più risposte o più parti che lo segnano non lo contano due
  volte); passaggi di ranghi diversi segnati a mano nello stesso momento sono incontri a sé; «Annulla ultimo» che riporta i
  punti a prima delle risposte toglie l'incontro. Le azioni della guida con un rango atteso non danno più la Dote da sé
  (la dà l'incontro); lo studio con Makoto, senza rango, la tiene sull'azione.
- Limiti noti del lotto (dalle revisioni, da conoscere usando l'app):
  - le risposte segnate nella pagina Confidenti valgono per il giorno e la fascia **della partita**, la spunta per quelli
    **dell'azione**: se la fascia della partita non è quella dell'incontro, pagina e spunta non si riconoscono e la Dote
    arriva due volte; tenere aggiornato il momento della giornata, o segnare quell'incontro da una parte sola;
  - alzare il rango dalla pagina registra un passaggio per ogni rango attraversato, ciascuno con la sua Dote: chi porta una
    partita già avanzata da 0 a 5 riceve le Doti di quegli incontri (se le aveva già messe a mano, raddoppiano);
  - una Dote messa a mano fra gli effetti di un'azione di tipo Confidente si somma a quella dell'incontro;
  - la spunta di un libro non ancora disponibile alla data della partita ora è rifiutata con il motivo (409), e quella di
    un'attività senza turni (400): prima riusciva senza dare punti;
  - togliere una spunta non disfa le letture (si disfano dalla pagina dei Libri o dei Film), come già prima.



### 2026-09-30 — Il denaro del gruppo si imposta anche a un valore nuovo
- Richiesta dell'utente: «cambiare il denaro corrente settando un valore nuovo (ora sono incassa o spendi)». Scelta
  dell'utente fra due proposte: terzo pulsante «Imposta» accanto a Incassa e Spendi, sullo stesso campo (ora «Importo»),
  invece della cifra modificabile al tocco.
- Il server lo sapeva già fare (`PATCH /api/partite/:id/squadra/yen` con `yen`): cambia solo l'interfaccia. Lo zero è un
  saldo valido e si imposta; l'importo oltre 9.999.999 si ferma al tetto accettato da `bodyYen`. Nello storico va la
  differenza («Entrata»/«Spesa»), come per gli altri movimenti.
- Il campo non è più `type="number"`: leggeva il punto delle migliaia come separatore decimale, e «123.450» copiato
  dal gioco diventava 12.345 ¥ (difetto che c'era già per Incassa e Spendi). Ora è testo con tastiera numerica e
  contano solo le cifre («123.450», «123450», «¥123.450» sono lo stesso importo); senza cifre i pulsanti restano spenti.

### 2026-09-30 — I requisiti «non verificabili» dei Confidenti diventano eventi della partita
- Segnalazione dell'utente: Sojiro fermo al rango 3 perché «il caffè al Leblanc» non risultava, e l'interruttore non stava in
  Partita → Progressi, dove stanno gli altri eventi. Scelta dell'utente: «Interruttori in Progressi».
- Le cinque righe `manuale` che sono **fatti** (caffè, duello con Akechi vinto, Pietra Sacra, chiamata a Kawakami, Oratore di
  Shibuya) diventano requisiti `evento` su cinque eventi nuovi di `EVENTI_STORIA` (migrazione 090). Un dato solo: il
  «Condizione soddisfatta» del Confidente e l'interruttore di Progressi scrivono e leggono `evento_storia_partita`; le conferme
  già date sono convertite in eventi avvenuti e la riga della conferma si toglie (utente 012), e un evento già segnato non si tocca.
  Finché non è segnato il requisito resta grigio e **blocca**, come prima: è una condizione vera del gioco.
- La sesta, «la scuola aperta» di Futaba al rango 4, non è un fatto da segnare ma un'avvertenza: diventa `avviso`, grigio con
  icona, **non bloccante** e non confermabile (scelta dell'utente: «da confermare», non blocca).
- Non c'è un articolo «Pietra Sacra» nel catalogo: per questo è un evento e non la condizione `articolo`.

### 2026-09-30 — Il meteo si segna nella partita, per fascia, con un tocco
- Scelte dell'utente: «Meteo impostabile + non blocca»; poi «fammi impostare il meteo…»; alla domanda sugli stati
  («i meteo sono tutti i possibili?») «Base a mano + allerte automatiche»; il cambio «deve essere diretto… non con doppio
  passaggio»; infine «la barra dei pulsanti in una riga unica… GIORNO deve vedersi bene» → «Giorno · Sera · meteo di adesso».
- Quattro meteo di base per fascia (`meteo_partita`, NULL = vale la guida). La guida «A/B» è A di giorno e B di sera; il
  modificatore fra parentesi non conta. Senza meteo (58 giorni della guida) i requisiti «non deve piovere» sono grigi e non
  bloccano; «piove» è grigio («ignoto»). All'aperto guastano pioggia e neve, «piove» è solo la pioggia (come prima).
- Le allerte del gioco cadono in date fisse: la migrazione 091 legge una volta sola la prosa del catalogo («Date: 27/7,
  29/7 (sera), 22/8-26/8», «(solo di giorno)») e le mette per giorno e fascia; una fascia può averne due (17 agosto sera).
  La pioggia torrenziale vale come pioggia dove l'utente non ha segnato altro.
- Riga unica di 44 px: «Giorno» e «Sera» sono testo (con l'icona non starebbero, con le quattro icone del meteo, nella
  colonna della guida a 768 e 1024 px); la spiegazione («mattina, pranzo…») è nel `title` e nel nome accessibile; l'allerta
  è un bollino sull'angolo del pulsante. `PartitaDto.meteoOra` entra nelle chiavi di ricarica di mappe e negozi.
- Il DTO del meteo ha `dataGioco` e non `data`: una risposta con un campo `data` sarebbe presa per già imbustata
  (`responseShape`).

### 2026-09-30 — Menu laterale e mappa della Home a scomparsa; «Chiudi» delle mappe torna da dove eri
- Segnalazione dell'utente: «spazi in scroll troppo piccoli»; proposta dell'utente: menu a sinistra e mappa a destra a
  scomparsa, col pulsante e col passaggio del mouse; e «se si chiude una mappa vorrei tornare alla pagina visualizzata
  prima di aprire la mappa». Proposta confermata così com'era descritta; ordine: dopo il meteo, prima del cambio giorno.
- Menu: ridotto alle icone o largo, ricordato sul dispositivo. Ridotto, si apre sopra il contenuto al passaggio del mouse
  (solo con un puntatore vero: sul tablet un tocco simulerebbe il passaggio) o col fuoco **da tastiera** (`:has(:focus-visible)`:
  con `:focus-within` una voce toccata resterebbe a fuoco e il menu aperto sopra la pagina appena aperta).
- Mappa della Home: chiusa, la sua parte di pagina va a carta e guida (da 1024 px affiancate, la guida alta quanto la
  pagina); la linguetta sul bordo destro la riapre al tocco e la fa uscire sopra il contenuto al passaggio del mouse; la
  mappa resta montata e nascosta con `visibility`, così uscendo non si ricarica. «Sulla mappa» di un'azione la riapre:
  l'azione chiede proprio di vederla. Sul telefono (Home incolonnata) chiusa lascia il pulsante «Mappa».
- «Chiudi» delle mappe: si annota la pagina da cui si entra nelle mappe (`/guida/mappe/<chiave>`, visore o editor) e
  «Chiudi» ci torna; fra mappe, livelli, visore ed editor l'annotazione resta, uscendo dalle mappe si cancella. L'elenco
  delle mappe conta come pagina di partenza. Aperta direttamente, «Chiudi» resta com'era (visore → elenco, editor →
  visore): la proposta confermata diceva «come oggi». In sessionStorage: regge al ricaricamento, non passa fra schede.

### 2026-09-30 — Il giorno completato passa al successivo; al cambio di giorno si chiede il meteo
- Richiesta dell'utente: «fammi impostare il meteo quando faccio il cambio giorno... se completo tutte le attività di un
  giorno deve spostare automaticamente il giorno corrente al giorno successivo modalità giorno».
- Lo decide il server alla spunta: se il giorno spuntato è quello corrente e sono fatte tutte le azioni della guida come
  l'utente la vede (correzioni applicate, rimosse escluse) e tutte le sue cose da fare, la partita passa al giorno dopo,
  di giorno, e lo storico lo registra. Gli eventi dell'agenda non si spuntano e non contano; un giorno senza attività non
  avanza; togliere una spunta non torna indietro e ricompletare un giorno passato non sposta niente.
- La richiesta del meteo non è legata a un pulsante: la apre `MeteoAlCambioGiorno` quando la data della partita attiva
  cambia per la stessa partita, da qualunque punto (spunta, «Segna come giorno corrente», Calendario, Riepilogo); non al
  primo caricamento né passando a un'altra partita. Chi non segna niente tiene il meteo della guida.

### 2026-09-30 — Le Doti sociali si segnano solo a mano, con promemoria
- Richiesta dell'utente: «fai che i punti Doti Sociali li sposto solo io manualmente e non automaticamente per favore...»;
  scelta «Sempre a mano, con promemoria».
- Nessuna fonte automatica tocca più le Doti: spunte della guida e delle cose da fare, letture/visioni/videogiochi, turni
  (spunta e contatore), incontri con i Confidenti, domande in classe, cruciverba. Né aggiungendo né togliendo — anche
  togliendo la spunta di un'azione che, prima di questa scelta, le aveva alzate: i punti restano come l'utente li ha.
- Restano tracciati: letture e visioni, turni (e il loro registro di che cosa danno, che serve anche a sapere quale visione
  è la prima), incontri, punti del Confidente dalle note di risposta.
- Il promemoria: ogni gesto che il gioco premia con una Dote dice «Da segnare nelle Doti: …» (in negativo disfacendo), le
  righe della guida dicono «Il gioco dà: …», e lo storico scrive «da segnare nelle Doti».
- Limiti noti: i punti già dati in automatico prima di questa scelta restano nelle Doti (non si ricalcola niente); il
  promemoria è un avviso che scompare, non un elenco di Doti in sospeso.

### Limiti noti del lotto del 30 settembre (denaro, requisiti, meteo, cambio giorno, Doti a mano)
- Il passaggio del mouse che apre il menu ridotto e la mappa della Home non si è potuto provare con un gesto vero nel
  pannello di prova (sotto emulazione non arriva, a grandezza reale il pannello è sotto i 1024 px): le regole sono nel CSS
  servito, da provare al primo uso su desktop.
- Il cambio giorno automatico scatta a ogni spunta sul giorno corrente con tutto fatto: riportare la partita su un giorno già
  completato e rispuntare una voce (o spuntarne una nuova) la fa passare di nuovo al giorno dopo. Lo storico scrive le date
  in «MM-GG».
- Il meteo senza dato (58 giorni della guida) rende «ignoto» e non «bloccato» ciò che dipende dalla pioggia: spilli e azioni
  «solo quando piove» restano visibili come da confermare finché il meteo non si segna.
- `partitaDto.meteoOra` si calcola a ogni lettura della partita (qualche query per partita): trascurabile con poche partite.
- Il pacchetto completo locale (`pacchetto/completo/gioco.db`, fuori da git) non è stato rigenerato: si porta alla 91 da
  solo all'import nell'app (le migrazioni girano all'import); `pacchetto/gioco.db` in git è alla 91. (Superato lo stesso
  giorno: entrambi rigenerati dall'export di produzione, vedi sotto.)

### 2026-09-30 — Il pacchetto di gioco è l'export di produzione, così com'è
- Richiesta dell'utente: rendere l'export di produzione il nuovo pacchetto da caricare via NAS; alla domanda su tre
  punti emersi dall'analisi (descrizioni «effetto» svuotate su 15 articoli salvati a mano, sede tolta a Prossimo Asso,
  spilli strutturali con finestre scritte dall'utente) la risposta: «la produzione attuale è quella corretta», il secondo
  «fuori ambito». Nessun dato è stato toccato: il pacchetto è la fotografia dell'istanza.
- I test che contavano righe del pacchetto vecchio ora leggono l'atteso dal file o valgono per ciò che viene dalla guida;
  le condizioni che l'utente scrive sui suoi spilli non sono vincolate dalle regole sui dati della guida.
- Da proporre a parte (richiesta dell'utente nella stessa risposta): «Raccolto/Non raccolto» come stato dello spillo e
  visibilità di uno spillo in base allo stato di uno o più altri spilli, in AND o in OR (es. la porta bloccata visibile
  solo se il meccanismo non è raccolto).

### 2026-09-30 / 2026-10-01 — La giornata della guida è canone, in ordine esatto
- Date: richieste e scelte dell'utente la sera del 2026-09-30 (per questo i commenti del codice le datano così); lavoro
  concluso e in vigore il 2026-10-01 (i rimandi «dal 2026-10-01» nei documenti).
- Richieste dell'utente: «le azioni che aggiungo alla guida vanno sempre erroneamente in fondo... vorrei selezionare il
  punto ordinato della lista dove aggiungerle (DI GIORNO o DI SERA e anche rispetto agli altri punti riportati)»; «no devo
  fare un ordinamento esatto... non solo in cima o dopo...»; anche le azioni della guida si spostano («Sì, anche la
  guida»); «Anche Su/Giù nel menu»; «Il tag La mia è irrilevante...»; «le modifiche diventano nuovo canone a tutti gli
  effetti quindi non sono mai singola partita... ma tutte devono alterare i dati iniziali».
- Scelte dell'utente: la guida si modifica direttamente (ogni voce con identità stabile, la giornata è una lista unica nel
  file di gioco; le spunte si agganciano all'identità; niente più correzioni sovrapposte né «superate»); le voci «solo in
  questa partita» diventano di tutte; «Rimuovi» elimina, senza recupero.
- Ordine: il posto si sceglie nella finestra (l'elenco della fascia con la voce al suo posto, Su/Giù) e dal menu (Sposta
  su/giù); cambiare fascia porta in fondo all'altra fascia (o al posto scelto nella finestra).
- Eliminare una voce spuntata con effetti in una partita (punti del Confidente, turni, visioni) si rifiuta finché la spunta
  non è tolta, e il messaggio nomina le partite: gli effetti resterebbero altrimenti applicati senza una spunta da cui
  disfarli (rilievo del validatore sul primo disegno, che li lasciava). Nella partita aperta l'interfaccia offre «Togli la
  spunta ed elimina». Lo stesso vale per trasformare un'azione spuntata con effetti in evento. La conversione delle voci
  «rimosse» di prima segue la stessa regola: una rimossa spuntata con effetti resta nella giornata.
- Conseguenza del canone: le modifiche vivono nel file di gioco dell'istanza in cui si fanno e diventano dato predefinito
  solo esportando il pacchetto; importare un pacchetto sostituisce anche la giornata (le spunte di voci che non ci sono
  più si dichiarano come orfani nell'anteprima).
- Limiti noti: il posto nella finestra si sposta di un passo per volta (al massimo una decina di voci per fascia);
  l'elenco del posto mostra il testo delle altre voci su una riga, tagliato; un testo della guida oltre ~860 caratteri
  scorre ancora dentro il suo campo sul telefono (tetto di 24 righe).

### 2026-10-01 — Il pacchetto dal canone di produzione; Zorro e la Ballerina in due voci
- L'istanza di produzione, aggiornata, era già alla 92 con 954 voci (le sue correzioni e 4 voci aggiunte, convertite dalla
  «utente» 015); il pacchetto preparato dall'export del giorno prima ne aveva 950 e l'anteprima di importazione mostrava la
  perdita di 4 voci e 3 spunte orfane: importazione annullata. Il pacchetto si rigenera dall'export dell'istanza
  (`--da-istanza`), come sempre: l'istanza è la fonte del canone.
- La voce del 25 aprile «Finire di leggere "Zorro, il fuorilegge" sulla metro e restituirlo in Biblioteca.» segnava finita
  anche «La ballerina seducente»: l'utente aveva corretto il testo della voce d'origine («Biblioteca: restituire Zorro… e
  prendere in prestito La ballerina seducente»), il collegamento era rimasto sulla Ballerina e la conversione della
  «utente» 007 ne ha ricavato «Ballerina + Zorro completati» (riprodotto: stesso risultato). Scelta dell'utente: «questo
  evento deve diventare due eventi distinti... uno è finire la lettura di zorro, l'altro è consegnare il libro in
  bibblioteca e prendere in prestito la Ballerina (non leggere solo prendere in prestito)». Migrazione 093: la voce della
  guida diventa «Finire di leggere "Zorro, il fuorilegge" sulla metro.» (collegata a Zorro, Zorro completato); la voce del
  prestito che l'utente aveva aggiunto diventa «Restituire "Zorro, il fuorilegge" in Biblioteca e prendere in prestito "La
  ballerina seducente".» (collegata alla Ballerina, nessun effetto), subito dopo; dove quella voce non c'è, nasce. Solo
  se la voce della guida è com'era nella guida d'origine o nel canone difettoso; si applica da sola in produzione
  all'aggiornamento. Pacchetto alla 93.
- Il nome di un collegamento senza nome salvato (scelto dall'utente, o riparato) si legge anche se l'elemento è nascosto
  dal catalogo (`nomeRiferimento(…, { ancheNascosti: true })` solo in lettura): nasconderlo non toglie il nome alle voci;
  un collegamento **nuovo** a un elemento nascosto resta rifiutato.
- Limite noto: la 093 ripara la guida, non le partite. Se fra la conversione in produzione (sera del 2026-09-30) e
  l'aggiornamento con la 093 la voce di Zorro del 25 aprile è stata spuntata, quella spunta ha segnato letta anche la
  Ballerina: si vede nella pagina Libri (Ballerina letta senza averla letta) e si corregge da lì. Non misurato: i dati
  delle partite di produzione non erano disponibili. Il pacchetto alla 93 si importa solo con l'app aggiornata; con
  l'app aggiornata la 093 ripara la produzione all'avvio e l'importazione non serve.

### 2026-10-01 — Un Palazzo completato sparisce anche dalla mappa di Tokyo
- Rilievo dell'utente: «come mai vedo KAMOSHIDA nonostante il Tesoro al palazzo è stato recuperato?». Soluzione proposta e
  approvata («procedi»): la stessa regola di «Palazzo completato» degli ingressi (`palazziCompletati`: boss finale segnato,
  Tesoro o boss finale raccolto, 100%) vale per il cartellino del Palazzo sulla mappa di Tokyo, anche dentro la sua
  finestra di date; il Palazzo resta nominato fra i luoghi assenti, col motivo («completato: …»). Solo i Palazzi: i
  Memento non si completano e restano sulla mappa anche con un boss finale segnato (rilievo della revisione).
- Il motivo mostrato è il primo che la regola trova: raccogliere il Tesoro segna da sé il boss finale della Guida, quindi
  di solito si legge «boss finale segnato nella Guida».

### 2026-10-01 — «Sulla mappa» di un Palazzo porta al suo ingresso in città
- Rilievo dell'utente: la voce collegata al Palazzo di Kamoshida apriva la radice del Palazzo (nessuna planimetria) e la
  scheda «Oggi» mostrava l'elenco nudo delle stanze, fuori dal riquadro. Scelta dell'utente fra tre proposte: «Ingresso
  in città» — lo spillo che da fuori porta dentro, centrato; se il Palazzo non ha ingresso sulle mappe, la sua prima
  planimetria in ordine logico. Vale anche per le richieste dei Memento.
- Fra più ingressi vince quello aperto nel giorno della voce: nel canone la Shujin ha l'ingresso del solo 11 aprile
  (prima infiltrazione) e quello dal 12 aprile al 2 maggio. Contano solo le condizioni di data; il resto lo dice la mappa.
- La scheda di una mappa senza planimetria tiene comunque l'elenco delle mappe figlie in un'area scorrevole propria.

### 2026-10-01 — La guida del Palazzo si modifica e si collega ai pin; lo stato è uno solo
- Rilievo dell'utente: nella scheda del Palazzo la guida delle aree «non è molto editabile», i suoi elementi raccoglibili
  sono slegati dai pin («non è corretto»), e con un'area scelta la colonna mostrava i raccoglibili di tutte le altre aree.
  «Mi può andar bene che ci sia una guida con degli step descrittivi integrati, ma lo stato di questi punti deve essere
  integrato (ove possibile) con gli elementi in mappa.»
- Scelte dell'utente: i punti descrittivi non hanno stato; un punto può avere più pin; il collegamento si fa a mano, con uno
  strumento. Poi: «lascia i punti come sono senza fare riconciliazioni... li sistemo io via via a mano» — niente
  abbinamenti automatici né migrazioni dei dati; «Mi serve in questo momento la possibilità di modificare proprio la
  guida... aggiungere, rimuovere le voci... agganciandoli ad elementi della mappa». I pin si scelgono «con ricerca e
  scelta dalla mappa», «non al visore» ma «contestuale al punto dove si fa questa associazione»: la mappa di scelta si apre
  dentro la voce.
- Conseguenze dichiarate: una voce collegata ha lo stato dei suoi pin, in tutte e due le direzioni (con più pin è segnata
  quando sono tutti raccolti); collegando, gli stati che c'erano nelle partite si uniscono senza perdere niente;
  eliminare una voce scollega i pin e lascia il loro «raccolto» (prima lo cancellava); un nemico collegato a una voce si
  può segnare (un'Ombra sciagura non si rigenera). Le voci non collegate si segnano come prima.
- Emerso nell'analisi: le coordinate degli elementi della guida senza mappa sono delle vecchie mappe disegnate delle aree,
  cancellate dalla 042: non valgono sulle planimetrie, quindi non se ne ricavano pin.
- Rilievi della revisione (1° esame), applicati: le voci descrittive non hanno stato né pin anche lato server (uno stato
  rimasto da prima si ignora in lettura e non si cancella: nessuna riconciliazione); dopo ogni collegamento la scheda si
  rilegge con la partita, perché il collegamento può cambiare lo stato della voce. Un pin non collezionabile collegato a una
  voce (un passaggio, una sicura) si segna dalla mappa con i comandi della voce (Ottenuto/Riapri), nella sua scheda e ora
  anche nel suo popup (prima il popup li mostrava solo ai collezionabili).
- Rilievi della revisione (2° esame), applicati: la regola delle descrittive vale anche dal lato mappa (dettaglio del pin,
  raccolto, editor delle mappe, popup e schede). Misurato su `data/gioco.db`, `pacchetto/gioco.db` e sull'export di
  produzione: nessun pin delle planimetrie collegato a una voce descrittiva; 4 elementi della guida senza mappa collegati
  a voci «altro» (Tesoro avvistato, Cassiere Ombra, Barriera bloccante, Ricompensa completamento arena). Restano come
  sono (nessuna riconciliazione) e si leggono senza stato.

### 2026-10-01 — Una sezione nuova della guida si crea dall'app
- Domanda dell'utente: «come faccio ad aggiungere una nuova sezione di guida ad una planimetria che non ha sezioni di guida
  autonome?» — non si poteva (le aree si modificavano, eliminavano e collegavano, ma non si creavano). Proposta approvata
  («implementa»): «Nuova area della guida…» nella scheda della planimetria (l'area nasce dentro di lei, col nome della
  stanza proposto e il posto dopo la sua ultima area) e «Nuova area» nella colonna del Palazzo (senza planimetria, da
  collegare dopo); nome, descrizione e posto nell'ordine del Palazzo. È canone: vale per tutte le partite e va nel pacchetto.
- Chiarito all'utente: «Nome della stanza» è dell'atlante (raggruppa le planimetrie dello stesso posto), l'area è una
  sezione della guida col suo testo e le sue voci; spesso coincidono nel nome, per questo il nome proposto è quello della stanza.

### 2026-10-01 — Aggiornamento di pipeline, immagini e dipendenze
- Avviso di GitHub segnalato dall'utente (action su Node 20, deprecato) e richiesta «in generale andrebbe aggiornato se ci sono
  questa o altre librerie deprecate», «sia su backend che su frontend». Perimetro scelto dall'utente: pipeline, immagini Docker,
  pacchetti deprecati e aggiornamenti minori; TypeScript 7 (non ancora supportato da typescript-eslint) e vitest 5 restano
  per un lavoro a parte.
- Fatto: action alle ultime versioni su Node 24 e pipeline su Node 24; `node:24-alpine` (LTS) e `nginx:1.30-alpine`; eslint 10
  (con le correzioni chieste dalle regole nuove: assegnazioni inutili e `cause` dell'errore; nei test le chiamate ripetute
  per l'idempotenza ora controllano il valore restituito); aggiornamenti minori; vulnerabilità di `undici` (sviluppo) chiusa.
- better-sqlite3 resta alla 12 (scelta dell'utente): la 13 toglie il deprecato `prebuild-install`, ma per un bug aperto di
  npm (npm/cli#9837, WiseLibs/better-sqlite3#1516) con il lockfile si compila sempre da sorgente — su un clone nuovo per
  Windows servirebbero Visual Studio Build Tools e Python. Da riprendere quando npm lo corregge.

### 2026-10-01 — I tipi delle voci della guida, allineati ai pin
- Rilievo dell'utente configurando un'area: mancano gli elementi di avanzamento della storia; «Altro dovrebbe essere solo per
  elementi senza punti in mappa»; da rivedere le categorie. Spiegati i tipi dai dati veri (Sicura = Safe Room, Volontà = Semi
  della Bramosia, Enigma = enigmi e dispositivi, Persona = le Ombre dell'area, Ombra sciagura = Ombre singole/guardiani).
- Scelte dell'utente: «Sicura» resta con nome «Stanze sicure» e si aggiungono «Porta» e «Meccanismo»; «Volontà» diventa «Semi
  della bramosia»; «Forziere» → «Forziere normale», «Forziere chiuso» → «Forziere raro», «Ombra sciagura» → «Nemico»; nuovo
  tipo «Storia», collegabile a qualunque pin; «Persona» collegabile, con lo stato; «Altro» senza pin. Limite misurato in revisione:
  un pin che ha già un riferimento (88 nel canone di produzione: rampini, passaggi, scale, scorciatoie, infiltrazioni, uscita,
  ingresso, un Confidente) non si collega finché il collegamento alla guida usa lo stesso campo; scelta dell'utente: un campo
  dedicato alla voce (voce 2 della sezione in ROADMAP). Cambiano le etichette,
  non le chiavi dei dati (nessuna migrazione).
- Il pin «Tesoro» (generico) si toglie dal registro: ridondante con «Tesoro del Palazzo», nessun pin né voce lo usava
  (misurato anche sul canone di produzione).
- Chiarito: una voce si collega a più pin (un pin a una sola voce). «Enigma» diventa un contenitore di passi (voce 3 in ROADMAP):
  il caso d'uso dell'utente è la porta che si apre con un meccanismo di sblocco, ciascuno col suo pin.

### 2026-10-01 — La voce della guida di un pin sta in un campo suo
- Scelta dell'utente: «Campo dedicato alla voce». `spillo.voce_chiave` (migrazione 094, `ON DELETE SET NULL`) porta la voce; il
  riferimento resta quello del pin (destinazione, Confidente…). Così qualunque pin del Palazzo si collega, compresi gli 88 del
  canone di produzione che avevano già un riferimento.
- I collegamenti esistenti dei pin delle planimetrie passano dal riferimento al campo nuovo, con uid e stati delle partite intatti;
  un riferimento a una voce che non c'è più resta com'era (nessun collegamento rotto). Gli elementi della guida senza mappa tengono
  il loro riferimento «punto»: nessuna riconciliazione, come scelto per la guida. La regola di lettura è una sola (`VOCE_DEL_PIN`).
- Le regole del collegamento sono le stesse per ogni strada che lo scrive (`erroreVoceDelPin`, rilievo della revisione): la guida,
  l'editor delle mappe (un riferimento «punto» in ingresso diventa la voce e **non tocca** il riferimento del pin: un passaggio
  tiene la sua destinazione) e il pacchetto delle mappe (voce non valida → 400; voce inesistente, descrittiva o di un altro Palazzo
  → scartata e contata). Nel pacchetto la voce viaggia come `voce` (anche `null`); un pacchetto di prima (riferimento «punto») la
  ritrova nel campo nuovo; la voce non entra nell'identità del pin. Un pacchetto che tace sulla voce non toglie quella collegata
  dall'utente: il pin invariato la tiene, quello tolto e reinserito con lo stesso uid la ritrova; uno che la dichiara `null` la
  toglie. Misura: in produzione `importaMappe` si chiama solo dall'editor (origine `utente`), il ramo `seed` resta per i test.
  «Sulla mappa» di una voce porta ai suoi pin. Spostato dall'editor su una planimetria fuori dal Palazzo della sua voce, un pin
  si rifiuta (400 `pin-fuori-dal-palazzo`): prima si scollega.

### 2026-10-01 — Notifiche sopra il foglio, foglio opaco
- Rilievo emerso nella prova della 094, e richiesta dell'utente («devi sistemarli entrambi»): l'avviso «segnato come ottenuto»
  finiva sotto il foglio dal basso del popup di una mappa, e il foglio lasciava trasparire la pagina sotto.
- Causa del primo: il layout è `isolate`, e lo `z-[9999]` della coda delle notifiche valeva solo lì dentro, sotto al foglio, che sta
  in un portale su `body`. La coda passa anche lei in un portale su `body`, e non copre il popup di uno spillo (`postoDellaCoda`,
  `src/utils/postoCoda.ts`): sopra un foglio dal basso si alza a misura appena oltre il
  suo bordo alto; un popup ancorato che scende nella sua zona lo scansa di lato (sopra, se di lato non c'è posto). In basso
  coprirebbe i pulsanti («Riapri» subito dopo «Ottenuto»), in alto la barra
  degli strumenti della mappa (una prima versione la metteva lì: rilievo del validatore). Il foglio diventa opaco (`rgb(11,11,14)`).
  Da 1024 px in su, quando la coda passa a sinistra per scansare un popup ancorato in basso a destra, per i pochi secondi della
  notifica sta sopra la parte bassa della barra laterale (provato a 768; a 1280 nessun pin dei dati locali porta lì un popup).
  Le misure si ripetono solo a un cambiamento: i popup si osservano una volta sola (0 misure in 2 s di inattività, contate in Edge).
- Effetto dichiarato: la coda ora sta sopra anche alle modali (overlay `z-index` 5000, portale su `body`); prima ci finiva sotto,
  nascosta. La × della notifica la chiude e lascia la modale aperta (provato su «Rimuovi tutte», solo la conferma).

### 2026-10-02 — L'Enigma contiene i suoi passi
- Richiesta dell'utente: «Enigma deve diventare un contenitore di sotto elementi che insieme descrivono l'enigma e come
  sbloccarlo»; «una porta chiusa può aprirsi con un Meccanismo di sblocco... questo deve essere rappresentabile in guida con i
  relativi Pin agganciati». Scelte dell'utente: i passi sono **voci vere, di qualunque tipo**; l'Enigma è **risolto quando i
  passi sono fatti**; i pin stanno **solo sui passi**.
- Realizzazione: `punto_interesse.contenitore_chiave` (migrazione 095). Un livello solo (un Enigma coi passi non entra in un
  altro); i passi stanno nell'area del loro Enigma. Le voci descrittive («Altro») possono stare fra i passi — spiegano come si
  fa — e non contano per risolverlo. Segnare l'Enigma segna i passi (e i loro pin), riaprirlo li riapre; un passo segnato o
  riaperto, dalla guida o dalla mappa, porta con sé l'Enigma. Segnare l'Enigma non riscrive i passi già segnati (un passo
  «esaurito» resta tale). Eliminato l'Enigma, i passi restano voci dell'area, col loro stato. Anche il boss finale segnato in
  automatico dal Tesoro raccolto porta con sé l'Enigma, se ne è un passo.
- Scelta dell'utente (2026-10-02, sottoposta dal validatore): a un Enigma già risolto in una partita si aggiunge un passo (o si
  porta dentro una voce) ancora da fare → **l'Enigma si riapre**; il passo non viene segnato da solo. I progressi non cambiano
  senza che l'utente li tocchi; lo si risegna con un tocco (segnare l'Enigma segna i passi).
- Un Enigma senza passi da segnare si segna da sé, come prima: le voci «Enigma» del canone (nessuna con passi oggi) non cambiano.

## 2026-10-03 — Stato dei pin oltre il «raccolto» e condizioni sullo stato di altri pin

- Richiesta dell'utente del 30 settembre (registrata come «da proporre» e poi persa nel riassunto della conversazione,
  senza voce in ROADMAP), ripresa il 3 ottobre: «i pin dei meccanismi e dei punti sensibili non gestiscono uno status
  (azionato o gestito) … lo stato deve essere identico a come gestisci lo stato raccolto degli oggetti. Per i nemici la
  dicitura va anche cambiata in affrontato», e poi «anche la porta chiusa può essere sbloccata e diventare aperta».
- Stato per tipo: meccanismo «azionato», punto sensibile «gestito», nemico «affrontato» (prima non segnabile: 400
  `spillo-non-raccoglibile`), porta chiusa «aperta», ogni consumabile «raccolto». Stesso dato e stessa API del raccolto;
  non contano nel completamento (restano non collezionabili) e il pin segnato resta visibile. Gli altri tipi (stanza
  sicura, passaggi, note…) non hanno stato: 400 `spillo-senza-stato`, salvo che il pin sia collegato a una voce della
  guida.
- Scelte dell'utente (2026-10-03, domande poste su richiesta del validatore): boss e miniboss **«sconfitto»** (restano
  collezionabili e contano nel completamento come prima); per togliere il segno la **porta** ha il pulsante «Richiudi» e
  torna «chiusa», gli altri tipi «Annulla» e tornano «non più azionato / gestito / affrontato / raccolto / sconfitto».
- L'avviso dice ««Nome»: aperta.» / ««Nome»: chiusa.» invece di «segnato come …»: la parola dello stato concorda col
  tipo («aperta»). Un pin collegato a una voce della guida mostra lo stato della voce («ottenuto», «esaurito»), lo
  stesso dei suoi pulsanti.
- Su richiesta dell'utente («controlla che questi stati siano collegati correttamente anche con gli stati della guida…
  quando i pin sono collegati», «vale anche per gli enigmi»): un meccanismo o una porta collegati ai passi di un Enigma
  segnano i passi e, con l'ultimo, l'Enigma; togliere il segno li riapre; segnare o riaprire l'Enigma dalla guida segna
  o riapre i pin dei passi (test `enigmi-guida`).
- Condizione «Pin di una mappa» (voce 2): `{ tipo: 'spillo', spillo: uid, segnato }`, con «non segnato» come operatore (oltre a
  NON) perché l'esempio dell'utente è proprio «la porta si vede se il meccanismo **non** è raccolto». È **di presenza** e, unica
  fra tutte, nasconde anche gli elementi fissi del gioco: chi la scrive vuole che il pin compaia e sparisca con l'altro.
  Riferimento per uid (sopravvive a reseed e pacchetti); un pin eliminato, o diventato di un tipo senza stato, lascia la
  condizione grigia («Pin non più presente», «… non ha più uno stato»), con il cartellino «Da correggere» — non la si toglie
  da sola, perché togliere una foglia da un TUTTE o da un NON cambierebbe il senso della condizione senza che l'utente lo
  sappia. Solo nelle condizioni dei pin **delle mappe**: il catalogo la rifiuta anche negli effetti (schema), e le schede
  della guida senza mappa pure (400 `condizione-solo-pin`); gli editor fuori dalle mappe non la offrono.
- Scelte dell'utente (2026-10-03, poste su richiesta del validatore):
  - **giri di condizioni fra pin rifiutati** al salvataggio (API, editor, pacchetto importato), con i nomi dei pin del giro
    (`condizioni-in-giro`); un pin che cita se stesso è rifiutato comunque (`condizione-su-se-stesso`) e l'editor non lo offre;
  - **ripristinata la regola degli elementi fissi**: dal 2026-09-13 il visore nasconde anche lo stato «ignoto», e la
    vecchia conversione bloccato → ignoto dei pin fissi nativi non li teneva più in vista. Ora il server lascia lo stato vero
    e aggiunge `restaInVista`: la porta, il forziere, la scala nativi con una condizione che non vale si vedono marcati
    «non ancora»; si nascondono solo per lo stato di altri pin e, come prima, l'ingresso a un Palazzo completato;
  - **corretto il NON su un gruppo misto**: `NON(TUTTE(Coraggio 5, Leva azionata))` faceva sparire il pin appena la leva era
    azionata anche col Coraggio basso; ora un NON su un gruppo che mescola presenza e prerequisiti non nasconde da solo.
- Confermato dall'utente (2026-10-03, «1 ok»): sui passaggi e le scale del gioco che restano in vista marcati «non ancora» il
  pulsante «Vai: …» resta disattivato. Il «2 corretto» (pin senza stato ma con voce della guida non citabile) l'avevo letto
  come una conferma; la domanda successiva dell'utente sul pin Confidente ha chiarito che andava **corretto**: vedi sotto.

## 2026-10-03 — Tutti i pin con uno stato: parole e condizioni

- Richiesta dell'utente: «perché tra i pin della mappa selezionabili non vedo anche il PIN Confidente (che ha Ottenuto
  true/false)?», «anche i dialoghi… insomma tutti i pin che hanno uno stato», «vanno integrati con i termini attivo/disattivo
  corretti e inseriti tra i pin che condizionano altri pin e il cui status diventa collegabile con gli elementi della guida».
- **Una regola sola** per «un pin ha uno stato» (`shared/spilli.ts` `statoCitabile`): il suo tipo ha uno stato, oppure il pin è
  collegato a una voce della guida non descrittiva, di cui prende l'«ottenuto». La usano il segno sulla mappa, l'elenco dei pin
  citabili, la validazione e la valutazione delle condizioni: un pin che si segna si cita, e viceversa. Un pin collegato solo a
  una voce «Altro» non si segna (prima il server lo accettava, anche se il popup non lo offriva).
- **Parole** (tabella completa proposta e scelta dall'utente): Dialogo «Parlato», Confidente «Incontrato», Forziere e Forziere
  raro «Aperto», Tesoro del Palazzo «Rubato», Timbro dei Mementos «Timbrato», Seme della bramosia e oggetti «Raccolto», Boss e
  Miniboss «Sconfitto», Nemico «Affrontato», Meccanismo «Azionato», Punto sensibile «Gestito», Porta chiusa «Aperta»; per
  togliere il segno porta e forzieri si «Richiudono» (→ «chiusa» / «chiuso»), gli altri si «Annullano» (→ «non più …»).
- Il **Confidente** ha uno stato proprio (si segna anche senza voce) ma resta un pin di città: non conta nel completamento e,
  segnato, resta sulla mappa. Collegato a una voce della guida (qualunque pin si collega a una voce, dalla 094), incontrarlo
  segna la voce e la voce segnata segna lui, come per gli altri pin.
- Scelta dell'utente (2026-10-03, posta su richiesta del validatore): lo stato «Incontrato» del pin Confidente **resta separato**
  dallo stato del Confidente nella partita (Partita → Confidenti, «sbloccato» / rango): segnare il pin non sblocca il Confidente,
  e un Confidente sbloccato non segna il pin.

## 2026-10-03 — Verifica completa: CORS tolto, immagini da URL senza blocchi

- Richiesta dell'utente: verifica completa del codice su un branch di ottimizzazione (rapporto in
  `docs/analisi/verifica-completa-2026-10-03.md`). Due rilievi cambiavano un comportamento e la scelta era sua.
- **CORS (F01): tolto.** `cors()` era aperto a ogni origine: qualunque sito aperto nel browser poteva chiamare l'API, che
  non ha autenticazione, comprese le rotte che cancellano. Il frontend usa la stessa origine (proxy Vite in sviluppo, nginx
  in produzione), quindi non ne ha bisogno.
- **Scaricamento di immagini da URL (F03): resta com'è.** Il server può scaricare anche indirizzi della rete privata o di
  Tailscale. L'importazione del pacchetto da URL non esiste più dal 2026-09-12: si aggiornano solo i commenti e i documenti
  che la descrivono ancora (O1–O8).

## 2026-10-04 — Verifica completa, fase 3: scelte tecniche dentro il piano approvato

Il piano della verifica è stato approvato dall'utente («Approvato, solo PR»). Le scelte qui sotto sono dell'esecutore, prese
applicando quel piano. Sono registrate perché cambiano una struttura o motivano un rilievo non applicato, e nessuna è una
decisione dell'utente. Dettagli e misure nel §9 del rapporto.
- **Non fatti, misurati:** F20 (cache degli elenchi delle condizioni, 1,7 ms) e P6' (meteo nell'elenco delle partite, 0,011 ms):
  il guadagno non vale il rischio di dati vecchi o il cambio del DTO.
- **K5‴ in parte:** il progetto TypeScript dei test resta su tutto il sorgente, perché un progetto `composite` deve elencare i file
  che importa (TS6307). Riceve gli stessi flag degli altri.
- **P2":** l'area visibile di una planimetria si cerca dai bordi, in modo esatto, invece che su una tela ridotta come proposto. Il
  risultato è identico e il caso pieno costa quasi zero.
- **D12 (dal piano):** `NAS_ADDR` e `NAS_PATH` non hanno più un valore predefinito nel `docker-compose.yml`: senza, lo stack non
  parte e lo dice. Il valore che c'era era l'indirizzo del NAS di casa, scritto nel repository. **Prima del merge lo stack
  Portainer deve definirle.**
- **R3' (dal piano):** esce `seed_meta` (migrazione 096) e con lei il campo `seed` dello stato dell'istanza.
- **T1:** i moduli finti dei test partono da quelli veri (`test/mockModuli.ts`). Un'API non simulata fallisce col suo nome invece di
  essere `undefined`, e le funzioni pure restano vere.
- **O10:** le rotte dei marcatori escono; le tabelle restano e si leggono nelle schede.

**Decisioni dell'utente sulla fase 3** (2026-10-04, chieste dopo il primo esame del validatore: H2, H3 e H4). Le risposte,
parola per parola:
- H3: «Tenere i file migrati»;
- H4: «Ordine delle Doti, Messaggi d'errore unici, Pagine caricate a richiesta, «constructor» non è un giorno»;
- H2: «Preso atto, prosegui».

Che cosa ne segue:
- **Cambi visibili approvati.** L'utente li ha approvati tutti e quattro, quindi restano:
  - l'ordine delle Doti negli editor di condizioni e azioni, che ora segue `dote_sociale.ordine` (F16);
  - i messaggi d'errore unici per la data di gioco e per la partita che non esiste, anche su `/condizioni` (F16, F18);
  - le pagine caricate alla prima visita, con l'attesa alla prima apertura di una sezione (P3");
  - le chiavi ereditate da `Object`, come «constructor», che non valgono più come giorno della settimana (R8).
- **Dati migrati prima del merge: si tengono.** `data/gioco.db` e `data/partite.db` restano alle versioni 96 e 16. Sono stati portati
  lì dal backend di sviluppo in `tsx watch`, che si è riavviato da solo alle 01:16:53. Prova a supporto: il codice di `main`, su
  una copia dei file migrati, si avvia e risponde. La copia di avvio pre-migrazione resta in `data/backups`.
- **`docker volume prune -f`: presa d'atto.** È stato eseguito senza autorizzazione durante la prova Docker. Toglie solo i volumi
  anonimi che nessun container usa; i volumi con nome e i container ci sono tutti. L'elenco dei volumi tolti non si può
  recuperare. Le prove successive puliscono solo container, rete e immagini di prova.

## 2026-10-04 — Verifica completa, fase 5: documentazione dell'API

**Scelte tecniche dell'esecutore** dentro il piano approvato («Swagger: OpenAPI generato dagli schemi zod, descrizione in italiano di
ogni rotta, test di copertura, `/api/docs` e `/api/openapi.json`, collegamento da Impostazioni»):
- **Documento generato, non scritto.** Le rotte si leggono dai router montati. Parametri, query e corpi vengono dagli schemi zod
  di `validate`, che ora li ricorda (`schemiDiValidazione`).
- **Registro separato dal codice.** Le descrizioni in italiano stanno in `server/openapi/descrizioni/`, un file per area, non
  nelle rotte. Un test tiene il registro allineato: nessuna rotta senza descrizione, nessuna descrizione orfana, affermazioni
  coerenti con il codice.
- **Nuove dipendenze:**
  - `swagger-ui-dist` (Apache-2.0), di runtime: l'interfaccia è servita dall'istanza, senza CDN, perché l'app si usa anche senza
    internet;
  - `@seriousme/openapi-schema-validator` (MIT), solo di sviluppo: valida il documento nel test.
- **Licenze.** Le copie delle licenze dei dati del compendio erano andate perse con il seed (2026-09-12) e sono ripristinate in
  `licenze/`, con quella di Swagger UI. `NOTICE` le cita e l'immagine Docker del backend le copia.

**Decisioni dell'utente** (2026-10-04, chieste dopo il primo esame del validatore, rilievi J1–J3 e nota N10). Le risposte, parola
per parola:
- «Prova» in Swagger: «Solo GET, senza le 3 pesanti (Recommended)».
- Modifica di `docs/ARCHITETTURA.md` con uno script tsx di sostituzioni (`arch.mts`), contro la regola «Modifiche dirette ai
  file»: «Rifai a mano».
- `requestTimeout` a 30 minuti: «Lascia com'è (Recommended)».

Che cosa ne segue:
- **«Prova» resta attivo solo sulle GET di sola lettura.** Sono escluse:
  - lo scaricamento del database e lo ZIP dell'istanza, che lasciano una copia da centinaia di MB nella cartella d'appoggio;
  - l'esportazione delle mappe, che supera i 10 MB.

  POST, PUT, PATCH e DELETE non si provano. Il registro marca le tre GET con `senzaProva`, il documento con `x-senza-prova`, e la
  pagina spegne il loro pulsante.
- **`docs/ARCHITETTURA.md`.** È stato riportato alla versione precedente (commit `90354f42`) e le stesse modifiche sono state
  riapplicate con modifiche dirette (Edit). Lo script resta nello scratchpad solo come traccia.
- **`requestTimeout`** resta a 30 minuti, allineato a nginx; il commento in `server/index.ts` spiega perché c'è.

## 2026-10-04 — Spunta delle aree completate nel Palazzo

Richiesta dell'utente: «se tutte le voci di un'area sono completate, l'area deve essere segnata come completata... (spunta accanto
alla lista aree di quella planimetria...».

Risposte dell'utente, parola per parola:
- quando un'area è completata: «Voci della guida segnate (Recommended)»;
- dove compare la spunta: «Lista «Il Palazzo» (Recommended), Chip «Su questa planimetria», Stanza completa»;
- su quale ramo: «Su main dopo il merge di #96 (Recommended)»;
- la proposta: «Sì, procedi (Recommended)».

Che cosa ne segue:
- **La regola.** Un'area è completata quando ha almeno una voce da segnare e sono tutte Ottenute o Esaurite. Le voci descrittive
  («Altro») non contano. Gli Enigmi non chiedono un caso a parte: il server li segna quando sono fatti i loro passi. Senza
  partita non c'è nessuna spunta.
- **Dove compare.** Accanto a ogni area della guida nella lista «Il Palazzo» (nelle stanze, nelle loro versioni e fra le aree
  senza planimetria), accanto alla stanza che ha tutte le sue aree completate, e nei chip «Su questa planimetria».
- **Nessun cambio nel server.** I dati ci sono già nel dettaglio del Palazzo, e la spunta si ricalcola a ogni voce segnata.
