# Controllo interno dei punti dei Confidenti (R10-11/D) — 24/10/2026

**Che cos'è.** Un ricalcolo cronologico **in sola lettura**, senza interfaccia e senza scritture: per ogni Confidente sbloccato di ogni partita, rilegge
nell'ordine del gioco (giorno e fascia) le ricevute delle spunte del Diario (`spunta_voce_partita.effetti_json.confidente.punti`), i regali con punti
(`regalo_partita.punti_dati`) e i passaggi di rango registrati (`incontro_confidente_partita`, `passaggio = 1`), applica le regole di G-020 §4-5 e
confronta il risultato con `confidente_partita`. Regole del ricalcolo: i punti si sommano solo dove il rango del momento sale a punti
(`confidente_rango.modo = 'punti'`, soglia > 0); a ogni passaggio di rango l'eccedenza sulla soglia passa al rango successivo.

**Dove è stato eseguito.** Su una copia in cartella temporanea della copia reale di p5s (gioco.db schema 138 + partite.db utente 30, portate alle
migrazioni correnti). Nessun dato dell'istanza è stato toccato; lo strumento non resta nel repository.

**Limiti.** Non vede i punti impostati a mano dalla pagina (`punti` esplicito, «Annulla ultimo», correzioni): per questo le differenze sono attese
dove l'utente ha corretto a mano. Le ricevute registrano i punti già moltiplicati con le regole di allora (senza troncamento all'intero: es. 7,5).

## Esito sulla copia reale (13 Confidenti con rango > 0)

| Partita | Confidente | Salvato | Ricalcolato | Lettura |
|---|---|---|---|---|
| 1 | Ann | r5 / 7,5 | r5 / 0 | 7,5 viene dal vecchio calcolo senza troncamento (5 × 1,5); le due ricevute da 15 sono a ranghi poi superati |
| 1 | Sojiro | r3 / 50 | r3 / 25 | punti impostati a mano (passaggio dalla pagina con `punti_prima` 15 e 35): non ricostruibili dalle ricevute |
| 1 | Takemi | r7 / 15 | r7 / 8 | quattro ricevute da 15 con passaggi dalla pagina: il ricalcolo riporta 4, 4 e 8 punti; il salvato non ha riporto (regola precedente «ripartono da zero») |
| 1 | Yoshida | r3 / 10 | r3 / 0 | Yoshida non ha soglie (`modo` evento a tutti i ranghi): le tre ricevute (5+10+5) furono contate dal vecchio motore; il nuovo motore non le somma più |
| 1 | Ryuji, Igor, Gemelle, Kasumi, Maruki, Mishima, Morgana | uguali | uguali | nessuna differenza |
| 2 | Igor, Ryuji | uguali | uguali | nessuna differenza |

**Conclusione.** I 4 scostamenti sono spiegati da: (a) correzioni a mano (Sojiro), (b) punti accumulati con le regole precedenti — nessun riporto,
nessun troncamento, accumulo anche dove il rango non è a punti (Takemi, Ann, Yoshida). Nessun dato salvato è stato modificato (R10-11h): il
ricalcolo serve solo a mostrare dove la regola nuova darebbe un valore diverso, e **qualsiasi allineamento è una decisione dell'utente**.
