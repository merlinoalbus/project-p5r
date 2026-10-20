# L4 «Avanzamento unico» — analisi dati

Analisi dati, 2026-10-20. Sola lettura sulla copia di produzione `…\cffd8da6-…\scratchpad\prod-20261020\` e su `data/` (dev).
Script e uscite (scratchpad `…\161706c7-6e2c-47d6-bdb7-618347ce218c\scratchpad\`): `l4.cjs` → `l4-prod.json` / `l4-dev.json`
(**identici byte per byte**), `dungeon-<k>-p<n>.json` / `dungeon-elenco-p<n>.json` (risposte di `GET /api/compendio/dungeon[/<k>]?partita=n`
del BE di sviluppo: le percentuali di oggi). Requisiti: `lotti/L4/requisiti.md` (R4-01…R4-37, dubbi 1–8).
Base di Madarame confermata dall'utente: **225 voci e 252 pin utente al 20/10**; perimetro di confronto: impronta `impronta-prod-20261020.json`
(sha256 `1a71b030…bc4c`, identica su prod e dev). Partite: 1 «Partita Roberto» (reale), 2 «Tutorial».

## 1. Carattere delle voci secondo D4 (rigenerabili = oggetto, ombra-sciagura, nemico; descrittive = storia, altro)
Tipo «nemico»: **0 voci** in tutta la base (dubbio 1 confermato). Tutti i tipi (959 voci): altro 12, boss 24, forziere 106, forziere-chiuso 23,
meccanismo 33, miniboss 57, oggetto 137, ombra-sciagura 70, persona 172, porta 7, puzzle 56, scorciatoia 62, sicura 55, storia 91, trama 33
(dedali), volonta 21.

| Palazzo | Voci | Permanenti | Rigenerabili | Descrittive | Persona (L8) | Passi Enigma | Esauribili |
|---|---:|---:|---:|---:|---:|---:|---:|
| Kamoshida | 169 | 71 | 47 (oggetto 17, ombra-sciagura 30) | 49 (storia) | 2 | 32 | 0 |
| Madarame | 225 | 99 | 82 (oggetto 55, ombra-sciagura 27) | 44 (storia 42, altro 2) | 0 | 49 | 10 |
| Kaneshiro | 47 | 26 | 10 | 2 | 9 | 0 | 19 |
| Futaba | 40 | 25 | 10 | 1 | 4 | 0 | 16 |
| Okumura | 56 | 40 | 15 | 0 | 1 | 0 | 39 |
| Niijima | 61 | 34 | 9 | 3 | 15 | 0 | 4 |
| Shido | 81 | 64 | 17 | 0 | 0 | 0 | 57 |
| Maruki | 69 | 56 | 12 | 0 | 1 | 0 | 52 |
| Iweleth | 47 | 29 | 5 | 4 | 9 | 0 | 25 |

Tutte le voci di un Palazzo appartengono a **una sola** infiltrazione (`punto_interesse.area_chiave`): lo stato di oggi di una rigenerabile si
attribuisce senza ambiguità all'infiltrazione della sua voce.

## 2. Stati di oggi
- `punto_partita` **525** righe: p1 356, p2 169; **tutte** `stato='ottenuto'`, `automatico=0`; «esaurito» non è mai usato; 0 orfani.
  Kamoshida p1 133, p2 169; Madarame p1 221, p2 0 (+2 di p1 fuori da questi due Palazzi).
- Stati per carattere: Kamoshida p1 permanenti 56/71, rigenerabili 40/47, **descrittive 35/49**, persona 2/2; p2 tutto (71, 47, **49**, 2).
  Madarame p1 permanenti 99/99, rigenerabili 81/82, **descrittive 41/44**.
- `spillo_partita`: p1 410 raccolti; p2 257 raccolti + 81 con `raccolto=0`; 0 orfani.
- Pin dei due Palazzi: Kamoshida 373 (369 su planimetrie e radice + 4 schede), 255 con voci, 118 senza voci (stati: p1 1, p2 6), 0 con più
  voci; Madarame 261 (258 + 3 schede), 202 con voci, 59 senza (stati: 0), **69 con più voci**.

## 3. Divergenze voce/pin di oggi (regola R4-09: pin fatto ⇔ tutte le sue voci segnate)
**10 in tutto, solo in p1.**
- Kamoshida p1, 8 pin fatti con la voce non segnata:
  | Pin | Planimetria | Nome del pin | Voce | Tipo |
  |---|---|---|---|---|
  | 1982 | 151-10-0 | Oggetto | kamoshida-15-torre-centrale-torre-livello-superiore | storia |
  | 615 | 151-11-1 | Forziere | kamoshida-15-torre-centrale-raccogli-forziere-3 | forziere |
  | 1953 | 151-6-2 | Oggetto | kamoshida-13-tetto-ispeziona-linterno-della-torre | storia |
  | 583 | 151-6-4 | Seme lussuria verde | kamoshida-13-tetto-seme-della-bramosia | volonta |
  | 1970, 1971 | 151-7-0 | Oggetto | kamoshida-15-torre-centrale-esplora-stanza-successiva | storia |
  | 1992, 1993 | 151-7-0 | Guardia d'Elitè, Occhio SX Lussurioso | kamoshida-15-torre-centrale-sconfiggi-i-capitani-delle-guardie | ombra-sciagura |
- Madarame p1, 2 schede senza mappa con la voce segnata e nessuna riga di stato: 27 «Forziere chiuso — Catena di perline» → voce
  `madarame-06-sala-del-tesoro-atrio/7` (forziere-chiuso); 29 «Dipinto gigante illuminato» → `…/9` (puzzle).
- **Deciso dall'utente (2026-10-20, via PM)**: nessuna scrittura automatica. Le 8 divergenze di Kamoshida p1 (6 voci distinte: 3 `storia`,
  forziere, volonta, ombra-sciagura; seme-della-bramosia e raccogli-forziere-3 sono anche fra le 15 del §8) **si conservano «da verificare»**:
  il pin resta fatto, la voce resta non segnata, e l'utente le vede in un elenco. Le 2 schede di Madarame seguono l'assorbimento (§7).

## 4. Pin legati solo a voci descrittive: lo stato si perderebbe (R4-02 vs R4-27) — DA DECIDERE
R4-02 dice «le descrittive non hanno stato»; R4-09 calcola lo stato del pin dalle sue voci. Oggi:
- Kamoshida: **72 pin** legati solo a voci `storia`, raccolti p1 **57**, p2 **72**; e 35 (p1) + 49 (p2) voci `storia` segnate.
- Madarame: **26 pin** (19 + 7 in più infiltrazioni) solo descrittivi, raccolti p1 **25**; 41 voci descrittive segnate in p1.
Applicando alla lettera R4-02 + R4-09 questi segni sparirebbero. **Confermato dall'utente (2026-10-20, via PM)**: le voci descrittive tengono il
loro segno e non contano nel completamento; un pin le cui voci sono tutte descrittive si comporta come un pin senza voce (stato proprio). Nessun segno perso.
Casi misti in Madarame: 2 pin «descrittiva + permanente», 1 pin «permanente + rigenerabile» (in più infiltrazioni): elencarli in
modifiche.md con la regola (proposta: il pin è fatto quando sono fatte tutte le sue voci, ciascuna con la sua regola).

## 5. Rigenerabili condivise fra infiltrazioni (Madarame)
40 pin di Madarame sono collegati a voci **rigenerabili** di infiltrazioni diverse (gli oggetti che «si ripropongono»): con L4 il pin mostra lo
stato della voce dell'infiltrazione guardata. Oggi in p1 sono tutti raccolti e le loro voci tutte segnate: nessuna perdita.

## 6. Copie permanenti (fusioni, R4-15…R4-18)

### 6.0 Ricalcolo con la regola dell'utente (2026-10-20, via PM) — VALE QUESTO
Parole dell'utente: «le voci dipendono anche dai Pin associati... sono identiche se sono associate anche agli stessi Pin... nella stessa
infiltrazione. altrimenti non sono identici perchè fanno riferimento a quell'azione/elemento ma in momenti diversi del processo e su pin diversi
in planimetria». Criterio applicato (`l4copie.cjs` → `l4copie-prod.txt`, prod = dev): **stessa infiltrazione** (`area_chiave`), stesso tipo, nome,
descrizione, dettagli e contenitore, **stesso insieme di pin** (`spillo_voce`). Su tutti i Palazzi:
- **Madarame: 0 gruppi identici.** I 15 gruppi del calcolo di prima (§6.1) stanno tutti in infiltrazioni diverse: per la regola sono voci
  distinte («momenti diversi del processo»), **nessuna fusione**.
- **1 solo gruppo in tutta la base**, a Kamoshida: `kamoshida-01-cancello-del-castello-ingresso`, `storia` «Oltrepassa le sbarre»,
  voci `…-oltrepassa-le-sbarre-2` (ordine 2) e `…-oltrepassa-le-sbarre-3` (ordine 4), **nessun pin** (identiche solo perché entrambe senza pin),
  segnate in p1 e p2. È descrittiva: da far vedere all'utente se la vuole fondere (il criterio dei «pin uguali» qui è vuoto).
- 18 gruppi con stesso testo nella stessa infiltrazione ma **pin diversi** (Kamoshida 5, Madarame 13: «Raccogli Installazione Artistica» ×8,
  «Sconfiggi Nemico» ×4, «Sblocca la Porta», leve, forzieri…): **non** identiche per la regola; elenco in `l4copie-prod.txt`.
- Conseguenza per il caso di prova del piano (R4-18, «un forziere aperto nella 2 è aperto nella 4»): senza fusioni, la propagazione passa dal
  **pin condiviso**: 17 pin di Madarame collegano voci permanenti di infiltrazioni diverse (`M multiInf`, §2/§5): segnare il pin segna le voci di
  tutte le infiltrazioni che lo condividono. Da verificare in modifiche.md che R4-03 si realizzi così.
- **Deciso dall'utente (2026-10-20, via PM): nessuna fusione**; «Oltrepassa le sbarre» resta due voci.

### 6.1 Calcolo precedente (superato dalla regola dell'utente, tenuto per traccia)
Criterio: voci permanenti (non passi) con stesso tipo e stesso nome normalizzato in infiltrazioni diverse dello stesso Palazzo
(`copie` in `l4-prod.json`).
- **Madarame: 16 gruppi, 36 voci.** 15 gruppi condividono già almeno un pin fra le copie (`spillo_voce`): sono copie vere (32 voci → 15,
  **17 voci in meno** se tutte approvate; il piano stimava ≈20). Testi uguali in 11 gruppi, **diversi in 4** (dubbio 8: niente fusione automatica):
  «Lucernario aperto» (3 copie), «Raggiungi la SR Stanza Principale» (2), «Prima sala della mostra» (2), «Raggiungi dal tetto l'area protetta» (2).
  I gruppi uguali: Visita Safe Room del Giardino (3), Segui il condotto, Tetti e condotti di areazione, Scendi nel corridoio bloccato, Usa rampino
  asse centrale, Salta la distesa di laser, Stanza del tesoro, Affronta nemici (miniboss), Usa il rampino per andare al livello 1, Stanza della
  mostra n.2, Visita ai bagni (forziere) — 2 copie ciascuno.
  Il 16° gruppo «Sblocca la porta» (4 voci, 2 per infiltrazione, **nessun pin condiviso**) sono porte diverse con lo stesso nome: **non** è una copia.
  Infiltrazioni coinvolte: entrata del museo, scopri dov'è il tesoro, nelle profondità del museo, il furto del cuore.
  Stati: **tutte** le copie sono segnate in p1, nessuna in p2 → lo stato unito è banale (p1 fatto; data più vecchia, dubbio 5).
- Kamoshida: 3 gruppi con nomi generici («Raccogli forziere» ×5, «Apri forziere raro» ×2, «Apri forziere» ×2), **0 pin condivisi**: forzieri
  diversi, non copie. Futaba e Shido: 1 gruppo ciascuno, 0 pin condivisi, testi diversi: non copie.
- Elenco approvabile per l'utente: le 15 righe di Madarame con voci, infiltrazioni, ordine, pin, stati (dati in `l4-prod.json`, campo `copie`).

## 7. Schede senza mappa (R4-19)
Oggi **154** (non 187 come nel piano: misura più vecchia; nessun'altra tabella le contiene). Per Palazzo: kam 4, mad 3, kan 7, fut 16, oku 19,
nii 27, shi 41, iwe 12, mar 25.
- **149** hanno `riferimento_tipo='punto'` verso una voce che esiste (chiavi `<infiltrazione di prima>/<n>`), sono tutte **seed**, nella stessa
  infiltrazione della voce; nome uguale 147, descrizione uguale 148. Le 2 differenze sono Madarame 27 e 29 (voci rinominate dall'utente:
  «Apri i Forzieri», «Una scorciatoia artistica»; la voce vince).
  Ognuna ha la sua posizione in `marcatore_mappa` (149 righe, x/y **senza planimetria**).
  0 immagini (`spillo_immagine` vuota), 0 stati di partita.
  **Regola proposta**: la scheda si assorbe nella voce (già esiste, testo uguale); la posizione del marcatore resta come «posizione da
  collocare» della voce finché non ha un pin; nessuna riga persa senza elenco.
- **5** senza riferimento (dubbio 6): Kamoshida 1 «Cancello del Castello», 14 «Tre guardie del Tetto», 15 «Forziere dei 3 Magatama maledetto»,
  16 «Seme lussuria verde (2° Seme della Bramosia)»; Madarame 28 «Forziere — Fiale delle vertigini S». Proposta: elenco da approvare (diventano
  voci, o si collegano a voci esistenti come `kamoshida-13-tetto-seme-della-bramosia`); mai cancellate.

## 8. Completamento oggi e dopo (R4-21…R4-28)
Oggi (API di sviluppo, regola corrente «raccolta dei pin collezionabili»):
| | Kamoshida p1 | Kamoshida p2 | Madarame p1 | Madarame p2 |
|---|---|---|---|---|
| raccolta | 107/107, planimetrie 26/26 | 107/107, 26/26 | **85/86**, 16/17 | 0/86, 3/17 |
| completato | «Tesoro, boss finale e raccolto tutto (107/107)» | idem | no (manca il pin 811 «Tesoro del Palazzo», Sala Principale liv. 0) | no |
| voci gestite | 133/169 | 169/169 | 221/225 | 0/225 |

Con la regola nuova (permanenti + tesoro + boss) **Kamoshida p1 cambierebbe**: 15 voci permanenti non sono segnate, anche se la raccolta oggi è
107/107, perché i loro pin non sono collezionabili:
usa-il-condotto-di-areazione (scorciatoia, 3 pin), seme-della-bramosia (volonta, 1 pin fatto su 4), osserva-statua-di-kamoshida (meccanismo,
passo), torna-al-livello-inferiore (porta, passo), attraversa-il-passaggio-segreto (scorciatoia), sblocca-ascensore, sblocca-le-grate,
usa-gli-occhi-sulla-statua-di-kamoshida (passo, 0 pin), usa-lascensore, tira-la-leva (meccanismo), torre-centrale e sala-del-trono (sicura;
la seconda senza pin), ponte-di-kamoshida (puzzle, 0 pin), raccogli-forziere-3 (forziere, 1 pin fatto su 3), entra-nella-sala-del-trono
(scorciatoia). Tutte di `kamoshida-13-tetto` / `kamoshida-15-torre-centrale`.
**Deciso dall'utente (2026-10-20, via PM)**: le 15 voci **non** si segnano in migrazione; Kamoshida p1 risulterà non completato finché
l'utente non le spunta (differenza spiegata voce per voce da questo elenco, R4-28). Nessun segno tolto.
Madarame p1: permanenti 99/99 segnati; con la regola nuova manca solo il Tesoro (come oggi). p2: nessun dato.
Le 4 voci di Madarame non segnate in p1: raccogli-installazione-artistica (oggetto), lavori-forzati e prima-di-uscire (altro),
cerca-una-via-duscita (storia): nessuna è permanente.

## 9. Regole di migrazione proposte
1. **Carattere**: colonna nuova sulla voce (`permanente` | `rigenerabile` | `descrittiva`; persona lasciata a L8), valorizzata dal tipo secondo D4;
   `origine` della scelta (`regola` | `utente`) per «Ripristina».
2. **Stato delle voci**: `punto_partita` non si riscrive. Per le rigenerabili si aggiunge l'infiltrazione allo stato = `area_chiave` della voce
   (univoca: §1). Per le permanenti lo stato resta per voce e partita.
3. **Divergenze (§3)**: nessuna riga scritta (decisione dell'utente). Le 8 di Kamoshida p1 restano come sono e sono marcate «da verificare»
   (elenco, o segnale nell'interfaccia: lo decide modifiche.md); il pin conserva il suo stato finché l'utente non sceglie. Le 2 schede di Madarame
   si risolvono con l'assorbimento (§7).
4. **Stato dei pin**: le righe `spillo_partita` dei pin con voci **non si cancellano** nella migrazione (servono al confronto e a §4); si smette di
   leggerle per i pin con voci non descrittive; si eliminano in L11 dopo il confronto. Pin senza voci e pin solo descrittivi: stato proprio, invariato.
5. **Fusioni**: nessuna in migrazione; solo l'elenco (§6). Applicazione dopo il sì voce per voce (gesto dell'app, reversibile).
6. **Schede senza mappa**: §7 (149 assorbite con marcatore conservato, 5 in elenco).
7. **Idempotenza**: colonne valorizzate solo se NULL; righe aggiunte con `INSERT OR IGNORE`.

## 10. Conteggi attesi dopo la migrazione
| Voce | Atteso |
|---|---|
| voci | 959 invariate (Kamoshida 169, Madarame 225), testi/ordine/uid invariati |
| voci con carattere | 959 (persona: valore a parte o NULL fino a L8, secondo modifiche.md) |
| `punto_partita` | **525 invariato** (nessuna scrittura: le 8 divergenze restano «da verificare», le 15 del §8 non si segnano; decisioni dell'utente) |
| `spillo_partita` | 410 + 338 invariate (non cancellate) |
| divergenze voce/pin dopo | 0 **nuove** (R4-14); le 8 di oggi di Kamoshida p1 conservate e marcate «da verificare» |
| fusioni | **0** (decisione dell'utente: nessuna fusione; «Oltrepassa le sbarre» resta due voci) |
| schede senza mappa lette come entità a sé | 0 (154 → 149 assorbite + 5 in elenco) |
| impronta `impronta.cjs` | **identica** (voci, pin, `statiVoci`, `statiPin`): sha256 `1a71b030…bc4c` |
| completamento | Kamoshida p2 completato; Madarame p1 manca il Tesoro come oggi; Kamoshida p1 secondo la scelta del §8 |

## 11. Verifica dopo la 111/022 (richiesta del PM, 2026-10-20)
Sola lettura su `data/` della cartella di sviluppo (quella servita dal BE su 3201), confrontata con la copia di produzione. Script `l4kn.cjs` → `l4kn-dev.json` /
`l4kn-prod.json` nel mio scratchpad. **Sviluppo = produzione** in tutti i numeri qui sotto; l'unica differenza è la tabella `divergenza_partita`, che esiste solo su
sviluppo (creata dalla 022). Regole applicate: `modifiche.md` §1.1 (carattere dal tipo; `punto_interesse.carattere` è presente su sviluppo e tutto NULL) e §8.11
(stato del pin proprio; voce con pin fatta quando lo sono tutti i suoi pin; pin condivisi da rigenerabili di più infiltrazioni letti per infiltrazione).

### 11.1 Le migrazioni come sono oggi nella cartella di sviluppo
- **111** (`server/db/migrations/111_carattere_delle_voci.ts`): aggiunge `punto_interesse.carattere`, tutto NULL, e scrive solo il log. Su sviluppo la colonna c'è. ✔
- **022** (`server/db/migrazioniUtente/022_divergenze_da_verificare.ts`): crea `divergenza_partita` e la riempie con la regola **del §0 originale** (pin raccolto, voce che
  conta non fatta, con l'oggetto permanente del §1.3). **Non crea `spillo_partita_infiltrazione`** del §8.11: su sviluppo la tabella **non esiste** e nel codice di
  `server/` e `shared/` non c'è nessun riferimento al nome. Le 90 righe di Madarame p1 sono quindi **ancora da scrivere** (BE), con la regola sotto (§11.4).
  I file 111 e 022 sono nuovi e non ancora committati (`git status`: `??`).

### 11.2 Le 4 divergenze di Kamoshida p1 — ✔ coincidono
`utente.divergenza_partita` su sviluppo, 4 righe, tutte p1:
| Pin | uid | Voce | Carattere |
|---|---|---|---|
| 583 | d2f6acf51abeb2e971bd19709d2fec99 | kamoshida-13-tetto-seme-della-bramosia | permanente (volonta) |
| 615 | ac5feb061a85a46869a432280321130a | kamoshida-15-torre-centrale-raccogli-forziere-3 | permanente (forziere) |
| 1992 | fd32580a28b59163509d99ec05947ee9 | kamoshida-15-torre-centrale-sconfiggi-i-capitani-delle-guardie | rigenerabile (ombra-sciagura) |
| 1993 | 2d4e5e28d4d8a9e9c85a38a63efe2fc2 | kamoshida-15-torre-centrale-sconfiggi-i-capitani-delle-guardie | rigenerabile (ombra-sciagura) |
Coerente con il §3: degli 8 pin divergenti, 1982, 1953, 1970 e 1971 hanno solo voci `storia` (descrittive, non contano) e non generano righe. Con il §8.11 queste 4
diventano lo stato normale «in corso»: seme della bramosia **1/4**, raccogli-forziere-3 **1/3**, capitani delle guardie **2/4** (§11.5).

### 11.3 Il 56/71 di Kamoshida p1 — ✔
Voci permanenti di Kamoshida: 71. Fatte in p1: **56**, sia contando i segni (`punto_partita`) sia con la regola del §8.11 (dai pin): le due letture coincidono voce per
voce. Kamoshida non ha pin condivisi fra voci permanenti, quindi oggetti = voci (71). Voci «in corso» in p1: **3**, le tre del §11.2. In p2: 71/71, nessuna in corso.
Madarame: p1 **99/99**, p2 0/99, nessuna in corso.
Controllo incrociato su tutte le voci con pin di Kamoshida e Madarame, p1 e p2: **0** voci con tutti i pin fatti ma non segnate, **0** voci segnate con pin non tutti fatti.

### 11.4 I 40 pin condivisi di Madarame e le 90 righe di `spillo_partita_infiltrazione` — ✔ (le righe non esistono ancora)
- Pin collegati a voci **rigenerabili** di **più infiltrazioni**: Madarame **40**, Kamoshida **0**. ✔
- Righe attese (regola del §8.11.1: una per pin e infiltrazione, quando il pin è raccolto **e** la voce rigenerabile di quell'infiltrazione è segnata): **Madarame p1 = 90**,
  p2 = 0, Kamoshida 0. ✔
- Casi incoerenti (pin raccolto con voce non segnata, o voce segnata con pin non raccolto): **0**. La migrazione non perde e non inventa nessuno stato.

### 11.5 Le «89 voci con più pin (237 pin, 117 collezionabili)» — ✔, ma sono legami, non pin
Ricostruito su Kamoshida e Madarame (prod = dev):
| Insieme di voci con più di un pin | Voci | Legami voce-pin (somma degli N) | di cui su pin collezionabili | Pin distinti | di cui collezionabili |
|---|---:|---:|---:|---:|---:|
| tutte | 111 | 304 | 149 | 262 | 120 |
| **non descrittive** (permanenti, rigenerabili + 1 `persona`) | **89** | **237** | **117** | 200 | 91 |
| permanenti e rigenerabili (quelle con il contatore k/N) | **88** | 235 | 116 | 198 | 90 |
I numeri della Stesura (89 / 237 / 117) sono quindi **voci / legami / legami su pin collezionabili**, non pin distinti: i pin distinti sono 200, di cui 91 collezionabili
(un pin condiviso conta una volta). Delle 89, una è di tipo `persona`, senza carattere (L8): `kamoshida-tutorial-palazzo-12-04-sconfiggi-3-bestie-bicorne-sporche-durante-la-fuga`
(«Risveglio Persona di Ryuji», 2 pin, 2/2 in p1 e p2). Il contatore k/N vale per le **88** permanenti e rigenerabili (§8.11.2).

### 11.6 Elenco atteso del contatore k/N, voce per voce (per BE e no-reg)
Sulle partite reali di oggi (p1 «Partita Roberto», p2 «Tutorial»), dopo la 022 con la regola del §8.11. k = pin fatti (per i pin condivisi, letti nell'infiltrazione della
voce), N = pin distinti della voce. Voci con un solo pin: k/N = 1/1 se segnata, 0/1 se no (coincide con il segno in tutti i casi: nessuna eccezione), non elencate.
Riepilogo delle 88: **p1** fatte 80, in corso 3, da fare 5 · **p2** fatte 39 (tutte Kamoshida), in corso 0, da fare 49 (tutte Madarame).
Chiavi senza il prefisso del Palazzo; P = permanente, R = rigenerabile.
| Palazzo | Infiltrazione | Voce | Tipo | p1 k/N | p2 k/N |
|---|---|---|---|---|---|
| kamoshida | tutorial-palazzo-12-04 | tutorial-palazzo-12-04-cerca-la-palestra | ombra-sciagura (R) | 2/2 | 2/2 |
| kamoshida | tutorial-palazzo-15-04 | tutorial-palazzo-15-04-sconfiggi-i-nemici | ombra-sciagura (R) | 3/3 | 3/3 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-recupera-libro-del-re | meccanismo (P) | 2/2 | 2/2 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-tira-la-terza-leva | meccanismo (P) | 2/2 | 2/2 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-indaga-nel-castello | oggetto (R) | 2/2 | 2/2 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-passaggio-aerazione | scorciatoia (P) | 3/3 | 3/3 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-razia-scatola-alla-base-della-scala-e-la-botte-al-piano-di-sopra | oggetto (R) | 2/2 | 2/2 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-sconfiggi-i-nemici | ombra-sciagura (R) | 2/2 | 2/2 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-razia-il-corridoio | oggetto (R) | 2/2 | 2/2 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-continua-a-indagare-nel-castello | ombra-sciagura (R) | 2/2 | 2/2 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-saccheggia-gli-oggetti | oggetto (R) | 3/3 | 3/3 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-passa-per-i-lampadari | scorciatoia (P) | 3/3 | 3/3 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-nemici-aura-rossa | ombra-sciagura (R) | 2/2 | 2/2 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-depreda-oggetti | oggetto (R) | 3/3 | 3/3 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-trova-una-strada-alternativa | scorciatoia (P) | 3/3 | 3/3 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-sconfiggi-nemici-esterni | ombra-sciagura (R) | 4/4 | 4/4 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-salta-lungo-le-travi | forziere (P) | 3/3 | 3/3 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-raccogli-forziere-raro | forziere (P) | 3/3 | 3/3 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-la-rivincita-sui-nemici | ombra-sciagura (R) | 8/8 | 8/8 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-razzia-la-cappella | forziere (P) | 3/3 | 3/3 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-esamina-stanza-adiacente | ombra-sciagura (R) | 2/2 | 2/2 |
| kamoshida | 01-cancello-del-castello-ingresso | 01-cancello-del-castello-ingresso-recupero-1-seme-della-bramosia | volonta (P) | 2/2 | 2/2 |
| kamoshida | 13-tetto | 13-tetto-sconfiggi-nemici-potenti | ombra-sciagura (R) | **0/3** | 3/3 |
| kamoshida | 13-tetto | 13-tetto-razzia-oggetti-sul-tetto | oggetto (R) | 3/3 | 3/3 |
| kamoshida | 13-tetto | 13-tetto-usa-il-condotto-di-areazione | scorciatoia (P) | **0/3** | 3/3 |
| kamoshida | 13-tetto | 13-tetto-seme-della-bramosia | volonta (P) | **1/4** | 4/4 |
| kamoshida | 15-torre-centrale | 15-torre-centrale-esplora-la-stanza-segreta | oggetto (R) | 3/3 | 3/3 |
| kamoshida | 15-torre-centrale | 15-torre-centrale-sconfiggi-nemico | miniboss (P) | 2/2 | 2/2 |
| kamoshida | 15-torre-centrale | 15-torre-centrale-sconfiggi-i-capitani-delle-guardie | ombra-sciagura (R) | **2/4** | 4/4 |
| kamoshida | 15-torre-centrale | 15-torre-centrale-sblocca-le-grate | meccanismo (P) | **0/2** | 2/2 |
| kamoshida | 15-torre-centrale | 15-torre-centrale-apri-2-forzieri | forziere (P) | 2/2 | 2/2 |
| kamoshida | 15-torre-centrale | 15-torre-centrale-sconfiggi-nemici | ombra-sciagura (R) | **0/2** | 2/2 |
| kamoshida | 15-torre-centrale | 15-torre-centrale-sconfiggi-nemici-2 | ombra-sciagura (R) | **0/2** | 2/2 |
| kamoshida | 15-torre-centrale | 15-torre-centrale-perlustra-la-stanza | forziere (P) | 3/3 | 3/3 |
| kamoshida | 15-torre-centrale | 15-torre-centrale-razia-torre-livello-superiore | forziere (P) | 3/3 | 3/3 |
| kamoshida | 15-torre-centrale | 15-torre-centrale-perlustra-corridoio | forziere (P) | 3/3 | 3/3 |
| kamoshida | 15-torre-centrale | 15-torre-centrale-raccogli-forziere-3 | forziere (P) | **1/3** | 3/3 |
| kamoshida | 15-torre-centrale | 15-torre-centrale-raccogli-oggetti-2 | oggetto (R) | 3/3 | 3/3 |
| kamoshida | rubare-i-desideri-del-cuore | rubare-i-desideri-del-cuore-infiltrati-fino-alla-safe-room-della-sala-del-trono | scorciatoia (P) | 2/2 | 2/2 |
| madarame | 01-entrata-del-museo | 01-entrata-del-museo/0 | oggetto (R) | 4/4 | 0/4 |
| madarame | 01-entrata-del-museo | 01-entrata-del-museo-raccogli-e-depreda-le-installazioni-artistiche | oggetto (R) | 8/8 | 0/8 |
| madarame | scopri-dove-il-tesoro | scopri-dove-il-tesoro-installazioni-artistiche | oggetto (R) | 4/4 | 0/4 |
| madarame | scopri-dove-il-tesoro | scopri-dove-il-tesoro-saccheggia-installazioni-artistiche | oggetto (R) | 2/2 | 0/2 |
| madarame | scopri-dove-il-tesoro | scopri-dove-il-tesoro-sconfiggi-tutte-le-guardie | ombra-sciagura (R) | 4/4 | 0/4 |
| madarame | scopri-dove-il-tesoro | scopri-dove-il-tesoro-sali-sulla-passerella | scorciatoia (P) | 2/2 | 0/2 |
| madarame | scopri-dove-il-tesoro | scopri-dove-il-tesoro-saccheggia-installazioni-artistiche-2 | oggetto (R) | 4/4 | 0/4 |
| madarame | scopri-dove-il-tesoro | scopri-dove-il-tesoro-saccheggia | oggetto (R) | 3/3 | 0/3 |
| madarame | scopri-dove-il-tesoro | scopri-dove-il-tesoro-spia-le-due-guardie | ombra-sciagura (R) | 2/2 | 0/2 |
| madarame | scopri-dove-il-tesoro | 01-entrata-del-museo-affronta-nemici | miniboss (P) | 2/2 | 0/2 |
| madarame | scopri-dove-il-tesoro | 01-entrata-del-museo-raccogli-installazioni-artistiche | oggetto (R) | 2/2 | 0/2 |
| madarame | scopri-dove-il-tesoro | scopri-dove-il-tesoro-visita-ai-bagni | forziere (P) | 2/2 | 0/2 |
| madarame | scopri-dove-il-tesoro | scopri-dove-il-tesoro-sconfiggi-i-due-nemici | ombra-sciagura (R) | 2/2 | 0/2 |
| madarame | scopri-dove-il-tesoro | scopri-dove-il-tesoro-saccheggia-rasetsu-ofuda | forziere (P) | 5/5 | 0/5 |
| madarame | disabilita-i-sistemi-di-sicurezza | disabilita-i-sistemi-di-sicurezza-cerca-la-sala-di-controllo | meccanismo (P) | 3/3 | 0/3 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-sali-sullimpalcatura | scorciatoia (P) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-installazioni-artistiche-2 | oggetto (R) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-spia-le-guardie | ombra-sciagura (R) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-saccheggia-installazioni-artistiche-3 | oggetto (R) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-sblocca-dipinto | meccanismo (P) | 3/3 | 0/3 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-sconfiggi-tutte-le-guardie-2 | ombra-sciagura (R) | 4/4 | 0/4 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-saccheggia-installazioni-artistiche-4 | oggetto (R) | 4/4 | 0/4 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-sconfiggi-le-guardie | ombra-sciagura (R) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-raggiungi-la-roccia | scorciatoia (P) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-raccogli-installazioni-artistiche | oggetto (R) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-saccheggia-2 | oggetto (R) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-esci-sullimpalcatura | scorciatoia (P) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-affronta-nemici-2 | miniboss (P) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-raccogli-installazione-artistica-9 | oggetto (R) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-raccogli-installazioni-artistiche-2 | oggetto (R) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-sconfiggi-i-due-nemici-2 | ombra-sciagura (R) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-raccogli-installazione-2 | oggetto (R) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | 06-sala-del-tesoro-atrio/2 | forziere (P) | 3/3 | 0/3 |
| madarame | nelle-profondita-del-museo | 06-sala-del-tesoro-atrio/3 | forziere (P) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | 06-sala-del-tesoro-atrio/5 | forziere-chiuso (P) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | 06-sala-del-tesoro-atrio/7 | forziere-chiuso (P) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-raccogli-oggetti | oggetto (R) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-usa-limpalcatura | oggetto (R) | 3/3 | 0/3 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-sconfiggi-nemici | ombra-sciagura (R) | 4/4 | 0/4 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-sconfiggi-nemici-2 | ombra-sciagura (R) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-razzia-installazioni-artistiche | oggetto (R) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-apri-forziere-2 | forziere (P) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-premi-interruttore-saracinesca | meccanismo (P) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-perlustra-corridoio | oggetto (R) | 3/3 | 0/3 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-sali-al-livello-2 | scorciatoia (P) | 2/2 | 0/2 |
| madarame | nelle-profondita-del-museo | nelle-profondita-del-museo-ripulisci-corridoio | ombra-sciagura (R) | 2/2 | 0/2 |
| madarame | il-furto-del-cuore-di-madarame | il-furto-del-cuore-di-madarame-raggiungi-la-sr-stanza-principale | sicura (P) | 2/2 | 0/2 |
| madarame | il-furto-del-cuore-di-madarame | il-furto-del-cuore-di-madarame-perlustra-corridoio | oggetto (R) | 2/2 | 0/2 |
| madarame | il-furto-del-cuore-di-madarame | il-furto-del-cuore-di-madarame-tetti-e-condotti-di-areazione | scorciatoia (P) | 2/2 | 0/2 |
In grassetto le 8 voci di p1 non complete: 3 in corso (le divergenze del §11.2) e 5 da fare (tutte di Kamoshida, fra le 15 permanenti non segnate o rigenerabili
non raccolte). Nota: alcune chiavi hanno il prefisso di un'altra infiltrazione (es. `01-entrata-del-museo-affronta-nemici` sta in «scopri-dove-il-tesoro»): è la chiave
storica della voce spostata, conta l'infiltrazione della colonna 2.

### 11.7 Rifatto sulla copia fresca di produzione (`p5s-coordinamento/dati-produzione/2026-10-20-0440Z/`, del Collaudo) — VALE QUESTA
L'utente ha finito Madarame in produzione la sera del 19/10 (differenze del Collaudo in `differenze-gioco.txt` e `differenze-partite.txt`). Rifatti `l4kn.cjs`, `l3.cjs`,
`impronta.cjs` (uscite `*-0440Z.json` nel mio scratchpad).
| Misura | Copia del 20/10 00:08 (§11.1–11.6) | **Copia 0440Z** | Perché |
|---|---|---|---|
| Madarame: voci | 225 | **227** | +2 boss: `…-il-furto-del-cuore-di-madarame-scontro-con-madarame` (senza pin) e `…-scontro-con-madarame-2` (pin 2300, 2301) |
| Madarame: pin (tutti / utente) | 258 / 252 | **260 / 254** | +2300 «La vera Sayuri Originale» (`tesoro-palazzo`), +2301 «Madarame» (`boss`), entrambi su 153-5-0 |
| Madarame: `spillo_voce` | 284 | **287** | +811 → riunisciti-con-morgana, +2300 e +2301 → scontro-con-madarame-2 |
| Madarame p1: `punto_partita` / pin raccolti | 221 / 199 | **224 / 203** | +cerca-una-via-duscita (storia), +2 boss; +pin 811 (Tesoro), 2300, 2301 e un pin storia |
| Madarame: voci permanenti, p1 / p2 | 99/99 · 0/99 | **101/101 · 0/101** | i 2 boss sono permanenti |
| **Madarame p1 concluso (Tesoro + boss)** | no (mancava il pin 811) | **sì** | Tesoro raccolto: pin 811 «Tesoro del Palazzo» (153-9-0) **e** 2300 «La vera Sayuri Originale» (153-5-0), due pin `tesoro-palazzo`; boss segnati |
| **Madarame p1 completato** | no | **sì** (concluso + 101/101 permanenti) | |
| Kamoshida p1: 56/71, 3 in corso, 4 divergenze | | **invariati** | |
| Pin condivisi da rigenerabili di più infiltrazioni / righe `spillo_partita_infiltrazione` p1 | 40 / 90 | **40 / 90** (0 incoerenti) | invariati |
| Voci con più pin (tutte) | 111 · legami 304 | **113** | +riunisciti-con-morgana (storia, ora 2 pin) e +scontro-con-madarame-2 |
| Voci **non descrittive** con più pin · legami · su collezionabili · pin distinti · collezionabili | 89 · 237 · 117 · 200 · 91 | **90 · 239 · 119 · 202 · 93** | +scontro-con-madarame-2 |
| **Voci con il contatore k/N** (permanenti + rigenerabili) · legami · su coll. · pin distinti · coll. | 88 · 235 · 116 · 198 · 90 | **89 · 237 · 118 · 200 · 92** | +scontro-con-madarame-2 |
| k/N p1 | 80 fatte · 3 in corso · 5 da fare | **81 · 3 · 5** | scontro-con-madarame-2 **2/2** in p1, **0/2** in p2 |
| k/N p2 | 39 · 0 · 49 | **39 · 0 · 50** | idem |
| Impronta (`impronta.cjs`) | `1a71b030…bc4c` · diario 254, spunte 338, Madarame voci 225 pin 261 statiVoci 221 statiPin 276 | **`bbd9de5d…`** · diario **255**, spunte **342**, Madarame voci **227**, pin **263**, statiVoci **224**, statiPin **280**; Kamoshida invariato | lavoro dell'utente del 19/10 sera: **nuova voce del diario il 06-01** (sera, Igor, `9b4f62e2f6694fd5af10a407a455d546`, creata dall'utente), nota cambiata sulla voce `b9371f8061aedd71262a200b98d18bd0` («Ruba il Tesoro di Madarame»), 4 spunte nuove |
**Conseguenze**:
- Il riferimento dell'impronta per i confronti prima/dopo diventa `impronta-0440Z.json` (sha256 `bbd9de5d7833f0f9…`): le differenze rispetto a `1a71b030…` sono **lavoro dell'utente**, non regressioni.
- Il diario validato 04-01..06-01 ha ora **255 voci** (la nuova del 06-01 sera è dell'utente) e **342 spunte**: R2-31, R4-31, R10-29 e simili vanno letti con 255.
- Nella tabella del §11.6 si aggiunge la riga `madarame | il-furto-del-cuore-di-madarame | il-furto-del-cuore-di-madarame-scontro-con-madarame-2 | boss (P) | 2/2 | 0/2`.
- Madarame ha **due pin `tesoro-palazzo`** (811 e 2300): per la regola «Tesoro = stato del pin `tesoro-palazzo`» (§1.5 di modifiche.md) serve dire se basta uno o servono tutti; oggi in p1
  sono raccolti entrambi, quindi l'esito non cambia, ma il caso va deciso (proposta: tutti i pin `tesoro-palazzo` del Palazzo).
- L3: il legame infiltrazione «Il furto del Cuore di Madarame» ↔ 153-5-0 (Giardino centrale) è ora **dichiarato** dall'utente (`mappa_entita`, 130 → **131**): la coppia del pin 777
  non va più dedotta; le coppie infiltrazione↔area restano 93 negli 8 Palazzi (105 con Iweleth), tutte da legami dichiarati.

### 11.8 Nuova base: copia di p5s (`dati-produzione/p5s-2026-10-20-0503Z/`, decisione dell'utente: la fonte di tutti i dati è p5s)
Sola lettura. Script `l4kn.cjs`, `l4.cjs`, `lconcluso.cjs` e `impronta.cjs`; le uscite `*-0503Z.json` sono nel mio scratchpad. Confronto con la 0440Z.
L'unica differenza di dati di partita è il **lavoro dell'utente su p5s** (Collaudo, `LEGGIMI.md`): in p1 ha segnato 36 voci di Kamoshida e raccolto 45 pin in più.
`gioco.db` cambia solo per le migrazioni 107–108 di L1 e non ha ancora le 111/022.
| Cifra | Copia 0440Z | **Base p5s 0503Z** |
|---|---|---|
| Kamoshida p1, voci segnate | 133/169 | **169/169** (p2 169/169) |
| Kamoshida p1, permanenti fatte | 56/71 (15 non segnate) | **71/71** |
| Kamoshida p1 per carattere (voci segnate) | permanente 56 · rigenerabile 40 · descrittiva 35 | **71 · 47 · 49** |
| Kamoshida p1, voci senza pin segnate | 12 | **18** (p2 18) |
| Kamoshida p1 **concluso** / **completato** | sì / no | **sì / sì** (Tesoro pin 614 ✓, boss `…-sconfiggi-kamoshida` 1/1, 71/71) |
| Kamoshida p1, voci «in corso» | 3 (seme della bramosia 1/4, raccogli-forziere-3 1/3, capitani delle guardie 2/4) | **0** |
| Divergenze pin↔voce (regola della 022: pin raccolto e voce non segnata) | 8 pin in p1, di cui **4** generano righe (583, 615, 1992, 1993) | **0**: le voci sono ora segnate |
| Forzieri di Kamoshida p1 (L7 R7-11b) | 20 presi, 1 «non più ottenibile» (falso positivo) | **21 presi**, 0 non più ottenibili |
| Madarame p1 / p2 | concluso e completato (101/101) / nulla | **invariato** |
| Pin condivisi da rigenerabili di più infiltrazioni / righe di `spillo_partita_infiltrazione` | 40 / p1 **90**, p2 0, 0 anomalie | **invariati: 40 / p1 90, p2 0, 0 anomalie** (tutti di Madarame; Kamoshida 0) |
| Voci con il contatore k/N (permanenti + rigenerabili) | 89 | **89** (legami e pin invariati) |
| k/N p1 | 81 fatte · 3 in corso · 5 da fare | **89 · 0 · 0** |
| k/N p2 | 39 · 0 · 50 | **39 · 0 · 50** (invariato) |
| Voci con più pin, tutte (anche descrittive) | p1 279/308 pin, 99/113 fatte | p1 **308/308**, **113/113**; p2 161/308, 57/113 invariato |
| Impronta (`impronta.cjs`) | `bbd9de5d7833f0f9…` | **`ff3033cbf27067c2…`** (sha256 `ff3033cbf27067c2e8d321c91c3377a572ee6e9469706aedaa3d997b6534d97f`): diario 255 e spunte 342 **identici**; Madarame identico (voci 227, pin 263, statiVoci 224, statiPin 280); **Kamoshida** statiVoci 302 → **338**, statiPin 472 → **517** |
Le 14 voci di Kamoshida con più pin che cambiano in p1 (p2 è invariato):
- tetto: `kamoshida-13-tetto-sconfiggi-nemici-potenti` 0/3 → 3/3, `-usa-il-condotto-di-areazione` 0/3 → 3/3, `-seme-della-bramosia` 1/4 → 4/4, `-ispeziona-linterno-della-torre` 1/3 → 3/3;
- torre centrale (`kamoshida-15-torre-centrale-…`): `lascensore-sensuale` 0/2, `sconfiggi-i-capitani-delle-guardie` 2/4, `sblocca-le-grate` 0/2, `scendi-le-scale` 0/2,
  `tornate-sullascensore-e-alla-torre-centrale` 0/2, `esplora-stanza-successiva` 2/3, `sconfiggi-nemici` 0/2, `sconfiggi-nemici-2` 0/2, `torre-livello-superiore` 1/2,
  `raccogli-forziere-3` 1/3. Tutte arrivano a N/N.
**Conseguenze**:
- **`divergenza_partita` (022)**: sulla base p5s la regola della 022 trova **0 righe**. Le 4 righe di sviluppo (§11.2) venivano dai dati di prima. Se la migrazione
  gira sui dati di p5s, la tabella resta vuota e il caso di prova «divergenza da verificare» va fatto con la partita di prova.
- Le **15 permanenti non segnate** (§8) e le **8 divergenze** (§3) di Kamoshida p1 **non esistono più**: le ha risolte l'utente, segnando le voci. Le decisioni «nessuna
  scrittura automatica» restano valide, ma non hanno più casi in p1. La tabella del §11.6 si legge con p1 = N/N per tutte le voci di Kamoshida.
- Il falso positivo del forziere (L7 §11) sparisce anche nei dati. La regola «conta il pin forziere», accolta da Stesura, resta giusta per il caso generale.
- Il **riferimento dell'impronta** per i confronti prima/dopo diventa `impronta-0503Z.json` (`ff3033cb…`). Rispetto a `bbd9de5d…` cambiano solo gli stati di Kamoshida
  in p1, che sono lavoro dell'utente.

### 11.9 Elenco atteso del contatore k/N sulla base p5s (per la riprova di L4 di Test no-reg)
Uscita completa: `l4kn-0503Z.json` (`elenco`, 113 voci con più pin, anche le descrittive) nel mio scratchpad.
- **Le 89 voci con k/N (permanenti + rigenerabili)**: Kamoshida 39, Madarame 50.
  - **p1: tutte N/N** (89 fatte · 0 in corso · 0 da fare). La tabella del §11.6 si legge con p1 = N/N su ogni riga.
  - **p2: identica al §11.6 riga per riga**: Kamoshida 39 N/N, Madarame 50 a 0/N (39 · 0 · 50).
- **Le 8 voci di p1 non complete nel §11.6 sono ora tutte fatte**:
  | Voce | Carattere | 0440Z | 0503Z |
  |---|---|---|---|
  | `kamoshida-13-tetto-sconfiggi-nemici-potenti` | rigenerabile | 0/3 | 3/3 |
  | `kamoshida-13-tetto-usa-il-condotto-di-areazione` | permanente | 0/3 | 3/3 |
  | `kamoshida-13-tetto-seme-della-bramosia` | permanente | 1/4 (in corso) | 4/4 |
  | `kamoshida-15-torre-centrale-sconfiggi-i-capitani-delle-guardie` | rigenerabile | 2/4 (in corso) | 4/4 |
  | `kamoshida-15-torre-centrale-sblocca-le-grate` | permanente | 0/2 | 2/2 |
  | `kamoshida-15-torre-centrale-sconfiggi-nemici` | rigenerabile | 0/2 | 2/2 |
  | `kamoshida-15-torre-centrale-sconfiggi-nemici-2` | rigenerabile | 0/2 | 2/2 |
  | `kamoshida-15-torre-centrale-raccogli-forziere-3` | permanente | 1/3 (in corso) | 3/3 |
  Cambiano anche 6 voci descrittive con più pin (§11.8: ispeziona-linterno-della-torre, lascensore-sensuale, scendi-le-scale, tornate-sullascensore…,
  esplora-stanza-successiva, torre-livello-superiore). Non contano nel completamento.
- **Permanenti di Madarame: 101 voci, 82 oggetti. Le due cifre non si contraddicono.** Il mio «101» conta le **voci** permanenti (§1, §11). Il codice di L4 conta
  gli **oggetti** permanenti (`shared/completamentoGuida.ts`: «le voci permanenti, unite in un oggetto se hanno pin in comune, ciascuno contato una volta»).
  - Ricalcolato sulla base p5s con la stessa regola (unione per pin in comune, a catena): Madarame ha **101 voci → 82 oggetti** (15 gruppi con più voci).
  - Oggetti fatti: p1 **82/82**, p2 0/82. Kamoshida ha **71 voci → 71 oggetti** (nessun pin in comune fra permanenti): p1 71/71, p2 71/71.
  - Quindi l'istantanea con «82/82» e «71/71» è giusta. Nei documenti «101/101 permanenti» va letto come **voci**; l'anello e la percentuale usano gli **oggetti** (82).
