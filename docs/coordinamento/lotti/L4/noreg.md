# L4 «Avanzamento unico» — test no-reg

Sessione «Test no-reg — team p5s». Ritmo continuo. Esiti grezzi in `lotti/L4/esiti-noreg/`. Casi preparati: `lotti/L2/noreg.md` §5 (L4).

## 0-bis. BASE NUOVA: copia di p5s `p5s-2026-10-20-0503Z` (vale da qui in poi; dettaglio in `L2/noreg.md` §0-bis e `L3/noreg.md` §0-bis)
Su questa copia l'utente ha chiuso **Kamoshida al 100% sulla partita 1**. Segnati su p5s fra le 04:52 e le 05:01 UTC: 36 voci, 45 pin.
Le cifre di partenza cambiano:
- **Kamoshida p1**: 169 voci gestite su 169, 107/107 raccolti, completato. Con l'istantanea di L4 delle 04:55: 71/71 permanenti, ancora
  completato, **0 divergenze** dalla 022 (prima erano 4).
  - **NR4-2 non si presenta più su questi dati**: il caso «56/71» non esiste più. La regola di §8.10 (concluso/completato) resta da
    verificare sul codice consegnato.
- **Madarame p1**: 227 voci, 224 gestite, 88/88, completato. Con l'istantanea delle 04:55: 82/82 permanenti.
  - Analisi dati, sulla 0440Z, attende 101/101 con §8.11/§8.14: da chiarire nella riprova.
- **Utente 023**: 90 righe, 40 pin condivisi, come atteso.

La riprova del §2 si fa su questa copia, con gli **attesi di Analisi dati sulla p5s-0503Z** (`dati.md` §11.8–11.9, `l4kn-0503Z.json`; impronta
`ff3033cb…`). Sostituiscono le cifre della 0440Z citate nel §2.
- **k/N sulle 89 voci** (Kamoshida 39, Madarame 50):
  - **p1: 89 fatte, 0 in corso, 0 da fare**. Le 8 voci di Kamoshida prima incomplete ora sono tutte N/N: seme della bramosia 4/4,
    raccogli-forziere-3 3/3, capitani delle guardie 4/4, sconfiggi-nemici-potenti 3/3, condotto 3/3, grate 2/2, sconfiggi-nemici 2/2 e -2 2/2.
  - **p2: 39 fatte, 0 in corso, 50 da fare**, riga per riga come il §11.6.
- **Permanenti**:
  - Madarame 101 **voci** = **82 oggetti**: il completamento conta oggetti, cioè voci unite a catena dai pin in comune, in 15 gruppi.
    Quindi p1 **82/82** e p2 0/82. Il «82» dell'istantanea è corretto, non è un difetto.
  - Kamoshida 71 voci = 71 oggetti, p1 e p2 71/71.
- **Migrazioni utente**: 022 con 0 divergenze; 023 con 90 righe in p1, 0 in p2, 40 pin condivisi.

## 0-ter. RIPROVA DI L4 sul codice consegnato da BE (istantanea 2 dell'anteprima, 05:23:40Z), base p5s-0503Z — VERDE (2026-10-20 07:25–07:30 locali)
Esiti in `esiti-noreg/riprova-0523/`.

**Codice.** Copia dell'istantanea 2 del Collaudo: L3 committato `2f9e6c7f` + L4 non committato. Impronta **`88049882…9b88`**, uguale a quella
del Collaudo.

**Avvio sulla mia copia** (porta 3292), da 108 a 112 e partite da 21 a 23:
- 109–111 come nella base;
- **112**: `voce_boss_finale` dei Palazzi di G-027, nessuna mancante. Madarame = `…-scontro-con-madarame-2`;
- **022**: 0 divergenze;
- **023**: 40 pin condivisi, 90 righe.

**Dati.**
- Contro la base, sulle colonne comuni, cambiano solo i valori dichiarati: Covo; le 6 voci dopo il 06-01 e la voce nuova del 06-26.
- Partite identiche, dati nuovi dell'utente intatti.
- Contro l'istantanea delle 04:55 cambia solo `dungeon` (colonne `voce_boss_finale`, `seed_json`), più gli orari della migrazione.

**Stato visibile p1/p2: 0 differenze per voci e pin.** Cambiano 3 riepiloghi, tutti ancora completati, con il testo di §8.10
(«tutti gli oggetti permanenti»).

**k/N** (`kn-confronto.cjs` contro gli attesi di Analisi dati sulla p5s-0503Z): **p1 89/89 fatte; p2 39 fatte e 50 da fare**.
**0 differenze** voce per voce, 0 voci attese senza contatore, 0 voci con N>1 fuori elenco.

**Completamento**:

| Palazzo | p1 | p2 |
|---|---|---|
| Kamoshida | **concluso e completato 71/71** | concluso e completato 71/71 |
| Madarame | concluso e completato 82/82 | 0/82, né concluso né completato |

**Gesti NR4-1** (`prova-l4-gesti.cjs`, solo partite di prova sulla mia copia; **0 errori**), sulla voce «Raccogli e depreda le Installazioni
Artistiche» (8 pin):
- raccolto 1 pin → **1/8**, gli altri 7 invariati, voce non segnata;
- «Segna» sulla voce → **8/8**, tutti i pin fatti, specchio «ottenuto»;
- tolto 1 pin → **7/8**, voce non fatta, lo specchio sparisce;
- pin 2226 con 2 voci (sali-sull'impalcatura, raggiungi-la-roccia): tolto il pin, **si riaprono entrambe**;
- pin condiviso 2088 raccolto in «Entrata del Museo» (1/4) **resta da fare** in «Scopri dove il Tesoro» (0/4).

**NR4-2, prova (2)** (`prova-l4-concluso-controllo.cjs`). Partita di prova su Kamoshida con Tesoro (tutti i pin `tesoro-palazzo`) e boss
fatti, 15 permanenti non segnate:
- **concluso e NON completato (56/71)**, anche nell'elenco dei Palazzi;
- al 20 aprile, dentro la finestra, gli ingressi 1656 e 1616 sulla Shujin sono **bloccati** («concluso (Tesoro e boss finale), non ci si entra
  più»);
- **nessun requisito «Completare il Palazzo»** nel diario.
- Controllo: una partita col solo boss, quindi non conclusa, alla stessa data ha 1616 **disponibile** e senza quel requisito. La prova
  distingue i due casi.

**Pacchetto.** Esportazione completa dalla rotta dell'app (103 MB, 317 mappe) e reimportazione con «sovrascrivi»: 117 tabelle su 118
identiche, comprese tutte quelle delle partite (specchio, `spillo_partita_infiltrazione`). Restano solo i 2 asset F9 noti (non difetto,
L3 §2-quinquies).

**Altri controlli.**
- «Sulla mappa»: 0 destinazioni diverse.
- Memento: **identici byte per byte** alla base, quindi AP4-1 risulta corretto.
- **Vitest** nella copia dell'istantanea: 17 file, **180/180**. File: migrazioni 112, 022, 023; `avanzamento-unico`, `palazzo-completato`,
  `dungeon`, `guida-pin`, `percorso`, `copia-voci-area`, `disponibilitaService`, `pacchettoGiocoService`, `completamentoGuida`,
  `completamentoPalazzo`, `DungeonDettaglioPage`, `DungeonPage`, `MappaTokyo`, `FinestraDaVerificare`.

Non ho ancora controllato il FE di L4 nel browser (concluso/completato, k/N, «Riapre anche»): è in corso da FE.

**Conferma sul commit `b83c30ac`** (L4 committato da BE, 07:32 locali; esiti in `esiti-noreg/riprova-b83c30ac/`).

Confronto file per file con l'istantanea 2:
- il BE di L4 è identico;
- cambiano solo i 5 file del commit L3 `d1664295` (UX3-1: `giornataService`, rotta `percorso/voci/:uid`, OpenAPI, tipi, test), arrivato
  dopo l'istantanea;
- il FE non ancora committato è nell'istantanea e non nel commit.

Avvio su una copia nuova della base p5s-0503Z (108 → 112, 21 → 23):
- 112 senza mancanti; 022 con 0 divergenze; 023 con 90 righe;
- colonne comuni: stessi soli cambi dichiarati;
- stato visibile contro l'istantanea: **0 differenze**;
- k/N **p1 89/89, p2 39·0·50**, 0 differenze dagli attesi; completamenti uguali;
- «Sulla mappa» 0;
- gesti NR4-1: **14/14 OK, 0 errori**;
- NR4-2 (2): partita di prova **concluso e non completato 56/71**, ingresso 1656 bloccato, nessun requisito su Kamoshida nel diario;
  controllo (solo boss) con 1616 disponibile. Lo stato di 1616 nella partita «conclusa» è troncato nell'output di questo giro;
  l'avevo verificato «bloccato» sull'istantanea, con lo stesso codice di BE.

## 1. Giro continuo n. 1 — BE di L4 (gioco 111, utente 022), 2026-10-20 05:16
Codice: cartella di sviluppo (impronta `230c08f9…`, `esiti-noreg/codice.txt`). Copia fresca della produzione, boot reale 106 → 111 e 21 → 22
(porta 3298). Log: 110 come prima; 111 con il conteggio per carattere (Kamoshida permanente 71, rigenerabile 47, descrittiva 49, senza 2; …);
utente 022: `divergenze 4, pin 4, inversi 0`, tutte p1 Kamoshida (pin `d2f6acf5…` Seme della Bramosia del Tetto, `fd32580a…` e `2d4e5e28…`
Capitani delle Guardie, `ac5feb06…` Forziere 3 della Torre).
Esiti (`l4a-confronto.txt`, `l4a-api.txt`):
- `impronta.cjs` contro la base «prima di L2»: **0 differenze** (escluse le colonne del diario di L3).
- Estesa: **identica** alla 110 (destinazioni, pezzi, atterraggi, mappe dei Palazzi, marcatori, perimetri, **tutte le tabelle delle partite**:
  `punto_partita`, `spillo_partita`, `spillo_voce` invariati riga per riga).
- Fotografia contro la 110: 110 tabelle identiche; `punto_interesse.carattere` nuova colonna, NULL su 959 righe; tabella nuova
  `divergenza_partita` (4 righe); in `area` e nella voce nuova solo gli orari della migrazione.
- **Stato visibile p1/p2: 0 voci e 0 pin diversi**. Cambiano i riepiloghi di completamento di Kamoshida:
  - p1: «Tesoro, boss finale e raccolto tutto (107/107)» → **non completato** (`{"oggetti":71,"fatti":56,"tesoro":true,"boss":true,"completato":false}`);
  - p2: → «Tesoro, boss finale e tutti gli oggetti permanenti (71/71)»;
  - Madarame invariato (p1 non completato, p2 0).
  *Correzione del 2026-10-20:* nella prima stesura avevo scritto che il cambio di p1 era «come previsto». È sbagliato: sul lavoro da preservare
  il Palazzo di Kamoshida di p1, concluso per l'utente, risulta non completato. È aperto come **NR4-2** (difetti.md).
- Memento: `GET /api/compendio/dungeon/mementos` **identica byte per byte** alla base. Kamoshida e Madarame p1: voci e stati identici.
- «Sulla mappa» (API): 0 differenze.
- Prove di funzionamento: **1 KO**, sulla partita di prova: raccogliendo il pin `033d9e7e…` di Madarame i «presi» passano da 0 a 2. Non è un errore
  del codice ma la regola di L4 (§0): due pin condividono una sola voce rigenerabile, e segnare il pin segna la voce e quindi entrambi i pin. →
  **NR4-1** (difetti.md), da decidere: a Madarame una voce raggruppa 8 pin collezionabili. In tutto 89 voci con più pin (237 pin).

## 2. Riprova preparata (Stesura `modifiche.md` §8.10–8.11, attesi di Analisi dati `dati.md` §11.6) — si lancia quando BE consegna
Preparata il 2026-10-20 alle 06:45. Attesi estratti da `dati.md` §11.6 in `l4-riprova/atteso-kn.json` (scratchpad): 88 voci, p1 80 fatte / 3 in corso / 5 da
fare, p2 39 / 0 / 49, come il riepilogo di Analisi dati. Chiave completa della voce = `<palazzo>-<voce>`.
**Base aggiornata (06:55): la copia di produzione `dati-produzione/2026-10-20-0440Z/` del Collaudo** (`dati.md` §11.7, VALE QUESTA): l'utente ha finito
Madarame la sera del 19/10. Attesi su questa copia: Madarame **227 voci / 254 pin dell'utente**, Kamoshida 169/359 invariato; impronta di riferimento
`bbd9de5d…` (diario **255** voci, **342** spunte); contatore k/N su **89** voci (si aggiunge `madarame-il-furto-del-cuore-di-madarame-scontro-con-madarame-2`,
boss P, p1 2/2, p2 0/2): **p1 81 fatte / 3 in corso / 5 da fare, p2 39 / 0 / 50**; **Madarame p1 concluso e completato** (101/101; Tesoro = pin 811 **e**
2300, boss = `voce_boss_finale` §8.14), p2 né l'uno né l'altro; Kamoshida p1 concluso, non completato, 56/71. Migrazioni attese: utente **023**
(`spillo_partita_infiltrazione`, 90 righe Madarame p1) e la migrazione nuova di `dungeon.voce_boss_finale` (§8.14, valori di G-027). I passi qui sotto
valgono con questi numeri (dove dicono 88 / 80 / «Madarame p1 non concluso» si leggono 89 / 81 / concluso).
Procedura, sempre su una copia fresca della produzione (ora la 0440Z), avvio reale col codice consegnato, porta mia (329x):
1. **Migrazioni**: log della 022 (o della nuova migrazione utente) con **90** righe di `spillo_partita_infiltrazione` per Madarame p1, 0 per p2 e Kamoshida;
   fotografia: nessuna riga esistente di `spillo_partita` o `punto_partita` cambiata; `divergenza_partita` 4 righe (pin 583, 615, 1992, 1993).
2. **Impronta** contro la base «prima di L2» (escluse le colonne del diario di L3): 0 differenze; estesa e perimetri identici.
3. **k/N delle 88 voci**, p1 e p2, letti dall'API (scheda del Palazzo / guida): confronto voce per voce con l'atteso; le voci a un pin coincidono col segno.
4. **Completamento (§8.10, strada B)**: Kamoshida p1 **concluso** (ingressi, mappa di Tokyo, requisiti e condizioni «Completare il Palazzo» /
   «dopo il Palazzo di X» come nella base: nessun ingresso al Palazzo, nessun requisito rosso) e **non completato**, anello **56/71**, «manca: 15 oggetti
   permanenti»; Kamoshida p2 concluso e completato 71/71; Madarame p1 **non concluso** (manca il Tesoro, pin 811), p2 0. Confronto con la base di
   `/compendio/citta`, `/mappe/tokyo?partita=1`, semafori e disponibilità (stessi endpoint di `api-istantanea.cjs`).
5. **Stato visibile p1/p2** (`stato-visibile.cjs`): voci e pin identici alla base, salvo le 3 voci «in corso» attese (seme della bramosia 1/4,
   raccogli-forziere-3 1/3, capitani delle guardie 2/4), che prima risultavano non fatte.
6. **Gesti, solo sulla partita di prova** (`prova-funzionamento.cjs`, mai sulla 3201): pin 2256 «Installazioni Artistiche» raccolto → voce 1/8, gli altri
   7 pin invariati; «Segna» sulla voce → 8/8; togliere un pin → 7/8 e lo specchio `punto_partita` sparisce; un pin con due voci tolto riapre entrambe; un pin
   condiviso di rigenerabili raccolto nella 2ª infiltrazione resta da fare nella 4ª.
7. **Pacchetto**: export → import con sovrascrivi, specchio coerente; «Sulla mappa» 75 e Memento identici; Vitest mirati sui file consegnati.
8. **Chiusura di NR4-2** (decisione del PM, regola dell'utente §8.10):
   (1) sulla base p5s-0503Z Kamoshida p1 **concluso e completato (71/71)**;
   (2) su una partita di prova con Tesoro e boss fatti e 15 permanenti non segnate, il Palazzo è **concluso e non completato**: nessun
   ingresso visibile, nessun requisito rosso «Completare il Palazzo», assente dalla metro; anello e percentuale sotto il 100%.
