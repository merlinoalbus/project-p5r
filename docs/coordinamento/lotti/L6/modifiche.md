# L6 «Condizioni uniche» — stesura delle modifiche

Autore: sessione «Stesura modifiche» (2026-10-20). Ingressi: `requisiti.md` (R6-01…R6-31, dubbi 0–9), `dati.md` (§1–§9, tabella §8b dei
quartieri da G-018), `app.md` (§0–§7, segnalazioni A–E), Esperto della guida (G-006, G-007, G-009, G-010, G-017, G-018 con le decisioni
dell'utente su Odaiba, Asakusa e Clinica; le vie «Oppure» O-1…O-10 restano fuori finché l'utente non decide), **L5** (luogo come sede, orari
strutturati, `presenzaDelLuogo`). Migrazione: il primo numero libero dopo L5 («M6»).

**Principio**: un vocabolario (in `shared/`), **un valutatore (nel server)**, l'interfaccia mostra gli esiti e non rivaluta. Le condizioni
JSON di oggi sono già per chiave e restano identiche (dati §3: 0 riferimenti rotti); si aggiungono le forme che mancano, si correggono i dati
con fonte, le frasi restano note.

## 1. Il vocabolario unico (R6-01, R6-03, R6-05, R6-06)
`shared/condizioniSpillo.ts` resta il modulo (nome storico; esporta anche `Condizione = RequisitoSpillo`) e diventa l'**unico** elenco: i 27
tipi di oggi più quelli dei requisiti dei Confidenti che mancano e tre nuovi:
| Tipo | Campi | Valutazione | Da dove |
|---|---|---|---|
| `avviso` | `testo` | sempre **non bloccante**: esito «avviso» (né verde né rosso), mostrato con l'icona di oggi | `RequisitoRango` (1 riga) |
| ~~`manuale`~~ | — | **tolto dal vocabolario** (R6-01b; decisioni dell'utente del 2026-09-05 «niente condizioni manuali» e del 2026-09-30 «i requisiti manuali diventano eventi della partita», migrazione 090). Misura sulla copia 0440Z: 0 righe `manuale` in `confidente_requisito`, 0 in `requisito_partita`. Il caso «non verificabile» si scrive come `evento`, `avviso` o proprietà strutturata. **Import di un pacchetto vecchio** con righe `manuale`: convertite in `avviso` (stesso testo), elencate nel riepilogo dell'import. I lettori del concetto («confermato a mano», `semaforiService.ts:9, 105`) si tolgono qui; `requisito_partita` resta fino a L11 (R11-02, elenco dei lettori) | — |
| `da-subito` | — | sempre vero; descrizione «Disponibile dall'inizio» | nuovo: i 3 quartieri iniziali (R6-08b, nessuna frase) |
| `luogo` | `luogo` (chiave) | vero se il luogo è sbloccato (`presenzaDelLuogo(…).sbloccato`, L5: solo lo sblocco, non gli orari) | nuovo: il quartiere aperto se lo è un suo ritrovo (G-018) |
| `invito` | `invito` (chiave di `confidente_invito`) | vero se nella partita è registrato quell'invito (`utente.invito_partita`) | nuovo, **decisione dell'utente** (2026-10-20): gli inviti («X ti ha chiesto di uscire») sono eventi del diario che sbloccano luoghi e aree |
Gli inviti sono **dati del Confidente**, uno per riga, modificati **solo** dalla pagina del Confidente (L9, R9-07c), con ciò che aprono:
```sql
CREATE TABLE confidente_invito (
  chiave            TEXT PRIMARY KEY,       -- '<confidente>/<MM-GG>'
  confidente_chiave TEXT NOT NULL REFERENCES confidente(chiave) ON DELETE CASCADE,
  data              TEXT,                   -- MM-GG del gioco (G-018 / G-023), NULL se non fissa
  apre_tipo         TEXT NOT NULL CHECK (apre_tipo IN ('quartiere', 'luogo', 'area')),
  apre_chiave       TEXT NOT NULL,          -- chiave del posto che apre
  condizioni_json   TEXT,                   -- quando l'invito può arrivare nel gioco (G-028: Palazzo concluso, rango di un Confidente); NULL = sempre
  nota              TEXT NOT NULL DEFAULT '', fonte TEXT NOT NULL, origine TEXT NOT NULL DEFAULT 'seed', seed_json TEXT, updated_at TEXT NOT NULL
);
CREATE TABLE utente.invito_partita (
  partita_id INTEGER NOT NULL, invito_chiave TEXT NOT NULL,
  voce_uid   TEXT,                          -- la voce del diario che l'ha registrato (L10); NULL se segnato a mano
  creato_il  TEXT NOT NULL,
  PRIMARY KEY (partita_id, invito_chiave)
);
```
**Condizione effettiva di un posto** (quartiere, luogo, area): una funzione sola `condizioneEffettiva(posto)` = `almeno-una[ condizioni_json
salvate del posto, invito{k} per ogni riga di confidente_invito che apre quel posto ]` (se il posto non ha inviti, è la sola condizione salvata).
La usano il valutatore, le descrizioni («Dopo aver letto «Vague» oppure dopo l'invito di Ryuji del 29 maggio») e l'editor (dove gli inviti si
vedono in sola lettura con il link alla pagina del Confidente). Così aggiungere o togliere un invito dalla pagina del Confidente cambia la condizione
del posto **senza scriverla altrove** (R9-07c); `invito` resta un tipo come gli altri per il valutatore (nessun caso speciale). **L'evento «invito
avvenuto» nasce in due modi equivalenti** (decisioni dell'utente, 2026-10-20): (a) un **gesto diretto** «Invito avvenuto» (con «Annulla») dalla
pagina del **Confidente** o dalla pagina del **posto che apre** (quartiere o luogo, accanto alla condizione), `PUT`/`DELETE
/api/partite/:id/inviti/:invito`, con `voce_uid` NULL; (b) in L10 la **spunta** di una voce del diario che cita l'invito (`voce_giornata.riferimento_tipo
= 'invito'`, chiave dell'invito), con `voce_uid` della voce: togliere la spunta cancella la riga **solo se** l'aveva scritta quella voce. Per il
diario validato **nessuna voce nuova**: l'invito di Ryuji del 29/5 (Harajuku) e quelli nei giorni con un'attività già prevista si registrano con il
gesto (decisione dell'utente: «al massimo gestisci ad evento l'apertura del luogo»). `invito_partita` entra in `RIFERIMENTI_PARTITE`.
**Condizioni dell'invito** (R6-08c2, requisiti riletti; G-023/G-028): `confidente_invito.condizioni_json`, valutato col valutatore unico. Valori:
- Ryuji 29/5: Palazzo di Madarame concluso;
- Ryuji 3/7: Palazzo di Kaneshiro concluso e Temperanza rango 1;
- Akechi 29/7: Diavolo rango 1;
- Makoto 30/7: Palazzo di Futaba concluso e Imperatore rango 1;
- Ann 6/8: Palazzo di Futaba concluso e Morte rango 1;
- Futaba 9/10: Appeso rango 1;
- le altre righe dal registro.
L'evento si registra **solo con le condizioni vere**, sia col gesto (pulsante disattivato con «Non ancora possibile: manca <condizione>») sia con
la spunta (la spunta resta, l'effetto no, con la nota). Le condizioni si valutano **sullo stato della partita al momento del gesto**, non sulla
data: il 29/5 di Ryuji, che nel diario precede la conclusione di Madarame (1/6), si registra quando Madarame è concluso, come nella partita 1
sulla copia 0440Z. **Makoto 30/7** (G-028 errore 1; decisione del PM del 2026-10-20: strada (a)): la voce del diario resta, con la condizione scritta e «da
rivedere» (L10 §4), e la spunta o il gesto registrano l'invito solo con le condizioni vere; la proposta (b), cioè niente voce, va all'utente
nell'elenco «Da rivedere». Caso di prova R6-08e: partita di prova con Futaba concluso prima del 30/7 e Imperatore rango 1.
**«Palazzo concluso»** (R6-16b, R6-24; decisione dell'utente del 2026-10-20, L4 §8.10 e §8.14): il tipo di condizione `palazzo{dungeon}` (sblocchi
«dopo il Palazzo di X», inviti, requisiti, ingressi) è vero quando il Palazzo è **concluso**: Tesoro (tutti i suoi pin `tesoro-palazzo`) **e**
la voce del boss finale (`dungeon.voce_boss_finale`). Il 100% della raccolta non sblocca nulla (G-026). Gli archi restano legati alla data. La
descrizione dice cosa manca («manca: il boss finale», «manca: il Tesoro»). Verifiche: Kamoshida p1 concluso; il pin 1657 del Tutorial non
conclude; Madarame p1 concluso sulla copia 0440Z (il dubbio 10 dei requisiti cade: il boss c'è). «Camera della vacuità» (dubbio 11) non tocca le
condizioni: le descrizioni prendono i nomi dalla fonte unica.
- `palazzo`, `persona-abilita` (oggi solo nei requisiti) entrano con i loro campi; `persona-abilita` per **chiave** (`persona: id`, `abilita: chiave
  della skill`) invece che per nome (§3).
- Ogni tipo ha in un posto solo: nome italiano, campi, `descriviRequisitoSpillo` (testo generato, R6-29), se è di presenza o di prerequisito
  (`CONDIZIONI_DI_PRESENZA`, `condizioniSpillo.ts:146-148`).
- `RequisitoRango` (`shared/types.ts:179-196`) diventa **un alias** di `Condizione` (stessi campi: dati §2); `STATI_PARTITA`
  (`shared/statiPartita.ts:48-90`) resta come elenco dei tipi **offerti dall'editor**, generato dal vocabolario (non più un elenco parallelo).

## 2. Un valutatore (R6-02, segnalazioni C, E)
- Server: `server/services/condizioni/valutatore.ts` (nuovo) = l'attuale `disponibilitaService.valutaRequisito` (175-314) con dentro i casi di
  `semaforiService.valuta` (98-190) per i tipi dei requisiti; `semaforiService` lo chiama invece di avere il suo. Gli altri valutatori diventano
  chiamate a questo: `cittaService.disponibilitaQuartiere` (111-117) e le regole dei luoghi (56-85), `negoziService` (48-68), `attivitaService.conDisponibilita`
  (32-39), `mappeService.dettagliSpillo` (353-384), `palazziService.apertoIl` (213-217), `atterraggioPalazziService.regolaCopre` (45-49),
  `disponibilitaService.arcoAllaData` (105-114).
- Interfaccia: **nessuna valutazione**. Via i mini-valutatori: `aperturaTokyo.quartiereAperto`/`dentroFinestra` (`src/components/mappe/aperturaTokyo.ts:18-38`:
  la metro usa `disponibile` del server, senza la seconda valutazione della data — segnalazione C), `VisoreMappa.nascostoPerCondizioni` (198-200: usa
  l'esito del server già nel DTO), `NavigazioneSpillo.tsx:15`, `utils/letture.bloccata` (15), `ChipDisponibilita.tsx:42`, `ConfidentiPartita.tsx:46`.
- Anteprima nell'editor: `POST /api/condizioni/valuta` `{ condizioni, partita, giorno? }` → esiti per condizione (stesso valutatore).
- `CittaPage.tsx:42`: ricarica i quartieri anche quando cambiano giorno o fascia della partita (segnalazione E).
- **Visore** (segnalazione A): nessun cambio di comportamento in L6 (prerequisiti e presenza nascosti come oggi, «Mostra anche…» invariato;
  decisione «visibilità assolute» del 2026-10-09); il luogo chiuso visibile e attenuato resta la regola di L5 per gli orari.

## 3. Riferimenti per chiave (R6-03, R6-04)
- Requisiti `richiesta` dei Confidenti: le **11** righe (dati §3) passano dal nome alla chiave (`dati_json.richiesta`), abbinamento esatto e unico
  (sicuro, automatico). `semaforiService.ts:69-72, 131-141` smette di accettare il nome.
- `persona-abilita` (10 righe): Persona per id e skill per chiave dove il nome coincide esattamente con una sola riga; gli altri in elenco (§8).
- `richiesteService.ts:207-227, 239-299`: rinominare una Richiesta non tocca più niente (i riferimenti sono chiavi); **eliminarla** non riscrive più i
  riferimenti al nome: la Richiesta va nel cestino (tipo già esistente? no: si aggiunge `richiesta` al cestino in questo lotto) e le condizioni che la
  citano danno «Richiesta eliminata» (esito grigio) finché non torna.
- `migraCondizioni.ts:51-68` (alias a mano): resta solo per leggere pacchetti vecchi (R6-22).

## 4. Una forma per ogni sblocco

### 4.1 Quartieri (R6-08, R6-08b, R6-09, R6-10)
- Colonna nuova `quartiere.condizioni_json` (vocabolario unico): la **sola** fonte. La frase `quartiere.sblocco` resta come nota (non mostrata
  come sblocco, R6-18); `sblocco_data` e le regole `dati_guida.sblocco-quartieri` non si leggono più.
- «Quartiere aperto» = esito della sua condizione (un significato, R6-09): lo usano metro, città, condizione `quartiere`
  (`disponibilitaService.ts:292-299`, con l'etichetta giusta `tipo: 'quartiere'`), pin (`sincronizzaMappe.ts:122-124, 198` non più usata), editor e
  validatore (tutti i 24 quartieri, non i 7 con data: `CondizioniEditor.tsx:49`, `mappeService.ts:1140-1143`), convertitore (`migraCondizioni.ts:140-147`).
- Valori dalla tabella `dati.md` §8b (G-018 + decisioni dell'utente), scritti dalla migrazione:
| Quartiere | `condizioni_json` |
|---|---|
| yongen-jaya, shibuya, shujin-academy | `da-subito` |
| ogikubo | `confidente{ryuji,4}` · inokashira-park `confidente{ann,3}` · ueno `confidente{yusuke,3}` · tsukishima `confidente{ryuji,7}` |
| harajuku | `luogo{harajuku/takenoko-street}` (il ritrovo, che ha `lettura{vague}`) |
| kichijoji | `almeno-una[data{06-05}, luogo{kichijoji/jazz-jin}]`; al luogo `kichijoji/jazz-jin`: `confidente{akechi,4}` |
| suidobashi | `data{06-09}` (**corretto** da 06-10) · shinjuku `data{06-18}` · akihabara `data{08-31}` |
| odaiba | `luogo{odaiba/odaiba-seaside-park}`; al luogo: `almeno-una[lettura{luoghi-della-movida}, confidente{ann,10}]` (**decisione dell'utente**; la data 06-01 è la vendita del libro, tolta) |
| kanda-jinbocho | `almeno-una[data{06-28}, confidente{hifumi,4}, lettura{pagine-ammuffite}]` (il ritrovo Jinbocho è il luogo `kanda-jinbocho/nagiuri`, con la sua condizione, G-031, §4.1; **corretto** «Yusuke R5» → data 28/6) |
| asakusa | `almeno-una[confidente{ann,7}, luogo{asakusa/tokyo-skytree}]` (**decisione dell'utente**: Ann R7; lo Skytree ha già `lettura{shitamachi-rinato}`, G-009) |
| shinagawa | `lettura{un-acquario-al-giorno}` · ichigaya `lettura{vedetta-lacustre}` · meiji-shrine `lettura{santuari-di-tokyo}` · nakano `lettura{esplorando-nakano}` · yokohama-chinatown `lettura{dolci-cinesi}` |
| ikebukuro | `luogo{ikebukuro/planetario-ikebukuro}`; al luogo: `lettura{cieli-notturni}` (la data 09-01 è la vendita del libro, tolta) |
| roppongi | `data{09-15}`, certezza **alta** (G-031: G-018 corretta dall'Esperto; prima qui `data{09-19}` a certezza media) |
| maihama | `luogo{maihama/destinyland}` (il luogo ha già `almeno-una[lettura{parchi-divertimento}, data{10-11}]`, data a certezza media) |
| mementos | nessuna condizione finché l'Esperto non dà la data della prima discesa (resta come oggi, fuori da metro e città) |
- Ogni quartiere porta anche la **fonte** della condizione (colonna `quartiere.fonte_condizioni_json`: `{ registro: 'G-018', certezza, nota }`),
  mostrata nella scheda del quartiere («Fonte: guida, certezza alta»).
- **Inviti dei Confidenti** — **decisione dell'utente** (2026-10-20): diventano righe di `confidente_invito` (§1) che aprono **Harajuku**,
  **Ikebukuro** (Makoto, 30/7), **Santuario Meiji** (Ann), **Shinagawa** (Akechi), **Nakano** (Futaba) e **Ichigaya** (Ryuji), con Confidenti e
  date da G-023 e la fonte. Harajuku è l'invito di **Ryuji del 29/5**. In Royal **non esistono inviti di Mishima** (correzione di Analisi requisiti,
  2026-10-20: le prime stesure qui citavano «Mishima 28/7» e «Mishima 3/8»); entrano **in OR** con la via del libro attraverso la
  condizione effettiva (§1), come Odaiba. Il posto aperto è il **ritrovo** quando il quartiere ne ha uno (Harajuku: `harajuku-hangout`; Ikebukuro:
  `planetario-ikebukuro`), altrimenti il quartiere. L'alternativa di oggi `harajuku/harajuku-hangout` `data{08-03}` si toglie dalla condizione
  salvata del luogo e al suo posto vale la riga `ryuji/05-29` di `confidente_invito` (tabella sotto). **Nessuna riga `mishima/…`** nel seed. Le altre vie «Oppure» di G-018
  che non sono inviti restano fuori finché l'utente non decide. Prima di L10 nessuna partita ha inviti registrati: l'esito di oggi non cambia (OR
  con una via falsa), salvo Harajuku hangout, dove la data dell'08-03 lascia il posto all'invito (elencato).
- **Le date alternative che sono inviti** (revisione di Analisi dati, `lotti/L5/dati.md` §9, 2026-10-20; stessa regola di Harajuku): nei luoghi
  con `condizioni_json` la via «data» che corrisponde a un invito si toglie dalla condizione salvata e diventa la riga di `confidente_invito`;
  le altre si correggono. Ogni riga è elencata con prima e dopo.

  | Luogo | Via di oggi | Via nuova |
  |---|---|---|
  | Odaiba (Seaside Park) | `data{06-01}` | Ann rango 10 (decisione dell'utente, già sopra) |
  | Harajuku hangout | `data{08-03}` | invito di Ryuji del 29/5 (evento, non voce: diario validato) |
  | Planetario (Ikebukuro) | `data{09-01}` | invito di Makoto del 30/7 |
  | Santuario Meiji | `data{08-05}` | invito di Ann del 6/8 |
  | Acquario (Shinagawa) | `data{07-28}` | invito di Akechi del 29/7 |
  | Nakano | `data{10-09}` | invito di **Futaba** del 9/10, come «invito avvenuto» |
  | Ichigaya | `data{07-06}` | invito di Ryuji del 3/7 |
  | Roppongi (ritrovo di Okumura) | `data{09-15}` | **invariata** (G-031: G-018 corretta dall'Esperto; `data{09-15}` è già il valore giusto). Le righe da riscrivere sono quindi **7** |

  Un invito si registra in due modi: col **gesto diretto** dalla pagina del Confidente o del quartiere (§1, `utente.invito_partita`), già in
  questo lotto, oppure con la spunta delle voci del diario (L10 §8.1). Finché l'utente non registra l'invito, il luogo si apre solo dalla via
  del libro. **Effetto sulla partita reale**: nelle partite già oltre quelle date un luogo oggi aperto per data può risultare chiuso finché
  l'invito non è registrato. Questo cambio visibile va elencato per partita prima del rilascio (R6-21) e mostrato all'utente col gesto
  «Registra l'invito» a portata di mano.
- **Sblocchi dei luoghi** (proposta di Analisi dati, `lotti/L5/dati.md` §10, che corregge il §9: i luoghi con lo sblocco solo in frase sono
  **26**; 41 sono senza orari né sblocco; 11 in entrambi gli elenchi, 56 in tutto):
  - **Principio**: lo sblocco del **luogo** è separato da quello del Confidente o del lavoro che ci si svolge (L9). La regola di base non si
    scrive riga per riga: `condizioneEffettiva(luogo)` = **quartiere sbloccato** AND (le condizioni del luogo, se ci sono). Così i 12 luoghi «da
    portare a quartiere» e i 30 senza nulla si aprono col quartiere **senza scrivere 42 condizioni** (la frase che descrive il Confidente
    resta nota e va al Confidente in L9).
  - **10 con condizione certa**, applicate in M6 come condizioni del luogo, **solo dopo la conferma della fonte** nel registro dell'Esperto
    (oggi in validazione): Asakusa hangout `confidente{ann,7}` (decisione dell'utente: applicata subito); Inokashira Ann 3, Ogikubo Ryuji 4,
    Tsukishima Ryuji 7, Ueno Yusuke 3, Jazz Jin Akechi 4 (§5 passo 2), Dome Town `data{06-09}`, Clinica `data{04-16}` (il 18/4 è il Confidente:
    §5 passo 4), Chiesa di Kanda `data{06-28}`, patate dolci `data{10-09}`. Una fonte non confermata → la riga resta nell'elenco, nessuna
    scrittura.
  - **2 da validare** (Mantra Ganda: Gemelle rango 3; Protein Lovers: Ryuji 5 oppure Ann 8) e **2 da chiarire** (Jose, Untouchable): elenco,
    nessuna scrittura.
  - **Aggiornamento con G-029** (Esperto; Analisi dati `L5/dati.md` §10, rimisurato sulla copia 0440Z: cifre invariate, 56 luoghi):
    - **Tutti i 26 sono confermati.** Si applicano in M6 come condizioni del luogo, ognuno con la fonte e la certezza in
      `fonte_condizioni_json`: i 10 di sopra, più Mantra Ganda `confidente{gemelle,3}` e Protein Lovers
      `almeno-una[confidente{ryuji,5}, confidente{ann,8}]` (certezza alta).
    - Due correzioni: **Jose** = `richiesta{un-ex-piuttosto-appiccicoso}` (certezza media, «da verificare» nella fonte); **Untouchable** =
      `data{04-17}`, che non dipende né dal quartiere né dal Palazzo (Iwai va sul Confidente, L9).
    - **Degli altri 30**, 22 si aprono col quartiere, con l'orario «giorno e sera» per regola dell'app (L5 R5-12c). Per gli altri 8:
      - gabbie di battuta e bagno pubblico: `lettura{esplorando-yoncha-4}`;
      - infermeria: `data{05-13}`.
    - Gli orari di questi ultimi luoghi vanno a L5: gabbie solo di sera; infermeria di giorno, lunedì, martedì, mercoledì e venerdì; venditore
      ambulante come già scritto; negozio scolastico di giorno. Il distributore del sottopasso, vuoto con Ondata di calore e Notte torrida, è una
      condizione degli **articoli** (L6/L7, ambito 3).
    - La fascia di Samurai Gamers resta una conferma e non si scrive.
    - **Chiusi con G-031** (Analisi dati `L5/dati.md` §10.2–§10.5; nessun punto aperto):
      - **Mercante Sakai** (`kichijoji/mercante-sakai`, chiave confermata): quartiere AND `almeno-una` di 16 intervalli di `data`
        (06-12→06-17, 06-26→07-02, 07-11→07-12, 07-26→07-30, 08-07→08-13, 08-22→08-27, 09-04→09-06, 09-19→09-24, 10-02→10-08,
        10-16→10-22, 10-30→11-05, 11-13→11-17, 11-27→12-03, 12-11→12-17, 01-13→01-14, 01-22→02-02); nessuna fascia, quindi la regola
        dell'app «giorno e sera». Lo scambio di ogni finestra va a L7 (listino di Sakai, condizione per finestra).
      - **Ritrovo di Jinbocho**: nessun luogo nuovo. È il luogo esistente `kanda-jinbocho/nagiuri`, che riceve
        `almeno-una[confidente{hifumi,4}, lettura{pagine-ammuffite}]`; l'orario «giorno» di oggi resta. Il negozio dove si compra il libro
        (Hinokuniya o Taiheido) va nell'elenco «Da rivedere».
      - **Sakura Residence**: nessuno sblocco proprio, né `confidente{futaba,6}` né `data{10-16}`; compare solo negli eventi di Futaba.
        Con la regola di base (quartiere sbloccato) comparirebbe nei menu, contro R5-20f («mai nei menu»). **Niente condizione `manuale`**:
        le decisioni dell'utente del 2026-09-05 («niente condizioni manuali» sui posti) e del 2026-09-30 (i requisiti manuali diventati eventi
        della partita) la escludono (correzione di Analisi requisiti). Si usa la **proprietà strutturata del luogo** di L5 §1.1,
        `luogo.solo_eventi_confidente = 'futaba'` («visitabile solo negli eventi del Confidente»): il luogo non è mai nei menu né in «Luoghi
        qui», in nessun giorno, senza segni a mano; la pagina del luogo lo spiega («Ci si va solo durante gli eventi di Futaba») e si raggiunge
        dagli eventi di rango di Futaba e dalla ricerca. Va anche nell'elenco «Da rivedere» col motivo dell'Esperto (certezza media).
      - **Roppongi / Okumura**: resta `data{09-15}` (sopra).
  - **Ritrovo di Jinbocho**: confermato `kanda-jinbocho/nagiuri` (G-031, sopra).
  - Il tipo di condizione `invito{invito}` c'è da questo lotto (§1): le 6 date-invito della tabella sopra lo usano.
- La descrizione mostrata è **generata** dalla condizione («Dopo aver letto «Un acquario al giorno»», «Con Ann al rango 10 oppure dopo aver letto
  …»), mai la frase (R6-08b).
- **Aree e planimetrie del mondo** (L2; Analisi app `app.md` §8, 2026-10-20: oggi sulle Aree non c'è nessuna regola di sblocco): **ereditano
  l'apertura del loro quartiere**. `condizioneEffettiva(area)` = quartiere sbloccato; nessuna colonna di condizioni sulle Aree, nessuna riga
  scritta. Un'Area di un quartiere chiuso:
  - non compare nella navigazione (metro, passaggi, «Aree vicine», indice), come un prerequisito, con la stessa regola del visore;
  - la sua pagina resta **consultabile** (come la pagina del luogo in L5), con la riga «Non ancora aperta: <motivo del quartiere>».
  Le Aree della città (lo staff, contenitore Tokyo) non hanno un quartiere e restano sempre aperte. L'ingresso del quartiere, cioè l'Area
  con il suo punto, segue il quartiere.
- **Illustrazione della città** (`CittaPage`, Analisi app §8): l'immagine che si «spegne» per un quartiere chiuso usa l'esito del server
  (`disponibile` del DTO), non `quartiereAperto` del client. Lo toglie F2 (§2), con lo stesso esito della metro.
- **Nome**: `mappeService.senzaIngressoAPalazzoCompletato` (:358) legge già «concluso» (L4 §8.10). Si rinomina in
  `senzaIngressoAPalazzoConcluso` nello stesso pezzo che tocca i Palazzi (B5), così il nome non dice più una regola superata.

### 4.2 Luoghi, negozi, libri (R6-11, R6-13, R6-18)
- Lo sblocco di luoghi e negozi è `luogo.condizioni_json` della sede (L5): le regole `dati_guida.sblocco-luoghi` (oggi ripiego di `cittaService.ts:76-85`)
  si **copiano** nella colonna dove è vuota (sono già strutturate: esito identico) e poi non si leggono più.
- Le **frasi** (luogo 39, negozio 35, attività 21, articolo 106 non JSON) restano **note**: nessuna conversione automatica in L6. Elenco frase →
  condizione proposta (`lotti/L6/elenco-frasi-condizioni.md`, da preparare con Analisi dati e l'Esperto: dubbio 1) e conversione solo dopo il sì.
- **Libri** (R6-11): `LibroDto.sbloccaLuogo` (quartiere, `attivitaService.ts:94-100`) diventa `sblocca: Array<{ tipo: 'luogo' | 'quartiere'; chiave; nome;
  casa }>` **calcolato** dalle condizioni che citano `lettura{libro}` (luoghi e quartieri), non da `libro.sblocca` (frase, nota) né dall'effetto
  `sblocca-luogo` (061/074, non più mostrato). I 3 libri «ignorati» sbloccano davvero perché il loro luogo/quartiere ha la condizione.

### 4.3 Clinica (R6-12, decisione dell'utente) e Confidenti (R6-14, R6-15)
- Negozio di farmaci: la sede `yongen-jaya/clinica-takemi` prende `data{04-16}`; gli **11 articoli** con `data dal 04-15` → `04-16` (dati §5).
- Tae: requisito del rango 1 `{dal:'04-15'}` → `{dal:'04-18'}` (il testo «indicazione dell'utente, 2026-09-05» resta come nota storica).
- La data di sblocco di ogni Confidente è il **requisito del rango 1**: `ConfidenteDettaglioPage.tsx:127` mostra la descrizione generata dal requisito
  (non la prosa `confidente_disponibilita.sblocco_data`, che resta nota); i semafori leggono già il requisito. Il **calendario** derivato è di L9
  (§7.3): in L6 le divergenze di app.md §0.9 spariscono da scheda e semafori; il calendario le perde in L9.
- **Ohya** (G-017: rango 1 il 5/7, non 18/6): `{dal:'06-18'}` → `{dal:'07-05'}` — dato di gioco con fonte, **deciso dal PM** (2026-10-20):
  applicato dalla migrazione M6 (passo 4).

### 4.4 Palazzi: finestra e atterraggio (R6-16, R6-17, segnalazione D)
- La finestra ha già un solo scrittore (`impostaFinestra`, `atterraggioPalazziService.ts:109-124`) ma vive in `dati_guida.finestre-dungeon`
  (`datiGuida.ts:71-95`): passa a colonne `dungeon.finestra_dal`, `finestra_al` (MM-GG), più `lettera_entro` (Madarame «entro il 2 giugno»: vincolo
  distinto, G-007), copiate dalla migrazione; `finestre-dungeon` non si legge più. Kamoshida dall'11/4 al 2/5 (certezza media sulla scadenza,
  G-007), Madarame dal 16/5 al 5/6 con lettera entro il 2/6: i valori di oggi.
- Le **copie** della finestra sulle condizioni dei pin d'ingresso fatte dalla sincronizzazione (`sincronizzaMappe.ts:130-132, 195-204, 230-266`)
  si sostituiscono con `arco{dungeon}` **solo dove sono identiche alla finestra** (esito uguale per costruzione; elenco); le altre restano e vanno in
  elenco.
- Atterraggio: una funzione sola `destinazionePalazzo(dungeon, giorno)` = `dungeon_atterraggio` del giorno se c'è (`atterraggioDelGiorno`, 65-70),
  altrimenti `ingressoDelPalazzo` (`palazziService.ts:188-209`); la usano metro (`MappaTokyo`), `mappaAzione` (campo `mappa` della voce) e il campo
  `atterraggio` della voce, che diventa lo stesso valore (`giornataService.ts:97, 99`): le «6 divergenze su Tokyo» spariscono (R6-17).
- Le frasi `data_sblocco`/`data_scadenza`/`furto_consigliato` restano note nella scheda (sotto la finestra strutturata).

## 5. Migrazione M6 (gioco.db)
1. Colonne: `quartiere.condizioni_json`, `quartiere.fonte_condizioni_json`, `luogo.fonte_condizioni_json` (fonte e certezza delle condizioni
   dei luoghi di G-029/G-031), `dungeon.finestra_dal`, `finestra_al`, `lettera_entro`; tabelle `confidente_invito` e (migrazione utente)
   `invito_partita` del §1; cestino con `richiesta` (ricostruzione come in L2).
2. Quartieri: i valori del §4.1 (solo se `condizioni_json` è NULL); luoghi dei ritrovi: `jazz-jin` `confidente{akechi,4}`; Seaside Park (decisione
   dell'utente: libro oppure Ann 10, via la data di vendita), Planetario (via la data di vendita: G-017). Ogni modifica a una riga esistente è
   **elencata** con prima/dopo.
3. `sblocco-luoghi` → `luogo.condizioni_json` dove è vuota (copie identiche).
4. Requisiti: 11 `richiesta` per chiave; `persona-abilita` per chiave dove sicuro; Clinica (sede 04-16, 11 articoli, Tae 04-18); Ohya rango 1
   `{dal:'07-05'}` (G-017, decisione del PM).
5. Finestre dei Palazzi da `finestre-dungeon` alle colonne; pin d'ingresso con finestra identica → `arco`.
6. Nessuna frase cancellata; nessuna condizione dell'utente toccata (le condizioni dei pin utente restano byte per byte, R6-21).
### Verifiche prima/dopo
| Misura | Atteso |
|---|---|
| condizioni JSON (articolo 510, spillo 173, libro 45, film 26, copia_pezzo 23, attività 21, luogo 13) | invariate byte per byte salvo l'elenco (11 articoli Clinica, 3 luoghi ritrovo, pin d'ingresso convertiti ad `arco`) |
| **esito** di ogni condizione sulla partita reale copiata e su una partita di prova, a 6 date (04-11, 04-16, 05-20, 06-09, 07-05, 10-11) | uguale prima/dopo salvo le correzioni elencate (Suidobashi, Kanda, Odaiba, Ikebukuro, Clinica, i 13 quartieri prima «rossi») — R6-20 |
| quartieri con condizione strutturata | 23 (+ Memento senza) ; «sempre rossi» 0 |
| riferimenti per nome | 0 |
| `requisito_partita` | 0 → 0 |
| impronta diario/Kamoshida/Madarame | identica |

## 6. Interfaccia
### 6.1 Un editor (R6-07, R6-30, R6-31)
`CondizioniEditor` (`src/components/guida/CondizioniEditor.tsx:246-283`) diventa l'editor unico, con tutti i tipi del vocabolario (anche `luogo`,
`avviso`, `palazzo`, `persona-abilita`, tutti i quartieri; niente `manuale`, R6-01b), scelta dell'oggetto per **nome con ricerca** e salvataggio per **chiave**,
**anteprima dell'esito** sulla partita corrente (via `POST /api/condizioni/valuta`), su telefono come foglio dal basso (`Modal`). Dove si usa:
- pin (oggi), copie dei pezzi, catalogo (articolo, libro, film, attività, videogioco, luogo) come oggi;
- **quartiere** (nuovo: «Modifica sblocco» nella pagina del quartiere di L2, con la fonte e «Ripristina» al valore della guida);
- **negozio** (sblocco proprio solo se diverso dalla sede; orari restano `OrariEditor`, L5);
- **requisiti dei Confidenti** (nuovo: «Modifica requisiti» nella pagina del Confidente, un rango per riga; sostituisce `CorreggiRequisito` che oggi
  tratta solo le Richieste, `src/components/partita/CorreggiRequisito.tsx:32`).
La finestra del Palazzo resta in `AtterraggioTokyo` (date strutturate), ora sulle colonne.
### 6.2 Testi (R6-29)
Ogni esito si legge con `descriviRequisitoSpillo` in ogni vista; un esito rosso dice cosa manca («Manca: Ann al rango 10 oppure leggere «Luoghi
della movida»»); «Disponibile dall'inizio»; «Avviso: …» distinto da «Bloccato»; «Fonte: guida, certezza media — da verificare»; nella metro le
date «dal 06-18» diventano «dal 18 giugno» (oggi data grezza, app.md §2 C1).

## 7. File e ordine
**BE**: 1. `shared/condizioniSpillo.ts` (tipi nuovi, alias), `shared/types.ts` (`RequisitoRango` alias, `LibroDto.sblocca`, DTO della valutazione,
`TipoCestino` con `richiesta`), `shared/statiPartita.ts` (generato); 2. migrazione M6 + test; 3. `server/services/condizioni/valutatore.ts` (nuovo) e i
servizi del §2, `cittaService`, `attivitaService` (94-100), `semaforiService`, `richiesteService` (207-299), `palazziService`, `atterraggioPalazziService`,
`azioniStrutturateService` (`mappaAzione`), `giornataService` (97, 99), `datiGuida` (lettore finestre via), `mappeService` (1100-1165 validatore);
4. rotte: `condizioni.ts` (`/valuta`, elenchi con tutti i quartieri), `compendio.ts` (requisiti dei Confidenti, condizioni del quartiere), schemi;
5. OpenAPI; 6. test BE.
**FE**: 1. `src/components/guida/CondizioniEditor.tsx`, `moduli/` (quartiere, negozio), `src/components/confidenti/EditorRequisiti.tsx` (nuovo);
2. `src/components/mappe/aperturaTokyo.ts`, `MappaTokyo.tsx`, `VisoreMappa.tsx`, `NavigazioneSpillo.tsx`, `src/utils/letture.ts`, `ChipDisponibilita.tsx`,
`ConfidentiPartita.tsx`; 3. `src/pages/CittaPage.tsx` (ricarica al cambio di giorno), `QuartierePage.tsx` (sblocco con fonte), `LibriPage.tsx` (138:
«Apre» calcolato), `ConfidenteDettaglioPage.tsx` (127); 4. test FE.

## 8. Piano dei test
### 8.1 BE
1. Vocabolario: ogni tipo (31, senza `manuale`) ha nome, descrizione, valutazione; `avviso` non blocca; un pacchetto con `manuale` si importa come `avviso` con l'elenco nel riepilogo; `luogo`, `da-subito`;
   `invito` con e senza data (invito registrato → aperto; annullato → richiuso se non c'è il libro), registrazione a mano e annullamento.
2. Valutatore: casi per ogni tipo; combinazioni `gruppo`/`non`/`intervallo` con tutti i tipi (R6-06); **i vecchi valutatori danno lo stesso esito del
   nuovo** su tutte le condizioni salvate (test di equivalenza che li confronta prima di toglierli).
3. Quartieri: i 24 con la condizione della tabella; Odaiba (lettura → aperto; senza lettura e Ann < 10 → chiuso; Ann 10 → aperto), Asakusa (Ann 7;
   Skytree con il libro), Kichijoji (06-05 o Jazz Club), Kanda (28/6, Hifumi 4, libro), Ikebukuro (libro, non più 09-01); condizione `quartiere` con lo
   stesso esito della metro (R6-09).
4. Libri: «sblocca» calcolato; i 3 «ignorati» aprono il loro posto (R6-11).
5. Clinica: sede 04-16, articoli 04-16, Tae 04-18 (R6-12); rinominare/eliminare una Richiesta non rompe i requisiti (R6-04, R6-15).
6. Palazzi: finestra dalle colonne; `arco` sui pin d'ingresso; metro e diario sulla stessa destinazione per tutti i 9 Palazzi (R6-17).
7. Migrazione M6: conteggi ed esiti del §5 alle 6 date sulla copia di produzione (p1) e su una partita di prova; idempotenza; impronta.
8. Pacchetti: un pacchetto mappe vecchio con forme vecchie si importa convertito (R6-22).
9. Test esistenti da allineare: `condizioni.test.ts` (122, 96-100), `condizioni-pin.test.ts`, `condizioni-voce.test.ts`, `semafori.test.ts`,
   `requisiti-eventi.test.ts`, `citta.test.ts` (66-84 + test nuovo sui 13), `atterraggio-palazzi.test.ts`, `finestreDungeon.test.ts`,
   `sulla-mappa-palazzo.test.ts`, `visibilitaCondizionale.test.ts` (122-139), `disponibilitaService.test.ts` (117), `shared/condizioniSpillo.test.ts`,
   `shared/statiPartita.test.ts`.
### 8.2 FE
`CondizioniEditor.test.tsx` (tutti i tipi, ricerca per nome → chiave, anteprima), `EditorRequisiti.test.tsx` (nuovo), `MappaTokyo.test.tsx` (nessuna
rivalutazione: esito del server), `CittaPage.test.tsx` (ricarica al cambio di giorno), `AtterraggioTokyo.test.tsx`, `CorreggiRequisito.test.tsx`
(sostituito), `LibriPage.test.tsx`, test nuovi per i componenti senza (`aperturaTokyo` tolto).
### 8.3 Funzionali
«Fatto quando»: ogni sblocco una forma (24 quartieri, Confidenti, Palazzi, luoghi); Odaiba e Asakusa come deciso dall'utente sulla partita di prova
(leggere, salire di rango, tornare indietro); Clinica con due date. Esiti di metro, città, scheda, visore, calendario e diario uguali fra loro alle 6
date (R6-09). Editor: modificare lo sblocco di un quartiere e di un requisito su dati di prova, con ripristino.
### 8.4 UX
Condizioni leggibili in italiano, uguali ovunque; esito rosso con «Manca: …»; editor dal tablet (R6-30); metro con date in italiano.
### 8.5 No-reg
Diario 04-01..06-01 con gli stessi semafori e avvisi salvo correzioni elencate (R6-23); Kamoshida e Madarame (condizioni dei pin e delle voci, finestre)
invariati (R6-24); mappa di Tokyo con gli stessi Palazzi negli stessi giorni (R6-25); Memento (R6-27).
### 8.6 Layout
Editor delle condizioni e degli sblocchi, editor dei requisiti, elenco delle frasi: 1280, 768, 375, 1366×657, 1280×689; foglio dal basso su telefono;
bersagli ≥44 px.

## 9. Da approvare (scelta prudente applicata)
1. **Ohya** rango 1 dal 5/7 (G-017): **applicato**, decisione del PM (dato di gioco con fonte); l'utente può ribaltarla.
2. **Inviti dei Confidenti**: decisi dall'utente (tipo `invito`, in OR nei 6 quartieri); da confermare solo il dettaglio del secondo invito di
   Ikebukuro dal registro G-018. Le altre vie «Oppure» non inviti restano fuori.
3. **Frasi di luoghi, negozi, attività, articoli**: restano note; elenco frase → condizione da preparare e approvare (`lotti/L6/elenco-frasi-condizioni.md`).
4. **Jinbocho**: il ritrovo è il luogo esistente `kanda-jinbocho/nagiuri` (G-031), con `almeno-una[confidente{hifumi,4}, lettura{pagine-ammuffite}]`;
   la condizione del quartiere Kanda resta com'è. Nessun luogo nuovo.
5. **Roppongi** resta `data{09-15}`, certezza **alta** (G-031); solo **Maihama** (11/10) resta a certezza media, applicato con «da verificare»
   nella fonte (dubbio 9).
6. **Memento**: nessuna condizione finché l'Esperto non dà la data.
7. **Calendario derivato** dalle condizioni e dalle finestre: L9 (R6-14 per la parte calendario).
8. **Tipo `luogo`** nuovo nel vocabolario (quartiere aperto se lo è un suo ritrovo, G-018) e **`da-subito`** per i quartieri iniziali.
