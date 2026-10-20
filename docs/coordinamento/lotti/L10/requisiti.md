# L10 «Partita e diario» — requisiti

Autore: sessione «Analisi requisiti» (2026-10-20). Fonti: piano (righe 29-53, 137, 141-154, 272-353, 381, 395, 423, 438, 440), memoria «Un
punto di modifica, si gioca da Partita» (punti 2 e 2b), «Lavoro da preservare», «Prove sui dati reali»; DECISIONI 2026-09-30 («Le Doti
sociali si segnano solo a mano, con promemoria»; cambio giorno automatico), 2026-10-12 (copiare e spostare le voci del diario), 2026-10-16
(cestino), 2026-10-17 (Dote solo al passaggio di rango), 2026-10-20 (D6, D8). Contesto: `voce_giornata` 996 voci sulla copia del
2026-10-20 (il piano ne misurava 952), con `produce_json`, `riferimento_tipo/chiave`, `rango_atteso`; stati in `partite.db`
(spunta_voce_partita, incontro_confidente_partita, turno_partita, attivita_svolta_partita, lettura_partita, acquisto_partita,
regalo_partita, richiesta_partita, domanda_partita, cruciverba_partita, evento_storia_partita, evento_partita, dote_sociale_partita,
compendio_partita, persona_posseduta, cestino_partite…).

## Obiettivo
**Si gioca da Partita.** Partita › Oggi è la casa (un solo componente, incorporato anche nella Home). **La spunta aggiorna tutto**: ogni
voce del diario dichiara cosa produce — evento di storia, attività svolta, turno di lavoro (contatore e paga), lettura/visione, incontro e
rango del Confidente, acquisto, Richiesta/domanda/esame/cruciverba, Dote (secondo D6) — e la spunta lo applica, togliendola lo annulla.
Ogni azione della partita ha **una sola regola**, da qualunque pagina parta: cambio del giorno, rango del Confidente, regalo,
registrazione di una Persona, letture e turni (un contatore ciascuno), acquisti (D8), storico che segue gli annullamenti, cestino per tutto.
Le 996 voci si abbinano ai fatti che producono: gli abbinamenti sicuri si applicano, i dubbi arrivano all'utente in un elenco. Il dettaglio
si apre dalla voce in un pannello sopra il diario e chiudendolo si torna alla stessa voce; nel Metaverso «Entra» apre la scheda del
Palazzo sull'infiltrazione in corso o il menù del Dedalo, «Esci» riporta al diario con la voce fatta e il riepilogo.

**Fatto quando** (piano, riga 423): ogni azione ha una sola regola, da qualunque pagina parta; spuntare «Inizia a pulire» segna la mansarda
pulita e togliere la spunta la riapre; Progressi mostra da quale voce è scattato ogni fatto.

## Perimetro (contesto, da misurare in `dati.md`)
- Effetti oggi: solo Dote (196 voci), lettura (72), turno (9). Censimento per area del piano (righe 310-324): domande 70/0 collegate,
  cruciverba 36/0, attività 95/0, acquisti 82/9, Palazzi 58/46, Stanza di Velluto 18/0, Richieste 14/3, videogiochi 3/0, trofei e sfide 5/0,
  lavori 10/3, Confidenti 272/266, libri 62/60, film e DVD 22/18.
- Abbinamenti per data: 71 domande su 78, 33 cruciverba su 38; voce cumulativa del 02-01 per i cruciverba rimanenti.
- Strade di oggi: cambio giorno 6 (2 senza controlli); regalo 2 pulsanti; registrare una Persona 4 strade; letture e turni 2 contatori
  ciascuno; storico che non segue gli annullamenti; cestino per 4 tipi; Oggi doppia fra Home e Partita.

## Criteri di accettazione
Tipo: **F** funzionale, **UX** esperienza, **NR** no-reg, **L** layout.

### Il diario come motore
- R10-01 [F] Ogni voce del diario può dichiarare uno o più effetti strutturati fra: evento di storia, attività svolta, turno di lavoro, lettura/visione, incontro o rango del Confidente, acquisto, Richiesta, domanda, esame, cruciverba, Dote; l'effetto cita il suo oggetto per chiave.
- R10-02 [F] Spuntare una voce applica tutti i suoi effetti; togliere la spunta li annulla tutti, anche dopo un ricaricamento della pagina (l'«Annulla» non si perde più).
- R10-03 [F] Il caso del piano: spuntare «Inizia a pulire» (04-09) segna la mansarda pulita (evento di storia) e i requisiti che la chiedono risultano soddisfatti; togliere la spunta la riapre e i requisiti tornano come prima.
- R10-04 [F] Gli altri esempi del piano funzionano allo stesso modo: Caffè al Leblanc (Sojiro 3), Pietra Sacra (06-28, Chihaya 1, acquisto), Chiamata a Kawakami, Oratore di Shibuya (Yoshida 1), Duello con Akechi (11-04, Akechi 8), primo strumento creato, biliardo rango 3.
- R10-05 [F] L'attività svolta conta sempre il contatore dell'attività (non solo per i lavori): biliardo, bagni, palestra, studio, pesca.
- R10-06 [F] Il turno di lavoro conta il contatore e propone la paga secondo D8.
- R10-07 [F] L'incontro con un Confidente dà i punti (con le note della risposta scelta, o della risposta ottimale, dai dialoghi del Confidente, senza testo ricopiato nella voce) e, se la voce è un passaggio, alza il rango; togliere la spunta riporta punti e rango indietro.
- R10-08 [F] La voce d'acquisto segna l'articolo comprato e propone l'uscita in yen (D8); togliere la spunta toglie l'acquisto e la proposta.
- R10-09 [F] La voce di una Richiesta, domanda, esame o cruciverba segna lo stato collegato (la domanda risulta fatta in «Domande in classe, esami e quiz in TV»); la voce cumulativa del 02-01 segna i cruciverba ancora aperti e togliendola li riapre.
- R10-10 [F] La voce con Dote segue D6 (**approvata dall'utente il 2026-10-20 come proposta**): la Dote si propone con il pulsante «Applica» e **non si applica mai in automatico** (nessuna Dote cambia senza il gesto dell'utente, né spuntando né togliendo la spunta); togliere la spunta propone di togliere la Dote applicata, sempre con un gesto; le proposte non accettate restano visibili in un elenco «da applicare».
- R10-11 [F] Le voci dei Palazzi e della Stanza di Velluto, oggi solo di navigazione, producono il loro effetto se ne hanno uno (Palazzo: avanzamento dell'infiltrazione tramite «Entra/Esci»; Velluto: fusione/esecuzione registrata in scorta, se l'abbinamento è approvato).

### Punti legame dei Confidenti (richiesta dell'utente del 2026-10-20)
Le parole dell'utente: «va anche gestito con lo stesso approccio i punti crescita del legame confidente prima e dopo il rank up... le note
guadagnate dopo il rank up devono essere applicate nell'ordine corretto perchè concorrono come punti legame al raggiungimento del rango
successivo (solo quando il rank up è calcolato sui punti legame)». «Lo stesso approccio» è quello del campo «Infiltrazione» di L3
(R3-37b/c): un campo visibile e selezionabile, con proposte confermate dall'utente e nessuna scrittura automatica.
- R10-11a [F] Una voce del diario che dà punti a un Confidente ha **campi visibili e selezionabili**: il Confidente, scelto dall'elenco dei Confidenti; la scelta di dialogo e le sue note, dai dialoghi del Confidente (L9); i punti, calcolati dalle note e correggibili. I punti non stanno nel testo della voce.
- R10-11b [F] Dove si ricavano dalla voce (Confidente citato, incontro, rango atteso), i campi si **propongono** e l'utente li **conferma**. La migrazione non scrive nessun valore in automatico. L'elenco delle proposte è voce per voce, con il motivo, come in L3.
- R10-11c [F] Il motore applica i punti legame **in ordine cronologico del diario**: data, poi fascia, poi ordine della voce nella giornata, poi ordine delle scelte dentro la voce. Ricalcolare da zero dà lo stesso risultato dell'applicazione passo per passo.
- R10-11d [F] Per un **Confidente il cui rango sale a punti**, i punti guadagnati **dopo un rank up**, nella stessa interazione o nelle voci successive, contano verso il rango seguente. Caso di prova: dopo il rank up 3→4 di un Confidente a punti, le note successive della stessa giornata si sommano al progresso verso il rango 5, e il progresso verso il 4 non le conta.
- R10-11e [F] Per i ranghi che **non** salgono a punti (per trama, evento o in automatico, secondo G-020: per tutti il rango 1 e il passaggio 1→2; tutti i ranghi di Igor, Morgana, Sae e Gemelle; Mishima, che sale con le Richieste dei Memento; Yoshida, senza soglie; Akechi 9→10 e Maruki 10, automatici) i punti non si accumulano. Il campo «punti» non c'è oppure vale zero, e il rango segue il suo evento.
- R10-11f [F] Togliere la spunta di una voce, o cambiarne i campi, ricalcola i punti e i ranghi di quel Confidente da quella voce in poi, nell'ordine cronologico. Un rank up che non è più raggiunto torna indietro, e i punti dopo di lui si riassegnano al rango giusto.
- R10-11d2 [F] **Punti in eccesso e rango «pronto»** (Esperto della guida, G-020):
  - i punti in eccesso alla soglia **si conservano**, e quelli guadagnati nell'evento del salto di rango contano per il rango successivo. È coerente con la regola dell'utente, con certezza media-bassa; il riferimento che c'era nel repository diceva il contrario, e vince la regola dell'utente;
  - a soglia raggiunta, prima della visita che fa salire il rango, il rango è **«evento pronto»**: i punti delle voci successive si conservano e, dopo il salto, contano verso il rango seguente;
  - il passaggio 9→10 non ha soglia: arriva all'evento successivo.

  Caso di prova: a un Confidente a punti si dà, prima del salto, una nota che supera la soglia, poi si fa il salto. L'eccedenza e i punti dell'evento risultano nel progresso verso il rango dopo.
- R10-11g [F] Regole e soglie (quali ranghi salgono a punti, quanti punti servono per ogni rango, bonus degli esami di R9-08) vengono da una fonte sola, la pagina del Confidente (L9). I valori sono quelli dell'Esperto della guida, scritti nel registro.
- R10-11h [NR] Sulla partita reale copiata, i ranghi e i punti dei Confidenti di oggi restano uguali dopo la migrazione: nessuna scrittura automatica. Le differenze che darebbe il ricalcolo cronologico si mostrano come «da verificare», voce per voce, e si applicano solo con un gesto dell'utente.

### Inviti dei Confidenti (decisione dell'utente del 2026-10-20)
Le parole dell'utente: «gli inviti dei confidenti sono eventi del diario... che sbloccano i luoghi... nel diario ci sarà un Confidente X ti ha
chiesto di uscire... e il Confidente deve poter dare anche la possibilità di sbloccare un'area».
- R10-11i [F] Esiste il tipo di voce del diario **«invito del Confidente»**, con campi strutturati e visibili: Confidente, data, e il luogo o l'area dell'uscita. Spuntare la voce registra nella partita l'evento «invito avvenuto», e l'evento soddisfa le condizioni che lo citano (R6-08c), così il quartiere, il ritrovo o il luogo si sblocca. Togliere la spunta annulla l'evento e le sue conseguenze.
- R10-11j [F] Le voci del diario che oggi descrivono un invito («X ti ha chiesto di uscire…») diventano voci di tipo invito. Come per le altre voci, la migrazione **propone** e l'utente **conferma**: nessuna scrittura automatica, e testo, ordine, giorno, fascia, uid e spunte della voce non cambiano.
- R10-11j2 [F] **Nessuna voce nuova nel diario validato 04-01..06-01.** Decisione dell'utente del 2026-10-20: «sul diario già validato non aggiungere le voci... al massimo gestisci ad evento l'apertura del luogo». Dalle voci proposte in G-023:
  - l'invito di Ryuji del **29/5** (Harajuku), che sta nel diario validato, **non diventa una voce**: resta solo un **evento «invito avvenuto»**, registrato con un **gesto diretto** dalla pagina del Confidente o del quartiere. Il gesto ha la data, si annulla con il gesto inverso e soddisfa le stesse condizioni (R6-08c);
  - **dopo il 06-01 si aggiungono tutte le 8 voci** degli inviti di G-023, comprese quelle nei giorni con sovrapposizione: 07-02 sera (messaggio di Ryuji), 07-03 giorno (Ryuji, Ichigaya), 07-28 sera (messaggio di Akechi), 07-29 giorno (Akechi, Shinagawa), 07-30 giorno (Makoto, Ikebukuro), 08-06 giorno (Ann, Santuario Meiji), 10-08 sera (messaggio di Futaba), 10-09 giorno (Futaba, Nakano). Ogni invito porta le sue condizioni del gioco (G-028). **Makoto del 30/7** è la strada (a), decisa dal PM sulla bacheca il 2026-10-20 (L6 R6-08c3): la voce porta la condizione scritta («solo se il Palazzo di Futaba è già completato») e il motivo nel campo «da rivedere». Sul percorso del diario la piramide si conclude il 3/8 (errore 1 di G-028), quindi la spunta dà «Non ancora possibile». La strada (b), senza voce, va all'utente nell'elenco «Da rivedere» (R11-10c). Sono marcate **«da rivedere»** e l'utente le rivede insieme al resto. Precisazione dell'utente del 2026-10-20: «per le date superiori alla data dell'1 giugno invece aggiungile poi le rivedo insieme al resto». Ogni voce va in fondo alla sua fascia, con il riferimento al Confidente e all'invito.

  Verifica: il confronto prima/dopo del diario 04-01..06-01 è identico (255 voci sulla copia di produzione 0440Z del 2026-10-20, dove l'utente ne ha aggiunta una il 06-01 sera; 254 sulla copia precedente, stesso conteggio e stessi uid). Dopo il 06-01 ci sono esattamente **8** voci nuove di inviti, tutte con il segno «da rivedere». Quella del 07-30 porta la condizione scritta e il suo motivo. Nessuna voce esistente cambia.
- R10-11k [F] Caso di prova nella partita di prova, **con il Palazzo di Futaba concluso prima del 30/7 e Imperatore rango 1**, e con Ikebukuro chiuso:
  - **registrare con il gesto diretto** l'evento «invito di Makoto del 30/7» dalla pagina di Makoto, o da quella di Ikebukuro, apre Ikebukuro sulla metro e nella città; annullarlo lo richiude;
  - il gesto non crea nessuna voce, e spuntare la voce «da rivedere» del 07-30 registra lo stesso evento, una volta sola;
  - **sul percorso del diario**, con la piramide conclusa il 3/8, la spunta della voce del 07-30 e il gesto danno «Non ancora possibile: manca il Palazzo di Futaba concluso».

  Per un invito con la sua voce «da rivedere», per esempio il 10-09 di Futaba per Nakano, spuntare la voce apre il quartiere e toglierla lo richiude: voce e gesto registrano lo stesso evento e non lo contano due volte. Per Harajuku, il 29/5 si prova solo con il gesto. L'invito di Mishima del 28/7 in Royal non esiste (G-023). Su una partita che ha già la spunta, la migrazione non cambia lo stato del quartiere senza conferma (R10-15).

### Abbinamento delle 996 voci
- R10-12 [F] Esiste un elenco degli abbinamenti voce → effetto per tutte le voci: «sicuri» (applicati dalla migrazione) e «dubbi» (presentati all'utente prima di scriverli); per ogni voce: data, fascia, testo, effetto proposto, oggetto, motivo.
- R10-13 [F] Le 70 voci «Rispondere alla domanda in classe…» si abbinano alle domande per data (71/78 possibili), le 36 voci «Cruciverba (…)» ai cruciverba (33/38); i casi senza corrispondenza sono elencati.
- R10-14 [F] Gli abbinamenti si aggiungono come collegamenti/effetti senza riscrivere testo, ordine, giorno, fascia o uid della voce.
- R10-15 [F] Le spunte già date nella partita reale non riapplicano in blocco effetti nuovi in modo silenzioso: l'esito per le voci già spuntate segue il dubbio 2 (riepilogo da approvare).

### Una regola per ogni azione
- R10-16 [F] Cambiare il giorno passa da una sola regola (giorno esistente, fascia a «giorno», suggerimenti aggiornati, storico) per tutte le strade (diario, intestazione, calendario, cambio automatico, Home, correzione), comprese le 2 oggi senza controlli.
- R10-17 [F] Il rango del Confidente sale con il passaggio, da diario o dalla pagina, e torna indietro togliendolo; correggerlo a mano dalla pagina resta possibile e il diario lo mostra.
- R10-18 [F] Il regalo è un'azione sola: si sceglie l'oggetto (L7), dà i punti, si registra e, se serve, lo segna comprato.
- R10-19 [F] Registrare una Persona ha una strada sola, con istantanea completa; aggiunta alla scorta e cattura (L8) la usano.
- R10-20 [F] Letture e turni hanno un contatore ciascuno, da cui si calcola il resto («completato» si calcola dall'avanzamento; una sola definizione di «letto»).
- R10-21 [F] I punti negozio si calcolano dagli acquisti dove il gioco li dà per spesa; a mano solo dove il gioco li dà per altro.
- R10-22 [F] Lo storico è un registro derivato dei cambi di stato: togliere un segno toglie l'evento dallo storico; i fatti di Progressi mostrano la voce del diario che li ha fatti scattare.
- R10-23 [F] Tutto ciò che si elimina passa dal cestino (voci del diario, stati, oggetti di gioco), con «Rimossi» unito al cestino.
- R10-24 [F] Partita › Oggi è un solo componente; la Home lo incorpora con la stessa mappa e lo stesso centro.
- R10-25 [F] La vista «Persona della partita» mostra per ogni Persona se è in scorta, se è registrata e se la registrazione è più vecchia dell'esemplare, con «Registra» accanto (se non fatta in L8).
- R10-26 [F] In Progressi restano la vista dei contatori e dei fatti, con la voce del diario da cui vengono e la correzione a mano.

### Navigazione di gioco
- R10-27 [F] Toccare un oggetto citato da una voce (Confidente, luogo, Palazzo, libro…) apre la sua scheda in un pannello sopra il diario, con lo stato di partita; chiudendolo si torna alla stessa voce, nella stessa posizione di scorrimento.
- R10-28 [F] «Entra» su una voce d'infiltrazione apre la scheda del Palazzo sull'infiltrazione in corso, con step e mappa interattiva; su una visita ai Memento apre il menù del Dedalo; «Esci» riporta al diario con la voce fatta e il riepilogo di cosa è avanzato.
- R10-28a [F] **Quale infiltrazione apre «Entra»**, secondo le decisioni del PM su UX3-1 e UX3-4 (L3, 2026-10-20). Valgono le stesse regole di L3, R3-37b/c:
  - voce con infiltrazioni confermate: apre la prima non completata dell'insieme;
  - voce con l'insieme vuoto e una **proposta**: apre la prima infiltrazione **della proposta**, che si mostra «da confermare» se non è certa;
  - voce senza proposta: apre la prima non completata della partita (`in-corso`);
  - dalla **metro**, senza parametro, la scheda del Palazzo si apre anch'essa sulla prima infiltrazione non completata, e non sulla prima.

  Verifiche: la voce del 20/5 apre «Disabilita i sistemi di sicurezza», non «Prima Infiltrazione al Museo»; dalla metro al 99% di Madarame si apre l'infiltrazione in corso.
- R10-28c [F] Il riepilogo all'«Esci» e lo stato del Palazzo dopo l'infiltrazione usano i livelli di L4. Dice se il Palazzo è **concluso** (Tesoro e boss finale **dichiarato**, L4 R4-22 e §8.14) e quanto manca al **completato**. Dopo il «concluso», la voce dell'ingresso al Palazzo non si propone più nei giorni successivi.

- R10-28b [F] Quando il visore si apre con `?spillo=` (pulsante «Sulla mappa» di una voce del diario, anche di un giorno passato o di un'altra fascia), quello spillo si mostra ed è evidenziato **anche se non è disponibile in quel momento**, con un'indicazione chiara del tipo «non disponibile adesso: …» e il motivo (condizione non soddisfatta); gli altri pin non disponibili restano nascosti come oggi. Rilievo di Test no-reg (`lotti/L1/noreg.md` §1-bis): 17 voci del diario validato oggi aprono la mappa giusta senza lo spillo (Shujin 1656/1616, Untouchable 1517, Café Leblanc 1588). Verifica sulla base di Test no-reg: **66 voci con lo spillo evidenziato (49 + 17) e 9 senza spillo, come previsto**.

### Lavoro da preservare e non regressione
- R10-28d [F] **Voci aggiunte dal team dopo il 06-01**: inviti (R10-11j2), Kaneshiro 06-26 (L3 R3-37c) e voci corrette «da rivedere» (L3 `modifiche.md` §2.2). Tutte portano il segno «da rivedere» e il testo precedente conservato, e l'utente le rivede insieme al resto. Nel diario validato non si aggiunge e non si cambia nulla. Le correzioni di testo usano i nomi della guida: per l'errore 2 di G-028, la voce F4 del 08-03 dice «Camera della vacuità», non «Camera del Vuoto». Verifica: ogni voce aggiunta o corretta dopo il 06-01 ha il segno «da rivedere» e il testo di prima; nessuna voce del 04-01..06-01 ha il segno.
- R10-29 [NR] Diario 04-01..06-01 (255 voci sulla copia di produzione 0440Z del 2026-10-20, dove l'utente ne ha aggiunta una il 06-01 sera; 254 sulla copia precedente): ogni giorno si apre con le stesse voci nello stesso ordine; testo, giorno, fascia, uid e spunte invariati; le voci prendono il segno «validata» (se non già dato in un lotto precedente), così il lavoro resta riconoscibile.
- R10-30 [NR] Spuntare e togliere la spunta su quelle voci applica e annulla gli stessi effetti di prima (Dote secondo D6, lettura, turno, incontro), più quelli nuovi; il giorno avanza come prima; i collegamenti portano alla scheda giusta.
- R10-31 [NR] Gli stati della partita reale copiata (Doti, punti e ranghi dei Confidenti, letture, turni, acquisti, Richieste, domande, cruciverba, compendio, scorta) sono identici prima e dopo la migrazione, salvo gli abbinamenti approvati, elencati voce per voce.
- R10-32 [NR] Kamoshida (169 voci) e Madarame (227 voci e 254 pin utente sulla copia 0440Z, impronta 263; 225/252 sulla copia precedente): «Entra/Esci» e i segni dalla guida e dalla mappa funzionano come dopo L4.
- R10-33 [NR] Le regole già scelte dall'utente restano: Dote solo al passaggio di rango (2026-10-17); copiare e spostare voci del diario con le spunte (2026-10-12); cestino «quel che è cambiato dopo vince» (2026-10-16).
- R10-34 [NR] La prova si fa con la partita reale copiata e con una partita di prova nuova (creata e poi eliminata); l'esito è un elenco voce per voce.
- R10-35 [NR] Typecheck e lint verdi; test mirati (diario, effetti, statiPartita, Confidenti, turni, letture, acquisti, cestino, storico, migrazioni nuove) verdi con output grezzo.

### Esperienza e layout
- R10-36 [UX] Dal telefono durante la partita: una giornata si gioca tutta da Oggi, spuntando le voci; le proposte (Dote, yen) si accettano con un tocco e non interrompono il flusso.
- R10-37 [UX] Ogni effetto applicato si vede accanto alla voce (cosa ha fatto la spunta) ed è chiaro come annullarlo.
- R10-38 [UX] L'elenco degli abbinamenti dubbi è lavorabile: filtri per area e mese, accetta/rifiuta per riga e in blocco.
- R10-39 [L] Oggi, pannello della scheda sopra il diario, Progressi, Persona della partita, elenco degli abbinamenti: nessuno scorrimento orizzontale a 1280, 768, 375; bersagli ≥44 px; su telefono il pannello è un foglio dal basso; a 1366×657 e 1280×689 Oggi mostra intestazione del giorno e prime voci nella prima schermata; scroll annidati con confine evidente e overscroll contenuto.

## Decisioni coinvolte
| Decisione | Scelta consigliata applicata, da confermare | Effetto sui criteri |
|---|---|---|
| D6 Automatismi del diario | **La spunta aggiorna ciò che la voce collega; Doti proposte con «Applica»** — **approvata dall'utente (2026-10-20)**: Doti solo proposte, mai automatiche | R10-02, R10-10, R10-30; dubbio 1 chiuso |
| D8 Acquisti e yen | **Proposti da confermare**: l'acquisto segna l'articolo e propone l'uscita, il turno propone l'entrata | R10-06, R10-08 |
| D7 Persona del party | Collegate al compendio per chiave (L8) | R10-19, R10-25 |

## Lavoro dell'utente da preservare toccato dal lotto
- **Diario 04-01..06-01 (255 voci sulla copia di produzione 0440Z del 2026-10-20, dove l'utente ne ha aggiunta una il 06-01 sera; 254 sulla copia precedente)**: è il cuore del lotto (R10-29..R10-31): voci intatte, collegamenti aggiunti senza riscriverle,
  segno «validata».
- Tutti gli stati della partita reale (Doti, Confidenti, letture, turni, acquisti, compendio, scorta).
- Kamoshida e Madarame: comportamento di «Entra/Esci» e dei segni.

## Dipendenze
- **L7 e L9 consegnati** (oggetti per chiave per acquisti e regali; Confidenti, attività, calendario ed esami strutturati).
- L4 (stato sull'oggetto, infiltrazioni), L8 (registrazione unica delle Persona), L6 (eventi di storia per chiave nelle condizioni).

## Casi dubbi da approvare (soluzione prudente proposta)
1. **D6 e la scelta dell'utente del 2026-09-30** («i punti Doti Sociali li sposto solo io manualmente», «Sempre a mano, con promemoria»):
   la consigliata D6 («proposte con Applica») resta compatibile perché nessuna Dote cambia senza il gesto dell'utente, ma trasforma il
   promemoria in un pulsante. Prudente: «Applica» solo come proposta, mai automatico, e l'elenco «da applicare» al posto del promemoria che
   scompare. **Deciso dall'utente (2026-10-20)**: D6 approvata come proposta — Doti proposte con «Applica», mai automatiche (chiuso).
2. **Voci già spuntate prima di L10 con effetti nuovi** (es. «Inizia a pulire» già spuntata): prudente, la migrazione non applica in
   silenzio; produce un riepilogo «effetti che la spunta avrebbe dato» da approvare e applicare in blocco o voce per voce.
3. **Abbinamenti per data ambigui** (più domande lo stesso giorno, voce senza domanda): solo elenco, nessun abbinamento automatico.
4. **Stanza di Velluto (18 voci)**: le fusioni non hanno un oggetto preciso nella voce; prudente: solo collegamento informativo, nessun
   effetto sulla scorta senza approvazione.
5. **Yen**: la paga e l'acquisto propongono; se l'utente non conferma, restano «in sospeso» visibili, non persi.
6. **Cambio giorno automatico** (2026-09-30: scatta a ogni spunta sul giorno corrente con tutto fatto): resta, ma passa dalla regola unica.
7. **Storico vecchio** con fatti che lo stato non ha («+2 Fascino»): resta come storico importato, distinto dal registro derivato, non
   cancellato.
