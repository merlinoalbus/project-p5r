# R3 del giro 1 di L3 — rossi grezzi delle correzioni (Collaudo, 2026-10-20 16:06–16:13Z)

Metodo (`rossi-L3.sh`). Ho creato un worktree staccato nello scratchpad del Collaudo, con `node_modules` della linea collegato in sola lettura. Per ogni correzione C:
1. si portano i file di C;
2. **controllo**: i test toccati da C, nella forma committata, sul codice di C;
3. i sorgenti toccati da C (non i test) si riportano a `C^`;
4. si rilanciano gli stessi test, invariati: rosso atteso;
5. si riporta la copia a C.

Alla fine il worktree è stato tolto (`9-pulizia.txt`) e la linea `newreview-l3` = b5fd6cfe non è mai stata toccata. Un file per correzione, output Vitest `--reporter=verbose` integrale con EXIT; il riepilogo è in `0-riepilogo.txt`.

| Difetto | Commit | Controllo su C | Su `C^` | Lettura |
|---|---|---|---|---|
| UX3-9 | 7b5e8f07 | EXIT=0 | **EXIT=1** | rosso: il test UX3-9 di `InfiltrazioniVoce` |
| UX3-10 | c5a0ccd3 | EXIT=0 | **EXIT=1** | rosso: il test «UX3-8…» di `MappaPage`, che con UX3-10 controlla anche il testo del riquadro «N pin» |
| UX3-11 | 765fb2a1 | EXIT=0 | **EXIT=1** | rosso: il test UX3-11 |
| LAY3-3 | 9e8baea3 | EXIT=0 | **EXIT=1** | rossi: il test LAY3-3 e quello del minimo di 240 px da 1280 |
| LAY3-4 | 48d7a958 | EXIT=0 | **EXIT=1** | rosso: il test LAY3-4 |
| LAY3-5 | 7562f6ac | EXIT=0 | **EXIT=1** | rossi: il test LAY3-5 e tre test che il commit ha aggiornato alla disposizione nuova (anello e chip di L4, illustrazione di L1). Il rosso **si riproduce**, anche se FE l'ha scritto dopo il codice |
| LAY3-6 | 8535c16b | EXIT=0 | **EXIT=1** | rosso: il test LAY3-6 |
| LAY3-7 («Aree · N») | 5bedd907 | EXIT=0 | **EXIT=1** | rosso: il test del foglio di `AreePalazzo` |
| LAY3-7 (selettori) | db7d0423 = c5725908 | EXIT=0 | **EXIT=1** | rosso: il test LAY3-7 di `Selettore`. **Si riproduce**, al contrario di quanto atteso («verde da subito»). Il test di `SelettoreVersioni` dello stesso commit è verde in entrambi i casi |
| LAY3-8 | 08da0557 | EXIT=0 | **EXIT=1** | rossi: i tre test LAY3-8 di `SelettoreVersioni` |
| UX3-12 | d3c97ac9 | **EXIT=1** (vedi sotto) | **EXIT=1** | rosso: il test UX3-12. Nel controllo è scaduto una volta il test R3-24 («Modifica Cancello» non trovato in 1037 ms, attesa predefinita 1 s) |
| UX3-13 | 2df44d30 | EXIT=0 | **EXIT=1** | rosso: il test UX3-13 |
| NR3-4 | d73e7027 | EXIT=0 | **EXIT=1** | rosso: il test NR3-4 |
| AP3-1 | 1b29352b | EXIT=0 | **EXIT=1** | rosso: il test AP3-1 |
| AP3-2 | 235b1216 | EXIT=0 | **EXIT=1** | rossi: i due test del `describe` AP3-2 |
| AP3-4 | e8324898 | EXIT=0 | **EXIT=1** | rossi: i cinque test AP3-4, in quattro file |
| UX3-7, E3 e «pin» | 7efd19e0 | EXIT=0 | **EXIT=1** | rossi: UX3-7 e i test aggiornati alla parola «pin» e al titolo nuovo (E4, E5/E7, UX2-15, UX3-8, Aree di L2). Il rosso del cambio di parola **si riproduce** |
| UX3-8 | d446e4ab | EXIT=0 | **EXIT=1** | rosso: il test UX3-8 |
| E2 (BE) | 0cfbe028 | EXIT=0 | **EXIT=1** | rossi: i quattro test di `mappe-conteggi-pin` |
| E2 (BE) | bc08e3ec | EXIT=0 | **EXIT=1** | rossi: tre test di `mappe-conteggi-pin` (le porte fra i passaggi) |
| E2 (FE) | c8338fd0 | EXIT=0 | **EXIT=1** | rosso dell'intero file: il test finge `getConteggiAlbero`, che sul codice di prima non esiste («getConteggiAlbero non esiste nel modulo vero»), quindi nessun test parte |
| LAY3-2 e R3-41 | f444645d | EXIT=0 | EXIT=0 | **nessun rosso**: il commit aggiorna il test ma cambia solo la disposizione (classi `lg:`), che jsdom non misura. In `difetti.md` è dichiarato «Nessun test». Si prova con le misure di layout |

## UX3-12: il test R3-24 è instabile, non rotto (`UX3-12-d3c97ac9-ripetizioni.txt`)
- Sul codice di d3c97ac9 il test R3-24 da solo è verde 3 volte su 3 (220–234 ms) e il file intero è 77/77.
- Sulla linea b5fd6cfe `DungeonDettaglioPage.test.tsx` è verde (R2 del collaudo su 2df44d30: 140/140 nei sei file).
- Il rosso del primo controllo è un'attesa scaduta sotto carico, cioè quando molti file giravano uno dopo l'altro. È un'osservazione per FE, non un difetto di UX3-12: il test UX3-12 sul codice di prima è rosso, come atteso.
