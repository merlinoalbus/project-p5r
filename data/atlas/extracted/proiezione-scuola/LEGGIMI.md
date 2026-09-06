# Verifica delle coordinate della scuola

Le tre tavole sovrappongono i dati estratti alle immagini originali, senza modificarle:

- Ciano: punti di interazione dell’edificio principale, identificati da `002:indice`.
- Magenta: punti dell’edificio laboratori, identificati da `003:indice`.
- Croci arancioni: ingressi di arrivo, distinti dai punti che attivano un’uscita.

La conversione in esame usa origine e scala delle tabelle native: `pixelX = origineX + X × 1,5 / scala`, `pixelY = origineY + Z × 1,5 / scala`. Nei sei campi esaminati l’origine è (323, 504) e la scala memorizzata è circa 23,44. Il fattore 1,5 è un’ipotesi verificata per confronto spaziale, non una costante già dimostrata dal codice eseguibile del gioco.

Quattro porte del primo piano sono servite a formulare l’ipotesi. Sugli altri otto punti GO, sette sono entro 12 pixel da un’apertura gialla; con i fattori 1 e 2 nessuno rientra in tale soglia. La vicinanza da sola non certifica la destinazione: le tavole e le procedure originali servono a verificare l’apertura corrispondente.

Restano esplicitamente aperti l’accesso al tetto, a quota superiore al corridoio del terzo piano, e lo scarto di circa 10 pixel dei tre ingressi inversi fra gli edifici. Nessun punto è stato spostato automaticamente sull’apertura più vicina.

`evidenze.json` conserva parametri, byte, hash, tutti i 137 punti estratti dai sei campi, gli ingressi, i confronti e le eccezioni. `verifica.json` registra il controllo indipendente delle coordinate e delle fonti. Questi risultati non certificano ancora le condizioni narrative e non hanno aggiunto collegamenti nell’app.

Il validatore ha approvato la diagnosi, mantenendo il tetto e i tre ritorni dai laboratori non certificati. I candidati prioritari successivi sono i passaggi verso i laboratori al secondo/terzo piano e le due porte dell’aula al secondo piano. Anche scale e ingressi di arrivo richiedono una verifica separata.

## Destinazioni e condizioni da verificare nel passo successivo

Le procedure originali indicano, nel ramo ordinario:

- `F002_002_01`, trigger 0: `CALL_FIELD(2,3,0,1)`, ingresso 0 di `F002_003_01`. Coordinate originali dell’arrivo: (1797,5601; 360,4144; −513,0991).
- `F002_002_02`, trigger 0: `CALL_FIELD(2,3,0,2)`, ingresso 0 di `F002_003_02`. Coordinate originali dell’arrivo: (1797,4529; 720,4145; −512,9465).
- `F002_002_01`, trigger 4 e 5: `CALL_FIELD(2,6,0,0)` e `CALL_FIELD(2,6,1,0)`, ingressi distinti nell’aula.

I primi due rami dipendono dai flag 96 e 102; le porte dell’aula dal flag 96. Il ramo con flag 96 richiama procedure narrative basate anche su `GET_COUNT(0x10)` e ulteriori flag: non equivale a una sola data di sblocco.

L’aula `F002_006_00` usa coordinate locali diverse: i suoi ingressi 0 e 1 sono circa (246,5685; 0; 327,6465) e (263,4432; 0; −342,7462). La condivisione del gruppo grafico con i corridoi non autorizza ad applicarle la stessa trasformazione. Questo caso deve essere risolto separatamente prima di posizionare l’arrivo.
