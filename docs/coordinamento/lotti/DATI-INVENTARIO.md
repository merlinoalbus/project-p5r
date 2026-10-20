# Inventario delle modifiche ai dati — lotti L0–L4

Autore: Implementazione BE, 2026-10-20 (~05:40Z). Richiesta del PM per l'utente: «tutte le modifiche ai dati fatte fino ad ora vanno rifatte o
integrate» sulla copia fresca. Fonti: le migrazioni del codice di pensive (newreview), i documenti dei lotti (ricerca completa in sola
lettura su `lotti/L1…L4`, `collaudo`, `regia`, `decisioni-pm.md`, `bacheca.md`, `dati-produzione/*/LEGGIMI.md`, `docs/DECISIONI.md`) e una
prova delle migrazioni su una copia della base di riferimento.

**Esito in una riga.** Ogni modifica ai dati voluta dal team in L0–L4 è in una migrazione (gioco 107–112, utente 022–023). Fuori dalle
migrazioni ci sono soltanto: le scritture dell'utente stesso (già dentro la base p5s), le copie e i ripristini di file, e i residui delle prove
sulle istanze di sviluppo e di collaudo, che non vanno rifatti. **Nessuna modifica di tipo (b) va trasformata in migrazione.**
L0 non ha toccato dati (`docs/DECISIONI.md`: «nessun dato, nessuna chiave, nessun codice d'errore cambia»).

## 1. Le migrazioni sulla base di riferimento `p5s-2026-10-20-0503Z`

Prova (BE, `scratchpad/l4/migrazioni-base.mts`): copia con l'API di backup della base in sola lettura, poi **tutte** le migrazioni del codice di
pensive (stato di lavoro con L3 committato, L4 non committato). Partenza: gioco 108, partite 21 (107 e 108 già applicate su p5s). Arrivo:
**gioco 112, partite 23. Nessun errore.**

| Migrazione | Lotto | Che cosa cambia nei dati | Esito sulla p5s-0503Z | Atteso / nota |
|---|---|---|---|---|
| gioco **107** `ruolo_dalla_gerarchia` | L1 | `mappa.ruolo_immagine` dedotto dalla gerarchia (la Banchina di Yongen-Jaya: illustrazione → planimetria) | già applicata su p5s (al rilascio di L1 e il 20/10 04:50) | — |
| gioco **108** `miniature_delle_immagini` | L1 | tabella cache `immagine_miniatura` | già applicata su p5s | le righe crescono con le letture (dichiarato) |
| gioco **109** `aree_del_mondo` | L2 | `area` (Aree del mondo), `mappa.area_chiave`/`versione_*`/`percorso_fisso`, `quartiere_ingresso.area_chiave`; Covo sotto Yongen-Jaya; **predefinita del Sottopasso `001-2-0`** (decisione dell'utente, R5); **Area dello staff `da_verificare=1`**; Cestino con `area-fisica` | **aree 23, planimetrie 29, etichette 9, ingressi 2, daVerificare 1, senzaArea 0, covoSpostato 5, cestinoRicopiato 0** | identico a 0440Z e ai dati di prima (Collaudo); l'alias `shibuya-sottopasso` non è un dato (redirect del codice) |
| gioco **110** `aree_dei_palazzi` | L3 | `area` dei Palazzi, `infiltrazione_area`, `proposta_infiltrazione_voce`; diario: 4 colonne, 6 voci corrette dopo il 06-01 (`da_rivedere`), 1 voce nuova 06-26 Kaneshiro | **aree 117, planimetrie 245, etichette 203, legami 105, legamiDaRegola 0, proposte 102, corrette 6, segnalate 1, nuove 1, senzaArea 0** | `legamiDaRegola` **0** e non 1: la coppia del pin 777 (Madarame ↔ `nativo-rmap-153-5-0`) l'ha dichiarata l'utente dall'editor il 19/10 (Collaudo, `esiti-collaudo/dati-prod-20261020/migrazioni.txt`) |
| gioco **111** `carattere_delle_voci` | L4 | `punto_interesse.carattere` (tutta NULL) | applicata; per carattere: Kamoshida 71/47/49 + 2 senza, **Madarame 101/82/44** (227 voci con le 2 dell'utente) | voci 961 in tutto |
| gioco **112** `voce_boss_finale` | L4 | `dungeon.voce_boss_finale` (G-027) e `dungeon.seed_json` | **8/8 impostate, nessuna mancante**; Madarame = `…-scontro-con-madarame-2` (la voce dell'utente, ordine 19); Iweleth e Memento NULL | sui dati vecchi del 3201 Madarame resta NULL (la voce non c'è): lo dice il log |
| utente **022** `divergenze_da_verificare` | L4 | `divergenza_partita` | **0 righe** (Kamoshida chiuso dall'utente su p5s) | sulla 0440Z erano 4 (pin 583, 615, 1992, 1993) |
| utente **023** `stato_del_pin_per_infiltrazione` | L4 | `spillo_partita_infiltrazione` | **40 pin condivisi, 90 righe (Madarame p1), 0 incoerenti** | come la 0440Z |

Controllo delle righe dopo le migrazioni di L4 (stesso giro, `prova-8-11.mts`): `punto_interesse` (testi), `punto_partita`, `spillo_partita`,
`spillo_voce` **invariati riga per riga**; nessuna voce cambia stato visibile rispetto a prima di L4; specchio coerente.
Le migrazioni con conteggi o elenchi fissi che il PM chiedeva di guardare (109, 110, 111/022, le 90 righe) danno i numeri qui sopra; l'unica
differenza con le attese scritte prima è `legamiDaRegola` della 110 (spiegata) e le 0 divergenze della 022 (effetto del lavoro dell'utente).

## 2. Modifiche fuori dalle migrazioni

### 2.1 Scritte dall'utente (dall'app) — non si rifanno: sono già nella base p5s

| # | Che cosa | Dove, quando | Perché non serve una migrazione |
|---|---|---|---|
| U1 | Madarame: voci `…-scontro-con-madarame` (ordine 18) e `…-2` (ordine 19), pin 2300 «La vera Sayuri Originale» e 2301 «Madarame» legati alla `-2`, pin 811 legato anche a «riunisciti con Morgana», legame `mappa_entita` di `nativo-rmap-153-5-0` | produzione, 19/10 22:18–22:36 UTC | lavoro dell'utente, già nella 0440Z e nella p5s-0503Z; la 112 lo legge (Madarame = `-2`) |
| U2 | Diario 06-01: voce nuova di Igor (sera); nota di `b9371f80…` «Ruba il Tesoro di Madarame» | produzione, stessa finestra | idem |
| U3 | Partita 1: spunte, eventi, stati di voci e pin, Confidenti, letture, Doti, libri | produzione, stessa finestra | dati della partita dell'utente |
| U4 | **Kamoshida chiuso al 100% sulla partita 1** (+36 voci, +45 pin, +32 eventi) con 33 `PUT /api/partite/1/punti` | **p5s**, 20/10 04:52–05:01 UTC | idem; è la ragione delle 0 divergenze e di Kamoshida p1 71/71 |

### 2.2 Copie, installazioni e ripristini di file — infrastruttura, non dati da rifare

| # | Che cosa | Dove | Nota |
|---|---|---|---|
| F1 | Dati di p5s sostituiti con la 0440Z (con backup `p5s_data/_data/backups/prima-di-prod-20261020-0440Z/`), poi 107 e 108 all'avvio | p5s, Collaudo, 04:50Z, col via del PM | avvenuto prima della regola «p5s non si sovrascrive»; **aperto**: nei documenti non è scritto che cosa c'era su p5s prima (c'è il backup) |
| F2 | Collaudo 3301: `prod-20261020` → 0440Z → p5s-0503Z, ogni volta con backup in `data/backups/` | collaudo | istanza di collaudo |
| F3 | Anteprima 3302: 0440Z → p5s-0503Z, con backup | anteprima del Collaudo | istanza di prova |
| F4 | 3201: ripristino della copia d'avvio `00-44-16-830Z` dopo 3 `POST /api/mappe/importa` di una prova (FUN2-2), poi 109 corretta riapplicata, confronto approvato da Test no-reg | 3201 (BE), 00:47–00:53Z | istanza di sviluppo; la 109 corretta è quella del codice |
| F5 | Il 3201 è rimasto sui dati vecchi (Madarame 225 voci) con le migrazioni 107–112 e 022–023 | 3201 | decisione del PM (~05:05Z): le prove sui dati veri si fanno sull'anteprima |

### 2.3 Residui di prove — non si rifanno

| # | Che cosa | Dove | Nota |
|---|---|---|---|
| R1 | `updated_at` di `area citta/kichijoji/quartiere-dello-shopping` e `mappa citta-kichijoji`, 5 miniature, cestino 16 → 20 (prove di L1/L2 ripulite a mano) | 3201 | istanza di sviluppo |
| R2 | Cache `immagine_miniatura` scritta dalle letture | tutte | voluto dalla 108 |
| R3 | Ciclo 9 del Collaudo: scrittura diretta in SQLite (`area.planimetria_predefinita = NULL` su Central Street, `nativo-rmap-001-3-0` senza Area) per preparare «Colloca», poi le prove di Test funzionali | collaudo 3301 | **aperto**: la chiusura (ripristino e impronta) non è annotata in `L2/esiti-collaudo/cicli-dati.md` — da confermare dal Collaudo |
| R4 | Tutti gli altri cicli di prova (L1 cicli 0–4, L2 cicli 1–8, anteprima ciclo 1 di L3, prove di L1/L2/L4 di Test funzionali con pulizia) | 3301, 3302, 3201 | ripristinati (foto e impronte) o puliti con impronte senza differenze |
| R5 | `L3/esiti-collaudo-funzionali/ciclo1-spunta-pin-3201.txt`: partita di prova creata, pin 757/758 segnati, partita eliminata | probabilmente 3302 (lo script punta lì) | **aperto**: il nome dice 3201 — da confermare da Test funzionali/Collaudo |

Fuori dai database: Test UX ha cambiato il localStorage del browser sulla produzione (nessun dato del server); una mia richiesta di
scrittura sul 3201, rifiutata con 404 prima di scrivere (L2, dichiarata).

## 3. Che cosa cambia nelle cifre attese (base p5s-0503Z)

| Cifra | Prima (0440Z) | Ora (p5s-0503Z) |
|---|---|---|
| Kamoshida p1 | concluso, **non** completato, 56/71 | **concluso e completato, 71/71** |
| Divergenze (utente 022) | 4 (583, 615, 1992, 1993) | **0** |
| Voci con più pin, k/N, p1 | 81 fatte / 3 in corso / 5 da fare | **89 fatte / 0 / 0** |
| Voci con più pin, k/N, p2 | 39 / 0 / 50 | 39 / 0 / 50 (invariato) |
| Madarame p1 | concluso e completato, 82/82 oggetti (101/101 voci permanenti) | invariato |
| Madarame p2 | né concluso né completato | invariato |
| Righe della 023 | 90 (Madarame p1) | 90 |
| 110 `legamiDaRegola` | 1 sulle copie senza il legame dell'utente | **0** (legame dichiarato dall'utente) |
| 112 voci del boss finale | 8/8 | 8/8 |

Il caso «concluso e non completato» e le divergenze non esistono più nella partita reale: si provano sulle partite di prova costruite dai
test (`palazzo-completato.test.ts`, `avanzamento-unico.test.ts`).

## 4. Punti aperti per il PM
1. **F1**: che cosa c'era su p5s prima della 0440Z (il backup c'è; nessun documento lo descrive).
   — **Risposta del Collaudo (2026-10-20 ~05:30Z): nessun lavoro dell'utente.** Backup `p5s_data/_data/backups/prima-di-prod-20261020-0440Z/`,
   copiato in sola lettura (sha256 gioco `c2e74706…5a86`, partite `780ea60e…c441`), dettaglio in
   `L2/esiti-giro2/collaudo/p5s-backup-0450/confronto.txt`. Le prove:
   - `partite.db` è **identico byte per byte** (`cmp`) alla copia di produzione del 20/10 00:08 (`prod-20261020`): nessuna scrittura sulla
     partita su p5s prima delle 04:50. Il file aveva la data dell'installazione (19/10 22:11:55) e il suo WAL era vuoto.
   - `gioco.db` contro la produzione 00:08 differisce solo per le migrazioni del codice di p5s: user_version 106 → 108, la 107 cambia
     `ruolo_immagine` di una sola mappa (`yongen-java-banchina-della-metropolitana`), la 108 aggiunge la tabella `immagine_miniatura`.
   - `impronta.cjs` del backup **identica** alla produzione 00:08 (diario 254, Kamoshida 169/373, Madarame 225/261).
   - Log del container `project_p5r_review_be`, creato alle 01:32:03Z: fino alle 04:50:33Z ci sono 517 richieste e **nessuna** POST, PUT, PATCH
     o DELETE. Il log del container precedente (22:11–01:32) non c'è più, ma i file sopra escludono scritture anche in quell'intervallo.
   - Quindi le differenze fra il backup e la 0440Z (Madarame +2 voci e +2 pin, diario 06-01, partita 1) sono tutte lavoro dell'utente fatto
     **in produzione** la sera del 19/10. Sono già nella 0440Z e da lì nella base p5s-0503Z: non si è perso nulla.
2. **R3**: conferma del ripristino del ciclo 9 sul collaudo.
   — **Risposta del Collaudo: confermato.** 05:25:20Z impronta dopo le prove, poi `ripristina foto/L2g2-ciclo9-funzionali-layout` → `RIPRISTINO OK`.
   Dopo il riavvio l'impronta è identica alla foto, e contro la base p5s cambia solo `immagine_miniatura` (cache delle letture); `impronta.cjs`
   identica; `da-collocare` vuota (05:25:28Z). Dettaglio in `L2/esiti-giro2/collaudo/ciclo9.txt`.
3. **R5**: su quale istanza è stato scritto `ciclo1-spunta-pin-3201.txt`.
   — **Chiuso (BE, ~05:35Z): sul 3201, da Test funzionali, ed è già pulito.** Test funzionali ha scritto a BE di aver creato ed eliminato sul
   3201 una partita di prova id 3 (solo `partite.db`, la partita 1 sempre attiva) per controllare la spunta dei pin 757 e 758 con la regola
   §8.11. Verifica di BE in sola lettura (`GET /api/partite` sul 3201): ci sono solo la partita 1 «Partita Roberto» (attiva) e la 2
   «Tutorial». Le righe di stato delle tabelle di prima cadono con la partita (`ON DELETE CASCADE`); controllo in sola lettura su
   `data/partite.db`: **0 righe orfane** in `punto_partita`, `spillo_partita`, `divergenza_partita` e `spillo_partita_infiltrazione`. Non c'è
   niente da togliere. Il 3201 è l'istanza di sviluppo e non è una base dei dati: nessuna migrazione da scrivere per questo.
   **Difetto trovato nel controllo (BE, L4)**: le due tabelle nuove di L4 (`divergenza_partita` della 022, `spillo_partita_infiltrazione`
   della 023) non hanno la chiave verso `partita` con `ON DELETE CASCADE`: eliminando una partita le sue righe resterebbero orfane. Oggi non ce
   ne sono. Correzione in una migrazione utente nuova (024), annunciata a parte.

## 5. Base `p5s-2026-10-20-0533Z`: la «Prova» dell'utente nelle migrazioni 109–113 (Analisi dati, 2026-10-20 ~05:45Z)
**La Prova**: mappa `palazzo-di-kamoshida-prova`, nome «Prova», tipo `area`, genitore `dungeon-kamoshida`, ordine 26, origine `utente`, ruolo
`planimetria-nativa`, immagine id 808 (PNG 1 353 169 byte), un alias e un percorso, **0 pin**. È un dato dell'utente («la lascio come caso di test»):
nessuna migrazione deve cancellarla o cambiarne nome, immagine, genitore o chiave.
**Prova fatta**: copia con l'API di backup della 0533Z nel mio scratchpad (`sim-0533Z/`, mai `data/` né p5s), poi `runMigrations` del codice di pensive
(`simula-migrazioni.ts`). Si passa da gioco 108 e utente 21 a **gioco 113 e utente 24, senza errori**.
| Migrazione | Che cosa fa alla Prova | Esito sulla 0533Z (contro la 0503Z) |
|---|---|---|
| **109** `aree_del_mondo` | **nulla**: prende solo le planimetrie figlie di un quartiere o di Tokyo; la Prova è figlia di `dungeon-kamoshida` | aree 23, planimetrie 29, etichette 9, ingressi 2, daVerificare 1, senzaArea 0, covo 5: **identico** |
| **110** `aree_dei_palazzi` | la Prova è una planimetria **sciolta** di un Palazzo (nessun gruppo d'immagini), quindi riceve **un'Area propria**: `dungeon/kamoshida/prova`, nome «Prova», slug `prova`, ordine 26, `origine='utente'`, predefinita = la Prova, `da_verificare=0`. Sulla mappa si scrivono solo le colonne nuove: `area_chiave`, `versione_ordine=0`, `versione_etichetta=NULL` (`percorso_fisso` resta NULL). **Nessun legame** con un'infiltrazione: in `mappa_entita` non ne ha | **aree 118** (prima 117: Kamoshida da 10 a **11**), **planimetrie 246** (245), etichette 203, legami 105, legamiDaRegola 0, proposte 102, corrette 6, segnalate 1, nuove 1, **senzaArea 0** |
| **111** `carattere_delle_voci` | nulla (riguarda le voci) | Kamoshida 71/47/49 + 2 senza; Madarame 101/82/44: **identico** |
| **112** `voce_boss_finale` | nulla | 8/8: **identico** |
| **113** `regola_del_boss` | nulla | Iweleth con la regola dei Memento: **identico** |
| utente **022 / 023 / 024** | nulla (nessun pin) | divergenze **0**; 40 pin condivisi, **90** righe (p1); 024: 0 orfane: **identico** |
**Risposte**:
- **Riceve un'Area?** Sì, un'Area **sua** sotto Kamoshida, come ogni planimetria sciolta di un Palazzo. È l'undicesima Area di Kamoshida, in fondo.
- **Finisce fra le «da collocare»?** **No.** Dopo la 110 nessuna planimetria di un Palazzo resta senza Area (`senzaArea` 0), e la 109 non la guarda. È
  nei dati un'Area **senza infiltrazioni**, con 0 voci e 0 pin. Come la mostra l'interfaccia lo verificano i tester. Con 0 oggetti da contare,
  «Area completata» è vera per la regola di `areaCompletata` (`shared/completamentoGuida.ts`).
- **Cambia i conteggi di Kamoshida?** **No.**
  - Voci **169**, pin dell'impronta **373**, pin dell'utente **359**, infiltrazioni 7: invariati.
  - k/N p1 89 · 0 · 0 e p2 39 · 0 · 50, concluso/completato p1 e p2, forzieri 21/21: invariati (`l4kn`, `l4`, `lconcluso` identici alla 0503Z, a
    parte la cartella).
  - Cambiano solo il **numero di Aree** (da 10 a 11 a Kamoshida, da 117 a **118** in tutti i Palazzi, 141 Aree in tutto) e le planimetrie dei Palazzi (246).
- **La Prova resta intatta**: dopo le migrazioni la riga di `immagine` 808 ha lo stesso hash di prima; alias e percorso sono identici; chiave, nome,
  genitore, tipo, ordine e origine sono invariati.
- **Impronta del lavoro da preservare**: sulla 0533Z è **identica** alla 0503Z (`ff3033cb…`). Dopo la 110 cambia **solo nella forma**: `impronta.cjs` legge
  le 4 colonne nuove del diario (`da_rivedere`, `aggiunta_da`, `testo_precedente_json`, `motivo_revisione`) sulle 255 voci, e i valori non cambiano.
  Per i confronti prima/dopo `impronta.cjs` deve **escluderle**, come esclude già `validata`. Palazzi, spunte e testi sono identici.
- **Rischio per la Prova: nessuno** nelle migrazioni 109–113 e 022–024.
  - **Da sapere per le prove**: la 110 dà alla Prova un'Area «Prova» col nome dell'utente e `origine='utente'`. Quando l'utente toglierà la
    Prova (col suo via, alla fine), andrà tolta anche quest'Area.
  - Le attese fisse «117 Aree» dei documenti e dei test (il test dorato dei 117 nomi) valgono sulla 0503Z. Sulla 0533Z sono **118**.
