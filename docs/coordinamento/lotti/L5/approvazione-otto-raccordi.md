# Otto raccordi L5 — proposta concreta, non applicata

Le prove native e la merce dei listini sono documentate in `riconciliazione-corrente.md` §6.1/6.3. Il coordinatore ha confrontato pin e destinazioni con il censimento corrente: tutti gli otto pin esistono e sono privi di riferimento. Nessun nome da solo è usato come prova.

| Pin pubblico e nome attuale | Destinazione proposta | Area proposta del luogo |
|---|---|---|
| 268 — Ferramenta | Negozio di elettronica Akiba | Electric Town, Akihabara |
| 269 — Distributori di capsule | Gachapon di Akihabara | Electric Town, Akihabara |
| 360 — Panini al vapore | Street food cinese Houraku | Quartiere dello shopping, Kichijoji |
| 363 — Alimentari importati | Verdura d'importazione MealPort | Quartiere dello shopping, Kichijoji |
| 1561 — Casalinghi | Negozio di articoli vari Mran Mran | Quartiere a luci rosse, Shinjuku |
| 1562 — Fioraio | Fioraio Sukebe | Quartiere a luci rosse, Shinjuku |
| 346 — Biblioteca Scolastica | Biblioteca di Shujin | Già assegnata alla Biblioteca, da conservare |
| 1530 — Venditore di accessori nel vicolo | Venditore ambulante | Questa proposta non cambia l'Area del luogo |

I primi sei sono pin seed. È predisposto l'helper **inattivo** `server/db/migrations/raccordiLuoghiL5.ts`, senza entry di migrazione né registrazione. Attivazione soltanto dopo approvazione dell'elenco. Verifica identità completa, contesto nativo, origine, riferimenti, Area e assenza di fotografie pertinenti nel cestino; le varianti sono rendicontate, mai sovrascritte. Nessuna creazione o ricreazione. Le sole colonne da cambiare sono riferimento del pin e Area NULL del luogo; nome e descrizione propri del pin restano conservati e possono apparire come nota tramite il lettore già esistente.

Gli ultimi due sono pin personali. È predisposto il nuovo ramo protetto del writer: GET `mappe/spilli/:id/precondizione-raccordo?luogo=...`, poi PUT con il solo corpo `{riferimentoLuogo, revisioneRaccordoAttesa}`. Le chiavi sono rispettivamente `shujin-academy/biblioteca-shujin` e `shibuya/venditore-ambulante`. La precondizione comprende riga RAW, destinazione, voci, immagini e luogo target, con confronto atomico prima della scrittura; un cambiamento produce409. Il ramo aggiorna soltanto le due colonne del riferimento e `updated_at`, senza normalizzazioni dell'editor. Il GET restituisce solo l'impronta volatile, nessun payload o hash viene salvato nel repository. Soluzione e codice approvati staticamente dal revisore distinto; nessuna chiamata in scrittura effettuata. Non si spostano i pin, non si trasferiscono note o listini, non si modificano acquisti o stati delle partite. Il luogo Venditore ambulante rimane senza Area: l'assegnazione necessaria a «Luoghi qui» è un seguito ancora da preparare e sottoporre a riesame, non è implicita nel solo raccordo del pin.

**Consenso ancora richiesto.** Il revisore distinto ha confermato che M5 §7.9 alla revisione originale `43ad8889` prescrive «vale dopo l'approvazione dell'elenco». L'eccezione esplicita per gli undici pin seed di M5 §1.2.6 non comprende questi sei. Origine seed e certezza dell'identità non sostituiscono tale approvazione. Nessun raccordo è stato applicato e nessuna nuova migrazione viene registrata per effetto della sola preparazione.
