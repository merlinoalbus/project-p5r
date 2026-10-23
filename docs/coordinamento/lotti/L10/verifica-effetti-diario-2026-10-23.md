# L10 — motore degli effetti del Diario: verifica criterio per criterio (23/10/2026, Implementazione FE)

Prove sulla copia reale di p5s (`p5s-2026-10-23-1935Z`): tutte le migrazioni (gioco 153, utente 36) applicate su una copia in cartella di
scratch, poi spunta/annullo con i servizi veri. Nessuna scrittura sui dati dell'utente.

| Voce | Esito | Prova (file:riga) |
|---|---|---|
| R10-01/1 evento di storia | **fatto ora** | `shared/effettiVoce.ts` (tipo `storia`), `server/services/effettiDiStatoService.ts` (`applicaEffettiDiStato`, `annullaEffettiDiStato`), campo nell'editor `EditorEffettiVoce.tsx` (`CampoEffettoDiStato`) |
| R10-01/2 attività, /3 turno | già soddisfatto | `effettiAzioneService.ts:107` (`registraTurno`), annullo `:144` (`togliTurno`); contatore `attivita_svolta_partita` (`attivitaService.ts:531-538`) |
| R10-01/4 lettura/visione | già soddisfatto | `effettiAzioneService.ts` ramo `lettura` (`impostaLettura`); le letture non tornano indietro per scelta (D-lettura) |
| R10-01/5 incontro/rango | già soddisfatto | `effettiAzioneService.ts:114` (`registraIncontro`), rango `:121`, annullo `:145` (`annullaIncontro`) |
| R10-01/6 acquisto | **parziale** | l'effetto `acquisto` accetta solo l'offerta Aojiru (`shared/acquisti.ts:11-13`, `verificaOffertaConsumo`); gli altri articoli (Pietra Sacra 06-28 …) non hanno un tipo di effetto: serve una decisione sul modello degli acquisti generici |
| R10-01/7 Richiesta, /8 domanda, /9 esame, /10 cruciverba | **fatto ora** | stessi file di /1; setter delle pagine: `richiesteService.ts:78`, `domandeService.ts:63`, `cruciverbaService.ts:38` |
| R10-01/11 Dote | già soddisfatto (D6) | la Dote passa dal pulsante sulla voce (`DaApplicare.tsx`), mai dalla spunta |
| R10-02/1 spunta applica, togliere annulla, anche dopo ricaricamento | già soddisfatto + esteso | ricevute in `utente.effetto_applicato` (`motoreDiario.ts:168`, `:293` applica, `:365` annulla; chiamate `giornataService.ts:670`, `:679`); per i nuovi effetti di stato il «prima» sta in `utente.effetto_stato_voce` (migrazione utente 036) |
| R10-03/1 «Inizia a pulire» | **fatto ora** | migrazione 153 (`153_mansarda_pulita_dalla_voce.ts`) aggiunge `storia:mansarda-pulita` alla voce `b79da6f6…` (04-09); prova: prima 0, spunta 1, tolta 0 |
| R10-04 altri esempi | **fatti i sicuri (migrazione 154)** | collegate con effetto «storia» le voci 04-17 (primo strumento), 04-27 (caffè al Leblanc), 06-08 (chiamata a Kawakami pagata), 06-28 (Pietra Sacra), 09-02 (laptop), 11-04 (duello con Akechi); il resto sotto «Domande aperte». Pietra Sacra come acquisto resta in R10-01/6 |
| R10-05/1…5 contatori | già soddisfatto | biliardo, bagni, pesca hanno `tracciamento: svolta`; l'effetto `turno` li conta (`attivitaService.ts:552-581`); la pesca usa il suo registro (`attivitaService.ts:516-519`) |
| R10-06/1 turno con paga come promemoria | **fatto ora** | `giornataService.ts` (`testoEffettiDellaFonte`: «paga ¥X: cambiali tu a mano», solo testo, nessuna proposta); mostrata anche a voce fatta in `PartiAzione.tsx` |
| R10-07/1 punti incontro dalle risposte canoniche | **rimandata a L9** | oggi le note le sceglie l'utente alla spunta (`effettiAzioneService.ts:132`); derivarle dai dialoghi del Confidente dipende dai dialoghi di L9 |
| R10-07/2 passaggio rango, /3 annullo | già soddisfatto | `effettiAzioneService.ts:114-125`, `:145` |
| R10-09/5 voce cumulativa cruciverba 02-01 | **pronto, manca il dato** | la voce può portare un effetto `cruciverba` per ogni data rimasta; l'elenco è un abbinamento da approvare |

Nessuna Dote cambia da sola in nessun caso (D6); gli yen restano un promemoria (BON-12).
Gli abbinamenti voce → effetto (R10-12/13/14) non sono stati scritti: sono proposte per l'utente, non una scrittura automatica.

## Domande aperte sugli abbinamenti voce → evento (nessun pannello: una risposta del PM basta)
- `oratore-shibuya-ascoltato` (Yoshida 1): quale voce? Candidate 05-09 «Visita a Yoshida in Piazza Stazione: avvio del Confidente», 05-10 «Visita Yoshida per creare un legame» (rango 1), 05-22 «Ascolta il discorso di Yoshida» (rango 2). Il testo non dice «oratore»: serve la fonte Royal che lo colloca.
- `sistema-videogiochi-installato`: la voce 06-10 sera «Collegare la console TV in camera (sblocco tutorial)» è la candidata, ma l'evento parla del tavolo del Leblanc: è lo stesso fatto?
- `biliardo-rango-tecnico-3`: 8 voci di biliardo, nessuna dice il rango; serve la data in cui il rango tecnico 3 si raggiunge.
- `niijima-banco-soci-accessibile` / `niijima-banco-alte-accessibile`: solo la voce 11-14 «Palazzo di Niijima: Lobby del Piano Puntate Alte…» è vicina; non basta a dire che il banco è raggiunto.
- altre chiamate a Kawakami (07-08, 09-01, 11-14): l'evento è uno solo e lo segna già la voce 06-08.
- R10-09/5 (voce cumulativa dei cruciverba 02-01): l'effetto `cruciverba` c'è; serve confermare la voce 02-01 e l'elenco delle date rimaste.

## Aggiornamento (migrazioni 155-157, ricerca sulle fonti Royal)
Risolto con due fonti indipendenti (AllGameStaff e Samurai Gamers, walkthrough di maggio di Persona 5 ROYAL: p5r-may-walkthrough; conferma data, luogo e avvio del Confidente, non la parola «discorso»): oratore di Shibuya = voce 05-09 sera. Sistema videogiochi: una sola fonte con le date (guida italiana: TV dal 18/4, set retrogaming dal 5/6), Samurai Gamers conferma il meccanismo ma non le date → NON collegato (voce 06-10 resta da segnare a mano) finché non c'è una seconda fonte. Non risolvibili: biliardo rango tecnico 3 (Perizia 3 + Stecca jump, nessuna data), banchi di Niijima (le fonti descrivono una sola cassa, nella lobby dei soci, raggiungibile l'11-13), cumulativo cruciverba 02-01 (il 02-01 non è un giorno di cruciverba nelle fonti).
Nuovo effetto `articolo` (R10-01/6, R10-08): `effettiDiStatoService` + `impostaAcquisto`; migrazione 156 (31 articoli su 23 voci); 157: 44 domande (le altre 5 voci «Rispondere alla domanda» le collega la 158), 32 cruciverba per data e 2 per risposta (Ustione 08-16 → cruciverba del 17/8, Hacker 08-29 → 30/8); la voce 10-31 «cruciverba scolastico (Stand)» non è collegata (non esiste nella guida, G-037); 155: 1 evento (oratore di Shibuya). Provate sulla copia p5s: effetti `storia` vedi l'esito nel resoconto, `articolo` 31, `domanda` 44, `cruciverba` 34; nessuna voce modificata dalle tre; spunte identiche; secondo avvio invariato.
