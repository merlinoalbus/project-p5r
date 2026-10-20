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

## Da fare
1. ~~k/N, «Segna»/«Riapri» con «Riapre anche» e «Segnate anche»~~: fatto (sopra).
5. ~~§8.6 (O4-2)~~: fatto (sopra).
2. Selettore del contesto nel popup per un pin di più infiltrazioni (§4.2).
3. Sezione «Schede da sistemare», carattere della voce («Permanente», «Si ripropone», «Racconto»), «Esaurito» come chip, «Anche nella Nª infiltrazione» (§4.1, §4.3): non erano nella richiesta del PM di questo giro.
4. Misure di layout ai formati, quando il lotto è finito.
5. **§8.6 (O4-2), da Stesura (2026-10-20)**:
   - togliendo il segno a un passo di un Enigma **risolto**, prima si chiede conferma con «Riapre anche l'Enigma «<nome>»»;
   - stessa finestra di «Riapre anche: …» (§1.6), bersagli da 44 px, stessa regola da guida, popup del pin e scheda del Palazzo;
   - Enigma non risolto → nessuna conferma; il server non cambia (R4-13);
   - test: la conferma solo con l'Enigma risolto, e «Annulla» lascia tutto com'era.
