# Diario → infiltrazione: elenco da approvare (L3)

Che cosa si chiede. Le voci del diario dei Palazzi oggi dicono solo «Palazzo di Kamoshida» o «Palazzo di Madarame»: toccandole si apre la
scheda del Palazzo sulla **prima** infiltrazione, non su quella del giorno. Con L3 ogni voce può indicare anche la sua infiltrazione: si
aggiunge un collegamento, **senza cambiare** testo, ordine, giorno, fascia, uid o spunte della voce. Niente viene scritto senza il tuo sì.
Finché non approvi, le voci di Palazzo aprono la prima infiltrazione **non ancora completata** nella partita attiva.

Fonti: voci del diario e infiltrazioni lette dalla copia di produzione del 20/10 (sola lettura); ricostruzione di Analisi dati
(`lotti/L3/dati.md` §7). Per la partita reale (p1) di Madarame la proposta è confermata dagli orari: la spunta della voce del diario arriva
subito dopo i segni sulle voci di quell'infiltrazione.

## Voci con una proposta certa (9)
| # | Data · fascia | Voce del diario (testo d'inizio) | Infiltrazione proposta | Perché | Certezza |
|---|---|---|---|---|---|
| 1 | 04-11 · giorno | «Prima infiltrazione tutorial nel Palazzo di Kamoshida: combattimento contro Piromani delle cripte…» | **Tutorial Palazzo 11/04** | la data è nel nome del tutorial | certa |
| 2 | 04-12 · giorno | «Seconda infiltrazione tutorial nel Palazzo di Kamoshida: apprendi le basi del combattimento.» | **Tutorial Palazzo 12/04** | la data è nel nome del tutorial | certa |
| 3 | 04-15 · giorno | «Palazzo di Kamoshida, terza incursione. Tutorial cattura Ombre, salva Ann e libera Carmen» | **Tutorial Palazzo 15/04** | la data è nel nome del tutorial | certa |
| 4 | 04-22 · giorno | «Si va automaticamente al Palazzo con allerta al 100%… poi Sala del trono e Stanza del Tesoro con il boss…» | **Rubare i desideri del Cuore** | è la visita del furto (boss e Tesoro), l'ultima esplorazione di Kamoshida | certa |
| 5 | 05-16 · giorno | «Palazzo di Madarame: infiltrazione iniziale.» | **Prima Infiltrazione al Museo** | prima visita; in p1 i segni del 13/10 dalle 18:06 e la spunta del diario alle 18:37 | certa |
| 6 | 05-19 · giorno | «Palazzo di Madarame - Scopri dov'è il Tesoro» | **Scopri dov'è il Tesoro** | il nome dell'infiltrazione è nel testo; in p1 spunta del 15/10, segni dal 13 al 17/10 | certa |
| 7 | 05-20 · giorno | «Terza visita al Palazzo di Madarame mentre nel mondo reale Ann e Morgana fanno visita a Yusuke.» | **Disabilita i sistemi di sicurezza** | terza visita = terza infiltrazione; in p1 segni del 16/10 20:05–20:50, spunta 20:51 | certa per p1 |
| 8 | 05-27 · giorno | «Palazzo di Madarame: Nelle profondità del Museo.» | **Nelle profondità del Museo** | il nome dell'infiltrazione è nel testo; in p1 segni 17–18/10, spunta 18/10 21:27 | certa |
| 9 | 06-01 · giorno | «Palazzo di Madarame: raccolta dei tesori e scontro con il boss finale» | **Il furto del Cuore di Madarame** | è la visita del furto; in p1 segni del 19/10 19:53–20:24 | certa |

## Voce ambigua (1)
| Data · fascia | Voce del diario | Possibili infiltrazioni | Proposta |
|---|---|---|---|
| 04-20 · giorno | «Palazzo di Kamoshida: infiltrazione completa in un unico viaggio.» | **Vecchio Castello** (01), **Tetto del Vecchio Castello** (13), **Ispeziona l'interno della torre** (15): un viaggio solo copre tre infiltrazioni | nessun collegamento: la voce apre la prima infiltrazione non completata (oggi «Vecchio Castello»). In alternativa puoi indicarne una |

## Voci di Palazzo che non riguardano un'infiltrazione (3, nessun collegamento)
04-21 «…Invia lettera di sfida» (Kamoshida), 05-31 «…invio della lettera di sfida» (Madarame), 05-27 «Sosta nella Stanza di Velluto».
Continuano ad aprire la scheda del Palazzo come oggi.

## Aggiornamento 2 (2026-10-20)
Il censimento completo di Analisi dati (`dati.md` §8) copre **45 voci di tutti i Palazzi**; 11 descrivono più infiltrazioni: il campo diventa
un **insieme ordinato** (più infiltrazioni per voce), e «Entra» apre la prima non completata. Il 04-20 ha quindi una proposta (le tre
infiltrazioni nell'ordine). Questo elenco resta come traccia delle prime 10.

## Aggiornamento (decisione dell'utente, 2026-10-20)
Non serve più rispondere qui: nell'app ogni voce di Palazzo ha il campo **«Infiltrazione»** selezionabile (le infiltrazioni già esistenti del
Palazzo, oppure «nessuna»). Per queste 9 voci il campo mostra la proposta con il motivo e il pulsante **«Conferma»**; per il 04-20 nessuna
proposta. Nessun legame viene scritto finché non lo scegli tu. Le istruzioni sotto restano solo come traccia.

## Come rispondere (superato)
«Sì a tutte» oppure i numeri da escludere o da cambiare (es. «sì 1–9, la 04-20 su Tetto»). Dopo il sì, i collegamenti si scrivono con una
migrazione che contiene esattamente questo elenco (uid completi qui sotto) e si possono sempre togliere o cambiare dalla voce del diario.

<details><summary>uid completi (per l'implementazione)</summary>

| # | uid | infiltrazione (chiave) |
|---|---|---|
| 1 | f3d6ddf19b62f76616e3de65ac00f2b9 | kamoshida-1-tutorial-palazzo-11-04 |
| 2 | e4290542b3376439f92c71b76e18b64e | kamoshida-tutorial-palazzo-12-04 |
| 3 | 6fd5031403067e22f9306de902cf57a6 | kamoshida-tutorial-palazzo-15-04 |
| 4 | cdc7e3a818e612b94efe7853135f7617 | kamoshida-rubare-i-desideri-del-cuore |
| 5 | 445731a85c54f6d1fa541f10ee8c64d1 | madarame-01-entrata-del-museo |
| 6 | cea365dae255a9787afdf99661e5aa0f | madarame-scopri-dove-il-tesoro |
| 7 | 464ccfe40659a41b6b201947ed776312 | madarame-disabilita-i-sistemi-di-sicurezza |
| 8 | 6ebb178b6fc4009d3335635446a2c864 | madarame-nelle-profondita-del-museo |
| 9 | b9371f8061aedd71262a200b98d18bd0 | madarame-il-furto-del-cuore-di-madarame |
| ambigua | a513390589dcbc75a7ae4ef1aa798d06 | — |
Nota: in `dati.md` §7 l'uid breve della 05-16 è scritto `44573158`; quello vero è `445731a8…` (verificato su produzione e su data/).
</details>
