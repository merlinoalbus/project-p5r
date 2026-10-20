# L3 — verdetto del validatore, giro 1 (2026-10-20, ~15:40Z): RIGETTATO

Linea `newreview-l3` = b5fd6cfe. Il validatore trova il codice coerente con quanto dichiarato e la catena git pulita: solo L3 più documenti rispetto a c8338fd0, niente di 42b34243, migrazioni fino alla 113, patch-id uguali. Le regole a 6 misure sono rispettate sulla scheda del Palazzo, e il no-reg sul lavoro da preservare è verde. Rigetta per mancanza di prove e per documenti incoerenti.

## Richieste e chi le chiude
| Richiesta | Contenuto | A chi | Stato |
|---|---|---|---|
| R1 (F1, bloccante) | 24 schermate (jpg/png) committate in `lotti/L3/esiti-ux/` e `esiti-layout/` e pubblicate sui rami remoti `newreview-lavoro` e `newreview-l3`, contro la regola dell'utente «NON si pubblicano… né schermate e log». Alcune mostrano il nome della partita dell'utente. La violazione è del PM, che le ha committate e pushate | **decisione dell'utente** (rimozione dall'albero, oppure anche riscrittura della storia dei due rami remoti) | aperto, domanda all'utente |
| R2 (F2) | Output Vitest grezzo dei test BE di L3 su b5fd6cfe: palazzi-aree (19/19), 110, cestino, dungeon, importa-mappe-grande, openapi | Collaudo | in corso |
| R3 (F3) | Output rosso grezzo: il test di ogni correzione eseguito sul commit precedente, riga per riga; dove il rosso non si riproduce, dichiararlo | Collaudo | in corso |
| R4 (F4) | `difetti.md`: hash (originale e sulla linea) in ogni riga corretta; UX3-13 riportato su una sola riga; correggere «a 1024×690 la fila non c'è» | PM | in corso |
| R5 (F4) | STATO-ATTUALE allineato allo stato vero, sia in pensive sia sulla linea | PM | in corso |
| R6 (F6) | Sezione L3 in `docs/DECISIONI.md` e `docs/ARCHITETTURA.md`; decisioni mancanti in `decisioni-pm.md` | PM | in corso |
| R7 (F5) | 640 indirizzi su b5fd6cfe, oppure il diff 48d7a958..2df44d30 che mostri che la scelta di area e versione non è cambiata | Test no-reg | da fare |
| R8 (F7) | Ciclo di scrittura su b5fd6cfe: gestione dall'interfaccia (aggiungi, modifica aree, elimina, cestino) e le 9 voci di R3-37b più il 04-20 | Collaudo (con un tester se serve) | in corso |
| R9 (F8) | Intestazione ≤ 30% anche su `/guida/mappe` e `/guida/percorso` alle 6 misure | Test layout | da fare |
| R10 (N1, N2) | Prompt e ROADMAP coerenti: UX3-12 e UX3-13 nell'elenco; «30 file di test su 53 che importano Selettore» | PM, Collaudo | da fare |

Note del validatore:
- **N3.** Lo stemma velato all'opacità 0,07 nelle intestazioni senza illustrazione (Memento) viene da L1, già approvato. Non è un difetto di L3, ma resta un decoro sotto il 100%: va nell'elenco «da rivedere».
- **N4.** Il codice di L4 (111–113) è sulla linea ed è dichiarato fuori perimetro.

Il verdetto integrale è nel resoconto dell'agente, riportato qui sopra per punti. Nessuna richiesta modifica il codice. Se R7, R8 o R9 trovano un difetto, la correzione segue il solito ciclo.
