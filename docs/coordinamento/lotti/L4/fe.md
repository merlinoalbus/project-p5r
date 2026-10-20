# L4 · fe — esiti grezzi (Implementazione FE, 2026-10-20)

Worktree `pensive-burnell-b50941`, branch `newreview`, FE 5373 / BE 3201. **Niente commit** (via del PM). Solo Edit/Write sui sorgenti.

## Stato
**In corso.** Pronti i due livelli (concluso/completato), l'anello sugli oggetti permanenti, le spunte dal server, «Da verificare» nelle tre viste e il contesto del pin.

Aspettano i campi di BE per §8.11 (pin con stato proprio), chiesti a BE il 2026-10-20:
- il contatore k/N della voce;
- «Segna» sulla voce che segna tutti i pin, «Riapri» con la conferma «Riapre anche: …», «Segnate anche: …».

## Pezzi
- **§1.5, §8.10, due livelli** (`utils/completamentoPalazzo.ts`, nuovo: `anelloPalazzo`, `livelloPalazzo`):
  - anello e percentuale sugli oggetti permanenti (numeri del server, percentuale per difetto come la sua), nei Memento come prima;
  - «Concluso» (Tesoro e boss) / «Completato» col perché;
  - in DungeonPage chip del livello e «N da verificare»;
  - in MappaTokyo presenza e targa seguono il **concluso**: Kamoshida p1 (concluso, 56/71) non c'è più. Il requisito rosso è un testo del server.
- **Spunte dal server**: `completamentoArea`/`areeCompletate` usano `completamento.completata` quando c'è; così `AreePalazzo` per le aree e il conto «K complete» delle planimetrie.
- **Scheda del Palazzo, intestazione**: chip «Concluso · Tesoro ✓ · Boss ✓» (nome per i lettori di schermo «Concluso: Tesoro raccolto, boss finale sconfitto») e «N da verificare», che apre la sezione.
- **«Da verificare», tre viste** (`components/guida/FinestraDaVerificare.tsx`, nuovo; API `getDivergenze`, `togliFattoAlPin`):
  - finestra: «Il pin risulta fatto ma la voce no: era così prima dell’aggiornamento.» con «Segna la voce» / «Togli il fatto al pin»;
  - scheda: sezione richiudibile «Da verificare (N)» sotto «Da raccogliere»;
  - voce: chip sulla riga e «Sistema…» nella voce aperta (`GuidaDellArea`);
  - pin: anello ambra, il pin resta in vista anche raccolto, «(da verificare)» nel nome, chip nel popup che apre la finestra (`VisoreMappa`, `MappaIncorporata`).
- **Contesto §1.4**: nel popup «Stato nella <infiltrazione>»; `impostaSpilloRaccolto(…, infiltrazione?)`.

## Verifiche
- Test nuovi o aggiornati:
  - `utils/completamentoPalazzo.test.ts`, `utils/completamentoAree.test.ts`;
  - `components/guida/FinestraDaVerificare.test.tsx`;
  - `pages/DungeonPage.test.tsx`, `pages/DungeonDettaglioPage.test.tsx` (4 casi L4);
  - `components/mappe/VisoreMappa.test.tsx`, `components/mappe/MappaTokyo.test.tsx`.
- Insieme mirato (pagine, guida, mappe, utils, hook, Cestino): **105 file, 811 test verdi**; `npm run typecheck` 0 errori; eslint `src` pulito.
- Browser, Kamoshida p1 su 3201: anello «56 oggetti permanenti fatti su 71», chip «Concluso · Tesoro ✓ · Boss ✓», «4 da verificare», sezione «Da verificare (4)»; header 170 px a 1366×657 (prima delle modifiche di R3-41).

## §8.11 — fatto (ripresa di L4, 2026-10-20; commit su `newreview`, senza push)
- I campi del BE ci sono tutti: `PuntoInteresseDto.avanzamento` (k/N), `condivise`, `effetti` nella risposta del gesto, `VoceDelPinDto.avanzamento`.
- **Voce** (`GuidaDellArea`): chip «In corso · k/N» (evidenziato) se è fatta una parte dei pin, «k/N» altrimenti; niente con un pin solo
  (`utils/gestiVoce.ts`: `testoAvanzamento`, `inCorso`).
- **«Riapri»** sulla voce: se altre voci condividono i suoi pin (`condivise`), finestra «Riaprire «nome»?» con «Riapre anche: Lucernario Aperto —
  4ª infiltrazione, …» e i pulsanti «Annulla» / «Riapri» (44 px); senza voci condivise riapre subito, come prima.
- **«Segna»** («Ottenuto»/«Esaurito»): segna tutti i pin (lo fa il server); dopo il gesto la scheda dice «Segnate anche: …» o «Riaperte anche: …»
  leggendo `effetti` (`DungeonDettaglioPage.cambiaStato`), poi rilegge.
- **Popup del pin** (`VisoreMappa`, `AzioniStato`): le voci del pin col loro contatore («Installazioni artistiche · In corso · 2/8»).
- Test visti rossi e poi verdi: `GuidaDellArea.test.tsx` (contatore; conferma con «Annulla» che non tocca niente; senza condivise nessuna conferma,
  già verde: guardia), `DungeonDettaglioPage.test.tsx` («Segnate anche: …»), `VisoreMappa.test.tsx` (contatore nel popup; il pin resta accanto a
  «Untouchable» e si apre dal gruppo «2 spilli vicini», come fa l'utente — correzione dell'utente: i pin raggruppati non si spostano). 174/174 nei tre file.
- Browser (5373 → 3201, partita 1, Madarame «Entrata del Museo»): chip «4/4», «8/8»; «Lucernario aperto» → «Riapri» → «Riapre anche: Lucernario
  Aperto — 4ª infiltrazione, Lucernario Aperto — 2ª infiltrazione», «Annulla» → la voce resta «ottenuto» (nessun dato cambiato); pulsanti 44 px
  (`offsetHeight`); a 375 intestazione 241 (invariata), finestra a tutta larghezza, nessun orizzontale.

## §8.6 (O4-2) — fatto (ripresa di L4, 2026-10-20)
- Regola unica in `utils/gestiVoce.ts`: `enigmiCheSiRiaprono(voci, tutte)` (gli Enigmi risolti di cui le voci sono passi), `vociDelPin`,
  `righeRiapertura` («Riapre anche: …» e «Riapre anche l’Enigma «…»»). Il campo che manca al popup (la voce del pin non dice il suo Enigma) non
  serve: nella scheda la pagina conosce tutte le voci, e dopo L3 il popup dei Palazzi si apre solo lì.
- **Guida**: «Riapri» su un passo di un Enigma risolto apre la stessa finestra di §8.11 con «Riapre anche l’Enigma «…»» (anche insieme a «Riapre
  anche: …»); Enigma non risolto → nessuna conferma.
- **Scheda** («Da raccogliere»): `RaccoltaPlanimetrie.primaDiTogliere` chiede alla pagina prima di togliere il segno; finestra «Togliere il segno a
  «pin»?» con «Annulla» / «Togli il segno»; «Annulla» lascia la spunta.
- **Popup del pin**: `MappaIncorporata.primaDiRiaprire` (pin o voce del pin), stessa finestra; segnare non chiede niente.
- Test visti rossi e poi verdi: `GuidaDellArea.test.tsx` (passo di Enigma risolto con «Annulla»; non risolto senza conferma),
  `RaccoltaPlanimetrie.test.tsx` (Annulla / confermato / segnare non chiede), `MappaIncorporata.test.tsx` (popup: pin e voce, Annulla, segnare),
  `DungeonDettaglioPage.test.tsx` (scheda e popup, Enigma risolto e no). I 9 file che usano i componenti toccati: 195/195.
- Browser (partita 1): Kamoshida «Tutorial 11/04», passo «Parla con Morgana» → «Riapri» → «Riapre anche l’Enigma «Incontro con Morgana».», e lo
  stesso dal popup del pin «Morgana»; «Annulla» in tutti e due i casi; dati invariati (passo ed Enigma «ottenuto», verificato dall'API).

## §4.2 — fatto (ripresa di L4, 2026-10-20)
- `getMappa(chiave, partita?, infiltrazione?)`; `useMappaPartita(…, { infiltrazione })` legge la mappa nell'infiltrazione di contesto e, se
  cambia, la rilegge in silenzio (zoom e posizione restano); il segno di un pin con `contestoInfiltrazione` si scrive in quella (§1.4).
- `MappaIncorporata.infiltrazione`: la scheda passa l'infiltrazione guardata; la scelta fatta nel popup vale finché la pagina non ne guarda
  un'altra (allora torna la sua).
- **Popup** (`VisoreMappa.onContesto`): se le voci del pin stanno in più infiltrazioni, gruppo «Infiltrazione dello stato» con «Stato nella»
  e un `Selettore` compatto (nome accessibile «Stato nella: <infiltrazione>», 44 px); con una sola, resta il testo «Stato nella X». Il k/N
  sta anche sulle voci del popup.
- Test visti rossi e poi verdi: `useMappaPartita.test.tsx` (contesto nella lettura, rilettura al cambio, scrittura nel contesto),
  `VisoreMappa.test.tsx` (selettore solo con più infiltrazioni; k/N nel popup, pin aperto dal suo gruppo senza spostarlo),
  `MappaIncorporata.test.tsx` (contesto della pagina, scelta nel popup, ritorno al cambio di pagina), `DungeonDettaglioPage.test.tsx`
  (l'infiltrazione guardata arriva alla mappa). I 15 file collegati: 319/319; typecheck e lint verdi.
- Browser (partita 1): Madarame «Entrata del Museo», pin «Installazione Artistica» (voci nella 1ª e in «Scopri dov'è il Tesoro»): il popup apre
  su «Prima Infiltrazione al Museo», la scelta di «Scopri dov'è il Tesoro» rilegge `?infiltrazione=madarame-scopri-dove-il-tesoro` (solo GET,
  nessuna scrittura). Misure col popup aperto: visore top 317 (1366×657), 317 (1280×689), 340 (1024×690), 317 (1920×1080) → R3-41 invariato;
  intestazione 198 a 768×1024, 241 a 375×812; selettore 44 px; nessuno scorrimento orizzontale.

## §4.3 «Schede da sistemare» — fatto (ripresa di L4, 2026-10-20)
- `components/guida/SchedeDaSistemare.tsx` (nuovo), al posto dell'elenco in sola lettura di AP3-1: per ogni scheda «Crea la voce» e «Collega a una
  voce» (44 px), mai «Elimina». API `creaVoceDallaScheda(id, tipo)` (POST) e `collegaSchedaAllaVoce(id, voce)` (PUT).
- «Crea la voce»: finestra con il tipo proposto dal tipo del pin (`spilloPerPunto`: miniboss → Mini-boss, seme della bramosia → Semi della
  bramosia, forziere → Forziere normale, sicura → Stanze sicure; altrimenti Altro) e «Una voce nuova in fondo a «<infiltrazione>»… Nessuno stato
  si trasferisce.».
- «Collega a una voce»: finestra con le voci del Palazzo raggruppate per infiltrazione, prima quella della scheda, con ricerca; «Collega»
  disattivato finché non si sceglie.
- «Annulla» non chiama niente; dopo il gesto notifica e rilettura della scheda (`rileggiTutto`); un errore lascia la finestra aperta col messaggio.
  Selettori `selettore--in-linea`: sovrapposti restavano tagliati dal corpo della finestra (nel browser si vedeva una voce sola).
- Test visti rossi e poi verdi: `DungeonDettaglioPage.test.tsx`, describe «§4.3» (due gesti e niente «Elimina», tipo proposto, Annulla, crea e
  rilegge; collega con scelta, errore che lascia aperta la finestra, poi riuscito; tendine in linea). File: 84/84.
- Browser (Kamoshida, 4 schede), solo finestre aperte e chiuse con «Annulla», nessuna richiesta a `/schede/` e 4 schede anche dopo:
  1280×689 finestra 565 px, elenco 207 px, corpo senza scorrimento; 1366×657 556/197, senza scorrimento; 375×812 foglio dal basso (convenzione dei
  selettori sul telefono), niente orizzontale; 768×1024 «Crea la voce» con «Semi della bramosia» proposto.

## §4.1 Carattere della voce — fatto (ripresa di L4, 2026-10-20)
- `GuidaDellArea`: chip accanto al tipo, nel testo della riga (va a capo con lui, non schiaccia il nome): «Permanente» (lucchetto aperto, chiuso
  se fatta; `chip--toccata`), «Si ripropone» (ciclo; `chip--dalla-guida`), «Racconto» (libro; neutro). Niente chip senza carattere (dedali,
  Persona). Voce aperta: «Permanente: si fa una volta per sempre.» / «Si ripropone: il suo stato vale in quest’infiltrazione.» / «Racconto: si
  segna come letto e non conta nel completamento.».
- Racconto (Storia): il pulsante è «Letto» (stato `ottenuto` sul server) e la riga dice «· letto».
- «Modifica»: selettore «Carattere» (Permanente / Si ripropone / Racconto, «regola» sul valore della regola del tipo); senza scelta «Dalla regola
  del tipo.», con una scelta «Ripristina» (torna alla regola, si salva `carattere: null`); il campo va nel corpo solo se cambiato.
  `DatiPuntoApi.carattere`.
- Test visti rossi e poi verdi: `GuidaDellArea.test.tsx`, describe «§4.1» (5: chip e niente chip, spiegazioni e «Letto», «letto» nella riga,
  scelta salvata, «Ripristina» → null e corpo senza carattere se non toccato). File: 45/45; DungeonDettaglioPage e TramaDellArea 86/86.
- Browser (Madarame «Entrata del Museo», partita 1; «Modifica» aperta e chiusa con «Annulla», niente salvato): chip su tutte le righe, righe 44–81
  px; selettore 44 px, «Ripristina» 44 px; 375×812 righe larghe 291 px senza orizzontale, intestazione 241; 768×1024 righe da 44, intestazione 198;
  visore top 317 (1366×657, 1920×1080), 340 (1024×690) → R3-41 invariato.

## Da fare
1. ~~k/N, «Segna»/«Riapri» con «Riapre anche» e «Segnate anche»~~: fatto (sopra).
5. ~~§8.6 (O4-2)~~: fatto (sopra).
2. ~~Selettore del contesto nel popup per un pin di più infiltrazioni (§4.2)~~: fatto (sopra).
3. Sezione «Schede da sistemare», carattere della voce («Permanente», «Si ripropone», «Racconto»), «Esaurito» come chip, «Anche nella Nª infiltrazione» (§4.1, §4.3): non erano nella richiesta del PM di questo giro.
4. Misure di layout ai formati, quando il lotto è finito.
5. **§8.6 (O4-2), da Stesura (2026-10-20)**:
   - togliendo il segno a un passo di un Enigma **risolto**, prima si chiede conferma con «Riapre anche l'Enigma «<nome>»»;
   - stessa finestra di «Riapre anche: …» (§1.6), bersagli da 44 px, stessa regola da guida, popup del pin e scheda del Palazzo;
   - Enigma non risolto → nessuna conferma; il server non cambia (R4-13);
   - test: la conferma solo con l'Enigma risolto, e «Annulla» lascia tutto com'era.
