# L13 — Censimento del 2026-10-25: dati in testo libero, meccanismi non modellati, UX dei moduli

Fonte: workflow ECC in sola lettura su codice e copia dei dati reali di gioco (cinque analisti più un critico di completezza distinto).
Origine: rilievi dell'utente del 2026-10-25 (modulo «Modifica Richiesta» inguardabile, sblocchi e date in testo libero, Big Bang Burger,
due acquisti nella stessa voce configurati in due punti diversi, nessun effetto che sblocchi una Richiesta).

## Big Bang Burger (verificato sui dati, corretto dal critico)
- Attività `sfida-big-bang-burger`: `effetti_json` vuoto, Doti in `doti_json` come frasi con `note` null, condizione solo al rango 2.
- Tre sfide reali come articoli del negozio (Comet, Gravity, Cosmo Tower: prezzo, rango 2/3/4 di Coraggio, Conoscenza e Perizia insieme);
  vittoria, sconfitta, distintivo e panini solo nel testo `effetto`, copiato identico nel catalogo oggetti. I distintivi non esistono nel catalogo.
- Cinque voci del diario scritte a mano: 05-18 sera (+1 a quattro Doti), 06-04 sera (Coraggio 2), 06-07 sera (Coraggio 2, «non si vince»),
  08-14 (+2 a quattro Doti, l'unica con i valori della vittoria), 08-15 (nessun effetto). Il prezzo serale di 500 yen è coerente con la fascia.
- Giudizio: non è il modo giusto. La stessa meccanica vive in più punti in prosa; la spunta applica valori fissi scritti voce per voce; il
  giocatore non può dire quale sfida ha affrontato né l'esito.

## Dati in testo libero (26 voci; 7 alte)
Alte: attività con Doti in prosa (22 su 30; 12 senza effetti); Richieste (33 righe: disponibilità, scadenza, ricompense in testo);
effetto degli oggetti (879 righe di catalogo, 431 di articoli; `effetto_json` mai popolato); disponibilità dei Confidenti in prosa che
diverge dai requisiti strutturati (23 righe); voci del diario con Doti, premi e acquisti solo nel testo (circa 27 e 25); Big Bang Burger (2 voci).
Medie e basse: dialoghi di rango, Persona condizionate, Palazzi (date in prosa accanto alla finestra strutturata), avvisi del calendario,
regali (costo in testo), catalogo oggetti (dove/da quando/prezzo), luoghi e negozi, libri, film, domande, premi degli esami, trofei, blocchi
della guida, inviti, abilità sociali, riferimenti per nome invece che per chiave, sintesi settimanale.

## Meccanismi non modellati (11 voci; 5 alte)
Esito vittoria/sconfitta e risultato variabile delle attività; Richieste dei Mementos (apertura, scadenza, stato; nessun effetto che le sblocca);
Palazzi con due fonti per apertura e scadenza; yen dei lavori e delle attività che non si muovono; ricompense di domande ed esami in testo;
regali con costo ed effetto in testo. Il critico aggiunge: 92 voci di tipo attività senza riferimento all'attività.

## UX dei moduli e delle pagine (27 voci; 9 alte)
ModuloRichiesta inguardabile e con testo libero dove servono scelte; date di gioco digitate a mano in quattro moduli (esiste `SelettoreData`);
quattro stili di etichetta e tre altezze di campo; textarea «una per riga»; azioni nel corpo che scorre; ModuloAttivita sovraccarico;
moduli di oggetti, luoghi e negozi con campi in testo che hanno un selettore altrove; tre moduli diversi per creare un luogo; testo troncato;
scroll annidati. Modelli comuni proposti: un solo campo, data di gioco, scelta da catalogo con icone, elenco di elementi, finestra di modifica.
Da aggiungere (utente): nel modulo della voce gli effetti dello stesso tipo stanno in due punti diversi e il riepilogo ne mostra uno solo.

## Lacune dichiarate dal critico (da coprire nel secondo giro)
`partite.db` non aperto (spunte, turni, da applicare); 28 effetti `turno` non analizzati; tabelle del registro di pesca e sala giochi;
pagine Partita e Diario non lette; nessuna misura a schermo a 1280/768/375; nome della terza sfida (Cosmo Town o Cosmo Tower) da verificare.
