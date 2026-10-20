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

## Da fare
1. k/N, «Segna»/«Riapri» con «Riapre anche» e «Segnate anche»: dopo i campi di BE per §8.11.
2. Selettore del contesto nel popup per un pin di più infiltrazioni (§4.2).
3. Sezione «Schede da sistemare», carattere della voce («Permanente», «Si ripropone», «Racconto»), «Esaurito» come chip, «Anche nella Nª infiltrazione» (§4.1, §4.3): non erano nella richiesta del PM di questo giro.
4. Misure di layout ai formati, quando il lotto è finito.
5. **§8.6 (O4-2), da Stesura (2026-10-20)**:
   - togliendo il segno a un passo di un Enigma **risolto**, prima si chiede conferma con «Riapre anche l'Enigma «<nome>»»;
   - stessa finestra di «Riapre anche: …» (§1.6), bersagli da 44 px, stessa regola da guida, popup del pin e scheda del Palazzo;
   - Enigma non risolto → nessuna conferma; il server non cambia (R4-13);
   - test: la conferma solo con l'Enigma risolto, e «Annulla» lascia tutto com'era.
