# «Pagine ammuffite» alla Taiheido: la data nel Royal (2026-10-24)

Richiesta del PM, dopo la 208. Sola lettura, nessun commit. Dati: copia di p5s migrata fino alla 210.

## 1. In breve

- **Il Royal dice 1° settembre** (Samurai Gamers: «Musty Pages», 1.800 ¥, «Unlocks Jinbocho», disponibile il **9/1**) **e la mette nella libreria di Shibuya**, cioè la Taiheido. La guida italiana dice 1/9 nella pagina Libri e Taiheido nell'elenco dei negozi: sulla **data** guida e Royal concordano.
- **L'articolo della Taiheido ha una condizione sola, `dal 18/4`, che è la data del negozio.** Negli altri 15 articoli della Taiheido le condizioni contengono sempre la data del proprio libro: i 12 con una data propria (da maggio a ottobre) hanno `dal 18/4` **più** quella data; i 3 disponibili dall'inizio hanno solo `dal 18/4`, che è anche la data del loro libro. Pagine ammuffite è l'**unico** il cui libro (`libro/pagine-ammuffite`, `dal 09-01`) ha una data che l'articolo non porta.
- **Correzione proposta:** `condizioni_json` dell'articolo `libreria-taiheido/pagine-ammuffite` da `[dal 04-18]` a `[dal 04-18, dal 09-01]`, come i 12 articoli con data propria. Nessuna perdita: il 18/4 resta (negozio).

## 2. Che cosa dice il Royal

| Fonte | Indirizzo | Che cosa dice |
|---|---|---|
| Samurai Gamers, guida ai libri | `https://samurai-gamers.com/persona-5/book-locations-effects/` | Tabella «Shibuya Bookstore»: «Musty Pages», 1800 ¥, 1 capitolo, effetto «Unlocks “Jinbocho”», **9/1**. Nella stessa tabella: Vague 5/18, Nightlife Hotspots 6/1, Aquarium-a-Day 7/17, Fishpond Spotter 8/3, Museum of Stars 9/1, Tokyo Shrines 9/1, Nakano Walker 10/1 |
| Samurai Gamers, Hinokuniya | stessa pagina | «Shinjuku Hinokokuya Bookstore»: **solo libri da 2.800 ¥ con una condizione di attività** (Flowerpedia, Batting Science, Essence of Fishing, Craft of Cinema, Game Secrets, Pro Darts, ABCs of Crafting). «Musty Pages» **non compare** |
| ACE | `https://aqiu384.github.io/megaten-database/p5r/ace-walkthrough.html` | Nessuna voce «Musty Pages»; Jinbocho si apre l'**8/16** con «Star Rank 4 (Jinbocho Location unlocked)» (dato del riassunto, non verbatim). Acquisti a Shinjuku: 6/21 (tre libri da 2.800 ¥) e 10/16 |

Che cosa ne segue:
1. **Data:** 1/9 (Royal e guida).
2. **Negozio:** il Royal è per **Shibuya (Taiheido)**, non per Hinokuniya: contraddice la pagina Libri della guida, come già annotato nella 208. L'utente ha deciso di **tenere entrambi** gli articoli: questo giro non cambia quella decisione.
3. **Jinbocho** ha due vie nel Royal: il libro (9/1, SG) oppure l'amicizia con Hifumi a rango 4 (ACE, 16/8). Le due fonti **discordano sulla data della seconda via**; il database ha già il libro con `sblocca-luogo kanda-jinbocho`.

## 3. Correzione proposta

| Che cosa | Prima | Dopo |
|---|---|---|
| `articolo` `libreria-taiheido/pagine-ammuffite`, `condizioni_json` | `[{"tipo":"data","dal":"04-18"}]` | `[{"tipo":"data","dal":"04-18"},{"tipo":"data","dal":"09-01"}]` |

Guardie per BE: l'articolo esiste con `negozio_chiave='libreria-taiheido'`, `oggetto_chiave='pagine-ammuffite'`, condizione attuale uguale a quella di partenza; nessun acquisto di p1 e p2 per quell'articolo (da verificare: se ce ne fosse uno prima del 1/9 non si tocca e si chiede). L'articolo di Hinokuniya (`quartiere shinjuku` + `dal 09-01`) **non cambia**. La nota storica della 208 resta vera.

## 4. A margine (non richiesto; solo SG, certezza media)

Su altri articoli della Taiheido SG ha prezzi diversi: «Un acquario al giorno» 2.000 ¥ nel database contro **700 ¥** di SG; «Esplorando Nakano» 2.000 ¥ contro **1.800 ¥**. Le due condizioni `dal 11-25` di «Il pensiero sociale» ed «Esplorando Yoncha 4» (con `non mansarda-pulita`) non hanno riscontro in SG. Non ho verificato altro: sono candidati a un giro di prezzi dei libri, non una correzione.

## 5. Limiti

- SG chiama il negozio «Shibuya Bookstore» e non lo identifica con la Taiheido: l'identificazione è mia (stessa zona, stessa Central Street della guida italiana) e non dichiarata dalla fonte.
- Non ho trovato fonti Royal che diano una data di apertura della libreria: il `dal 18/4` del negozio non è verificato con il Royal.
