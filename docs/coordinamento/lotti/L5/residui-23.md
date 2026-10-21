# L5 — disposizione mirata dei 23 candidati rimasti

**Aggiornamento19:55Z:** tre dei23 ora conclusi: schede collegate ai pin1466/1486/1526 approvate dall’utente, applicate senza nuovi pin e con gate finale distinto positivo. Rimangono20candidati di questa popolazione:9distributori,9serviziCovo,1eccezioneJose e pin1636. Per1636 l’utente ordina la rimozione, autorizzata ma non ancora applicata: recuperabilità137 in implementazione. Non sono20bug identici né il totale dei residui L5. Le sezioni seguenti documentano l’istruttoria originaria, con il consuntivo dei tre in [crea-luogo-da-pin](crea-luogo-da-pin.md).

Istruttoria del 21 ottobre 2026. Nessuna applicazione o chiusura del lotto. I 23 sono i 31 candidati di [riconciliazione-corrente.md §6.1](riconciliazione-corrente.md#61-riscontro-corrente-e-proposte-nominative-per-tutti-i-31-candidati), esclusi gli [otto approvati e applicati](approvazione-otto-raccordi.md). Non si sommano ai luoghi senza Area o alle altre popolazioni L5.

Fonti: M5 §7.9 originale a `43ad8889`, dossier già presenti e letture mirate di `pacchetto/gioco.db` pubblico93, aperto `readonly/fileMustExist`. Sono stati letti soltanto i 23 pin, i loro contesti e i luoghi/listini pertinenti. I riscontri correnti del dossier sono attribuiti alla Regia: questa istruttoria non è una nuova lettura di p5s. Nessun dato privato, test, copia DB o scrittura.

## Disposizione delle 23 righe

| Pin | Contesto pubblico / prova | Disposizione e limite preciso |
|---|---|---|
| 272 | Electric Town, nativo46/indice14 | Distributore fisico; manca il raccordo fra questa macchina e i sei listini Akihabara. Non scegliere il primo per ordine. |
| 273 | Electric Town, nativo46/indice15 | Stesso limite, conservando il pin distinto. |
| 274 | Electric Town, nativo46/indice16 | Stesso limite, conservando il pin distinto. |
| 275 | Electric Town, nativo46/indice17 | Stesso limite: quattro pin non provano l'abbinamento a quattro dei sei listini. `akihabara/distributori-akihabara` è un luogo aggregato, non la prova dell'identità della singola macchina. |
| 339 | Cancello Shujin, `nativo-rmap-002-1-0`, nativo46/indice4 | Mancano identità e listino della macchina fra i due del cancello. Non assegnare al luogo aggregato `shujin-academy/distributori-shujin` una sola Area: comprende più Aree scolastiche. |
| 359 | Shopping Kichijoji, `nativo-rmap-005-1-0`, nativo46/indice9 | Macchina fisica attestata, senza luogo dedicato nel pubblico; identità del listino ancora priva di prova. Non riusare un listino di altro quartiere. |
| 1466 | Lotteria, Piazza Shibuya, nativo47/indice9 | Nuovo luogo proponibile dopo consenso specifico e controllo corrente dei duplicati. Non assimilare la sede all'intera piazza. La prova nativa non attesta la vecchia frase «lotteria radiofonica». |
| 1486 | Chiosco succhi, Sottopasso, nativo49/indice13 | Nuovo luogo distinto proponibile. 1487 è KiyasuKu, nativo50/indice14, già collegato a `shibuya/kiyasuku`; anche la nota pubblica del listino distingue il chiosco bevande. Non trasferire offerte Aojiru o acquisti. |
| 1526 | Cinema, Central Street, nativo62/indice29 | Nuovo luogo proponibile dopo consenso e controllo corrente dei duplicati. I cinema pubblici di Yongen e Shinjuku non sono sedi equivalenti. |
| 1564 | Luci rosse Shinjuku, `nativo-rmap-006-1-0`, nativo46/indice11 | Macchina fisica attestata; luogo/listino dedicati non identificati nelle fonti disponibili. Nessuna assegnazione scolastica o posizione destra/sinistra inventata. |
| 1565 | Stessa planimetria, nativo46/indice12 | Stesso limite, mantenendo la macchina distinta. |
| 1566 | Stessa planimetria, nativo46/indice13 | Stesso limite; nome identico non autorizza fusione dei pin. |
| 1636 | Lavoro part-time, Banchina Yongen; nessun nativo, descrizione pubblica vuota | Intento personale non ricostruibile dalle fonti presenti. Non dichiararlo bacheca né sede di lavoro. Eventuale domanda sull'intento del pin va separata dal consenso ai tre luoghi. |
| 375 | Covo, Palace Maker, nativo98/indice3 | Servizio interno; decisione sulla resa nell'app, non negozio cittadino da creare. |
| 376 | Covo, Musica, nativo99/indice4 | Servizio interno, distinto da un negozio di musica di Tokyo. |
| 377 | Covo, Televisione/film, nativo100/indice5 | Servizio interno; escludere il raccordo al televisore del Leblanc o all'home-shopping. |
| 378 | Covo, Galleria, nativo101/indice6 | Servizio interno; escludere l'abbinamento alla galleria di Kichijoji. |
| 379 | Covo, Area giochi, nativo102/indice7 | Servizio interno; non collegare alle sale giochi cittadine. |
| 380 | Covo, Premi, nativo103/indice8 | Conservare l'accesso distinto; categoria specifica del premio non attestata. |
| 381 | Covo, Premi, nativo103/indice9 | Stesso limite, senza dedurre una categoria dall'ordine degli ID. |
| 382 | Covo, Premi, nativo103/indice10 | Stesso limite, senza fusione dei pin. |
| 383 | Covo, Premi, nativo103/indice11 | Stesso limite; quattro icone uguali non provano duplicazione. |
| 386 | Jose nel Covo, nativo108/indice14 | Falso raccordo commerciale al negozio Jose dei Memento. Jose qui introduce le funzioni del Covo: conservare il pin come servizio informativo, senza una nuova sede commerciale. |

Copertura: **3 proposte di luogo + 9 distributori con prova commerciale mancante + 9 servizi Covo + 1 eccezione informativa Jose + 1 intento personale non documentato = 23**. Non sono 23 bug da correggere con la stessa migrazione.

La [guida AGS del Covo](https://www.allgamestaff.it/persona-5-royal/covo-dei-ladri/) conferma il ruolo introduttivo di Jose e distingue funzioni e categorie dei premi. Non associa i quattro pin a quattro categorie specifiche. La resa preferita già proposta nel dossier conserva 375–383 come servizi dell'Area `citta/yongen-jaya/covo-dei-ladri`, con collegamenti funzionali; va approvata come soluzione prima di implementarla. Il codice attuale non offre un riferimento «servizio della guida» e `CovoPage` mostra Sfide/Premi: non sono già disponibili tutte le destinazioni funzionali necessarie.

## Prossimo elenco finito da predisporre per il consenso

| Pin esistente | Nuovo luogo proposto | Area già identificata |
|---|---|---|
| 1466, `nativo-rmap-001-1-0` | Banco della lotteria di Shibuya | `citta/shibuya/piazza-della-stazione` |
| 1486, `nativo-rmap-001-2-0` | Chiosco dei succhi del Sottopasso | `citta/shibuya/sottopasso` |
| 1526, `nativo-rmap-001-3-0` | Cinema di Shibuya | `citta/shibuya/central-street` |

Prima della domanda, la Regia verifica nell'istanza la presenza delle tre Aree, l'identità completa dei pin e l'assenza di un luogo già equivalente, poi sottopone elenco e soluzione al revisore distinto. M5 §7.9 richiede il consenso specifico; quello degli otto non copre queste tre operazioni. Nel pubblico93 tutti e tre i pin hanno origine utente e una fotografia dell'identità: nessuna migrazione automatica sui pin personali.

L'operazione prevista crea il luogo e collega **il pin esistente**, preservandone posizione, nome, descrizione, condizioni, voci, immagini e stati. Nessun secondo pin, acquisto o nuovo progresso; nessun orario, prezzo o programma inventato. Le chiavi dei nuovi luoghi non sono ancora create: l'API ordinaria del catalogo genera `<quartiere>/u-<slug>` e non accetta una chiave manuale.

**Omissione tecnica individuata e successivo intervento:** i percorsi preesistenti non uniscono creazione del luogo e raccordo CAS del pin in una sola transazione. `POST /api/luoghi/posiziona` crea sempre un nuovo pin; il CAS `GET /api/mappe/spilli/:id/precondizione-raccordo` → `PUT /api/mappe/spilli/:id` richiede un luogo già esistente e il ramo `areaLuogo` è limitato alla proposta 1530/Venditore. È stata quindi implementata un'estensione ordinaria separata con anteprima, TX unica e uso del pin esistente, approvata dal revisore sul disegno e sul codice statico. [Dossier, contratti e payload dei tre](crea-luogo-da-pin.md). Controlli integrati, pubblicazione e osservazioni dell'anteprima restano alla Regia; nessuna delle tre creazioni è applicata o approvata dall'utente per effetto del gate tecnico.
