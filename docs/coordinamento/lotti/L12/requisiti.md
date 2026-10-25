# L12 «Verso il rilascio» — requisiti

Autore: PM, 2026-10-25. Fonti: analisi ECC in sola lettura su otto dimensioni (architettura, React, backend, prestazioni, accessibilità,
sicurezza, errori silenziosi, prodotto) con verifica avversariale dei rilievi gravi e controllo del PM nel codice; disposizioni dell'utente
del 2026-10-25.

## Disposizioni dell'utente (2026-10-25)
- Oggi l'utente prepara i contenuti con modifiche dirette ai dati e deve avere tutte le funzioni attuali di modifica e configurazione.
- A lavoro ultimato l'app si usa in modalità partita: gli utenti ordinari accedono solo alle funzioni d'uso (mappe, guida, diario,
  tracciamento dell'avanzamento) e non possono alterare né modificare nulla, nemmeno gli elementi del diario.
- Dopo il rilascio non devono esserci migrazioni né altro: i contenuti sono chiusi.
- **Due istanze separate**: una privata di preparazione (quella attuale, con tutte le funzioni), una pubblica in sola lettura. L'istanza
  pubblica va esposta sul dominio indicato dall'utente (non riportato qui: il repository è pubblico).

## Verifica dello stato attuale (PM, nel codice)
- Le modifiche fatte dall'interfaccia sono quasi tutte un aggiornamento sul posto in `gioco.db`, con una fotografia del valore della guida
  (colonna `seed_json` o chiave in `dati_guida`) che serve solo a «Ripristina».
- Unica sovrapposizione rimasta: i blocchi JSON di `dati_guida` (personaggi, sfide, completamento, oggetti, Jose), corretti in
  `correzione_dati_guida` e applicati in lettura (migrazione 178, `datiGuida.ts`).
- Le correzioni del diario sono già canone in `gioco.db` dalla migrazione utente 015.
- Nessun concetto di utente né di proprietario della partita: la tabella `partita` non ha proprietario, la partita attiva vale per tutti.
- L'istanza attuale è dietro Cloudflare Access (verificato il 2026-10-25: pagina e API rispondono 302 alla pagina di accesso).

## Fasi
- **R12-01 Fase 1 — esperienza di gioco e protezione del lavoro di preparazione.** Difetti visibili a chi gioca e sicurezza delle
  migrazioni finché esistono. Voci `R12-01/1` … `R12-01/12`.
- **R12-02 Fase 2 — istanza pubblica di rilascio.** Contenuti in sola lettura garantita dal database; nessuna funzione di modifica,
  configurazione, importazione o deposito; partite separate per utente riconosciuto da Cloudflare Access; distribuzione separata da
  quella di preparazione.
- **R12-03 Fase 3 — telefono e accessibilità.** Miniature delle immagini, Compendio reattivo, cache dei dati di gioco versionata,
  manifesto web, blocco dello standby, Guida nella barra in basso, ricerca di Ombre e domande; Selettore, contrasti, fuoco, testo troncato.
- **R12-04 Fase 4 — congelamento.** Controllo completo dei contenuti (condizioni illeggibili, JSON malformati, chiavi orfane) corretto
  dall'utente; correzioni dei blocchi JSON scritte nei blocchi; «Ripristina» e fotografie fuori dalla versione di rilascio; miniature
  generate una volta; struttura delle partite definitiva; nessuna migrazione nel prodotto di rilascio.
