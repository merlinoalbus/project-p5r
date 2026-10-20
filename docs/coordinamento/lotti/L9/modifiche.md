# L9 «Confidenti, attività, calendario» — stesura delle modifiche

Autore: sessione «Stesura modifiche» (2026-10-20). Ingressi: `requisiti.md` (R9-01…R9-33 con R9-07b, R9-07c; dubbi 1–7), `dati.md` (§1–§7, uid
completi), `app.md` (§0–§7, segnalazioni A–E), Esperto della guida G-016a/b/c/d, G-017, G-020 (punti legame e ranghi), G-023 (inviti),
**L5** (luoghi per chiave), **L6** (valutatore unico, requisito del rango 1 come data di sblocco, `confidente_invito` e la condizione effettiva),
decisioni dell'utente via PM (nessuna voce nuova sul diario validato; le voci nuove dopo il 06-01 sono di L10). Migrazione: il primo numero libero
dopo L8 («M9»).

**Principio**: ogni dato del Confidente, dell'attività e del giorno vive in un posto e si modifica dalla sua pagina con «Ripristina»; il diario
non si riscrive (avvisi calcolati, nomi dal vivo); le copie diventano note o si smettono di leggere (L11).

## 1. Confidenti

### 1.1 Disponibilità strutturata (R9-01, R9-02, R9-03)
```sql
ALTER TABLE confidente_disponibilita ADD COLUMN modo TEXT CHECK (modo IN ('settimanale', 'trama', 'stanza-velluto', 'automatico', 'su-messaggio'));
  -- 'su-messaggio': nessun giorno fisso, l'incontro nasce da un messaggio o da un incontro (Kasumi, G-036); l'avviso del diario non scatta mai
ALTER TABLE confidente_disponibilita ADD COLUMN giorni_struct_json TEXT;    -- GiornoChiave[] (vuoto = tutti), solo per 'settimanale'
ALTER TABLE confidente_disponibilita ADD COLUMN fasce_struct_json TEXT;     -- ['giorno'|'sera'|'notte'] (vuoto = tutte)
ALTER TABLE confidente_disponibilita ADD COLUMN eccezioni_json TEXT;        -- [{ ranghi?: number[], condizione?: Condizione (L6), giorniDopoRango?: number,
                                                                             --   effetto: 'non-disponibile' | 'anche-disponibile', fasce?: Fascia[] }]
  -- es. Yusuke ranghi 4/6/9 «non-piove»; Mishima `giorniDopoRango: 2` → non disponibile nei 2
  -- giorni dopo un salto di rango (calcolato dallo storico dei ranghi della partita, L10), G-036
ALTER TABLE confidente_disponibilita ADD COLUMN motivo_senza_luogo TEXT;    -- igor, morgana, sae: «avanza con la trama»; gemelle: «Stanza di Velluto (cancello vicino al Negozio Softair)»
CREATE TABLE confidente_luogo (confidente_chiave TEXT NOT NULL REFERENCES confidente(chiave) ON DELETE CASCADE,
  luogo_chiave TEXT NOT NULL REFERENCES luogo(chiave) ON DELETE CASCADE, ordine INTEGER NOT NULL, nota TEXT,
  PRIMARY KEY (confidente_chiave, luogo_chiave));
```
- `confidente_luogo` è la **fonte unica** del legame (oggi `luogo.confidenti_json`, 34 luoghi, e `negozio.confidente_chiave`): la migrazione lo
  riempie da `luogo.confidenti_json` (stesse coppie) e `luogo.confidenti_json` non si legge più (L5 `LuogoDto.confidenti` da qui).
- Valori (dati §1.1, G-016b/d): 13 Confidenti con giorni validi → `settimanale` (giorni normalizzati, nessun cambio di significato); **Kawakami**
  venerdì e sabato sera, luogo Leblanc (telefono); **Yusuke** tutti i giorni di giorno, Sottopasso di Shibuya (area L2), eccezione ranghi 4/6/9
  `non-piove` (oggi `giorni_json` contiene le date dell'itinerario: corretto); **igor, morgana, sae** `automatico` (trama) senza luogo con motivo;
  **gemelle** `stanza-velluto` dal 18/5; haru, futaba, ryuji, ann, yusuke, kasumi → **strutturati con G-036** (tabella sotto; prima qui
  «`trama` con la frase come nota»); **makoto**
  → `settimanale` giorno, mar/gio/sab/dom al Cancello della Shujin (G-033: oggi sul Confidente ci sono solo le date di trama, che restano
  nota; i giorni arrivano dal luogo, che in L5 passa all'orario scolastico); **kasumi** → `su-messaggio` (G-036, sotto).
  **Disponibilità che arrivano dai luoghi di L5** (G-033, L5 §1.2 passo 4): Iwai (sera, gio/sab/dom, Untouchable), Hifumi (Chiesa di
  Kanda), Chihaya (sera, mar/gio/sab/dom, mai con la pioggia), Yoshida (domenica sera e festivi, non con la pioggia), Shinya (giorno,
  lun/mar/gio/sab), il lavoro all'Ore no Beko (sera, attività), Kawakami (sera, ven/sab, telefono del Leblanc; il corridoio del 2° piano
  della Shujin solo per il primo incontro del 4/6). Sono già in `confidente_disponibilita` sulla base 0503Z, tranne Makoto: la migrazione
  controlla che coincidano e scrive solo Makoto. Le frasi `giorni_json`/`fasce_json`/`luogo` di oggi restano note.
  **G-036 (Esperto, rilettura dei dati di L9)**: gli 8 Confidenti che oggi sono in prosa, con date d'itinerario o vuoti, diventano
  **strutturati** con la disponibilità della guida (prima qui erano «trama con la frase come nota»):

  | Confidente | Disponibilità |
  |---|---|
  | Ryuji | `settimanale` giorno, tutti i giorni |
  | Ann | giorno, lun/mar/mer/ven/dom, luogo **Centro commerciale sotterraneo** (corretto). Si **toglie** «anche sera con la pioggia», che è nei dati di oggi ma non nella guida; i ranghi 3, 4, 5, 7, 9 e 10 non si fanno con la pioggia (eccezioni `non-piove`, G-036; Analisi dati `dati.md` §9) |
  | Haru | giorno, lun–sab, mai con la pioggia |
  | Makoto | giorno, mar/gio/sab/dom (come sopra) |
  | Yusuke | giorno, tutti i giorni |
  | Futaba | giorno, mer/gio/sab/dom, mai con la pioggia |
  | Kasumi | modo `su-messaggio` (aggiunto al CHECK), con la nota «su messaggio o incontro a Kichijoji»: non è «da completare», è la regola del gioco |
  | Gemelle | dal 18/5, senza limiti (`stanza-velluto`) |

  Le date di trama di oggi restano note.
  Correzioni puntuali (G-036):
  - Kawakami: luogo = telefono del Leblanc (già sopra);
  - Yoshida: + festivi (già sopra);
  - Mishima: non disponibile nei **2 giorni dopo un salto di rango**, con l'eccezione `{ giorniDopoRango: 2, effetto: 'non-disponibile' }`.
    È calcolata dalla data dell'ultimo rango nella partita; senza partita c'è solo la nota;
  - le altre eccezioni per pioggia e rango sono nella tabella di G-036.
  Ogni riga ha `fonte = 'G-036'`; l'avviso del diario (sotto) usa queste disponibilità.
  **Lavenza** va con le Gemelle (Forza), non con Igor. Le voci del diario oggi legate a `igor` sono **4**, non 3; gli uid sono in `dati.md` §9.2,
  e sono tutte fuori dal validato. Restano da approvare, con la proposta `confidente:gemelle`, nell'elenco «Da rivedere» (L11); nessuna
  scrittura senza sì.
  **Cifre sulla base 0533Z** (Analisi dati `dati.md` §9): `confidente_disponibilita` ha 23 righe. Di queste 11 cambiano: le 8 strutturate e 3
  corrette (Kawakami, Yoshida, Mishima). Le altre 12 sono identiche. «Junichi» → «Munehisa» in 2 testi. Impronta «prima» di L9: `9a64fde1…`.
- **Avvisi del diario** (R9-03): `giornataService.voceDto` (91-102) aggiunge `avvisi: Array<{ tipo: 'fuori-giorno' | 'fuori-fascia'; testo }>` per le
  voci d'incontro, calcolati con il valutatore di L6 sulla disponibilità (tipo `avviso`, mai blocco); mostrati come chip ambra sulla voce. Nessuna voce
  spostata o riscritta (le 27 fuori giorno e 48 fuori fascia di dati §1.2 mostrano l'avviso; quelle di Kawakami con G-016b sono «da rivedere»).

### 1.2 Nomi dal vivo (R9-05, R9-06)
- Il nome del Confidente nella voce del diario si legge dal Confidente (`nomeRiferimento`, `azioniStrutturateService.ts:68-88`, già dal vivo per il
  riferimento): la vista mostra il nome attuale accanto al testo della voce quando il testo cita un nome diverso (39 voci, 6 nel validato); il testo
  non cambia.
- «Junichi Iwai» → «Munehisa Iwai» nei 2 testi della guida (`evento_calendario.titolo`, `settimana_guida.riassunto`): correzione di un dato della
  guida, applicata ed elencata.
- Le **4** voci con riferimento `igor` che parlano delle Gemelle e di Lavenza (06-08, 09-06, 11-06, 01-11; G-036): elenco «Da rivedere» con la
  proposta `confidente:gemelle`, nessuna scrittura (riferimento della voce del diario).

### 1.3 Ranghi, punti, abilità, dialoghi, inviti (R9-07, R9-07b, R9-07c, R9-08)
- `confidente_rango` (162 righe) + colonna `modo TEXT CHECK (modo IN ('punti', 'evento', 'automatico', 'richieste', 'velluto'))` e `fonte`: dalla
  tabella **G-020** (rango 1 e 1→2 senza punti per tutti; Igor, Morgana, Sae e Gemelle senza ranghi a punti; Mishima sale con le Richieste; Yoshida
  senza soglie; Akechi 9→10 e Maruki 10 automatici; 9→10 in generale all'evento successivo); per `punti` la soglia è la colonna di oggi
  (`punti necessari`, confermata da G-020: es. Akechi 6→7 = 55), per gli altri soglia 0.
- **Un modulo dei punti** (R9-08): `shared/puntiConfidenti.ts` (nuovo) = la formula di oggi (`partiteService.ts:246-250`) + G-020: base 0/5/10/15
  (regalo 50 dove si può) × **1,5** con una Persona dello stesso arcano nell'elenco della partita (per difetto) × **1,2/1,5** dopo i risultati
  d'esame per **Ryuji, Ann, Makoto, Haru, Sojiro, Kawakami, Kasumi** (nei primi 10 / primo in classifica; vale fino ai risultati dell'esame
  successivo); il ×1,2 dell'invito **non** si applica (da verificare in G-020); l'eccedenza dopo un passaggio di rango va al rango successivo
  (regola dell'utente, certezza media-bassa: L10 la applica). Lo usano il server e l'anteprima (`src/utils/punti.ts:18`, che oggi ne è una copia: via).
- **Piazzamento agli esami** (serve al moltiplicatore): tabella nuova `utente.esame_piazzamento_partita (partita_id, esame_chiave, piazzamento CHECK
  IN ('primo','primi-10','altro'))`, impostato da DomandePage accanto ai risultati dell'esame; senza valore il moltiplicatore non si applica.
- **Inviti** (R9-07c, decisione dell'utente): la pagina del Confidente ha la sezione **«Inviti»** = le righe di `confidente_invito` (L6) del
  Confidente: data, cosa apre (area, ritrovo, luogo, quartiere: con il nome e il link), nota, fonte; **unico punto di modifica** (aggiungi, modifica,
  togli → cestino), e il gesto «Invito avvenuto / Annulla» della partita. Aggiungere da Makoto l'invito del 30/7 che apre Ikebukuro lo fa comparire
  nella condizione effettiva di Ikebukuro (L6) e nella voce del diario che lo cita (L10), senza scriverlo altrove.
  **Condizioni dell'invito** (R9-07c corretto, R6-08c2): ogni riga mostra e modifica le sue condizioni (`confidente_invito.condizioni_json`,
  L6 §1, con il valutatore unico e «Palazzo concluso» di L4). Il gesto «Invito avvenuto» è attivo solo con le condizioni vere, altrimenti dice
  cosa manca. Gli inviti **senza voce del diario** (Ryuji 29/5, nel diario validato) si registrano solo da qui o dalla pagina del quartiere;
  Makoto 30/7 ha la sua voce con la condizione scritta (decisione del PM, L10 §4) e si registra anche da qui, sempre solo con le condizioni vere.
- **Cifre sulla copia 0440Z** (Analisi dati `dati.md` §8): voci con riferimento a un Confidente 297 (52 nel validato); fuori fascia 49 (11 nel
  validato: la nuova è Igor del 06-01 sera, `9b4f62e2…`, voce dell'utente, solo avviso, nessuna scrittura); incontri della partita 1: 37 (Igor
  rango 4 e Morgana rango 3 nuovi).
- **Avvio (rango 1) e incontro di trama sono due cose** (R9-04b, G-017): il requisito del rango 1 è una condizione strutturata, con il Palazzo
  «concluso» dove serve, mai una frase; l'incontro di trama è un **evento** del calendario (L9 §calendario), non il rango 1. Valori:
  - Ohya: incontro il 18/6, rango 1 dal 5/7;
  - Kawakami: Becky il 3/6, sblocco il 4/6, rango 1 consigliato l'8/6 con Coraggio rango 3;
  - Gemelle: dal 18/5 (non «dopo Madarame»);
  - Takemi: negozio dal 16/4, Tae dal 18/4.
  La data di sblocco mostrata in semafori, calendario e pagina è quella del rango 1 (R9-04); l'incontro compare come evento separato.
- **Modifica dalla pagina** (R9-07): anagrafica (nome, arcano), ranghi (modo, soglia), abilità per rango (`confidente_abilita`), Dote del rango (resta
  «solo al passaggio di rango», 2026-10-17), dialoghi (`confidente_dialogo`: scelte, punti numerici, `puntiTesto` come nota dove la guida non dà
  numeri — 284 scelte, dubbio 5), regali (L7: per chiave del catalogo), luoghi (`confidente_luogo`), disponibilità (§1.1), requisiti (editor di L6),
  inviti. Ogni modulo con «Ripristina» (`seed_json` sulle tabelle con `origine`, come il catalogo).

### 1.4 Pagina del Confidente e elenco (R9-09, R9-30, R9-31, segnalazione T6 di L5)
- `/confidenti/:chiave` resta la casa (guida + partita). Ordine delle sezioni pensato per il gioco (R9-31): intestazione con rango attuale, punti
  verso il prossimo (barra), **prossimo passaggio** e semafori; **disponibilità di oggi** («Oggi: sera, Leblanc» con il luogo come link alla pagina del
  luogo, o «Non oggi: venerdì e sabato sera»); **dialoghi del rango corrente**; poi requisiti, abilità, regali, inviti, luoghi, dialoghi degli altri
  ranghi (richiudibili). A 1366×657 e 1280×689 rango, disponibilità e dialoghi del rango corrente stanno nella prima schermata (R9-33).
- **`/confidenti`** (nuova rotta): elenco dei 23 con rango, disponibilità di oggi e link; il link rotto del visore (`VisoreMappa.tsx:901`) porta qui
  (T6). «Personaggi» porta alla pagina del Confidente (R9-09).
- «Chi posso vedere oggi» (R9-30): nel diario (Oggi) un chip «Confidenti disponibili oggi · N» apre l'elenco filtrato sul giorno e la fascia della
  partita, con gli stessi dati della pagina.

## 2. Attività (R9-10…R9-14)
- **Pagina** `/guida/attivita/:chiave` (`src/pages/AttivitaDettaglioPage.tsx`, nuova): sede (luogo, L5, con presenza di oggi), fascia, sblocco
  (condizione L6), **effetti strutturati** (Doti, contatori, paga), quiz (Triple Seven: giorni dal solo `quiz_json`, R9-13), dettagli come nota; azioni
  «Modifica» e «Ripristina». `AttivitaPage` resta l'elenco (schede Attività/Lavori) con il link a ogni attività.
- **Effetti**: `effetti_json` è la sola fonte (R9-11); per le **7** attività senza nulla e le **9** con Doti solo in prosa, gli effetti dalla scheda
  dell'Esperto (da chiedere: «G-0xx Doti delle attività», valori della guida) con una migrazione dedicata; fino ad allora l'attività dichiara
  «Effetti da completare» (nessun valore inventato). Biliardo e Gun About («incremento casuale»): effetto `dote` con valore «casuale» → proposta
  con «Applica» in L10 (D6), mai automatico.
- **Paga** (R9-12): `paga_yen`/`paga_massima` sull'attività sono la sola fonte; turno (`registraTurno`, `attivitaService.ts:450-474`), diario ed esiti
  del quiz la leggono da lì; le altre copie (`paga` frase, `dettagli`) note. Che la paga muova gli yen è D8 (L10).
- Descrizioni ripetute (R9-14): la descrizione vive sull'attività; le voci e le schede che la ricopiavano mostrano il nome con il link.

## 3. Calendario (R9-15…R9-23)

### 3.1 Un giorno
```sql
CREATE TABLE giorno (
  data          TEXT PRIMARY KEY,             -- MM-GG
  meteo_giorno  TEXT, meteo_sera TEXT,        -- due fasce, dal calendario (G-016a)
  nota_meteo    TEXT,                         -- es. 05-24 «possibile pioggia» (decisione del PM, «da verificare»)
  trama         TEXT,                         -- dal percorso
  vincoli_json  TEXT NOT NULL DEFAULT '[]',   -- tempo libero giorno/sera e altri vincoli
  settimana_chiave TEXT REFERENCES settimana_guida(chiave),
  origine TEXT NOT NULL DEFAULT 'seed', seed_json TEXT, updated_at TEXT NOT NULL
);
```
- Migrazione: fonde `giorno_calendario` e `giorno_percorso` (346 date, 0 in una sola) — meteo dal calendario in due fasce, trama e vincoli dal
  percorso; **05-24** «Nuvoloso» con nota «possibile pioggia» (deciso). Le due tabelle non si leggono più (L11); `giorno_percorso.azioni_json` (copia
  storica) idem.
- **Giorno della settimana calcolato** (R9-16): `shared/date.ts` `giornoDellaSettimana(MM-GG)` (anno di gioco: aprile–dicembre 2016, gennaio–marzo
  2017; dati: 0 errati); `calendarioService.ts:14, 19`, `GiornoGuida`, `GIORNI_SETTIMANA` e `descriviGiorni` lo usano; nessun formato salvato letto.
- Lettori: `meteoService.ts:87-91` (non più `COALESCE`), `CalendarioPage.tsx:40, 110`, `GiornoGuida.tsx:289`, `OggiGuida`/`MeteoGiornata` (meteo della
  partita invariato: `meteo_partita` resta lo stato della partita, R9-27); allerte (`allerta_meteo`) lette per data dal giorno (R9-17).
- **Pagina del giorno** (R9-19): nella guida giorno per giorno (`/guida/percorso/:data`) «Modifica il giorno» (meteo nelle due fasce, nota, trama,
  vincoli) con «Ripristina».

### 3.2 Eventi, sblocchi e scadenze (R9-20, R9-21, R9-22)
- **Sblocchi e scadenze si ricavano** (non si scrivono): `calendarioService` costruisce i tag del mese da: requisito del rango 1 dei Confidenti
  (sblocco), condizioni `data` dei quartieri e dei luoghi (sblocco, L6), finestre dei Palazzi (apertura, scadenza, lettera: L6). Madarame ha **una**
  scadenza (06-05) più la lettera (05-31) come evento distinto (G-007). I 46 «sblocco» e 18 «scadenza» di `evento_calendario` che coincidono con un
  dato ricavato non si mostrano più; quelli che non coincidono vanno nell'elenco (dato ricavato contro testo, con la fonte).
- **Gli altri eventi** (storia 61, festa 24, vacanza 11, esame 8, meteo 4, consiglio 1 e gli sblocchi/scadenze non ricavabili): restano **eventi
  del calendario** collegati per chiave dove il titolo lo permette (Palazzo, quartiere, Confidente: colonna nuova `evento_calendario.riferimento_tipo/
  riferimento_chiave`, da elenco), modificabili dallo stesso modulo delle voci (R9-22). **Non diventano voci del diario validato** (decisione
  dell'utente, 2026-10-20: «sul diario già validato non aggiungere le voci»): il diario mostra nel giorno, sopra le voci, una riga «Eventi del giorno»
  letta dal calendario, senza toccare le voci (R9-24). Se e come diventino voci con effetti (fatti di storia) è di L10.
- **Calendario = vista mensile del diario** (R9-22, R9-32): ogni giorno del mese mostra gli eventi, i tag ricavati e il conteggio delle voci; ogni tag
  porta alla voce/all'oggetto; a 375 diventa lista per settimana (R9-33). Il Calendario cambia la data di gioco con `PUT /partite/:id/giorno` (non più
  `PUT /partite/:id`, `CalendarioPage.tsx:90-98`; la regola unica del giorno è di L10).

### 3.3 Esami, domande, cruciverba (R9-18)
- Le **31** domande puntuali degli esami (oggi in `esame.domande_json` e copiate dalla 078 in `domanda.risposte_json`) diventano righe di `domanda`
  (con `esame_chiave`, data, risposta, ricompensa); le **12** righe riassuntive «Serie di domande…» restano (con `riassuntiva = 1`, nascoste
  dall'elenco) perché le segnano le partite (`domanda_partita` p1 6, p2 6): nessun segno perso; i loro segni si mostrano sulle domande dell'esame del
  giorno. `esame.domande_json` non si legge più. Conteggio: 78 + 31 = 109 righe, 97 visibili.
- Domande e cruciverba senza voce (7 e 5) e voci senza domanda/cruciverba (5 e 3): elenco per L10 (abbinamento per data); nessuna voce nuova.
- `CruciverbaPage.tsx:109`: ordinamento con `indiceGiornoScolastico` (segnalazione E).

## 4. API e DTO (principali)
- `ConfidenteDettaglioDto` (232-243): `disponibilita: { modo; giorni; fasce; eccezioni; luoghi: Array<{ chiave; nome; casa }>; motivoSenzaLuogo; oggi?:
  { disponibile: boolean; testo } }`, `ranghi: Array<{ rango; modo; soglia; abilita; dote }>`, `inviti: Array<{ chiave; data; apre: { tipo; chiave;
  nome; casa }; nota; avvenuto?: boolean }>`, `regali` (L7), `dialoghi`, `origine`/`modificato`.
- `AzionePercorsoDto` (1139): `avvisi`. `CalendarioDto`/`GiornoCalendarioDto` (1955-1976): `meteo: { giorno; sera; nota }`, `giornoSettimana`
  calcolato, `tag: Array<{ tipo: 'sblocco' | 'scadenza' | 'storia' | 'festa' | 'esame' | …; testo; casa?; ricavato: boolean }>`.
- `AttivitaDto` (1478-1520): `effetti` strutturati, `casa`, `effettiDaCompletare: boolean`.
- Rotte nuove: `GET /api/compendio/confidenti` (elenco con «oggi»), `PUT /api/compendio/confidenti/:k` (anagrafica, disponibilità, luoghi),
  `PUT …/:k/ranghi/:rango`, `PUT …/:k/dialoghi/:id`, `POST`/`PUT`/`DELETE …/:k/inviti(/:invito)`, `POST …/:k/ripristina`; `GET`/`PUT
  /api/compendio/attivita/:k`; `PUT /api/compendio/giorni/:data`; `PUT /api/partite/:id/esami/:esame/piazzamento`.

## 5. Migrazione M9
1. Schema (§1.1, §1.3, §3.1, colonne di `evento_calendario` e `domanda`); `utente.esame_piazzamento_partita`.
2. Disponibilità strutturata e `confidente_luogo` (§1.1); ranghi da G-020; «Junichi» → «Munehisa» (2 testi).
3. `giorno` dalle due tabelle; collegamenti per chiave degli eventi da elenco; domande degli esami.
4. Nessuna voce del diario toccata; nessuno stato di partita toccato.
### Verifiche prima/dopo
| Misura | Atteso |
|---|---|
| giorni | 346 in `giorno`; meteo divergenti 0 (05-24 con nota) |
| Confidenti con disponibilità strutturata | 23 righe: 11 cambiano (8 strutturate con G-036, compresa Kasumi «su messaggio»; Kawakami, Yoshida e Mishima corrette), 12 identiche; igor, morgana e sae senza luogo con motivo |
| `confidente_luogo` | stesse coppie di `luogo.confidenti_json` |
| data di sblocco dei Confidenti in ogni vista | una (requisito del rango 1) — R9-04 |
| voci del diario | **997** invariate (base 0503Z/0533Z, compresa la voce di Igor del 06-01 sera aggiunta dall'utente); impronta «prima» di L9 `9a64fde1…` identica |
| domande | 109 righe, 97 visibili; segni delle partite invariati |
| stato della partita | invariato (dati §5) |

## 6. Piano dei test
- **BE**: disponibilità e avvisi del diario (Kawakami il martedì → «fuori giorno»; Yusuke rango 4 con la pioggia → avviso; Igor senza luogo); data
  di sblocco uguale in semafori, calendario, pagina (R9-04, i 6 casi di app.md §0.1); `shared/puntiConfidenti.ts` (base, arcano ×1,5, esame primo/primi
  10/altro per i 7 e fuori dai 7, eccedenza; anteprima = server: R9-08); inviti (aggiungi da Makoto → condizione di Ikebukuro; togli → sparisce; R9-07c);
  attività: effetti, paga unica, quiz; giorno unico (346, meteo, settimana calcolata, 05-24); calendario ricavato (Madarame una scadenza + lettera);
  esami (31 domande, 12 riassuntive con i segni); migrazione M9 (conteggi, idempotenza, impronta); test esistenti da allineare (app.md §5).
- **FE**: `ConfidenteDettaglioPage.test.tsx` (sezioni, ordine, modifica, inviti), elenco `/confidenti`, `ConfidentiPartita.test.tsx` (anteprima dal modulo
  condiviso), `AttivitaDettaglioPage.test.tsx` (nuovo), `CalendarioPage.test.tsx` (tag ricavati, lista a 375, cambio del giorno con `/giorno`),
  `DomandePage` (piazzamento, domande d'esame), `CruciverbaPage` (ordine), `GiornoGuida` (avvisi, nomi dal vivo, eventi del giorno).
- **Funzionali**: «fatto quando» — le date di sblocco dei Confidenti coincidono in ogni vista; le attività registrano le loro Doti (dopo la scheda
  dell'Esperto); con una partita di prova: modificare la disponibilità di un Confidente, aggiungere un invito, impostare il piazzamento e vedere i punti.
- **UX**: «chi posso vedere oggi e dove» in un tocco dal diario (R9-30); pagina del Confidente non lunga, rango e dialoghi del rango in cima (R9-31);
  Calendario leggibile come oggi (R9-32).
- **No-reg**: diario 04-01..06-01 identico (R9-24) — nessuna voce aggiunta; stati dei Confidenti, turni, contatori, domande, cruciverba, meteo della
  partita invariati (R9-25…R9-27); Palazzi (R9-28).
- **Layout**: pagina del Confidente (1366×657 e 1280×689 con rango, disponibilità e dialoghi nella prima schermata), elenco dei Confidenti, pagina
  dell'attività, Calendario (lista a 375), pagina del giorno, moduli: 1280, 768, 375, 1024×690; bersagli ≥44 px.

## 7. Da approvare (scelta prudente applicata)
1. **Eventi del calendario**: restano eventi (non voci del diario validato, decisione dell'utente); sblocchi e scadenze ricavati; elenco dei casi non
   coincidenti.
2. **Effetti delle 16 attività** (7 + 9): dalla scheda dell'Esperto, da chiedere; fino ad allora «Effetti da completare».
3. **Kasumi** (disponibilità vuota) e le frasi di trama di Makoto, Haru, Futaba, Ryuji: nota + elenco.
4. **4 voci con riferimento `igor`** (Gemelle e Lavenza: 06-08, 09-06, 11-06, 01-11): elenco «Da rivedere», nessuna scrittura.
5. **Domande riassuntive degli esami** conservate (segni delle partite), nascoste dall'elenco.
6. **Moltiplicatore dell'invito** (×1,2): non applicato finché G-020 non lo conferma.
