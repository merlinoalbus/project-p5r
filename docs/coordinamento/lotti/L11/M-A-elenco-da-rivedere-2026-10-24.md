# R11-10c/1, M-A — l'elenco definitivo delle voci «da rivedere» dopo il 06-01 (2026-10-24)

Sola lettura, nessun commit. Dati: copia di p5s `p5s-2026-10-23-1935Z` con tutte le migrazioni committate fino alla **199** (gioco) e **043** (utente), nello scratchpad. Codice: HEAD `12ff28e9`.

## 0. In breve

- Sui dati di HEAD le voci con `da_rivedere = 1` sono **15**, tutte dopo il 06-01 (prima del 06-01: 0). Sono **7 voci di Palazzo** e **8 voci d'invito** (le 8 aggiunte dal team con la migrazione 149; con la 06-26 sono le 9 `aggiunta_da = 'team'`).
- **Segno rimovibile adesso: 12** (5 Palazzi e 7 inviti). **Dopo la correzione di testo: 2** (11-14 e 11-19; la correzione è decisa e passata a BE, ma non è ancora nei dati). **Resta senza la fonte che lo scioglie: 1** (l'invito di Makoto del 30/7).
- La voce del 13/11 sera non c'è più nell'elenco: la migrazione 196 (`4bf50678`) l'ha riscritta e ha messo `da_rivedere = 0`. Le voci toccate da M-C (Lavenza ×4, Ustione, 10-15, 10-31, 06-05) non avevano il segno.
- Sulle 15 voci non c'è nessuna spunta in p1 o p2.

## 1. L'elenco

Legenda dell'esito: **TOGLI** = segno rimovibile con la fonte indicata; **DOPO** = si toglie solo quando il testo è quello corretto; **RESTA** = nessuna fonte lo scioglie. «G-022» e «G-028» sono i registri dell'Esperto della guida (`docs/coordinamento/guida/registro.md`). Il «dato di gioco» Royal è il walkthrough dei dati estratti dal gioco (`aqiu384.github.io/megaten-database/p5r/ace-walkthrough.html`, «ACE»); «SG» = Samurai Gamers.

| # | uid (completo) | Voce | Fonte che la scioglie | Royal | Correzione già decisa | Esito |
|---|---|---|---|---|---|---|
| 1 | `65fdbeab5101e6068310fea982553d22` | 06-20 giorno, Kaneshiro: prima esplorazione | G-022 B1 (AGS sett. 11; certezza **media**, «con riserva»): il testo ha il nome della guida «Cerca il boss della mala» | SG: il 20/6 «Bank of Gluttony – 1st Infiltration» (sala di ricevimento, montagna di soldi, Oni, Sui-Ki). **La composizione del gruppo (Skull, Mona, Fox; Panther a casa) non è nominata da nessuna fonte Royal** | nessuna | **TOGLI** (data e contenuto Royal; il gruppo resta dell'AGS) |
| 2 | `8c58ad986d8176c681c76ed93d2d3fe5` | 06-26 giorno, invio della lettera di sfida a Kaneshiro (voce nuova, `aggiunta_da = team`) | G-028 B: AGS sett. 11, «26 GIUGNO», «Invia lettera di sfida», «Ryuji e Makoto se ne stanno occupando» · ok | SG: il biglietto si manda il 23/6 dopo scuola; ACE il 24/6. Sono i calendari d'autore (la lettera si può mandare in un giorno qualsiasi fino alla scadenza) | nessuna | **TOGLI** (ok G-028; il 23/6 e il 24/6 sono altre scelte di percorso) |
| 3 | `5812540b65b8999bb517acfcf31e2241` | 07-02 sera, messaggio di Ryuji | G-028 A: AGS sett. 12, 2/7: il messaggio a letto; la guida fa rifiutare · ok | SG: il 2/7 sera accetta l'invito di Ryuji; ACE non ha una voce il 2/7 | nessuna | **TOGLI** |
| 4 | `9f3faa2a77fae8a2fee5aa0c46a21600` | 07-03 giorno, invito di Ryuji a Ichigaya | G-028 A · ok (alternativa all'uscita con Ann); condizioni: Palazzo della banca completato (27/6) e Temperanza rango 1 (8/6), ✓ sul percorso | ACE: «Chariot Invite Ichigaya», 3/7, «Bank Palace completion» e «Temperance Rank 1»; SG mette l'unlock di Ichigaya il 2/7 | nessuna | **TOGLI** |
| 5 | `8665ae2121ab058f16fea126c27fccc3` | 07-28 sera, messaggio di Akechi | G-028 A · ok (AGS sett. 16, 28/7) | SG: il 28/7 accetta l'invito di Akechi (servono le Persona Giustizia e Diavolo); ACE dà l'invito il 29/7 | nessuna | **TOGLI** |
| 6 | `ff984b684560c4881fb3ec9c9f8f71cc` | 07-29 giorno, invito di Akechi all'acquario di Shinagawa | G-028 A · ok; condizione: Diavolo rango 1 (Ohya 5/7), ✓ | ACE: «Justice Invite Shinagawa», 29/7, «Devil Rank 1». Nessuna fonte Royal nomina l'acquario | nessuna | **TOGLI** |
| 7 | `931d1e209d7aafcdb686bbca57676087` | 07-30 giorno, invito di Makoto a Ikebukuro | G-028 A, **errore 1**: l'invito è condizionato al Palazzo di Futaba **già completato**; sul percorso del diario si completa il 3/8, quindi il 30/7 non arriva | ACE: «Priestess Invite Ikebukuro», 30/7, «Pyramid Palace completion required» e «Emperor Rank 1»; SG non ha un invito il 30/7 (sblocco di Ikebukuro con il libro «Night Skies», 5/11) | strada (a) applicata (D10): la voce resta con la condizione scritta e il motivo «Sul percorso della guida la piramide si completa il 3/8: il 30/7 Makoto non invita (G-028)» | **RESTA** (vedi §3) |
| 8 | `c9efdb83a3eeb29a6ceea9a6f6cc2ea2` | 08-03 giorno, Futaba (F4) | G-028 B, errore 2: il testo usa il nome della guida «Camera della vacuità» (AGS sett. 17, «3 AGOSTO»). Verificato: il testo di HEAD è già «Palazzo di Futaba: esplorazione della Camera della vacuità…» (migrazione 148) | SG e ACE: il Palazzo di Futaba si completa il 27/7 nel loro percorso; nessuna pagina letta ha «Camera della vacuità» (il nome è dell'AGS). Il 3/8 è del percorso AGS | testo già corretto | **TOGLI** |
| 9 | `3dae597a78761d7e296e969ce0d089ef` | 08-06 giorno, invito di Ann al Santuario Meiji | G-028 A · ok; condizioni: piramide completata (3/8) e Morte rango 1 (18/4), ✓ | ACE: «Lovers Invite Meiji-Shrine», 6/8, «Pyramid Palace completion» e «Death Rank 1»; SG: nessun invito di Ann il 6/8, lo sblocco è con il libro «Tokyo Shrines» (10/11) | nessuna | **TOGLI** |
| 10 | `4360652c7b720e0a839f66015291b6f8` | 10-08 sera, messaggio di Futaba | G-028 A · ok (AGS sett. 25, 8/10; letto in sintesi) | ACE e SG non hanno un messaggio il 8/10 | nessuna | **TOGLI** (fonte solo AGS) |
| 11 | `81e253c5f0b988a835295914b2a4cf98` | 10-09 giorno, invito di Futaba a Nakano | G-028 A · ok; condizione: Appeso rango 1 (Iwai 15/8), ✓ | ACE: «Hermit Invite Nakano», 9/10, «Hanged Rank 1»; SG mette lo sblocco di Nakano con il libro «A Walk Down Nakano Street» (5/11) | nessuna | **TOGLI** |
| 12 | `7dd92df212b81bb87aba6e7a2fa8c874` | 10-29 giorno, Niijima: ingresso iniziale nel Casino | G-022 N1 (alta); G-028 B · ok | SG 29/10: «Casino of Envy – 1st Infiltration», Crow con Robin Hood, mini-boss Ose (la guida Royal lo chiama «Cruel Leopard (Ose)», come il testo «Leopardo crudele (Ose)») | nessuna | **TOGLI** |
| 13 | `dece90bfb20d9d3328f2a6b0ca417590` | 11-14 giorno, Niijima: Lobby del Piano Puntate Alte… Direzione | G-022 N2 (alta; ✎ già corretta); G-028 B · ok. Ordine delle aree conforme alla guida Royal | Royal inglese: l'Arena richiede 10.000 gettoni (il testo dice 100.000); i nomi «Sovrano degli Apostati», «Re dei Serpenti» e «Ponte della Giustizia» non compaiono | **decisa dal PM:** prevale il Royal, l'Arena passa a **10.000 gettoni** con nota della differenza; **non ancora nei dati** (il testo di HEAD ha ancora «100.000 monete») | **DOPO** la correzione di BE |
| 14 | `589d82e823703ee879d72f974fd51139` | 11-19 giorno, Niijima: battaglia finale | G-022 N3 (certezza **media**, letta in sintesi); G-028 B · ok | Royal inglese: un solo boss, Shadow Niijima (Leviathan), con la fase della roulette; **nessuna pagina nomina Moloch né Kasumi**; due pin italiani (Fase 1 «Ombra di Sae», Fase 2 «Sae Niijima Leviathan») | **decisa:** togliere «Moloch (debole al Ghiaccio) e battaglia finale con Kasumi»; testo: «Palazzo di Sae Niijima: battaglia contro l'Ombra di Sae (fase della roulette truccata), poi Sae Leviathan (a ogni turno la roulette assegna un elemento: attacca con quello opposto)»; **non ancora nei dati** | **DOPO** la correzione di BE |
| 15 | `527cf9832e94e93e855436191e06f8b6` | 11-24 giorno, Shido (S1) | G-022 S1 (alta; sett. 32); G-028 B | SG 24/11: «Shido Palace – First Infiltration» («Reach the Chamber Doorway»); fra i nemici Cerbero (Cerberus), Narciso, Saravasti, Dakini. Le aree «Ponte Anteriore, Sala d'ingresso, Corridoio centrale» e i tesori non sono nominati dalla pagina (nome «Ponte anteriore» è dell'AGS) | nessuna | **TOGLI** |

### 1.1 Come si toglie il segno (per BE)

- Migrazione «M-A»: per ciascun uid dell'elenco `UPDATE voce_giornata SET da_rivedere = 0`, con guardie: la voce esiste, `da_rivedere = 1`, la data attesa è quella della tabella e (per le voci d'invito) `aggiunta_da = 'team'`; una voce già cambiata dall'utente si salta senza errore.
- **Non si toccano:** `aggiunta_da` (la provenienza), `testo_precedente_json` e `motivo_revisione` (l'archivio che «Rimetti il precedente» legge), testo, ordine, data, fascia, uid, effetti, legami e spunte.
- Per le righe 13 e 14 la guardia aggiuntiva è il testo: il segno si toglie solo se `azione` è quella corretta (la migrazione di BE sul testo viene prima di M-A, oppure nella stessa migrazione, in quest'ordine).
- Audit in `dati_guida` (`da-rivedere-chiuse-NNN`) con uid e valore di prima. Controllo finale: `da_rivedere = 1` deve restare solo la riga 7 (Makoto 30/7) se resta (§3), 0 altrimenti; 255 voci del Diario 04-01..06-01 con impronta identica; nessuna spunta cambia.

## 2. Che cosa è già stato fatto e non è più nell'elenco

| Voce | Esito |
|---|---|
| 13/11 sera (`7c081417…`) | riscritta dalla migrazione 196, `da_rivedere = 0` (`4bf50678`) |
| M-C: Lavenza ×4 (`165b8cb3`, `85cce8fc`, `d26ea049`, `5cb911c7`), Ustione (`889aefc1`), 10-15 (`6c8e3422`), 10-31 (`09077817`), 06-05 Hagoromo | applicate (`riferimento_chiave = gemelle`, 08-17 sera, tipo `altro`, 10-31 sera…); non avevano il segno |
| «Hacker» 29/8 | nel Cestino (`9842b394`) |

## 3. Le voci che restano senza fonte che le sciolga

**Una sola: l'invito di Makoto del 30/7 (riga 7).** Non è una voce senza fonte: la fonte (G-028 e il dato di gioco ACE) dice che l'invito esiste ma **non può arrivare il 30/7 sul percorso del diario**, perché richiede il Palazzo di Futaba completato (sul percorso della guida si completa il 3/8). La strada (a) già applicata lascia la voce con la condizione scritta e il motivo nel campo «da rivedere»: con quella scelta il segno è proprio il modo di ritrovarla. Per questo propongo di **lasciare il segno** a quella voce, e di toglierlo solo se l'utente sceglie la strada (b) (la voce esce dal Diario e resta l'evento con le condizioni, che si registra con il gesto diretto).
**Domanda in una riga per il PM o l'utente:** «L'invito di Makoto del 30/7 resta con il segno “da rivedere” perché sul percorso del diario non può arrivare, oppure togliamo il segno e lasciamo la nota con la condizione?»

**Due voci in attesa della correzione già decisa:** 11-14 e 11-19 (righe 13 e 14): hanno la fonte, ma il testo di HEAD non è ancora quello corretto.

## 4. Contraddizioni fra le fonti Royal da sapere

- Per gli **inviti**, ACE (dati estratti dal gioco) conferma le date del Diario per 07-03, 07-29, 07-30, 08-06 e 10-09; SG (walkthrough d'autore, la sua pagina di luglio dal 25 in poi è solo in sintesi) ha altre date o altri sblocchi (7/2 per Ichigaya; Ikebukuro, Meiji e Nakano con i libri a novembre). Le date dei messaggi del giorno prima (07-02, 07-28, 10-08) vengono solo dall'AGS.
- ACE e SG discordano anche sul completamento dei Palazzi (la banca e la piramide nel loro percorso sono completate prima delle date dell'AGS). È il percorso, non il dato di gioco: il Diario segue la guida italiana.
- Le pagine SG di novembre sono la «Second Edition» sulla versione giapponese; per la piramide e per il 7/25-7/31 il testo SG verificato è parziale.

## 5. Limiti

Non ho eseguito M-A né test. Le fonti Royal sono inglesi e per lo più di un sito; ACE è verbatim solo fino all'8/5 e dopo è una tabella estratta da un modello (le righe di agosto e ottobre sono a confidenza più bassa). «G-022/G-028» sono il registro dell'Esperto e non le ho rilette sull'AGS.
