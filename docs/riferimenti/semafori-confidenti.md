# Semafori dei Confidenti — cosa l'app verifica da sola e cosa resta da confermare a mano

Fonte: `data/seed/confidenti-requisiti.json` (89 ranghi, 118 requisiti). Ogni requisito è un semaforo: verde = soddisfatto, rosso = non ancora, grigio = l'app non può saperlo e chiede la conferma («Condizione soddisfatta»). Un Confidente con almeno un semaforo non verde per il rango successivo è **bloccato**: la carta è grigia, il pulsante «+» del rango e lo sblocco sono disattivati finché i requisiti non sono verdi o confermati.

## Tipi di requisito e come vengono valutati

| Tipo | Quanti | Valutazione |
|---|---|---|
| `dote` | 20 | automatica: rango della Dote nella partita |
| `persona-arcano` | 25 | automatica: una Persona dell'arcano nella scorta della partita |
| `data` | 27 | automatica: giorno corrente della partita (aprile prima di marzo); grigio se il giorno non è impostato |
| `confidente` | 2 | automatica: rango dell'altro Confidente nella partita |
| `palazzo` | 3 | automatica quando il boss del Palazzo è segnato «ottenuto» nella Guida; altrimenti grigio da confermare |
| `richiesta` | 11 | automatica quando la richiesta dei Mementos è completata nella partita; altrimenti grigio da confermare |
| `meteo` | 16 | automatica dal calendario del giorno corrente (pioggia sì/no); grigio se il meteo del giorno non è noto |
| `manuale` | 14 | **sempre grigio**: solo la conferma dell'utente lo rende verde (elenco sotto) |

## Requisiti manuali (non verificabili dall'app)

| Confidente | Rango | Requisito |
|---|---|---|
| Goro Akechi | 7 | non disponibile prima di questa data. |
| Goro Akechi | 8 | Combattimento uno-contro-uno obbligatorio con Akechi (vittoria necessaria per proseguire). |
| Gemelle Custodi (Caroline e Justine) | 1 | Requisito reale: possedere/fondere una Persona che eredita l'abilità specifica indicata per ogni rango (vedi campo abilita/descrizione). |
| Haru Okumura | 2 | Richiede Perizia sufficiente secondo la fonte (livello esatto non specificato). |
| Hifumi Togo | 10 | Richiede la Lettura delle affinita da Chihaya. |
| Kasumi Yoshizawa | 1 | Evento scolastico obbligatorio (giornata di pulizia al parco). |
| Sadayo Kawakami | 3 | Costo 5.000 ¥. |
| Sadayo Kawakami | 6 | Costo 5.000 ¥. |
| Takuto Maruki | 1 | Contenuto ESCLUSIVO Royal: raggiungere il Rango 9 entro il 17/11 è condizione necessaria per accedere al Terzo Semestre e al finale completo del gioco. |
| Takuto Maruki | 7 | Attenzione alla deadline: bisogna raggiungere il Rango 9 entro il 17 novembre. |
| Ichiko Ohya | 6 | Richiede di aver ottenuto la lettura delle affinità per Ohya. |
| Ryuji Sakamoto | 7 | Richiede che Ryuji mandi un messaggio serale in date specifiche (es. maggio 18/20/25/27, giugno 22/29, luglio 1/6/29, agosto 12/17, settembre 21, ottobre 2/7, novembre 2/4/9/11/16/30, dicembre 2/7/9, gennaio 13). |
| Sojiro Sakura | 3 | Richiede di aver preparato caffè almeno una volta (usando il sifone al Leblanc, che dà anche +1 Gentilezza, +1 Fascino e +1 punto legame). |
| Sojiro Sakura | 8 | Richiede di essere usciti dal Palazzo di Okumura, l'abilità 'Massaggio speciale' di Kawakami e una Lettura delle affinità da Chihaya (Fortuna Rango 5, 5.000¥). |

## Requisiti che l'app verifica solo se hai segnato l'evento (altrimenti grigi da confermare)

| Confidente | Rango | Tipo | Requisito |
|---|---|---|---|
| Goro Akechi | 4 | meteo | Non disponibile in caso di pioggia. |
| Chihaya Mifune | 1 | richiesta | Completare la richiesta Memento 'Un fidanzato violento' |
| Chihaya Mifune | 8 | richiesta | 2 ottobre, dopo aver completato la richiesta 'Smascheriamo i ciarlatani'. |
| Futaba Sakura | 8 | richiesta | Prerequisito: aver completato la richiesta Memento 'È una figlia o un buono pasto?'. |
| Hifumi Togo | 4 | meteo | Evento non disponibile in caso di pioggia. |
| Hifumi Togo | 6 | meteo | Evento non disponibile in caso di pioggia. |
| Hifumi Togo | 8 | richiesta | Richiede il completamento della richiesta Memento 'La mamma manager'. |
| Munehisa Iwai | 4 | meteo | Evento non disponibile se piove. |
| Munehisa Iwai | 8 | richiesta | Richiede il completamento della richiesta Memento 'Affari loschi nell'ombra'. |
| Sadayo Kawakami | 9 | richiesta | Richiede il completamento della richiesta Memento 'Le fatiche di una maid in cattedra'. |
| Takuto Maruki | 3 | meteo | Non disponibile nei giorni di pioggia. |
| Yuuki Mishima | 3 | meteo | Luogo: Shinjuku (attivita all'aperto, non disponibile con pioggia). |
| Yuuki Mishima | 7 | meteo | Luogo: Parco di Akihabara Electric Town (attivita all'aperto, non disponibile con pioggia). |
| Yuuki Mishima | 10 | meteo | Luogo: parco (attivita all'aperto, non disponibile con pioggia). |
| Ichiko Ohya | 4 | meteo | Evento non disponibile con pioggia. |
| Ichiko Ohya | 8 | richiesta | Richiede il completamento della richiesta Memento 'Lottare per la libertà di stampa'. |
| Ryuji Sakamoto | 1 | meteo | Gli eventi all'aperto (ranghi 2, 3, 6, 8) non sono disponibili nei giorni di pioggia. |
| Ryuji Sakamoto | 2 | meteo | non disponibile se piove. |
| Ryuji Sakamoto | 3 | palazzo | Richiede il completamento del Palazzo di Kamoshida. |
| Ryuji Sakamoto | 3 | meteo | evento all'aperto, non disponibile con pioggia. |
| Ryuji Sakamoto | 6 | meteo | non disponibile con pioggia. |
| Ryuji Sakamoto | 8 | meteo | Evento nel cortile di Shujin Academy, all'aperto, non disponibile con pioggia. |
| Shinya Oda | 1 | richiesta | Completare la richiesta Memento 'I vincenti non imbrogliano' |
| Shinya Oda | 9 | richiesta | Richiede il completamento della richiesta Memento 'Una madre aggressiva'. |
| Sojiro Sakura | 1 | palazzo | Completare il Palazzo di Kamoshida |
| Sojiro Sakura | 5 | palazzo | Richiede che il Palazzo di Futaba sia scaduto/completato (dopo il 22 agosto) e Persona di Arcana Ierofante. |
| Sojiro Sakura | 9 | richiesta | Richiede di aver completato la richiesta Memento 'Lo zio ingordo' e Persona di Arcana Ierofante. |
| Tae Takemi | 8 | richiesta | Richiede il completamento della richiesta Memento 'Medicina amara'. |
| Yusuke Kitagawa | 4 | meteo | Evento all'aperto: NON disponibile se piove. |
| Yusuke Kitagawa | 6 | meteo | Evento all'aperto: NON disponibile se piove. |

Le conferme manuali si danno dalla carta del Confidente (pulsante «Condizione soddisfatta» accanto al semaforo grigio) e restano salvate per partita (`requisito_partita`).
