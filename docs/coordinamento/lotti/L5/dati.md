# L5 «Luoghi, negozi, orari» — analisi dati

Analisi dati, 2026-10-20. Sola lettura sulla copia di produzione `…\cffd8da6-…\scratchpad\prod-20261020\` e su `data/` (dev).
Script e uscite (scratchpad `…\161706c7-6e2c-47d6-bdb7-618347ce218c\scratchpad\`): `l5.cjs` → `l5-prod.json` / `l5-dev.json` (**identici**).
Riusa il censimento del mondo di L2 (`lotti/L2/dati.md`, `l2pin-prod.json`, impronta `impronta-mondo.cjs`). Requisiti: `lotti/L5/requisiti.md`.
Domande sul gioco poste all'**Esperto della guida** e **risposte** (registro `guida/registro.md` G-012, G-013, G-014): integrate in §3 e §4.

## 1. Luoghi (93)
- Origine: seed 92, utente 1. Tipi: negozio 37, punto-interesse 18, confidente 10, ristorante 8, attività 7, distributore 5, servizio 4, trasporto 3, scuola 1.
- Orari sul luogo oggi: `quando` 41 (giorno 27, sera 11, entrambe 3; 52 vuoti), `giorni` frase 10, `giorni_json` 9; `sblocco` frase 39;
  `condizioni_json` non vuote 13; frase `negozio` 42 (tutte chiavi di negozio valide); Confidenti 34; piatti 8.
- **Area** (via pin su una zona o legame `mappa_entita`): **42** con una zona sola, 0 con più zone, **51** senza.
  I 51 per quartiere: in quartieri **con** Aree 32 (Yongen-Jaya 6, Shibuya 8, Shujin 5, Shinjuku 3, Kichijoji 4, Akihabara 3, Kanda 2, Odaiba 1);
  in quartieri **senza** Aree 19 (Ikebukuro, Harajuku 2, Ueno, Inokashira, Shinagawa, Nakano, Ogikubo, Chinatown, Maihama, Roppongi,
  Tsukishima, Meiji, Ichigaya, Suidobashi, Asakusa 2, Memento 2). 8 dei 51 hanno solo un pin sull'illustrazione del quartiere (fioraio-sukebe,
  mran-mran, akiba-electronics, distributori-akihabara, nagiuri, ogikubo-ramen, tsukishima-monjayaki, laghetto-ichigaya).

## 2. Negozi (61)
- Origine: seed 57, utente 4. **`luogo_chiave` è il quartiere, non il luogo** (58 su 58 valorizzati sono chiavi di `quartiere`, 0 di `luogo`;
  3 NULL); coerente col quartiere della sede in tutti i 57 casi. La sede vera è `sede_chiave` (57, tutte valide).
- Il «dove» in 4 forme: frase `luogo` 60, `luogo_chiave` (quartiere) 58, `sede_chiave` 57, frase `luogo.negozio` 42 (16 negozi con sede non
  sono citati dalla frase del loro luogo, perlopiù i distributori).
- **Senza sede (4)**: `prossimo-asso` «Articoli Sportivi Shibuya» (il luogo `shibuya/prossimo-asso` esiste e lo cita con la frase `negozio`: sede
  deducibile); `negozio-palazzo-niijima` (dentro il Palazzo); `tanaka-affari-loschi` (online dal laptop di Leblanc); `home-shopping-tv` (televisore
  di Leblanc). Questi 3 non hanno un luogo nel mondo.
- **Sedi con più negozi**: `shujin-academy/distributori-shujin` 4, `akihabara/distributori-akihabara` 6.
- Orari: frase `orari` 60, `orari_json` 61; `sblocco` frase 35; `condizioni_json` 0.
- Articoli 587, tutti con negozio valido; 16 articoli con condizioni che citano luoghi/negozi (vocabolario unico: L6).
- Partita: `acquisto_partita` p1 **7** (articoli tutti esistenti); `punti_negozio_partita` 0.

## 3. Orari: negozio contro luogo della sede (R5-04)
Confronto di `negozio.orari_json` (giorni, fasce) con `luogo.giorni_json` + `luogo.quando` della sede: **57 confrontabili, 23 divergenti** (torna
col piano 23/57). Per tipo:
- **18 negozio vuoto, luogo valorizzato** (nessun conflitto: vale il luogo): body-chop, 37-gradi-celsius, tsurukame-diamond, high-sense,
  libreria-taiheido, discount-rocinante, farmacia-aohige, triple-seven, panetteria-yon-germain, chiosco-kiyasuku, yumenoshima, akindo,
  tokobushiya, akiba, super-baron, hinokuniya, libreria-nagiuri (luogo «giorno»), distributore-yongen-tabaccaio (luogo «entrambe»).
- **3 luogo vuoto, negozio valorizzato** (il dato passa al luogo): venditore-ambulante (lun–ven, sera), negozio-scolastico (lun–sab),
  tempio-kichijoji (giorno).
- **2 conflitti veri**, risolti dall'Esperto della guida (`guida/registro.md`, G-012, G-013):
  - `leblanc`: il locale è aperto di giorno; caffè e curry si **preparano la sera** (caffè da Sojiro R2, curry da R4), e il Leblanc non è
    nell'elenco dei negozi della guida → il «solo sera» è la fascia dell'**attività**, non del luogo: eccezione dichiarata sul negozio, oppure
    attività del luogo. Il luogo non va toccato. **Da correggere anche il «quando» del luogo** (oggi «entrambe», G-012 dice giorno): in elenco da approvare.
  - `chiesa-kanda`: «sera dom/lun/mer/sab» è la disponibilità di **Hifumi** (Confidente Stella), non della chiesa; gli oggetti si vendono **solo la
    domenica**; il confessionale è dopo scuola o di sera; i giorni di apertura della chiesa non risultano dalle fonti. → I giorni del luogo vanno al
    Confidente (L9), il negozio resta «domenica» come eccezione; prezzi: vale AGS (Vino della grazia 14.000, Ceneri del pentimento 12.000), elenco.

## 4. Pin del mondo non di passaggio (228 su 298)
- Per riferimento: nessuno **151**, luogo 54, negozio 19, attività 2, Confidente 2. (I requisiti dicono 113 senza riferimento: la differenza sono
  24 pin di tipo «passaggio» senza destinazione e altri tipi; vedi sotto.)
- Senza riferimento per tipo: nota 43 (33 seed, 10 utente), **dialogo 35 (tutti utente)**, passaggio 24 (21 seed, 3 utente; senza
  riferimento!), distributore 10, attività 10, negozio 8, punto-sensibile 6 (utente), terme 6 (utente), cercalavoro 2, culto, ristorante,
  uscita, cinema, lavoro, casa, velluto 1 ciascuno. Per livello: quartiere 12, zona 139. Per origine: seed 82, utente 69.
- **11 pin senza riferimento hanno il nome di un luogo dello stesso quartiere** (tutti seed, sulle illustrazioni dei quartieri senza aree):
  221 Harajuku, 222 Museo di Ueno, 223 Parco Inokashira, 224 Odaiba Seaside Park, 225 Acquario di Shinagawa, 227 Chinatown, 228 Tokyo
  Destinyland, 229 Sede Okumura Foods, 231 Santuario Meiji, 233 Dome Town, 234 Asakusa → candidati a diventare il pin del luogo.
- Pin → luogo (54): seed 32, utente 22; 39 nativi; nome diverso dal luogo **3**; con descrizione 53, descrizione diversa dal `cosa_offre` del luogo
  **38** (38 su 39 nativi; il piano diceva 40/40).
- Pin → negozio (19): **17 su 19 puntano a un negozio la cui sede non ha pin**; i distributori di Shujin sono citati da 9 pin, **5 dei quali stanno
  fuori da Shujin**: 1527, 1768, 1769 (Shibuya Central Street), 1547 (Tornello Ginza), 1584 (Yongen-Jaya Vicoli). Risposta dell'Esperto (G-014):
  i listini dei distributori **si ripetono fra quartieri** (set A/B/C/D); 1527, 1547 e 1768 sono **coerenti** col gioco; **1769 probabilmente
  sbagliato** (Central Street «destra» vende Nastea/1UP/Starvicks + Creatura); **1584 non coerente** (a Yongen nessuna macchina vende Dr. Salt NEO;
  la più simile è `distributore-yongen-bagno`). Sono **pin dell'utente**: nessuna modifica automatica, 1769 e 1584 nell'elenco «da approvare». 1541 «Articoli sportivi» → `prossimo-asso` (negozio senza sede).
- Altri: 334 «Libreria» → attività biblioteca-shujin; 1587 «Gabbie di Battuta» → attività batting-cage-yongen; 1753 → Confidente ann;
  1767 → Confidente yoshida.
- Stati di partita sui pin del mondo: **0**.

## 5. Marcatori
- `marcatore_luogo` **47** (tutti seed, nessun luogo inesistente): 33 luoghi hanno anche un pin; i 14 senza pin sono: 11 coperti dai pin omonimi del
  §4 (Harajuku … Asakusa, tranne 3 sotto), più batting-cage-yongen (pin 1587, attività), super-muramasa (pin 1589, negozio), distributori-shujin
  (pin dei negozi). Nessun dato di posizione si perde smettendo di leggerli.
- `marcatore_mappa` 149: **non sono del mondo**: sono le posizioni delle schede senza mappa dei Palazzi (lotto L4, `lotti/L4/dati.md` §7).
  R5-19 va riferito a `marcatore_luogo`.

## 6. Altri lettori di luoghi e negozi
- Attività 30: `sede_chiave` 29 (tutte valide), frase `luogo` 30. `confidente_disponibilita.luogo` frase 23 (L9).
- `libro_posizione`: negozio 31, luogo 13, quartiere 3, attività 1. `film_posizione`: luogo 35, quartiere 7.
- Diario: 39 voci con `riferimento_tipo='negozio'` (31 nel 04-01..06-01), 12 negozi distinti, tutti esistenti; il nome del negozio compare nel
  testo solo in **10/39** (es. «Canale di televendite» → «Home Shopping in TV»; «Negozio Softair» → «Untouchable»). R5-11: mostrare il nome
  dal vivo accanto, senza toccare il testo (impronta del diario invariata).

## 7. Regole di migrazione proposte
1. **Luogo → Area** (colonna nuova `luogo.area_chiave`, chiavi di L2):
   - 42 dal pin sulla zona o dal legame `mappa_entita` (deterministico);
   - 13 nei quartieri con **una sola** Area (Shinjuku 3, Kichijoji 4, Akihabara 3, Kanda 2, Odaiba 1): proposti per quell'Area, **in elenco da
     approvare** (non hanno pin: l'Area è dedotta, non provata);
   - 38 «da collocare» (19 in quartieri con più Aree, 19 in quartieri senza Aree). Nessuna Area inventata.
2. **Negozio → sede**: `sede_chiave` resta la sola fonte; `prossimo-asso` → `shibuya/prossimo-asso` (dedotto dalla frase del luogo, elencato);
   Niijima, Tanaka, Home Shopping in elenco da approvare (proposta: Tanaka e TV con sede `yongen-jaya/leblanc`; Niijima senza sede nel mondo).
   `luogo_chiave` (quartiere) e le frasi `luogo`/`luogo.negozio` non si cancellano: si smette di leggerle, via in L11.
3. **Orari sul luogo** (strutturati): dal luogo (`quando`, `giorni_json`); dove il luogo è vuoto, dal negozio (3 casi); Leblanc: luogo «giorno»
   (correzione da approvare) + eccezione serale sul negozio/attività; Chiesa di Kanda: giorni del luogo spostati a Hifumi (L9), negozio «domenica»
   come eccezione; le frasi restano come nota. Distributori con più negozi: un orario del luogo.
4. **Pin di un luogo**: `spillo.nome`/`descrizione` non si cancellano; si smette di leggerli per i pin di luogo; le 38 descrizioni diverse e i 3 nomi
   diversi in elenco (dubbio 8) per diventare nota del luogo dopo il sì.
5. **11 pin omonimi** (§4): `riferimento_tipo='luogo'` verso il luogo corrispondente (sono seed; cambio di riferimento elencato e reversibile).
6. **Pin di negozio**: restano; la navigazione va al luogo-sede del negozio. Distributori (G-014): listini condivisi per set → un luogo
   «distributore» per ogni posto che cita il negozio del suo set (dubbio 7); 1527, 1547, 1768 invariati; 1769 e 1584 in elenco «da approvare»
   (pin dell'utente, nessun cambio automatico).
7. **Marcatori**: `marcatore_luogo` non più letto (posizioni coperte da pin, §5); tolto in L11.
8. Pin «passaggio» senza riferimento (24) e pin di nota/dialogo: invariati (dubbio 4).

## 8. Conteggi attesi dopo
| Voce | Atteso |
|---|---|
| luoghi | 93 (+0: nessun luogo nuovo senza sì) |
| luoghi con Area | 42 certi + 13 da approvare = 55; da collocare 38 |
| negozi con sede | 58 (57 + prossimo-asso); in elenco 3 |
| divergenze di orario scheda/visore | 0 (fonte unica: il luogo; Leblanc e Chiesa di Kanda con eccezione dichiarata sul negozio, G-012/G-013) |
| pin del mondo | 298, stessa posizione/planimetria/condizioni (impronta del mondo di L2); `riferimento` cambiato solo sugli 11 pin omonimi (seed) |
| pin di luogo | 54 + 11 = 65 |
| acquisti p1 | 7 invariati |
| impronta diario/Kamoshida/Madarame | identica (`1a71b030…bc4c`) |

## 9. Revisione del 2026-10-20 (dati di sviluppo dopo l'aggiornamento di Madarame, decisioni più recenti)
Rifatto `l5.cjs` su `data/` (sviluppo) e sulla copia di produzione: **sviluppo = produzione** e **nessuna cifra dei §1–§8 è cambiata** (stesso JSON della prima stesura,
0 differenze). L'aggiornamento di Madarame non tocca luoghi, negozi, orari né pin del mondo. Cambiano invece le **regole**, per le decisioni prese dopo la prima stesura;
qui sotto cosa vuol dire sui dati di oggi.

### 9.1 Lo sblocco dei ritrovi sta già sui luoghi, ma con le vie vecchie
**13 luoghi** hanno già `condizioni_json` di sblocco; in **8** la via alternativa all'evento è una **data** che non corrisponde alle decisioni (L6 §8b, G-018, G-023):
| Luogo | Condizione di oggi | Regola decisa | Cambio |
|---|---|---|---|
| `odaiba/odaiba-seaside-park` | libro «Luoghi della movida» **oppure data 06-01** | libro **oppure** `confidente{ann,10}` (decisione dell'utente) | data 06-01 (messa in vendita del libro) → Ann rango 10 |
| `harajuku/harajuku-hangout` | libro «Vague» **oppure data 08-03** (Mishima) | libro **oppure** invito di **Ryuji 05-29** (G-023) | 08-03 → invito Ryuji 05-29 |
| `ikebukuro/planetario-ikebukuro` | libro «Cieli notturni» **oppure data 09-01** | libro **oppure** invito di **Makoto 07-30** | 09-01 (vendita del libro) → invito Makoto 07-30 |
| `meiji-shrine/meiji-shrine-hangout` | libro **oppure data 08-05** | libro **oppure** invito di **Ann 08-06** | 08-05 → 08-06, come invito |
| `shinagawa/shinagawa-acquario` | libro **oppure data 07-28** | libro **oppure** invito di **Akechi 07-29** (messaggio la sera del 07-28) | 07-28 → invito 07-29 |
| `nakano/nakano-broadway` | libro **oppure data 10-09** | libro **oppure** invito di **Futaba 10-09** | stessa data, ma «invito avvenuto», non data |
| `ichigaya/laghetto-ichigaya` | libro **oppure data 07-06** | libro **oppure** invito di **Ryuji 07-03** | 07-06 → 07-03, come invito |
| `roppongi/okumura-foods-hq` | **data 09-15** | `data{09-19}` (G-018, certezza media) | 09-15 → 09-19, da confermare |
Corrette o coerenti: `asakusa/tokyo-skytree` (lettura «Shitamachi rinato» ✔), `harajuku/takenoko-street` (lettura «Vague» ✔), `yokohama-chinatown/chinatown-hangout` (lettura
«Dolci cinesi» ✔), `maihama/destinyland` (libro oppure data 10-11 ✔, la data a certezza media).
- **Inviti come eventi del diario**: oggi gli inviti sono scritti come `data` (il giorno dell'invito), quindi un luogo «si apre» a quella data anche se l'invito non è
  avvenuto. Con la decisione dell'utente la condizione diventa «invito avvenuto», che oggi **non ha voci nel diario** (L10 §8.1: 9 voci proposte da G-023). Finché le voci non ci
  sono, il luogo si apre solo col libro. **6 luoghi** coinvolti: Harajuku hangout, Planetario, Meiji, Acquario, Nakano Broadway, Laghetto di Ichigaya.
- **Senza condizione strutturata, solo la frase** (da convertire, L6 §8b): `asakusa/asakusa-hangout` (Ann rango 7, **decisione dell'utente**), `inokashira-park/inokashira-hangout`
  (Ann R3), `ogikubo/ogikubo-ramen` (Ryuji R4), `tsukishima/tsukishima-monjayaki` (Ryuji R7), `ueno/museo-ueno` (Yusuke R3), `suidobashi/dome-town` («10 giugno» → **06-09**,
  G-018), `kichijoji/jazz-jin` (Akechi R4), `kichijoji/mantra-ganda` (Gemelle R3), `kanda-jinbocho/chiesa-kanda` (dal 28/6 = data di Kanda).
- **Jinbocho**: nessun luogo si chiama così; il quartiere `kanda-jinbocho` ha `chiesa-kanda` e `nagiuri` (Libreria Nagiuri). Il ritrovo Jinbocho (Hifumi R4 **oppure** «Pagine
  ammuffite») **non ha un luogo** su cui mettere l'evento: da creare (L5, «Aggiungi luogo») o da far indicare all'Esperto.

### 9.2 Clinica di Takemi (decisione dell'utente: negozio dal 16/04, Tae dal 18/04)
- Luogo `yongen-jaya/clinica-takemi` (tipo `confidente`): `sblocco` «18 aprile», nessuna condizione. Con la decisione il **luogo** (sede del negozio) si apre il **16/04**; il
  18/04 resta la data del **Confidente** (requisito del rango 1, L6 §5).
- Negozio `clinica-takemi`: `sblocco` «dal 15 aprile», nessuna condizione; i 11 articoli a `data 04-15` → 04-16 (L6 §5).

### 9.3 «Luogo chiuso nascosto dai menu» (R5-20b, decisione dell'utente)
Per nascondere un luogo chiuso servono orari o sblocco **strutturati**. Oggi:
- con `quando` 41, con `giorni_json` 9, con condizioni 13; **senza nessuno dei tre: 41 luoghi su 93**. Per questi «chiuso» non è calcolabile: restano **sempre visibili**
  (nessun dato per nasconderli) finché L5/L6 non ne strutturano orari e sblocco. Di questi 41, quelli con una frase di sblocco sono nel §9.1 (Confidente/rango).
- Orari: le 23 divergenze del §3 vanno risolte prima, altrimenti un luogo può risultare chiuso dalla scheda e aperto dal visore (R5-04). Restano le 2 eccezioni di G-012/G-013
  (Leblanc, Chiesa di Kanda) come orari del **negozio**, non del luogo: non nascondono il luogo.
- I luoghi senza pin (46) non compaiono comunque nei menu della mappa; compaiono negli elenchi del quartiere e dell'Area, dove vale la stessa regola.

### 9.4 Cifre cambiate rispetto alla prima stesura
Nessuna cifra misurata è cambiata. Cambiano le **attese** per effetto delle decisioni:
| Voce | Prima stesura | Ora |
|---|---|---|
| luoghi con sblocco strutturato da correggere | — | **8** condizioni con la via vecchia (§9.1) + **26** luoghi con lo sblocco solo come frase (§10: il «9» del §9.1 contava solo i ritrovi) |
| luoghi aperti da un invito | 6 come «data» | 6 come «invito avvenuto» (voci del diario da creare, L10 §8.1) |
| Clinica | luogo 18/04 | luogo **16/04** (negozio), Confidente 18/04 |
| luoghi per cui «chiuso» non è calcolabile oggi | — | **41** (sempre visibili finché non hanno orari o sblocco) |
| ritrovi senza luogo | — | **1** (Jinbocho) |

### 9.5 Copia fresca di produzione (`dati-produzione/2026-10-20-0440Z/`)
Rifatto `l5.cjs`: **identico** alla copia precedente (byte per byte). Le novità di produzione (fine di Madarame, voce del diario del 06-01) non toccano luoghi, negozi,
orari né pin del mondo: §1–§9 e §10 restano validi.

## 10. Sblocco strutturato per ogni luogo (regola dell'utente: «mai una frase») — PROPOSTE con le fonti dell'Esperto (G-029)
**Cifre rimisurate sulla copia fresca di produzione** `dati-produzione/2026-10-20-0440Z/gioco.db` (correzione dell'utente: niente misure sui dati di sviluppo; la
prima stesura di questo § era misurata su `data/`). Sulla copia fresca: **93** luoghi; **26** hanno lo sblocco **solo come frase** (`sblocco` valorizzato,
`condizioni_json` vuoto); **41** non hanno né `quando`, né `giorni_json`, né condizioni; **11** sono in entrambi gli elenchi → **56 luoghi** da sistemare; **13** luoghi
hanno condizioni, di cui gli **8** del §9.1 con le vie vecchie (testo delle 8 condizioni identico, riga per riga); più il ritrovo di Jinbocho. **Nessuna cifra cambia**
rispetto alla prima stesura. L'Esperto (G-029) ha controllato anche lui i 93 luoghi sulla copia fresca: identici.
**Principio** (confermato da G-029): lo sblocco del **luogo** è separato da quello del **Confidente** o del **lavoro** che vi si trovano (requisiti di rango, Doti, date dei
Confidenti stanno in L9 sul Confidente e sull'attività). Dove la frase descrive il Confidente o il lavoro, il luogo si apre col suo quartiere (`quartiere{q}`, nel
vocabolario; per Stesura vale la regola di base `condizioneEffettiva(luogo)` = quartiere sbloccato AND condizioni del luogo, quindi `quartiere{q}` non va scritto riga per
riga). Eccezioni: i luoghi con un evento proprio (tabelle sotto). Le chiavi proposte esistono sulla copia fresca: `libro.esplorando-yoncha-4`,
`richiesta.un-ex-piuttosto-appiccicoso`.

### 10.1 I 26 luoghi con lo sblocco solo come frase
| Luogo | Frase di oggi (inizio) | Condizione proposta | Fonte / stato |
|---|---|---|---|
| asakusa/asakusa-hangout | Confidente Ann Rango 7 | `confidente{ann,7}` | **decisione dell'utente** (G-009, G-018) |
| inokashira-park/inokashira-hangout | Confidente Ann Rango 3 | `confidente{ann,3}` | G-018 (alta) |
| ogikubo/ogikubo-ramen | Confidente Ryuji Rango 4 | `confidente{ryuji,4}` | G-018 (alta) |
| tsukishima/tsukishima-monjayaki | Confidente Ryuji Rango 7 | `confidente{ryuji,7}` | G-018 (alta) |
| ueno/museo-ueno | Confidente Yusuke Rango 3 | `confidente{yusuke,3}` | G-018 (alta) |
| kichijoji/jazz-jin | Confidente Akechi Rango 4 (dal 26 giugno) | `confidente{akechi,4}` | G-018 7b, G-029 (alta) |
| suidobashi/dome-town | 10 giugno | `data{06-09}` | G-018 / G-010 (alta) |
| yongen-jaya/clinica-takemi | 18 aprile | `data{04-16}` (luogo = sede del negozio); Tae dal 04-18 sul Confidente | **decisione dell'utente** (G-006) |
| kanda-jinbocho/chiesa-kanda | dal 28 giugno; Fascino Rango 3 per il primo incontro | `data{06-28}` (apertura di Kanda); Fascino 3 → requisito di Hifumi (L9) | G-018 11 (alta) |
| kichijoji/mantra-ganda | Rango 3 delle Gemelle custodi | `confidente{gemelle,3}` | G-029, NEG «Mantra Ganda» (alta) |
| shibuya/protein-lovers | Ryuji Rango 5 oppure Ann Rango 8 | `almeno-una[confidente{ryuji,5}, confidente{ann,8}]` | G-029, AGS allenamento-casa-e-palestra (alta) |
| yongen-jaya/venditore-patate-dolci | dal 9 ottobre | `data{10-09}` | G-011, G-029 (alta) |
| mementos/negozio-jose | appare casualmente nei Memento | **`richiesta{un-ex-piuttosto-appiccicoso}`** (completata: Jose compare dopo la prima richiesta dei Memento) | **G-029 (media)** |
| shibuya/untouchable | Iwai: 15 agosto…; negozio disponibile dal Palazzo di Kamoshida in poi | **`data{04-17}`** (visita con Ryuji); Iwai (Coraggio 4) → Confidente (L9). Né quartiere né Palazzo | **G-029 (alta)** |
| akihabara/sala-giochi-akihabara | richiesta Memento «I vincitori non imbrogliano» (Shinya) | `quartiere{akihabara}`; la Richiesta → requisito di Shinya (L9) | G-029 (alta) |
| kichijoji/kichijoji-galleria-kasumi | avvio automatico 30 maggio… | `quartiere{kichijoji}`; il resto → Kasumi (L9) | G-029 (alta) |
| shibuya/rafflesia | lavoro part-time: Fascino Rango 2 | `quartiere{shibuya}`; Fascino 2 → attività «lavoro» (L9) | G-029 (alta) |
| shibuya/scarlet | disponibile una volta raggiunta Shibuya | `quartiere{shibuya}` | G-029 (alta) |
| shibuya/triple-seven | nessun requisito | `quartiere{shibuya}` | G-029 (alta) |
| shibuya/ore-no-beko | nessun requisito per il lavoro | `quartiere{shibuya}` | G-029 (alta) |
| shibuya/stazione-piazza-shibuya | Confidente Yoshida: 9 maggio | `quartiere{shibuya}`; Yoshida dal 05-09 (L9) | G-029 (alta) |
| shinjuku/crossroads | Confidente 5 luglio; lavoro: Ohya + Gentilezza 3 + … | `quartiere{shinjuku}`; Ohya 07-05 e il lavoro → L9 | G-029 (alta) |
| shinjuku/chihaya-stand | Incontro 23 giugno; svolta 30 giugno | `quartiere{shinjuku}`; Chihaya → L9 | G-029 (alta) |
| shinjuku/hinokuniya | alcuni titoli richiedono attività | `quartiere{shinjuku}`; i titoli → condizioni degli articoli (L6/L7) | G-029 (alta) |
| shujin-academy/cancello-shujin | Confidente attivo dal 26 luglio (Conoscenza 3) | `quartiere{shujin-academy}` (iniziale); Makoto → L9 | G-029 (alta) |
| shujin-academy/corridoio-2-piano-shujin | 4 giugno; Coraggio 3 per la prima chiamata | `quartiere{shujin-academy}`; Kawakami → L9 | G-029 (alta) |
Esito G-029 sulla tabella: **tutte confermate**, salvo **Jose** (compilata: richiesta) e **Untouchable** (corretta: `data{04-17}`). La frase di oggi resta come nota;
quella di `untouchable` cita Iwai e va spostata sul Confidente.

### 10.2 I 30 luoghi senza orari né sblocco (oltre agli 11 già nel §10.1)
Sblocco: **`quartiere{q}`** per tutti (regola di base `condizioneEffettiva`), **salvo le 5 eccezioni di G-029** in grassetto. **Orari**: dove la guida italiana non dice nulla
vale la **regola dell'app «giorno e sera»** (G-011, L5 §7.12 / R5-12c), non un dato della guida; la fascia di Samurai Gamers (SG) è solo una conferma e **non** si scrive
come dato. Si scrivono come dato solo gli orari che la **guida italiana** dà (colonna «Orari dalla guida»).
| Luogo | Sblocco | Orari dalla guida (da scrivere) | Fonte G-029 · certezza |
|---|---|---|---|
| shibuya/venditore-ambulante | quartiere | `fascia{sera}` + `giorno-settimana{lun–ven}` + `meteo{non-piove}` | SC «Venditore ambulante»; AGS effetti-del-meteo · alta |
| yongen-jaya/batting-cage-yongen | **`lettura{libro, esplorando-yoncha-4}`** | `fascia{sera}` (di giorno solo col Coupon: condizione dell'articolo/attività, non del luogo) | AGS gabbie-di-battuta · alta (SG dice «giorno»: vale la guida) |
| yongen-jaya/bagno-pubblico | **`lettura{libro, esplorando-yoncha-4}`** | regola (SG «sera» solo conferma); effetto maggiore con pioggia/neve = effetto, non orario | AGS gabbie-di-battuta «Come sbloccare» · alta (sblocco), media (fascia) |
| shujin-academy/infermeria-shujin | **`data{05-13}`** | `fascia{giorno}` + `giorno-settimana{lun, mar, mer, ven}` | AGS guida di Maruki · alta |
| shujin-academy/negozio-scolastico | quartiere | `fascia{giorno}` (dopo scuola); gli articoli del venerdì restano condizioni degli articoli | SG + NEG · media |
| shibuya/distributore-sottopasso | quartiere | regola; vuoto con Ondata di calore / Notte torrida (condizione degli articoli, G-011) | G-011 · alta |
| yongen-jaya/sakura-residence | **nessuno sblocco proprio** (G-031): mai visitabile liberamente; la stanza compare solo negli eventi di Futaba (R6 16/10, R7 2/11, R10 amore, 15/1). **Né** `confidente{futaba,6}` **né** `data{10-16}` | — | G-031 · media → **«Da rivedere»** per l'utente (R11-10c) |
| kichijoji/mercante-sakai | quartiere **e** le **16 finestre** di G-031 in `gruppo{almeno-una}` di `intervallo`: 06-12→06-17, 06-26→07-02, 07-11→07-12, 07-26→07-30, 08-07→08-13, 08-22→08-27, 09-04→09-06, 09-19→09-24, 10-02→10-08, 10-16→10-22, 10-30→11-05, 11-13→11-17, 11-27→12-03, 12-11→12-17, 01-13→01-14, 01-22→02-02 | nessuna (non risulta): regola «giorno e sera» | G-031: sta a Kichijoji (vicoli centro-occidentali), **chiave confermata**; l'ultima finestra secondo la guida (SG dice 1/28). Ogni finestra ha uno scambio: **a L7** |
Gli altri 22 con **`quartiere{q}`** e la regola «giorno e sera»:
- **Akihabara**: distributori-akihabara, maid-cafe-akihabara, gachapon-akihabara.
- **Kichijoji**: penguin-sniper, vestiti-usati-kichijoji (SG «giorno», media: solo conferma), stoneon, mitsubachi, houraku, mealport, vecchio-tempio-kichijoji.
- **Shibuya**: diner, big-bang-burger, sala-giochi-shibuya, underground-mall-lovers, stazione-shibuya, taisho-store.
- **Shinjuku**: cinema-cult9.
- **Shujin Academy**: distributori-shujin (a scuola: giorno, senza fonte).
- **Yongen-Jaya**: cinema-yongen (SG «giorno», bassa), lavanderia-yongen (SG «sera», bassa), stazione-yongen-jaya, distributore-bagno-pubblico (G-014).
Discordanze registrate da G-029: gabbie di battuta (AGS sera, SG giorno → vale AGS); Rafflesia (AGS: il **lavoro** è di giorno, SG: il negozio di sera → il negozio resta «giorno
e sera» per regola, il lavoro di giorno in L9).

### 10.3 Le 8 condizioni con le vie vecchie, riscritte secondo le decisioni
| Luogo | Oggi | Riscritta |
|---|---|---|
| odaiba/odaiba-seaside-park | libro OPPURE `data{06-01}` | `almeno-una[lettura{luoghi-della-movida}, confidente{ann,10}]` (**decisione dell'utente**) |
| harajuku/harajuku-hangout | libro OPPURE `data{08-03}` | `almeno-una[lettura{vague}, invito{ryuji, 05-29}]` (G-023) |
| ikebukuro/planetario-ikebukuro | libro OPPURE `data{09-01}` | `almeno-una[lettura{cieli-notturni}, invito{makoto, 07-30}]` (G-023) |
| meiji-shrine/meiji-shrine-hangout | libro OPPURE `data{08-05}` | `almeno-una[lettura{santuari-di-tokyo}, invito{ann, 08-06}]` (G-023) |
| shinagawa/shinagawa-acquario | libro OPPURE `data{07-28}` | `almeno-una[lettura{un-acquario-al-giorno}, invito{akechi, 07-29}]` (G-023) |
| nakano/nakano-broadway | libro OPPURE `data{10-09}` | `almeno-una[lettura{esplorando-nakano}, invito{futaba, 10-09}]` (G-023) |
| ichigaya/laghetto-ichigaya | libro OPPURE `data{07-06}` | `almeno-una[lettura{vedetta-lacustre}, invito{ryuji, 07-03}]` (G-023) |
| roppongi/okumura-foods-hq | `data{09-15}` | **resta `data{09-15}`** (G-031: prima visita il 15/9 dopo scuola, AGS sett. 22; G-018 corretta dall'Esperto). Non è una via vecchia: **nessuna riscrittura**. Dopo la visita il luogo non risulta visitabile liberamente: la guida non dà una fine strutturabile, nota |
`invito{confidente, data}` = «la voce del diario dell'invito è spuntata»: oggi quelle voci **non esistono** (L10 §8.1: 9 proposte, una nel diario validato e 4 in conflitto con
altre attività dello stesso giorno). Il vocabolario del codice (`shared/condizioniSpillo.ts`) non ha ancora un tipo «invito»: per Stesura il tipo `invito{invito}` è già
previsto in L6 §1 (`confidente_invito`, con la sua colonna `condizioni_json` da G-028). Finché le voci non ci sono, i 6 luoghi si aprono solo col libro.

### 10.4 Ritrovo di Jinbocho e Clinica
- **Jinbocho** (G-031, chiuso): Jinbocho è un'area a sé, distinta da Kanda, e il suo unico negozio è la Libreria Nagiuri. Il ritrovo è il luogo **esistente**
  `kanda-jinbocho/nagiuri`. Oggi sulla copia 0440Z ha `quando` «giorno» e nessuna condizione. Si apre con `almeno-una[confidente{hifumi,4}, lettura{libro, pagine-ammuffite}]`
  (G-018 11b; il libro `pagine-ammuffite` esiste). **Nessun luogo nuovo.** Dove si compra il libro, la guida dice due negozi (Hinokuniya nella pagina Libri, Taiheido
  nell'elenco dei negozi, dal 1/9): va nell'elenco **«Da rivedere»** (R11-10c), e non tocca la condizione del luogo.
- **Clinica di Takemi**: luogo `data{04-16}`; negozio `clinica-takemi` senza condizione propria (vale la sede); i 11 articoli 04-15 → 04-16; requisito del rango 1 di Tae
  `data{04-18}` (L6 §5).

### 10.5 Riepilogo
| Gruppo | Luoghi | Condizione |
|---|---:|---|
| frase → condizione propria (decisioni o G-006/009/010/011/018/029) | 14 | Asakusa, Inokashira, Ogikubo, Tsukishima, Ueno, Jazz Jin, Mantra Ganda, Protein Lovers, Dome Town, Clinica, patate dolci, Chiesa di Kanda, **Jose** (`richiesta`), **Untouchable** (`data{04-17}`) |
| frase che descrive il Confidente o il lavoro → `quartiere{q}` | 12 | confermati (G-029) |
| senza nulla → `quartiere{q}` + regola «giorno e sera» | 22 | confermati (G-029) |
| senza nulla → condizione propria e/o orari della guida | 6 | gabbie e bagno (`lettura`), infermeria (`data{05-13}` + orari), venditore ambulante, negozio scolastico (orari), distributore del sottopasso (articoli) |
| senza nulla → chiusi da G-031 | 2 | Sakura Residence (nessuno sblocco proprio, «Da rivedere»), Mercante Sakai (quartiere + 16 `intervallo`) |
| condizioni con vie vecchie | 8 | 7 riscritte (§10.3); Okumura `data{09-15}` confermata (G-031) |
| ritrovo di Jinbocho | 1 | sul luogo esistente `kanda-jinbocho/nagiuri` (G-031) |
Totale 14 + 12 + 22 + 6 + 2 = **56** (copia fresca 0440Z). Dopo L5 nessun luogo avrebbe più lo sblocco come frase (la frase resta come nota); i luoghi «sempre visibili» per
mancanza di dati (§9.3) scendono da 41 a **0** con la regola dell'app «giorno e sera». Sakura Residence non ha uno sblocco proprio: «solo eventi di Futaba», nell'elenco «Da rivedere».
**Applicazione** (Stesura, L6 §4.1): le condizioni con fonte G-029 e G-031 sono ora nel registro dell'Esperto; Asakusa resta decisione dell'utente. **Nessun punto aperto.**
- Le condizioni con le vie vecchie da riscrivere sono **7**, non 8: Okumura resta `data{09-15}`.
- Nell'elenco «Da rivedere» (R11-10c) vanno Sakura Residence (G-031, media) e il negozio del libro «Pagine ammuffite» (Hinokuniya o Taiheido).
- Le 16 finestre del Mercante Sakai, con uno scambio ciascuna, vanno anche a L7.

### 10.6 Base p5s (`dati-produzione/p5s-2026-10-20-0503Z/`, decisione dell'utente: la fonte dei dati è p5s)
`l5.cjs` è **identico** alla 0440Z e i conteggi diretti coincidono: 93 luoghi, 26 solo frase, 41 senza nulla, 13 con condizioni. Il §10 vale così com'è; cambia solo il
riferimento dell'impronta, `ff3033cb…` (L4 §11.8).

**Base p5s-2026-10-20-0533Z** (nuova base di riferimento): `l5.cjs` è **identico** alla 0503Z. Le cifre attese di L5 (93 luoghi, 26 solo frase, 41 senza nulla,
13 con condizioni, 61 negozi, §10.7) non cambiano. L'unica differenza della base è la «Prova» dell'utente (planimetria di Kamoshida, 0 pin), fuori da L5
(DATI-INVENTARIO §5). Impronta del lavoro da preservare identica: `ff3033cb…`.

### 10.7 Orari del luogo o del Confidente? (R5-12b, richiesta di Stesura) — dati della base p5s-0503Z; fonti chieste all'Esperto
Regola già applicata: Untouchable segue la Chiesa di Kanda, perché i suoi giorni erano quelli di Iwai. Confronto riga per riga fra gli orari del luogo e quelli del suo Confidente
(`confidente_disponibilita`):
| Luogo | Orari del luogo (`quando` · `giorni_json`) | Confidente: fasce · giorni | Altri usi del luogo | Lettura dei dati |
|---|---|---|---|---|
| shinjuku/crossroads | sera · tutti (`giorni` in frase, `giorni_json` vuoto) | Ohya: sera · tutti | negozio `crossroads` «Solo di sera»; lavoro serale | coincidono con Ohya **e** con il negozio |
| shinjuku/chihaya-stand | sera · mar/gio/sab/dom | Chihaya: sera · mar/gio/sab/dom | nessuno | **copia del Confidente** |
| shujin-academy/cancello-shujin | giorno · mar/gio/sab/dom | Makoto: date fisse di trama, giorno | nessuno | giorni **non** del Confidente (Makoto ha date fisse); fonte ignota |
| shujin-academy/corridoio-2-piano-shujin | sera · ven/sab | Kawakami: sera · ven/sab, luogo = telefono del Leblanc | nessuno | **copia del Confidente**, ma il Confidente non sta qui |
| shibuya/stazione-piazza-shibuya | sera · domenica (frase: «e festività») | Yoshida: sera · domenica | nessuno | **copia del Confidente** |
| shibuya/ore-no-beko | sera · — | Yoshida | lavoro part-time | fascia del lavoro? |
| kichijoji/jazz-jin | sera · — | Akechi (R4) | attività cocktail, ingresso 3.000¥ | fascia del locale? |
| akihabara/sala-giochi-akihabara | giorno · lun/mar/gio/sab | Shinya: giorno · lun/mar/gio/sab | nessuno | **copia del Confidente** |
| kichijoji/hagoromo | sera · domenica | — | negozio `friggitoria-hagoromo` «Domenica sera» (fonte AGS elenco-dei-negozi) | orario del negozio, senza Confidente |
**Esito con le fonti dell'Esperto (G-033)**:
| Luogo | Classe | Luogo dopo L5 | A L9 (Confidente / lavoro) o a L7 (articolo) |
|---|---|---|---|
| shinjuku/crossroads | **orario proprio del luogo** («il bar notturno») | resta `fascia{sera}`, tutti i giorni (`giorni_json` resta vuoto) | Ohya: sera, tutti i giorni (già sul Confidente) |
| kichijoji/jazz-jin | **orario proprio del luogo** («accessibile durante la sera pagando 3.000 yen») | resta `fascia{sera}`, tutti i giorni; i weekend di trama in cui è chiuso non sono strutturabili (nota) | — |
| shinjuku/chihaya-stand | del **Confidente** | regola «giorno e sera»: `quando` e `giorni_json` (mar/gio/sab/dom) tolti | Chihaya: sera, mar/gio/sab/dom, mai con la pioggia (già sul Confidente) |
| shujin-academy/cancello-shujin | del **Confidente** | orario scolastico **«giorno»** (G-033); `giorni_json` (mar/gio/sab/dom) tolto | Makoto: giorno, mar/gio/sab/dom (oggi sul Confidente ci sono le date di trama: da completare in L9) |
| shujin-academy/corridoio-2-piano-shujin | del **Confidente** | orario scolastico **«giorno»** (oggi `quando` = sera: **si corregge**); `giorni_json` (ven/sab) tolto | Kawakami: sera, ven/sab, **al telefono del Leblanc**; il corridoio serve solo al primo incontro del 4/6 (il luogo del Confidente si corregge in L9) |
| shibuya/stazione-piazza-shibuya | del **Confidente** | regola «giorno e sera»: `quando` e `giorni_json` (domenica) tolti | Yoshida: domenica sera e festivi, non con la pioggia |
| akihabara/sala-giochi-akihabara | del **Confidente** | regola «giorno e sera»: `quando` e `giorni_json` (lun/mar/gio/sab) tolti | Shinya: giorno, lun/mar/gio/sab |
| shibuya/ore-no-beko | del **lavoro** | regola «giorno e sera»: `quando` = sera tolto | lavoro part-time: solo di sera (L9, attività) |
| kichijoji/hagoromo | dell'**articolo** | regola «giorno e sera»: `quando` e `giorni_json` (domenica) tolti; il negozio non ha orario nella guida (certezza bassa) | «Domenica sera» va sull'unico articolo, il Katsu a pezzettoni (L7, condizioni dell'articolo). L'orario `negozio.orari` «Domenica sera» diventa nota |
Gli orari che passano a L9 coincidono già, tutti tranne Makoto, con `confidente_disponibilita` sulla base p5s: nessun dato si perde. La frase «festività» di Yoshida e «mai con la pioggia» di
Chihaya e Yoshida sono eccezioni per L6/L9. Hagoromo ha certezza bassa e va nell'elenco «Da rivedere» (R11-10c). Conteggio: **2** luoghi tengono i loro orari, **5** passano alla
regola «giorno e sera» e **2** (cancello, corridoio) all'orario scolastico «giorno».
