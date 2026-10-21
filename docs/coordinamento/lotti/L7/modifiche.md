# L7 «Oggetti» — stesura delle modifiche

Autore: sessione «Stesura modifiche» (2026-10-20). Ingressi: `requisiti.md` (R7-01…R7-26, dubbi 1–6), `dati.md` (§1–§10), `app.md` (§0–§8,
segnalazioni A–E), **L5** (negozio = sezione della pagina del luogo, `/guida/luogo/…#negozio-<k>`; negozi senza sede con la loro pagina), **L6**
(condizioni per chiave, `articolo` nel vocabolario), **L4** (voci dei forzieri), e lo schema delle **proposte confermate dall'utente** adottato
in L3 per il diario. Migrazione: il primo numero libero dopo L6 («M7»).

**Principio**: un catalogo, una chiave per oggetto, una pagina. Il prezzo vive sull'articolo. Si collega per chiave **solo** dove l'abbinamento è
esatto; tutto il resto diventa una **proposta** che l'utente conferma nell'app (mai una fusione automatica). Nessun archivio di oggi si cancella
(si smette di leggerlo; via in L11); acquisti, letture, visioni e testi delle voci invariati.

## Nota di attuazione — 21 ottobre, codice locale non pubblicato

**Rettifica corrente dell'audit:** tutte le note di attuazione seguenti sono consuntivi dell'esecutore, non modifiche approvate alla specifica originale (`43ad8889`). Il raccordo `catalogo_oggetto_fonte` è contestato; il gesto scelto dall'utente per l'apertura dei dedali è nel Diario durante la visita Memento, non in Progressi. Ultimo typecheck documentato fallito dopo le 05:14Z. Rilievi e copertura indipendente in `../../audit-conformita-2026-10-21.md`; nessuna conformità o consegna L7 dichiarata.

- **05:14Z:** baratti Gachapon predisposti come proposte per i sei scambi, non applicati e distinti dalla capsula casuale da 500 yen. Scostamento tecnico necessario a R7-13: la conferma crea un articolo-offerta con costo per chiave e risultati nella relazione ricompensa_oggetto esistente (fonte articolo), non un'identità di bundle né acquisti multipli. Note distinguono i premi alternativi di Mothman; la spunta non li assegna né conta gli scambi. DTO/proposte/listino/ricerca/pagina Oggetto/visore e correzione manuale con l'editor dei contenuti condiviso collegati. Guardie sulle offerte ibride/occupate e sui riferimenti, schema comune per trasferire in fusione anche i costi/risultati e snapshot delle proposte senza sommare alternative o raddoppiare quantità equivalenti. Typecheck/lint/build verdi e tre riesami statici, non prova runtime. DB readonly schema 120 senza catalogo; M7/router BE ancora inattivi, nessun test/scrittura/servizio gestito o rilascio. Restano ultimi consumatori/selettore e riesame integrale; dettagli nel checkpoint.

- **04:50Z:** Jose preparato dalla fonte completa (37) come normale listino con costo fiori e requisiti sulle sette aperture effettive, aggiunte al registro già esistente di Progressi. Collocazione implementativa comunicata, non decisione attribuita all'utente o blocco pendente; nessuna tabella/data/stato dei dedali nuovi. DTO e Richieste riusano dettaglioNegozio/ArticoliTabella e acquisti esistenti, vista pre-M7 conservata, offerte/negozi attuali rispettati. Rafforzate fusioni/snapshot e classificazione dei contenitori. Typecheck/lint/build verdi e tre riesami statici, non prova runtime. Restano Gachapon/ultimi consumatori/selettore/riesame; M7/router BE inattivi, nessuna scrittura o pubblicazione. La fonte AGS distingue cinque Repliche d'arma e Balsamo vitale dagli scambi successivi: non applicare «dal 5°» del vecchio JSON né dividere i premi simultanei in acquisti diversi.

- Aggiornamento **04:17Z**: Scambi legge riferimenti ai listini attuali dopo M7; copie della guida conservate nelle note del negozio e nei soli snapshot già presenti, senza cambiare origine/prezzi/condizioni/acquisti. Note ripiegabili, fuori dall'intestazione Negozio. Varianti di nomi del Venditore solo proposte; Gachapon conserva il confronto aperto dei sei baratti, distinti dalla capsula casuale da 500 ¥. Descrizioni delle dieci rotte catalogo predisposte ma non registrate. Typecheck/lint/build verdi, tre riesami statici, non prova runtime. M7/router BE ancora inattivi e nessuna scrittura o pubblicazione; residui nel checkpoint.

- Aggiornamento **04:02Z**: premi di esami/Confidenti/Covo/sfide/boss nella conversione e nei lettori/viste; fonti attuali in blocco per pagina Oggetto e proposte. Domande con sole Doti, PE/yen e premi ornamentali non promossi. Oggetti ricevuti dai Confidenti distinti dai regali consegnabili; nessuna acquisizione automatica. Condizioni e soglie restano note; nota propria della proposta conservata nelle conferme, alternative e fusioni, senza cancellare note precedenti. M7 ancora bozza non registrata e DB readonly schema 120 senza catalogo. Typecheck/lint/build exit 0, tre riesami statici, non prova runtime; nessun test, scrittura, servizio gestito o pubblicazione. Perimetri/fonti e prossimo passo nel checkpoint; restano Jose, contenuti dubbi, scambi/altri consumatori/API e riesame completo.

- Aggiornamento **03:34Z**: UI delle proposte collegata in catalogo/Impostazioni e voci, con riepilogo esplicito, conferma/scarto/alternativa/fusione. Fonti correnti, quantità/certezza e rettifiche visibili; gruppi indipendenti e resa ricette null conservati. DTO per voce in blocco; contenuto manuale dalla voce senza sincronizzare testo/pin/stato. Collisioni di sostituzione rifiutate, ordine e nota omessa conservati; null manuale toglie la nota, conferme non la cancellano. Typecheck/lint/build verdi, non prove runtime. M7/router BE non attivi, nessuna scrittura/test/servizio gestito o pubblicazione. Restano conversione/premi/Jose/contenuti dubbi, scambi/altri consumatori/API e riesame dell'intero lotto.

- Aggiornamento **03:14Z**, supera i limiti precedenti su modulo e montaggio FE: offerte per chiave senza copie, costo modificabile yen/fiori/oggetti e snapshot pre-M7 conservativi; catalogo unico integrato in OggettiPage e rotta Oggetto montata. Vecchi URL e sezioni fabbricazione/personalizzazione/abiti-lavanderia/scambi conservati. Typecheck/lint/build exit 0, pagine nuove incluse nel bundle; non prova runtime. DB readonly schema 120 senza catalogo, migrazioni/router BE ancora non attivi. M7/Jose/altri premi, proposte, altri consumatori/API e riesame integrale restano aperti. Nessuna scrittura sui dati, test, servizio gestito o pubblicazione intermedia.

- Aggiornamento **02:34Z**: contenuti voci/visore, ricompense Richieste, oggetti guida/abiti e prodotti/materiali delle ricette collegati; suggerimenti offerte per fonte/chiave, non titolo. Testi/JSON e stati originali indipendenti. Fonte readonly: tutte le dieci ricette hanno resa non dichiarata; eliminato il falso 1 nella bozza M7. `RicompensaOggettoDto` e quantità delle proposte possono essere null soltanto per il prodotto di ricetta, con vincoli SQL/API; conferma/scelta alternativa non aggiungono un default né sommano la resa. Quantità note di contenuti/materiali e costi di scambio restano positive. UI esplicita il dato non indicato. Typecheck/lint/build verdi, nessuna migrazione/scrittura o prova runtime; catalogo nuovo, moduli/proposte e altri premi ancora da completare. Non è una riduzione del piano o una consegna.

- Aggiornamento **02:04Z**: collegati libri/film/videogiochi (liste e risposte all'avanzamento), listini/ricerca, nomi nelle condizioni e merce del visore alle identità canoniche. Le letture mantengono le proprie chiavi/progressi/effetti; vecchi prezzi senza vendita come note. Costo/dove dei regali ora dai listini e sedi visibili, prosa precedente come nota; nessuna disponibilità «oggi» inventata nel lettore senza partita. M7 conserva il sottotipo cinema/DVD nelle nuove identità. Costo comune per listino/pagina/visore, scambi mai mostrati in yen; metadata e riferimento preservati nel DTO mini. Typecheck/lint/build verdi e tre riesami statici, nessuna prova runtime. Il resto B3, il vecchio selettore e UI/proposte/OpenAPI restano da completare; nessuna registrazione di M7/router o pubblicazione.

- Il selettore preesistente include anche i **55 abiti** di `oggetti-guida.abiti.elenco`: per non perderli, M7 li conserva nel catalogo con categoria `altro`, sottocategoria `abito`, origine guida e chiave fonte `abiti/<nome>`. La base storica 661 sotto non li contava: sulla sorgente locale letta in sola lettura la base prima delle promozioni è quindi **716**. Non è il conteggio di una migrazione eseguita; si legge sempre la sorgente effettiva, non una costante numerica.
- Le proposte aggiungono `gruppo` alla chiave: `(riga_tipo, riga_chiave, gruppo, catalogo_chiave)`. Serve a separare le alternative di un contenuto dalle proposte degli altri contenuti della stessa voce/ricetta. Il corpo API a tre chiavi resta accettato solo se non ambiguo. Stato scartato persistente; scelte alternative e fusione nel cestino comprendono i rispettivi cambi di stato.
- `meteo` ammette la variante `senza-allerta` con la chiave dell'allerta esistente: valutatore, normalizzazione, editor ed elenchi leggono il calendario, senza copiare date nelle offerte. I vecchi `piove`/`non-piove` restano invariati. Una regola mancante su un'offerta corretta dall'utente diventa proposta, non sovrascrittura.
- `l7-proposte.json` non è stato trovato nelle posizioni documentate: la conversione ricostruisce le proposte dalle chiavi effettive e dalle tabelle di questo lotto. Le ricompense strutturate affiancano i testi storici nel DTO come `oggettiRicompensa`, senza continuare a usare i testi come identità nella UI nuova.
- Copertura, esiti statici e parti ancora mancanti: `ripresa-implementazione.md`. Nessuna nuova migrazione/router registrato; nessuna nuova API raggiungibile. Zero test, unico commit/push a fine lotto.
- Pagina/catalogo e modulo oggetto predisposti localmente, non ancora collegati alla navigazione. I comandi di lettura sono estratti e condivisi con Libri/Film/Videogiochi; il DTO include lo stato Lettura rapida dal servizio esistente. Regali sconsigliati espliciti e costo di scambio illeggibile marcato `costoDaVerificare`; non diventa un prezzo gratuito. M7 aggrega i contenuti certi per identità prima di inserirli e assegna una fonte distinta a ogni contenuto nuovo di una ricompensa. Difetti e mancanze in `difetti.md`.
- Listini condivisi: aggiunti i riferimenti tecnici `negozio.listino_condiviso`, `articolo.articolo_condiviso` e il legame `negozio_sede_spillo` per UID. Conservano le chiavi storiche e distinguono 1768 da 1769, altrimenti indistinguibili per negozio/Area. Solo i pin confermati 1527/1547/1768 ricevono un'associazione aggiuntiva, senza riscrivere i pin; set C, varianti commerciali e pin dubbi invariati. L'alias del duplicato A è protetto anche da visibilità/presenza identiche: il vecchio negozio già nascosto nella sorgente locale non viene riaperto. Lettori, sede opzionale nell'acquisto e cestino collegati localmente; nessuna migrazione/scrittura eseguita e nessun runtime dichiarato verificato. Dettagli nel checkpoint.
- Alle 01:43Z: regali per chiave collegati all'API esistente (`catalogo` in alternativa al vecchio `regalo`), alle spunte/selettore del Confidente e al gesto della pagina Oggetto. Nome/data storici e riferimenti preesistenti preservati, niente punti/acquisti automatici; aggiunto il riferimento per gli orfani nell'importazione. Nome corrente dal catalogo, prezzo/dove ancora da completare in B3. M7 distingue contenuti nominativi diretti da istruzioni/statistiche e arredi; Tavola dei semi ancora da chiarire, non promossa. Typecheck/lint/build verdi, nessuna prova runtime; migrazioni/router catalogo e pagina Oggetto/catalogo non montati. Jose: domanda sulla collocazione del gesto di apertura effettiva già inviata; nessuna nuova data/evento introdotti. Questi sono avanzamenti locali, non una riduzione del piano o una consegna.

## 1. Modello

### 1.1 Il catalogo unico
Tabella nuova (non si estende `oggetto`: le Persona del compendio la citano per nome inglese, `001_compendio.ts:42`, `compendioService.ts:269-278`):
```sql
CREATE TABLE catalogo_oggetto (
  chiave          TEXT PRIMARY KEY,      -- '<categoria>/<slug>' (es. 'consumabile/medicina', 'libro/vague', 'arma/kogatana-nera')
  categoria       TEXT NOT NULL,         -- equipaggiamento: arma | arma-da-fuoco | protezione | accessorio; consumabile; materiale; chiave;
                                         -- regalo; cibo; libro; film; videogioco; carta-abilita; altro (elenco in shared/catalogo.ts)
  sottocategoria  TEXT,                  -- cura, sp, battaglia, stato… (dai consumabili della guida)
  nome            TEXT NOT NULL,         -- nome italiano mostrato ovunque
  nomi_altri_json TEXT NOT NULL DEFAULT '[]',  -- altri nomi noti (traduzione del dataset, nome AGS del listino, nome inglese): ricerca e abbinamenti
  nome_originale  TEXT,                  -- inglese (oggetto.nome, nomeEn della guida)
  effetto         TEXT NOT NULL DEFAULT '',
  descrizione     TEXT NOT NULL DEFAULT '',
  statistiche_json TEXT,                 -- equipaggiamento (dal dataset)
  fonte_tipo      TEXT NOT NULL CHECK (fonte_tipo IN ('equipaggiamento', 'guida', 'libro', 'film', 'videogioco', 'listino', 'utente')),
  fonte_chiave    TEXT,                  -- oggetto.id, nome nella guida, libro.chiave, film.chiave, attivita.chiave, articolo.chiave
  origine         TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed', 'utente')),
  seed_json       TEXT,                  -- valori della guida prima della prima correzione (R7-17, «Ripristina»)
  nascosto        INTEGER NOT NULL DEFAULT 0,
  updated_at      TEXT NOT NULL
);
CREATE UNIQUE INDEX catalogo_fonte ON catalogo_oggetto (fonte_tipo, fonte_chiave) WHERE fonte_chiave IS NOT NULL;
```
- Libri, film, videogiochi: la riga del catalogo è l'identità (nome, prezzo da listino, pagina); i dati di lettura/visione/gioco restano nelle loro
  tabelle (`libro`, `film`, `attivita` videogioco), legati per `fonte_chiave`; le condizioni `lettura{categoria, chiave}` non cambiano.
- `shared/catalogo.ts` (nuovo): categorie con nome italiano e gruppo («Equipaggiamento», «Consumabili», …), funzione unica `chiaveCatalogo(categoria,
  nome)`; sostituisce le 19 categorie di `shared/articoli.ts:10-13` per gli oggetti (le categorie dell'articolo restano per compatibilità).
- Via il doppione `OggettoSelezionabileDto` (`shared/types.ts:2515` e `oggettiSelezionabili.ts:43`) e il costo di `risolviOggettoCollegato`
  (`oggettiSelezionabili.ts:174-186`): l'oggetto collegato si legge con una join sul catalogo.

### 1.2 Legami per chiave
```sql
ALTER TABLE articolo ADD COLUMN catalogo_chiave TEXT REFERENCES catalogo_oggetto(chiave) ON DELETE SET NULL;
ALTER TABLE articolo ADD COLUMN costo_json TEXT;   -- solo per gli scambi: {"tipo":"fiori","importo":n} | {"tipo":"oggetti","oggetti":[{"chiave","quantita"}]}; NULL = prezzo in yen (colonna prezzo)
ALTER TABLE confidente_regalo ADD COLUMN catalogo_chiave TEXT REFERENCES catalogo_oggetto(chiave) ON DELETE SET NULL;
CREATE TABLE voce_oggetto (                         -- contenuto dei forzieri e degli altri elementi della guida
  voce_chiave TEXT NOT NULL REFERENCES punto_interesse(chiave) ON DELETE CASCADE,
  catalogo_chiave TEXT NOT NULL REFERENCES catalogo_oggetto(chiave) ON DELETE CASCADE,
  quantita INTEGER NOT NULL DEFAULT 1, ordine INTEGER NOT NULL, nota TEXT,
  PRIMARY KEY (voce_chiave, catalogo_chiave)
);
CREATE TABLE ricompensa_oggetto (                   -- ricompense di Richieste, domande, esami, sfide, Confidenti, Covo
  fonte_tipo TEXT NOT NULL, fonte_chiave TEXT NOT NULL,
  catalogo_chiave TEXT NOT NULL REFERENCES catalogo_oggetto(chiave) ON DELETE CASCADE,
  quantita INTEGER NOT NULL DEFAULT 1, ordine INTEGER NOT NULL, nota TEXT,
  PRIMARY KEY (fonte_tipo, fonte_chiave, catalogo_chiave)
);
CREATE TABLE ricetta_materiale (                    -- fabbricazione del Covo
  ricetta TEXT NOT NULL, catalogo_chiave TEXT NOT NULL REFERENCES catalogo_oggetto(chiave), quantita INTEGER NOT NULL,
  PRIMARY KEY (ricetta, catalogo_chiave)
);
CREATE TABLE proposta_abbinamento (                 -- proposte da confermare nell'app (stesso schema del diario in L3)
  riga_tipo TEXT NOT NULL CHECK (riga_tipo IN ('articolo', 'regalo', 'voce', 'ricompensa', 'ricetta', 'catalogo')),
  riga_chiave TEXT NOT NULL,                        -- chiave della riga da collegare ('catalogo' = proposta di fusione di due oggetti)
  catalogo_chiave TEXT NOT NULL REFERENCES catalogo_oggetto(chiave) ON DELETE CASCADE,
  quantita INTEGER, motivo TEXT NOT NULL, certezza TEXT NOT NULL CHECK (certezza IN ('certa', 'probabile', 'da-verificare')),
  PRIMARY KEY (riga_tipo, riga_chiave, catalogo_chiave)
);
-- partite.db: regalo per chiave (oggi `regalo_partita.regalo` è un nome libero; 0 righe nella partita reale)
ALTER TABLE utente.regalo_partita ADD COLUMN catalogo_chiave TEXT;
```
- Cestino: tipo `oggetto` (catalogo) — ricostruzione del CHECK come in L2; elimina l'oggetto con i suoi legami, gli articoli tornano senza catalogo
  (`SET NULL`), le partite non perdono niente (acquisti per articolo).
- `RIFERIMENTI_PARTITE` (`pacchettoGiocoService.ts:61-88`) con `regalo_partita.catalogo_chiave`.

## 2. Migrazione M7 (gioco.db + partite)
1. Schema del §1 (solo se manca); cestino con `oggetto`.
2. **Catalogo** (dati §9.1): 223 equipaggiamento (`nome` = nome italiano della `traduzione`, `nome_originale` = `oggetto.nome`, statistiche e
   descrizione dal dataset), 355 della guida (`oggetti-guida`: consumabili 247 con sottocategoria, chiave 82, materiali 26; `nome`, `nomeEn`, effetto,
   uso), 46 libri, 30 film, 7 videogiochi = **661**. Poi gli **articoli non abbinati di categoria non equipaggiamento** (regalo, altro, cibo,
   materiale, consumabile: per nome esatto normalizzato, uno per nome distinto — lo stesso nome in più negozi è lo stesso oggetto, dati §3) con
   `fonte_tipo='listino'`; e i **regali non in vendita** (dalla `confidente_regalo` senza articolo) con `fonte_tipo='guida'`. **L'equipaggiamento
   dei listini** (277 articoli arma/protezione/accessorio) **crea i suoi oggetti** con la stessa regola (uno per nome distinto normalizzato,
   categoria dell'articolo, `fonte_tipo='listino'`), **tranne** gli articoli il cui nome coincide esattamente con un equipaggiamento del dataset (3
   nomi, 5 articoli), che si collegano a quello al passo 3. Motivo (G-024 dell'Esperto, 2026-10-20, che chiude il dubbio di `dati.md` §2): non sono
   due traduzioni dello stesso pezzo; i 223 del dataset sono l'equipaggiamento dell'**itemizzazione** (Sedia elettrica), i 277 dei listini quello **in
   vendita** nei negozi; entrambi i nomi vengono dalla guida (commit a6afb365 del 2026-09-04). **Nomi**: quelli della guida, con le abbreviazioni del
   menu («Portaf.», decisione dell'utente del 2026-09-04); la forma estesa entra in `nomi_altri_json` solo dove la guida la scrive anche per esteso.
3. **Legami certi** (abbinamento esatto: nome normalizzato + categoria compatibile, un solo candidato): articoli ↔ guida **138**, ↔ equipaggiamento
   **3**, libri 41 e videogiochi 7 (da `oggetto_chiave`, già per chiave), articoli promossi al passo 2 (il loro oggetto); regali ↔ catalogo per nome
   esatto (116 attesi); ricette ↔ materiali per nome esatto; voci dei forzieri **non dell'utente** (`fonte` ≠ `utente`: Kaneshiro…Maruki, Iweleth) con
   contenuto certo (dati §7: 53 certi, quelli fuori dai due Palazzi); ricompense delle Richieste esatte (10).
4. **Proposte** (`proposta_abbinamento`, nessuna scrittura sulle righe): **nessuna** per l'equipaggiamento dei listini (G-024: oggetti diversi,
   promossi al passo 2). **Tanaka** (G-034): il listino di oggi (20 articoli in inglese) non è quello di Royal.
   - La guida ne elenca **18** diversi, in italiano, con prezzi e gradi (in G-034), e 10 nomi dell'app non vi compaiono.
   - **Regola** (Analisi dati `dati.md` §11 e §11.1, riga per riga, sulla base 0533Z): nessuna cancellazione. La M7 scrive solo le
     **proposte**, che vanno nell'elenco «Da rivedere» (L11) con il motivo per l'utente; tutto si applica **dopo il sì**.
     - **10 nascosti**: gli articoli che Royal non ha (`nascosto = 1`, pagina Rimossi).
     - **10 abbinati, che tengono la loro chiave**: 6 probabili, 2 possibili, le gemme elementali verso il primo Magatama, e Homunculus, il
       cui prezzo passa da 120.000 a **5.000**, con quello di prima in `seed_json`.
     - **8 nuovi**: 5 Magatama, lo Specchio spirituale oscuro, la Fotocamera spirituale e la Maschera sorridente, coi nomi, i prezzi e i
       gradi di G-034.
   - Prima del sì il listino visibile resta di 20 articoli; dopo il sì è di 18. Acquisti toccati: 0 (i 7 acquisti di p1 non sono di Tanaka).
   - Le proposte «probabili» della prima stesura (Black Kogatana → Kogatana nera…) sono sostituite da questa tabella.
   Poi: i contenuti dei forzieri di **Kamoshida e Madarame** (voci
   dell'utente: anche i certi passano dalla conferma, coerente con la regola «nessuna scrittura sul lavoro dell'utente senza sì»), i 42 contenuti
   non certi, le 24 ricompense non trovate (carte abilità: categoria `carta-abilita` proposta). L'elenco viene da un file di Analisi dati
   (`l7-proposte.json`, uid/chiavi complete) che BE legge nella migrazione.
5. **Scambi** (R7-13, segnalazione D). **Mercante Sakai** (G-031, `kichijoji/mercante-sakai`): uno scambio per ognuna delle 16 finestre di
   date (L6 §4.1), come articoli del suo listino con la condizione `data{dal, al}` della finestra, dalle righe della guida (proposte dove l'oggetto
   non è certo); Jose da `dati_guida.jose.scambi` (37, la copia completa) come listino del negozio `jose` (articoli con
   `costo_json` in fiori e i requisiti come condizioni); Sakai, Venditore ambulante, Gachapon dalle righe della guida come proposte verso i loro
   articoli dove esistono (voce per voce); Tanaka: i 4 raggruppamenti della guida restano nota. `oggetti-guida.scambi` non si legge più.
6. Partite: `regalo_partita.catalogo_chiave` per nome esatto (oggi 0 righe).
7. Nessuna cancellazione; nessun testo di voce o articolo cambiato; chiavi, prezzi e condizioni degli articoli invariati.
### Verifiche prima/dopo
| Misura | Atteso |
|---|---|
| catalogo | 661 + promossi dai listini (equipaggiamento in vendita compreso, un oggetto per nome distinto) e regali non in vendita (numeri esatti dal test sulla copia) |
| articoli | 587 invariati (chiave, prezzo, negozio, condizioni); con `catalogo_chiave` ≈ 189 certi + promossi (i 272 di equipaggiamento non coincidenti compresi) |
| equipaggiamento | 223 del dataset con i nomi di oggi; 5 articoli sui 3 nomi coincidenti collegati a quelli; nessun oggetto del dataset rinominato |
| proposte | forzieri di Kamoshida e Madarame; Tanaka: i 20 di oggi nell'elenco «Da approvare», più 18 articoli nuovi dalla guida; ricompense e forzieri «non trovati» ora certi, con gli oggetti creati dalla guida (G-034); equipaggiamento dei listini 0 |
| acquisti / letture / progressi / effetti delle letture della partita | 7 / **14** / 11+3 / **20** invariati (cifre della base 0533Z, Analisi dati §11; le 13 / 19 di prima erano della copia del 19/10) |
| condizioni di tipo `articolo` | **40 occorrenze in 20 articoli**, tutte con una chiave di articolo valida (`dati.md`, riga 79): stesso esito prima e dopo, sia contando le occorrenze (40) sia gli articoli che le portano (20) |
| impronta diario/Kamoshida/Madarame | identica; `voce_oggetto` vuota su Kamoshida e Madarame finché l'utente non conferma |

## 3. Letture dal catalogo (R7-04, R7-06, R7-07)
- **Nome**: articolo collegato → nome del catalogo; non collegato → `articolo.nome` come oggi (nessuna perdita finché la proposta non è
  confermata). Lo usano `articoloDto` (`negoziService.ts:74-83`), ricerca (140), suggerimenti, nomi nelle condizioni (`nomiCondizioni.ts:44`),
  popup del pin (`MerceNelPopup`), diario. Lo **storico** già scritto resta testo (segnalazione E: «Acquistato: …» dei giorni passati non cambia).
- **Prezzo**: solo dall'articolo; dalla pagina dell'oggetto «da 800 ¥ (Big Bang Burger) a 900 ¥»; le copie (`libro.prezzo`, `film.prezzo`,
  `attivita.costo` dei videogiochi, `oggetti-guida.prezzo`, `confidente_regalo.costo`) non si mostrano più come prezzo dove c'è un articolo; restano
  nota dove non c'è un listino (regali non in vendita, film senza DVD). Divergenze elencate (dati §4): Dango lunare 640/800, Agodashi Oden 800/900,
  Braccialetto d'argento 78.000/68.000 (G-024: la guida si contraddice e non c'è una terza fonte → vince il listino a 68.000, «78.000 nella pagina dei
  regali» in nota, certezza bassa), Modellino di moto, Chiesa di Kanda (AGS 14.000/12.000, L5). Vince il listino (dubbio 3).
- **Spesa del grado cliente** (`disponibilitaService.ts:145, 225-231`): invariata (somma dei prezzi degli articoli comprati).

## 4. API e DTO
- `CatalogoOggettoDto` (nuovo): chiave, categoria, nome, nomiAltri, nomeOriginale, effetto, descrizione, statistiche, `casa`
  (`/guida/oggetto/<categoria>/<slug>`), origine, modificato, nascosto.
- `OggettoDettaglioDto extends CatalogoOggettoDto`: `inVendita: Array<{ articolo, negozio, negozioNome, sedeCasa, prezzo | costo, condizioni,
  disponibileOggi }>` (L5/L6), `regalo: Array<{ confidente, nome, gradimento }>`, `forzieri: Array<{ voce, voceNome, palazzo, infiltrazione, area,
  quantita, casa }>`, `ricompense: Array<{ fonte_tipo, fonte_chiave, nome, casa }>`, `scambi`, `ricette`, `lettura` (per libri, film, videogiochi:
  i dati di oggi), `partita?: { acquistato, regalato, letto }`.
- `ArticoloDto` (1321-1347): `catalogo: { chiave; nome; casa } | null`, `costo` (scambi); `RegaloConfidenteDto` (224): `catalogo`, `prezzo` e `dove`
  dall'articolo (il testo di oggi come nota); `PuntoInteresseDto.contenuto: Array<{ chiave, nome, quantita, casa }>` (il testo `dettagli.contenuto`
  invariato); `RichiestaDto.ricompense` con `catalogo`; `LibroDto`, `FilmDto`, `VideogiocoDto`: `catalogo`.
- `PropostaAbbinamentoDto` e rotte (stesso schema di L3):
  `GET /api/catalogo-oggetti/proposte?riga_tipo=&stato=` · `POST /api/catalogo-oggetti/proposte/conferma` `{ riga_tipo, riga_chiave, catalogo_chiave }`
  (scrive il legame; per `catalogo` fonde i due oggetti: gli articoli/legami del secondo passano al primo, il secondo va nel cestino — R7-03) ·
  `POST …/proposte/scarta` (la proposta resta scartata, registrata) · `PUT /api/catalogo-oggetti/legami` per collegare a mano una riga.
- Catalogo: `GET /api/catalogo-oggetti?categoria=&q=&partita=` (ricerca su nome e nomi altri), `GET /api/catalogo-oggetti/:categoria/:slug`,
  `POST`/`PUT`/`DELETE` (cestino) con «Ripristina» (R7-17); `PUT /api/partite/:id/confidenti/:k/regali` con `catalogo` (chiave) al posto del nome
  (`bodyRegalo`, `schemas/partite.ts:204`; il nome resta accettato per compatibilità e si risolve per chiave).
- Pacchetto (R7-18): `gioco.db` porta tutto; il pacchetto mappe non c'entra.

## 5. Interfaccia
### 5.1 Pagina dell'oggetto `/guida/oggetto/:categoria/:slug` (`src/pages/OggettoPage.tsx`, nuova) — R7-08…R7-12, R7-16, R7-24
- Intestazione: nome, categoria (chip), nome originale, effetto/descrizione, statistiche (equipaggiamento); azioni «Modifica», menu (Elimina →
  cestino, Ripristina).
- **Dove si compra** (prima sezione su telefono): negozi con prezzo, «aperto adesso?» (L5) e disponibilità della partita (L6), link alla sezione del
  negozio nella pagina del luogo; acquisto con la spunta di oggi.
- **A chi piace**: Confidenti con il gradimento, link alla pagina del Confidente; «Regala» (L10 lo unificherà; qui la spunta del regalo di oggi).
- **Dove si trova**: forzieri (Palazzo › infiltrazione › area, link alla scheda del Palazzo sull'infiltrazione), ricompense (Richieste, domande,
  esami, Covo), scambi, ricette.
- **Forzieri dopo la conclusione del Palazzo** (R7-11b, G-026; Palazzo concluso di L4 §8.10/§8.14): con una partita, ogni forziere del Palazzo
  mostra il suo stato. «Preso» se è fatto il **pin di tipo `forziere`** della voce (il forziere vero e proprio); solo se la voce non ha un pin
  forziere vale la regola k/N della voce (L4 §8.11). Motivo (Analisi dati `dati.md` §11, copia 0440Z): `kamoshida-15-torre-centrale-raccogli-
  forziere-3` ha il pin forziere 615 raccolto e i due pin rampino 2010 e 2016 no (k/N 1/3), quindi con la sola k/N risultava «non più
  ottenibile», un falso positivo. Il contatore k/N della voce resta com'è in L4 (1/3 «in corso»); qui conta solo il forziere. «Non più ottenibile» se il Palazzo è **concluso**
  e la voce non è fatta: dopo il furto il Palazzo sparisce. «Da prendere» altrimenti. Per un **Seme** mancante la riga dice «Si compra da Jose» con
  il link al suo listino (G-026: fonte inglese, senza prezzo né data: nota «da verificare»). Calcolo nel server (`forzieri[].stato: 'preso' |
  'non-piu-ottenibile' | 'da-prendere'` in `OggettoDettaglioDto`), mai nel client. Verifica: un forziere non preso di Kamoshida p1 risulta «Non
  più ottenibile». Cifre sulla copia 0440Z: Kamoshida p1 21 presi e 0 «non più ottenibile» (con la regola del pin forziere; con la sola k/N
  sarebbero 20 e 1); Madarame p1 19/19. Letture della partita: `lettura_partita` 14 (11 libri), effetti di lettura 20 (Analisi dati §11).
- **Libri premio di una Richiesta** (dubbio 4: Shitamachi rinato, Parchi divertimento, Dolci cinesi): oggetti del catalogo **senza listino**,
  `ricompensa_oggetto` verso la Richiesta per chiave; «Dove si trova» mostra la Richiesta. Lo sblocco che danno vale **a lettura finita**
  (G-018, condizione `lettura{libro}` di L6).
- Per libri, film, videogiochi: la sezione di lettura/visione di oggi (stessi componenti delle pagine Libri/Film/Videogiochi).
- Formati: ≥1280 due colonne (intestazione + dove si compra | a chi piace + dove si trova), tabelle su desktop e schede su telefono (R7-26).
- **Contenuto dei forzieri: testo e legame restano separati** (Analisi app, `app.md` §9, sul codice dopo L2–L4).
  - Il testo `dettagli.contenuto` della voce oggi si modifica dalla voce (`GuidaDellArea.tsx:282, 324`, `EditorDettagli`). Resta così, ed
    è il testo che R7-21 vuole **invariato**.
  - Il legame strutturato `voce_oggetto` si cambia **solo** dalla riga «Contenuto» della voce (chip con l'oggetto, «Collega a un oggetto»,
    «Togli») o confermando una proposta. Modificare il testo non tocca il legame, e il legame non riscrive il testo: nessuna
    sincronizzazione automatica nei due sensi.
- **Il conteggio dei Palazzi non cambia**: `voce_oggetto` non tocca il `carattere` né lo stato delle voci (L4). Il completamento continua a
  contare gli oggetti permanenti di L4, non gli oggetti del catalogo.
- Cifre sul codice e sulla base 0533Z (Analisi app §9): voci con contenuto **172** (prima 174), di cui 145 permanenti, 25 rigenerabili e 2
  descrittive; boss con contenuto **11** dalle API dei Palazzi (prima 13: le 2 di scarto vanno ricontate sul database, forse voci dei Memento). I regali segnati nella partita reale e le 64 voci d'acquisto senza riferimento vanno
  ricontati sul database da Analisi dati.
### 5.2 Catalogo (R7-25)
`OggettiPage` (`/guida/oggetti`) diventa il **catalogo unico**: ricerca per nome (anche nomi altri), filtri per gruppo di categoria come chip
(«Tutti», «Equipaggiamento», «Consumabili», «Chiave e materiali», «Regali», «Libri», «Film», «Videogiochi», «Carte abilità»), ordinamento (nome,
prezzo minimo); ogni riga porta alla pagina dell'oggetto. Le schede di oggi «Fabbricazione», «Personalizzazione», «Abiti», «Scambi» restano come
sezioni (leggono il catalogo per i nomi). `/guida/libri`, `/guida/film`, `/guida/videogiochi` restano con il loro contenuto (avanzamento della
partita), con il nome di ogni elemento che porta alla pagina dell'oggetto.
### 5.3 Link verso l'oggetto (R7-16)
`src/components/guida/ArticoliTabella.tsx` (oggi `/guida/mondo/articolo/<k>`; righe aggiornate in `app.md` §9: diventa la pagina dell'oggetto, la mappa resta in «Dove si compra»), regali del
Confidente (`ConfidenteDettaglioPage.tsx:181-198`), contenuto dei forzieri (`GuidaDellArea`), ricompense (`RichiestePage.tsx:129`, `CovoPage`),
popup del pin (`VisoreMappa.tsx:994-1025`), Libri/Film/Videogiochi, suggerimenti, diario (voci d'acquisto con riferimento negozio: il nome
dell'articolo, se la voce ne cita uno, in L10).
### 5.4 «Abbinamenti da approvare» (R7-02, R7-03)
Sezione nel catalogo (chip «Da approvare · N», visibile solo se N > 0) e in Impostazioni: elenco raggruppato per tipo (listini, Tanaka, forzieri,
ricompense), per riga: cosa si collega (riga di oggi con il suo testo), proposta (oggetto con nome e categoria), motivo e certezza; «Conferma»,
«Scegli un altro oggetto» (ricerca nel catalogo), «Scarta». Su telefono una proposta per scheda; bersagli ≥44 px. Per i forzieri di Kamoshida e
Madarame la proposta si conferma anche dalla voce stessa (chip «Contenuto: proposta» in `GuidaDellArea`).
### 5.5 Testi
«Dove si compra» · «A chi piace» · «Dove si trova» · «Da 800 ¥ a 900 ¥» · «Abbinamenti da approvare» · «Conferma» · «Scegli un altro oggetto» ·
«Scarta» · «Proposta: …» · «Contenuto» · «Ricompensa di …» · «Scambio: 3 fiori» · «Catalogo» e i nomi dei gruppi; «Oggetto» è la parola per la
cosa, «Articolo» non compare più nell'interfaccia (è la riga del listino: «in vendita da»).

## 6. File e ordine
**BE**: 1. `shared/catalogo.ts`, `shared/types.ts` (DTO del §4, `TipoCestino` con `oggetto`); 2. migrazione M7 (+ utente per `regalo_partita`) +
test; 3. `server/services/catalogoOggettiService.ts` (nuovo: catalogo, dettaglio, proposte, fusione), `negoziService.ts`, `attivitaService.ts`
(58, 103-147), `compendioService.ts` (337-394), `oggettiSelezionabili.ts` (sostituito dal catalogo), `richiesteService.ts`, `dungeonService.ts`
(contenuto delle voci), `partiteService.ts` (326-338 regali per chiave), `suggerimentiService.ts` (95-107, 194-198), `condizioni/nomiCondizioni.ts`,
`cestinoService.ts`, `catalogoService.ts` (`ModuloArticolo`: niente più copia del nome quando c'è il catalogo); 4. rotte `catalogoOggetti.ts`
(nuova), `compendio.ts` (oggetti-guida via il catalogo), `partite.ts` (regali), schemi; 5. OpenAPI; 6. test.
**FE**: 1. `src/services/api/catalogoOggetti.ts`; 2. `src/router.tsx` (`guida/oggetto/:categoria/:slug`), `OggettoPage.tsx` (nuova), `OggettiPage.tsx`
(catalogo), `LibriPage`, `FilmPage`, `VideogiochiPage`, `ConfidenteDettaglioPage`, `RichiestePage`, `CovoPage`; 3. `components/guida/ArticoliTabella.tsx` (percorso corretto, `app.md` §9),
`components/guida/GuidaDellArea.tsx` (contenuto), `components/mappe/VisoreMappa.tsx` (merce), `components/catalogo/AbbinamentiDaApprovare.tsx` (nuovo),
`components/guida/moduli/ModuloArticolo.tsx` (scelta dell'oggetto dal catalogo, niente copia del nome); 4. test.

## 7. Piano dei test
### 7.1 BE
1. Migrazione M7: conteggi (catalogo, legami certi, proposte), nessun articolo/voce/acquisto cambiato, idempotenza, proposte uguali al file di
   Analisi dati; voci di Kamoshida/Madarame senza `voce_oggetto`.
2. Nomi: un articolo collegato prende il nome del catalogo; rinominare l'oggetto lo cambia in listino, ricerca, condizioni, popup; non collegato → nome
   dell'articolo (R7-04).
3. Prezzi: dall'articolo ovunque; la pagina dell'oggetto con più negozi; divergenze come note (R7-07).
4. Proposte: conferma di un articolo, di un forziere (Kamoshida), di una fusione (gli articoli passano al primo oggetto, il secondo nel cestino e
   ripristinabile), scarta, «scegli un altro» (R7-02, R7-03).
5. Regali per chiave: segnare un regalo per chiave e per nome (compatibilità) → stessa riga; `RIFERIMENTI_PARTITE` (R7-10, segnalazione B).
6. Scambi di Jose dal listino nuovo (37) e foglio di `RichiestePage` uguale a oggi (R7-13).
7. Libri, film, videogiochi: avanzamento, effetti delle letture (19), condizioni `lettura` invariati (R7-05, R7-19).
8. Cestino dell'oggetto con legami e ripristino (R7-17).
9. Test esistenti da allineare (app.md §5): `catalogo.test.ts`, `negozi.test.ts`, `negozio-del-pin.test.ts`, `libri.test.ts`, `film.test.ts`,
   `videogiochi.test.ts`, `oggetti-guida.test.ts` (247/108/10/8/55/5 restano come conteggi delle sezioni), `oggetti-selezionabili.test.ts` (sostituito),
   `effetti-letture.test.ts`, `confidentiDettaglio.test.ts:59`, `conservazione.test.ts`, `condizioni.test.ts` (59, 172-178), migrazioni 051/070/073/074/076,
   `pacchettoGiocoService.test.ts`, `disponibilitaService.test.ts`.
### 7.2 FE
`OggettoPage.test.tsx` (nuovo: sezioni, acquisto, link), `OggettiPage.test.tsx` (catalogo, filtri, ricerca), `AbbinamentiDaApprovare.test.tsx` (nuovo),
`LibriPage`/`FilmPage`/`VideogiochiPage` (link all'oggetto, avanzamento invariato), `NegozioPage`/`NegoziPage`, `ConfidenteDettaglioPage` (regali con
link e prezzo dall'articolo), `RichiestePage` (ricompense e Jose), `CovoPage`, `ModuloCatalogo`/`ModuloArticolo`, `GuidaDellArea` (contenuto e proposta).
### 7.3 Funzionali
«Fatto quando»: un oggetto (Medicina, un regalo, un libro, un'arma collegata dopo la conferma) ha una pagina che dice dove si compra, a chi piace,
dove si trova; con una partita di prova: comprare dalla pagina dell'oggetto, segnare un regalo, confermare una proposta e scartarne una, fondere due
oggetti e rimetterli dal cestino (pulizia a fine prova).
### 7.4 UX
Dal telefono: cercare un oggetto e vedere in un colpo dove comprarlo oggi e a chi regalarlo (R7-24); il catalogo con i filtri resta gestibile (R7-25);
le proposte si capiscono e si confermano una per una senza fatica.
### 7.5 No-reg
Acquisti, regali, letture, visioni e progressi della partita reale copiata uguali (R7-19); diario 04-01..06-01 e i 62+22 avanzamenti di libri e film
(R7-20); testi dei forzieri di Kamoshida e Madarame invariati (R7-21); totali di listini, punti negozio, grado cliente e scambi uguali (R7-22).
### 7.6 Layout
Pagina dell'oggetto, catalogo, elenco delle proposte: 1280, 768, 375, 1366×657, 1280×689; tabelle su desktop, schede su telefono; bersagli ≥44 px.

## 8. Da approvare (scelta prudente applicata)
1. **Equipaggiamento dei listini** (277 articoli) — chiuso da G-024: oggetti propri (equipaggiamento in vendita), promossi in migrazione; i 5
   articoli sui 3 nomi uguali al dataset si collegano a quell'oggetto.
2. **Quale nome per l'equipaggiamento** — chiuso da G-024 e da **R7-03b** (requisiti riletti): ogni oggetto ha il nome della guida, abbreviazioni
   del menu comprese (decisione dell'utente del 2026-09-04). **Se la guida scrive per lo stesso oggetto sia la forma estesa sia l'abbreviata, si
   mostra l'estesa** e l'abbreviata va in `nomi_altri_json` (la ricerca trova entrambe); con la sola abbreviata si mostra l'abbreviata. I 223
   del dataset e i 277 dei listini restano **oggetti distinti** (nessuna fusione per nome, salvo le fusioni approvate; coincidono solo 3 nomi).
   Test: un oggetto con le due forme mostra l'estesa e si trova con l'abbreviata.
3. **Forzieri di Kamoshida e Madarame**: anche i contenuti certi passano dalla conferma (voci dell'utente); quelli degli altri Palazzi certi si
   collegano in migrazione.
4. **Tanaka** (G-034, regola di Analisi dati): 10 articoli da nascondere, 10 da abbinare (Homunculus a 5.000) e 8 nuovi, tutto come proposte
   nell'elenco «Da rivedere» e applicato solo col sì. Nessuna cancellazione e nessun acquisto toccato. Altre cifre sulla base 0533Z: 1 riga di
   regalo corretta (Shinya, 4.800) e 1 Richiesta corretta (Sciabola del rischio), col testo di prima in nota; prezzi dei listini invariati;
   Jose 37 righe. Impronta «prima» di L7: `b4d47371…`.
12. **Altre correzioni di G-034**:
    - la ricompensa della Richiesta «Lo zio ingordo» è la **Sciabola del rischio**, arma per Mona: legame certo in `ricompensa_oggetto`;
    - Modellino di moto **4.800**; il 3.600 è del «Set di mascotte locali». Sulla base 0533Z il listino e i regali di Makoto e Futaba hanno già
      4.800 (Analisi dati `dati.md` §11). Si corregge **solo** il regalo di Shinya (`confidente_regalo` shinya, ordine 1): «3.600-4.800 yen
      (fonti discordanti)» → «4.800 yen», con `seed_json` (Ripristina). Il «Set di mascotte locali» si aggiunge come articolo solo se manca;
    - Richiesta «Lo zio ingordo»: `ricompense_json` «Venture Saber / Spadone dell'impresa…» → «Sciabola del rischio» (arma per Mona), più il
      legame certo in `ricompensa_oggetto`;
    - Tanaka: i 7 acquisti di p1 non sono di Tanaka, quindi rifare il listino non tocca nessun acquisto;
    - Jose: le 37 righe sono giuste, la copia da 24 è incompleta (resta nota, già così);
    - Dango lunare (800), Agodashi Oden (900) e Homunculus (5.000): la guida si contraddice, quindi vince il listino;
    - forzieri e ricompense «non trovati» hanno i nomi giusti e mancano solo nel catalogo: la M7 **crea quegli oggetti** dal nome della guida
      (`fonte_tipo='guida'`), e i loro legami diventano certi, salvo i forzieri di Kamoshida e Madarame, che restano proposte da confermare.
5. **Carte abilità**: categoria nuova `carta-abilita` per le ricompense; gli oggetti si creano dalle proposte confermate.
6. **Prezzi divergenti**: vince il listino; Braccialetto d'argento 68.000 con 78.000 in nota (G-024, certezza bassa: da rivedere con l'utente).
   Chiesa di Kanda: valgono i prezzi della guida italiana (G-013: Vino della grazia 14.000, Ceneri del pentimento 12.000), corretti sugli articoli
   con `seed_json` (Ripristina), elencati.
11. **Disponibilità degli articoli per giorno o meteo** (L5 R5-12b ambito 3; G-029, G-033), come condizioni degli articoli (valutatore di
    L6), solo dove la fonte lo dice:
    - Panino con yakisoba: il venerdì;
    - i tre articoli con la pioggia;
    - distributore del sottopasso: vuoto con Ondata di calore e Notte torrida;
    - Katsu a pezzettoni di Hagoromo: la domenica sera. **C'è già** sulla base 0503Z (`friggitoria-hagoromo/katsu-a-pezzettoni`:
      `quartiere{kichijoji}`, `data{06-05}`, `giorno-settimana{domenica}`, `fascia{sera}`): la migrazione **controlla** che ci sia e non
      scrive niente. Nell'elenco «Da rivedere» per la certezza bassa (G-033).
    Per gli altri casi si applica la stessa regola: si scrive solo la condizione che manca, e quella che c'è già si controlla.
    `negozio.orari` di Hagoromo diventa una nota.
10. **Distributori** (dubbio 7, G-014): listini **ripetuti** fra più luoghi = un set condiviso: **un solo negozio per set** (A, B, D) con un
    listino, e una tabella nuova `negozio_luogo_extra (negozio_chiave, luogo_chiave, PRIMARY KEY (negozio_chiave, luogo_chiave))` per i luoghi
    oltre la sede (`negozio.sede_chiave` di L5 resta la prima). La pagina del luogo (L5) elenca i negozi della sede **e** quelli di
    `negozio_luogo_extra`. Gli articoli oggi duplicati per luogo restano finché L11 non li toglie; le viste leggono il set. Il **set C con la
    Creatura** diventa listino solo dopo il sì dell'utente, insieme ai pin 1584 e 1769 di L5 (§7.6): nessuna scrittura prima.
7. **Jose**: la copia completa (37) diventa il listino; la copia di `oggetti-guida.scambi` (24) resta nota.
8. **Pagine Libri, Film, Videogiochi** restano come sono (con l'avanzamento), più il link all'oggetto, invece di diventare solo un filtro del catalogo.
9. **Lo stesso nome in più negozi è lo stesso oggetto** (promozione automatica per le categorie non equipaggiamento).
