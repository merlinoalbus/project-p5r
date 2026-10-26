# Registro delle decisioni — project-p5r

Formato: data · decisione · motivazione · chi (U = utente, IA = assistente su proposta validata dall'utente).

> **SOSPENSIONE (24/10, su ordine dell'utente):** «Sospendi tutte le mie approvazioni fino ad una verifica sul tuo operato e le tue affermazioni fino ad ora». Le righe del 2026-10-24 (U e IA) non valgono come approvazione finché la verifica non è chiusa e l'utente non le riconferma. Niente rilascio, push o lavoro nuovo basato su di esse.

| Data | Decisione | Motivazione | Chi |
|---|---|---|---|
| 2026-10-26 | L13, decisione 19 — effetti di stato su voci già spuntate. (1) «Subito al salvataggio»: un effetto di stato aggiunto, cambiato o tolto nella guida su una voce già spuntata vale subito in ogni partita con la spunta, con il «prima» registrato; togliendo la spunta si annulla come gli altri. (2) «Elenco da approvare»: per le voci spuntate in passato con effetti mai applicati, un censimento a ogni avvio e dopo l'importazione mette nell'elenco della partita ciò che manca, voce per voce; si applica solo ciò che l'utente approva. Scelte di dettaglio (IA, nel progetto dell'architetto): gli yen seguono la nozione unica della decisione 18; l'articolo attestato dalla voce spuntata si segna senza il controllo della disponibilità di adesso, solo per queste due vie; la Fortuna solo nel giorno della spunta; un rifiuto del dominio al salvataggio va nell'elenco invece di fermare il salvataggio; lo stesso uid non cambia famiglia mentre una partita ne tiene il segno | Segnalazione dell'utente: «al momento non viene aggiornato il Compendio Personale» (gli effetti salvati su voce spuntata erano ignorati in silenzio fino a togliere e rimettere la spunta); un dato salvato non cambia in silenzio, quindi il passato solo su approvazione | U (1, 2); IA (dettagli) |
| 2026-10-26 | Effetto «Persona registrata» con la scorta. (1) Formato `{tipo:'persona', persona, scorta?:true, livello?}`: assente = solo compendio (come prima, righe salvate invariate); `livello` solo con la scorta, assente = livello base, mai sotto (400 `livello-sotto-base`). (2) La scorta è uno stato a sé in `utente.effetto_stato_voce` (riga `<uid>:scorta`, tipo `persona-scorta`), scritta con `aggiungiPosseduta` dopo il compendio; togliendo la spunta l'esemplare esce solo se intatto, altrimenti resta (con la registrazione nel compendio) e lo si dice. (3) Voce già spuntata: UN SOLO meccanismo, quello della decisione 19 (salvataggio subito, elenco del passato da approvare); il gesto «Applica alla partita» sulla voce del ramo `lavoro-persona-scorta` è tolto nell'unione e la scorta passa per `applicaUnEffettoDiStato` e per l'elenco del passato. (4) Decisioni del PM per l'utente: la scorta piena non blocca né la spunta né il salvataggio né l'approvazione, la Persona entra e l'avviso dice «oltre la capienza n/N»; un effetto tolto da una voce già spuntata si annulla subito (solo ciò che la spunta aveva aggiunto e se intatto), come l'applicazione al salvataggio; cambiato, se ne vanno solo le parti superate (la Persona di prima, la scorta tolta). (5) Schede degli effetti senza il titolo che ripete la frase; la nota della voce spuntata nomina solo i tipi di effetto che la voce ha; la scelta della scorta resta modificabile per una Persona non più nell'elenco; per un Demone del Tesoro solo la nota. Da confermare: compendio senza istantanea (livello e skill si fissano con «Registra» dalla scheda in scorta). | Richiesta dell'utente («devo poter scegliere se l'effetto si fermi solo al Compendio o se quella persona viene anche aggiunta alla scorta»; «le etichette di testo devono essere visibili solo se hanno senso»); decisione 19 di L13; un dato in un solo punto (scorta e compendio con i loro servizi); un dato salvato non si cambia in silenzio. | U (richiesta, decisione 19) / PM per l'utente (scorta piena, effetto tolto) / IA (dettagli) |
| 2026-10-25 | L13, ondata 4a — modulo della voce. (1) Gli effetti di una voce sono UN elenco, tutti allo stesso livello e con un solo editor per tipo; non esiste più un effetto «principale» ricavato da tipo e collegamento: resta solo l'indicazione «segue Quale» sull'effetto che corrisponde esattamente a tipo e «Quale», che cambiando «Quale» si aggiorna (se nato nella finestra si toglie, se salvato e dello stesso genere si riscrive col suo UID; un effetto salvato che non corrisponde non si tocca mai). Il formato degli effetti non cambia. (2) All'apertura la voce si mostra come è salvata: il collegamento non si ricava più dagli effetti (prima, salvando, si scriveva un collegamento che l'utente non aveva toccato); se gli effetti ne indicano uno solo la finestra lo propone con «Collega». (3) Gli articoli di un negozio in una voce d'acquisto restano effetti «articolo» (nessun dato nuovo): «Acquisti da questo negozio» ne è la vista con copie, ordine e totale, e l'elenco degli effetti non li ripete; un articolo scelto due volte aggiunge una copia. Il totale elenca tutti gli articoli con le copie e la somma (stessa funzione nel Diario). (4) Proposte «da completare» in una tabella di gioco dedicata, `proposta_conversione_voce` (migrazione 236): il contenuto non si modifica mai (trigger), la decisione la chiude (applicata o scartata, mai riaperta) con l'esito; una proposta sbagliata si sostituisce con una nuova. La vecchia `proposta_effetto_voce` (136) resta per i 20 candidati Aojiru già decisi. Applicare passa da `aggiornaVoce` (la stessa scrittura della finestra) e chiude la proposta nella stessa transazione; un effetto identico già presente non si aggiunge due volte; un effetto senza dati da completare va applicato com'è (per cambiarlo, «Modifica»). Solo preparazione: rotte fuori dall'elenco del giocatore, interfaccia esclusa dal bundle di rilascio, tabella svuotata nella copia dell'edizione | richieste dell'utente: due acquisti della stessa voce in due punti con etichette diverse e un riepilogo che ne mostra uno; più articoli da un negozio in una voce; un dato in un solo punto; proposte da approvare nell'app | U («approvo il piano L13 … prosegui ondata per ondata»; risposta promessa sugli acquisti da un negozio), scelte di dettaglio IA dichiarate qui |
| 2026-10-25 | L13, ondata 3 — correzioni dopo la verifica avversariale (scelte di dettaglio). (1) Gli yen di una Richiesta completata sono una proposta «Applica» con causa `richiesta` (decisione 3: le ricompense le applica solo la Richiesta completata): il vocabolario chiuso `utente.da_applicare.causa_tipo` si allarga del solo valore `richiesta` con la migrazione utente 047 (ricostruzione verificata come la 029: DDL nota, righe, epoca, indici e statistiche identici); una Richiesta già completata prima di questo codice non riceve proposte a posteriori (nessuna sorpresa nel saldo: la proposta nasce al prossimo completamento). (2) Gli oggetti della Richiesta completata stanno fra gli oggetti ottenuti leggendoli dallo stato completato e da `ricompensa_oggetto` (nessuna copia: un dato in un solo punto, una volta sola, spariscono togliendo il completamento). (3) Bersaglio con l'Ombra: valgono livello e affinità della scheda dell'Ombra; i campi propri restano salvati e valgono solo dove la scheda non sa. (4) Una Richiesta con sblocco o scadenza ancora solo nel testo della guida è «Da verificare» (accettabile con l'avviso); il rango del Confidente rimasto nella colonna si valuta come condizione. (5) Decisione 2 estesa al turno di un'attività con costo o paga, al film con il prezzo e al collegamento della voce a film, attività o Richiesta con i loro yen, con una regola sola per server ed editor. (6) Eliminando una Richiesta se ne vanno anche gli sblocchi ricevuti nelle partite (registrati nel cestino, tornano col ripristino) e i suoi yen si riallineano come togliendo il completamento | rigetto delle due revisioni avversariali dell'ondata 3 | U (decisioni 1, 2, 3, 17 e «prosegui ondata per ondata con verifica avversariale»), scelte di dettaglio IA dichiarate qui |
| 2026-10-25 | L13, ondata 3 — Richieste e quattro effetti nuovi. (1) Lo sblocco di una Richiesta è una lista del vocabolario unico delle condizioni (`richiesta.condizioni_json`); la condizione nuova `sblocco` (Richiesta o attività) è vera quando una voce spuntata con l'effetto «sblocco» l'ha data (`utente.sblocco_partita`); se NESSUNA voce della guida la dà è grigia e non blocca, così un dato non ancora collegato non chiude lavori o Richieste nelle partite in corso. (2) Scadenza = data di gioco; la proroga vale solo con le sue condizioni (il terzo semestre avviato per il 1° febbraio). (3) Stato calcolato dal server: completata e accettata dallo stato segnato, poi scaduta, poi bloccata (un rosso) o disponibile; «Accetta» solo da disponibile (409), «Completata» sempre (la spunta e chi gioca registrano quel che è successo). (4) Il rango del Confidente ripetuto nel testo di sblocco passa nelle condizioni e `confidente_rango` si svuota (un dato in un solo punto); il modulo sposta nelle condizioni anche quello rimasto. (5) Bersaglio: con l'Ombra del compendio livello e affinità si leggono da lì. (6) Yen della voce come le Doti: proposta «Applica» sulla voce, applicata col movimento (`movimento_yen`); gli yen dei consumi restano un promemoria a mano (BON-12, utente 031); un effetto yen accanto ad acquisto, articolo, pesca o Richiesta completata è rifiutato (decisione 2). (7) Oggetto ricevuto: registro per voce ed effetto che somma le copie (`utente.oggetto_ottenuto_partita`, utente 046). (8) Trofeo: lo stesso setter della pagina dei trofei. (9) Quantità solo per l'articolo comprato (l'Aojiru resta una consumazione per effetto: ogni bevuta ha variante e Fortuna proprie). (10) Migrazione 235 conservativa sul testo atteso (la tabella non ha `origine`): conversioni e testi lasciati nell'audit; Triple Seven corretto dall'utente, non toccato. (11) Correzione: lo schema degli effetti del server e del client non accettava `possibili` ed `esito` dell'ondata 2 (400 al salvataggio): ora sì | richiesta dell'utente: sblocco delle Richieste inesistente, «Accetta» sempre attivo, modulo inguardabile, un effetto deve poter sbloccare una Richiesta | U (decisioni 1, 2, 3, 6, 17 e «approvo il piano L13 … prosegui ondata per ondata»), scelte di dettaglio IA dichiarate qui |
| 2026-10-25 | L13, ondata 2 — scelte dopo gli esiti (migrazione 234, audit `audit-234-voci-collegate-esiti`). (1) Centro battute invariato: 3 colpi o più = ♪♪♪, anche 5 su 5. (2) Il paragrafo «Sblocco (dalla guida)» della `sfida-big-bang-burger` si allinea al nome degli articoli e degli esiti («Cosmo Town Burger» → «Cosmo Tower Burger»); i ranghi restano negli articoli come fonte unica (supera il punto 6 della riga sotto per il solo nome). (3) Le 9 voci dopo il 05-31 di `CANDIDATI_COLLEGAMENTO_ESITI` si collegano all'attività (tipo «attività», collegamento all'attività) con un effetto `turno`; le Dote fisse che l'esito dichiara escono (un solo punto per il valore), restano le altre (il Coraggio ♪ della pioggia al bagno). Esito atteso: scritto chiaramente nel testo o nelle note → preselezionato (06-07 «Non si vince» con Coraggio +2 → Gravity persa; 08-14 «completarla», +2 alle quattro Doti → Gravity vinta; 08-15 Distintivo del capitano, +12 totali → Cosmo Tower vinta); non chiaro → da scegliere alla spunta (06-04, sfida del Gravity Burger senza vinta o persa); bagno pubblico → esito automatico del giorno (06-09, 06-13, 06-16, 06-21, 07-06). Si saltano le voci fino al 05-31, quelle modificate e quelle citate in una partita (spunte, ricevute, proposte: schema `utente` letto solo se attaccato, altrimenti nessuna voce toccata); `partite.db` non si scrive | risposta dell'utente «sistema il collegamento del 3. per 1 e 2 ok allinea» | U (scelte 1, 2, 3 e regola dell'esito), lettura voce per voce IA dichiarata qui |
| 2026-10-25 | L13, ondata 2 — esiti delle attività. (1) Gli esiti si dichiarano in UNA colonna dell'attività, `attivita.esiti_json` (non una tabella a parte: così valgono correzione, ripristino, fotografia `seed_json`, pacchetto ed edizione già esistenti per l'attività), con chiave stabile, nome, prova, articolo che dà prezzo e ranghi (il prezzo vive solo nel listino), condizioni, Doti e premi in parole (gli oggetti non ancora modellati, mai applicati); (2) modo «scelta» (chi gioca sceglie alla spunta e al +, con «Senza punti») o «automatico» (vale l'unico esito con le condizioni vere al giorno della voce o della partita): per il bagno pubblico l'automatico è più robusto di due esiti scelti, perché il valore è fisso per giorno della settimana (condizioni complementari, mai due esiti validi insieme); (3) la scelta mancante ferma la spunta (409): nessuna decisione resta aperta dopo il salvataggio, coerente con A1; (4) le Doti dell'esito seguono la regola di sempre (promemoria «Applica», mai applicate da sole), gli yen restano promemoria; (5) Doti a valori possibili: campo `possibili` dell'effetto `dote`, scelte alla spunta; (6) dati: Big Bang Burger con il nome degli articoli («Cosmo Tower Burger»), valori dai testi degli articoli letti come note («più N» = N note, convenzione del progetto), sconfitta solo Coraggio; centro battute 1 colpo ♪, 2 colpi ♪♪, 3 colpi o più ♪♪♪ (da confermare: la fonte dice «+1 per colpo» e un aumento mostra al più tre note; una fonte aggiunge +2 se si colpiscono tutti e 5 i lanci, non registrato); il paragrafo «Sblocco (dalla guida)» della Big Bang Burger resta com'è (decisione dell'utente della 229), anche se scrive «Cosmo Town»; il prezzo serale di 500 yen resta nel testo dell'articolo (non c'è un campo che lo modelli); (7) nessuna voce del Diario convertita: le validate fino al 05-31 non si toccano, per le altre c'è solo il piano (`pianoCollegamentoVoceEsiti`) da approvare | richiesta dell'utente: Big Bang Burger «non è il modo giusto» (valori in prosa in più posti, voci con valori fissi, nessuna scelta di sfida e di esito) | U (decisioni 1a, 2a e A1; «approvo il piano L13 … prosegui ondata per ondata»), scelte di dettaglio IA dichiarate qui |
| 2026-10-25 | Avanzamento automatico della partita (scelta «A1» dell'utente): (1) spuntata l'ultima attività di GIORNO del giorno corrente, e senza decisioni aperte per le voci di giorno (proposte `utente.da_applicare` aperte, ramo `acquisto_provenienza` compreso), la partita passa alla SERA (richiesta mai implementata prima: la fascia cambiava solo a mano); (2) spuntata l'ultima attività di SERA, e senza decisioni aperte nel giorno, passa al giorno dopo, di giorno (come prima, ma con la condizione delle decisioni chiuse); (3) con una decisione ancora aperta l'avanzamento scatta alla chiusura dell'ultima (fine di `decidiProposte`, nella stessa transazione) e la risposta lo dice (`fasciaAvanzata` o `giornoAvanzato`); (4) togliere una spunta non riporta indietro né fascia né giorno; (5) la regola è una sola funzione server (`avanzaSeFasciaCompleta`, `avanzamentoGiornataService`), usata da ogni spunta (Diario, Home, domande e cruciverba della Guida passano da `spuntaEAvanza`); (6) l'avviso del passaggio dice se nel giorno restano decisioni aperte e porta al giorno. Giorno con attività solo di giorno o solo di sera, o tutte fatte fuori ordine: passa direttamente al giorno dopo; in particolare, se le voci di sera sono già tutte fatte (e così quelle di giorno), chiudere l'ultima decisione di giorno porta direttamente al giorno dopo, senza passare dalla sera. Anche le decisioni che si chiudono da sole (proposta non più dovuta, Dote rivendicata da un acquisto, configurazione cambiata, riconciliazione dei benefici di una causa) fanno avanzare la partita con la stessa regola, nella stessa transazione di chi le ha chiuse: l'esito (`fasciaAvanzata` / `giornoAvanzato`) arriva nella risposta della rotta (`/api/partite/:id/…`) che ha provocato la chiusura. Il client resta allineato anche se la risposta di una decisione è persa e il gesto si ripete (la ricevuta salvata torna senza l'esito): dopo ogni decisione, senza esito nella risposta, rilegge la partita e, se data o fascia sono cambiate, allinea lo store e avvisa. Nella riga della voce «Perizia +2» (testo `note` della guida, in note) e «Perizia +3 (♪♪)» (punti dell'effetto) sono lo stesso valore: ora l'effetto si legge «Perizia ♪♪ · 3 punti» e il testo della guida si nasconde se coincide con l'effetto, altrimenti porta l'etichetta «Guida:» | Verifica dell'utente con schermata: la giornata chiusa faceva sparire la proposta «Applica» e due numeri uguali sembravano due scelte; i gesti ancora da verificare vivono nel registro del client e non bloccano il server | U |
| 2026-10-25 | L12, due istanze (preparazione e rilascio) dallo stesso codice: (1) la modalità è fissata nella build (punto d'avvio `server/rilascio.ts` per il backend, `VITE_MODALITA=rilascio` per il frontend), mai in una variabile dello stack; (2) la sola lettura dei contenuti ha tre livelli, volume `:ro` con `gioco.db` 0444 senza WAL, scrittura di prova che deve fallire all'avvio, e montaggio delle sole rotte dell'elenco del giocatore (con controllo di coerenza all'avvio), più il bundle del frontend senza editor; (3) l'identità è quella di Cloudflare Access (token verificato dal backend, proprietario delle partite = `sub`), con `CF_ACCESS_TEAM` e `CF_ACCESS_AUD` obbligatorie nel rilascio e nessun valore reale nel repository; (4) nel rilascio nessuna migrazione: l'edizione prodotta da «Prepara edizione» porta `partite-vuoto.db` e un manifesto con versioni e impronta della struttura delle partite (un solo formato, una sola funzione `improntaSchema`), e l'avvio si ferma se non coincidono; (5) il cestino personale delle partite resta disponibile nel rilascio sotto `/api/partite/cestino`, mentre nella preparazione cambia nulla | un errore di configurazione non deve poter aprire le scritture; la struttura delle partite è congelata alla consegna e cambia solo con una nuova edizione | U («procedi con tutto il piano usando ECC e forniscimi una soluzione ottimale per entrambe le istanze») |
| 2026-10-25 | Revisione UX/UI, lotto C: nella barra in basso (telefono e tablet) la Guida prende il posto di Skill (Home, Compendio, Fusione, Partita, Guida); Skill resta raggiungibile dal chip «Skill» in testa al Compendio, dai nomi delle skill nelle schede Persona, dalla piastrella della Home senza partita attiva e, da 1024 px, dalla barra laterale; la ricerca trova le singole skill. Briciole a due livelli, «Vai al contenuto», fuoco sul titolo dopo ogni cambio di pagina | la Guida, obiettivo dichiarato dell'app, era solo una stella senza nome nella barra in alto (ambigua con la «Stella» delle Doti); la barra in alto del telefono non ha posto per un'etichetta | U («procedi con il lotto C»), scelta di dettaglio IA |
| 2026-10-25 | Migrazione 232 (testi visibili puliti; numerata 231 prima dell'unione con la 231 «curry» della Fase 1), elenco chiuso con guardia sul testo identico (le righe modificate dall'utente restano; le copie della guida si puliscono comunque, perché sono il dato della guida): tolti dai dati visibili i codici interni «(G-NNN …)», i rimandi «rapporto.md», «vedi rapporto», «segnalato nel rapporto» e i file di note, il dominio scritto come testo; i passaggi che servivano solo a quei riferimenti si tolgono interi (es. «Prima di G-036 (giorni): …», la fonte «sintesi WebSearch…» del Palazzo di Sae), senza frasi nuove; corretti tutti gli accenti (apostrofo al posto dell'accento e accenti mancanti), anche nei nomi mostrati; la fonte della nota storica di Homunculus, fatta solo di riferimenti di lavoro, resta vuota (l'app mostra la nota senza «Fonte»). Restano le colonne di provenienza non mostrate, gli URL completi delle fonti, gli storici delle revisioni. Limite noto: «Ripristina» delle traduzioni legge il pacchetto del repository e rimette il testo di prima | codici e note di lavoro erano visibili all'utente; una correzione automatica degli apostrofi non è sicura («po'», «Fa'», «Da'at», virgolette) | U («Codici (G-016d), rapporto.md e dominio, Accenti»; «Toglili dai dati»; «Sì, toglili»; «Sì, pulisci»; «rimuovile del tutto»; «Correggili tutti»; «rimuovi la fonte») |
| 2026-10-25 | Tolta la scheda «Riepilogo» dalla Partita: il modulo dei dati della partita (nome, livello, data, difficoltà, NG+, Allarme, note) si apre in una finestra dal pulsante «Modifica» nella riga dei dati della Partita e da Impostazioni → Partite per ogni partita; il vecchio indirizzo `?scheda=riepilogo` apre la finestra | richiesta dell'utente sulla fila delle schede | U («da questo menu possiamo togliere per favore Riepilogo?», «Entrambi») |
| 2026-10-25 | Rosso d'errore come TESTO: nuovo token `--color-error-testo` `#fb7c7c` (≥ 4,6:1 anche sul fondo rosso trasparente delle affinità «Debole»); fondi e bordi d'errore restano `#ef4444`. Le regole CSS sciolte passano in `@layer components`, tranne `.sr-only`, le regole del selettore e la riga dei filtri con la ricerca (devono vincere sulle utility); stili calcolati identici prima e dopo su 26 pagine × 3 larghezze | contrasto AA; cascata uniforme senza cambiare ciò che si vede | U («procedi con il lotto C»), scelta di dettaglio IA |
| 2026-10-25 | I titoli dei pulsanti `PulsanteVisivo` restano nel carattere display maiuscolo (scelta di 12.8), anche ora che i pulsanti con icona sono diventati la quasi totalità; non si passano al sans della decisione 2026-09-04 | scelta dell'utente fra le due regole in tensione, sottoposta dopo il lotto B | U («Carattere display») |
| 2026-10-25 | Pesca: la Perizia con la Fortuna confermata legge la PROPRIA regola, fotografata nel gesto (`puntiBase` + `bonusFortuna`, modificabili nell'editor della regola), e non il ×1,5 comune (`moltiplicaFortuna`) che Doti, voci del Diario e Aojiru applicano alla stessa Fortuna. Col valore di fabbrica (2 + 1) il risultato coincide (⌊2×1,5⌋ = 3); con altri valori i due possono differire (base 5 e bonus 1: 6 contro ⌊5×1,5⌋ = 7) ed è voluto: la regola della pesca è dell'utente. Allineati i commenti di `shared/fortuna.ts` e `fortunaService.ts` | la regola della pesca era già modificabile ma il campo `bonusFortuna` veniva ignorato; il revisore ha segnalato commenti che dicevano «lettore unico» | IA (rilievo della verifica avversariale; piano «procedi con tutto il piano usando ECC») |
| 2026-10-25 | Revisione UX/UI, lotto B (sistema): scala tipografica in rem (`--testo-12`…`--testo-40`, utility `testo-N` che fissano solo la dimensione), radice al 93,75% (15 px di default) così il testo segue la dimensione scelta dall'utente, minimo 12 px per i testi informativi, regola ESLint contro `text-[Npx]`; `DialogoConferma` al posto di `window.confirm`; una vista d'errore unica; `IntestazioneScheda` con «Indietro» che non esce dall'app (`navigate(-1)` solo se c'è una pagina dell'app prima, altrimenti la rotta di ripiego); `TitoloSezione`; azione di gioco come pulsante primario e strumenti di modifica nel menu «Modifica ⋯»; anteprima d'avvio in `index.html` | testo da 10–11 px e fisso in px; conferme native; tre schermate d'errore; intestazioni e «Indietro» scritti a mano; modifica in primo piano rispetto al gioco; schermo nero all'avvio (revisione con criteri ECC, verifica avversariale distinta) | U («Procedi con il lotto B usando ECC») |
| 2026-10-25 | Testi a 11 px (`--testo-micro`) ammessi solo per quattro segni decorativi o fitti: etichette dei pin sulle mappe, percentuale dello zoom del visore, targhette «LV», iniziale di riserva dei ritratti; tutto il resto ≥ 12 px | 12 px affollerebbe le etichette delle mappe; sono segni, non testi da leggere | U («Sì, eccezione ok») |
| 2026-10-25 | Pulsanti di solo testo: convertiti tutti prima del rilascio del lotto B (ROADMAP 12.8), compresi «Salva» e «Chiudi» a piè delle finestre; restano di solo testo gli «Annulla» delle finestre modali e i pulsanti a solo simbolo con nome accessibile (×, −/+, frecce) | coerenza con 12.8; il revisore ne aveva trovati ~125 ancora di testo | U («Completo prima di rilasciare») |
| 2026-10-24 | Revisione UX/UI, lotto A (accessibilità e uso in partita): testo secondario `--color-text-muted` da `#6f6f80` a `#8e8ea0`; nuovo token `--color-primary-testo` `#ff6359` per il rosso usato come TESTO (classi `text-primary` → `text-primary-testo`, regole `color:`), mentre fondi, bordi, barre, tasselli e asset restano su `#e5352b`; pulsanti occupati con `aria-disabled` invece di `disabled` (non perdono il fuoco); regioni `aria-live` per notifiche e totali delle Doti; schede di Partita e Fusione come pulsanti `aria-pressed` in un `group`; mappa di Tokyo `role="group"`; sigle delle affinità sotto 640 px | contrasti sotto l'AA (3,2–4,3:1) sui testi da 11–13 px; fuoco perso a ogni nota delle Doti; ruoli ARIA errati (revisione con criteri ECC, verifica avversariale distinta). Istruzione diretta dell'utente del 24/10 sera, indipendente dalle righe sospese | U («Procedi con il lotto A usando ECC») |
| 2026-10-24 | L11 B12/B15: `evento_calendario` (R11-02/12) resta, «tenuta con motivo»: non è un doppione. I fatti di storia, le feste, le vacanze e gli esami non hanno altra fonte; il collegamento alle voci è in `evento_calendario_voce`. Con la migrazione 189 la sua chiave esterna passa da `giorno_calendario` a `giorno` (stessi id, righe e indici). Restano anche, con motivo: `turno_partita` (registro ordinato dei turni, la pesca lo usa), `negozio.orari_json` (8 negozi con sede hanno un orario proprio mai promosso né scartato da L5), [SUPERATI il 24/10 dalle risposte dell'utente «Gli orari strutturati», «Sì, dalla condizione», «Sì, toglila»: `luogo.quando`, `articolo.disponibile_dal` e `nome_it` sono tolti dalle migrazioni 193, 194 e 215] `luogo.quando` (un lettore vivo la mostra e 14 luoghi su 109 divergono dagli orari), `articolo.disponibile_dal` (il visore la mostra; portarla sul dato strutturato cambierebbe il testo di 136 offerte su 650), `quartiere.sblocco_data` (la legge `contestoConversione.quartiereDatato`), `nome_it` di libro, film, articolo. Prezzi: verificato, nessuna copia da togliere (`prezzo`, `costo`, `costo_json` non sono copie di niente). | Una colonna si toglie solo con la prova di equivalenza dell'output dei lettori portati sul dato strutturato (migrazioni 184, 187, 188, 189 e utente 43, provate su copia dell'istanza); dove non è provabile si chiede all'utente | IA |
| 2026-10-24 | La resa italiana dell'effetto di una skill (condivisa da tutte le skill con lo stesso testo) si modifica e si ripristina solo dalla pagina Traduzioni; la scheda Skill la mostra con un collegamento «Modifica la traduzione». Modifica/Ripristina della skill non comprende più `effetto_it` | Risposta dell'utente: «Solo da Traduzioni» (dopo i difetti a catena del ripristino della resa condivisa) | U |
| 2026-10-24 | Verifica del piano: togliendo la spunta si annullano anche letture e visioni (si torna al valore salvato nella ricevuta); si aggiunge il segno «validata» sulle voci del Diario controllate (fino al 1/6); nel pannello sopra il diario la scheda del Confidente diventa modificabile come la pagina; la spunta di una voce di Palazzo continua a non segnare i passi (restano Entra/Esci) | Risposte dell'utente: «Annulla anche le letture», «Sì, aggiungilo», «Pannello: rendilo modificabile» (non scelta «Palazzo: la spunta segna i passi») | U |
| 2026-10-24 | Big Bang Burger: la condizione strutturata resta com'è e la frase di sblocco (Doti ai ranghi 2, 3, 4) torna visibile come nota dell'attività. Repository pubblico: dai documenti e dalla memoria si tolgono il nome utente Windows e gli indirizzi delle istanze; restano solo quelli indispensabili al deploy (compose e pipeline) | Risposte dell'utente: «Tieni la frase come nota», «Ripulisci i documenti» | U |
| 2026-10-24 | L11 R11-17/1 (PM): i dati di gioco che nessuna pagina mostra (`eredita_matrice`, `infiltrazione_dedalo`, `oggetto.categoria` e `oggetto.vincolo`, `sinonimi-ricerca`) restano correggibili con Ripristina dal servizio unico `/api/correzioni`, senza una pagina nuova; la nota comune delle attività (`note-categorie-attivita`) invece si mostra in testa alla categoria, come voleva la regola di R9-14/1 | Regole dell'utente: un solo punto di modifica, nessuna superficie nuova senza autorizzazione | IA |
| 2026-10-24 | Date dei Palazzi nel Diario: resta il percorso della guida italiana (Futaba 25/7, 1/8, 3/8; Okumura 15/9, 4/10, 6/10), con nota della differenza dalle date Royal; «prevale Royal» non sposta i giorni del percorso. La voce del 1/8 sera resta com'è | Risposte dell'utente: «Resta il percorso», «Lascia com'è» | U |
| 2026-10-24 | L11 (PM): voce del 4/10 al Palazzo di Okumura, si aggiungono in coda al testo Fabbrica centrale, Interscambio e Produzione armamenti (stessa visita secondo la guida); l'evento di calendario 103 diventa «Infiltrazione estesa nel Palazzo di Okumura» (la prima è il 15/9) | Regole dell'utente: resta il percorso della guida, niente dati inventati (`lotti/L11/testi-sospetti-0108-sera-e-1004-2026-10-24.md`) | IA |
| 2026-10-24 | L11: Harajuku resta sbloccata dall'invito di Ryuji del 29/5 (ACE, dati di gioco), con nota della discordanza di Samurai Gamers (Mishima 3/8); la voce dell'11/12 al Palazzo di Shido si lega alle 8 aree citate dal testo, non alle 15 della guida | Risposte dell'utente: «Ryuji 29/5 (ACE)», «8 aree (testo)» | U |
| 2026-10-24 | L11 (PM): R11-02/9, le frasi di sblocco di luoghi e attività che ripetono una condizione strutturata si tolgono (con archivio); quelle che sono racconto del Confidente restano come nota; le 7+4 condizioni mancanti si aggiungono prima con le fonti di `lotti/L11/sblocchi-luoghi-attivita-2026-10-24.md`. M-B: le 18 voci restanti si legano come da `lotti/L11/M-B-voci-multiple-2026-10-24.md` (Shido con 8 aree). Pagine ammuffite della Taiheido: condizione `[dal 04-18, dal 09-01]` come gli altri articoli (Royal: 1/9). R11-01/1: colonne senza lettori dichiarate di archivio con motivo, `requisito_partita` (vuota) tolta | Regole dell'utente: un solo punto di modifica, prevale il Royal | IA |
| 2026-10-24 | L11 R11-16/1 (PM): l'esportazione dell'istanza deve essere sempre reimportabile; per `esperimenti-clinici-takemi` l'effetto proprio Coraggio +1 si toglie dall'attività (con archivio), perché la Dote vive nella fonte del Confidente Takemi, previa verifica che la fonte la dia nella stessa occasione; la regola dell'import non si allenta | Regola dell'utente: un solo punto di modifica | IA |
| 2026-10-24 | L11 R11-02/10: si toglie la colonna `nome_it` da libri, film e articoli (copia del nome del catalogo); resta un solo nome, quello del catalogo («Lente condensante» per l'unico articolo divergente), con l'inglese fra i nomi alternativi; ricerca identica; la colonna va in archivio con `FONTI_TOLTE` (piano in `lotti/L11/nome-it-famiglia-2026-10-24.md`) | Risposta dell'utente: «Sì, toglila» | U |
| 2026-10-24 | L11 M-A: l'invito di Makoto a Ikebukuro (931d1e20) passa dal 30/7 al 4/8 di giorno, primo giorno utile dopo il completamento del Palazzo di Futaba sul percorso (data dedotta, nessuna fonte Royal la scrive), e il segno «da rivedere» si toglie | Risposte dell'utente: «Cerca la data Royal», poi «4/8, togli il segno» | U |
| 2026-10-24 | D3 Iweleth, verificata con le guide Royal (`lotti/L11/iweleth-maruki-fonti-royal-2026-10-24.md`): Iweleth resta un solo dedalo dei Memento (le guide Royal non lo trattano mai come Palazzo); il Palazzo di Maruki resta Palazzo con scadenza 3/2 e nota della discordanza di Gfinity (6/1) | Risposte dell'utente: «Verifica con le guide royal», poi «Un solo dedalo», «Tieni il 3/2» | U |
| 2026-10-24 | L9 R9-14/1 (PM): approvato l'elenco delle frasi ripetute delle 30 attività (`lotti/L9/frasi-attivita-e-voce-1119-2026-10-24.md`), comprese le note delle Doti che ripetono gli effetti; prima si riscrive `dettagli` con archivio, poi `altri_effetti`, `regole`, `premi` e `paga` vanno in archivio. Voce dell'11-19: si tolgono Moloch e la battaglia con Kasumi, assenti nelle fonti Royal (boss Shadow Niijima/Leviathan) | Regole dell'utente: un solo punto di modifica, prevale il dato Royal | IA |
| 2026-10-24 | L9 R9-07/5: dei regali dei Confidenti si possono modificare (con Ripristina) anche l'oggetto del catalogo collegato, oltre a dove si compra, costo, «sconsigliato» e nota | Risposta dell'utente: «Anche l'oggetto» | U |
| 2026-10-24 | L9 (PM): R9-21/2, le date di «rango massimo» e di Sae rango 2 restano dati propri del Calendario (nessuna fonte strutturata); voce del 14/11 giorno: si toglie il segno «da rivedere» e l'Arena passa a 10.000 gettoni come nella guida Royal, con nota della differenza dal testo italiano | Regole dell'utente: prevale il dato Royal, niente dati inventati | IA |
| 2026-10-24 | L11 D8 e M-C (PM, sui dati Royal di `lotti/L11/M-C-dati-royal-2026-10-24.md`): la voce del 13/11 sera diventa l'acquisto del Katsu a pezzettoni alla friggitoria di Kichijoji (domenica sera, fonte Royal), al posto del testo neutro; Lavenza ×4 passa a «gemelle» (01-11 con certezza media annotata), Ustione al 17/8 sera, 10-15 da esame ad altro, 10-31 «Cruciverba (Stand)», Hagoromo confermato con orari del negozio e voce del 06-05 alla sera; divergenze fra fonti annotate senza cambiare i valori | Regole dell'utente: prevale il dato Royal documentato, niente dati inventati; risposta dell'utente «Riscriverla» (D8) | IA |
| 2026-10-24 | L11: `pianta_quartiere` si toglie insieme allo scarico delle illustrazioni dei quartieri (R11-02/8); le copie di ripristino di «Importa» restano 3 (R11-16/1); oltre alle affinità hanno Modifica e Ripristina skill e livelli, statistiche, livello e Arcano della Persona e i dati delle skill (R11-15/3); il cruciverba «Hacker» del 29/8 va nel Cestino, resta quello del 30/8 sera (D7) | Risposte dell'utente: «Toglila con lo scarico», «Restano 3», le quattro voci scelte, «Sì, nel Cestino» | U |
| 2026-10-24 | L11, scelte del PM: le due rotte senza client (`GET /esami/piazzamenti`, `GET /condizioni/censimento/fotografie-ingresso-memento`) si tolgono come orfane (R11-03/3); le fusioni delle Gemelle con Persona non certa restano informative (niente dati inventati, R10-11/2); le misure della Home alle cinque altezze le fa il PM su p5s dopo il rilascio (R10-24/7) | Regole dell'utente: niente codice orfano, niente dati inventati | IA |
| 2026-10-24 | L11: `luogo.quando` va in archivio e vale l'orario strutturato anche per i 14 luoghi che divergono (R11-02/9, R11-02b/5); «disponibile dal» si ricava dalla condizione strutturata e `articolo.disponibile_dal` va in archivio, con 136 offerte su 650 che cambiano testo (R11-02/10); la voce del 13/11 sera si riscrive, non va nel Cestino (D8); le Aree «Museo, 1P/2P» diventano «Museo 1P/2P», solo il nome (D6) | Risposte dell'utente: «Gli orari strutturati», «Sì, dalla condizione», «Riscriverla», «Sì, senza virgola» | U |
| 2026-10-24 | L9 R9-18: le domande d'esame vivono solo nelle 12 righe di `domanda` (controllo 31/31 prima di svuotare `esame.domande_json`), date su `domanda.data`, `data_risultati` sull'esame; il testo di `esame_premi` resta com'è con la discordanza annotata (nessuna fonte Royal). R9-22 (corretta il 24/10 per rispettare «Restano eventi collegati»): le righe di `evento_calendario` restano con id, collegamenti alle voci e testo della guida; quelle ricavabili portano una chiave della fonte da cui il Calendario legge data e tipo (un solo punto di modifica); si archiviano solo i meteo doppioni di `allerta_meteo` senza collegamenti; il Calendario resta identico giorno per giorno. L8: i campi copiati delle affinità spariscono dall'editor delle voci Persona collegate | Regole dell'utente: un solo punto di modifica, consolidare con migrazioni, niente dati inventati (analisi `lotti/L9/esami-eventi-debolezze-2026-10-24.md`) | IA |
| 2026-10-24 | Bozze dei moduli: niente salvataggio in sessionStorage né avviso «Riprendi / Scarta»; ricaricando la pagina una modifica non salvata si perde, come prima (si toglie quanto introdotto dal PM) | Risposta dell'utente: «No, toglile» | U |
| 2026-10-24 | L9, date dei Confidenti e dei Palazzi: per Kawakami resta la guida italiana (sblocco 4/6, rango 1 8/6), con la discordanza annotata; le scadenze di 6 Palazzi si anticipano di un giorno come Gfinity (Madarame resta al 5/6); Hifumi va al 25/6 sera (requisito ed evento) | Risposte dell'utente: «Resta la guida italiana», «Anticipa di un giorno», «Sì, 25/6» | U |
| 2026-10-24 | Regole di lavoro: (1) i test si modificano solo quanto serve perché compilino, senza eseguirli; quelli che chiamano funzioni tolte su decisione dell'utente diventano `it.skip` con un commento e non si cancellano; (2) il numero di una migrazione non si riserva: si prende il primo libero al momento del commit; (3) [SUPERATO il 24/10 dalla risposta dell'utente «Toglila con lo scarico»: vedi la riga su R11-02/8] `pianta_quartiere` resta, perché è una fonte viva letta da `cittaService` | Decisioni del PM in applicazione della regola dell'utente «zero test» e del runner basato su `user_version` | IA |
| 2026-10-24 | R9-01: in Partita › Confidenti resta la riga «Giorno e fascia dell'incontro», solo come avviso che non blocca niente (eccezione approvata alla regola «Partita non si tocca») | Risposta dell'utente: «Sì, tienila» | U |
| 2026-10-24 | L11 B11: matita «Modifica» con Ripristina accanto a ogni Dote in Partita › Doti (eccezione approvata alla regola «Partita non si tocca») | Risposta dell'utente: «Sì, metti la matita» | U |
| 2026-10-24 | R10-11c/f: i punti dei Confidenti si ricalcolano in ordine cronologico del Diario solo dalle spunte nuove; i valori attuali restano la base e non vengono riscritti (R10-11h). R10-25: nuova scheda «Persona della partita» in Partita, accanto a Scorta e Compendio (eccezione approvata alla regola «Partita non si tocca») | Risposte dell'utente: «Ricalcolo solo da oggi», «Sì, nuova scheda in Partita» | U |
| 2026-10-24 | L10, voci non decidibili dalle fonti (PM): biliardo rango 3 (R10-04/7) e cruciverba del 02-01 (R10-09/5) restano senza effetto, perché nessuna fonte Royal dà una data; l'elenco degli abbinamenti dubbi (R10-11b/1, R10-12/1) è il documento `lotti/L10/verifica-effetti-diario-2026-10-23.md`, senza pannello | Regole dell'utente: niente dati inventati, niente superfici di revisione | IA |
| 2026-10-24 | L11 R11-10c: l'«Area riservata allo staff» resta con il segno «da verificare»; «Pagine ammuffite» resta con entrambi gli articoli (Hinokuniya e Taiheido), ciascuno con una nota storica sulla contraddizione delle fonti; le voci dei boss di Madarame con «Gelo» e «respinge» restano col testo dell'utente; applicate le conferme predefinite (D1, D2, D9, D10). Il cruciverba «Hacker» del 29/8 resta aperto: l'utente non ha scelto «non spostare» [SUPERATO il 24/10 dalla risposta dell'utente «Sì, nel Cestino», D7, migrazione 195] | Risposte dell'utente: «Area staff: tieni il segno», «Pagine ammuffite: due articoli», «Gelo/respinge: com'è», «Sì, applica i default» | U |
| 2026-10-24 | R10-22/3: in Partita › Progressi ogni evento che viene da una voce mostra una riga con la provenienza e il collegamento alla voce | Risposta dell'utente: «Sì, aggiungi la provenienza» | U |
| 2026-10-24 | Punti dei Confidenti (R10-11 e L9): il bonus degli esami vale solo per i 7 Confidenti documentati; il ×1,2 dell'invito resta, legato all'effetto «invito» della voce; i moltiplicatori si moltiplicano; si tronca all'intero a ogni passaggio, solo nei calcoli nuovi; l'eccedenza passa al rango successivo solo per i punti applicati dal motore; il ricalcolo cronologico è un controllo interno, senza interfaccia | Dato Royal (ricerca del 24/10, `lotti/L9/ricerca-royal-2026-10-24.md`; G-020) e regole dell'utente (niente superfici di revisione; R10-11h dati reali invariati) | IA |
| 2026-10-24 | L9 R9-20: i 173 eventi del calendario restano eventi collegati per chiave alle voci, non diventano voci del Diario. L11 R11-10c: niente sezione «Da rivedere»; le 13 voci si chiudono consolidando i dati con migrazioni. L11 R11-16 e R11-17: vale la regola del 21/10, «Importa» sostituisce gioco.db dopo anteprima e conferma, senza unione | Risposte dell'utente: «Restano eventi collegati», «Niente sezione», «Vale la regola del 21/10» | U |
| 2026-10-23 | La bonifica consolida i dati con migrazioni verificate su Royal. Escono i pannelli di riconciliazione e approvazione mai autorizzati (piano BON-01…12, `docs/coordinamento/inventario-superfici-2026-10-23.md`). «Da applicare» sparisce ovunque: la Dote di una voce si applica dal pulsante sulla voce, mai in automatico. Gli yen sono solo un promemoria, a mano | Parole dell'utente: «Da Applicare non è mai stato autorizzato…», «da applicare deve sparire», «Pulsante sulla voce», «A mano con promemoria» | U |
| 2026-10-23 | La pagina Partita non cambia aspetto. Eccezione approvata: la finestra «Regala» in Partita › Confidenti (R10-18) | «partita non deve essere toccato» (la pagina); «Tieni la finestra «Regala»» | U |
| 2026-10-23 | La Fortuna è uno stato della partita: si accende dall'interazione con Chihaya o dall'interruttore in Doti e finisce al cambio di giorno | Parole dell'utente del 23/10: «la fortuna è uno stato momentaneo attivato da un'interazione specifica con la confidente dei tarocchi. può essere attiva o disattiva e dipende dall'interruttore di stato della partita». Conferma «Interruttore Fortuna in Doti». La fine al cambio di giorno viene dalla ricerca Royal del 23/10 («per il resto del giorno», Lettura della buona sorte), non dall'utente | U (stato e interruttore) · IA da fonte Royal (durata) |
| 2026-10-23 | R10-27: gli oggetti citati da una voce si aprono in un pannello sopra il diario, con ritorno alla stessa posizione, ma non in Partita › Oggi. «Esci» dal Palazzo riporta alla voce con il riepilogo; la spunta resta un gesto dell'utente | «Pannello sopra il diario»; «Riporta e basta» | U |
| 2026-10-23 | Il pin 339 va sul listino visibile `distributore-shujin-edificio`, perché il «cancello-1» è un doppione nascosto dall'utente il 21/9. Il cambio giorno passa dalla regola unica senza il 400. Le vecchie migrazioni 130, 131 e 135 vanno congelate | Risposta dell'utente del 23/10 alla domanda «Confermi queste scelte che ho preso io?», con le opzioni selezionate: «Cambio giorno senza 400», «Interruttore Fortuna in Doti», «Congela 130, 131, 135», «Pin 339 → listino visibile» | U |
| 2026-10-23 | Copiare nel repository pubblico il foglio Royal della negoziazione (277 domande, 831 risposte, 3324 celle) dalla raccolta joyce-chen/persona5-negotiation, che non dichiara nessuna licenza | L'utente ha accettato il rischio («Copia nel repository»), con attribuzione in `NOTICE`; lo stesso rischio era già presente per `negoziazione-domande.json`. Si può sempre sostituire con una licenza o un permesso dell'autore, se arriva | U |
| 2026-10-23 | L'app è per Persona 5 Royal: in caso di discrepanza prevale sempre il dato di Royal | Istruzione esplicita dell'utente; nessun compromesso con i dati della versione originale, provenienza Royal da documentare | U |
| 2026-10-23 | Completare L7-TANAKA-NOTA con verifica e rilascio, poi fermarsi senza avviare TRANSAZIONE | «Finito il prossimo task fermati», ricevuto durante NOTA già avviato | U |
| 2026-10-23 | Riprendere senza il limite di dieci minuti per punto; restano sequenza e verifica distinta prima delle chiusure | richiesta esplicita «Riprendi senza limite dei 10 minuti» | U |
| 2026-10-21 | Equipaggiamento dataset/listini: nessun abbinamento fondato soltanto sul nome; identità distinte finché equivalenza documentata, con eventuale fusione sottoposta all'approvazione prevista. Conservare associazioni esplicite e riferimenti esistenti | risposta dell'utente «la soluzione migliore» alla domanda sul conflitto R7-03b / M7 §2: delega alla valutazione tecnica. G-024 documenta differenze nel campione; revisore distinto favorevole alla regola, non alla conversione ancora da progettare | assistente su delega dell'utente, non scelta testuale dell'utente |
| 2026-10-21 | Asakusa: il quartiere si apre se vale Ann rango 7 **oppure** Skytree aperto dal libro «Shitamachi rinato»; basta una condizione | chiarimento esplicito dell'utente; OR già presente nella migrazione 118, nessuna nuova migrazione | U |
| 2026-10-20 | `newreview`: un commit/push di codice e coordinamento alla fine del lotto, senza pipeline intermedie; zero test | decisione precedente dell'utente, conservata come storia; il prompt di ripresa successivo richiede salvataggio alla fermata | U |
| 2026-10-21 | Ogni consegna verificata da un agente distinto con accesso avversariale alle specifiche originali; resta zero test. Audit delle reinterpretazioni prima di altre implementazioni | istruzioni dirette dell'utente, superiori al precedente divieto di verificatori | U |
| 2026-10-21 | Il prompt corrente richiede commit/push alla fermata. Per l'audit: consegna solo documentale dopo revisione distinta, con codice pubblicato invariato e L7 incompleto escluso | salvataggio del rapporto distinto da rilascio del prodotto; non è approvazione di correzioni né salvataggio remoto della bozza esclusa | U (salvataggio); attuazione circoscritta dell'assistente |
| 2026-10-21 | «Importa» resta per sostituire `gioco.db` con un backup locale dopo anteprima e conferma; la guida del visore resta con tutte le infiltrazioni associate alla planimetria | scelte confermate dall'utente; nessuna riprogettazione di quei flussi | U |
| 2026-10-21 | Rimuovere solo «Da posizionare» dal pannello Area e, separatamente, «Schermate di riferimento / Aggiungi schermata» dall'editor; conservare altri flussi di posizionamento, dati e catalogo dei pin | perimetro esplicito dell'utente; nessun tipo di pin «Luogo» aggiunto | U |
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
   gli altri no; città ⇒ nessuna condizione (salvo il Confidente, vedi 2026-10-04); riferimento solo dei tipi ammessi dalla categoria (altrimenti
   400); destinazione solo per gli spostamenti. Migrazione 065.
2. **Destinazione = mappa + spillo** (`spillo_destinazione.spillo_arrivo_id`). Il punto in percentuale
   con lo zoom e la checkbox «Posizione del luogo» spariscono dall'interfaccia. All'arrivo la mappa si
   adatta alla finestra e lo spillo è già selezionato. Nei pacchetti lo spillo d'arrivo viaggia per nome e
   posizione (gli id non valgono fra installazioni); i pacchetti vecchi con `x`, `y`, `zoom` diventano lo
   spillo più vicino entro l'8% dell'immagine (24 delle 40 destinazioni esistenti), altrimenti la sola mappa.
3. **Gli spilli di città non sono condizionati** (salvo il Confidente dal 2026-10-04, voce «Il pin del Confidente si può condizionare») — neanche dal seed: `sincronizzaMappe` non scrive più
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
- **Nei Memento la colonna sono gli obiettivi del dedalo** (timbri + richieste) — *superata il 2026-10-11: la colonna sono le aree del dedalo con i loro elementi*; dove la guida non
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
  compariva due volte nell'elenco del Palazzo. *Superata il 2026-10-04: un'area può stare su più planimetrie (vedi
  «2026-10-04 — Un'area della guida su più planimetrie»).*
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
  aree si mostrano sempre in ordine di guida (`dungeon_area.ordine`). *La parte «un'area ha una sola planimetria» è
  superata il 2026-10-04 (vedi «2026-10-04 — Un'area della guida su più planimetrie»).*
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
  Sumire a Maruki) non completano il Palazzo. **Superata il 2026-10-04**: le tre condizioni valgono insieme (vedi la voce
  «Il Palazzo è completato con Tesoro, boss finale e raccolto tutto, insieme»).
- Scelte dell'utente (domande del 2026-09-30): il **boss finale della Guida si segna da solo** raccogliendo il Tesoro o il
  boss finale sulla mappa, e **si toglie** se si tolgono (salvo che la mappa dica ancora «finito»); l'**ingresso al
  Palazzo sparisce** a Palazzo completato, anche prima della scadenza; gli **archi** («dall'arco del Palazzo di X»)
  **restano legati alla data**, non al completamento anticipato.
  **Il segno da solo del boss è superato il 2026-10-04** («Togli l'automatismo», utente 017); il resto vale.
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
- **Superata in parte il 2026-10-04.** La regola di `palazziCompletati` vuole ora Tesoro, boss finale e 100% insieme (vedi la
  voce di quel giorno), e la mappa di Tokyo la segue. Il motivo è uno solo: «Tesoro, boss finale e raccolto tutto (n/n)».

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
- Chiarito: una voce si collega a più pin (un pin a una sola voce; **superato il 2026-10-09**: un pin può avere più voci, vedi
  «Un pin può appartenere a più voci della guida»). «Enigma» diventa un contenitore di passi (voce 3 in ROADMAP):
  il caso d'uso dell'utente è la porta che si apre con un meccanismo di sblocco, ciascuno col suo pin.

### 2026-10-01 — La voce della guida di un pin sta in un campo suo
- **Superato il 2026-10-09** («Un pin può appartenere a più voci della guida», migrazione 098): le voci stanno in `spillo_voce`,
  una o più per pin; il campo `voce_chiave` è uscito dallo schema e il pacchetto porta `voci` (legge ancora `voce`).
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
  **Superato il 2026-10-09** («Le condizioni di visibilità dei pin sono assolute»): ora ogni condizione che non vale nasconde
  anche gli elementi fissi, non più solo questa.
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
    «non ancora»; si nascondono solo per lo stato di altri pin e, come prima, l'ingresso a un Palazzo completato.
    **Superata il 2026-10-09** («Le condizioni di visibilità dei pin sono assolute»): `restaInVista` è tolto, gli elementi
    fissi con una condizione che non vale spariscono;
  - **corretto il NON su un gruppo misto**: `NON(TUTTE(Coraggio 5, Leva azionata))` faceva sparire il pin appena la leva era
    azionata anche col Coraggio basso; ora un NON su un gruppo che mescola presenza e prerequisiti non nasconde da solo.
- Confermato dall'utente (2026-10-03, «1 ok»): sui passaggi e le scale del gioco che restano in vista marcati «non ancora» il
  pulsante «Vai: …» resta disattivato (dal 2026-10-09 quei pin non restano più in vista: il «Vai» disattivato vale quando li
  si richiama con «Mostra anche i non ancora disponibili»). Il «2 corretto» (pin senza stato ma con voce della guida non citabile) l'avevo letto
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

**Estesa il 2026-10-11** («Una planimetria senza niente da raccogliere è completata»): la ✓ della stanza vale anche «per
raccolta» (tutto raccolto o niente da raccogliere), e compare anche sulla singola planimetria di una stanza con più versioni.

Richiesta dell'utente: «se tutte le voci di un'area sono completate, l'area deve essere segnata come completata... (spunta accanto
alla lista aree di quella planimetria...».

Risposte dell'utente, parola per parola:
- quando un'area è completata: «Voci della guida segnate (Recommended)»;
- dove compare la spunta: «Lista «Il Palazzo» (Recommended), Chip «Su questa planimetria», Stanza completa»;
- su quale ramo: «Su main dopo il merge di #96 (Recommended)»;
- «Procedo con la proposta?» → «Sì, procedi (Recommended)».

Che cosa ne segue:
- **La regola.** Un'area è completata quando ha almeno una voce da segnare e sono tutte Ottenute o Esaurite. Le voci descrittive
  («Altro») non contano. Gli Enigmi non chiedono un caso a parte: il server li segna quando sono fatti i loro passi. Senza
  partita non c'è nessuna spunta.
- **Dove compare.** Accanto a ogni area della guida nella lista «Il Palazzo» (nelle stanze, nelle loro versioni e fra le aree
  senza planimetria), accanto alla stanza che ha tutte le sue aree completate, e nei chip «Su questa planimetria».
- **Nessun cambio nel server.** I dati ci sono già nel dettaglio del Palazzo, e la spunta si ricalcola a ogni voce segnata.
- **Posizione della spunta**, come nell'anteprima della proposta approvata: davanti al nome di un'area («✓ 2. Sala Centrale») e
  dopo il nome della stanza («3. Vecchio castello 1P ✓»), così una stanza completa si distingue dalle sue aree. Per i lettori di
  schermo, «(completata)» viene dopo il nome.

## 2026-10-04 — Un'area della guida su più planimetrie

Segnalazione dell'utente: «cmq le aree possono essere agganciate anche a più planimetrie... non capisco perchè se aggancio una
seconda planimetria si scollega l'area dalla precedente...».

Lo scollegamento era voluto: decisione del 2026-09-18 («un'area ha una sola planimetria»), presa perché con più planimetrie per
area la misura «completa» contava due volte. L'utente l'ha rivista.

Risposte dell'utente, parola per parola:
- conteggio di un'area su più planimetrie: «Somma le planimetrie (Recommended)»;
- «Procedo con la proposta?» → «Sì, procedi (Recommended)».

Che cosa ne segue:
- **Supera la decisione del 2026-09-18.** Legare un'area a un'altra planimetria la aggiunge senza staccarla dalle altre. Vale
  per la scheda della planimetria, per il legame dell'editor e per l'importazione del pacchetto delle mappe.
- **Nessuna migrazione.** `mappa_entita` lo permetteva già.
- **Conteggio.** L'area somma i collezionabili di ogni sua planimetria, ognuna una volta. Se due tavole mostrano gli stessi
  oggetti, li segna l'utente su una sola. Il totale del Palazzo non cambia, perché conta le planimetrie e non le aree.
- **Nell'interfaccia:**
  - la scheda della planimetria dice «anche su «X», «Y»», e non più «si sposta qui da»;
  - la conferma di eliminazione distingue le aree che restano su altre planimetrie da quelle che restano senza;
  - nella pagina del Palazzo, «Planimetrie di quest'area» collega l'area aperta anche a un'altra planimetria, o la scollega da
    quella a schermo.

## 2026-10-04 — Il Palazzo sulla mappa di Tokyo: quando compare e dove si atterra

Segnalazione dell'utente: «come mai nella mappa non vedo giorno 11/04 e il 12/4 l'icona del palazzo di kamoshida?», poi «l'11/04
dovrebbe atterrare nei sotterranei "Prigione sotterranea - Tutorial" mentre il 12/04 dalla mappa bisognerebbe atterrare su
Tutorial Palazzo 12/04 (Sala Centrale)», e infine: «per la sequenza non devi annotare niente... devi visualizzare l'icona e
permettermi di valorizzare per fasce temporali o giorni specifici il punto di atterraggio dell'icona della mappa rispetto al
mappamondo delle planimetrie».

Perché il Palazzo non compariva:
- **La mappa segue il giorno della partita**, non il giorno guardato in «Oggi». Nello screenshot «Oggi» mostrava il 12 aprile,
  ma la partita era all'11: la didascalia della mappa diceva «al 11 aprile». Il 12 visto in «Oggi» era quindi, per la mappa,
  ancora l'11.
- **La finestra di Kamoshida** in `finestre-dungeon` partiva dal 12 aprile, quindi all'11 il Palazzo non c'era. Era la stessa
  causa per tutti e due i giorni.
- **Misurato in sola lettura** sui dati dell'utente: partita al 04-11, Kamoshida non completato. Con la finestra di prima,
  `dentroFinestra` dà falso al 04-11 e vero al 04-12.
- Alla domanda «La mappa di Tokyo deve seguire il giorno della partita o il giorno che stai guardando in «Oggi»?» l'utente ha
  risposto «Il giorno della partita». La mappa resta quindi sulla data della partita, e la finestra parte ora dall'11.
- Il tocco sull'icona portava sempre alla scheda del Palazzo.

Risposte dell'utente, parola per parola:
- il giorno che decide la mappa: «Il giorno della partita»;
- la comparsa del Palazzo: «Finestra modificabile (Recommended)»;
- dove si atterra: «Regole per date nel Palazzo (Recommended)»;
- la proposta: «Sì, procedi (Recommended)»;
- **Dove sta l'editor** (variante della proposta: domanda all'utente con le misure dopo il primo esame del validatore, risposta «Finestra dal pulsante (Recommended)»). È una finestra aperta dal pulsante «Sulla mappa di Tokyo» nell'intestazione del Palazzo, che mostra
  anche la finestra attuale, e non una sezione nella pagina. Da 1024 px la pagina del Palazzo sta in una schermata, e una
  sezione in più l'avrebbe allungata.
  - Da 1175 px in su (misurato a 1175, 1200, 1240, 1280, 1366) l'intestazione resta alta 170 px.
  - Sotto i 1175 px le righe di chip vanno a capo una volta in più: l'intestazione è alta 222 px a 1024 e 1100 px, e 201 px a
    1150. La pagina resta senza scorrimento (misurato a 1024×690). A 1024 px le due righe di chip erano già piene, a 7 px dal
    margine, quindi qualunque comando nuovo nell'intestazione avrebbe aggiunto una riga.

Che cosa ne segue:
- **La finestra si modifica dalla pagina del Palazzo** («Quando compare»: dal, al o senza fine). È la voce di `finestre-dungeon`,
  la stessa che dice l'arco corrente alle condizioni dei pin. La migrazione 097 porta Kamoshida dal 12 all'11 aprile, solo se la
  data è ancora quella trascritta in origine.
- **Le regole d'atterraggio** stanno nella tabella `dungeon_atterraggio` (097), in `gioco.db`, e viaggiano col pacchetto. Ogni
  regola vale sempre, un giorno, da un giorno in poi o dal–al, e porta a una planimetria del Palazzo e, se indicato, a un suo pin.
  Vale la prima regola che copre il giorno della partita; l'ordine si cambia con le frecce. Senza partita vale la prima regola
  «Sempre». Se nessuna regola vale, il tocco apre la scheda del Palazzo, come prima.
- **Il tocco sull'icona** apre la planimetria: nella Home dentro la mappa, senza cambiare pagina e centrata sul pin; nella
  Città, la pagina della mappa con il pin selezionato. Cambiato il giorno della partita, i Palazzi si rileggono.

Scelte tecniche mie, dentro la proposta approvata:
- **«Da un giorno in poi»** si aggiunge a «un giorno», «dal–al» e «sempre». È un dal–al senza fine, che il server accetta
  comunque.
- **I pin con lo stesso nome** si distinguono col posto («Passaggio — 1° di 2 dall'alto»). Le planimetrie native ne hanno più
  d'uno.
- **Eliminazioni.**
  - Eliminare la planimetria porta via le sue regole.
  - Eliminare il pin d'arrivo lascia la regola sulla planimetria intera.
  - Reimportando la planimetria dal pacchetto, il pin reinserito con lo stesso uid torna nella regola, come già succede ai
    passaggi.
- **Rilettura al cambio di giorno.** Cambiato il giorno della partita, la scheda del Palazzo si rilegge in silenzio
  (`rileggiInSilenzio`), senza svuotare la pagina né chiudere la finestra aperta, così «Oggi si atterra su…» segue il giorno.
- **Date con l'elisione.** Le date si scrivono con l'elisione: «dall'11 aprile», «all'11 aprile». Lo fa `dataGiocoConArticolo`,
  a cui si aggiunge la preposizione «da». Vale anche per la didascalia «Non ancora nel mondo, all'11 aprile» della mappa di
  Tokyo.
- **Note per l'utente.**
  - Gli ingressi in città con condizioni di data (Shujin: solo l'11 aprile, poi dal 12 al 2 maggio) restano quelli di «Sulla
    mappa» delle voci della guida. Le regole d'atterraggio valgono per il tocco sull'icona della mappa di Tokyo.
  - Cambiare la finestra non riscrive le condizioni dei pin di passaggio generati dalla finestra.

## 2026-10-04 — «Torna alla partita» nel visualizzatore della mappa

Richiesta dell'utente: «aggiungi sul visualizzatore mappa un pulsante per tornare alla partita per favore...».

Risposte dell'utente, parola per parola:
- dove porta: «Home, giornata di oggi (Recommended)» (superata dalla correzione qui sotto);
- anche nell'editor: «Solo nel visualizzatore (Recommended)»;
- correzione, dopo l'approvazione: «perchè torna alla partita mi rimanda in home quando io avevo chiesto di rimandare alla
  partita?». L'opzione «Home» l'avevo raccomandata io, e la sua richiesta era la pagina Partita. Alla domanda sulla scheda:
  «Scheda Oggi».
- anche nella pagina di un luogo senza pianta (aggiunta mia, sottoposta all'utente dopo il primo esame del validatore): «Sì,
  tienilo (Recommended)».

Che cosa ne segue:
- **Dove compare.** Nella barra del visore della pagina delle mappe, dopo «Pannello» e subito prima di «Chiudi», e fra i comandi
  di un luogo senza pianta, dopo «Scheda del luogo» e «Modifica luogo». Compare solo con una partita attiva.
- **I due ritorni.**
  - «Torna alla partita» porta sempre alla pagina Partita, sulla scheda «Oggi» (`/partita?scheda=oggi`).
  - «Chiudi» resta il ritorno alla pagina da cui si è entrati nelle mappe.
- **L'icona** è quella della scheda «Oggi». Sul telefono la barra mostra solo le icone, come per gli altri comandi.

## 2026-10-04 — Il Palazzo è completato con Tesoro, boss finale e raccolto tutto, insieme

Segnalazione dell'utente, davanti alla mappa di Tokyo senza Kamoshida all'11/04 nella partita «Tutorial»: «non vedo il
palazzo». Il Palazzo risultava completato («boss finale raccolto sulla mappa»). Poi: «beh la logica del completato deve
basarsi sul tesoro del palazzo non sul boss» e «che potrebbe essere da sconfiggere a più riprese dentro un palazzo».

Risposte dell'utente, parola per parola:
- quando un Palazzo è completato: «devono essere entrambe valide le condizioni sono in AND non in OR»;
- alla domanda di chiarimento sulle condizioni da mettere in AND: «Tesoro + boss + raccolto tutto»;
- il segno automatico del boss nella Guida quando si raccoglie il Tesoro: «Sì, resta solo come segno (Recommended)»;
- la proposta: «Sì, procedi (Recommended)». La proposta diceva anche che il segno automatico del boss dato dal Tesoro non
  conta per la condizione del boss;
- dopo il primo esame del validatore, alla domanda «Come risolvo il conflitto fra il segno automatico del boss (messo dal
  Tesoro) e la condizione «boss finale sconfitto»?»: «Togli l'automatismo (Recommended)». Il conflitto stava in due casi:
  - un pin «Boss» collegato alla voce del boss veniva raccolto dal segno automatico, e il boss risultava sconfitto;
  - la Guida mostrava il boss già «Ottenuto» mentre il requisito diceva che mancava, senza un modo semplice di
    confermarlo. Questa risposta supera quella sul segno «solo come segno».

Che cosa ne segue (supera la regola del 2026-09-30, in cui bastava una condizione):
- **Le tre condizioni.** Un Palazzo è completato quando valgono tutte e tre:
  - **Tesoro:** lo spillo «Tesoro del Palazzo» raccolto. Senza uno spillo così sulle planimetrie il Palazzo non si
    completa finché non lo si mette con l'editor. Nel pacchetto di oggi mancano quelli di Futaba, Iweleth e Maruki.
  - **Boss finale:** il suo spillo raccolto sulla mappa, oppure il boss segnato nella Guida.
  - **Raccolto tutto:** il 100% della raccolta, con la regola della scheda del Palazzo.
- **Il motivo** mostrato diventa «Tesoro, boss finale e raccolto tutto (n/n)».
- **Il requisito rosso** («Completare il Palazzo», «dopo il Palazzo di X») dice che cosa manca, per esempio «manca il Tesoro
  del Palazzo raccolto, tutto il raccolto (12/40)».
- **I Memento non hanno planimetrie:** restano completati dal boss finale segnato nella Guida, come prima.
- **Effetti invariati.** Mappa di Tokyo, ingressi bloccati, requisiti e disponibilità seguono la regola nuova.
- **Niente più automatismo.** Raccogliere il Tesoro o il boss non segna più niente nella Guida (supera la scelta del
  2026-09-30). La migrazione utente 017 toglie i segni automatici rimasti nelle partite, e quelli messi dall'utente restano.
  Se il boss era un passo di un Enigma, l'Enigma segue. I pin non si toccano: un pin raccolto resta raccolto, e se è il boss
  finale vale come boss sconfitto.
- **La partita «Tutorial»** dell'utente torna a mostrare Kamoshida all'11/04: il boss raccolto da solo non basta più.

## 2026-10-04 — Il cartellino del Palazzo sotto le azioni della guida segue le regole d'atterraggio

Richiesta dell'utente: «anche il link al palazzo riportato sotto le azioni della guida deve rispettare le regole del pin sulla
mappa». Con due schermate: il cartellino rosso «Palazzo di Kamoshida» sotto un'azione del 12/04 e l'icona KAMOSHIDA sulla mappa
di Tokyo.

Risposte dell'utente, parola per parola:
- a quale giorno si applicano le regole: «Il giorno dell'azione (Recommended)»;
- dove si apre la planimetria: «Come l'icona della mappa (Recommended)», cioè nella scheda «Oggi» dentro la mappa accanto e
  altrove nella pagina della mappa.

Che cosa ne segue:
- **Il calcolo sul server.** Il server dà a ogni voce collegata a un Palazzo il suo atterraggio (`AzionePercorsoDto.atterraggio`),
  calcolato con le stesse regole dell'icona (`atterraggioDelGiorno`) per il giorno della voce, non per quello della partita.
- **Dove porta il cartellino.** Alla planimetria, centrata sul pin d'arrivo se c'è:
  - nella scheda «Oggi» (Home e Partita) la apre nella mappa accanto, senza cambiare pagina;
  - nella guida completa apre la pagina della mappa.
  
  Senza una regola che copra quel giorno, porta alla scheda del Palazzo come prima.
- **«Sulla mappa»** accanto porta ancora all'ingresso in città. Da questa voce in poi, sul telefono, fa anche scorrere la
  pagina fino alla mappa (punto qui sotto).
- **Scorrimento sul telefono.** Il primo esame del validatore ha notato che sul telefono la mappa della scheda «Oggi» sta in
  fondo alla pagina. Alla domanda «Sul telefono (e quando la mappa non è in vista): toccando il cartellino del Palazzo o «Sulla
  mappa» la pagina deve scorrere fino alla mappa?» l'utente ha risposto «Sì, scorri alla mappa (Recommended)».
  - Ogni richiesta di una voce incrementa `StatoMappaOggi.richiesta`.
  - `OggiMappa` porta in vista la colonna solo se è fuori dallo schermo; se è già visibile non si muove niente.
  - Vale anche per «Sulla mappa».
  - Anche Alt+clic sul cartellino resta un collegamento.

## 2026-10-04 — Il pin del Confidente si può condizionare

Domanda dell'utente: «come mai non posso condizionare la comparsa dei pin del Confidente (impostare una condizione di
visualizzazione?)».

Il motivo era la regola del 2026-09-11: gli spilli di categoria «Città» non hanno condizioni, perché la disponibilità è di
ciò che mostrano. Vale per i negozi, che seguono i loro orari, ma il pin del Confidente non eredita niente dal Confidente: senza
condizioni restava sempre in vista.

Risposta dell'utente, parola per parola, alla domanda «Come apro le condizioni di visualizzazione ai pin della categoria
«Città»?»: «Solo i pin Confidente».

Che cosa ne segue:
- **La regola.** È `ammetteCondizioni(tipo)` in `shared/spilli.ts`: tutte le categorie tranne «Città», più il tipo
  «Confidente». La usano il server (creazione, modifica, importazione del pacchetto, confronto col seed) e l'editor.
- **Il pin del Confidente** ha la sezione «Condizioni» nell'editor. Le condizioni si salvano, passano dal pacchetto e si
  valutano con la partita come per gli altri pin: rosse, il pin si nasconde.
- **Negozio, luogo e attività** restano senza condizioni. Cambiando tipo da Confidente a uno di questi, le condizioni se ne
  vanno.

## 2026-10-04 — Nella guida dell'area, «Ottenuto» passa alla voce successiva

Richiesta dell'utente: «sulla guida quando clicco su Ottenuto deve chiudersi l'elemento corrente e nascondersi, andando
all'elemento successivo».

Prima la voce aperta restava aperta e visibile anche segnata, e la successiva andava aperta a mano.

Risposte dell'utente, parola per parola:
- «Lo stesso comportamento (chiudi, nascondi, apri la successiva) vale anche per «Esaurito»?» → «Sì, anche Esaurito
  (Recommended)»;
- «Procedo con la proposta?» → «Sì, procedi (Recommended)».

Che cosa ne segue:
- **Dopo il salvataggio.** Con «Ottenuto» o «Esaurito», a salvataggio riuscito, la voce si chiude e, segnata, esce dall'elenco.
  Con «Anche le segnate» resta, chiusa.
- **Quale voce si apre.** La successiva da segnare: la prima dopo la corrente nell'ordine dell'elenco (le voci e, dentro un
  Enigma, i suoi passi), che passa i filtri, non è segnata e non è descrittiva. Segnando un Enigma si saltano i suoi passi,
  che si segnano con lui. La pagina scorre fino a lei se serve.
- **Senza successiva** non si apre niente.
- **Se il salvataggio fallisce** la voce resta aperta, con l'errore notificato. Per questo `cambiaStato` della pagina del
  Palazzo ora dice se è riuscito.

## 2026-10-09 — Le condizioni di visibilità dei pin sono assolute

L'utente, sulla planimetria «Cancello del castello» del Palazzo di Kamoshida, con la partita al 21 aprile:
- il pin «Punto di Infiltrazione Iniziale», con la condizione «NON Data di gioco dal 20 aprile», restava visibile
  semitrasparente anche con «Giorno corrente» acceso;
- «perchè vedo anche i pin che dovrebbero essere invisibili come semitrasparenti?»

La causa era la regola degli elementi fissi (`restaInVista`, ripristinata il 2026-10-03 dopo una domanda posta su richiesta
del validatore). Un pin nativo di tipo strutturale (porta, forziere, infiltrazione…) con una condizione che non valeva restava
in vista, marcato «non ancora», invece di sparire.

Decisione dell'utente, parola per parola: «se ci sta una condizione di visibilità questa deve essere assoluta... cosa diversa
invece è se qualcosa è stato "raccolto" in quel caso va bene resti semitrasparente...»; poi «sistema».

Che cosa ne segue:
- se le condizioni di un pin non valgono, il pin sparisce, di qualunque tipo e provenienza sia;
- ricompare, grigio, solo con «Mostra anche i non ancora disponibili» nel visore; nell'editor con «Giorno corrente» spento si
  vedono tutti i pin, normali (la mappa è chiesta senza partita, quindi senza disponibilità);
- lato server un prerequisito non soddisfatto lascia lo stato «ignoto» e una condizione di presenza «bloccato», ma il visore
  nasconde tutti e due: anche un prerequisito che manca (es. un oggetto non ancora ottenuto) fa sparire un elemento fisso
  nativo;
- i pin raccolti non cambiano;
- tolti `restaInVista`, `bloccatoDaAltriPin` e il parametro `tieni` di `proiezioneDiPresenza`, che servivano solo a quella
  regola;
- `TIPI_STRUTTURALI` resta per non copiare la presenza di un luogo sui suoi pin fissi (`presenzaEntita`);
- l'ingresso a un Palazzo completato sparisce come prima.

Mio errore nella risposta all'utente: nel primo screenshot ho letto il «NON» come attivo e ho attribuito la visibilità a una
condizione scritta al contrario. Non era così.

## 2026-10-09 — Un pin può appartenere a più voci della guida

Richiesta dell'utente: «i pin dei luoghi possono essere agganciati anche a più di un evento area per volta...». La mia domanda, per
intero: «Sul tuo messaggio «i pin dei luoghi possono essere agganciati anche a più di un evento area per volta»: intendi che lo
stesso pin, per esempio un punto di infiltrazione, deve potersi collegare a più voci della guida, anche di aree diverse? Oggi un pin
si collega a una voce sola. Oppure parli d'altro, come i pin di città e gli eventi del percorso giorno per giorno?». L'utente ha
risposto «sì a entrambe le domande» (l'altra domanda era la cancellazione delle copie dei database). Su richiesta del validatore ho
chiesto se anche l'alternativa faceva parte della richiesta: «Avevi risposto «sì a entrambe le domande». La mia seconda domanda
conteneva anche un'alternativa: «Oppure parli d'altro, come i pin di città e gli eventi del percorso giorno per giorno?». Anche quella
fa parte della richiesta?» → «No, solo voci della guida (Recommended)». Prima un pin di una voce rifiutava la seconda (409
`pin-gia-collegato`, «scollegalo prima»).

Risposte dell'utente, parola per parola:
- «Un pin collegato a più voci (es. il punto di infiltrazione per «Infiltrati nel castello» e per un evento di un'altra area): come
  si comportano gli stati?» → «Voci indipendenti (Recommended)» («Ogni voce si segna da sola. Il pin risulta fatto (semitrasparente,
  contato come preso) solo quando tutte le sue voci sono segnate. Nel popup della mappa compare una riga per voce, ciascuna con i
  suoi pulsanti Ottenuto/Esaurito.»);
- «Da dove si collegano le voci a un pin?» → «Guida ed editor (Recommended)» («Dalla guida con «Collega pin», come oggi. Nell'editor
  della mappa ogni pin mostra l'elenco delle sue voci, con «Scollega» e «Aggiungi voce».»).

Che cosa ne segue:
- **Dati.** Il collegamento sta in `spillo_voce(spillo_id, voce_chiave)`, molti a molti (migrazione 098). I collegamenti di
  `spillo.voce_chiave` (094) passano lì, e la colonna esce dallo schema: `spillo` si ricostruisce come nella 042.
- **Stati.** Ogni voce si segna da sola; il pin è fatto quando le sue voci sono tutte segnate. Questo vale per il «raccolto» del
  DTO, la scheda e il completamento del Palazzo (dove il pin conta una volta sola) e la condizione «Pin di una mappa».
  - Collegando una voce nuova a un pin che ne ha altre, la voce non si segna da sé: il «raccolto» del pin parla delle altre voci.
  - Scollegando o eliminando una voce, il pin segue quelle che gli restano.
  - Un pin con una voce sola si comporta come prima.
- **Guida.** «Collega pin» collega anche un pin che ha già altre voci, e la voce lo elenca fra i suoi.
- **Editor delle mappe.** Il pannello «Voci della guida» elenca le voci del pin con «Scollega» e «Aggiungi voce»: le voci si scelgono
  fra quelle del suo Palazzo che si segnano e non sono già sue (`GET /api/mappe/spilli/:id/voci-collegabili`). Ogni gesto si salva subito.
- **Visore.** Nel popup, con più voci, una riga per voce col suo nome e i suoi pulsanti; nella scheda, ogni voce col suo stato.
- **Pacchetto delle mappe.** Porta `voci`; legge ancora `voce` (094-097) e il riferimento «punto» (prima della 094). Una voce che non
  regge si scarta e si conta, una per voce.
- **La spunta di un pin con più voci** (scelta dell'utente, posta su rilievo del validatore: nella scheda del Palazzo la spunta
  lasciava un pin con più voci «fatto» con una voce non segnata). Domanda: «Nella scheda del Palazzo, la lista «Da raccogliere» ha
  una spunta per ogni collezionabile. Che cosa deve fare la spunta su un pin collegato a più voci della guida?» → «Segna tutte le
  sue voci (Recommended)» («Spuntare il pin segna «ottenuto» ogni sua voce ancora da segnare, come premere «Ottenuto» su ogni riga
  del popup: il pin risulta fatto. Togliere la spunta riapre tutte le sue voci.»).
  - Si fa come dalla guida, voce per voce: i passi di un Enigma seguono, i pin delle voci seguono le loro voci. Una voce già
    segnata (anche «esaurito») resta com'è; togliendo la spunta si riaprono tutte, «esaurito» compreso.
  - La spunta di un pin con una voce sola resta com'era (la voce si segna quando sono raccolti tutti i suoi pin). Contano però
    solo i pin che hanno **solo** quella voce: il segno di un pin con più voci parla di tutte, e aspettarlo bloccava la voce
    (P con le voci A e B, Q con la sola A: senza A, P non è raccolto, e senza P raccolto A non si segnava).
  - Collegando un pin, `allineaStatiPunto` segue la stessa regola.
  - Quando una voce si riapre dalla spunta di un altro pin, i pin con più voci la seguono (non restano «fatti»).
- **Le voci descrittive non contano** nella regola «tutte le voci segnate»: non hanno stato. Le regole del collegamento non le
  ammettono, ma una scritta da prima non deve tenere il pin «da fare».

## 2026-10-11 — Una planimetria senza niente da raccogliere è completata

Richiesta dell'utente: «se una planimetria non ha niente da raccogliere deve figurare come completata». Prima, nella pagina del
Palazzo, diceva solo «niente da raccogliere» e il chip «N planimetrie · X complete» contava fra le complete solo quelle con
collezionabili tutti presi (Kamoshida: «34 planimetrie · 0 complete»).

Risposte dell'utente, parola per parola:
- «Nell'elenco delle planimetrie, oggi la spunta verde ✓ accanto a una stanza vuol dire «tutte le sue aree della guida sono
  completate» (scelta del 4 ottobre). Una planimetria senza niente da raccogliere deve prendere anche la ✓?» → «Sì, anche la ✓»
  (testo dell'opzione: «La ✓ compare anche accanto alle planimetrie senza niente da raccogliere, oltre al testo «· completa»:
  cambia il significato della spunta, che diventa «completa per aree o per raccolta»»);
- «Procedo con la proposta (punti 1-5)?» → «Sì, procedi (Recommended)»;
- a una mia domanda di chiarimento (se la ✓ andasse anche dove si è raccolto tutto) l'utente ha chiuso la domanda e poi ha
  scritto: «✓ deve comparire sia dove hai raccolto tutto (come adesso) che dove non c'è niente da raccogliere (nuovo
  requisito)», e ancora «non dimenticare il punto precedente: se una planimetria non ha niente da raccogliere deve figurare come
  completata devi sistemare entrambi».

Che cosa ne segue:
- **La regola.** Con una partita, una planimetria è completa quando ha tutto raccolto o niente da raccogliere. Senza partita niente
  è completo.
- **Il conteggio.** `raccoltaMappe` conta `mappe` e `mappeComplete` su tutte le planimetrie dell'elenco (la mappa del Palazzo
  esclusa), comprese quelle vuote. Il chip in alto e il suo aggiornamento dopo una spunta seguono la stessa regola.
- **Il testo.** «niente da raccogliere · completa», accanto a «3 raccolti · completa».
- **La ✓.** Sulla stanza vale «per aree o per raccolta»: aree della guida tutte completate, oppure raccolta completa. Sulla singola
  planimetria di una stanza con più versioni vale «per raccolta», mentre le sue aree completate hanno già la loro ✓ accanto al nome.
- **Il punto 4 della proposta non serviva.** L'elenco delle aree con «niente da raccogliere sulla sua planimetria» oggi si usa
  solo per i Memento, in forma compatta, quindi non è cambiato niente lì.

## 2026-10-11 — Condizione di visibilità dei pin «Voce della guida»

Richiesta dell'utente: «i pin tra le condizioni devono avere anche la possibilità di scegliere sulla base dello stato dei passi
della guida di un'area la condizione di visibilità». Prima nessuna condizione leggeva direttamente lo stato di una voce della
guida: lo faceva solo un pin collegato alla voce, attraverso «Pin di una mappa».

Risposte dell'utente, parola per parola:
- «Con quali stati si sceglie la condizione «Voce della guida»?» → «Segnata / non segnata (Recommended)» (««segnata» vale se la
  voce è Ottenuta o Esaurita, «non segnata» se è ancora da fare. Come «Pin di una mappa».»);
- «Dove si può usare la condizione «Voce della guida»?» → «Solo nei pin delle mappe (Recommended)» («Come «Pin di una mappa»:
  nell'editor delle mappe. Non compare negli effetti, nei negozi, negli articoli né nelle letture.»);
- su rilievo del validatore (l'elenco offriva anche le 144 voci dei Memento, mentre la proposta diceva «voci dei Palazzi»): «La
  condizione «Voce della guida» oggi offre anche le 144 voci dei Memento (dedali), oltre a quelle dei Palazzi. La proposta
  approvata diceva «voci dei Palazzi». Cosa preferisci?» → «Anche i Memento (Recommended)».

Che cosa ne segue:
- **La condizione.** `{ tipo: 'voce-guida', voce, segnata }`. Nell'editor delle mappe è lo stato «Voce della guida», con gli
  operatori «segnata» e «non segnata».
- **Quali voci.** Si sceglie con la ricerca fra le voci dei Palazzi e dei Memento, raggruppate per «Palazzo › N. Area», col tipo accanto
  (`GET /api/condizioni/voci`). Sono escluse le voci descrittive («Altro»), che non hanno stato; i passi degli Enigmi sono compresi.
- **È di presenza.** Non soddisfatta, nasconde il pin; si combina con TUTTE / ALMENO UNA / NON.
- **Dove vale.** Solo nei pin delle mappe. La rifiutano lo schema delle rotte del catalogo e il controllo delle condizioni, e una
  scheda della guida senza mappa.
- **Validazione.** Al salvataggio una voce che non c'è o è descrittiva si rifiuta (404 `condizione-non-trovata`). Nel pacchetto
  delle mappe si scarta e si conta.
- **Voce eliminata o diventata descrittiva.** La condizione resta grigia (stato «ignoto»). Come ogni condizione che non vale,
  nasconde il pin finché non la si corregge nell'editor; richiamato con «Mostra anche i non ancora disponibili», il pin porta il
  cartellino «Da correggere».
- **Aggiornamento.** Dopo ogni segno nella guida o sulla mappa la mappa si rilegge, e i pin che ne dipendono compaiono o
  spariscono subito.

## 2026-10-11 — Accesso ai cruciverba e alle risposte scolastiche dall'intestazione della Partita

Richiesta dell'utente, con la schermata dell'intestazione della Partita: «qui non vedo l'accesso ai cruciverba o alle risposte
scolastiche.» Le scorciatoie della scuola (`ScuolaOggi`) comparivano solo se la data di gioco della partita aveva domande o un
cruciverba; altrimenti c'era solo la scritta «Oggi nessuna domanda in classe né cruciverba.», senza niente da toccare. In più
guardavano la data di gioco (nella schermata 04-21) anche quando la scheda «Oggi» mostrava un altro giorno (29 aprile).

Risposte dell'utente, parola per parola:
- «I pulsanti del giorno (domande in classe, esame, cruciverba con la risposta) devono seguire la data della partita o il giorno
  che stai guardando nella scheda «Oggi»?» → «Giorno della scheda Oggi» (testo dell'opzione: «Se nella scheda «Oggi» vai al 29
  aprile, i pulsanti mostrano domande e cruciverba del 29 aprile. In più i collegamenti alle pagine complete.»);
- «Procedo con la proposta?» → «Sì, procedi (Recommended)» (testo dell'opzione: «Collegamenti sempre visibili alle pagine
  complete, più i pulsanti del giorno scelto sopra.»).

Che cosa ne segue:
- **Collegamenti sempre presenti.** «Domande e risposte» porta a `/guida/domande` e «Cruciverba» a `/guida/cruciverba`. Ci sono
  in ogni giorno e anche senza data di gioco.
- **Il giorno dei pulsanti.** Con la scheda «Oggi» aperta è il giorno che la scheda mostra (`OggiPartita` lo comunica con
  `onGiorno`). Con un'altra scheda, o prima che la scheda abbia caricato il suo primo giorno, è la data di gioco. Mentre la scheda
  carica il giorno nuovo l'intestazione resta sull'ultimo giorno mostrato: non ripiega per un attimo sulla data di gioco.
- **Niente nuove letture.** Scorrere i giorni filtra gli elenchi di domande e cruciverba già caricati; la finestra aperta su un
  giorno si chiude cambiando giorno.
- **Il testo.** «Oggi» solo quando il giorno guardato è la data di gioco; per un altro giorno «Il 13 aprile nessuna domanda in
  classe né cruciverba.» e, sul pulsante delle domande in classe, «1 quel giorno» al posto di «1 oggi».

## 2026-10-11 — Mementos: Dedalo → Aree → Elementi, e Richieste modificabili

Richieste dell'utente, parola per parola:
- «ora sto iniziando a lavorare sui mementos. Prima cosa in assoluto come faccio a modificare i dettagli relativi alle
  richieste? non ho un pulsante modifica. Poi vorrei capire come organizzare gli obiettivi del dedalo... considerando che non
  ho la possibilità di fare nulla...»
- poi, mentre lavoravo alla proposta: «poi devo poter definire in ogni Dedalo delle aree... e in quelle aree devo poter
  modificare gli elementi...i dettagli dell'area e le cose da vedere o da fare... ogni elemento deve avere uno stato... solo
  quando tutti gli elementi di un'area sono in stato completato l'area deve risultare completata. un dedalo diventa completato
  se tutte le sue aree sono completate.»

Risposte dell'utente alle domande:
- «Per le Richieste dei Mementos, che cosa vuoi poter fare?» → «Modifica, aggiungi, elimina (Recommended)»;
- «Che cosa deve contare negli obiettivi di un dedalo (la sua percentuale)?» → «Timbri, richieste e voci scelte
  (Recommended)» (poi superata dalla struttura ad aree, vedi sotto);
- «Dove vuoi i comandi di modifica delle Richieste?» → «In entrambi i posti (Recommended)»;
- «Se elimini una Richiesta che qualcosa cita (condizioni, requisiti, pin, azioni del percorso), che cosa deve succedere?» →
  «Si elimina e si avvisa (Recommended)»;
- «Procedo con la proposta (A Richieste, B Timbri, C Voci obiettivo, nell'ordine)?» → «Sì, procedi (Recommended)» (poi
  riorganizzata dopo il secondo messaggio);
- «Richieste e timbri, nella nuova struttura Dedalo → Aree → Elementi, dove stanno?» → «Elementi delle aree (Recommended)»;
- «Le voci che ogni dedalo ha già oggi (es. le 9 di Qimranut) dove finiscono?» → «In un'area iniziale (Recommended)»;
- «Gli elementi puramente informativi (oggi le voci «Altro» descrittive, senza stato): come si trattano nelle aree dei
  dedali?» → «Tutti con stato (Recommended)»;
- «La parte C già approvata (voci scelte una per una come obiettivi) con la nuova regola non serve più: la sostituisco? E lo
  stato «completato» di un elemento è Ottenuto o Esaurito, come nei Palazzi?» → «Sì a entrambe (Recommended)»;
- «Un'area del dedalo senza nessun elemento: è completata?» → «Sì, completata»;
- «Nella percentuale, i Timbri di un'area contano come un elemento solo o uno per timbro?» → «Uno per timbro»;
- «Eliminando un'area del dedalo, che fine fanno i suoi elementi?» → «Voci via, Richieste da collocare (Recommended)»;
- «Procedo con questa struttura e quest'ordine (1. Aree dei dedali, 2. Richieste modificabili)?» → «Sì, procedi
  (Recommended)».

Che cosa ne segue (prima parte, le aree dei dedali):
- **Struttura.** Il dedalo resta com'è (mappe, pozzo, collegamenti); sotto ci sono le sue aree (`area_dedalo`, 099) con nome,
  dettagli e timbri. Gli elementi di un'area sono le sue voci della guida, le sue Richieste e i suoi timbri.
- **Stati.** Una voce è completata Ottenuta o Esaurita; una Richiesta «Completata»; i timbri quando sono tutti. Nelle aree dei
  dedali ogni voce ha uno stato, anche «Altro»: la regola delle voci descrittive resta solo per i Palazzi.
- **Completamento.** Un'area è completata quando tutti i suoi elementi lo sono; un'area vuota è completata. Il dedalo è
  completato quando tutte le sue aree lo sono. **Un dedalo senza aree** risulta completato: non l'ha scelto l'utente, è la
  conseguenza coerente della scelta sull'area vuota (nessuna area da completare); lo segnalo qui perché lo si possa cambiare.
- **Percentuale.** Elementi fatti su elementi totali, i timbri uno per timbro.
- **Le voci di oggi** stanno nell'«Area 1» di ogni dedalo (tutti e nove ne avevano), con le Richieste e i timbri del dedalo; i
  timbri già raccolti nelle partite la seguono (utente 018).
- **Eliminando un'area** se ne vanno le sue voci con quel che le partite ne avevano segnato e i suoi timbri; le Richieste restano
  nel dedalo «da collocare», visibili, fuori dal conteggio finché non si sceglie un'area (selettore dell'area accanto a ogni
  Richiesta, `PUT /api/compendio/richieste/:chiave/area`).
- **La parte C** (voci scelte una per una come obiettivi) è sostituita: contano tutti gli elementi delle aree. La voce del
  2026-09-12 «Nei Memento la colonna sono gli obiettivi del dedalo (timbri + richieste)» è superata.

Che cosa ne segue (seconda parte, le Richieste modificabili):
- **Dove.** Lo stesso modulo (`ModuloRichiesta`) si apre da «Modifica» su ogni carta della pagina Richieste e su ogni Richiesta
  della colonna del dedalo, e da «Aggiungi una Richiesta» in cima alla pagina e in ogni area del dedalo (lì nasce in quell'area).
- **Campi.** Tutti quelli della carta: nome, committente, date, dedalo e area del dedalo (o «da collocare»), piano, bersaglio con
  forma demoniaca, livello, debolezze e resistenze (una per riga), confusione utile, ricompense, Confidente e rango, note.
- **La chiave non cambia mai**, nemmeno col nome. I requisiti dei Confidenti della guida citano le Richieste per **nome**:
  rinominandone una, quelli che la citavano passano a citarla per chiave e il loro testo dice il nome nuovo, altrimenti
  smetterebbero in silenzio di riconoscerla. La colonna `area` tiene la prosa della guida sul dove («Dedalo di Aiyatsbus (Area 7)
  / Dedalo di Da'at (Area 1) se rimandata…») finché la Richiesta non cambia dedalo.
- **Eliminazione** («Si elimina e si avvisa»): prima la finestra dice chi la cita (partite con uno stato, pin, condizioni anche
  dentro i gruppi, requisiti dei Confidenti, azioni della giornata); poi se ne vanno i suoi stati nelle partite, i
  pin e le azioni perdono il collegamento e restano; condizioni e requisiti restano e diventano grigi, «Da correggere» (prima una
  Richiesta che non c'era risultava «non completata», rossa). Le «azioni del percorso» dell'opzione sono le azioni della
  giornata (`voce_giornata`, migrazione 092); la copia storica in `giorno_percorso.azioni_json` non si conta e non si tocca.
  Requisiti e condizioni che la citavano per chiave tornano a citarla per nome (scelta tecnica, non dell'utente: la chiave di una
  Richiesta che non c'è più non dice nulla, e l'avviso mostrava «lo-zio-ingordo» invece di «Lo zio ingordo»).
- **Nome unico.** Due Richieste non possono avere lo stesso nome (senza badare alle maiuscole, accentate comprese: «È» e «è» sono la
  stessa lettera, come per i semafori): i requisiti dei Confidenti citano per nome e diventerebbero ambigui. Rinominando, anche le voci della giornata che la indicano mostrano il nome nuovo.
- **Aggiungere senza aree.** In fondo alla colonna del dedalo c'è anche «Aggiungi una Richiesta» (nasce nel dedalo, l'area si
  sceglie nel modulo o resta da collocare): serve a un dedalo che non ha ancora aree.
- **Correggere i requisiti dei Confidenti** (rilievo del validatore: nell'app non c'era modo di correggerli e il rango restava
  bloccato per sempre). Domanda: «Se elimini una Richiesta citata da un requisito di un Confidente, il requisito resta «da
  correggere» ma oggi nell'app non c'è modo di correggerlo, e quel rango non risulterebbe mai pronto. Come preferisci?» →
  «Requisito correggibile (Recommended)» (testo dell'opzione: «Aggiungo nella scheda del Confidente il modo di correggere un
  requisito «da correggere»: scegliere un'altra Richiesta al suo posto, oppure toglierlo. Così vale davvero «restano, da
  correggere» e il rango si sblocca correggendo.»). Il semaforo dice «da correggere» (non «da confermare») e porta «Correggi»,
  nella scheda del Confidente e in Partita → Confidenti; la finestra cambia la Richiesta citata (per chiave) o toglie il requisito
  per tutte le partite, con le conferme a mano che ne avevano.

## 2026-10-11 — Memento: Persona in cima, Richieste, Trama

Richiesta dell'utente: «nel memento le persona disponibili devono essere visualizzate con le loro immagini e cliccabili nella parte
alta del memento. Le persone catturate o meno non influiscono sulla percentuale di completamento del memento. A seguire le
richieste e poi gli elementi Trama... unico tipo visto che nei memento è tutto random quindi è impossibile segnare Stanze, porte,
meccanismi forzieri o altro... la mappa quindi deve essere molto piccola...diciamo 30% rispetto all'attuale... pensa e impagina
correttamente questa sezione...». Scelte dell'utente (domande e risposte):
- «Quale «mappa» va ridotta al 30%?» → «Immagine del dedalo (Recommended)»: il disegno del dedalo al centro diventa una
  miniatura accanto al titolo; il pozzo a sinistra, che serve a scegliere il dedalo, resta com'è.
- «Toccando una Persona cosa succede, e la cattura si segna ancora?» → «Il tocco segna catturata» (testo dell'opzione: «Il tocco
  alterna catturata/non catturata; la scheda del compendio si apre da un collegamento piccolo.»).
- «Le voci di oggi che non sono Persona diventano tutte «Trama»?» → «Sì, tutte Trama (Recommended)». Nella domanda avevo scritto
  33 voci: sono 32 (20 Altro, 5 Boss, 4 Stanze sicure, 2 Oggetto, 1 Enigma), corretto in chat.
- «Le Persona in cima: tutte quelle del dedalo insieme, o divise per area?» → «In cima a ogni area».
- (rilievo del validatore) «Nel Dedalo di Da'at c'è la voce «Straziato re dei desideri», di tipo Persona ma senza maschera («-»,
  personalità «Non reclutabile»): è un'Ombra che non si può catturare. Così com'è finirebbe tra le Persona in cima all'area,
  senza immagine e fuori dal conto. Cosa ne faccio?» → «Diventa Trama (Recommended)». La migrazione 100 lo applica a ogni Persona
  dei Memento con la maschera «-»; una Persona aggiunta senza maschera resta Persona. Il miniboss omonimo di Kamoshida non cambia.

Conseguenze tecniche (non scelte dell'utente):
- «Trama» è un tipo nuovo (`trama`), non «Storia»: Storia resta dei Palazzi, Trama è solo dei Memento, e il server lo fa rispettare.
- La Persona di una voce si ricava dalla maschera scritta dalla guida con l'indice che già collegava le Ombre della guida alla
  battaglia (`server/services/maschere.ts`). Una Persona nuova o corretta si sceglie dal compendio: la maschera diventa il suo
  nome italiano, e cambiandola i dettagli dell'Ombra di prima (resistenze, debolezze, personalità) se ne vanno, perché erano di
  un'altra maschera.
- «Catturata» è lo stato «Ottenuto» della voce Persona: resta per partita, ma non entra nel conto (`contaNelDedalo`).
- Impaginazione (scelte mie, da confermare con l'utente se non vanno): una colonna sola per il dedalo, la miniatura del disegno a
  destra del titolo; i timbri, che la richiesta non collocava, stanno fra le Richieste e la Trama (sono elementi che contano,
  come loro); le Persona sono piastrelle larghe almeno 88 px (tre per riga sul telefono) con «Scheda» e «Modifica»; correggere,
  aggiungere ed eliminare una Persona si fa in una finestra (`ModuloPersona`), perché il modulo in linea della guida non entra in
  una piastrella.
  Rimandando la stessa Persona (un modulo che salva tutto) i dettagli restano come sono.
- Nei dedali non ci sono più Enigmi con passi (il tipo non è ammesso). Misurato sulla copia di prima della 100 e sul pacchetto:
  nessun passo, nessun Enigma con passi, nessun pin collegato a voci dei Memento. La migrazione resta sicura per un pacchetto
  importato più avanti: i passi di un Enigma convertito tornano voci della sua area, in fondo, ognuno col suo stato; i pin
  collegati restano collegati (Trama non è descrittiva). I Memento hanno sì delle planimetrie («aree fisse» con pin del gioco).

## 2026-10-12 — Memento: aree reali e pagina per formato

Richiesta dell'utente (vedi ROADMAP, «Richieste del 12 ottobre 2026»): la pagina dei Memento del 2026-10-11 è «disfunzionale»
nell'intero impianto; in ogni dedalo ci sono più aree, e ogni area ha quattro elementi: Timbri, Persona, Richieste, Trama. Prima
della proposta l'utente ha chiuso le domande sulla struttura («[User dismissed]») e ha spiegato il modello a parole; poi:
- Timbri: «i timbri dovrebbero far parte della percentuale di completamento del dedalo»; alla proposta (totale per dedalo o per
  area) «li conterò io man mano e li setterò come sistemerò il resto dei dati dei memento» → il totale è per area e lo imposta
  l'utente; i timbri contano nell'area e nel dedalo; un'area senza totale non li conta.
- Persona: «Se la persona è catturata vale per tutte le aree e i dedali.»; poi «La cattura o meno delle Persona puoi valutarla
  dal compendio... dove vedi se una persona è stata sbloccata o meno nella partita» → catturata = registrata nel compendio della
  partita (`compendio_partita.registrata`).
- Interazione: «I timbri come le Persona devono essere banalmente un click per segnare i timbri ottenuti».
- Grafica: «progettalo poi dimmi quali elementi grafici serve generare che chiedo a codex di generarli» → sette icone in
  `docs/grafica/consegna-2026-10-12-memento.md`.
- Progetto (dati, interazioni, impaginazione per desktop/tablet/telefono, aree dalla guida) → «Approvo».

Conseguenze tecniche (non scelte dell'utente):
- Le aree vengono dalla guida (migrazione 101), proposta «Dalla guida» del progetto approvato; un dedalo che l'utente aveva già
  organizzato a mano non si tocca. «Lo zio ingordo», per cui la guida non dice l'area, resta da collocare.
- Una Persona si incontra in più aree: la voce sta nel dedalo e le sue aree in `persona_area_dedalo`; nei dedali una Persona resta
  Persona e una Trama resta Trama (per passare dall'una all'altra si elimina e si aggiunge).
- Il tocco registra la Persona nel compendio; toglierla dal compendio cancella livello, bonus e abilità che vi aveva registrati,
  e per questo chiede conferma.
- I totali dei timbri che la 099 aveva messo nell'Area 1 (erano quelli del dedalo) si svuotano: restano scritti nella
  descrizione del dedalo. I timbri che una partita vi aveva già segnato erano del dedalo intero e non hanno un'area: la
  migrazione «utente» 020 li toglie con la stessa regola dell'app (svuotare un totale toglie i raccolti dell'area) e ne scrive il
  numero nel registro; altrimenti ricomparirebbero, sbagliati, nell'Area 1 appena le si desse un totale. Sui dati dell'utente
  erano 0 righe (misurato; rilievo F3 del validatore).
- La Trama va nell'area che il suo nome indica, altrimenti in quella che la descrizione nomina se ne nomina una sola («Compare
  nella Sala di controllo cognitivo», «nel 'Corridoio della prigione - Parte I'», «Dopo l'Area 14»); senza indizi resta nella
  prima area, e l'utente la sposta (rilievo F2 del validatore: sui dati, 5 dal nome, 3 dalla descrizione, 25 senza indizi,
  elencate all'utente).

Scelta dell'utente sul rilievo F1 del validatore (la cattura aveva ancora un secondo modo, lo stato della voce, e una condizione
«Voce della guida» su una Persona dei Memento sarebbe rimasta rossa per sempre; sui dati: 0 condizioni, 0 pin collegati, 0 stati):
alla domanda «Come vuoi che funzionino?» → «Leggono il compendio». Quindi (`server/services/catturePersona.ts`):
- una condizione «Voce della guida» su una Persona dei Memento è verde se la sua Persona è registrata nel compendio della partita
  («catturata (nel compendio)»); la voce resta citabile nell'editor delle mappe;
- lo stato di quella voce non si segna più (400 `cattura-nel-compendio`; azzerarlo resta possibile) e un pin non vi si collega
  (stesso codice): l'unico modo di segnare la cattura è il compendio; un collegamento rimasto da prima non la segna;
- lo stato della voce nella scheda dei Memento viene dal compendio («ottenuto» se catturata). Le Persona dei Palazzi non cambiano.

Conseguenze tecniche della pagina per formato (voce 2; non scelte dell'utente, misurate nel browser):
- Persona a sinistra e Richieste con Trama a destra da 1280 px, non da 1024 come nella bozza: fra 1024 e 1279 px, accanto al menu
  dell'app e al binario dei dedali, la colonna del dedalo è larga circa 500 px (494 a 1024×690) e le due colonne vi stavano
  strette; lì i quattro elementi stanno uno sotto l'altro.
- Le schede delle aree restano in vista scorrendo a ogni larghezza (la bozza lo diceva del telefono): da 1024 px scorre la colonna
  del dedalo, e con la scheda del dedalo in cima le aree uscivano di vista appena si scendeva. Sono una riga sola che scorre di lato
  (`fila-scorrevole--sempre`): Da'at ha 16 aree, che a capo prendevano più righe proprio in quello che resta fisso.
- L'intestazione del Memento è compatta a ogni larghezza (emblema e anello piccoli; date, mappe e conteggi in una piega; il sovrano
  sul telefono nella piega): alta 170 px, a 1280×689 lasciava al pannello dell'area meno di 200 px. «Correggi la scheda» del
  Memento, che sistema la guida, compare solo in «Modifica la guida».
- Nel binario e nella fila i dedali hanno il nome breve («2 Aiyatsbus 31%», come nella bozza); il nome intero nel suggerimento.
- Da 1024 px il disegno del pozzo sta fisso in cima al binario (richiesta dell'utente «lascia sempre visibile Pozzo», scelta «Disegno
  fisso in cima»): i suoi strati più bassi si stringono come nel gioco e a 1024 px quattro sono sotto i 44 px (34×28 Da'at);
  ogni dedalo resta raggiungibile dall'elenco sotto, con bersagli da 44 px.

## 2026-10-12 — Tag delle allerte meteo nelle giornate

Domanda dell'utente: «nelle giornate della partita gli allerta vengono gestiti automaticamente?»; risposta: le date sì (le
mostra l'app), gli effetti no, salvo la pioggia torrenziale che conta come pioggia. Richiesta: «vorrei venisse mostrato un tag
con l'allerta meteo quando in quella giornata è presente». Scelte dell'utente (AskUserQuestion): dove → «Partita → Oggi»,
«Guida giorno per giorno», «Calendario di gioco»; al tocco → «Solo il nome». Poi: «se serve fai i prompt e passameli da passare
a codex per le grafiche» → consegna `docs/grafica/consegna-2026-10-12-allerte.md` (sei icone, `ui/allerta-<nome>`).

Conseguenze tecniche (non scelte dell'utente):
- Il tag sta nella scheda del giorno (`GiornoGuida`), la stessa in «Oggi» e nella guida giorno per giorno; il bollino senza nome
  che stava sui pulsanti «Giorno»/«Sera» di «Oggi» se n'è andato (l'opzione scelta diceva che il tag ne prende il posto).
- Un tag per allerta, con la fascia se è una sola («Notte torrida · sera»); gli effetti nel suggerimento. Le allerte sono del
  catalogo: si vedono anche senza partita.
- Gli effetti di ondata di gelo (attività come con la pioggia) e di ondata di calore e notte torrida (distributori senza
  bevande) restano non applicati: l'utente non l'ha chiesto.

## 2026-10-12 — Spostare le voci fra le aree di un Palazzo; copiare e spostare le voci del diario

Richiesta dell'utente: «devo spostare delle voci da un'area ad un'altra nel palazzo... vorrei anche poter copiare elementi del
diario (giorno/notte testi e riferimenti e poterli inserire in un altro giorno o nella parte giorno o nella parte notte a
scelta)». Scelte dell'utente (AskUserQuestion):
- diario → «Una o più insieme» (si spuntano le voci, poi giorno di destinazione e fascia; finiscono in fondo, nel loro ordine);
- «Sì, anche spostare» (oltre a copiare, spostare in un altro giorno con le spunte delle partite);
- Palazzo → «Sì, nel modulo Modifica» (selettore «Area del Palazzo», come l'area del dedalo nei Memento).

Conseguenze tecniche (non scelte dell'utente):
- La voce spostata tiene la sua chiave: stati delle partite, pin delle planimetrie, marcatore e condizioni che la citano restano
  validi. Va in fondo all'area nuova; un Enigma porta con sé i passi; un passo da solo non si sposta (400 `passo-segue-enigma`);
  le sue schede della guida senza mappa (pin con il riferimento «punto», `area_guida_chiave`) passano con lei. Solo nello stesso
  Palazzo e non nei Memento.
- Diario: la copia è una voce nuova (uid casuale) con lo stesso contenuto (genere, testo, note, tipo, collegamento, rango
  atteso, effetti), senza spunte e senza `indice_guida` (non discende più dalla guida d'origine); lo spostamento tiene uid e
  spunte di tutte le partite e, se cambia data, perde `indice_guida` (la posizione nella guida di QUEL giorno, unica per data:
  portata altrove urterebbe la voce della guida con lo stesso indice o ne prenderebbe il posto per chi cerca per data e indice);
  nella stessa data, cambiando solo fascia, lo tiene. Spostare una voce già spuntata non riscrive quando gli effetti sono
  avvenuti (es. l'incontro col Confidente resta registrato al giorno di partenza); l'annullamento usa gli effetti salvati. Le voci arrivano in fondo alla fascia scelta nell'ordine della giornata di partenza (giorno
  prima di sera); le fasce lasciate si ricompattano. Tutto o niente: una voce che non c'è fa fallire la richiesta senza
  scrivere. È canone come ogni modifica della giornata (vale per tutte le partite ed esce col pacchetto).

## 2026-10-14 — Spostare più voci del Palazzo insieme

Domanda dell'utente: «come faccio a spostare più voci del palazzo insieme?». Fino ad allora si poteva solo una voce alla volta,
dal modulo Modifica («Area del Palazzo», 2026-10-12). Ho proposto di fare per il Palazzo come per il diario (scelta delle voci con
le spunte, barra fissa, «Sposta in…» con l'area d'arrivo, stesse regole della voce singola, tutto o niente); l'utente ha risposto
«sì». Dettagli tecnici della proposta (non scelte dell'utente):
- le righe da scegliere sono le voci dell'area fuori da ogni Enigma: i passi seguono il loro Enigma e non si scelgono da soli;
  «Tutte» prende le voci in elenco (rispetta i filtri per tipo e «Anche le segnate»);
- la finestra parte dall'area che segue nella guida; le voci arrivano in fondo nell'ordine della guida; una voce già nell'area
  d'arrivo resta dov'è; non nei dedali dei Memento (lì c'è «Area del dedalo»).

## 2026-10-14 — I pezzi delle planimetrie: zone dell'immagine posate sulla mappa con condizioni

Richiesta dell'utente: «in alcune mappe ci sono dei pezzi che sono previsti originariamente per posizionarli sopra il resto come
parti mobili soggette a condizioni... mi chiedevo se potessi tu permettermi di selezionarle con il mouse (toglierle dalla
visualizzazione ordinaria e gestirle con le condizioni come i pin in punti specifici della mappa occupando lo stesso spazio
originale...)», con l'esempio del Museo 2P di Madarame («elementi in basso che vorrei poter selezionare e posizionare sulla mappa
indicando la condizione per visualizzarli o nasconderli») e la precisazione «devo poter selezionare io aree da gestire come pezzi».
Scelte dell'utente (AskUserQuestion):
- la zona d'origine → «Sempre cancellata»;
- un pezzo senza le sue condizioni → «Nascosto, in trasparenza a richiesta» (con «Mostra anche i non ancora disponibili», come i pin);
- rotazione → «Sì, rotazione a 90° e specchio».

Conseguenze tecniche (non scelte dell'utente):
- tabella `pezzo_mappa` (migrazione 102) nel file di gioco: canone per tutte le partite, nel pacchetto e nell'esportazione JSON
  delle mappe; tutto in **pixel dell'immagine** (i pin usano percentuali arrotondate allo 0,1%, troppo poco per far combaciare un muro);
- la posizione è l'angolo in alto a sinistra dell'ingombro del pezzo posato; lo specchio si applica prima, la rotazione (oraria,
  attorno al centro) dopo; zona e ingombro devono stare nell'immagine;
- le condizioni sono quelle dei pin, comprese quelle sullo stato di un altro pin o di una voce della guida;
- importazione: un pacchetto che dichiara i pezzi li sostituisce, un pacchetto senza il campo li lascia, un reseed del seed non li
  tocca; la chiave di mappa «pezzi» è riservata alle rotte.
- (2° giro, rilievi del validatore) Sostituire l'immagine di una planimetria che ha dei pezzi — scelta dell'utente: «Chiedere
  conferma ed eliminarli». Il server risponde 409 `mappa-con-pezzi` col numero; con la conferma (`?eliminaPezzi=1`) i pezzi se ne
  vanno con l'immagine di prima, nella stessa transazione. All'importazione i pezzi si scrivono a immagini importate e quelli che
  escono dall'immagine della mappa d'arrivo (o tutti, se non ce n'è una) si scartano e si contano in `pezziScartati`.
- (3° giro, rilievo F3 del validatore) La stessa regola vale per l'importazione: un pacchetto che porta per una mappa un'immagine
  **diversa** da quella che ha (confronto byte per byte), senza dichiararne i pezzi, toglie i pezzi ritagliati dalla vecchia e li conta
  in `pezziEliminati` (importare è già la conferma); un'immagine identica li lascia, perché reimportare la propria esportazione
  non deve perdere nulla.
- (nota N1 del validatore, chiusa con la voce 2) Il confronto dell'importazione guarda l'immagine che la mappa **mostra** (caricata,
  asset predefinito, asset originale, come il visore), fotografata all'inizio e riconfrontata alla fine: copre anche un pacchetto
  che fa puntare la mappa a un'altra immagine già presente o la riporta all'asset.
- Visore (conseguenze tecniche): le zone si cancellano con una maschera alfa (SVG grande quanto l'immagine) sull'immagine di base,
  senza ridisegnarla; i pezzi sono ritagli della stessa immagine (sfondo spostato), sotto i pin; le zone cancellate non contano
  nell'inquadratura iniziale, i pezzi posati sì.

## 2026-10-15 — Barra compatta del visore incorporato e minimo di 240 px sulla tela

Difetto misurato dall'utente: nella scheda di un Palazzo a 1280×689 il visore incorporato è largo 242 px (la colonna della
mappa ne ha 286, fra l'elenco da 360 e la raccolta da 352) e alto 240; la barra andava a capo pezzo per pezzo — briciola,
titolo su due righe, tipo, pulsanti — fino a 130-180 px, lasciando alla tela 240×109 (Kamoshida, Sala centrale) o 240×58
(Madarame, area 07). Anche a 1366 (barra 129) e a 1536 (109: sopra i 460 px i pulsanti riprendono il testo). Proposte:
A barra compatta, B minimo riferito alla tela, C allargare la colonna fra 1280 e 1535 px. Scelta dell'utente: «Approvo A+B»
(C non fatta: tocca un layout scelto dall'utente).

Conseguenze tecniche (non scelte dell'utente):
- Barra compatta con una container query sul visore (`@container (max-width: 720px)`), solo `.visore-mappa--incorporato`: il
  titolo su una riga troncato con «…», con il percorso completo e il tipo nel suggerimento; briciole e chip del tipo nascosti
  (il genitore resta in «Su: …» del pannello, il percorso completo è il nome della tela); pulsanti a sole icone 44×44 accanto al
  titolo o, se non ci stanno, sulla riga sotto. Barra di 53 px, 80 nelle colonne più strette. Lo schermo intero (pagina della
  mappa e «Schermo intero» in pagina) non cambia. La regola è del visore, quindi vale per ogni visore incorporato largo fino a
  720 px; misurato prima/dopo (Oggi su Shibuya, negozio Untouchable con «Dove si trova», Quartiere Shibuya, a 1280×689,
  1366×657, 1024×690, 768×1024, 375×812): dove il visore è sotto i 720 px e la barra andava a capo, scende da 101-109 a 53 px
  e la tela guadagna la differenza (il negozio a 1280 era già a 53 e resta identico); pannello aperto e scheda dello spillo
  restano dove erano; dove il visore supera i 720 px (Quartiere a 1024 e a 768) nulla cambia. Nel negozio a 375 il riquadro
  è alto 240 e la tela ha già un minimo di 240 sotto gli 861 px: resta tagliata, di 53 px invece di 101 (preesistente).
- Il `display` delle tappe del percorso sta nel foglio di stile (`.visore-mappa__tappa`): l'utility `inline-flex` sta nel layer
  `utilities`, più forte di `components`, e impediva alla barra compatta di nasconderle.
- Il minimo: la scheda del Palazzo chiede `--minimo-tela: 240px` da 1280 px e il riquadro è `min-h-fit` invece di `min-h-[240px]`;
  il visore lo applica al suo corpo. Sotto quel minimo scorre la colonna (scelta del 2026-09-30).
- Difetto preesistente trovato verificando, **non corretto** (fuori da A+B; il validatore ha rigettato la correzione fatta
  senza approvazione, ed è stata tolta): con il Pannello aperto, da 861 px di schermo, il pannello prende sempre 340 px
  accanto alla tela, e nei visori incorporati stretti alla tela resta poco o niente (scheda del Palazzo a 1280: visore 242,
  tela 0×240; negozio a 1024: visore 310, tela 0; Oggi a 1024: visore 379, tela 37). Uguale prima e dopo questa modifica;
  proposto all'utente a parte.

## 2026-10-15 — Le copie dei pezzi: un ritaglio definito una volta, posato più volte nella mappa

Richiesta dell'utente: «vorrei poter usare un pezzo una volta recuperato e definito per inserirlo più volte nella mappa.»
Proposte: A un ritaglio con più copie (tabella figlia, migrazione 103), B un «Duplica» che crea un pezzo nuovo e indipendente
con la stessa zona. Scelte dell'utente (AskUserQuestion, tutte le raccomandate):
- modello → «Ritaglio con copie» (A);
- condizioni → «Per copia» (ogni copia ha le sue, come posizione, rotazione e specchio);
- eliminando l'ultima copia → «Se ne va il ritaglio» (la zona d'origine torna visibile; la conferma lo dice);
- nome → «Nome + etichetta copia» (il ritaglio ha il nome; ogni copia un'etichetta facoltativa, vuota = «Nome · copia N»).

Conseguenze tecniche (non scelte dell'utente):
- `pezzo_mappa` resta il ritaglio (zona, nome, ordine) e si ricostruisce senza le colonne della posa (`id`, `uid` e contatore
  degli id invariati); la posa passa a `copia_pezzo` (uid proprio, etichetta, posizione, rotazione, specchio, condizioni, ordine).
  Ogni pezzo esistente diventa un ritaglio con una copia: niente si perde (provato su una copia dei dati con pezzi della 102);
- nella proposta il campo del pacchetto era chiamato `pose`; nell'implementazione si chiama `copie`, come la tabella, il DTO e
  l'interfaccia. L'importazione legge ancora i pezzi della 102 (la posa accanto alla zona) come pezzi con una copia;
- rotte: il ritaglio con `POST /api/mappe/:chiave/pezzi` (nasce con la prima copia), `PUT`/`DELETE /api/mappe/pezzi/:id`; le copie con
  `POST /api/mappe/pezzi/:id/copie` e `PUT`/`DELETE /api/mappe/pezzi/copie/:id`; la correzione di una copia porta anche il nome del
  ritaglio (`nomePezzo`), così il modulo dell'editor salva tutto in una transazione. Schemi `strict`: un campo della posa mandato
  al ritaglio (il contratto della 102) è un 400, non un dato perso in silenzio. Al massimo 200 copie per pezzo;
- cambiando la zona di un ritaglio si riverifica l'ingombro di ogni copia; la sostituzione dell'immagine (409 `mappa-con-pezzi`)
  conta anche le copie (`details.copie`) e le toglie coi ritagli; all'importazione una copia fuori dall'immagine d'arrivo si scarta
  da sola (`copieScartate`), un ritaglio con la zona fuori o senza copie dentro si scarta (`pezziScartati`); un'immagine cambiata
  toglie ritagli e copie (`pezziEliminati`, `copieEliminate`).

## 2026-10-16 — Recupero delle aree di Madarame dal WAL di produzione

Tre aree del Palazzo di Madarame eliminate per errore in produzione (16:16 UTC). Decisioni dell'utente: il recupero si fa in
produzione («recupera tu stesso … ho configurato connessione ssh»); proposta l'applicazione con l'elenco esatto di ciò che si
rimette, approvata («Sì, applica»): solo le tre aree di oggi, non il Giardino centrale (eliminato il 15/10 già vuoto) né le tre
planimetrie eliminate apposta. Conseguenze tecniche: il backup del 15/10 00:36 indicato dall'utente non bastava (dopo c'erano voci
nuove e avanzamento): la fonte è lo stato ricostruito dal WAL un istante prima della prima cancellazione; SQL con INSERT/UPDATE
espliciti (generato da uno script di sola lettura sulle fonti, applicato da uno script Node in un container temporaneo: dichiarato
all'utente dopo, la proposta nominava solo il file SQL).

## 2026-10-16 — Il cestino: le eliminazioni della guida e delle mappe si rimettono

Richiesta dell'utente, dopo il recupero: una protezione contro le eliminazioni per errore. Scelte (AskUserQuestion):
- protezione → «Cestino con ripristino (Consigliato)» (non la conferma col nome da scrivere, non la sola copia automatica);
- ambito → aree dei Palazzi, voci della guida, planimetrie, aree dei dedali (tutte e quattro);
- posizione → «In Impostazioni»;
- svuotamento → solo a mano, un elemento o tutto, con conferma (proposta accettata).

Conseguenze tecniche (non scelte dell'utente):
- **Registro generico, non elenchi scritti a mano**: per la durata della transazione dell'eliminazione, trigger temporanei su ogni
  tabella dei due file chiamano una funzione JS che annota ogni riga cancellata, cambiata o aggiunta (cascate comprese, BLOB intatti;
  `recursive_triggers` acceso perché un `INSERT OR REPLACE` faccia scattare il trigger della cancellazione). Le eliminazioni future
  restano coperte senza toccare il cestino.
- **Due file**: le righe di gioco in `cestino` (gioco.db, migrazione 104), quelle delle partite in `cestino_partite` (partite.db,
  utente 021) con lo stesso `uid`: il pacchetto esportato non porta l'avanzamento. Il pacchetto iniziale generato da un'istanza
  (`npm run pacchetto`) nasce col cestino vuoto; il file esportato da Impostazioni (copia dell'istanza) invece lo porta.
- **Ripristino: quel che è cambiato dopo vince**. Colonna per colonna torna solo ciò che l'eliminazione aveva cambiato e nessuno ha
  toccato dopo; una chiave del file di gioco ormai presa blocca tutto (409, niente cambia); nelle partite lo stato di dopo resta; una
  riga che punta a qualcosa eliminato dopo non torna; le tabelle che l'app ricalcola (percorsi e nomi di prima delle mappe) non
  bloccano e si ricalcolano se serve; l'esito elenca ciò che non è tornato e perché.
- **Il posto**: l'eliminazione annota i vicini (chiave della precedente e della seguente); al ripristino l'elemento torna dopo la
  precedente, in cima se era il primo, prima della seguente, in fondo se era l'ultimo; le aree si rinumerano senza buchi, le voci
  scendono solo se il posto è preso.
- **Peso**: una planimetria porta nel cestino anche le sue immagini (es. 3,4 MB); il file di gioco cresce finché non si svuota, e la
  sezione mostra il peso di ogni elemento e il totale.

## 2026-10-17 — La Dote dei Confidenti solo al passaggio di rango

Segnalazione dell'utente: il 21 maggio un'uscita con Sojiro che dà solo punti («nessun aumento di rango stavolta») ricordava
«Incontro con Sojiro Sakura: Gentilezza +3». Causa: la regola del 2026-09-30 («la Dote arriva da ogni incontro registrato»), con
l'incontro che vale «verso» il rango successivo (rango 3 → verso il 4, che nella scheda di Sojiro dà Gentilezza ♪♪). Scelte
dell'utente (AskUserQuestion): «Solo al passaggio di rango» (per tutti i Confidenti, non per Confidente); la spunta già fatta
«La rifai tu» (togliere e rimettere la spunta: nessuna scrittura in produzione da parte dell'assistente). Le Doti restano a mano:
la regola cambia solo ciò che l'app ricorda (`doteIncontro`, l'etichetta degli effetti).

Conseguenze tecniche (non scelte dell'utente): gli incontri semplici si registrano ancora (uno per momento, per non contare due
volte un passaggio nello stesso momento) con `doti_json` vuoto; un passaggio che trasforma l'incontro semplice del momento gli
scrive la Dote del rango (`giaContato` falso), salvo un incontro della regola di prima che l'aveva già (niente Dote doppia);
togliendo la spunta la riga torna semplice e perde la Dote del passaggio. Il riquadro della scheda si chiama «Dote al passaggio
di rango»; nessuna migrazione (i dati e la tabella `confidente_dote_incontro` restano).

## 2026-10-17 — La guida del quiz dei lavori: il quiz dei codici a barre del Triple Seven

Richiesta dell'utente: «mancava nel post job al triple seven questo: [la tabella inglese «Where is the position of the …
barcode?» con 12 prodotti] … mi serve che integri questo nella guida (quando è previsto lavoro al COnvenience Store deve essere
consultabile la guida (in italiano)». Scelte dell'utente (AskUserQuestion):
- struttura **«Generica per tutti i lavori»**: `attivita.quiz_json` (migrazione 105, `shared/quizAttivita.ts`) con giorni del mese,
  spiegazione, domanda, risposte (nome, altro nome, risposta, nota) e premi per esito; oggi riempita solo per il Triple Seven, le
  altre si scrivono dal modulo «Correggi»;
- nomi **«Entrambi i nomi»**: il nome della guida italiana (allgamestaff) e quello della lista dell'utente, risposta in italiano;
- le due voci il cui abbinamento non è certo (Boy Chance, Tokyo Food Tour ↔ «Black Box»/«Shonen Trip»: le posizioni reggono entrambi
  gli abbinamenti) **«Risposta dalla tua lista, abbinamento segnato "incerto"»**: nome e risposta della lista, i due nomi italiani
  possibili, la nota sempre visibile;
- dove **«Card + Attività + Negozio»** (la prima risposta aveva spuntato anche «Solo nella card del diario»; chiarito con una seconda
  domanda): il cartellino «Guida del quiz» sulle voci che registrano un turno del lavoro (o vi sono collegate), sulla carta del
  lavoro in «Attività» e nella pagina del negozio della stessa sede; in oro («Oggi c'è il quiz · Guida») nei giorni del quiz.

Le risposte seguono la tabella dell'utente tradotta senza perdere nulla; i premi sono quelli della guida italiana (7.400 ¥ e 3 punti
Fascino al primo tentativo, 5.800 ¥ e 2 al secondo, 3.500 ¥ e 2 con due errori). Le Doti restano a mano: i premi sono testo.

## 2026-10-17 — Le finestre non si chiudono più dallo sfondo

Segnalazione dell'utente: «a volte quando con il mouse seleziono del testo nelle aree di testo o caselle di testo scompare la modale
(annullando tutte le modifiche in essa contenute)». Causa: una selezione premuta in un campo e rilasciata fuori dalla finestra arriva
come clic all'antenato comune, lo sfondo, che chiudeva (`Modal`). Scelta dell'utente: **«Mai dallo sfondo»** — tutte le finestre si
chiudono solo con la X o con Esc.

Correzione tecnica trovata nella stessa verifica (non una scelta dell'utente): `.chip--oro`, `.chip--bloccata` e `.chip--icona`
stavano in `tailwind.css` prima di `.chip`, che a parità di specificità li riscriveva: i chip «oro» («Consigliata», «Scadenza», il
rango del prossimo passaggio, «Oggi c'è il quiz») e quelli «bloccati» uscivano grigi come un chip qualunque. Spostati dopo `.chip`;
verificato uso per uso.

## 2026-10-17 — Le vulnerabilità di sviluppo

Segnalazione di GitHub al push su main: 2 vulnerabilità sul ramo predefinito (1 critica, 1 alta). `npm audit` completo: shell-quote
1.9.0 (GHSA-pqg4-j6r4-53mv, critica, iniezione di comandi in `quote()`), arrivata da concurrently 9.2.4 (che la fissa a versione
esatta; serve solo a `npm run dev`), e source-map-js 1.2.1 (GHSA-68fv-2mgg-jv7q, alta, denial of service), arrivata da postcss/vite,
@tailwindcss/node, magicast e css-tree. Tutte di sviluppo, fuori dalle immagini di produzione: il gate della pipeline
(`npm audit --omit=dev --audit-level=high`) era già a 0.

Scelta dell'utente: **`npm audit fix`**, cioè l'aggiornamento minimo dentro gli intervalli già dichiarati, solo nel lockfile:
concurrently 9.2.5 (ramo di manutenzione della 9, con shell-quote 1.12.0) e source-map-js 1.2.2. Scartate le versioni esplicite in
`package.json` e gli `overrides`: non servono, perché le versioni corrette rientrano già in `^9.0.0` e `^1.2.1`; concurrently 10
resta fuori, come già nell'aggiornamento delle dipendenze del 1° ottobre (`ROADMAP.md`, «Restano fuori di proposito»).

## 2026-10-18 — Copiare le voci di un'area in un'altra area

Richiesta dell'utente: «sto vedendo che non è possibile copiare gli elementi di un'area in un'altra area... ma solo spostare...
attiva anche la modalità copia...». Il comando della guida dell'area diventa «Copia o sposta voci», con «Copia in…» accanto a
«Sposta in…» e la stessa finestra per l'area d'arrivo. Scelte dell'utente (AskUserQuestion):
- che cosa porta la copia: **«Voce, passi e schede»** — la voce, i passi dell'Enigma e le schede della guida senza mappa con le loro
  immagini, tutto duplicato; non i collegamenti ai pin delle planimetrie né lo stato nelle partite (la copia parte da fare);
- dove si copia: **«Le altre aree dello stesso Palazzo»**, come lo spostamento.

Conseguenze tecniche (non scelte dell'utente): ogni copia è una voce nuova con la sua chiave (`fonte` «utente»), in fondo all'area
nell'ordine della guida; anche la destinazione di una scheda, se ce l'ha, si copia; un'immagine senza contenuto nel database non si
copia; tutto o niente.

## 2026-10-18 — I pin si collegano sulla mappa principale

Richiesta dell'utente: «non si può quando si clicca sul pulsante Collega PIN (Scegliere dalla mappa principale e non dalla mappa in
piccolo che compare nel riquadro di collegamento del pin) Perchè sdoppiare la mappa? Per altro in questa modalità sarebbe utile
visualizzare tutti i pin sulla mappa anche quelli nascosti perchè completati in altre aree...». Scelte dell'utente (AskUserQuestion):
- **«Sì, ma i pin nascosti in un altro colore»**: la mappa principale della scheda del Palazzo diventa quella di scelta; si vedono tutti
  i pin, e quelli che fuori dalla scelta sarebbero nascosti (raccolti, anche per altre aree, o non ancora disponibili) sono grigi;
- **«Più spazio mentre colleghi»**: durante il collegamento l'elenco del Palazzo si ritira e la mappa prende il suo posto; con «Fatto»
  torna tutto com'era.

Conseguenze tecniche (non scelte dell'utente): la mappa nella voce non c'è più (resta il conto dei collegati); la barra sopra la mappa
porta planimetria (tutte quelle del Palazzo), ricerca e «Fatto»; un'area senza planimetria propria collega lo stesso, su una del
Palazzo; durante il collegamento la tela chiede anche l'altezza da 1280 px in su (una planimetria quadrata si adatta al lato corto: con la
sola larghezza la scala non cresceva) — a 1280×689 la scala passa da 0,30 a 0,68, a 1366×657 da 0,30 a 0,62.

Poi l'utente: «e per quale motivo sparisce il menu laterale sinistro? come dovrei cambiare planimetria io per selezionare i pin di
altre planimetrie…»: l'elenco del Palazzo **resta** durante il collegamento, e toccare una sua planimetria la porta nella mappa del
collegamento senza cambiare area.

Poi: «la mappa è letteralmente inusabile... appare la barra che fa salire e scendere la finestra» e, dell'intestazione dell'area,
«è inutile tutto ad eccezione del titolo». Durante il collegamento restano solo la riga del titolo, la barra e la mappa; la tela
prende l'altezza che la colonna le lascia (il minimo di 560 px faceva scorrere la colonna). Misurato poi a 1280×689 che la colonna
scorreva ancora (509 su 370): anche la testata del Palazzo si ritira durante il collegamento (si torna con «Fatto»). Misure con il
collegamento aperto: 1280×689 colonna 579/579, tela 242×313; 1366×657 547/547, 328×298; 1838×830 720/720, 800×543; 768×1024 tela
692×420; 375×812 tela 299×333; nessuno scorrimento orizzontale. Toccare un pin non smonta più la mappa («mi si resetta anche lo
zoom»): la `versione` degli stati non rifà la risoluzione della planimetria (`MappaIncorporata`) e `useMappaPartita` la rilegge in
silenzio, con la mappa a schermo.

La copia delle voci (stesso giorno): «ha copiato le voci ma non i pin delle voci», «ogni copia deve avere il suo stato distinto» e
«deve valere la regola attuale sugli stati del pin duplicato in più aree». La copia si collega agli stessi pin delle planimetrie
dell'originale con uno stato suo (parte da fare): vale la regola «voci indipendenti» del 2026-10-09, il pin è fatto solo quando
lo sono tutte le sue voci. Le copie fatte prima restano senza pin.

## 2026-10-18 — I filtri per tipo della guida dell'area su una riga ripiegabile

Segnalazione dell'utente (con lo screenshot dei tredici cartellini su sette righe): «ma poi anche questa cosa qua è poco pensata e
ottimizzata a livello grafico». Scelta (AskUserQuestion): **«Riga unica ripiegabile»** — «Filtra per tipo ▾» (con quanti tipi sono scelti),
«Tutti» e «Anche le segnate» su una riga; aperti, i tipi in una griglia fitta col loro conto. I cartellini restano alti 44 px (bersagli
touch del progetto); i nomi lunghi vanno a capo invece di essere tagliati.

## 2026-10-18 — Validare alla fine

L'utente: «ho anche chiesto di essere più veloce e validare solo alla fine le cose». Il galaxy-task-validator si chiama una volta, sul
lavoro finito, non dopo ogni voce del piano; restano le verifiche proprie (typecheck, lint, test, browser ai tre formati, documenti).

## 2026-10-18 — I test solo su richiesta, sul punto in sviluppo

L'utente, durante il lotto del collegamento dei pin: «devi rimuovere tutti i test», «troppi test troppi giri», «1800 test per un fe
fatto male», poi corretto: «non devi cancellare i file di test devi evitare che i test vengano eseguiti ad ogni run» «e ad ogni
modifica», «i test li fai contestualmente allo sviluppo e basta», «devono essere lanciati on demand su singoli punti e aree... non
cross su tutto». Una rimozione dei file era iniziata e, prima di qualunque commit, è stata annullata: nessun file di test è cambiato.
Che cosa ne segue: il passo «Tests» esce da `ci.yml` (il gate resta typecheck, lint, audit); i test si lanciano su richiesta, sul solo
percorso indicato — in locale `npx vitest run <percorso>`, in GitHub il workflow `test-su-richiesta.yml` (`workflow_dispatch`, input
`percorso`; il comando passa il percorso come filtro, senza `--`, che lo faceva ignorare e partire la suite intera). CLAUDE.md
(procedura, punto 3, e avvio rapido) dice lo stesso.

## 2026-10-18 — I dettagli delle voci della guida si correggono

Segnalazione dell'utente (screenshot di «Ombra agente security»): «ci sono elementi non modificabili come questo Contenuto... che
sarà qualcosa di vecchio obsoleto da rimuovere... (sostituito da descrizione?)». Non è un campo vecchio: è uno dei **dettagli** che
l'importazione della guida ha messo nelle voci (465 voci: contenuto 228, debolezze 127, resistenze 43, note 46, e sulle 132 Persona
dei dedali maschera, debole a, resiste a, personalità), che si vedevano ma non si correggevano.

Domanda: «Cosa ne facciamo?» → «Renderli modificabili (Consigliato)» («In «Modifica» della voce compaiono i dettagli come righe
etichetta → testo: si correggono, si cancellano, se ne aggiungono. Niente si perde; i dati delle Persona restano quelli del
compendio.»). Le altre risposte offerte: unirli alla descrizione, toglierli tutti.

Che cosa ne segue: `dettagli` nel `PUT /api/compendio/punti/:chiave` sostituisce tutti i dettagli (testo, numero, elenco o tabella;
al più 40); la `maschera` di una Persona resta quella di prima. Nella «Modifica» della voce le righe si correggono, si tolgono, se ne
aggiungono; un elenco si scrive separato da virgole; una tabella della guida resta com'è e si può solo togliere. Creando una voce i
dettagli non si scrivono: si aggiungono correggendola. Le etichette ora si leggono anche coi trattini bassi («attacchi pericolosi»),
e una tabella si mostra come testo invece di «[object Object]».

«Niente si perde» (rilievo della revisione): una riga dal testo non toccato torna **identica** (valore di partenza, qualunque forma:
elenco vuoto, elenco di numeri, elemento con una virgola, oggetto); solo le righe cambiate si riconvertono, e un elenco di numeri
corretto resta di numeri. Due righe con la stessa etichetta fermano il salvataggio con un avviso. Misurato in sola lettura sulle
465 voci reali di `gioco.db`: andata e ritorno senza modifiche 0 differenze, schema del `PUT` 0 rifiuti, una riga testuale
corretta 0 altre righe cambiate.

## 2026-10-18 — Una planimetria aggiunta al Palazzo si apre caricandone l'immagine

Segnalazione dell'utente: «ho provato a caricare una mappa ma non me la carica come planimetria... solo come area»; il percorso,
nelle sue parole: «ho premuto il pulsante Aggiungi => Apri il luogo e i contenuti della guida => Modifica Luogo => Mappa e qui ho
caricato l'immagine»; poi «ma io devo aggiungere una planimetria al palazzo di madarame» e «in generale la domanda è come dovrei fare
per aggiungere una planimetria?».

Causa: una planimetria del Palazzo è una mappa «Area» sotto la radice del Palazzo, ed era giusto; ma una mappa nata dall'app ha il
ruolo dell'immagine «nessuna» (043) e caricarne l'immagine non lo cambiava, quindi il visore non la apriva (`haPlanimetria`) e la
scheda mostrava solo «Apri il luogo e i contenuti della guida».

Che cosa ne segue: caricando l'immagine una mappa col ruolo «nessuna» diventa una pianta (un'illustrazione se è una città o un
quartiere); stemmi e ruoli già dati non cambiano. La migrazione 106 lo fa per le mappe già caricate (immagine e ruolo «nessuna»),
compresa quella dell'utente. La strada per aggiungere una planimetria si accorcia: «Aggiungi» nell'elenco del Palazzo, il nome,
«Crea», e l'editor si apre sulla sezione Mappa (`?sezione=mappa`) per caricare l'immagine; una planimetria ancora senza immagine e
senza stanze mostra «Carica l'immagine» al posto della sola scheda del luogo.

Misure (sola lettura): mappe con immagine e ruolo «nessuna» — `data/gioco.db` nessuna; `pacchetto/gioco.db` e
`pacchetto/completo/gioco.db` una, «Banchina Aoyama Itchome» (`origine` utente), lo stesso difetto; stemmi senza mappe figlie
nessuno (in ogni caso «Carica l'immagine» compare solo su una mappa senza ruolo). Prova sul percorso dell'utente con una copia dei
dati: «Aggiungi» → «Crea» apre l'editor sulla sezione Mappa → l'immagine caricata dà «planimetria-nativa» → la scheda del Palazzo la
apre nel visore (1280×689, 768×1024 692×420, 375×812 299×333). La prova ha trovato anche la posizione: la planimetria nuova prendeva
il numero delle planimetrie (25 a Madarame) mentre la guida le numera a centinaia (0…802), e finiva seconda invece che «in fondo»;
ora prende la posizione più alta più uno (803).

## 2026-10-20 — Razionalizzazione sul branch `newreview` e istanza parallela p5s

Mandato dell'utente (U): «lavora su un branch di riferimento esplicito all'ottimizzazione... che deve alimentare un'istanza
parallela di FE (devo avere il main che alimenta [l'istanza di produzione] mentre il branch newreview che
alimenta [l'istanza p5s]). Completa tutti i lotti di lavoro per poi poter verificare io lo stato... si tratta di
riordinare e ottimizzare non svilire l'user experience». Il piano è `docs/analisi/2026-10-20-piano-razionalizzazione.md`.

Conseguenze: nessun commit su `main` e nessuna modifica all'istanza di produzione (container, volume, dati); le immagini del branch
hanno il tag `newreview` e non toccano `latest`; lo stack p5s ha container, rete e volume propri e parte da una copia dei dati di
produzione presa con l'API di backup di SQLite (sola lettura).

Decisioni del piano ancora aperte: per non interrompere il lavoro l'utente ha chiesto di applicare l'opzione consigliata.
Sono **scelte consigliate applicate, da confermare** (IA, su mandato U):

| Decisione | Scelta applicata | Alternative lasciate |
|---|---|---|
| D1 Ordine dei lotti | L0 → L11 come proposto | Prima i Palazzi |
| D2 Covo dei Ladri | Area di Yongen-Jaya: le 5 planimetrie diventano le sue versioni | Luogo a sé sulla metro |
| D3 Iweleth | Solo come dedalo dei Memento: le aree del «Palazzo» confluiscono nel dedalo | Solo come Palazzo; entrambi con stato condiviso |
| D4 Permanenti e rigenerabili | Rigenerabili: oggetto, nemico, ombra-sciagura; tutto il resto permanente, modificabile voce per voce | Elenco diverso |
| D5 Negozio come pagina | Sezione della pagina del luogo (l'indirizzo vecchio rimanda al luogo) | Pagina propria collegata al luogo |
| D6 Automatismi del diario | La spunta aggiorna ciò che la voce collega; le Doti si propongono con «Applica» | Doti automatiche e annullabili; Doti sempre a mano |
| D7 Persona del party | Collegate al compendio per chiave | Lasciate come testo |
| D8 Acquisti e yen | Proposti da confermare: l'acquisto segna l'articolo e propone l'uscita, il turno propone l'entrata | Yen mossi in automatico; yen sempre a mano |

## 2026-10-20 — L0: un vocabolario, una parola per significato

Lotto L0 del piano di razionalizzazione (IA, su mandato U). Le parole dell'interfaccia seguono le gerarchie dell'utente
(2026-10-19):

| Parola | Significato unico | Dove cambia |
|---|---|---|
| Infiltrazione | Le aree della guida di un Palazzo (`dungeon_area`): «Prima Infiltrazione al Museo» | Scheda del Palazzo, elenco, schede, moduli, cestino, errori del server |
| Area | La zona fisica: nel mondo le mappe di tipo `luogo` (Central Street), nel Palazzo le «stanze» (gruppi di planimetrie, Museo 1P) | `NOME_TIPO_MAPPA.luogo`, elenco del Palazzo, scheda della planimetria |
| Planimetria | L'immagine (versione) di un'area | `NOME_TIPO_MAPPA.area` (le mappe figlie dei Palazzi) |
| Luogo | Solo l'attività (tabella `luogo`: Untouchable, Diner) | «Scheda del luogo» generica sostituita da `titoloSchedaAccessoMondo` (Scheda del quartiere, del Palazzo…); la metro parla di «mete» |
| Dedalo, area del dedalo | Invariati: i Memento sono il modello di riferimento | — |

Solo testi: nessun dato, nessuna chiave, nessun codice d'errore cambia (i codici come `area-non-trovata` restano: li leggono i
client e i test). Il messaggio di una `dungeon_area` che non esiste dice «L'infiltrazione (o il dedalo)», perché la stessa tabella
regge anche i dedali dei Memento.

Correzioni dopo il primo esame del validatore (RIGETTATO, 2026-10-20): i componenti condivisi fra Palazzi e Memento dicono la
parola del posto («Scheda dei Memento», «Dedalo», «Finestra dei Memento», «Il dedalo richiesto…», la finestra di Tokyo con «i
Memento») — la chiave dice se è dei Memento (`dungeon` = `mementos`, o una `dungeon_area` la cui chiave comincia con `mementos-`,
che `creaArea` garantisce); il tipo di mappa `dedalo`, usato solo dalla radice dei Memento, si chiama «Memento»; il visore dice
«Quartieri», «Aree», «Planimetrie» secondo il tipo (`src/utils/vocabolarioMappe.ts`); il limite dello spostamento di una voce dice
«della sua infiltrazione» nei Palazzi; anche la documentazione delle API (`server/openapi/descrizioni/`), che si consulta dall'app,
usa il vocabolario nuovo.

## 2026-10-20 — L1: un'immagine per ogni mappa, e un ruolo dedotto dalla gerarchia

Lotto L1 del piano di razionalizzazione (IA, su mandato U). Due regole, ognuna in un posto solo:

- **Quale immagine.** L'immagine caricata nell'istanza vince in ogni vista (visore, indice, miniature delle versioni, ingresso del
  quartiere, editor), con l'URL versionato dalla data di caricamento; senza, l'asset dichiarato della mappa; senza nemmeno quello,
  l'icona della vista. Lo stemma di Tokyo e del Covo nell'indice è solo il ripiego dove la mappa non ha **né un'immagine caricata né un
  asset dichiarato** (prima copriva l'immagine caricata di Tokyo). Server `server/services/mappe/immagineMappa.ts`, interfaccia
  `src/hooks/useImmagineMappa.ts`.
- **Quale ruolo.** Si deduce dal posto nella gerarchia (`shared/immaginiMappa.ts`): radice di un Palazzo o dei Memento → stemma;
  senza immagine → «nessuna»; città e quartieri → illustrazione; tutto il resto → planimetria. Lo riapplica ogni strada che scrive
  mappe o immagini, e la migrazione 107 una volta a tutte.

**Decisione dell'utente (2026-10-20), dopo il primo giro del validatore: «Illustrazione anche nelle schede».** Le schede dei
quartieri (La città) e le intestazioni del quartiere e del Palazzo mostrano l'illustrazione della mappa del posto (`IllustrazioneDto`
nei DTO: la caricata, poi l'asset dichiarato; per le radici dei Palazzi solo la caricata, perché il loro asset è lo stemma), piena e al
100% nel suo riquadro (regola dell'utente sulle figure: mai sfondi velati), con la sagoma o lo stemma sopra come segno; la **metro
resta con sagome e stemmi**. Sostituisce la scelta dell'IA del primo giro (sagome e stemmi al posto dell'illustrazione nelle schede).

Scelte del Project manager nello stesso lotto (da confermare):
- **Segni sempre visibili** (difetto UX-2): sagome e stemmi della metro e delle schede si leggono dal manifesto qualunque sia la
  preferenza «grafica predefinita», come prima di L1; la preferenza decide solo il ripiego sull'asset delle illustrazioni e delle mappe.
- **Intestazione del Palazzo compatta** (UX-1): da 1024 a 1279 px solo lo stemma da 48 come prima; da 1280 l'illustrazione con lo
  stemma da 40, in colonna sopra l'anello. Su schermi da circa 1700 px in su l'intestazione cresce di 19 px, senza barra di pagina.
  L'eccezione della fascia 1024–1279 alla decisione «Illustrazione anche nelle schede» è **confermata dall'utente** il 2026-10-20
  (domanda: «va bene o vuoi l'illustrazione anche lì?» — risposta: «Per la prima dico sì»).
  In quella fascia, nei Palazzi con illustrazione, non c'è nemmeno la filigrana dello stemma (prima di L1 c'era).
- **Proporzione delle illustrazioni** (LAY-1): il riquadro prende la proporzione dell'immagine fra 4:3 e 16:9, mai ritagli oltre il 5%.
- **Miniature** (rilievo di Test UX: le schede de La città scaricavano ~40 MB): rientrano in L1. Le immagini si servono ridotte in WebP
  (`?l=` 160/320/640/1024) generate con **sharp** (dipendenza nativa, provata nella build Docker; NOTICE e `licenze/` con la LGPL-3.0
  di libvips e la GPL-3.0 che la integra, scaricate da gnu.org con il permesso dell'utente) e tenute in cache in `gioco.db` (`immagine_miniatura`, migrazione 108;
  solo schema nel pacchetto, orfane pulite all'avvio). Anche indice e griglie delle Mappe. La Città a 375 px passa da ~40 MB a ~390 KB.
- **Ogni strada che scrive o toglie l'immagine di una mappa** (editor, rotta generica, da URL, scarico della pianta, rimozioni singole e in
  blocco) chiede conferma se la mappa ha pezzi (409 `mappa-con-pezzi`); lo scarico automatico della pianta pubblicata non rende la mappa
  «dell'utente». Le dimensioni lette dall'immagine vincono; se non si leggono (SVG) restano quelle dichiarate. Una mappa nuova non
  dichiara più un asset per convenzione che non esiste.

## 2026-10-20 — L2: le aree del mondo

Lotto L2 del piano (team per ruoli, su mandato U). Le mappe di tipo `luogo` e `area` dei quartieri diventano **aree** (tabella `area`,
contenitore quartiere o città) con le planimetrie come versioni; ogni mappa ha una sola **casa** (pagina in cui si apre) calcolata dal
server, e i vecchi indirizzi `/guida/mappe/<k>` vi portano conservando spillo e versione.

Decisioni dell'utente (2026-10-20):
- **Metro e ingresso**: dalla metro si arriva alla pagina del Quartiere, aperta sull'area d'ingresso con il punto e lo zoom dell'ingresso;
  dalle schede la stessa pagina si apre intera (regola già data dall'utente: l'ingresso serve a chi arriva dalla mappa di Tokyo).
- **Area riservata allo staff** (planimetrie 150-3, nessuna fonte la identifica): area di Tokyo, a livello di città, «da verificare»; tenerla
  o rimuoverla con un gesto («agganciala a tokyo come il covo dei ladri e poi capiamo se tenerla o rimuoverla»).
- **Luoghi chiusi**: nascosti nei menu di navigazione, che chiamano ogni posto con il suo nome e mai «Mappa»; l'eccezione è lo spillo chiesto
  dal diario.

Scelte consigliate applicate, da confermare: **D2** il Covo dei Ladri è un'area di Yongen-Jaya (le 5 planimetrie sono sue versioni) come scelta
di ordinamento dell'app; nel gioco il Covo si apre dal menu dal 6/5 (fonte: Esperto della guida, G-004), quindi la fermata della metro porta
alla pagina delle sfide e delle Medaglie P, collegata all'area nei due sensi.

Scelte del Project manager e della Stesura (da confermare): un'area per piano della Shujin; Aoyama Itchome sotto Shujin; Sottopasso con la
versione `001-2-0` «inquadratura orientale» come predefinita («planimetria completa» è la versione a cui porta l'alias
`shibuya-sottopasso`) e avviso sulla versione senza pin; l'Aula 002-6-0 resta un'area a sé; i pin di passaggio
non si riscrivono (la navigazione risolve planimetria → area); **percorsi pubblici fissi** (`mappa.percorso_fisso`: la sincronizzazione non
rinomina più i percorsi del Covo); **formato delle immagini riconosciuto dai byte** in ogni strada di salvataggio; la regola che assegna le
aree è la funzione della migrazione 109, importata dal servizio (una regola sola); ordine delle aree a passi di 100; contatore del cestino
conservato; indice unico dello slug per la città; **finestre come fogli dal basso sotto i 768 px in tutta l'app** (chiusura sempre solo con la
X o con Esc); pannello del visore aperto all'arrivo da 1280 px; per lo scarico delle piante uno User-Agent onesto, senza Referer contraffatto:
se la fonte rifiuta (oggi Fandom risponde 403) l'app lo dice con il link alla fonte e l'invito a caricare l'immagine dall'editor.

Giro 2 (segnalazioni dell'utente e revisione dell'indice delle Mappe, 2026-10-20):
- **UX2-13, miniature delle planimetrie ritagliate sul disegno.** L'utente ha segnalato che nelle carte di Mappe i disegni erano piccoli e
  decentrati: le planimetrie native sono tele 2048×2048 col disegno in un angolo. La miniatura si ritaglia sui pixel non trasparenti, con un
  bordo. La decisione «Immagini: mai ritagliate» del 2026-09-03 resta valida: il ritaglio toglie solo il **margine vuoto e trasparente**, mai
  una parte del disegno (se il disegno arriva ai bordi non si ritaglia), e il visore mostra sempre l'immagine intera.
- **UX2-15, una sola barra in Mappe** (domanda dell'utente sulle due barre di scorrimento, regola degli scroll annidati): il pannello del luogo
  non ha riquadri scorrevoli suoi, griglia ed «Elenco completo» crescono con la pagina.
- **Parola dei conteggi**: nell'indice delle Mappe di L2 si dice «spilli» (E5); in La città e nelle pagine delle aree resta «pin» fino al
  rilascio di L3, dove si uniforma con la scelta dell'utente sugli spilli di contenuto (E2).
- **Dichiarazione e cronologia** (orari UTC dal registro della sessione del PM e dai reflog):
  - prima del secondo stop: dopo «riprendi L2 e completalo» dell'utente (05:55Z e 05:59Z) e sul perimetro deciso dal Manager, il **Collaudo**
    ha portato sul rilascio UX2-13 (115581b4 alle 06:05:01Z, cherry-pick del BE 7624bdda);
  - 06:06:08Z secondo stop dell'utente («interrompi tutto»), poi la chiusura delle sessioni del team (06:07:25Z, «ho detto tutto»);
  - 06:07:44Z l'utente: «quindi organizza tu per risolvere il L2». Dopo, il **Project manager** ha portato sul rilascio E4/E5/E7 (0268751a
    alle 06:08:01Z, cherry-pick del FE d71a1bbd) e ha **implementato UX2-15** (63b4d80e alle 06:09:41Z, sul rilascio 3a056190 alle 06:09:44Z),
    con una prima verifica propria;
  - 06:12:36Z il PM ha tentato di scrivere `docs/ROADMAP.md` nella cartella di rilascio prima di avere l'autorizzazione; il tentativo è stato
    bloccato dalla regola che impedisce di scrivere nelle cartelle di altri, e il PM ha chiesto all'utente il permesso;
  - 06:19:21Z l'utente: «Autorizzo a fare in modo di completare l2». Il PM entra nella cartella di rilascio e scrive la ROADMAP (292a122e
    alle 06:19:32Z);
  - 06:39:53Z l'utente: «Riapri e al termine le richiudi... una alla volta». Le sessioni di prova sono state riaperte una alla volta e
    richiuse; la verifica indipendente di UX2-15 l'hanno fatta Test layout (48 misure) e Test UX.

## 2026-10-20 — L3: i Palazzi in aree, le infiltrazioni trasversali

Lotto L3 del piano. I Palazzi seguono la gerarchia **Città → Palazzo → Area → Planimetria (versioni)**. Le infiltrazioni sono legate molti a molti alle aree che toccano (migrazione 110, `infiltrazione_area`). Ogni planimetria di Palazzo ha una sola casa, la scheda del Palazzo sull'Area (`/guida/dungeon/<k>/area/<slug>`). I vecchi indirizzi `/guida/mappe/<k>` portano lì, con lo spillo e la versione, e la griglia del Palazzo in Mappe non esiste più.

Decisioni dell'utente (2026-10-20):
- **Il legame voce del diario ↔ infiltrazione** è un campo visibile e selezionabile: «non deve essere nascosto ma selezionabile... attingendo alle infiltrazioni già esistenti nel palazzo» (R3-37b). Vale per tutte le voci di Palazzo di ogni giorno: «va applicata a tutti i riferimenti dei palazzi» (R3-37c). Le proposte vengono dalla scheda G-022 e servono sempre la conferma dell'utente; la migrazione non scrive nessun legame.
- **Conteggi dell'indice (E2):** ogni carta mostra i pin di contenuto, e l'intestazione aggiunge «più N passaggi e N note». Le porte stanno fra i passaggi, come nel testo accettato.
- **Intestazione al massimo al 30% della schermata a ogni dispositivo**: «e va ridotto mi sembra ovvio... l'intestazione deve occupare massimo il 30% di una schermata dispositivo» (LAY3-5). Supera la scelta del PM di lasciarla fra le cose da rivedere.
- **Scheda del Palazzo da non peggiorare**: «non voglio che tocchi la scheda del palazzo che funziona bene». La guida nel visore è un'integrazione separata (vedi sotto).
- **Schermate fuori dal repository pubblico**: le 24 schermate dei tester committate per errore si tolgono dall'albero, senza riscrivere la storia dei rami di copia (scelta dell'utente dopo il giro 1 del validatore).
- **Iweleth (D3)**: in L3 migra come gli altri Palazzi; la confluenza nel dedalo dei Memento è di L8.

Scelte del Project manager (2026-10-20):
- **NR3-4**: arrivando dalla casa di un'Area (senza `?infiltrazione=`) si apre la sua planimetria predefinita. La planimetria iniziale dell'infiltrazione vale solo quando l'indirizzo porta l'infiltrazione. È la regola di L2, e i 459 indirizzi già giusti non cambiano.
- **FUN3-2**: per il 04-20 il campo, che è un insieme ordinato, propone le tre infiltrazioni in ordine, sempre da confermare.
- **AP3-1**: le 5 schede della guida senza mappa né voce si leggono nella scheda del Palazzo già in L3; con L4 ricevono i gesti che le sistemano.
- **LAY3-4 e LAY3-7**: il testo intero si legge con un tocco, nei «Dettagli dalla guida» o nell'elenco aperto del selettore. Da 1024 px in su il visore entro metà altezza (R3-41) ha la precedenza sul mandare a capo i selettori.
- **UX3-10**: il numero dei pin compare una sola volta, nel riquadro «N pin».
- **UX3-11**: i segni dei chip delle date sono a opacità piena, per la regola dell'opacità al 100%.
- **UX3-13**, come l'ha realizzato FE: da 1280 px le aree toccate stanno evidenziate nella colonna delle aree con una legenda, invariato sotto i 1280.
- **UX3-5**: lo stemma delle intestazioni segue la preferenza della grafica, come prima di L1; nessuna modifica.

Integrazione «Guida nel visore» e «Planimetria della voce» (decisa dall'utente il 2026-10-20, fuori dal rilascio di L3, vedi `docs/coordinamento/lotti/L3/integrazione-guida-visore.md`):
- nel visore solo le funzioni d'uso: casella fatto/riapri, dettagli della voce, riferimenti ai pin;
- le voci senza pin stanno solo sulla planimetria dove sono state inserite, per regola la planimetria 1 dell'infiltrazione, e si spostano a mano durante la review;
- un Enigma con passi sta dove stanno i passi.

## 2026-10-20 — L4: un Palazzo «concluso» e «completato», gli effetti seguono il furto

Davanti alla partita 1, dove Kamoshida aveva Tesoro e boss ma 15 voci permanenti non segnate (56/71), l'utente ha scelto due livelli.
**Concluso** = Tesoro del Palazzo raccolto e boss finale sconfitto: governa l'ingresso al Palazzo, la sua presenza sulla mappa di Tokyo, i
requisiti e le condizioni «Completare il Palazzo» / «dopo il Palazzo di X». **Completato** = concluso e tutti gli oggetti permanenti fatti:
vale solo per l'anello, la percentuale e il segno «Completato». Supera, per gli effetti, la voce «2026-10-04 — Il Palazzo è completato con
Tesoro, boss finale e raccolto tutto, insieme» (il boss da solo continua a non bastare); gli archi restano legati alla data (2026-09-30); i
Memento invariati. Motivo: è il gioco (G-026: dopo il furto il Palazzo sparisce e gli sblocchi dipendono dal furto, mai dalla raccolta
completa) e tiene funzionante la partita senza segnare voci al posto dell'utente; la decisione «1 B» resta (le 15 voci non si segnano). Nella
stessa revisione: ogni pin tiene il suo stato e una voce con più pin è fatta quando lo sono tutti (NR4-1, strada (a) del PM; pin condivisi da
rigenerabili di più infiltrazioni con stato per infiltrazione).

## 2026-10-26 — L13, decisione 4: le televendite come articoli alternativi

Decisione dell'utente (già approvata il 25/10, `docs/coordinamento/lotti/L13/decisioni-2026-10-25.md`): «Televendite: due articoli distinti
per Set A e Set B, ciascuno con prezzo e contenuto propri». Richiesta sulla voce del 24 aprile: «tv shopping con due prodotti da scegliere
gestito malissimo... i prodotti per altro sono rimasti in inglese... e non posso effettivamente scegliere». Come si realizza (scelte
tecniche, nessuna decisione presa al posto dell'utente):

- **Un'alternativa d'acquisto si dichiara nell'articolo**, con la condizione che esisteva già: «non: articolo ottenuto = l'altro set»
  (`articoliIncompatibili` in `shared/condizioniSpillo.ts`). Basta da una parte; vale in tutte e due le direzioni. Il testo che si legge è
  «Non insieme a «Set X»». **Conseguenza da sapere:** ogni condizione «non: articolo ottenuto» fra due articoli è letta come alternativa
  d'acquisto (gruppo «Uno a scelta», scelta alla spunta). Oggi nel catalogo la usano solo le televendite (verificato il 26/10). Una
  condizione futura del tipo «solo se non hai già comprato X» va scritta in un altro modo, o va deciso con l'utente un tipo di condizione
  distinto.
- **Nella voce non si dichiara niente**: gli effetti «articolo» restano piatti. Alla spunta si sceglie quale set si è comprato, oppure
  «Nessuno». Non esiste una scelta implicita: senza scelta la spunta si ferma (409).
- **Il set non scelto** non si segna, non ha niente da annullare e non si paga (decisione 18): si scala solo il prezzo di quello scelto.
- **La disponibilità** del set scelto si valuta al giorno della voce, perché un set si compra solo la sua domenica. Ogni altro articolo resta
  valutato sullo stato corrente della partita, come prima.
- **Gli articoli in alternativa aggiunti a una voce già spuntata** (per esempio con una proposta «da completare» applicata dopo) li riconosce
  il registro delle operazioni sugli effetti. «Il gioco dà» li mostra da scegliere, togliendo e rimettendo la spunta, e non dice mai
  «nessuno» per un acquisto che non è mai stato chiesto.
- **Periodo validato (04-01…05-31):** le 6 voci delle televendite restano proposte «L13-televendite» da applicare solo con il sì dell'utente,
  riga per riga. Il vecchio articolo unico resta nascosto ma citato da quelle voci finché l'utente non decide; dal quarto giro ha il nome
  italiano dei due set, «Set A o Set B» (es. «Set sveglia primaverile o Set Condiv. primaverile»), e così il suo oggetto fittizio `altro/…`:
  è un dato di gioco di seed corretto dalla 239, non una conversione della voce. In alternativa
  l'utente stesso, nell'editor della voce, può usare «Sostituisci con «Set A» e «Set B»» sulla riga del vecchio articolo: è un suo gesto
  esplicito, salvato con la voce (dopo, la proposta della voce non si applica più e si scarta).
- **Il negozio si chiama «Canale di televendite»**, come nella guida italiana e nel testo delle voci (era «Home Shopping in TV»).
- **La regola si scrive in un modo solo, «Uno a scelta, o nessuno»** (`REGOLA_ALTERNATIVE` in `shared/effettiVoce.ts`): titolo del gruppo di
  «Il gioco dà», riquadro dell'editor («…, alla spunta»), nota del campo «Articolo» e scelta alla spunta. Con un acquisto fra le scelte della
  spunta il pulsante dice «Spunta con questi acquisti» (o «con queste scelte» se ci sono anche esiti o note); senza acquisti resta «esiti».
- **Un formato solo per gli yen nella voce, «¥1.680»** (`formatoYen` in `shared/effettiVoce.ts`): in `it-IT` i numeri di quattro cifre
  restano senza separatore se non lo si chiede. Il resto dell'app (`formattaYen`, «8.227 ¥») non cambia in questo lotto.
- **Restano all'utente:**
  - se il gioco permette un solo set per domenica, oppure nessuno;
  - se servono le voci delle domeniche 06-26, 08-07, 09-25 e 01-29.
