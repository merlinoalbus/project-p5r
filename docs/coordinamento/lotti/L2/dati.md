# L2 «Mondo: aree e planimetrie» — analisi dati

Analisi dati, 2026-10-20. Sola lettura. Fonti dati: copia di produzione
`…\cffd8da6-…\scratchpad\prod-20261020\` («prod») e `data/` della cartella di sviluppo («dev», L0+L1 applicati).
Script e uscite grezze nello scratchpad di questa sessione `…\161706c7-6e2c-47d6-bdb7-618347ce218c\scratchpad\`:
`l2.cjs` → `l2-prod.json`/`l2-dev.json` (mappe del mondo), `l2pin.cjs` → `l2pin-prod.json`/`l2pin-dev.json` (pin, passaggi, ingressi, luoghi),
`impronta-mondo.cjs` → `impronta-mondo-prod.json`/`-dev.json` (impronta prima di L2), `cerca.cjs` (ricerca di una stringa in ogni colonna testuale).
**prod vs dev**: `l2pin` identico byte per byte; `l2` e impronta del mondo identici tranne il ruolo della Banchina di Yongen-Jaya
(`illustrazione-editoriale` → `planimetria-nativa`, migrazione 107 di L1). La migrazione di L2 si prova sulla copia **già migrata a L1** (dev o
prod + 107).

Requisiti di riferimento: `lotti/L2/requisiti.md` (R2-01…R2-42, dubbi 1–9).

## 1. Censimento

### 1.1 Mappe del mondo (fuori da Palazzi e Memento): 54
| Livello | Numero | Note |
|---|---:|---|
| `citta` (Tokyo) | 1 | 26 figli |
| `quartiere` sotto Tokyo | 24 | 23 quartieri + «Entrata dei Memento» (`citta-mementos`, escluso da L2: R2-33) |
| **mappe di zona** | **29** | 19 `luogo` sotto un quartiere + 2 `luogo` sotto Tokyo (staff) + 5 `luogo` senza genitore (Covo) + 3 `area` sotto un quartiere |

Conferma della nota di Analisi requisiti: 26 `luogo` + 3 `area` = 29.

### 1.2 Le 29 mappe di zona (chiave interna · chiave pubblica · genitore · ordine · gruppo/versione · spilli tot/utente · passaggi entranti)
| # | Chiave | Pubblica | Genitore | Ord. | Gruppo d'immagini (ordine, etichetta) | Spilli | ← |
|---|---|---|---|---:|---|---|---:|
| 1 | nativo-rmap-001-1-0 | shibuya-piazza-della-stazione | citta-shibuya | 0 | — | 10/10 | 6 |
| 2 | nativo-rmap-001-2-0 | shibuya-sottopasso-nativo-rmap-001-2-0 | citta-shibuya | 100 | 001-2-0 #0 «inquadratura orientale» / «Sottopasso» | 16/14 | 9 |
| 3 | nativo-rmap-001-2-1 | shibuya-sottopasso-speciale | citta-shibuya | 101 | 001-2-0 #1 «planimetria completa» / «Sottopasso» | 0/0 | 0 |
| 4 | nativo-rmap-001-3-0 | shibuya-central-street | citta-shibuya | 200 | — | 24/24 | 3 |
| 5 | nativo-rmap-001-4-0 | shibuya-centro-comm-sotterraneo | citta-shibuya | 300 | — | 10/10 | 3 |
| 6 | nativo-rmap-001-5-0 | shibuya-tornello-della-linea-ginza | citta-shibuya | 400 | — | 7/6 | 2 |
| 7 | nativo-rmap-001-12-0 | shibuya-banchina-della-metropolitana | citta-shibuya | 500 | — | 4/4 | 4 |
| 8 | nativo-rmap-002-0-0 | shujin-academy-edificio-principale-1p-edificio-laboratori-1p | citta-shujin-academy | 0 | — | 21/21 | 5 |
| 9 | nativo-rmap-002-0-1 | …-2p-edificio-laboratori-2p | citta-shujin-academy | 100 | — | 26/26 | 8 |
| 10 | nativo-rmap-002-0-2 | …-3p-edificio-laboratori-3p | citta-shujin-academy | 200 | — | 15/15 | 5 |
| 11 | nativo-rmap-002-1-0 | shujin-academy-cancello-della-scuola | citta-shujin-academy | 300 | — | 5/5 | 2 |
| 12 | nativo-rmap-002-5-0 | shujin-academy-tetto | citta-shujin-academy | 400 | — | 1/1 | 1 |
| 13 | nativo-rmap-002-6-0 | shujin-academy-aula | citta-shujin-academy | 500 | — | 2/0 | 0 |
| 14 | nativo-rmap-002-8-0 | shujin-academy-biblioteca | citta-shujin-academy | 600 | — (caricata) | 2/2 | 0 |
| 15 | shibuya-tornello-della-linea-ginza-aoyama-itchome (`area`, nome rivisto «Banchina Aoyama Itchome») | shujin-academy-banchina-aoyama-itchome | citta-shujin-academy | 0 | — (caricata) | 2/2 | 4 |
| 16 | yongen-java-banchina-della-metropolitana (`area`) | yongen-jaya-banchina-della-metropolitana | citta-yongen-jaya | 0 | — | 4/4 | 5 |
| 17 | nativo-rmap-009-2-0 (`area`) | yongen-jaya-vicoli | citta-yongen-jaya | 100 | — | 26/25 | 3 |
| 18–22 | nativo-rmap-022-1-0…4 | covo-dei-ladri-settore-dingresso, covo-dei-ladri (= 1-1), -porzione-occidentale, -porzione-settentrionale, -inquadratura-orientale | **NULL** | 0–4 | 022-1-0 #0 «settore d'ingresso», #1 «planimetria completa», #2 «porzione occidentale», #3 «porzione settentrionale», #4 «inquadratura orientale» / «Covo dei Ladri» | 3, 15, 3, 1, 5 (tutti seed) | 0 |
| 23 | nativo-rmap-005-1-0 | kichijoji-quartiere-dello-shopping | citta-kichijoji | 0 | — | 15/0 | 0 |
| 24 | nativo-rmap-006-1-0 | shinjuku-quartiere-a-luci-rosse | citta-shinjuku | 0 | — | 15/0 | 0 |
| 25 | nativo-rmap-007-1-0 | akihabara-electric-town | citta-akihabara | 0 | — | 18/0 | 0 |
| 26 | nativo-rmap-010-4-0 | kanda-jinbocho-cappella | citta-kanda-jinbocho | 0 | — | 3/0 | 0 |
| 27 | nativo-rmap-012-29-0 | odaiba-seaside-park-cantiere-dello-stadio | citta-odaiba | 0 | — | 4/0 | 0 |
| 28–29 | nativo-rmap-150-3-0, -3-1 | area-riservata-allo-staff-porzione-occidentale, area-riservata-allo-staff | tokyo | 100, 101 | 150-3-0 #0 «porzione occidentale», #1 «planimetria completa» / «Area riservata allo staff» | 0/0 | 0 |

Tutte e 29 hanno ruolo `planimetria-nativa` (dev); nessuna ha figli né pezzi (`pezzo_mappa` 0 nel mondo); `nome_rivisto=1` solo su 001-2-0,
001-2-1 e Aoyama Itchome.

### 1.3 Quartieri
24 righe in `quartiere`, una mappa ciascuno (`citta-<k>`). Con mappe di zona: Yongen-Jaya 2 (+5 del Covo con D2), Shibuya 7, Shujin 8,
Shinjuku 1, Kichijoji 1, Akihabara 1, Kanda 1, Odaiba 1 → **8 quartieri**; senza: **15** (escluso Memento) — torna con il piano (riga 363).

**Le «tre copie» del legame quartiere↔mappa (R2-09)**: colonne `mappa.entita_tipo/entita_chiave='quartiere'` su **24** mappe-quartiere;
`mappa_entita(entita_tipo='quartiere')` **1** riga sola (`citta-yongen-jaya`→`yongen-jaya`); la convenzione di chiave `citta-<quartiere>`.
Le zone non hanno legami al quartiere: lo deducono dal genitore. `mappa_entita` nel mondo: 3 righe `luogo` (§1.6) + 1 `quartiere`.

### 1.4 Pin delle mappe del mondo: 298
- Per origine: seed 114, utente 184. Per livello: Tokyo 3, quartieri 38, zone 257. `uid` mai nullo.
- Per riferimento: nessuno 151, `mappa` 70, `luogo` 54, `negozio` 19, `confidente` 2, `attivita` 2.
- Stati di partita (`spillo_partita`) sui 298: **0**. Unico stato collegato al mondo: pin `e641ff26…` (id 515, uscita di Kamoshida 151-1-0
  → `citta-shujin-academy`), partita 2, raccolto 1: è un pin di Kamoshida e L2 non lo tocca.
- Condizioni (`condizioni_json`) che citano una mappa di zona: 0. Atterraggi dei Palazzi (`dungeon_atterraggio`) nel mondo: 0.

### 1.5 Passaggi (`riferimento_tipo='mappa'`): 70 dal mondo (+2 dai Palazzi)
| Da → a | Numero |
|---|---:|
| zona → zona | 51 |
| quartiere → zona | **8** (1625, 1626, 1630–1635: tutti utente; sono i «pin di passaggio» del quartiere) |
| citta → quartiere | 3 (1713–1715) |
| quartiere → citta | 2 (1627, 1629) |
| zona → quartiere | 4 (336, 1628, 1654, 1709) |
| zona → citta | 1 (1770 «Scelta Stazione») |
| quartiere → palazzo | 1 |
| **dai Palazzi verso il mondo** | 734 (Madarame 153-1-0 «Uscita» → 001-3-0 Central Street), 515 (Kamoshida 151-1-0 «Uscita» → citta-shujin-academy) |

L'elenco dei 51 zona→zona è in `l2pin-prod.json` (`passaggiZonaZona`). Nessun passaggio collega due versioni della stessa futura Area e
nessuno punta a 001-2-1 (Sottopasso Speciale): tutti i passaggi del Sottopasso puntano a 001-2-0. Destinazioni (`spillo_destinazione`) verso
zone: 42, tutte con x=0, y=0, zoom=1 (solo 1480 ha `spillo_arrivo_id`=1457).
La ricognizione e i requisiti parlano di «62 con `riferimento_tipo='mappa'`»: oggi sono **70** nel mondo (72 contando 734 e 515).

**Zone senza passaggio dal proprio quartiere** (nessun pin sull'illustrazione del quartiere): 21 mappe → raggruppate per Area proposta (§3):
Shibuya: Sottopasso, Centro comm. sotterraneo, Tornello della linea Ginza (3); Shujin: 2P, 3P, Tetto, Aula, Biblioteca (5); Yongen-Jaya: Covo (1);
Akihabara, Kanda, Kichijoji, Odaiba, Shinjuku (5); staff sotto Tokyo (1) → **14 Aree su 22** (15 con lo staff). La ricognizione diceva 12:
la differenza dipende da come si contano i tre piani di Shujin e lo staff.
**Zone senza alcun passaggio entrante**: 15 mappe (Akihabara, Aula, Biblioteca, Kanda, Kichijoji, Odaiba, Shinjuku, 5 del Covo, 2 dello staff,
Sottopasso Speciale).

### 1.6 Luoghi (93)
- `luogo.quartiere_chiave` sempre valorizzato; nessuno nascosto; `marcatore_luogo` 47 righe.
- Con pin (`riferimento_tipo='luogo'`): 47; di questi con pin in una zona 39, solo sull'illustrazione del quartiere 8 (fioraio-sukebe, mran-mran,
  akiba-electronics, distributori-akihabara, nagiuri, ogikubo-ramen, tsukishima-monjayaki, laghetto-ichigaya). Senza pin: 46 (elenco in
  `l2pin-prod.json`).
- **Senza area**: 54 senza pin in una zona; 51 togliendo i 3 legati a una zona da `mappa_entita` (stazione-piazza-shibuya → 001-1-0,
  cancello-shujin → 002-1-0, biblioteca-shujin → 002-8-0) — torna con i 51 della ricognizione.
- **Doppio pin (7)**: crossroads, hinokuniya, cinema-cult9 (Shinjuku: quartiere + 006-1-0); akindo, tokobushiya, sala-giochi, maid-cafe
  (Akihabara: quartiere + 007-1-0). Tutti con un pin seed sul quartiere e uno sulla zona. Da passare a L5 (dubbio 7), L2 non li tocca.

### 1.7 Ingressi dei quartieri (`quartiere_ingresso`): 2
```
{"quartiere_chiave":"yongen-jaya","mappa_chiave":"nativo-rmap-009-2-0","x":37.46,"y":25.14,"zoom":1}
{"quartiere_chiave":"shibuya","mappa_chiave":"nativo-rmap-001-3-0","x":38.29,"y":32.67,"zoom":1}
```

### 1.8 Alias e chiavi pubbliche (redirect, R2-18)
`mappa_percorso` 317 righe (una chiave pubblica per mappa, nessun doppione); `mappa_alias` 690 righe (690 chiavi distinte), di cui **66 sulle 29
zone** (2 ciascuna, tranne 001-2-0: 4, 001-2-1: 5, Banchina di Yongen-Jaya: 5) e 115 su tutto il mondo.
**Trappola degli alias del Sottopasso** (confermata):
```
shibuya-sottopasso                       → nativo-rmap-001-2-1 (Sottopasso Speciale, «planimetria completa»)
shibuya-sottopasso-01                    → nativo-rmap-001-2-1
shibuya-sottopasso-speciale              → nativo-rmap-001-2-1   (pubblica di 001-2-1)
shibuya-sottopasso-1                     → nativo-rmap-001-2-0
shibuya-sottopasso-inquadratura-orientale→ nativo-rmap-001-2-0
shibuya-sottopasso-nativo-rmap-001-2-0   → nativo-rmap-001-2-0   (pubblica di 001-2-0)
```
Oggi `/guida/mappe/shibuya-sottopasso` apre la versione «planimetria completa», mentre l'Area Sottopasso avrà come predefinita 001-2-0
(«inquadratura orientale», dubbio 5). Il redirect deve portare **all'Area con la versione a cui puntava l'alias** (non alla predefinita).

### 1.9 Riferimenti testuali e diario
- Nessun testo in nessuna tabella (gioco + partite) contiene `/guida/mappe/`, `/guida/citta/` o `/guida/covo` (`cerca.cjs`: 0 righe).
- Le chiavi di zona compaiono solo in tabelle di mappe (`mappa`, `mappa_alias`, `mappa_percorso`, `mappa_presentazione`, `immagine`, `spillo`).
  `covo-dei-ladri` compare anche in `dati_guida` (chiave `completamento`) solo come URL della fonte allgamestaff, non come collegamento interno.
- **Diario 04-01..06-01 (254 voci)**: `riferimento_tipo` ∈ {null 122, confidente 51, negozio 31, libro 22, dungeon 15, dote 7, attivita 4,
  film 2}: **nessun riferimento a mappa, quartiere o luogo**; `produce_json` non cita mappe, quartieri, luoghi né `nativo-rmap`. L2 non tocca il
  diario: R2-31 si prova con l'impronta (invariata) e con i 31 collegamenti ai negozi (passano dalla scheda del negozio, non dalle mappe).

### 1.10 Lavoro da preservare (impronta PRIMA di L2)
- `impronta.cjs` (diario, Kamoshida, Madarame): sha256 `1a71b030…bc4c` su prod e su dev (identica); conteggi: diario 254, spunte 338;
  Kamoshida aree 7, voci 169, pin 373, statiVoci 302, statiPin 472; Madarame aree 5, voci 225, pin 261, statiVoci 221, statiPin 276.
  (Nota: i totali «Madarame 196 voci, 250 pin» di processo.md / R2-32 sono della misura del 19/10: oggi 225 voci e 252 pin utente; vedi
  `lotti/L3/dati.md` §1. R2-32 va verificato con l'impronta per chiave, non con quei totali.)
- `impronta-mondo.cjs` (nuovo, per L2): 54 mappe, 300 pin (i 298 del mondo + 734 e 515 dei Palazzi che puntano al mondo), 115 alias,
  2 ingressi, 93 luoghi, 1 stato di pin. sha256 prod `23ebcfdd…b7ed`, dev `619cfa37…eda8` (unica differenza: ruolo della Banchina, L1).
  Da rigenerare **dopo** la migrazione e confrontare chiave per chiave: devono restare uguali i pin (mappa, x, y, nome, rif, condizioni,
  destinazione, voci), gli alias, i luoghi e lo stato; cambiano solo `genitore` del Covo (vedi §2) e i campi nuovi.

## 2. Regole di migrazione proposte
Principio: **si aggiungono i legami, non si riscrivono i contenuti.** Nessuna chiave di mappa cambia, nessun pin cambia mappa, posizione o
riferimento; nessuna rigenerazione dal pacchetto.

1. **Aree** (tabella nuova, es. `area_mondo`; chiave stabile `<quartiere>/<slug>`, slug fissato alla creazione — dubbio 8):
   una per gruppo d'immagini del mondo (`gruppo_immagini_json.id`) e una per ogni zona sciolta, salvo le eccezioni dei dubbi. Elenco al §3.
   - `nome` = titolo che si vede oggi: nome del gruppo per i gruppi («Sottopasso», «Covo dei Ladri»), altrimenti `mappa.nome`
     (con `nome_rivisto` rispettato: «Banchina Aoyama Itchome»).
   - `ordine` = `mappa.ordine` della prima planimetria (quella con ordine minore), a parità per chiave.
   - `planimetria_predefinita` = versione con `gruppo.ordine = 0` nei gruppi; l'unica planimetria altrove.
   - `origine` = `utente` se almeno una planimetria è `origine='utente'` o ha `nome_rivisto=1`, altrimenti `seed` (R2-28).
2. **Planimetrie** (colonne nuove su `mappa`, es. `area_mondo_chiave`, `versione_etichetta`, `versione_ordine`): ogni zona riceve la sua Area;
   `versione_etichetta` = `gruppo.etichetta` (solo nei gruppi: 7 righe), `versione_ordine` = `gruppo.ordine` (0..n-1). Le aree con una
   planimetria sola non hanno etichetta (dubbio 9). Ordine delle versioni = quello del gruppo, che nel mondo coincide con l'ordine di mappa
   (verificato: nessun gruppo del mondo ha ordini invertiti, a differenza di 152-1-0 e 153-7-0 nei Palazzi).
3. **Covo dei Ladri (D2)**: `genitore_chiave` delle 5 planimetrie `nativo-rmap-022-1-*` da NULL a `citta-yongen-jaya` (unico cambio di una
   colonna esistente); `ordine` lasciato com'è (0–4) o portato dopo Vicoli (es. 200–204) per non mescolarsi con la Banchina (ordine 0):
   **da decidere in modifiche.md**. Chiavi, alias e i 27 spilli (seed) invariati.
4. **Ingressi**: `quartiere_ingresso` acquista l'Area: (yongen-jaya → Area Vicoli, planimetria 009-2-0, 37.46/25.14/1), (shibuya → Area
   Central Street, 001-3-0, 38.29/32.67/1). x, y, zoom e planimetria invariati (R2-22).
5. **Passaggi**: i 70 (+2) pin con `riferimento_tipo='mappa'` **non si riscrivono**: la planimetria a cui puntano ha ora un'Area, e la
   navigazione risolve planimetria → Area (+ versione) in lettura. Così R2-29 («stesso riferimento») e R2-19 («aprono la pagina dell'Area»)
   valgono insieme, e i pin 734 (Madarame) e 515 (Kamoshida) restano identici nell'impronta dei Palazzi (R2-32). La proposta della ricognizione
   di un nuovo `riferimento_tipo='area-mondo'` per gli 8 pin di passaggio **cambierebbe il riferimento**: sconsigliata dal punto di vista dei
   dati (rompe il confronto pin per pin; da valutare solo se Stesura lo richiede, con elenco approvabile).
6. **Legame quartiere** (R2-09): il quartiere di un'Area si scrive una volta sull'Area. Le 24 colonne `entita_*='quartiere'` sulle mappe-quartiere
   e la riga `mappa_entita` di Yongen-Jaya non servono alle Aree: si lasciano (sono il legame mappa-quartiere↔quartiere, non zona↔quartiere) finché
   Analisi app non dimostra che nessun lettore ne dipende; nessuna nuova riga `mappa_entita` per le zone.
7. **Luoghi**: nessuna modifica in L2 (`luogo` invariato; i 3 legami `mappa_entita` `luogo` restano). Il legame luogo→Area è di L5.
8. **Redirect** (R2-18): elenco statico dalle 66 chiavi alias + 29 pubbliche delle zone → (quartiere, area, versione) calcolabile dai dati
   (alias → `mappa_chiave` → Area + versione). Nessuna riga cancellata da `mappa_alias`/`mappa_percorso`.
9. **Idempotenza** (R2-08): la migrazione crea le Aree solo se mancano (chiave), assegna `area_mondo_chiave` solo dove è NULL; seconda
   esecuzione = 0 righe toccate.

## 3. Aree proposte e conteggi attesi dopo
| Quartiere | Area (slug proposto) | Planimetrie (predefinita in grassetto) | Pin |
|---|---|---|---:|
| Shibuya | piazza-della-stazione | **001-1-0** | 10 |
| Shibuya | sottopasso | **001-2-0** «inquadratura orientale», 001-2-1 «planimetria completa» (ex Sottopasso Speciale) | 16 |
| Shibuya | central-street | **001-3-0** | 24 |
| Shibuya | centro-comm-sotterraneo | **001-4-0** | 10 |
| Shibuya | tornello-della-linea-ginza | **001-5-0** | 7 |
| Shibuya | banchina-della-metropolitana | **001-12-0** | 4 |
| Shujin Academy | edificio-principale-1p | **002-0-0** (dubbio 1: un'Area per piano) | 21 |
| Shujin Academy | edificio-principale-2p | **002-0-1** | 26 |
| Shujin Academy | edificio-principale-3p | **002-0-2** | 15 |
| Shujin Academy | cancello-della-scuola | **002-1-0** | 5 |
| Shujin Academy | tetto | **002-5-0** | 1 |
| Shujin Academy | aula | **002-6-0** | 2 |
| Shujin Academy | biblioteca | **002-8-0** | 2 |
| Shujin Academy | banchina-aoyama-itchome | **shibuya-tornello-della-linea-ginza-aoyama-itchome** (dubbio 3: resta sotto Shujin) | 2 |
| Yongen-Jaya | banchina-della-metropolitana | **yongen-java-banchina-della-metropolitana** | 4 |
| Yongen-Jaya | vicoli | **009-2-0** | 26 |
| Yongen-Jaya | covo-dei-ladri | **022-1-0** «settore d'ingresso», 022-1-1 «planimetria completa», 022-1-2, 022-1-3, 022-1-4 (D2) | 27 |
| Kichijoji | quartiere-dello-shopping | **005-1-0** | 15 |
| Shinjuku | quartiere-a-luci-rosse | **006-1-0** | 15 |
| Akihabara | electric-town | **007-1-0** | 18 |
| Kanda / Jinbocho | cappella | **010-4-0** | 3 |
| Odaiba | cantiere-dello-stadio | **012-29-0** | 4 |
| — (Tokyo) | «da collocare» (dubbio 2) | 150-3-0 «porzione occidentale», 150-3-1 «planimetria completa» | 0 |

Conteggi attesi dopo la migrazione:
- **Aree del mondo: 22** (23 se l'utente sceglie l'Area della Città per lo staff). Shibuya **6** (R2-05), Shujin 8, Yongen-Jaya 3, altri 5 × 1.
- **Planimetrie con Area: 27**; da collocare **2** (staff); mappe di zona senza Area e non elencate: **0** (R2-02).
- Planimetrie con etichetta di versione: **7** (Sottopasso 2, Covo 5); aree con più versioni: 2.
- Pin del mondo **298**, pin nei Palazzi verso il mondo 2, `spillo_partita` sul mondo 0 (+1 di Kamoshida): **invariati** uno per uno.
- Ingressi **2**, stessi x/y/zoom/planimetria; quartieri con Aree **8**, senza **15** (+ Memento escluso).
- Cambi su colonne esistenti: solo `mappa.genitore_chiave` delle 5 planimetrie del Covo. `mappa_alias` 690, `mappa_percorso` 317 invariati.
- Impronta diario/Kamoshida/Madarame: **identica** (sha256 `1a71b030…bc4c`).

## 4. Anomalie e casi per i dubbi
1. Shujin, tre piani (dubbio 1): le planimetrie 002-0-0/1/2 non sono in un gruppo d'immagini e hanno pin propri (21, 26, 15) e 16 passaggi
   fra piani: sono zone diverse, non versioni → un'Area per piano è coerente coi dati.
2. Staff sotto Tokyo (dubbio 2): 2 planimetrie seed, 0 pin, 0 passaggi entranti, nessun quartiere: nessun dato si perde lasciandole «da collocare».
3. Aoyama Itchome: chiave che dice «shibuya-tornello…», genitore Shujin, nome rivisto «Banchina Aoyama Itchome», pubblica
   `shujin-academy-banchina-aoyama-itchome`; 4 passaggi entranti (1635 dal quartiere Shujin, 1653 da Tornello Ginza di Shibuya, 1716 e 337 dal
   Cancello). Lasciarla sotto Shujin non cambia nessun pin.
4. Banchina di Yongen-Jaya: chiave con refuso `yongen-java-…`, 5 alias, 5 passaggi entranti (1625, 1569, 1572, 1647, 1648): chiave invariata.
5. Sottopasso Speciale: 0 pin, 0 passaggi entranti, 5 alias (fra cui `shibuya-sottopasso`!): diventa versione senza perdere nulla; attenzione
   alla trappola degli alias (§1.8).
6. Covo: 27 spilli seed, nessun passaggio entrante, nessun pin sull'illustrazione di Yongen-Jaya → dopo D2 l'Area del Covo non ha pin di
   passaggio sul quartiere (finisce nel «da completare», dubbio 6). La «fermata» del Covo (dubbio 4) non esiste nei dati come pin; se esiste,
   è nel codice (da chiedere ad Analisi app).
7. Passaggi che arrivano su una versione non predefinita: 0 (nessuno punta a 001-2-1 o 022-1-1..4 o 150-3-1).
8. Destinazioni con x=0, y=0, zoom=1 su tutti i 42 passaggi verso zone (1480 ha in più l'arrivo sul pin 1457): la navigazione centra la
   planimetria; dopo L2 deve restare uguale.
9. Discrepanza documentale: 62 vs **70** passaggi (§1.5); 12 vs **14** Aree senza passaggio dal quartiere (§1.5); 196/250 vs 225/252 per
   Madarame (§1.10). Proposta: aggiornare i numeri nei requisiti (R2-32) e in processo.md.
