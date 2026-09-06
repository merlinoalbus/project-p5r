# Pulizia dei nomi di radici già identificate

Proposta read-only sul DB reale3103. Tutti i nomi iniziali sono letti dal database; nessuna modifica applicata.

|Elemento|Prima esatto|Dopo proposto|Fonte IT|
|---|---|---|---|
|citta-shujin-academy|Shujin Academy (scuola)|Shujin Academy|FLDPLACENAME 2 offset 2372|
|dungeon-madarame|Palazzo di Madarame (Museo)|Palazzo di Madarame|FLDPLACENAME 290 offset 9108|
|dungeon-futaba|Palazzo di Futaba (Piramide dell'Ira / Pyramid of Wrath)|Palazzo di Futaba|FLDPLACENAME 329 offset 10132|
|dungeon-niijima|Palazzo di Niijima (Sae) — Casinò|Palazzo di Niijima|FLDPLACENAME 365 offset 11252|
|dungeon-mementos|Mementos (i Dedali)|Memento|FLDPLACENAME 470 offset 14388|
|yongen-java-banchina-della-metropolitana|Yongen-Java - Banchina della metropolitana|Yongen-Jaya - Banchina della metropolitana|FLDPLACENAME 3 offset 2404|
|376|Yongen-Java Banchina della metropolitana|Yongen-Jaya Banchina della metropolitana|FLDPLACENAME 3 offset 2404|
|377|Yongen-Java Banchina della metropolitana|Yongen-Jaya Banchina della metropolitana|FLDPLACENAME 3 offset 2404|
|392|Yongen-Java Vicoli|Yongen-Jaya Vicoli|FLDPLACENAME 3 offset 2404|
|393|Yongen-Java Vicoli|Yongen-Jaya Vicoli|FLDPLACENAME 3 offset 2404|
|citta-yokohama-chinatown|Chinatown (Yokohama)|Chinatown|FLDPLACENAME 107 offset 4708|
|citta-suidobashi|Suidobashi (Dome Town)|Suidobashi|FLDPLACENAME 104 offset 4660|
|citta-mementos|Mementos (ingresso)|Entrata dei Memento|FLDPLACENAME 466 offset 14292|

Shujin Academy resta il titolo nativo anche nel pacchetto italiano: non viene tradotto arbitrariamente in Liceo Shujin. Memento è il titolo italiano esatto del record470; Mementos e la glossa «i Dedali» sono rimossi solo dal nome display proposto.

Censite tutte le 38 radici/città; classificazione completa nel JSON. Kanda/Jinbocho, Odaiba/Seaside e gruppo150 restano esclusi. Anche Chinatown(Yokohama), Suidobashi(Dome Town), Mementos(ingresso) hanno proposte di solo testo: rispettivamente Chinatown (record107), Suidobashi (104), Entrata dei Memento (466). L’ingresso rimane distinto dalla radice Memento; nessun accorpamento di luoghi.

Per Yongen-Java correggere solo testo visibile: chiavi URL, ID spillo, riferimenti e seed_identita_json restano stabili. I quattro spilli376/377/392/393 sono censiti come correzioni ortografiche distinte, senza deduplicarli.

Quando approvata, la pulizia va riportata anche nelle fonti seed dei nomi interessati: lasciare il vecchio nome nel catalogo può farlo riapparire al reseed. Le sezioni Città, Palazzi e Dedali, negozi e contenuti restano tutte presenti. Nessuna nuova associazione geografica, nessuna connessione o variante dedotta.
