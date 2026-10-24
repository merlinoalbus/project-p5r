# L9 — Esami (R9-18), eventi del Calendario (R9-22) e debolezze copiate (2026-10-24)

Sola lettura, nessun commit. Dati: copia p5s `p5s-2026-10-23-1935Z` (schema 138/30) per ciò che c'è «oggi nei dati di p5s»; copia migrata a HEAD (gioco 178, scratchpad) per gli eventi del Calendario. Codice: HEAD `1087b35c`.

**Come ho letto «segni delle righe riassuntive».** Ho inteso due cose: (a) le **righe riassuntive** sono le 12 righe di `domanda` di tipo `esame-medio`/`esame-finale` (una per giorno d'esame, con un riassunto tipo «Serie di domande su Minamoto no Yoshitsune…» e le domande vere dentro `risposte_json`); (b) i **segni** sono le spunte di partita su quelle righe (`domanda_partita`). Se «segni» voleva dire altro, il punto 1.4 è quello da correggere.

---

## 1. R9-18 ×3 — gli esami in una tabella sola

### 1.1 Come sono oggi i dati di p5s

| Dato | Dove | Valore |
|---|---|---|
| Esami | `esame` | 4 righe: `esame-1` (date 05-11, 05-12, 05-13; risultati 05-20), `esame-2` (07-13..15; 07-19), `esame-3` (10-17..19; 10-24), `esame-4` (12-20..22; 12-24) |
| Domande dell'esame, copia 1 | `esame.domande_json` | **31** elementi `{data, ordine, domanda, risposta}` (8, 8, 7, 8), con `ordine` che corre su tutto l'esame (1..8) |
| Domande dell'esame, copia 2 | `domanda.risposte_json` delle 12 righe d'esame | **31** elementi `{ordine, testo, domanda}` (`testo` = la risposta), con `ordine` che riparte a ogni giorno |
| Righe riassuntive | `domanda`, tipo `esame-medio` (6) / `esame-finale` (6) | 12 righe, tutte con `chiave` e `origine = seed`, `nascosto = 0`; `data` = il giorno d'esame; `chi` = «Esame di metà semestre 1 (Maggio)» ecc. |
| Date | `esame.date_json`, `esame.data_risultati`, `domanda.data` e `data` dentro ogni elemento di `esame.domande_json` | 4 posti per la stessa data |
| Premi | `esame_premi` (1 riga JSON) | premi, moltiplicatore dei Confidenti, requisito di Conoscenza, trofeo |
| Segni di partita | `domanda_partita` (utente) | 12 righe in tutto (6 su p1, 6 su p2), **nessuna su una riga d'esame** (tutte sulle domande di classe e dei quiz in TV) |
| Piazzamento | `utente.esame_piazzamento_partita` | per `esame.chiave` e partita |

**Le due copie coincidono.** Per ognuna delle 31 domande ho cercato il testo del quesito nell'altra copia: 31 su 31 trovate, **nessuna risposta diversa**, nessuna domanda in più o in meno. È una pura duplicazione, non una divergenza.

Anomalie lette nei dati, da non confondere con duplicati:
- La nota di `esame-3` dice che AllGameStaff elenca anche 10-22 (quadrato magico) e 10-24 (bias di memoria) e non è chiaro se siano parte dell'esame: nei dati sono domande di classe (`classe`), non d'esame. Restano come sono.
- `esame_premi` ha un testo con i «sei» Confidenti col moltiplicatore e senza Ann: già superato dalla decisione di R9-08 (sette Confidenti). Non fa parte di R9-18, ma è un'altra copia da allineare.

### 1.2 Che cosa dicono le fonti Royal (Samurai Gamers, walkthrough Royal)

| Esame | Giorni | Risultati | Premio al risultato | Domande (numero) | Pagina |
|---|---|---|---|---|---|
| Metà semestre 1 | 11, 12, 13/5 | **20/5** | Fascino +3 | 4 + 2 + 2 = 8 | `p5r-may-walkthrough` |
| Fine semestre 1 | 13, 14, 15/7 | **19/7** | Fascino +5 | 4 + 2 + 2 = 8 | `p5r-july-walkthrough` |
| Metà semestre 2 | 17, 18, 19/10 | **24/10** | Fascino +5 | 3 + 2 + 2 = 7 | `p5r-october-walkthrough` |
| Fine semestre 2 | 20, 21, 22/12 | **24/12** | Fascino +3 | 4 + 2 + 2 = 8 | `p5r-december-walkthrough` (edizione «Second Edition», versione giapponese) |

- **Date e risultati coincidono 12/12 con i dati** (e con le 4 date di risultato). **Le 31 domande coincidono per numero e per giorno** con quelle dei dati.
- **Risposte:** tutte le scelte indicate dalle guide corrispondono alle risposte dei dati (per esempio 11/5 Minamoto no Yoshitsune / Yoritomo / «Yoritomo» / «i deboli»; 13/7 64 gradi / Zhuge Liang / teste / sostituto; 17/10 32 superfici / un solo colore / bianco e nero; 22/12 Giappone / Dreadnought). Le guide danno solo il numero e il testo dell'opzione, non il testo del quesito: il quesito resta quello dell'AllGameStaff.
- **Cosa non risulta dalle fonti Royal:** nessuna pagina letta dà la classifica per piazzamento (primo, primi 10, altro) né il «Fascino +2 sopra la media»; il Royal dà solo il premio al giorno dei risultati, uguale per tutti. Il testo di `esame_premi` («primi 10: +3, sopra la media: +2») non trova conferma. Le pagine «Exam Answers» e «Rank First in the Exams» di Samurai Gamers risultano nel menu del sito ma non le ho potute aprire (404 sull'indirizzo provato).
- **Dubbio sui quesiti:** il 19/10 la seconda domanda è «Termine per la rarefazione delle stelle» con risposta «Tre api in tutta Europa»; la guida Royal ha esattamente «3 bees in all of Europe» fra le opzioni. Il testo del quesito non è confermabile con queste fonti, la risposta sì.

### 1.3 Regola proposta per ciascuna voce (senza pannelli)

Una regola sola, in due passi, che consolida i dati senza toccare gli id (le righe `domanda` restano le stesse con lo stesso `id` e la stessa `chiave`):

**R9-18/1 — Unificare le domande per chiave.**
La fonte è la tabella `domanda`: le 12 righe d'esame, con le loro 31 domande in `risposte_json`, sono la sola copia. Il collegamento all'esame si fa per **tipo e data**: una riga `esame-medio`/`esame-finale` appartiene all'esame la cui `date_json` contiene la sua `data` (12 su 12 si abbinano senza ambiguità, tre righe per esame). `esame.domande_json` si svuota (`[]`) alla fine della migrazione, dopo aver verificato che per ogni elemento esista l'elemento corrispondente in `domanda` (stesso quesito, stessa risposta, stesso giorno): se un solo elemento non coincide, la migrazione si ferma e lo dice (oggi: 31/31 coincidono). Nessun elemento è perso e nessun quesito è riscritto.

**R9-18/2 — Unificare la data della domanda e dell'esame.**
La data vive sulla riga `domanda` (`domanda.data`, come per tutte le altre domande). La `data` dentro ogni elemento di `domande_json` sparisce con l'array. `esame.date_json` smette di essere un dato scritto: è l'elenco delle `domanda.data` distinte delle sue righe (05-11, 05-12, 05-13 eccetera, e coincide già con quelle scritte). `esame.data_risultati` **resta sull'esame**: è un fatto dell'esame, non della domanda, e le fonti Royal lo confermano (20/5, 19/7, 24/10, 24/12). Se si vuole la colonna `date_json` ancora presente per compatibilità, va scritta una volta dalla migrazione e poi letta solo dalle domande.

**R9-18/3 — Lettore degli esami dalla fonte unica.**
`domandeService.esami()` (`server/services/domandeService.ts:34-37`) costruisce `EsameDto.date` e `.domande` dalle righe `domanda` raggruppate per esame invece che da `esame.date_json` e `esame.domande_json`; l'`ordine` mostrato è `data` poi `ordine` della riga (l'`ordine` corrente dei due JSON non è lo stesso: 1..8 continuo contro 1.. per giorno). Gli altri lettori di `esame` non toccano le domande e restano come sono: `piazzamentoEsamiService.ts:23, 40, 51` (chiave, nome, ordine, `data_risultati`), `fontiRicompenseOggetti.ts:33` (nome e nota), `snapshotProposteOggetti.ts:55`. La pagina `DomandePage` mostra già le domande d'esame «nell'elenco per data, con il quesito accanto a ogni risposta» (`src/pages/DomandePage.tsx:155`): non cambia.

### 1.4 Segni di partita e conservazione (R9-27)

- Nessuna riga d'esame ha segni su p1 e p2 (12 segni, tutti su domande di classe o di TV). La migrazione non tocca né gli `id` né le `chiave` delle righe `domanda`, quindi **nemmeno un segno cambia**, anche per partite future.
- Il piazzamento (`esame_piazzamento_partita`) lega a `esame.chiave` e non a una domanda: invariato.
- Il Diario spunta una domanda con l'effetto `domanda` per `domanda_id` (`effettiDiStatoService.ts:61`): invariato.
- Da dire: se un giorno l'utente segnerà «fatta» una riga d'esame, la riga riassuntiva diventerà il segno dell'intero giorno, non della singola domanda. Oggi succede già lo stesso per le righe di classe (una riga per giorno). Non cambia con questa regola.

### 1.5 Rischi

- Il passo «svuota `domande_json`» è distruttivo per una colonna: va dopo il controllo di coerenza e non prima; la copia di avvio in `data/backups` protegge il resto.
- L'ordine (1..8 contro 1..n per giorno) cambia solo nel DTO.
- Il Royal non dà alcun elemento per cambiare le risposte o le date: la regola non ha bisogno di nuovi dati.

---

## 2. R9-22 — Gli eventi del Calendario: quali sono, da dove vengono, regola proposta

R9-22 chiede che il Calendario sia la vista mensile del Diario e che i tag si modifichino dallo stesso modulo. Oggi il Calendario mostra 173 eventi (`evento_calendario`, scritti a mano dal seed), le allerte meteo (`allerta_meteo`, 74 righe su 44 giorni) e il meteo del giorno (`giorno`). **Quanti di questi eventi sono già ricavabili da un dato strutturato** è la parte utile: qui sotto, tipo per tipo, sulla copia migrata a HEAD.

| Tipo | N | Da dove viene oggi | Dato strutturato da cui si può ricavare | Regola proposta |
|---|---|---|---|---|
| `esame` | 8 | AllGameStaff `interrogazioni-esami-risposte`: «inizio» e «fine» di ogni sessione (05-11, 05-13, 07-13, 07-15, 10-17, 10-19, 12-20, 12-22) | `esame.date_json` (poi le date delle righe `domanda`, vedi 1.3) e `esame.data_risultati` | Derivare 2 eventi per esame (primo e ultimo giorno) **e aggiungere il giorno dei risultati**, che oggi non ha evento (20/5, 19/7, 24/10, 24/12; confermati dal Royal). Totale 12 eventi, tutti ricavati |
| `meteo` | 4 | AllGameStaff: pioggia del 20/1, prima neve del 3/12, due giorni di «ondata di gelo» (26-27/1) | `giorno.meteo_giorno/meteo_sera/nota_meteo` e `allerta_meteo` (le 4 righe `ondata-di-gelo` 26-27/1, giorno e sera) | I due giorni di gelo sono doppioni di `allerta_meteo` (già mostrata come tag): da togliere dagli eventi. Pioggia 20/1 e prima neve 3/12 sono già nel meteo del giorno (`giorno`: 01-20 Pioggia/Neve, 12-03 Neve/Pioggia): da togliere o ricavare |
| `vacanza` | 11 | AllGameStaff: «nessun tempo libero», «serata confinata», Hawaii, ecc. | `giorno.tempo_libero_json` (39 giorni con giorno e sera falsi, 1 con la sola sera falsa, 306 senza dato) | Ricavare gli eventi dai giorni consecutivi con tempo libero falso (e dal giorno con la sola sera chiusa); il titolo («Viaggio alle Hawaii», «Giorno dedicato a Sojiro») resta il testo della guida come nota. Da decidere: il contenuto narrativo dei titoli non sta nei dati strutturati |
| `festa` | 24 | AllGameStaff e wikiwiki (Capodanno, Golden Week, Tanabata, Natale…, elezioni, influenza) | nessuno: sono dati primari. Un solo lettore li usa come calendario di festivi (`server/services/disponibilitaStrutturataService.ts:69`) | Restano **dati propri** del Calendario. Da separare: le feste nazionali (che contano per la disponibilità) dagli eventi di trama travestiti da festa (Gita in spiaggia, Riunione degli amici, Elezioni) |
| `scadenza` | 18 | AllGameStaff e wikiwiki | `dungeon.finestra_al` per i Palazzi | Già decisa in `ricerca-royal-2-2026-10-24.md` §3.3 (8 derivate dalle finestre, 3 proprie, 4 annunci → storia, 2 consigli, 1 che esce) |
| `sblocco` | 46 | AllGameStaff: sblocchi dei Confidenti al rango 1 (17), dei quartieri, delle attività, dei Palazzi | `confidente_requisito` rango 1 (data), `dungeon.finestra_dal`, `quartiere.sblocco_data`, `luogo`/`attivita.condizioni_json` (data) | Derivare l'evento dalla data della condizione, non il contrario. Divergenze già note e in correzione (R9-04/3, migrazione 182) |
| `storia` | 61 | AllGameStaff e wikiwiki | per i Palazzi: `dungeon.finestra_dal` (primo ingresso) e `furto_consigliato`; per i Confidenti: nessuno | I 18 eventi di storia che citano un Palazzo (primo accesso, boss, lettera di sfida) si ricavano dalle finestre; gli altri 43 sono dati propri della trama |
| `consiglio` | 1 | wikiwiki: «Consigliato completare Kamoshida entro oggi» (1/5) | `dungeon.furto_consigliato` / consiglio | Ricavabile dalla finestra; è l'unico evento «consiglio» (altri due consigli sono oggi tipo `scadenza`: id 82 e 136) |

Altri fatti utili:
- Dei 173 eventi, **109 hanno almeno una voce del Diario collegata** (134 collegamenti in `evento_calendario_voce`, migrazione 164): esame 8/8, sblocco 36/46, storia 46/61, festa 10/24, vacanza 6/11, scadenza 3/18, meteo 0/4, consiglio 0/1.
- Vengono tutti dalle fonti della guida (AllGameStaff per la maggior parte, wikiwiki per 7, la pagina sugli effetti del meteo per 2); il campo `fonte` è l'indirizzo della pagina. Il Calendario non permette di correggere un evento.
- Il Calendario è di sola lettura (`src/pages/CalendarioPage.tsx`): nessun gesto di modifica dei tag.

**Regola proposta per chiudere R9-22 consolidando i dati:**
1. Gli **eventi ricavati** (esami con risultati, scadenze e sblocchi dei Palazzi e dei Confidenti, vacanze da `tempo_libero_json`, meteo da `giorno` e `allerta_meteo`) non sono righe di `evento_calendario` scritte a mano: il Calendario li compone al volo dalle fonti, con il titolo generato e il link alla voce del Diario collegata (come già fa per `evento_calendario_voce`).
2. `evento_calendario` resta solo per i dati primari che nessun'altra tabella possiede: feste, eventi di trama non legati a un Palazzo, consigli. Quei dati restano modificabili dallo stesso modulo che modifica le voci del Diario (oggi non lo sono).
3. I tag del giorno (meteo e allerte) si modificano dall'editor del giorno già fatto per R9-19 (`src/components/guida/EditorGiorno.tsx`); il Calendario ne apre la stessa scheda. Le allerte (`allerta_meteo`) non sono ancora nell'editor del giorno e vanno aggiunte.
4. Passi: prima i tipi ricavabili senza perdita (esame, meteo, vacanza), poi scadenze e sblocchi (R9-21), per ultimi storia e festa. Ogni passo toglie le righe duplicate solo dopo aver verificato che l'evento ricavato coincida per data e per voce collegata.

**Limiti:** non ho contato gli eventi duplicati fra `storia` e `sblocco` né verificato che i titoli ricavati coincidano parola per parola con quelli del seed. Il Royal non ha un «calendario» da confrontare: le date dei Palazzi e degli esami sono già confermate dal documento `ricerca-royal-2-2026-10-24.md` e dal §1.2.

---

## 3. Il rischio delle 161 voci Persona con le debolezze copiate nel testo

**Esito: il rischio è chiuso, con due note.** Quando l'Ombra è collegata, il frontend **non mostra** la copia nel testo dei dettagli.

**Prove:**
1. `src/components/guida/DettagliPunto.tsx:15-18`: il componente toglie dall'elenco le chiavi `deboleA`, `resisteA`, `debolezze` e `resistenze` quando riceve `senzaAffinita` (il commento: «la copia nel testo dei dettagli non si mostra, così correggere le affinità della Persona cambia ciò che si vede ovunque. Nei dati la copia non si tocca»). Commit `dbbb89c0` (24/10, R8-10/1 3/3).
2. I due soli posti dove i dettagli di una voce si mostrano passano il flag per le voci Persona: `src/components/guida/GuidaDellArea.tsx:396` e `src/components/mappe/GuidaNelVisore.tsx:166` (`senzaAffinita={p.tipo === 'persona' && !!p.persona}`).
3. Quel flag è vero per tutte le 161: `p.persona` viene da `server/services/dungeonService.ts:73` (`cattura?.persona ?? personaDellaMaschera(...)`), cioè dalla maschera e, se manca, dalla Persona dell'Ombra collegata (`server/services/catturePersona.ts:55-70`). Sulla copia migrata a HEAD le 161 voci `persona` con la copia sono **tutte collegate a un'Ombra con una Persona** (161 su 161; 0 senza), quindi tutte con `p.persona` valorizzato.
4. Le debolezze «vere» si leggono dal compendio ovunque: riquadro «i» (`InfoOmbraPersona.tsx`), pagina Ombra, Battaglia, dedali, piastrelle dei Palazzi (R8-08/1-4).

**Le due note:**
- **L'editor delle voci** (`GuidaDellArea.tsx:505`, `EditorDettagli`) mostra ancora le righe `debolezze` e `resistenze` della copia come campi modificabili: chi apre la modifica di una voce Persona le vede, e se le cambia modifica una copia che nessuna vista legge. Non è un difetto di lettura; è una trappola nell'editor. Si risolve nascondendo quei campi nell'editor per le voci Persona collegate, con lo stesso flag.
- **Altre copie restano legittime:** le 21 voci `boss`, 40 `miniboss`, 10 `ombra-sciagura` e 10 `trama` con `debolezze` nel testo non sono Persone: sono dati della voce e si mostrano. Le 11 voci Persona su 172 senza la copia non hanno nulla da nascondere.

**Stato di R8-10/1.** Nel mio documento `lotti/L8/chiusura-2026-10-24.md` avevo scritto che R8-10/1 non era soddisfatta, perché al momento (HEAD `941995aa`) non esisteva la scrittura. Da allora sono arrivati: migrazione 186 con la fotografia delle affinità (`5fae5562`, colonne `origine` e `seed_codice` su `persona_affinita`), `PUT /api/compendio/persona/:id/affinita` e `POST …/ripristina` (`0b14f1c3`, `server/routes/compendio.ts:478-498`, servizio `server/services/affinitaPersonaService.ts`, validazione su `shared/elementi.ts`, invalidazione della cache di gioco, descrizioni OpenAPI `server/openapi/descrizioni/compendio.ts:72-78`) e l'editor `ModificaAffinita.tsx` con Salva e Ripristina nella scheda Persona (`dbbb89c0`). Quel che chiedeva la voce c'è: R8-10/1 è soddisfatta a HEAD `1087b35c`. Resta da fare solo la nota dell'editor delle voci (sopra). Ho aggiunto un avviso in testa al documento L8.
