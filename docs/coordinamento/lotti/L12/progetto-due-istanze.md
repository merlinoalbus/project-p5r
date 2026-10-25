# L12 — Progetto delle due istanze (preparazione privata, rilascio pubblico)

Autore: architetto ECC (sola lettura), 2026-10-25, per le voci R12-02 e R12-04. Disposizioni dell'utente in `requisiti.md`.
Il dominio pubblico non si scrive qui: il repository è pubblico.

**Scelta:** un solo repository e un solo codice, **due immagini** con la modalità fissata nella build (non da una variabile d'ambiente).

- **Preparazione:** l'istanza attuale, con tutte le funzioni, `:latest` e aggiornamento automatico, Cloudflare Access riservato all'utente.
- **Rilascio:** `gioco.db` chiuso su tre livelli, rotte negate se non sono in un elenco del giocatore, partite del proprietario riconosciuto da
  Cloudflare Access, nessun esecutore di migrazioni.

## 1. Immagini
- Scartate: (a) stessa immagine con variabile di modalità (un errore dello stack aprirebbe le scritture, gli editor restano nel bundle);
  (b) togliere i file delle rotte di scrittura (gli stessi file mescolano letture e scritture, es. `server/routes/compendio.ts`, `mappe.ts`).
- Scelta (c): backend con punto d'avvio `server/rilascio.ts` (modalità scritta nel codice) e stage `rilascio` in `Dockerfile.backend` senza
  `pacchetto/`; `createApp({ modalita })` monta solo le rotte ammesse. Frontend con `ARG VITE_MODALITA`: con la condizione costante gli
  editor (es. `EditorMappaPage`) escono dal bundle. nginx con configurazione propria.
- Fonte unica delle capacità: `shared/capacita.ts` (`Modalita`, `CAPACITA_PER_MODALITA`); `/api/config` espone `{ modalita, capacita }`;
  il frontend confronta la costante di build con `/api/config` all'avvio e si blocca se non coincidono.
- Controllo statico del bundle in CI (non è un test): nel `dist` di rilascio non compaiono le stringhe delle rotte di preparazione.

## 2. Sola lettura di `gioco.db`
- Fatti: `gioco.db` è `main`, `partite.db` è attaccato come `utente` (`server/db/dbService.ts`); `{ readonly: true }` di better-sqlite3 vale
  per tutta la connessione, quindi non si usa; oggi `main` è in WAL, che su un file in sola lettura non si apre.
- Tre livelli: (1) volume montato `:ro`, file 0444, processo non root; (2) edizione prodotta con `VACUUM INTO` e `journal_mode=DELETE`,
  in rilascio niente WAL su `main`; (3) controllo all'avvio: una scrittura di prova su `main` deve fallire con `SQLITE_READONLY`, altrimenti
  l'avvio si ferma; `SQLITE_READONLY` in esercizio diventa 403 `contenuti-in-sola-lettura` con log di errore.
- Scritture di oggi su `gioco.db` durante l'uso e destino nel rilascio: cache delle miniature (generate tutte nell'edizione, altrimenti si
  serve l'originale senza scrivere); riscaldamento delle miniature, regole all'avvio, migrazioni, pacchetto iniziale (non si eseguono);
  backup (solo `utente`); `assegnaUidMancanti` nella rotta degli spilli (l'edizione deve avere zero spilli senza uid, la chiamata si salta);
  caratteri (letti dal volume dell'edizione); indice di ricerca e preferenze (in memoria / nel browser, nessun intervento).

## 3. Rotte
Nel rilascio si nega tutto salvo un elenco esplicito di metodo e percorso (`server/rilascio/rotteGiocatore.ts`), confrontato all'avvio con le
rotte montate (`elencaRotte`): una voce che non corrisponde fa fallire l'avvio. Giocatore: tutto `/api/partite/:id/*` (salvo
`acquisti/legacy`), le letture di guida, mappe, aree, compendio, catalogo, fusione, ricerca, traduzioni, regole di pesca, immagini
(`manifest` e file), caratteri (file), `health`, `config`, e da `condizioni` valuta, progressi, eventi, attività, punti-negozio.
Solo preparazione: tutte le scritture dei contenuti (comprese le voci del diario), le letture diagnostiche degli editor, luoghi,
correzioni, impostazioni, deposito, importazione ed esportazione, upload di immagini, documentazione delle API. Il cestino personale passa
sotto `/api/partite/:id/cestino` in entrambe le istanze.

## 4. Partite per utente
- Identità: middleware `server/middleware/identita.ts` che verifica `Cf-Access-Jwt-Assertion` (RS256, chiavi del team in cache, `iss`,
  `aud`, `exp`, `nbf`); rifiuta i token senza email; proprietario = `sub`; 401 `accesso-non-verificato`; variabili `CF_ACCESS_TEAM` e
  `CF_ACCESS_AUD` obbligatorie nello stack (mai nel repository).
- Schema: ultima migrazione utente prima del congelamento (045): `partita.proprietario` (predefinito `proprietario-unico`),
  `proprietario_email`, indice unico della partita attiva per proprietario.
- Filtro per proprietario in elenca, crea, attiva, elimina; controllo centrale di appartenenza su ogni id di partita (percorso, query,
  corpo) con 404 `partita-non-trovata`; seconda difesa in `verificaPartita`. Limiti di partite, frequenza e corpo (256 kB).
- Preparazione: proprietario unico, tutte le partite di oggi restano visibili; stesso codice di controllo.

## 5. Struttura di `partite.db` congelata
- L'edizione include `partite-vuoto.db`, creato nella preparazione con le migrazioni utente fino alla 045. Al primo avvio della pubblica si
  copia; a ogni avvio si controllano versioni e impronta dello schema, altrimenti l'avvio si ferma. `server/rilascio.ts` non importa il
  runner né le cartelle delle migrazioni.
- Rischio dichiarato: un cambio futuro di struttura delle partite non ha strada automatica (nuova immagine e conversione una tantum su
  copia, dopo il sì dell'utente); un'edizione che toglie chiavi lascia avanzamento orfano (mitigato dal controllo di compatibilità).

## 6. Edizione e distribuzione
- «Prepara edizione» nelle Impostazioni della preparazione (`edizioneService`, nessuno script): regole all'avvio a zero, uid completi,
  miniature tutte, controlli di integrità e di R12-04, `VACUUM INTO` senza WAL, tabella `edizione`, `partite-vuoto.db`, caratteri, manifesto
  con sha256 e conteggi, **report di compatibilità** con l'edizione precedente, deposito nella cartella d'appoggio.
- Compose separato (`docker-compose.rilascio.yml`): servizi e rete propri, volume dell'edizione locale montato `:ro`, volume delle partite
  locale, backup su un volume a parte; niente cartella d'appoggio.
- nginx di rilascio: niente `/api/impostazioni/` e `/api/mappe/importa`, solo GET/HEAD fuori da `/api/partite` e `/api/condizioni`,
  corpo massimo 256 kB, intestazioni di sicurezza.
- Pipeline `docker-publish-rilascio.yml` su tag `rilascio-v*`, immagini distinte con versione fissa, mai `:latest`; niente watchtower.
- Backup dell'avanzamento: copia di `utente` all'avvio e ogni 6 ore, con rotazione.
- Cloudflare (a mano, utente): nome host pubblico sul tunnel verso il frontend pubblico; applicazione Access separata con il suo AUD,
  accesso con codice via email, policy consigliata a elenco di email (oppure aperta, con il limite di 50 utenti del piano gratuito),
  sessione lunga; regola di limite di frequenza su `/api/`; team e AUD come variabili dello stack.

## 7. Frontend in modalità Giocatore
`useCapacita` e `<SoloPreparazione>` sulla stessa fonte; chiusi la rotta dell'editor delle mappe, i componenti di modifica (circa 45 file) e
le Impostazioni dei contenuti; restano le partite dell'utente, la grafica locale e il cestino personale.

**Come si esclude il codice (passo 8, provato sulla build).** Il bundler di Vite 8 (Rolldown) decide quali moduli e quali chiamate all'API
restano *prima* di piegare le costanti, e non propaga una costante letta da un altro modulo: `useCapacita`, `SoloPreparazione` e un
`IN_RILASCIO` importato da `utils/modalita.ts` NON tolgono niente dal bundle (i percorsi di scrittura restavano tutti). Funziona invece una
condizione costante nello stesso modulo, `const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio'`, con ternario, `&&` o `||` (non
con un `if` che ritorna prima). Perciò: i componenti di modifica sono esportati come `IN_RILASCIO ? NienteInRilascio : XReale` (pagine
invariate, componente vuoto nel rilascio), i comandi sparsi nelle pagine hanno `{!IN_RILASCIO && …}`, la rotta dell'editor delle mappe non
si registra, le Impostazioni mostrano solo partite, grafica e informazioni. `scripts/verifica-bundle-rilascio.ts` (in `ci.yml`) legge il
`dist` di rilascio e fallisce se trova percorsi di scrittura o etichette degli editor; con `--confronta` verifica che l'elenco sia ancora
valido. Nuovo modulo di modifica ⇒ stessa condizione nel modulo ⇒ eventuale stringa nell'elenco. **Aperto per il passo 3:** il cestino
personale (partite, registrazioni d'acquisto, pesca) nelle Impostazioni di rilascio torna quando esisterà `/api/partite/:id/cestino`; ora la
sezione `Cestino` è chiusa nel rilascio perché chiama `/api/impostazioni/cestino`.

## 8. Passi
| # | Passo | Stima |
|---|---|---|
| 1 | `shared/capacita.ts`, `/api/config`, controllo all'avvio del frontend | S |
| 2 | Migrazione utente 045 e servizi partite per proprietario | M |
| 3 | Identità Cloudflare, controllo di appartenenza, cestino personale sotto la partita | M |
| 4 | `server/rilascio.ts`: avvio senza migrazioni, sola lettura verificata, versioni e impronta, backup di `utente` | M |
| 5 | Elenco delle rotte ammesse verificato all'avvio; limiti | M |
| 6 | Miniature e caratteri senza scritture; uid mancanti saltati | S |
| 7 | «Prepara edizione» con report di compatibilità | L |
| 8 | Frontend in modalità Giocatore e controllo statico del bundle | L |
| 9 | Dockerfile, nginx, compose e pipeline del rilascio | M |
| 10 | Prova breve di better-sqlite3 su volume in sola lettura | S |
| 11 | Utente: Cloudflare, variabili, stack, prima edizione, collaudo funzionale | utente |
| 12 | ARCHITETTURA, DECISIONI; verifica avversariale distinta | S |
