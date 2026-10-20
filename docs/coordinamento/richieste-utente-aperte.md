# Richieste dell'utente ancora aperte (elenco di controllo del PM)

Ogni richiesta resta qui finché l'utente non la vede funzionare su p5s. Lo stato si aggiorna a ogni passo. È nato il 2026-10-20 alle 19:45Z, dopo che il PM aveva dichiarato L3 completo con richieste ancora mancanti.

| # | Richiesta (parole dell'utente, in sintesi) | Stato | Chi |
|---|---|---|---|
| 1 | Le voci della guida si vedono **per planimetria**: senza pin, nella planimetria dove la voce è stata inserita; con almeno un pin, nella planimetria di ogni suo pin; una voce chiusa sparisce ovunque. Vale **anche nella scheda del Palazzo** | **non fatto** (UX3-14); BE fatto (42b34243), FE al lavoro | FE |
| 2 | Nel **visore** la guida c'è, solo per l'uso: casella fatto/riapri (l'equivalente di Raccolto/Riapri), tutti i dettagli dentro la voce, riferimenti ai pin; il tocco su un pin evidenzia la voce. Al posto della lista testuale non interattiva del pannello | **non fatto** (RG-1) | FE, dopo il punto 1 |
| 3 | La guida nel visore sta in una **finestra fluttuante** che si apre, si chiude e si sposta. **Stessi componenti, nessuna copia.** Le funzioni non dipendono dallo schermo intero | **non fatto** (RG-1) | FE |
| 4 | La **modalità modifica** (editor) non si cambia | rispettato | — |
| 5 | Le voci senza pin restano agganciate alla **planimetria 1** e si **spostano a mano** in un'altra planimetria durante la review | BE fatto (42b34243); campo «Planimetria» **non fatto** | FE |
| 6 | La scheda «Forziere — Fiale delle vertigini S» si deve poter **sistemare** | **non su p5s**: «Collega a una voce» è in L4, in prova | rilascio di L4 |
| 7 | Intestazione al massimo al **30%** della schermata a ogni dispositivo | fatto nella scheda (LAY3-5); Percorso a 375 al limite (230 su 243), da compattare in L10 | — |
| 8 | Tutto il lavoro salvato su git, per riprendere da qualsiasi IA | fatto e in corso a ogni passo | PM |
| 9 | La documentazione non blocca il rilascio, se l'app è testata e corretta | applicato | PM |
| 10 | Niente schermate né dati personali nel repository pubblico | fatto (`.gitignore`, controlli) | PM |
| 11 | L'app dev'essere **usabile durante la partita** | **oggi la guida della scheda non lo è** (123 voci mescolate) | punti 1–3 |

Regola del PM: un lotto si dichiara completo solo quando ogni richiesta che lo riguarda è verificata su p5s **con il caso dell'utente**: qui, Madarame, infiltrazione 4, Sala del Tesoro – Atrio, Livello 0.
