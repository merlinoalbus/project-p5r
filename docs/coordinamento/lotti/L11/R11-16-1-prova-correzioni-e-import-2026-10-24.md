# R11-16/1 — le correzioni restano dopo l'importazione: prova su copia, tipo per tipo (2026-10-24)

Prova su una copia di p5s (scratchpad, nessun dato reale toccato), con il codice di HEAD (schema di gioco 213). Nessun test eseguito: è un banco di prova che chiama i servizi veri (`ripristinoService`, `copiaDatabase`, `importaPacchetto`).

## Come si è provato

Per ognuno dei 37 tipi del registro dei ripristini (`TIPI_MODIFICABILI`):

1. **Correzione:** una correzione vera su un campo del primo oggetto correggibile (testo + « [prova]», numero ±1, booleano invertito o altra scelta); la scheda deve dire `modificata` e portare il valore nuovo.
2. **Esportazione:** `copiaDatabase('gioco')` (la copia di `gioco.db` che l'app offre come backup), con tutte le 37 correzioni dentro.
3. **Perdita voluta nell'istanza viva:** «Ripristina» di tutte le correzioni (nessuna correzione attiva: `elencaCorrezioni` vuota; una sola è rimasta nel secondo scenario, vedi sotto).
4. **Importazione:** `importaPacchetto` del backup (il flusso di «Importa»: anteprima, copia di sicurezza, sostituzione di `gioco.db`, riapertura con migrazioni e regole dell'avvio).
5. **Verifica:** la scheda dice ancora `modificata` con il valore corretto, il valore della guida è quello di prima (la fotografia è arrivata integra) e «Ripristina» riporta il campo alla guida.

Due scenari:

- **A — stesso schema (213 → 213):** 37 tipi su 37 superano tutti i controlli.
- **B — aggiornamento (backup di schema 211 importato in un'istanza a 213):** il backup viene portato a 213 dalle migrazioni durante l'importazione (`migrazioniApplicate: 2`: la 212 dei regali e la 213 di Persona e skill). 34 tipi su 34 superano i controlli; regalo, Persona e skill non hanno la colonna nel backup di 211 e quindi non hanno correzioni da portare (atteso).

Controllo delle chiavi esterne dopo l'importazione: vuoto, in entrambi gli scenari.

## Esito per tipo

| Tipo | Dove vive la correzione | A (stesso schema) | B (211 → 213) |
|---|---|---|---|
| quartiere | riga `quartiere` (`seed_json`) | ok | ok |
| trofeo | riga `trofeo` | ok | ok |
| dote | riga della Dote sociale | ok | ok |
| trasformazione | riga di Jose | ok | ok |
| personaggio, gruppo-personaggi | blocco `dati_guida` + `correzione_dati_guida` | ok | ok |
| sfide-battaglie, battaglia-sfida, boss-segreto, sfide-magnate, magnate-sfida, tratto, sfide-tratti, sfide-quiz-tv | blocco + `correzione_dati_guida` | ok | ok |
| finale, covo, covo-sfida, covo-premio, dlc, meteo, completamento-sezione | blocco + `correzione_dati_guida` | ok | ok |
| fabbricazione, ricetta, armi, arma-effetto, arma-progressione, abiti, abito, jose | blocco + `correzione_dati_guida` | ok | ok |
| evento-calendario, allerta-meteo | riga (`origine`, `seed_json`, migrazione 199) | ok | ok |
| esame | riga (migrazione 198) | ok | ok |
| ombra | riga (migrazione 209) | ok | ok |
| battaglia-sezione | blocco + `correzione_dati_guida` | ok | ok |
| regalo | riga `confidente_regalo` (migrazione 212) | ok | — (la colonna nasce con la 212) |
| persona, skill | righe `persona` e `skill` (migrazione 213) | ok | — (la colonna nasce con la 213) |

Le correzioni stanno nel database di gioco (le righe con `seed_json` e la tabella `correzione_dati_guida`): finché il backup importato le contiene, arrivano con lui, insieme alla fotografia della guida.

## Rilievi

1. **L'importazione rifiuta anche il backup dell'istanza stessa (bloccante per il flusso, indipendente dalle correzioni).** Sulla copia di p5s l'anteprima di `importaPacchetto` risponde 409 `attivita-confidente-conflitto` (campo `effetti_json`) per l'attività `esperimenti-clinici-takemi`: ha `confidente_chiave = 'takemi'` e propri effetti (Coraggio +1), e `verificaCollegamentiAttivitaImportati` (`vincoliAttivitaConfidente.ts`) vuole che con la fonte Confidente i campi autonomi siano risolti. Per misurare il resto, nel banco di prova ho azzerato quell'effetto **solo sulla copia**. Strade (decisione del PM, non applicate): (a) togliere l'effetto proprio dell'attività (la Dote è già della fonte Takemi); (b) allentare la regola per le attività già presenti nell'istanza.
2. **«Sostituisce senza unire» ha una conseguenza che va saputa:** una correzione fatta dopo la data del backup, o un backup preso prima della correzione, la perde (non c'è fusione). Vale per tutti i tipi allo stesso modo: la prova misura che le correzioni **contenute nel backup** arrivano; non c'è un meccanismo che porti correzioni dall'istanza viva a un pacchetto che non le ha, e non è previsto dalla regola del 21/10.
3. **Copie di ripristino: 3 (`COPIE_DI_RIPRISTINO`, `impostazioniService.ts`).** Ogni importazione crea `prima-del-ripristino-…` e tiene le ultime tre; la quarta importazione di fila cancella la più vecchia, che può essere l'unica copia con una certa correzione. Decisione dell'utente: restano 3.
4. **Una correzione è rimasta attiva dopo il «Ripristina» di tutte nel secondo scenario** (`elencaCorrezioni`: 1, contro 0 nel primo); non ha influito sull'esito delle verifiche. Non l'ho indagata: probabile effetto della migrazione di aggiornamento su un'allerta o un evento del Calendario del backup 211; va guardata se interessa.

## Modifica al codice

`ripristinoService.chiaviDelTipo(tipo)`: l'elenco delle chiavi correggibili di un tipo (righe del registro o elementi del blocco), usato dal banco di prova; utile anche per gli elenchi.
