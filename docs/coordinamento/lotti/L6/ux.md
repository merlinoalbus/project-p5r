# L6 «Condizioni uniche» — Test user experience

Sessione «Test user experience». Stato: **preparazione** (2026-10-20). Si prova solo col via del PM e quando BE/FE segnalano «L6 · Bn pronto su <porta>».
Fonti:
- requisiti.md (R6-29, R6-30, R6-31 per la parte UX);
- modifiche.md §1 (inviti), §4, §6.1, §6.2, §8.4;
- piano.md, tabella «Per i tester».

Le schermate «prima» di Analisi app sono in `schermate-prima/`:
`01-citta-metro`, `02-quartiere-odaiba`, `03-quartiere-asakusa`, `04-libri`, `05-confidente-takemi`, `06-negozio-takemi`,
`07-calendario`, `08-palazzo-madarame-date`, `09-richieste`, `10-partita`, `11-mappa-tokyo-oggi`, `12-editor-pin-condizioni`.

Criterio UX della stesura (M §8.4):
- condizioni leggibili in italiano e uguali ovunque;
- esito rosso con «Manca: …»;
- editor usabile dal tablet (R6-30);
- metro con le date in italiano.

## Percorsi da provare (tablet 768 in partita, telefono 375, desktop 1280; 1366×657 e 1280×689)
| # | Percorso (chi gioca) | Criterio | Cosa misuro | «Prima» |
|---|---|---|---|---|
| C1 | **Metro della città**: fermate chiuse a una data della partita prima del 18/6 | R6-29, M §6.2 | «dal 18 giugno» al posto di «dal 06-18»; il motivo si legge senza aprire niente; stesso testo nella pagina del quartiere | `01-citta-metro` (data grezza) |
| C2 | **Stessa condizione, stesse parole ovunque**: un luogo con «dopo aver letto …» visto in metro, pagina del quartiere, pagina del luogo, popup del pin, «Luoghi qui», Libri | R6-29 | testo identico parola per parola in ogni vista; nessuna vista che dica «Bloccato» senza il perché | `02-quartiere-odaiba`, `04-libri`, `11-mappa-tokyo-oggi` |
| C3 | **Esito rosso con «Manca: …»**: un posto con condizione in OR (Confidente al rango N **oppure** un libro) non soddisfatta | M §6.2 | «Manca: Ann al rango 10 oppure leggere «Luoghi della movida»» leggibile a 375 senza troncamenti; «oppure» e «e» si distinguono | — |
| C4 | **«Avviso: …» distinto da «Bloccato»**; «Disponibile dall'inizio»; «Fonte: guida, certezza media — da verificare» (Maihama) | M §6.2, §9.5 | i tre stati si distinguono a colpo d'occhio, non solo per colore; la fonte incerta si capisce come «da controllare», non come errore | `03-quartiere-asakusa` |
| C5 | **Editor delle condizioni dal tablet** (pin, quartiere «Modifica sblocco», catalogo): scegli il tipo → cerca l'oggetto per nome → anteprima dell'esito → salva (dati di prova) | R6-30, M §6.1 | tocchi per una condizione semplice e per un OR; la ricerca trova per nome italiano (mai chiavi a vista); l'anteprima dice l'esito sulla partita corrente; su telefono foglio dal basso; «Ripristina» al valore della guida chiaro; niente tipo «manuale» | `12-editor-pin-condizioni` |
| C6 | **Inviti in sola lettura nell'editor**: condizione di Harajuku | M §1 | l'invito si vede come riga non modificabile con il link al Confidente; si capisce **dove** si cambia | — |
| C7 | **«Invito avvenuto»** dalla pagina del Confidente, del quartiere (Harajuku) e del luogo (Planetario), partita di prova | M §1, piano F3 | un tocco; «Annulla» visibile; con condizioni false il pulsante è disattivato con «Non ancora possibile: manca …» (Makoto 30/7 senza Futaba concluso, Ryuji 29/5 prima della fine di Madarame); il posto si apre subito dopo il gesto | — (nuovo) |
| C8 | **Editor dei requisiti del Confidente** dal tablet («Modifica requisiti», un rango per riga, «Ripristina»), dati di prova | R6-30, piano F4 | si capisce quale rango si modifica; Richieste rinominate o eliminate dette chiaramente; il ripristino si vede | `05-confidente-takemi`, `09-richieste` |
| C9 | **Sblocco con la fonte** nella pagina del quartiere e data di sblocco del Confidente (Takemi) | M §4, piano F5 | «Sblocco: …» + «Fonte: …» in cima, non sepolti; la data del Confidente è descritta dal requisito del rango 1 | `02-quartiere-odaiba`, `05-confidente-takemi` |
| C10 | **Libri: «Apre» calcolato** | piano F5 | «Apre: …» in italiano con le stesse parole di C2 | `04-libri` |
| C11 | **Palazzi in metro e nel diario**: finestra di Madarame | M §4.4, R6-25 | stesse date nelle due viste, in italiano | `08-palazzo-madarame-date` |
| C12 | **Nessun impoverimento**: calendario, pagina della partita | — | nulla di ciò che si leggeva prima sparisce senza sostituto | `07-calendario`, `10-partita` |

## Quando si prova cosa (piano.md «Per i tester»)
| Pezzo pronto | Casi UX | Note |
|---|---|---|
| B0 + F1 (editor unico) | C5 (lettura e gesti senza salvare), C6 | sulla base p5s in sola lettura; i salvataggi al pezzo con i dati di prova |
| B1 + F2 (valutatore unico) | C1, C2, C3 | anteprima dell'esito di C5 |
| B3 + F3 (inviti) | C7 | solo sul Collaudo, **partita di prova**, con foto e ripristino |
| B4 + F4 (editor dei requisiti) | C8 | solo sul Collaudo, dati di prova |
| B5 + F5 (metro, città, libri, Confidente) | C1 date, C9, C10, C11 | sola lettura |
| B6 + F6 (rifinitura) | C4 e tutto il M §8.4 in un giro finale | 375/768/1280, 1366×657, 1280×689 |

Dati: le prove si fanno sull'istanza con la base di p5s (`dati-produzione/p5s-2026-10-20-0503Z`, impronta `ff3033cb…`), verificata con i conteggi
esatti prima di partire. Le scritture (C5 salvataggi, C7, C8) si fanno solo sul Collaudo. Si chiede la foto, si aspetta «foto fatta» e a fine
ciclo si comunica l'ora esatta. La partita di prova serve per C7: Futaba **non** concluso e Imperatore rango 1, poi Futaba concluso. Mai la
partita dell'utente.

## Esiti
(pezzo per pezzo, appena BE/FE segnalano un pezzo pronto)
