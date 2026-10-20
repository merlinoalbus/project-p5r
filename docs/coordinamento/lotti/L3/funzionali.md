# L3 «Palazzi: aree e infiltrazioni» — test funzionali

Stato: **casi preparati, basi «prima» prese (schema 109, prima della 110)**. Esecuzione a pezzi, quando BE e FE li segnalano.
- **Fonti:** `requisiti.md` (R3-01…R3-41, R3-37b/c; qui i criteri F), `modifiche.md` §2.2 (conteggi attesi), §3 (API), §4 (pagine, diario) e
  §6.3, `dati.md`, `elenco-diario-infiltrazioni.md`, registro dell'Esperto (G-022).
- **Valori attesi:** se dipendono da un dato di gioco (quale infiltrazione descrive una voce, ordine delle visite), si verificano con
  «Esperto della guida» (`guida/registro.md`).

## Basi «prima» (2026-10-20, `esiti-funzionali/base-prima/`, `base-l3.cjs`, sola lettura)
- **`dungeon-<k>-p1.json` / `-p2.json`:** `GET /api/compendio/dungeon/<k>?partita=1|2` per i 9 Palazzi e i Memento (20 risposte).
  Servono per R3-12 (Memento identici byte per byte) e per R3-31 (percentuali, raccolta, completamenti per partita).
- **`indirizzi-palazzi-prima.json`:** 669 indirizzi (264 chiavi pubbliche e 313 alias delle mappe di Palazzi e Memento, 92 righe di
  `guida_alias`), ognuno con la risoluzione di prima. Servono per R3-15 e R3-16.
- **`diario-palazzi-prima.json`:** il diario di tutto l'anno della partita 1. 996 voci, **67** che toccano un Palazzo (riferimento
  `dungeon`, «Sulla mappa» o atterraggio in un Palazzo), 18 fra il 04-01 e il 06-01. Il conteggio di `dati.md` §8 (45 voci con
  riferimento `dungeon`) si ritrova filtrando `riferimento.tipo='dungeon'`. Si confronta per uid.

## Dati e partite di prova
- **Scritture su Madarame e Kamoshida** (R3-13, 14, 20 e 22–27, che il piano prova «su Madarame su una copia»): sui dati condivisi `data/`
  non si aggiunge né si toglie nulla in quei due Palazzi, perché sono lavoro dell'utente da preservare. **Richiesta al PM:** un BE di prova
  su una copia di `data/` (porta a parte, avviato dal PM o da BE) per i casi che scrivono su Madarame. In alternativa si usa un Palazzo
  senza lavoro dell'utente (Okumura o Niijima), con le impronte prima e dopo e la pulizia dal cestino.
- **Partita di prova** «Prova funzionali L3» per R3-32 (segnare e togliere da guida e mappa) e per il campo «Infiltrazione» del diario:
  creata all'inizio, eliminata alla fine. Il legame voce→infiltrazione (`voce_infiltrazione`) sta in `gioco.db`, non nella partita: ogni
  conferma di prova si toglie alla fine, impronte prima e dopo.
- **Controllo:** impronte di `gioco.db` e `partite.db` (`L1/esiti-funzionali/impronta-db.cjs`) a ogni giro, più le righe di BE.log della
  finestra. Ricordare FUN2-2 (le prove che creano, eliminano o importano mappe risincronizzano i percorsi pubblici).

## Casi (atteso dai documenti; esito e prova grezza all'esecuzione)
| id | Criterio | Passi | Atteso |
|---|---|---|---|
| F3-01 | R3-01 | `GET /api/compendio/dungeon/madarame` | `areePalazzo`: 8 `AreaRiassuntoDto` ordinate, contenitore `dungeon`, ciascuna con `infiltrazioni` e `raccolta`; le planimetrie hanno `area` e `versioneEtichetta` |
| F3-02 | R3-02, R3-03 | DB in sola lettura | aree dei Palazzi 101, con Iweleth 117 (10/8/13/18/11/13/16/12 + 16); planimetrie dei Palazzi con area 219 (245), senza area 0; con etichetta 187 (203) |
| F3-03 | R3-04 | nomi delle 117 aree contro il test dorato (`l3aree-dev.json`) e contro i titoli delle stanze in `dungeon-<k>-p1.json` | ogni nome è quello mostrato prima (nome rivisto compreso), non quello della mappa |
| F3-04 | R3-05 | ordine delle aree e delle versioni; casi `152-1-0` e `153-7-0` | l'ordine mostrato prima, l'elenco di `dati.md` |
| F3-05 | R3-06 | `infiltrazione_area` | 93 righe (92 + pin 777), 105 con Iweleth; nessuna coppia non elencata |
| F3-06 | R3-07 | `AreaDungeonDto.mappe` di un'infiltrazione legata a un'area con più versioni | tutte le versioni dell'area; apertura sulla `planimetria_iniziale` |
| F3-07 | R3-08 | le 15 infiltrazioni senza planimetria | visibili nella scheda, in coda «senza aree» con «Collega aree», voci intatte (conteggio uguale a prima) |
| F3-08 | R3-09 | lettura delle viste (app.md §5) e delle risposte | nessuna vista legge `mappa_entita` area, `entita_*='area'` o `gruppo_immagini_json` dei Palazzi |
| F3-09 | R3-10 | BE.log «migrazione applicata» id 110 e riepilogo; `user_version` 110; test della 110 | applicata una volta; idempotente (test) |
| F3-10 | R3-11 | export e import di un Palazzo **solo sul BE di prova su una copia**; altrimenti il test BE §6.1.8 | stesse aree, versioni e legami; impronta identica colonna per colonna |
| F3-11 | R3-12 | `GET /api/compendio/dungeon/mementos?partita=1,2` contro `dungeon-mementos-p*.json` | identica byte per byte, salvo i campi nuovi dichiarati (`areePalazzo: []`) |
| F3-12 | R3-13 | DOM di `/guida/dungeon/madarame` | colonna «Aree · 8» con i chip delle infiltrazioni; infiltrazioni con le «Aree toccate» |
| F3-13 | R3-14 | apertura di ogni area (DOM) | visore subito sulla predefinita, con le versioni; testo «— scegli una planimetria —» assente in tutta la pagina |
| F3-14 | R3-15 | `/guida/mappe/palazzo-di-<k>` e `/guida/mappe/<planimetria>` (in iframe, indirizzo d'arrivo) | scheda `/guida/dungeon/<k>`; planimetria → `/guida/dungeon/<k>/area/<slug>[?planimetria=…]`, con `spillo` conservato; griglia mai raggiunta |
| F3-15 | R3-16 | i 669 indirizzi di `indirizzi-palazzi-prima.json` (`risolvi` → `casa`), più le strade P1–P12 di app.md §3: metro senza atterraggio (Madarame), con atterraggio (Kamoshida dal 04-15), indice, alias, Battaglia, contenuti della guida, accesso al mondo, mappa incorporata | Palazzi → scheda, area e infiltrazione giuste; `palazzo-di-madarame-museo-1p` → Museo 1P con `?planimetria=…153-2-1`; un `guida_alias` → `?infiltrazione=`; Memento invariati; P13 (Richieste) invariato; «Mappa del Palazzo» assente |
| F3-16 | R3-17 | `/guida/dungeon/<k>?infiltrazione=<i>` | aree, guida e mappa delle aree toccate; nessuna seconda vista a griglia |
| F3-17 | R3-18 | indirizzi salvati con `?area=<infiltrazione>` (dal diario e da `ContenutiGuidaMappa`) | stessa infiltrazione di prima; con tutti e due i parametri vince `infiltrazione` |
| F3-18 | R3-19 | intestazione del Palazzo | stemma e illustrazione L1 invariati (URL di `L1/funzionali.md` F-06) |
| F3-19 | R3-20 (criterio del piano) | «Aggiungi area» con immagine su Madarame (BE di prova) o sul Palazzo di prova | compare subito nell'elenco e nel visore, senza «scegli una planimetria»; poi eliminata e rimessa dal cestino |
| F3-20 | R3-21 | «Aggiungi planimetria» sull'area di prova | ruolo dedotto, si apre nel visore appena caricata |
| F3-21 | R3-22 | «Aggiungi infiltrazione» con «Aree toccate» | compare subito nell'elenco e sulle aree scelte (`POST …/aree` con `areePalazzo`) |
| F3-22 | R3-23 | collegare e scollegare dall'area (`PUT /api/aree/dungeon/:k/:slug/infiltrazioni`) e dall'infiltrazione (`PUT /api/compendio/aree/:i/aree-palazzo`) | stesso esito dai due lati; area di un altro Palazzo → 409 `area-di-un-altro-palazzo`; voci e pin invariati (impronta) |
| F3-23 | R3-24 | rinomina, riordino, predefinita, etichetta di una versione | visibile ovunque (elenco, visore, infiltrazioni, Battaglia, indice, ricerca) |
| F3-24 | R3-25 | eliminazione di area, planimetria e infiltrazione → cestino; ripristino | tornano versioni, legami, voci e pin; i tipi di prima del cestino funzionano come prima |
| F3-25 | R3-26 | `POST /api/mappe` sotto `dungeon-<k>` | 409 `usa-aggiungi-area`; le rotte vecchie `/aree`, `/stanza` e `/presentazione` scrivono sul modello nuovo |
| F3-26 | R3-27 | rinomina di un'area `seed` e «Ripristina» | `seed_json` scritto e poi rimesso; un'area `utente` → 409 |
| F3-27 | R3-32 (parte funzionale) | partita di prova: segnare e togliere una voce dalla guida e dalla mappa in un'area | stato coerente fra guida, visore e percentuali |
| F3-28 | R3-33, R3-33b | spilli 1735, 1816 e 1815 della radice di Kamoshida; pin 1656 di Shujin | portano dove portavano; 1656 → `/guida/dungeon/kamoshida/area/<slug>?planimetria=…152-2-0` |
| F3-29 | R3-37b | le 9 voci di `elenco-diario-infiltrazioni.md` (04-11, 04-12, 04-15, 04-22, 05-16, 05-19, 05-20, 05-27, 06-01) e il 04-20 | il campo «Infiltrazioni» è visibile; le 9 voci propongono l'infiltrazione dell'elenco, il 04-20 propone le tre infiltrazioni in ordine (Vecchio Castello, Tetto del Vecchio Castello, Ispeziona l'interno della torre; decisione del PM su FUN3-2); «Conferma» salva l'insieme; «Entra» → `?infiltrazione=<prima non completata>`; togliere il legame rimette il comportamento di prima; **nessuna scrittura automatica** (`voce_infiltrazione` vuota dopo la migrazione) |
| F3-30 | R3-37c | tutte le voci di Palazzo dell'anno (`diario-palazzi-prima.json`, filtro `dungeon` + `palazzoDellaVoce`) | il campo c'è su ogni voce di Palazzo; proposte uguali a G-022 (certe, multiple, probabili); le 11 senza infiltrazione restano vuote (compreso «Kamoshida il professore»); le 3 di Niijima puntano a `dungeon:niijima`; ripetizione non consecutiva accettata (N2: 10, 11, 12, 11, 13), consecutiva → 400 |
| F3-31 | R3-37c (voci nuove) | DB e diario | **R3-37c aggiornato da Analisi requisiti (2026-10-20):**
- esattamente 1 voce nuova: **06-26**, Kaneshiro, lettera di sfida al Ritrovo (non 06-25), con `aggiunta_da='team'`, `da_rivedere=1`, **senza
  proposta** (n/a: decisione del PM su FUN3-2, vale modifiche §2.1.6(d));
- 10-03, 11-13 (giorno) e 01-02 mostrano il campo «Infiltrazione» con la proposta di G-022; il riferimento al Confidente non cambia;
- 11-13 sera ha «da rivedere», nessuna proposta, nessun campo, testo invariato;
- `voce_infiltrazione` resta vuota;
- il diario 04-01..06-01 è identico (254 voci, stessi uid). e 6 correzioni del team dopo il 06-01 con `testo_precedente_json`; le 254 voci validate identiche (impronta); «Tieni il nuovo» e «Rimetti il precedente» provati solo sulla partita e sui dati di prova, poi rimessi |
| F3-32 | R3-34 (parte funzionale) | le voci di Palazzo fino al 06-01 e «Sulla mappa» (153-1-0 ×7, 152-1-0 ×3, Memento ×2) dalla guida giorno per giorno e da Oggi | stessa infiltrazione e stesso spillo di prima |
| F3-33 | Vitest mirati | §6.1 e §6.2 per i file pronti | verdi, output grezzo |

## Esiti a pezzi
### Pezzo 1 — 110 registrata e API di L3 sul 3201 (2026-10-20): sole letture (`esiti-funzionali/l3-letture-1.txt`, `l3-letture.cjs`)
- **F3-02 ✅**
  - 117 aree: 10/8/13/18/11/13/16/12, più 16 di Iweleth (dubbio 7: Iweleth migrato come gli altri Palazzi).
  - 245 planimetrie dei Palazzi, tutte con area; nessuna senza area.
  - 203 con etichetta (atteso con Iweleth).
- **F3-05 ✅** `infiltrazione_area` 105 righe (93 senza Iweleth): seed 65, utente 39, regola 1. La coppia del pin 777 (Giardino centrale,
  origine `regola`) c'è. 15 infiltrazioni senza aree, 35 aree senza infiltrazione (31 senza Iweleth). Nessuna area sui Memento; le aree
  del mondo restano 23.
- **F3-01 ✅** Madarame (partita 1):
  - `areePalazzo` 8, con ordine, numero di planimetrie e infiltrazioni;
  - le infiltrazioni sono 5, con lo stesso numero di voci di prima (base `dungeon-madarame-p1.json`);
  - `raccolta` identica: {86, 85, 17, 16}.
- **F3-11 ✅** La risposta dei Memento non contiene `areePalazzo` (verifica byte per byte fatta da Test no-reg, NR3-1).
- **F3-15 (parte server) ✅** Con `CASA_SCHEDA_PALAZZI` spento la casa resta il visore: `dungeon-kamoshida` → `/guida/mappe/palazzo-di-kamoshida`,
  e `palazzo-di-madarame-museo-1p` → `…-nativo-rmap-153-2-1`. Dopo FUN3-1 (verificato) nessuna «Pagina non trovata».
- **F3-29 ✅ / ❓ FUN3-2**
  - Le 9 voci dell'elenco hanno il campo e la proposta `certa` giusta: 04-11, 04-12, 04-15, 04-22, 05-16, 05-19, 05-20, 05-27, 06-01.
  - Il 04-20 ha la proposta `multipla` di tre infiltrazioni, come dice modifiche.md (FUN3-2 chiuso dal PM: vale modifiche.md, requisito
    da allineare, codice invariato).
  - Altre voci di Palazzo: 05-27 «Sosta nella Stanza di Velluto» ha il campo senza proposta; 05-16 «Primo accesso…», senza riferimento
    `dungeon`, ha campo e proposta.
- **F3-30 / F3-31 ✅ / ❓ FUN3-2**
  - `voce_infiltrazione` è vuota: nessuna scrittura automatica.
  - 10-03, 11-13 (giorno) e 01-02, con riferimento al Confidente, hanno il campo e la proposta `multipla`.
  - 11-13 sera: `daRivedere`, nessun campo, nessuna proposta, testo invariato.
  - Una sola voce nuova del team, il 06-26 («Ritrovo: invio della lettera di sfida a Kaneshiro…», `da_rivedere`). Non ha proposta, come dice
    modifiche §2.1.6(d) (FUN3-2 chiuso: vale modifiche.md).
  - 6 correzioni del team con il testo precedente: 06-20, 08-03, 10-29, 11-14, 11-19, 11-24.
  - Correzioni nel diario 04-01..06-01: 0.
- **In coda per il Collaudo** (correzioni di BE del 2026-10-20, `lotti/L3/be.md` §4):
  - §3.6.1: `PUT /api/aree/colloca` sull'unica versione di un'area → 409 `area-si-svuota`, poi `?conferma=1`, area svuotata nel cestino
    con i legami, e dal cestino torna vuota;
  - «Rendila un'area a sé» sull'unica versione → 400 `gia-area-a-se`;
  - rotta vecchia `/stanza`: il nome dato non sovrascrive quello scelto dall'utente;
  - import delle mappe: `idCambiati` (origine dei pin e immagini identiche sono NR3-2 e NR3-3, di no-reg).
- **Ancora da provare:** le scritture sui Palazzi, solo sul Collaudo quando L3 sarà lì; la pagina del Palazzo (FE di L3); i 669 indirizzi
  con l'interruttore acceso.

### Pezzo 2 — interruttore `CASA_SCHEDA_PALAZZI` tolto da BE (non committato), sul 3201: sole letture (2026-10-20)
Prova grezza: `esiti-funzionali/l3-indirizzi-senza-interruttore.txt` e `indirizzi-senza-interruttore.json` (i 669 indirizzi della base, con
la risoluzione di prima e quella di dopo, `GET /api/mappe/risolvi/<indirizzo>`).
- **Palazzi, 640 indirizzi: tutti alla scheda del Palazzo, nessuno al visore.**
  - 18 alla scheda (`/guida/dungeon/<k>`): radici e chiavi dei Palazzi, es. `palazzo-di-kamoshida` e `dungeon-kamoshida` → `/guida/dungeon/kamoshida`;
  - 539 alla pagina dell'area (`/guida/dungeon/<k>/area/<slug>`): planimetrie e aree, es. `nativo-rmap-160-1-0` → `/guida/dungeon/iweleth/area/piazza-stazione-shibuya`;
  - 83 all'infiltrazione (`/guida/dungeon/<k>?infiltrazione=<chiave>`): prima non si risolvevano.
- **Memento, 29 indirizzi: restano nel visore.** 20 erano già lì (`entrata-dei-memento`, `memento`…), 9 dedali erano senza risoluzione e
  ora vanno a `/guida/mappe/memento?area=<dedalo>`.
- Le **117 pagine di area distinte** citate rispondono tutte 200 a `GET /api/aree/dungeon/<k>/<slug>`: nessun collegamento rotto.
- Esito ✅ sull'API. La navigazione completa nell'interfaccia si prova quando arriva sul Collaudo (con la pagina FE di L3).

### Pezzo 3 — FE di L3 sul 5373 (BE 3201, codice non committato di BE e FE), sola lettura nel browser (2026-10-20)
> **Base: i dati VECCHI di `data/` del 3201** (prima della copia della produzione del 2026-10-20 04:40 UTC; correzione dell'utente via PM).
> Valgono **per il codice**: F3-13 (pagine d'area, versioni, nessun «scegli una planimetria»), F3-06 (apertura sulla `planimetria_iniziale`),
> F3-14, F3-16, F3-17, F3-18, F3-28 (navigazione e indirizzi). **Da rifare sulla copia nuova** le parti che dipendono dai dati: i chip, i
> numeri e la raccolta di F3-12; le proposte del diario di F3-29/F3-30/F3-31 (il 06-01 ha ora una voce in più); i conteggi dei pezzi 1 e 2.
Pagine aperte in iframe 1280×800 nella scheda del browser di prova (letture del DOM, nessun clic che scrive). Le immagini con `&l=320` della
pagina scrivono la cache delle miniature di `data/` (memoria «GET che scrivono»): è l'unico effetto.
- **Durante la prova il BE si è fermato tre volte per salvataggi a metà di BE** (lavoro in corso, non difetti di L3):
  - 04:35:17–04:35:58Z: `palazzoConcluso is not defined` (palazziService.ts:134);
  - 04:35–04:39Z: ogni `GET /api/mappe/<k>?partita=` → 500, `st.palazziCompletati` letto in mappeService.ts:343 dopo il cambio in
    `palazziConclusi`. Segnalato a BE (PM in copia) e corretto alle 04:39Z;
  - poi 502: export `fissaStatoDeiPinCheRestanoSenzaVoci` mancante in `statiGuida.ts`.

| id | Esito | Prova |
|---|---|---|
| F3-12 | ✅ | `/guida/dungeon/madarame`: «Aree · 8» con «Aggiungi area» e le maniglie ⠿; per ogni area numero, nome, «(completata)», versioni, raccolta, chip delle infiltrazioni in ordine di guida. Chip uguali a `areePalazzo[].infiltrazioni` e a `infiltrazione_area` del DB per tutte le 8 aree. Sala Principale «1 da prendere su 13» (`raccolta {13, 12}`). Infiltrazione aperta con «Aree toccate» e «Modifica aree». L'area aperta nel visore è `aria-pressed="true"`; le altre toccate dicono «(toccata dall'infiltrazione aperta)» |
| F3-13 | ✅ | Le 18 pagine `/guida/dungeon/<kamoshida|madarame>/area/<slug>`: nessun «— scegli una planimetria —», nessun errore. Il visore si apre sulla versione segnata «si apre per prima» (la predefinita), con la fila delle versioni (Museo 2P: 4, Livello 0 ON). Tetto di Kamoshida e Galleria di Madarame si aprono invece sulla `planimetria_iniziale` dell'infiltrazione aperta (151-6-1, 153-7-2), come vuole R3-07 (vedi F3-06) |
| F3-06 | ✅ | Tetto: infiltrazione `kamoshida-13-tetto`, `planimetria_iniziale` 151-6-1 (predefinita 151-6-0) → si apre 151-6-1; Galleria: `…nelle-profondita-del-museo`, iniziale 153-7-2 (predefinita 153-7-0) → si apre 153-7-2, «Livello 0» |
| F3-14 | ✅ | Indirizzo d'arrivo nell'iframe: `/guida/mappe/palazzo-di-kamoshida` → `/guida/dungeon/kamoshida`; `/guida/mappe/dungeon-madarame` → `/guida/dungeon/madarame`; `/guida/mappe/palazzo-di-madarame-museo-1p` → `/guida/dungeon/madarame/area/museo-1p?planimetria=palazzo-di-madarame-museo-1p-nativo-rmap-153-2-1`; `/guida/mappe/nativo-rmap-153-7-1?spillo=2201` → `…/area/sala-del-tesoro-galleria?planimetria=…153-7-1&spillo=2201` (`spillo` conservato); `/guida/mappe/nativo-rmap-152-2-0` → `…/kamoshida/area/prigione-sotterranea-tutorial?planimetria=…152-2-0`. Nessuna «Mappa del Palazzo» a griglia. `/guida/mappe/memento` e `/guida/mappe/entrata-dei-memento` restano nel visore |
| F3-16 | ✅ | `?infiltrazione=madarame-disabilita-i-sistemi-di-sicurezza` → «Infiltrazione 3 di 5», aree toccate Museo 1P · Museo 2P · Giardino centrale · Sala del Tesoro - Atrio, le stesse segnate nell'elenco; `kamoshida?infiltrazione=kamoshida-13-tetto` → «5 di 7», area Tetto. Nessuna seconda vista a griglia |
| F3-17 | ✅ | `?area=madarame-disabilita-i-sistemi-di-sicurezza` → stessa infiltrazione 3 di 5, stesse aree; `?area=…scopri-dove-il-tesoro&infiltrazione=…il-furto-del-cuore` → si apre la 5 di 5: vince `infiltrazione` |
| F3-18 | ✅ | Intestazione di Madarame: illustrazione `/api/immagini/mappa/dungeon-madarame/file?…&l=320` (200 image/webp) con lo stemma `/api/immagini/palazzi/madarame/file` sopra, nelle varianti per misura. Kamoshida dà la stessa `illustrazione` di L1 F-06 (`…dungeon-kamoshida/file?v=2026-09-29T15%3A32%3A16.649Z`) |
| F3-28 | ✅ | Spilli: 1735 (radice) → `/guida/dungeon/kamoshida/area/cancello-del-castello`; 1816 (radice) → `…/area/prigione-sotterranea-tutorial?planimetria=palazzo-di-kamoshida-sala-centrale`; 1815 (su 151-1-0, riferimento `dungeon-kamoshida`) → `/guida/dungeon/kamoshida`; 1656 (Shujin) → `…/area/prigione-sotterranea-tutorial?planimetria=palazzo-di-kamoshida-prigione-sotterranea-tutorial-nativo-rmap-152-2-0`, come atteso |
| F3-29 (interfaccia) | ✅ in parte | `/guida/percorso/<giorno>`: il campo «Infiltrazioni: nessuna · Modifica» con «Proposta: … (certezza) · Conferma» c'è il 04-12, 04-15 («Tutorial Palazzo …» — «La data è nel nome del tutorial», certa), 04-22, 05-16 (due voci), 05-19, 05-20, 05-27, 06-01 (certa); il 04-20 propone «Vecchio Castello, Tetto del Vecchio Castello, Ispeziona l'interno della torre» (più infiltrazioni), come decide il PM su FUN3-2. Il 05-27 ha una seconda voce di Palazzo senza proposta. Il 04-11 è da rifare: BE fermo (502) |
| F3-15 (strade nell'interfaccia, app.md §3) | ✅ (codice) | **P1** indice `/guida/dungeon`: carte → `/guida/dungeon/kamoshida`, `/guida/dungeon/madarame`. **P2** metro `/guida/mondo/dungeon/madarame` → `/guida/dungeon/madarame` (prima: griglia). **P4** «Mappa del Palazzo» assente dalla scheda. **P5** «Sulla mappa di Tokyo» apre la finestra «Sulla mappa di Tokyo — Palazzo di Madarame» (chiusa senza salvare). **P6** griglia mai raggiunta (vedi F3-14). **P7** pannello «Infiltrazioni in quest'area» di `…/area/museo-2p`: 2 (ON), 3, 4; il tocco su «4. Nelle profondità del Museo» → `?infiltrazione=madarame-nelle-profondita-del-museo&planimetria=…museo-2p-livello-0`, «Infiltrazione 4 di 5», stessa area e stessa versione. **P8** indice `/guida/mappe` › «Palazzo di Madarame»: «Apri Palazzo di Madarame» → scheda e le 8 aree → `/guida/dungeon/madarame/area/<slug>`. **P9** diario 05-19: «Palazzo di Madarame» → `?infiltrazione=in-corso`; 04-12: «Palazzo di Kamoshida» → `/guida/mappe/palazzo-di-kamoshida-sala-centrale`, che `RisolviMappa` porta alla casa (F3-14). **P10** «Sulla mappa» del 05-19 → `/guida/dungeon/madarame/area/entrata-del-museo`, senza `?spillo=` perché nei dati vecchi la voce ha `mappa {nativo-rmap-153-1-0, spilloId: null}` (con un pin, `?spillo=` resta: F3-14); 04-12 → `/guida/citta/shujin-academy?spillo=1616`. **P11** `/guida/battaglia`: 104 collegamenti alle schede dei Palazzi (senza parametro: le Ombre dei Palazzi non hanno infiltrazione) e 113 ai Memento con `?area=`, invariati. **P12** alias → `?infiltrazione=` (pezzo 2). P3 (atterraggio del giorno) dipende dalla data della partita: da rifare sui dati nuovi |
| F3-30 / F3-31 (interfaccia) | ✅ in parte | 06-26: campo senza proposta e «Da rivedere»; 10-03: proposta «Ingresso, Sala d'ingresso» (più infiltrazioni). 11-13 e 01-02 da rifare: BE fermo (502). «Conferma», «Modifica», «Entra» e «Da rivedere» scrivono: restano per la partita e i dati di prova |

### Pezzo 4 — sui dati freschi: istanza di ANTEPRIMA del Collaudo (BE 3302 / FE 5474), sola lettura (2026-10-20)
**Base:** codice = istantanea delle 04:55:01Z di pensive, con L3 e L4 non committati (impronta `d14f40cf…ff83`); dati = copia della
produzione **0440Z**, migrata fino alla 111 (`collaudo/anteprima/LEGGIMI.md`). Solo `GET` e DB aperto in sola lettura; nessun clic che scrive.
Prove grezze in `esiti-funzionali/anteprima-0440Z/` (`l3-letture-anteprima.txt`; lo script è `l3-letture.cjs` con BE 3302 e il `gioco.db`
dell'anteprima). Queste sostituiscono, per i valori che dipendono dai dati, gli esiti dei pezzi 1 e 3.

| id | Esito | Prova (dati 0440Z) |
|---|---|---|
| F3-02 | ✅ | 117 aree (10/8/13/18/11/13/16/12 + 16 Iweleth); 245 planimetrie dei Palazzi, tutte con area; 203 con etichetta; `user_version` 111 |
| F3-05 | ✅ | `infiltrazione_area` 105: seed 65, utente 40 (la coppia del pin 777 ora è `utente`, come dice il Collaudo: dichiarata dall'utente nella produzione); 15 infiltrazioni senza aree; 35 aree senza infiltrazione; 0 aree sui Memento; 23 aree del mondo |
| F3-01 / F3-12 | ✅ | `/guida/dungeon/madarame` (DOM) = `areePalazzo` (API) per le 8 aree: nomi, versioni (1/2/4/1/2/3/1/3), chip delle infiltrazioni in ordine, raccolta (Giardino centrale ora «2 raccolti»; Sala Principale 13/13). Intestazione «88 da raccogliere · 8 aree · 17 planimetrie · 17 complete · Completato · Tesoro ✓ · Boss ✓ · 227 punti della guida»; API `completamento {82/82, tesoro ✓, boss ✓, concluso ✓, completato ✓}` (Madarame ora completato: dati nuovi + §8.10 di L4) |
| F3-03 | ✅ | Le 117 aree del DB dell'anteprima, nell'ordine, contro `l3aree-dev.json` di Analisi dati (titoli mostrati prima, per versione): **117/117 nomi** fra i titoli mostrati prima, nome rivisto compreso (`f3-03-04-nomi-ordine.txt`) |
| F3-04 | ✅ | Stesso confronto: ordine delle aree 117/117; insieme delle versioni 117/117; predefinita = versione #0 del gruppo 117/117; ordine delle versioni = ordine di mappa (proposta di `dati.md` §5.2) 117/117, compresi 152-1-0 e 153-7-0 |
| F3-11 | ✅ | La risposta dei Memento non ha `areePalazzo` |
| F3-15 (server) | ✅ | `dungeon-kamoshida` → `/guida/dungeon/kamoshida`; `nativo-rmap-152-1-0` → `…/area/prigione-sotterranea-tutorial`; `palazzo-di-madarame-museo-1p` → `…/area/museo-1p?planimetria=…153-2-1` |
| F3-15 P3 | ✅ alla data della partita | Partita 1 al 06-02, Kamoshida concluso: `/guida/mondo/dungeon/kamoshida` → `/guida/dungeon/kamoshida` (e Madarame → scheda). L'arrivo del giorno **dentro** la finestra (dal 04-15) chiede una partita con un'altra data, che è una scrittura: con le prove che scrivono, sul Collaudo |
| F3-29 | ✅ | API e interfaccia (`/guida/percorso/<g>` sul 5474): le 9 voci dell'elenco con la proposta `certa` giusta (04-11 «Tutorial Palazzo 11/04», 04-12, 04-15, 04-22, 05-16 ×2, 05-19, 05-20, 05-27, 06-01 «Il furto del Cuore di Madarame»); 04-20 `multipla` Vecchio Castello, Tetto del Vecchio Castello, Ispeziona l'interno della torre; 05-27 «Sosta nella Stanza di Velluto» con il campo e senza proposta. 06-01: la voce nuova di Igor (sera) c'è e non ha il campo (non è di Palazzo) |
| F3-30 / F3-31 | ✅ | `voce_infiltrazione` 0 righe (nessuna scrittura automatica); 102 proposte su 37 voci; una sola voce del team, **06-26** «Ritrovo: invio della lettera di sfida a Kaneshiro», `da_rivedere`, campo senza proposta; 10-03 `multipla` «Ingresso, Sala d'ingresso»; 11-13 giorno `multipla` di 8 infiltrazioni con «Area riservata allo staff — Parte II» ripetuta non di seguito; 11-13 sera `da_rivedere`, senza campo; 01-02 `multipla` «Ingresso, Sala d'ingresso, Percorso di prova»; voci corrette con data ≤ 06-01: 0. Nell'interfaccia 11-13 mostra la proposta e un «Da rivedere» |

Restano per il ciclo di scrittura (foto e ripristino del Collaudo): F3-10, F3-19…F3-27, «Conferma»/«Modifica»/«Entra»/«Da rivedere» del diario,
P3 dentro la finestra, le correzioni di BE §3.6.1, `gia-area-a-se`, `/stanza` e `idCambiati`. → fatti nel pezzo 5, salvo P3 dentro la finestra.

### Pezzo 5 — ciclo di scrittura 1 sull'ANTEPRIMA (2026-10-20, 05:03:37–05:08:43Z)
**Base:** foto del Collaudo `anteprima-ciclo1-funzionali-L3` (05:00:32Z), stessa istantanea e stessi dati del pezzo 4. Ripristino chiesto
al Collaudo alle 05:08:43Z. Scritture via API (più due `PUT` dal browser dell'anteprima per «Entra»), su **Okumura** come chiesto dal
Collaudo; la partita di prova su Madarame (solo `partite.db`, partita 3 creata ed eliminata, 0 righe residue). Nessuna scrittura sulla
partita 1. Script `esiti-collaudo-funzionali/l3-ciclo.cjs` (fasi), uscite `ciclo1-*.txt`.

| id | Esito | Prova |
|---|---|---|
| F3-19 | ✅ | `POST /api/aree/dungeon/okumura?nome=Prova funzionali L3&etichetta=Livello 1&infiltrazioni=okumura-05-linea-esportazioni` (PNG) → 201: area `utente`, `casa` `/guida/dungeon/okumura/area/prova-funzionali-l3`, legata a «Linea Esportazioni», subito nella scheda. Nell'interfaccia (5474) la pagina dell'area si apre senza «scegli una planimetria», con le miniature delle versioni. Eliminata e rimessa dal cestino: F3-24 |
| F3-20 | ✅ | `POST …/prova-funzionali-l3/planimetrie?etichetta=Livello 2` → 201: seconda versione, `tipo` dedotto `area`, genitore `dungeon-okumura`, `versione_ordine` 1 |
| F3-21 | ✅ | `POST /api/compendio/dungeon/okumura/aree {nome, areePalazzo:[prova, caserma]}` → 201 `okumura-prova-funzionali-l3-infiltrazione`, ordine 10; nella scheda con le due aree toccate, e le due aree mostrano il chip |
| F3-22 | ✅ | Dall'area: `PUT …/interscambio/infiltrazioni` aggiunge l'infiltrazione di prova → la si vede dall'infiltrazione. Dall'infiltrazione: `PUT /api/compendio/aree/<inf>/aree-palazzo` senza interscambio → l'area torna con la sola sua. **409 `area-di-un-altro-palazzo`** in tutti e due i versi (Museo 1P dall'infiltrazione; «Prima Infiltrazione al Museo» dall'area). Voci 56 e pin 148 di Okumura invariati |
| F3-23 | ✅ | Rinomina «Prova funzionali L3 rinominata», riordino (in cima), predefinita → seconda versione, etichetta «Livello alto» e ordine delle versioni: visibili nella scheda (ordine 0, predefinita), nel dettaglio, nell'infiltrazione, in `risolvi` (casa dell'area) e nell'albero delle mappe (nome dell'area e etichetta). Non esiste una rotta di ricerca separata (`/api/compendio/cerca` 404): la ricerca dell'interfaccia non è provata qui |
| F3-24 | ✅ | `DELETE` dell'area: senza conferma **409 `area-con-contenuti`** («2 planimetrie, 0 pin e 2 infiltrazioni»); con `?conferma=1` → cestino `area-fisica`, sparita dalla scheda; ripristino → area, versioni (etichette e ordine) e legami **identici**. Planimetria → cestino `mappa` → ripristino, versioni identiche. Infiltrazione → cestino `area` (legami tolti) → ripristino, legami tornati. **Area seed con pin** (Caserma: 14 pin, 2 legami, alias, percorso, `mappa_entita`) → cestino → ripristino: mappe, pin, `spillo_voce`, legami, area e voci identici |
| F3-25 | ✅ | `POST /api/mappe` sotto `dungeon-okumura` → **409 `usa-aggiungi-area`** («Nei Palazzi le planimetrie si aggiungono dalla scheda del Palazzo…»). Rotte vecchie: `PUT /api/mappe/<versione>/aree` → cambia i legami **dell'area**; `/presentazione` → cambia l'etichetta della versione; `/stanza` → vedi §3.6.1 |
| F3-26 | ✅ | Caserma (`seed`): rinomina → `nome_rivisto` 1 e `seed_json {"nome":"Caserma","nome_rivisto":0,"planimetria_predefinita":"nativo-rmap-156-13-0"}`; «Ripristina» → «Caserma», `seed_json` null. Su un'area `utente` → **409 `area-dell-utente`** |
| F3-27 | ✅ | Partita di prova, Madarame Museo 2P: segnare dalla guida il forziere «Rasetsu Ofuda» → voce `ottenuto`, pin 758 fatto, raccolta dell'area 1/15 (scheda e dettaglio), completamento 1/82; tolto → tutto 0. Spunta dal pin 758 → pin fatto e raccolta 1/15, **la voce resta da fare** perché ha 5 pin (758, 2188–2191): è la regola k/N della §8.11 di L4 (NR4-1), non un difetto. Un pin di una voce con un solo pin (2142) segna la voce |
| F3-10 | ✅ | `GET /api/mappe/esporta?radice=dungeon-okumura` (4 MB: 26 mappe, 12 aree, 13 legami) e `POST /api/mappe/importa {sovrascrivi: true}` → 200; aree, mappe, legami e pin di Okumura **identici riga per riga**. Vedi O3-1 |
| idCambiati | ✅ | Assente in un import senza id occupati, come dice `be.md` («assente se vuoto»). Il caso con l'id occupato: test «§3.6.3» verde (sotto) |
| §3.6.1 | ✅ | «Rendila un'area a sé» sull'unica versione di B → **400 `gia-area-a-se`**. «Colloca» dell'unica versione di B in A → **409 `area-si-svuota`** (`details {area, arrivo, legami: 0}`); con `?conferma=1` → la versione va in A con l'etichetta «Da B», B nel cestino; dal cestino torna **vuota**. Con legami (area C legata a «Caserma»): 409 con `legami: 1`, nel cestino «fusa in «Prova funzionali L3 rinominata»» con area e legame; ripristinata, vuota e col suo legame |
| `/stanza` | ✅ | `PUT /api/mappe/<versione B>/stanza {con: <versione di A>, nome: "Nome dato dalla rotta vecchia"}` → 200, il nome di A scelto dall'utente (`nome_rivisto` 1) **resta** |
| F3-29/30 (scritture del diario) | ✅ | 05-19 «Conferma» → insieme [«Scopri dov'è il Tesoro»], una riga in `voce_infiltrazione`; insieme vuoto → 0 righe e di nuovo la proposta. «Entra» (interfaccia): con l'insieme [Scopri, Profondità] → `?infiltrazione=madarame-nelle-profondita-del-museo` (in partita 1 tutte completate: l'ultima, fe.md §4.1); senza insieme → `?infiltrazione=in-corso`. 11-13: ripetizione non consecutiva → 200; consecutiva → **400 `infiltrazione-ripetuta-di-seguito`**. «Da rivedere»: 06-20 «rimetti» → testo = `testo_precedente_json.azione`, `da_rivedere` 0; 08-03 «tieni» → resta il nuovo, `da_rivedere` 0; 06-26 «fatto» → `da_rivedere` 0; su una voce non da rivedere → **409 `voce-non-da-rivedere`** |
| F3-33 (parte) | ✅ | `npx vitest run server/routes/palazzi-aree.test.ts` (con `DATA_DIR` vuota) → 16/16, compresi «§3.6.1» (conferma e `/stanza`) e «§3.6.3» (`vitest-palazzi-aree.txt`) |

**O3-1 (osservazione per BE):** l'export delle mappe di un Palazzo non porta le aree **senza planimetrie** né i loro legami (dopo il ciclo
Okumura aveva 14 aree e 14 legami; il pacchetto ne aveva 12 e 13: mancavano B e C, vuote dopo «Colloca»). Su un'altra istanza un'area
svuotata ma tenuta (o ripristinata dal cestino vuota, come vuole §3.6.1) non tornerebbe. Da decidere se è voluto.
→ **Non era voluto (BE, 2026-10-20): corretto nel commit 12484305** su newreview (solo L3). Con la radice di un Palazzo nel pacchetto entrano
tutte le sue Aree, anche senza planimetrie, con i loro legami, e l'import le rimette identiche (test palazzi-aree «O3-1»). **Verificato**
dal vivo sull'anteprima su 12484305 (pezzo 8): l'area vuota e il suo legame sono nel pacchetto e l'import li lascia identici.

**Resta:** P3 dentro la finestra (partita con data dal 04-15) e la ricerca dell'interfaccia per F3-23.

### Pezzo 10 — R8 del validatore: ciclo di scrittura su `newreview-l3` = b5fd6cfe dall'interfaccia (collaudo 5473/3301, 1280×800, 2026-10-20)
Ciclo con la foto del Collaudo (17:21:59Z, identica alla base 0948Z). Le scritture vanno dalle **17:22:49.593Z alle 17:29:55.868Z**.
Gesti dall'interfaccia, con le risposte API grezze registrate dal `fetch` della pagina. Okumura per la gestione, partita 1 per il diario.
La partita di prova 3 serve al 04-20: è stata creata, ha avuto 77 punti segnati via API ed è stata eliminata.
Esito completo in `esiti-collaudo/b5fd6cfe/R8/funzionali-R8-esito.md`, con le fotografie e i confronti `funzionali-*.txt`. Solo testo.

| id | Esito | Prova |
|---|---|---|
| F3-19 | ✅ | «Aggiungi area» (nome, immagine, «Livello 1», infiltrazione aperta già spuntata) → `POST /api/aree/dungeon/okumura?…` 201. Subito `/area/prova-r8-area?infiltrazione=okumura-05-linea-esportazioni`: nell'elenco come «12.», nel visore l'immagine, nessun «scegli una planimetria» |
| F3-20 | ✅ | «Aggiungi planimetria» → `POST …/prova-r8-area/planimetrie?etichetta=Livello 2` 201. Si apre la versione nuova («versione 2 di 2»); `tipo` area e `ruoloImmagine` planimetria-nativa dedotti, `versioneOrdine` 1 |
| F3-21 | ✅ | «Aggiungi infiltrazione» con Caserma e l'area nuova → `POST /api/compendio/dungeon/okumura/aree` 201 `okumura-prova-r8-infiltrazione`, ordine 5. Si apre «Infiltrazione 6 di 11»; il pannello dell'area la elenca |
| F3-22 («Modifica aree») | ✅ | «Altro» → «Modifica aree»: ↑ e «+ Interscambio» → `PUT …/aree-palazzo?partita=1` `["prova-r8-area","caserma","interscambio"]` 200. Si apre la prima area; voci e pin invariati |
| F3-24 | ✅ | «Elimina area» su Caserma (finestra: «planimetria con 14 pin e i legami con 2 infiltrazioni») → `DELETE …?conferma=1` 204. Infiltrazione «Caserma» con «Modifica testo» → «Elimina» → «Confermo» → `DELETE /api/compendio/aree/okumura-03-caserma` 204. Dal cestino «Rimetti com'era» → `ripristina` 200 (`rimesse` 33 e 661, `saltate` []). Le **10 tabelle di Okumura e del diario sono identiche riga per riga** a prima dell'eliminazione, `updated_at` compresi: versione, 14 pin, legami, 6 voci, `mappa_entita`, ordine delle infiltrazioni |
| R3-37b (9 voci) | ✅ | 04-11, 04-12, 04-15, 04-22, 05-16 (×2), 05-19, 05-20, 05-27, 06-01. Per ognuna: «Conferma» → `PUT …/percorso/voci/<uid>?partita=1` con la proposta, 200. Il collegamento apre la `?infiltrazione=` confermata e si arriva sull'infiltrazione giusta. «Togli» → `[]` 200, e voce, campo, proposta e collegamento tornano **identici** a prima. La voce del 05-16 senza riferimento non ha collegamento, com'è giusto |
| 04-20 | ✅ | «Conferma» → tre infiltrazioni in ordine. Partita 1, tutte completate → l'ultima, «Ispeziona l'interno della torre». Partita di prova vuota → «Vecchio Castello», la prima non completata. Con Vecchio Castello completato (34/34) → «Tetto del Vecchio Castello». «Togli» ×3 → come prima |
| — | **FUN3-3** aperto | Con un atterraggio (04-12, 04-20, 04-22) la finestra «Infiltrazioni della voce» dice che il collegamento apre la prima della proposta, ma porta alla planimetria d'atterraggio e a un'altra infiltrazione. Il comportamento segue la §4.1; il testo no. Vedi `difetti.md` |

Osservazione per Test UX: l'area nuova, vuota, si presenta nell'elenco come «(completata) · niente da raccogliere · completa».
`voce_infiltrazione` alla fine a 0 righe; partita 1 di nuovo attiva. **Ripristinata dal Collaudo alle 17:30:32Z**: impronta identica alla foto e alla
base 0948Z; 114 scritture nel BE.log, tutte dei gesti dichiarati, nessun 5xx (`esiti-collaudo/b5fd6cfe/R8/LEGGIMI.md`).

### Pezzo 9 — linea di rilascio `newreview-l3` = d5eb9650 sul collaudo (FE 5473, BE 3301, base p5s 0948Z), 2026-10-20 (passo A3)
Codice c8338fd0 + soli documenti (correzioni della ripresa d73e7027..c8338fd0); userVersion 113. Prove grezze in
`esiti-funzionali/d5eb9650/`. Letture 09:57–10:12Z; ciclo di scrittura con foto del Collaudo (10:13:04Z, identica a `L3-base-p5s-20261020-0948Z`)
dalle **10:13:31 alle 10:14:12Z**; **ripristinata dal Collaudo alle 10:14:39Z**, impronta identica alla foto e alla base (prima del ripristino cambiati solo due `updated_at`, area `dungeon/okumura/caserma` e partita 1; 17 scritture nel BE.log, tutte dichiarate: `esiti-collaudo/cicli-dati.md`). Su p5s nessuna scrittura.

| Caso / riga | Esito | Prova |
|---|---|---|
| Letture di L3 (F3-01/02/05/11/15/29/30/31) rifatte | ✅ | `l3-letture-collaudo.txt`: uscita **identica** a quella dell'anteprima su p5s-0503Z (pezzo 6), salvo `user_version` 113 (prima 111). Copia del DB presa con l'API di backup |
| NR3-4 (indirizzi) | ✅ | `risolvi` sui 669 indirizzi della base: Palazzi alla scheda 100, alla pagina dell'area 254 senza e 285 con `?planimetria=`, Memento nel visore 29 (+1 alias d'infiltrazione di Iweleth che ha «Memento» nel nome, giustamente alla scheda); **0** case senza `?planimetria=` che puntino a una mappa diversa dalla predefinita (`nr3-4-risolvi.txt`). Nel browser le **37 Aree** in cui iniziale ≠ predefinita: `/area/<slug>` senza parametri apre la **predefinita** 37/37 (es. Tetto «Scala», Galleria «Livello -2»), con `?infiltrazione=<i>` l'iniziale di `<i>` 37/37 (`nr3-4-browser-37-aree.txt`). Osservazione per Test UX: in 6 Aree la predefinita non ha pin («nessun pin: stanno su …»), è il dato |
| AP3-1 | ✅ | «Schede da sistemare (4)» a Kamoshida (le 4 attese) e «(1)» a Madarame, sezione richiudibile chiusa di base (`browser-letture.txt`) |
| AP3-2 | ✅ | Visore della scheda senza «Su:» né «Planimetrie»; «Vai: Museo 1P» → `/area/museo-1p?infiltrazione=…nelle-profondita…&planimetria=…153-2-0`; «Vai: Central Street» (fuori dal Palazzo) → `/guida/citta/shibuya/central-street` |
| AP3-4 | ✅ | «Da raccogliere»: i nomi delle planimetrie vanno a `/area/<slug>?infiltrazione=<aperta>&planimetria=<k>`; editor da «Modifica planimetria» → «Chiudi» e «Apri il visore» tornano a `/area/museo-1p?infiltrazione=…&planimetria=…153-2-0` |
| AP3-3 | ✅ | `POST /api/mappe` senza genitore → 201; `PUT` genitore `dungeon-okumura`, `palazzo-di-okumura`, `palazzo-di-okumura-caserma` → **409 `usa-aggiungi-area`** («Nei Palazzi una planimetria sta in un'area: aggiungila dalla scheda del Palazzo…»); `dungeon-mementos` → 200 (Memento esclusi); mappa eliminata e tolta dal cestino (`ciclo-ricerca-ap33.txt`) |
| E2 | ✅ | `GET /api/mappe/albero` e `/albero/conteggi` contro un conteggio SQL **scritto da me** (CTE ricorsivo sull'albero, Memento esclusi, gruppi dalla regola di `modifiche.md` §E2) su una copia del DB: radice 767/747/228 uguale; **307/307 nodi** uguali (`e2-conteggi.txt`, `e2-conteggi.cjs`). Interfaccia: intestazione «307 mappe con 767 pin · più 747 passaggi e 228 note»; Tokyo 159 (title «più 96 passaggi e 43 note»), Kamoshida 221, Madarame 179 |
| UX3-1 | ✅ | 20/5 → `?infiltrazione=madarame-disabilita-i-sistemi-di-sicurezza&daVoce=…` → «Infiltrazione 3 di 5 · Disabilita i sistemi di sicurezza» |
| UX3-4 | ✅ | Partita di prova al 05-20 con la 1ª infiltrazione di Madarame completata (3 permanenti segnati): metro «Madarame» → `?infiltrazione=in-corso` → «Infiltrazione **2** di 5 · Scopri dov'è il Tesoro» (la prima non completata). Con la partita 1 al 06-02 i due Palazzi sono conclusi e la metro mostra solo i Memento (`ciclo-partita.txt`) |
| P3 (F3-15) | ✅ | Stessa partita portata al 04-15: metro «Kamoshida» → `/guida/mappe/…cancello-del-castello-nativo-rmap-151-1-0` → `/guida/dungeon/kamoshida/area/cancello-del-castello`, versione «Livello 0» (si apre per prima), infiltrazione «3. Tutorial Palazzo 15/04» |
| F3-23 (ricerca) | ✅ | Rinomina di Caserma in «Caserma prova ricerca L3»: `GET /api/mappe/riferimenti?tipo=mappa&q=prova ricerca L3` → «Palazzo di Okumura › Caserma prova ricerca L3» (dettaglio «area»); «Ripristina» → «Caserma». Con questo F3-23 è completo |

Nessun difetto nuovo. Le righe di `difetti.md` sono aggiornate a «verificato (funzionali)».

### Pezzo 8 — residuo dopo «Elimina area» e verifica di O3-1 (ciclo 5 dell'anteprima, foto `anteprima-ciclo5-funzionali`, 05:44:28–05:45:20Z)
Anteprima su **12484305** (L4 con 71378325 e la correzione di O3-1, senza L6), base p5s-0533Z, userVersion 113/24. Scritture via API su Okumura;
DB letto in sola lettura. Prove in `esiti-collaudo-funzionali/residuo-area-esito.txt`, `residuo-area/prima|dopo.json`, `o3-1-verifica.txt`;
script `residuo-area.cjs`.
- **Residuo segnalato da Test UX (ciclo U6 su Madarame: area 140 righe, contenuto diverso)** — riprodotto con gli stessi gesti su Okumura: area
  di prova con 2 planimetrie legata a un'infiltrazione, infiltrazione di prova, «Modifica aree» con un'area esistente (Caserma) messa per prima,
  eliminazione dell'area e dell'infiltrazione. Confronto riga per riga di `area` (141), `infiltrazione_area` (105), mappe di Okumura (22),
  `dungeon_area` (10): **una sola riga diversa**, `area.updated_at` di `dungeon/okumura/caserma` (05:36:39 → 05:44:28), l'area che «Modifica
  aree» ha davvero toccato. Legami, ordine, nomi, versioni e infiltrazioni identici. **Non è un difetto**: è la traccia di una modifica avvenuta
  (nel ciclo U6 era il Giardino centrale). Detto a Test UX.
- **O3-1 ✅ (corretto in 12484305)** Area «Prova O3-1 vuota» legata a «Caserma», svuotata con «Colloca» (`?conferma=1`) e rimessa vuota dal
  cestino; `GET /api/mappe/esporta?radice=dungeon-okumura` → **12 aree e 11 legami, come il DB**, area vuota compresa col suo legame
  (`{infiltrazione: okumura-03-caserma, area: dungeon/okumura/prova-o3-1-vuota}`); `POST /api/mappe/importa {sovrascrivi: true}` → 200; aree e
  legami di Okumura **identici riga per riga**.

### Pezzo 7 — P3 dentro la finestra (ciclo 3 dell'anteprima, foto `anteprima-ciclo3-funzionali-P3`, 05:32:25–05:33:57Z)
Base p5s-0503Z, stesso codice dell'anteprima (04:55Z). Scritture solo in `partite.db`: partita di prova 3 «Prova funzionali L3 P3» al **04-15
giorno**, attiva; alla fine partita 1 di nuovo attiva (06-02 giorno) e partita 3 eliminata. Prove in `esiti-collaudo-funzionali/p3-*.txt`.
- `GET /api/compendio/dungeon/kamoshida?partita=3`: `atterraggio {mappa: …cancello-del-castello-nativo-rmap-151-1-0, spillo: null}` (regola dal 04-15).
- **Metro** (mappa di Tokyo in `/guida/citta`): lo stemma «Kamoshida» e «Palazzo di Kamoshida» portano a
  `/guida/mappe/palazzo-di-kamoshida-cancello-del-castello-nativo-rmap-151-1-0` (`urlMappa` della planimetria d'atterraggio, `modifiche.md` §4.1),
  che arriva a **`/guida/dungeon/kamoshida/area/cancello-del-castello`**: area «Cancello del castello» aperta sulla versione «Livello 0» (151-1-0,
  «si apre per prima»), infiltrazione **«3. Tutorial Palazzo 15/04»** aperta, nessuna griglia, nessun «scegli una planimetria». Nessun `?spillo=`
  perché l'atterraggio di quel giorno non ha pin. Madarame al 04-15 non è sulla mappa (fuori finestra), come atteso.
- `/guida/mondo/dungeon/kamoshida` (accesso al mondo, non la metro) → `/guida/dungeon/kamoshida?infiltrazione=in-corso` («Tutorial Palazzo
  11/04», la prima non completata della partita di prova): è la regola di `modifiche.md` §4.2 e di fe.md («AccessoMondo porta alla scheda»).
- **F3-15 P3 ✅.** Con questo F3-15 è completo (P1–P12 nel pezzo 3, P3 qui).

### Pezzo 6 — nuova base p5s-2026-10-20-0503Z sull'anteprima (decisione dell'utente: la fonte dei dati è p5s), sola lettura
L'anteprima è su `dati-produzione/p5s-2026-10-20-0503Z` dalle 05:09Z (ripristino del ciclo 1 OK, poi base nuova; userVersion 111). Rilanciate
le letture del pezzo 4 (`esiti-funzionali/anteprima-p5s-0503Z/l3-letture-anteprima.txt`): **uscita identica** alla 0440Z (diff vuoto):
F3-01/02/05/11/15/29/30/31 non dipendono dalle 36 voci e dai 45 pin che l'utente ha segnato su Kamoshida. Kamoshida p1, il solo dato
cambiato (`kamoshida-p1.txt`): 169/169 voci con stato, `completamento {71/71, tesoro ✓, boss ✓, concluso ✓, completato ✓}`, le 10 aree
complete (raccolta n/n e oggetti n/n), 0 divergenze. Gli esiti dei pezzi 4 e 5 restano validi sulla base nuova.

## Decisioni del PM (2026-10-20)
1. **Scritture sui Palazzi** (F3-10, F3-19…F3-26 e ogni prova che scrive su Madarame o Kamoshida): si fanno **sull'istanza di Collaudo**
   (BE 3301 / FE 5473, copia della produzione), quando L3 sarà lì.
   - Prima delle prove si chiede al Collaudo di **fotografare i dati** con l'API di backup, dopo si chiede di **ripristinarli**.
   - Sui dati condivisi di sviluppo (3201) **nessuna scrittura sui Palazzi**: lì solo letture e i casi che non scrivono.
2. **Voci nuove del diario:** vale `modifiche.md` §2.2, cioè **una sola voce nuova**. Analisi requisiti ha poi precisato la data:
   06-26, non 06-25 (vedi F3-31).
   - Per 3/10, 13/11 e 2/1 la voce esiste già (con riferimento al Confidente): c'è solo la proposta d'infiltrazione sulla voce esistente,
     senza voci nuove (§7.13).
   - R3-37c sarà allineato da Analisi requisiti. F3-31 si verifica su questo atteso.
