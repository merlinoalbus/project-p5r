# L3 «Palazzi: aree e infiltrazioni» — analisi dati

Requisiti di riferimento: `lotti/L3/requisiti.md` (R3-01…R3-41, dubbi 1–10). Uscite in più: `l3aree.ts` → `l3aree-dev.json` (aree proposte
con il titolo calcolato dalle funzioni vere del FE `titoloGruppoImmagini`/`nomePresentazioneMappa`/`etichettaVersione`, versioni, legami, coppie
deducibili dai pin).

Analisi dati, 2026-10-20. Sola lettura sulla copia di produzione
`…\cffd8da6-…\scratchpad\prod-20261020\` (gioco.db + partite.db). Script di questa sessione (scratchpad
`…\161706c7-6e2c-47d6-bdb7-618347ce218c\scratchpad\`): `l3.cjs` → `l3-prod.json` (produzione), `l3-dev.json` (data/ di sviluppo).
**prod == dev: true** (stesso JSON byte per byte: L0 e L1 non hanno toccato nulla di L3).

## 1. Verifica della ricognizione (ricognizione-L3-palazzi.md) — esito: tutti i numeri confermati
| Voce | Ricognizione | Misurato | Esito |
|---|---|---|---|
| Aree negli 8 Palazzi (gruppi + planimetrie sciolte) | 101 (kam 10, mad 8, kan 13, fut 18, oku 11, nii 13, shi 16, mar 12) | 10, 8, 13, 18, 11, 13, 16, 12 = 101 | = |
| Aree di Iweleth | 16 | 16 (6 gruppi + 10 sciolte) | = |
| Planimetrie | 219 + 26 Iweleth | 26+17+27+32+21+26+35+35 = 219; Iweleth 26 | = |
| Profondità / ruolo | 1 ovunque, tutte `planimetria-nativa` | profondità [1] e 100% `planimetria-nativa` in tutti i 9 | = |
| `mappa.entita_*` vs `mappa_entita` | 0 divergenze | 0 (130 righe `mappa_entita` area, 105 colonne `entita_tipo='area'`) | = |
| Coppie infiltrazione↔area | 92 (+1 dal pin 777) | 19+21+3+4+10+11+12+12 = 92 (Iweleth 12 a parte) | = (pin 777: vedi §2) |
| Coppie planimetria×infiltrazione implicite in più | 95 (kam 14, mad 11) | 14+11+5+6+7+12+17+23 = 95 (Iweleth 6) | = |
| Infiltrazioni senza planimetria | 15 (elenco) | kan 2, fut 6, nii 3, shi 4 = 15, stesse chiavi | = |
| Planimetrie senza infiltrazione | 126 | 2+0+24+28+11+15+23+23 = 126 | = |
| Aree senza infiltrazione | 31 | 0+0+10+14+1+2+4+0 = 31 | = |
| Gruppi con id non chiave di mappa | 3 (Kamoshida, `utente:nativo-rmap-151-{2,7,9}-0`) | gli stessi 3 | = |
| Gruppi che mescolano genitori | nessuno | nessuno | = |
| Ordine versioni ≠ ordine mappe | 152-1-0 (2/0/3/4/1), 153-7-0 (2/1/0) | gli stessi | = |
| Spilli sulla radice `dungeon-kamoshida` | 1735→151-1-0, 1816→151-16-0; 1815 su 151-1-0 con rif. `dungeon-kamoshida` | gli stessi | = |
| Madarame «labirinto contorto» | `generica` sciolta con caricata | `generica`, genitore `dungeon-madarame`, `immagine_chiave` propria, ruolo `planimetria-nativa` | = |

### Lavoro da preservare
| Voce | Ricognizione | Misurato | Note |
|---|---|---|---|
| Kamoshida voci | 169 (32 passi) | 169, 32 con `contenitore_chiave`; tutte `fonte='utente'` | = |
| Kamoshida punto_partita | 302 (p1 133, p2 169) | 133 + 169 | = |
| Kamoshida spilli | 367 (10 seed) | 367 sulle planimetrie + 2 sulla radice = 369 (10 seed) + 4 «solo guida» (area_guida su Kamoshida, mappa fuori) | la ricognizione non contava la radice |
| Kamoshida spillo_voce / spillo_partita / destinazioni | 255 / 472 (468 raccolti) / 96 | 255 / 211+261 = 472 (211+257 = 468) / 96 | = |
| Kamoshida pezzi / copie / atterraggi | 10 / 10 / 3 | 10 / 10 / 3 (04-11 152-2-0 spillo 1657; 04-12 151-16-0; dal 04-15 151-1-0) | = |
| Madarame voci | 225 (49 passi) | 225, 49 passi; 214 `fonte='utente'` + 11 con fonte allgamestaff | = |
| Madarame punto_partita | 221 | 221 (solo partita 1) | = |
| Madarame spilli | 258 (6 seed) | 258 (6 seed, 252 utente) + 3 «solo guida» | = |
| Madarame spillo_voce / spillo_partita / dest. / pezzi / copie | 284 / 276 (p1 199/199, p2 0/77) / 61 / 14 / 32 | gli stessi | = |
| Impronta `impronta.cjs` | `impronta-prod-20261020.json` | rigenerata su prod e su data/: sha256 identico `1a71b030…bc4c` ai tre file; conteggi impronta: kam aree 7 voci 169 pin 373 statiVoci 302 statiPin 472; mad aree 5 voci 225 pin 261 statiVoci 221 statiPin 276; diario 254, spunte 338 | l'impronta conta i pin anche per `area_guida_chiave` (373 = 369 + 4; 261 = 258 + 3) |

### Differenze rispetto al piano e alla memoria (da allineare: NON sono anomalie dei dati)
- Piano §7 / processo.md / memoria «Lavoro da preservare»: «Kamoshida 169 voci, 359 pin; Madarame 196 voci, 250 pin» (fotografia del 19/10,
  «pin dell'utente»). Oggi:
  - Kamoshida pin dell'utente = 369 − 10 seed = **359** → coincide (radice compresa).
  - Madarame pin dell'utente = **252** (non 250): 23 spilli utente di Madarame hanno `updated_at` del 2026-10-19, lavoro dello stesso giorno
    della fotografia precedente.
  - Madarame voci = **225** (non 196): la differenza (29) non si spiega con i passi (49) né con la fonte (11 da allgamestaff); con ogni
    probabilità sono voci aggiunte dopo la misura del 19/10 (punto_interesse non ha `updated_at`, non lo posso datare). Il riferimento per i
    confronti prima/dopo è l'impronta (per chiave), non i totali del piano.
  - **Base confermata dall'utente (PM, 2026-10-20)**: Madarame **225 voci e 252 pin utente al 20/10** (ultima infiltrazione completata quel
    giorno); Kamoshida 169 voci, 359 pin utente (369 con i seed). Perimetro di confronto: l'impronta `impronta-prod-20261020.json` (per chiave).

## 2. Pin 777 (coppia FUR ↔ Giardino centrale)
> **Aggiornamento sulla copia fresca di produzione (`dati-produzione/2026-10-20-0440Z/`)**: l'utente ha **dichiarato** il legame (`mappa_entita`
> `nativo-rmap-153-5-0 | area | madarame-il-furto-del-cuore-di-madarame`, origine utente, editor): `mappa_entita` area 130 → **131**, coppie dichiarate di Madarame 21 → **22**.
> La coppia non va più dedotta dal pin 777; il totale resta **93** negli 8 Palazzi (105 con Iweleth), ora tutte dichiarate. Sempre in quella copia Madarame ha 227 voci
> (+2 boss) e 260 pin (+2300, +2301 su 153-5-0): dettaglio in `lotti/L4/dati.md` §11.7.
```
spillo 777: mappa nativo-rmap-153-5-0, nome «Giardino Centrale», riferimento_tipo NULL, riferimento_chiave NULL, area_guida_chiave NULL
spillo_voce(777) → madarame-il-furto-del-cuore-di-madarame-raggiungi-la-sr-stanza-principale (FUR, sicura)
                  madarame-il-furto-del-cuore-di-madarame-visita-safe-room-del-giardino (FUR, sicura)
                  madarame-nelle-profondita-del-museo-visita-safe-room-del-giardino (PROF, sicura)
                  madarame-scopri-dove-il-tesoro-visita-safe-room-del-giardino (TESORO, sicura)
mappa_entita(153-5-0) → disabilita-i-sistemi-di-sicurezza, nelle-profondita-del-museo, scopri-dove-il-tesoro (origine utente, editor)
```
La coppia (153-5-0, FUR) non è un legame dichiarato: si deduce dalle 2 voci FUR collegate al pin 777.
**Regola generalizzata e ricontata su tutti i Palazzi** (`coppieDaiPin` in `l3aree-dev.json`): «una voce dell'infiltrazione X è collegata
(`spillo_voce`) a un pin di una planimetria dell'area A, e la coppia (X, A) non esiste» → **1 sola coppia in tutto**, proprio
`madarame-il-furto-del-cuore-di-madarame ↔ area di 153-5-0 (pin 777)`. Nessun'altra coppia nascosta: aggiungerla (dubbio 2) è l'unica
aggiunta e non ne trascina altre.

## 3. Aree proposte (elenco completo in `l3aree-dev.json`)
Un'Area per gruppo d'immagini (`gruppo_immagini_json.id`) e una per planimetria sciolta. Per Palazzo (ordine = `mappa.ordine` minimo):
- **Kamoshida (10)**: Prigione sotterranea – Tutorial* (152-1-0 #0, 152-2-0, 151-16-0, 152-4-0, 152-6-0), Cancello del castello* (151-1-0,
  151-1-1), Vecchio castello 1P, Vecchio castello 2P (2 versioni), Vecchio castello 3P (151-4-1, 151-5-1, 151-5-2), Tetto* (151-6-0…4),
  Torre – Livello inferiore* (151-7-0, 151-13-0, 152-5-0), Torre – Livello intermedio, Torre – Livello superiore (2), Torre – Sala del trono (2).
- **Madarame (8)**: Entrata del Museo (153-1-0, sciolta), Museo 1P (2), Museo 2P (4), Giardino centrale (153-5-0), Sala del Tesoro – Atrio (2),
  Sala del Tesoro – Galleria (153-7-0/1/2), Il Labirinto Contorto (`palazzo-di-madarame-il-labirinto-contorto`, sciolta, dubbio 8),
  Sala Principale (3).
- **Kaneshiro 13, Futaba 18, Okumura 11, Niijima 13, Shido 16, Maruki 12; Iweleth 16** (nomi in `l3aree-dev.json`).

\* = titolo **non univoco oggi** (vedi §5.1).

## 4. Regole di migrazione proposte
Principio: si spostano i legami, non i contenuti. Nessuna chiave di mappa, voce, pin o infiltrazione cambia; nessun pin cambia mappa,
posizione o riferimento; nessuna voce cambia infiltrazione o ordine; nessuna rigenerazione dal pacchetto; nessuna fusione (L4).
1. **`area_palazzo`**: una riga per gruppo e per planimetria sciolta sotto `dungeon-<k>`. Chiave nuova `area-<dungeon>-<slug>` (dubbio 3;
   slug dal nome, con suffisso numerico se doppio nello stesso Palazzo) + tabella di corrispondenza `id gruppo / chiave sciolta → chiave area`
   per i redirect (comprende i 3 id `utente:nativo-rmap-151-{2,7,9}-0`).
   - `nome` = titolo mostrato oggi dall'elenco del Palazzo (`titoloGruppoImmagini` per i gruppi, `nomePresentazioneMappa` per le sciolte);
     se le versioni danno titoli diversi (§5.1) → titolo della **versione predefinita** e gli altri nell'elenco «da approvare».
   - `nome_rivisto` = 1 se il titolo viene da `gruppo.nomeRivisto` o da `mappa.nome_rivisto`.
   - `ordine` = `mappa.ordine` minimo delle sue planimetrie (è l'ordine dei gruppi in `gruppiPlanimetrie.ts`).
   - `planimetria_predefinita` = versione con `gruppo.ordine = 0` (sciolte: l'unica).
   - `origine` = `utente` se una planimetria è `origine='utente'`, ha `nome_rivisto` o il gruppo ha id `utente:`; altrimenti `seed`.
2. **Planimetrie**: `mappa.area_chiave` su tutte le 219 (+26); `etichetta_versione` = `gruppo.etichetta` (187 planimetrie in gruppi negli 8
   Palazzi; 32 sciolte senza etichetta); `ordine_in_area` vedi §5.2.
3. **`infiltrazione_area`**: unione per area dei legami `mappa_entita(entita_tipo='area')` → **92** coppie negli 8 Palazzi + **1** del pin 777
   = **93** (+12 Iweleth). `planimetria_iniziale` = la planimetria con ordine minore fra quelle già legate a quell'infiltrazione (nessun legame
   inventato). Le 95 coppie planimetria×infiltrazione implicite (dubbio 1) nascono dal modello, non si scrivono.
4. **Infiltrazioni senza planimetria (15)**: nessuna riga in `infiltrazione_area`; voci intatte (dubbio 5).
5. **Fonti vecchie**: `mappa_entita` area (130 righe, Iweleth compreso), colonne `mappa.entita_*='area'` (105), `gruppo_immagini_json` dei soli
   Palazzi: **non si cancellano nella stessa migrazione**; si smette di leggerle (R3-09) e si tolgono in L11, dopo il confronto prima/dopo.
   Prudente e reversibile; i Covo/Sottopasso/staff del mondo (gruppi di L2) non si toccano.
6. **Radice `dungeon-kamoshida`**: non è un'Area; spilli 1735, 1816 restano sulla radice, 1815 resta con riferimento `dungeon-kamoshida` (dubbio 6).
7. **Iweleth (dubbio 7)**: prudente = stesse regole (16 aree, 26 planimetrie, 12 coppie), nessun dato perso, confluenza nel dedalo in L8.
8. **Idempotenza**: crea solo le aree mancanti (per chiave), assegna `area_chiave` solo dove è NULL, inserisce coppie con `INSERT OR IGNORE`.

## 5. Anomalie da decidere
### 5.1 Titolo della stanza diverso fra le versioni (R3-04, dubbio 10) — 4 aree, tutte di Kamoshida
`titoloGruppoImmagini` fa vincere `mappa.nome_rivisto` sul nome del gruppo quando il gruppo non è rivisto: la stessa stanza oggi ha titoli
diversi a seconda della versione aperta.
| Gruppo | Titoli mostrati oggi (per versione) |
|---|---|
| nativo-rmap-152-1-0 | «Sala Centrale» (151-16-0) · «Prigione sotterranea - Tutorial» (le altre 4) |
| 151-1-0 | «Cancello del castello» · «Cancello del Castello» (solo maiuscola) |
| 151-6-0 | «Tetto» · «Tetto - Condotto Areazione» · «Tetto - Balcone del Tesoro» · «Tetto - Balcone del Seme Bramosia» |
| utente:…151-7-0 | «Torre - Livello inferiore» · «Corridoio Seme della Bramosia» |
Proposta: nome dell'area = titolo della predefinita (gruppo #0); i nomi rivisti delle singole planimetrie restano come nome della versione.
Nota: il gruppo 152-1-0 riunisce 5 posti diversi (Prigione -1P, -2P, Sala Centrale, Passaggio sotterraneo, Palestra dell'Amore): è una
scelta dell'utente o un residuo? Da far vedere all'utente prima di farne **un'**area.
### 5.2 Ordine delle versioni: due viste, due ordini (R3-05, dubbio 9)
`PlanimetriePalazzo` (pagina del Palazzo) elenca nell'ordine di mappa; `ImmaginiLuogo` (miniature nel visore, `ImmaginiLuogo.tsx:20`) ordina per
`gruppo.ordine`. Divergono solo in:
- 152-1-0: ordine di mappa 151-16-0, 152-1-0, 152-4-0, 152-6-0, 152-2-0 · ordine di gruppo 152-1-0, 152-2-0, 151-16-0, 152-4-0, 152-6-0
- 153-7-0: ordine di mappa 153-7-2 «Livello 0», 153-7-1 «Livello -1», 153-7-0 «Livello -2» · ordine di gruppo l'inverso.
Proposta: `ordine_in_area` = ordine della pagina del Palazzo (mappa), che diventa la casa; predefinita resta #0 di gruppo — **da approvare**
(per 153-7-0 la predefinita «Livello -2» sarebbe l'ultima nell'elenco). Chiedere ad Analisi app quale vista l'utente usa di più.
### 5.3 Nomi tecnici o provvisori che diventano nomi di Area
«Palazzo di Kaneshiro — Zona che nessuna tabella nativa nomina», «Palazzo di Niijima — Zona che nessuna tabella nativa nomina», «Palazzo di
Futaba — Planimetria non attribuita», «Palazzo di Shido — Planimetria non attribuita», «Palazzo di Niijima» (157-17-0), «Central Street» dentro
Kaneshiro (154-15-0), e 5 aree di Maruki con prefisso «???». Proposta: migrarli così (nessuna invenzione) e metterli nell'elenco «da rivedere»
(nome rivisto dall'utente).
### 5.4 Diario (R3-34)
Nel dato le voci del diario 04-01..06-01 con `riferimento_tipo='dungeon'` sono 15 (kamoshida 6, madarame 7, mementos 2), tutte al livello del
Palazzo; nessuna cita un'infiltrazione o una mappa (`produce_json` vuoto o senza chiavi). Il «46 su 58» dei requisiti non è nei dati: è la
risoluzione fatta dal codice (da confermare con Analisi app). Per i dati: il diario non va toccato.

## 6. Conteggi attesi dopo la migrazione (8 Palazzi; tra parentesi con Iweleth)
| Voce | Atteso |
|---|---|
| `area_palazzo` | **101** (117): 10/8/13/18/11/13/16/12 (+16) |
| planimetrie con `area_chiave` | **219** (245); senza: 0 |
| planimetrie con etichetta di versione | 187 (+16 di Iweleth in gruppi) |
| `infiltrazione_area` | **93** = 92 + pin 777 (105) |
| infiltrazioni senza aree | 15 |
| aree senza infiltrazione | 31 (35) |
| `mappa_entita` area / colonne `entita_*='area'` | 130 / 105 **invariate** (lette da nessuno) |
| voci, pin, spillo_voce, destinazioni, pezzi, copie, atterraggi, punto_partita, spillo_partita | invariati uno per uno |
| impronta `impronta.cjs` | **identica**: sha256 `1a71b030…bc4c` (diario 254/338; Kamoshida 169 voci, 373 pin in impronta, 302/472 stati; Madarame 225 voci, 261 pin in impronta, 221/276 stati) |
| radice `dungeon-kamoshida` | 2 spilli + riferimento di 1815 invariati |

## 7. Diario → infiltrazione (R3-37, richiesta del PM da Analisi app)
**Non c'è un dato strutturale** che leghi una voce del diario a un'infiltrazione. Le voci hanno solo `riferimento_tipo='dungeon'` e
`riferimento_chiave` = il Palazzo; `produce_json` è `[]`; nessuno spillo. `indice_guida` **non** è l'infiltrazione: è la posizione dell'azione
nella giornata della guida (migrazione 092, riga 15), e infatti non torna (es. 05-16 ha 1, 06-01 ha 0).
Voci del diario 04-01..06-01 con riferimento a Kamoshida o Madarame: **13** (più 2 dei Memento). L'infiltrazione si ricava con tre regole, in
quest'ordine: (a) **nome dell'infiltrazione nel testo**; (b) **data nel nome dell'infiltrazione** (i tutorial di Kamoshida «11/04», «12/04»,
«15/04»); (c) **ordine**: n-esima voce di tipo `palazzo` con un'esplorazione → n-esima infiltrazione (lettere di sfida e Velluto esclusi).
Per p1 (partita reale) la (c) di Madarame è **confermata dagli orari reali**: la spunta della voce del diario arriva subito dopo i segni sulle
voci dell'infiltrazione proposta (`spunta_voce_partita.fatta_at` contro `punto_partita.updated_at`). Gli orari di Kamoshida p1 non servono:
le spunte del diario sono di settembre, i segni del Palazzo di ottobre.
| Data | uid | Tipo | Testo (inizio) | Infiltrazione ricavata | Regola | Certezza |
|---|---|---|---|---|---|---|
| 04-11 | f3d6ddf19b62f76616e3de65ac00f2b9 | palazzo | «Prima infiltrazione tutorial…» | kamoshida-1-tutorial-palazzo-11-04 | b | certa |
| 04-12 | e4290542b3376439f92c71b76e18b64e | palazzo | «Seconda infiltrazione tutorial…» | kamoshida-tutorial-palazzo-12-04 | b | certa |
| 04-15 | 6fd5031403067e22f9306de902cf57a6 | palazzo | «…terza incursione. Tutorial cattura Ombre…» | kamoshida-tutorial-palazzo-15-04 | b | certa |
| 04-20 | a513390589dcbc75a7ae4ef1aa798d06 | palazzo | «infiltrazione completa in un unico viaggio» | kamoshida-01-cancello-del-castello-ingresso **+ 13-tetto + 15-torre-centrale** | c | **ambigua**: un viaggio, tre infiltrazioni; proposta: aprire la prima non completata (oggi 01-cancello) |
| 04-21 | 854d79fc18c6f19dc2a653dfb0bfb2ba | trama | «…Invia lettera di sfida» | — (nessuna esplorazione) | — | non si applica: resta il Palazzo |
| 04-22 | cdc7e3a818e612b94efe7853135f7617 | palazzo | «…Sala del trono e Stanza del Tesoro con il boss…» | kamoshida-rubare-i-desideri-del-cuore | c (+ contenuto: furto) | certa |
| 05-16 | 445731a85c54f6d1fa541f10ee8c64d1 | palazzo | «infiltrazione iniziale» | madarame-01-entrata-del-museo | c (orari p1: segni 13/10 18:06→, spunta 13/10 18:37) | certa |
| 05-19 | cea365dae255a9787afdf99661e5aa0f | palazzo | «Scopri dov'è il Tesoro» | madarame-scopri-dove-il-tesoro | a (orari p1: spunta 15/10, segni 13–17/10) | certa |
| 05-20 | 464ccfe40659a41b6b201947ed776312 | palazzo | «Terza visita al Palazzo…» | madarame-disabilita-i-sistemi-di-sicurezza | c (orari p1: segni 16/10 20:05–20:50, spunta 16/10 20:51) | certa per p1 |
| 05-27 | 6ebb178b6fc4009d3335635446a2c864 | palazzo | «Nelle profondità del Museo» | madarame-nelle-profondita-del-museo | a (orari p1: segni 17–18/10, spunta 18/10 21:27) | certa |
| 05-27 | e2312ec57c58764c58184ac6c860a822 | velluto | «Sosta nella Stanza di Velluto» | — | — | non si applica |
| 05-31 | fa2b6c8b9e1397c05ed9ce3c042ca299 | palazzo | «…invio della lettera di sfida» | — (nessuna esplorazione) | — | non si applica: resta il Palazzo (tipo `palazzo` ma è la lettera) |
| 06-01 | b9371f8061aedd71262a200b98d18bd0 | palazzo | «raccolta dei tesori e scontro con il boss finale» | madarame-il-furto-del-cuore-di-madarame | c (+ contenuto; segni p1 19/10 19:53–20:24) | certa |
In sintesi: 9 certe, 1 ambigua (04-20), 3 che non riguardano un'infiltrazione (2 lettere, 1 Velluto). Proposta per la migrazione: una
colonna/legame **nuovo** voce del diario → infiltrazione per queste 10, scritto da elenco (non da regola a runtime) e approvato; il testo della
voce non cambia (impronta del diario invariata salvo il campo nuovo). La differenza con le «10 voci (152-1-0 ×3, 153-1-0 ×7)» di Analisi app è
di conteggio (lì sono le voci che oggi aprono una mappa): l'elenco sopra le copre tutte.

## 8. Campo «Infiltrazione» su tutto il diario (estensione dell'utente, via PM) — PROPOSTE, nessuna scrittura
Censimento (`l3diario.cjs` → `l3diario-prod.json`, prod = dev): voci che riferiscono un Palazzo per `riferimento_tipo='dungeon'` **o** per il testo
(«Palazzo di X», il sovrano con «palazzo/infiltra/tesoro/lettera»). Ogni voce è stata riletta: la regola automatica dell'ordine (c) da sola sbaglia
fuori da Kamoshida e Madarame (conta vendite e messaggi), quindi la proposta qui sotto è **voce per voce**. Iweleth: 0 voci.
**Nota sui riferimenti**: le 3 voci di Niijima hanno `riferimento confidente:makoto`, non `dungeon:niijima`; 2 di Kaneshiro, 3 di Madarame e 1 di Kamoshida
nominano il Palazzo solo nel testo.
Legenda certezza: **certa** (nome dell'infiltrazione o data nel testo, o inizio/fine esplicito), **multipla** (la voce descrive più infiltrazioni:
proposta = insieme ordinato, «Entra» apre la prima non completata), **probabile** (boss o Tesoro finale: ultima infiltrazione), **ambigua**, **n/a**
(vendita, lettera di sfida, Velluto, messaggio: nessuna infiltrazione).

| Palazzo | Data | uid | Testo (inizio) | Proposta | Certezza |
|---|---|---|---|---|---|
| Kamoshida | 04-11 | f3d6ddf19b62f76616e3de65ac00f2b9 | Prima infiltrazione tutorial | kamoshida-1-tutorial-palazzo-11-04 | certa |
| Kamoshida | 04-12 | e4290542b3376439f92c71b76e18b64e | Seconda infiltrazione tutorial | kamoshida-tutorial-palazzo-12-04 | certa |
| Kamoshida | 04-15 | 6fd5031403067e22f9306de902cf57a6 | terza incursione, tutorial cattura | kamoshida-tutorial-palazzo-15-04 | certa |
| Kamoshida | 04-20 | a513390589dcbc75a7ae4ef1aa798d06 | infiltrazione completa in un unico viaggio | 01-cancello-del-castello-ingresso, 13-tetto, 15-torre-centrale | multipla |
| Kamoshida | 04-21 | 854d79fc18c6f19dc2a653dfb0bfb2ba | lettera di sfida | — | n/a |
| Kamoshida | 04-22 | cdc7e3a818e612b94efe7853135f7617 | Sala del trono e Stanza del Tesoro, boss | kamoshida-rubare-i-desideri-del-cuore | certa |
| Kamoshida | 04-23 | 2ddbe4c2896e1ed13eb12b6c803d4184 | Negozio Softair: vendere il tesoro | — | n/a |
| Kamoshida | 04-18 | 9f51cb2f8df6830f4c01bd740de4492b | «Saluta Kamoshida e Kawakami» | — | n/a (falso positivo: il professore, non il Palazzo) |
| Madarame | 05-16 | 3fb31dded3f9581173037ce9d1ec9535 | Primo accesso al Palazzo (trama, senza riferimento) | madarame-01-entrata-del-museo | certa |
| Madarame | 05-16 | 445731a85c54f6d1fa541f10ee8c64d1 | infiltrazione iniziale | madarame-01-entrata-del-museo | certa (orari p1) |
| Madarame | 05-19 | cea365dae255a9787afdf99661e5aa0f | Scopri dov'è il Tesoro | madarame-scopri-dove-il-tesoro | certa |
| Madarame | 05-20 | 08f2338c556be7188e48d0746a280bd2 | messaggio di Ryuji sul piano di Morgana (trama) | — | n/a |
| Madarame | 05-20 | 464ccfe40659a41b6b201947ed776312 | Terza visita al Palazzo | madarame-disabilita-i-sistemi-di-sicurezza | certa (orari p1) |
| Madarame | 05-27 | 6ebb178b6fc4009d3335635446a2c864 | Nelle profondità del Museo | madarame-nelle-profondita-del-museo | certa |
| Madarame | 05-27 | e2312ec57c58764c58184ac6c860a822 | Sosta nella Stanza di Velluto | — | n/a |
| Madarame | 05-29 | 9254eba5a15ee14c99d7afc1f8b30fda | Negozio Softair: vendere gli oggetti | — | n/a |
| Madarame | 05-31 | fa2b6c8b9e1397c05ed9ce3c042ca299 | invio della lettera di sfida | — | n/a |
| Madarame | 06-01 | b9371f8061aedd71262a200b98d18bd0 | raccolta dei tesori e boss finale | madarame-il-furto-del-cuore-di-madarame | certa |
| Kaneshiro | 06-20 | 65fdbeab5101e6068310fea982553d22 | prima esplorazione | Sala d'ingresso (ordine 0) | certa |
| Kaneshiro | 06-25 | 5796b127c3400b50853375829f8cf548 | esplorazione completa (sala d'ingresso, corridoio dei banchieri, ufficio riciclaggio, caveau) | ordini 0–3 | multipla |
| Kaneshiro | 06-26 | 80914911db15067f54372fd85e724f27 | Giornata libera: proseguire il Palazzo o allenarsi (altro) | — | ambigua (facoltativa) |
| Kaneshiro | 06-27 | 5fa87613387914bfcd9c03f664602169 | boss finale Kaneshiro | Caveau sotterraneo (ordine 3) | probabile |
| Kaneshiro | 07-03 | 62f794fef617c3d855db62215e64b1b0 | vendere i tesori | — | n/a |
| Futaba | 07-25 | ac258051782e4ec99dc9ab4ac25df650 | entrata della piramide e corridoio principale | Entrata della piramide (0), Corridoio principale – prima sezione (1) | certa (multipla) |
| Futaba | 08-01 | f5e781ca22e5ea7a33e5fcf4872f0108 | esplorazione del dungeon, forzieri, Ombre | — | ambigua |
| Futaba | 08-01 | 62284ab35f052e4dc2bb16daf3b09233 | proseguire l'esplorazione in sessione prolungata | — | ambigua |
| Futaba | 08-03 | c9efdb83a3eeb29a6ceea9a6f6cc2ea2 | Camera del Rigetto e Camera del Rimorso | Camera del rigetto (6), Camera del rimorso (7) | certa (multipla) |
| Okumura | 09-15 | fd2a7b29e9906cabc4d03848d332d5ba | ingresso laterale | Entrata Laterale (0) | certa |
| Okumura | 10-04 | c66a02b66d02f21793e1f8e0d2f08798 | infiltrazione estesa (entrata, corridoi, caserma, dintorni, linee…) | ordini 0–9 secondo il testo | multipla |
| Okumura | 10-06 | 8d8588deeea8d17f6279c5c26651d08c | rubare il Tesoro materializzato | ultima (Produzione Armamenti, 9) | probabile |
| Okumura | 10-11 | ec7d9d6c95f57a5f6a7a8d46b78d3f61 | battaglia finale contro l'Ombra di Okumura | ultima (9) | probabile |
| Niijima | 10-29 | 7dd92df212b81bb87aba6e7a2fa8c874 | ingresso iniziale nel Casino, Safe Room al piano terra | Entrata del Casinò (0), Piano terra (1) | certa (multipla) |
| Niijima | 11-14 | dece90bfb20d9d3328f2a6b0ca417590 | Lobby Puntate Alte, Arena, Oscura Dimora | Lobby piano puntate alte (10), Arena (11), Oscura dimora (12) | certa (multipla) |
| Niijima | 11-19 | 589d82e823703ee879d72f974fd51139 | battaglia contro l'Ombra di Sae | Direzione – sala del boss (13) | certa |
| Shido | 11-24 | 527cf9832e94e93e855436191e06f8b6 | Ponte Anteriore, Sala d'ingresso, Corridoio centrale | Passaggio Centrale / Sala d'Ingresso (0) | certa |
| Shido | 12-11 | 746682faca7287278d592da846383d15 | fino alla Sala Intrattenimento (Sala Centrale, Ristorante, Mezzavia Tribordo, Piscina, Superiore Tribordo, Poppa) | ordini 1–7 | certa (multipla) |
| Shido | 12-12 | b7122251a674682657fe627319d36d91 | sequenza di boss multipli | Aula Magna (15) | probabile |
| Maruki | 01-09 | cdf1af20cff42ec521e2b4620f6f84a3 | esplorazione con Akechi, verso l'Auditorium, battaglia con Sumire | Ingresso (0) → Auditorium (4) | multipla |
| Maruki | 01-12 | 6e28e155072a065d80a68a72ae5be9bb | Ripostiglio e Sala di controllo | Ripostiglio (5), Sala di controllo (6) | certa (multipla) |
| Maruki | 01-26 | cf66b722af0a5fb76d1906e89b66bb64 | Sala controllo, Ala ricerca, Sala visite, Sala supporto, Corridoio Crepuscolo | ordini 6–10 | certa (multipla) |
| Maruki | 01-27 | 105bf9ede1747bcd6a18491d478163e6 | proseguire ed eventualmente completare | — | ambigua |
| Maruki | 02-03 | 3db90a97fcbc510f8fb97ca5aa142dd2 | Fase 1 Azathoth | Eden (11) | certa (boss nell'Eden) |
| Maruki | 02-03 | c3aff3d5cc749a1452814d60bd576b83 | Fase 2 | Eden (11) | certa |
| Maruki | 02-03 | ccbbc79f7f8ecf2423794dc9e9683cc6 | Fase 3 Adam Kadmon | Eden (11) | certa |
| Maruki | 02-03 | 525ed37ba675f84dee6178c4e473365e | Fase 4 Adam Kadmon finale | Eden (11) | certa |

**Riepilogo per Palazzo** (voci trovate / con infiltrazione ricavata con certezza, anche multipla / probabili / ambigue / n/a):
Kamoshida 8 / 4 + 1 multipla / 0 / 0 / 2 (+1 falso positivo) · Madarame 10 / 6 / 0 / 0 / 4 · Kaneshiro 5 / 1 + 1 multipla / 1 / 1 / 1 · Futaba 4 / 2 (multiple) / 0 / 2 / 0 ·
Okumura 4 / 1 + 1 multipla / 2 / 0 / 0 · Niijima 3 / 3 (2 multiple) / 0 / 0 / 0 · Shido 3 / 2 (1 multipla) / 1 / 0 / 0 · Maruki 8 / 6 (2 multiple) + 1 multipla
«verso» / 0 / 1 / 0 · Iweleth 0. **Totale 45 voci**: ricavate 29 (18 a infiltrazione singola certa + 11 multiple, di cui 7 certe per nome), probabili 4, ambigue 4, n/a 7,
falso positivo 1.
Proposta di modello: il campo «Infiltrazione» della voce è un **insieme ordinato** di infiltrazioni (una o più); le voci n/a restano col solo Palazzo; le
ambigue restano col solo Palazzo finché l'utente non sceglie. Tutto da elenco approvato; testi, ordine, giorno, fascia e uid invariati.

### 8.1 Proposte finali dell'Esperto della guida (`guida/registro.md` G-022) — VALGONO QUESTE, la tabella sopra è la prima stesura
Per incarico dell'utente la scelta dell'infiltrazione è dell'Esperto (fonte: soluzioni settimanali e pagine dei Palazzi della guida italiana). Tabella completa, voce
per voce con sigla (K1…R8), uid, infiltrazioni in ordine coi nomi dell'app, fonte e certezza, nel registro. **Verifica dei dati**: i 45 uid di G-022 esistono tutti nel
diario con la data indicata, su produzione e su sviluppo (45/45).
Esito sulle 45 voci: **32 confermate**, **7 corrette**, **3 completate**. Cambiano rispetto alla tabella sopra:
| Sigla | Data | uid | Prima stesura | **Proposta finale (G-022)** |
|---|---|---|---|---|
| F2 | 08-01 | f5e781ca22e5ea7a33e5fcf4872f0108 | ambigua | 0 Entrata → 1 Corridoio principale I → 2 Città nel deserto → 3 Caverna → 4 Camera dei sarcofagi (divisione dell'Esperto: la guida fa un solo viaggio) |
| F3 | 08-01 | 62284ab35f052e4dc2bb16daf3b09233 | ambigua | 5 Corridoio principale – sezione centrale → 6 Camera del rigetto → 7 Camera del rimorso → 8 Camera del santuario |
| F4 | 08-03 | c9efdb83a3eeb29a6ceea9a6f6cc2ea2 | 6, 7 (dal testo) | **9 Santuario Interno / Camera del Vuoto** (le Camere sono del 1/8; il **testo** della voce dice «Rigetto e Rimorso»: non si tocca senza il sì dell'utente) |
| O1 | 09-15 | fd2a7b29e9906cabc4d03848d332d5ba | 0 | 0 Entrata Laterale → **1 Corridoi del Complesso** |
| O3 | 10-06 | 8d8588deeea8d17f6279c5c26651d08c | probabile 9 | 9 Produzione Armamenti, Tesoro e boss (**confermata**) |
| O4 | 10-11 | ec7d9d6c95f57a5f6a7a8d46b78d3f61 | probabile 9 | **n/a** (quel giorno nessuna infiltrazione; il boss è il 6/10) |
| N2 | 11-14 | dece90bfb20d9d3328f2a6b0ca417590 | 10, 11, 12 | 10 → 11 → 12 → **11 (Arena, seconda parte)** → **13 Direzione** |
| S2 | 12-11 | 746682faca7287278d592da846383d15 | 1–7 | **0 → … → 14 Passaggio Centrale (Uscita)** (tutte tranne la 15) |
| S3 | 12-12 | b7122251a674682657fe627319d36d91 | probabile 15 | 15 Aula Magna (**confermata**) |
| B3 | 06-26 | 80914911db15067f54372fd85e724f27 | ambigua | **n/a** |
| B4 | 06-27 | 5fa87613387914bfcd9c03f664602169 | probabile 3 | 3 Caveau sotterraneo (**confermata**; l'app non ha un'infiltrazione «furto» per Kaneshiro) |
| R1 | 01-09 | cdf1af20cff42ec521e2b4620f6f84a3 | 0 → 4 | 0 → 1 → 3 → 4 (**senza la 2**: il Percorso di prova è del 2/1) |
| R2 | 01-12 | 6e28e155072a065d80a68a72ae5be9bb | 5, 6 | **0 Ingresso → 4 Auditorium** → 5 Ripostiglio → 6 Sala di controllo |
| R4 | 01-27 | 105bf9ede1747bcd6a18491d478163e6 | ambigua | **n/a** |
Le altre voci restano come nella tabella sopra (K1–K6, M1–M10, B1, B2, B5, F1, O2, N1, N3, S1, R3, R5–R8); B1 «con riserva» (la guida chiama la visita «Cerca il boss
della mala»: nome dell'app + nota).
**Riepilogo finale**: 45 voci → **34 con infiltrazioni** (in ordine) e **11 senza** (solo Palazzo): K5, K7, M4, M7, M8, M9, B3, B5, O4, R4 + **K8 falso positivo**.
**Altre proposte di G-022** (da elenco approvato, nessuna scrittura ora):
- **K8** (04-18 `9f51cb2f8df6830f4c01bd740de4492b`, «Saluta Kamoshida e Kawakami»): togliere anche il legame col Palazzo (è il professore). Oggi la voce non ha riferimento
  `dungeon` (riferimento nessuno): basta non aggiungerlo.
- **N1, N2, N3** (Niijima): il riferimento giusto è `dungeon:niijima`, non `confidente:makoto` → cambia il riferimento di 3 voci (fuori dal diario validato).
- ~~Giorni d'infiltrazione senza voce~~ → **seguito di G-022**: tre di quei giorni **hanno già una voce**, che il mio censimento non aveva preso (il testo dice «Palazzo di Sae»,
  «Dungeon/Palazzo sconosciuto», e il riferimento è a un Confidente). Verificate su prod e dev:
  | Data | Fascia | uid | Riferimento oggi | Testo (inizio) | Proposta (G-022) |
  |---|---|---|---|---|---|
  | 11-13 | giorno | ebe00e6b2fe3f80a827f88f5503165fc | confidente:makoto (**resta**) | Palazzo di Sae: infiltrazione nel casino, Tessera socio… | Infiltrazione (Niijima): 0 → 1 → 2 → 5 → 6 → 3 → 7 → 4 → 8 → 9 → 10 |
  | 11-13 | sera | 7c0814176b193cad29d15ec00ffe891c | confidente:makoto (**resta**) | Completare l'infiltrazione del palazzo | **da rivedere**, nessuna proposta |
  | 10-03 | giorno | 8742bcf962a80c28b81ab272ee5d5014 | confidente:kasumi (**resta**) | Dungeon sconosciuto: ingresso e sala d'ingresso, ricerca di Kasumi… | Infiltrazione (Maruki): 0 Ingresso → 1 Sala d'ingresso |
  | 01-02 | giorno | 09e38fddc12a2cce9d5abec6ffc6e7aa | confidente:maruki (**resta**) | Palazzo sconosciuto: obiettivo Trova il signore del Palazzo… | Infiltrazione (Maruki): 0 → 1 → 2 Percorso di prova |
  **Decisione del PM (L3 §7.13)**: per queste 4 voci il riferimento al Confidente **resta invariato**; il campo «Infiltrazione» è **indipendente dal riferimento** e le
  tre di giorno ricevono solo la proposta d'infiltrazione; la sera dell'11-13 è «da rivedere».
  Unica voce davvero nuova: la **lettera di sfida a Kaneshiro il 26/6** (al Ritrovo; non il 25/6), voce `giorno`, n/a. Il 06-26 oggi ha la voce B3
  `80914911db15067f54372fd85e724f27` («Giornata libera…», n/a): la lettera si aggiunge accanto, senza toccarla.
- **Totale aggiornato**: le voci del diario che riferiscono un Palazzo sono **49** (45 + 4); con proposta d'infiltrazione **37**, senza 11 (n/a, falso positivo K8 compreso)
  + 1 «da rivedere» (la sera dell'11-13). Voci con riferimento da spostare su `dungeon:` **3** (solo N1–N3 di Niijima, decisione del PM), tutte fuori dal diario validato.
- Nomi: dove la guida chiama diversamente una visita, si tiene il nome dell'app con il nome della guida come nota.

## 9. Nome dell'Area contro nome della planimetria predefinita (E9, richiesta di Stesura; nessuna scrittura)
**Dati**: la base p5s-2026-10-20-0533Z con L3 applicato. È la stessa copia in sola lettura di DATI-INVENTARIO §5, `sim-0533Z/` nel mio scratchpad, migrata col codice
di pensive fino a 113/024, quindi con la stessa 110 dell'anteprima 3302. Non ho letto il 3302 via API: le letture delle immagini scrivono la cache.
Le Aree dei Palazzi sono **118**: le 101 dei Palazzi, le 16 di Iweleth e la «Prova» dell'utente, che finisce fra le uguali. Elenco completo: `e9-0533Z.txt` nel mio scratchpad.
| Gruppo | Aree | Note |
|---|---:|---|
| **1. uguali** | **60** | futaba 10, iweleth 11, kamoshida 10 (Prova compresa), kaneshiro 7, madarame 3, maruki 3, niijima 6, okumura 4, shido 6 |
| **2. diverse solo per punteggiatura o spazi** | **1** | `dungeon/madarame/museo-1p`: Area «Museo, 1P», planimetria `nativo-rmap-153-2-0` «Museo 1P». **Tutti e due i nomi sono rivisti dall'utente** (`nome_rivisto = 1`) |
| **3. diverse nel testo** | **57** | quattro casi, sotto |
Il gruppo 3 si divide in quattro casi:
- **3a. La planimetria ha in più il suffisso della versione o dell'inquadratura: 49 Aree.** Esempi: «Corridoio banchieri» / «Corridoio banchieri — settore d'ingresso»;
  «Corridoio della prigione – Parte V» / «… — inquadratura settentrionale — più ampia». La 110 dà all'Area il nome del gruppo d'immagini (`titoloGruppoImmagini`) e la
  planimetria tiene il nome della sua versione. **È la regola, non un difetto.** Palazzi: futaba 7, iweleth 5, kaneshiro 6, maruki 9, niijima 7, okumura 6, shido 9.
- **3b. Gergo dell'estrattore tolto: 2 Aree.** `dungeon/futaba/palazzo-di-futaba-planimetria-non-attribuita` e `dungeon/shido/palazzo-di-shido-planimetria-non-attribuita`.
  Area «Palazzo di X — Planimetria non attribuita», planimetria «Palazzo di X — Immagini native che nessun campo usa» (`senzaGergo`, voluto). Il nome della planimetria è
  ancora in gergo: lo segnalo.
- **3c. Nomi rivisti dall'utente: 5 Aree.** Area e planimetria hanno `nome_rivisto = 1`:
  | Area | Nome dell'Area | Nome della planimetria |
  |---|---|---|
  | `dungeon/kamoshida/torre-sala-del-trono` | «Torre - Sala del trono» | `nativo-rmap-151-11-0` «Sala del Trono - Livello 0» |
  | `dungeon/madarame/museo-2p` | «Museo, 2P» | `nativo-rmap-153-3-0` «Museo 2P - Livello 0» |
  | `dungeon/madarame/sala-del-tesoro-atrio` | «Sala del Tesoro - Atrio» | `nativo-rmap-153-6-0` «Sala del Tesoro - Atrio - Livello 0» |
  | `dungeon/madarame/sala-del-tesoro-galleria` | «Sala del Tesoro - Galleria» | `nativo-rmap-153-7-0` «Sala del Tesoro - Galleria - Livello -2» |
  | `dungeon/madarame/sala-principale` | «Sala Principale» | `nativo-rmap-153-9-0` «Sala Principale - Livello 0» |
  Sono **lavoro dell'utente**. A parte la virgola di «Museo, 2P» (come il gruppo 2) e la maiuscola di «Sala del trono / Sala del Trono», la differenza è il suffisso
  «- Livello N» della planimetria (come il caso 3a).
- **3d. Altro: 1 Area.** `dungeon/okumura/fabbrica-centrale-linea-di-smaltimento`: Area «Fabbrica centrale / Linea di smaltimento», planimetria `nativo-rmap-156-12-0` «Fabbrica
  centrale». Il nome dell'Area unisce i contesti della planimetria (`nomePresentazione` della 110: i contesti uniti con « / »). È la regola, ma il nome viene da un legame e non
  dal nome della mappa: lo segnalo.
**Elenco «Da rivedere» (R11-10c), proposte e nessuna scrittura**:
- `dungeon/madarame/museo-1p`, motivo per l'utente: «L'Area si chiama "Museo, 1P" e la sua planimetria "Museo 1P": i due nomi li hai scritti tu. Proposta: lo stesso
  nome per tutte e due, senza virgola, "Museo 1P".»
- Stesso caso, per coerenza (gruppo 3c): `dungeon/madarame/museo-2p` «Museo, 2P». Proposta: «Museo 2P», con la planimetria che resta «Museo 2P - Livello 0».
Solo segnalati (gruppo 3), senza proposta di scrittura:
- i 49 casi 3a: è la regola;
- i 2 nomi in gergo delle planimetrie (3b);
- i 3 «- Livello N» e la maiuscola di Kamoshida (3c);
- Okumura (3d).

