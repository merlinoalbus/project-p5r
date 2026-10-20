# L11 «Pulizia e ricerca» — stesura delle modifiche

Autore: sessione «Stesura modifiche» (2026-10-20). Ingressi: `requisiti.md` (R11-01…R11-27, dubbi 1–5), `dati.md` (§1–§5, inventario completo
`inventario-prod.md` di Analisi dati), `app.md` (§0–§5, segnalazioni A–D), e i progetti di L1–L10 (ognuno lascia le sue fonti vecchie «senza
lettori» e le elenca). L11 si fa **dopo la consegna di L10**; la migrazione prende il primo numero libero («M11»).

**Principio**: si elimina solo ciò che è provato morto (nessun lettore nel codice **e** sostituito da un lotto consegnato), con una migrazione
append-only, la copia di sicurezza e le impronte identiche prima/dopo; ciò che serve a «Ripristina» o alla provenienza (`seed_json`, `origine`,
`fonte`, `verificato`, `updated_at`) resta; i test non si cancellano (si aggiornano o si dichiarano superati con motivo).

## 1. Pulizia di dati e codice (R11-01…R11-06)
### 1.1 Procedura (vincolante, perché l'elenco di oggi cambia con L2–L10: segnalazione A)
1. **Inventario a L10 consegnato**: Analisi dati rigenera `inventario-*.md` (tabelle e colonne con righe, valori, costanti, vuote); Analisi app lo
   incrocia con i lettori del codice (`FROM`/`JOIN`, campi letti e restituiti in `server/`, `shared/`, `src/`, esclusi test e migrazioni). Il risultato
   è `lotti/L11/inventario-lettori.md`: per ogni tabella e colonna, i lettori, il lotto che l'ha sostituita, la decisione (elimina / tieni come archivio
   con motivo / tieni).
2. **Elenco delle eliminazioni** = le righe «elimina» dell'inventario; base attesa (dati §2, app.md §0): `mappa.entita_*`, `mappa_entita`,
   `mappa_presentazione.gruppo_immagini_json` (mondo e Palazzi, dopo L2 e L3), `guida_mappa`, `marcatore_mappa`, le schede senza mappa (righe di
   `spillo` con `mappa_chiave` NULL, dopo L4), `marcatore_luogo`, `pianta_area`, le copie in frase di `negozio.luogo`/`luogo_chiave`/`luogo.negozio`,
   `luogo.attivita_json`, `luogo.giorni`, `negozio.orari`/`orari_json`, `giorno_calendario` e `giorno_percorso` (fuse in `giorno`, L9),
   `esame.domande_json`, `dati_guida.oggetti-guida.scambi[Jose]`, le copie delle debolezze delle Ombre e delle voci (L8), le righe `spillo_partita`
   dei pin con voci non descrittive (L4, dopo il confronto), `punto_partita.automatico`, `organizzazione_mappa_esito`, i blocchi di `dati_guida` senza
   lettori (`mappe-assenti`, chiavi non lette di `finestre-dungeon`), `produce_json` (L10). **`pianta_quartiere` resta** (viva: `QuartierePage`,
   `EditorMappaPage:243`) se L2 non l'ha sostituita. Le **frasi** di sblocco e orari restano come **note** dove aggiungono contesto (R6-18): si elimina
   solo una colonna che è **copia** esatta di un dato strutturato.
2b. **Fonti vecchie aggiunte dalla rilettura dei requisiti** (R11-02b, 2026-10-20), con la stessa procedura (nessun lettore provato, impronte
   identiche):
   - le righe di `spillo_partita` dei **pin condivisi da rigenerabili di più infiltrazioni**, sostituite da `spillo_partita_infiltrazione`
     (L4 §8.11). Si eliminano **solo** dopo un confronto p1/p2 senza differenze fra lo stato letto prima e dopo, pin per pin e infiltrazione per
     infiltrazione;
   - l'euristica `bossFinali`/`eBossFinale` (`palazziService.ts:56-94`), sostituita da `dungeon.voce_boss_finale` (L4 §8.14);
   - le frasi di sblocco dei quartieri, sostituite da `quartiere.condizioni_json` (L6). Una frase che aggiunge contesto resta nota (punto 2);
   - le righe di `traduzione` coi nomi vecchi degli elementi, se ne restano (L8 §1.3), e le costanti nel codice;
   - `requisito_partita` (conferme «a mano» dei requisiti manuali, 0 righe sulla copia 0440Z) dopo che L6 ha tolto il tipo `manuale` e i
     suoi lettori (`semaforiService.ts:9, 105`; R6-01b);
   - le copie di orari divise da R5-12b (L5 §1.1): `luogo.quando`/`giorni`/`giorni_json` dove sono passati a `orari_json`, i giorni di
     Hifumi sulla Chiesa di Kanda dopo che L9 li ha portati alla disponibilità del Confidente, `negozio.orari`/`orari_json` dopo
     `eccezione_orari_json`.
   Le **righe di stato** (`spillo_partita`, `punto_partita`) si eliminano solo con il confronto p1/p2 senza differenze, allegato.
3. **Tabelle di partita vuote** (`ciclo_salvato`, `obiettivo_partita`, `piano_salvato`, `trofeo_partita`, …): **non** si eliminano se c'è codice che
   le scrive (funzioni non ancora usate dall'utente).
4. **Migrazione M11** (gioco + partite): per ogni eliminazione, controllo «0 lettori» già fatto, `DROP` della tabella o ricostruzione senza la colonna
   (modello 078/098/103), impronte (`impronta.cjs`, `impronta-mondo.cjs`) **identiche** prima/dopo e conteggi elencati.
5. **Migrazioni vecchie che importano servizi vivi** (segnalazione C): `027` (`sincronizzaMappe`), `038`, `042` (`riconciliaAreeGuida`) ricevono una
   **copia congelata** del codice che usano dentro `server/db/migrations/congelati/` prima di togliere i servizi; così una base vecchia si migra ancora.
6. **Codice morto** (app.md §0.4): rotte senza consumatori (`GET /api/mappe/entita/:tipo/:chiave`, `GET /api/compendio/arcani`, `GET
   /api/catalogo/oggetti-di/:categoria`, `GET /api/partite/attiva`, `GET /api/partite/:id`, `GET /api/immagini/:ambito/:chiave` JSON, `PUT
   /api/mappe/pezzi/:id` se nessuna vista lo usa) con le loro descrizioni OpenAPI (`openapi.test.ts:36` lo richiede); funzioni usate solo dai test
   (`applicaPresenzaAiLuoghi`, `collegaPalazziAiLuoghi`, `sincronizzaMappe`, `riconciliaAreeGuida` dopo il congelamento, `importaPacchetto`,
   `ripristinaIstanza` se davvero inutilizzate, `zoneDeiPezzi`, `eTipoLuogo`, `impostaLettura` del client), i DTO e i campi che portavano le fonti
   eliminate (es. `LuogoDto.marcatore`, `PuntoDto.marcatore`, `MappaRiassuntoDto.gruppoImmagini`); `useRisolviAsset` (`assetStore.ts:91`): si
   toglie se nessuno la usa e si corregge ARCHITETTURA §L1 che dice il contrario (segnalazione B). Typecheck e lint confermano (nessun import orfano).
7. **DDL utente allineato** (segnalazione D): `schemaUtente.ts` con `spillo_partita.spillo_uid` (non `spillo_id`, riga 64) e senza le tabelle
   storiche che non esistono più (`TABELLE_UTENTE_STORICHE` 78-89), così `creaSchemaUtente` e i test usano lo schema reale.
**Cifre sulla base `p5s-2026-10-20-0503Z`** (Analisi dati `dati.md` §6–§7): tabelle 110, colonne 816 (con `immagine_miniatura` della 108),
colonne costanti 74; voci della guida 961; `punto_partita` 564, `spillo_partita` 797, `evento_partita` 1316. La struttura dell'elenco non
cambia; impronta di riferimento `ff3033cb…`. Nell'elenco «Da rivedere» il falso positivo del forziere e le 4 divergenze non hanno più casi
nei dati: restano solo come casi di prova.
### 1.2 Pacchetti e cestino
- **Pacchetti vecchi** (R11-05, dubbio 3): `caricaPacchetto`/`ricaricaPacchetto` (`pacchettoGioco.ts:100-160`) **accettano** le tabelle e le colonne
  eliminate (le migrazioni le convertono e poi le scartano) e restituiscono un **riepilogo** «tabelle e colonne scartate» mostrato in Impostazioni ›
  Pacchetto; mai un rifiuto. L'export non le porta più.
- **Cestino** (R11-06, dubbio 2): `ripristinaDalCestino` (`cestinoService.ts:283-389`) rimette solo le colonne che esistono ancora; le altre vanno fra
  le «saltate» con motivo `colonna-rimossa`, e una riga di una tabella eliminata con motivo `tabella-rimossa`; gli elementi già nel cestino restano
  ripristinabili per ciò che può tornare. `ETICHETTE` (55-80) e `RIFERIMENTI_PARTITE` (`pacchettoGiocoService.ts:61-100`) aggiornati.
### 1.3 Test (R11-04)
I test delle strutture eliminate (app.md §3) si aggiornano al modello nuovo; quelli che provano solo la struttura tolta si dichiarano superati con un
commento e il riferimento al lotto, **senza cancellare il file** (regola dell'utente del 2026-10-18); nessuna variante rossa lasciata.

## 2. Ricerca globale (R11-07…R11-10, R11-25)
- **Server**: `GET /api/ricerca?q=&tipi=&limite=&partita=` (`server/services/ricercaService.ts`, nuovo). Un **indice** in memoria (svuotato da
  `invalidaCacheDiGioco` a ogni scrittura dei dati di gioco) con una riga per oggetto: `tipo`, `chiave`, `nome`, `nomiAltri` (nome originale da
  `traduzione`, `nomi_altri_json` del catalogo e delle Ombre, `nome_it` di libri e film, e i **sinonimi di G-038**), `percorso` («Tokyo › Shibuya › Central Street ›
  Untouchable», dalle case di L2–L9), `casa`, `immagine` (risolutore di L1, miniatura), `nascosto`. Tipi: quartiere, area (mondo e Palazzo),
  planimetria, luogo, negozio, Palazzo, infiltrazione, dedalo, area del dedalo, voce della guida, Persona, Ombra, oggetto, Confidente, attività,
  libro, film, videogioco, Richiesta, giorno, trofeo, sfida. Confronto con `normalizzaTesto`/`corrispondeRicerca` (`shared/testo.ts:6, 17`: senza
  accenti e maiuscole), da 2 lettere; ordine: corrispondenza all'inizio del nome, poi nelle parole, poi nei nomi altri; i nascosti esclusi come
  nelle viste (R11-10), i blocchi della grafica predefinita come nelle viste. **Solo nomi e titoli** (dubbio 4): i testi lunghi (voci, diario) restano
  alle ricerche delle loro pagine.
- **Interfaccia**: pulsante «Cerca» (icona) nella barra superiore e nella barra inferiore del telefono, scorciatoia `/` da tastiera; finestra
  `RicercaGlobale` (a tutto schermo su telefono, pannello largo da 1024 px) con campo, risultati **raggruppati per tipo** con l'immagine, il nome e il
  percorso; il tocco porta alla casa e chiude; indietro torna dov'eri (la partita resta: R11-25). Le ricerche locali delle pagine restano.
- **Sinonimi per la ricerca** (G-038 dell'Esperto): un blocco di dati di gioco `dati_guida.sinonimi-ricerca`, modificabile con
  `correzione_dati_guida` (§4), con le righe `{ chiave dell'oggetto, sinonimi[] }` della tabella di G-038:
  - i nomi in codice: Skull, Panther, Mona, Fox, Queen, Oracle, Noir, Crow, e Sumire per Kasumi;
  - le Persona del gruppo in inglese (Hecate, Mercurius, Johanna, Prometheus, Hereward, Cendrillon…);
  - le varianti di grafia (Koropokguru, Norna);
  - le abbreviazioni del menu;
  - Palazzo di Sae per Niijima, Palazzo sconosciuto per Maruki.
  L'indice li aggiunge ai `nomiAltri` dell'oggetto. Test: cercare «Queen» trova Makoto, «Palazzo di Sae» trova il Palazzo di Niijima.
- **Luoghi chiusi e segni** (R11-10b): la ricerca trova **anche** i luoghi chiusi o non ancora sbloccati. Il risultato porta «Chiuso adesso» o
  «Non ancora aperto» con il motivo (`presenzaDelLuogo` di L5, testo generato dalla condizione). La ricerca è consultazione, non navigazione:
  il tocco apre la pagina del luogo, che mostra lo stato. Le aree `da_verificare` portano il chip «Da verificare». Nei risultati e
  nell'albero (§3) non compare mai «Mappa», «Mappe» o «atlante» come nome di un posto (test sul DOM).
- **Elenco unico «Da rivedere»** (R11-10c, **accolta dal PM** il 2026-10-20):
  - Pagina `/guida/da-rivedere`, con un contatore nella barra superiore quando N > 0.
  - Raccoglie per tipo, dal server (`GET /api/da-rivedere?partita=`):
    - voci del diario con `da_rivedere` (L3 §1.4, L10);
    - proposte d'infiltrazione non confermate (L3);
    - divergenze di partita (L4);
    - aree e dati `da_verificare` (L2 staff, L6 Roppongi e Maihama);
    - proposte di abbinamento (L7);
    - elenchi «da approvare» dei lotti (pin 1584 e 1769, set C, nomi da rinominare);
    - Palazzi con «Boss finale da dichiarare» (L4 §8.15 punto 8, `bossFinaleDaDichiarare`), col gesto «Modifica › Boss finale»;
    - note proposte sui pin dell'utente, con i gesti «Aggiungi la nota» e «Scarta». Primo caso: il pin 811 di Madarame, nota di G-030
      (L4 §8.14);
    - proposte alternative dell'Esperto sulle voci del team, con i gesti «Applica» e «Tieni com'è». Primo caso: G-028 (b), togliere la voce
      di Makoto del 30/7 e tenere l'invito solo come evento con condizioni (L10 §4); «Applica» la manda nel cestino;
    - correzioni di dati in attesa del sì.
  - Ogni riga ha lo **stesso gesto** della sua pagina («Tieni il nuovo» / «Rimetti il precedente», «Conferma», «Segna la voce» / «Togli il
    fatto al pin», «Tieni» / «Rimuovi»), chiamando le stesse rotte, e il link alla pagina.
  - Nessuna logica duplicata: ogni tipo registra un fornitore `{ tipo, elenca(partita), gesti }` nel servizio.
  - Se il PM non la conferma, resta il solo contatore con i link alle pagine.
- **Controllo automatico** (R11-09): un test che, per ogni tipo, prende tutti gli oggetti, li cerca per nome e verifica che il primo risultato del tipo
  sia lui e che la sua `casa` sia una rotta esistente del router (nessun 404); stesso controllo per gli indirizzi vecchi dei lotti (R11-22).

## 3. L'indice «Mappe» come albero (R11-11…R11-14, R11-26)
- **Server**: `GET /api/mappe/gerarchia` (al posto dell'elenco piatto `GET /api/mappe/albero`, che resta per l'editor finché lo usa): nodi tipizzati
  `{ tipo: 'citta' | 'quartiere' | 'area' | 'planimetria' | 'palazzo' | 'infiltrazione' | 'memento' | 'dedalo' | 'area-dedalo' | 'da-collocare'; chiave;
  nome; casa; immagine; conteggi; figli }`: **Tokyo** › Quartieri › Aree › Planimetrie (versioni) e «Aree della città» (staff, L2); **Tokyo** ›
  Palazzi › Aree › Planimetrie, con le Infiltrazioni come elenco accanto all'area (L3); **Memento** › Dedali › Aree (senza planimetrie); **Da
  collocare** (L2, L3).
- **Interfaccia** (`MappaPage` › `IndiceMappe`, 72-222 sostituiti): un albero con rami chiusi per default oltre il quartiere/Palazzo, miniatura e
  conteggi accanto ai nodi, ogni nodo un collegamento alla **casa** (Quartiere, Area, scheda del Palazzo, menù del Dedalo); nessun nodo apre viste
  alternative (via il visore di Tokyo, la riga «Tokyo» che apriva la mappa, il nodo illustrazione, la griglia del Palazzo); scorrimento proprio con
  confine evidente e `overscroll-behavior: contain`; titolo e testi senza «Mappe»/«mappe» come nome di posti (righe M3–M5 del censimento, L5 §4.4b): la
  pagina si chiama **«Luoghi della guida»** (proposta, §6.3) con il sottotitolo «Città, Palazzi e Memento con le loro aree». `AlberoLuoghi` e
  `radiciRaggruppate` si tolgono.
- **Cosa contano l'intestazione e i nodi** (R11-26; analisi dell'Elenco delle mappe, `lotti/L2/analisi-elenco-mappe.md`, punti E1, E2, E6, E8):
  - **E1**: oggi l'intestazione dice «308 mappe», contando le righe di `mappa` con le versioni (`MappaPage.tsx:121`). Nell'albero conta le
    **cose**, ciascuna col suo nome: «1 città · 23 quartieri · 23 aree del mondo (29 planimetrie) · 8 Palazzi, 101 aree (219 planimetrie) ·
    Memento». Lo calcola il server, nei `conteggi` della radice, mai il client.
  - **E2**, **deciso dall'utente** e anticipato nel rilascio di L3 (L3 §7.3): pin di contenuto con accanto «più N passaggi e M note»,
    con la regola unica `gruppoConteggioSpillo`. L'albero di L11 usa gli stessi `conteggiPin`.
  - **E6**: il conteggio dei pin di un'Area somma le versioni (`AlberoLuoghi.tsx:70`) e conta due volte un oggetto presente su più versioni
    (stima per eccesso: 293 su 1234). Regola: il pin conta **una volta per oggetto**, cioè per riferimento (luogo, negozio, voce), non per
    versione; i pin senza riferimento contano per posizione. Lo calcola il server. Test su un'Area concreta con più versioni (il Covo, e il
    Sottopasso), confrontata a mano con l'elenco delle versioni.
  - **E8**: oggi i Memento mancano dall'indice, e «Dedalo di Iweleth» sta fra i Palazzi. Nell'albero il **Memento** è una radice accanto a
    Tokyo, con i suoi dedali e le aree (§3, sopra); **Iweleth** sta **sotto il Memento** come dedalo (L8 D3; L4 §8.15: `regola_boss =
    'memento'`) e non fra i Palazzi, con l'«Archivio del Palazzo di Iweleth» dentro il suo nodo. **Deciso** (Manager, 2026-10-20: regola della
    gerarchia dell'utente); in L11 insieme a E1 ed E6.
- **«Nuova mappa»** generica non esiste più (verifica finale dopo L2/L3: R11-14): l'editor resta per pin, ritagli, pezzi e passaggi; i suoi testi
  (riga M27) diventano «Planimetria», «Area», «Arrivo: <nome>»; «Mappe scaricate» (M29) → «Planimetrie e illustrazioni».

## 4. «Modifica» e «Ripristina» ovunque (R11-15…R11-17)
- **Un modulo, un registro**: `server/services/ripristinoService.ts` (nuovo) con il registro degli oggetti modificabili `{ tipo, tabella (o blocco di
  dati_guida), chiave, campi, valoreDellaGuida() }` e due funzioni uniche `correggi(tipo, chiave, campi)` (alla prima correzione salva il valore della
  guida in `seed_json` e mette `origine='utente'` dove la riga è della guida) e `ripristina(tipo, chiave)` (rimette `seed_json`); il FE usa
  `ModuloCatalogo` (`ModuloCatalogo.tsx:74-80, 115-118`) come forma unica «Modifica / Ripristina» per tutti.
- **Oggetti che oggi non l'hanno** (app.md §0.8, piano «Tutto modificabile»), chiusi qui se un lotto precedente non l'ha già fatto: quartiere (nome,
  descrizione; lo sblocco è di L6), area e planimetria (L2/L3), Palazzo (scheda, finestra, atterraggi), infiltrazione, voce della guida, area del
  dedalo e Persona nel dedalo, Richiesta, voce del diario (istantanea alla prima modifica), giorno ed evento del calendario (L9), Confidente (L9),
  **Persona** (dati del compendio: arcano, livello, affinità, abilità), **skill**, Ombra (L8), **personaggi**, **sfide**, **trofei e completamento**,
  **ranghi delle Doti**, esami (L9). Per i blocchi JSON di `dati_guida` (personaggi, sfide, completamento) la correzione sta in una tabella
  `correzione_dati_guida (blocco, elemento, campo, valore_json, guida_json, updated_at)` letta sopra il blocco dal servizio che lo serve: un solo punto
  di modifica, «Ripristina» = togliere la riga.
- **Oggetti nati nell'app** (dubbio 5): niente «Ripristina», e lo si dice («Creato da te: non c'è un valore della guida»).
- **Le correzioni restano dopo un aggiornamento del pacchetto** (R11-16): `ricaricaPacchetto` (`pacchettoGioco.ts`) già tiene le righe `utente` e
  quelle con `seed_json`; si estende alle tabelle nuove dei lotti e a `correzione_dati_guida`. Prova su copia per ogni tipo: correzione, import,
  correzione ancora lì.
- **Elenco di verifica** consegnato: per ogni oggetto del piano, dove si modifica, se ha «Ripristina», esito della prova (R11-15, R11-17).

## 5. Documenti (R11-18…R11-20)
Li scrive il Project manager con i testi di BE e FE (processo): `docs/ARCHITETTURA.md` riscritto sul modello finale (le righe superate in app.md §2,
§L1 compreso), `docs/ROADMAP.md` (L0–L11 con lo stato reale), `docs/DECISIONI.md` (una voce per lotto; scelte «consigliate applicate, da confermare»
distinte da quelle confermate dall'utente; stato finale di D1–D8), `docs/MAPPE.md`. BE aggiorna `server/openapi/descrizioni/*` (solo rotte esistenti,
vocabolario nuovo, redirect documentati come tali).

## 6. Piano dei test
### 6.1 BE
1. Migrazione M11 sulla copia di produzione migrata a L10: ogni eliminazione con «0 lettori» provato, impronte identiche, conteggi; base vecchia
   (pacchetto di oggi) migrata da zero fino a M11 con le migrazioni congelate.
2. Pacchetto vecchio importato: tabelle e colonne scartate nel riepilogo, nessun errore (R11-05).
3. Cestino: un elemento eliminato prima di L11 si rimette con le «saltate» `colonna-rimossa`/`tabella-rimossa` (R11-06).
4. Ricerca: per ogni tipo, ogni oggetto si trova e porta a una casa esistente (R11-09); nascosti esclusi (R11-10); nomi originali; accenti.
5. Gerarchia: nodi e conteggi per Tokyo, Shibuya, Madarame, Memento; nessuna casa alternativa (R11-11, R11-12).
6. Ripristino: per ogni tipo del registro, correggi → ripristina; correzione → import del pacchetto → correzione presente (R11-16).
7. OpenAPI: `openapi.test.ts` con le sole rotte esistenti.
### 6.2 FE
`RicercaGlobale.test.tsx` (nuovo: apertura dalla barra e con `/`, raggruppamento, percorso, navigazione, indietro), `MappaPage.test.tsx` (albero,
rami chiusi, collegamenti alle case), test dei moduli «Modifica/Ripristina» nuovi (Persona, skill, personaggi, sfide, trofei, ranghi delle Doti).
### 6.3 Funzionali
«Fatto quando»: nessuna tabella o colonna senza lettore (inventario finale allegato); ogni oggetto si trova dalla ricerca. Indirizzi vecchi di tutti i
lotti sulla casa giusta (R11-22); navigazione dalla metro, dal diario e dalla ricerca agli stessi Palazzi, infiltrazioni e voci (R11-23). Prova completa
del piano (righe 393-400) sulla partita reale copiata e su una di prova (R11-21).
### 6.4 UX
Dal telefono: ricerca con un tocco, 3 lettere, la pagina e indietro alla partita (R11-25); albero leggibile e navigabile (R11-26); i nomi nuovi
(«Luoghi della guida») chiari.
### 6.5 No-reg
Impronte del diario, di Kamoshida, di Madarame e del mondo identiche prima/dopo ogni eliminazione; correzioni dell'utente (`origine='utente'`) tutte
presenti; typecheck, lint, test mirati e `npm audit --omit=dev --audit-level=high` verdi (R11-24).
### 6.6 Layout
Ricerca (tutto schermo su telefono), albero, moduli nuovi: 1280, 768, 375, 1366×657, 1280×689; bersagli ≥44 px; scroll dell'albero con confine evidente.

## 7. Da approvare (scelta prudente applicata)
1. **Tabelle di partita vuote con codice che le scrive**: si tengono.
2. **Frasi di sblocco e orari**: restano come note; si eliminano solo le copie esatte.
3. **Ricerca solo su nomi e titoli** nella prima versione (dubbio 4).
4. **Nome della pagina dell'indice**: «Luoghi della guida» al posto di «Mappe» (coerente con la decisione dell'utente sui nomi nella navigazione).
5. **Correzioni dei blocchi JSON** in una tabella di correzioni sopra il blocco, invece di trasformare i blocchi in tabelle.
6. **Migrazioni congelate** per 027, 038, 042 prima di togliere i servizi che importano.
7. **Elenco unico «Da rivedere»** (R11-10c): pagina di sola raccolta con i gesti delle pagine d'origine. **Accolta dal PM** il 2026-10-20 (dopo G-031
   ci vanno: Sakura Residence, senza sblocco proprio e con certezza media; il negozio del libro «Pagine ammuffite», Hinokuniya o Taiheido; la
   nota del pin 811 di Madarame (G-030); la scelta (a)/(b) per Makoto 30/7; le voci boss di Madarame con «Gelo» e «respinge». Il motivo per l'utente (G-038) dice: «Uniformazione, non correzione: la scheda della guida
   scrive proprio "Gelo"; l'app usa "Ghiaccio" come nome unico dell'elemento. Applica per uniformare, o tieni il testo della guida»).
