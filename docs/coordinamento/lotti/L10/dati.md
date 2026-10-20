# L10 «Partita e diario» — analisi dati

Analisi dati, 2026-10-20. Sola lettura sulla copia di produzione `…\cffd8da6-…\scratchpad\prod-20261020\` e su `data/` (dev).
Script e uscite (scratchpad `…\161706c7-6e2c-47d6-bdb7-618347ce218c\scratchpad\`): `l10.cjs` → `l10-prod.json` / `l10-dev.json` (**identici**).
Requisiti: `lotti/L10/requisiti.md`. Decisioni già prese: D6 (Doti solo proposte con «Applica», mai automatiche). Uid completi.

## 1. Le voci del diario (`voce_giornata`)
- **996** voci (validato 04-01..06-01: **254**), tutte `genere='azione'`. Per tipo: confidente 274, dote 139, trama 116, acquisto 100, attività 95,
  esame 70, libro 63, palazzo 58, altro 27, velluto 20, dvd 15, lavoro 10, richiesta 9.
- Riferimenti: nessuno 515, confidente 296, libro 65, dungeon 48, negozio 39, film 19, dote 7, attività 4, richiesta 3. `rango_atteso` su 201.
- **Effetti dichiarati oggi** (`produce_json`): dote 204 (su 189 voci), lettura 72 (69 voci), turno 9 (9 voci) → 266 voci con effetti; il piano diceva
  Dote 196, lettura 72, turno 9.
- Voci collegate (riferimento o effetto) per tipo: confidente 268/274, libro 62/63, palazzo 53/58, esame 57/70, lavoro 10/10, dvd 15/15, velluto 15/20,
  dote 104/139, acquisto 38/100, attività 21/95, richiesta 3/9, trama **6/116**, altro 2/27.

## 2. Abbinamenti per data (R10-12, R10-13)
- **Domande**: 70 voci di tipo `esame` (52 «Rispondere alla domanda in classe…»); **71 domande su 78** hanno una voce d'esame nel loro giorno (torna col
  piano). Giorni con **2 domande** (ambigui, dubbio 3): 05-19, 05-26, 06-23, 09-29, 11-10. **Domande senza voce: 7** — 09-06 #36 classe, 10-06 #44
  classe, 06-02 #70 tv, 08-04 #72 tv, 11-24 #76 tv, 12-08 #77 tv, 12-15 #78 tv. **Voci senza domanda: 4** — 07-07 `b9e2763b0f65697c7f0b28dc24c3487c`
  (domande in classe «Via Lattea / Somen»), 07-16 `b5b77ab2b525b7a0cca2968122c36b53` (ultimo esame), 10-15 `6c8e3422e674dd92e40e71b00d6a734f`
  (schivare il gesso, prova di Perizia), 10-31 `09077817a814017ee5e85ecd6f2fb270` («cruciverba scolastico», tipo esame).
- **Cruciverba**: 36 voci, **33 su 38** cruciverba con voce nel giorno; senza voce 08-03, 08-17, 09-28, 10-06, 01-27; voci senza cruciverba nel giorno:
  02-01 `259ff4907e961d1d78b845ac8f58c79b` (la **voce cumulativa** «completare tutti i cruciverba»), 08-16 `889aefc170a0719ed508cd8dd37e0d31`
  «Cruciverba (Ustione)» e 08-29 `a67565bfa0cbe0f9e4af4705974836aa` «Cruciverba (Hacker)»: **sfasate di un giorno**, verificato sulla risposta
  (`cruciverba` 08-17 risposta «Ustione», 08-30 risposta «Hacker») → abbinamento **sicuro per risposta**, non per data; la voce resta nel suo giorno.
- Acquisti: 100 voci, 38 collegate (39 riferimenti a negozio); la Pietra Sacra (06-28, `d57dcd1811b7f22289e377dcd40b6b4e`) non è collegata né a
  negozio né ad articolo.

## 3. Gli esempi del piano (R10-03, R10-04)
- «Inizia a pulire» — 04-09 giorno `b79da6f663d32b6845e6489065b8e841`, tipo trama, nessun riferimento né effetto, **spuntata in p1 e p2**; l'evento di
  storia `mansarda-pulita` risulta **già avvenuto in p1 e p2** (segnato a mano): collegare la voce all'evento non cambia lo stato di oggi.
- «Preparare il caffè al Leblanc» — 04-27 sera `20449887b636d5a3168b14cb8c1ea7d9`, confidente:sojiro, effetto Dote fascino +1, spuntata solo in p2;
  `caffe-leblanc` avvenuto in p1 e p2.
- Pietra Sacra (06-28) e il duello con Akechi: voci senza effetti e senza spunta; Oratore di Shibuya: nessuna voce che lo nomini (l'evento
  `oratore-shibuya-ascoltato` è avvenuto in p1, segnato a mano); biliardo: 4 voci senza effetti.
- `evento_storia_partita`: p1 4 (mansarda-pulita, primo-strumento-creato, caffe-leblanc, oratore-shibuya-ascoltato), p2 3.

## 4. Spunte e stati della partita (R10-15, R10-29…R10-31)
- `spunta_voce_partita` **338** (p1 236, p2 102), **tutte nel diario validato** (04-01..06-01), 0 orfane. 136 hanno effetti registrati
  (`effetti_json`: doti 71, Confidente 15; chiavi doti, confidente, incontro, letture, turni).
- **Voci già spuntate senza riferimento né effetti**, che con L10 potrebbero avere effetti nuovi (dubbio 2): trama 82, acquisto 23, altro 11, velluto 4,
  esame 3, attività 1 → **124 spunte** per cui la migrazione non deve applicare nulla in silenzio (riepilogo da approvare).
- Stati: incontro_confidente p1 35 / p2 15; turno p1 9 / p2 2; attività svolta p1 6 / p2 2; lettura p1 10 / p2 3; acquisto p1 7; regalo 0; richiesta p1 1;
  domanda p1 6 / p2 6; cruciverba p1 1 / p2 2; eventi di storia p1 4 / p2 3; dote_sociale p1 5 / p2 5; compendio p1 53; scorta p1 7; progressi libri
  p1 9 / p2 2, film p1 2 / p2 1, videogiochi 0; effetti lettura p1 15 / p2 4; punti negozio 0; cestino partite 0.
- Storico (`evento_partita`) **1273** (p1 934, p2 339): punto-dungeon 522, percorso 395, compendio-registrata 79, squadra 70, confidente-rango 45, …;
  **269** con la voce del diario nei dati: base per «Progressi mostra da quale voce è scattato» (R10-22).

## 5. Regole di migrazione proposte
1. **Effetti come collegamenti**: colonne/tabella nuove voce → effetto (tipo + chiave dell'oggetto); `produce_json` di oggi (dote, lettura, turno)
   convertito 1:1; **testo, ordine, giorno, fascia, uid invariati** (R10-14).
2. **Abbinamenti sicuri** (applicati): domande con una sola domanda nel giorno (71 − 10 dei 5 giorni doppi = 61, verificato: le 10 hanno tutte una
   voce d'esame) e cruciverba 33 per data + 2 per risposta (08-16 → Ustione, 08-29 → Hacker); la voce cumulativa 02-01 → «tutti i cruciverba aperti»;
   libri, film, lavori, Confidenti già collegati. **Dubbi** (elenco): 5 giorni con 2 domande, 4 voci d'esame senza domanda, 7 domande senza voce,
   62 acquisti senza collegamento, 110 voci di trama, Velluto 20 (dubbio 4).
3. **Spunte già date**: nessun effetto nuovo applicato dalla migrazione; riepilogo «effetti che la spunta avrebbe dato» sulle 124 spunte (dubbio 2).
   Dove lo stato esiste già (es. mansarda-pulita), il collegamento lo conferma senza riscriverlo.
4. **Segno «validata»** sulle 254 voci del 04-01..06-01 (colonna nuova; l'impronta del diario la esclude già: `impronta.cjs` toglie `validata`).
5. **Doti**: D6 — mai automatiche; le 71 spunte con doti registrate restano come sono.
6. **Storico**: nessuna riga cancellata; i 1273 eventi restano come «storico importato» (dubbio 7); il registro derivato parte dalle regole nuove.

## 6. Conteggi attesi dopo
| Voce | Atteso |
|---|---|
| voci del diario | 996, testo/ordine/giorno/fascia/uid invariati; impronta del diario `1a71b030…bc4c` identica (validata esclusa) |
| voci con effetti strutturati | 266 oggi + abbinamenti sicuri (61 domande + 35 cruciverba + voce cumulativa) + approvati |
| spunte | 338 invariate; nessun effetto nuovo applicato senza sì |
| stati della partita | invariati riga per riga (§4) |
| storico | 1273 righe invariate |

## 7. Punti legame e passaggi di rango dei Confidenti (estensione dell'utente, via PM)
Regola chiesta: punti applicati in **ordine cronologico**; i punti dopo un passaggio di rango contano verso il rango successivo (solo ranghi a punti).
Censimento (`l10punti.cjs` → `l10punti-prod.json`, prod = dev).

### 7.1 Dove sono i dati oggi
| Dato | Dove | Cosa contiene | Ordine di gioco |
|---|---|---|---|
| Ranghi a punti | `confidente_rango` (162) | punti necessari per rango per **18** Confidenti; **senza tabella** (ranghi automatici o non a punti): igor, morgana, gemelle, **mishima**, sae. Ranghi con 0 punti (di trama/automatici) **38**, es. akechi R2/5/7/8/9, yoshida R2–R9, kawakami R4/7/8/9, sojiro R8, maruki R9 | — |
| Stato attuale | `confidente_partita` (p1 23, p2 23) | `rango`, `punti` = punti verso il rango successivo, `sbloccato` | nessuno (solo il totale) |
| Incontri | `incontro_confidente_partita` (p1 35, p2 15) | data, fascia, `verso_rango`, `passaggio` (rank up), `origine` (azione 14 / pagina 21 in p1), `doti_json`, `punti_prima` (valorizzato solo su **7** in p1, 0 in p2) | **sì**: data + fascia di gioco; in p1 e p2 nessun incontro inserito fuori ordine e nessun doppione nello stesso giorno e fascia |
| Punti del singolo incontro | `spunta_voce_partita.effetti_json` | **due forme**: *vecchia* `{chiave, noteRisposta, punti, bonusArcano}` — **15 spunte in p1** (0 in p2) con i punti dell'incontro; *nuova* `{confidente, verso, passaggio, doti, id, giaContato}` — 30 in p1, 14 in p2, **senza punti** | sì, dalla data/fascia della voce |
| Punti per risposta | `confidente_dialogo.scelte_json` | 812 scelte, `punti` numerici su 519, `puntiTesto` su 523 | per rango, non per incontro |
| Voci del diario | `voce_giornata` | 296 con riferimento Confidente, `rango_atteso` su 201; nessun effetto «punti» dichiarato (solo 6 Doti) | data/fascia/ordine |
| Storico | `evento_partita` | `confidente-rango` p1 40 / p2 5 (`da`, `a`), `confidente-sbloccato`; **nessun evento con punti** | tempo reale, non di gioco |

### 7.2 Partita reale (p1): come risultano oggi
Incontri per Confidente (↑ = passaggio): ryuji 4↑,5,5↑,6↑,7,7↑ · sojiro 3↑,4,4,4,4 · takemi 3↑,4↑,5↑,6↑,7,7↑ · ann 2,2↑,3,3↑,4↑,5↑,6 · yoshida 1,1↑,2↑,3↑ ·
mishima 1↑,2↑ · maruki 1↑,2↑ · igor 3↑ · gemelle 1↑ · kasumi 1↑.
Punti delle 15 spunte di forma vecchia (somma): ryuji 35, sojiro 40, yoshida 20, ann 30, takemi 60 (10 con bonus d'Arcano +15).
Stato: ann R5 7,5 punti (su 45 per R6); ryuji R7 15 / 60; **sojiro R3 50 punti con 43 necessari per R4** (punti oltre la soglia senza passaggio: o
manca il passaggio, o i punti oltre la soglia non sono stati portati al rango dopo); takemi R7 15 / 42; yoshida R3 10 punti ma R4 è un rango a 0 punti
(automatico); kasumi R1 0/15; maruki R2 0/28. 5 spunte con punti non hanno un incontro registrato nello stesso giorno e fascia.

### 7.3 Dove l'ordine cronologico è ricostruibile
- **Ordine degli incontri**: sì, sempre (data + fascia di gioco, nessuna ambiguità oggi in p1 e p2).
- **Punti per incontro**: solo dove c'è la spunta in forma vecchia (15 in p1) o `punti_prima` (7 in p1). Delle 15 spunte di forma vecchia, 10 cadono nello stesso giorno e fascia
  di un incontro registrato (5 no); per **gli altri incontri di p1** (almeno 35 − 10 − 7 = 18, se `punti_prima` e spunte non si sovrappongono) e per **tutti i 15
  di p2** i punti del singolo incontro **non sono registrati**: si possono solo ricostruire dalla risposta scelta (se l'utente la indica) o dalla risposta
  ottimale del dialogo (`confidente_dialogo`), come proposta.
- **Riporto dopo il passaggio**: oggi non è registrato da nessuna parte (lo stato tiene solo `punti` verso il prossimo rango; il caso Sojiro 50/43 mostra un
  eccesso non riportato). Con la regola nuova il riporto si **calcola** scorrendo gli incontri in ordine e sottraendo i punti necessari a ogni passaggio,
  solo sui ranghi con `punti_necessari > 0`.
- Proposta: nessuna riscrittura dello stato in migrazione; un **riepilogo per Confidente** (punti ricostruiti in ordine, con la fonte di ogni numero: spunta,
  `punti_prima`, dialogo) da far approvare; per p1 i Confidenti coinvolti sono 10, di cui 5 con punti registrati.
- **Esperto (G-020)**: le soglie di `confidente_rango` coincidono coi dati di gioco (Akechi 6→7 = 55 confermato); i 177 requisiti sono coerenti coi ranghi a evento o
  condizione; **l'eccedenza dopo un passaggio si conserva** (va corretto `docs/riferimenti/confidenti-punti.md`, che dice il contrario) e il bonus degli esami
  vale anche per Ann. Il caso Sojiro p1 (50 punti con 43 necessari, R3) è quindi un passaggio non registrato o un'eccedenza da riportare: elenco.

## 8. Inviti dei Confidenti nel diario (richiesta del PM: l'utente ha deciso che gli inviti sono eventi del diario che sbloccano luoghi e aree)
Censimento (`l10inviti.cjs` → `l10inviti-prod.json`, prod = dev). Ricerca nel testo di «invit», «ti chiede/ha chiesto di uscire», «propone», «messaggio di/da»,
«appuntamento», «uscire/uscita con»: **105 voci**, ma **97 sono «Uscire con X» / «Uscita con X»** = l'incontro del Confidente (rango), non un invito.
**Inviti veri (8)** — il Confidente propone o l'utente invita:
| Data | Fascia | uid | Confidente | Testo |
|---|---|---|---|---|
| 04-16 | sera | 7853aa81955aeb438c203b00286340cb | ryuji | messaggio di Ryuji che propone per il giorno dopo un negozio di Shibuya (trama) |
| 05-25 | sera | e71d57b12a2399d474644a33b3e5f829 | ryuji | messaggio di Ryuji per l'incontro al Monja di Tsukishima (sblocco di Tsukishima, rango 7) |
| 05-26 | giorno | 3db7636b34a050c0eec2f987a5ec1b41 | ann | rispondi al messaggio di Ann e incontrala al centro commerciale |
| 09-10 | giorno | fa06e46b442d5198b314424bf2c6cd00 | (makoto; Ann/Hifumi…) | scegliere il compagno per l'appuntamento (viaggio alle Hawaii) |
| 11-16 | sera | 2e6e9b033b5b8d40739bbfa3755a5241 | akechi | «Possibile invito da Akechi» |
| 01-01 | giorno | a7407ed3a16409c9a6abe4cc4edfc223 | kasumi | appuntamento con Kasumi al Santuario Meiji (trama) |
| 01-28 | giorno | d899118be349371eaac91de0e934af99 | futaba | invitarla ad Akihabara |
| 01-29 | giorno | b0a9545329ea54960fb38544eca41cdb | kasumi | invitare Sumire a Maihama (Destinyland) |
Più 2 «inviti» al Jazz Club (11-25 `6f3d0aabf128c1fe648901942ed9e930` Makoto, 11-27 `d0f6b93a93e2797418efd5fda3f262d0` Futaba): sono l'attività del Jazz
Club, non uno sblocco.
**Confronto con O-1…O-7 (G-018)**: **nessuna voce del diario** nei giorni e coi Confidenti delle sette vie (O-1 Mishima 08-03 Harajuku, O-2 Mishima 07-28
Ikebukuro, O-3 Makoto 07-30 Ikebukuro, O-4 Ann 08-05 Meiji, O-5 Akechi 07-28/29 Shinagawa, O-6 Futaba 10-09 Nakano, O-7 Ryuji 07-02/03/06 Ichigaya). I posti
di quelle vie compaiono nel diario solo come **lettura del libro** (Vague 06-03 `fd189f1c93e435ff93a208fa4390e40c`, Cieli notturni 10-21
`c1aaa3ed46971313495209a19d41e384`, Esplorando Nakano 10-27 `21586ff8b4b21b44d144f0087f14eeb7`, Vedetta lacustre 09-24 `d82f0870a6f2a0dc8f1806b8eab75f21`, Santuari
di Tokyo 10-13 `c3cb199910f02e1e0a805a99e10f614d`, Un acquario al giorno 10-25 `c219c087bb3e8f63c605ecc19485396a`) o come uscite successive.
→ Per rendere «invito del Confidente avvenuto» una condizione servono **voci nuove**: oggi non c'è nessuna voce da collegare.

### 8.1 Correzioni dell'Esperto (`guida/registro.md` G-023, dati estratti da Royal) e voci proposte
Le vie diventano **6** (gli inviti di Mishima non esistono in Royal): Harajuku = **Ryuji 29/5** (non Mishima 3/8); Ikebukuro = **Makoto 30/7** (O-2 Mishima 28/7 non
esiste); Santuario Meiji = **Ann 6/8** (non 5/8); Shinagawa = Akechi 29/7 (messaggio la sera del 28/7); Nakano = Futaba 9/10 (messaggio la sera dell'8/10); Ichigaya =
Ryuji 3/7 (messaggio la sera del 2/7). Voci proposte da G-023: **9** (6 uscite + 3 messaggi della sera prima), `tipo` confidente, riferimento al Confidente.
**Cosa c'è già nel diario in quei giorni e fasce** (prod = dev; un'uscita consuma la fascia, il messaggio no):
| Voce proposta | Giorno e fascia | Già nel diario | Conflitto |
|---|---|---|---|
| Invito di Ryuji → Harajuku | 05-29 giorno | 5 voci **tutte spuntate in p1**: televendite `422fd22992f3031030cc97c98bbc9f3e`, Clinica `fecf3a910e147675fd3751d93dcc8195`, Aojiru `6d5ee0760468357768bce5a6e4a9b986`, vendita al Softair `9254eba5a15ee14c99d7afc1f8b30fda`, **lavoro part-time al Triple Seven** `2476ffa179261f362310915765e6e2a3` | **sì**: la fascia è già spesa nel lavoro; inoltre è **nel diario validato** → serve il sì dell'utente |
| Messaggio di Ryuji | 07-02 sera | uscita con Hifumi `84db8c1baa769193694985b0d8778ced` | no (il messaggio non consuma tempo) |
| Invito di Ryuji → Ichigaya | 07-03 giorno | 5 voci, fra cui **uscita con Ann al Buffet Wilton** `f0cb2d87b0d13825851798db49b4a3de` | **sì**: due uscite nella stessa fascia |
| Messaggio di Akechi | 07-28 sera | Confidente Kawakami `80ee96c94e0ecb8d4f1c97000109ec06` | no |
| Invito di Akechi → Shinagawa | 07-29 giorno | **Confidente Takemi** `8a28754d448992aef62a802d08420acf` | **sì** |
| Invito di Makoto → Ikebukuro | 07-30 giorno | **Confidente Ann** `39c7b4daac6cc919b33ded37ce106f88` | **sì** |
| Invito di Ann → Meiji | 08-06 giorno | nessuna voce | no |
| Messaggio di Futaba | 10-08 sera | nessuna voce | no |
| Invito di Futaba → Nakano | 10-09 giorno | nessuna voce | no |
Proposta: aggiungere le 9 voci **solo da elenco approvato**. In 4 giorni (05-29, 07-03, 07-29, 07-30) l'invito compete con un'attività già prevista nella stessa fascia:
l'utente sceglie se aggiungerlo come **alternativa** («oppure») all'attività di quel giorno o non aggiungerlo; nessuna voce esistente spostata o cambiata. La voce del
05-29 tocca il diario validato: solo con il sì dell'utente (via PM).

## 9. Rimisura sulla copia fresca di produzione (`dati-produzione/2026-10-20-0440Z/`, 2026-10-20)
Sola lettura; script `l10.cjs`, `l10punti.cjs`, `l10inviti.cjs` (uscite `*-0440Z.json` nel mio scratchpad), confronto con la copia di produzione precedente.
Tutte le differenze sono **lavoro dell'utente** del 19/10 sera:
- la voce nuova del 06-01 sera, Igor, `9b4f62e2f6694fd5af10a407a455d546`, tipo `confidente`, nel validato;
- 4 spunte nuove;
- 2 incontri nuovi (Igor R4 e Morgana R3);
- una lettura;
- 11 eventi di storico.
`l10inviti` è **identico** byte per byte: il §8 non cambia, e le voci e gli uid nei giorni degli inviti sono gli stessi.

### 9.1 Cifre che cambiano
| Cifra | Prima | Copia 0440Z | § |
|---|---:|---:|---|
| voci del diario | 996 | **997** | §1, §6 |
| … nel validato 04-01..06-01 | 254 | **255** | §1, §5.4 (segno «validata» su 255) |
| voci di tipo `confidente` / collegate | 274 / 268 | **275 / 269** | §1 |
| riferimento confidente / con `rango_atteso` | 296 / 201 | **297 / 202** | §1, §7.1 |
| `spunta_voce_partita` | 338 (p1 236, p2 102) | **342** (p1 **240**, p2 102), tutte nel validato | §4, §6 |
| … con effetti registrati | 136 | **139** | §4 |
| incontri `incontro_confidente_partita` | p1 35 / p2 15 | **p1 37** / p2 15 | §4, §7.1 |
| … p1 per origine (azione / pagina) | 14 / 21 | 14 / **23** | §7.1 |
| … p1 passaggi | 24 | **26** | §7.2 |
| lettura p1 / effetti lettura p1 | 10 / 15 | **11 / 16** | §4 |
| storico `evento_partita` | 1273 (p1 934) | **1284** (p1 **945**); `confidente-rango` 45 → **47** | §4, §6 |
| `confidente-rango` p1 in §7.1 | 40 | **42** | §7.1 |
| spunte con punti del Confidente (p1) / senza incontro | 32 / 5 | **34 / 7** | §7.2 |
Restano uguali:
- le 124 spunte senza riferimento né effetti, gli abbinamenti del §2 e gli esempi del §3;
- i 269 eventi con la voce del diario e il resto del §4;
- i dialoghi (519/523) e i ranghi a punti (162).

### 9.2 Punti legame (§7.2) sulla copia fresca
- Incontri di p1: si aggiungono **igor 4↑** (Igor passa da «1 incontro, 3↑» a «2 incontri, 3↑,4↑») e **morgana 3↑** (nuovo). Morgana è senza tabella dei punti: nessun punto da
  ricostruire.
- Stato: igor **R4** (prima R3), morgana **R3** (prima R2); ann, ryuji, sojiro (50/43), takemi, yoshida, kasumi e maruki sono invariati.
- I Confidenti di p1 coinvolti nel riepilogo passano da 10 a **11**, di cui 5 con punti registrati (invariato).
- Ordine di gioco: ancora **nessun** incontro fuori ordine e nessun doppione nello stesso giorno e fascia. Il calcolo cronologico del riporto resta possibile.
- Le spunte con punti senza incontro passano da 5 a 7: i 2 casi nuovi sono le spunte del 06-01 (forma nuova), da mettere nello stesso elenco.

### 9.3 Inviti dopo il 06-01 (G-028, regole riscritte da Analisi requisiti: R10-11j2, R6-08c3)
Le voci nuove sono **8** (**decisione del PM: strada (a) di G-028 per Makoto**; la prima stesura di questo § ne contava 7): le 9 di G-023 meno l'invito di Ryuji
del 05-29 (solo evento, decisione già presa). L'invito di Makoto del 07-30 è una **voce** con la condizione scritta (Palazzo di Futaba concluso + Imperatore R1) e il
motivo `da_rivedere`; resta anche la sua riga in `confidente_invito`. Posizione attesa nella copia fresca
(«in fondo alla fascia», `da_rivedere`):
| Voce | Giorno · fascia | Voci già presenti (0440Z) | Ordine della voce nuova |
|---|---|---:|---:|
| Messaggio di Ryuji | 07-02 · sera | 1 | 1 |
| Invito di Ryuji → Ichigaya | 07-03 · giorno | 5 | 5 |
| Messaggio di Akechi | 07-28 · sera | 1 | 1 |
| Invito di Akechi → Shinagawa | 07-29 · giorno | 1 | 1 |
| Invito di Ann → Santuario Meiji | 08-06 · giorno | 0 | 0 |
| Messaggio di Futaba | 10-08 · sera | 0 | 0 |
| Invito di Futaba → Nakano | 10-09 · giorno | 0 | 0 |
| Invito di Makoto → Ikebukuro (**strada (a) decisa dal PM**: la voce c'è, con la condizione scritta «solo se il Palazzo di Futaba è già concluso» e il motivo `da_rivedere`) | 07-30 · giorno | 1: «Confidente Ann: preparazione per il prossimo avanzamento (nessun cambio di rango)» `39c7b4daac6cc919b33ded37ce106f88`, ordine 0, tipo `confidente`, ann, 0 spunte | **1** |
Aggiornamento dopo la decisione del PM (strada (a) di G-028 per Makoto): le voci d'invito tornano **8**. Il **07-30 giorno** ha un conflitto: due uscite nella stessa
fascia (Ann e l'invito di Makoto). Come per gli altri giorni, l'invito è un'**alternativa** e nessuna voce esistente cambia. Sul percorso del diario l'invito non
arriva, perché la piramide si conclude il 3/8 (G-028). La sera del 07-30 c'è Chihaya (`ab2cb32eb1b00dd9204b4a6555dc3f62`): nessun conflitto, perché la voce è di giorno.
- I conflitti della tabella del §8.1 si riducono a **3 giorni**: **07-03** (Ann al Buffet Wilton), **07-29** (Takemi) e **07-30** (Ann). Il 05-29 esce, perché non ha voce.
- **Conteggi attesi dopo L3 + L10 sulla copia fresca**:
  - voci del diario: 997 + 1 (L3, Kaneshiro 06-26 giorno, ordine 1) + 8 = **1006**;
  - validato: **255** identiche (impronta `bbd9de5d7833f0f9…`, `validata` esclusa);
  - voci `da_rivedere` dopo il 06-01: 8 inviti + 1 Kaneshiro + quelle corrette da L3;
  - spunte: **342** invariate;
  - storico: **1284** invariato.
- Le righe del §6 vanno lette con queste cifre: 997 → 1006 voci, spunte 342, storico 1284, impronta `bbd9de5d…`.
- **«Concluso» per il riepilogo dell'«Esci»** (R10-28c), misurato in L6 §10: p1 Kamoshida e Madarame conclusi (Madarame: Tesoro 2/2, boss in ordine 19 2/2); p2 solo
  Kamoshida. Kamoshida p1 è concluso ma non completato (56/71, L4).

### 9.4 Base p5s (`dati-produzione/p5s-2026-10-20-0503Z/`)
`l10inviti` e `l10punti` sono **identici** alla 0440Z, e così il diario (997), le spunte (342) e i punti legame. Cambia solo lo **storico** (lavoro dell'utente su p5s):
`evento_partita` passa da 1284 a **1316** (p1 da 945 a **977**, p2 339; `punto-dungeon` da 525 a 557, le 32 segnature di Kamoshida). Nel §9.3 «storico 1284 invariato»
va letto **1316**. Kamoshida p1 è ora **concluso e completato** (71/71, L4 §11.8). Impronta di riferimento: `ff3033cb…`. Diario atteso dopo L3 + L10: **1006**,
invariato.
