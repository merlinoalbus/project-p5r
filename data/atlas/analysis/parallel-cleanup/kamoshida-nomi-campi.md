# Kamoshida: nomi reali dei campi e36 immagini

Tutte36 risorse classificate. Il campo non coincide sempre con un singolo layer; questa differenza impedisce di sostituire automaticamente tutti i titoli uguali.

|Risorsa|Prima DB|Proposta generale|Stato|
|---|---|---|---|
|RMAP_151_0_0|Area 000 — RMAP_151_0_0|Area 000 — RMAP_151_0_0|missing-field-binding|
|RMAP_151_0_1|Area 000 — RMAP_151_0_1|Area 000 — RMAP_151_0_1|missing-field-binding|
|RMAP_151_1_0|Cancello del castello|Cancello del castello|retain-native-floor|
|RMAP_151_1_1|Cancello del castello|Cancello del castello|retain-native-floor|
|RMAP_151_2_0|Vecchio castello 1P|Vecchio castello 1P|multiple-field-contexts|
|RMAP_151_2_1|Vecchio castello 2P|Vecchio castello 2P|multiple-field-contexts|
|RMAP_151_2_2|Vecchio castello 2P|Vecchio castello 2P|multiple-field-contexts|
|RMAP_151_3_0|Vecchio castello 2P|Vecchio castello 2P|context-only-specific-title|
|RMAP_151_4_0|Vecchio castello 2P|Vecchio castello 2P|field-floor-conflict|
|RMAP_151_4_1|Vecchio castello 3P|Edificio est 3P|specific-field-title-proposal|
|RMAP_151_4_2|Vecchio castello 3P|Edificio est 3P|specific-field-title-proposal|
|RMAP_151_5_0|Vecchio castello 3P|Vecchio castello 3P|context-only-specific-title|
|RMAP_151_5_1|Vecchio castello 3P|Edificio est, dépendance — 3P|specific-field-title-proposal|
|RMAP_151_5_2|Vecchio castello 3P|Edificio est, dépendance — 3P|specific-field-title-proposal|
|RMAP_151_6_0|Tetto|Tetto|retain-native-floor|
|RMAP_151_6_1|Tetto|Tetto|retain-native-floor|
|RMAP_151_6_2|Tetto|Tetto|retain-native-floor|
|RMAP_151_6_3|Tetto|Tetto|retain-native-floor|
|RMAP_151_6_4|Tetto|Tetto|retain-native-floor|
|RMAP_151_7_0|Torre: Livello inferiore|Torre: Livello inferiore|context-only-specific-title|
|RMAP_151_9_0|Torre: Livello di mezzo|Torre centrale: Livello di mezzo|specific-field-title-proposal|
|RMAP_151_10_0|Torre: Livello superiore|Torre centrale: Livello superiore|specific-field-title-proposal|
|RMAP_151_10_1|Torre: Livello superiore|Torre centrale: Livello superiore|specific-field-title-proposal|
|RMAP_151_11_0|Torre: Sala del trono|Torre: Sala del trono|multiple-field-contexts|
|RMAP_151_11_1|Torre: Sala del trono|Torre: Sala del trono|multiple-field-contexts|
|RMAP_151_13_0|Stanza segreta|Stanza segreta|retain-native-floor|
|RMAP_151_16_0|Sala centrale|Sala centrale|retain-native-floor|
|RMAP_152_1_0|Prigione sotterranea 1P|Prigione sotterranea 1P|retain-native-floor|
|RMAP_152_1_1|Prigione sotterranea 1P|Prigione sotterranea 1P|retain-native-floor|
|RMAP_152_2_0|Prigione sotterranea 2P|Prigione sotterranea 2P|retain-native-floor|
|RMAP_152_2_1|Prigione sotterranea 2P|Prigione sotterranea 2P|retain-native-floor|
|RMAP_152_4_0|Passaggio sotterraneo|Passaggio sotterraneo|retain-native-floor|
|RMAP_152_5_0|Area 005 — RMAP_152_5_0|Area 005 — RMAP_152_5_0|field-title-unresolved|
|RMAP_152_6_0|Palestra dell'amore|Palestra dell'amore|retain-native-floor|
|RMAP_152_11_0|Area 011 — RMAP_152_11_0|Area 011 — RMAP_152_11_0|missing-field-binding|
|RMAP_152_11_1|Area 011 — RMAP_152_11_1|Area 011 — RMAP_152_11_1|missing-field-binding|

## Proposte per contesto e limiti decisivi

- RMAP1513_0: **Edificio est2P** nel solo contesto F151015; non attribuirlo ai contesti151051/152051.
- RMAP1514_1/2: **Edificio est3P**, un solo campo004 concorde col floor3P. RMAP1514_0 resta2P: il nome del campo3P è in conflitto con quel layer.
- RMAP1515_*: **Edificio est,dépendance —3P** combina nome campo e floor. Per lo0 il nome resta solo contestuale a causa dei safe-room. Le altre due immagini rimangono distinte.
- RMAP1512_*: pacchetto5 condiviso da Sala centrale, Edificio ovest2P eEdificio ovest1P. Nessun titolo specifico universale. I nomi possono identificare il campo selezionato mantenendo separato il floor della planimetria.
- RMAP15111_*: Sala del trono (campo011,pacchetto13) oppure Stanza del Tesoro (campo012,pacchetto14). Occorre contesto esplicito; lo0 comprende anche contesti safe-room.
- Torre: **Torre centrale** è il nome dei campi007/009/010, combinabile col livello inferiore/di mezzo/superiore. Non risolve eventuali differenze fra immagini dello stesso livello.
- Tetto: tutte5 immagini hanno lo stesso campo006 e stesso titolo. Nessun suffisso geografico aggiuntivo dimostrato.
- Cancello e prigioni: i titoli di campo non separano ulteriormente i layer; conservare i floor nativi.
- Le4 immagini senza campi (1510_0/1,15211_0/1) e1525_0 senza titolo campo restano esplicitamente irrisolte.

Il JSON contiene tutti i contesti, offset ROADMAP, texpack, rawHex dei record e FLDDNGPLACENO già decodificato. Nessun file app, backup o DB modificato. Nessuna fusione approvata: la verifica dei duplicati effettivi è affidata all’altro agente.
