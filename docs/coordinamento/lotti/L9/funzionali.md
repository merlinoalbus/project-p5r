# L9 «Confidenti, attività, calendario» — test funzionali

Stato: **casi preparati** (bozza di Analisi requisiti del 2026-10-20 06:05Z, rivista e completata da Test funzionali lo stesso giorno: rotte di
`modifiche.md` §4 nei passi, F9-34 aggiunto). Il file è di Test funzionali. Esecuzione a pezzi secondo la tabella «Per i tester» di `piano.md`, col
via del Manager.

> **Cifra da allineare in `modifiche.md` §5** (segnalata a Stesura): «voci del diario 996 invariate», mentre la base corrente ne ha **997**
> (diario intero, misura di L5 sulla 0503Z: c'è la voce di Igor del 06-01 sera). F9-29 controlla il validato (255); il totale vale la misura.

- **Fonti**: `requisiti.md` (R9-01…R9-33 con R9-04b, R9-07b, R9-07c; dubbi 1–7), `modifiche.md` (§1 Confidenti, §2 attività, §3 calendario, §4
  API, §5 migrazione M9 con le verifiche, §6 piano), `dati.md`, registro dell'Esperto (G-016a/b/c/d, G-017, G-020, G-023, G-036).
- **Base**: `dati-produzione/p5s-2026-10-20-0533Z`. Misure «prima» in sola lettura su una copia della base (Analisi requisiti, 06:00Z). Gli attesi
  «dopo» vengono da `modifiche.md` §5 e da G-036 e vanno confermati da Analisi dati dopo il boot di L2–L9.
- **Partite**: p1 «Partita Roberto» (attiva, 06-02 giorno), p2 «Tutorial» (04-29). Scritture sulla partita (incontri, piazzamenti, inviti) solo su una
  **partita di prova** creata apposta e poi eliminata; scritture sui dati di gioco (disponibilità, ranghi, dialoghi, attività, giorni) solo sul
  **Collaudo (foto e ripristino), anteprima 3302/5474**.

## Misure «prima» sulla base 0533Z (sola lettura)
| Misura | Valore |
|---|---|
| Confidenti | 23 righe di `confidente_disponibilita`; 162 ranghi, 159 abilità, 223 righe di dialoghi; 34 luoghi con `confidenti_json` |
| disponibilità di oggi (esempi) | Ann: lun/mar/mer/ven/dom, «giorno; anche sera nei giorni di pioggia (secondo fonti inglesi)», «Aula 2-D oppure Centro commerciale…»; Yusuke e Makoto: date di trama al posto dei giorni; Kasumi: vuota, «sera (presunta)»; Kawakami: ven/sab sera, «Leblanc (telefono) e più avanti appartamento/vari luoghi»; Mishima: tutti i giorni di sera; Yoshida: domenica sera; Gemelle: «Sempre accessibile… dopo il completamento» |
| attività | 30; 16 senza effetti strutturati; paga dei 4 lavori: Triple Seven 3.500/7.400, Rafflesia 3.200/7.800, Ore no Beko 3.600/8.800, Crossroads 7.200/12.000 |
| calendario | `giorno_calendario` 346 e `giorno_percorso` 346; **12** giorni con meteo diverso; `evento_calendario` 173 (storia 61, sblocco 46, festa 24, scadenza 18, vacanza 11, esame 8, meteo 4, consiglio 1); 74 allerte meteo; 42 settimane |
| domande ed esami | `domanda` 78, `esame` 4, cruciverba 38 |
| «Junichi Iwai» | 1 in `evento_calendario`, 1 in `settimana_guida` |
| diario | 297 voci con riferimento a un Confidente; 15 con riferimento `igor` |
| partite (p1 / p2) | Confidenti 23/23; incontri 37/15; turni 9/2; attività svolte 6/2; domande 6/6; cruciverba 1/2; Doti 5/5; eventi di storia 4/3; meteo segnato 0/1 |

> **Da allineare in `modifiche.md` prima dei casi su Ann** (segnalato a Stesura): §1.1 riga 22 e la tabella di G-036 (riga 49) danno ad Ann
> «in più la sera con la pioggia». G-036 dice di **togliere** «anche sera con la pioggia», perché non è nella guida: Ann è solo di giorno, e i ranghi
> 3, 4, 5, 7, 9 e 10 non si fanno con la pioggia. Inoltre le voci di Lavenza/Gemelle legate a `igor` sono **4** per G-036 (06-08, 09-06, 11-06,
> 01-11), non 3, e nel §5 Kasumi è ancora «da completare», mentre il §1.1 la dà come `su-messaggio`. I casi qui sotto seguono G-036.

## Casi
| id | Criterio | Dove | Passi | Atteso |
|---|---|---|---|---|
| F9-01 | R9-01 | API, sola lettura | `GET /api/compendio/confidenti` (elenco con «oggi») e `GET /api/compendio/confidenti/:k` per i 23 | Disponibilità strutturata (modo, giorni, fasce, eccezioni, luoghi per chiave) in un posto solo; scheda del luogo, «Dove si trova», semafori e diario la leggono da lì |
| F9-02 | R9-01 (G-036) | API, sola lettura | Ryuji, Ann, Haru, Makoto, Yusuke, Futaba, Kasumi, Gemelle | Ryuji giorno, tutti i giorni; Ann giorno, lun/mar/mer/ven/dom, Centro commerciale sotterraneo, ranghi 3/4/5/7/9/10 non con la pioggia, **nessuna sera**; Haru giorno lun–sab, mai con la pioggia; Makoto giorno mar/gio/sab/dom, Cancello della scuola; Yusuke giorno tutti i giorni, ranghi 4/6/9 non con la pioggia; Futaba giorno mer/gio/sab/dom, mai con la pioggia; Kasumi `su-messaggio`; Gemelle dal 18/5 senza limiti |
| F9-03 | R9-01 (G-036) | API | Kawakami, Yoshida, Mishima | Kawakami ven/sab sera dal telefono del Leblanc («appartamento/vari luoghi» sparisce); Yoshida domenica sera **e festivi**, non con la pioggia; Mishima non disponibile nei **2 giorni dopo un salto di rango** (con una partita di prova: rango salito il giorno D → non disponibile in D+1 e D+2) |
| F9-04 | R9-02 | API | Igor, Gemelle, Sae, Morgana | Senza luogo, con il motivo: «avanza con la trama» (Igor, Morgana, Sae); Gemelle «Stanza di Velluto (cancello vicino al Negozio Softair)» |
| F9-05 | R9-03 | Browser, partita 1 | Voci d'incontro fuori giorno o fascia (27 e 48 secondo `dati.md`; per esempio un incontro con Kawakami di martedì) | Chip ambra «fuori giorno» / «fuori fascia», mai bloccante; nessuna voce spostata o riscritta. Kasumi (`su-messaggio`) non dà mai l'avviso |
| F9-06 | R9-04, R9-04b | Browser | Pagina, semafori e calendario di Ohya, Kawakami, Gemelle, Takemi | La data di sblocco è quella del rango 1, uguale ovunque: Ohya dal 5/7 (incontro il 18/6 come evento separato); Kawakami sblocco il 4/6, rango 1 consigliato l'8/6 con Coraggio 3 (evento «Becky» il 3/6); Gemelle dal 18/5; Takemi dal 18/4 (negozio dal 16/4) |
| F9-07 | R9-05 | Browser | Testi con «Junichi Iwai» (calendario, settimana della guida) e pagina di Iwai | Si legge «Munehisa Iwai» nei 2 testi corretti; nessun «Junichi» nell'app |
| F9-08 | R9-06 | Browser, partita 1 | Voci del diario con un nome di Confidente vecchio (39, di cui 6 nel validato) | Il nome attuale compare accanto al testo; il testo della voce non cambia |
| F9-09 | R9-07 | Collaudo (foto e ripristino), anteprima 3302/5474 | Dalla pagina di un Confidente: modifica di anagrafica, disponibilità e luoghi (`PUT /api/compendio/confidenti/:k`), rango e abilità (`PUT …/:k/ranghi/:rango`), dialogo (`PUT …/:k/dialoghi/:id`), regalo (L7), luogo; «Ripristina» (`POST …/:k/ripristina`) | Ogni modulo salva e ripristina; la Dote resta «solo al passaggio di rango» |
| F9-10 | R9-07b | API | Ranghi di tutti i Confidenti | Ogni rango ha il suo modo: rango 1 e 1→2 senza punti per tutti; Igor, Morgana, Sae, Gemelle mai a punti; Mishima con le Richieste; Yoshida senza soglie; Akechi 9→10 e Maruki 10 automatici; 9→10 all'evento. Soglie a punti come oggi (es. Akechi 6→7 = 55) |
| F9-11 | R9-07c | Collaudo (foto e ripristino), anteprima 3302/5474 | Pagina di Makoto: aggiungere, modificare e togliere l'invito del 30/7 (Ikebukuro) (`POST`/`PUT`/`DELETE /api/compendio/confidenti/makoto/inviti(/:invito)`) | Compare nella condizione effettiva di Ikebukuro (L6) e nella voce del diario che lo cita, senza scriverlo altrove; tolto, sparisce da entrambe |
| F9-12 | R9-07c | Partita di prova | Gesto «Invito avvenuto» dalla pagina del Confidente (`PUT`/`DELETE /api/partite/<prova>/inviti/:invito`, L6) con le condizioni false e vere (Ryuji 29/5 con Madarame concluso; Makoto 30/7 con Futaba concluso e Imperatore 1) | Disattivato con «Non ancora possibile: manca …» quando non valgono; registrato quando valgono |
| F9-13 | R9-08 | API + browser, partita di prova | Punti di un incontro: base, Persona dello stesso arcano (×1,5), esame primo / nei primi 10 / altro per i 7 Confidenti (Ryuji, Ann, Makoto, Haru, Sojiro, Kawakami, Kasumi) e per uno fuori dai 7 | Stesso risultato nel server e nell'anteprima; ×1,5 o ×1,2 solo per i 7 e solo fino ai risultati dell'esame successivo; senza piazzamento nessun moltiplicatore; il ×1,2 dell'invito non si applica |
| F9-14 | R9-08 | Partita di prova | Piazzamento all'esame da DomandePage (`PUT /api/partite/<prova>/esami/:esame/piazzamento`) | Si salva (`esame_piazzamento_partita`) e i punti successivi lo usano; la partita 1 non cambia |
| F9-15 | R9-09 | Browser | `/confidenti`, link «Personaggi», link del visore (prima rotto) | `/confidenti` elenca i 23 con rango e disponibilità di oggi; «Personaggi» e il visore portano alla pagina del Confidente |
| F9-16 | R9-10, R9-14 | Browser | `/guida/attivita/<chiave>` di 3 attività (un lavoro, un'attività con Doti, il Triple Seven); dati da `GET /api/compendio/attivita/:k` | Sede (luogo L5 con presenza di oggi), fascia, sblocco (condizione L6), effetti strutturati, paga; descrizione solo sull'attività, le altre viste mostrano il nome con il link |
| F9-17 | R9-11 | API | Le 16 attività senza effetti strutturati | Hanno gli effetti dalla scheda dell'Esperto, oppure «Effetti da completare» (nessun valore inventato); Biliardo e Gun About con effetto «casuale» (proposta con «Applica» in L10) |
| F9-18 | R9-12 | API + partita di prova | Turno ai 4 lavori | Paga letta solo dall'attività: Triple Seven 3.500/7.400, Rafflesia 3.200/7.800, Ore no Beko 3.600/8.800, Crossroads 7.200/12.000 (12.000 è la domenica, G-036) |
| F9-19 | R9-13 | Browser | Guida del quiz del Triple Seven e diario | Giorni del quiz 7, 17, 27 da un posto solo (`quiz_json`) |
| F9-20 | R9-15 | API, sola lettura | Tabella `giorno` | 346 giorni; meteo in due fasce dal calendario; i 12 giorni divergenti di oggi hanno un meteo solo; 05-24 «Nuvoloso» con nota «possibile pioggia» e «da verificare» |
| F9-21 | R9-16 | Browser | Giorno della settimana in calendario, diario, guida giorno per giorno | Calcolato dalla data (anno di gioco aprile–dicembre 2016, gennaio–marzo 2017); stesso valore ovunque; 0 errori |
| F9-22 | R9-17 | Browser | Un giorno con allerta meteo | Il tag arriva dal giorno |
| F9-23 | R9-18 | API | Domande ed esami | 78 + 31 = **109** righe di `domanda`, **97** visibili; le 12 riassuntive conservate e nascoste; i segni delle partite (domande p1 6, p2 6) invariati e mostrati sulle domande dell'esame del giorno |
| F9-24 | R9-19 | Collaudo (foto e ripristino), anteprima 3302/5474 | «Modifica il giorno» dalla guida giorno per giorno (`PUT /api/compendio/giorni/:data`); «Ripristina» | Meteo nelle due fasce, nota, trama, vincoli si salvano e si ripristinano |
| F9-25 | R9-20, R9-21 | Browser | Calendario di maggio e giugno | Sblocchi e scadenze ricavati (rango 1 dei Confidenti, condizioni `data` di quartieri e luoghi, finestre dei Palazzi). Madarame ha **una** scadenza (06-05) più la lettera (05-31) come evento distinto. I 46 «sblocco» e 18 «scadenza» di oggi che coincidono non si vedono più doppi; quelli che non coincidono sono in elenco |
| F9-26 | R9-20, R9-24 | Browser, partita 1 | Diario di un giorno con eventi del calendario | Riga «Eventi del giorno» sopra le voci, letta dal calendario; **nessuna voce nuova** nel diario validato |
| F9-27 | R9-22, R9-32 | Browser | Calendario mensile: un tag | Porta alla voce o all'oggetto; il tag si modifica dallo stesso modulo delle voci; il cambio di giorno dal Calendario usa `PUT /partite/:id/giorno` |
| F9-28 | R9-23 | Browser | Le 42 settimane della guida | Consultabili e collegate ai giorni |
| F9-29 | R9-24 (NR) | API + browser, partita 1 | Diario 04-01..06-01 | 255 voci identiche in testo, ordine, giorno, fascia, uid, spunte; 0 voci aggiunte |
| F9-30 | R9-25, R9-26, R9-27 (NR) | API, partita 1 e partita «Tutorial» | Stati di partita | Uguali: Confidenti 23/23, incontri 37/15, turni 9/2, attività svolte 6/2, domande 6/6, cruciverba 1/2, Doti 5/5, eventi di storia 4/3, meteo segnato 0/1 |
| F9-31 | R9-28 (NR) | API | Impronta di Kamoshida (169 voci, 359 pin dell'utente) e Madarame (227 voci, 254 pin dell'utente) | Identica |
| F9-32 | R9-29 (NR) | Comandi | Typecheck, lint, test mirati di `modifiche.md` §6 | Verdi, con output grezzo |
| F9-33 | R9-30, R9-31 (controllo funzionale) | Browser 375, partita 1 | Dal diario, chip «Confidenti disponibili oggi · N»; pagina di un Confidente | Un tocco apre l'elenco filtrato sul giorno e sulla fascia; nella pagina rango e prossimo passaggio, disponibilità di oggi e dialoghi del rango corrente vengono per primi |

| F9-34 | R9-01 (`modifiche.md` §5, verifiche) | API, sola lettura | `confidente_luogo` dopo la M9 contro `luogo.confidenti_json` della base (34 luoghi) | **Stesse coppie** luogo ↔ Confidente, nessuna in più né in meno; la scheda del luogo (L5) e la pagina del Confidente mostrano le stesse coppie |

**Vitest mirati** (`modifiche.md` §6 BE e FE): sui file pronti, con `DATA_DIR` su una cartella vuota, output grezzo nell'esito (F9-32).

**Layout**: R9-33 lo prova Test layout (pagina del Confidente a 1366×657 e 1280×689, Calendario a lista per settimana a 375).

## Note per Test funzionali
- Gli attesi «dopo» di F9-02, F9-10, F9-17, F9-20, F9-23 e F9-25 vanno confermati da Analisi dati dopo il boot della M9.
- Le 4 voci del diario di Lavenza/Gemelle legate a `igor` (G-036) sono «da approvare»: non si provano come scritture finché l'utente non dà il sì.
