# L5 — creare il luogo dal pin già presente

## Perimetro e stato

M5 §7.9 originale a `43ad8889` richiede un elenco approvato prima di trasformare i pin commerciali personali. I [23 residui](residui-23.md) restano distinti: qui si prepara soltanto il gesto ordinario necessario ai tre luoghi documentati. Nessuna migrazione, applicazione automatica, fusione, nuovo pin, offerta o avanzamento.

Il revisore distinto `audit_documenti_originali` ha approvato prima il disegno, poi il codice BE e FE in sola lettura, compreso l'ultimo delta lint. La Regia ha comunicato typecheck, lint e build tutti con uscita 0. Pubblicazione e osservazioni dell'anteprima dopo il rilascio restano alla Regia. Il gate statico non certifica il comportamento runtime o i dati correnti e non sostituisce il consenso specifico dell'utente. Le tre applicazioni restano ferme.

## Contratto implementato

- `POST /api/luoghi/da-pin/:id/anteprima`: sola lettura coerente, `no-store`; corpo `{nuovo:{nome,tipo,cosaOffre,orari}}`, tutti i livelli oggetto strict, inclusi gli orari. Mostra i dati effettivamente normalizzati, chiave proposta, contesto reale e tutti i luoghi del quartiere, anche nascosti, con token transitorio.
- `POST /api/luoghi/da-pin/:id`: stesso `nuovo` e `revisioneRaccordoAttesa` appena ricevuta. TX IMMEDIATE unica sulla connessione che ha `utente` attached: rilettura e fotografia completa, confronto CAS, `creaElemento('luogo',...)` ordinario annidato, verifica chiave e campi persistiti, aggiornamento dei soli riferimenti e `updated_at` del pin. Ogni errore annulla entrambe le scritture.
- Risposta 201 costruita dentro la TX: `{esito:'creato-collegato',luogo:{chiave,nome},spillo:{id,uid,mappaChiave}}`. Dettaglio del luogo e ricarica della planimetria sono letture successive: un loro errore non significa creazione fallita e non ripete il POST.
- Collisione di chiave/nome, luogo nascosto equivalente per nome, pin già collegato, contesto incoerente, fotografia cambiata o storia del cestino non riconoscibile: 409; nessun suffisso automatico, overwrite, fusione o ripristino implicito. Il nome blocca un possibile duplicato, non prova equivalenza semantica.

La fotografia comprende il pin completo RAW, origine e identità precedenti, FK effettive mappa → Area → quartiere, luoghi correnti, relazioni con voci/immagini/destinazioni, collocazioni e stati pertinenti di tutte le partite sulla stessa connessione. Le righe e i BLOB restano in memoria, senza log o salvataggi della fotografia; dal servizio esce soltanto il token opaco. Nessuna foto privata o token va aggiunto a questo documento.

Il luogo nasce utente, con Area e quartiere dalle FK reali, condizioni proprie vuote e i soli valori nuovi espliciti. Nome, descrizione, tipo, posizione, condizioni, immagini, voci, UID, origine e stati del pin restano quelli originali; la descrizione propria è resa come nota secondo L5. Nessuna normalizzazione della sorgente o trasferimento delle sue condizioni nel luogo.

Nell'editor, dalle proprietà del pin compatibile, «Crea un luogo da questo pin» apre la finestra dedicata; un draft del pin deve prima essere salvato dall'utente. Anteprima e conferma non chiedono un altro punto sulla planimetria. Gli errori conservano la bozza, i cambi di input invalidano il token e le risposte asincrone vecchie non sovrascrivono un altro contesto. Dopo il successo si mantiene la selezione e si reinizializza il modulo. Risposta incerta: rilettura di ID/UID, riferimento e dati attesi, con descrizione dello stato osservato e nessuna attribuzione automatica dell'operazione.

## File e riesame

Contratti comuni: `shared/luogoDaPin.ts`; BE: `server/services/luogoDaPinService.ts`, `server/services/mappe/fotografiaLuogoDaPin.ts`, schemi/rotte/OpenAPI di `luoghi`. FE: `src/components/mappe/FinestraLuogoDaPin.tsx`, `src/services/api/luoghi.ts`, integrazione in `EditorMappaPage.tsx`. Il vecchio `precondizioneRaccordoPin.ts` cambia soltanto tre export: corpi e hash v1/v2 invariati.

Tre riesami statici propri hanno riguardato contratto UI/API, atomicità e conservazione. Il revisore ha poi individuato e fatto correggere due difetti: il formato canonico nuovo doveva trattare i booleani senza cambiare lo storico; lo scanner del cestino doveva rifiutare operazioni coercibili, lati incongrui, identità numeriche non sicure e viste scambiate per tabelle. Il codice finale richiede registri coerenti con il writer reale, PK secondo schema e tabelle effettive. Nessun test, simulazione DB o applicazione dei tre eseguita da questi agenti.

## Identità dei tre e fonti

La Regia ha letto nell'istanza i tre pin, le Aree FK e i luoghi correnti di Shibuya: nessun equivalente individuato e nessun collegamento ai tre da trasferire. Questo è un riscontro attribuito alla Regia; la nuova anteprima deve essere riletta dopo pubblicazione e ancora prima del salvataggio.

La lettura mirata del pacchetto pubblico 93 attesta:

| Pin | Identità nativa e collocazione | Classificazione proposta del luogo |
|---|---|---|
| 1466 | nativo 47, indice 9, `アイコン：宝くじ`; `nativo-rmap-001-1-0`, Area `citta/shibuya/piazza-della-stazione` | `attivita`, come il tipo attuale del pin. Nessuna qualificazione «radiofonica»: il nativo non la dimostra. |
| 1486 | nativo 49, indice 13, `アイコン：ジューサーバー`; `nativo-rmap-001-2-0`, Area `citta/shibuya/sottopasso` | `negozio` come classificazione esplicita del punto vendita, non macchina automatica; il tipo RAW `distributore` del pin resta invariato. |
| 1526 | nativo 62, indice 29, `アイコン：映画館`; `nativo-rmap-001-3-0`, Area `citta/shibuya/central-street` | `attivita`, come i due cinema già presenti nel catalogo pubblico; nessuna fusione con le sedi di Yongen o Shinjuku. |

**1486 non è 1487 o 1494.** Nella stessa planimetria, 1487 ha nativo 50/indice 14 (`アイコン：キヨスク`) e riferimento `shibuya/kiyasuku`; 1494 ha nativo 46/indice 21 (`アイコン：自販機`) e riferimento `shibuya/distributore-sottopasso`. I tre pin hanno posizioni distinte. La nota pubblica KiyasuKu distingue già il chiosco dei succhi. Non si trasferiscono l'offerta storica `chiosco-kiyasuku/succo-aojiru`, articoli, acquisti o regole di rotazione.

Le fonti Royal, indicate e lette prima dalla Regia e poi riaperte in questa istruttoria, attestano il chiosco nel Sottopasso e il consumo domenicale di Aojiru: [AGS, Coraggio, «Gli Aojiru della domenica»](https://www.allgamestaff.it/come-aumentare-il-coraggio-in-persona-5-royal/), [aqiu384, Overworld, «Aojiru»](https://aqiu384.github.io/megaten-database/p5r/overworld.html), [GameFAQs 78212, «Aojiru Rotation»](https://gamefaqs.gamespot.com/ps4/260936-persona-5-royal/faqs/78212/how-to-use). Le date dell'itinerario non diventano condizioni canoniche. La rotazione dipendente dall'acquisto è attestata, ma resta fuori da questi payload. Non sono attestati qui fasce e limitazioni meteo del chiosco: per questi soli aspetti si dichiara la regola dell'app. La voce «Shibuya Movies» di aqiu384 descrive l'attività cinematografica: non se ne copia un programma o un orario specifico di sede.

## Tre corpi di anteprima da sottoporre al consenso

Da presentare soltanto dopo controlli integrati, pubblicazione e osservazione delle anteprime effettive; i token non si precompilano e non si salvano in git. I tipi sono classificazioni dell'app esplicitamente proposte con i nuovi luoghi, non una nuova informazione nativa dedotta dal nome. I valori vuoti di `cosaOffre` non importano descrizioni incerte o programmi: le note del pin sono conservate.

1466, Banco della lotteria di Shibuya; chiave prevista `shibuya/u-banco-della-lotteria-di-shibuya`:

```json
{"nuovo":{"nome":"Banco della lotteria di Shibuya","tipo":"attivita","cosaOffre":"","orari":null}}
```

1486, Chiosco dei succhi del Sottopasso; chiave prevista `shibuya/u-chiosco-dei-succhi-del-sottopasso`:

```json
{"nuovo":{"nome":"Chiosco dei succhi del Sottopasso","tipo":"negozio","cosaOffre":"Succhi Aojiru.","orari":{"giorni":["domenica"],"fasce":[],"chiusoConPioggia":false,"nota":"Domenica attestata; fasce e meteo non indicati: per questi aspetti vale la regola dell’app."}}}
```

1526, Cinema di Shibuya; chiave prevista `shibuya/u-cinema-di-shibuya`:

```json
{"nuovo":{"nome":"Cinema di Shibuya","tipo":"attivita","cosaOffre":"","orari":null}}
```

1466 e 1526 hanno `orari:null`: regola dell'app dichiarata, non un orario inventato. 1486 è limitato alla domenica attestata; fasce vuote e assenza di chiusura meteo sono esplicitamente regole dell'app nella nota. Le tre chiavi non sono ancora create: il CAS e la guardia contro i suffissi ne verificano la disponibilità corrente. Dopo il consenso il salvataggio usa gli stessi `nuovo` delle anteprime e soltanto il rispettivo token fresco, in tre gesti distinti.
