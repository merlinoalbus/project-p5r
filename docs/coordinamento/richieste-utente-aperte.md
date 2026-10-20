# Richieste dell'utente ancora aperte (elenco di controllo del PM)

Nota di ripresa 2026-10-20: il lavoro L6-B5 prosegue; contratto server, filtro della lista del quartiere, rimozione dei fallback legacy del validatore e del lettore runtime dei quartieri, lettura strutturata in `sincronizzaMappe`, DTO quartiere con fonte/esito/inviti, migrazione 120, API, editor FE dello sblocco e descrizioni OpenAPI B6 sono pubblicati fino a `4a61b0bc` (pipeline #61 riuscita). Il confronto del codice conferma la destinazione unica metro/diario; l’API p5s è coerente, mentre una nuova scheda FE anonima è rimasta su «Caricamento». Restano la prova funzionale su una partita e la prova dell’utente su p5s. Nessuna richiesta già pubblicata è stata dichiarata completata.

Ogni richiesta resta qui finché l'utente non la vede funzionare su p5s. Lo stato si aggiorna a ogni passo. È nato il 2026-10-20 alle 19:45Z, dopo che il PM aveva dichiarato L3 completo con richieste ancora mancanti.

| # | Richiesta (parole dell'utente, in sintesi) | Stato | Chi |
|---|---|---|---|
| 1 | Le voci della guida si vedono **per planimetria**: senza pin, nella planimetria dove la voce è stata inserita; con almeno un pin, nella planimetria di ogni suo pin; una voce chiusa sparisce ovunque. Vale **anche nella scheda del Palazzo** | **pubblicato** (b34e577b, 20:35Z) nella scheda; nel visore arriva con il punto 2. Da provare dall'utente | FE |
| 2 | Nel **visore** la guida c'è, solo per l'uso: casella fatto/riapri (l'equivalente di Raccolto/Riapri), tutti i dettagli dentro la voce, riferimenti ai pin; il tocco su un pin evidenzia la voce. Al posto della lista testuale non interattiva del pannello | **pubblicato** (91986570, ~20:55Z): pulsante «Guida» nella barra del visore, casella fatto/riapri, dettagli, riferimenti ai pin in tutte e due le direzioni, nessuna modifica; la lista testuale è tolta. Da provare dall'utente | FE |
| 3 | La guida nel visore sta in una **finestra fluttuante** che si apre, si chiude e si sposta. **Stessi componenti, nessuna copia.** Le funzioni non dipendono dallo schermo intero | **pubblicato** (91986570): finestra trascinabile e dentro lo schermo, foglio dal basso sotto i 768 px, anche a schermo intero. Da provare dall'utente | FE |
| 4 | La **modalità modifica** (editor) non si cambia | rispettato | — |
| 5 | Le voci senza pin restano agganciate alla **planimetria 1** e si **spostano a mano** in un'altra planimetria durante la review | **pubblicato**: BE 42b34243 (migrazione 114) e campo «Planimetria» nella modifica della voce senza pin, 901c7666. Da provare dall'utente | FE |
| 6 | La scheda «Forziere — Fiale delle vertigini S» si deve poter **sistemare** | **pubblicato con L4** (fde7add7): nella scheda di Madarame, «Schede da sistemare» → «Collega a una voce» → «Apri i Forzieri» → «Collega». Il gesto lo fa l'utente sui suoi dati | utente |
| 7 | Intestazione al massimo al **30%** della schermata a ogni dispositivo | fatto nella scheda (LAY3-5); Percorso a 375 al limite (230 su 243), da compattare in L10 | — |
| 8 | Tutto il lavoro salvato su git, per riprendere da qualsiasi IA | fatto e in corso a ogni passo | PM |
| 9 | La documentazione non blocca il rilascio, se l'app è testata e corretta | applicato | PM |
| 10 | Niente schermate né dati personali nel repository pubblico | fatto (`.gitignore`, controlli) | PM |
| 12 | Il **pin** di spostamento (porta, scala, rampino e simili) non offre «Raccogli»: il tocco sposta alla destinazione. Precisazione dell'utente: «non parlo delle voci della guida ma del pin... che al posto di dare l'opzione raccogli... dovrebbe semplicemente spostarti». Vale in tutti i visori; nella scheda si conserva l'infiltrazione; i passaggi non contano fra le cose da raccogliere | **pubblicato** (67a7bfda, b8048c1b): ogni pin di spostamento con un arrivo raggiungibile porta subito alla destinazione, anche se ha voci; niente «Ottenuto/Raccolto» sul pin, le voci si segnano dalla guida. Da provare dall'utente | FE |
| 11 | L'app dev'essere **usabile durante la partita** | **oggi la guida della scheda non lo è** (123 voci mescolate) | punti 1–3 |

| 13 | Togliere la frase «Pin nativo del gioco» dai pin, svuotando il valore, direttamente nel DB | **pubblicato** (116 9c6c869a, 117 cab04c4f: 604 + 386 descrizioni) | — |
| 14 | Il pacchetto di gioco è superato; la fonte è il DB | regola salvata in memoria. **Aperto**: togliere il comando «Importa» dalle Impostazioni e allineare CLAUDE.md, con il sì dell'utente | PM |

Regola del PM: un lotto si dichiara completo solo quando ogni richiesta che lo riguarda è verificata **in modo sistematico su tutti i dati**. Il caso segnalato dall'utente serve a capire il difetto, non a provarne la correzione («lo verifichi con questo?!»). Per la regola delle voci per planimetria (punti 1, 2 e 5) la verifica è:
1. su una copia fresca di p5s, per **ogni planimetria di ogni Palazzo** e per ogni infiltrazione, l'insieme atteso delle voci calcolato con un conteggio SQL indipendente dal codice: voci con almeno un pin su quella planimetria, più voci senza pin la cui planimetria effettiva è quella, meno le segnate, per ogni partita;
2. confronto con l'API, con la scheda nel browser e con la guida nel visore, per tutte le planimetrie: deve essere uguale al 100%, e ogni differenza è un difetto;
3. ogni voce di ogni infiltrazione compare in almeno una planimetria, oppure è dichiarata con il motivo;
4. segna, riapri, spostamento a mano, collega e scollega pin: la voce compare e sparisce nelle planimetrie giuste, su una copia con ripristino;
5. le 6 misure su tutti i Palazzi.
