# L'invito di Makoto a Ikebukuro: la data nelle fonti Royal (2026-10-24)

Richiesta dell'utente, passata dal PM: «Cerca la data Royal». Sola lettura, nessun commit. Voce: `931d1e209d7aafcdb686bbca57676087` (30/7). Dati: copia di p5s con le migrazioni fino alla 199; codice HEAD `db3912ea`.

## 1. In breve

- **Nessuna fonte Royal dà una data per l'invito dopo il completamento del Palazzo di Futaba.** L'invito di Makoto a Ikebukuro compare **una sola volta, il 30/7**, nei dati di gioco (ACE), e non ricompare in nessuna riga fino all'8/11.
- **Proposta:** spostare la voce al **4/8, di giorno**, il primo giorno utile dopo il 3/8 sul percorso del Diario. È una **deduzione, non una data di una fonte**: certezza **bassa**.
- Il 4/8 **non coincide con nessuna altra voce**: il giorno non ha voci. Anche il 5/8 e il 7/8 sono vuoti.

## 2. Che cosa dicono le fonti

| Fonte | Indirizzo | Che cosa dice |
|---|---|---|
| **ACE** (dati estratti dal gioco; riga per riga fino al 28/11 letta verbatim) | `https://aqiu384.github.io/megaten-database/p5r/ace-walkthrough.html` | **7/30, sabato, giorno:** «Priestess Invite Ikebukuro (Ikebukuro Location unlocked)», richiede «Pyramid Palace completion» e «Emperor Rank 1». **Nessun'altra riga «Priestess Invite Ikebukuro»** fino al 28/11. Completamento del Palazzo di Futaba nello stesso dato: 7/26 «Reach treasure» e 7/27 «Take treasure». Le sole altre righe di Makoto dopo il 7/27: 7/28 sera invito al cinema, 8/5 rango 3, 8/11 rango 4, 8/13 rango 5, **8/15 «Priestess Invite Jinbocho» (opzionale, richiede il Palazzo completato e Stella rango 1)**, 8/16 rango 6, 8/18 rango 7, 8/20 rango 8 |
| **Samurai Gamers**, walkthrough di luglio e agosto | `https://samurai-gamers.com/persona-5/p5r-july-walkthrough/`, `…/p5r-august-walkthrough/` | Nessuna voce su Makoto, Priestess, Ikebukuro o Planetario fra il 25/7 e il 31/7. In agosto solo **8/14 sera «Decline Makoto's invitation»** (una riga nuda, senza luogo né condizioni), più i ranghi (8/11, 8/16, 8/18). Completamento: 7/27 boss, 8/22 trofeo «Pyramid of Wrath Plundered» |
| **Samurai Gamers**, pagina di Makoto e lista dei Confidenti | `https://samurai-gamers.com/persona-5/priestess-makoto-nijima/`, `…/confidants-list-schedule-guide/` | Nessuna menzione di Ikebukuro, del Planetario o dell'invito (la lista dice solo che Makoto si sblocca il 25/6) |
| **Samurai Gamers**, lista dei luoghi di ritrovo | `https://samurai-gamers.com/persona-5/hangout-spots-list/` | Ikebukuro si sblocca con il libro «Museum of Stars» **oppure con l'invito di Mishima del 28/7**. Non nomina Makoto |

Il registro dell'Esperto (G-028 A) cita la stessa riga ACE del 30/7, con le stesse due condizioni.

**Che cosa ne segue.**
1. Il solo dato di gioco che datà l'invito è il **30/7**. Quella data è nel percorso ACE (Palazzo completato il 27/7); sul percorso del Diario il Palazzo si completa il 3/8 (`dungeon.futaba`: voce `c9efdb83` del 3/8), quindi lo stesso invito non può arrivare prima del 4/8.
2. Nessuna fonte dice se, saltato il 30/7, l'invito si ripresenta e quando. **ACE non lo mostra mai più**; ma ACE è un percorso, e non un elenco di tutte le occasioni.
3. Ikebukuro ha altre vie (libro, invito di Mishima del 28/7 per Samurai Gamers). L'app tiene già Ikebukuro con più vie alternative («oppure», decisione dell'utente su O-1…O-7), quindi l'invito di Makoto non è l'unico modo di aprirlo.

## 3. Proposta di spostamento

**Spostare la voce al 4/8, fascia giorno.** Certezza **bassa**: nessuna fonte datata, solo il vincolo «dopo il completamento» più la regola «il primo giorno utile». In particolare:
- il Palazzo di Futaba si completa il **3/8** (G-028, AGS sett. 17: la voce del 3/8 «Camera della vacuità»); il 4/8 è il giorno dopo;
- le condizioni del Confidente restano vere (Palazzo concluso e Imperatore a rango 1: Yusuke ha il requisito di rango 1 dal 18/6);
- il giorno **4/8 non ha nessuna voce** nel Diario, né di giorno né di sera; **il 5/8 e il 7/8 sono anch'essi vuoti**; il 2/8 ha una voce segnaposto («Nessuna azione specifica riportata dalla fonte») e il 3/8 ha la sola voce del Palazzo;
- il 4/8 non ha altre voci di Confidenti né di Makoto (le sole voci di Makoto sono il 26/7 e il 20/8) e non incrocia il 6/8 (invito di Ann al Santuario Meiji).

**Alternativa A, 5/8:** il giorno in cui ACE mette il rango 3 di Makoto (una uscita, non un invito): anche vuoto nel Diario, ma lega l'invito a un'altra uscita senza che la fonte lo dica. Meno prudente.
**Alternativa B, lasciare il 30/7:** la voce resta com'è, con la condizione scritta e il segno «da rivedere» (strada (a)); è lo stato di oggi.
**Alternativa C, strada (b):** togliere la voce e lasciare l'evento (`confidente_invito`) con le condizioni, che si registra con il gesto diretto se accade.

## 4. Che cosa va cambiato se si sceglie il 4/8 (per BE)

- `voce_giornata` `931d1e20…`: `data` 07-30 → 08-04, `fascia` giorno, `ordine` 0 (il giorno è vuoto). Testo: tolta la parte «in alternativa a «Confidente Ann: preparazione per il prossimo avanzamento»», che si riferisce alla voce di Ann del 30/7 e il 4/8 non ha alternativa; resta «Invito di Makoto: uscita al Planetario di Ikebukuro — solo se il Palazzo di Futaba è già completato». La nota («Apre il Planetario di Ikebukuro. Serve il Palazzo di Futaba concluso e Imperatore a rango 1») resta.
- `confidente_invito` `makoto/07-30`: la `data` va a 08-04. **La chiave `makoto/07-30` contiene la vecchia data:** o si tiene la chiave (le condizioni dei luoghi e l'effetto `invito` della voce la citano, e non cambia nessuna partita) e si cambia solo `data`, oppure si rinomina in `makoto/08-04` con tutti i riferimenti (`voce_effetto`, condizioni di `ikebukuro/planetario-ikebukuro`, `invito_partita`): su p1 e p2 non c'è nessuna riga, ma il rischio è alto per una partita futura. Propongo di **tenere la chiave**.
- `nota` dell'invito: da «da rivedere: nel diario la piramide si conclude il 3 agosto» a una nota che dice che l'invito, nel Diario, si fa dopo il completamento (4/8) e che il 30/7 è la data del percorso ACE.
- Il segno `da_rivedere` e il motivo della voce: se la data nuova è accettata, il motivo («Sul percorso della guida la piramide si completa il 3/8: il 30/7 Makoto non invita») non vale più e il segno si può togliere con M-A; se l'utente vuole tenere traccia dell'incertezza, il segno resta con un motivo nuovo («data dedotta: nessuna fonte Royal»).
- Un controllo: nessuna spunta su p1 o p2 (verificato) e nessuna voce collegata a `makoto/07-30` altro che questa.

## 5. Domanda in una riga

«L'invito di Makoto a Ikebukuro passa al 4/8 di giorno, una data dedotta dal completamento del Palazzo del 3/8 e non scritta da nessuna fonte, e il segno “da rivedere” si toglie?»

## 6. Limiti

- ACE (dati di gioco) è verbatim fino al 28/11; Samurai Gamers è per luglio e agosto verbatim ma è un percorso d'autore e discorda con ACE su quasi tutti gli inviti (vedi `M-A-elenco-da-rivedere-2026-10-24.md` §4). Nessuna pagina letta descrive le condizioni con cui il gioco rinvia un invito.
- Non ho riaperto le pagine AllGameStaff.
