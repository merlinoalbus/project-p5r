# L9 «Confidenti, attività, calendario» — preparazione dei blocchi per le sessioni Sonnet

Analisi dati, 2026-10-23, sola lettura. Richiesta del PM: per ogni requisito padre cosa c'è nel DB e nel codice, fonti, complessità, dipendenze, blocchi in ondate, e le voci già soddisfatte con la prova file:riga. Niente commit.

## 1. In breve

- **L9 ha 27 requisiti padri (BON-10 compreso) e 281 voci.** Tre padri pesano quasi tutto: `R9-20` 173 voci (una per evento del calendario), `R9-01` 23 (una per Confidente) e `R9-07b` 23 (una per Confidente). I restanti 24 padri hanno 62 voci. Nove padri hanno una voce sola.
- **L6 ha già consegnato una parte di L9**: gli inviti (tabella `confidente_invito`, lettura, gesto «Invito avvenuto», condizioni), i requisiti dei Confidenti modificabili, l'editor informativo della disponibilità (BON-10, in una versione diversa da quella di L9), `attivita.sede_chiave`/`condizioni_json`/`effetti_json`/`paga_yen`/`paga_massima`/`quiz_json`. **Il resto non c'è**: il modello strutturato della disponibilità, i ranghi con `modo`, il modulo unico dei punti, la pagina `/guida/attivita/:chiave`, il giorno unico, gli esami in una tabella, i 173 eventi collegati.
- **Divergenza fra i documenti da sciogliere prima di R9-20** (§6.1): `requisiti.md` dice che i 173 eventi diventano voci del diario; `modifiche.md` (decisione dell'utente del 20/10, «sul diario già validato non aggiungere le voci») li lascia eventi collegati per chiave. Le 173 voci del piano atomico parlano di «raccordare»: seguono la seconda lettura.
- **Proposta**: 7 blocchi di sviluppo + 1 di chiusura, in 4 ondate (§5). Blocchi BE e FE separati come chiede il piano.
- **Voci già soddisfatte o quasi**: sei con prova (§4). Non le ho chiuse io.

## 2. Stato di partenza (copia di p5s portata a 146, `sim-142b`)

| Cosa | Oggi |
|---|---|
| `confidente_disponibilita` | 23 righe, colonne solo di testo (`giorni_json`, `fasce_json`, `luogo`, `sblocco_data`, `sblocco_requisiti`, `note`, `note_generali`, `fonti_json`): **nessuna colonna `modo`, giorni/fasce strutturati, eccezioni, motivo senza luogo**. Prosa non corretta: Yusuke con le date d'itinerario, Gemelle «dopo il completamento del Palazzo di Madarame», Ann con «anche sera con la pioggia», Kasumi con giorni vuoti, Igor/Sae/Morgana senza motivo |
| `confidente_luogo` | **non esiste**; il legame passa da `luogo.confidenti_json` |
| `confidente_rango` | 162 righe, colonne `punti_necessari` (nessun `modo`/`fonte`) |
| `confidente_requisito` | 177 righe; il rango 1 ha il requisito `data` con `dal` per 18 Confidenti (Gemelle 05-18, Ohya 07-05, Kawakami 06-04, Takemi 04-18…) |
| `confidente_invito` | 6 righe (ryuji 05-29 e 07-03, akechi 07-29, makoto 07-30, ann 08-06, futaba 10-09), tutte `origine='seed'` |
| `confidente_abilita` 159, `confidente_dialogo` 223, `confidente_dote_incontro` 39 | invariate, non modificabili salvo la Dote per incontro |
| `attivita` | 30 (4 lavori, 7 videogiochi, 6 mini-gioco…); `sede_chiave` 29, `condizioni_json` 16 non vuote, `effetti_json` non vuoto 14; **le 7 attività senza nulla** sono ancora senza effetti (allenamento-camera-leblanc, allenamento-palestra-protein-lovers, curry-leblanc, jazz-club-kichijoji, lettura-metropolitana, sfida-pesca-guardiano-ichigaya, tempio-vecchio-kichijoji); `paga_yen`/`paga_massima` solo sui 4 lavori; `quiz_json` solo Triple Seven |
| Calendario | `giorno_calendario` 346 (giorno della settimana in forma «Lunedi» senza accento) e `giorno_percorso` 346 (meteo, trama, vincoli, `azioni_json`): **non esiste `giorno`**; `evento_calendario` 173; `settimana_guida` 42; `allerta_meteo` 74; `meteo_partita` 1 riga |
| Esami | `esame` 4 con `domande_json` (≈1 KB ciascuno), `domanda` 78 righe: **non unificati** (le 31 domande doppie sono ancora doppie) |
| Partita | `utente.confidente_partita` 46, `utente.domanda_partita` 12, **`utente.esame_piazzamento_partita` non esiste** |
| Nome «Junichi» | ancora in `evento_calendario.titolo` (1) e `settimana_guida.riassunto` (1) |
| Diario | `voce_giornata` 998 voci (l'impronta «prima» di L9 era su 997: la voce in più è lavoro dell'utente, non toccata) |
| Moduli di codice assenti | `shared/puntiConfidenti.ts`, `shared/date.ts` `giornoDellaSettimana`, `AttivitaDettaglioPage.tsx`, rotta `/confidenti` ed elenco, `confidentiService` di scrittura (ranghi, dialoghi, anagrafica, luoghi, inviti: solo lettura e gesto della partita), `PUT /compendio/giorni/:data` |
| Moduli già presenti | `server/services/inviti.ts` (109 righe), `disponibilitaConfidentiService.ts` (218, editor informativo con storico e proposta Makoto), `requisitiConfidentiService.ts`, `semaforiService.ts`, `meteoService.ts`, `src/components/confidenti/{InvitiConfidente,EditorDisponibilita}.tsx`, `ConfidenteDettaglioPage.tsx` (291 righe) |
| Formula dei punti | **due copie**: `server/services/partiteService.ts:262-266` (`puntiConfidente`) e `src/utils/punti.ts:18` (`anteprimaPunti`); entrambe applicano ×1,2 all'invito (L9 vuole non applicarlo finché G-020 non lo conferma) e il bonus esami a tutti i Confidenti, non ai 7 |
| Link rotto | `src/components/mappe/VisoreMappa.tsx:1069` punta ancora a `/confidenti`, che il router non ha (`src/router.tsx:76` solo `confidenti/:chiave`) |
| Disponibilità e L5 | `shared/disponibilitaConfidenti.ts` dichiara esplicitamente le informazioni «descrittive, non requisiti operativi»: va riconciliato con il modello strutturato di L9 (§6.2) |

## 3. I 27 requisiti padri

Complessità: **B** bassa (una sessione breve), **M** media (una sessione, più file), **A** alta (più sessioni o gate del revisore). Voci = figlie in `pianoAtomico`.

### 3.1 Confidenti

| Req | Voci | Oggi nel DB e nel codice | Fonti per completarlo | Compl. | Dipende da |
|---|---:|---|---|---|---|
| **R9-01** disponibilità in un solo posto | 23 | Solo prosa in `confidente_disponibilita`; legame luoghi in `luogo.confidenti_json` (34 luoghi); nessun lettore strutturato (`compendioService.ts` dettaglio) | G-016b/d, G-033, **G-036** (tabella degli 8 Confidenti), L5 (luoghi per chiave) | **A** | L5 consegnato |
| **R9-02** 4 Confidenti senza luogo; Kawakami, Yusuke, Gemelle | 4 | igor, gemelle, sae, morgana senza luogo (confermati); prosa contraddittoria ancora presente | G-016b, G-016d | **M** | R9-01 |
| **R9-03** avviso del diario fuori giorno/fascia | 1 | `giornataService.ts` non calcola avvisi di disponibilità (`avvisi` in `types.ts` sono di altro tipo); 25+13 voci fuori giorno/fascia da mostrare senza riscrivere | modulo di R9-01; valutatore L6 | **M** | R9-01, B3 |
| **R9-04** data di sblocco = requisito del rango 1 | 4 | Il requisito `data` c'è (`confidente_requisito`) ed è letto dalla scheda (`ConfidenteDettaglioPage.tsx:177`) e dal valutatore (`condizioni/valutatore.ts:160-168`); restano il Calendario (eventi `sblocco` scritti a mano, `calendarioService.ts:42`) e gli avvisi del diario | L6, G-017 | **M** | R9-03, R9-21 |
| **R9-04b** avvio e incontro di trama distinti | 4 | Le date del rango 1 sono già giuste (Ohya 07-05, Kawakami 06-04, Gemelle 05-18, Takemi 04-18); manca l'incontro come **evento distinto** (Ohya 18/6, Kawakami Becky 3/6) e la condizione composta di Kawakami (Coraggio rango 3 dall'8/6) | G-017, G-023 | **M** | R9-04, R9-20 |
| **R9-05** «Junichi Iwai» → Munehisa | 1 | `evento_calendario.titolo` 1 e `settimana_guida.riassunto` 1 ancora con «Junichi» | dato noto | **B** | — |
| **R9-06** nome dal vivo nelle voci | 1 | `nomeRiferimento` (`azioniStrutturateService.ts:94`) già usato per i riferimenti (`giornataService.ts:85`); mostrare il nome attuale quando il testo ne cita uno vecchio (80/445 voci) | — | **M** | — |
| **R9-07** editor di punti, abilità, Dote, dialoghi, regali, luoghi | 6 | Solo la Dote per incontro si modifica (`routes/compendio.ts:427`, `DotiIncontro`), il requisito (`:404-421`), il costo del regalo (`RipristinoCostoRegalo`); ranghi, abilità, dialoghi, anagrafica e luoghi non hanno scritture né «Ripristina» | `modifiche.md` §1.3, `seed_json` | **A** | R9-07b, R9-01 |
| **R9-07b** modo di avanzamento e soglia dei ranghi | 23 | `confidente_rango` ha solo `punti_necessari`; nessun `modo`/`fonte` | **G-020** (tabella regole), G-016d | **M** (23 voci regolari) | — |
| **R9-07c** inviti: editor e condizioni | 6 | Lettura, condizioni e gesto «Invito avvenuto/Annulla» ci sono (L6): `inviti.ts:59,83,99`, `routes/partite.ts:168-173`, `InvitiConfidente.tsx:39`, `routes/compendio.ts:203`; **manca la scrittura delle righe** (aggiungi, modifica, togli → cestino): nessun `INSERT/UPDATE` su `confidente_invito` fuori dalle migrazioni | L6, G-023 | **M** | R9-07 |
| **R9-08** modulo unico dei punti | 4 | Due copie (`partiteService.ts:262`, `src/utils/punti.ts:18`); **esame al 100% dei Confidenti**, invito ×1,2 applicato; manca la tabella `esame_piazzamento_partita` | G-016c, G-020 | **M** | — |
| **R9-09** pagina del Confidente e elenco | 3 | `/confidenti/:chiave` c'è; Personaggi porta lì (`PersonaggiPage.tsx:58`); **`/confidenti` non c'è** (`router.tsx:76`) e il link del visore resta rotto (`VisoreMappa.tsx:1069`) | `modifiche.md` §1.4 | **B** | — |

### 3.2 Attività

| Req | Voci | Oggi | Fonti | Compl. | Dipende da |
|---|---:|---|---|---|---|
| **R9-10** sede, sblocco, effetti, pagina | 3 | Colonne presenti e lette (`attivitaService.ts:48,102`: `sede_chiave`, `condizioni_json`, `effetti_json`); pagina singola `/guida/attivita/:chiave` assente (`router.tsx:94` solo l'elenco) | `modifiche.md` §2 | **M** | L5, L6 |
| **R9-11** le 7 attività registrano le Doti | 1 (+acquisizione) | 7 attività con `effetti_json='[]'` e `doti_json='[]'`; altre 7 con Dote solo in prosa | **scheda dell'Esperto «Doti delle attività»: non c'è, va chiesta** (il documento dice «da chiedere») | **M** (bloccata sui dati) | Esperto |
| **R9-12** paga canonica | 3 | Colonne sull'attività e DTO (`attivitaService.ts:102`, `types.ts:1874`, `AttivitaPage.tsx:61`); `registraTurno` (`attivitaService.ts:552`) **non legge la paga** e la paga non arriva agli yen (D8, di L10); diario: nessun riferimento alla paga | L10 D8 | **B** (lettura), **A** se include gli yen (L10) | L10 per gli yen |
| **R9-13** giorni del quiz in un posto | 3 | `quiz_json` fonte unica (`shared/quizAttivita.ts:10`), letta da `attivitaService.ts:306-307` e dal diario (`giornataService.ts:109-117`) | — | **B** (verifica) | — |
| **R9-14** descrizioni ripetute | 1 | Le viste ricopiano `dettagli`/`paga` in prosa accanto ai campi strutturati | `modifiche.md` §2 | **B** | R9-10 |

### 3.3 Calendario, giorni, esami

| Req | Voci | Oggi | Fonti | Compl. | Dipende da |
|---|---:|---|---|---|---|
| **R9-15** un solo giorno | 3 | Due tabelle da 346; meteo preso con `COALESCE` in `meteoService.ts:21-22`; il Calendario legge `giorno_calendario` (`calendarioService.ts:40-41`) e la guida del percorso `giorno_percorso` (`percorsoService.ts:31,44`); 12 giorni divergenti, 05-24 con nota | **G-016a** | **A** (migrazione + 6 lettori) | — |
| **R9-16** giorno della settimana calcolato | 1 | Salvato in 5 formati (`GIORNI` in `calendarioService.ts:14`, `GIORNI_SETTIMANA` in `shared/condizioniSpillo.ts`) | `shared/date.ts` nuovo | **B** | R9-15 |
| **R9-17** allerte come tag del giorno | 1 | `allerta_meteo` 74 righe, lette per data (`calendarioService.ts:8,48` → `meteoService.allerteDiOgniGiorno`) | — | **B** | R9-15 |
| **R9-18** esami in una tabella | 3 | `esame.domande_json` (4 righe) e `domanda` (78) non unificati; la 078 ha solo copiato | G-036 (paghe, quiz, esami) | **M** | — |
| **R9-19** editor del giorno | 3 | Nessun `PUT` sul giorno | R9-15 | **M** | R9-15 |
| **R9-20** 173 eventi collegati per chiave | 173 | `evento_calendario` 173 invariato: storia 61, sblocco 46, festa 24, scadenza 18, vacanza 11, esame 8, meteo 4, consiglio 1; non citano le entità | `modifiche.md` §3.2 | **A** (volume e decisione §6.1) | R9-15, R9-21 |
| **R9-21** scadenze e sblocchi ricavati | 3 | `calendarioService.ts:42` legge gli eventi scritti a mano e li usa per `prossimeScadenze`; le finestre dei Palazzi esistono (`condizioni/finestrePalazzi.ts:9`) | L3, L4, L6 | **A** | R9-15 |
| **R9-22** Calendario = vista del diario | 1 | `CalendarioPage.tsx` mostra eventi, non voci del diario né modulo comune | `modifiche.md` §3.2 | **M** | R9-20, R9-21 |
| **R9-23** 42 settimane consultabili e collegate | 1 | `calendarioService.ts:28` (`settimaneGuida`) e il campo `settimana` del giorno (`:11,19`) ritornano le 42 settimane | — | **B** (da non rompere) | R9-15 |
| **BON-10** editor disponibilità senza «Applica la proposta» | 1 | Il pulsante c'è (`EditorDisponibilita.tsx:89`) e dipende da `c.proposta?.applicabile` (`disponibilitaConfidentiService.ts:123-125`): c'è solo la proposta Makoto | R9-01 | **B** | R9-01 |

## 4. Voci già soddisfatte o quasi (prove, non chiuse)

| Voce | Prova | Limite |
|---|---|---|
| **R9-04/1** requisito del rango 1 nella scheda | `src/pages/ConfidenteDettaglioPage.tsx:177` legge `requisiti.dati.ranghi.find(r.rango === 1)` e non la prosa; `server/services/requisitiConfidentiService.ts` | Resta in DB e nell'editor informativo la prosa `sblocco_data` (`EditorDisponibilita.tsx:11`): non è mostrata come sblocco, va tenuta come nota |
| **R9-04/2** requisito del rango 1 nei semafori | `server/services/condizioni/valutatore.ts:160-168` (condizione `data` con `dal`), usata dal valutatore unico di L6; i `dal` sono corretti: Ohya 07-05, Kawakami 06-04, Gemelle 05-18 | Da riverificare sui 6 casi di app.md §0.1 con la partita di prova prima di chiuderla |
| **R9-07c/3** registrazione diretta dell'invito | `server/services/inviti.ts:83` (`registraInvito`), `server/routes/partite.ts:168-173`, `src/components/confidenti/InvitiConfidente.tsx:39`; controllo «solo con le condizioni vere» a `inviti.ts:89` | Vale per i 6 inviti esistenti; l'invito di Ryuji del 29/5 senza voce ha il gesto qui |
| **R9-07c/4 e /5** lettori dell'invito nelle condizioni di quartiere e luogo | `server/services/condizioni/condizioneEffettiva.ts:25`, `server/services/sbloccoLuoghi.ts:8`, `inviti.ts:64` (`invitiCheAprono`); FE: `src/pages/QuartierePage.tsx:247` e `src/pages/LuogoPage.tsx:132` (mostrano `InvitiConfidente` filtrato sul posto aperto) | Da verificare con «aggiungi l'invito di Makoto del 30/7 → compare nella condizione di Ikebukuro» (richiede la scrittura delle righe, R9-07c/1) |
| **R9-09/2** Personaggi porta alla scheda del Confidente | `src/pages/PersonaggiPage.tsx:58` | — |
| **R9-13/1, /2, /3** giorni del quiz | fonte `shared/quizAttivita.ts:10` (`quiz_json`, migrazione 105); lettori `attivitaService.ts:306-307` (guida) e `giornataService.ts:109-117` (diario, `quizDellaVoce`) | Verificare che nessun'altra copia (`dettagli`, prosa) ripeta i giorni |
| **R9-23/1** settimane consultabili | `server/services/calendarioService.ts:28` (`settimaneGuida`) e il campo `settimana` del giorno a `:11,19` | Vincolo da mantenere con il giorno unico |
| **R9-07/3** editor della Dote per incontro | `server/routes/compendio.ts:427` (`PUT …/doti-incontro`), `src/components/confidenti/DotiIncontro.tsx` | Va riletto se la Dote resta «solo al passaggio di rango» (decisione 2026-10-17) |

Quasi soddisfatte, con quel che manca: **R9-12/1** (colonne e DTO ci sono, `attivitaService.ts:102`; restano le altre copie della paga in prosa), **R9-10/1** (sede 29/30, condizioni 16: `attivitaService.ts:48`; il resto è della pagina), **R9-17/1** (le allerte sono tag per data, `calendarioService.ts:8,48`: manca solo la lettura dal giorno unico).

## 5. Blocchi assegnabili

Regole per tutti: zero test nuovi; typecheck, lint e build verdi; nessun commit per blocco; migrazioni append-only con copia di sicurezza e il primo numero libero al commit (nessuno riservato); BE su `server/`+`shared/`, FE su `src/`; verifica avversariale distinta a fine blocco; diario 04-01..06-01, Kamoshida, Madarame e stati della partita mai toccati (R9-24…28).

| Blocco | Contenuto | Voci | Compl. | Dipende da |
|---|---|---|---|---|
| **A** Contratti e punti | `shared/puntiConfidenti.ts` (formula G-016c/G-020: base, arcano ×1,5, esami ×1,2/×1,5 per i 7, eccedenza), `shared/date.ts` `giornoDellaSettimana`, tipi DTO in `shared/types.ts` | R9-08/1, 08/2 | M | — |
| **B** Dati dei Confidenti (migrazione) | Schema `modo`/struct/eccezioni/`motivo_senza_luogo`, `confidente_luogo` dai 34 luoghi, ranghi da G-020 (`modo`, `fonte`), correzioni (Kawakami, Yusuke, Yoshida, Mishima, Gemelle, Ann), Kasumi `su-messaggio`, «Junichi» → Munehisa, la tabella `esame_piazzamento_partita`; poi l'uscita del pulsante di proposta | R9-01 (23), R9-02 (4), R9-07b (23), R9-05, BON-10 = 52 | **A** (volume e gate sulla G-036) | L5 |
| **C** Dati del calendario (migrazione) | Tabella `giorno` da `giorno_calendario`+`giorno_percorso` (346; meteo in due fasce, 05-24 con nota), domande d'esame unificate (109 righe, 97 visibili, 12 riassuntive conservate per i segni), colonne `riferimento_tipo/chiave` su `evento_calendario` | R9-15 (3), R9-18 (3) = 6 | **A** | — |
| **D** Confidenti: servizi | Disponibilità strutturata con «oggi», elenco, scritture (anagrafica, ranghi, dialoghi, abilità, regali, luoghi, «Ripristina»), scrittura degli inviti con cestino, avvisi del diario, nomi dal vivo, punti con piazzamento (`PUT …/esami/:esame/piazzamento`), OpenAPI | R9-03, R9-04 (4), R9-04b (4), R9-06, R9-07 (6), R9-07c (6), R9-08/3, 08/4, R9-09 (3) = 27 | **A** (2–3 sessioni) | A, B |
| **E** Attività | Pagina `/guida/attivita/:chiave` e scritture, effetti (con «Effetti da completare» finché la scheda dell'Esperto manca), paga letta da turno e diario, giorni del quiz, descrizioni | R9-10 (3), R9-11, R9-12 (3), R9-13 (3), R9-14 = 11 | M | scheda Esperto per R9-11 |
| **F** Calendario: servizi | Giorno unico nei lettori (`calendarioService`, `meteoService` senza `COALESCE`), settimana calcolata, tag ricavati (sblocchi dai rango 1 e dalle condizioni, scadenze dalle finestre dei Palazzi), `PUT /compendio/giorni/:data` con «Ripristina», allerte e settimane dal giorno | R9-16, R9-17, R9-19 (3), R9-21 (3), R9-22, R9-23 = 10 | **A** | C |
| **G** Raccordo degli eventi | Un esito per ciascuno dei 173 eventi: collegamento per chiave, oppure elenco dei non collegabili; nessuna voce nel diario validato | R9-20 (173) | **A** (volume; la decisione §6.1) | C, F |
| **H** FE | `ConfidenteDettaglioPage` riordinata (rango, disponibilità di oggi, dialoghi in cima), `/confidenti` ed elenco con «oggi», chip «Confidenti disponibili oggi», link del visore, `AttivitaDettaglioPage`, Calendario (lista a 375, tag che portano a voce/oggetto), pagina del giorno con «Modifica il giorno», piazzamento in `DomandePage`, `CruciverbaPage` ordine | (nessuna voce propria: sono i criteri UX e layout R9-30…33 e i FE dei blocchi D, E, F) | **A** (3 sessioni, per area) | D, E, F |
| **I** Chiusura | Invarianti prima/dopo sulla copia di p5s (diario, Kamoshida/Madarame, stati dei Confidenti, turni, domande, meteo della partita), riesame avversariale, aggiornamento dei documenti | R9-24…33 (vincoli, 0 voci) | M | tutti |

Somma delle voci: A 2 + B 52 + C 6 + D 27 + E 11 + F 10 + G 173 = **281**.

### 5.1 Ondate

```
Ondata 1 (in parallelo):   A    B    C
Ondata 2:                  D (dopo A e B)    E    F (dopo C)
Ondata 3:                  G (dopo C e F)    H-FE per area, dietro D, E, F
Chiusura:                  I
```

- **Conflitti di file da coordinare** (un solo proprietario alla volta): `shared/types.ts`, `server/routes/compendio.ts`, `server/db/migrations/index.ts`, `server/services/partiteService.ts` (A e D), `src/pages/ConfidenteDettaglioPage.tsx` (D e H), `server/services/calendarioService.ts` (F e G).
- **B e C sono migrazioni**: nessuna scrive sul diario o sullo stato della partita; si provano con l'impronta, l'idempotenza e un confronto prima/dopo come per le 142–146.
- **G è il blocco più grosso ma il più meccanico**: dopo la decisione di §6.1 ogni evento ha un esito dichiarato.

## 6. Da decidere o chiarire prima di assegnare

1. **Eventi del calendario: voci o eventi?** `requisiti.md` R9-20 («diventano voci del diario») contro `modifiche.md` §3.2 (decisione dell'utente 2026-10-20: restano eventi, nessuna voce nel validato). Serve una frase del PM: proposta, seguire `modifiche.md` e riscrivere R9-20 e le 173 voci come «raccordo per chiave».
2. **Disponibilità: descrittiva o strutturata?** L'editor del BON-10 (`shared/disponibilitaConfidenti.ts:1`) dice che le informazioni «non sono requisiti operativi». L9 R9-01/R9-03 le vuole valutabili (avvisi del diario). Proposta: il modello strutturato di `modifiche.md` §1.1 diventa la fonte; le colonne di testo restano come note e l'editor informativo continua a modificare quelle.
3. **Scheda dell'Esperto «Doti delle attività»**: non esiste. Senza, R9-11 resta «Effetti da completare» (nessun valore inventato).
4. **G-036** (le 8 disponibilità strutturate) e **G-020** (regole dei ranghi) sono nel registro: vanno consegnate ai blocchi B e D come tabelle, non da rileggere.
5. **Moltiplicatore dell'invito ×1,2**: oggi applicato (`partiteService.ts:264`, `src/utils/punti.ts:19`); `modifiche.md` lo toglie finché G-020 non lo conferma. Cambia i punti calcolati: decisione del PM.
6. **Bonus esami**: oggi a tutti i Confidenti; la regola è per 7 (Ryuji, Makoto, Haru, Sojiro, Kawakami, Kasumi, Ann). Anche questa cambia i punti.
7. **Paga negli yen**: è D8 di L10; R9-12 si ferma alla lettura unica.
8. **Voce di Igor del 06-01 sera e le 4 voci `igor` delle Gemelle**: solo elenco «Da rivedere», nessuna scrittura (già deciso).

## 7. Limiti

- Ho letto DB (copia a 146) e codice; non ho eseguito l'app. Le righe citate sono di oggi, non quelle di `app.md` del 20/10.
- Le «voci soddisfatte» non sono verificate con una partita di prova: sono prove statiche.
- Le stime di complessità sono mie. La G-036 e la G-020 sono nel registro dell'Esperto, che non ho riletto per intero.
- Il numero della migrazione non è riservato: si prende il primo libero al commit (la 147 esiste ma non è registrata).
