# Fabbisogno grafico — quel che manca, scoperto rifacendo le pagine

Registro della **Fase 6.2**. Si riempie strada facendo: ogni pagina rifatta ci scrive le proprie
voci mancanti, invece di fare un censimento a parte alla fine. È la risposta all'osservazione
dell'utente — non si sa quali elementi grafici servono finché le pagine non sono rifatte — quindi
lo si scrive mentre lo si scopre.

**Chi fa cosa:** i prompt li scrive chi ha rifatto la pagina che ne ha bisogno, li verifica
l'altro, e **la generazione è di Codex**. Un prompt sbagliato costa una generazione buttata;
verificarlo costa una lettura.

| stato | significato |
|---|---|
| `da verificare` | il prompt è scritto, l'altro deve leggerlo prima che si generi |
| `pronto` | prompt verificato, Codex può generare |
| `consegnato` | il file è in `public/asset/` e la pagina lo usa |

---

## 1. Shujin Academy — sagoma per la mappa di viaggio

| | |
|---|---|
| **file** | `public/asset/mappe/lmap/tokyo/shujin-academy.png` |
| **misura** | 760 × 620 px |
| **sfondo** | trasparente, **alfa reale** che segue la sagoma (non un rettangolo opaco) |
| **stato** | `da verificare` — prompt di Claude, verifica a Codex |
| **serve a** | `src/components/mappe/MappaTokyo.tsx` |

**Perché serve.** La mappa di viaggio disegna ogni quartiere con la propria sagoma originale,
estratta da `P5_MAPDATA.SPD`. Shujin Academy non ce l'ha, perché nel gioco non è una destinazione
del treno: al suo posto compariva la fotografia del quartiere, che in mezzo a venti sagome in
bianco e nero è una macchia. Per ora Shujin è tolta dalla mappa; con questa sagoma ci torna.

**Il riferimento è già nel repository**, ed è la cosa più importante di questo prompt: prima di
generare, guardare `public/asset/mappe/lmap/tokyo/shibuya.png`, `shinjuku.png`, `akihabara.png` e
`asakusa.png`. La resa deve stare in mezzo a quelle senza distinguersi.

**Prompt**

> Illustrazione di un edificio scolastico giapponese in stile Persona 5 Royal, resa come **sagoma
> nera piatta** su fondo trasparente: nessun grigio, nessuna sfumatura, nessun contorno — solo nero
> pieno, con i dettagli ricavati in **negativo bianco** dentro la massa nera (finestre, vetrate,
> gradini).
>
> Il soggetto: il corpo principale di una scuola superiore giapponese vista **di tre quarti
> dall'alto**, largo e basso, con la lunga facciata a fasce di finestre regolari, l'ingresso
> centrale sporgente con la pensilina, e il cortile davanti. Accanto, più arretrato, il volume più
> alto della palestra. Un albero o due sul davanti, ridotti a massa nera.
>
> Il taglio è **grafico e spigoloso**, da xilografia o da stencil: linee dritte, angoli netti,
> prospettiva forzata e leggermente instabile, come un edificio disegnato di corsa con un
> pennarello grosso. Le finestre non sono un reticolo regolare: sono tacche bianche irregolari,
> alcune piene, alcune vuote.
>
> Nessuna cornice, nessun riquadro, nessuna targa, nessun testo, nessuna scritta giapponese.
> Nessun colore: solo nero e trasparente. Il bianco deve essere trasparente, non bianco pieno —
> l'immagine viene ritagliata sul suo contorno e appoggiata su un fondo rosso.
>
> La sagoma deve occupare quasi tutta la tela, centrata, con un margine minimo.

**Come si verifica quando arriva**

1. l'alfa è reale: `alfaMinima` deve essere 0, e il bianco intorno all'edificio deve essere
   trasparente, non bianco — l'estrattore `lmap_sprites.py` lo controlla per gli originali e lo
   stesso vale qui;
2. messa accanto a `shinjuku.png` e `akihabara.png` alla stessa altezza, non si distingue per
   tratto, peso o densità di nero;
3. nella mappa, con il contorno bianco applicato, la sagoma resta leggibile a 5,5% di larghezza —
   è la misura con cui i cartellini vengono disegnati.

**Quando è consegnata:** rimettere `'shujin-academy'` in `QUARTIERI_TOKYO`
(`src/components/mappe/collocazioneTokyo.ts`) intorno a `x: 40, y: 40`, e rimettere la linea
`Shujin` che la lega ad Aoyama-Itchōme.
