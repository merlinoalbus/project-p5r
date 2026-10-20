# L6 «Condizioni uniche» — analisi dati

Analisi dati, 2026-10-20. Sola lettura sulla copia di produzione `…\cffd8da6-…\scratchpad\prod-20261020\` e su `data/` (dev).
Script e uscite (scratchpad `…\161706c7-6e2c-47d6-bdb7-618347ce218c\scratchpad\`): `l6.cjs` → `l6-prod.json`/`l6-dev.json`, `l6rif.cjs` →
`l6rif-prod.json`/`l6rif-dev.json` (**identici** prod/dev). Requisiti: `lotti/L6/requisiti.md`.
Domande sul gioco poste all'**Esperto della guida** e **risposte** (`guida/registro.md` G-017): integrate in §4 (libri → ritrovi) e §6 (Ohya,
Kawakami, Gemelle).

## 1. Dove vivono oggi condizioni, sblocchi e date (righe non vuote)
| Forma | Tabelle e colonne |
|---|---|
| **JSON strutturato** (vocabolario dei pin) | articolo.condizioni_json 510 · spillo 173 · libro 45 · film 26 · copia_pezzo 23 · attivita 21 · luogo 13 · (negozio 0) |
| **requisiti strutturati dei Confidenti** | confidente_requisito 177 (tipo + `dati_json` + testo): meteo 63, data 54, dote 17, palazzo 15, richiesta 11, persona-abilita 10, evento 5, confidente 1, avviso 1 |
| **frasi** | quartiere.sblocco 20 · luogo.sblocco 39 · negozio.sblocco 35 · attivita.sblocco 21 · libro.sblocca 24 · articolo.condizione 106 (testo, non JSON) · confidente_disponibilita.sblocco_data 22 e sblocco_requisiti 22 · dungeon.data_sblocco 10, data_scadenza 8, furto_consigliato (testi lunghi) · trofeo.quando 16 |
| **date «MM-GG» a sé** | quartiere.sblocco_data 7 · articolo.disponibile_dal 288 · libro.disponibile_dal 45 · richiesta.disponibile_dal 33 e scadenza 33 · dungeon_atterraggio dal/al 3/2 · esame.data_risultati 4 |
| **stato di partita** | confidente_partita.sbloccato 46 · requisito_partita **0** (nessuna conferma manuale: R6-26 vale a vuoto) |

## 2. Il vocabolario usato davvero
Tipi presenti nelle condizioni JSON (occorrenze, gruppi annidati compresi): data 338, arco 159, intervallo 130, spillo 87, quartiere 57,
confidente 46, voce-guida 41, giorno-settimana 40, articolo 40, lettura 37, non 31, gruppo 28, dote 26, fascia 15, meteo 15, attivita 14,
rango-cliente 14, evento 12, stagione 11, richiesta 6, contatore 4, squadra 4, piove 2, punti-negozio 2 → **24 dei 27** tipi di
`shared/condizioniSpillo.ts` (non usati: palazzo, persona-abilita, persona-arcano).
Il vocabolario dei requisiti dei Confidenti aggiunge **palazzo, persona-abilita, avviso** e usa `meteo`, `data`, `dote`, `evento`, `confidente`,
`richiesta` con gli stessi campi (`dal`; `dote,rango`; `confidente,rango`; `evento`; `richiesta`); `palazzo` usa `dungeon`, `persona-abilita`
usa `persona,abilita`, `avviso` nessun campo.
Campi per tipo (JSON): data `dal`; intervallo `dal,al`; arco `dungeon`; quartiere `quartiere`; confidente `confidente,rango`; dote `dote,rango`;
lettura `categoria,chiave`; spillo `spillo,segnato`; voce-guida `voce,segnata`; articolo `articolo`; attivita `attivita,volte`; contatore
`cosa,almeno`; rango-cliente e punti-negozio `negozio,…`; gruppo `modo,condizioni`; non `condizione`; meteo `condizione`; squadra `membro`.

## 3. Riferimenti per chiave (R6-03)
- Condizioni JSON: **0 riferimenti rotti** su 503 controllati (quartiere 57, arco 159, confidente 46, lettura 37, spillo 87 per uid, voce-guida 41,
  articolo 40, attività 14, rango-cliente 14, richiesta 6, punti-negozio 2): sono già tutte per chiave.
- **Requisiti «richiesta» dei Confidenti: 11/11 per nome** (futaba R8, sojiro R9, chihaya R1 e R8, iwai R8, takemi R8, kawakami R9, ohya R8,
  shinya R1 e R9, hifumi R8). **Tutti e 11** hanno un nome identico a una sola `richiesta` → abbinamento sicuro, automatico (es. «Un fidanzato
  violento» → `un-fidanzato-violento`). Nessuno va in elenco dubbi.
- `articolo.condizione` 106 frasi non JSON accanto a 510 JSON: restano note (R6-18).

## 4. Quartieri (R6-08…R6-11)
- 24 quartieri: 4 senza sblocco (Yongen-Jaya, Shibuya, Shujin, Memento); **7 con `sblocco_data`** (Shinjuku 06-18, Kichijoji 06-05, Akihabara 08-31,
  Ikebukuro 09-01, Odaiba 06-01, Maihama 10-11, Suidobashi 06-10); **13 con la sola frase e nessuna data**: Kanda/Jinbocho, Harajuku, Ueno,
  Inokashira, Shinagawa, Nakano, Ogikubo, Chinatown, Roppongi, Tsukishima, Meiji, Ichigaya, Asakusa → sono i **13 «sempre rossi»**.
- Le condizioni `quartiere` oggi citano solo quartieri con data (articoli: Kichijoji 29, Shinjuku 19, Akihabara 6; pin: Odaiba, Maihama,
  Suidobashi): **nessuna condizione salvata dipende dai 13 rossi**; il rosso si vede su metro/città/disponibilità.
- Le frasi dei 13 si traducono quasi tutte in tipi esistenti: Confidente rango (Ueno, Inokashira, Ogikubo, Tsukishima, Asakusa, Kanda/Jinbocho),
  lettura di un libro **oppure** invito (Harajuku, Shinagawa, Nakano, Meiji, Ichigaya, Chinatown), evento di trama (Roppongi, «circa 19 settembre»).
  «Oppure» → `gruppo` con `modo` «almeno-una».
- **Libri che sbloccano** (`libro.sblocca`, 24 frasi; 11 parlano di posti): Vague → Takenoko Street (Harajuku), Luoghi della movida → Seaside Park
  (Odaiba), Un acquario al giorno → Shinagawa, Vedetta lacustre → pesca a Ichigaya, Dolci cinesi → Chinatown, Santuari di Tokyo → Meiji, Cieli
  notturni → planetario di Ikebukuro, Pagine ammuffite → Jinbocho, Parchi divertimento → Maihama, Shitamachi rinato → Tokyo Skytree (Asakusa),
  Esplorando Nakano → Nakano. `libro_posizione(tipo='quartiere')` ne lega solo **3** (dolci-cinesi → Chinatown, parchi-divertimento → Maihama,
  shitamachi-rinato → Asakusa): i «libri ignorati».
  **Odaiba e Asakusa** («seguono il libro», criterio del piano). Risposta dell'Esperto (`guida/registro.md` G-017): la guida scrive per ogni libro
  «Nuovo punto di ritrovo: X» → **il libro sblocca un ritrovo (la destinazione), non il quartiere come concetto**: Vague → Takenoko Street (dal
  18/5), Luoghi della movida → Seaside Park (dal 1/6), Cieli notturni → Planetario di Ikebukuro (dal 1/9), Pagine ammuffite → Jinbocho
  (Hinokuniya, dal 1/9), Shitamachi rinato → Tokyo Skytree (premio di una Richiesta). Vie alternative: Ann R7 per Asakusa; Hifumi R4 per Jinbocho,
  Mishima 28/7 per Ikebukuro, Mishima 3/8 per Harajuku, Ann R10 per Seaside Park (queste ultime solo da Samurai Gamers, certezza media).
  *(Superato da G-023: gli inviti di Mishima non esistono in Royal; vedi §8b.)*
  **Correzioni ai dati di oggi**: «1 giugno» (Odaiba) e «1 settembre» (Ikebukuro) in `quartiere.sblocco_data` sono le **date di messa in vendita del
  libro**, non sblocchi; l'«invito di Makoto del 30/7» per Ikebukuro non risulta in nessuna fonte.
  → Regola proposta: la condizione di sblocco sta sul **luogo/ritrovo** (sede, L5) = gruppo «almeno-una» (lettura del libro, via alternativa); il
  quartiere è «aperto» quando è raggiungibile almeno un suo luogo (un solo significato, R6-09). Le due `sblocco_data` errate (Odaiba 06-01, Ikebukuro
  09-01) diventano la `disponibile_dal` del libro, non del quartiere: elenco da approvare.

## 5. Clinica di Takemi: 4 date (R6-12)
luogo `yongen-jaya/clinica-takemi`.sblocco «18 aprile» · `confidente_disponibilita` takemi «18 aprile» · negozio `clinica-takemi`.sblocco «dal 15
aprile» · requisito rango 1 `{"dal":"04-15"}` con testo «**indicazione dell'utente, 2026-09-05**» · articoli: 11 con `data dal 04-15`, 7 con
`dal 04-16`. ~~Proposta 04-15~~ **superata dalla decisione dell'utente (2026-10-20, via PM; G-006/G-018)**: sono **due date di due cose**:
- **negozio di farmaci della clinica dal 16/04** (prima visita obbligata dalla trama) → sblocco del negozio/luogo-sede `data{04-16}`; i **11 articoli
  con `data dal 04-15` passano a 04-16** (i 7 già a 04-16 restano); `negozio.sblocco` «dal 15 aprile» resta nota;
- **Tae come Confidente dal 18/04** → requisito del rango 1 di takemi `{"dal":"04-15"}` **diventa `{"dal":"04-18"}`** (il testo «indicazione
  dell'utente, 2026-09-05» è superato dalla decisione di oggi: tenerlo come nota storica); `confidente_disponibilita` «18 aprile» e
  `luogo.sblocco` «18 aprile» coerenti (note).
Righe toccate: 11 articoli + 1 requisito; elenco consegnato.

## 6. Confidenti: data di sblocco (R6-14)
`confidente_disponibilita.sblocco_data` è una frase (22 righe), il requisito rango 1 di tipo `data` è strutturato (18 Confidenti). Confronto:
coincidono 14 (akechi, ann, futaba, haru, igor, kasumi, maruki, mishima, morgana, ryuji, sae, shinya, yusuke, hifumi «dal 28 giugno» = 06-28).
Diversi o da leggere: **ohya** «5 luglio» vs 06-18; **takemi** «18 aprile» vs 04-15 (§5); **kawakami** «3-4 giugno» vs 06-04; **gemelle** «subito
dopo l'accesso alla Stanza di Velluto (fine Madarame)» vs 05-18. Senza data strutturata al rango 1: iwai (15 agosto; requisito Coraggio 4), makoto
(26 luglio), sojiro (23 aprile; requisito Palazzo di Kamoshida), yoshida («inizio di maggio»), chihaya (richiesta). Risposte dell'Esperto (G-017):
**ohya: Rango 1 il 5/7** (il 18/6 è solo il primo incontro di trama al Crossroads, senza rango) → il requisito `{"dal":"06-18"}` è **sbagliato**, va 07-05
(elenco da approvare); **kawakami**: 3/6 evento «Becky», **4/6 il contatto (sblocco)**, R1 consigliato l'8/6 con Coraggio 3 → 06-04 giusto, la frase
«3-4 giugno» resta nota; **gemelle: dal 18/5** (Stanza di Velluto durante Madarame), R1 consigliato il 19/5; «subito dopo Madarame» non risulta → 05-18
giusto, la frase va corretta. Regola: la data vive nel requisito del rango 1; la frase resta nota.

## 7. Palazzi: apertura, scadenza, atterraggio (R6-16, R6-17)
- `dungeon.data_sblocco` / `data_scadenza` / `furto_consigliato` sono **testi lunghi** con più date ciascuno (es. Kamoshida: sblocco «11 aprile»,
  scadenza «2 maggio … furto il 22 aprile»; Madarame: sblocco «16 maggio … prima esplorazione il 19», scadenza «5 giugno … lettera entro il 2 giugno»,
  furto «1 giugno … completata il 27 maggio»); Iweleth senza scadenza. Nessuna colonna strutturata della finestra nei dati: la finestra usata da
  `arco` (159 condizioni) e dalla mappa di Tokyo sta nel codice (da Analisi app).
- `dungeon_atterraggio`: **solo Kamoshida** (3 regole: 04-11 → 152-2-0 pin 1657; 04-12 → 151-16-0; dal 04-15 → 151-1-0). Gli altri 8 Palazzi non
  hanno regole nei dati: le «6 divergenze su Tokyo» vengono dal codice.
- Proposta: finestra strutturata sul Palazzo (`apertura`, `scadenza`, più note) ricavata da queste frasi con elenco da approvare (dubbio 3).

## 8. Regole di migrazione proposte
1. **Formato unico**: le condizioni JSON di oggi sono già nel formato dei pin e per chiave → nessuna riscrittura (esito identico per costruzione).
   I requisiti dei Confidenti si convertono 1:1 (stessi campi); `richiesta` per nome → per chiave (11 abbinamenti sicuri, §3); `palazzo`,
   `persona-abilita`, `avviso` entrano nel vocabolario unico.
2. **Quartieri**: ogni quartiere ha un **evento di sblocco strutturato** (richiesta dell'utente) secondo la tabella del §8b (G-018 + decisioni
   dell'utente); le frasi `quartiere.sblocco` restano note; `sblocco_data` non è più letta (la data, dove c'è, sta nella condizione).
3. **Luoghi e negozi** (R6-13): sblocco sulla sede (L5); 39 + 35 frasi → elenco frase → condizione proposta / nota (dubbio 1).
4. **Clinica** (decisione dell'utente): negozio `data{04-16}` (11 articoli 04-15 → 04-16), Tae rango 1 `data{04-18}` (§5).
4b. **Ohya** rango 1 06-18 → 07-05 (G-017, da approvare); Kawakami e Gemelle invariati.
5. **Palazzi**: finestra strutturata dall'elenco (§7); `dungeon_atterraggio` resta la sola fonte d'atterraggio (le regole del codice vanno portate
   nei dati: compito della Stesura).
6. Nessuna frase viene cancellata in L6 (restano note, R6-18); nessuna condizione cambia esito senza elenco.

## 8b. Regola di migrazione dei quartieri: quartiere → condizione strutturata (G-018 dell'Esperto + decisioni dell'utente)
Regole: il libro sblocca **quando si finisce di leggerlo** (`lettura{libro}`), non alla messa in vendita; «oppure» = gruppo `almeno-una`; per i quartieri
con più ritrovi (Kanda/Jinbocho, Asakusa/Skytree, Kichijoji/Jazz Club) l'evento sta sul **ritrovo** (luogo, L5) e il quartiere è aperto quando lo è
almeno un suo ritrovo. ~~Gli inviti dei Confidenti non entrano nelle condizioni~~ → **Decisione dell'utente (2026-10-20, via PM)**: gli inviti dei
Confidenti sono **eventi del diario che sbloccano luoghi e aree**; le sette vie **O-1…O-7** di G-018 tornano nella condizione come `invito{confidente, data}`
avvenuto, **in OR** con la via principale. **Corrette dall'Esperto con i dati di Royal (G-023)**: Harajuku = **Ryuji 05-29** (O-1: non Mishima 08-03), Ikebukuro =
**Makoto 07-30** (O-3; **O-2 Mishima 07-28 non esiste** e si toglie), Meiji = **Ann 08-06** (O-4: non 08-05), Shinagawa = Akechi 07-29 (O-5), Nakano = Futaba 10-09 (O-6),
Ichigaya = Ryuji 07-03 (O-7; l'app diceva 07-06). Sei vie in tutto. Nel diario di oggi **nessuna voce** corrisponde a questi inviti
(`lotti/L10/dati.md` §8): l'evento «invito» va creato come voce nuova (da elenco). Il vocabolario delle condizioni non ha oggi un tipo «invito»: si esprime come
`evento` (evento di storia per chiave, es. `invito-mishima-harajuku`) oppure tipo nuovo — scelta di modifiche.md.
| Quartiere | Condizione | Oggi nei dati | Cambio |
|---|---|---|---|
| yongen-jaya | iniziale (sempre aperto, 04-09) | nessuno sblocco | dichiarato iniziale |
| shibuya | iniziale (04-09) | nessuno | dichiarato iniziale |
| shujin-academy | iniziale (04-11) | nessuno | dichiarato iniziale |
| ogikubo | `confidente{ryuji,4}` | frase coerente | strutturato |
| inokashira-park | `confidente{ann,3}` | frase coerente | strutturato |
| harajuku | `lettura{vague}` **oppure** invito O-1 (**Ryuji 05-29**, G-023) | frase + invito Mishima | invito Mishima → Ryuji; prezzo di «Vague» 700 → **1.800 ¥** (dato del libro, elenco) |
| kichijoji | `data{06-05}`; ritrovo Jazz Club `confidente{akechi,4}` | 06-05 | invariato + ritrovo |
| suidobashi | `data{06-09}` | **06-10** | **06-10 → 06-09** |
| odaiba | `lettura{luoghi-della-movida}` **oppure** `confidente{ann,10}` (**decisione dell'utente**) | 06-01 + frase | 06-01 non è uno sblocco (messa in vendita) |
| shinjuku | `data{06-18}` | 06-18 | invariato |
| kanda-jinbocho | Kanda `data{06-28}`; ritrovo Jinbocho `confidente{hifumi,4}` **oppure** `lettura{pagine-ammuffite}` | frase «Yusuke R5 / Hifumi R4» | Kanda: **Yusuke R5 → data 28/6** |
| ueno | `confidente{yusuke,3}` | frase coerente | strutturato |
| asakusa | `confidente{ann,7}` (**decisione dell'utente**); ritrovo Tokyo Skytree `lettura{shitamachi-rinato}` (premio della Richiesta `un-intruso-a-yongen-jaya`) | frase coerente; libro legato al quartiere in `libro_posizione` | il libro passa al ritrovo Skytree |
| shinagawa | `lettura{un-acquario-al-giorno}` **oppure** invito O-5 (Akechi 07-29, messaggio la sera del 07-28) | frase + invito Akechi | strutturato |
| ichigaya | `lettura{vedetta-lacustre}` **oppure** invito O-7 (Ryuji 07-03) | frase + invito Ryuji (07-06) | data dell'invito 07-06 → 07-03 (G-018) |
| tsukishima | `confidente{ryuji,7}` | frase coerente | strutturato |
| akihabara | `data{08-31}` (= Futaba rango 1) | 08-31 | invariato |
| ikebukuro | `lettura{cieli-notturni}` **oppure** invito O-3 (Makoto 07-30) — O-2 Mishima non esiste (G-023) | 09-01 + invito Makoto | 09-01 non è uno sblocco |
| meiji-shrine | `lettura{santuari-di-tokyo}` **oppure** invito O-4 (**Ann 08-06**, G-023) | frase + invito Ann (05/8) | data dell'invito 08-05 → 08-06 |
| roppongi | `data{09-19}` (Palazzo di Okumura) — certezza **media** | frase «circa 19 settembre» | strutturato, elenco «da confermare» |
| nakano | `lettura{esplorando-nakano}` **oppure** invito O-6 (Futaba 10-09, messaggio la sera del 10-08) | frase + invito Futaba | strutturato |
| maihama | `data{10-11}` **oppure** `lettura{parchi-divertimento}` (premio della Richiesta `non-siamo-i-tuoi-schiavi`) — data a certezza media | 10-11 | + libro |
| yokohama-chinatown | `lettura{dolci-cinesi}` (premio della Richiesta `un-part-time-infernale`) | frase «Chinese Sweets» | titolo italiano trovato |
| mementos | data di trama della prima discesa (non un ritrovo) — non ancora cercata | nessuno | resta fuori dalle condizioni finché l'Esperto non la dà |
Verifica sui dati: le chiavi dei libri citati esistono tutte in `libro` (vague, luoghi-della-movida, pagine-ammuffite, shitamachi-rinato, un-acquario-al-giorno,
vedetta-lacustre, cieli-notturni, santuari-di-tokyo, esplorando-nakano, parchi-divertimento, dolci-cinesi: §4); le Richieste `un-intruso-a-yongen-jaya`,
`non-siamo-i-tuoi-schiavi`, `un-part-time-infernale` esistono (sono nelle ricompense del censimento L7 §7).

## 9. Conteggi attesi dopo
| Voce | Atteso |
|---|---|
| condizioni JSON (articolo 510, spillo 173, libro 45, film 26, copia_pezzo 23, attivita 21, luogo 13) | invariate, stesso esito |
| riferimenti per nome nelle condizioni | 0 (le 11 richieste dei Confidenti passano a chiave) |
| quartieri con evento di sblocco strutturato | **23** (§8b: 3 iniziali, 6 data, 5 Confidente, 9 libro o «oppure»; + ritrovi Jazz Club, Jinbocho, Skytree); Memento a parte; «sempre rossi» 0 |
| correzioni di dati dei quartieri | suidobashi 06-10 → 06-09; kanda Yusuke R5 → 28/6; odaiba/ikebukuro: date di vendita tolte dallo sblocco; inviti fuori dalle condizioni |
| Confidenti con data corretta | Ohya 06-18 → 07-05 (G-017, da approvare); Tae 04-15 → 04-18 (decisione dell'utente); Kawakami e Gemelle invariati |
| Clinica | negozio dal 04-16 (11 articoli 04-15 → 04-16), Tae dal 04-18 |
| Confidenti con data di sblocco in un solo posto | 23 (requisito del rango 1), divergenze 0 dopo le risposte |
| `requisito_partita` | 0 → 0 |
| impronta diario/Kamoshida/Madarame | identica (`1a71b030…bc4c`); condizioni dei pin dei due Palazzi invariate — **riferimento nuovo dalla copia 0440Z: `bbd9de5d…` (§10)** |

## 10. Rimisura sulla copia fresca di produzione (`dati-produzione/2026-10-20-0440Z/`, 2026-10-20)
Sola lettura; script `l6.cjs`, `l6rif.cjs`, `lconcluso.cjs` (uscite `*-0440Z.json` nel mio scratchpad), confronto con la copia di produzione precedente.
- **§1–§9: nessuna cifra cambia.** `l6` e `l6rif` danno un risultato identico byte per byte: condizioni JSON (articolo 510, spillo 173, libro 45, film 26,
  copia_pezzo 23, attivita 21, luogo 13), riferimenti per nome, quartieri, Confidenti, Clinica e Palazzi non cambiano.
- **Impronta**: il riferimento per «prima/dopo» diventa `impronta-0440Z.json` (sha256 `bbd9de5d7833f0f9…`, L4 §11.7). Le differenze da `1a71b030…bc4c`
  sono lavoro dell'utente: la voce di Igor del 06-01 sera, `9b4f62e2f6694fd5af10a407a455d546`, e la fine di Madarame. La riga «impronta» del §9 va letta così.
- **«Palazzo concluso» col boss finale dichiarato** (L4 §8.14: tutti i pin `tesoro-palazzo` fatti **e** la voce `voce_boss_finale` fatta). Tutte le 8 chiavi
  della tabella di L4 §8.14 esistono sulla copia fresca e sono di tipo `boss`; per Madarame è la voce in ordine 19, «Scontro con Madarame».
  | Palazzo | p1 «Partita Roberto» | p2 «Tutorial» |
  |---|---|---|
  | Kamoshida (Tesoro: pin 614) | **concluso** (Tesoro ✓, boss 1/1) | **concluso** (Tesoro ✓, boss 1/1) |
  | Madarame (Tesoro: pin 811 e 2300) | **concluso** (Tesoro 2/2, boss 2/2) | no (Tesoro 0/2, boss 0/2) |
  | Kaneshiro, Futaba, Okumura, Niijima, Shido, Maruki | no (nessuno stato) | no |
  Oggi **0** condizioni di tipo `palazzo` nei dati: le condizioni «dopo il Palazzo di X» e «Completare il Palazzo» nascono con L6. Su questa copia quelle
  di Kamoshida e Madarame risultano **vere in p1**; in p2 è vera solo Kamoshida. Il dubbio 10 (Madarame mai concluso) cade anche nei dati.
- **Condizioni degli inviti** (G-028, nella riga di `confidente_invito`). Nei giorni degli inviti la copia fresca ha lo **stesso diario** della copia letta
  dall'Esperto: l'unica voce nuova è del 06-01. Quindi le verifiche «sul percorso del diario» di G-028 valgono anche qui.
  | Invito | Condizioni | Sul diario (copia fresca) |
  |---|---|---|
  | Ryuji → Ichigaya, 07-03 | Palazzo di Kaneshiro concluso; Temperanza R1 (Kawakami) | ✓ (banca 27/6; Kawakami R1 8/6) |
  | Akechi → Shinagawa, 07-29 | Diavolo R1 (Ohya) | ✓ (Ohya R1 5/7) |
  | Makoto → Ikebukuro, 07-30 | **Palazzo di Futaba concluso**; Imperatore R1 | ✗: la piramide si conclude il 3/8. **Decisione del PM: strada (a) di G-028**: la voce c'è (07-30 giorno, ordine 1, `da_rivedere`), con la condizione scritta; sul diario resta falsa |
  | Ann → Santuario Meiji, 08-06 | Palazzo di Futaba concluso; Morte R1 (Takemi) | ✓ (piramide 3/8; Takemi R1 18/4) |
  | Futaba → Nakano, 10-09 | Appeso R1 (Iwai) | ✓ (Iwai R1 15/8) |
  | Ryuji → Harajuku, 05-29 | (G-023: solo evento, nessuna voce nel validato) | invariato |
  Le condizioni «Palazzo … concluso» degli inviti leggono il concluso qui sopra: in p1 nessuna è vera (Kaneshiro e Futaba non hanno stati).
- **Base p5s** (`dati-produzione/p5s-2026-10-20-0503Z/`): `l6` e `l6rif` sono **identici** alla 0440Z. Il concluso non cambia: Kamoshida e Madarame in p1, Kamoshida in p2.
  In più Kamoshida p1 è ora anche **completato** (71/71, L4 §11.8). Impronta di riferimento: `ff3033cb…`.
- **Base p5s-2026-10-20-0533Z** (nuova base di riferimento): `l6`, `l6rif` e `lconcluso` sono **identici** alla 0503Z. Le cifre attese di L6 non cambiano
  (condizioni JSON 510/173/45/26/23/21/13, quartieri, Confidenti, concluso). La Prova dell'utente (Kamoshida, 0 pin) non tocca condizioni né
  Palazzi conclusi (DATI-INVENTARIO §5). Impronta identica: `ff3033cb…`.
