# L8 «Persona e Ombre» — test no-reg

Sessione «Test no-reg — team p5s». Casi preparati il 2026-10-20 (08:05 locali), su richiesta del Manager. Fonti:
- `piano.md` («Per i tester»);
- `modifiche.md` §6 (M8, M8b, «Verifiche prima/dopo») e §7;
- `requisiti.md` R8-07e, R8-22…R8-27;
- **G-035** dell'Esperto (`dati.md`);
- impronta «prima» di Analisi dati sulla base 0533Z: **`742ed5a2…89a4`** (`impronta-lotto.cjs L8`).

**Si comincia solo col via del Manager.** Il giro breve di L2 sull'hash con E4/E5/E7 viene prima di tutto. Esiti grezzi in `esiti-noreg/`.

## 0. Base e metodo
- **Base**: copia di p5s `p5s-2026-10-20-0533Z`, avviata su una copia mia col codice di newreview dei lotti già consegnati (oggi fino a L4,
  `b83c30ac`). «Prima» = quella copia; «dopo» = la stessa copia avviata col codice di L8 (M8 + M8b). Mai sul 3201; sull'anteprima solo
  letture, avvisando il Collaudo.
- **Strumenti**:
  - `fotografia.cjs` e `confronta-colonne-comuni.cjs`, riga per riga sulle sole colonne di prima;
  - `impronta-lotto.cjs L8` di Analisi dati;
  - `stato-visibile.cjs`, `sulla-mappa.cjs`;
  - `confronta-mementos.cjs`: risposta API dei Memento byte per byte;
  - letture API di compendio, Battaglia, negoziazione e fusioni.
- **Lavoro da preservare**: diario 255/342, Kamoshida 169/359, Madarame 227/254, impronta `ff3033cb…`; dopo la 110 vanno escluse le 4
  colonne nuove del diario.

## 1. Cifre «prima» (Analisi dati, base 0533Z) da tenere uguali
| Dato | Righe | sha (inizio) |
|---|---:|---|
| `persona` / `persona_affinita` / `persona_skill` | 232 / 2320 / 1614 | `6c1a5d80` / `8e1667fa` / `d2edd393` |
| `persona_area_dedalo` / `area_dedalo` | 827 / 95 | `d29c2e7b` / `62947fd3` |
| `skill` | 525 | `193f4b94` |
| `traduzione` (10 ambiti) | 1421 | `5d964261` |
| voci `persona` (Palazzi e dedali) | 172 | `738b510f` |
| voci `ombra-sciagura`/`miniboss`/`boss` | 153 | `4f351554` |
| `dati_guida` `battaglia` / `personaggi` | — | `c0ca9298` / `cc7da334` |
| partita: `compendio_partita` / `persona_posseduta` / `membro_squadra_partita` | 53 / 7 / 4 | `f4af2b8c` / `d106a08b` / `a7558187` |
| partita: `punto_partita` delle voci `persona` | 4 | `5aff3ed4` |

## 2. Casi (con l'atteso)
| # | Quando (piano) | Caso | Atteso |
|---|---|---|---|
| N8-1 | B0 + F1 | Testi dell'utente | Nessun testo libero dell'utente cambia: note, nomi rivisti, testi delle voci; colonne comuni identiche |
| N8-2 | B1 (M8) | Impronta di Analisi dati rifatta escludendo tabelle e colonne nuove | **Stessi sha riga per riga** di `742ed5a2…`. **Sole eccezioni dichiarate**: in `battaglia.ombre` le 2 righe di Kaneshiro con Ombra e Persona scambiate tornano giuste (Fango pulsante → Melma nera, liv. 18, Timida; Maestra degli scherzi → Pixie superiore), con debolezze e resistenze invariate; «Straziato re dei desideri» completato con `persona` = Mara, personalità «Non reclutabile» e Irritabile in nota; le altre **214** righe identiche; le **13** etichette di `traduzione` (9 elementi + 4 `tipoEredita`); i nomi alternativi; le tabelle nuove. Le voci `boss` di Madarame con «Gelo/respinge» restano identiche |
| N8-3 | B1 | Conteggi | 217 Ombre unite alle voci; abbinamento al compendio **213/217**, senza Persona i **4 Servobot**; **5 non reclutabili** (4 Servobot + Straziato re dei desideri); Fango pulsante e Maestra degli scherzi **reclutabili**; nessuna Ombra reclutabile diventa non reclutabile. Voci con `ombra_chiave` 131 + 38 (9 di Iweleth fra queste), con testi, ordine e pin delle voci invariati |
| N8-4 | B1 | Nomi doppi (G-035) | Nome mostrato quello della guida («Maestra degli scherzi», «Straziato re dei desideri»). «Capo dei burloni» e «Re lacerato dei desideri» restano cercabili come nomi alternativi; le righe di `traduzione` ambito `negoziazione` (`Prankster Leader`, `Torn King of Desires`) **non si cancellano** |
| N8-5 | B1 | Idempotenza | Una seconda esecuzione della M8 (e M8b) scrive 0 righe |
| N8-6 | B1 / B6 | Memento (R8-22) | `GET /api/compendio/dungeon/mementos?partita=1` **identica byte per byte**, salvo i campi in più dichiarati e Iweleth. 9 dedali, 95 aree, 827 legami, 131 voci; pagine dei dedali e tocco che registra come prima |
| N8-7 | B2 + F2 | Battaglia | Le risposte della Battaglia per le Ombre di oggi danno le stesse debolezze: per le Ombre con Persona vengono dal compendio, non da copie; le 4 eccezioni di G-019 (Take-Minakata, Mithras, Bugs, Power) e i 5 non reclutabili hanno le loro proprie. `persona_affinita` invariata |
| N8-8 | B3 + F3 | Compendio della partita reale (R8-23) | `compendio_partita` 53 e `persona_posseduta` 7 **identici riga per riga** (livelli, abilità, bonus). Le catture segnate come stato delle voci dei Palazzi (4 righe di `punto_partita`) diventano registrazioni solo se la Persona non era già registrata, senza toccare livelli. Kamoshida e Madarame: voci Persona/Ombra con lo stesso testo, ordine, pin e posizione (R8-24); stato visibile 0 differenze |
| N8-9 | B4 + F4 | Negoziazione (R8-07e) | I **642 verdetti di oggi tutti presenti**: 86 come «altra fonte», le 24 contraddittorie con entrambe le righe. Nessuna domanda, risposta, esito o nota di oggi persa; quelle smentite sono elencate con il motivo e tolte solo dopo l'approvazione. In più ≈274 domande (225 + 49 di Royal) e 979 esiti di Royal; i Servobot fuori dalla negoziazione |
| N8-10 | B5 + F5 | Fusioni, cicli, Stanza di Velluto (R8-26) | Su campioni fissi (le 7 della scorta di p1 e una ricetta per arcano) la fusione diretta, l'inversa, gli alberi e i cicli salvati danno gli stessi risultati di prima. Le 27 forme della Persona del party (M8b) **mai** nei risultati di fusioni, ricette, cicli e suggerimenti. Scorta e squadra (4) invariate |
| N8-11 | B5 | M8b | 27 righe di `persona` aggiunte e nessuna esistente cambiata; si ferma se manca una skill o se una chiave esiste già |
| N8-12 | B7 + F7 | Giro completo | Diario 04-01..06-01 255/342 identico (R8-25); 75 «Sulla mappa»; Kamoshida e Madarame; pacchetto mappe esporta → importa identico; Memento identici; Vitest mirati di R8-27 (dedali, compendio, maschere, Battaglia, Ombre, migrazioni nuove, DungeonDettaglioPage per i Memento) con output grezzo |
