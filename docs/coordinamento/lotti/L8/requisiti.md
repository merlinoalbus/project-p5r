# L8 «Persona e Ombre» — requisiti

Autore: sessione «Analisi requisiti» (2026-10-20). Fonti: piano (righe 104, 107-110, 114, 183-189, 208, 226-227, 266, 279, 285, 368, 402-403,
421, 435, 439), memoria «Gerarchia del mondo» («I Memento sono il modello di riferimento»), «Lavoro da preservare»; DECISIONI 2026-10-11
(Memento: Persona in cima, Trama), 2026-10-12 (Memento: aree reali; catturata = registrata nel compendio, tocco che registra), 2026-10-20
(D3, D7); ricognizione L3 punto 7 (Iweleth). Tabelle di contesto: `persona`, `persona_affinita`, `persona_skill`, `persona_area_dedalo`,
`area_dedalo`, `dungeon_area`, `punto_interesse` (voci di tipo persona/ombra-sciagura/miniboss/boss), `dati_guida` (dove vivono oggi le
Ombre della Battaglia: da confermare in `app.md`), `compendio_partita`, `membro_squadra_partita`, `persona_posseduta`.

## Obiettivo
**La Persona resta l'identità** (compendio). Nasce l'entità **Ombra** (nome italiano, Persona per chiave, dove si incontra: area del
Palazzo o area del dedalo, personalità, negoziazione) con una pagina `/guida/ombra/<chiave>`. Le copie di oggi — Ombre della Battaglia,
voci dei Memento, tabella di Kamoshida, voci Persona dei Palazzi — diventano **Ombre** o link ad esse. **Le debolezze si leggono solo dal
compendio** (affinità della Persona). **Una sola strada di cattura**, quella dei Memento: catturare un'Ombra (in un Palazzo, nei Memento,
in Battaglia) **registra la sua Persona nel compendio**; lo stato si legge dal compendio e il tocco agisce sul compendio. Iweleth secondo
D3 (solo come dedalo dei Memento). Le Persona del party si collegano al compendio per chiave (D7). **I dedali dei Memento restano come
sono.**

**Fatto quando** (piano, riga 421): nessuna debolezza ricopiata; catturare un'Ombra registra la Persona ovunque, Iweleth compreso.

## Perimetro (contesto, da misurare in `dati.md`)
- Ombre: 217 (Battaglia) + 131 (dedali/voci) + 44 (voci Persona dei Palazzi con stato proprio) (piano riga 368).
- Debolezze di un'Ombra in 5 copie: 12/210 e 27/210 diverse dal compendio; nome italiano dell'Ombra 145/183 diverso dalla negoziazione;
  personalità con valori fuori dalle 4; «dove si incontra» in 3 fonti, 25 Persona diverse.
- Iweleth: 9 Persona doppie con `mementos-08-iweleth/7..15`; 38 voci su 47 con tipi non ammessi nei dedali; 12 spilli guida con FK
  RESTRICT; 26 planimetrie e 55 spilli; Parte III/IV scambiate su 160-4-0/160-5-0; area-8 «???» senza corrispondenza; 0 stati di partita.
- Persona del party: 2 su 29 coincidono con il compendio (D7).

## Criteri di accettazione
Tipo: **F** funzionale, **UX** esperienza, **NR** no-reg, **L** layout.

### Entità Ombra
- R8-01 [F] Esiste l'entità Ombra con chiave stabile, nome italiano, Persona (chiave del compendio o «non reclutabile»), personalità (una delle 4 del gioco), dati di negoziazione e luoghi d'incontro (aree dei Palazzi e aree dei dedali, per chiave).
- R8-02 [F] Le Ombre della Battaglia, quelle dei dedali dei Memento, la tabella di Kamoshida e le voci Persona dei Palazzi sono collegate a un'Ombra (o a una Persona) per chiave; nessuna riga si perde, i casi non abbinati vanno in un elenco da approvare.
- R8-03 [F] Il nome italiano di un'Ombra vive solo nell'Ombra: Battaglia, dedali, voci dei Palazzi e negoziazione lo leggono da lì (le 145/183 divergenze spariscono o sono elencate).
- R8-03b [F] **Un nome per Ombra, quello della guida** (G-035): dove l'app ha due nomi italiani per la stessa Ombra vale quello della guida (Battaglia), e l'altro va fra i nomi alternativi, che la ricerca trova. I casi sono High Pixie («Maestra degli scherzi», non «Capo dei burloni») e Mara («Straziato re dei desideri», non «Re lacerato dei desideri»).
- R8-04 [F] Le personalità fuori dalle 4 del gioco sono corrette secondo l'elenco delle personalità delle Ombre di G-021, o elencate; ogni Ombra ha una personalità valida o «sconosciuta».
- R8-05 [F] «Dove si incontra» ha una sola fonte (Ombra ↔ area del Palazzo o del dedalo); la scheda Persona, i dedali e la Battaglia lo leggono da lì (le 25 divergenze di oggi spariscono o sono elencate).
- R8-06 [F] `/guida/ombra/<chiave>` mostra nome, Persona, debolezze dal compendio, dove si incontra, negoziazione; Battaglia, dedali e voci dei Palazzi portano lì.
- R8-07 [F] `/compendio/persona/<id>` mostra anche dove si incontra (Ombre, Palazzi, Memento) e se la Persona è registrata nella partita.

### Negoziazione per umore (segnalazione dell'utente del 2026-10-20)
Le parole dell'utente: «Aiuto in Battaglia e Negoziazione non contiene in modo corretto tutte le domande e le risposte possibili per tipo
umore dell'ombra».
- R8-07a [F] Per **ogni umore** (personalità) dell'Ombra la guida dell'app contiene **tutte le domande** di negoziazione e, per ogni domanda, **tutte le risposte** con il loro **esito** (per esempio gradita, sgradita, neutra, con l'effetto sulla trattativa). La fonte è un posto solo, letto da Battaglia, dalla pagina Ombra e dalla negoziazione.
- R8-07b [F] Il contenuto è **verificato voce per voce contro l'elenco G-021 dell'Esperto della guida** (`guida/registro.md`, allegato `guida/G-021-negoziazione.md`, fonte Royal). I numeri di G-021, con la correzione dell'Esperto del 2026-10-20:
  - oggi mancano **49 domande**;
  - **86 esiti** sono diversi da Royal;
  - gli **esiti mancanti** sono **979**;
  - **52 domande** non hanno una risposta buona;
  - **24 risposte** hanno esiti contraddittori e sono contate a parte.

  G-021 ha verificato anche le carte degli umori e le personalità delle Ombre. Alla fine del lotto:
  - le 49 domande ci sono;
  - gli 86 esiti coincidono con la fonte, uno per uno;
  - i 979 esiti mancanti sono presenti;
  - ognuna delle 52 domande ha la sua risposta buona, se la fonte la dà;
  - le 24 risposte contraddittorie sono risolte secondo la fonte, o elencate come discordanza. Il rapporto di verifica elenca, per umore: le domande e le risposte presenti, quelle aggiunte, quelle corrette e le eventuali discordanze con la fonte. Alla fine non manca nessuna domanda o risposta di G-021 e nessun esito è diverso dalla fonte, salvo le discordanze dichiarate.
- R8-07c [F] La vista **«Aiuto in Battaglia → Negoziazione»** mostra domande e risposte **raggruppate per umore** e si consulta durante il gioco: si sceglie l'umore, oppure l'Ombra, che porta al suo umore, e si cerca la domanda per testo.
- R8-07d [F] L'**umore di ogni Ombra è collegato alla sua scheda** (`/guida/ombra/<chiave>`): dalla scheda si apre la negoziazione del suo umore, e dalla negoziazione si vedono le Ombre di quell'umore. Questo vale insieme a R8-04 (personalità valida o «sconosciuta»).
- R8-07e [NR] **Nessuna perdita** di ciò che c'è oggi: ogni domanda, risposta, esito e nota presente oggi in «Aiuto in Battaglia e Negoziazione» resta dopo il lotto, oppure, se la fonte la smentisce, è elencata con il motivo e tolta solo dopo l'approvazione. Il confronto prima/dopo è voce per voce.
- R8-07f [UX] Dal telefono in battaglia: dalla domanda dell'Ombra alla risposta giusta in al più due tocchi (umore, poi domanda, oppure ricerca per testo), con gli esiti leggibili a colpo d'occhio.

### Debolezze e dati dal compendio
- R8-08 [F] Le debolezze e resistenze di un'Ombra si leggono solo dalle affinità della sua Persona nel compendio; nessuna vista (Ombra, dedalo, Battaglia, voce del Palazzo) ne ha una copia propria.
- R8-08b [F] **Eccezione: le Ombre che nel gioco hanno affinità diverse dalla loro Persona** (Esperto della guida, G-019, dati di Royal) hanno affinità **proprie**, una sola copia sull'Ombra, con la fonte. Solo per gli elementi che differiscono, e il resto si legge dal compendio. Sono 4:
  - Vendicatore sconfitto (Take-Minakata): Elettricità «riflette»;
  - Sole oscuro (Mithras): Nucleare «riflette»;
  - Orsacchiotto assassino (Bugs): Fuoco debole, Psicocinesi e Maledizione neutre;
  - Guerriero divino / Potestà (Power): Arma da fuoco neutra; la Persona Power resta debole.

  Il compendio della Persona non cambia: vale per la fusione e per la scheda della Persona. Negli altri casi di oggi (37 Ombre della Battaglia e 45 voci diverse dal compendio) **vince il compendio**: la guida sbaglia o è imprecisa. Verifiche:
  - la pagina dell'Orsacchiotto assassino mostra Fuoco debole, mentre la scheda di Bugs no;
  - per le 37 + 45 righe di oggi resta solo il dato del compendio, salvo le 4 eccezioni.
- R8-09 [F] Le Ombre la cui Persona non esiste nel compendio (boss, Ombre uniche, «non reclutabile») hanno debolezze proprie, una sola copia, sull'Ombra. Le non reclutabili sono **5** (Esperto, G-035, certezza alta): i 4 Servobot di Okumura e lo «Straziato re dei desideri» (maschera Mara, obiettivo di una Richiesta, non negoziabile). Le due righe di Kaneshiro con Ombra e maschera scambiate, «Fango pulsante» (Persona Melma nera / Black Ooze) e «Maestra degli scherzi» (Pixie superiore / High Pixie), sono **reclutabili**, con la Persona e la personalità giuste. Verifica: 5 Ombre senza Persona; le due di Kaneshiro con la loro Persona.
- R8-10 [F] Correggere le affinità di una Persona (pagina Persona) cambia le debolezze mostrate ovunque.

### Una strada di cattura
- R8-11 [F] Catturare un'Ombra nei Memento registra la Persona nel compendio della partita (comportamento di oggi, invariato).
- R8-12 [F] Catturare un'Ombra in un Palazzo (voce Persona o Ombra di un'infiltrazione) registra la Persona nel compendio della partita con la stessa azione e lo stesso esito dei Memento; non esiste più uno stato di cattura proprio della voce (le 44 voci con stato proprio).
- R8-13 [F] Catturare dalla Battaglia registra la Persona nel compendio allo stesso modo.
- R8-14 [F] Lo stato «catturata» mostrato in Palazzo, Memento e Battaglia si legge dal compendio: registrare la Persona da una vista la mostra registrata in tutte; togliere la registrazione (con la conferma di oggi, che avvisa della perdita di livello, bonus e abilità) la toglie ovunque.
- R8-15 [F] Le voci Persona/Ombra dei Palazzi non contano nel completamento del Palazzo (come nei Memento), coerentemente con L4.

### Iweleth (D3)
- R8-16 [F] Iweleth esiste solo come dedalo dei Memento: le sue aree confluiscono nelle aree del dedalo; nessuna Persona di Iweleth ha un secondo stato (le 9 Persona doppie diventano una per Persona, registrata nel compendio).
- R8-17 [F] Le voci di Iweleth con tipi non ammessi nei dedali (38/47) diventano Trama o Persona secondo le regole dei Memento (2026-10-11), con elenco; nessuna voce si perde.
- R8-18 [F] I lettori della riga `dungeon iweleth` (condizioniSpillo, collocazioneTokyo, palazzi, DungeonPage, migrazione 101 — ricognizione L3) funzionano dopo la confluenza o sono aggiornati; gli spilli guida con FK RESTRICT (12) non bloccano la migrazione e restano collegati o elencati.
- R8-19 [F] Lo scambio Parte III/IV su 160-4-0/160-5-0 e l'area-8 «???» sono risolti secondo l'elenco approvato.
- R8-19b [F] **Iweleth e il boss finale.** In L4 Iweleth ha una voce di boss finale dichiarata (`voce_boss_finale` = Yaldabaoth, L4 §8.14). Con la confluenza nel dedalo (D3), Iweleth segue la regola dei Memento (il boss segnato nella guida), non quella di «concluso» dei Palazzi: dopo L8 nessun effetto di Palazzo (ingresso, requisiti «dopo il Palazzo») dipende da Iweleth. Verifica: dopo la migrazione, nessuna condizione «Palazzo concluso» cita Iweleth.
- R8-15b [F] Con il livello «concluso» (L4 R4-22) il Palazzo sparisce dopo il furto (G-026): una Persona che si cattura solo in quel Palazzo resta catturabile nei Memento o altrove secondo «dove si incontra» (R8-05). La pagina Ombra lo dice («nel Palazzo di X, ora concluso: nei Memento a …»).

### Persona del party (D7)
- R8-20 [F] Le Persona del party (membri della squadra) sono collegate al compendio per chiave; le 27 su 29 che oggi non coincidono sono abbinate o elencate.
- R8-20b [F] **Le 27 Persona del gruppo** (G-025: 9 membri × 3 forme, con i nomi della guida italiana, per esempio Ecate, Mercurio, Ioanna, Prometeo, Ervardo, Cenerentola) hanno ciascuna una scheda: arcano, livello, quando si ottiene, tratto, affinità prima e dopo il risveglio, skill con livello e modo di impararle. Ognuna è collegata al membro del gruppo. I dati vengono da `guida/G-025-persona-del-gruppo.json`, che BE porta nel repository. Nessuna skill manca: le 88 skill sono già nella tabella `skill` per nome canonico. Verifica: per ognuno dei 9 membri le 3 forme sono nel compendio con il nome della guida, e la scheda di Ervardo dice che deriva da Loki.
- R8-20c [F] **Un nome italiano unico per ogni elemento**, letto da tutte le viste: compendio, Ombra, Battaglia, negoziazione, voci. I nomi sono quelli della guida (G-025):
  - elementi: Fisico, Arma da fuoco, Fuoco, Ghiaccio, Elettricità, Vento, Psicocinesi, Nucleare, Sacro, Maledizione, Divino;
  - tipi: Alterazioni, Recupero, Supporto, Passive, Tratti;
  - esiti: Debole, Resiste, Annulla, Riflette, Assorbe.

  Correzioni: «Psichico» → Psicocinesi, «Oscurità» → Maledizione, «Quasi-divino» → Divino, «Guarigione» → Recupero, e in Battaglia «Tuono» → Elettricità, «Gelo» → Ghiaccio, «respinge» → Riflette. **Eccezione decisa dal PM (~05:10Z)**: nelle voci del boss di Madarame scritte dall'utente (ordine 18 e 19) «Gelo» e «respinge» **restano come le ha scritte**, perché sono il suo testo, e la voce va nell'elenco «da rivedere» (R11-10c). La correzione vale per i nomi generati dall'app e per i dati, non per il testo libero delle voci dell'utente. Verifica: nel DOM di compendio, Battaglia e pagina Ombra non compare nessuno dei nomi vecchi.
- R8-21 [F] La vista «Persona della partita» (piano riga 285) mostra per ogni Persona se è in scorta, se è registrata e se la registrazione è più vecchia dell'esemplare, con «Registra» accanto — se il perimetro la assegna a L8 (vedi dubbio 6), altrimenti a L10.

### Memento invariati e lavoro da preservare
- R8-22 [NR] I dedali dei Memento (9 dedali, `area_dedalo`, `persona_area_dedalo`, timbri, Richieste, Trama, Persona in cima, tocco che registra) restano identici per struttura, testi, conteggi e comportamento; stessa risposta API prima/dopo per `mementos`, salvo Iweleth (R8-16).
- R8-23 [NR] Compendio della partita reale copiata (registrazioni, livelli, abilità, bonus) invariato dopo la migrazione; le catture già segnate come stato delle voci dei Palazzi diventano registrazioni solo se la Persona non era già registrata, senza toccare quelle esistenti (dubbio 3).
- R8-24 [NR] Kamoshida (169 voci) e Madarame (227 voci e 254 pin utente sulla copia 0440Z, impronta 263; 225/252 sulla copia precedente): le voci Persona/Ombra mantengono testo, ordine, pin e posizione; cambia solo dove si legge lo stato di cattura.
- R8-25 [NR] Il diario 04-01..06-01 (255 voci sulla copia di produzione 0440Z del 2026-10-20; 254 sulla copia precedente) invariato; le voci della Stanza di Velluto non cambiano comportamento in L8.
- R8-26 [NR] Scorta (`persona_posseduta`), fusioni e Stanza di Velluto funzionano come prima.
- R8-27 [NR] Typecheck e lint verdi; test mirati (dedali, compendio, maschere, Battaglia, Ombre, migrazioni nuove, DungeonDettaglioPage per i Memento) verdi con output grezzo.

### Esperienza e layout
- R8-28 [UX] In Battaglia dal telefono: trovare un'Ombra e vederne debolezze (dal compendio) e se la sua Persona è registrata in due tocchi.
- R8-29 [UX] Nel Palazzo la cattura di un'Ombra si segna con un tocco come nei Memento, con lo stesso aspetto (piastrella con immagine della Persona).
- R8-30 [L] Pagina Ombra, vista Negoziazione per umore, Battaglia, scheda Persona con «dove si incontra», vista «Persona della partita»: nessuno scorrimento orizzontale a 1280, 768, 375; bersagli ≥44 px; piastrelle delle Persona larghe almeno 88 px (tre per riga sul telefono, come nei Memento).

## Decisioni coinvolte
| Decisione | Scelta consigliata applicata, da confermare | Effetto sui criteri |
|---|---|---|
| D3 Iweleth | **Solo come dedalo dei Memento** (le aree del «Palazzo» confluiscono nel dedalo) | R8-16..R8-19 |
| D7 Persona del party | **Collegate al compendio per chiave** | R8-20 |
| D4 Permanenti/rigenerabili | Ombra-sciagura rigenerabile | Le Ombre sciagura restano voci rigenerabili (L4) collegate all'Ombra |

## Lavoro dell'utente da preservare toccato dal lotto
- Compendio della partita reale (registrazioni con livelli, abilità, bonus): mai toccato se non per aggiungere registrazioni mancanti approvate.
- Voci Persona/Ombra di Kamoshida e Madarame con i loro pin e stati.
- I Memento organizzati a mano dall'utente (aree, timbri impostati, Richieste) — modello di riferimento, intatti.

## Dipendenze
- **L4 consegnato** (stato sull'oggetto; le voci di cattura escono dal completamento).
- L3 (aree del Palazzo per «dove si incontra»; destino di Iweleth deciso in L3, dubbio 7).
- Prepara **L10** (registrazione unica di una Persona, vista «Persona della partita»).

## Casi dubbi da approvare (soluzione prudente proposta)
1. **Abbinamento Ombra ↔ Persona per nome** (maschere): solo gli abbinamenti dell'indice delle maschere esistente (`maschere.ts`) e quelli
   esatti; gli altri in elenco.
2. **Debolezze divergenti dal compendio** (12/210, 27/210) — *risposta dell'Esperto (G-019)*: vince il compendio, tranne le 4 Ombre con
   affinità proprie nel gioco (R8-08b). Chiuso sul gioco. Testo della prima stesura: vince il compendio per le Ombre con Persona; per le Ombre uniche resta la copia
   della guida. Le differenze si mostrano all'utente prima della migrazione.
3. **Catture già segnate sulle 44 voci dei Palazzi**: diventano registrazioni nel compendio solo dove la Persona non è registrata;
   l'elenco va all'utente perché registrare una Persona crea un esemplare (livello e abilità di base).
4. **Iweleth confluito nel dedalo ma con planimetrie e pin**: i dedali non hanno planimetrie; le 26 planimetrie e i 55 spilli di Iweleth
   restano consultabili (da collocare o come planimetrie del dedalo in sola lettura), non cancellati. Da approvare.
5. **Boss e miniboss**: sono Ombre «non reclutabili» con debolezze proprie; restano voci permanenti dei Palazzi.
6. **Vista «Persona della partita»**: il piano la mette nella parte partita (L10); L8 si limita alla registrazione unica. Prudente: in L10.
7. **Personalità fuori dalle 4**: si propone la correzione dalla guida; se incerta, «sconosciuta».
