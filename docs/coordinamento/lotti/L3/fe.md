# L3 · fe — esiti grezzi (Implementazione FE, 2026-10-20)

Worktree `pensive-burnell-b50941`, branch `newreview`, FE 5373 / BE 3201. Niente commit: i file sono nella working copy per il PM.
Modifiche ai sorgenti solo con Edit/Write diretti, niente sed, heredoc o script.

## Stato
**Fase fe in corso, parte principale pronta.** Pronti:
- la scheda del Palazzo ad Aree con la rotta `/guida/dungeon/<k>/area/<slug>` (FUN3-1);
- i legami infiltrazione ↔ area;
- la gestione (aggiungi/modifica/sposta/elimina area, aggiungi planimetria, infiltrazione nuova con le aree toccate);
- il campo «Infiltrazioni» e «Da rivedere» del diario;
- i collegamenti della guida (`?infiltrazione=`, `?infiltrazione=in-corso`).

**Al BE**: la rotta della casa è pronta, si può togliere `CASA_SCHEDA_PALAZZI`.

Restano (sotto, «Da fare»):
- l'indice di MappaPage con le aree dei Palazzi;
- l'avviso `idCambiati` dell'editor;
- la verifica in browser del campo del diario e dei Memento;
- una variante da chiedere a Stesura per l'altezza (R3-41).

## File (solo `src/`)
- **Nuovi**:
  - componenti: `components/guida/{AreePalazzo,FinestraLegamiInfiltrazione,InfiltrazioniVoce,SpuntaCompletata}.tsx`, `components/shared/Maniglia.tsx`;
  - hook: `hooks/useRiordino.ts`;
  - test: `components/guida/{AreePalazzo,FinestraLegamiInfiltrazione,InfiltrazioniVoce}.test.tsx`.
- **Tolti**: `components/guida/{PlanimetriePalazzo,SchedaPlanimetria,SceltaAreePlanimetria,SchedaAreaGuida}.tsx`.
  - Maniglia, useRiordino e SpuntaCompletata sono usciti da PlanimetriePalazzo;
  - le finestre di L2 sostituiscono la scheda della planimetria.
- **Modificati**:
  - router e API: `router.tsx`, `services/api/{aree,compendio}.ts`;
  - pagine: `pages/{DungeonDettaglioPage,AccessoMondoPage,BattagliaPage}.tsx`;
  - componenti della guida: `components/guida/{AreeDelDedalo,GiornoGuida,ModuloNuovaArea,PartiAzione}.tsx`;
  - componenti delle mappe: `components/mappe/{ContenutiGuidaMappa,FinestraAggiungiArea,FinestraAggiungiPlanimetria,FinestraModificaArea,MappaTokyo}.tsx`;
  - utilità e stile: `utils/percorso.ts`, `tailwind.css`.
- **Test aggiornati**:
  - `pages/{DungeonDettaglioPage,CittaPage}.test.tsx`;
  - `components/mappe/{ContenutiGuidaAccesso,MappaTokyo,OrganizzazioneMappe}.test.tsx`;
  - `utils/percorso.test.ts`.

## Pezzi (riferimenti a `modifiche.md`)
- **§4.1 Casa e collegamenti**:
  - rotta `guida/dungeon/:chiave/area/:slug` sulla scheda del Palazzo;
  - Tokyo senza regola d'atterraggio porta a `/guida/dungeon/<k>` (prima `/guida/mondo/dungeon/<k>`); AccessoMondo porta alla scheda;
  - ContenutiGuidaMappa e Battaglia usano `?infiltrazione=` (i Memento restano su `?area=`); il link porta la richiesta solo se l'infiltrazione sta sulla mappa;
  - `collegamentoAzione`:
    - con infiltrazioni → `?infiltrazione=<daAprire ?? ultima>`;
    - altrimenti atterraggio → mappa;
    - altrimenti, per una voce di Palazzo, `?infiltrazione=in-corso`.
- **§4.2 Pagina del Palazzo**:
  - stato I (`?infiltrazione=`, vecchio `?area=`, `in-corso` = prima non completata) e A (`/area/<slug>`):
    - arrivo su un'area senza I → la prima infiltrazione che la tocca;
    - I senza aree → «Quest’infiltrazione non tocca ancora aree.» con «Collega aree».
  - Colonna «Aree · N» (`AreePalazzo`):
    - colonna da 1280, fila da 768 a 1279, foglio sotto i 768;
    - per area: numero, nome, chip delle infiltrazioni in ordine di guida, raccolta, «N versioni», spunta;
    - completa = tutte le infiltrazioni completate OPPURE tutto raccolto o niente da raccogliere (regola dell'utente del 2026-10-11);
    - maniglia ⠿ con frecce e trascinamento; ordine ottimistico, ripristinato se il salvataggio fallisce;
    - in coda «Infiltrazioni senza aree», con «Collega aree a «X»».
  - Centro:
    - il selettore «Infiltrazione N di M» fa da titolo, poi «Modifica testo» e «Aggiungi infiltrazione»;
    - chip «Aree toccate», «Modifica aree», piega «Descrizione»;
    - riga dell'area con «N versioni» e Modifica/Planimetria/Elimina (da 1280 solo icona, una riga);
    - `VersioniArea`, avviso della versione senza pin;
    - visore con il pannello «Infiltrazioni in quest’area»: il tocco cambia I e lascia area e versione.
  - Destra: RaccoltaPlanimetrie dell'area + piega «Tutte le planimetrie del Palazzo · N da raccogliere», poi GuidaDellArea.
  - Intestazione:
    - conteggi «N aree · M planimetrie · K complete»; «Mappa del Palazzo» solo nei Memento;
    - da 1024 px sovrano e arcana su una riga coi puntini e il testo intero nel suggerimento (Maruki da 270 a 170 px, Madarame/Okumura/Kaneshiro da ~196 a 170).
- **§4.3 Gestione**:
  - «Aggiungi area» (FinestraAggiungiArea con `palazzo`: infiltrazioni da collegare, preselezionata quella aperta; creata, si apre);
  - «Modifica area» (infiltrazioni dell'area, etichette e ordine delle versioni, «Sposta…» con `colloca` e la conferma 409 `area-si-svuota`);
  - «Aggiungi planimetria» (la nuova versione si apre);
  - «Elimina area» (testo con pin e legami; le voci restano);
  - «Modifica aree» dell'infiltrazione (FinestraLegamiInfiltrazione: ordine, togli, aggiungi; conserva la versione iniziale delle aree che restano);
  - «Aggiungi infiltrazione» (ModuloNuovaArea con «Aree toccate» → `areePalazzo`, posto predefinito dopo quella aperta).
- **§4.4 Diario**:
  - `InfiltrazioniVoce`: chip; «Modifica» con ↑/↓/Togli/Aggiungi, «(di nuovo)»; proposta con «Conferma»;
  - `DaRivedereVoce`: «Rimetti il precedente», «Tieni il nuovo», «Fatto».
  - Sono montati in GiornoGuida. Provati da test; **nel browser non ancora** (BE a tratti fermo).

## Dopo la rimozione di `CASA_SCHEDA_PALAZZI` (BE, 2026-10-20)
- Visto su 3201/5373 (`/guida/mappe/<k>` → casa del server):
  - radice → `/guida/dungeon/kamoshida`;
  - versione non predefinita `palazzo-di-kamoshida-sala-centrale` → `/guida/dungeon/kamoshida/area/prigione-sotterranea-tutorial?planimetria=…`, con quella versione scelta nella fila;
  - alias d'infiltrazione `kamoshida-01-cancello-del-castello-ingresso` → `?infiltrazione=…`.
- `RisolviMappa.tsx`: con un alias della guida va alla `casa` del server. Prima andava alla mappa del Palazzo con `?area=`, e l'indirizzo finale restava col vecchio parametro; senza `casa` resta il percorso di prima.
- Test nuovo in `OrganizzazioneMappe.test.tsx`. 21 file / 285 test mirati verdi; `npm run typecheck` completo 0 errori; eslint `src` pulito.

## Verifiche
- **Test mirati**:
  - area L2+L3 (pagine del mondo e del Palazzo, `components/guida`, `components/mappe`, `utils`, Cestino): **74 file, 636 test verdi**;
  - poi, dopo le ultime modifiche alla pagina, DungeonDettaglioPage + ContenutiGuidaAccesso + CittaPage: 86 verdi.
- **typecheck e lint**: verdi.
- **Browser** (BE 3201 con i dati di L3; colonna «barra di pagina» = `main.scrollHeight/clientHeight`; «visore» = top in px):

| Palazzo | 1366×657 barra | header | visore | 1280×689 barra | visore | 1024×690 barra | header |
|---|---|---|---|---|---|---|---|
| Kamoshida | 589/589 | 170 | 590 | 621/621 | 638 | 622/622 | 225 |
| Madarame | 589/589 | 170 | 512 | 621/621 | 565 | 622/622 | 225 |
| Kaneshiro | 589/589 | 170 | 462 | 621/621 | 560 | 622/622 | 228 |
| Futaba | 589/589 | 170 | 512 | 621/621 | 560 | 622/622 | 201 |
| Okumura | 589/589 | 170 | 462 | 621/621 | 560 | 622/622 | 228 |
| Niijima | 589/589 | 170 | 590 | 621/621 | 638 | 622/622 | 222 |
| Shido | 589/589 | 170 | 545 | 621/621 | 643 | 622/622 | 222 |
| Iweleth | 589/589 | 170 | 467 | 621/621 | 565 | 622/622 | 170 |
| Maruki | 589/589 | 170 | 462 | 621/621 | 560 | 622/622 | 222 |
| Memento | 589/589 | 116 | — | 621/621 | — | 622/622 | 116 |

  - Nessuna barra di pagina a nessuna delle tre altezze.
  - 768: fila delle aree scorrevole, riga dell'area su una riga, versioni in fila.
  - 375: niente scorrimento orizzontale (`scrollWidth` 375); la riga dell'area va a capo con le etichette, come prima.

## Aperto: R3-41 «visore e versioni nella prima schermata» a 1366×657 e 1280×689 — variante per Stesura
- A 1366 la colonna centrale è larga 388–450 px:
  - intestazione 170 + spazio 16 → il centro parte a 291;
  - sopra il visore: infiltrazione 44 + aree toccate 44–94 + riga dell'area 53 + versioni 68;
  - il visore (barra 53 + tela minima 240, scelta dell'utente) parte a 462–590 su 657.
- La riga 2 dell'intestazione non sta in una riga:
  - date 374, Tokyo 182, conteggi 97 + 127 + 239 + 141, «Dettagli» 121 → 2 righe di 966 px;
  - per farla stare servono scelte sui contenuti: togliere «· K complete», unire i conteggi in un chip, o spostare «punti della guida» e «Dettagli» nella riga del nome;
  - è una variante: da chiedere a Stesura (tramite PM).
- Anche così si guadagnano ~50 px: per avere il visore intero servirebbero anche
  - una tela minima più bassa a schermi bassi, oppure
  - «Aree toccate» e la riga dell'area in una sola riga.
- Ho provato a spostare «Descrizione» nella riga dell'infiltrazione: a 388 px va a capo anche lì. Rimessa al suo posto.

## R3-41 «visore entro metà altezza» (decisione del PM, §4.2) — fatto finora, misure, opzioni (2026-10-20, sera)
- **Fatto** (da 1024 px; sotto i 1024 niente cambia, a 768 e 375 nessun peggioramento):
  - intestazione: stemma 48 e anello in riga; illustrazione L1 come sfondo a destra (miniatura `&l=640`, sfumata); date compatte su una riga; «Sulla mappa di Tokyo» solo icona; «N infiltrazioni / da raccogliere / punti della guida» dentro «Dettagli dalla guida», che sta nella riga del titolo; spazi ridotti. Da 170 a 106 px quando la seconda riga sta su una riga.
  - centro: una riga sola con selettore, aree toccate scorrevoli (da 1280 i chip, da 1024 a 1279 la fila di tutte le aree) e menu «Altro» («✎ Modifica testo», «Modifica aree», «Descrizione»), più «+ Infiltrazione»; con più versioni, le azioni dell'area chiudono la fila delle versioni e la riga del nome non c'è; avviso «senza pin» su una riga; segmenti delle versioni 44 px.
  - LAY3-2 nella stessa intestazione: l'arcana si accorcia prima del sovrano.
- **Misure** (bordo del visore, infiltrazione peggiore di ognuno; prima → ora; nessuna barra di pagina):

| | Madarame | Kamoshida | Maruki | Shido | obiettivo |
|---|---|---|---|---|---|
| 1366×657 | 674 → 358 | 661 → 351 | 641 → 401 | 595 → 358 | ≤ 328 |
| 1280×689 | — → 368 | — → 420 | — → 432 | — → 383 | ≤ 344 |
| 1024×690 | — → 431 | — → 477 | — → 491 | — → 471 | ≤ 345 |

(La riga 1024 è misurata dopo aver ricaricato la pagina. Una prima misura presa dopo un ridimensionamento emulato aveva la disposizione da 1280: `useMedia` non riceveva l'evento. Ora ascolta anche `resize`.)
- **UX3-6** (dopo, stessa sera): l'illustrazione **non** è più sfondo velato (regola dell'utente). Da 1024 a 1279 solo lo stemma 48, come in L1; da 1280 l'illustrazione piena al 100% (104 px, stemma sopra) in riga con l'anello. L'intestazione resta 106 px a 1366×657.

- **Cosa manca e perché**:
  - le due file orizzontali (aree toccate, versioni) hanno la barra di scorrimento sottile «sempre» (≈ 12 px l'una);
  - la fila delle versioni (segmenti con miniatura) è alta 54–64 px;
  - con i chip di L4 («Concluso · Tesoro · Boss», «N da verificare») la seconda riga dell'intestazione va a capo (Kamoshida 158 px a 1280);
  - a 1024 la riga del titolo va a capo (header 185–206 px);
  - in Maruki «Sala visite» si aggiunge l'avviso «senza pin» (44).
- **Opzioni (decisione del PM/Stesura)**, ognuna stimata:
  1. barre delle due file nascoste da 1024 px, restano bordo e sfumature ai lati (−24);
  2. versioni come selettore compatto («Versione: Livello 0 ▾») nella riga dell'infiltrazione o nella barra del visore, invece della fila con miniature (−55/60);
  3. da 1024 px «Indietro» e «Correggi la scheda» solo icona (con nome e suggerimento), e i chip di L4 fusi in quello «N aree · M planimetrie» o nei «Dettagli» (−40/80, soprattutto a 1024 e 1280).
  - Con 1+2+3 le stime stanno sotto la soglia in tutti e quattro i Palazzi alle tre altezze.

## R3-41 a 1024×690 — chiuso da FE, da verificare (ripresa di L3, 2026-10-20)
- A 1024 l'intestazione era 137–206 px per due motivi:
  - la seconda riga (date 341 + Tokyo 44 + «N aree · M planimetrie · K complete» 238 + chip riassuntivo 126) non stava in 624 px;
  - nella riga del titolo il gruppo sovrano/arcana aveva una base di 160 px, e in Kamoshida, Kaneshiro e Madarame «Dettagli dalla guida» andava a capo.
- Correzioni (solo da 1024 a 1279 px per il chip; base del gruppo a ogni misura da 1024):
  - il chip «N aree · M planimetrie · K complete» da 1024 a 1279 sta nei «Dettagli dalla guida», con gli altri conteggi (scelta 3 del PM); da 1280 resta nella riga;
  - base del gruppo sovrano/arcana da 160 a 128 px (cresce comunque nello spazio libero); con LAY3-2 sovrano e arcana vanno su due righe dentro l'altezza della riga del titolo.
- Misure (bordo superiore del visore, **tutte** le infiltrazioni con aree, partita attiva, dati locali): **1024×690: 340 in tutti gli otto Palazzi** (obiettivo ≤ 345; intestazione 106 px ovunque); 1366×657: 327 (Kamoshida, Madarame, Maruki, Shido; obiettivo ≤ 328); 1280×689: 327–328 (Kamoshida, Madarame, Maruki, Shido; obiettivo ≤ 344). Nessuna barra della pagina; a 768 e 375 nessun cambiamento.

## Dati (da segnalare ad Analisi dati)
- `arcanaSovranoNome` di Maruki è una frase intera: «Consigliere (Councillor) — arcana speciale/esclusi…».
- I sovrani di Madarame e Okumura hanno note fra parentesi.
- Ora sono accorciati in testata, ma il dato andrebbe ripulito.

## Da fare
1. Indice di MappaPage con le aree sotto i Palazzi.
2. Avviso `idCambiati` nell'import dell'editor.
3. Verifica in browser del campo «Infiltrazioni» del diario e di «Da rivedere», su una partita di prova creata apposta.
4. Giro sui Memento: logica invariata, coperta dai test; manca la conferma visiva.
5. Variante R3-41 (sopra), dopo la risposta di Stesura.
