# L5 «Luoghi, negozi, orari» — stesura delle modifiche

Autore: sessione «Stesura modifiche» (2026-10-20). Ingressi: `requisiti.md` (R5-01…R5-33, dubbi 1–8), `dati.md` (§1–§8, con le risposte
dell'Esperto della guida G-012, G-013, G-014), `app.md` (§0–§9, segnalazioni A–E), i punti del Project manager (presenza che non arriva al
visore, cestino per luoghi e negozi, più negozi per luogo, pin che copia il luogo, pin dell'utente verso negozi di altri quartieri solo «da
approvare»), **L2** (aree del mondo, pagine Quartiere e Area, `casa`, `/api/aree`), D5 (negozio = sezione della pagina del luogo).
L5 si implementa dopo L4: la migrazione prende **il primo numero libero** dopo quelle di L4 (qui «M5»).

> **Stato al 2026-10-20, pronto per BE e FE.** Il progetto è allineato a:
> - requisiti riletti: R5-12b, R5-12c, R5-20c esteso, R5-20d, R5-20e, dubbi 3, 7 e 9;
> - Analisi dati `dati.md` §9 e §10, con G-029, **rimisurati sulla copia di produzione 0440Z**
>   (`p5s-coordinamento/dati-produzione/2026-10-20-0440Z/`): le cifre di L5 **non cambiano** (93 luoghi; 26 con lo sblocco solo come frase,
>   tutti confermati; 41 senza orari né sblocco; 56 in tutto);
> - decisioni dell'utente e del PM.
>
> Le condizioni di sblocco dei luoghi sono di L6 (§4.1), che L5 legge con `presenzaDelLuogo`. Se L5 si implementa prima di L6, le scrive
> la M5 con la stessa tabella. **Aggiornamento G-031: nessun punto aperto** (R5-20f, requisiti: verifiche per ognuno dei 4 luoghi; Sakura Residence fuori dai menu con una
> proprietà `luogo.solo_eventi_confidente = 'futaba'` (§1.1; niente condizioni manuali, decisioni dell'utente del 2026-09-05 e 2026-09-30),
> Sakai chiuso e nascosto fuori dalle 16 finestre, Jinbocho = area con la Libreria Nagiuri) (Sakai con 16 finestre, Jinbocho = nagiuri, Okumura/Roppongi resta 15/9, Sakura Residence
> nell'elenco «Da rivedere»; L6 §4.1). Erano aperti, senza scrittura, quattro luoghi: Sakura Residence, Mercante Sakai, il ritrovo di Jinbocho e
> la data del 19/9 di Okumura. Li chiudono Analisi dati e l'Esperto; quelli che restano dubbi vanno nell'elenco unico «Da rivedere» (L11
> R11-10c). Impronta di riferimento `ff3033cb…` (base `p5s-2026-10-20-0503Z`; le cifre di L5 sono
> identiche alla 0440Z, ricontrollo di Analisi dati); diario validato di 255 voci.

**Principio**: il luogo diventa la fonte; le copie si smettono di leggere, non si cancellano (L11). Nessun pin cambia posizione, planimetria,
condizioni; i pin dell'utente non cambiano riferimento senza sì; nessun luogo nuovo senza sì; acquisti e punti invariati; diario e Palazzi
non toccati.

## 1. Modello e migrazione M5 `M5_luoghi_fonte_unica.ts` (gioco.db)

### 1.1 Schema
```sql
ALTER TABLE luogo   ADD COLUMN area_chiave TEXT REFERENCES area(chiave) ON DELETE SET NULL;   -- Area di L2
ALTER TABLE luogo   ADD COLUMN orari_json TEXT;               -- OrariNegozio (shared/orariNegozio.ts); NULL = orari non indicati dalla guida
ALTER TABLE negozio ADD COLUMN eccezione_orari_json TEXT;     -- OrariNegozio del solo negozio, quando la guida lo distingue dal luogo
ALTER TABLE luogo   ADD COLUMN solo_eventi_confidente TEXT REFERENCES confidente(chiave) ON DELETE SET NULL;
  -- R5-20f: luogo visitabile solo negli eventi di quel Confidente (Sakura Residence → 'futaba', G-031): mai nei menu né in «Luoghi qui»;
  -- pagina raggiungibile dagli eventi di rango del Confidente e dalla ricerca. NULL per tutti gli altri luoghi.
CREATE INDEX luogo_area ON luogo (area_chiave);
-- cestino: ricostruito come in L2 (stesso modello, contatore conservato) con il CHECK esteso a 'luogo' e 'negozio'
```
- **NULL = regola dichiarata dell'app** (R5-12c, rilettura dei requisiti del 2026-10-20): dove la guida non dà un orario (oggi 52 luoghi senza
  `quando`, più la Chiesa di Kanda dopo il passo 4) vale **«aperto giorno e sera»**, costante unica `ORARI_REGOLA_APP` in
  `shared/orariNegozio.ts`, segnata come regola dell'app e mai come dato della guida: il DTO porta `orari.origine: 'guida' | 'regola-app'` e la
  pagina dice «Giorno e sera · regola dell'app: la guida non indica orari». La presenza è calcolata (aperto di giorno e di sera, tutti i giorni):
  per questi luoghi non cambia niente rispetto a oggi.
- **Quattro ambiti di orario che non si mescolano** (R5-12b, G-011/012/013/015): (1) **luogo** (`luogo.orari_json`); (2) **eccezione del
  negozio** (`negozio.eccezione_orari_json`); (3) **disponibilità dell'articolo** per giorno o meteo (condizioni dell'articolo, L6/L7: in L5 solo
  nota); (4) **Confidente e attività** (L9). Nessun valore di un ambito si copia in un altro.
- Colonne che si smettono di leggere (restano fino a L11): `luogo.quando`, `luogo.giorni`, `luogo.giorni_json`, `luogo.negozio`,
  `negozio.luogo` (frase), `negozio.luogo_chiave` (è un quartiere, dati §2), `negozio.orari`, `negozio.orari_json`, `marcatore_luogo`
  (R5-19: dati §5 chiarisce che `marcatore_mappa` è dei Palazzi, L4), `spillo.nome`/`descrizione` **per i pin di luogo** (§3.3).

### 1.2 Passi (una transazione; regole dentro la migrazione)
1. Schema del §1.1 (solo se manca) e cestino ricostruito.
2. **Luogo → Area** (R5-01, dati §7.1): `area_chiave` = area della planimetria su cui sta il pin del luogo (riferimento `luogo`), o della
   planimetria legata dalla regola 054 (`mappa_entita` tipo `luogo`) → **42**. I 13 luoghi dei quartieri con una sola area **non** si
   assegnano (area dedotta, non provata): restano «da collocare» con la proposta dell'area in elenco. 38 «da collocare» senza proposta.
3. **Orari sul luogo** (R5-04/05, dati §3): `orari_json` =
   - dal luogo: fasce da `quando` (`giorno` → [giorno], `sera` → [sera], `entrambe` → []), giorni da `giorni_json`; `nota` = la frase
     `giorni` se dice più dei valori;
   - se il luogo è vuoto e la sede ha negozi con orari **concordi**, da lì (3: venditore-ambulante lun–ven sera, negozio-scolastico lun–sab,
     tempio-kichijoji giorno); `chiusoConPioggia` e `nota` dai negozi della sede quando concordano tutti, altrimenti in elenco;
   - dalle conferme di G-029 (Analisi dati `dati.md` §10.2, copia 0440Z), dove il luogo è ancora vuoto:
     - gabbie di battuta: solo di sera;
     - infermeria: di giorno, lunedì, martedì, mercoledì e venerdì;
     - negozio scolastico: di giorno;
     - venditore ambulante: già dal negozio, sera dal lunedì al venerdì, chiuso con la pioggia.
     Le condizioni di sblocco di questi luoghi sono in L6 §4.1;
   - nient'altro → NULL (regola dell'app).
4. **Eccezioni del negozio** (R5-12b; G-011, G-012, G-013, G-015), dall'`orari_json` di oggi del negozio, che è il dato della guida:
   `chiesa-kanda` → «solo domenica»; `super-muramasa` e `mran-mran` → «solo di giorno»; `fioraio-sukebe` → «solo di sera» = **4**. Il
   **Leblanc non ha eccezione**: «caffè e curry la sera, a locale chiuso» è un'**attività** (ambito 4, L9), non l'orario del negozio; il luogo
   `yongen-jaya/leblanc` resta «giorno e sera» (`quando` = entrambe: nessuna correzione, la proposta «→ giorno» decade). L'`orari_json` di oggi
   del negozio `leblanc` va nell'elenco per L9 (orari dell'attività caffè e curry). **Chiesa di Kanda (luogo)**: i giorni di oggi (`quando`
   sera, lunedì, mercoledì, sabato, domenica) sono la disponibilità di **Hifumi** (G-013, ambito 4) e **non** diventano orari del luogo:
   `orari_json` del luogo = NULL (regola dell'app, giorno e sera) e la sera di Hifumi va nell'elenco per L9 (le colonne di oggi restano fino a
   L11). **Untouchable (luogo)**, stesso caso (Analisi requisiti, 2026-10-20): `quando` sera e i giorni «giovedì, sabato, domenica (per il
   Confidente Iwai)» sono la disponibilità di **Iwai** (ambito 4; G-031: «Iwai va sul Confidente»), e la nota del negozio dice che l'apertura del
   negozio non è specificata dalla guida → `orari_json` del luogo = NULL (regola dell'app, giorno e sera), nessuna eccezione sul negozio, i giorni
   e la sera di Iwai nell'elenco per L9. **G-032 dell'Esperto**: la guida non dà un orario del negozio; la fonte inglese separa il negozio
   («After School») da Iwai («Evening»), certezza media. Quindi nessuna eccezione; lo sblocco del luogo resta `data{04-17}` (L6 §4.1). **Altri luoghi con orari legati a un Confidente** (copia 0503Z): Sala giochi di Akihabara (Shinya), Crossroads
   (Ohya), Chihaya stand, Cancello della Shujin (Makoto), Corridoio del 2° piano (Kawakami), Piazza della stazione di Shibuya e Ore no Beko
   (Yoshida), Jazz Jin (Akechi): **stessa regola** dove i giorni o la fascia sono del Confidente. La classificazione luogo per luogo l'hanno fatta
   Analisi dati e l'Esperto (`dati.md` §10.7, **G-033**), e la M5 la applica così:

   | Luogo | Esito | Orari che vanno a L9 o L7 |
   |---|---|---|
   | `shinjuku/crossroads` | **tiene** il suo orario: sera, tutti i giorni («il bar notturno») | — |
   | `kichijoji/jazz-jin` | **tiene** il suo orario: sera (3.000 yen); i weekend di trama in cui è chiuso restano una nota | — |
   | `shinjuku/chihaya-stand` | regola dell'app (giorno e sera) | Chihaya: sera, mar/gio/sab/dom, mai con la pioggia |
   | `shibuya/stazione-piazza-shibuya` | regola dell'app | Yoshida: domenica sera e festivi, non con la pioggia |
   | `akihabara/sala-giochi-akihabara` | regola dell'app | Shinya: giorno, lun/mar/gio/sab |
   | `shibuya/ore-no-beko` | regola dell'app | lavoro part-time solo di sera (L9, attività) |
   | `kichijoji/hagoromo` | regola dell'app | «domenica sera» va sul Katsu a pezzettoni (condizione dell'articolo, L7); `negozio.orari` diventa una nota. Certezza bassa, nell'elenco «Da rivedere» |
   | `shujin-academy/cancello-shujin` | **orario scolastico «giorno»** | Makoto: giorno, mar/gio/sab/dom, da completare in L9 (oggi ci sono solo le date di trama) |
   | `shujin-academy/corridoio-2-piano-shujin` | **orario scolastico «giorno»**: si corregge la sera di oggi | Kawakami: sera, ven/sab, al telefono del Leblanc (luogo del Confidente corretto in L9); il corridoio serve solo al primo incontro del 4/6 |

   In tutto 2 luoghi tengono il loro orario, 5 passano a «giorno e sera» e 2 all'orario scolastico «giorno». Sulla base 0503Z gli orari che
   vanno a L9 sono già in `confidente_disponibilita`, tranne i giorni di Makoto, quindi nessun dato si perde. Le colonne di oggi restano fino
   a L11. Verifica (R5-12b): dopo la M5 nessuno dei 9 luoghi (Untouchable compreso) porta l'orario del suo Confidente.
   **Clinica Takemi**: luogo aperto di giorno, tutti i giorni (dal luogo); il negozio non ha eccezione (stesso orario); «negozio dal 16/4»
   e «Tae dal 18/4» sono **sblocchi** (condizioni di L6), non orari. **Venditore ambulante**: la sua sede è solo lui, e l'assenza con la pioggia
   resta nell'orario del luogo (`chiusoConPioggia`, passo 3).
5. **Sede dei negozi** (R5-08): `prossimo-asso.sede_chiave = 'shibuya/prossimo-asso'` (il luogo esiste e lo cita: dedotto, elencato);
   Niijima, Tanaka, Home Shopping TV restano senza sede (elenco: proposta Tanaka e TV → `yongen-jaya/leblanc`, Niijima nessuna sede).
6. **Pin omonimi** (dati §4, §7.5): gli **11 pin seed** sulle illustrazioni dei quartieri senza aree (221 Harajuku, 222, 223, 224, 225,
   227, 228, 229, 231, 233, 234) prendono `riferimento_tipo='luogo'` verso il luogo dello stesso nome e quartiere: sono dati della guida,
   non lavoro dell'utente; cambio elencato e reversibile. **Nessun pin dell'utente** cambia (1769, 1584 e gli altri solo in elenco).
7. Log `info` con i conteggi; nessuna cancellazione.

### 1.3 Verifiche prima/dopo
| Misura | Atteso |
|---|---|
| luoghi | 93 (nessuno nuovo) |
| luoghi con area | **42**; da collocare 51 (13 con proposta) |
| luoghi con `orari_json` | quelli con `quando`/`giorni_json` (41/9, uniti) + 3 dai negozi, **esclusa la Chiesa di Kanda** (giorni di Hifumi); il resto NULL = regola dell'app |
| negozi con sede | **58**; senza sede 3 (in elenco) |
| eccezioni di orario | **4** (Chiesa di Kanda domenica, Super Muramasa e Mran Mran giorno, Fioraio Sukebe sera); Leblanc nessuna |
| verifiche R5-12b | Chiesa di Kanda (luogo) senza i giorni di Hifumi; Leblanc «giorno e sera»; Clinica Takemi di giorno; nessun valore copiato fra ambiti |
| divergenze di orario scheda/visore/quartiere | **0** (fonte unica: il luogo; le 2 eccezioni sono dichiarate e mostrate come tali) |
| pin del mondo | 298 con stessa mappa, x, y, condizioni, nome e descrizione in tabella; `riferimento` cambiato solo sui 11 seed del passo 6 |
| pin di luogo (riferimento `luogo`) | 54 + 11 = **65** |
| acquisti p1 / punti negozio | 7 / 0 invariati |
| impronta diario/Kamoshida/Madarame e impronta del mondo | identiche (mondo: salvo `riferimento` degli 11) |
| cestino | stesse righe; CHECK con `luogo`, `negozio` |
Idempotenza: seconda esecuzione 0 righe.

## 2. Presenza: una funzione, dal luogo (punti del PM, app.md §0.3-0.5, segnalazioni A e B)
Nuovo `server/services/luoghiService.ts` con `presenzaDelLuogo(luogo, st)` → `{ sbloccato: boolean | null; aperto: boolean | null;
testo: string }`:
- **sblocco**: le condizioni di oggi (`condizioni_json` della riga, ripiego `sblocco-luoghi`: `cittaService.ts:58-63, 76-85`), valutate come oggi;
  da L6 la **condizione effettiva** (`condizioneEffettiva`: condizioni salvate OR inviti dei Confidenti che aprono il luogo, R5-20e/R9-07c);
- **aperto**: `orari_json` (o, per un negozio, la sua eccezione; NULL = `ORARI_REGOLA_APP`) contro giorno della settimana, fascia e meteo della
  partita (`orariComeCondizioni` + il valutatore di oggi); null solo senza partita;
- **cosa vuol dire «chiuso»** (R5-20d), per la regola di navigazione qui sotto: (a) **non sbloccato** — un luogo o un ritrovo con un evento di
  sblocco (data, rango, lettura finita, invito del Confidente avvenuto) è chiuso finché l'evento non c'è; i **ritrovi multipli** (Jinbocho,
  Skytree, Jazz Club) restano chiusi e nascosti anche a quartiere aperto, finché la loro condizione (L6, inviti) non è vera; (b) **fuori orario**
  secondo il suo ambito di orario. Il **pin d'ingresso di un Palazzo** non è un luogo: è un passaggio e sparisce a Palazzo **concluso** (L4 §8.10,
  R4-22/25), non al 100%. Lo stato dei pin del mondo resta il loro (R4-09; NR4-1 di L4 non cambia nulla qui);
- **testo**: `descriviOrari` («Solo di sera, dal giovedì alla domenica») e lo stato («Aperto adesso» / «Chiuso adesso · apre giovedì sera»).
La usano **tutte** le viste: pagina del luogo, carte del quartiere e dell'area, popup e scheda del pin, sezione negozio, «Dove si trova».
Sostituisce `conNegozioVivo` (`mappeService.ts:334-344, 369`: orari del primo negozio della sede) e rende inutile
`applicaPresenzaAiLuoghi` (`presenzaEntita.ts:87-120`, mai chiamata in produzione: resta fino a L11 con il suo test).

**Comportamento del visore e della navigazione** (segnalazione A) — **decisione dell'utente** (2026-10-20): «luogo chiuso va nascosto dal menu
di navigazione». Un luogo **non sbloccato** o **chiuso in quel momento** resta **nascosto, come oggi**, ovunque si naviga: pin e cartellini del
visore, mete, luoghi vicini e «Luoghi qui» dell'area, selettori, elenchi del popup — niente stato «attenuato». «Mostra anche i non ancora
disponibili» resta come oggi. **Unica eccezione**: lo spillo chiesto **esplicitamente** dall'indirizzo (`?spillo=`, «Sulla mappa» del diario,
R10-28b): il visore lo mostra **evidenziato** anche se è chiuso, con «Non disponibile adesso» e il motivo (`presenza.testo`: «Chiuso adesso ·
apre stasera»), selezionato e centrato. Oggi Untouchable (pin 1517) sparisce il mercoledì e `?spillo=1517` non apre niente (app.md §0.5);
**dopo L5 Untouchable non chiude più**, perché i suoi giorni erano di Iwai (passo 4 del §1.2), quindi l'esempio di luogo chiuso diventa il
**Fioraio Sukebe** (pin 210, sull'illustrazione di Shinjuku: «solo di sera», orario della guida, nessun Confidente), chiuso di giorno.
Con l'eccezione il diario lo apre. La pagina del luogo e la carta del quartiere (che non sono navigazione ma consultazione) mostrano sempre il
luogo con il suo stato «Chiuso adesso».

**Nomi nella navigazione** (decisione dell'utente, stessa data): ogni voce di un menu o elenco di navigazione porta **il nome del posto**
(«Untouchable», «Café Leblanc», «Central Street»), mai «Mappa»/«Mappe» né il nome di un tipo, che si confonde con le mappe vere. Regole:
- un pin di **luogo** mostra il nome del luogo (§3.1, già così);
- un pin di **passaggio** mostra il **nome della destinazione dal vivo** (area, quartiere, Palazzo: dalla `casa` di L2), non il proprio `spillo.nome`
  (es. il pin 1628 dei Vicoli si chiama oggi «Mappa»: mostrerà «Yongen-Jaya»); il nome proprio del pin, se diverso, resta come `notaPin` (mai perso);
- titoli di sezione del visore e dei pannelli («Mappe figlie», «Planimetrie e mappe collegate», chip del tipo): con le parole di L0 e il nome del
  posto («Aree di Shibuya», «Su: Shibuya»);
- il censimento completo delle etichette di oggi lo fa Analisi app attuale (`lotti/L5/app.md`, sezione «Etichette di navigazione», richiesto il
  2026-10-20): ogni riga del censimento è un punto di modifica di questo lotto (luoghi) o di L2 (aree, quartieri: §4.6 di L2), con il test.

## 3. API e DTO

### 3.1 DTO (`shared/types.ts`, BE)
- `LuogoDto` (1420-1457): + `area: { slug: string; nome: string; casa: string } | null`, `orari: OrariNegozio | null`, `presenza:
  { sbloccato, aperto, testo }`, `casa: string` (`/guida/luogo/<quartiere>/<luogo>`), `pin: { spillo: number; mappa: string; casa: string } |
  null` (il primo per id), `altriPin: number` (doppio pin, R5-16). `negozi` resta (tutti); `negozio` resta per compatibilità (= `negozi[0]`),
  nessuna vista nuova lo legge; `giorni`/`giorniTesto`/`quando` restano nel DTO **derivati da `orari`** (una fonte); `marcatore` tolto
  (nessun lettore FE: app.md §4).
- `LuogoDettaglioDto extends LuogoDto` (nuovo): `quartiereNome`, `listini: NegozioDettaglioDto[]` (uno per negozio della sede, con articoli
  e acquisti della partita come oggi), `attivitaDettaglio: AttivitaDto[]`, `confidentiDettaglio` (nome, arcano, link), `pins: Array<{ spillo,
  mappa, casa, notaPin: string | null }>`, `origine`, `modificato` (seed corretto), `vociDiario?` no (fuori perimetro).
- `NegozioRiassuntoDto` (1290-1313): + `sedeCasa: string | null`, `eccezioneOrari: OrariNegozio | null`; `orariStrutturati`/`orariTesto`/
  `disponibilita` = **quelli della sede** (più l'eccezione se c'è), non più della colonna del negozio; `luogo` (frase) resta nel DTO ma nessuna
  vista la mostra (R5-06: si mostra «Quartiere › Area › Luogo» dalla sede).
- `SpilloDto` (2123-2168): per i pin con riferimento `luogo` (o `negozio` con sede): `nome` e `descrizione` = quelli del luogo; nuovo
  `notaPin: string | null` = descrizione propria del pin **se diversa** e non vuota (dubbio 8: mai persa, mostrata come nota del pin finché
  l'utente non la sposta o la toglie); `presenza` (§2).
- `DettaglioSpilloDto` (2068-2078) `luogo`: + `orariTesto`, `presenza`, `casa`; `negozio`: + `sedeCasa`.
- `QuartiereDettaglioDto`: `luoghiDaCollocare: LuogoDto[]` (senza area, nel quartiere); `AreaDettaglioDto` (L2): `luoghi: LuogoDto[]` (con
  `area_chiave` = l'area) e `daPosizionare: LuogoDto[]` (dell'area, senza pin).
- `TipoCestino` (2552): + `'luogo' | 'negozio'`.

### 3.2 Rotte
| Metodo e percorso | Effetto |
|---|---|
| `GET /api/compendio/luoghi/:quartiere/:luogo?partita=` | `LuogoDettaglioDto` (404 `luogo-non-trovato`) |
| `POST /api/luoghi/posiziona` `{ luogo?: chiave; nuovo?: { nome, tipo, cosaOffre, orari? }; mappa; x; y }` | crea (se `nuovo`) il luogo nel quartiere della planimetria, il **pin collegato** (riferimento `luogo`, tipo dal catalogo dei tipi) e imposta `area_chiave` all'area della planimetria; una transazione (R5-18). 409 se il luogo ha già un pin su quella planimetria |
| `PUT /api/luoghi/:quartiere/:luogo/area` `{ area: slug \| null }` | colloca il luogo in un'area del suo quartiere («da collocare») |
| `PUT /api/catalogo/luogo/:chiave` (esistente, `catalogo.ts:64`) | campi in più: `orari` (struttura), `area`; i campi oggi mancanti dell'utente (`catalogoService.ts:38`): `sblocco`, `confidenti`, `piatti` (R5-07, un modulo solo); «Ripristina» da `seed_json` come oggi |
| `PUT /api/catalogo/negozio/:chiave` | campo `eccezioneOrari`; gli orari propri del negozio non si scrivono più |
| `DELETE /api/catalogo/luogo/:chiave?conferma=1`, `…/negozio/:chiave?conferma=1` | **cestino** tipi `luogo`/`negozio` (R5-21, punto del PM): senza conferma e con contenuti → 409 `luogo-con-contenuti`/`negozio-con-acquisti` con il riepilogo (pin, negozi della sede, attività, acquisti nelle partite); con conferma → `conCestino`: luogo con i suoi pin (e le loro immagini/stati), `sede_chiave` dei negozi a NULL, attività con sede a NULL; negozio con articoli, **acquisti e punti della partita** (righe del file delle partite, che il cestino registra già: niente più orfani, segnalazione E). Le righe della guida restano anche «Nascondi» come oggi (pagina Rimossi) |
| `POST /api/catalogo/:tipo/:chiave/ripristina` (nuova, per tutti i tipi del catalogo) | **«Ripristina i valori della guida»**: rimette `seed_json` sulla riga (il corpo di oggi di `eliminaElemento`, `catalogoService.ts:331-350`, spostato in `ripristinaElemento`); 400 `riga-del-seed` se la riga non è stata corretta, 400 `creata-da-te` se è dell'utente (non c'è un valore della guida). Non elimina mai |
| **Eliminare e ripristinare un luogo o un negozio: due gesti, due rotte** (domanda di Test funzionali, 2026-10-20) | Oggi `DELETE /api/catalogo/:tipo/:chiave` fa due cose diverse secondo la riga (elimina una riga dell'utente, ripristina una riga della guida corretta: `catalogoService.ts:321-351`). Per `luogo` e `negozio` da L5 **`DELETE` elimina e basta** (cestino, riga sopra), per le righe della guida (corrette o no) e per quelle dell'utente; **«Ripristina»** passa da `POST …/ripristina`. Un luogo della guida corretto: «Ripristina» → `POST /api/catalogo/luogo/<k>/ripristina`; «Elimina» → `DELETE /api/catalogo/luogo/<k>?conferma=1` (cestino, rimettibile). Per gli **altri tipi** `DELETE` resta com'è (compatibilità) fino a L11, che porta tutti a `correggi`/`ripristina` (L11 §4); il FE usa già `POST …/ripristina` per «Ripristina» su tutti i tipi. «Nascondi» (pagina Rimossi) resta per chi vuole solo non vedere una riga della guida |
| `GET /api/compendio/negozi/:chiave` (esistente) | invariato + `sedeCasa` (serve al redirect) |
Errori nuovi in italiano; OpenAPI: `server/openapi/descrizioni/compendio.ts`, `catalogo.ts`, nuova `luoghi.ts`.

### 3.3 Servizi (BE)
- `luoghiService.ts` (nuovo): `presenzaDelLuogo`, `dettaglioLuogo`, `posizionaLuogo`, `collocaLuogo`, eliminazione con cestino e
  `registraRipristinoCestino('luogo'|'negozio', …)`.
- `cittaService.ts`: `luogoDto` (56-74) con `orari`, `presenza`, `area`, `pin`, `casa`; niente `marcatore_luogo` (137); `dettaglioQuartiere`
  con `luoghiDaCollocare`.
- `negoziService.ts`: `riassunto` (48-59) e `dettaglioNegozio` (109-121) con orari della sede + eccezione; `disponibilitaArticolo` (64-68:
  `daNegozio`) con la presenza della sede.
- `mappeService.ts`: `dettaglioRiferimento` (175-220) — luogo con **tutti** i negozi della sede (via `LIMIT 1`/`negozi[0]` di 197, punto del PM),
  presenza e casa; negozio con `sedeCasa`; `dettagliSpillo` (353-384) con nome/descrizione dal luogo, `notaPin`, `presenza` (al posto di
  `conNegozioVivo` 334-344, 369); `cercaRiferimenti` (1437-1462) con «Quartiere › Area › Luogo».
- `catalogoService.ts`: campi 32-41 (orari, area, sblocco, confidenti, piatti), `normalizzaScrittura` 176-181, `staccaDalleMappe` 308-315 (anche
  i pin `luogo`), `eliminaElemento` 321-351 (cestino per luogo e negozio).
- `areeService.ts` (L2): `luoghi` e `daPosizionare` dell'area; `elementi` dell'area con i nomi dal luogo.
- `accessoMondoService.ts` (73-76, 110-112, 150-155): destinazione = pin del luogo (o della sede del negozio), nome dal luogo.
- `azioniStrutturateService.ts:52-56` (`mappaAzione` di un negozio): invariato nella scelta del pin (stesso punto del diario, R5-24).
- `presenzaEntita.ts:96` (`negozi[0]`): non più usata dalle viste (L11).

## 4. Interfaccia

### 4.1 Pagina del luogo `/guida/luogo/:quartiere/:luogo` (`src/pages/LuogoPage.tsx`, nuova) — R5-09, R5-14, R5-17, R5-29, R5-30, R5-33
- **Intestazione** (prima schermata anche a 1366×657 e 1280×689): briciole «La città › Shibuya › Central Street › Untouchable» (area da L2, o
  quartiere se il luogo è «da collocare»), nome, chip del tipo con colore e icona (come la carta di oggi, `QuartierePage.tsx:62-63`), badge
  **«Aperto adesso» / «Chiuso adesso»** con `presenza.testo`, «Non ancora nel mondo» con i requisiti mancanti (come oggi 57-58, 65), «da fonte
  secondaria» (68); azioni «Modifica», «Dove si trova», menu (Elimina, Ripristina).
- **Orari** (riga sotto il nome): `descriviOrari`; con `origine = 'regola-app'` «Giorno e sera · regola dell'app: la guida non indica orari»;
  con eccezioni dei negozi, una riga per negozio: «Chiesa di Kanda (negozio): solo la domenica», «Super Muramasa: solo di giorno». Gli orari
  dei Confidenti e delle attività (Hifumi, caffè e curry al Leblanc) non compaiono qui: stanno nelle loro pagine (L9).
- **Sblocco** (R5-20e): se il luogo non è ancora aperto, il testo è generato dalla condizione effettiva con la descrizione unica delle
  condizioni (`nomiCondizioni`, L6): «Si apre dopo l'invito di Ryuji», «dal 16/4», «con Ann al rango 7»; mai frasi scritte a mano.
- **Negozi** (una sezione per negozio della sede, ancora `#negozio-<chiave>`): il listino com'è oggi in `NegozioPage` (filtri, articoli, prezzi,
  acquisto, «Mostra anche gli articoli non ancora in vendita», quiz della sede, programma punti), estratto in `src/components/negozi/ListinoNegozio.tsx`
  e riusato qui (D5). Su desktop listino a più colonne, su telefono colonna piena; nessuna area scorrevole annidata (il listino cresce con la pagina).
- **Confidenti**, **Attività** (link alle loro pagine di oggi), **Piatti** (tabella di oggi, 82-89), **Note**.
- **Dove si trova** (R5-14): `MappaIncorporata` sulla planimetria del pin con `spilloIniziale`, «Apri l'area» (casa dell'area con `?spillo=`).
  **Il pin del luogo si vede sempre** (domanda di Test UX, 2026-10-20): è lo **spillo chiesto esplicitamente** (§2, unica eccezione alla regola
  dei luoghi chiusi), quindi, se il luogo è chiuso o non ancora sbloccato (il Fioraio Sukebe di giorno), il pin compare **evidenziato** con «Non
  disponibile adesso» e il motivo, selezionato e centrato. Gli **altri** luoghi chiusi della stessa planimetria restano nascosti come nel
  visore. «Apri l'area» porta `?spillo=` e conserva lo stesso comportamento. Test: il Fioraio Sukebe in una fascia di giorno nella sua pagina → pin
  visibile ed evidenziato;
  doppio pin: «Questo luogo ha 2 pin» con i due collegamenti (R5-16); senza pin: «Non ancora posizionato» con «Posiziona» (finestra §4.4).
- **Modifica**: `ModuloLuogo` (`src/components/guida/moduli/ModuloLuogo.tsx:24-48`, definizione `definizioni.ts:142-152`) con l'editor degli
  orari strutturati (lo stesso di `ModuloNegozio.tsx:77-122` spostato in `CampoOrari.tsx`), area (del quartiere), sblocco, Confidenti, piatti.
- Formati: ≥1280 due colonne (intestazione+orari+negozi | dove si trova+Confidenti+attività), 768–1279 una colonna larga con «Dove si trova»
  dopo l'intestazione, <768 colonna unica con il badge aperto/chiuso nella prima riga.

### 4.2 Redirect e link (R5-10, R5-17)
- `guida/negozi/:chiave` (`NegozioPage`): se il negozio ha sede → `<Navigate replace to="<sedeCasa>#negozio-<chiave>">`; senza sede (Niijima,
  Tanaka, TV) la pagina di oggi resta, con «Dove» in prosa (nessun link rotto, dubbio 5). `guida/negozi` (`NegoziPage`): resta l'elenco con
  ricerca; «Dove» = sede (Quartiere › Area › Luogo) dal vivo; ogni riga porta alla sezione nella pagina del luogo.
- Funzione unica `urlLuogo(chiave)` in `src/utils/citta.ts` (accanto ad `ancoraLuogo`, che resta per gli indirizzi vecchi): QuartierePage (carte
  → pagina del luogo; le ancore `#luogo-…` restano sulle carte per i link salvati), `NegozioPage:80`, `AttivitaPage:79`, `LibriPage:131,138`,
  `FilmPage:181`, `VideogiochiPage:97,182`, `ConfidenteDettaglioPage:125` (i luoghi con il Confidente in `confidenti_json`, con link; la frase
  resta finché c'è, L9), `ProgressiPartita.tsx:89,166`, `OggettiPage.tsx:76,99,223`, `sezioniGuida.tsx:35`, `utils/accessoMondo.ts:21`
  (`schedaAccessoMondo('luogo')` → pagina del luogo), `utils/percorso.ts:43,50` (diario → negozio: passa dal redirect; R5-24, R5-29 un tocco).
- **Lettori nuovi venuti da L2** (Analisi app `app.md` §11, 2026-10-20):
  - **«Luoghi qui»** della pagina Area (`AreaPage.tsx:246-260`): il collegamento «Scheda» di un luogo (`AreaPage.tsx:45`, oggi
    `/guida/citta/<q>#luogo-…` «fino a L5») e di un negozio con sede (oggi `/guida/negozi/<k>`) vanno a `urlLuogo` (con `#negozio-<k>` per il
    negozio). Il nome resta quello letto dal vivo (`NOMI_ELEMENTI`). Lo stato aperto o chiuso arriva da `presenzaDelLuogo` (DTO `elementi[].presenza`).
  - **Popup e scheda del pin di un luogo** (`VisoreMappa.tsx:952`, `:1228`): il collegamento va alla pagina del luogo (oggi
    `/guida/citta/<q>` senza ancora) e il testo «scheda del quartiere» diventa il **nome del luogo** (riga T5).
  - **Il pin di un luogo mostra il nome del luogo** (§3.1, `SpilloDto.nome` dal luogo, nota del pin se diversa). Caso di prova: il pin
    «Cinema» di Central Street → «Videonoleggio Scarlet», con «Pin: «Cinema»» come nota.
- **Luogo chiuso: una regola sola per il visore e per «Luoghi qui»** (§2; Analisi app §11.1: oggi «Luoghi qui» rivela a richiesta il pin
  che il visore nasconde, UX2-2, `AreaPage.tsx:118-124`):
  - «Luoghi qui» è un elenco di navigazione: segue la decisione dell'utente e **non elenca** i luoghi chiusi o non sbloccati, come il visore
    (`VisoreMappa.tsx:226/540/583`), per costruzione con la stessa `presenzaDelLuogo` dal server;
  - l'interruttore «Mostra anche i non ancora disponibili» del visore vale **anche** per «Luoghi qui». Acceso, le voci chiuse compaiono
    attenuate con il motivo («Chiuso il mercoledì · apre giovedì sera»), e il tocco mostra il pin **evidenziato** «Non disponibile adesso»,
    come lo spillo chiesto con `?spillo=` (§2, unica eccezione);
  - così un luogo non è più «nell'elenco ma non sulla mappa» (oggi Untouchable al 06-01): è assente da entrambi, o presente in entrambi con
    l'interruttore.
  - Test: Central Street e un'area con il Fioraio o un altro luogo a orario vero, in una fascia di chiusura, con l'interruttore spento e
    acceso, e lo stesso numero di voci (i «21 su 24» di oggi cambiano dopo la M5, perché Untouchable non chiude più: rimisurare)
    in «Luoghi qui».
- **Pin agganciati a negozi di un altro quartiere** (Analisi app §11.1; §7.6): in «Luoghi qui» di Central Street compaiono «Distributore del
  cancello» ×2 e «Distributore Edificio Scolastico», negozi della Shujin, per i pin 1768, 1769 e 1527 (anche al Tornello di Ginza e ai Vicoli).
  Nessun pin dell'utente cambia senza il suo sì. Finché non decide:
  - «Luoghi qui» mostra queste voci col nome del **pin** e il chip «Da rivedere · negozio di un altro quartiere», e il tocco porta al negozio;
  - le coppie pin → negozio entrano nell'elenco unico «Da rivedere» (L11 R11-10c) con i gesti «Collega al luogo <proposta>», «Tieni» e
    «Scollega». 1527 e 1768, che G-014 dà per coerenti come set di distributori condivisi, passano col set di L7 (`negozio_luogo_extra`)
    e allora mostrano il nome del set senza chip.
- Visore (`VisoreMappa.tsx`): popup (864-911) e scheda (1106-1158) con nome, descrizione, orari e presenza del luogo; «scheda del negozio» →
  sezione nella pagina del luogo; «scheda del quartiere» → «pagina del luogo» (luogo) o del quartiere (altri); `notaPin` in piccolo come
  «Nota del pin»; la riga «cosaOffre solo se diverso» (1151) sparisce (non c'è più doppione).

### 4.3 Quartiere e Area (L2)
- Carte dei luoghi del quartiere (`QuartierePage.tsx:53-95`): orari e presenza dalla funzione unica (§2), «Articoli in vendita» → sezione del
  **primo** negozio con il numero «· 3 negozi» se più d'uno (punto del PM: tutti visibili nella pagina del luogo).
- Sezione richiudibile **«Luoghi da collocare (N)»** nella pagina del quartiere, con «Colloca» (area del quartiere; la proposta dei 13
  preselezionata come suggerimento, non salvata finché non si conferma).
- Pagina dell'Area: «Luoghi qui» (L2) con i luoghi dell'area e la loro presenza; **«Aggiungi luogo»** e **«Da posizionare (N)»**.

### 4.4 Finestre
- **«Aggiungi luogo»** (dall'Area, o dal visore della planimetria): passo 1 «Un luogo che esiste» (ricerca fra i luoghi del quartiere,
  `SceltaLuogo.tsx:32-54`) o «Nuovo luogo» (nome, tipo, cosa offre, orari); passo 2 tocco sul punto della planimetria (piena risoluzione,
  come la finestra d'ingresso di L2); salva con `POST /api/luoghi/posiziona`. «Posiziona» dei luoghi senza pin = solo il passo 2.
- **«Elimina luogo/negozio»**: conferma con il riepilogo del 409 («2 pin, 1 negozio con 14 articoli, 3 acquisti nella partita Roberto»),
  «Va nel cestino».
- **Editor delle mappe** (`EditorMappaPage.tsx:609-611, 657, 665`, `CollegamentoCitta` 536, 556-573, 668): per un pin con riferimento `luogo`
  i campi nome e descrizione diventano «Nome e descrizione vengono dal luogo · Modifica il luogo» (link) più la `notaPin` con «Togli la nota»
  (svuota `spillo.descrizione`) e «Sposta nel luogo» (copia nelle note del luogo, poi svuota: due gesti espliciti, mai automatici).

### 4.4c Home: niente riquadro chiuso (LAY5-1, **decisione del PM, 2026-10-20**)
**Difetto**, che c'era già prima di L5 (Test layout). Nella Home (`/`) la sezione «Oggi» (`src/pages/HomePage.tsx:136-139`, `div.flex-1
min-h-0 riempi-figli` con `OggiGuida riempi`) è un riquadro scorrevole che a 1366×657 è alto **10 px**, a 1024×690 **92 px** e a 1280×689
**189 px**, con 1204–1767 px di contenuto. In pratica è chiuso, e intanto scorre anche la pagina: due barre insieme, contro la regola
dell'utente sugli scroll annidati. È lo stesso schema del listino del negozio (§4.1: «nessuna area scorrevole annidata»), quindi si corregge
nello stesso lotto e con la stessa regola.

**Regola: una sola barra.** O la pagina scorre e il contenuto cresce con lei, oppure c'è un'area interna evidente e abbastanza alta. Mai
tutte e due.
- **Altezze realistiche e telefono** (finestra alta meno di 800 px, e sempre sotto i 768 px di larghezza): la Home **scorre come pagina**.
  - «Oggi» perde `min-h-0`/`riempi` e cresce con il suo contenuto (`OggiGuida` senza `riempi`).
  - La mappa di «Oggi» (`home-mappa`, `OggiMappa riempi`) ha un'altezza propria, `min(60dvh, 520px)`, ed è `sticky` in alto da 1024 px,
    così resta in vista mentre si legge la guida.
  - Nessun contenitore della Home ha `overflow: auto`.
- **Finestre alte** (≥ 800 px e ≥ 1024 px di larghezza): resta la disposizione «riempi», ma con garanzia di altezza.
  - La sezione «Oggi» ha `min-height: 400px`; se l'intestazione la spingerebbe sotto, si passa alla disposizione a pagina (regola
    `@media (min-height: 800px)` in `src/tailwind.css`, mai una classe interpolata).
  - L'area scorrevole ha il confine evidente (bordo e sfumatura) e `overscroll-behavior: contain`.
  - La pagina non scorre: `main` ha `scrollHeight == clientHeight`.
- La linguetta «Mappa» e la mappa a scomparsa (`home-mappa--a-scomparsa`) restano come sono, col nome del posto (riga M1 del §4.4b).

**Criterio misurabile** (Test layout, LAY5-1):
- A 1366×657, 1280×689 e 1024×690 la Home non ha nessun riquadro scorrevole alto meno di 200 px: il contenuto di «Oggi» si legge con la
  sola barra della pagina.
- A 1920×1080 e 1440×900, se c'è l'area interna, è alta almeno 400 px e la pagina non scorre.
- A 768 e 375 la Home scorre come pagina.
- Mai due barre di scorrimento verticali insieme. La misura si prende dal DOM: per ogni elemento con `overflow-y: auto|scroll`,
  `clientHeight ≥ 200` oppure assente, più `main.scrollHeight`.

### 4.4b Etichette di navigazione (decisione dell'utente; censimento di Analisi app, `app.md` §10)
**Regola unica**: il gesto di navigazione porta **il nome della destinazione**, letto dal posto (`casa` di L2, luogo di L5) con una funzione sola
`nomeDellaMeta(destinazione)` in `src/utils/navigazioneMappa.ts`; «Mappa» resta solo nome tecnico (editor e immagini). I pin di passaggio (229, solo
48 col nome della meta) mostrano il nome della meta dal vivo in etichetta, elenco e scheda del visore (`VisoreMappa.tsx:860, 774, 966, 1123`); il nome
proprio del pin, se diverso, è la nota del pin (mai perso: «Piano 2», «Banchina Metro», «Scelta Stazione», «Yongen-Java», «Mappa» del 1628, nei
Palazzi «Uscita» 515/734, «Passaggio» 578, «Piano 2» 1866). Riparto delle righe del censimento (ognuna è un punto di modifica e un caso di test):
| Righe | Lotto | Testo nuovo |
|---|---|---|
| M6, M7, M10, M12, M16, M18, M18b, M18c, M19, M20, M21, T1, T2, T3, T4, T7 | **L2** (pagine Quartiere e Area, visore, indice, ingresso) | «Apri Shibuya» / «Apri Tokyo»; «N aree» / «N planimetrie»; «Apri Central Street»; «Aree di Shibuya»; «Aree vicine»; «Area d'ingresso»; l'area mostrata; il chip dice «Planimetria» solo per le planimetrie (regola di L2 §4.6); T4 «Scheda del quartiere» → «Shibuya» |
| M15 | **L3** | il pulsante sparisce (L3 §4.1) |
| M8, M11, M17 | **L2** | titolo del browser «Central Street — Shibuya»; errore con il **nome** del posto, mai la chiave interna («Central Street non disponibile»); alt «Planimetria di Central Street» |
| M9 | **L2** (scelta di Stesura) | «Modifica mappa» → **«Modifica planimetria»** (modifica davvero immagine e pin della planimetria mostrata) |
| M13, M14, T9 | **L2** | «Tutte le mappe» → «La città»; «Mappa: <nome>» → «<Livello>: <nome>» con le parole di L0 («Area: Central Street») |
| M22, M23, M24, M25, T5, 10.3 | **L5** (questo lotto) | «Apri sull'atlante» → «Apri in Central Street» (R5-20c esteso: «Apri in <posto>», il posto è l'area della planimetria del pin, aperta sullo spillo); «Sulla mappa» del diario (75 voci) e di Oggetti → il nome del posto del pin («Clinica Takemi», «Central Street»), con l'icona del pin; «Posizione» → il nome della sede; popup «scheda del quartiere/negozio» → «Shibuya», «Untouchable»; pin di passaggio come sopra |
| UX2-11 (segnalato da Test UX in L2, aggiunto il 2026-10-20) | **L5** | «Dove si trova» della scheda di un **negozio** (e di ogni scheda che usa `DoveSiTrova`: luogo, attività, libro, film): «Apri sull'atlante» (`src/components/mappe/DoveSiTrova.tsx:113`, nome del vecchio visore) → **«Apri in <posto>»** (R5-20c esteso, requisiti riletti il 2026-10-20): il posto è l'**area** che contiene il pin, aperta sullo spillo (Untouchable → «Apri in Central Street» → `/guida/citta/shibuya/central-street?spillo=1517`), con `nomeDellaMeta`; stesso punto di modifica di M22, una sola correzione in `DoveSiTrova` per tutte le schede. Test: scheda di Untouchable, di un'attività e di un libro, nessun «atlante» nei testi visibili dell'app (la parola resta solo nei commenti del codice). Altri testi visibili con «atlante» oggi, nei
Palazzi: `PlanimetriePalazzo.tsx:256` («Ordine bloccato: l'atlante non è ancora caricato»), `:354` (suggerimento «Le tavole dell'atlante…»),
`:365-366` (avvisi di caricamento), `DungeonDettaglioPage.tsx:446` (suggerimento «Le tavole dell'atlante del Palazzo…»); L3 sostituisce
`PlanimetriePalazzo` e la colonna della scheda: quelli che restano dopo L3 si correggono qui con «planimetrie» / «elenco delle aree» («Ordine
bloccato: l'elenco delle aree non è ancora caricato») |
| T6 | **L9** | link rotto `/confidenti` (pagina dei Confidenti), `VisoreMappa.tsx:949`: va alla pagina del Confidente (`/guida/confidenti/<k>`) |
| **Stato sul codice di oggi** (Analisi app `app.md` §11.2, 2026-10-20) | — | Risolte da L2: M6, M10, M11, M12, M13, M17, M18b, M19, M20, M21, T4 e i pin di passaggio. Risolta da L3: M15. **Restano**, nei lotti indicati in questa tabella: M1 (`HomePage.tsx:143`), M2 (`OggiMappa.tsx:62`), M4 (`MappaPage.tsx:118`, L11), M5 («N mappe», `MappaPage.tsx:150`, L11), M9, M14 (`accessoMondo.ts:46`: in L5 il nome del posto), M22, M23 (`PartiAzione.tsx:55-56`), M24 (`OggettiPage.tsx:76, 99`), M25, M27 e M29 (L11), T5 (`VisoreMappa.tsx:1228`), T6 (L9). T1 non c'è più nelle viste di mondo e Palazzi |
| M9 «Modifica mappa» (`MappaPage.tsx:279, 431`) | **L5** | decisa in L2 (scelta di Stesura): **«Modifica planimetria»**, come già `MappaIncorporata.tsx:153`; per un'illustrazione di quartiere o città «Modifica illustrazione» |
| M1, M2, M26, M28 | **L5** | M1 linguetta della Home: il nome del posto mostrato («Tokyo», «Shibuya»…); M2 didascalia «Central Street — azione scelta»; M26 e M28 restano (nominano Tokyo) |
| M27, M29 | **L11** (testi tecnici) | editor: «Planimetria», «Area», «Arrivo: <nome>»; «Mappe scaricate» → «Planimetrie e illustrazioni» |
| M3, M4, M5 | **L11** (indice come albero) | — |
Test (funzionali/UX di L2 e L5): per ogni riga assegnata, il testo dopo; nessuna voce di navigazione chiamata «Mappa»/«Mappe» né con il tipo al posto
del nome; i pin di passaggio con il nome della meta e la nota con quello di prima.

### 4.5 Testi
«Aperto adesso» · «Chiuso adesso · apre <giorni/fascia>» · «Orari non indicati» · «Solo di sera, dal giovedì alla domenica» (da `descriviOrari`) ·
«Il negozio <nome>: <orari>» · «Negozi qui» · «Dove si trova» · «Apri l'area» · «Questo luogo ha 2 pin» · «Non ancora posizionato» · «Posiziona» ·
«Luoghi da collocare» · «Colloca» · «Da posizionare» · «Aggiungi luogo» · «Un luogo che esiste» · «Nuovo luogo» · «Nota del pin» · «Togli la
nota» · «Sposta nel luogo» · «Nome e descrizione vengono dal luogo» · «Modifica il luogo» · «Va nel cestino: si può rimettere da Impostazioni ›
Cestino». Vocabolario L0: «Luogo» solo per l'attività, «Negozio» per il listino.

## 5. File e ordine (senza sovrapposizioni)
**BE**: 1. `shared/types.ts` (DTO §3.1, `TipoCestino`); 2. migrazione M5 + test + `index.ts`; 3. `server/services/luoghiService.ts` (nuovo),
`cittaService.ts`, `negoziService.ts`, `mappeService.ts`, `catalogoService.ts`, `cestinoService.ts` (`RADICE` 58-63 con `luogo`→`luogo.chiave`,
`negozio`→`negozio.chiave`, `ETICHETTE`), `areeService.ts`, `accessoMondoService.ts`; 4. `server/schemas/catalogo.ts` (`datiLuogo` 214-225,
`datiNegozio` 60-73), schemi nuovi `luoghi.ts`; `server/routes/compendio.ts` (luogo), `catalogo.ts` (DELETE con conferma), `luoghi.ts` (nuova,
in `ROUTER_DI_AREA`); 5. OpenAPI; 6. test BE; typecheck, lint.
**FE**: 1. `src/services/api` (luoghi); `src/utils/citta.ts` (`urlLuogo`); `src/utils/cestino.ts` (`NOME_TIPO_CESTINO` 16-21 con «Luogo», «Negozio»);
2. `src/router.tsx` (`guida/luogo/:quartiere/:luogo`); `src/pages/LuogoPage.tsx` (nuova), `NegozioPage.tsx` (redirect + resto), `NegoziPage.tsx`,
`QuartierePage.tsx`, `AreaPage.tsx` (L2), `AttivitaPage.tsx`, `LibriPage.tsx`, `FilmPage.tsx`, `VideogiochiPage.tsx`, `ConfidenteDettaglioPage.tsx`,
`OggettiPage.tsx`, `EditorMappaPage.tsx`; 3. componenti: `negozi/ListinoNegozio.tsx` (estratto), `guida/moduli/CampoOrari.tsx` (estratto),
`ModuloLuogo.tsx`, `ModuloNegozio.tsx`, `mappe/VisoreMappa.tsx`, `mappe/DoveSiTrova.tsx`, `mappe/FinestraAggiungiLuogo.tsx` (nuova),
`partita/ProgressiPartita.tsx`, `guida/sezioniGuida.tsx`; `src/utils/accessoMondo.ts`, `percorso.ts`; 4. stili; 5. test FE; typecheck, lint.

## 6. Piano dei test
### 6.1 BE (mirati)
1. Migrazione M5 su copia ridotta con i casi reali (Untouchable, Leblanc, Chiesa di Kanda, i 3 «luogo vuoto», un luogo con 6 negozi, prossimo-asso,
   gli 11 pin omonimi, un pin utente → negozio di un altro quartiere): conteggi del §1.3, idempotenza, nessun pin utente cambiato, cestino ricreato.
2. `presenzaDelLuogo`: giorni/fasce/pioggia contro partita; NULL = nessuno stato; non sbloccato vs chiuso; eccezione del negozio.
3. Le tre viste concordi (R5-04): per ogni luogo con orari, `GET /citta/:q` (carta), `GET /luoghi/:q/:l` (pagina), `GET /mappe/:k` (popup
   del pin) danno lo stesso `presenza.testo` e `aperto` (test che li confronta tutti: 0 divergenze).
4. Pin di luogo: nome e descrizione dal luogo; `notaPin` sui 38 diversi; rinominare il luogo cambia il pin (R5-03).
5. Visore: pin del Fioraio Sukebe (210) in una fascia di giorno **nascosto** nella mappa e nei menu; con `?spillo=210` **mostrato evidenziato** con «Non
   disponibile adesso» e il motivo; un luogo non sbloccato nascosto come oggi e, chiesto con `?spillo=`, mostrato con il motivo dello sblocco.
   Untouchable (1517) dopo la M5 è sempre aperto (regola dell'app; giorni di Iwai a L9): `?spillo=1517` lo apre normalmente, senza «Non
   disponibile».
   Pin di passaggio con il nome della destinazione (1628 → «Yongen-Jaya»), `notaPin` col nome di prima; nessuna etichetta «Mappa» nelle risposte
   delle API di navigazione (test sulle righe del censimento di Analisi app).
6. Luogo con più negozi: `dettaglioRiferimento` e la pagina con tutti i negozi.
7. `POST /api/luoghi/posiziona` (esistente e nuovo; area impostata; 409 se già sulla planimetria); `PUT …/area`.
8. Cestino: elimina luogo (pin, sedi, attività) e negozio (articoli, acquisti e punti nelle partite) con 409 senza conferma; ripristino completo.
9. Redirect: `GET /api/compendio/negozi/untouchable` → `sedeCasa`; negozi senza sede → null.
10. Test esistenti da allineare (attese cambiate, non cancellati): `negozi.test.ts`, `negozio-del-pin.test.ts`, `catalogo.test.ts` (87:
    l'eliminazione ora va nel cestino), `struttura-server.test.ts` (25, 74, 116), `citta.test.ts`, `attivita-mappa.test.ts:15`, `piante-citta.test.ts`
    (39: `marcatore_luogo` non più letto), `accesso-mondo.test.ts`, `libri.test.ts`, `film.test.ts`, `cestino.test.ts`, `mappe-editor.test.ts:264-273`,
    `visibilitaCondizionale.test.ts`.
### 6.2 FE (mirati)
`LuogoPage.test.tsx` (nuovo: intestazione, aperto/chiuso, negozi tutti, eccezione, dove si trova, doppio pin, senza pin); `NegozioPage.test.tsx`
(redirect con ancora; senza sede invariata; 127: niente più `#luogo-`); `NegoziPage.test.tsx` («Dove» dalla sede); `CittaPage.test.tsx` (201-238,
216: «Articoli in vendita» → pagina del luogo); `VisoreMappa.test.tsx` (85-100, 131: popup con orari del luogo, nota del pin); `DoveSiTrova.test.tsx`;
`AttivitaPage.test.tsx`; `ModuloLuogo.test.tsx` (orari strutturati); `FinestraAggiungiLuogo.test.tsx` (nuovo); `EditorMappaPage.test.tsx:94-104`
(pin di luogo); `LibriPage.test.tsx:68`, `VideogiochiPage.test.tsx:76`, `AccessoMondoPage.test.tsx:52-55`, `SchedaAttivita.test.tsx:11`.
### 6.3 Funzionali
- R5-04 / «fatto quando»: per tutti i luoghi con orari, pagina, carta del quartiere e popup del pin dicono la stessa cosa (elenco luogo per luogo,
  partita 1 al 06-01 e in un giorno di apertura); Leblanc e Chiesa di Kanda con l'eccezione mostrata.
- R5-15: dopo la migrazione ogni pin della città non di passaggio ha un luogo (diretto o tramite la sede del negozio) oppure sta nell'elenco
  approvabile; mai cancellato.
- Percorsi U1–U9 di app.md §2 prima/dopo (U2 → sezione del negozio; U4 → pagina del luogo; U6 → un luogo con orario vero della guida (Fioraio
  Sukebe di giorno) resta nascosto nella mappa e nei menu, come oggi; Untouchable invece il 06-01, un mercoledì, è **aperto e nei menu** (regola
  dell'app, G-032: i giorni erano di Iwai; sblocco dal 17/4, L6); U7 «Sulla mappa» delle 18 voci negozio del diario validato: stesso pin; quelle
  il cui luogo è chiuso in quel momento (rimisurare dopo la M5: Untouchable non chiude più) sono **mostrate evidenziate** con «Non disponibile
  adesso»; U9 distributori con tutti i negozi).
- Nomi nella navigazione: ogni riga del censimento «Etichette di navigazione» di Analisi app, prima/dopo: nessuna voce si chiama «Mappa»/«Mappe»
  o con il nome di un tipo.
- R5-18, R5-21 con una partita di prova: aggiungi un luogo nuovo con pin, posiziona un luogo esistente, colloca un luogo, elimina e rimetti un
  luogo e un negozio con un acquisto di prova (poi pulito dal cestino e dalla partita di prova).
- R5-13, R5-26: acquisti di p1 (7) visibili nella sezione giusta; punti negozio, scambi, regali e libri che citano un negozio.
### 6.4 UX
Dal telefono: voce del diario «compra X da Y» → sezione del negozio in un tocco, orari e «aperto adesso?» senza scorrere (R5-29); pagina del luogo
leggibile in gioco (R5-30); lo spillo chiesto dal diario in un giorno di chiusura si capisce («Non disponibile adesso» e perché); nei menu ogni posto
ha il suo nome; nessuna «Nota del pin» che confonde; testi di L0 (R5-31).
### 6.5 No-reg
Impronte (diario, Palazzi, mondo pin per pin); acquisti e punti; condizioni dei pin e degli articoli che citano luoghi/negozi (R5-27); listini
e prezzi; «Dove si trova» di libri, film, attività; metro e quartieri (L2) invariati.
### 6.6 Layout
Pagina del luogo (Untouchable, Leblanc, distributori di Akihabara con 6 negozi, un luogo senza pin), sezione negozio, finestre «Aggiungi luogo»
ed «Elimina», sezioni «da collocare»/«da posizionare»: a 1280, 768, 375, 1366×657, 1280×689 (intestazione, orari e inizio del listino nella prima
schermata, R5-33), 1024×690; bersagli ≥44 px; listino a più colonne su desktop.

## 7. Da approvare (scelta prudente applicata, o elenco senza scrittura)
1. **Luogo chiuso** — **deciso dall'utente**: nascosto nella navigazione come oggi, nessun «attenuato»; eccezione dello spillo chiesto dal
   diario (`?spillo=`) mostrato evidenziato con «Non disponibile adesso» e il motivo; nomi dei posti, mai «Mappa», nei menu (§2). Vale per tutti i
   luoghi con orari (non più solo quelli con un negozio).
2. **13 luoghi in quartieri con un'area sola** (Shinjuku 3, Kichijoji 4, Akihabara 3, Kanda 2, Odaiba 1): proposti per quell'area, **non scritti**;
   si collocano con un tocco quando l'utente conferma. Elenco in `l5-prod.json`.
3. **Leblanc** (requisiti riletti, R5-12b): il luogo resta «giorno e sera»; nessuna eccezione sul negozio; caffè e curry la sera sono
   un'attività (L9, in elenco). Superata la proposta «entrambe → giorno».
4. **Chiesa di Kanda**: i giorni di oggi sul luogo sono di Hifumi (G-013) e **non** diventano orari del luogo (regola dell'app, giorno e
   sera); vanno in elenco per L9; negozio «solo domenica» applicato; prezzi AGS (Vino della grazia 14.000, Ceneri del pentimento 12.000) in
   elenco per L7.
12. **Regola dell'app per gli orari non indicati** (R5-12c): «aperto giorno e sera», dichiarata come regola e non come dato. Per i 41 luoghi
    senza orari, giorni né condizioni (misura di Analisi dati, `dati.md` §9) «chiuso» non è calcolabile e restano sempre visibili, come oggi.
13. **Disponibilità degli articoli** (ambito 3: Panino con yakisoba il venerdì, i tre articoli con la pioggia; dubbio 9: rifornimento del
    lunedì, distributori vuoti col caldo): in L5 solo **nota** sull'articolo; strutturate come condizioni in L6/L7.
14. **Sblocchi dei luoghi** (Analisi dati, `dati.md` §9): le 8 date alternative da correggere con gli inviti (Odaiba → Ann rango 10, Harajuku
    → invito di Ryuji del 29/5, Planetario → invito di Makoto del 30/7, Meiji → invito di Ann del 6/8, Acquario → invito di Akechi del 29/7,
    Nakano → invito del 9/10, Ichigaya → invito di Ryuji del 3/7; **Roppongi resta 15/9**, G-031: quindi 7 righe), i 26 sblocchi solo in frase
    e la Clinica (luogo dal 16/4, Confidente dal 18/4) sono **condizioni**, quindi di **L6** (§4.1 e `condizioneEffettiva`): L5 le legge tramite
    `presenzaDelLuogo` e non le scrive. **Chiusi con G-031**: il ritrovo di Jinbocho è il luogo esistente `kanda-jinbocho/nagiuri` (nessun luogo
    nuovo); il Mercante Sakai si apre con 16 finestre di date; Sakura Residence va nell'elenco «Da rivedere» (L6 §4.1).
5. **Negozi senza sede**: Tanaka e Home Shopping TV → Leblanc (proposta), Niijima senza sede nel mondo; `prossimo-asso` → sede dedotta (applicata).
6. **Pin dell'utente verso negozi** (punto del PM, G-014): 1527, 1547, 1768 coerenti, invariati; **1769** (probabilmente sbagliato) e **1584**
   (non coerente; il più simile è `distributore-yongen-bagno`) solo in elenco, nessuna modifica.
7. **Descrizioni dei pin diverse dal luogo** (38) e **3 nomi diversi**: restano come «Nota del pin»; spostarle nel luogo o toglierle è un gesto
   dell'utente (§4.4).
8. **11 pin omonimi seed** collegati al loro luogo (applicato, elencato, reversibile).
9. **Pin della città senza riferimento** (151): note, dialoghi, punti sensibili, terme e i 24 «passaggio» senza destinazione restano come sono
   (annotazioni, non luoghi); quelli di tipo negozio/ristorante/distributore/attività/cinema/lavoro (≈30) in elenco per diventare luoghi o legarsi
   a uno esistente. «Nessun pin senza luogo, salvo i passaggi» vale dopo l'approvazione dell'elenco.
10. **Distributori**: nessun luogo nuovo per i set A/B/C/D (G-014) in L5; il listino condiviso è di L7.
11. **`NegozioPage` resta per i 3 negozi senza sede**; per gli altri è un rimando.
