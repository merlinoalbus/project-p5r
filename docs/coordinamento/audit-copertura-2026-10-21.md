# Matrice di copertura dell'audit — 21 ottobre 2026

Trascrizione sintetica delle matrici dei revisori distinti `revisore_l5_l6` e `revisore_avversariale_l7`, lette direttamente dalle specifiche originali. Fonte requisiti: `docs/coordinamento/lotti/L5|L6|L7/requisiti.md@43ad8889`; M5/M6/M7 indica `modifiche.md` del rispettivo lotto alla stessa revisione. L5/L6: codice **pubblicato `c025154a`**; L7: **working tree non pubblicato** su quella base. Le righe del codice si riferiscono a questi stati, non ai documenti correnti. Nessun test, DB, build o gesto funzionale eseguito dai revisori.

Legenda: **S** riscontro statico favorevole del percorso indicato; **P** parziale; **NC** non conformità dimostrata; **NV** non verificato con sola lettura; **D** prescrizione modificata o articolata da altre istruzioni documentate. S non significa requisito certificato nel runtime. P/NV non eliminano richieste né autorizzano rinvii. Rilievi A56/A7, controesempi e proposta nel [rapporto](audit-conformita-2026-10-21.md).

Abbreviazioni percorsi: **S/** = `server/services/`, **P/** = `src/pages/`, **C/** = `src/components/`, **M/** = `server/db/migrations/`. I percorsi successivi senza prefisso nella stessa cella ereditano la directory del precedente riferimento dello stesso ambito; per esempio `ModuloCatalogo.tsx` è in `src/components/guida/` e `mappe/accessoMondoService.ts` è in `server/services/`. I percorsi completi sono dalla root.

## L5 — ogni ID del documento originale

| ID | Esito | Evidenza e limite |
|---|---|---|
| R5-01 | P | M/115_luoghi_fonte_unica.ts:164–176; S/luoghiService.ts:229–236. Aree univoche e da collocare presenti; inventario/approvazione residui non certificati. |
| R5-02 | NC/P | S/luoghiService.ts:136–206; cittaService.ts:116–134; negoziService.ts:32–60; attivitaService.ts:54–79. A56-01/02; attività con sede dal luogo e condizioni proprie; tutti i consumatori non certificati. |
| R5-03 | S/P | S/mappe/mappeService.ts:524–535; luoghiService.ts:179–206. Nome/descrizione dal luogo, nota distinta; rinomina nel runtime non provata. |
| R5-04 | NC/NV | S/luoghiService.ts:114–159; cittaService.ts:119–122. A56-01/02; zero divergenze sui dati non misurato. |
| R5-05 | P | M/115_luoghi_fonte_unica.ts:178–205. Conversione e classificazioni codificate; applicazione frase per frase e approvazioni dubbie non certificate. |
| R5-06 | P | S/negoziService.ts:32–35,84–93; P/LuogoPage.tsx:104–111. Sede/percorso strutturati; DTO conserva prosa, non certificati tutti i consumatori. |
| R5-07 | S/D | C/guida/AzioniCatalogo.tsx:49–76; ModuloCatalogo.tsx:80–84,152; S/catalogoService.ts:297–308,354–381. Modifica/ripristino e snapshot precedenti protetti. Importa sostitutivo supera la vecchia promessa di aggiornamento conservativo. |
| R5-08 | P | S/negoziService.ts:32–35; M/115_luoghi_fonte_unica.ts:208–211. Sede singola e assegnazioni prudenti; eccezioni complete/approvate non certificate. |
| R5-09 | S/P | S/luoghiService.ts:249–271; P/LuogoPage.tsx:141–168. Sezioni/listini/acquisti presenti; gesto non provato. |
| R5-10 | S | P/NegozioPage.tsx:54–56; S/negoziService.ts:63–68. Reindirizzamento con ancora; senza sede resta pagina prevista dal piano. Runtime non provato. |
| R5-11 | S/P | S/azioniStrutturateService.ts:76–99; mappe/accessoMondoService.ts:129–137. Nome negozio corrente; 11/16 voci reali e ogni resa non confrontate. |
| R5-12 | NC | S/negoziService.ts:48–60. A56-01/05: sblocco quartiere incompleto e eccezione propria negozio assente. |
| R5-12b | S/P | M/115_luoghi_fonte_unica.ts:178–205; S/negoziService.ts:48–60; attivitaService.ts:72–79. Ambiti orari separati, classificazioni codificate; righe migrate/L9 non certificati. |
| R5-12c | S | shared/orariNegozio.ts:32; S/luoghiService.ts:114–159; P/LuogoPage.tsx:122–124. Default dichiarato regola dell'app; tutti i formati non misurati. |
| R5-13 | P/NV | S/negoziService.ts:141–158; P/LuogoPage.tsx:165–168. Acquisti per articolo; conservazione dati non confrontata. |
| R5-14 | S/P | S/luoghiService.ts:60–75; P/LuogoPage.tsx:176–196. Planimetria sul pin/link Area; centratura non provata. |
| R5-15 | P/NV | M/115_luoghi_fonte_unica.ts:214–223. Collegamenti seed prudenti; inventario di tutti i pin e approvazione residui non certificati. |
| R5-16 | S/P/D | S/luoghiService.ts:60–75,160–162; P/LuogoPage.tsx:187–203. Pin plurimi e posizionamento presenti; sette casi non inventariati integralmente. Rimozione del solo blocco Area autorizzata successivamente. |
| R5-17 | P | S/luoghiService.ts:53–56,249–271; P/LuogoPage.tsx:104–218; S/attivitaService.ts:119–121. Casa unica presente; tutti i link non percorsi. |
| R5-18 | S/P | S/luoghiScritture.ts:46–75. Transazione luogo/pin/Area e controlli duplicati/quartiere; gesto UI non provato. |
| R5-19 | P/D | S/cittaService.ts:119–122; luoghiService.ts:156; mappe/sincronizzaMappe.ts:170–172. Città non legge più marcatore_luogo, sincronizzazione ancora sì; marcatore_mappa dei Palazzi distinto in M5. Trasposizione completa non certificata. |
| R5-20 | P | S/luoghiService.ts:179–206,262–267; P/LuogoPage.tsx:206–215. Sezioni/percorsi presenti; tre pin storici non riconciliati. |
| R5-20b | NC | P/AreaPage.tsx:260–272; S/mappe/mappeService.ts:520–535; P/LuogoPage.tsx:37–43,181–183. A56-01/02; eccezione pin richiesto codificata, tutti i menu non certificati. |
| R5-20c | S/P/NV | C/mappe/DoveSiTrova.tsx:113–117; P/LuogoPage.tsx:184–185; S/azioniStrutturateService.ts:45–48. Testi naturali risolti; DOM universale non censito. |
| R5-20d | NC/P | S/sbloccoLuoghi.ts:22–24; condizioni/valutatore.ts:208–217; mappe/mappeService.ts:528–533. Concluso distinto dal 100%; A56-01; stati non confrontati. |
| R5-20e | NC/P | S/inviti.ts:42–60,94–123; P/LuogoPage.tsx:126–139; C/confidenti/InvitiConfidente.tsx:32. A56-03; registrazione/annullamento non provati. |
| R5-20f | S/P | M/115_luoghi_fonte_unica.ts:226–232; 118_condizioni_uniche.ts:66,91–97; S/mappe/areeService.ts:246–248. Sakura/Sakai/Nagiuri/Roppongi codificati; dati e tutte le navigazioni non certificati. |
| R5-21 | S/P | S/luoghiScritture.ts:110–148; cestinoService.ts:305–380. Ripristino anche UPDATE; perdita necessaria dei legami non confermata. Casi reali/conflitti non provati. |
| R5-22 | P/NV | M/115_luoghi_fonte_unica.ts:214–223. Riferimenti seed con guardie, non coordinate; impronte pin prima/dopo assenti. |
| R5-23 | NV | S/mappe/mappeService.ts:510–517. Modello stati L4 letto; nessun confronto partite. |
| R5-24 | P/NV | S/azioniStrutturateService.ts:50–99. Riferimenti correnti; testo/ordine/fascia/UID/spunte del Diario non confrontati. |
| R5-25 | NV | Migrazione 115 letta; nessuna impronta prima/dopo dei Palazzi. |
| R5-26 | P/NV | S/negoziService.ts:71–93,141–158; C/negozi/ListinoNegozio.tsx:34–36; S/attivitaService.ts:60–66. Percorsi presenti, prezzi/punti e gesti non provati. |
| R5-27 | NC/P/NV | S/disponibilitaService.ts:173–180; condizioni/valutatore.ts:143–164,323–339. A56-01/02; equivalenza prima/dopo non misurata. |
| R5-28 | D/NV | Nessun nuovo typecheck/lint/build dal revisore. Test storicamente richiesti superati dal divieto corrente. CI va attribuita al proprio SHA. |
| R5-29 | P/NV | P/NegozioPage.tsx:54–56; LuogoPage.tsx:56–64,144–168. Ancora presente; un tocco/scroll/visibilità sul telefono non provati. |
| R5-30 | S/P/NV | P/LuogoPage.tsx:104–168,206–215. Ordine sezioni presente; leggibilità/opacità/viewport non misurati. |
| R5-31 | P | P/LuogoPage.tsx:104–218; C/mappe/DoveSiTrova.tsx:113–117. Vocabolario coerente nei componenti letti, non censimento di ogni testo. |
| R5-32 | NV | P/LuogoPage.tsx:102–218; C/guida/ModuloCatalogo.tsx:143–174. CSS/modal non prova overflow, touch o scroll. |
| R5-33 | NV | P/LuogoPage.tsx:102–139. Prima schermata a 1366×657/1280×689 non misurata. |

## L6 — ogni ID del documento originale

| ID | Esito | Evidenza e limite |
|---|---|---|
| R6-01 | S/P | shared/condizioniSpillo.ts:79–137,278–318; shared/statiPartita.ts; S/condizioni/valutatore.ts:105–316. Vocabolario/descrittore/valutatore comuni; matrice esiti non eseguita. |
| R6-01b | S/P | shared/condizioniSpillo.ts:98,135,375–377; S/condizioni/importazione.ts:10–90. Manuale legacy convertito/rendicontato; assenza universale nei dati non verificata. |
| R6-02 | S/P | S/disponibilitaService.ts:173–180; semaforiService.ts:117–134; C/guida/CondizioniEditor.tsx:260–303. Valutatore e anteprima server; equivalenza universale non certificata, A56-07. |
| R6-03 | S/P | M/118_condizioni_uniche.ts:258–284; S/condizioni/valutatore.ts:229–237,281–288. Chiavi/ID per abbinamenti unici; tutti i riferimenti reali non censiti. |
| R6-04 | S/P | S/condizioni/nomiCondizioni.ts:39–67; valutatore.ts:229–237. Nomi per chiave/mancante esplicito; rinomina universale non provata. |
| R6-05 | S | S/condizioni/valutatore.ts:112–134,323–329. Avvisi non bloccanti anche in gruppi/NON; nessun runtime. |
| R6-06 | NC | S/condizioni/valutatore.ts:112–128,171–177,376–380; shared/condizioniSpillo.ts:427–430. A56-04/07. |
| R6-07 | NC/D | C/guida/CondizioniEditor.tsx:133–135,184,260–305; C/confidenti/EditorRequisiti.tsx:34; P/QuartierePage.tsx:74–79. A56-05. Restrizione spillo/voce-guida fuori mappe ha precedente ordine utente (DECISIONI@c025154a:1014,1488–1490); tensione con «tutti i tipi» da esplicitare, non arbitrio automaticamente attribuito. |
| R6-08 | S/P/D | S/condizioni/condizioneEffettiva.ts:55–70; cittaService.ts:46–78; P/CittaPage.tsx:87; C/mappe/MappaTokyo.tsx:379. Esito server; calendario previsto in L9; libri A56-04/08. |
| R6-08b | S/P/D | M/118_condizioni_uniche.ts:43–68; S/cittaService.ts:60–78,104–111. 23 condizioni codificate/testo generato; Memento escluso come previsto, dati/fonti non tutti verificati. |
| R6-08c | S/P/D | shared/condizioniSpillo.ts:101; S/inviti.ts:94–109; condizioni/valutatore.ts:135–142. Invito per chiave, gesto diretto; Diario assegnato originariamente a L10 (M6:45–47). |
| R6-08c2 | S/P | M/118_condizioni_uniche.ts:112–119; S/inviti.ts:42–60,94–109; C/confidenti/InvitiConfidente.tsx:36–40. Sei insiemi/guardia/pulsante presenti; dati e gesto non provati. |
| R6-08c3 | S/P/D | M/118_condizioni_uniche.ts:116; M6:61–63. Makoto con condizione/nota da rivedere; voce/effetto Diario previsti L10, non autorizzazione a cancellarla. |
| R6-08d | S/P | S/condizioni/condizioneEffettiva.ts:36–70; M/118_condizioni_uniche.ts:112–119. Sei inviti e OR codificati; partite non provate. |
| R6-08e | P/NV | S/inviti.ts:94–123; condizioni/condizioneEffettiva.ts:45–53. Registrazione/annullamento e alternativa presenti; sequenza richiesta non eseguita. |
| R6-08f | S/P/D | S/inviti.ts:94–123; pacchettoGiocoService.ts:89–90; M6:45–49. Gesto diretto e proprietario voce_uid; integrazione L10/equivalenza gesti non certificata. |
| R6-09 | S/P | S/cittaService.ts:46–56; condizioni/valutatore.ts:152–164; C/mappe/MappaTokyo.tsx:379. Fonti comuni esaminate; ogni consumatore non certificato, eredità luoghi A56-01. |
| R6-10 | S/P/D | M/118_condizioni_uniche.ts:57,59,74; DECISIONI@c025154a:7. Odaiba libro OR Ann10, Asakusa OR secondo chiarimento utente; progressi non provati. |
| R6-11 | NC | S/attivitaService.ts:107–121,137–138; P/LibriPage.tsx:135–138. A56-04/08; tre libri reali non verificati. |
| R6-12 | S/P/D | M/118_condizioni_uniche.ts:81,274–278,287–299; P/ConfidenteDettaglioPage.tsx:142. Clinica/Tae/articoli con guardie; dati non verificati, calendario L9. |
| R6-13 | NC/P | S/sbloccoLuoghi.ts:22–24; negoziService.ts:56–60; M/118_condizioni_uniche.ts:208–239. A56-01/05; frasi/approvazioni complete non certificate. |
| R6-14 | S/P/D | P/ConfidenteDettaglioPage.tsx:142; S/partiteService.ts:290–295; semaforiService.ts:117–134; M6:224–229. Requisiti in scheda/semafori; nove divergenze reali non misurate, calendario L9. |
| R6-15 | S/P/NV | M/118_condizioni_uniche.ts:258–284; S/condizioni/valutatore.ts:229–237. Chiavi per casi univoci; equivalenza 21 requisiti non misurata. |
| R6-16 | NC/P/D | S/datiGuida.ts:87–100; atterraggioPalazziService.ts:110–119; M/118_condizioni_uniche.ts:301–310. Fonte colonne presente, A56-06; dati/lettera non certificati, calendario L9. |
| R6-16b | S/P/NV | S/condizioni/valutatore.ts:208–217; semaforiService.ts:96–101; mappe/mappeService.ts:532–533. Concluso distinto dal 100%; partite/Tutorial non certificati. |
| R6-17 | NC/P | S/palazziService.ts:271–289; azioniStrutturateService.ts:50–54. Destinazione comune, A56-07; sei divergenze non rimisurate. |
| R6-18 | P | S/cittaService.ts:46–56; attivitaService.ts:32–39; negoziService.ts:38–60; catalogoService.ts:80–81,273–275,360–361. Lettori JSON; conversioni prosa legacy in creazione/ripristino ancora presenti, compatibilità non tutta provata. |
| R6-19 | P | elenco-frasi-condizioni.md:3–17 aggiunto in 63e12734, dopo 118 in fdae7867. Fonte storica schema93, non p5s; non approvato/applicato. Non dimostra inventario preliminare corrente; non implica assenza di fonti per G-029/G-031. |
| R6-20 | NV | M/118_condizioni_uniche.ts:208–239,258–299. Guardie non provano equivalenza di ogni esito/data/partita. |
| R6-21 | NC/P/NV | S/mappe/mappeService.ts:520–535; condizioni/valutatore.ts:291–316,332–340. A56-02; condizioni utente byte per byte non confrontate. |
| R6-22 | S/P/NV | S/condizioni/importazione.ts:10–90; pacchettoGiocoService.ts:363; mappe/mappeService.ts:1971–1978. Legacy/resoconto/snapshot presenti; nessuna importazione/export provata. |
| R6-23 | NV | S/azioniStrutturateService.ts:26–41; partiteService.ts:290–295. Diario e semafori non confrontati prima/dopo. |
| R6-24 | NV | S/condizioni/valutatore.ts:208–217; mappe/mappeService.ts:510–517. Condizioni/finestre/stati/impronte dei due Palazzi non confrontati. |
| R6-25 | NV | C/mappe/MappaTokyo.tsx:407; S/datiGuida.ts:87–100. Esito server presente, visibilità per giorno non misurata. |
| R6-26 | D/NV | S/semaforiService.ts:61–64,141–156; M6:18. Il piano elimina lettori conferme manuali mantenendo tabella (zero righe storico); eventuali conferme effettive non certificate. |
| R6-27 | NV | S/condizioni/valutatore.ts:229–237,306–316. Percorsi Richieste/Memento presenti; disponibilità reali non confrontate. |
| R6-28 | D/NV | Nessun typecheck/lint/build del revisore; attribuire CI/storico allo SHA. Zero test prevale sulla richiesta storica. |
| R6-29 | S/P | shared/condizioniSpillo.ts:278–318; S/condizioni/valutatore.ts:350–369; cittaService.ts:54–56. Testi generati, ma A56-08; uniformità universale non certificata. |
| R6-30 | S/P/NV | C/guida/CondizioniEditor.tsx:45–75,100–125,260–305; C/confidenti/EditorRequisiti.tsx:34,59. Nome/chiave/anteprima presenti; tablet/gesti non provati, A56-05. |
| R6-31 | NV | C/confidenti/EditorRequisiti.tsx:59; P/QuartierePage.tsx:74; C/guida/ModuloCatalogo.tsx:143; C/shared/Modal.tsx. Modal comune non prova misure, overflow o scroll. |

## L7 — tutti i 30 criteri originali

| ID | Esito | Evidenza e limite |
|---|---|---|
| R7-01 | P | M/121_catalogo_oggetti.ts:10–24; S/catalogoOggettiLetture.ts:48–73; server/routes/catalogoOggetti.ts:28–40. Identità/filtri predisposti; A7-01/09, nuove API inattive. |
| R7-02 | P/NV | M/catalogoOggetti121.ts:22–176. Cicli di conversione e proposte non provano riconciliazione di tutte le righe; A7-04. |
| R7-03 | P | S/catalogoOggettiFusione.ts:159–203; C/catalogo/AbbinamentiDaApprovare.tsx:66–75. Fusione esplicita nel cestino; elenco approvato/reversibilità non confrontati. |
| R7-03b | D/P | Conflitto originale requisiti:32–36 contro M7:86–94,124,263–268; M/catalogoOggetti121.ts:136–148 segue abbinamenti esatti. Censimento nomi non certificato. Successiva scelta tecnica nella ripresa: identità distinte senza prova d'identità, su delega utente «la soluzione migliore»; non ancora implementata. |
| R7-04 | NC | S/negoziService.ts:170–184; attivitaService.ts:30–35,143–170; giornataService.ts:104–110. Lettori canonici presenti, ma A7-02/06; universalità runtime non provata. |
| R7-05 | P/D | M/catalogoOggetti121.ts:99–106; S/attivitaService.ts:143–197,242–255; catalogoOggettiService.ts:108–121. Dati/progressi originari conservati nel modello; conflitto filtri/pagine M7:308 e avanzamenti non provati. |
| R7-06 | P | M/121_catalogo_oggetti.ts:90–104; catalogoOggetti121.ts:123–148; S/negoziService.ts:170–184. FK/costi presenti; ogni articolo collegato o proposta valida e dati reali non certificati. |
| R7-07 | P | S/catalogoOggettiLetture.ts:57–60,118–160; attivitaService.ts:30–35; compendioService.ts:443–469; disponibilitaService.ts:137. Prezzi dai listini; A7-08 e divergenze/offerte condivise non tutte verificate. |
| R7-08 | P | S/catalogoOggettiService.ts:20–43; C/catalogo/OfferteDellOggetto.tsx:46. Aggregazione sedi/offerte; completezza/link non certificati, disponibilità eredita difetti L5/L6. |
| R7-09 | P | S/attivitaService.ts:74–83,217–227,242. Offerte/posizioni per chiave; «Esperto a biliardo» e «La fattorizzazione» non riconciliati sui dati correnti. |
| R7-10 | P | M/catalogoOggetti121.ts:150–156; server/db/migrazioniUtente/026_regali_per_catalogo.ts:6–22; S/regaliPartita.ts:33–85; catalogoOggettiService.ts:99–105; compendioService.ts:443–469. Graditi/sconsigliati/chiavi presenti; omonimi e gesti non provati. |
| R7-11 | P | M/contenutiOggetti121.ts:11–56; catalogoOggetti121.ts:210–231; S/catalogoOggettiService.ts:47–79. Contenuti/posizioni presenti; undici nomi non riconciliati uno per uno. |
| R7-11b | P | S/catalogoOggettiService.ts:60–78; P/OggettoPage.tsx:116–120. Stato dal pin forziere, rampini esclusi; semi identificati per chiave non tutti verificati dopo fusione. Trasformazione Cristalli→Anelli dopo distruzione Palazzo non individuata come regola strutturata nel convertitore esaminato; sottopunto aperto. |
| R7-12 | P | M/catalogoOggetti121.ts:233–313; S/catalogoOggettiService.ts:82–96; domandeService.ts:27–50; sfideService.ts:11–14; completamentoService.ts:32–33; compendioService.ts:477. Premi/fonti predisposti; censimento completo ed esclusioni non verificati. |
| R7-12b | P | M/catalogoOggetti121.ts:188–192,238–254. Sciabola corretta solo su testo esatto conservato in nota; sette carte/Corona e categorie non riconciliate singolarmente. |
| R7-13 | P | M/catalogoOggetti121.ts:316–443; scambiJose121.ts:14–31; P/RichiestePage.tsx:274–289. Listini/proposte/costi; A7-03, 37 scambi/16 finestre/alternative non tutti riconciliati. |
| R7-13b | P | M/catalogoOggetti121.ts:494–550; S/catalogoOggettiProposte.ts:155–211. Tanaka mantenuto, proposte e Homunculus5000, guardie sul gesto; conteggi20/18 e gradi non provati. |
| R7-14 | NC/P | M/catalogoOggetti121.ts:93–97,158–176; S/catalogoOggettiLetture.ts:205–219; compendioService.ts:52. Abiti/ricette presenti, A7-06/07; copertura completa non attestata. |
| R7-15 | P/NV | S/condizioni/valutatore.ts:272–273; disponibilitaService.ts:133. Chiave articolo invariata ma acquistiCondivisi espande le equivalenze: duplicato può risultare ottenuto dal canonico. Piano prescrive condivisione, non arbitrio automaticamente dimostrato; equivalenza degli esiti da confrontare. |
| R7-16 | P | src/router.tsx:95–104; S/giornataService.ts:104–110; src/utils/percorso.ts:30–34. Vecchi URL e nuova casa presenti; A7-09, tutti i link/acquisti Diario non provati. |
| R7-17 | P/D | S/catalogoOggettiScritture.ts:22–88; P/OggettoPage.tsx:52–71; S/cestinoService.ts:189–247,305–411. Gesti/snapshot presenti, reversibilità non provata; Importa sostitutivo supera vecchia promessa conservativa. |
| R7-18 | P | S/pacchettoGiocoService.ts:102,140–150,353–385. Riferimenti/orfani riconosciuti; registri121/026 inattivi, nessun import/export/backup provato. |
| R7-19 | P/NV | server/db/migrazioniUtente/026_regali_per_catalogo.ts:15–22; S/regaliPartita.ts:66–76; attivitaService.ts:178–185; listiniCondivisi.ts:58–65. Protezioni statiche; date/progressi reali prima/dopo non confrontati. |
| R7-20 | P/NV | S/giornataService.ts:104–110; effettiAzioneService.ts:51–75; attivitaService.ts:375. Arricchimenti DTO/letture; impronte Diario e62/22 occorrenze non misurate; A7-03. |
| R7-21 | P/NV | M/catalogoOggetti121.ts:215–226; S/dungeonService.ts:69–73,383,449. Forzieri protetti in proposta senza riscrittura nei percorsi esaminati; impronte/stati non confrontati. |
| R7-22 | NV | S/disponibilitaService.ts:137–138; negoziService.ts:267–292. Aggregazioni/equivalenze presenti; totali prima/dopo e modifiche successive non misurati. |
| R7-23 | NC/D | server/routes/partite.ts:129 contro S/effettiAzioneService.ts:22–25; import in S/azioniStrutturateService.ts:21. Difetti statici coerenti col typecheck storico fallito, non rieseguito; zero test supera clausola storica. |
| R7-24 | P/NV | C/catalogo/CatalogoOggetti.tsx:39–80; P/OggettoPage.tsx:73–84,104–112. Ricerca e ordine offerte/regali predisposti; UX telefono non provata, API inattiva e dipendenze L5/L6 difettose. |
| R7-25 | P/D | C/catalogo/CatalogoOggetti.tsx:14,22–80; src/router.tsx:95–97. Filtri/ordini e pagine presenti; usabilità non misurata, conflitto R7-05/M7:308. |
| R7-26 | NV | C/catalogo/CatalogoOggetti.tsx:71; OfferteDellOggetto.tsx:46; P/OggettoPage.tsx:73; src/tailwind.css:147,843–862. Supporto CSS non prova touch/overflow/intestazione/scroll alle misure richieste. |

## Esito complessivo

Ogni ID è considerato, ma nessuno dei tre lotti riceve un'approvazione integrale. Le matrici distinguono i difetti dimostrati dalle prove non eseguite; non certificano conservazione dei dati o runtime. Le prescrizioni storiche di test restano leggibili come storia e non sono state eseguite. Le correzioni al prodotto devono seguire la soluzione validata e una nuova revisione distinta.
