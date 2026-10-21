# N14 — Banchi del Palazzo di Niijima, migrazione134

## Mandato e fonti

La specifica originale L6 del commit `43ad8889` richiede una sola finestra del Palazzo (R6-16) e distingue il Palazzo concluso dall’arco narrativo (R6-16b). Non autorizza a convertire una frase in uno stato senza una fonte (modifiche §4.2).

- [AGS — Palazzo di Sae](https://www.allgamestaff.it/persona-5-royal/palazzo-di-sae/): progressione delle lobby, bancone dei soci prima della Tessera puntate alte e bancone delle puntate alte dopo il passaggio cognitivo. Le tappe del 13/14 novembre sono un itinerario, non date universali di apertura.
- [AGS — Elenco dei negozi](https://www.allgamestaff.it/persona-5-royal/elenco-dei-negozi/): tre offerte della lobby dei soci e tre della lobby delle puntate alte. Stock, valuta e acquisti non sono oggetto della rettifica.
- [Testo nativo P5R, script `fscr0157_011_140.bf`](https://mysh.dev/tools/persona/5r/view?file=%5CdataR.cpk%5Cscript%5Cfield%5Cfscr0157_011_140.bf): l’esecutore ha letto i dialoghi sulla barriera scomparsa e sul bancone raggiungibile. Questo riscontro testuale non certifica i predicati del bytecode; il modello non assume un flag interno del gioco.

Il revisore distinto ha approvato prima dell’implementazione il modello, il manifest selettivo, le guardie di conservazione e il limitato riallineamento R6-31. Tale approvazione della soluzione è distinta dal gate del codice e dal riscontro successivo al rilascio.

## Modello operativo

Il negozio `negozio-palazzo-niijima` usa nel proprio `sblocco_json` la congiunzione:

1. `finestra-palazzo: niijima`, riferita alla finestra esistente del Palazzo;
2. `NON palazzo: niijima`, per la conclusione già prevista dal sistema;
3. almeno uno dei due fatti dichiarati «Banco della lobby dei soci di Niijima raggiunto e utilizzabile» e «Banco della lobby delle puntate alte di Niijima raggiunto e utilizzabile».

Ogni offerta richiede soltanto il fatto del proprio banco e riceve dal negozio la finestra e la chiusura dopo la conclusione:

| Banco | Suffissi delle offerte sotto `negozio-palazzo-niijima/` |
| --- | --- |
| Soci | `soma`, `catena-di-perline`, `tessera-puntate-alte` |
| Puntate alte | `raggio-della-vittoria`, `bracciale-confuso`, `pend-disperazione` |

I due fatti entrano in `EVENTI_STORIA` senza membro della squadra o dedalo associato. Il percorso esistente Partita → Progressi e il suo normale PUT li consentono e li revocano. Nessun evento viene inizializzato dalla data, da un acquisto, dalla Tessera, da una voce della guida o dall’altro banco. Non si crea un’altra interfaccia.

La revoca modifica la disponibilità. Le righe degli acquisti non vengono toccate: il lettore continua a esporle e il percorso già esistente permette di annullarle anche quando l’offerta non è disponibile.

## Firma e atomicità

Fonte del manifest: riga e sei offerte della base pubblica `pacchetto/gioco.db`, schema93, aperta esclusivamente in lettura con `fileMustExist`. Il coordinatore ha confrontato in memoria i soli campi pertinenti dell’istanza prima del rilascio; ciò non sostituisce le guardie eseguite dalla migrazione.

Il negozio deve essere seed, visibile, senza sede, `luogo_chiave`, listino condiviso, eccezione oraria o fotografia. Le condizioni legacy sono il RAW `[]`; lo sblocco proprio è SQL NULL oppure il RAW finale esatto. Gli orari devono conservare il RAW pubblico:

```json
{"giorni":[],"fasce":[],"chiusoConPioggia":false,"nota":"solo durante l’esplorazione del Palazzo"}
```

Le sei offerte devono essere esattamente quelle attese, seed e visibili, appartenere al negozio e avere `seed_json` e `articolo_condiviso` SQL NULL. Il RAW iniziale delle condizioni è:

```json
[{"tipo":"intervallo","dal":"10-29","al":"11-20"}]
```

Si accetta anche il RAW finale esatto del rispettivo banco per non riscrivere righe già corrette. Non si firmano né si cambiano categorie, identità del Catalogo, fonti commerciali, prezzo, valuta, quantità, effetti o altri metadati L7.

La guardia esclude anche alias entranti del negozio o delle sei offerte e qualsiasi sede aggiuntiva in `negozio_luogo_extra` o `negozio_sede_spillo`, comprese quelle non visibili. Un’assenza non viene ricreata. Una variante, un’offerta aggiuntiva o una fotografia non NULL esclude l’intero blocco, senza correzioni parziali.

Nella medesima transazione la migrazione legge il registro di gioco del cestino, senza esportarne il contenuto e senza leggere il cestino delle partite. Radice, operazione, sequenza univoca, tabella, identità e lati richiesti devono essere leggibili. Un registro incerto oppure un lato pertinente al negozio, alle offerte, agli alias entranti o alle due tabelle delle sedi esclude tutte e sette le righe. Nessuna fotografia del cestino viene riscritta.

Il rendiconto immutabile `rettifica-banchi-niijima-134` viene inserito prima degli UPDATE, nella stessa transazione. Riporta `applicata`, `gia-corretta`, `assente` o `esclusa`, chiavi pubbliche, motivo e contatori di copertura. Un rendiconto preesistente resta intatto. Ogni UPDATE modifica solo `negozio.sblocco_json` o `articolo.condizioni_json`, con CAS sul RAW precedente e `changes === 1`; un errore annulla anche il rendiconto.

## Ripristino e limiti

Le fotografie già presenti non vengono normalizzate: il blocco è escluso e richiede un’istruttoria specifica. Con `seed_json` NULL, un’eventuale modifica successiva fotograferà il dato già corretto, rendendo coerente il ripristino ordinario. Una copia di dati antecedente passa dalla migrazione; una copia già alla versione134 non viene riparata forzatamente.

Note e prosa rimangono identiche. Le sole date duplicate sulle sei offerte vengono sostituite dal fatto del banco: la finestra resta quella unica del Palazzo, senza introdurre date canoniche del percorso delle lobby.

R6-31 mostra la formula corrente `sblocco_json` di N14 e il rendiconto134 come informazioni distinte. La coincidenza della formula del negozio non certifica l’intero blocco o le sue eventuali varianti. L26 mostra, con identità del luogo e quartiere attestata in130, la formula intera dal 7 maggio e il rendiconto130. Entrambi i confronti hanno `prima: []`: non abilitano l’applicazione di una proposta parziale. Gli esiti nativi130 restano espliciti nel motivo del DTO audit; un audit assente o illeggibile non riceve un esito inventato. Le decisioni umane precedenti restano conservate, con il normale confronto dell’impronta corrente.

Gate distinto del codice e dell’append134 approvati. Tre riesami propri completati; controlli integrati finali typecheck65873, lint39515 e build78712 conclusi con exit0. Non sono stati eseguiti test, simulazioni, migrazioni locali o scritture nei database. I riscontri dopo il rilascio restano distinti e ancora da acquisire.

## Esito pubblicato

Commit `47e1ad08`, [pipeline76 riuscita](https://github.com/merlinoalbus/project-p5r/actions/runs/39636871632), p5s schema134/27. Audit `applicata`, tutte e sette le righe; cestino leggibile con3registri,1280passi,0pertinenti. Nel confronto RAW del coordinatore cambiano solo `negozio.sblocco_json` e le sei `articolo.condizioni_json`, nelle formule esatte. Tutti gli altri campi delle sette righe sono identici. Le intere tabelle di eventi e acquisti della partita, sette righe ciascuna, restano identiche nel confronto temporaneo in memoria.

Dopo134 il coordinatore ha confrontato le proiezioni protette già definite: Diario255voci/54giorni, Kamoshida169, Madarame226 e611pin personali/43mappe identici. Un timeout iniziale di navigazione è stato superato dalla lettura completa delle54giornate; nessuna lacuna residua dichiarata. Non è una certificazione dell’intero database.

Browser del coordinatore e osservazione autonoma del revisore: i due fatti sono non segnati, le sei offerte distinguono il proprio banco ed ereditano finestra e chiusura. R6-31 mostra N14/L26 con formule coincidenti e audit134/130 distinti, senza applicazione parziale.201righe correnti,24da ricercare. Nessun gesto mutante o test eseguito nel browser.

**Gate finale distinto APPROVATO**, limitato a N14 e alla visualizzazione informativa N14/L26. Gli altri punti L6 e i lotti complessivi rimangono aperti.
